import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation, TOP_LANE_Y } from './simulation';

describe('Point 10: Crowd Physics & Unit Separation (Boids Collision Repulsion)', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 500 });
	});

	it('should repel two overlapping ground units to prevent single-point stacking', () => {
		// Spawn two ground units at identical coordinates on top lane
		const u1 = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 300,
			y: TOP_LANE_Y,
			hp: 500,
			speed: 0
		});

		const u2 = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 300,
			y: TOP_LANE_Y,
			hp: 500,
			speed: 0
		});

		const initialDist = Math.hypot(u1.x - u2.x, u1.y - u2.y);
		expect(initialDist).toBe(0);

		// Step simulation so crowd separation takes effect
		for (let i = 0; i < 10; i++) {
			sim.step(0.05);
		}

		const separatedDist = Math.hypot(u1.x - u2.x, u1.y - u2.y);
		// Units should have pushed each other apart!
		expect(separatedDist).toBeGreaterThan(5);
	});

	it('should keep repelled units strictly within lane corridor bounds (TOP_LANE_Y +- 45)', () => {
		// Spawn 4 units crowded together
		const units = [];
		for (let i = 0; i < 4; i++) {
			units.push(
				sim.spawnUnitDirectly({
					team: 'west',
					lane: 'top',
					x: 300,
					y: TOP_LANE_Y,
					hp: 500,
					speed: 0
				})
			);
		}

		for (let i = 0; i < 20; i++) {
			sim.step(0.05);
		}

		for (const u of units) {
			expect(u.y).toBeGreaterThanOrEqual(TOP_LANE_Y - 45);
			expect(u.y).toBeLessThanOrEqual(TOP_LANE_Y + 45);
		}
	});

	it('should ignore flying units during ground crowd separation', () => {
		const groundUnit = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 300,
			y: TOP_LANE_Y,
			hp: 500,
			speed: 0
		});

		const flyingUnit = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 300,
			y: TOP_LANE_Y,
			hp: 500,
			speed: 0
		});
		flyingUnit.flying = true;

		// Step simulation
		for (let i = 0; i < 10; i++) {
			sim.step(0.05);
		}

		// Since only 1 ground unit and 1 flying unit are present, ground unit should not be pushed by air
		expect(groundUnit.x).toBe(300);
		expect(groundUnit.y).toBe(TOP_LANE_Y);
	});
});
