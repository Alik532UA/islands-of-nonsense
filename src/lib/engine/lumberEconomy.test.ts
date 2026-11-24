import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { getBuilding } from './gameData';

describe('Point 5: Full Lumber (Wood) Economy & Tech Tiers', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({
			botDifficulty: 0,
			startGold: 1500,
			westRace: 'Люди'
		});
		sim.decorations = [];
	});

	it('гравці починають матч з автентичним запасом деревини 125', () => {
		expect(sim.players.west.lumber).toBe(125);
		expect(sim.players.east.lumber).toBe(125);
	});

	it('завершення будівництва споруди приносить робітником деревину згідно з WC3 каноном (100% ціни золота)', () => {
		sim.players.west.gold = 500;
		sim.players.west.lumber = 100;
		const buildSuccess = sim.build('west', 'h003', 25, 20, 'top');
		expect(buildSuccess).toBe(true);

		const bld = sim.buildings[0];
		expect(bld.isUnderConstruction).toBe(true);
		const expectedLumberReward = bld.goldCost;

		// Worker arrives and finishes construction
		if (sim.players.west.worker) {
			sim.players.west.worker.x = bld.x;
			sim.players.west.worker.y = bld.y;
			sim.players.west.worker.targetBuildingId = bld.instanceId;
		}
		bld.buildProgress = bld.maxBuildProgress || 3.5;
		sim.workerSystem.updateWorkers(0.1);

		expect(bld.isUnderConstruction).toBe(false);
		expect(sim.players.west.lumber).toBe(100 + expectedLumberReward);
	});

	it('періодичний цикл доходу виплачує золото і НЕ нараховує пасивну деревину (канон WC3)', () => {
		sim.players.west.lumber = 100;
		const initialLumber = sim.players.west.lumber;

		// Trigger economic cycle
		sim.economySystem.updateEconomy(sim.incomeInterval + 0.1);

		// Lumber does NOT increase on income tick
		expect(sim.players.west.lumber).toBe(initialLumber);
	});

	it('забороняє апгрейд до вищого тиру при нестачі деревини та списує деревину при успіху', () => {
		// h055 (Вища Цитадель Некромантії) has lumber_cost 375
		const h055Def = getBuilding('h055');
		expect(h055Def).toBeDefined();
		expect(h055Def?.lumber_cost).toBe(375);

		// Set up parent building h04B
		sim.players.west.lumber = 100; // Less than 375 required
		sim.players.west.gold = 2000;
		sim.players.west.food = 0;
		sim.players.west.maxFood = 5;

		sim.build('west', 'h04B', 25, 20, 'top');
		const parentBld = sim.buildings[0];
		parentBld.isUnderConstruction = false;

		// Attempt upgrade with 100 lumber (requires 375) -> should fail
		const failUpgrade = sim.upgradeBuilding('west', parentBld.instanceId, 'h055');
		expect(failUpgrade).toBe(false);
		expect(parentBld.defId).toBe('h04B');

		// Provide sufficient lumber -> upgrade succeeds
		sim.players.west.lumber = 400;
		const successUpgrade = sim.upgradeBuilding('west', parentBld.instanceId, 'h055');
		expect(successUpgrade).toBe(true);
		expect(parentBld.defId).toBe('h055');
		// 400 - 375 (spent) + 370 (awarded for upgrade completion in WC3 Db) = 395
		expect(sim.players.west.lumber).toBe(395);
		expect(parentBld.lumberCost).toBe(375);
	});

	it('повертає 50% витраченої деревини при знесенні споруди та 75% при скасуванні', () => {
		sim.players.west.gold = 1000;
		sim.players.west.lumber = 500;

		// Build a structure with lumber cost
		sim.build('west', 'h04B', 25, 20, 'top');
		const bld = sim.buildings[0];
		bld.lumberCost = 200;
		sim.players.west.lumber = 300;

		// Cancel under construction -> 75% of 200 = 150 refunded
		bld.isUnderConstruction = true;
		sim.sellBuilding('west', bld.instanceId);
		expect(sim.players.west.lumber).toBe(450); // 300 + 150
	});

	it('апгрейди кузні вищих рівнів (2+) потребують та списують деревину', () => {
		sim.players.west.gold = 1000;
		sim.players.west.lumber = 0; // zero lumber
		sim.buildings.push({
			instanceId: 'test_forge_west',
			defId: 'cg11_forge',
			name: 'Кузня',
			team: 'west',
			specialType: 'forge',
			tileX: 10,
			tileY: 10,
			x: 1600,
			y: 1200,
			hp: 1000,
			maxHp: 1000,
			armor: 5,
			armorType: 'fort',
			goldCost: 100,
			lumberCost: 100,
			spawnUnitId: '',
			spawnCooldown: 0,
			spawnTimer: 0,
			lane: 'mid',
			upgradeFrom: null,
			race: 'Люди'
		});

		// Upgrade 0 -> 1 (lumberPrice is 0)
		const up1 = sim.upgradeForge('west', 'attack');
		expect(up1).toBe(true);
		expect(sim.players.west.forge.attack).toBe(1);

		// Upgrade 1 -> 2 (lumberPrice is 0)
		const up2 = sim.upgradeForge('west', 'attack');
		expect(up2).toBe(true);
		expect(sim.players.west.forge.attack).toBe(2);

		// Upgrade 2 -> 3 requires (2 - 1) * 35 = 35 lumber! Player has 0 lumber -> fails
		const lumberPrice = sim.getForgeLumberPrice('west', 'attack');
		expect(lumberPrice).toBe(35);
		const up3Fail = sim.upgradeForge('west', 'attack');
		expect(up3Fail).toBe(false);

		// Add lumber -> succeeds
		sim.players.west.lumber = 50;
		const up3Success = sim.upgradeForge('west', 'attack');
		expect(up3Success).toBe(true);
		expect(sim.players.west.forge.attack).toBe(3);
		expect(sim.players.west.lumber).toBe(15); // 50 - 35
	});
});
