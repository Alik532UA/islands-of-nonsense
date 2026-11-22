import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import type { Unit } from './types';
import { TOP_LANE_Y, BOTTOM_LANE_Y } from './constants';

describe('Point 6: WC3 Threat, Aggro & Targeting Mechanics', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 1000 });
	});

	function createMockUnit(overrides: Partial<Unit>): Unit {
		return {
			instanceId: `unit_${Math.random().toString(36).substring(2, 9)}`,
			defId: 'u001',
			name: 'Mock Unit',
			team: 'west',
			lane: 'top',
			x: 1000,
			y: TOP_LANE_Y,
			prevX: 1000,
			prevY: TOP_LANE_Y,
			hp: 500,
			maxHp: 500,
			armor: 2,
			armorType: 'medium',
			attackType: 'normal',
			damageMin: 30,
			damageMax: 30,
			damageBonusPct: 0,
			armorBonus: 0,
			attackCooldown: 1.5,
			cooldownTimer: 0,
			range: 100,
			speed: 60,
			flying: false,
			currentTargetId: null,
			targetX: 0,
			targetY: 0,
			state: 'WALKING',
			size: 20,
			...overrides
		};
	}

	it('надає пріоритет ворогу, який атакує цього юніта (Direct Threat retaliation)', () => {
		const myUnit = createMockUnit({ team: 'west', x: 1000, y: TOP_LANE_Y });

		// Enemy 1: 150 px away, walking passively
		const enemyPassive = createMockUnit({
			team: 'east',
			x: 1150,
			y: TOP_LANE_Y,
			currentTargetId: null
		});

		// Enemy 2: 170 px away (slightly further!), but currently attacking myUnit!
		const enemyAttacker = createMockUnit({
			team: 'east',
			x: 1170,
			y: TOP_LANE_Y,
			currentTargetId: myUnit.instanceId
		});

		sim.units = [myUnit, enemyPassive, enemyAttacker];
		sim.spatialGrid.clear();
		sim.spatialGrid.insert(myUnit);
		sim.spatialGrid.insert(enemyPassive);
		sim.spatialGrid.insert(enemyAttacker);

		const bestTarget = sim.combatSystem.findBestTarget(myUnit);
		expect(bestTarget).not.toBeNull();
		// Even though enemyAttacker is slightly farther, threat bonus directs focus to it
		expect(bestTarget?.instanceId).toBe(enemyAttacker.instanceId);
	});

	it('надає пріоритет ворогу з низьким HP для добивання (Focus Fire)', () => {
		const myUnit = createMockUnit({ team: 'west', x: 1000, y: TOP_LANE_Y });

		// Enemy 1: 150 px away, 100% HP
		const enemyFullHp = createMockUnit({
			team: 'east',
			x: 1150,
			y: TOP_LANE_Y,
			hp: 500,
			maxHp: 500
		});

		// Enemy 2: 150 px away, 15% HP (low health)
		const enemyLowHp = createMockUnit({
			team: 'east',
			x: 1150,
			y: TOP_LANE_Y,
			hp: 75,
			maxHp: 500
		});

		sim.units = [myUnit, enemyFullHp, enemyLowHp];
		sim.spatialGrid.clear();
		sim.spatialGrid.insert(myUnit);
		sim.spatialGrid.insert(enemyFullHp);
		sim.spatialGrid.insert(enemyLowHp);

		const bestTarget = sim.combatSystem.findBestTarget(myUnit);
		expect(bestTarget?.instanceId).toBe(enemyLowHp.instanceId);
	});

	it('враховує таблицю шкоди: магічна атака обирає важку броню замість середньої (Damage Matrix)', () => {
		const magicMage = createMockUnit({
			team: 'west',
			x: 1000,
			y: TOP_LANE_Y,
			attackType: 'magic',
			range: 400
		});

		// Medium armor enemy (takes 0.75x from magic)
		const enemyMedium = createMockUnit({
			team: 'east',
			x: 1200,
			y: TOP_LANE_Y,
			armorType: 'medium'
		});

		// Heavy/Large armor enemy (takes 2.0x from magic)
		const enemyHeavy = createMockUnit({
			team: 'east',
			x: 1200,
			y: TOP_LANE_Y,
			armorType: 'large'
		});

		sim.units = [magicMage, enemyMedium, enemyHeavy];
		sim.spatialGrid.clear();
		sim.spatialGrid.insert(magicMage);
		sim.spatialGrid.insert(enemyMedium);
		sim.spatialGrid.insert(enemyHeavy);

		const bestTarget = sim.combatSystem.findBestTarget(magicMage);
		expect(bestTarget?.instanceId).toBe(enemyHeavy.instanceId);
	});

	it('заклик про допомогу (Call for Help): захист союзника в радіусі 350', () => {
		const myUnit = createMockUnit({ team: 'west', x: 1000, y: TOP_LANE_Y });
		const ally = createMockUnit({ team: 'west', x: 1050, y: TOP_LANE_Y });

		// Enemy attacking ally
		const enemyThreateningAlly = createMockUnit({
			team: 'east',
			x: 1200,
			y: TOP_LANE_Y,
			currentTargetId: ally.instanceId
		});

		// Passive enemy at same distance
		const enemyPassive = createMockUnit({
			team: 'east',
			x: 1200,
			y: TOP_LANE_Y,
			currentTargetId: null
		});

		sim.units = [myUnit, ally, enemyThreateningAlly, enemyPassive];
		sim.spatialGrid.clear();
		sim.spatialGrid.insert(myUnit);
		sim.spatialGrid.insert(ally);
		sim.spatialGrid.insert(enemyThreateningAlly);
		sim.spatialGrid.insert(enemyPassive);

		const bestTarget = sim.combatSystem.findBestTarget(myUnit);
		expect(bestTarget?.instanceId).toBe(enemyThreateningAlly.instanceId);
	});

	it('суворе розділення ліній: юніти ніколи не обирають ворога на сусідній лінії', () => {
		const topUnit = createMockUnit({ team: 'west', x: 1000, y: TOP_LANE_Y, lane: 'top' });

		// Enemy close on X, but on BOTTOM lane
		const bottomEnemy = createMockUnit({
			team: 'east',
			x: 1020,
			y: BOTTOM_LANE_Y,
			lane: 'bottom'
		});

		sim.units = [topUnit, bottomEnemy];
		sim.spatialGrid.clear();
		sim.spatialGrid.insert(topUnit);
		sim.spatialGrid.insert(bottomEnemy);

		const bestTarget = sim.combatSystem.findBestTarget(topUnit);
		expect(bestTarget).toBeNull();
	});

	it('наземні бійці ближнього бою не можуть цілити в летючих юнітів', () => {
		const meleeGround = createMockUnit({
			team: 'west',
			x: 1000,
			y: TOP_LANE_Y,
			range: 100,
			flying: false
		});

		const flyingEnemy = createMockUnit({
			team: 'east',
			x: 1080,
			y: TOP_LANE_Y,
			flying: true
		});

		sim.units = [meleeGround, flyingEnemy];
		sim.spatialGrid.clear();
		sim.spatialGrid.insert(meleeGround);
		sim.spatialGrid.insert(flyingEnemy);

		const bestTarget = sim.combatSystem.findBestTarget(meleeGround);
		expect(bestTarget).toBeNull();
	});
});
