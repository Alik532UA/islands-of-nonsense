import { describe, it, expect } from 'vitest';
import { Simulation } from './simulation';
import { getBaseBuildingsForRace, GUARD_TOWERS } from './gameData';
import { logService } from '../services/logService.svelte';

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

				// Check that race tower, shop, forge, commander hall, and treasure exist (11 reference + shop + forge + commander hall = 14 total)
				expect(buildings.length).toBe(14);
				const raceTower = GUARD_TOWERS.find((t) => t.race === race);
				if (raceTower) {
					expect(specials.some((s) => s.id === raceTower.id)).toBe(true);
				}
				expect(specials.some((s) => s.id === 'cg10_shop')).toBe(true);
				expect(specials.some((s) => s.id === 'cg11_forge')).toBe(true);
				expect(specials.some((s) => s.id === 'cg12_commander')).toBe(true);
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
			sim.decorations = [];
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

			// Step simulation until construction completes (3.5s + movement time at 170 px/s)
			for (let i = 0; i < 300; i++) {
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

		it('manual long castle cannon targets enemies at 550px when fired (no auto-fire)', () => {
			const sim = new Simulation();
			sim.isRunning = true;

			// Enemy at distance 550 from west castle (outside 500px short range, inside 1500px long range)
			sim.spawnUnitDirectly({
				team: 'east',
				lane: 'top',
				x: sim.castles.west.x + 550,
				y: sim.castles.west.y,
				hp: 1000
			});

			sim.step(0.1);
			expect(sim.projectiles.some((p) => p.sourceUnitId === 'castle_west')).toBe(false);

			const fired = sim.fireCastleCannon('west', 'long', sim.players.west);
			expect(fired.fired).toBe(true);
			expect(fired.hitEnemy).toBe(true);

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

		it('completes far-west rear courtyard building (tile 7,34 at 288,1152) around West Castle and obstacles', () => {
			logService.clear();
			const sim = new Simulation({
				botDifficulty: 15,
				startGold: 2000,
				westRace: 'Ельфи'
			});
			sim.decorations = [];
			sim.isRunning = true;
			const worker = sim.players.west.worker!;

			// Build at exact tile (7, 34) => world (288, 1152) behind West Castle (1600, 1200)
			const ordered = sim.build('west', 'h00B', 7, 34);
			expect(ordered).toBe(true);
			const targetBld = sim.buildings.find((b) => b.tileX === 7 && b.tileY === 34);
			expect(targetBld).toBeDefined();

			// Walk ~1500px around castle at 170 px/s (~9s) + 3.5s build = ~12.5s (350 steps = 17.5s)
			for (let i = 0; i < 350; i++) {
				sim.step(0.05);
				if (!targetBld?.isUnderConstruction) break;
			}

			expect(targetBld?.isUnderConstruction).toBe(false);
			expect(targetBld?.hp).toBe(targetBld?.maxHp);

			// Diagnostic report captures full lifecycle history and worker/reachability diagnostics
			const report = logService.getBuildingReport(targetBld!, sim);
			expect(report).toContain('OWNER:');
			expect(report).toContain('--- OWNER WORKER STATE ---');
			expect(report).toContain('--- CONSTRUCTION REACHABILITY & OBSTACLES ---');
			expect(report).toContain('Building placed and assigned to worker');
			expect(report).toContain('Building completed');
			expect(worker).toBeDefined();
		});

		it('completes construction via outer perimeter spot when inner pad=16 spots are obstructed and logs interruptions', () => {
			logService.clear();
			const sim = new Simulation({
				botDifficulty: 0,
				startGold: 2000,
				westRace: 'Ельфи'
			});
			sim.isRunning = true;
			sim.decorations = [];

			// Place building at tile (15, 25) => world (544, 864)
			const ok = sim.build('west', 'h00B', 15, 25);
			expect(ok).toBe(true);
			const bld = sim.buildings.find((b) => b.tileX === 15 && b.tileY === 25)!;

			// Block all pad=16 perimeter sides with decorations (r=18) so pad=16 is blocked,
			// while outer pad=26/36 remains open and within construction range
			sim.decorations.push(
				{
					id: 'd1',
					x: bld.x + 64 + 16,
					y: bld.y + 32,
					radius: 18,
					type: 'crystal',
					team: 'west',
					variant: 0
				},
				{
					id: 'd2',
					x: bld.x - 16,
					y: bld.y + 32,
					radius: 18,
					type: 'crystal',
					team: 'west',
					variant: 0
				},
				{
					id: 'd3',
					x: bld.x + 32,
					y: bld.y - 16,
					radius: 18,
					type: 'crystal',
					team: 'west',
					variant: 0
				},
				{
					id: 'd4',
					x: bld.x + 32,
					y: bld.y + 64 + 16,
					radius: 18,
					type: 'crystal',
					team: 'west',
					variant: 0
				}
			);

			// Advance until worker arrives and begins construction (buildProgress > 0)
			for (let i = 0; i < 240; i++) {
				sim.step(0.05);
				if ((bld.buildProgress || 0) > 0.1) break;
			}
			expect(bld.buildProgress).toBeGreaterThan(0);

			// Interrupt briefly via moveWorker, then step and allow auto-resume + completion
			sim.moveWorker('west', bld.x + 160, bld.y + 120);
			for (let i = 0; i < 240; i++) {
				sim.step(0.05);
				if (!bld.isUnderConstruction) break;
			}

			expect(bld.isUnderConstruction).toBe(false);
			const report = logService.getBuildingReport(bld, sim);
			expect(report).toContain('Construction target interrupted by moveWorker');
			expect(report).toContain('Worker assigned/resumed construction');
			expect(report).toContain('Building completed');
		});
	});
});
