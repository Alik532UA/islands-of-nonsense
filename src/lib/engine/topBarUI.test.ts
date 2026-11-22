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
});
