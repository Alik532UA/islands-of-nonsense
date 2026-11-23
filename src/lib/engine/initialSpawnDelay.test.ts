import { describe, it, expect } from 'vitest';
import { Simulation } from './simulation';
import { getSpawnCooldown, getInitialSpawnDelay, getBuilding, getUnit } from './gameData';
import type { BuildingDefinition, UnitDefinition } from './types';

function createMockUnit(overrides: Partial<UnitDefinition> = {}): UnitDefinition {
	return {
		id: 'u_test',
		name: 'Тестовий юніт',
		hp: 500,
		armor: 3,
		armor_type: 'medium',
		attack_type: 'normal',
		damage_base: 25,
		damage_dice: 1,
		damage_sides: 4,
		cooldown: 1.0,
		range: 100,
		move_type: 'foot',
		flying: false,
		gold_cost: 0,
		...overrides
	};
}

describe('Point 9: Initial Spawn Timers (ubld) & Authentic Spawner Cooldowns', () => {
	it('getSpawnCooldown respects authentic WC3 ubld training times without artificial 30s cap', () => {
		// Paladin unit (h03C) has raw_fields.ubld = 41
		const paladinUnit = getUnit('h03C');
		expect(paladinUnit).toBeDefined();
		expect(paladinUnit?.raw_fields?.ubld).toBe(41);

		const cathedralBld = getBuilding('h038');
		expect(cathedralBld).toBeDefined();

		const cooldown = getSpawnCooldown(cathedralBld!, paladinUnit);
		// In WC3, Paladin takes 41s to train
		expect(cooldown).toBe(41);
	});

	it('getSpawnCooldown accurately extracts low and high tier ubld training times', () => {
		const mockBld: BuildingDefinition = {
			id: 'b_test',
			name: 'Test Spawner',
			hp: 1000,
			armor: 5,
			armor_type: 'fort',
			attack_type: 'normal',
			gold_cost: 200,
			unit: 'u_test',
			upgrade_from: null,
			upgrade_extra_cost: 0
		};

		const footmanUnit = createMockUnit({
			id: 'u_foot',
			name: 'Footman',
			raw_fields: { ubld: 22 }
		});

		const wyrmUnit = createMockUnit({
			id: 'u_wyrm',
			name: 'Frost Wyrm',
			raw_fields: { ubld: 60 }
		});

		expect(getSpawnCooldown(mockBld, footmanUnit)).toBe(22);
		expect(getSpawnCooldown(mockBld, wyrmUnit)).toBe(60);
	});

	it('getInitialSpawnDelay defaults to unit ubld and respects building-level override', () => {
		const mockBldWithOverride: BuildingDefinition = {
			id: 'b_custom',
			name: 'Custom Spawner',
			hp: 1000,
			armor: 5,
			armor_type: 'fort',
			attack_type: 'normal',
			gold_cost: 200,
			unit: 'u_test',
			upgrade_from: null,
			upgrade_extra_cost: 0,
			initialSpawnDelay: 15
		};

		const paladinUnit = createMockUnit({
			id: 'u_pal',
			name: 'Paladin',
			raw_fields: { ubld: 41 }
		});

		// Uses override when specified
		expect(getInitialSpawnDelay(mockBldWithOverride, paladinUnit)).toBe(15);

		// Otherwise uses authentic ubld
		const mockBldStandard: BuildingDefinition = {
			...mockBldWithOverride,
			initialSpawnDelay: undefined
		};
		expect(getInitialSpawnDelay(mockBldStandard, paladinUnit)).toBe(41);
	});

	it('assigns authentic ubld as initialSpawnDelay and spawnTimer on newly built structures', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 1000, westRace: 'Люди' });
		sim.isRunning = true;

		// Church (h037) trains Knight (h03B, ubld = 29)
		const built = sim.build('west', 'h037', 25, 20);
		expect(built).toBe(true);

		const bld = sim.buildings.find((b) => b.defId === 'h037');
		expect(bld).toBeDefined();
		expect(bld?.isUnderConstruction).toBe(true);
		expect(bld?.spawnCooldown).toBe(29);
		expect(bld?.initialSpawnDelay).toBe(29);
		expect(bld?.spawnTimer).toBe(29);
	});

	it('applies initialSpawnDelay upon worker completing construction and recurses to spawnCooldown', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 1000, westRace: 'Люди' });
		sim.isRunning = true;

		// Build Church (h037)
		sim.build('west', 'h037', 25, 20);
		const bld = sim.buildings.find((b) => b.defId === 'h037')!;

		// Worker arrives at construction site
		if (sim.players.west.worker) {
			sim.players.west.worker.x = bld.x;
			sim.players.west.worker.y = bld.y;
			sim.players.west.worker.targetBuildingId = bld.instanceId;
		}

		// Complete construction by maxing buildProgress
		bld.buildProgress = bld.maxBuildProgress || 3.5;
		sim.workerSystem.updateWorkers(0.1);

		expect(bld.isUnderConstruction).toBe(false);
		expect(bld.spawnTimer).toBe(29);

		// Advance time right before spawn
		sim.buildingSystem.updateBuildings(28.9);
		expect(sim.units.length).toBe(0);
		expect(bld.spawnTimer).toBeCloseTo(0.1, 1);

		// Step past spawn threshold
		sim.buildingSystem.updateBuildings(0.2);
		expect(sim.units.length).toBe(1);
		// Timer resets to recurring spawnCooldown (29s)
		expect(bld.spawnTimer).toBe(29);
	});

	it('updates spawnCooldown and initialSpawnDelay when upgrading a building', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 1000, westRace: 'Люди' });
		sim.isRunning = true;
		sim.players.west.lumber = 200;

		// Build Church (h037, trains Knight h03B with ubld = 29)
		sim.build('west', 'h037', 25, 20);
		const bld = sim.buildings.find((b) => b.defId === 'h037')!;
		bld.isUnderConstruction = false;

		// Upgrade to Cathedral (h038, trains Paladin with ubld = 41)
		const upgraded = sim.upgradeBuilding('west', bld.instanceId, 'h038');
		expect(upgraded).toBe(true);

		expect(bld.defId).toBe('h038');
		expect(bld.spawnCooldown).toBe(41);
		expect(bld.initialSpawnDelay).toBe(41);
	});
});
