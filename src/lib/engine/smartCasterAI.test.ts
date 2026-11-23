import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { SPELL_MANA_COSTS } from './combatSystem';

describe('Point 7: Smart Caster Mana & Target Validation AI', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 2000 });
	});

	it('Heal AI conserves mana and ignores allies missing under 15 HP', () => {
		const healer = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 660,
			abilityType: 'heal',
			mana: 100,
			maxMana: 100
		});

		// Ally missing only 5 HP (495/500)
		const almostFullAlly = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 550,
			y: 660,
			hp: 495,
			maxHp: 500
		});

		sim.step(0.05);

		// Healer should NOT waste mana or trigger cooldown for 5 HP
		expect(healer.mana).toBe(100);
		expect(healer.abilityCooldownTimer ?? 0).toBe(0);
		expect(almostFullAlly.hp).toBe(495);
	});

	it('Heal AI prioritizes the most critically injured ally (lowest HP percentage)', () => {
		const healer = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 660,
			abilityType: 'heal',
			mana: 100,
			maxMana: 100
		});

		// Ally 1: 350 / 500 HP (70% HP, missing 150)
		const allyModerate = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 520,
			y: 660,
			hp: 350,
			maxHp: 500
		});

		// Ally 2: 100 / 500 HP (20% HP, critical!)
		const allyCritical = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 540,
			y: 660,
			hp: 100,
			maxHp: 500
		});

		sim.step(0.05);

		// Healer should prioritize allyCritical (100 -> 165 HP)
		expect(allyCritical.hp).toBe(165);
		expect(allyModerate.hp).toBe(350);
		expect(healer.mana).toBe(100 - SPELL_MANA_COSTS.heal);
	});

	it('Bloodlust AI prioritizes highest DPS fighter over weak support units', () => {
		const shaman = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 660,
			abilityType: 'bloodlust',
			mana: 100,
			maxMana: 100
		});

		// Weak support unit: 15 DPS
		const weakFighter = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 520,
			y: 660,
			damage: 15,
			attackCooldown: 1.0
		});

		// Heavy DPS carry: 60 DPS
		const heavyCarry = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 540,
			y: 660,
			damage: 60,
			attackCooldown: 1.0
		});

		sim.step(0.05);

		// Carry receives Bloodlust first
		expect(heavyCarry.buffs?.some((b) => b.type === 'bloodlust')).toBe(true);
		expect(weakFighter.buffs?.some((b) => b.type === 'bloodlust')).toBeFalsy();
	});

	it('Polymorph AI disables the highest damage enemy in range', () => {
		const sorceress = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 660,
			abilityType: 'polymorph',
			mana: 100,
			maxMana: 100
		});

		// Enemy grunt: 20 damage
		const grunt = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 600,
			y: 660,
			damage: 20
		});

		// Enemy warlord: 85 damage
		const warlord = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 620,
			y: 660,
			damage: 85
		});

		sim.step(0.05);

		// Sorceress should sheep the warlord instead of grunt
		expect(warlord.buffs?.some((b) => b.type === 'polymorph')).toBe(true);
		expect(grunt.buffs?.some((b) => b.type === 'polymorph')).toBeFalsy();
	});

	it('Casters conserve actions when mana is below required spell cost', () => {
		const sorceress = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 660,
			abilityType: 'polymorph',
			mana: 20, // Less than polyCost (60)
			maxMana: 100
		});

		const warlord = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 600,
			y: 660,
			damage: 85
		});

		sim.step(0.05);

		expect(warlord.buffs?.some((b) => b.type === 'polymorph')).toBeFalsy();
		expect(sorceress.mana).toBeGreaterThanOrEqual(20);
	});
});
