import { describe, expect, it } from 'vitest';
import {
	getColorContentionProbabilities,
	getHumanClaimedColorIds,
	getMemberContentionInfo,
	resolveOnlineSlotColors
} from './colorLottery';
import { buildRoomSlots } from './onlineMatchSetup';
import type { Member } from './roomTypes';

describe('Online Color Palette & Weighted Lottery', () => {
	it('computes scaled contention probabilities favoring earliest claimant', () => {
		expect(getColorContentionProbabilities(1)).toEqual([1]);
		const two = getColorContentionProbabilities(2);
		expect(two[0]).toBeCloseTo(0.7, 5);
		expect(two[1]).toBeCloseTo(0.3, 5);

		const three = getColorContentionProbabilities(3);
		expect(three[0]).toBeCloseTo(0.62, 5);
		expect(three[1]).toBeCloseTo(0.19, 5);
		expect(three[2]).toBeCloseTo(0.19, 5);

		const four = getColorContentionProbabilities(4);
		expect(four.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 5);
		expect(four[0]).toBeGreaterThan(four[1] * 3);
	});

	it('reports exact live contention percentage for lobby members', () => {
		const members: Member[] = [
			{
				uid: 'u1',
				name: 'First',
				role: 'player',
				order: 1,
				slot: 1,
				colorId: 1,
				colorPickedAt: 1000
			},
			{
				uid: 'u2',
				name: 'Second',
				role: 'player',
				order: 2,
				slot: 2,
				colorId: 1,
				colorPickedAt: 2000
			}
		];
		expect(getMemberContentionInfo(members, 'u1', 1)).toEqual({
			totalClaimants: 2,
			probabilityPct: 70,
			isLeader: true
		});
		expect(getMemberContentionInfo(members, 'u2', 1)).toEqual({
			totalClaimants: 2,
			probabilityPct: 30,
			isLeader: false
		});
		expect(Array.from(getHumanClaimedColorIds(members))).toEqual([1]);
	});

	it('deterministically resolves contested colors with ~70/30 bias and assigns unique random fallbacks', () => {
		const members: Member[] = [
			{
				uid: 'u1',
				name: 'First',
				role: 'player',
				order: 1,
				slot: 1,
				team: 'west',
				colorId: 1,
				colorPickedAt: 1000
			},
			{
				uid: 'u2',
				name: 'Second',
				role: 'player',
				order: 2,
				slot: 2,
				team: 'east',
				colorId: 1,
				colorPickedAt: 2000
			},
			{ uid: 'u3', name: 'Random', role: 'player', order: 3, slot: 3, team: 'west' }
		];
		const config = { slots: buildRoomSlots(3, 3) };

		const runA = resolveOnlineSlotColors({ seed: 12345, config, members });
		const runB = resolveOnlineSlotColors({ seed: 12345, config, members });
		expect(runA).toEqual(runB);

		const colors = [runA[1], runA[2], runA[3]];
		expect(new Set(colors).size).toBe(3);

		let firstWins = 0;
		for (let seed = 1; seed <= 300; seed++) {
			const res = resolveOnlineSlotColors({ seed, config, members });
			if (res[1] === 1) firstWins++;
		}
		// Statistical check around 70% (tolerance for 300 deterministic seeds)
		expect(firstWins).toBeGreaterThan(180);
		expect(firstWins).toBeLessThan(240);
	});

	it('respects bot color picks unless claimed by a human, yielding 14 unique colors in 7v7', () => {
		const slots = buildRoomSlots(7, 7, {
			west_2: { kind: 'bot', botDifficulty: 15, colorId: 5 },
			west_3: { kind: 'bot', botDifficulty: 15 },
			west_4: { kind: 'bot', botDifficulty: 15 },
			west_5: { kind: 'bot', botDifficulty: 15 },
			west_6: { kind: 'bot', botDifficulty: 15 },
			west_7: { kind: 'bot', botDifficulty: 15 },
			east_2: { kind: 'bot', botDifficulty: 15, colorId: 6 },
			east_3: { kind: 'bot', botDifficulty: 15 },
			east_4: { kind: 'bot', botDifficulty: 15 },
			east_5: { kind: 'bot', botDifficulty: 15 },
			east_6: { kind: 'bot', botDifficulty: 15 },
			east_7: { kind: 'bot', botDifficulty: 15 }
		});
		const members: Member[] = [
			{
				uid: 'h1',
				name: 'H1',
				role: 'player',
				order: 1,
				slot: 1,
				team: 'west',
				colorId: 5,
				colorPickedAt: 1000
			},
			{ uid: 'h2', name: 'H2', role: 'player', order: 2, slot: 2, team: 'east' }
		];

		const res = resolveOnlineSlotColors({ seed: 999, config: { slots }, members });
		// Human wins color 5 (bot on slot 3 yields back to random)
		expect(res[1]).toBe(5);
		expect(res[3]).not.toBe(5);
		// Bot on slot 4 keeps unclaimed color 6
		expect(res[4]).toBe(6);
		// All 14 slots receive distinct colors
		const allValues = Object.values(res);
		expect(allValues).toHaveLength(14);
		expect(new Set(allValues).size).toBe(14);
	});
});
