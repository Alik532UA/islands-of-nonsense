import { Application, Container, Graphics } from 'pixi.js';
import type { Simulation } from '../engine/simulation';
import type { Castle } from '../engine/types';
import {
	ARENA_WIDTH,
	ARENA_HEIGHT,
	TOP_LANE_Y,
	BOTTOM_LANE_Y,
	WEST_GRID_START_X,
	WEST_GRID_START_Y,
	EAST_GRID_START_X,
	EAST_GRID_START_Y,
	CELL_SIZE
} from '../engine/simulation';

export interface RendererOptions {
	canvas: HTMLCanvasElement;
	sim: Simulation;
	onTileClick: (tileX: number, tileY: number) => void;
	getSelectedBuildingDefId: () => string | null;
	getSelectedPlacedBuildingId?: () => string | null;
}

export class ArenaRenderer {
	private app: Application;
	private sim: Simulation;
	private onTileClick: (tileX: number, tileY: number) => void;
	private getSelectedBuildingDefId: () => string | null;
	private getSelectedPlacedBuildingId?: () => string | null;

	private rootContainer: Container;
	private terrainLayer: Graphics;
	private gridLayer: Graphics;
	private buildingsLayer: Graphics;
	private unitsLayer: Graphics;
	private projectilesLayer: Graphics;
	private uiLayer: Container;

	private hoveredTile: { x: number; y: number } | null = null;
	private isDestroyed = false;

	constructor(options: RendererOptions) {
		this.sim = options.sim;
		this.onTileClick = options.onTileClick;
		this.getSelectedBuildingDefId = options.getSelectedBuildingDefId;
		this.getSelectedPlacedBuildingId = options.getSelectedPlacedBuildingId;

		this.app = new Application();
		this.rootContainer = new Container();
		this.terrainLayer = new Graphics();
		this.gridLayer = new Graphics();
		this.buildingsLayer = new Graphics();
		this.unitsLayer = new Graphics();
		this.projectilesLayer = new Graphics();
		this.uiLayer = new Container();
	}

	public setSimulation(newSim: Simulation): void {
		this.sim = newSim;
	}

	public async init(canvas: HTMLCanvasElement): Promise<void> {
		await this.app.init({
			canvas,
			width: ARENA_WIDTH,
			height: ARENA_HEIGHT,
			backgroundColor: 0x11161f,
			resolution: window.devicePixelRatio || 1,
			autoDensity: true
		});

		this.app.stage.addChild(this.rootContainer);
		this.rootContainer.addChild(this.terrainLayer);
		this.rootContainer.addChild(this.gridLayer);
		this.rootContainer.addChild(this.buildingsLayer);
		this.rootContainer.addChild(this.unitsLayer);
		this.rootContainer.addChild(this.projectilesLayer);
		this.rootContainer.addChild(this.uiLayer);

		this.setupInteraction(canvas);
		this.drawStaticTerrain();

		this.app.ticker.add(() => {
			if (!this.isDestroyed) {
				this.render();
			}
		});
	}

	private setupInteraction(canvas: HTMLCanvasElement): void {
		canvas.addEventListener('mousemove', (e) => {
			const rect = canvas.getBoundingClientRect();
			const scaleX = ARENA_WIDTH / rect.width;
			const scaleY = ARENA_HEIGHT / rect.height;
			const mouseX = (e.clientX - rect.left) * scaleX;
			const mouseY = (e.clientY - rect.top) * scaleY;

			if (
				mouseX >= WEST_GRID_START_X &&
				mouseX <= WEST_GRID_START_X + 3 * CELL_SIZE &&
				mouseY >= WEST_GRID_START_Y &&
				mouseY <= WEST_GRID_START_Y + 8 * CELL_SIZE
			) {
				const tileX = Math.floor((mouseX - WEST_GRID_START_X) / CELL_SIZE);
				const tileY = Math.floor((mouseY - WEST_GRID_START_Y) / CELL_SIZE);
				this.hoveredTile = { x: tileX, y: tileY };
			} else {
				this.hoveredTile = null;
			}
		});

		canvas.addEventListener('mouseleave', () => {
			this.hoveredTile = null;
		});

		canvas.addEventListener('click', (e: MouseEvent) => {
			const rect = canvas.getBoundingClientRect();
			const scaleX = ARENA_WIDTH / rect.width;
			const scaleY = ARENA_HEIGHT / rect.height;
			const mouseX = (e.clientX - rect.left) * scaleX;
			const mouseY = (e.clientY - rect.top) * scaleY;

			for (const coin of this.sim.goldCoins) {
				const dx = mouseX - coin.x;
				const dy = mouseY - coin.y;
				if (dx * dx + dy * dy <= 28 * 28) {
					this.sim.collectCoin(coin.id, 'west');
					return;
				}
			}

			if (this.hoveredTile) {
				this.onTileClick(this.hoveredTile.x, this.hoveredTile.y);
			}
		});
	}

	private drawStaticTerrain(): void {
		const g = this.terrainLayer;
		g.clear();

		// 1. Vast Battlefield Grass Ground
		g.rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
		g.fill({ color: 0x141e17 });

		// 2. West Base Territory
		g.rect(0, 0, 340, ARENA_HEIGHT);
		g.fill({ color: 0x142034, alpha: 0.8 });

		// 3. East Base Territory
		g.rect(ARENA_WIDTH - 340, 0, 340, ARENA_HEIGHT);
		g.fill({ color: 0x2b1515, alpha: 0.8 });

		// 4. Central River (X = 1200)
		const riverX = ARENA_WIDTH / 2;
		g.rect(riverX - 60, 0, 120, ARENA_HEIGHT);
		g.fill({ color: 0x0c1424 });

		// Deep water center
		g.rect(riverX - 30, 0, 60, ARENA_HEIGHT);
		g.fill({ color: 0x0369a1, alpha: 0.3 });

		// 5. Impassable Central Ridge / Mountain Dividing Lanes
		const ridgeY = (TOP_LANE_Y + BOTTOM_LANE_Y) / 2;
		g.roundRect(380, ridgeY - 60, ARENA_WIDTH - 760, 120, 16);
		g.fill({ color: 0x0f1720, alpha: 0.85 });
		g.stroke({ color: 0x334155, width: 2 });

		// 6. Stone Roads for Top and Bottom Lanes (1700px length)
		this.drawLaneRoad(g, TOP_LANE_Y);
		this.drawLaneRoad(g, BOTTOM_LANE_Y);

		// 7. Stone Bridges across the River
		this.drawBridge(g, riverX, TOP_LANE_Y);
		this.drawBridge(g, riverX, BOTTOM_LANE_Y);

		// 8. Outer Border
		g.rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
		g.stroke({ color: 0x334155, width: 5 });
	}

	private drawLaneRoad(g: Graphics, laneY: number): void {
		const roadHeight = 64;
		const roadStartX = 300;
		const roadEndX = ARENA_WIDTH - 300;

		// Road pavement
		g.rect(roadStartX, laneY - roadHeight / 2, roadEndX - roadStartX, roadHeight);
		g.fill({ color: 0x242427, alpha: 0.95 });

		// Road edge borders
		g.moveTo(roadStartX, laneY - roadHeight / 2);
		g.lineTo(roadEndX, laneY - roadHeight / 2);
		g.stroke({ color: 0x52525b, width: 2 });

		g.moveTo(roadStartX, laneY + roadHeight / 2);
		g.lineTo(roadEndX, laneY + roadHeight / 2);
		g.stroke({ color: 0x52525b, width: 2 });

		// Center road dashed divider
		g.moveTo(roadStartX, laneY);
		g.lineTo(roadEndX, laneY);
		g.stroke({ color: 0x3f3f46, width: 1 });
	}

	private drawBridge(g: Graphics, centerX: number, laneY: number): void {
		const bridgeW = 140;
		const bridgeH = 74;
		g.rect(centerX - bridgeW / 2, laneY - bridgeH / 2, bridgeW, bridgeH);
		g.fill({ color: 0x475569 });
		g.stroke({ color: 0x94a3b8, width: 3 });

		// Railings
		g.rect(centerX - bridgeW / 2, laneY - bridgeH / 2 - 4, bridgeW, 4);
		g.fill({ color: 0x64748b });
		g.rect(centerX - bridgeW / 2, laneY + bridgeH / 2, bridgeW, 4);
		g.fill({ color: 0x64748b });
	}

	public render(): void {
		this.drawGridLayer();
		this.drawBuildingsLayer();
		this.drawUnitsLayer();
		this.drawCoinsLayer();
		this.drawCastles();
		this.drawProjectilesLayer();
		this.drawRescueStrikeEffects();
	}

	private drawCoinsLayer(): void {
		const g = this.projectilesLayer;
		for (const coin of this.sim.goldCoins) {
			const pulse = 1 + Math.sin(this.sim.gameTime * 7) * 0.15;
			const radius = 9 * pulse;

			// Ambient Glow
			g.circle(coin.x, coin.y, radius + 4);
			g.fill({ color: 0xfbbf24, alpha: 0.25 });

			// Main Coin Body
			g.circle(coin.x, coin.y, radius);
			g.fill({ color: 0xf59e0b });
			g.stroke({ color: 0xfef08a, width: 2 });

			// Inner Coin Center
			g.circle(coin.x, coin.y, radius * 0.4);
			g.fill({ color: 0xfef08a });
		}
	}

	private drawGridLayer(): void {
		const g = this.gridLayer;
		g.clear();

		// West Grid (Player Base)
		for (let x = 0; x < 3; x++) {
			for (let y = 0; y < 8; y++) {
				const px = WEST_GRID_START_X + x * CELL_SIZE;
				const py = WEST_GRID_START_Y + y * CELL_SIZE;

				g.rect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);
				g.fill({ color: 0x1e293b, alpha: 0.5 });
				g.stroke({ color: 0x3b82f6, width: 1, alpha: 0.35 });
			}
		}

		// East Grid (Enemy / Bot Base)
		for (let x = 0; x < 3; x++) {
			for (let y = 0; y < 8; y++) {
				const px = EAST_GRID_START_X + x * CELL_SIZE;
				const py = EAST_GRID_START_Y + y * CELL_SIZE;

				g.rect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);
				g.fill({ color: 0x2e1818, alpha: 0.45 });
				g.stroke({ color: 0xef4444, width: 1, alpha: 0.3 });
			}
		}

		// Hover Highlight on West grid
		if (this.hoveredTile) {
			const px = WEST_GRID_START_X + this.hoveredTile.x * CELL_SIZE;
			const py = WEST_GRID_START_Y + this.hoveredTile.y * CELL_SIZE;
			const isOccupied = this.sim.buildings.some(
				(b) =>
					b.team === 'west' && b.tileX === this.hoveredTile!.x && b.tileY === this.hoveredTile!.y
			);

			g.rect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);
			g.fill({ color: isOccupied ? 0xef4444 : 0x10b981, alpha: 0.35 });
			g.stroke({ color: isOccupied ? 0xef4444 : 0x10b981, width: 2 });
		}
	}

	private drawBuildingsLayer(): void {
		const g = this.buildingsLayer;
		g.clear();

		const selectedPlacedId = this.getSelectedPlacedBuildingId?.();

		for (const b of this.sim.buildings) {
			const px = b.x;
			const py = b.y;
			const isWest = b.team === 'west';
			const isSelected = selectedPlacedId === b.instanceId;

			// Highlight halo for selected building
			if (isSelected) {
				g.roundRect(px - 1, py - 1, CELL_SIZE + 2, CELL_SIZE + 2, 8);
				g.stroke({ color: 0xf59e0b, width: 3 });
			}

			// Building base stone
			let baseColor = isWest ? 0x1d4ed8 : 0xb91c1c;
			let strokeColor = isSelected ? 0xfbbf24 : isWest ? 0x93c5fd : 0xfca5a5;

			if (b.specialType === 'treasure') {
				baseColor = 0xb45309;
				strokeColor = isSelected ? 0xfef08a : 0xfbbf24;
			} else if (b.specialType === 'repair') {
				baseColor = 0x047857;
				strokeColor = isSelected ? 0xa7f3d0 : 0x34d399;
			} else if (b.specialType === 'recycler') {
				baseColor = 0x334155;
				strokeColor = isSelected ? 0xe2e8f0 : 0x94a3b8;
			} else if (b.specialType === 'tower') {
				baseColor = isWest ? 0x4c1d95 : 0x701a75;
				strokeColor = isSelected ? 0xf5d0fe : 0xd8b4fe;
			}

			g.roundRect(px + 3, py + 3, CELL_SIZE - 6, CELL_SIZE - 6, 6);
			g.fill({ color: baseColor });
			g.stroke({ color: strokeColor, width: 2 });

			// Inner roof icon/block
			g.roundRect(px + 9, py + 9, CELL_SIZE - 18, CELL_SIZE - 18, 4);
			g.fill({ color: 0x0f172a, alpha: 0.85 });

			// Special insignia in center
			if (b.specialType === 'treasure') {
				g.rect(px + 18, py + 18, CELL_SIZE - 36, CELL_SIZE - 36);
				g.fill({ color: 0xfbbf24 });
			} else if (b.specialType === 'repair') {
				g.rect(px + 23, py + 17, 9, 21);
				g.fill({ color: 0x34d399 });
				g.rect(px + 17, py + 23, 21, 9);
				g.fill({ color: 0x34d399 });
			} else if (b.specialType === 'tower') {
				g.circle(px + CELL_SIZE / 2, py + CELL_SIZE / 2, 8);
				g.fill({ color: 0xc084fc });
				g.circle(px + CELL_SIZE / 2, py + CELL_SIZE / 2, 4);
				g.fill({ color: 0x3b0764 });
			}

			// Spawn or attack timer progress bar
			if (!b.specialType || b.specialType === 'repair' || b.specialType === 'tower') {
				const maxCd =
					b.specialType === 'repair'
						? 1.0
						: b.specialType === 'tower'
							? b.attackCooldown || 1.0
							: b.spawnCooldown;
				const currentTimer = b.specialType === 'tower' ? b.attackTimer || 0 : b.spawnTimer;
				const pct = Math.max(0, Math.min(1, 1 - currentTimer / maxCd));
				const barW = CELL_SIZE - 10;
				g.rect(px + 5, py + CELL_SIZE - 7, barW, 4);
				g.fill({ color: 0x334155 });
				g.rect(px + 5, py + CELL_SIZE - 7, barW * pct, 4);
				g.fill({
					color:
						b.specialType === 'tower' ? 0xa855f7 : b.specialType === 'repair' ? 0x10b981 : 0x38bdf8
				});
			}
		}
	}

	private drawCastles(): void {
		const g = this.buildingsLayer;

		// West Castle
		this.renderCastleStructure(g, this.sim.castles.west, true);

		// East Castle
		this.renderCastleStructure(g, this.sim.castles.east, false);
	}

	private renderCastleStructure(g: Graphics, castle: Castle, isWest: boolean): void {
		const cx = castle.x;
		const cy = castle.y;
		const castleW = 70;
		const castleH = 110;

		// Castle main keep
		g.roundRect(cx - castleW / 2, cy - castleH / 2, castleW, castleH, 10);
		g.fill({ color: isWest ? 0x1e3a8a : 0x7f1d1d });
		g.stroke({ color: isWest ? 0x60a5fa : 0xf87171, width: 3 });

		// Roof towers
		g.rect(cx - castleW / 2 - 4, cy - castleH / 2 - 14, 16, 18);
		g.fill({ color: 0x334155 });
		g.rect(cx + castleW / 2 - 12, cy - castleH / 2 - 14, 16, 18);
		g.fill({ color: 0x334155 });

		// Castle Gate
		g.roundRect(cx - 14, cy + castleH / 2 - 32, 28, 32, 4);
		g.fill({ color: 0x0f172a });

		// Castle HP Bar
		const hpPct = Math.max(0, castle.hp / castle.maxHp);
		const barWidth = 110;
		const barHeight = 9;
		const barX = cx - barWidth / 2;
		const barY = cy - castleH / 2 - 28;

		g.rect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
		g.fill({ color: 0x0f172a });

		g.rect(barX, barY, barWidth * hpPct, barHeight);
		g.fill({ color: hpPct > 0.5 ? 0x22c55e : hpPct > 0.25 ? 0xeab308 : 0xef4444 });

		// Azure Dome Invulnerability Forcefield
		if (this.sim.castleInvulnerableTimer[castle.team] > 0) {
			g.circle(cx, cy, 80);
			g.fill({ color: 0x06b6d4, alpha: 0.25 });
			g.stroke({ color: 0x38bdf8, width: 3, alpha: 0.85 });

			g.circle(cx, cy, 95);
			g.stroke({ color: 0x67e8f9, width: 1.5, alpha: 0.5 });
		}
	}

	private drawUnitsLayer(): void {
		const g = this.unitsLayer;
		g.clear();

		for (const u of this.sim.units) {
			if (u.state === 'DEAD') continue;

			const isWest = u.team === 'west';
			const isNeutral = u.team === 'neutral';
			const radius = u.size;

			// If flying, draw subtle shadow on the ground
			if (u.flying) {
				g.ellipse(u.x, u.y + 16, radius, radius * 0.4);
				g.fill({ color: 0x000000, alpha: 0.3 });
			}

			// If neutral boss, draw glowing aura
			if (isNeutral) {
				g.circle(u.x, u.y, radius + 5);
				g.stroke({ color: 0xf59e0b, width: 2, alpha: 0.7 });
			}

			// Unit circle body
			g.circle(u.x, u.y, radius);
			g.fill({ color: isNeutral ? 0x7e22ce : isWest ? 0x2563eb : 0xdc2626 });
			g.stroke({
				color: isNeutral ? 0xfbbf24 : isWest ? 0xbfdbfe : 0xfecaca,
				width: isNeutral ? 3 : 2
			});

			// Unit Inner Emblem based on Attack Type
			this.renderUnitEmblem(g, u.x, u.y, u.attackType, radius);

			// Direction arrow (for normal units)
			if (!isNeutral) {
				const dir = isWest ? 1 : -1;
				g.moveTo(u.x + dir * (radius + 2), u.y);
				g.lineTo(u.x + dir * (radius - 4), u.y - 4);
				g.lineTo(u.x + dir * (radius - 4), u.y + 4);
				g.fill({ color: 0xffffff });
			}

			// Health Bar
			const hpPct = Math.max(0, u.hp / u.maxHp);
			const barW = isNeutral ? radius * 2.8 : radius * 2.2;
			const barH = isNeutral ? 5 : 3;
			const barX = u.x - barW / 2;
			const barY = u.y - radius - (isNeutral ? 11 : 7);

			g.rect(barX - 1, barY - 1, barW + 2, barH + 2);
			g.fill({ color: 0x000000, alpha: 0.8 });

			g.rect(barX, barY, barW * hpPct, barH);
			g.fill({
				color: isNeutral ? 0xf59e0b : hpPct > 0.5 ? 0x4ade80 : hpPct > 0.25 ? 0xfacc15 : 0xf87171
			});
		}
	}

	private renderUnitEmblem(
		g: Graphics,
		x: number,
		y: number,
		attackType: string,
		radius: number
	): void {
		const r = radius * 0.45;
		if (attackType === 'pierce') {
			g.poly([x - r, y + r, x + r, y + r, x, y - r]);
			g.fill({ color: 0xfef08a });
		} else if (attackType === 'siege') {
			g.rect(x - r, y - r, r * 2, r * 2);
			g.fill({ color: 0xa1a1aa });
		} else if (attackType === 'magic') {
			g.poly([x, y - r, x + r, y, x, y + r, x - r, y]);
			g.fill({ color: 0xa855f7 });
		} else if (attackType === 'hero' || attackType === 'chaos') {
			g.rect(x - 2, y - r, 4, r * 2);
			g.fill({ color: 0xf59e0b });
			g.rect(x - r, y - 2, r * 2, 4);
			g.fill({ color: 0xf59e0b });
		} else {
			g.circle(x, y, r);
			g.fill({ color: 0xffffff, alpha: 0.85 });
		}
	}

	private drawProjectilesLayer(): void {
		const g = this.projectilesLayer;
		g.clear();

		for (const p of this.sim.projectiles) {
			if (p.damage <= 0) continue;

			if (p.attackType === 'magic') {
				g.circle(p.x, p.y, 5);
				g.fill({ color: 0xc084fc });
				g.circle(p.x, p.y, 10);
				g.fill({ color: 0xa855f7, alpha: 0.35 });
			} else if (p.attackType === 'siege') {
				g.circle(p.x, p.y, 6);
				g.fill({ color: 0x71717a });
				g.stroke({ color: 0x3f3f46, width: 2 });
			} else {
				const isWest = p.team === 'west';
				g.rect(p.x - 4, p.y - 1, 9, 2);
				g.fill({ color: isWest ? 0x93c5fd : 0xfca5a5 });
			}
		}

		for (const s of this.sim.splashEffects) {
			const progress = 1 - s.timer / s.maxTimer;
			const radius = s.radius * Math.min(1, progress * 1.2);
			const alpha = Math.max(0, 1 - progress);
			g.circle(s.x, s.y, radius);
			g.fill({ color: 0xf97316, alpha: alpha * 0.25 });
			g.stroke({ color: 0xfbbf24, width: 2, alpha });
		}
	}

	private drawRescueStrikeEffects(): void {
		const g = this.projectilesLayer;
		for (const eff of this.sim.rescueStrikeEffects) {
			const progress = 1 - eff.timer / eff.maxTimer;
			const currentRadius = eff.radius * Math.min(1, progress * 1.3);
			const alpha = Math.max(0, 1 - progress);

			g.circle(eff.x, eff.y, currentRadius);
			g.fill({ color: 0xf97316, alpha: alpha * 0.18 });
			g.stroke({ color: 0xef4444, width: 4 * (1 - progress) + 1, alpha });

			g.circle(eff.x, eff.y, currentRadius * 0.7);
			g.stroke({ color: 0xfbbf24, width: 2, alpha });
		}
	}

	public destroy(): void {
		this.isDestroyed = true;
		this.app.destroy(true, { children: true });
	}
}
