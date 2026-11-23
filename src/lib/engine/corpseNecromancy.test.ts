import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { resolveUnitAbility, getUnit } from './gameData';

describe('Point 2: Corpse and Necromancy System (Raise Dead, Cannibalize, Corpse Explosion)', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 1000 });
	});

	it('resolves correct ability archetype for Necromancers and Ghouls', () => {
		const necroDef = getUnit('u009'); // Некромант
		const ghoulDef = getUnit('u005'); // Вурдалак

		expect(resolveUnitAbility(necroDef)).toBe('raise_dead');
		expect(resolveUnitAbility(ghoulDef)).toBe('cannibalize');
	});

	it('spawns a decaying corpse when a standard unit dies in combat', () => {
		const victim = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 1000,
			y: 660,
			hp: 50
		});

		expect(sim.corpses.length).toBe(0);

		// Inflict fatal damage
		sim.combatSystem.applyUnitDamage(victim, 100, 'normal', 'west', false);

		expect(victim.state).toBe('DEAD');
		expect(sim.corpses.length).toBe(1);
		expect(sim.corpses[0].x).toBe(1000);
		expect(sim.corpses[0].y).toBe(660);
		expect(sim.corpses[0].decayTimer).toBe(20.0);

		// Step simulation to verify decay
		sim.step(5.0);
		expect(sim.corpses[0].decayTimer).toBeCloseTo(15.0, 1);

		// Step simulation past 20s to verify cleanup
		sim.step(16.0);
		expect(sim.corpses.length).toBe(0);
	});

	it('Necromancer raises a fallen corpse as a timed Skeleton Warrior', () => {
		// Spawn a corpse directly
		sim.corpses.push({
			id: 'test_corpse_1',
			x: 550,
			y: 660,
			lane: 'top',
			team: 'east',
			decayTimer: 18.0,
			unitDefId: 'test',
			name: 'Полеглий піхотинець',
			isFlyer: false
		});

		// Spawn Necromancer with mana and raise_dead ability
		const necro = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 660,
			abilityType: 'raise_dead',
			mana: 100,
			maxMana: 100,
			manaRegen: 2.0
		});

		expect(sim.units.length).toBe(1);
		expect(sim.corpses.length).toBe(1);

		// Step combat to trigger raise_dead
		sim.combatSystem.updateUnits(0.05);

		// Corpse should be consumed
		expect(sim.corpses.length).toBe(0);

		// Skeleton warrior spawned
		expect(sim.units.length).toBe(2);
		const skeleton = sim.units.find((u) => u.name === 'Скелет-воїн');
		expect(skeleton).toBeDefined();
		expect(skeleton?.team).toBe('west');
		expect(skeleton?.lane).toBe('top');
		expect(skeleton?.isSummoned).toBe(true);
		expect(skeleton?.timedLife).toBeLessThanOrEqual(25.0);
		expect(skeleton?.timedLife).toBeGreaterThan(24.0);

		// Necro mana deducted and cooldown applied
		expect(necro.mana).toBe(55); // 100 - 45
		expect(necro.abilityCooldownTimer).toBeGreaterThan(0);
	});

	it('Summoned skeletons do not produce infinite corpses upon death', () => {
		const summonedSkeleton = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 660,
			hp: 10,
			isSummoned: true
		});

		expect(sim.corpses.length).toBe(0);
		sim.combatSystem.applyUnitDamage(summonedSkeleton, 50, 'chaos', 'east', false);
		expect(summonedSkeleton.state).toBe('DEAD');

		// Still 0 corpses because isSummoned was true
		expect(sim.corpses.length).toBe(0);
	});

	it('Cannibalize consumes a nearby corpse and restores HP to injured unit', () => {
		// Spawn a corpse nearby
		sim.corpses.push({
			id: 'test_corpse_2',
			x: 520,
			y: 660,
			lane: 'top',
			team: 'west',
			decayTimer: 18.0,
			unitDefId: 'test',
			name: 'Тіло',
			isFlyer: false
		});

		const ghoul = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 660,
			hp: 200,
			maxHp: 600, // 33% HP (< 75%)
			abilityType: 'cannibalize'
		});

		expect(sim.corpses.length).toBe(1);
		sim.combatSystem.updateUnits(0.05);

		// Corpse consumed
		expect(sim.corpses.length).toBe(0);

		// Ghoul healed for 35% of 600 = +210 HP -> 410 HP
		expect(ghoul.hp).toBe(410);
		expect(ghoul.abilityCooldownTimer).toBeGreaterThan(0);
	});

	it('Corpse Explosion detonates a corpse dealing AoE damage to nearby enemies', () => {
		sim.corpses.push({
			id: 'test_corpse_3',
			x: 600,
			y: 660,
			lane: 'top',
			team: 'west',
			decayTimer: 18.0,
			unitDefId: 'test',
			name: 'Тіло',
			isFlyer: false
		});

		// Bomber with corpse_explosion
		sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 660,
			abilityType: 'corpse_explosion',
			mana: 50,
			maxMana: 50
		});

		// Enemy standing near corpse (distance <= 200 from corpse)
		const enemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 650,
			y: 660,
			hp: 250
		});

		expect(sim.corpses.length).toBe(1);
		sim.combatSystem.updateUnits(0.05);

		// Corpse consumed by explosion
		expect(sim.corpses.length).toBe(0);

		// Enemy took 100 damage (or scaled by armor)
		expect(enemy.hp).toBeLessThan(250);
	});

	it('resetRound clears all active corpses from battlefield', () => {
		sim.corpses.push({
			id: 'leftover_corpse',
			x: 500,
			y: 660,
			lane: 'top',
			team: 'west',
			decayTimer: 15.0,
			unitDefId: 'test',
			name: 'Залишок',
			isFlyer: false
		});
		expect(sim.corpses.length).toBe(1);

		sim.resetRound();
		expect(sim.corpses.length).toBe(0);
	});
});
