import { Container, Graphics, Sprite, Texture, Text } from 'pixi.js';
import type { Simulation } from '../engine/simulation';
import type { FloatingText } from '../engine/types';
import {
	ARENA_WIDTH,
	ARENA_HEIGHT,
	WEST_GRID_START_X,
	WEST_GRID_START_Y,
	CELL_SIZE,
	GRID_STEP,
	TOP_LANE_Y,
	MID_LANE_Y,
	BOTTOM_LANE_Y
} from '../engine/constants';

export class OverlayRenderer {
	private sim: Simulation;
	private textPool: Text[] = [];
	private fogCanvas: HTMLCanvasElement | null = null;
	private fogCtx: CanvasRenderingContext2D | null = null;
	private fogTexture: Texture | null = null;
	private fogSprite: Sprite | null = null;
	private fogFrameCounter = 0;

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

		// Only during building placement planning does a subtle guide grid appear.
		// Focuses on the West courtyard meadow area (x: 4..60, y: 6..64)
		if (selectedDefId) {
			for (let x = 4; x <= 60; x++) {
				for (let y = 6; y <= 64; y++) {
					const px = WEST_GRID_START_X + x * GRID_STEP;
					const py = WEST_GRID_START_Y + y * GRID_STEP;
					const canBuild = this.sim.canBuild('west', x, y);
					if (canBuild) {
						g.rect(px + 1, py + 1, GRID_STEP - 2, GRID_STEP - 2);
						g.fill({ color: 0x1e293b, alpha: 0.08 });
						g.stroke({ color: 0x64748b, width: 0.5, alpha: 0.18 });
					}
				}
			}
		}

		// Hover Highlight: Authentic 1x1 placement bounding box
		if (selectedDefId && hoveredTile) {
			const px = WEST_GRID_START_X + hoveredTile.x * GRID_STEP;
			const py = WEST_GRID_START_Y + hoveredTile.y * GRID_STEP;
			const canBuild = this.sim.canBuild('west', hoveredTile.x, hoveredTile.y);
			const color = canBuild ? 0x22c55e : 0xef4444;

			// Clean 1x1 building placement indicator (not 2x2 split quadrants)
			g.rect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
			g.fill({ color, alpha: 0.32 });
			g.stroke({ color, width: 2.0, alpha: 0.95 });

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

			// Authentic 4-prong Warcraft III Order Chevrons (contracting green brackets)
			for (let a = 0; a < 4; a++) {
				const ang = (a * Math.PI) / 2 + Math.PI / 4;
				const cx = m.x + Math.cos(ang) * radius;
				const cy = m.y + Math.sin(ang) * radius;
				g.beginPath();
				g.circle(cx, cy, 3);
				g.fill({ color: 0x22c55e, alpha });
			}
			g.beginPath();
			g.ellipse(m.x, m.y, radius * 0.8, radius * 0.4);
			g.stroke({ color: 0x4ade80, width: 2, alpha });
		}
	}

	private initFogCanvas(): void {
		if (typeof document === 'undefined') return;
		if (this.fogCanvas) return;

		this.fogCanvas = document.createElement('canvas');
		this.fogCanvas.width = 1120;
		this.fogCanvas.height = 480;
		this.fogCtx = this.fogCanvas.getContext('2d');

		this.fogTexture = Texture.from(this.fogCanvas);
		this.fogSprite = new Sprite(this.fogTexture);
		this.fogSprite.x = -2000;
		this.fogSprite.y = -1200;
		this.fogSprite.scale.set(10, 10);
		this.fogSprite.alpha = 0.45;
	}

	public drawFogOfWar(container: Container, enableFog: boolean): void {
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
		this.fogSprite.x = -2000;
		this.fogSprite.y = -1200;
		this.fogSprite.scale.set(10, 10);

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

		const scale = 0.1; // 1120 / 11200
		const offsetX = 2000;
		const offsetY = 1200;

		const addVision = (worldX: number, worldY: number, radius: number) => {
			const cx = (worldX + offsetX) * scale;
			const cy = (worldY + offsetY) * scale;
			const r = radius * scale;
			if (r <= 0) return;

			// Smooth radial falloff gradient
			const grad = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
			grad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
			grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.85)');
			grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(cx, cy, r, 0, Math.PI * 2);
			ctx.fill();
		};

		// A. West Castle (wide panoramic vision)
		addVision(this.sim.castles.west.x, this.sim.castles.west.y, 750);

		// B. West Worker(s)
		for (const p of this.sim.teamMembers?.west || [this.sim.players.west]) {
			if (p?.worker) {
				addVision(p.worker.x, p.worker.y, 520);
			}
		}

		// C. West Buildings & Towers
		for (const b of this.sim.buildings) {
			if (b.team === 'west') {
				const radius = b.specialType === 'tower' ? 750 : 500;
				addVision(b.x + CELL_SIZE / 2, b.y + CELL_SIZE / 2, radius);
			}
		}

		// D. West Units (Living Mobs advancing across arena, aerial vision for flyers)
		for (const u of this.sim.units) {
			if (u.team === 'west' && u.state !== 'DEAD') {
				const radius = u.flying ? 650 : 480;
				addVision(u.x, u.y, radius);
			}
		}

		// E. West Island Decorations (Natural fixtures: braziers, spires, monoliths, flowers, mushrooms)
		if (this.sim.decorations) {
			for (const d of this.sim.decorations) {
				if (d.team === 'west') {
					addVision(d.x, d.y, 160);
				}
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

		// Drag Selection Box
		if (isBoxSelecting && boxStartWorld && boxCurrentWorld) {
			const x = Math.min(boxStartWorld.x, boxCurrentWorld.x);
			const y = Math.min(boxStartWorld.y, boxCurrentWorld.y);
			const w = Math.abs(boxStartWorld.x - boxCurrentWorld.x);
			const h = Math.abs(boxStartWorld.y - boxCurrentWorld.y);

			g.beginPath();
			g.rect(x, y, w, h);
			g.fill({ color: 0x22c55e, alpha: 0.15 });
			g.stroke({ color: 0x4ade80, width: 1.5 });
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

	public drawCastleLighting(g: Graphics): void {
		g.clear();
		const alpha = this.sim.dayNightAmbientAlpha;
		if (alpha <= 0.005) return;

		// Peak intensity scales with nighttime darkness
		const maxIntensity = Math.min(0.24, alpha * 0.7);

		// A. Castles: Grand Warm Hearth Light (R = 600, ultra-soft feathering)
		// Rendered under castlesLayer to illuminate surrounding terrain without casting a veil over the castle image
		this.drawSoftRadialLight(
			g,
			this.sim.castles.west.x,
			this.sim.castles.west.y,
			600,
			0xfbbf24,
			maxIntensity
		);
		this.drawSoftRadialLight(
			g,
			this.sim.castles.east.x,
			this.sim.castles.east.y,
			600,
			0xfbbf24,
			maxIntensity
		);
	}

	public drawDayNight(g: Graphics, _cycle?: 'day' | 'night', castleLightLayer?: Graphics): void {
		g.clear();
		if (castleLightLayer) {
			this.drawCastleLighting(castleLightLayer);
		}

		const alpha = this.sim.dayNightAmbientAlpha;
		if (alpha <= 0.005) return;

		const phase = this.sim.dayNightPhase;
		// Atmospheric ambient darkness overlay:
		// During dusk/dawn: rich twilight tone (indigo-violet)
		// During night: deep midnight slate (0x0f172a)
		const ambientColor = phase === 'dusk' ? 0x1e1b4b : phase === 'dawn' ? 0x2e1065 : 0x0f172a;

		// 1. Full arena ambient darkness blanket
		g.rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
		g.fill({ color: ambientColor, alpha });

		// 2. Continuous feathered radial light dissipation (4x smoother than fog-of-war)
		// Peak intensity scales with nighttime darkness
		const maxIntensity = Math.min(0.24, alpha * 0.7);

		// If no separate castleLightLayer is provided (e.g. standalone tests), draw to g as fallback
		if (!castleLightLayer) {
			this.drawSoftRadialLight(
				g,
				this.sim.castles.west.x,
				this.sim.castles.west.y,
				600,
				0xfbbf24,
				maxIntensity
			);
			this.drawSoftRadialLight(
				g,
				this.sim.castles.east.x,
				this.sim.castles.east.y,
				600,
				0xfbbf24,
				maxIntensity
			);
		}

		// B. Roadside Stone Braziers (Warm firelight) & Crystals (Ethereal luminescence)
		if (this.sim.decorations) {
			for (const d of this.sim.decorations) {
				if (d.type === 'brazier') {
					this.drawSoftRadialLight(g, d.x, d.y, 220, 0xf59e0b, maxIntensity * 0.9);
				} else if (d.type === 'crystal') {
					this.drawSoftRadialLight(g, d.x, d.y, 190, 0x38bdf8, maxIntensity * 0.8);
				}
			}
		}

		// C. Bridge Magical Stone Lanterns
		const bridgeLanes = [TOP_LANE_Y, MID_LANE_Y, BOTTOM_LANE_Y];
		const lanternXs = [3080, 3300, 3550, 3750, 3950, 4120];
		for (const ly of bridgeLanes) {
			for (const lx of lanternXs) {
				this.drawSoftRadialLight(g, lx, ly - 95, 95, 0xfbbf24, maxIntensity * 0.65);
				this.drawSoftRadialLight(g, lx, ly + 95, 95, 0xfbbf24, maxIntensity * 0.65);
			}
		}

		// D. Workers carrying lanterns
		for (const p of [this.sim.players.west, this.sim.players.east]) {
			if (p?.worker) {
				this.drawSoftRadialLight(g, p.worker.x, p.worker.y, 170, 0xfef08a, maxIntensity * 0.75);
			}
		}
	}

	/**
	 * Renders continuous, feathered radial light dissipation spanning the full 100% of radius,
	 * 4x smoother than fog-of-war transitions, completely eliminating hard circle edges.
	 */
	public drawSoftRadialLight(
		g: Graphics,
		cx: number,
		cy: number,
		radius: number,
		color: number,
		peakAlpha: number
	): void {
		if (peakAlpha <= 0.002 || radius <= 0) return;

		// 24 concentric steps spanning the full 100% radius from r=0 to r=radius
		// Smooth cubic ease-out: f(t) = (1 - t)^2.6 has zero derivative at outer edge (t = 1)
		// Dissipates smoothly across the entire radius with zero banding or sharp boundaries
		const steps = 24;
		const dr = radius / steps;

		for (let s = steps; s >= 1; s--) {
			const r = s * dr;
			const t = (s - 0.5) / steps;
			const ringIntensity = Math.pow(1 - t, 2.6);
			const stepAlpha = Math.max(0.0005, peakAlpha * ringIntensity * 0.25);

			g.beginPath();
			g.circle(cx, cy, r);
			g.fill({ color, alpha: stepAlpha });
		}

		// Radiant warm inner core
		g.beginPath();
		g.circle(cx, cy, radius * 0.12);
		g.fill({ color: 0xffffff, alpha: peakAlpha * 0.35 });
	}
}
