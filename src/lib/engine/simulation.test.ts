import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { getBaseBuildingsForRace, getBuilding } from './gameData';

describe('Castle Fight Simulation - Economy & Gold', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 500 });
	});

	it('should deduct exact gold when building a structure', () => {
		const initialGold = sim.players.west.gold;
		expect(initialGold).toBe(500);

		// Get a known building for Humans (e.g. Лагерь Стрелков h003, cost 140)
		const bDef = getBuilding('h003');
		expect(bDef).toBeDefined();
		const cost = bDef!.gold_cost || 140;

		const success = sim.build('west', 'h003', 0, 0, 'top');
		expect(success).toBe(true);
		expect(sim.players.west.gold).toBe(initialGold - cost);
		expect(sim.players.west.stats.goldSpent).toBe(cost);
		expect(sim.buildings.length).toBe(1);
	});

	it('should not allow building if player has insufficient gold', () => {
		sim.players.west.gold = 50; // Not enough for 140g building

		const success = sim.build('west', 'h003', 0, 0, 'top');
		expect(success).toBe(false);
		expect(sim.players.west.gold).toBe(50);
		expect(sim.buildings.length).toBe(0);
	});

	it('should not allow building on an already occupied tile and not deduct gold', () => {
		const success1 = sim.build('west', 'h003', 1, 1, 'top');
		expect(success1).toBe(true);
		const goldAfterFirst = sim.players.west.gold;

		// Attempt to build on the exact same tile (1, 1)
		const success2 = sim.build('west', 'h003', 1, 1, 'top');
		expect(success2).toBe(false);
		expect(sim.players.west.gold).toBe(goldAfterFirst);
		expect(sim.buildings.length).toBe(1);
	});

	it('should deduct gold on forge upgrades and apply Alik 50% discount', () => {
		sim.players.west.commander = 2; // Alik: 50% forge discount
		sim.players.west.gold = 500;

		const basePrice = 200;
		const discountedPrice = Math.round(basePrice * 0.5); // 100
		expect(sim.getForgePrice('west', 'attack')).toBe(discountedPrice);

		const upgraded = sim.upgradeForge('west', 'attack');
		expect(upgraded).toBe(true);
		expect(sim.players.west.forge.attack).toBe(1);
		expect(sim.players.west.gold).toBe(500 - discountedPrice);
	});
});

describe('Castle Fight Simulation - Lane Separation', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 1000 });
	});

	it('units on top lane MUST NOT acquire or attack units on bottom lane', () => {
		// Spawn a West unit on Top lane
		const westUnit = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 800,
			y: sim.topLaneY,
			hp: 500,
			range: 400, // Ranged unit
			attackCooldown: 1.0,
			damage: 50
		});

		// Spawn an East unit on Bottom lane nearby horizontally (e.g. X = 850)
		const eastUnit = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'bottom',
			x: 850,
			y: sim.bottomLaneY,
			hp: 500,
			range: 400,
			attackCooldown: 1.0,
			damage: 50
		});

		// Step simulation forward
		for (let i = 0; i < 20; i++) {
			sim.step(0.05);
		}

		// Because they are on different lanes, neither should have attacked the other!
		expect(westUnit.currentTargetId).not.toBe(eastUnit.instanceId);
		expect(eastUnit.currentTargetId).not.toBe(westUnit.instanceId);
		expect(westUnit.hp).toBe(500);
		expect(eastUnit.hp).toBe(500);
	});

	it('units on the SAME lane MUST acquire and attack each other', () => {
		// Spawn two enemies on Top lane within range
		const westUnit = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 800,
			y: sim.topLaneY,
			hp: 500,
			range: 200,
			attackCooldown: 0.5,
			damage: 50
		});

		const eastUnit = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 880,
			y: sim.topLaneY,
			hp: 500,
			range: 200,
			attackCooldown: 0.5,
			damage: 50
		});

		// Step simulation forward
		for (let i = 0; i < 25; i++) {
			sim.step(0.05);
		}

		// Units on the same lane should have fought and damaged each other
		expect(eastUnit.hp).toBeLessThan(500);
	});
});
