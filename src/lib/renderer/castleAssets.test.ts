import { describe, it, expect } from 'vitest';
import {
	getCastleStageIndex,
	WEST_CASTLE_STAGE_URLS,
	EAST_CASTLE_STAGE_URLS,
	CASTLE_FADE_DURATION_MS
} from './castleAssets';

describe('Castle Destruction Stages & Asset Mapping', () => {
	it('defines standard 400ms crossfade duration for smooth destruction stage transitions', () => {
		expect(CASTLE_FADE_DURATION_MS).toBe(400);
	});
	it('contains 8 high-resolution WebP sprites for West (Human) and East (Chaos) castles', () => {
		expect(WEST_CASTLE_STAGE_URLS).toHaveLength(8);
		expect(EAST_CASTLE_STAGE_URLS).toHaveLength(8);

		for (let i = 0; i < 8; i++) {
			expect(WEST_CASTLE_STAGE_URLS[i]).toBeDefined();
			expect(typeof WEST_CASTLE_STAGE_URLS[i]).toBe('string');
			expect(EAST_CASTLE_STAGE_URLS[i]).toBeDefined();
			expect(typeof EAST_CASTLE_STAGE_URLS[i]).toBe('string');
		}
	});

	it('maps HP percentages to correct destruction stages from 0 (pristine) to 7 (rubble)', () => {
		const maxHp = 5000;

		// Stage 0: 100% to 87.5%
		expect(getCastleStageIndex(5000, maxHp)).toBe(0);
		expect(getCastleStageIndex(4500, maxHp)).toBe(0);
		expect(getCastleStageIndex(4375, maxHp)).toBe(0);

		// Stage 1: 87.5% to 75%
		expect(getCastleStageIndex(4374, maxHp)).toBe(1);
		expect(getCastleStageIndex(3800, maxHp)).toBe(1);
		expect(getCastleStageIndex(3750, maxHp)).toBe(1);

		// Stage 2: 75% to 62.5%
		expect(getCastleStageIndex(3749, maxHp)).toBe(2);
		expect(getCastleStageIndex(3200, maxHp)).toBe(2);
		expect(getCastleStageIndex(3125, maxHp)).toBe(2);

		// Stage 3: 62.5% to 50%
		expect(getCastleStageIndex(3124, maxHp)).toBe(3);
		expect(getCastleStageIndex(2600, maxHp)).toBe(3);
		expect(getCastleStageIndex(2500, maxHp)).toBe(3);

		// Stage 4: 50% to 37.5%
		expect(getCastleStageIndex(2499, maxHp)).toBe(4);
		expect(getCastleStageIndex(2000, maxHp)).toBe(4);
		expect(getCastleStageIndex(1875, maxHp)).toBe(4);

		// Stage 5: 37.5% to 25%
		expect(getCastleStageIndex(1874, maxHp)).toBe(5);
		expect(getCastleStageIndex(1400, maxHp)).toBe(5);
		expect(getCastleStageIndex(1250, maxHp)).toBe(5);

		// Stage 6: 25% to 5%
		expect(getCastleStageIndex(1249, maxHp)).toBe(6);
		expect(getCastleStageIndex(500, maxHp)).toBe(6);
		expect(getCastleStageIndex(250, maxHp)).toBe(6);

		// Stage 7: < 5% or 0 HP (Smoking rubble)
		expect(getCastleStageIndex(249, maxHp)).toBe(7);
		expect(getCastleStageIndex(10, maxHp)).toBe(7);
		expect(getCastleStageIndex(0, maxHp)).toBe(7);
		expect(getCastleStageIndex(-50, maxHp)).toBe(7);
	});

	it('supports dynamic visual restoration when worker repairs a damaged castle', () => {
		const maxHp = 5000;
		const repairHpValues = [50, 400, 1500, 2000, 2800, 3500, 4000, 5000];
		const stages = repairHpValues.map((hp) => getCastleStageIndex(hp, maxHp));

		// Must transition progressively from ruined rubble back to pristine fortress
		expect(stages).toEqual([7, 6, 5, 4, 3, 2, 1, 0]);
	});
});
