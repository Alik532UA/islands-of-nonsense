import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { resolveUnitAbility, getUnit } from './gameData';
import type { UnitDefinition } from './types';

function mockUnitDef(
	partial: Partial<UnitDefinition> & { id: string; name: string }
): UnitDefinition {
	return {
		hp: 400,
		armor: 0,
		armor_type: 'none',
		attack_type: 'magic',
		damage_base: 10,
		damage_dice: 1,
		damage_sides: 6,
		cooldown: 1.5,
		range: 400,
		move_type: 'foot',
		flying: false,
		gold_cost: 150,
		...partial
	};
}

describe('Point 3: Caster Control Spells (Polymorph, Cyclone, Banish, Mana Shield)', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 1000 });
	});

	it('resolves correct ability archetype for tactical casters', () => {
		expect(resolveUnitAbility(getUnit('n01T'))).toBe('mana_shield'); // Морська відьма
		expect(
			resolveUnitAbility(
				mockUnitDef({
					id: 'custom_sorc',
					name: 'Чарівниця',
					hp: 400,
					armor: 0,
					armor_type: 'none',
					attack_type: 'magic'
				})
			)
		).toBe('polymorph');
		expect(
			resolveUnitAbility(
				mockUnitDef({
					id: 'custom_druid',
					name: 'Прикликач вітру',
					hp: 400,
					armor: 0,
					armor_type: 'none',
					attack_type: 'magic'
				})
			)
		).toBe('cyclone');
		expect(
			resolveUnitAbility(
				mockUnitDef({
					id: 'custom_bloodmage',
					name: 'Маг крові',
					hp: 400,
					armor: 0,
					armor_type: 'none',
					attack_type: 'magic'
				})
			)
		).toBe('banish');
	});

	it('Polymorph transforms enemy into sheep, disarming them and slowing move speed', () => {
		// Spawn Sorceress with polymorph
		const sorceress = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 660,
			abilityType: 'polymorph',
			mana: 100,
			maxMana: 100
		});

		// Spawn strong enemy warrior
		const enemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 600,
			y: 660,
			hp: 1000,
			damage: 50,
			range: 100
		});

		expect(enemy.buffs?.some((b) => b.type === 'polymorph')).toBeFalsy();

		// Update units to trigger spell cast
		sim.combatSystem.updateUnits(0.05);

		// Enemy is polymorphed
		expect(enemy.buffs?.some((b) => b.type === 'polymorph')).toBe(true);
		expect(enemy.isPolymorphed).toBe(true);
		expect(enemy.currentTargetId).toBeNull();

		// Sorceress mana deducted and cooldown set
		expect(sorceress.mana).toBe(40); // 100 - 60
		expect(sorceress.abilityCooldownTimer).toBeGreaterThan(0);
	});

	it('Cyclone suspends enemy in the air, making them invulnerable and untargetable', () => {
		const druid = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 660,
			abilityType: 'cyclone',
			mana: 100,
			maxMana: 100
		});

		const enemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 600,
			y: 660,
			hp: 800
		});

		sim.combatSystem.updateUnits(0.05);

		// Enemy is in cyclone
		expect(enemy.buffs?.some((b) => b.type === 'cyclone')).toBe(true);
		expect(enemy.isCycloned).toBe(true);

		// While in cyclone, attacks deal 0 damage (invulnerable)
		sim.combatSystem.applyUnitDamage(enemy, 150, 'chaos', 'west', false);
		expect(enemy.hp).toBe(800);

		// Untargetable by other allies
		const allyAttacker = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 550,
			y: 660,
			range: 200
		});
		sim.spatialGrid.clear();
		sim.spatialGrid.insert(enemy);
		const target = sim.combatSystem.findBestTarget(allyAttacker);
		expect(target).toBeNull();
	});

	it('Banish grants ethereal physical immunity and amplifies magic damage by 66%', () => {
		const bloodMage = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 660,
			abilityType: 'banish',
			mana: 100,
			maxMana: 100
		});

		const warrior = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 600,
			y: 660,
			hp: 1000,
			armor: 0,
			armorType: 'normal'
		});

		sim.combatSystem.updateUnits(0.05);

		// Warrior is banished
		expect(warrior.buffs?.some((b) => b.type === 'banish')).toBe(true);
		expect(warrior.isBanished).toBe(true);

		// Physical attacks deal 0 damage
		sim.combatSystem.applyUnitDamage(warrior, 100, 'normal', 'west', false);
		sim.combatSystem.applyUnitDamage(warrior, 100, 'pierce', 'west', false);
		sim.combatSystem.applyUnitDamage(warrior, 100, 'siege', 'west', false);
		expect(warrior.hp).toBe(1000);

		// Magic attacks take amplified damage (+66%)
		// Base damage: 100 * 1.66 = 166 (normal armor takes 100% magic)
		sim.combatSystem.applyUnitDamage(warrior, 100, 'magic', 'west', false);
		expect(warrior.hp).toBe(1000 - 166);
	});

	it('Mana Shield absorbs 50% damage using caster mana', () => {
		const witch = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 660,
			hp: 500,
			maxHp: 500,
			armor: 0,
			armorType: 'normal',
			abilityType: 'mana_shield',
			mana: 100,
			maxMana: 100
		});

		sim.combatSystem.updateUnits(0.05);
		expect(witch.hasManaShield).toBe(true);

		// Inflict 100 raw damage:
		// Mana shield absorbs 50% (50 dmg), consuming 25 mana (1 dmg = 0.5 mana)
		// Witch receives remaining 50 damage
		sim.combatSystem.applyUnitDamage(witch, 100, 'normal', 'east', false);

		expect(witch.mana).toBe(75); // 100 - 25
		expect(witch.hp).toBe(450); // 500 - 50
	});
});
