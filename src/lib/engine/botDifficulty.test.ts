import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { getBuilding } from './gameData';

describe('Point 3: Bot Difficulty Gradation (CF_BD: 0, 15, 30, 80)', () => {
	it('assigns botDifficulty configuration correctly to bot players', () => {
		const simEasy = new Simulation({ botDifficulty: 0, startGold: 500 });
		expect(simEasy.players.east.botDifficulty).toBe(0);

		const simNormal = new Simulation({ botDifficulty: 15, startGold: 500 });
		expect(simNormal.players.east.botDifficulty).toBe(15);

		const simHard = new Simulation({ botDifficulty: 30, startGold: 500 });
		expect(simHard.players.east.botDifficulty).toBe(30);

		const simInsane = new Simulation({ botDifficulty: 80, startGold: 500 });
		expect(simInsane.players.east.botDifficulty).toBe(80);
	});

	it('scales bot passive income based on CF_BD formula (m += cfM * CF_BD / 100)', () => {
		// 0% bot with buildings
		const simZero = new Simulation({ botDifficulty: 0, startGold: 2000 });
		simZero.build('east', 'h037', 25, 20);
		simZero.build('east', 'h038', 25, 24);
		const zeroIncome = simZero.calculateIncome('east');

		// Normal bot (+15% income)
		const simNormal = new Simulation({ botDifficulty: 15, startGold: 2000 });
		simNormal.build('east', 'h037', 25, 20);
		simNormal.build('east', 'h038', 25, 24);
		const normalIncome = simNormal.calculateIncome('east');

		// Hard bot (+30% income)
		const simHard = new Simulation({ botDifficulty: 30, startGold: 2000 });
		simHard.build('east', 'h037', 25, 20);
		simHard.build('east', 'h038', 25, 24);
		const hardIncome = simHard.calculateIncome('east');

		// Insane bot (+80% income)
		const simInsane = new Simulation({ botDifficulty: 80, startGold: 2000 });
		simInsane.build('east', 'h037', 25, 20);
		simInsane.build('east', 'h038', 25, 24);
		const insaneIncome = simInsane.calculateIncome('east');

		expect(normalIncome).toBeGreaterThan(zeroIncome);
		expect(hardIncome).toBeGreaterThan(normalIncome);
		expect(insaneIncome).toBeGreaterThan(hardIncome);
	});

	it('scales spawned unit damage based on CF_BD formula: steps = (CF_BD + 2) / 4 * 4%', () => {
		// 0%: 0 steps (+0%)
		const sim0 = new Simulation({ botDifficulty: 0, startGold: 2000 });
		const bld0 = sim0.build('east', 'h037', 25, 20); // Каплиця
		expect(bld0).toBe(true);
		const unit0 = sim0.buildingSystem.spawnUnitFromBuilding(sim0.buildings[0]);
		expect(unit0).toBeDefined();

		// 15%: (15 + 2)/4 = 4 steps (+16% damage)
		const sim15 = new Simulation({ botDifficulty: 15, startGold: 2000 });
		sim15.build('east', 'h037', 25, 20);
		const unit15 = sim15.buildingSystem.spawnUnitFromBuilding(sim15.buildings[0]);
		expect(unit15).toBeDefined();

		// 30%: (30 + 2)/4 = 8 steps (+32% damage)
		const sim30 = new Simulation({ botDifficulty: 30, startGold: 2000 });
		sim30.build('east', 'h037', 25, 20);
		const unit30 = sim30.buildingSystem.spawnUnitFromBuilding(sim30.buildings[0]);
		expect(unit30).toBeDefined();

		// 80%: (80 + 2)/4 = 20 steps (+80% damage)
		const sim80 = new Simulation({ botDifficulty: 80, startGold: 2000 });
		sim80.build('east', 'h037', 25, 20);
		const unit80 = sim80.buildingSystem.spawnUnitFromBuilding(sim80.buildings[0]);
		expect(unit80).toBeDefined();

		if (unit0 && unit15 && unit30 && unit80) {
			expect(unit15.damageMin).toBeGreaterThan(unit0.damageMin);
			expect(unit30.damageMin).toBeGreaterThan(unit15.damageMin);
			expect(unit80.damageMin).toBeGreaterThan(unit30.damageMin);
		}
	});

	it('preserves botDifficulty across match round resets', () => {
		const sim = new Simulation({ botDifficulty: 30, startGold: 500 });
		expect(sim.players.east.botDifficulty).toBe(30);

		sim.resetRound();
		expect(sim.players.east.botDifficulty).toBe(30);
		expect(sim.players.east.gold).toBe(500);
	});
});
