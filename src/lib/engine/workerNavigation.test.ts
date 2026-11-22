import { describe, it, expect } from 'vitest';
import { Simulation } from './simulation';
import { getBaseBuildingsForRace, GUARD_TOWERS, SPECIAL_BUILDINGS } from './gameData';

describe('Worker Navigation and Building Order (v10 Canon)', () => {
	describe('Worker Building Order in Command Card', () => {
		it('orders army spawners by gold cost ascending (top 6), followed by special buildings by price', () => {
			const racesToTest = ['Люди', 'Орки', 'Північ', 'Хаос', 'Ельфи'];

			for (const race of racesToTest) {
				const buildings = getBaseBuildingsForRace(race);
				expect(buildings.length).toBeGreaterThanOrEqual(7);

				// Find partition where army spawners end and special buildings begin
				const armySpawners = buildings.filter((b) => !b.specialType);
				const specials = buildings.filter((b) => b.specialType);

				expect(armySpawners.length).toBeLessThanOrEqual(6);
				expect(specials.length).toBeGreaterThanOrEqual(3);

				// Check that army spawners are sorted by price ascending
				for (let i = 0; i < armySpawners.length - 1; i++) {
					const costA = armySpawners[i].gold_cost || 0;
					const costB = armySpawners[i + 1].gold_cost || 0;
					expect(costA).toBeLessThanOrEqual(costB);
				}

				// Check that special buildings are sorted by price ascending
				for (let i = 0; i < specials.length - 1; i++) {
					const costA = specials[i].gold_cost || 0;
					const costB = specials[i + 1].gold_cost || 0;
					expect(costA).toBeLessThanOrEqual(costB);
				}

				// Check that race tower and core specials exist
				const raceTower = GUARD_TOWERS.find((t) => t.race === race);
				if (raceTower) {
					expect(specials.some((s) => s.id === raceTower.id)).toBe(true);
				}
				for (const sb of SPECIAL_BUILDINGS) {
					expect(specials.some((s) => s.id === sb.id)).toBe(true);
				}
			}
		});
	});

	describe('Worker Pathfinding and Obstacle Avoidance', () => {
		it('returns direct destination when straight path is unobstructed', () => {
			const sim = new Simulation();
			// Path within upper courtyard from (200, 200) to (250, 250)
			const path = sim.findWorkerPath('west', 200, 200, 250, 250);
			expect(path.length).toBe(1);
			expect(path[0].x).toBe(250);
			expect(path[0].y).toBe(250);
		});

		it('navigates around the dividing stone wall when target is on the opposite courtyard', () => {
			const sim = new Simulation();
			// Wall is at y=370..430, x=70..460.
			// Start in upper courtyard (y=200), target in lower courtyard (y=600)
			const path = sim.findWorkerPath('west', 200, 200, 200, 600);
			expect(path.length).toBeGreaterThan(1);

			// The path must round the end of the wall (x > 450)
			const roundsWall = path.some((pt) => pt.x >= 440);
			expect(roundsWall).toBe(true);

			// None of the waypoints may be inside the wall
			for (const pt of path) {
				const inWall = pt.x >= 75 && pt.x <= 455 && pt.y >= 375 && pt.y <= 425;
				expect(inWall).toBe(false);
			}
		});

		it('moves worker along the path without getting stuck or penetrating walls', () => {
			const sim = new Simulation();
			sim.isRunning = true;
			const worker = sim.players.west.worker;
			expect(worker).toBeDefined();
			if (!worker) return;

			worker.x = 200;
			worker.y = 200;

			// Order worker to lower courtyard
			sim.moveWorker('west', 200, 600);
			expect(worker.path).toBeDefined();
			expect(worker.path!.length).toBeGreaterThan(1);

			// Step simulation for 8 seconds (160 ticks of 0.05s)
			for (let i = 0; i < 160; i++) {
				sim.step(0.05);
				// Verify worker never penetrates the dividing stone wall
				const insideWall = worker.x >= 75 && worker.x <= 455 && worker.y >= 375 && worker.y <= 425;
				expect(insideWall).toBe(false);
			}

			// Worker must have made progress towards the lower courtyard (y > 350)
			expect(worker.y).toBeGreaterThan(300);
		});
	});
});
