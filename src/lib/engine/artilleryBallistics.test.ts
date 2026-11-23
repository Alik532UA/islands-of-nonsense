import { describe, it, expect } from 'vitest';
import { Simulation } from './simulation';
import type { Unit } from './types';

function createMockUnit(overrides: Partial<Unit> = {}): Unit {
	return {
		instanceId: `unit_${Math.random()}`,
		defId: 'u_test',
		name: 'Тестовий боєць',
		team: 'west',
		lane: 'top',
		x: 500,
		y: 660,
		prevX: 500,
		prevY: 660,
		hp: 500,
		maxHp: 500,
		armor: 2,
		armorType: 'medium',
		attackType: 'normal',
		damageMin: 30,
		damageMax: 40,
		damageBonusPct: 0,
		armorBonus: 0,
		attackCooldown: 1.0,
		cooldownTimer: 0,
		range: 100,
		speed: 300,
		flying: false,
		currentTargetId: null,
		targetX: 2000,
		targetY: 660,
		state: 'WALKING',
		size: 16,
		...overrides
	};
}

describe('Point 10: Artillery Ground-Targeting vs Homing Projectiles (artillery vs msplash)', () => {
	it('flags siege ranged units with isArtillery and ballistic arcHeight', () => {
		const sim = new Simulation();
		sim.isRunning = true;

		// Mortar unit (siege attack, range 950)
		const mortar = createMockUnit({
			instanceId: 'mortar_1',
			defId: 'cg1a',
			name: 'Мортира',
			team: 'west',
			attackType: 'siege',
			range: 950,
			x: 500,
			y: 660
		});

		const enemy = createMockUnit({
			instanceId: 'enemy_1',
			team: 'east',
			x: 1100,
			y: 660
		});

		sim.units.push(mortar, enemy);
		sim.combatSystem.performAttack(mortar, enemy);

		expect(sim.projectiles.length).toBe(1);
		const proj = sim.projectiles[0];
		expect(proj.isArtillery).toBe(true);
		expect(proj.attackType).toBe('siege');
		expect(proj.arcHeight).toBe(85);
		expect(proj.targetX).toBe(1100);
		expect(proj.targetY).toBe(660);
	});

	it('homing projectiles track moving targets and hit them directly', () => {
		const sim = new Simulation();
		sim.isRunning = true;

		// Archer unit (pierce attack, homing missile)
		const archer = createMockUnit({
			instanceId: 'archer_1',
			defId: 'u_archer',
			name: 'Лучник',
			team: 'west',
			attackType: 'pierce',
			range: 500,
			x: 500,
			y: 660
		});

		const enemy = createMockUnit({
			instanceId: 'enemy_run',
			team: 'east',
			hp: 300,
			maxHp: 300,
			x: 900,
			y: 660
		});

		sim.units.push(archer, enemy);
		sim.combatSystem.performAttack(archer, enemy);

		const proj = sim.projectiles[0];
		expect(proj.isArtillery).toBe(false);

		// Enemy runs away
		enemy.x = 1050;
		enemy.y = 700;

		// Advance projectile in flight
		sim.combatSystem.updateProjectiles(0.2);

		// Homing projectile updated its target to enemy's new position
		expect(proj.targetX).toBe(1050);
		expect(proj.targetY).toBe(700);

		// Complete flight
		sim.combatSystem.updateProjectiles(1.5);
		// Enemy took direct hit damage despite moving
		expect(enemy.hp).toBeLessThan(300);
	});

	it('artillery projectiles lock onto ground coordinates and allow agile units to dodge', () => {
		const sim = new Simulation();
		sim.isRunning = true;

		const mortar = createMockUnit({
			instanceId: 'mortar_1',
			defId: 'cg1a',
			team: 'west',
			attackType: 'siege',
			range: 900,
			x: 500,
			y: 660
		});

		const enemy = createMockUnit({
			instanceId: 'fast_enemy',
			team: 'east',
			hp: 400,
			maxHp: 400,
			x: 900,
			y: 660
		});

		sim.units.push(mortar, enemy);
		sim.combatSystem.performAttack(mortar, enemy);

		const proj = sim.projectiles[0];
		expect(proj.isArtillery).toBe(true);
		const initialTargetX = proj.targetX;
		const initialTargetY = proj.targetY;

		// Enemy runs 300px away (well outside splash radius of 120px)
		enemy.x = 1300;
		enemy.y = 660;

		// Advance projectile in flight
		sim.combatSystem.updateProjectiles(0.3);

		// Artillery projectile coordinates DO NOT track the enemy
		expect(proj.targetX).toBe(initialTargetX);
		expect(proj.targetY).toBe(initialTargetY);

		// Shell impacts ground
		sim.combatSystem.updateProjectiles(1.5);

		// Fast enemy successfully dodged: took 0 damage!
		expect(enemy.hp).toBe(400);
	});

	it('artillery projectile hits stationary or stunned enemies caught in ground splash radius', () => {
		const sim = new Simulation();
		sim.isRunning = true;

		const mortar = createMockUnit({
			instanceId: 'mortar_1',
			defId: 'cg1a',
			team: 'west',
			attackType: 'siege',
			range: 900,
			x: 500,
			y: 660
		});

		// Target remains stationary at impact point
		const stationaryEnemy = createMockUnit({
			instanceId: 'stationary_enemy',
			team: 'east',
			hp: 400,
			maxHp: 400,
			x: 900,
			y: 660
		});

		// Second enemy standing nearby (within 50px of impact)
		const nearbyAlly = createMockUnit({
			instanceId: 'nearby_enemy',
			team: 'east',
			hp: 300,
			maxHp: 300,
			x: 930,
			y: 670
		});

		sim.units.push(mortar, stationaryEnemy, nearbyAlly);
		sim.combatSystem.performAttack(mortar, stationaryEnemy);

		// Shell travels and lands
		sim.combatSystem.updateProjectiles(2.0);

		// Both units in impact area took splash damage
		expect(stationaryEnemy.hp).toBeLessThan(400);
		expect(nearbyAlly.hp).toBeLessThan(300);
	});

	it('artillery towers (Catapult/Mortar) fire ground-targeted ballistic shots', () => {
		const sim = new Simulation();
		sim.isRunning = true;

		// Create Catapult tower (h073)
		sim.buildings.push({
			instanceId: 'bld_catapult_1',
			defId: 'h073',
			name: 'Катапульта',
			team: 'west',
			tileX: 20,
			tileY: 20,
			x: 800,
			y: 660,
			hp: 1200,
			maxHp: 1200,
			armor: 5,
			armorType: 'fort',
			goldCost: 200,
			spawnUnitId: '',
			spawnCooldown: 0,
			spawnTimer: 0,
			lane: 'top',
			upgradeFrom: null,
			race: 'Люди',
			specialType: 'tower',
			attackCooldown: 1.5,
			attackTimer: 0,
			attackRange: 800,
			damageMin: 80,
			damageMax: 90,
			attackType: 'siege',
			isArtillery: true
		});

		const enemy = createMockUnit({
			instanceId: 'slow_enemy',
			team: 'east',
			hp: 350,
			maxHp: 350,
			x: 1200,
			y: 660
		});

		sim.units.push(enemy);
		sim.spatialGrid.insert(enemy);

		// Tower updates and fires
		sim.combatSystem.updateTowers(0.1);

		expect(sim.projectiles.length).toBe(1);
		const shot = sim.projectiles[0];
		expect(shot.isArtillery).toBe(true);
		expect(shot.arcHeight).toBe(90);

		// Complete projectile flight
		sim.combatSystem.updateProjectiles(2.0);

		// Enemy at impact point took damage
		expect(enemy.hp).toBeLessThan(350);
	});
});
