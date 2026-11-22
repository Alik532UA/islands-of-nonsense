import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { TOP_LANE_Y } from './constants';

describe('Point 7: Authentic Spell & Projectile VFX', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 1000 });
	});

	it('створює процедурні ефекти блискавок (lightningEffects) при спрацьовуванні Chain Lightning', () => {
		// Spawn Shaman / Far Seer with Chain Lightning
		sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 1000,
			y: TOP_LANE_Y,
			abilityType: 'chain_lightning'
		});

		// Spawn 3 enemy targets in range
		sim.spawnUnitDirectly({ team: 'east', lane: 'top', x: 1100, y: TOP_LANE_Y });
		sim.spawnUnitDirectly({ team: 'east', lane: 'top', x: 1150, y: TOP_LANE_Y });
		sim.spawnUnitDirectly({ team: 'east', lane: 'top', x: 1200, y: TOP_LANE_Y });

		expect(sim.lightningEffects.length).toBe(0);

		// Step simulation to trigger ability
		sim.combatSystem.updateUnits(0.1);

		expect(sim.lightningEffects.length).toBeGreaterThanOrEqual(3);
		const firstArc = sim.lightningEffects[0];
		expect(firstArc.timer).toBeGreaterThan(0);
		expect(firstArc.color).toBe(0x67e8f9); // Electric cyan

		// Step simulation past timer to verify cleanup
		sim.step(0.4);
		expect(sim.lightningEffects.length).toBe(0);
	});

	it('створює ефект громового удару (Thunderbolt) з електричним розрядом', () => {
		sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 1000,
			y: TOP_LANE_Y,
			abilityType: 'thunderbolt'
		});

		sim.spawnUnitDirectly({ team: 'east', lane: 'top', x: 1150, y: TOP_LANE_Y });

		expect(sim.lightningEffects.length).toBe(0);

		sim.combatSystem.updateUnits(0.1);

		expect(sim.lightningEffects.length).toBe(1);
		expect(sim.lightningEffects[0].color).toBe(0x38bdf8);
	});

	it('снаряди облоги мають балістичну дугу (arcHeight >= 65)', () => {
		const siegeUnit = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 1000,
			y: TOP_LANE_Y,
			range: 450
		});
		siegeUnit.attackType = 'siege';

		const enemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 1300,
			y: TOP_LANE_Y
		});

		sim.combatSystem.performAttack(siegeUnit, enemy);

		expect(sim.projectiles.length).toBe(1);
		const proj = sim.projectiles[0];
		expect(proj.attackType).toBe('siege');
		expect(proj.arcHeight).toBeGreaterThanOrEqual(65);
	});

	it('снаряди крижаних юнітів позначаються прапорцем hasFrost', () => {
		const frostArcher = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 1000,
			y: TOP_LANE_Y,
			range: 400,
			frostOnHit: true
		});

		const enemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 1300,
			y: TOP_LANE_Y
		});

		sim.combatSystem.performAttack(frostArcher, enemy);

		expect(sim.projectiles.length).toBe(1);
		expect(sim.projectiles[0].hasFrost).toBe(true);
	});
});
