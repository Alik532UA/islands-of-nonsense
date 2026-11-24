import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { settings } from '$lib/services/settings.svelte';

describe('Build Queue Mode (Зручний vs Класичний)', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 2000 });
		sim.decorations = [];
		sim.players.west.lumber = 2000;
		sim.brokenBridge = null;
		settings.setBuildQueueMode('convenient');
	});

	function simulateTileClickBuild(
		shiftKey: boolean,
		defId: string,
		tileX: number,
		tileY: number
	): boolean {
		const shouldQueue = settings.buildQueueMode === 'convenient' ? !shiftKey : shiftKey;
		return sim.build('west', defId, tileX, tileY, 'top', undefined, shouldQueue);
	}

	it('in "зручний" mode: without Shift, finishes current building and queues the next', () => {
		settings.setBuildQueueMode('convenient');
		const worker = sim.players.west.worker!;

		// 1. Build first building (h003) at tile (20, 20)
		sim.build('west', 'h003', 20, 20);
		const bld1 = sim.buildings[0];
		worker.x = bld1.x - 20;
		worker.y = bld1.y;
		sim.step(0.1);
		expect(worker.isBuilding).toBe(true);
		expect(worker.targetBuildingId).toBe(bld1.instanceId);

		// 2. Click without Shift (shiftKey = false)
		const success = simulateTileClickBuild(false, 'h006', 20, 24);
		expect(success).toBe(true);
		expect(sim.buildings.length).toBe(2);
		const bld2 = sim.buildings[1];

		// Worker must NOT interrupt bld1; bld2 is queued
		expect(worker.targetBuildingId).toBe(bld1.instanceId);
		expect(worker.isBuilding).toBe(true);
		expect(worker.buildQueue).toContain(bld2.instanceId);
	});

	it('in "зручний" mode: with Shift, abandons current building and targets next immediately', () => {
		settings.setBuildQueueMode('convenient');
		const worker = sim.players.west.worker!;

		// 1. Build first building (h003) at tile (20, 20)
		sim.build('west', 'h003', 20, 20);
		const bld1 = sim.buildings[0];
		worker.x = bld1.x - 20;
		worker.y = bld1.y;
		sim.step(0.1);
		expect(worker.isBuilding).toBe(true);

		// 2. Click with Shift (shiftKey = true)
		const success = simulateTileClickBuild(true, 'h006', 20, 24);
		expect(success).toBe(true);
		expect(sim.buildings.length).toBe(2);
		const bld2 = sim.buildings[1];

		// Worker must immediately leave bld1 and target bld2
		expect(worker.targetBuildingId).toBe(bld2.instanceId);
		expect(worker.buildQueue).toEqual([]);
		expect(bld1.isUnderConstruction).toBe(true);
	});

	it('in "класичний" mode: without Shift, abandons current building and targets next immediately', () => {
		settings.setBuildQueueMode('classic');
		const worker = sim.players.west.worker!;

		// 1. Build first building
		sim.build('west', 'h003', 20, 20);
		const bld1 = sim.buildings[0];
		worker.x = bld1.x - 20;
		worker.y = bld1.y;
		sim.step(0.1);
		expect(worker.isBuilding).toBe(true);

		// 2. Click without Shift (shiftKey = false)
		const success = simulateTileClickBuild(false, 'h006', 20, 24);
		expect(success).toBe(true);
		const bld2 = sim.buildings[1];

		// Worker interrupts bld1 and targets bld2
		expect(worker.targetBuildingId).toBe(bld2.instanceId);
		expect(worker.buildQueue).toEqual([]);
	});

	it('in "класичний" mode: with Shift, finishes current building and queues next', () => {
		settings.setBuildQueueMode('classic');
		const worker = sim.players.west.worker!;

		// 1. Build first building
		sim.build('west', 'h003', 20, 20);
		const bld1 = sim.buildings[0];
		worker.x = bld1.x - 20;
		worker.y = bld1.y;
		sim.step(0.1);
		expect(worker.isBuilding).toBe(true);

		// 2. Click with Shift (shiftKey = true)
		const success = simulateTileClickBuild(true, 'h006', 20, 24);
		expect(success).toBe(true);
		const bld2 = sim.buildings[1];

		// Worker keeps building bld1 and queues bld2
		expect(worker.targetBuildingId).toBe(bld1.instanceId);
		expect(worker.buildQueue).toContain(bld2.instanceId);
	});
});
