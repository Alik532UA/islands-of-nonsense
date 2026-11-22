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

	it('should prevent ground units and workers from walking through solid 2x2 buildings', () => {
		// Build building at (0, 0)
		sim.build('west', 'h003', 0, 0);
		const b = sim.buildings[0];
		expect(b).toBeDefined();
		expect(b.width).toBe(2);
		expect(b.height).toBe(2);

		// Place a ground unit directly in the center of the building
		const centerX = b.x + 27.5;
		const centerY = b.y + 27.5;
		const res = sim.resolveGroundObstacles(centerX, centerY, 14);

		// Position must be pushed outside the solid footprint!
		const insideX = res.x >= b.x && res.x <= b.x + 55;
		const insideY = res.y >= b.y && res.y <= b.y + 55;
		expect(insideX && insideY).toBe(false);

		// Worker must also be resolved outside the building footprint
		const workerRes = sim.resolveGroundObstacles(centerX, centerY, 14);
		const workerInside =
			workerRes.x > b.x && workerRes.x < b.x + 55 && workerRes.y > b.y && workerRes.y < b.y + 55;
		expect(workerInside).toBe(false);
	});

	it('should allow flying units to glide over buildings without obstacle collision', () => {
		sim.build('west', 'h003', 0, 0);
		const b = sim.buildings[0];

		// Spawn flying unit right on the building
		const flyer = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: b.x + 20,
			y: b.y + 20,
			hp: 400,
			speed: 100
		});
		flyer.flying = true;

		// Step simulation: flying unit should fly smoothly without being blocked
		sim.step(0.05);
		expect(flyer.flying).toBe(true);
		// Flyer moves forward in +X direction without obstacle deflection
		expect(flyer.x).toBeGreaterThan(b.x + 20);
	});

	it('should reject building on the road or dividing walls via canBuild', () => {
		// Attempting to build on the road fan-out to castle (tileY = 28, y = 1136)
		const canBuildOnRoad = sim.canBuild('west', 0, 28);
		expect(canBuildOnRoad).toBe(false);

		// Attempting to build outside base bounds
		const canBuildOutside = sim.canBuild('west', 50, 0);
		expect(canBuildOutside).toBe(false);

		// Valid slot (0, 0) in courtyard must be buildable
		const canBuildValid = sim.canBuild('west', 0, 0);
		expect(canBuildValid).toBe(true);
	});
});
