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
		expect(payloadRules.x['.validate']).toContain('newData.val() >= -60');
		expect(payloadRules.x['.validate']).toContain('newData.val() <= 120');
		expect(payloadRules.y['.validate']).toContain('newData.val() <= 70');
		expect(payloadRules.checksum['.validate']).toContain('newData.val().length <= 32');
		expect(payloadRules.itemId['.validate']).toContain('newData.val().length <= 64');
		expect(payloadRules.forgeType['.validate']).toContain("'attack'");
		expect(payloadRules.forgeType['.validate']).toContain("'armor'");
		expect(payloadRules.forgeType['.validate']).toContain("'econ'");
		expect(payloadRules.shiftKey['.validate']).toContain('isBoolean()');
	});

	it('strictly validates player game history stats are non-negative', () => {
		const raw = readFileSync(rulesPath, 'utf8');
		const json = JSON.parse(raw);
		const gameRules = json.rules.users.$uid.play.games.$gameId;

		expect(gameRules.wins['.validate']).toContain('newData.val() >= 0');
		expect(gameRules.losses['.validate']).toContain('newData.val() >= 0');
		expect(gameRules.score['.validate']).toContain('newData.val() >= 0');
	});

	it('protects chat messages with length bounds, sender validation, and anti-spam rate limit', () => {
		const raw = readFileSync(rulesPath, 'utf8');
		const json = JSON.parse(raw);
		const chat = json.rules.rooms.$code.chat.$msgId;

		expect(chat['.write']).toContain("newData.child('senderUid').val() === auth.uid");
		expect(chat['.write']).toContain('!data.exists() && newData.exists()');
		expect(chat['.write']).toContain('lastChatAt');
		expect(chat.text['.validate']).toContain('newData.val().length <= 200');
		expect(chat.senderUid['.validate']).toContain('newData.val() === auth.uid');
	});

	it('scopes moves, chat, and presence reads to room members and enforces move cooldowns', () => {
		const raw = readFileSync(rulesPath, 'utf8');
		const json = JSON.parse(raw);
		const room = json.rules.rooms.$code;

		expect(room['.read']).toBeUndefined();
		expect(room.info['.read']).toBe('auth != null');
		expect(room.members['.read']).toBe('auth != null');
		expect(room.moves['.read']).toContain('members');
		expect(room.chat['.read']).toContain('members');
		expect(room.presence['.read']).toContain('members');

		const movesWrite = room.moves.$seq['.write'];
		expect(movesWrite).toContain('lastMoveAt');
		expect(movesWrite).toContain('now - 80');

		const member = room.members.$uid;
		expect(member.order['.validate']).toContain('<= 20');
		expect(member.slot['.validate']).toContain('<= 14');
		expect(member.lastMoveAt['.validate']).toContain(
			'!data.exists() || newData.val() > data.val()'
		);
		expect(member.lastChatAt['.validate']).toContain(
			'!data.exists() || newData.val() > data.val()'
		);

		const payloadRules = room.moves.$seq.payload;
		expect(payloadRules.commanderId['.validate']).toContain("'random'");
		expect(payloadRules.playerSlot['.validate']).toContain('<= 14');
		expect(room.info.config.fogOfWar['.validate']).toBe('newData.isBoolean()');
		expect(room.info.config.startGold['.validate']).toContain('99999');
		expect(room.info.config.coinSpawnInterval['.validate']).toContain('<= 100');
		expect(room.info.config.coinCount['.validate']).toContain('<= 15');
		expect(room.info.config.bannedRaces.$idx['.validate']).toContain('<= 32');
		expect(room.info.config.slots.$slotKey['.validate']).toContain('(west|east)_[1-7]');
		expect(room.info.config.slots.$slotKey.colorId['.validate']).toContain('<= 14');
		expect(room.info.config.slots.$slotKey.$other['.validate']).toBe(false);
		expect(member.colorId['.validate']).toContain('<= 14');
		expect(member.colorPickedAt['.validate']).toContain('now');
		expect(room.moves.$seq.type['.validate']).toContain("'SET_RACE'");
	});

	it('enforces strict $other: false schema locking across critical nodes', () => {
		const raw = readFileSync(rulesPath, 'utf8');
		const json = JSON.parse(raw);

		expect(json.rules.rooms.$code.info.$other['.validate']).toBe(false);
		expect(json.rules.rooms.$code.info.config.$other['.validate']).toBe(false);
		expect(json.rules.rooms.$code.info.roster.$uid.$other['.validate']).toBe(false);
		expect(json.rules.rooms.$code.$other['.validate']).toBe(false);
		expect(json.rules.rooms.$code.members.$uid.$other['.validate']).toBe(false);
		expect(json.rules.rooms.$code.moves.$seq.$other['.validate']).toBe(false);
		expect(json.rules.rooms.$code.moves.$seq.payload.$other['.validate']).toBe(false);
		expect(json.rules.rooms.$code.presence.$uid.$other['.validate']).toBe(false);
		expect(json.rules.rooms.$code.chat.$msgId.$other['.validate']).toBe(false);
		expect(json.rules.lobby.$gameId.$code.$other['.validate']).toBe(false);
		expect(json.rules.seek.$gameId.$uid.$other['.validate']).toBe(false);
		expect(json.rules.users.$uid.$other['.validate']).toBe(false);
		expect(json.rules.users.$uid.profile.$other['.validate']).toBe(false);
		expect(json.rules.users.$uid.play.$other['.validate']).toBe(false);
		expect(json.rules.leaders.$uid.$other['.validate']).toBe(false);
		expect(json.rules.myRooms.$uid.$code.$other['.validate']).toBe(false);
	});

	it('enforces room info immutability, lobby bounded queries, and non-anonymous profiles/leaders', () => {
		const raw = readFileSync(rulesPath, 'utf8');
		const json = JSON.parse(raw);

		const info = json.rules.rooms.$code.info;
		expect(info['.write']).toContain("!data.parent().child('members').exists()");
		expect(info['.write']).toContain("!data.parent().child('moves').exists()");
		expect(info.gameId['.validate']).toContain('!data.exists() || newData.val() === data.val()');
		expect(info.createdAt['.validate']).toContain('newData.val() === data.val()');
		expect(info.roster.$uid.name['.validate']).toContain('members');

		const member = json.rules.rooms.$code.members.$uid;
		expect(member.order['.validate']).toContain('!data.exists() || newData.val() === data.val()');
		expect(member.account['.validate']).toContain('sign_in_provider');

		expect(json.rules.lobby.$gameId['.indexOn']).toContain('createdAt');
		expect(json.rules.lobby.$gameId['.read']).toContain('limitToLast <= 30');
		expect(json.rules.lobby.$gameId.$code['.write']).not.toContain('|| !newData.exists()');

		expect(json.rules.seek.$gameId['.indexOn']).toContain('at');
		expect(json.rules.seek.$gameId['.read']).toContain('limitToLast <= 30');

		expect(json.rules.users.$uid.profile['.validate']).toContain('sign_in_provider');
		expect(json.rules.users.$uid.profile.handle['.validate']).toContain('handles');
		expect(json.rules.leaders['.read']).toContain('limitToLast <= 50');
		expect(json.rules.leaders.$uid.score['.validate']).toContain('play/score');
		expect(json.rules.myRooms.$uid.$code['.validate']).toContain(
			'$code.matches(/^[0-9A-Z]{2,6}$/)'
		);
	});

	it('protects handle uniqueness and regex requirements', () => {
		const raw = readFileSync(rulesPath, 'utf8');
		const json = JSON.parse(raw);
		const handle = json.rules.handles.$handle;

		expect(handle['.write']).toContain('$handle.matches(/^[a-z0-9_]{3,20}$/)');
		expect(handle['.validate']).toContain('newData.val() === auth.uid');
	});

	it('plans database room sweep for stale rooms older than 2 hours', () => {
		const now = Date.now();
		const staleTime = now - (SWEEP_MAX_AGE_MS + 1000);
		const freshTime = now - 60000;

		const mockRooms = {
			STALE1: { info: { createdAt: staleTime, hostUid: 'host1', gameId: 'islands-of-nonsense' } },
			FRESH1: { info: { createdAt: freshTime, hostUid: 'host2', gameId: 'islands-of-nonsense' } },
			EMPTY1: {}
		};

		const toDelete = planRoomSweep(mockRooms, now, {
			lobbyByGame: {
				'islands-of-nonsense': {
					STALE1: { createdAt: staleTime },
					ORPHAN: { createdAt: freshTime },
					FRESH1: { createdAt: freshTime }
				}
			},
			seekByGame: {
				'islands-of-nonsense': {
					oldSeek: { at: staleTime },
					newSeek: { at: freshTime }
				}
			},
			myRooms: {
				host1: {
					STALE1: { createdAt: staleTime },
					GONE99: { createdAt: freshTime },
					FRESH1: { createdAt: freshTime }
				}
			}
		});
		expect(toDelete).toContain('rooms/STALE1');
		expect(toDelete).toContain('lobby/islands-of-nonsense/STALE1');
		expect(toDelete).toContain('lobby/islands-of-nonsense/ORPHAN');
		expect(toDelete).toContain('seek/islands-of-nonsense/oldSeek');
		expect(toDelete).toContain('myRooms/host1/STALE1');
		expect(toDelete).toContain('myRooms/host1/GONE99');
		expect(toDelete).toContain('rooms/EMPTY1');
		expect(toDelete).not.toContain('rooms/FRESH1');
		expect(toDelete).not.toContain('lobby/islands-of-nonsense/FRESH1');
		expect(toDelete).not.toContain('seek/islands-of-nonsense/newSeek');
		expect(toDelete).not.toContain('myRooms/host1/FRESH1');
	});
});
