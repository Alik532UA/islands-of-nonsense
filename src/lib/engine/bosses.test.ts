import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { BOSS_DEFINITIONS } from './bosses';

describe('Castle Fight - Neutral Central Bosses', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 500 });
		sim.brokenBridge = null;
	});

	it('should have 10 configured Warcraft heroes as bosses', () => {
		expect(BOSS_DEFINITIONS.length).toBe(10);
		for (const b of BOSS_DEFINITIONS) {
			expect(b.nameUk.length).toBeGreaterThan(0);
			expect(b.hp).toBeGreaterThanOrEqual(2000);
			expect(b.damage).toBeGreaterThan(0);
			expect(b.armor).toBeGreaterThanOrEqual(2);
			expect(b.range).toBeGreaterThan(100);
		}
	});

	it('should spawn first boss on Top lane at center X=arenaWidth/2 with neutral team', () => {
		expect(sim.bossSpawnTimer).toBe(180);
		expect(sim.activeBossInstanceId).toBeNull();

		const boss = sim.spawnBoss();
		expect(boss).toBeDefined();
		expect(boss.team).toBe('neutral');
		expect(boss.lane).toBe('top');
		expect(boss.x).toBe(sim.arenaWidth / 2);
		expect(boss.y).toBe(sim.topLaneY);
		expect(boss.isBoss).toBe(true);
		expect(sim.bossIndex).toBe(1);
		expect(sim.activeBossInstanceId).toBe(boss.instanceId);
	});

	it('should alternate lanes between spawns (top -> bottom -> top)', () => {
		const boss1 = sim.spawnBoss();
		expect(boss1.lane).toBe('top');

		// Clear first boss
		sim.units = [];
		sim.activeBossInstanceId = null;

		const boss2 = sim.spawnBoss();
		expect(boss2.lane).toBe('bottom');
		expect(sim.bossIndex).toBe(2);

		// Clear second boss
		sim.units = [];
		sim.activeBossInstanceId = null;

		const boss3 = sim.spawnBoss();
		expect(boss3.lane).toBe('top');
		expect(sim.bossIndex).toBe(3);
	});

	it('should award WC3 formula gold bounty and restart 180s timer upon boss death', () => {
		const boss = sim.spawnBoss();
		const initialGold = sim.players.west.gold;

		// Spawn a West unit to deliver killing blow
		sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: boss.x + 20,
			y: boss.y,
			damage: 20000 // lethal damage
		});

		// Trigger attack on boss
		sim.step(0.05);

		// Boss 1 bounty formula: 10 + 20 * (1 - 1) = 10 gold
		expect(boss.state).toBe('DEAD');
		expect(sim.activeBossInstanceId).toBeNull();
		expect(sim.bossSpawnTimer).toBe(180);
		expect(sim.players.west.gold).toBe(initialGold + 10);
	});

	it('should scale boss kill bounty with formula 10 + 20 * (N - 1) up to 110 cap', () => {
		// Test Boss 2: 10 + 20 * 1 = 30
		sim.bossIndex = 1; // Prior to spawn, so next is boss 2
		const boss2 = sim.spawnBoss();
		expect(sim.bossIndex).toBe(2);
		const goldBefore2 = sim.players.west.gold;
		sim.spawnUnitDirectly({
			team: 'west',
			lane: boss2.lane,
			x: boss2.x + 20,
			y: boss2.y,
			damage: 20000
		});
		sim.step(0.05);
		expect(sim.players.west.gold).toBe(goldBefore2 + 30);

		// Clear
		sim.units = [];

		// Test Boss 6: 10 + 20 * 5 = 110
		sim.bossIndex = 5;
		const boss6 = sim.spawnBoss();
		expect(sim.bossIndex).toBe(6);
		const goldBefore6 = sim.players.west.gold;
		sim.spawnUnitDirectly({
			team: 'west',
			lane: boss6.lane,
			x: boss6.x + 20,
			y: boss6.y,
			damage: 20000
		});
		sim.step(0.05);
		expect(sim.players.west.gold).toBe(goldBefore6 + 110);

		// Clear
		sim.units = [];

		// Test Boss 8: capped at 110 (formula 10 + 20 * 7 = 150 -> 110 cap)
		sim.bossIndex = 7;
		const boss8 = sim.spawnBoss();
		expect(sim.bossIndex).toBe(8);
		const goldBefore8 = sim.players.west.gold;
		sim.spawnUnitDirectly({
			team: 'west',
			lane: boss8.lane,
			x: boss8.x + 20,
			y: boss8.y,
			damage: 20000
		});
		sim.step(0.05);
		expect(sim.players.west.gold).toBe(goldBefore8 + 110);
	});

	it('should distribute boss bounty to all teammates in team matches', () => {
		const teamSim = new Simulation({
			botDifficulty: 15,
			startGold: 500,
			teamSize: 2
		});

		const boss = teamSim.spawnBoss();
		const p1GoldBefore = teamSim.players.west.gold;
		const p3GoldBefore = teamSim.teamMembers.west[1].gold;

		// West unit kills boss
		teamSim.spawnUnitDirectly({
			team: 'west',
			lane: boss.lane,
			x: boss.x + 20,
			y: boss.y,
			damage: 20000
		});
		teamSim.step(0.05);

		// Boss 1 awards 10 gold to both P1 and P3
		expect(teamSim.players.west.gold).toBe(p1GoldBefore + 10);
		expect(teamSim.teamMembers.west[1].gold).toBe(p3GoldBefore + 10);
	});

	it('should reset boss parameters on new round', () => {
		sim.spawnBoss();
		expect(sim.activeBossInstanceId).not.toBeNull();
		expect(sim.bossIndex).toBe(1);

		sim.resetRound();
		expect(sim.activeBossInstanceId).toBeNull();
		expect(sim.bossIndex).toBe(0);
		expect(sim.bossSpawnTimer).toBe(180);
		expect(sim.lastBossLane).toBe('bottom');
	});
});
