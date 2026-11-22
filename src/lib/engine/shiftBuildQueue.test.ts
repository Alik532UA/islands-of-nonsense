import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';

describe('Warcraft III Shift-Queue Building System', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 2000 });
		sim.brokenBridge = null;
	});

	it('without Shift: placing a new building while building an old one leaves the old one unfinished and targets the new one', () => {
		const worker = sim.players.west.worker!;
		expect(worker).toBeDefined();

		// 1. Build first building (h003) at tile (20, 20)
		const bld1Success = sim.build('west', 'h003', 20, 20);
		expect(bld1Success).toBe(true);
		expect(sim.buildings.length).toBe(1);
		const bld1 = sim.buildings[0];
		expect(worker.targetBuildingId).toBe(bld1.instanceId);

		// Teleport worker next to bld1 so it begins building
		worker.x = bld1.x - 20;
		worker.y = bld1.y;
		sim.step(0.1);
		expect(worker.isBuilding).toBe(true);
		expect(bld1.buildProgress).toBeGreaterThan(0);
		const initialProgress = bld1.buildProgress;

		// 2. User starts building second building WITHOUT shift (shiftKey = false)
		const bld2Success = sim.build('west', 'h006', 20, 24, 'top', undefined, false);
		expect(bld2Success).toBe(true);
		expect(sim.buildings.length).toBe(2);
		const bld2 = sim.buildings[1];

		// Worker must immediately leave bld1 and target bld2
		expect(worker.targetBuildingId).toBe(bld2.instanceId);
		expect(worker.buildQueue).toEqual([]);

		// bld1 remains in place unfinished with its previous buildProgress
		expect(bld1.isUnderConstruction).toBe(true);
		expect(bld1.buildProgress).toBe(initialProgress);
	});

	it('with Shift: placing a new building while building an old one keeps worker on current building and queues the new one', () => {
		const worker = sim.players.west.worker!;
		expect(worker).toBeDefined();

		// 1. Start first building
		sim.build('west', 'h003', 20, 20);
		const bld1 = sim.buildings[0];
		worker.x = bld1.x - 20;
		worker.y = bld1.y;
		sim.step(0.1);
		expect(worker.isBuilding).toBe(true);
		expect(worker.targetBuildingId).toBe(bld1.instanceId);

		// 2. Place second building WITH Shift (shiftKey = true)
		const bld2Success = sim.build('west', 'h006', 20, 24, 'top', undefined, true);
		expect(bld2Success).toBe(true);
		expect(sim.buildings.length).toBe(2);
		const bld2 = sim.buildings[1];

		// Worker must NOT interrupt bld1!
		expect(worker.targetBuildingId).toBe(bld1.instanceId);
		expect(worker.isBuilding).toBe(true);
		// bld2 must be placed in the buildQueue
		expect(worker.buildQueue).toContain(bld2.instanceId);
		expect(bld2.isUnderConstruction).toBe(true);
		expect(bld2.buildProgress).toBe(0);

		// 3. Simulate completion of bld1
		bld1.buildProgress = (bld1.maxBuildProgress || 3.5) - 0.05;
		sim.step(0.1); // finishes bld1

		expect(bld1.isUnderConstruction).toBe(false);
		expect(bld1.hp).toBe(bld1.maxHp);

		// Worker must automatically switch target to queued bld2!
		expect(worker.targetBuildingId).toBe(bld2.instanceId);
		expect(worker.buildQueue).toEqual([]);
	});

	it('with Shift: can queue multiple buildings in sequence (A -> B -> C)', () => {
		const worker = sim.players.west.worker!;
		expect(worker).toBeDefined();

		// 1. Start building A
		sim.build('west', 'h003', 20, 20);
		const bldA = sim.buildings[0];
		worker.x = bldA.x - 20;
		worker.y = bldA.y;
		sim.step(0.1);
		expect(worker.targetBuildingId).toBe(bldA.instanceId);

		// 2. Queue building B and C with Shift
		sim.build('west', 'h006', 20, 24, 'top', undefined, true);
		sim.build('west', 'h004', 20, 28, 'top', undefined, true);

		const bldB = sim.buildings[1];
		const bldC = sim.buildings[2];

		expect(worker.buildQueue).toEqual([bldB.instanceId, bldC.instanceId]);
		expect(worker.targetBuildingId).toBe(bldA.instanceId);

		// Complete building A
		bldA.buildProgress = bldA.maxBuildProgress || 3.5;
		sim.step(0.1);
		expect(bldA.isUnderConstruction).toBe(false);
		expect(worker.targetBuildingId).toBe(bldB.instanceId);
		expect(worker.buildQueue).toEqual([bldC.instanceId]);

		// Complete building B
		worker.x = bldB.x - 20;
		worker.y = bldB.y;
		bldB.buildProgress = bldB.maxBuildProgress || 3.5;
		sim.step(0.1);
		expect(bldB.isUnderConstruction).toBe(false);
		expect(worker.targetBuildingId).toBe(bldC.instanceId);
		expect(worker.buildQueue).toEqual([]);
	});

	it('manual move order clears the shift queue', () => {
		const worker = sim.players.west.worker!;
		expect(worker).toBeDefined();

		sim.build('west', 'h003', 20, 20);
		const bldA = sim.buildings[0];
		worker.x = bldA.x - 20;
		worker.y = bldA.y;
		sim.step(0.1);

		sim.build('west', 'h006', 20, 24, 'top', undefined, true);
		expect(worker.buildQueue?.length).toBe(1);

		// Player issues manual move order to worker
		sim.moveWorker('west', 1600, 1200);
		expect(worker.buildQueue).toEqual([]);
	});

	it('selling a queued building removes it from buildQueue', () => {
		const worker = sim.players.west.worker!;
		expect(worker).toBeDefined();

		sim.build('west', 'h003', 20, 20);
		const bldA = sim.buildings[0];
		worker.x = bldA.x - 20;
		worker.y = bldA.y;
		sim.step(0.1);

		sim.build('west', 'h006', 20, 24, 'top', undefined, true);
		const bldB = sim.buildings[1];
		expect(worker.buildQueue).toContain(bldB.instanceId);

		// Sell the queued building
		sim.buildingSystem.sellBuilding('west', bldB.instanceId);
		expect(worker.buildQueue).not.toContain(bldB.instanceId);
	});
});
