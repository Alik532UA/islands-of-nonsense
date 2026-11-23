import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { TOP_LANE_Y, BOTTOM_LANE_Y } from './constants';

describe('Three Bridges & Twin Islands Mechanics', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 500 });
	});

	it('should randomly choose one of the three bridges (top, mid, bottom) as broken at start and on resetRound', () => {
		expect(['top', 'mid', 'bottom']).toContain(sim.brokenBridge);

		// Multiple reset rounds should all maintain valid broken bridge state
		for (let i = 0; i < 10; i++) {
			sim.resetRound();
			expect(['top', 'mid', 'bottom']).toContain(sim.brokenBridge);
		}
	});

	it('should allow repairing the broken bridge via repairBridge()', () => {
		sim.brokenBridge = 'top';
		expect(sim.brokenBridge).toBe('top');

		sim.repairBridge('top');
		expect(sim.brokenBridge).toBeNull();
	});

	it('should divert ground units across intact Mid bridge when Top bridge is broken', () => {
		sim.brokenBridge = 'top';

		// Spawn a west ground unit on top lane before the bridge
		const unit = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 2900,
			y: TOP_LANE_Y,
			flying: false,
			speed: 150
		});

		// Simulate movement towards enemy castle
		sim.combatSystem.updateUnits(0.5);

		// The unit should have moved towards the intact Mid bridge (detour downwards)
		expect(unit.y).toBeGreaterThan(TOP_LANE_Y);
	});

	it('should not divert flying units when a bridge is broken', () => {
		sim.brokenBridge = 'top';

		// Spawn a west flying unit on top lane
		const flyer = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 2900,
			y: TOP_LANE_Y,
			flying: true,
			speed: 150
		});

		sim.combatSystem.updateUnits(0.5);

		// Flyer stays on its top lane flying altitude without bridge detour
		expect(flyer.y).toBeCloseTo(TOP_LANE_Y, 1);
		expect(flyer.x).toBeGreaterThan(2900);
	});

	it('should divert ground units across intact Mid bridge when Bottom bridge is broken', () => {
		sim.brokenBridge = 'bottom';

		const unit = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'bottom',
			x: 2900,
			y: BOTTOM_LANE_Y,
			flying: false,
			speed: 150
		});

		sim.combatSystem.updateUnits(0.5);

		// The unit should divert upwards towards Mid bridge
		expect(unit.y).toBeLessThan(BOTTOM_LANE_Y);
	});

	it('strictly prevents ground units and workers from walking on water', () => {
		sim.brokenBridge = null;

		// 1. Water points in open ocean and between bridges are blocked for ground units
		const openRiverWater = { x: 3600, y: 930 }; // Between Top (660) and Mid (1200) bridges
		const northOceanWater = { x: 3600, y: 150 }; // North open sea
		const southOceanWater = { x: 3600, y: 2250 }; // South open sea

		expect(sim.workerSystem.isPointOnWater(openRiverWater.x, openRiverWater.y)).toBe(true);
		expect(sim.workerSystem.isPointBlockedForGround(openRiverWater.x, openRiverWater.y)).toBe(true);
		expect(sim.workerSystem.isPointBlockedForGround(northOceanWater.x, northOceanWater.y)).toBe(
			true
		);
		expect(sim.workerSystem.isPointBlockedForGround(southOceanWater.x, southOceanWater.y)).toBe(
			true
		);

		// 2. Active bridge decks are walkable ground
		const onTopBridge = { x: 3600, y: TOP_LANE_Y };
		expect(sim.workerSystem.isPointOnWater(onTopBridge.x, onTopBridge.y)).toBe(false);
		expect(sim.workerSystem.isPointWalkableGround(onTopBridge.x, onTopBridge.y)).toBe(true);

		// 3. Workers are blocked from water
		expect(
			sim.workerSystem.isPointBlockedForWorker('west', openRiverWater.x, openRiverWater.y)
		).toBe(true);
		expect(
			sim.workerSystem.isPointBlockedForWorker('west', northOceanWater.x, northOceanWater.y)
		).toBe(true);

		// 4. resolveGroundObstacles pushes units in water back to land or bridge deck
		const resolved = sim.workerSystem.resolveGroundObstacles(
			openRiverWater.x,
			openRiverWater.y,
			16
		);
		expect(sim.workerSystem.isPointWalkableGround(resolved.x, resolved.y)).toBe(true);

		// 5. Eastern shoreline cove between bridgehead capes is water, not walkable ground
		const coastalCoveWater = { x: 3120, y: 930 };
		expect(sim.workerSystem.isPointOnWater(coastalCoveWater.x, coastalCoveWater.y)).toBe(true);
		expect(sim.workerSystem.isPointWalkableGround(coastalCoveWater.x, coastalCoveWater.y)).toBe(
			false
		);

		// 6. Pre-bridge highway approach at TOP_LANE_Y is walkable ground
		const highwayApproach = { x: 2700, y: TOP_LANE_Y };
		expect(sim.workerSystem.isPointOnWater(highwayApproach.x, highwayApproach.y)).toBe(false);
		expect(sim.workerSystem.isPointWalkableGround(highwayApproach.x, highwayApproach.y)).toBe(true);
	});

	it('maintains units strictly on bridge deck without falling into water during river transit', () => {
		sim.brokenBridge = null;

		const unit = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 3200,
			y: TOP_LANE_Y,
			flying: false,
			speed: 250
		});

		for (let step = 0; step < 20; step++) {
			sim.step(0.05);
			// Ground unit must remain on walkable bridge deck, never on water
			expect(sim.workerSystem.isPointWalkableGround(unit.x, unit.y)).toBe(true);
			expect(Math.abs(unit.y - TOP_LANE_Y)).toBeLessThanOrEqual(56);
		}
	});

	it('ensures units on bridge approaches (x 2300-3060) remain within corridor and do not enter water', () => {
		sim.brokenBridge = null;

		const unit = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 2500,
			y: TOP_LANE_Y + 30,
			flying: false,
			speed: 250
		});

		for (let step = 0; step < 25; step++) {
			sim.step(0.05);
			expect(sim.workerSystem.isPointWalkableGround(unit.x, unit.y)).toBe(true);
			expect(Math.abs(unit.y - TOP_LANE_Y)).toBeLessThanOrEqual(72);
		}
	});
});
