import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { BOSS_DEFINITIONS } from './bosses';

describe('Castle Fight - Neutral Central Bosses', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 500 });
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

	it('should spawn first boss on Top lane at center X=1200 with neutral team', () => {
		expect(sim.bossSpawnTimer).toBe(180);
		expect(sim.activeBossInstanceId).toBeNull();

		const boss = sim.spawnBoss();
		expect(boss).toBeDefined();
		expect(boss.team).toBe('neutral');
		expect(boss.lane).toBe('top');
		expect(boss.x).toBe(1200);
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
