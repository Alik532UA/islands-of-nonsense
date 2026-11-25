import { describe, it, expect, vi } from 'vitest';
import type { Graphics } from 'pixi.js';
import { Simulation } from '../engine/simulation';
import { UnitRenderer } from './unitRenderer';
import { BuildingRenderer } from './buildingRenderer';
import { OverlayRenderer } from './overlayRenderer';

function createSpyGraphics(): {
	g: Graphics;
	ellipseCalls: { x: number; y: number }[];
} {
	const ellipseCalls: { x: number; y: number }[] = [];
	const mock = {
		clear: vi.fn(),
		beginPath: vi.fn(),
		ellipse: vi.fn((x: number, y: number) => {
			ellipseCalls.push({ x, y });
		}),
		rect: vi.fn(),
		roundRect: vi.fn(),
		circle: vi.fn(),
		moveTo: vi.fn(),
		lineTo: vi.fn(),
		closePath: vi.fn(),
		fill: vi.fn(),
		stroke: vi.fn(),
		poly: vi.fn()
	};
	return { g: mock as unknown as Graphics, ellipseCalls };
}

describe('East & West perspective Fog of War symmetry', () => {
	it('renders the East worker and hides the fogged West worker when viewerTeam is east', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 500, seed: 123, fogOfWar: true });
		const westWorker = sim.players.west.worker!;
		const eastWorker = sim.players.east.worker!;

		const renderer = new UnitRenderer(sim);
		const { g, ellipseCalls } = createSpyGraphics();

		renderer.drawWorkersLayer(g, eastWorker ? 2 : null, true, undefined, 'east');

		const drewEast = ellipseCalls.some((pt) => Math.abs(pt.x - eastWorker.x) < 10);
		const drewWest = ellipseCalls.some((pt) => Math.abs(pt.x - westWorker.x) < 10);
		expect(drewEast).toBe(true);
		expect(drewWest).toBe(false);
	});

	it('renders East buildings and hides fogged West buildings when viewerTeam is east', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 1000, seed: 123, fogOfWar: true });
		sim.players.west.lumber = 2000;
		sim.players.east.lumber = 2000;
		sim.build('west', 'cg11_forge', 25, 20);
		sim.build('east', 'cg11_forge', 25, 20);
		expect(sim.buildings.length).toBe(2);

		const renderer = new BuildingRenderer(sim);
		const mockG = {
			clear: vi.fn(),
			beginPath: vi.fn(),
			rect: vi.fn(),
			roundRect: vi.fn(),
			circle: vi.fn(),
			ellipse: vi.fn(),
			moveTo: vi.fn(),
			lineTo: vi.fn(),
			closePath: vi.fn(),
			fill: vi.fn(),
			stroke: vi.fn(),
			poly: vi.fn()
		};

		renderer.drawBuildingsLayer(mockG as unknown as Graphics, null, true, undefined, 'east');

		const eastBld = sim.buildings.find((b) => b.team === 'east')!;
		const westBld = sim.buildings.find((b) => b.team === 'west')!;
		const drawnXs = [
			...mockG.roundRect.mock.calls.map((c) => Number(c[0])),
			...mockG.rect.mock.calls.map((c) => Number(c[0]))
		];

		expect(drawnXs.some((rx) => Math.abs(rx - eastBld.x) < 80)).toBe(true);
		expect(drawnXs.some((rx) => Math.abs(rx - westBld.x) < 80)).toBe(false);
	});

	it('hides fogged enemy worker night lantern glow so no white blob appears in fog', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 500, seed: 123, fogOfWar: true });
		sim.gameTime = 80; // Night phase so worker lanterns are active

		const eastWorker = sim.players.east.worker!;
		const westWorker = sim.players.west.worker!;
		const overlay = new OverlayRenderer(sim);
		const circleXs: number[] = [];
		const mockG = {
			clear: vi.fn(),
			beginPath: vi.fn(),
			rect: vi.fn(),
			fill: vi.fn(),
			circle: vi.fn((x: number) => {
				circleXs.push(x);
			})
		};

		overlay.drawDayNight(mockG as unknown as Graphics, 'night', undefined, undefined, true, 'east');

		expect(circleXs.some((cx) => Math.abs(cx - eastWorker.x) < 5)).toBe(true);
		expect(circleXs.some((cx) => Math.abs(cx - westWorker.x) < 5)).toBe(false);
	});
});
