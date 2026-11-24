import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import {
	calculateBuildingWeightedValue,
	calculateDiminishingReturns,
	getIncomeIntervalForTime
} from './economySystem';
import type { Building } from './types';

describe('Point 1: Weighted Building Value (Dx, ea, To) and Diminishing Returns', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 2000 });
		sim.decorations = [];
	});

	it('applies correct relative weights for regular, siege, and special buildings', () => {
		const regularBuilding: Building = {
			instanceId: 'b1',
			defId: 'h000',
			name: 'Казарми людей',
			team: 'west',
			tileX: 10,
			tileY: 10,
			x: 320,
			y: 320,
			hp: 1000,
			maxHp: 1000,
			armor: 5,
			armorType: 'fort',
			goldCost: 200,
			spawnUnitId: 'hfoo',
			spawnCooldown: 14,
			spawnTimer: 14,
			lane: 'top',
			upgradeFrom: null,
			race: 'Люди'
		};

		const siegeBuilding: Building = {
			...regularBuilding,
			instanceId: 'b2',
			defId: 'h002',
			goldCost: 300,
			attackType: 'siege'
		};

		const specialTower: Building = {
			...regularBuilding,
			instanceId: 'b3',
			defId: 'h006',
			goldCost: 150,
			specialType: 'tower'
		};

		const treasureBox: Building = {
			...regularBuilding,
			instanceId: 'b4',
			defId: 'h008',
			goldCost: 160,
			specialType: 'treasure'
		};

		// Dx = 0.20 (1.0 factor) -> 200 * 1.0 = 200
		expect(calculateBuildingWeightedValue(regularBuilding)).toBe(200);

		// ea = 0.18 (0.9 factor) -> 300 * 0.9 = 270
		expect(calculateBuildingWeightedValue(siegeBuilding)).toBe(270);

		// To = 0.08 (0.4 factor) -> 150 * 0.4 = 60
		expect(calculateBuildingWeightedValue(specialTower)).toBe(60);

		// Treasure box is also a special building: To = 0.08 (0.4 factor) -> 160 * 0.4 = 64
		expect(calculateBuildingWeightedValue(treasureBox)).toBe(64);
	});

	it('computes diminishing returns correctly across tiers', () => {
		// Below step 25: 100% value
		expect(calculateDiminishingReturns(15)).toBe(15);
		expect(calculateDiminishingReturns(25)).toBe(25);

		// Tier 1 overflow (step 25..50): 15% discount on overflow
		// 35 = 25 * 1.0 + 10 * 0.85 = 25 + 8.5 = 33.5
		expect(calculateDiminishingReturns(35)).toBe(33.5);

		// Large value (65):
		// 25 * 1.0 + 25 * 0.85 + 15 * 0.70 = 25 + 21.25 + 10.5 = 56.75
		expect(calculateDiminishingReturns(65)).toBe(56.75);
	});

	it('calculates player income in simulation factoring in building weights', () => {
		const initialIncome = sim.calculateIncome('west');
		// Initial income with 0 buildings is round(5 * 0.65) = 3
		expect(initialIncome).toBe(3);

		// Build a regular spawner (h000, 100g -> rawBase 7 * 0.65 = 4.55 -> 5)
		sim.build('west', 'h000', 25, 20);
		const incomeWithBarracks = sim.calculateIncome('west');
		expect(incomeWithBarracks).toBe(5);
		expect(incomeWithBarracks).toBeGreaterThan(initialIncome);

		// Build a second building with substantial cost (h038 Cathedral, 250g)
		// bldValue = 100 + 250 = 350 -> rawBase 12 * 0.65 = 7.8 -> 8
		sim.build('west', 'h038', 25, 24);
		const incomeWithCathedral = sim.calculateIncome('west');
		expect(incomeWithCathedral).toBe(8);
		expect(incomeWithCathedral).toBeGreaterThan(incomeWithBarracks);
	});

	it('scales periodic gold payout interval by +1s every minute starting at 5s', () => {
		// Starts at 5s in minute 1 and resets back to 5s on resetRound()
		expect(sim.incomeInterval).toBe(5);
		expect(sim.incomeTimer).toBe(5);

		expect(getIncomeIntervalForTime(0)).toBe(5); // 1st minute
		expect(getIncomeIntervalForTime(59.9)).toBe(5); // still 1st minute
		expect(getIncomeIntervalForTime(60)).toBe(6); // 2nd minute
		expect(getIncomeIntervalForTime(119.9)).toBe(6); // still 2nd minute
		expect(getIncomeIntervalForTime(120)).toBe(7); // 3rd minute
		expect(getIncomeIntervalForTime(180)).toBe(8); // 4th minute
		expect(getIncomeIntervalForTime(540)).toBe(14); // 10th minute

		// Verify live simulation payout cadence in minute 1 (every 5s)
		const startGold = sim.players.west.gold;
		const expectedPayout = sim.calculateIncome('west');
		for (let i = 0; i < 100; i++) {
			sim.step(0.05); // 5.0s elapsed -> 1 payout
		}
		expect(sim.players.west.gold).toBe(startGold + expectedPayout);
		expect(sim.incomeInterval).toBe(5);

		// Jump to 2nd minute (60s) and trigger next economy tick -> interval updates to 6s
		sim.gameTime = 60;
		sim.economySystem.updateEconomy(0.05);
		expect(sim.incomeInterval).toBe(6);

		// Jump to 3rd minute (120s) -> interval updates to 7s
		sim.gameTime = 120;
		sim.economySystem.updateEconomy(0.05);
		expect(sim.incomeInterval).toBe(7);

		sim.resetRound();
		expect(sim.incomeInterval).toBe(5);
		expect(sim.incomeTimer).toBe(5);
	});
});
