import { Container, Graphics, Sprite, Texture, Text } from 'pixi.js';
import type { Simulation } from '../engine/simulation';
import type { FloatingText, MatchTeam } from '../engine/types';
import {
	ARENA_WIDTH,
	ARENA_HEIGHT,
	WEST_GRID_START_X,
	WEST_GRID_START_Y,
	EAST_GRID_START_X,
	EAST_GRID_START_Y,
	CELL_SIZE,
	GRID_STEP,
	TOP_LANE_Y,
	MID_LANE_Y,
	BOTTOM_LANE_Y,
	WEST_ISLAND_CENTER_X,
	WEST_ISLAND_CENTER_Y,
	EAST_ISLAND_CENTER_X,
	EAST_ISLAND_CENTER_Y,
	ISLAND_RADIUS_X,
	ISLAND_RADIUS_Y
} from '../engine/constants';
import { rc, rr, ci, el } from './gfx';

export class OverlayRenderer {
	private sim: Simulation;
	private textPool: Text[] = [];
	private fogCanvas: HTMLCanvasElement | null = null;
	private fogCtx: CanvasRenderingContext2D | null = null;
	private fogTexture: Texture | null = null;
	private fogSprite: Sprite | null = null;
	private fogFrameCounter = 0;
	private lastFogViewerTeam: MatchTeam | null = null;

	constructor(sim: Simulation) {
		this.sim = sim;
	}

	public setSimulation(newSim: Simulation): void {
		this.sim = newSim;
	}

	public drawGridLayer(
		g: Graphics,
		selectedDefId: string | null,
		hoveredTile: { x: number; y: number } | null,
		activeTeam: MatchTeam = 'west'
	): void {
		g.clear();

		const startX = activeTeam === 'east' ? EAST_GRID_START_X : WEST_GRID_START_X;
		const startY = activeTeam === 'east' ? EAST_GRID_START_Y : WEST_GRID_START_Y;
		const minTileX = activeTeam === 'east' ? -51 : 4;
		const maxTileX = activeTeam === 'east' ? 40 : 92;

		// Only during building placement planning does a subtle guide grid appear.
		if (selectedDefId) {
			for (let x = minTileX; x <= maxTileX; x++) {
				for (let y = 4; y <= 66; y++) {
					const px = startX + x * GRID_STEP;
					const py = startY + y * GRID_STEP;
					const canBuild = this.sim.canBuild(activeTeam, x, y);
					if (canBuild) {
						rc(
							g,
							px + 1,
							py + 1,
							GRID_STEP - 2,
							GRID_STEP - 2,
							{ color: 0x1e293b, alpha: 0.08 },
							{ color: 0x64748b, width: 0.5, alpha: 0.18 }
						);
					}
				}
			}
		}

		if (selectedDefId && hoveredTile) {
			const px = startX + hoveredTile.x * GRID_STEP;
			const py = startY + hoveredTile.y * GRID_STEP;
			const canBuild = this.sim.canBuild(activeTeam, hoveredTile.x, hoveredTile.y);
			const color = canBuild ? 0x22c55e : 0xef4444;
			rc(
				g,
				px + 1,
				py + 1,
				CELL_SIZE - 2,
				CELL_SIZE - 2,
				{ color, alpha: 0.32 },
				{ color, width: 2.0, alpha: 0.95 }
			);
			if (canBuild)
				rr(g, px + 4, py + 4, CELL_SIZE - 8, CELL_SIZE - 8, 4, { color: 0x38bdf8, alpha: 0.25 });
		}
	}

	public drawOrderMarkers(
		g: Graphics,
		moveMarkers: { x: number; y: number; timer: number; maxTimer: number }[]
	): void {
		g.clear();
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
			for (let a = 0; a < 4; a++) {
				const ang = (a * Math.PI) / 2 + Math.PI / 4;
				ci(g, m.x + Math.cos(ang) * radius, m.y + Math.sin(ang) * radius, 3, {
					color: 0x22c55e,
					alpha
				});
			}
			el(g, m.x, m.y, radius * 0.8, radius * 0.4, undefined, { color: 0x4ade80, width: 2, alpha });
		}
	}

	private initFogCanvas(): void {
		if (typeof document === 'undefined') return;
		if (this.fogCanvas) return;

		this.fogCanvas = document.createElement('canvas');
		this.fogCanvas.width = 1320;
		this.fogCanvas.height = 640;
		this.fogCtx = this.fogCanvas.getContext('2d');

		this.fogTexture = Texture.from(this.fogCanvas);
		this.fogSprite = new Sprite(this.fogTexture);
		this.fogSprite.x = -3000;
		this.fogSprite.y = -2000;
		this.fogSprite.scale.set(10, 10);
		this.fogSprite.alpha = 0.45;
	}

	public drawFogOfWar(
		container: Container,
		enableFog: boolean,
		viewerTeam: MatchTeam = 'west'
	): void {
		if (!enableFog) {
			if (this.fogSprite) this.fogSprite.visible = false;
			return;
		}

		this.initFogCanvas();
		if (!this.fogCanvas || !this.fogCtx || !this.fogSprite || !this.fogTexture) return;

		if (container.children.length === 0 || !container.children.includes(this.fogSprite)) {
			container.removeChildren();
			container.addChild(this.fogSprite);
		}
		this.fogSprite.visible = true;
		this.fogSprite.x = -3000;
		this.fogSprite.y = -2000;
		this.fogSprite.scale.set(10, 10);

		// Always redraw immediately when viewer team switches (e.g. joining as East or spectator switch)
		if (this.lastFogViewerTeam !== viewerTeam) {
			this.lastFogViewerTeam = viewerTeam;
			this.fogFrameCounter = 2;
		}

		// Throttle full canvas redraw and texture upload to every 3rd frame (20 Hz)
		// Saves 66% GPU texture upload overhead while preserving smooth vision
		this.fogFrameCounter++;
		if (this.fogFrameCounter % 3 !== 0) {
			return;
		}

		const ctx = this.fogCtx;
		const w = this.fogCanvas.width;
		const h = this.fogCanvas.height;

		// 1. Shroud the battlefield in authentic dimmed/darkened Fog of War (translucent ~45% darkness)
		ctx.globalCompositeOperation = 'source-over';
		ctx.fillStyle = '#000000';
		ctx.fillRect(0, 0, w, h);

		// 2. Smooth feathered radial dissipation using destination-out
		ctx.globalCompositeOperation = 'destination-out';

		const scale = 0.1; // 1320 / 13200
		const offsetX = 3000;
		const offsetY = 2000;

		// A. Allied Island Home Base (Entire courtyard fully and smoothly revealed matching island contour)
		const homeIslandX = viewerTeam === 'east' ? EAST_ISLAND_CENTER_X : WEST_ISLAND_CENTER_X;
		const homeIslandY = viewerTeam === 'east' ? EAST_ISLAND_CENTER_Y : WEST_ISLAND_CENTER_Y;
		const islandCx = (homeIslandX + offsetX) * scale;
		const islandCy = (homeIslandY + offsetY) * scale;
		const islandRx = (ISLAND_RADIUS_X + 80) * scale;
		const islandRy = (ISLAND_RADIUS_Y + 80) * scale;

		ctx.save();
		ctx.translate(islandCx, islandCy);
		ctx.scale(1, islandRy / islandRx);

		const islandGrad = ctx.createRadialGradient(0, 0, islandRx * 0.78, 0, 0, islandRx * 1.05);
		islandGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
		islandGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.85)');
		islandGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0.40)');
		islandGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

		ctx.fillStyle = islandGrad;
		ctx.beginPath();
		ctx.arc(0, 0, islandRx * 1.05, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();

		const addVision = (worldX: number, worldY: number, radius: number) => {
			const cx = (worldX + offsetX) * scale;
			const cy = (worldY + offsetY) * scale;
			const r = radius * scale;
			if (r <= 0) return;

			// Ultra-smooth feathered radial falloff gradient without harsh rings
			const grad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
			grad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
			grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.85)');
			grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.50)');
			grad.addColorStop(0.85, 'rgba(0, 0, 0, 0.18)');
			grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(cx, cy, r, 0, Math.PI * 2);
			ctx.fill();
		};

		// B. Allied Castle (wide panoramic vision)
		const homeCastle = this.sim.castles[viewerTeam];
		if (homeCastle) {
			addVision(homeCastle.x, homeCastle.y, 750);
		}

		// C. Allied Worker(s)
		for (const p of this.sim.teamMembers?.[viewerTeam] || [this.sim.players[viewerTeam]]) {
			if (p?.worker) {
				addVision(p.worker.x, p.worker.y, 520);
			}
		}

		// D. Allied Buildings & Towers
		for (const b of this.sim.buildings) {
			if (b.team === viewerTeam) {
				const radius = b.specialType === 'tower' ? 750 : 500;
				addVision(b.x + CELL_SIZE / 2, b.y + CELL_SIZE / 2, radius);
			}
		}

		// E. Allied Units advancing across arena
		for (const u of this.sim.units) {
			if (u.team === viewerTeam && u.state !== 'DEAD') {
				const baseVision = u.flying ? 1250 : 1100;
				const radius = Math.max(baseVision, (u.range ?? 0) + 100);
				addVision(u.x, u.y, radius);
			}
		}

		// Reset composite operation to default
		ctx.globalCompositeOperation = 'source-over';

		// Upload updated canvas pixels to GPU texture
		this.fogTexture.source.update();
		this.fogSprite.scale.set(10, 10);
	}

	public destroy(): void {
		if (this.fogTexture) {
			this.fogTexture.destroy(true);
			this.fogTexture = null;
		}
		this.fogSprite = null;
		this.fogCanvas = null;
		this.fogCtx = null;
	}

	public drawSelectionUI(
		g: Graphics,
		isBoxSelecting: boolean,
		boxStartWorld: { x: number; y: number } | null,
		boxCurrentWorld: { x: number; y: number } | null
	): void {
		g.clear();
		if (isBoxSelecting && boxStartWorld && boxCurrentWorld) {
			rc(
				g,
				Math.min(boxStartWorld.x, boxCurrentWorld.x),
				Math.min(boxStartWorld.y, boxCurrentWorld.y),
				Math.abs(boxStartWorld.x - boxCurrentWorld.x),
				Math.abs(boxStartWorld.y - boxCurrentWorld.y),
				{ color: 0x22c55e, alpha: 0.15 },
				{ color: 0x4ade80, width: 1.5 }
			);
		}
	}

	public drawFloatingTexts(container: Container, texts: FloatingText[]): void {
		let i = 0;
		for (; i < texts.length; i++) {
			const ft = texts[i];
			let pixiText = this.textPool[i];
			if (!pixiText) {
				pixiText = new Text({
					text: ft.text,
					style: {
						fontFamily: 'system-ui, -apple-system, sans-serif',
						fontSize: 13,
						fontWeight: 'bold',
						fill: ft.color,
						stroke: { color: 0x000000, width: 3 }
					}
				});
				pixiText.anchor.set(0.5, 0.5);
				this.textPool.push(pixiText);
				container.addChild(pixiText);
			}
			pixiText.text = ft.text;
			pixiText.style.fill = ft.color;
			pixiText.x = ft.x;
			pixiText.y = ft.y;
			pixiText.alpha = Math.max(0, Math.min(1, ft.life / ft.maxLife));
			pixiText.visible = true;
		}
		for (; i < this.textPool.length; i++) {
			this.textPool[i].visible = false;
		}
	}

	private drawCastleGlows(
		g: Graphics,
		maxIntensity: number,
		bounds?: { minX: number; minY: number; maxX: number; maxY: number }
	): void {
		for (const castle of [this.sim.castles.west, this.sim.castles.east]) {
			if (!bounds || (castle.x >= bounds.minX - 650 && castle.x <= bounds.maxX + 650)) {
				this.drawSoftRadialLight(g, castle.x, castle.y, 600, 0xfbbf24, maxIntensity);
			}
		}
	}

	public drawCastleLighting(
		g: Graphics,
		bounds?: { minX: number; minY: number; maxX: number; maxY: number }
	): void {
		g.clear();
		const alpha = this.sim.dayNightAmbientAlpha;
		if (alpha <= 0.005) return;
		this.drawCastleGlows(g, Math.min(0.24, alpha * 0.7), bounds);
	}

	public drawDayNight(
		g: Graphics,
		_cycle?: 'day' | 'night',
		castleLightLayer?: Graphics,
		bounds?: { minX: number; minY: number; maxX: number; maxY: number },
		enableFog = false,
		viewerTeam: MatchTeam = 'west'
	): void {
		g.clear();
		if (castleLightLayer) this.drawCastleLighting(castleLightLayer, bounds);
		const alpha = this.sim.dayNightAmbientAlpha;
		if (alpha <= 0.005) return;

		const phase = this.sim.dayNightPhase;
		const ambientColor = phase === 'dusk' ? 0x1e1b4b : phase === 'dawn' ? 0x2e1065 : 0x0f172a;
		rc(g, -3000, -2000, ARENA_WIDTH + 6000, ARENA_HEIGHT + 4000, { color: ambientColor, alpha });

		const maxIntensity = Math.min(0.24, alpha * 0.7);
		if (!castleLightLayer) this.drawCastleGlows(g, maxIntensity, bounds);

		if (this.sim.decorations) {
			for (const d of this.sim.decorations) {
				if (
					bounds &&
					(d.x < bounds.minX - 250 ||
						d.x > bounds.maxX + 250 ||
						d.y < bounds.minY - 250 ||
						d.y > bounds.maxY + 250)
				) {
					continue;
				}
				if (d.type === 'brazier')
					this.drawSoftRadialLight(g, d.x, d.y, 220, 0xf59e0b, maxIntensity * 0.9);
				else if (d.type === 'crystal')
					this.drawSoftRadialLight(g, d.x, d.y, 190, 0x38bdf8, maxIntensity * 0.8);
			}
		}

		const lanternXs = [3070, 3270, 3460, 3740, 3930, 4130];
		for (const [name, ly] of [
			['top', TOP_LANE_Y],
			['mid', MID_LANE_Y],
			['bottom', BOTTOM_LANE_Y]
		] as const) {
			if (bounds && (ly < bounds.minY - 150 || ly > bounds.maxY + 150)) continue;
			const broken = this.sim.brokenBridge === name;
			for (let i = 0; i < lanternXs.length; i++) {
				if (broken && (i === 2 || i === 3)) continue;
				const lx = lanternXs[i];
				if (bounds && (lx < bounds.minX - 120 || lx > bounds.maxX + 120)) continue;
				this.drawSoftRadialLight(g, lx, ly - 101, 95, 0xfbbf24, maxIntensity * 0.65);
				this.drawSoftRadialLight(g, lx, ly + 101, 95, 0xfbbf24, maxIntensity * 0.65);
			}
		}

		const workerPlayers = this.sim.allPlayers?.length
			? this.sim.allPlayers
			: [this.sim.players.west, this.sim.players.east];
		for (const p of workerPlayers) {
			const w = p?.worker;
			if (!w) continue;
			if (enableFog && p.team !== viewerTeam && !this.sim.isPointRevealed(viewerTeam, w.x, w.y))
				continue;
			if (
				bounds &&
				(w.x < bounds.minX - 200 ||
					w.x > bounds.maxX + 200 ||
					w.y < bounds.minY - 200 ||
					w.y > bounds.maxY + 200)
			)
				continue;
			this.drawSoftRadialLight(g, w.x, w.y, 170, 0xfef08a, maxIntensity * 0.75);
		}
	}

	public drawSoftRadialLight(
		g: Graphics,
		cx: number,
		cy: number,
		radius: number,
		color: number,
		peakAlpha: number,
		customSteps?: number
	): void {
		if (peakAlpha <= 0.002 || radius <= 0) return;
		const steps = customSteps ?? (radius >= 500 ? 24 : radius >= 180 ? 10 : 6);
		const dr = radius / steps;
		for (let s = steps; s >= 1; s--) {
			const stepAlpha = Math.max(0.0005, peakAlpha * Math.pow(1 - (s - 0.5) / steps, 2.6) * 0.25);
			ci(g, cx, cy, s * dr, { color, alpha: stepAlpha });
		}
		ci(g, cx, cy, radius * 0.12, { color: 0xffffff, alpha: peakAlpha * 0.35 });
	}
}
