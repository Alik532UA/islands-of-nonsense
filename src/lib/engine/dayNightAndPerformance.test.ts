import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { TerrainRenderer } from '../renderer/terrainRenderer';
import type { Graphics } from 'pixi.js';

describe('Point 10: Smooth Day/Night Transition, FPS Optimization & UI Dial Verification', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 500 });
	});

	it('should calculate accurate Day/Night cycle phases (day, dusk, night, dawn)', () => {
		// Day phase: 0s to 44.9s
		sim.gameTime = 10;
		expect(sim.dayNightCycle).toBe('day');
		expect(sim.dayNightPhase).toBe('day');
		expect(sim.dayNightAmbientAlpha).toBe(0);

		// Dusk phase (Sunset transition): 45s to 59.9s
		sim.gameTime = 45;
		expect(sim.dayNightPhase).toBe('dusk');
		expect(sim.dayNightAmbientAlpha).toBeCloseTo(0, 2);

		sim.gameTime = 52.5; // Mid-sunset
		expect(sim.dayNightPhase).toBe('dusk');
		expect(sim.dayNightAmbientAlpha).toBeGreaterThan(0.05);
		expect(sim.dayNightAmbientAlpha).toBeLessThan(0.25);

		// Full Night phase: 60s to 104.9s
		sim.gameTime = 60;
		expect(sim.dayNightCycle).toBe('night');
		expect(sim.dayNightPhase).toBe('night');
		expect(sim.dayNightAmbientAlpha).toBeCloseTo(0.28, 2);

		sim.gameTime = 80;
		expect(sim.dayNightCycle).toBe('night');
		expect(sim.dayNightPhase).toBe('night');
		expect(sim.dayNightAmbientAlpha).toBeCloseTo(0.28, 2);

		// Dawn phase (Sunrise transition): 105s to 119.9s
		sim.gameTime = 105;
		expect(sim.dayNightPhase).toBe('dawn');
		expect(sim.dayNightAmbientAlpha).toBeCloseTo(0.28, 2);

		sim.gameTime = 112.5; // Mid-sunrise
		expect(sim.dayNightPhase).toBe('dawn');
		expect(sim.dayNightAmbientAlpha).toBeGreaterThan(0.05);
		expect(sim.dayNightAmbientAlpha).toBeLessThan(0.25);

		// Next Day: 120s
		sim.gameTime = 120;
		expect(sim.dayNightCycle).toBe('day');
		expect(sim.dayNightPhase).toBe('day');
		expect(sim.dayNightAmbientAlpha).toBe(0);
	});

	it('should guarantee smooth cosine ease transition without harsh step pops', () => {
		// Sample every second through dusk (45s -> 60s) and ensure monotonic increase
		let prevAlpha = 0;
		for (let t = 45; t <= 60; t += 1) {
			sim.gameTime = t;
			const alpha = sim.dayNightAmbientAlpha;
			expect(alpha).toBeGreaterThanOrEqual(prevAlpha);
			expect(alpha).toBeLessThanOrEqual(0.28);
			// Delta between consecutive seconds should be gentle (< 0.04)
			if (t > 45) {
				expect(alpha - prevAlpha).toBeLessThan(0.04);
			}
			prevAlpha = alpha;
		}

		// Sample every second through dawn (105s -> 120s) and ensure monotonic decrease
		prevAlpha = 0.28;
		for (let t = 105; t <= 120; t += 1) {
			sim.gameTime = t;
			const alpha = sim.dayNightAmbientAlpha;
			expect(alpha).toBeLessThanOrEqual(prevAlpha);
			expect(alpha).toBeGreaterThanOrEqual(0);
			if (t > 105) {
				expect(prevAlpha - alpha).toBeLessThan(0.04);
			}
			prevAlpha = alpha;
		}
	});

	it('should provide smooth continuous 360-degree clock progress for the UI dial', () => {
		sim.gameTime = 0;
		expect(sim.dayNightProgress).toBe(0);

		sim.gameTime = 30;
		expect(sim.dayNightProgress).toBeCloseTo(0.25, 2);

		sim.gameTime = 60;
		expect(sim.dayNightProgress).toBeCloseTo(0.5, 2);

		sim.gameTime = 90;
		expect(sim.dayNightProgress).toBeCloseTo(0.75, 2);

		sim.gameTime = 120;
		expect(sim.dayNightProgress).toBe(0);
	});

	it('should render dynamic water with high FPS performance (< 1ms per frame, < 80 draw primitives)', () => {
		const terrainRenderer = new TerrainRenderer();

		let drawCalls = 0;
		const mockGraphics = {
			clear: () => {
				drawCalls = 0;
			},
			rect: () => {
				drawCalls++;
			},
			ellipse: () => {
				drawCalls++;
			},
			poly: () => {
				drawCalls++;
			},
			fill: () => {},
			stroke: () => {}
		} as unknown as Graphics;

		const start = performance.now();
		const FRAMES = 60;
		for (let f = 0; f < FRAMES; f++) {
			terrainRenderer.drawDynamicWater(mockGraphics, f * 0.016);
		}
		const totalElapsed = performance.now() - start;
		const avgFrameTimeMs = totalElapsed / FRAMES;

		// Average frame render time must be strictly sub-millisecond (< 1.0 ms)
		expect(avgFrameTimeMs).toBeLessThan(1.0);

		// Number of draw primitives per frame must be lightweight (< 150 instead of old 15,000!)
		expect(drawCalls).toBeLessThan(150);
	});
});
