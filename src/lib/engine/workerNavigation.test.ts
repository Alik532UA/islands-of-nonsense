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

		it('navigates around the solid castle structure when target is on the opposite courtyard', () => {
			const sim = new Simulation();
			// West Castle solid footprint is at x=80..320, y=1060..1340.
			// Start in upper courtyard (y=900), target in lower courtyard (y=1500)
			const path = sim.findWorkerPath('west', 200, 900, 200, 1500);
			expect(path.length).toBeGreaterThan(1);

			// The path must round the exterior of the castle (x > 320)
			const roundsCastle = path.some((pt) => pt.x >= 320);
			expect(roundsCastle).toBe(true);

			// None of the waypoints may be inside the castle footprint
			for (const pt of path) {
				const inCastle = pt.x >= 85 && pt.x <= 315 && pt.y >= 1065 && pt.y <= 1335;
				expect(inCastle).toBe(false);
			}
		});

		it('moves worker along the path without getting stuck or penetrating walls', () => {
			const sim = new Simulation();
			sim.isRunning = true;
			const worker = sim.players.west.worker;
			expect(worker).toBeDefined();
			if (!worker) return;

			worker.x = 200;
			worker.y = 900;

			// Order worker to lower courtyard across the castle
			sim.moveWorker('west', 200, 1500);
			expect(worker.path).toBeDefined();
			expect(worker.path!.length).toBeGreaterThan(1);

			// Step simulation for 8 seconds (160 ticks of 0.05s)
			for (let i = 0; i < 160; i++) {
				sim.step(0.05);
				// Verify worker never penetrates the castle
				const insideCastle =
					worker.x >= 85 && worker.x <= 315 && worker.y >= 1065 && worker.y <= 1335;
				expect(insideCastle).toBe(false);
			}

			// Worker must have made progress towards the lower courtyard (y > 950)
			expect(worker.y).toBeGreaterThan(950);
		});

		it('allows worker to construct building placed in corner from open perimeter side', () => {
			const sim = new Simulation();
			sim.isRunning = true;
			const worker = sim.players.west.worker;
			expect(worker).toBeDefined();
			if (!worker) return;

			// Corner placement: tile (0, 69) -> world (64, 2272) is bottom-left corner of courtyard
			// Left side (x < 60) and bottom side (y > 2340) are blocked by walls
			sim.players.west.gold = 500;
			const bDef = getBaseBuildingsForRace('Люди')[0];
			const success = sim.build('west', bDef.id, 0, 69);
			expect(success).toBe(true);

			const building = sim.buildings.find((b) => b.x === 64 && b.y === 2272);
			expect(building).toBeDefined();
			expect(building?.isUnderConstruction).toBe(true);

			// Worker target must NOT be in the wall (x >= 60, y <= 2340)
			expect(worker.targetX).toBeGreaterThanOrEqual(60);
			expect(worker.targetY).toBeLessThanOrEqual(2340);

			// Step simulation until construction completes (3.5s + movement time)
			for (let i = 0; i < 150; i++) {
				sim.step(0.05);
				if (!building?.isUnderConstruction) break;
			}

			// Building must have successfully finished construction
			expect(building?.isUnderConstruction).toBe(false);
			expect(building?.hp).toBe(building?.maxHp);
		});
	});
});
