import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { settings, CONTROL_PRESETS, UI_LAYOUT_PRESETS } from '../services/settings.svelte';

describe('Point 10: Automated 3-Bridge Lane Routing & Presets', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({
			botDifficulty: 15,
			startGold: 1000,
			isRunning: false
		});
		sim.decorations = [];
		sim.brokenBridge = null;
	});

	it('routes units automatically to nearest bridge based on building Y coordinate', () => {
		// Build human steam tank building near top lane
		sim.build('west', 'h05X', 25, 12, 'top');
		const topBld = sim.buildings[0];
		topBld.y = 480;
		topBld.isUnderConstruction = false;

		const spawnedTop = sim.buildingSystem.spawnUnitFromBuilding(topBld);
		expect(spawnedTop).not.toBeNull();
		expect(spawnedTop?.lane).toBe('top');

		// Mid building (y = 1200)
		topBld.y = 1200;
		const spawnedMid = sim.buildingSystem.spawnUnitFromBuilding(topBld);
		expect(spawnedMid).not.toBeNull();
		expect(spawnedMid?.lane).toBe('mid');

		// Bottom building (y = 1900)
		topBld.y = 1900;
		const spawnedBottom = sim.buildingSystem.spawnUnitFromBuilding(topBld);
		expect(spawnedBottom).not.toBeNull();
		expect(spawnedBottom?.lane).toBe('bottom');
	});

	it('reroutes units from broken bridge to the nearest intact bridge (4A invariant)', () => {
		// Set mid bridge broken
		sim.brokenBridge = 'mid';

		sim.build('west', 'h05X', 25, 12, 'top');
		const bld = sim.buildings[0];
		bld.isUnderConstruction = false;

		// Mid building spawns unit on mid lane
		bld.y = 1200;
		const spawnedMid = sim.buildingSystem.spawnUnitFromBuilding(bld);
		expect(spawnedMid?.lane).toBe('mid');

		// When approaching river chasm, ground units dynamically detour to closest intact bridge:
		// Unit in upper half (y < 1200) detours to top bridge
		const testUnit = spawnedMid!;
		testUnit.lane = 'mid';
		testUnit.flying = false;
		testUnit.y = 1000;
		expect(sim.combatSystem.navigation.getEffectiveCrossingLane(testUnit)).toBe('top');

		// Unit in lower half (y > 1200) detours to bottom bridge
		testUnit.y = 1400;
		expect(sim.combatSystem.navigation.getEffectiveCrossingLane(testUnit)).toBe('bottom');

		// When top bridge is broken, top lane ground unit detours to mid bridge
		sim.brokenBridge = 'top';
		testUnit.lane = 'top';
		expect(sim.combatSystem.navigation.getEffectiveCrossingLane(testUnit)).toBe('mid');
	});

	it('validates settings control and UI layout presets', () => {
		expect(CONTROL_PRESETS).toContain('islands-of-nonsense');
		expect(CONTROL_PRESETS).toContain('warcraft3');
		expect(UI_LAYOUT_PRESETS).toContain('islands-of-nonsense');
		expect(UI_LAYOUT_PRESETS).toContain('warcraft3');

		settings.setControlPreset('islands-of-nonsense');
		expect(settings.controlPreset).toBe('islands-of-nonsense');

		settings.setControlPreset('warcraft3');
		expect(settings.controlPreset).toBe('warcraft3');

		settings.setUiLayoutPreset('islands-of-nonsense');
		expect(settings.uiLayoutPreset).toBe('islands-of-nonsense');

		settings.setUiLayoutPreset('warcraft3');
		expect(settings.uiLayoutPreset).toBe('warcraft3');
	});
});
