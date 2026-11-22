import { describe, it, expect } from 'vitest';
import { Simulation } from './simulation';
import type { Unit, ArmorType } from './types';
import { TOP_LANE_Y, MID_LANE_Y } from './constants';

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
});
