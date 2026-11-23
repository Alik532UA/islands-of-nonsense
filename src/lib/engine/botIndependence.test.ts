import { describe, it, expect } from 'vitest';
import { Simulation } from './simulation';
import { BotAI } from './botAI';
import { getBaseBuildingsForRace } from './gameData';

describe('Bot Independence & Courtyard Isolation (2v2 and 3v3)', () => {
	it('bots on the same team do not hijack each other buildings or power-build together', () => {
		const sim = new Simulation({
			botDifficulty: 15,
			startGold: 1000,
			teamSize: 2,
			westRace: 'Люди',
			eastRace: 'Орки'
		});

		// East team has p2 (Slot 2, Mid) and p4 (Slot 4, Top)
		const p2 = sim.players.east;
		const p4 = sim.teamMembers.east[1];
		expect(p2.id).toBe('p2');
		expect(p4.id).toBe('p4');

		const botP2 = sim.bots.find((b) => b.getPlayer().id === 'p2')!;
		const bldDefId = getBaseBuildingsForRace(p2.race)[0].id;
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
		const slotP2 = botP2.findBestPlacementSlot(emptyScan, [])!;
		expect(slotP2).toBeDefined();

		// 1. P2 places a building under construction
		const buildSuccess = sim.build('east', bldDefId, slotP2.x, slotP2.y, 'top', p2);
		expect(buildSuccess).toBe(true);
		expect(sim.buildings.length).toBe(1);
		const bld1 = sim.buildings[0];
		expect(bld1.playerId).toBe('p2');
		expect(bld1.isUnderConstruction).toBe(true);

		// Worker 2 should target bld1
		expect(p2.worker?.targetBuildingId).toBe(bld1.instanceId);

		// Worker 4 must NOT target bld1! Worker 4 is independent!
		expect(p4.worker?.targetBuildingId).not.toBe(bld1.instanceId);

		// 2. Step simulation worker update
		sim.workerSystem.updateWorkers(0.1);

		// Worker 4 must still NOT be hijacked to bld1!
		expect(p4.worker?.targetBuildingId).toBeFalsy();

		// 3. P4 bot decision: P4 should NOT continue construction on P2's building
		const botP4 = sim.bots.find((b) => b.getPlayer().id === 'p4');
		expect(botP4).toBeDefined();

		botP4?.makeDecision();

		// P4 should have either placed its OWN building or remained independent, NEVER targeting bld1
		if (p4.worker?.targetBuildingId) {
			const targetBld = sim.buildings.find((b) => b.instanceId === p4.worker?.targetBuildingId);
			expect(targetBld?.playerId).toBe('p4');
			expect(targetBld?.instanceId).not.toBe(bld1.instanceId);
		}
	});

	it('continueConstruction rejects cross-player construction orders in team mode', () => {
		const sim = new Simulation({
			botDifficulty: 0,
			startGold: 1000,
			teamSize: 2,
			westRace: 'Люди',
			eastRace: 'Орки'
		});

		const p2 = sim.players.east;
		const p4 = sim.teamMembers.east[1];

		const botP2 = sim.bots.find((b) => b.getPlayer().id === 'p2')!;
		const bldDefId = getBaseBuildingsForRace(p2.race)[0].id;
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
		const slotP2 = botP2.findBestPlacementSlot(emptyScan, [])!;
		const buildSuccess = sim.build('east', bldDefId, slotP2.x, slotP2.y, 'top', p2);
		expect(buildSuccess).toBe(true);
		const bld = sim.buildings[0];

		// Attempting to order P4 to build P2's building must be rejected
		const success = sim.continueConstruction('east', bld.instanceId, p4);
		expect(success).toBe(false);
		expect(p4.worker?.targetBuildingId).not.toBe(bld.instanceId);
	});

	it('in 2v2 and 3v3, teammates select placement slots in their respective sectors', () => {
		const sim = new Simulation({
			botDifficulty: 15,
			startGold: 1000,
			teamSize: 3,
			westRace: 'Люди',
			eastRace: 'Орки'
		});

		const p4 = sim.teamMembers.east[1]; // Slot 4 (Top Courtyard)
		const p6 = sim.teamMembers.east[2]; // Slot 6 (Bottom Courtyard)

		const botTop = new BotAI(sim, 'east', p4);
		const botBottom = new BotAI(sim, 'east', p6);

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

		// Top bot (Slot 4) must choose in top sector (tileY <= 30)
		const slotTop = botTop.findBestPlacementSlot(emptyScan, []);
		expect(slotTop).toBeDefined();
		expect(slotTop!.y).toBeLessThanOrEqual(30);

		// Bottom bot (Slot 6) must choose in bottom sector (tileY >= 40)
		const slotBottom = botBottom.findBestPlacementSlot(emptyScan, []);
		expect(slotBottom).toBeDefined();
		expect(slotBottom!.y).toBeGreaterThanOrEqual(40);
	});

	it('idle bot workers do not swarm the same gold coin', () => {
		const sim = new Simulation({
			botDifficulty: 15,
			startGold: 1000,
			teamSize: 2,
			westRace: 'Люди',
			eastRace: 'Орки'
		});

		const p2 = sim.players.east;
		const p4 = sim.teamMembers.east[1];

		// Spawn two gold coins on East base
		sim.goldCoins = [
			{ id: 'coin_1', x: 5900, y: 1200, value: 50, lifeTime: 30, maxLifeTime: 30, lane: 'mid' },
			{ id: 'coin_2', x: 5900, y: 700, value: 50, lifeTime: 30, maxLifeTime: 30, lane: 'top' }
		];

		const botP2 = sim.bots.find((b) => b.getPlayer().id === 'p2');
		const botP4 = sim.bots.find((b) => b.getPlayer().id === 'p4');

		// P2 moves towards coin 1 (near y: 1200)
		botP2?.makeDecision();
		const p2TargetY = p2.worker?.targetY;

		// P4 makes decision: should target coin 2 (near y: 700), not coin 1!
		botP4?.makeDecision();
		const p4TargetY = p4.worker?.targetY;

		// Workers should not be targeting the same position
		if (p2.worker && p4.worker) {
			const distBetweenTargets = Math.hypot(
				p2.worker.targetX - p4.worker.targetX,
				p2.worker.targetY - p4.worker.targetY
			);
			expect(distBetweenTargets).toBeGreaterThan(100);
		}
	});

	it('auto-resumes only own unfinished buildings if worker was interrupted', () => {
		const sim = new Simulation({
			botDifficulty: 15,
			startGold: 1000,
			teamSize: 2,
			westRace: 'Люди',
			eastRace: 'Орки'
		});

		const p2 = sim.players.east;
		const p4 = sim.teamMembers.east[1];

		const botP2 = sim.bots.find((b) => b.getPlayer().id === 'p2')!;
		const bldDefId = getBaseBuildingsForRace(p2.race)[0].id;
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
		const slotP2 = botP2.findBestPlacementSlot(emptyScan, [])!;
		const buildSuccess = sim.build('east', bldDefId, slotP2.x, slotP2.y, 'top', p2);
		expect(buildSuccess).toBe(true);
		const bldP2 = sim.buildings[0];

		// Interrupt P2 worker (e.g. order move away)
		p2.worker!.targetBuildingId = null;
		p2.worker!.isBuilding = false;

		// P4 worker is idle
		p4.worker!.targetBuildingId = null;
		p4.worker!.isBuilding = false;

		// Update workers
		sim.workerSystem.updateWorkers(0.1);

		// P2 should auto-resume its own building
		expect(p2.worker?.targetBuildingId).toBe(bldP2.instanceId);

		// P4 must NOT auto-resume P2's building
		expect(p4.worker?.targetBuildingId).toBeNull();
	});

	it('designates the lowest slot bot as CF_BotSmith and limits non-smith forge investment', () => {
		const sim = new Simulation({
			botDifficulty: 15,
			startGold: 5000,
			teamSize: 2,
			westRace: 'Люди',
			eastRace: 'Орки'
		});

		const p2 = sim.players.east; // Slot 2
		const p4 = sim.teamMembers.east[1]; // Slot 4
		expect(p2.slot).toBe(2);
		expect(p4.slot).toBe(4);

		const botP2 = sim.bots.find((b) => b.getPlayer().id === 'p2')!;
		const botP4 = sim.bots.find((b) => b.getPlayer().id === 'p4')!;

		// P2 is the Smith for East team; P4 is secondary bot
		expect(botP2.isBotSmith(p2)).toBe(true);
		expect(botP4.isBotSmith(p4)).toBe(false);

		// Single bot on west team is also Smith
		const p1 = sim.players.west;
		const botP1 = new BotAI(sim, 'west', p1);
		expect(botP1.isBotSmith(p1)).toBe(true);

		// Advance gameTime past 60s
		sim.gameTime = 120;

		// Set P4 forge to non-smith limits (attack 2, armor 1, econ 1)
		p4.forge.attack = 2;
		p4.forge.armor = 1;
		p4.forge.econ = 1;
		p4.gold = 3000;

		// P4 decision should NOT purchase tier 3 attack
		botP4.makeDecision();
		expect(p4.forge.attack).toBe(2);
		expect(p4.forge.armor).toBe(1);

		// P2 (Smith) can upgrade attack/armor past level 2/1 up to level 5
		p2.forge.attack = 2;
		p2.forge.armor = 2;
		p2.forge.econ = 2;
		p2.gold = 3000;

		botP2.makeDecision();
		expect(p2.forge.attack).toBe(3);
	});
});
