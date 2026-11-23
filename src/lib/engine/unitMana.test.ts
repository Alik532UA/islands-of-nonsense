import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { getUnit } from './gameData';
import { SPELL_MANA_COSTS } from './combatSystem';

describe('Unit Mana Pool, Regeneration & Spell Costs', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation();
	});

	it('loads mana fields for casters from WC3 definitions', () => {
		const paladin = getUnit('h03C');
		expect(paladin).toBeDefined();
		expect(paladin?.maxMana).toBe(300);
		expect(paladin?.mana).toBe(200); // umpi initial mana
		expect(paladin?.manaRegen).toBe(2.5);

		const priest = getUnit('h03B');
		expect(priest).toBeDefined();
		expect(priest?.maxMana).toBe(200);
		expect(priest?.mana).toBe(150);
		expect(priest?.manaRegen).toBe(2);

		const lich = getUnit('u00D');
		expect(lich).toBeDefined();
		expect(lich?.maxMana).toBe(400);
		expect(lich?.mana).toBe(250);
		expect(lich?.manaRegen).toBe(2.5);
	});

	it('spawns unit with correct initial mana and maxMana', () => {
		const caster = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 660,
			maxMana: 200,
			mana: 100,
			manaRegen: 5
		});

		expect(caster.maxMana).toBe(200);
		expect(caster.mana).toBe(100);
		expect(caster.manaRegen).toBe(5);
	});

	it('deducts exact mana cost when casting an active spell (e.g. heal 25 mana)', () => {
		const healer = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 660,
			abilityType: 'heal',
			maxMana: 100,
			mana: 50,
			manaRegen: 0
		});

		const injuredAlly = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 520,
			y: 660,
			hp: 200,
			maxHp: 500
		});

		sim.combatSystem.updateUnits(0.1);

		expect(injuredAlly.hp).toBe(265); // 200 + 65
		expect(healer.mana).toBe(50 - SPELL_MANA_COSTS.heal); // 50 - 25 = 25
	});

	it('prevents spell casting when caster has insufficient mana', () => {
		const healer = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 660,
			abilityType: 'heal',
			maxMana: 100,
			mana: 10, // less than healCost (25)
			manaRegen: 0
		});

		const injuredAlly = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 520,
			y: 660,
			hp: 200,
			maxHp: 500
		});

		sim.combatSystem.updateUnits(0.1);

		expect(injuredAlly.hp).toBe(200); // Not healed
		expect(healer.mana).toBe(10); // Mana intact
	});

	it('regenerates mana continuously over time up to maxMana', () => {
		const caster = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 660,
			maxMana: 100,
			mana: 40,
			manaRegen: 10 // 10 mana / sec
		});

		// 2 seconds of simulation
		sim.combatSystem.updateUnits(2.0);

		expect(caster.mana).toBeCloseTo(60, 1);

		// 10 more seconds: should clamp at maxMana (100)
		sim.combatSystem.updateUnits(10.0);
		expect(caster.mana).toBe(100);
	});

	it('mana burn burns enemy caster mana and inflicts magic damage', () => {
		const demonHunter = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 660,
			abilityType: 'mana_burn',
			maxMana: 100,
			mana: 50,
			manaRegen: 0
		});

		const enemyCaster = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 550,
			y: 660,
			hp: 300,
			maxHp: 300,
			maxMana: 150,
			mana: 80,
			manaRegen: 0
		});

		sim.combatSystem.updateUnits(0.1);

		// Enemy lost 50 mana and took 50 magic damage
		expect(enemyCaster.mana).toBe(30);
		expect(enemyCaster.hp).toBeLessThan(300);
		// Demon hunter spent 35 mana
		expect(demonHunter.mana).toBe(50 - SPELL_MANA_COSTS.mana_burn);
	});
});
