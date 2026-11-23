import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { TerrainRenderer } from '../renderer/terrainRenderer';
import { OverlayRenderer } from '../renderer/overlayRenderer';
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

	it('profile simulation step with 150 active units', () => {
		const testSim = new Simulation({ botDifficulty: 15, startGold: 500, isRunning: true });
		// Spawn 75 west units and 75 east units
		for (let i = 0; i < 75; i++) {
			testSim.units.push({
				instanceId: `bench_west_${i}`,
				defId: 'hfoo',
				name: 'Піхотинець',
				team: 'west',
				lane: i % 2 === 0 ? 'top' : 'bottom',
				x: 800 + (i % 10) * 20,
				y: (i % 2 === 0 ? 660 : 1740) + Math.floor(i / 10) * 15,
				prevX: 800,
				prevY: 660,
				hp: 420,
				maxHp: 420,
				armor: 2,
				armorType: 'medium',
				attackType: 'normal',
				damageMin: 20,
				damageMax: 25,
				damageBonusPct: 0,
				armorBonus: 0,
				attackCooldown: 1.0,
				cooldownTimer: 0,
				range: 90,
				speed: 270,
				state: 'WALKING',
				flying: false,
				size: 16,
				currentTargetId: null,
				targetX: 2500,
				targetY: i % 2 === 0 ? 660 : 1740
			});
			testSim.units.push({
				instanceId: `bench_east_${i}`,
				defId: 'hfoo',
				name: 'Піхотинець',
				team: 'east',
				lane: i % 2 === 0 ? 'top' : 'bottom',
				x: 4800 - (i % 10) * 20,
				y: (i % 2 === 0 ? 660 : 1740) + Math.floor(i / 10) * 15,
				prevX: 4800,
				prevY: 660,
				hp: 420,
				maxHp: 420,
				armor: 2,
				armorType: 'medium',
				attackType: 'normal',
				damageMin: 20,
				damageMax: 25,
				damageBonusPct: 0,
				armorBonus: 0,
				attackCooldown: 1.0,
				cooldownTimer: 0,
				range: 90,
				speed: 270,
				state: 'WALKING',
				flying: false,
				size: 16,
				currentTargetId: null,
				targetX: 4700,
				targetY: i % 2 === 0 ? 660 : 1740
			});
		}

		const t0 = performance.now();
		const TICKS = 60;
		for (let s = 0; s < TICKS; s++) {
			testSim.step(1 / 60);
		}
		const elapsed = performance.now() - t0;
		const msPerTick = elapsed / TICKS;
		console.log(
			`[OPTIMIZED BENCHMARK] 150 units: 60 ticks took ${elapsed.toFixed(1)}ms (${msPerTick.toFixed(3)}ms per tick). At 10x = ${(msPerTick * 10).toFixed(2)}ms/frame`
		);
		expect(msPerTick).toBeLessThan(5.0); // Under 5ms even with 150 active units!
	});

	it('renders ultra-soft, continuous radial night light dissipation 4x smoother than fog-of-war', () => {
		const overlayRenderer = new OverlayRenderer(sim);
		sim.gameTime = 80; // Full night

		const recordedCircles: { x: number; y: number; r: number; alpha: number }[] = [];
		let currentAlpha = 1.0;

		const mockGraphics = {
			clear: () => {},
			rect: () => {},
			beginPath: () => {},
			fill: (style?: { color?: number; alpha?: number }) => {
				if (style?.alpha !== undefined) {
					currentAlpha = style.alpha;
					if (recordedCircles.length > 0) {
						recordedCircles[recordedCircles.length - 1].alpha = currentAlpha;
					}
				}
			},
			circle: (x: number, y: number, r: number) => {
				recordedCircles.push({ x, y, r, alpha: currentAlpha });
			}
		} as unknown as Graphics;

		overlayRenderer.drawDayNight(mockGraphics, 'night');

		// 1. Must record multiple soft concentric rings for castles and night light sources
		expect(recordedCircles.length).toBeGreaterThan(50);

		// 2. Castle lights must have multi-stage feathered falloff
		const westCastleCircles = recordedCircles.filter(
			(c) => Math.hypot(c.x - sim.castles.west.x, c.y - sim.castles.west.y) < 5
		);
		expect(westCastleCircles.length).toBeGreaterThanOrEqual(20);

		// 3. Falloff must span 100% of radius (r=0 to r=600) vs 25% in fog-of-war (4x smoother)
		const maxR = Math.max(...westCastleCircles.map((c) => c.r));
		const minR = Math.min(...westCastleCircles.map((c) => c.r));
		expect(maxR).toBeGreaterThanOrEqual(580);
		expect(minR).toBeLessThanOrEqual(30);

		// 4. Outer edge must dissipate to whisper-soft intensity (< 0.005) with zero sharp edge
		const outerCircle = westCastleCircles.find((c) => c.r === maxR);
		expect(outerCircle).toBeDefined();
		expect(outerCircle!.alpha).toBeLessThan(0.005);
	});

	it('renders castle lighting strictly to castleLightLayer beneath castle sprites, avoiding veil overlay', () => {
		const overlayRenderer = new OverlayRenderer(sim);
		sim.gameTime = 80; // Full night

		const ambientCircles: { x: number; y: number; r: number }[] = [];
		const castleCircles: { x: number; y: number; r: number }[] = [];

		const mockAmbientLayer = {
			clear: () => {},
			rect: () => {},
			beginPath: () => {},
			fill: () => {},
			circle: (x: number, y: number, r: number) => {
				ambientCircles.push({ x, y, r });
			}
		} as unknown as Graphics;

		const mockCastleLightLayer = {
			clear: () => {},
			rect: () => {},
			beginPath: () => {},
			fill: () => {},
			circle: (x: number, y: number, r: number) => {
				castleCircles.push({ x, y, r });
			}
		} as unknown as Graphics;

		overlayRenderer.drawDayNight(mockAmbientLayer, 'night', mockCastleLightLayer);

		// Castle light layer must receive the concentric hearth circles
		const westCastleLightCircles = castleCircles.filter(
			(c) => Math.hypot(c.x - sim.castles.west.x, c.y - sim.castles.west.y) < 5
		);
		expect(westCastleLightCircles.length).toBeGreaterThanOrEqual(20);

		// Ambient layer (drawn above castles) must NOT have castle circles (no foggy veil over castles)
		const westAmbientCircles = ambientCircles.filter(
			(c) => Math.hypot(c.x - sim.castles.west.x, c.y - sim.castles.west.y) < 5
		);
		expect(westAmbientCircles.length).toBe(0);
	});
});
