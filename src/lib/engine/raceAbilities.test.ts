import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { getRaceAbility } from './raceAbilities';

describe('Castle Fight - Race Abilities System', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 500 });
	});

	it('should have all 11 race abilities configured with Ukrainian and English descriptions', () => {
		const raceNames = [
			'Люди',
			'Наги',
			'Нежить',
			'Орки',
			'Нічні ельфи',
			'Техніки',
			'Хаос',
			'Ельфи',
			'Північ',
			'Порча',
			'Збирачі',
			'Сборщики'
		];

		for (const name of raceNames) {
			const abil = getRaceAbility(name);
			expect(abil).toBeDefined();
			expect(abil.nameUk.length).toBeGreaterThan(0);
			expect(abil.nameEn.length).toBeGreaterThan(0);
			expect(abil.descriptionUk.length).toBeGreaterThan(0);
			expect(abil.kind.length).toBeGreaterThan(0);
		}
	});

	it('should prevent using race ability before 300 seconds (5 minutes)', () => {
		sim.gameTime = 200;
		expect(sim.canUseRaceSkill('west')).toBe(false);
		const cast = sim.useRaceSkill('west');
		expect(cast).toBe(false);
	});

	it('should unlock and trigger race ability at 300s, applying buffs and setting 150s cooldown', () => {
		sim.gameTime = 300;
		sim.players.west.race = 'Люди'; // 'Знамено' -> +25% dmg buff

		// Spawn a friendly unit
		const unit = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: sim.topLaneY,
			hp: 300
		});

		expect(sim.canUseRaceSkill('west')).toBe(true);
		const success = sim.useRaceSkill('west');
		expect(success).toBe(true);

		// Cooldown must now be 150 seconds
		expect(sim.raceSkillCooldown.west).toBe(150);
		expect(sim.canUseRaceSkill('west')).toBe(false);

		// Friendly unit should have dmg buff
		expect(unit.buffs).toBeDefined();
		expect(unit.buffs?.some((b) => b.type === 'dmg')).toBe(true);
	});

	it('should apply plague (-10% HP) to enemy units when Undead ability is cast', () => {
		sim.gameTime = 305;
		sim.players.west.race = 'Нежить';

		const enemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 1000,
			y: sim.topLaneY,
			hp: 1000
		});

		const success = sim.useRaceSkill('west');
		expect(success).toBe(true);
		// Enemy should have lost 10% of 1000 = 100 HP
		expect(enemy.hp).toBe(900);
	});
});
