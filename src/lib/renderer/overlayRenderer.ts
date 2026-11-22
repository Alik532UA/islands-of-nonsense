import type { Graphics } from 'pixi.js';
import type { Simulation } from '../engine/simulation';
import {
	ARENA_WIDTH,
	ARENA_HEIGHT,
	WEST_GRID_START_X,
	WEST_GRID_START_Y,
	CELL_SIZE,
	GRID_STEP
} from '../engine/simulation';

export class OverlayRenderer {
	private sim: Simulation;

	constructor(sim: Simulation) {
		this.sim = sim;
	}

	public setSimulation(newSim: Simulation): void {
		this.sim = newSim;
	}

	public drawGridLayer(
		g: Graphics,
		selectedDefId: string | null,
		hoveredTile: { x: number; y: number } | null
	): void {
		g.clear();

		// Normally the grid is completely hidden!
		// Only during building placement planning does a subtle guide grid appear.
		if (selectedDefId) {
			for (let x = -2; x <= 34; x += 2) {
				for (let y = -4; y <= 62; y += 2) {
					const px = WEST_GRID_START_X + x * GRID_STEP;
					const py = WEST_GRID_START_Y + y * GRID_STEP;
					const canBuild = this.sim.canBuild('west', x, y);
					if (canBuild) {
						g.rect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
						g.fill({ color: 0x1e293b, alpha: 0.08 });
						g.stroke({ color: 0x64748b, width: 0.5, alpha: 0.15 });
					}
				}
			}
		}

		// Hover Highlight: Authentic Warcraft III 2x2 green grid preview (each sub-cell is GRID_STEP = 32px)
		if (selectedDefId && hoveredTile) {
			const px = WEST_GRID_START_X + hoveredTile.x * GRID_STEP;
			const py = WEST_GRID_START_Y + hoveredTile.y * GRID_STEP;
			const canBuild = this.sim.canBuild('west', hoveredTile.x, hoveredTile.y);
			const color = canBuild ? 0x22c55e : 0xef4444;

			// 4 distinct quadrants (2x2 grid with GRID_STEP = 32px)
			for (let sx = 0; sx < 2; sx++) {
				for (let sy = 0; sy < 2; sy++) {
					const cx = px + sx * GRID_STEP;
					const cy = py + sy * GRID_STEP;
					g.rect(cx + 1, cy + 1, GRID_STEP - 2, GRID_STEP - 2);
					g.fill({ color, alpha: 0.35 });
					g.stroke({ color, width: 1.5, alpha: 0.85 });
				}
			}
			// Outer bounding box 64x64
			g.rect(px, py, CELL_SIZE, CELL_SIZE);
			g.stroke({ color, width: 2.5, alpha: 1.0 });

			// Ghost building preview if buildable
			if (canBuild) {
				g.roundRect(px + 4, py + 4, CELL_SIZE - 8, CELL_SIZE - 8, 4);
				g.fill({ color: 0x38bdf8, alpha: 0.25 });
			}
		}
	}

	public drawOrderMarkers(
		g: Graphics,
		moveMarkers: { x: number; y: number; timer: number; maxTimer: number }[]
	): void {
		for (let i = moveMarkers.length - 1; i >= 0; i--) {
			const m = moveMarkers[i];
			m.timer -= 0.016;
			if (m.timer <= 0) {
				moveMarkers.splice(i, 1);
				continue;
			}

			const progress = 1 - m.timer / m.maxTimer;
			const radius = 22 * (1 - progress * 0.4);
			const alpha = Math.max(0, m.timer / m.maxTimer);

			// Authentic 4-prong Warcraft III Order Chevrons (contracting green brackets)
			for (let a = 0; a < 4; a++) {
				const ang = (a * Math.PI) / 2 + Math.PI / 4;
				const cx = m.x + Math.cos(ang) * radius;
				const cy = m.y + Math.sin(ang) * radius;
				g.circle(cx, cy, 3);
				g.fill({ color: 0x22c55e, alpha });
			}
			g.ellipse(m.x, m.y, radius * 0.8, radius * 0.4);
			g.stroke({ color: 0x4ade80, width: 2, alpha });
		}
	}

	public drawFogOfWar(g: Graphics, enableFog: boolean): void {
		g.clear();
		if (!enableFog) return;

		// Atmospheric dark mist covering east side beyond ramparts
		g.rect(1550, 0, ARENA_WIDTH - 1550, ARENA_HEIGHT);
		g.fill({ color: 0x070b14, alpha: 0.62 });

		// Clear vision circles around friendly player entities
		for (const u of this.sim.units) {
			if (u.team === 'west' && u.state !== 'DEAD' && u.x >= 1400) {
				g.circle(u.x, u.y, 450);
				g.cut();
			}
		}

		const worker = this.sim.players.west.worker;
		if (worker && worker.x >= 1400) {
			g.circle(worker.x, worker.y, 480);
			g.cut();
		}
	}

	public drawSelectionUI(
		g: Graphics,
		isBoxSelecting: boolean,
		boxStartWorld: { x: number; y: number } | null,
		boxCurrentWorld: { x: number; y: number } | null
	): void {
		g.clear();

		// Drag Selection Box
		if (isBoxSelecting && boxStartWorld && boxCurrentWorld) {
			const x = Math.min(boxStartWorld.x, boxCurrentWorld.x);
			const y = Math.min(boxStartWorld.y, boxCurrentWorld.y);
			const w = Math.abs(boxStartWorld.x - boxCurrentWorld.x);
			const h = Math.abs(boxStartWorld.y - boxCurrentWorld.y);

			g.rect(x, y, w, h);
			g.fill({ color: 0x22c55e, alpha: 0.15 });
			g.stroke({ color: 0x4ade80, width: 1.5 });
		}
	}
}
