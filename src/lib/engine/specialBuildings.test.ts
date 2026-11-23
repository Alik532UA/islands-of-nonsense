import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { getBuilding, SPECIAL_BUILDINGS } from './gameData';

describe('Point 6: Special Non-Spawning Buildings (Treasure Box, Repair, Recycler)', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 2000 });
	});

	it('defines special non-spawning buildings with correct properties', () => {
		expect(SPECIAL_BUILDINGS.length).toBeGreaterThanOrEqual(3);

		const treasure = getBuilding('h008');
		expect(treasure).toBeDefined();
		expect(treasure?.specialType).toBe('treasure');
		expect(treasure?.gold_cost).toBe(160);

		const repair = getBuilding('cg09_repair');
		expect(repair).toBeDefined();
		expect(repair?.specialType).toBe('repair');
		expect(repair?.gold_cost).toBe(180);

		const recycler = getBuilding('cg07_recycler');
		expect(recycler).toBeDefined();
		expect(recycler?.specialType).toBe('recycler');
		expect(recycler?.gold_cost).toBe(210);
	});

	it('Treasure Box (h008) increases income by +20% per box without spawning units', () => {
		// Build 1 Treasure Box at (25, 20)
		const success = sim.build('west', 'h008', 25, 20);
		expect(success).toBe(true);

		const box = sim.buildings.find((b) => b.defId === 'h008');
		expect(box).toBeDefined();
		expect(box?.specialType).toBe('treasure');

		// Step for 15 seconds (typical spawner cycle is 10-14s)
		for (let i = 0; i < 300; i++) {
			sim.step(0.05);
		}

		// No units should have spawned from Treasure Box
		const unitsFromBox = sim.units.filter((u) => u.team === 'west');
		expect(unitsFromBox.length).toBe(0);

		// Record gold before income tick
		sim.incomeTimer = 0.05;
		const goldBefore = sim.players.west.gold;
		sim.step(0.05); // triggers income
		const goldGainedWith1Box = sim.players.west.gold - goldBefore;

		// Build a second Treasure Box at (25, 24)
		sim.players.west.gold = 2000;
		sim.build('west', 'h008', 25, 24);

		sim.incomeTimer = 0.05;
		const goldBefore2 = sim.players.west.gold;
		sim.step(0.05);
		const goldGainedWith2Boxes = sim.players.west.gold - goldBefore2;

		// 2 boxes give more income than 1 box
		expect(goldGainedWith2Boxes).toBeGreaterThan(goldGainedWith1Box);
	});

	it('Repair Station (cg09_repair) steadily restores castle HP without spawning units', () => {
		const westCastle = sim.castles.west;
		westCastle.hp = 10000;

		const success = sim.build('west', 'cg09_repair', 25, 20);
		expect(success).toBe(true);
		// Mark constructed to test repair mechanism in isolation
		sim.buildings[0].isUnderConstruction = false;

		const initialHp = westCastle.hp;

		// Step simulation for 3 seconds (should trigger 3 repair ticks = +75 HP)
		for (let i = 0; i < 60; i++) {
			sim.step(0.05);
		}

		expect(westCastle.hp).toBeGreaterThan(initialHp);
		expect(westCastle.hp).toBe(initialHp + 75);

		// No combat units should be spawned by repair station
		expect(sim.units.filter((u) => u.team === 'west').length).toBe(0);
	});

	it('Recycler (cg07_recycler) awards scrap gold whenever a friendly unit dies', () => {
		const success = sim.build('west', 'cg07_recycler', 25, 20);
		expect(success).toBe(true);

		sim.players.west.gold = 100;

		// Spawn a friendly unit
		const friendlyUnit = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'bottom',
			x: 1000,
			y: 580,
			hp: 100
		});

		// Spawn strong enemy that attacks and kills friendly unit
		const _killerEnemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'bottom',
			x: 1050,
			y: 580,
			hp: 1000,
			damage: 500,
			range: 100,
			attackCooldown: 0.1
		});

		// Advance simulation so enemy kills friendly unit
		for (let i = 0; i < 20; i++) {
			sim.step(0.05);
			if (friendlyUnit.state === 'DEAD') break;
		}

		expect(friendlyUnit.state).toBe('DEAD');
		// Recycler awards +4 gold on unit death: 100 + 4 = 104
		expect(sim.players.west.gold).toBe(104);
	});
});
