import { describe, it, expect } from 'vitest';
import { Simulation } from './simulation';
import type { Unit, ArmorType } from './types';
import {
	TOP_LANE_Y,
	MID_LANE_Y,
	BOTTOM_LANE_Y,
	BRIDGE_SPAN_MIN_X,
	BRIDGE_SPAN_MAX_X,
	WEST_ROAD_MERGE_X,
	EAST_ROAD_MERGE_X
} from './constants';

describe('Mob Castle Assault & Obstacle Navigation without Teleportation', () => {
	it('units on enemy island navigate directly towards enemy castle (not just horizontal lane line) and attack castle', () => {
		const sim = new Simulation({ botDifficulty: 10, startGold: 500 });
		const eastCastle = sim.castles.east;
		expect(eastCastle.x).toBe(5600);
		expect(eastCastle.y).toBe(1200);

		const initCastleHp = eastCastle.hp;

		// Spawn a West attacker on the East island approaching from Top Lane (y = 660)
		const attacker: Unit = {
			defId: 'u_assault',
			instanceId: 'assault_1',
			team: 'west',
			name: 'Штурмовик',
			x: 4800,
			y: TOP_LANE_Y, // 660
			prevX: 4800,
			prevY: TOP_LANE_Y,
			hp: 600,
			maxHp: 600,
			size: 16,
			speed: 300,
			attackCooldown: 1.0,
			cooldownTimer: 0,
			damageMin: 50,
			damageMax: 60,
			damageBonusPct: 0,
			armorBonus: 0,
			attackType: 'chaos',
			range: 90,
			armor: 3,
			armorType: 'large' as ArmorType,
			state: 'WALKING',
			lane: 'top',
			flying: false,
			currentTargetId: null,
			targetX: eastCastle.x,
			targetY: eastCastle.y
		};
		sim.units.push(attacker);

		// Advance simulation steps
		for (let s = 0; s < 60; s++) {
			sim.step(0.1);
			if (attacker.state === 'ATTACKING') break;
		}

		// Attacker must have moved down from TOP_LANE_Y (660) towards castle Y (1200)
		expect(attacker.y).toBeGreaterThan(TOP_LANE_Y + 150);
		expect(attacker.x).toBeGreaterThan(4800);

		// Run more steps so attacker attacks the castle
		for (let s = 0; s < 50; s++) {
			sim.step(0.1);
			if (eastCastle.hp < initCastleHp) break;
		}

		expect(attacker.state).toBe('ATTACKING');
		expect(attacker.targetBuildingId).toBe('castle_east');
		expect(eastCastle.hp).toBeLessThan(initCastleHp);
	});

	it('mid-lane units are never teleported or clamped to bottom lane', () => {
		const sim = new Simulation({ botDifficulty: 10, startGold: 500 });
		sim.brokenBridge = 'bottom';

		const midUnit: Unit = {
			defId: 'u_mid',
			instanceId: 'mid_walker',
			team: 'west',
			name: 'Піхотинець',
			x: 2000,
			y: MID_LANE_Y, // 1200
			prevX: 2000,
			prevY: MID_LANE_Y,
			hp: 400,
			maxHp: 400,
			size: 16,
			speed: 250,
			attackCooldown: 1.0,
			cooldownTimer: 0,
			damageMin: 20,
			damageMax: 25,
			damageBonusPct: 0,
			armorBonus: 0,
			attackType: 'normal',
			range: 90,
			armor: 2,
			armorType: 'medium' as ArmorType,
			state: 'WALKING',
			lane: 'mid',
			flying: false,
			currentTargetId: null,
			targetX: 4000,
			targetY: MID_LANE_Y
		};
		sim.units.push(midUnit);

		for (let s = 0; s < 30; s++) {
			sim.step(0.05);
			// Must stay around MID_LANE_Y (1200), never jumped to BOTTOM_LANE_Y (1740)
			expect(Math.abs(midUnit.y - MID_LANE_Y)).toBeLessThan(50);
		}
	});

	it('mobs smoothly navigate around buildings using A* waypoints without teleporting or jumping', () => {
		const sim = new Simulation({ botDifficulty: 10, startGold: 500 });

		// Place a building directly in the path of a unit
		const bldX = 2200;
		const bldY = MID_LANE_Y - 32;
		sim.buildings.push({
			instanceId: 'blocker_1',
			defId: 'h000',
			name: 'Бараки',
			team: 'west',
			tileX: 0,
			tileY: 0,
			goldCost: 100,
			spawnUnitId: 'u000',
			lane: 'mid',
			upgradeFrom: null,
			race: 'Люди',
			x: bldX,
			y: bldY,
			hp: 1200,
			maxHp: 1200,
			armor: 5,
			armorType: 'fort' as ArmorType,
			isUnderConstruction: false,
			spawnTimer: 999,
			spawnCooldown: 999
		});

		const walker: Unit = {
			defId: 'u_dodge',
			instanceId: 'dodge_walker',
			team: 'west',
			name: 'Розвідник',
			x: bldX - 80,
			y: MID_LANE_Y,
			prevX: bldX - 80,
			prevY: MID_LANE_Y,
			hp: 300,
			maxHp: 300,
			size: 16,
			speed: 250,
			attackCooldown: 1.0,
			cooldownTimer: 0,
			damageMin: 15,
			damageMax: 20,
			damageBonusPct: 0,
			armorBonus: 0,
			attackType: 'normal',
			range: 90,
			armor: 1,
			armorType: 'small' as ArmorType,
			state: 'WALKING',
			lane: 'mid',
			flying: false,
			currentTargetId: null,
			targetX: bldX + 250,
			targetY: MID_LANE_Y
		};
		sim.units.push(walker);

		let maxStepJump = 0;
		for (let s = 0; s < 50; s++) {
			const prevX = walker.x;
			const prevY = walker.y;
			sim.step(0.05);
			const jump = Math.hypot(walker.x - prevX, walker.y - prevY);
			maxStepJump = Math.max(maxStepJump, jump);
		}

		// Unit must advance past the building
		expect(walker.x).toBeGreaterThan(bldX + 64);
		// Single step jump must never exceed reasonable movement distance (speed * dt + minor push < 25px)
		expect(maxStepJump).toBeLessThan(25);
	});

	it('ground units detour around broken bridge and never step into water chasm', () => {
		const sim = new Simulation({ botDifficulty: 10, startGold: 500 });
		sim.brokenBridge = 'bottom';

		const bottomUnit: Unit = {
			defId: 'u_bottom_detour',
			instanceId: 'detour_walker',
			team: 'west',
			name: 'Піхотинець Низ',
			x: 2800,
			y: 1740, // BOTTOM_LANE_Y
			prevX: 2800,
			prevY: 1740,
			hp: 500,
			maxHp: 500,
			size: 16,
			speed: 300,
			attackCooldown: 1.0,
			cooldownTimer: 0,
			damageMin: 30,
			damageMax: 40,
			damageBonusPct: 0,
			armorBonus: 0,
			attackType: 'normal',
			range: 80,
			armor: 2,
			armorType: 'medium' as ArmorType,
			state: 'WALKING',
			lane: 'bottom',
			flying: false,
			currentTargetId: null,
			targetX: 5600,
			targetY: 1200
		};
		sim.units.push(bottomUnit);

		let steppedInChasm = false;
		for (let s = 0; s < 120; s++) {
			sim.step(0.1);
			// Check if unit is in the bottom broken bridge chasm
			if (bottomUnit.x >= 3380 && bottomUnit.x <= 3820 && Math.abs(bottomUnit.y - 1740) < 80) {
				steppedInChasm = true;
				break;
			}
		}

		// Must NOT have walked into the water chasm of the broken bridge
		expect(steppedInChasm).toBe(false);
	});

	it('unit with waypoints finishes all waypoints and does not freeze before enemy castle', () => {
		const sim = new Simulation({ botDifficulty: 10, startGold: 500 });
		const eastCastle = sim.castles.east;

		// Unit with an active path ending at x = 4700 on the top road
		const unit: Unit = {
			defId: 'u_path_finisher',
			instanceId: 'path_finisher_1',
			team: 'west',
			name: 'Штурмовик Топ',
			x: 4600,
			y: TOP_LANE_Y,
			prevX: 4600,
			prevY: TOP_LANE_Y,
			hp: 500,
			maxHp: 500,
			size: 16,
			speed: 260,
			attackCooldown: 1.0,
			cooldownTimer: 0,
			damageMin: 35,
			damageMax: 45,
			damageBonusPct: 0,
			armorBonus: 0,
			attackType: 'chaos',
			range: 90,
			armor: 3,
			armorType: 'large' as ArmorType,
			state: 'WALKING',
			lane: 'top',
			flying: false,
			currentTargetId: null,
			targetX: eastCastle.x,
			targetY: eastCastle.y,
			path: [
				{ x: 4650, y: TOP_LANE_Y },
				{ x: 4700, y: TOP_LANE_Y }
			],
			pathTargetX: eastCastle.x,
			pathTargetY: eastCastle.y
		};
		sim.units.push(unit);

		// Advance simulation: unit should exhaust the waypoints and continue advancing towards castle (x > 5000)
		for (let s = 0; s < 60; s++) {
			sim.step(0.1);
		}

		// Unit must NOT be frozen at x = 4700
		expect(unit.x).toBeGreaterThan(5000);
		expect(unit.state).toMatch(/WALKING|ATTACKING/);
	});

	it('ground units never walk into broken bridge water chasm and resolveGroundObstacles pushes them out', () => {
		const sim = new Simulation({ botDifficulty: 10, startGold: 500 });
		sim.brokenBridge = 'bottom';

		// Test resolveGroundObstacles with a point inside the broken bottom bridge water chasm (x = 3600, y = 1740)
		const resolved = sim.workerSystem.resolveGroundObstacles(3600, 1740, 16);
		// Must not stay in the chasm (chasm is 3380..3820, y = 1740 +- 80)
		const inChasm = resolved.x >= 3380 && resolved.x <= 3820 && Math.abs(resolved.y - 1740) <= 80;
		expect(inChasm).toBe(false);
	});

	it('units approaching the bridge move continuously without teleportation or snapping onto the bridge deck', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 500 });
		sim.brokenBridge = null;

		const unit: Unit = {
			defId: 'u_smooth',
			instanceId: 'smooth_walker',
			team: 'west',
			name: 'Вартовий',
			x: 3000,
			y: TOP_LANE_Y + 40,
			prevX: 3000,
			prevY: TOP_LANE_Y + 40,
			hp: 400,
			maxHp: 400,
			size: 16,
			speed: 200,
			attackCooldown: 1.0,
			cooldownTimer: 0,
			damageMin: 20,
			damageMax: 25,
			damageBonusPct: 0,
			armorBonus: 0,
			attackType: 'normal',
			range: 90,
			armor: 2,
			armorType: 'medium' as ArmorType,
			state: 'WALKING',
			lane: 'top',
			flying: false,
			currentTargetId: null,
			targetX: 4000,
			targetY: TOP_LANE_Y
		};
		sim.units.push(unit);

		let maxStepDistance = 0;
		for (let s = 0; s < 50; s++) {
			const px = unit.x;
			const py = unit.y;
			sim.step(0.05);
			const stepDist = Math.hypot(unit.x - px, unit.y - py);
			if (stepDist > maxStepDistance) maxStepDistance = stepDist;
		}

		// Unit should have advanced across the bridge entrance (~3060)
		expect(unit.x).toBeGreaterThan(BRIDGE_SPAN_MIN_X);
		// Movement must be smooth and continuous: maximum single step cannot exceed normal travel speed (200 * 0.05 = 10 px)
		expect(maxStepDistance).toBeLessThanOrEqual(25);
		// Unit is safely on the bridge
		expect(Math.abs(unit.y - TOP_LANE_Y)).toBeLessThanOrEqual(62);
	});

	it('units behind friendly castle (e.g. at x=1464, y=1219) navigate around the castle and reach highway/bridge without getting stuck', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 500 });
		sim.brokenBridge = 'bottom'; // Force bottom lane units to cross via mid bridge (y=1200)

		const unit: Unit = {
			defId: 'hfoo',
			instanceId: 'unit_test_520',
			team: 'west',
			name: 'Піхотинець',
			x: 1464,
			y: 1219,
			prevX: 1464,
			prevY: 1219,
			hp: 420,
			maxHp: 420,
			size: 16,
			speed: 270,
			attackCooldown: 1.0,
			cooldownTimer: 0,
			damageMin: 20,
			damageMax: 25,
			damageBonusPct: 0,
			armorBonus: 0,
			attackType: 'normal',
			range: 90,
			armor: 2,
			armorType: 'medium' as ArmorType,
			state: 'WALKING',
			lane: 'bottom',
			flying: false,
			currentTargetId: null,
			targetX: 7000,
			targetY: 1740
		};
		sim.units.push(unit);

		// Step simulation for 6 seconds (120 ticks of 0.05s)
		for (let s = 0; s < 120; s++) {
			sim.step(0.05);
		}

		// The unit must NOT stay stuck at x=1464
		expect(unit.x).toBeGreaterThan(1800);
		// Stuck timer must remain clean
		expect(unit.stuckTimer || 0).toBeLessThan(0.6);
	});

	it('units successfully navigate and flow through a 1-tile gap (32px corridor) between buildings without getting stuck', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 500 });
		sim.brokenBridge = null;

		// Place two buildings separated by an exact 1-tile gap (32px)
		// Building 1: x=600, y=500 (occupies 600..664, 500..564)
		// Building 2: x=696, y=500 (occupies 696..760, 500..564)
		// 1-tile gap: x=664..696 (32px wide corridor, centerline x=680)
		sim.buildings.push({
			instanceId: 'gap_bld_1',
			defId: 'h000',
			name: 'Barracks 1',
			team: 'west',
			race: 'Люди',
			upgradeFrom: null,
			x: 600,
			y: 500,
			tileX: 13,
			tileY: 13,
			lane: 'top',
			hp: 1000,
			maxHp: 1000,
			armor: 5,
			armorType: 'fort',
			goldCost: 200,
			spawnTimer: 9999,
			spawnCooldown: 20,
			spawnUnitId: 'u_footman'
		});
		sim.buildings.push({
			instanceId: 'gap_bld_2',
			defId: 'h000',
			name: 'Barracks 2',
			team: 'west',
			race: 'Люди',
			upgradeFrom: null,
			x: 696,
			y: 500,
			tileX: 16,
			tileY: 13,
			lane: 'top',
			hp: 1000,
			maxHp: 1000,
			armor: 5,
			armorType: 'fort',
			goldCost: 200,
			spawnTimer: 9999,
			spawnCooldown: 20,
			spawnUnitId: 'u_footman'
		});

		// Spawn a cluster of 5 units queueing before the 1-tile gap
		for (let i = 0; i < 5; i++) {
			sim.units.push({
				defId: 'hfoo',
				instanceId: `gap_unit_${i}`,
				team: 'west',
				name: 'Піхотинець',
				x: 680,
				y: 400 - i * 20,
				prevX: 680,
				prevY: 400 - i * 20,
				hp: 420,
				maxHp: 420,
				size: 16,
				speed: 250,
				attackCooldown: 1.0,
				cooldownTimer: 0,
				damageMin: 20,
				damageMax: 25,
				damageBonusPct: 0,
				armorBonus: 0,
				attackType: 'normal',
				range: 90,
				armor: 2,
				armorType: 'medium' as ArmorType,
				state: 'WALKING',
				lane: 'top',
				flying: false,
				currentTargetId: null,
				targetX: 680,
				targetY: 800
			});
		}

		// Step simulation for 6 seconds (120 ticks of 0.05s) to let entire single-file queue pass through
		for (let s = 0; s < 120; s++) {
			sim.step(0.05);
		}

		// All 5 units must have passed through the 1-tile gap (y > 564) without getting stuck
		for (let i = 0; i < 5; i++) {
			const u = sim.units.find((unit) => unit.instanceId === `gap_unit_${i}`);
			expect(u).toBeDefined();
			if (!u) continue;
			expect(u.y).toBeGreaterThan(564); // Successfully exited the 1-tile corridor
			expect(u.stuckTimer || 0).toBeLessThan(0.6); // Not stuck
		}
	});

	it('units in a pocket surrounded by buildings with 1-tile (32px) gaps can exit without getting trapped', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 500 });
		// Surround pocket around (x: 432, y: 732)
		// 1-tile (32px) gaps:
		// Col 0: 304, Col 1: 400, Col 2: 496
		// Row 0: 604, Row 1: 700, Row 2: 796
		const bPositions = [
			{ x: 304, y: 604 },
			{ x: 400, y: 604 },
			{ x: 496, y: 604 },
			{ x: 304, y: 700 },
			{ x: 496, y: 700 },
			{ x: 304, y: 796 },
			{ x: 400, y: 796 },
			{ x: 496, y: 796 }
		];
		bPositions.forEach((pos, idx) => {
			sim.buildings.push({
				defId: 'h_barracks',
				instanceId: `surround_bld_${idx}`,
				team: 'west',
				name: 'Казарми',
				race: 'Люди',
				x: pos.x,
				y: pos.y,
				hp: 1000,
				maxHp: 1000,
				armor: 5,
				armorType: 'fortified' as ArmorType,
				tileX: Math.round((pos.x - 64) / 32),
				tileY: Math.round((pos.y - 64) / 32),
				lane: 'mid',
				goldCost: 100,
				spawnCooldown: 20,
				spawnTimer: 10,
				upgradeFrom: null,
				spawnUnitId: 'u_footman'
			});
		});

		// Place 15 units inside the center empty lot (x: 432, y: 732)
		for (let i = 0; i < 15; i++) {
			const unit: Unit = {
				defId: 'hfoo',
				instanceId: `trapped_unit_${i}`,
				team: 'west',
				name: 'Піхотинець',
				x: 420 + (i % 4) * 6,
				y: 720 + Math.floor(i / 4) * 6,
				prevX: 420 + (i % 4) * 6,
				prevY: 720 + Math.floor(i / 4) * 6,
				hp: 420,
				maxHp: 420,
				size: 16,
				speed: 250,
				attackCooldown: 1.0,
				cooldownTimer: 0,
				damageMin: 20,
				damageMax: 25,
				damageBonusPct: 0,
				armorBonus: 0,
				attackType: 'normal',
				range: 90,
				armor: 2,
				armorType: 'medium' as ArmorType,
				state: 'WALKING',
				lane: 'bottom',
				flying: false,
				currentTargetId: null,
				targetX: 2500,
				targetY: 1740
			};
			sim.units.push(unit);
		}

		for (let s = 0; s < 200; s++) {
			sim.step(0.05);
		}

		const exitedCount = sim.units.filter((u) => u.x > 600).length;
		expect(exitedCount).toBe(15);
	});

	it('units exiting bottom bridge on East island (x=4160, y=1740) march continuously along highway past x=4900 and reach East Castle without deadlock at y=1668', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 500 });

		// Footman spawned right at bridge exit on East Island (Bottom Lane)
		const unit: Unit = {
			defId: 'hfoo',
			instanceId: 'unit_exit_bottom',
			team: 'west',
			name: 'Піхотинець',
			x: BRIDGE_SPAN_MAX_X + 25, // 4165
			y: BOTTOM_LANE_Y, // 1740
			prevX: BRIDGE_SPAN_MAX_X + 25,
			prevY: BOTTOM_LANE_Y,
			hp: 420,
			maxHp: 420,
			size: 16,
			speed: 270,
			attackCooldown: 1.0,
			cooldownTimer: 0,
			damageMin: 20,
			damageMax: 25,
			damageBonusPct: 0,
			armorBonus: 0,
			attackType: 'normal',
			range: 90,
			armor: 2,
			armorType: 'medium' as ArmorType,
			state: 'WALKING',
			lane: 'bottom',
			flying: false,
			currentTargetId: null,
			targetX: 7000,
			targetY: BOTTOM_LANE_Y
		};
		sim.units.push(unit);

		// Step simulation for 8 seconds (160 ticks of 0.05s)
		for (let s = 0; s < 160; s++) {
			sim.step(0.05);
		}

		// Unit must NOT be stuck between bridge exit and merge point (x=4500..4700 at y=1668)
		expect(unit.x).toBeGreaterThan(EAST_ROAD_MERGE_X);
		// Unit should have transitioned from BOTTOM_LANE_Y (1740) towards Castle center (y=1200)
		expect(unit.y).toBeLessThan(BOTTOM_LANE_Y - 50);
		// Unit must never trigger stuckTimer >= 0.6s
		expect(unit.stuckTimer || 0).toBeLessThan(0.6);
	});

	it('units exiting top bridge on East island (x=4160, y=660) march continuously along highway past x=4900 and reach East Castle without deadlock at y=732', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 500 });

		// Sorceress spawned at bridge exit on East Island (Top Lane)
		const unit: Unit = {
			defId: 'h07B',
			instanceId: 'unit_exit_top',
			team: 'west',
			name: 'Заклинателька',
			x: BRIDGE_SPAN_MAX_X + 25, // 4165
			y: TOP_LANE_Y, // 660
			prevX: BRIDGE_SPAN_MAX_X + 25,
			prevY: TOP_LANE_Y,
			hp: 625,
			maxHp: 625,
			size: 16,
			speed: 300,
			attackCooldown: 1.2,
			cooldownTimer: 0,
			damageMin: 25,
			damageMax: 30,
			damageBonusPct: 0,
			armorBonus: 0,
			attackType: 'magic',
			range: 500,
			armor: 0,
			armorType: 'unarmored' as ArmorType,
			state: 'WALKING',
			lane: 'top',
			flying: false,
			currentTargetId: null,
			targetX: 7000,
			targetY: TOP_LANE_Y
		};
		sim.units.push(unit);

		for (let s = 0; s < 160; s++) {
			sim.step(0.05);
		}

		// Unit must successfully advance past EAST_ROAD_MERGE_X (4900)
		expect(unit.x).toBeGreaterThan(EAST_ROAD_MERGE_X);
		// Unit must have turned towards Castle (y=1200), moving beyond TOP_LANE_Y (660)
		expect(unit.y).toBeGreaterThan(TOP_LANE_Y + 50);
		// Unit must never trigger stuckTimer >= 0.6s
		expect(unit.stuckTimer || 0).toBeLessThan(0.6);
	});

	it('East units exiting bridge on West island march continuously past merge point (x=2300) and reach West Castle', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 500 });

		const unit: Unit = {
			defId: 'hfoo',
			instanceId: 'east_unit_exit_bottom',
			team: 'east',
			name: 'Піхотинець',
			x: BRIDGE_SPAN_MIN_X - 25, // 3035
			y: BOTTOM_LANE_Y, // 1740
			prevX: BRIDGE_SPAN_MIN_X - 25,
			prevY: BOTTOM_LANE_Y,
			hp: 420,
			maxHp: 420,
			size: 16,
			speed: 270,
			attackCooldown: 1.0,
			cooldownTimer: 0,
			damageMin: 20,
			damageMax: 25,
			damageBonusPct: 0,
			armorBonus: 0,
			attackType: 'normal',
			range: 90,
			armor: 2,
			armorType: 'medium' as ArmorType,
			state: 'WALKING',
			lane: 'bottom',
			flying: false,
			currentTargetId: null,
			targetX: 200,
			targetY: BOTTOM_LANE_Y
		};
		sim.units.push(unit);

		for (let s = 0; s < 160; s++) {
			sim.step(0.05);
		}

		// Unit must advance west past WEST_ROAD_MERGE_X (2300)
		expect(unit.x).toBeLessThan(WEST_ROAD_MERGE_X);
		// Unit must turn towards West Castle (y=1200), moving upwards from 1740
		expect(unit.y).toBeLessThan(BOTTOM_LANE_Y - 50);
		// Unit must never trigger stuckTimer >= 0.6s
		expect(unit.stuckTimer || 0).toBeLessThan(0.6);
	});

	it('a squad of 5 units crossing from bridge into enemy island marches smoothly without piling up or locking into stuck deadlocks', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 500 });

		for (let i = 0; i < 5; i++) {
			const unit: Unit = {
				defId: 'hfoo',
				instanceId: `squad_unit_${i}`,
				team: 'west',
				name: 'Піхотинець',
				x: BRIDGE_SPAN_MAX_X - 100 - i * 30,
				y: BOTTOM_LANE_Y + (i % 2 === 0 ? -15 : 15),
				prevX: BRIDGE_SPAN_MAX_X - 100 - i * 30,
				prevY: BOTTOM_LANE_Y + (i % 2 === 0 ? -15 : 15),
				hp: 420,
				maxHp: 420,
				size: 16,
				speed: 270,
				attackCooldown: 1.0,
				cooldownTimer: 0,
				damageMin: 20,
				damageMax: 25,
				damageBonusPct: 0,
				armorBonus: 0,
				attackType: 'normal',
				range: 90,
				armor: 2,
				armorType: 'medium' as ArmorType,
				state: 'WALKING',
				lane: 'bottom',
				flying: false,
				currentTargetId: null,
				targetX: 7000,
				targetY: BOTTOM_LANE_Y
			};
			sim.units.push(unit);
		}

		// Step for 10 seconds
		for (let s = 0; s < 200; s++) {
			sim.step(0.05);
		}

		// All 5 units must have crossed past EAST_ROAD_MERGE_X and none should be stuck
		for (const u of sim.units) {
			expect(u.x).toBeGreaterThan(EAST_ROAD_MERGE_X - 50);
			expect(u.stuckTimer || 0).toBeLessThan(0.6);
		}
	});

	it('ranged siege units (like Mortar [hmtm]) launch visible ballistic projectiles towards enemy castle and damage it on impact', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 500 });
		const eastCastle = sim.castles.east;
		const initCastleHp = eastCastle.hp;

		// Spawn Mortar within attack range of East Castle (range 1000)
		const mortar: Unit = {
			defId: 'hmtm',
			instanceId: 'mortar_siege_1',
			team: 'west',
			name: 'Мортира',
			x: 4650,
			y: TOP_LANE_Y,
			prevX: 4650,
			prevY: TOP_LANE_Y,
			hp: 405,
			maxHp: 405,
			size: 16,
			speed: 270,
			attackCooldown: 1.0,
			cooldownTimer: 0,
			damageMin: 80,
			damageMax: 93,
			damageBonusPct: 0,
			armorBonus: 0,
			attackType: 'siege',
			range: 1000,
			armor: 0,
			armorType: 'small' as ArmorType,
			state: 'WALKING',
			lane: 'top',
			flying: false,
			currentTargetId: null,
			targetX: 7000,
			targetY: TOP_LANE_Y
		};
		sim.units.push(mortar);

		// Step 1: Mortar detects castle in range (dist ≈ 1000) and enters ATTACKING state, launching a projectile
		sim.step(0.05);
		expect(mortar.state).toBe('ATTACKING');
		expect(sim.projectiles.length).toBeGreaterThan(0);
		const proj = sim.projectiles[0];
		expect(proj.isArtillery).toBe(true);
		expect(proj.targetUnitId).toBe('castle_east');
		expect(proj.targetX).toBe(eastCastle.x);
		expect(proj.targetY).toBe(eastCastle.y);

		// Step 2: Let projectile travel and hit the castle
		for (let s = 0; s < 50; s++) {
			sim.step(0.05);
		}
		expect(eastCastle.hp).toBeLessThan(initCastleHp);
	});

	it('units spawned behind friendly castle on Mid Lane (at x=1464, y=1250) navigate around the castle without getting stuck', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 500 });
		sim.brokenBridge = null;

		const unit: Unit = {
			defId: 'hfoo',
			instanceId: 'unit_rear_spawn',
			team: 'west',
			name: 'Піхотинець',
			x: 1464,
			y: 1250,
			prevX: 1464,
			prevY: 1250,
			hp: 420,
			maxHp: 420,
			size: 16,
			speed: 270,
			attackCooldown: 1.0,
			cooldownTimer: 0,
			damageMin: 20,
			damageMax: 25,
			damageBonusPct: 0,
			armorBonus: 0,
			attackType: 'normal',
			range: 90,
			armor: 2,
			armorType: 'medium' as ArmorType,
			state: 'WALKING',
			lane: 'mid',
			flying: false,
			currentTargetId: null,
			targetX: 7000,
			targetY: MID_LANE_Y
		};
		sim.units.push(unit);

		// Step for 8 seconds (160 ticks)
		for (let s = 0; s < 160; s++) {
			sim.step(0.05);
		}

		// Unit must NOT be stuck against west castle wall at x=1464
		expect(unit.x).toBeGreaterThan(1800);
		expect(unit.stuckTimer || 0).toBeLessThan(0.6);
	});

	it('diagnostic report clarifies combat status and confirms ranged attacking unit is not stuck', async () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 500 });
		const mortar: Unit = {
			defId: 'hmtm',
			instanceId: 'mortar_diag',
			team: 'west',
			name: 'Мортира',
			x: 4627,
			y: 652,
			prevX: 4627,
			prevY: 652,
			hp: 405,
			maxHp: 405,
			size: 16,
			speed: 270,
			attackCooldown: 3.5,
			cooldownTimer: 1.2,
			damageMin: 80,
			damageMax: 93,
			damageBonusPct: 0,
			armorBonus: 0,
			attackType: 'siege',
			range: 1000,
			armor: 0,
			armorType: 'small' as ArmorType,
			state: 'ATTACKING',
			lane: 'top',
			flying: false,
			currentTargetId: null,
			targetBuildingId: 'castle_east',
			targetX: 7000,
			targetY: 660,
			stuckTimer: 0
		};
		sim.units.push(mortar);

		const { logService } = await import('../services/logService.svelte');
		const report = logService.getUnitReport(mortar, sim);

		expect(report).toContain('--- COMBAT STATUS & ATTACK ACTIVITY ---');
		expect(report).toContain('STATE: ATTACKING');
		expect(report).toContain('RANGE: 1000px');
		expect(report).toContain(
			'Actively attacking target from range (1000px). Unit is standing still to attack, NOT stuck!'
		);
		expect(report).toContain(
			'RANGED SIEGE ENGAGEMENT: Unit is bombarding enemy castle from distance'
		);
	});
});
