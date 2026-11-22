import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { TOP_LANE_Y, MID_LANE_Y, BOTTOM_LANE_Y } from './constants';

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
});
