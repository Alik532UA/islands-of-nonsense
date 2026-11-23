import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { getUnit } from './gameData';

describe('Point 2: Dispel Magic & Purge Mechanics (Abolish, Dispel, Purge)', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 2000, isRunning: true });
	});

	it('assigns dispel ability archetype to spellcasters (h07B, n015)', () => {
		const casterDef = getUnit('h07B'); // Заклинателька
		expect(casterDef).toBeDefined();
		expect(casterDef?.abilities?.some((a) => a.type === 'dispel')).toBe(true);
	});

	it('dispels negative debuffs (slow, curse, poison) from an allied unit', () => {
		// Spawn ally with debuffs on West team
		const debuffedAlly = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 1000,
			y: 660,
			hp: 300,
			maxHp: 300,
			speed: 100,
			attackType: 'normal',
			armorType: 'medium',
			range: 100,
			damage: 20,
			attackCooldown: 1.0
		});
		debuffedAlly.buffs = [
			{ type: 'slow', timer: 5.0, value: 0.5 },
			{ type: 'curse', timer: 6.0, value: 0.33 },
			{ type: 'poison', timer: 4.0, value: 15 }
		];
		debuffedAlly.isEnsnared = true;
		debuffedAlly.isPolymorphed = true;

		// Spawn friendly dispeller nearby
		const dispeller = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 1050,
			y: 660,
			hp: 400,
			maxHp: 400,
			speed: 100,
			attackType: 'magic',
			armorType: 'none',
			range: 400,
			damage: 15,
			attackCooldown: 1.2,
			abilityType: 'dispel',
			maxMana: 200,
			mana: 100
		});

		// Run 1 simulation tick (0.05s)
		sim.step(0.05);

		// Debuffs should be stripped
		expect(debuffedAlly.isEnsnared).toBe(false);
		expect(debuffedAlly.isPolymorphed).toBe(false);
		expect(debuffedAlly.buffs?.length).toBe(0);

		// Dispeller consumed mana and has cooldown
		expect(dispeller.mana).toBe(55); // 100 - 45
		expect(dispeller.abilityCooldownTimer).toBeGreaterThan(7.0);
	});

	it('purges positive buffs (bloodlust, inner_fire) from an enemy unit', () => {
		// Spawn buffed enemy
		const buffedEnemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 1200,
			y: 660,
			hp: 500,
			maxHp: 500,
			speed: 100,
			attackType: 'normal',
			armorType: 'large',
			range: 100,
			damage: 30,
			attackCooldown: 1.0
		});
		buffedEnemy.buffs = [
			{ type: 'bloodlust', timer: 8.0, value: 0.4 },
			{ type: 'inner_fire', timer: 10.0, value: 0.25 }
		];

		// Spawn friendly dispeller nearby
		const dispeller = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 1100,
			y: 660,
			hp: 400,
			maxHp: 400,
			speed: 100,
			attackType: 'magic',
			armorType: 'none',
			range: 400,
			damage: 15,
			attackCooldown: 1.2,
			abilityType: 'dispel',
			maxMana: 200,
			mana: 100
		});

		// Run 1 simulation tick
		sim.step(0.05);

		// Positive buffs stripped
		expect(buffedEnemy.buffs?.length).toBe(0);
		expect(dispeller.mana).toBe(55);
	});

	it('deals 150 magic damage to summoned units when purged', () => {
		// Spawn summoned enemy skeleton (e.g. from raise_dead)
		const skeleton = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 1200,
			y: 660,
			hp: 240,
			maxHp: 240,
			speed: 100,
			attackType: 'normal',
			armorType: 'medium',
			range: 100,
			damage: 15,
			attackCooldown: 1.0
		});
		skeleton.isSummoned = true;

		// Spawn friendly dispeller
		const dispeller = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 1100,
			y: 660,
			hp: 400,
			maxHp: 400,
			speed: 100,
			attackType: 'magic',
			armorType: 'none',
			range: 400,
			damage: 15,
			attackCooldown: 1.2,
			abilityType: 'dispel',
			maxMana: 200,
			mana: 100
		});

		const initialHp = skeleton.hp;
		sim.step(0.05);

		// Skeleton took damage from dispel (150 raw magic damage against medium armor)
		expect(skeleton.hp).toBeLessThan(initialHp);
		expect(initialHp - skeleton.hp).toBeGreaterThan(90);
		expect(dispeller.mana).toBe(55);
	});
});
