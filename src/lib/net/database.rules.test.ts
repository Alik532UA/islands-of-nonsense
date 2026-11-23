import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('database.rules.json security invariants', () => {
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

	it('protects room enumeration and moves immutability', () => {
		const raw = readFileSync(rulesPath, 'utf8');
		const json = JSON.parse(raw);

		// Cannot read /rooms list
		expect(json.rules.rooms['.read']).toBeUndefined();

		// Moves are append-only
		const movesWrite = json.rules.rooms.$code.moves.$seq['.write'];
		expect(movesWrite).toContain('!data.exists() && newData.exists()');
		expect(movesWrite).toContain('auth.uid');
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
});
