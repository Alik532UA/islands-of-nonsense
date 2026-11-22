import { describe, it, expect, beforeEach } from 'vitest';
import { BotAI } from './botAI';
import { Simulation } from './simulation';
import { UNITS_MAP } from './gameData';
import type { BuildingDefinition, UnitDefinition } from './types';

describe('Point 8: Tactical Counter-Pick Bot AI', () => {
	let sim: Simulation;
	let botAI: BotAI;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 15, startGold: 500 });
		botAI = new BotAI(sim, 'east');
	});

	it('should calculate correct price tier based on income and gold thresholds', () => {
		// Tier 0: low income and low gold
		expect(botAI.calculateTier(10, 200)).toBe(0);

		// Tier 1: income >= 15
		expect(botAI.calculateTier(15, 200)).toBe(1);

		// Tier 2: income >= 27 or gold >= 360
		expect(botAI.calculateTier(27, 200)).toBe(2);
		expect(botAI.calculateTier(10, 360)).toBe(2);

		// Tier 3: income >= 65 or gold >= 560
		expect(botAI.calculateTier(65, 200)).toBe(3);
		expect(botAI.calculateTier(10, 560)).toBe(3);

		// Tier 4: gold >= 800
		expect(botAI.calculateTier(10, 850)).toBe(4);
	});

	it('should scan enemy army to detect flyers, armor types, and lane pressure', () => {
		// West flying unit on top lane
		sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 220,
			hp: 500
		});
		// Mark it flying and heavy
		sim.units[sim.units.length - 1].flying = true;
		sim.units[sim.units.length - 1].armorType = 'large';

		// West ground light unit on bottom lane
		sim.spawnUnitDirectly({
			team: 'west',
			lane: 'bottom',
			x: 600,
			y: 580,
			hp: 300
		});
		sim.units[sim.units.length - 1].armorType = 'small';

		const scan = botAI.scanEnemyArmy();
		expect(scan.totalCount).toBe(2);
		expect(scan.flyingCount).toBe(1);
		expect(scan.heavyCount).toBe(1);
		expect(scan.lightCount).toBe(1);
		expect(scan.topPressure).toBeGreaterThan(0);
		expect(scan.bottomPressure).toBeGreaterThan(0);
	});

	it('should heavily prioritize anti-air units when enemy has flyers', () => {
		const scanWithFlyers = {
			flyingCount: 2,
			heavyCount: 0,
			lightCount: 2,
			fortCount: 0,
			mediumCount: 0,
			totalCount: 2,
			topPressure: 500,
			bottomPressure: 500
		};

		// Anti-air building (spawns ranged unit with range 450)
		UNITS_MAP.set('u_test_archer', {
			id: 'u_test_archer',
			name: 'Лучник',
			hp: 350,
			armor: 1,
			armor_type: 'small',
			attack_type: 'pierce',
			gold_cost: 0,
			range: 450,
			flying: false
		} as UnitDefinition);

		// Melee grounded building (spawns unit with range 90)
		UNITS_MAP.set('u_test_footman', {
			id: 'u_test_footman',
			name: 'Піхотинець',
			hp: 500,
			armor: 3,
			armor_type: 'large',
			attack_type: 'normal',
			gold_cost: 0,
			range: 90,
			flying: false
		} as UnitDefinition);

		const antiAirBuilding: BuildingDefinition = {
			id: 'b_aa',
			name: 'Вартова вежа',
			hp: 1000,
			armor: 5,
			armor_type: 'fort',
			attack_type: 'pierce',
			gold_cost: 200,
			unit: 'u_test_archer',
			upgrade_from: null,
			upgrade_extra_cost: 0,
			race: 'Люди'
		};

		const meleeBuilding: BuildingDefinition = {
			id: 'b_melee',
			name: 'Казарми піхоти',
			hp: 1200,
			armor: 5,
			armor_type: 'fort',
			attack_type: 'normal',
			gold_cost: 200,
			unit: 'u_test_footman',
			upgrade_from: null,
			upgrade_extra_cost: 0,
			race: 'Люди'
		};

		const scoreAA = botAI.scoreBuilding(antiAirBuilding, 1, scanWithFlyers, 0);
		const scoreMelee = botAI.scoreBuilding(meleeBuilding, 1, scanWithFlyers, 0);

		// Anti-air should score significantly higher than melee when flyers exist
		expect(scoreAA).toBeGreaterThan(scoreMelee);
	});

	it('should apply -60 penalty for duplicate buildings to force army diversity', () => {
		const emptyScan = {
			flyingCount: 0,
			heavyCount: 0,
			lightCount: 0,
			fortCount: 0,
			mediumCount: 0,
			totalCount: 0,
			topPressure: 0,
			bottomPressure: 0
		};

		const building: BuildingDefinition = {
			id: 'b_test',
			name: 'Тестова споруда',
			hp: 1000,
			armor: 5,
			armor_type: 'fort',
			attack_type: 'normal',
			gold_cost: 200,
			unit: '',
			upgrade_from: null,
			upgrade_extra_cost: 0,
			race: 'Люди'
		};

		const scoreZeroDuplicates = botAI.scoreBuilding(building, 1, emptyScan, 0);
		const scoreOneDuplicate = botAI.scoreBuilding(building, 1, emptyScan, 1);
		const scoreTwoDuplicates = botAI.scoreBuilding(building, 1, emptyScan, 2);

		expect(scoreZeroDuplicates - scoreOneDuplicate).toBe(60);
		expect(scoreOneDuplicate - scoreTwoDuplicates).toBe(60);
	});

	it('should execute build orders when bot has gold and valid slots', () => {
		sim.players.east.gold = 600;
		// Set forge to max so bot proceeds directly to building placement
		sim.players.east.forge = { attack: 5, armor: 4, econ: 2 };

		const initBuildingCount = sim.buildings.filter((b) => b.team === 'east').length;

		botAI.update(2.0); // Trigger makeDecision

		const afterBuildingCount = sim.buildings.filter((b) => b.team === 'east').length;
		expect(afterBuildingCount).toBeGreaterThan(initBuildingCount);
	});

	it('should adapt commander based on chosen race and strategy', () => {
		sim.players.east.race = 'Люди';
		botAI.update(2.0);
		expect(sim.players.east.commander).toBe(1); // Sasha for economy

		sim.players.east.race = 'Ельфи';
		sim.players.east.commander = 3;
		botAI.update(2.0);
		expect(sim.players.east.commander).toBe(5); // Yura for ranged crit
	});

	it('should evacuate worker and order repair when enemies breach the base', () => {
		sim.players.east.gold = 100;
		sim.castles.east.hp = 10000; // Damaged castle
		const worker = sim.players.east.worker;
		expect(worker).toBeDefined();
		if (!worker) return;

		// West unit breaches into East courtyard (x >= 5700)
		sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 6000,
			y: 660,
			hp: 1000
		});

		botAI.update(2.0);

		// Worker must be tasked with repairing or retreating
		expect(
			worker.isRepairing || worker.targetRepairBuildingId || worker.targetX > 6800
		).toBeTruthy();
	});
});
