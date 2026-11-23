import { describe, it, expect, beforeEach } from 'vitest';
import { BotAI } from './botAI';
import { Simulation } from './simulation';
import { UNITS_MAP, getBaseBuildingsForRace } from './gameData';
import { EAST_GRID_START_X, WEST_GRID_START_X } from './constants';
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

	it('should prioritize building placement behind castle away from enemy base (99% probability)', () => {
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

		// Test East bot: behind castle means worldX > 5600 (towards outer eastern edge)
		let eastBehindCount = 0;
		const totalEastTrials = 40;
		for (let i = 0; i < totalEastTrials; i++) {
			const slot = botAI.findBestPlacementSlot(emptyScan, []);
			expect(slot).toBeDefined();
			if (!slot) continue;
			// EAST_GRID_START_X + slot.x * 32
			const worldX = EAST_GRID_START_X + slot.x * 32;
			if (worldX > 5600) {
				eastBehindCount++;
			}
		}
		expect(eastBehindCount / totalEastTrials).toBeGreaterThanOrEqual(0.9);

		// Test West bot: behind castle means worldX < 1600 (towards outer western edge)
		const westBot = new BotAI(sim, 'west');
		let westBehindCount = 0;
		const totalWestTrials = 40;
		for (let i = 0; i < totalWestTrials; i++) {
			const slot = westBot.findBestPlacementSlot(emptyScan, []);
			expect(slot).toBeDefined();
			if (!slot) continue;
			// WEST_GRID_START_X + slot.x * 32
			const worldX = WEST_GRID_START_X + slot.x * 32;
			if (worldX < 1600) {
				westBehindCount++;
			}
		}
		expect(westBehindCount / totalWestTrials).toBeGreaterThanOrEqual(0.9);
	});

	it('should prioritize 1-tile gap (>= 32px) from existing buildings with high probability', () => {
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

		// Place an initial building behind East castle
		sim.players.east.race = 'Люди';
		sim.players.east.gold = 1000;
		const bldDefId = getBaseBuildingsForRace('Люди')[0].id;
		const initialSlot = botAI.findBestPlacementSlot(emptyScan, []);
		expect(initialSlot).toBeDefined();
		if (!initialSlot) return;

		sim.build('east', bldDefId, initialSlot.x, initialSlot.y, 'top');
		const existingBuildings = sim.buildings.filter((b) => b.team === 'east');
		expect(existingBuildings.length).toBe(1);

		let gapCount = 0;
		const trials = 30;
		for (let i = 0; i < trials; i++) {
			const slot = botAI.findBestPlacementSlot(emptyScan, existingBuildings);
			expect(slot).toBeDefined();
			if (!slot) continue;

			const worldX = EAST_GRID_START_X + slot.x * 32;
			const worldY = 64 + slot.y * 32;

			let hasGap = true;
			for (const b of existingBuildings) {
				const gapX = Math.max(0, Math.max(worldX, b.x) - Math.min(worldX + 64, b.x + 64));
				const gapY = Math.max(0, Math.max(worldY, b.y) - Math.min(worldY + 64, b.y + 64));
				if (gapX < 32 && gapY < 32) {
					hasGap = false;
					break;
				}
			}
			if (hasGap) gapCount++;
		}

		// At least 80% should maintain a 1-tile gap
		expect(gapCount / trials).toBeGreaterThanOrEqual(0.8);
	});

	it('should prioritize 1-tile gap (>= 32px) from ally buildings as well as own buildings', () => {
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

		// Simulate an ally building on the same team ('east') but belonging to a different player ('ally_bot_2')
		sim.players.east.race = 'Люди';
		sim.players.east.gold = 1000;
		const bldDefId = getBaseBuildingsForRace('Люди')[0].id;
		const initialSlot = botAI.findBestPlacementSlot(emptyScan, []);
		expect(initialSlot).toBeDefined();
		if (!initialSlot) return;

		// Build building attributed to ally
		const allyPlayer = {
			...sim.players.east,
			id: 'ally_bot_2',
			name: 'Ally Bot'
		};
		sim.build('east', bldDefId, initialSlot.x, initialSlot.y, 'top', allyPlayer);

		const allyBuilding = sim.buildings.find((b) => b.team === 'east');
		expect(allyBuilding).toBeDefined();
		if (!allyBuilding) return;
		expect(allyBuilding.playerId).toBe('ally_bot_2');

		// Now East Bot (whose player id is 'east_bot' or 'east') decides a placement slot.
		// It MUST account for the ally's building and maintain >= 32px clearance in >= 80% of trials
		let gapCount = 0;
		const trials = 30;
		for (let i = 0; i < trials; i++) {
			const teamBuildings = sim.buildings.filter((b) => b.team === 'east');
			const slot = botAI.findBestPlacementSlot(emptyScan, teamBuildings);
			expect(slot).toBeDefined();
			if (!slot) continue;

			const worldX = EAST_GRID_START_X + slot.x * 32;
			const worldY = 64 + slot.y * 32;

			let hasGap = true;
			for (const b of teamBuildings) {
				const gapX = Math.max(0, Math.max(worldX, b.x) - Math.min(worldX + 64, b.x + 64));
				const gapY = Math.max(0, Math.max(worldY, b.y) - Math.min(worldY + 64, b.y + 64));
				if (gapX < 32 && gapY < 32) {
					hasGap = false;
					break;
				}
			}
			if (hasGap) gapCount++;
		}

		expect(gapCount / trials).toBeGreaterThanOrEqual(0.8);
	});

	describe('High-Rank Priority & Diversity Quota Building Selection', () => {
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

		it('builds affordable starter spawner (rank <= 3) on the first decision of the match', () => {
			const player = sim.players.east;
			player.gold = 500;
			player.race = 'Люди';

			const chosen = botAI.chooseBuildingCandidate(player, [], emptyScan, 10, 1.0);
			expect(chosen).toBeDefined();
			expect(chosen).not.toBeNull();
			if (!chosen) return;

			const ranks = botAI.getArmyBuildingRanks('Люди');
			const match = ranks.find((r) => r.building.id === chosen.id);
			expect(match).toBeDefined();
			expect(match!.rank).toBeLessThanOrEqual(3);
			expect(chosen.gold_cost || 0).toBeLessThanOrEqual(player.gold);
		});

		it('prioritizes high-rank buildings (Rank 6 > 5 > 4...) when ample gold is available', () => {
			const player = sim.players.east;
			player.gold = 1200;
			player.race = 'Люди';

			const ranks = botAI.getArmyBuildingRanks('Люди');
			const rank1Building = ranks.find((r) => r.rank === 1)!.building;

			// Existing 1 starter building
			const mockBuildings = [
				{
					instanceId: 'bld_1',
					defId: rank1Building.id,
					name: rank1Building.name,
					team: 'east',
					race: 'Люди',
					goldCost: rank1Building.gold_cost || 160
				}
			] as unknown as import('./types').Building[];

			const chosen = botAI.chooseBuildingCandidate(player, mockBuildings, emptyScan, 20, 1.0);
			expect(chosen).toBeDefined();
			expect(chosen).not.toBeNull();
			if (!chosen) return;

			const chosenRank = ranks.find((r) => r.building.id === chosen.id)!.rank;
			// Ample gold (1200g): should pick the highest available rank (Rank 6)
			expect(chosenRank).toBe(6);
		});

		it('enforces Diversity Quota: prevents building a 3rd copy of Rank 6 while other ranks have 0', () => {
			const player = sim.players.east;
			player.gold = 1500;
			player.race = 'Люди';

			const ranks = botAI.getArmyBuildingRanks('Люди');
			const rank6Building = ranks.find((r) => r.rank === 6)!.building;
			const rank1Building = ranks.find((r) => r.rank === 1)!.building;

			// Bot already has 2 Rank 6 buildings and 1 Rank 1 building (others have 0)
			const mockBuildings = [
				{
					instanceId: 'bld_r1',
					defId: rank1Building.id,
					name: rank1Building.name,
					team: 'east',
					race: 'Люди',
					goldCost: rank1Building.gold_cost || 160
				},
				{
					instanceId: 'bld_r6_1',
					defId: rank6Building.id,
					name: rank6Building.name,
					team: 'east',
					race: 'Люди',
					goldCost: rank6Building.gold_cost || 550
				},
				{
					instanceId: 'bld_r6_2',
					defId: rank6Building.id,
					name: rank6Building.name,
					team: 'east',
					race: 'Люди',
					goldCost: rank6Building.gold_cost || 550
				}
			] as unknown as import('./types').Building[];

			// minCount = 0 (Ranks 2, 3, 4, 5 have 0)
			// Allowed max = minCount + 2 = 2.
			// Rank 6 already has 2, so building another is forbidden!
			const chosen = botAI.chooseBuildingCandidate(player, mockBuildings, emptyScan, 40, 1.0);
			expect(chosen).toBeDefined();
			expect(chosen).not.toBeNull();
			if (!chosen) return;

			const chosenRank = ranks.find((r) => r.building.id === chosen.id)!.rank;
			expect(chosenRank).not.toBe(6);
			// Should choose the highest eligible rank that is not at limit: Rank 5
			expect(chosenRank).toBe(5);
		});

		it('saves gold instead of buying cheap spawner when shortfall to high-rank building is <= 60g', () => {
			const player = sim.players.east;
			player.race = 'Люди';

			const ranks = botAI.getArmyBuildingRanks('Люди');
			const rank6Building = ranks.find((r) => r.rank === 6)!.building;
			const rank1Building = ranks.find((r) => r.rank === 1)!.building;

			const mockBuildings = [
				{
					instanceId: 'bld_r1',
					defId: rank1Building.id,
					name: rank1Building.name,
					team: 'east',
					race: 'Люди',
					goldCost: rank1Building.gold_cost || 160
				}
			] as unknown as import('./types').Building[];

			// Rank 6 cost: e.g. 520g.
			// Set gold to cost - 30g (shortfall = 30g <= 60g).
			player.gold = (rank6Building.gold_cost || 520) - 30;

			// Healthy castle (1.0 ratio): bot should save gold and wait (return null), NOT squander on Rank 1
			const chosen = botAI.chooseBuildingCandidate(player, mockBuildings, emptyScan, 20, 1.0);
			expect(chosen).toBeNull();
		});

		it('prioritizes anti-air counter-pick when enemy army has flyers', () => {
			const player = sim.players.east;
			player.gold = 600;
			player.race = 'Люди';

			const scanFlyers = {
				...emptyScan,
				flyingCount: 3,
				totalCount: 5
			};

			const ranks = botAI.getArmyBuildingRanks('Люди');
			const rank1Building = ranks.find((r) => r.rank === 1)!.building;

			const mockBuildings = [
				{
					instanceId: 'bld_r1',
					defId: rank1Building.id,
					name: rank1Building.name,
					team: 'east',
					race: 'Люди',
					goldCost: rank1Building.gold_cost || 160
				}
			] as unknown as import('./types').Building[];

			const chosen = botAI.chooseBuildingCandidate(player, mockBuildings, scanFlyers, 20, 1.0);
			expect(chosen).toBeDefined();
			expect(chosen).not.toBeNull();
			if (!chosen) return;

			// Chosen building must produce an anti-air capable unit
			const uDef = chosen.unit ? UNITS_MAP.get(chosen.unit) : null;
			expect(uDef).toBeDefined();
			const canHitAir = uDef && (uDef.flying || (uDef.range !== null && uDef.range > 120));
			expect(canHitAir).toBe(true);
		});
	});
});
