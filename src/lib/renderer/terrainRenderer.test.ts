import { describe, it, expect, vi } from 'vitest';
import type { Graphics } from 'pixi.js';
import { TerrainRenderer } from './terrainRenderer';
import {
	ISLAND_RADIUS_X,
	ISLAND_RADIUS_Y,
	WEST_ISLAND_CENTER_X,
	WEST_ISLAND_CENTER_Y
} from '../engine/constants';
import type { DecorationObstacle } from '../engine/constants';

function createSpyGraphics() {
	const ellipses: Array<{ x: number; y: number; rx: number; ry: number }> = [];
	const g = {
		clear: vi.fn(),
		beginPath: vi.fn(),
		closePath: vi.fn(),
		moveTo: vi.fn(),
		lineTo: vi.fn(),
		rect: vi.fn(),
		roundRect: vi.fn(),
		circle: vi.fn(),
		arc: vi.fn(),
		poly: vi.fn(),
		ellipse: vi.fn((x: number, y: number, rx: number, ry: number) => {
			ellipses.push({ x, y, rx, ry });
		}),
		fill: vi.fn(),
		stroke: vi.fn()
	};
	return { g: g as unknown as Graphics, spy: g, ellipses };
}

describe('TerrainRenderer meadow clearings & stylized decorations', () => {
	it('renders island terrain without harsh giant concentric geometric ellipses', () => {
		const renderer = new TerrainRenderer();
		const { g, ellipses } = createSpyGraphics();

		renderer.drawProceduralOvalIsland(
			g,
			WEST_ISLAND_CENTER_X,
			WEST_ISLAND_CENTER_Y,
			ISLAND_RADIUS_X,
			ISLAND_RADIUS_Y,
			true,
			1337
		);

		// Giant meadow ellipses (rx >= 200 or ry >= 150) must never appear
		const giantOvals = ellipses.filter((e) => e.rx >= 200 || e.ry >= 150);
		expect(giantOvals).toEqual([]);
	});

	it('renders multi-layered 2.5D decorations for mushroom, crystal, monolith, bush, and brazier', () => {
		const renderer = new TerrainRenderer();
		const { g, spy } = createSpyGraphics();

		const sampleDecorations: DecorationObstacle[] = [
			{ id: 'd1', type: 'mushroom', x: 1000, y: 500, radius: 16, team: 'west', variant: 1 },
			{ id: 'd2', type: 'crystal', x: 1100, y: 500, radius: 18, team: 'west', variant: 2 },
			{ id: 'd3', type: 'monolith', x: 1200, y: 500, radius: 22, team: 'west', variant: 3 },
			{ id: 'd4', type: 'monolith', x: 1250, y: 550, radius: 22, team: 'west', variant: 4 },
			{ id: 'd5', type: 'bush', x: 1300, y: 500, radius: 18, team: 'west', variant: 5 },
			{ id: 'd6', type: 'brazier', x: 1400, y: 500, radius: 18, team: 'west', variant: 6 }
		];

		renderer.drawProceduralDecorations(g, 1337, sampleDecorations);

		// Rich multi-layered geometry & shading expected across all 6 decorations + rim lilies
		expect(spy.poly.mock.calls.length).toBeGreaterThanOrEqual(20);
		expect(spy.circle.mock.calls.length).toBeGreaterThanOrEqual(40);
		expect(spy.fill.mock.calls.length).toBeGreaterThanOrEqual(45);
		expect(spy.stroke.mock.calls.length).toBeGreaterThanOrEqual(25);
	});

	it('does not draw a dark drop-shadow circle beneath the flat castle stone plaza foundation', () => {
		const renderer = new TerrainRenderer();
		const circles: Array<{ x: number; y: number; r: number }> = [];
		const g = {
			clear: vi.fn(),
			beginPath: vi.fn(),
			closePath: vi.fn(),
			moveTo: vi.fn(),
			lineTo: vi.fn(),
			rect: vi.fn(),
			roundRect: vi.fn(),
			circle: vi.fn((x: number, y: number, r: number) => {
				circles.push({ x, y, r });
			}),
			arc: vi.fn(),
			poly: vi.fn(),
			ellipse: vi.fn(),
			fill: vi.fn(),
			stroke: vi.fn()
		};

		renderer.drawStaticTerrain(g as unknown as Graphics, null, 1337, []);

		expect(circles.some((c) => c.r === 234)).toBe(false);
	});
});
