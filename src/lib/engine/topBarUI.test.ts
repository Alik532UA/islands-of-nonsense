import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';

describe('Point 10: TopBar UI/UX Elements & Day/Night Interaction Verification', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 15, startGold: 500 });
	});

	it('verifies Day/Night dial state for each time window of the match', () => {
		// 1. Day time (10s)
		sim.gameTime = 10;
		expect(sim.dayNightCycle).toBe('day');
		expect(sim.dayNightPhase).toBe('day');
		let title =
			sim.dayNightPhase === 'day'
				? 'День (Сонце)'
				: sim.dayNightPhase === 'dusk'
					? 'Сутінки (Захід сонця)'
					: sim.dayNightPhase === 'night'
						? 'Ніч (Місяць)'
						: 'Світанок (Схід сонця)';
		expect(title).toBe('День (Сонце)');

		// 2. Dusk / Sunset (50s)
		sim.gameTime = 50;
		expect(sim.dayNightPhase).toBe('dusk');
		title =
			sim.dayNightPhase === 'day'
				? 'День (Сонце)'
				: sim.dayNightPhase === 'dusk'
					? 'Сутінки (Захід сонця)'
					: sim.dayNightPhase === 'night'
						? 'Ніч (Місяць)'
						: 'Світанок (Схід сонця)';
		expect(title).toBe('Сутінки (Захід сонця)');

		// 3. Deep Night (75s)
		sim.gameTime = 75;
		expect(sim.dayNightCycle).toBe('night');
		expect(sim.dayNightPhase).toBe('night');
		title =
			sim.dayNightPhase === 'day'
				? 'День (Сонце)'
				: sim.dayNightPhase === 'dusk'
					? 'Сутінки (Захід сонця)'
					: sim.dayNightPhase === 'night'
						? 'Ніч (Місяць)'
						: 'Світанок (Схід сонця)';
		expect(title).toBe('Ніч (Місяць)');

		// 4. Dawn / Sunrise (110s)
		sim.gameTime = 110;
		expect(sim.dayNightPhase).toBe('dawn');
		title =
			sim.dayNightPhase === 'day'
				? 'День (Сонце)'
				: sim.dayNightPhase === 'dusk'
					? 'Сутінки (Захід сонця)'
					: sim.dayNightPhase === 'night'
						? 'Ніч (Місяць)'
						: 'Світанок (Схід сонця)';
		expect(title).toBe('Світанок (Схід сонця)');
	});

	it('verifies game speed selector functionality (1x, 2x, 3x, 5x, and Dev: 10x, 50x, 100x)', () => {
		expect(sim.speed).toBe(1.0);

		// Selecting 2x
		sim.speed = 2.0;
		expect(sim.speed).toBe(2.0);

		// Selecting 3x
		sim.speed = 3.0;
		expect(sim.speed).toBe(3.0);

		// Selecting 5x
		sim.speed = 5.0;
		expect(sim.speed).toBe(5.0);

		// Turbo Dev modes
		sim.speed = 10.0;
		expect(sim.speed).toBe(10.0);

		sim.speed = 50.0;
		expect(sim.speed).toBe(50.0);

		sim.speed = 100.0;
		expect(sim.speed).toBe(100.0);
	});

	it('verifies Play / Pause simulation toggle', () => {
		sim.isRunning = true;
		expect(sim.isRunning).toBe(true);

		sim.isRunning = false;
		expect(sim.isRunning).toBe(false);

		sim.isRunning = true;
		expect(sim.isRunning).toBe(true);
	});

	it('verifies Castle HP ratio and visual percentage calculations in TopBar', () => {
		const westCastle = sim.castles.west;
		const eastCastle = sim.castles.east;

		// 100% full health at match start
		expect(Math.round((westCastle.hp / westCastle.maxHp) * 100)).toBe(100);
		expect(Math.round((eastCastle.hp / eastCastle.maxHp) * 100)).toBe(100);

		// Damaged castle (50% and 10%)
		westCastle.hp = Math.round(westCastle.maxHp * 0.5);
		expect(Math.round((westCastle.hp / westCastle.maxHp) * 100)).toBe(50);

		eastCastle.hp = Math.round(eastCastle.maxHp * 0.1);
		expect(Math.round((eastCastle.hp / eastCastle.maxHp) * 100)).toBe(10);
	});

	it('verifies Rescue Strike and Race Skill readiness states', () => {
		// Ready at match start
		expect(sim.canUseRescueStrike('west')).toBe(true);
		expect(sim.rescueStrikeCooldown.west).toBe(0);

		// Trigger rescue strike
		sim.triggerRescueStrike('west');
		expect(sim.canUseRescueStrike('west')).toBe(false);
		expect(sim.rescueStrikeCooldown.west).toBe(180);

		// Race skill unlocks after 300s
		sim.gameTime = 100;
		expect(sim.canUseRaceSkill('west')).toBe(false);

		sim.gameTime = 301;
		expect(sim.canUseRaceSkill('west')).toBe(true);
	});

	it('Game timer advances continuously with simulation steps and formats correctly', () => {
		function formatTime(sec: number): string {
			const totalSec = Math.floor(sec + 0.001);
			const m = Math.floor(totalSec / 60);
			const s = Math.floor(totalSec % 60);
			return `${m}:${s < 10 ? '0' : ''}${s}`;
		}

		sim.isRunning = true;
		expect(sim.gameTime).toBe(0);
		expect(formatTime(sim.gameTime)).toBe('0:00');

		// Advance 60 frames at 1/60s (1.0s)
		for (let i = 0; i < 60; i++) {
			sim.step(1 / 60);
		}
		expect(sim.gameTime).toBeCloseTo(1.0, 2);
		expect(formatTime(sim.gameTime)).toBe('0:01');

		// Advance another 65 seconds
		for (let i = 0; i < 65 * 60; i++) {
			sim.step(1 / 60);
		}
		expect(sim.gameTime).toBeCloseTo(66.0, 1);
		expect(formatTime(sim.gameTime)).toBe('1:06');

		// Formatting helper checks
		expect(formatTime(0)).toBe('0:00');
		expect(formatTime(59)).toBe('0:59');
		expect(formatTime(60)).toBe('1:00');
		expect(formatTime(125)).toBe('2:05');
		expect(formatTime(600)).toBe('10:00');
	});

	it('Boss timer counts down from 180s with simulation steps and spawns boss when reaching 0', () => {
		sim.isRunning = true;
		expect(sim.bossSpawnTimer).toBe(180);
		expect(sim.activeBossInstanceId).toBeNull();

		// Step 10 seconds
		for (let i = 0; i < 10 * 60; i++) {
			sim.step(1 / 60);
		}
		expect(sim.bossSpawnTimer).toBeCloseTo(170, 1);
		expect(Math.max(0, Math.ceil(sim.bossSpawnTimer))).toBe(170);

		// Step remaining 170 seconds to trigger boss spawn
		for (let i = 0; i < 170 * 60; i++) {
			sim.step(1 / 60);
		}
		// Boss should have spawned
		expect(sim.bossSpawnTimer).toBeLessThanOrEqual(0);
		expect(sim.activeBossInstanceId).not.toBeNull();

		// While boss is active, timer countdown is suspended
		const timerWhileBossAlive = sim.bossSpawnTimer;
		sim.step(1 / 60);
		expect(sim.bossSpawnTimer).toBe(timerWhileBossAlive);

		// When boss is killed, timer resets to 180s
		const bossUnit = sim.units.find((u) => u.instanceId === sim.activeBossInstanceId);
		expect(bossUnit).toBeDefined();
		if (bossUnit) {
			sim.combatSystem.applyUnitDamage(bossUnit, 999999, 'chaos', 'west', false);
			expect(sim.bossSpawnTimer).toBe(180);
			expect(sim.activeBossInstanceId).toBeNull();
		}
	});

	it('Simulates game loop tick progression ensuring TopBar reactive derived state updates', () => {
		sim.isRunning = true;
		let uiTick = 0;

		// Mock derived state mimicking Svelte 5 TopBar runes:
		// let gameTime = $derived(uiTick >= 0 ? sim.gameTime : 0);
		// let bossSpawnTimer = $derived(uiTick >= 0 ? Math.max(0, Math.ceil(sim.bossSpawnTimer)) : 180);
		const getDerivedGameTime = () => (uiTick >= 0 ? sim.gameTime : 0);
		const getDerivedBossTimer = () =>
			uiTick >= 0 ? Math.max(0, Math.ceil(sim.bossSpawnTimer)) : 180;

		expect(getDerivedGameTime()).toBe(0);
		expect(getDerivedBossTimer()).toBe(180);

		// Simulate 1 frame with 2 sub-steps:
		const stepsCount = 2;
		for (let s = 0; s < stepsCount; s++) {
			sim.step(1 / 60);
		}
		// Game loop updates uiTick with sim.tick + sim.stateVersion
		if (stepsCount > 0) {
			uiTick = sim.tick + sim.stateVersion;
		}

		expect(uiTick).toBe(2);
		expect(getDerivedGameTime()).toBeCloseTo(2 / 60, 3);
		expect(getDerivedBossTimer()).toBe(180);

		// Advance 2 seconds
		for (let i = 0; i < 120; i++) {
			sim.step(1 / 60);
		}
		uiTick = sim.tick + sim.stateVersion;

		expect(uiTick).toBe(122);
		expect(getDerivedGameTime()).toBeCloseTo(122 / 60, 1);
		expect(getDerivedBossTimer()).toBe(178);
	});
});
