import { describe, it, expect } from 'vitest';
import { Simulation } from './simulation';
import { getBaseBuildingsForRace, GUARD_TOWERS } from './gameData';

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

				// Check that race tower, shop, forge, and treasure exist (11 reference + shop + forge = 13 total)
				expect(buildings.length).toBe(13);
				const raceTower = GUARD_TOWERS.find((t) => t.race === race);
				if (raceTower) {
					expect(specials.some((s) => s.id === raceTower.id)).toBe(true);
				}
				expect(specials.some((s) => s.id === 'cg10_shop')).toBe(true);
				expect(specials.some((s) => s.id === 'cg11_forge')).toBe(true);
				expect(specials.some((s) => s.id === 'h008')).toBe(true);
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
			// West Castle solid footprint is centered at (1600, 1200) [1480..1720, 1080..1320]
			// Start in upper courtyard (y=950), target in lower courtyard (y=1450)
			const path = sim.findWorkerPath('west', 1600, 950, 1600, 1450);
			expect(path.length).toBeGreaterThan(1);

			// The path must round the exterior of the castle
			const roundsCastle = path.some((pt) => pt.x <= 1480 || pt.x >= 1720);
			expect(roundsCastle).toBe(true);

			// None of the waypoints may be inside the castle footprint
			for (const pt of path) {
				const inCastle = pt.x >= 1485 && pt.x <= 1715 && pt.y >= 1085 && pt.y <= 1315;
				expect(inCastle).toBe(false);
			}
		});

		it('moves worker along the path without getting stuck or penetrating walls', () => {
			const sim = new Simulation();
			sim.isRunning = true;
			const worker = sim.players.west.worker;
			expect(worker).toBeDefined();
			if (!worker) return;

			worker.x = 1600;
			worker.y = 950;

			// Order worker to lower courtyard across the castle
			sim.moveWorker('west', 1600, 1450);
			expect(worker.path).toBeDefined();
			expect(worker.path!.length).toBeGreaterThan(1);

			// Step simulation for 8 seconds (160 ticks of 0.05s)
			for (let i = 0; i < 160; i++) {
				sim.step(0.05);
				// Verify worker never penetrates the castle
				const insideCastle =
					worker.x >= 1485 && worker.x <= 1715 && worker.y >= 1085 && worker.y <= 1315;
				expect(insideCastle).toBe(false);
			}

			// Worker must have made progress towards the lower courtyard (y > 980)
			expect(worker.y).toBeGreaterThan(980);
		});

		it('allows worker to construct building placed in corner from open perimeter side', () => {
			const sim = new Simulation();
			sim.isRunning = true;
			const worker = sim.players.west.worker;
			expect(worker).toBeDefined();
			if (!worker) return;

			// Placement on west island courtyard: tile (20, 15)
			sim.players.west.gold = 500;
			const bDef = getBaseBuildingsForRace('Люди')[0];
			const success = sim.build('west', bDef.id, 20, 15);
			expect(success).toBe(true);

			const building = sim.buildings.find((b) => b.tileX === 20 && b.tileY === 15);
			expect(building).toBeDefined();
			expect(building?.isUnderConstruction).toBe(true);

			// Worker target must be valid
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

			// Unit creation must start strictly at 0% (spawnTimer is within 1 tick of full cooldown)
			expect(building!.spawnCooldown - building!.spawnTimer).toBeLessThanOrEqual(0.1);
			const progressPct = (1 - (building?.spawnTimer || 0) / (building?.spawnCooldown || 1)) * 100;
			expect(progressPct).toBeLessThan(1);
		});

		it('ceases repair and warns when gold drops below 1', () => {
			const sim = new Simulation();
			sim.isRunning = true;
			const worker = sim.players.west.worker;
			expect(worker).toBeDefined();
			if (!worker) return;

			// Damage castle
			sim.castles.west.hp = 10000;
			worker.x = sim.castles.west.x + 160;
			worker.y = sim.castles.west.y;

			// Set gold to 0
			sim.players.west.gold = 0;
			const ordered = sim.repairBuilding('west', 'castle_west');
			expect(ordered).toBe(true);

			sim.step(0.05);

			// Worker must immediately halt repair because gold is 0
			expect(worker.isRepairing).toBe(false);
			expect(sim.floatingTexts.some((ft) => ft.text === 'Немає золота!')).toBe(true);
		});

		it('castle cannon targets enemies within 800px range covering siege engines', () => {
			const sim = new Simulation();
			sim.isRunning = true;

			// Enemy at distance 550 from west castle
			sim.spawnUnitDirectly({
				team: 'east',
				lane: 'top',
				x: sim.castles.west.x + 550,
				y: sim.castles.west.y,
				hp: 1000
			});

			sim.step(0.1);

			// Castle shot projectile must be fired towards the enemy
			const castleProjectile = sim.projectiles.find((p) => p.sourceUnitId === 'castle_west');
			expect(castleProjectile).toBeDefined();
		});

		it('worker can freely navigate across the eastern half of the island (x > 1600) without getting stuck', () => {
			const sim = new Simulation();
			sim.isRunning = true;
			const worker = sim.players.west.worker;
			expect(worker).toBeDefined();
			if (!worker) return;

			// Position worker at east door of castle (x = 1720, y = 1200)
			worker.x = 1720;
			worker.y = 1200;

			// Order worker to meadow at east side of the island (x = 2200, y = 1400)
			sim.moveWorker('west', 2200, 1400);
			expect(worker.path).toBeDefined();
			expect(worker.path!.length).toBeGreaterThan(0);

			// Step simulation
			for (let i = 0; i < 40; i++) {
				sim.step(0.05);
			}

			// Worker must advance eastwards towards 2200
			expect(worker.x).toBeGreaterThan(1750);
		});
	});
});
