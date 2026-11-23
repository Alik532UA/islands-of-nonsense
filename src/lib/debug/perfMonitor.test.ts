import { describe, it, expect, beforeEach, vi } from 'vitest';
import { perfMonitor } from './perfMonitor.svelte';
import { Simulation } from '$lib/engine/simulation';
import { storage } from '$lib/services/storage';

describe('Performance Monitor & Overlay System', () => {
	const mockStore: Record<string, string> = {};

	beforeEach(() => {
		for (const k of Object.keys(mockStore)) {
			delete mockStore[k];
		}
		(globalThis as unknown as { window: unknown }).window = {
			localStorage: {
				getItem: (key: string) => mockStore[key] ?? null,
				setItem: (key: string, value: string) => {
					mockStore[key] = value;
				},
				removeItem: (key: string) => {
					delete mockStore[key];
				},
				get length() {
					return Object.keys(mockStore).length;
				},
				key: (i: number) => Object.keys(mockStore)[i] ?? null
			},
			sessionStorage: {
				getItem: () => null,
				setItem: () => {},
				removeItem: () => {},
				length: 0,
				key: () => null
			}
		};

		storage.remove('fps_monitor');
		perfMonitor.set(false);
		perfMonitor.detachSim();
	});

	it('initializes disabled by default and toggles correctly', () => {
		expect(perfMonitor.enabled).toBe(false);

		perfMonitor.toggle();
		expect(perfMonitor.enabled).toBe(true);
		expect(storage.get('fps_monitor')).toBe('1');

		perfMonitor.toggle();
		expect(perfMonitor.enabled).toBe(false);
		expect(storage.get('fps_monitor')).toBe('0');
	});

	it('attaches simulation and reads accurate metrics for both teams', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 500 });
		perfMonitor.attachSim(sim);

		const metrics = perfMonitor.getMetrics();
		expect(metrics.fps).toBeGreaterThanOrEqual(0);
		expect(metrics.minFps).toBeGreaterThanOrEqual(0);
		expect(metrics.unitsCount).toBe(sim.units.length);
		expect(metrics.westUnitsCount).toBe(sim.units.filter((u) => u.team === 'west').length);
		expect(metrics.eastUnitsCount).toBe(sim.units.filter((u) => u.team === 'east').length);
		expect(metrics.buildingsCount).toBe(sim.buildings.length);
		expect(metrics.simSpeed).toBe(1);
	});

	it('generates comprehensive diagnostic report containing all required sections', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 500 });
		perfMonitor.attachSim(sim);

		const report = perfMonitor.getMetricsReport();
		expect(report).toContain('=== PERFORMANCE & DIAGNOSTIC METRICS ===');
		expect(report).toContain('--- RENDER & FPS ---');
		expect(report).toContain('CURRENT FPS:');
		expect(report).toContain('MIN FPS');
		expect(report).toContain('FRAME TIME:');
		expect(report).toContain('--- MEMORY LOAD ---');
		expect(report).toContain('--- SIMULATION & ENTITIES ---');
		expect(report).toContain('TOTAL UNITS:');
		expect(report).toContain('TOTAL BUILDINGS:');
		expect(report).toContain('=== END OF METRICS ===');
	});

	it('copyReport triggers clipboard write and sets copied state', async () => {
		const writeTextMock = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, {
			clipboard: {
				writeText: writeTextMock
			}
		});

		const res = await perfMonitor.copyReport();
		expect(res).toBe(true);
		expect(writeTextMock).toHaveBeenCalled();
		expect(perfMonitor.copied).toBe(true);
	});
});
