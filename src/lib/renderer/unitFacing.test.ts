import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from '../engine/simulation';
import { EntityRenderer } from './entityRenderer';
import type { Graphics } from 'pixi.js';

describe('Unit Weapon Facing & Attack Direction', () => {
	let sim: Simulation;
	let renderer: EntityRenderer;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 500 });
		renderer = new EntityRenderer(sim);
	});

	it('East archer weapon faces left towards enemy / West castle by default', () => {
		const eastArcher = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'mid',
			x: 4800,
			y: sim.midLaneY,
			hp: 350,
			attackType: 'pierce',
			range: 500
		});

		const recordedArcs: { x: number; y: number; r: number; start: number; end: number }[] = [];
		const recordedLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
		let lastMoveTo = { x: 0, y: 0 };

		const mockGraphics = {
			clear: () => {},
			beginPath: () => {},
			circle: () => {},
			ellipse: () => {},
			poly: () => {},
			fill: () => {},
			stroke: () => {},
			rect: () => {},
			roundRect: () => {},
			moveTo: (x: number, y: number) => {
				lastMoveTo = { x, y };
			},
			lineTo: (x: number, y: number) => {
				recordedLines.push({ x1: lastMoveTo.x, y1: lastMoveTo.y, x2: x, y2: y });
			},
			arc: (x: number, y: number, r: number, start: number, end: number) => {
				recordedArcs.push({ x, y, r, start, end });
			}
		} as unknown as Graphics;

		renderer.drawUnitsLayer(mockGraphics, null, false);

		// 1. Bow arc must be positioned to the left of the archer (x < eastArcher.x) and bulge leftwards
		expect(recordedArcs.length).toBeGreaterThan(0);
		const bowArc = recordedArcs[0];
		expect(bowArc.x).toBeLessThan(eastArcher.x);
		// Arc angles for facing left: startAngle around 104° (> PI/2) and endAngle around 255° (> PI)
		expect(bowArc.start).toBeGreaterThan(Math.PI / 2);
		expect(bowArc.end).toBeGreaterThan(Math.PI);

		// 2. Arrow line must point to the left (x2 < x1) towards enemy
		const arrowLine = recordedLines.find((l) => Math.abs(l.y1 - l.y2) < 0.001 && l.x2 < l.x1);
		expect(arrowLine).toBeDefined();
		expect(arrowLine!.x2).toBeLessThan(eastArcher.x);
	});

	it('West archer weapon faces right towards enemy / East castle by default', () => {
		const westArcher = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'mid',
			x: 2400,
			y: sim.midLaneY,
			hp: 350,
			attackType: 'pierce',
			range: 500
		});

		const recordedArcs: { x: number; y: number; r: number; start: number; end: number }[] = [];
		const recordedLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
		let lastMoveTo = { x: 0, y: 0 };

		const mockGraphics = {
			clear: () => {},
			beginPath: () => {},
			circle: () => {},
			ellipse: () => {},
			poly: () => {},
			fill: () => {},
			stroke: () => {},
			rect: () => {},
			roundRect: () => {},
			moveTo: (x: number, y: number) => {
				lastMoveTo = { x, y };
			},
			lineTo: (x: number, y: number) => {
				recordedLines.push({ x1: lastMoveTo.x, y1: lastMoveTo.y, x2: x, y2: y });
			},
			arc: (x: number, y: number, r: number, start: number, end: number) => {
				recordedArcs.push({ x, y, r, start, end });
			}
		} as unknown as Graphics;

		renderer.drawUnitsLayer(mockGraphics, null, false);

		// Bow arc positioned to the right of the archer (x > westArcher.x)
		expect(recordedArcs.length).toBeGreaterThan(0);
		const bowArc = recordedArcs[0];
		expect(bowArc.x).toBeGreaterThan(westArcher.x);
		expect(bowArc.start).toBeLessThan(0);
		expect(bowArc.end).toBeGreaterThan(0);

		// Arrow line points to the right (x2 > x1)
		const arrowLine = recordedLines.find((l) => Math.abs(l.y1 - l.y2) < 0.001 && l.x2 > l.x1);
		expect(arrowLine).toBeDefined();
		expect(arrowLine!.x2).toBeGreaterThan(westArcher.x);
	});

	it('dynamically turns to face enemy unit when flanking or in close combat', () => {
		// East archer at x=4000
		const eastArcher = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'mid',
			x: 4000,
			y: sim.midLaneY,
			hp: 350,
			attackType: 'pierce',
			range: 500
		});

		// An enemy unit flanks behind it at x=4200 (to the right!)
		const enemyBehind = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'mid',
			x: 4200,
			y: sim.midLaneY,
			hp: 400
		});

		eastArcher.currentTargetId = enemyBehind.instanceId;

		const recordedLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
		let lastMoveTo = { x: 0, y: 0 };

		const mockGraphics = {
			clear: () => {},
			beginPath: () => {},
			circle: () => {},
			ellipse: () => {},
			poly: () => {},
			fill: () => {},
			stroke: () => {},
			rect: () => {},
			roundRect: () => {},
			moveTo: (x: number, y: number) => {
				lastMoveTo = { x, y };
			},
			lineTo: (x: number, y: number) => {
				recordedLines.push({ x1: lastMoveTo.x, y1: lastMoveTo.y, x2: x, y2: y });
			},
			arc: () => {}
		} as unknown as Graphics;

		renderer.drawUnitsLayer(mockGraphics, null, false);

		// Even though it is on team East, because the enemy is to the right (x=4200), arrow must point to the right!
		const arrowLine = recordedLines.find((l) => l.x1 < l.x2 && l.x2 > eastArcher.x);
		expect(arrowLine).toBeDefined();
	});
});
