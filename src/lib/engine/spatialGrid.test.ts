import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialHashGrid } from './spatialGrid';
import type { Unit } from './types';

function createMockUnit(
	instanceId: string,
	x: number,
	y: number,
	team: 'west' | 'east',
	lane: 'top' | 'bottom'
): Unit {
	return {
		instanceId,
		defId: 'footman',
		name: 'Footman',
		team,
		lane,
		x,
		y,
		prevX: x,
		prevY: y,
		hp: 100,
		maxHp: 100,
		armor: 2,
		armorType: 'medium',
		attackType: 'normal',
		damageMin: 10,
		damageMax: 12,
		damageBonusPct: 0,
		armorBonus: 0,
		attackCooldown: 1.2,
		cooldownTimer: 0,
		range: 40,
		speed: 60,
		flying: false,
		currentTargetId: null,
		targetX: 0,
		targetY: 0,
		state: 'WALKING',
		size: 32
	};
}

describe('SpatialHashGrid & Lane Separation ([AC-LANE-1])', () => {
	let grid: SpatialHashGrid;

	beforeEach(() => {
		grid = new SpatialHashGrid(100);
	});

	it('знаходить юніта в радіусі пошуку', () => {
		const u1 = createMockUnit('u1', 50, 50, 'west', 'top');
		grid.insert(u1);

		const found = grid.queryRadius(60, 60, 30);
		expect(found.length).toBe(1);
		expect(found[0].instanceId).toBe('u1');
	});

	it('findClosestEnemy знаходить найближчого ворога на тій самій лінії', () => {
		const me = createMockUnit('me', 100, 220, 'west', 'top');
		const enemyTop = createMockUnit('e_top', 180, 220, 'east', 'top');
		const enemyBottom = createMockUnit('e_bot', 120, 580, 'east', 'bottom');

		grid.insert(enemyTop);
		grid.insert(enemyBottom);

		const target = grid.findClosestEnemy(me.x, me.y, 400, 'west', 'top');
		expect(target).not.toBeNull();
		expect(target?.instanceId).toBe('e_top');
	});

	it('findClosestEnemy суворо ігнорує ворогів на паралельній лінії', () => {
		const me = createMockUnit('me', 100, 220, 'west', 'top');
		const enemyBottom = createMockUnit('e_bot', 105, 580, 'east', 'bottom');

		grid.insert(enemyBottom);

		// Навіть якщо радіус величезний (1000px), ворог з іншої лінії не береться
		const target = grid.findClosestEnemy(me.x, me.y, 1000, 'west', 'top');
		expect(target).toBeNull();
	});
});
