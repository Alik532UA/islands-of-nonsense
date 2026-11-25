import { describe, it, expect } from 'vitest';
import {
	BOARD_LIMIT,
	BOARD_MIN_SCORE,
	filterLeadersByCountry,
	findLeaderRank,
	mergeLeaderRows,
	sortLeaders,
	type Leader
} from './leaders';

describe('leaders', () => {
	it('has sensible board limits and min scores', () => {
		expect(BOARD_LIMIT).toBe(50);
		expect(BOARD_MIN_SCORE).toBeGreaterThanOrEqual(1);
	});

	it('validates leader structure', () => {
		const leader: Leader = {
			uid: 'user_1',
			name: 'General',
			handle: 'general_99',
			score: 420,
			wins: 10,
			plays: 12,
			winRate: 83,
			country: 'ua',
			avatar: 'cat:amber'
		};
		expect(leader.score).toBe(420);
		expect(leader.handle).toBe('general_99');
	});

	it('sorts leaders by score, wins, or winRate and resolves rank and country filters', () => {
		const rows: Leader[] = [
			{
				uid: 'u1',
				name: 'A',
				handle: 'aaa',
				score: 300,
				wins: 2,
				plays: 10,
				winRate: 20,
				country: 'ua'
			},
			{
				uid: 'u2',
				name: 'B',
				handle: 'bbb',
				score: 200,
				wins: 8,
				plays: 10,
				winRate: 80,
				country: 'pl'
			},
			{
				uid: 'u3',
				name: 'C',
				handle: 'ccc',
				score: 500,
				wins: 5,
				plays: 10,
				winRate: 50,
				country: 'ua'
			}
		];

		expect(sortLeaders(rows, 'score').map((r) => r.uid)).toEqual(['u3', 'u1', 'u2']);
		expect(sortLeaders(rows, 'wins').map((r) => r.uid)).toEqual(['u2', 'u3', 'u1']);
		expect(sortLeaders(rows, 'winRate').map((r) => r.uid)).toEqual(['u2', 'u3', 'u1']);
		expect(filterLeadersByCountry(rows, 'UA').map((r) => r.uid)).toEqual(['u1', 'u3']);
		expect(findLeaderRank(sortLeaders(rows, 'score'), 'u1')).toBe(2);
	});

	it('merges extra friend rows without duplicating existing entries', () => {
		const top: Leader[] = [
			{ uid: 'u1', name: 'Top1', handle: 'top1', score: 900 },
			{ uid: 'u2', name: 'Top2', handle: 'top2', score: 700 }
		];
		const friends: Leader[] = [
			{ uid: 'u2', name: 'Top2 Dup', handle: 'top2', score: 10 },
			{ uid: 'u3', name: 'Friend', handle: 'friend', score: 120 }
		];
		const merged = mergeLeaderRows(top, friends);
		expect(merged.map((r) => r.uid)).toEqual(['u1', 'u2', 'u3']);
		expect(merged[1]?.score).toBe(700);
	});
});
