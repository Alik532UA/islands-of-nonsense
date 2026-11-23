import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';

describe('Point 2: Full Scavenger Race Debris and Great Assembly Mechanics', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 2000 });
	});

	it('drops debris when a Scavenger unit dies and buffs up to 2 nearest allies', () => {
		// Spawn Scavenger unit and 3 nearby allies on the same lane
		const dyingScavenger = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'bottom',
			x: 1000,
			y: 580,
			hp: 10,
			isScavenger: true
		});

		const ally1 = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'bottom',
			x: 1050,
			y: 580,
			hp: 200
		});

		const ally2 = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'bottom',
			x: 1100,
			y: 580,
			hp: 200
		});

		const ally3Far = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'bottom',
			x: 1550,
			y: 580,
			hp: 200
		});

		// Killer enemy
		sim.spawnUnitDirectly({
			team: 'east',
			lane: 'bottom',
			x: 1010,
			y: 580,
			hp: 1000,
			damage: 500,
			range: 100,
			attackCooldown: 0.1
		});

		// Step until scavenger dies
		for (let i = 0; i < 15; i++) {
			sim.step(0.05);
			if (dyingScavenger.state === 'DEAD') break;
		}

		expect(dyingScavenger.state).toBe('DEAD');

		// Debris spawned on the field
		expect(sim.debris.length).toBeGreaterThan(0);
		expect(sim.debris.some((d) => d.team === 'west')).toBe(true);

		// Ally 1 and Ally 2 should receive the speed buff (+10% AS for 15s)
		expect(ally1.buffs?.some((b) => b.type === 'as' && b.value === 0.1)).toBe(true);
		expect(ally2.buffs?.some((b) => b.type === 'as' && b.value === 0.1)).toBe(true);
		// Ally 3 is outside top 2 closest / radius
		expect(ally3Far.buffs?.some((b) => b.type === 'as')).toBeFalsy();
	});

	it('Great Assembly (Велика збірка) race ability empowers 4 allies with +20% attack speed', () => {
		// Activate Great Assembly on west team
		sim.greatAssemblyTimer.west = 15;

		const dyingScavenger = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 800,
			y: 220,
			hp: 10,
			isScavenger: true
		});

		const allies = [
			sim.spawnUnitDirectly({ team: 'west', lane: 'top', x: 820, y: 220, hp: 200 }),
			sim.spawnUnitDirectly({ team: 'west', lane: 'top', x: 840, y: 220, hp: 200 }),
			sim.spawnUnitDirectly({ team: 'west', lane: 'top', x: 860, y: 220, hp: 200 }),
			sim.spawnUnitDirectly({ team: 'west', lane: 'top', x: 880, y: 220, hp: 200 })
		];

		sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 805,
			y: 220,
			hp: 1000,
			damage: 500,
			range: 100,
			attackCooldown: 0.1
		});

		for (let i = 0; i < 15; i++) {
			sim.step(0.05);
			if (dyingScavenger.state === 'DEAD') break;
		}

		expect(dyingScavenger.state).toBe('DEAD');

		// Under Great Assembly, all 4 allies receive +20% attack speed
		for (const ally of allies) {
			expect(ally.buffs?.some((b) => b.type === 'as' && b.value === 0.2)).toBe(true);
		}
	});

	it('Assembly plant (cg08) grants +1 buff target and extends search radius', () => {
		// Place constructed Assembly plant for west team
		sim.build('west', 'cg08', 25, 20);
		if (sim.buildings[0]) sim.buildings[0].isUnderConstruction = false;

		const dyingScavenger = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'bottom',
			x: 1000,
			y: 580,
			hp: 10,
			isScavenger: true
		});

		const allies = [
			sim.spawnUnitDirectly({ team: 'west', lane: 'bottom', x: 1030, y: 580, hp: 200 }),
			sim.spawnUnitDirectly({ team: 'west', lane: 'bottom', x: 1060, y: 580, hp: 200 }),
			sim.spawnUnitDirectly({ team: 'west', lane: 'bottom', x: 1090, y: 580, hp: 200 })
		];

		sim.spawnUnitDirectly({
			team: 'east',
			lane: 'bottom',
			x: 1005,
			y: 580,
			hp: 1000,
			damage: 500,
			range: 100,
			attackCooldown: 0.1
		});

		for (let i = 0; i < 15; i++) {
			sim.step(0.05);
			if (dyingScavenger.state === 'DEAD') break;
		}

		// With Assembly plant: 2 + 1 = 3 allies buffed
		for (const ally of allies) {
			expect(ally.buffs?.some((b) => b.type === 'as')).toBe(true);
		}
	});

	it('walking over scrap debris on the field consumes it and grants buffs', () => {
		// Drop debris directly
		sim.debris.push({
			id: 'test_debris',
			x: 1500,
			y: 580,
			team: 'west',
			value: 15,
			lifeTime: 15.0
		});

		const walkingAlly = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'bottom',
			x: 1490,
			y: 580,
			hp: 150
		});

		expect(sim.debris.length).toBe(1);

		// Step simulation to trigger pickup
		sim.step(0.05);

		// Debris should be consumed and ally buffed
		expect(sim.debris.length).toBe(0);
		expect(walkingAlly.buffs?.some((b) => b.type === 'as')).toBe(true);
	});
});
