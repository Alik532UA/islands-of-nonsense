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

	it('bot AI does NOT repair bridge at the beginning of the match (under 3-minute cooldown)', () => {
		sim.brokenBridge = 'mid';
		sim.gameTime = 45; // 45 seconds into match (< 180s)
		const botPlayer = sim.players.east;
		botPlayer.lumber = 100;
		botPlayer.gold = 50;

		sim.buildings.push({
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
		});

		const botAI = new BotAI(sim, 'east', botPlayer);
		botAI.makeDecision();

		// Bot must NOT repair bridge early in the match
		expect(botPlayer.worker?.isRepairing).toBeFalsy();
		expect(botPlayer.lumber).toBe(100);
	});

	it('bot AI does NOT repair bridge after 3 minutes if team is NOT significantly winning', () => {
		sim.brokenBridge = 'mid';
		sim.gameTime = 200; // > 180s (3 minutes passed)
		const botPlayer = sim.players.east;
		botPlayer.lumber = 100;
		botPlayer.gold = 50;

		// Both castles at full HP and no units deep in enemy base (balanced state)
		sim.castles.west.hp = 14000;
		sim.castles.east.hp = 14000;

		const botAI = new BotAI(sim, 'east', botPlayer);
		botAI.makeDecision();

		// In even game, bot must NOT repair bridge
		expect(botAI.isTeamSignificantlyWinning()).toBe(false);
		expect(botPlayer.worker?.isRepairing).toBeFalsy();
		expect(botPlayer.lumber).toBe(100);
	});

	it('bot AI repairs bridge after 3-minute cooldown ONLY when team is significantly winning', () => {
		sim.brokenBridge = 'mid';
		sim.gameTime = 210; // > 180s (3 minutes passed)
		const botPlayer = sim.players.east;
		botPlayer.lumber = 100;
		botPlayer.gold = 50;

		// Set up significantly winning state for East:
		// 1. East castle is healthy (> 70%)
		sim.castles.east.hp = 13500;
		sim.castles.east.maxHp = 14000;

		// 2. West castle is heavily damaged
		sim.castles.west.hp = 7000;
		sim.castles.west.maxHp = 14000;

		// 3. East has an army of 8 units pushing deep into West territory (x < 3600)
		for (let i = 0; i < 8; i++) {
			sim.spawnUnitDirectly({
				team: 'east',
				lane: 'mid',
				x: 2200 - i * 50, // Deep in West territory
				y: 1100 + i * 20,
				hp: 300,
				maxHp: 300,
				speed: 250
			});
		}

		// West has only 1 remaining defender
		sim.spawnUnitDirectly({
			team: 'west',
			lane: 'mid',
			x: 1800,
			y: 1200,
			hp: 100,
			maxHp: 420,
			speed: 250
		});

		const botAI = new BotAI(sim, 'east', botPlayer);
		expect(botAI.isTeamSignificantlyWinning()).toBe(true);

		// Run bot decision
		botAI.makeDecision();

		// Bot worker should now have initiated bridge repair to accelerate victory
		expect(botPlayer.worker?.isRepairing).toBe(true);
		expect(botPlayer.worker?.targetRepairBuildingId).toBe('bridge_mid');
		expect(botPlayer.lumber).toBe(100 - BRIDGE_REPAIR_LUMBER_COST);
		expect(sim.lastBotBridgeRepairTime.east).toBe(210);

		// Further attempts within 3 minutes must be blocked by cooldown
		botPlayer.worker!.isRepairing = false;
		botPlayer.lumber = 100;
		sim.gameTime = 250; // Only 40s later (< 180s cooldown)
		botAI.makeDecision();
		expect(botPlayer.worker?.isRepairing).toBe(false);
		expect(botPlayer.lumber).toBe(100);
	});
});
