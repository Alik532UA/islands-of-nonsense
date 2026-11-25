import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation, TOP_LANE_Y } from './simulation';
import { CELL_SIZE } from './constants';
import type { Unit } from './types';

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
		// Build building at (25, 20)
		sim.decorations = [];
		sim.build('west', 'h003', 25, 20);
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
		sim.decorations = [];
		sim.build('west', 'h003', 25, 20);
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
		// Attempting to build on the road fan-out to castle (tileX = 73, tileY = 35)
		const canBuildOnRoad = sim.canBuild('west', 73, 35);
		expect(canBuildOnRoad).toBe(false);

		// Attempting to build outside base bounds
		const canBuildOutside = sim.canBuild('west', 120, 0);
		expect(canBuildOutside).toBe(false);

		// Attempting to build in the ocean water (tile 0, 0) must be rejected!
		const canBuildWater = sim.canBuild('west', 0, 0);
		expect(canBuildWater).toBe(false);

		// Valid slot (25, 20) in courtyard meadow must be buildable when no random decoration occupies it
		sim.decorations = [];
		const canBuildValid = sim.canBuild('west', 25, 20);
		expect(canBuildValid).toBe(true);
	});

	it('should repel ground units and workers away from natural decorations and block building on them', () => {
		expect(sim.decorations.length).toBeGreaterThan(0);
		const decor = sim.decorations[0];
		expect(decor).toBeDefined();

		// Units must be pushed outside the decoration obstacle radius
		const resolved = sim.resolveGroundObstacles(decor.x, decor.y, 14);
		const dist = Math.hypot(resolved.x - decor.x, resolved.y - decor.y);
		expect(dist).toBeGreaterThanOrEqual(decor.radius + 13.9);

		// Workers must be blocked by decorations
		const blocked = sim.workerSystem.isPointBlockedForWorker(decor.team, decor.x, decor.y);
		expect(blocked).toBe(true);
	});

	it('should steer ground units around obstacles when path is blocked instead of getting stuck', () => {
		// Spawn a building directly in front of a ground unit
		const bldX = 1000;
		const bldY = 600;
		sim.buildings.push({
			defId: 'h000',
			instanceId: 'test_obstacle_bld',
			name: 'Бараки',
			team: 'east',
			tileX: 0,
			tileY: 0,
			goldCost: 100,
			spawnUnitId: 'u000',
			lane: 'mid',
			upgradeFrom: null,
			race: 'Люди',
			x: bldX,
			y: bldY,
			hp: 1000,
			maxHp: 1000,
			armor: 2,
			armorType: 'large',
			isUnderConstruction: false,
			spawnTimer: 10,
			spawnCooldown: 10
		});

		// Unit placed 50px directly to the west of the building, aiming towards east
		const unit: Unit = {
			defId: 'u000',
			instanceId: 'test_walker',
			team: 'west',
			name: 'Мечник',
			x: bldX - 50,
			y: bldY + 32, // aiming right at the center of the building
			prevX: bldX - 50,
			prevY: bldY + 32,
			hp: 500,
			maxHp: 500,
			size: 14,
			speed: 250,
			attackCooldown: 1.2,
			cooldownTimer: 0,
			damageMin: 30,
			damageMax: 35,
			damageBonusPct: 0,
			armorBonus: 0,
			attackType: 'normal',
			range: 50,
			armor: 2,
			armorType: 'medium',
			state: 'WALKING',
			lane: 'mid',
			flying: false,
			currentTargetId: null,
			targetX: bldX + 200,
			targetY: bldY + 32
		};
		sim.units.push(unit);

		const targetX = bldX + 200;
		const targetY = bldY + 32;

		// Move unit forward over several simulation steps
		for (let step = 0; step < 20; step++) {
			sim.combatSystem.moveUnitTowards(unit, targetX, targetY, unit.speed, 0.05);
			const resolved = sim.workerSystem.resolveGroundObstacles(unit.x, unit.y, unit.size);
			unit.x = resolved.x;
			unit.y = resolved.y;
		}

		// Unit must have made significant forward progress towards targetX and steered off y
		expect(unit.x).toBeGreaterThan(bldX - 50);
		// Must not be stuck inside building bounding box [bldX, bldX + CELL_SIZE] x [bldY, bldY + CELL_SIZE]
		const insideBuilding =
			unit.x >= bldX - 10 &&
			unit.x <= bldX + CELL_SIZE + 10 &&
			unit.y >= bldY - 10 &&
			unit.y <= bldY + CELL_SIZE + 10;
		expect(insideBuilding).toBe(false);
	});
});
