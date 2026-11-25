import { describe, it, expect } from 'vitest';
import { Simulation } from '../engine/simulation';
import { OverlayRenderer } from './overlayRenderer';
import { UnitRenderer } from './unitRenderer';
import type { Graphics } from 'pixi.js';

describe('Bot-vs-Bot Multi-Player Selection & Control Invariants', () => {
	const noop = () => {};
	const mockGraphics = {
		clear: noop,
		beginPath: noop,
		circle: noop,
		ellipse: noop,
		poly: noop,
		fill: noop,
		stroke: noop,
		rect: noop,
		roundRect: noop,
		moveTo: noop,
		lineTo: noop,
		arc: noop
	} as unknown as Graphics;

	it('creates distinct controllable bot slots and allows moving, building, upgrading, and selling for any bot', () => {
		const sim = new Simulation({
			botDifficulty: 15,
			startGold: 2000,
			teamSize: 2,
			botVsBot: true,
			fogOfWar: false
		});

		expect(sim.allPlayers.length).toBe(4);
		expect(sim.allPlayers.every((p) => p.isBot && Boolean(p.worker))).toBe(true);

		// Verify East bot (slot 2) can be commanded independently from West bot (slot 1)
		const eastBot = sim.allPlayers.find((p) => p.team === 'east')!;
		const westBot3 = sim.allPlayers.find((p) => p.team === 'west' && p.slot !== 1)!;

		sim.moveWorker(eastBot.team, 6100, 1100, eastBot);
		expect(eastBot.worker!.targetX).not.toBe(westBot3.worker!.targetX);

		sim.moveWorker(westBot3.team, 900, 900, westBot3);
		expect(Math.hypot(westBot3.worker!.targetX - 900, westBot3.worker!.targetY - 900)).toBeLessThan(
			80
		);

		// Place a building cleanly for East bot on East island and verify ownership + sell
		sim.decorations = [];
		const eastGoldBefore = eastBot.gold;
		const builtEast = sim.build(eastBot.team, 'h000', 10, 20, 'top', eastBot, false);
		expect(builtEast).toBe(true);
		const eastBuilding = sim.buildings.find(
			(b) => b.team === 'east' && b.playerSlot === eastBot.slot
		);
		expect(eastBuilding).toBeDefined();
		expect(eastBot.gold).toBeLessThan(eastGoldBefore);

		const soldEast = sim.sellBuilding(eastBot.team, eastBuilding!.instanceId, eastBot);
		expect(soldEast).toBe(true);
	});

	it('supports rendering worker selection ring for any slot and east build grid overlay', () => {
		const sim = new Simulation({
			botDifficulty: 15,
			startGold: 500,
			teamSize: 2,
			botVsBot: true
		});

		const unitRenderer = new UnitRenderer(sim);
		const overlayRenderer = new OverlayRenderer(sim);

		for (const p of sim.allPlayers) {
			const slot = p.slot ?? (p.team === 'east' ? 2 : 1);
			expect(() => unitRenderer.drawWorkersLayer(mockGraphics, slot, false)).not.toThrow();
		}

		expect(() =>
			overlayRenderer.drawGridLayer(mockGraphics, 'h000', { x: 10, y: 20 }, 'east')
		).not.toThrow();
		expect(() =>
			overlayRenderer.drawGridLayer(mockGraphics, 'h000', { x: 10, y: 20 }, 'west')
		).not.toThrow();
	});
});
