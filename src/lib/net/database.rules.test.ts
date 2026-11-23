import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { RULES_STAMP, RULES_VERSION } from './rulesVersion';
import { planRoomSweep, SWEEP_MAX_AGE_MS } from './sweepRooms';

describe('database.rules.json security invariants & Firebase architecture', () => {
	const rulesPath = resolve(__dirname, '../../../database.rules.json');

	it('exists and parses as valid JSON', () => {
		expect(existsSync(rulesPath)).toBe(true);
		const raw = readFileSync(rulesPath, 'utf8');
		const json = JSON.parse(raw);
		expect(json).toHaveProperty('rules');
	});

	it('denies root read and write access by default', () => {
		const raw = readFileSync(rulesPath, 'utf8');
		const json = JSON.parse(raw);
		expect(json.rules['.read']).toBeUndefined();
		expect(json.rules['.write']).toBeUndefined();
	});

	it('enforces rules version stamp check', () => {
		const raw = readFileSync(rulesPath, 'utf8');
		const json = JSON.parse(raw);

		expect(json.rules.__rulesVersion).toBeDefined();
		const readRule = json.rules.__rulesVersion.$v['.read'];
		expect(readRule).toContain(`$v === '${RULES_STAMP}'`);
		expect(RULES_VERSION).toBeGreaterThanOrEqual(1);
	});

	it('protects room enumeration and moves immutability', () => {
		const raw = readFileSync(rulesPath, 'utf8');
		const json = JSON.parse(raw);

		// Cannot read /rooms list
		expect(json.rules.rooms['.read']).toBeUndefined();

		// Room code regex check
		const infoWrite = json.rules.rooms.$code.info['.write'];
		expect(infoWrite).toContain('$code.matches(/^[0-9A-Z]{2,6}$/)');

		// Moves are append-only with 6-digit seq format
		const movesWrite = json.rules.rooms.$code.moves.$seq['.write'];
		expect(movesWrite).toContain('!data.exists() && newData.exists()');
		expect(movesWrite).toContain('auth.uid');

		const movesValidate = json.rules.rooms.$code.moves.$seq['.validate'];
		expect(movesValidate).toContain('$seq.matches(/^[0-9]{6}$/)');

		const seqValidate = json.rules.rooms.$code.moves.$seq.seq['.validate'];
		expect(seqValidate).toContain('newData.val() >= 1');
		expect(seqValidate).toContain('newData.val() <= 9999');
	});

	it('validates member role and team in room roster', () => {
		const raw = readFileSync(rulesPath, 'utf8');
		const json = JSON.parse(raw);

		const roleValidate = json.rules.rooms.$code.members.$uid.role['.validate'];
		expect(roleValidate).toContain("'player'");
		expect(roleValidate).toContain("'spectator'");

		const teamValidate = json.rules.rooms.$code.members.$uid.team['.validate'];
		expect(teamValidate).toContain("'west'");
		expect(teamValidate).toContain("'east'");
	});

	it('secures private user play data and profile', () => {
		const raw = readFileSync(rulesPath, 'utf8');
		const json = JSON.parse(raw);

		const playRead = json.rules.users.$uid.play['.read'];
		const playWrite = json.rules.users.$uid.play['.write'];

		expect(playRead).toContain('$uid === auth.uid');
		expect(playWrite).toContain('$uid === auth.uid');
	});

	it('indexes leaderboard by score', () => {
		const raw = readFileSync(rulesPath, 'utf8');
		const json = JSON.parse(raw);

		expect(json.rules.leaders['.indexOn']).toContain('score');
	});

	it('strictly validates move payload bounds against cheating and overflow', () => {
		const raw = readFileSync(rulesPath, 'utf8');
		const json = JSON.parse(raw);
		const payloadRules = json.rules.rooms.$code.moves.$seq.payload;

		expect(payloadRules.tick['.validate']).toContain('newData.val() >= 0');
		expect(payloadRules.team['.validate']).toContain("'west'");
		expect(payloadRules.team['.validate']).toContain("'east'");
		expect(payloadRules.buildingType['.validate']).toContain('newData.val().length <= 16');
		expect(payloadRules.x['.validate']).toContain('newData.val() <= 120');
		expect(payloadRules.y['.validate']).toContain('newData.val() <= 60');
		expect(payloadRules.checksum['.validate']).toContain('newData.val().length <= 32');
	});

	it('strictly validates player game history stats are non-negative', () => {
		const raw = readFileSync(rulesPath, 'utf8');
		const json = JSON.parse(raw);
		const gameRules = json.rules.users.$uid.play.games.$gameId;

		expect(gameRules.wins['.validate']).toContain('newData.val() >= 0');
		expect(gameRules.losses['.validate']).toContain('newData.val() >= 0');
		expect(gameRules.score['.validate']).toContain('newData.val() >= 0');
	});

	it('protects chat messages with length bounds and sender validation', () => {
		const raw = readFileSync(rulesPath, 'utf8');
		const json = JSON.parse(raw);
		const chat = json.rules.rooms.$code.chat.$msgId;

		expect(chat['.write']).toContain("newData.child('senderUid').val() === auth.uid");
		expect(chat['.write']).toContain('!data.exists() && newData.exists()');
		expect(chat.text['.validate']).toContain('newData.val().length <= 200');
		expect(chat.senderUid['.validate']).toContain('newData.val() === auth.uid');
	});

	it('enforces strict $other: false schema locking across critical nodes', () => {
		const raw = readFileSync(rulesPath, 'utf8');
		const json = JSON.parse(raw);

		expect(json.rules.rooms.$code.info.$other['.validate']).toBe(false);
		expect(json.rules.rooms.$code.members.$uid.$other['.validate']).toBe(false);
		expect(json.rules.rooms.$code.moves.$seq.$other['.validate']).toBe(false);
		expect(json.rules.rooms.$code.moves.$seq.payload.$other['.validate']).toBe(false);
		expect(json.rules.rooms.$code.presence.$uid.$other['.validate']).toBe(false);
		expect(json.rules.rooms.$code.chat.$msgId.$other['.validate']).toBe(false);
		expect(json.rules.lobby.$gameId.$code.$other['.validate']).toBe(false);
		expect(json.rules.seek.$gameId.$uid.$other['.validate']).toBe(false);
		expect(json.rules.users.$uid.profile.$other['.validate']).toBe(false);
		expect(json.rules.users.$uid.play.$other['.validate']).toBe(false);
		expect(json.rules.leaders.$uid.$other['.validate']).toBe(false);
	});

	it('protects handle uniqueness and regex requirements', () => {
		const raw = readFileSync(rulesPath, 'utf8');
		const json = JSON.parse(raw);
		const handle = json.rules.handles.$handle;

		expect(handle['.write']).toContain('$handle.matches(/^[a-z0-9_]{3,20}$/)');
		expect(handle['.validate']).toContain('newData.val() === auth.uid');
	});

	it('plans database room sweep for stale rooms older than 24 hours', () => {
		const now = Date.now();
		const staleTime = now - (SWEEP_MAX_AGE_MS + 1000);
		const freshTime = now - 60000;

		const mockRooms = {
			STALE1: { info: { createdAt: staleTime, hostUid: 'host1' } },
			FRESH1: { info: { createdAt: freshTime, hostUid: 'host2' } },
			EMPTY1: {}
		};

		const toDelete = planRoomSweep(mockRooms, now);
		expect(toDelete).toContain('rooms/STALE1');
		expect(toDelete).toContain('lobby/STALE1');
		expect(toDelete).toContain('rooms/EMPTY1');
		expect(toDelete).not.toContain('rooms/FRESH1');
	});
});
