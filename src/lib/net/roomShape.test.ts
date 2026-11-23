import { describe, it, expect } from 'vitest';
import {
	moveKey,
	MOVE_SEQ_MAX,
	rosterToRecord,
	rosterFromRecord,
	infoFromDb,
	membersFromDb,
	snapshotFromDb
} from './roomShape';
import type { RosterEntry } from './roomTypes';

describe('roomShape', () => {
	it('formats moveKey with 6 padded digits', () => {
		expect(moveKey(1)).toBe('000001');
		expect(moveKey(42)).toBe('000042');
		expect(moveKey(9999)).toBe('009999');
	});

	it('converts roster to record and back preserving seat order', () => {
		const roster: RosterEntry[] = [
			{ uid: 'u1', name: 'Player 1', team: 'west' },
			{ uid: 'u2', name: 'Player 2', team: 'east' }
		];
		const record = rosterToRecord(roster);
		expect(record).toEqual({
			u1: { name: 'Player 1', seat: 0, team: 'west' },
			u2: { name: 'Player 2', seat: 1, team: 'east' }
		});

		const back = rosterFromRecord(record);
		expect(back).toEqual(roster);
	});

	it('handles corrupt roster record gracefully', () => {
		expect(rosterFromRecord(null)).toBeUndefined();
		expect(rosterFromRecord({})).toBeUndefined();
		expect(rosterFromRecord({ bad: { foo: 'bar' } })).toBeUndefined();
	});

	it('parses members from db object record', () => {
		const members = membersFromDb({
			u1: { name: 'Alice', role: 'player', order: 1 }
		});
		expect(members).toEqual([{ uid: 'u1', name: 'Alice', role: 'player', order: 1 }]);
	});

	it('parses snapshot from db and orders moves numerically', () => {
		const raw = {
			info: {
				gameId: 'castlefight',
				rulesVersion: 1,
				seed: 12345,
				status: 'playing' as const,
				hostUid: 'host1',
				createdAt: 1000,
				config: { modeId: 'standard', teamSize: 1 as const, targetWins: 2 }
			},
			members: {
				host1: { name: 'Host', role: 'player' as const, order: 1 }
			},
			moves: {
				'000002': { seq: 2, by: 'host1', type: 'BUILD' },
				'000001': { seq: 1, by: 'host1', type: 'HEARTBEAT' }
			}
		};

		const snap = snapshotFromDb(raw);
		expect(snap).not.toBeNull();
		expect(snap?.moves[0].seq).toBe(1);
		expect(snap?.moves[1].seq).toBe(2);
	});

	it('returns null snapshot if info is missing', () => {
		expect(snapshotFromDb(null)).toBeNull();
		expect(snapshotFromDb({})).toBeNull();
	});
});
