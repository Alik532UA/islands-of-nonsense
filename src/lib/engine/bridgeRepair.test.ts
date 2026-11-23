import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { BotAI } from './botAI';
import { TOP_LANE_Y, MID_LANE_Y, BRIDGE_SPAN_MIN_X, BRIDGE_REPAIR_LUMBER_COST } from './constants';

describe('Dynamic Bridge Repair / Rebuild Mechanic', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 500 });
	});

	it('requires 50 lumber to order bridge repair and fails if insufficient lumber', () => {
		sim.brokenBridge = 'top';
		const p = sim.players.west;
		p.lumber = 25; // less than 50

		const result = sim.orderBridgeRepair('west');
		expect(result).toBe(false);
		expect(p.lumber).toBe(25);
		expect(p.worker?.isRepairing).toBeFalsy();
	});

	it('fails to order bridge repair if all bridges are intact', () => {
		sim.brokenBridge = null;
		const p = sim.players.west;
		p.lumber = 100;

		const result = sim.orderBridgeRepair('west');
		expect(result).toBe(false);
		expect(p.lumber).toBe(100);
	});

	it('deducts lumber and dispatches worker towards bridgehead when repair is ordered', () => {
		sim.brokenBridge = 'mid';
		const p = sim.players.west;
		p.lumber = 75;

		const result = sim.orderBridgeRepair('west');
		expect(result).toBe(true);
		expect(p.lumber).toBe(75 - BRIDGE_REPAIR_LUMBER_COST); // 25
		expect(p.worker?.isRepairing).toBe(true);
		expect(p.worker?.targetRepairBuildingId).toBe('bridge_mid');
		expect(p.worker?.targetX).toBe(BRIDGE_SPAN_MIN_X - 40);
		expect(p.worker?.targetY).toBe(MID_LANE_Y);
	});

	it('progressively repairs the bridge when worker arrives at bridgehead', () => {
		sim.brokenBridge = 'top';
		const p = sim.players.west;
		p.lumber = 100;

		sim.orderBridgeRepair('west');
		const w = p.worker!;

		// Teleport worker to bridgehead
		w.x = BRIDGE_SPAN_MIN_X - 40;
		w.y = TOP_LANE_Y;

		expect(sim.bridgeRepairProgress).toBe(0);

		// Update 2 seconds -> +50 progress (25/sec)
		sim.workerSystem.updateWorkers(2.0);
		expect(sim.bridgeRepairProgress).toBeCloseTo(50, 0);
		expect(sim.brokenBridge).toBe('top');
		expect(w.isRepairing).toBe(true);

		// Update another 2.1 seconds -> reaches 100%, bridge is restored!
		sim.workerSystem.updateWorkers(2.1);
		expect(sim.brokenBridge).toBeNull();
		expect(sim.bridgeRepairProgress).toBe(0);
		expect(w.isRepairing).toBe(false);
		expect(w.targetRepairBuildingId).toBeNull();
	});

	it('allows ground units to cross directly once bridge is repaired', () => {
		sim.brokenBridge = 'top';

		// Spawn ground unit on top lane
		const unit = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 2900,
			y: TOP_LANE_Y,
			flying: false,
			speed: 150
		});

		// While top is broken, ground unit diverts towards mid (y > TOP_LANE_Y)
		sim.combatSystem.updateUnits(0.5);
		expect(unit.y).toBeGreaterThan(TOP_LANE_Y);

		// Now repair bridge
		sim.repairBridge('top');
		expect(sim.brokenBridge).toBeNull();

		// Put unit back on top lane before bridge
		unit.x = 2900;
		unit.y = TOP_LANE_Y;

		// Move unit: now it moves straight forward across top bridge without detour
		sim.combatSystem.updateUnits(0.5);
		expect(unit.y).toBeCloseTo(TOP_LANE_Y, 0);
		expect(unit.x).toBeGreaterThan(2900);
	});

	it('bot AI initiates bridge repair when bridge is broken and lumber is available', () => {
		sim.brokenBridge = 'mid';
		const botPlayer = sim.players.east;
		botPlayer.lumber = 100;
		botPlayer.gold = 50; // Insufficient gold to buy new army buildings (costs >= 180)
		botPlayer.preferredLane = 'mid';

		// Add 2 mock buildings so bot meets established base threshold (myBuildings.length >= 2)
		sim.buildings.push(
			{
				instanceId: 'b_east_1',
				defId: 'h000',
				name: 'Барак',
				team: 'east',
				tileX: 180,
				tileY: 30,
				x: 6000,
				y: 1000,
				hp: 500,
				maxHp: 500,
				armor: 5,
				armorType: 'fort',
				goldCost: 200,
				spawnTimer: 10,
				spawnCooldown: 10,
				lane: 'top',
				upgradeFrom: null,
				isUnderConstruction: false,
				spawnUnitId: 'u000',
				race: 'Люди',
				playerId: botPlayer.id
			},
			{
				instanceId: 'b_east_2',
				defId: 'h001',
				name: 'Стрільці',
				team: 'east',
				tileX: 180,
				tileY: 35,
				x: 6000,
				y: 1100,
				hp: 500,
				maxHp: 500,
				armor: 5,
				armorType: 'fort',
				goldCost: 200,
				spawnTimer: 10,
				spawnCooldown: 10,
				lane: 'mid',
				upgradeFrom: null,
				isUnderConstruction: false,
				spawnUnitId: 'u001',
				race: 'Люди',
				playerId: botPlayer.id
			}
		);

		expect(botPlayer.worker?.isRepairing).toBeFalsy();

		// Run bot AI decision
		const botAI = new BotAI(sim, 'east', botPlayer);
		botAI.makeDecision();

		// Bot worker should now have received bridge repair order
		expect(botPlayer.worker?.isRepairing).toBe(true);
		expect(botPlayer.worker?.targetRepairBuildingId).toBe('bridge_mid');
		expect(botPlayer.lumber).toBe(100 - BRIDGE_REPAIR_LUMBER_COST);
	});
});
