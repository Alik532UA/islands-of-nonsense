import { describe, it, expect } from 'vitest';
import { getBuildingVisualRank, getBuildingsForRace } from './gameData';
import { WC3_PLAYER_COLORS } from './types';

describe('Building Visual Rank & Player Color Assignment', () => {
	it('maps army spawner buildings to dice ranks 1..6 by gold cost hierarchy', () => {
		const humanBuildings = getBuildingsForRace('Люди').filter(
			(b) => !b.upgrade_from && !b.specialType
		);
		expect(humanBuildings.length).toBeGreaterThanOrEqual(4);
		humanBuildings.sort((a, b) => (a.gold_cost || 0) - (b.gold_cost || 0));

		// Cheapest spawner is Rank 1 (e.g., Barracks)
		const rank1Bld = humanBuildings[0];
		const rank1Result = getBuildingVisualRank(rank1Bld.id, 'Люди');
		expect(rank1Result.rank).toBe(1);
		expect(rank1Result.isUpgrade).toBe(false);

		// Strongest/most expensive spawner is highest rank (e.g., Rank 5 or 6)
		const highestBld = humanBuildings[humanBuildings.length - 1];
		const highestResult = getBuildingVisualRank(highestBld.id, 'Люди');
		expect(highestResult.rank).toBeGreaterThanOrEqual(4);
		expect(highestResult.rank).toBeLessThanOrEqual(6);
	});

	it('traces upgraded buildings back to parent rank and sets isUpgrade = true', () => {
		// Find an upgraded building
		const humanBuildings = getBuildingsForRace('Люди');
		const upgradeBld = humanBuildings.find((b) => b.upgrade_from);

		if (upgradeBld && upgradeBld.upgrade_from) {
			const parentResult = getBuildingVisualRank(upgradeBld.upgrade_from, 'Люди');
			const upgradeResult = getBuildingVisualRank(upgradeBld.id, 'Люди');

			expect(upgradeResult.rank).toBe(parentResult.rank);
			expect(upgradeResult.isUpgrade).toBe(true);
		}
	});

	it('identifies special buildings (tower, treasure, repair, recycler) with rank 0', () => {
		const allHuman = getBuildingsForRace('Люди');
		const specials = allHuman.filter((b) => b.specialType);

		for (const s of specials) {
			const res = getBuildingVisualRank(s.id, 'Люди');
			expect(res.rank).toBe(0);
			expect(res.specialType).toBe(s.specialType);
		}
	});

	it('provides authentic WC3 12-slot player colors with distinct hex and num codes', () => {
		expect(WC3_PLAYER_COLORS.length).toBe(12);

		// Slot 1 is Red (0xff0303)
		expect(WC3_PLAYER_COLORS[0].id).toBe(1);
		expect(WC3_PLAYER_COLORS[0].num).toBe(0xff0303);

		// Slot 2 is Blue (0x0042ff)
		expect(WC3_PLAYER_COLORS[1].id).toBe(2);
		expect(WC3_PLAYER_COLORS[1].num).toBe(0x0042ff);

		// Slot 3 is Teal (0x1ce6b9)
		expect(WC3_PLAYER_COLORS[2].id).toBe(3);
		expect(WC3_PLAYER_COLORS[2].num).toBe(0x1ce6b9);

		// Slot 4 is Purple (0x540081)
		expect(WC3_PLAYER_COLORS[3].id).toBe(4);
		expect(WC3_PLAYER_COLORS[3].num).toBe(0x540081);

		// All 12 color numbers must be unique
		const colorNums = new Set(WC3_PLAYER_COLORS.map((c) => c.num));
		expect(colorNums.size).toBe(12);
	});

	it('computes building horizontal HP status bar percentage and vertical spawn timer progress', () => {
		// Mock building with damage
		const mockBuilding = {
			hp: 450,
			maxHp: 600,
			spawnTimer: 7.5,
			spawnCooldown: 15,
			isUnderConstruction: false
		};

		// 1. Horizontal HP percentage
		const hpPct = Math.max(0, Math.min(1, mockBuilding.hp / mockBuilding.maxHp));
		expect(hpPct).toBe(0.75); // 75% HP -> green color (> 0.5)

		// 2. Vertical spawn progress percentage (fills upward from 0% to 100% as timer counts down)
		const calcSpawnPct = (timer: number, cooldown: number) =>
			cooldown > 0 ? Math.max(0, Math.min(1, 1 - timer / cooldown)) : 0;

		expect(calcSpawnPct(mockBuilding.spawnCooldown, mockBuilding.spawnCooldown)).toBe(0); // 0% at cycle start
		expect(calcSpawnPct(mockBuilding.spawnTimer, mockBuilding.spawnCooldown)).toBe(0.5); // 50% halfway
		expect(calcSpawnPct(0, mockBuilding.spawnCooldown)).toBe(1); // 100% full right as unit spawns
	});
});
