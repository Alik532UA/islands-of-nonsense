import 'pixi.js/unsafe-eval';
import { Application, Container, Graphics } from 'pixi.js';
import type { Simulation } from '../engine/simulation';
import type { Castle } from '../engine/types';
import { getBuilding, isLegendaryBuilding } from '../engine/gameData';
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

export type SelectedEntity =
	| { type: 'worker' }
	| { type: 'building'; instanceId: string }
	| { type: 'unit'; instanceId: string }
	| null;

export interface RendererOptions {
	canvas: HTMLCanvasElement;
	sim: Simulation;
	onTileClick: (tileX: number, tileY: number) => void;
	onSelectEntity?: (entity: SelectedEntity) => void;
	getSelectedEntity?: () => SelectedEntity;
	getSelectedBuildingDefId: () => string | null;
	getSelectedPlacedBuildingId?: () => string | null;
}

export class ArenaRenderer {
	private app: Application;
	private sim: Simulation;
	private onTileClick: (tileX: number, tileY: number) => void;
	private onSelectEntity?: (entity: SelectedEntity) => void;
	private getSelectedEntity?: () => SelectedEntity;
	private getSelectedBuildingDefId: () => string | null;
	private getSelectedPlacedBuildingId?: () => string | null;

	private rootContainer: Container;
	private terrainLayer: Graphics;
	private gridLayer: Graphics;
	private buildingsLayer: Graphics;
	private workersLayer: Graphics;
	private unitsLayer: Graphics;
	private projectilesLayer: Graphics;
	private uiLayer: Container;

	private hoveredTile: { x: number; y: number } | null = null;
	private isDestroyed = false;

	constructor(options: RendererOptions) {
		this.sim = options.sim;
		this.onTileClick = options.onTileClick;
		this.onSelectEntity = options.onSelectEntity;
		this.getSelectedEntity = options.getSelectedEntity;
		this.getSelectedBuildingDefId = options.getSelectedBuildingDefId;
		this.getSelectedPlacedBuildingId = options.getSelectedPlacedBuildingId;

		this.app = new Application();
		this.rootContainer = new Container();
		this.terrainLayer = new Graphics();
		this.gridLayer = new Graphics();
		this.buildingsLayer = new Graphics();
		this.workersLayer = new Graphics();
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
		this.rootContainer.addChild(this.workersLayer);
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

			// 1. Check gold coins
			for (const coin of this.sim.goldCoins) {
				const dx = mouseX - coin.x;
				const dy = mouseY - coin.y;
				if (dx * dx + dy * dy <= 28 * 28) {
					this.sim.collectCoin(coin.id, 'west');
					return;
				}
			}

			// 2. Check Player's Worker click
			const worker = this.sim.players.west?.worker;
			if (worker) {
				const wDist = Math.hypot(mouseX - worker.x, mouseY - worker.y);
				if (wDist <= 32) {
					this.onSelectEntity?.({ type: 'worker' });
					return;
				}
			}

			// 3. Check fighting unit click
			for (const u of this.sim.units) {
				if (u.state === 'DEAD') continue;
				const dist = Math.hypot(mouseX - u.x, mouseY - u.y);
				if (dist <= u.size + 10) {
					this.onSelectEntity?.({ type: 'unit', instanceId: u.instanceId });
					return;
				}
			}

			// 4. Check placed buildings click
			for (const b of this.sim.buildings) {
				if (
					mouseX >= b.x &&
					mouseX <= b.x + CELL_SIZE &&
					mouseY >= b.y &&
					mouseY <= b.y + CELL_SIZE
				) {
					this.onSelectEntity?.({ type: 'building', instanceId: b.instanceId });
					return;
				}
			}

			// 5. If building placement mode active
			if (this.getSelectedBuildingDefId()) {
				if (this.hoveredTile) {
					this.onTileClick(this.hoveredTile.x, this.hoveredTile.y);
				}
				return;
			}

			// 6. Click on base territory -> move worker and keep worker selected
			if (mouseX <= 420) {
				this.sim.moveWorker('west', mouseX, mouseY);
				this.onSelectEntity?.({ type: 'worker' });
			}
		});
	}

	private drawStaticTerrain(): void {
		const g = this.terrainLayer;
		g.clear();

		// 1. Vast Lush Summer Grass Ground (WC3 Lordaeron Summer Palette)
		g.rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
		g.fill({ color: 0x2d6323 });

		// Subtle textured grass patches
		for (let x = 60; x < ARENA_WIDTH; x += 180) {
			for (let y = 60; y < ARENA_HEIGHT; y += 140) {
				const isSunny = (x + y) % 360 === 0;
				g.ellipse(x + 40, y + 20, 60, 35);
				g.fill({ color: isSunny ? 0x3a7e2b : 0x24551d, alpha: 0.75 });
			}
		}

		// Scattered wild grass tufts
		for (let i = 0; i < 60; i++) {
			const tx = ((i * 397) % (ARENA_WIDTH - 200)) + 100;
			const ty = ((i * 263) % (ARENA_HEIGHT - 120)) + 60;
			g.moveTo(tx - 4, ty + 4);
			g.lineTo(tx - 2, ty - 6);
			g.stroke({ color: 0x4ade80, width: 1.5, alpha: 0.6 });
			g.moveTo(tx, ty + 4);
			g.lineTo(tx + 3, ty - 5);
			g.stroke({ color: 0x22c55e, width: 1.5, alpha: 0.6 });
		}

		// 2. West Base Territory Paved Court
		g.rect(0, 0, 350, ARENA_HEIGHT);
		g.fill({ color: 0x273b52, alpha: 0.45 });

		// 3. East Base Territory Court
		g.rect(ARENA_WIDTH - 350, 0, 350, ARENA_HEIGHT);
		g.fill({ color: 0x422121, alpha: 0.45 });

		// 4. Central River (X = 1200)
		const riverX = ARENA_WIDTH / 2;
		const riverW = 140;
		// Outer river bank / sand
		g.rect(riverX - riverW / 2 - 10, 0, riverW + 20, ARENA_HEIGHT);
		g.fill({ color: 0x443b2a, alpha: 0.9 });

		// Flowing Water
		g.rect(riverX - riverW / 2, 0, riverW, ARENA_HEIGHT);
		g.fill({ color: 0x0284c7 });

		// Deep water center channel
		g.rect(riverX - 35, 0, 70, ARENA_HEIGHT);
		g.fill({ color: 0x1d4ed8 });

		// Foam ripples at riverbanks
		for (let y = 15; y < ARENA_HEIGHT; y += 45) {
			g.moveTo(riverX - riverW / 2 + 3, y);
			g.lineTo(riverX - riverW / 2 + 12, y + 15);
			g.stroke({ color: 0x93c5fd, width: 2, alpha: 0.8 });

			g.moveTo(riverX + riverW / 2 - 3, y + 20);
			g.lineTo(riverX + riverW / 2 - 12, y + 35);
			g.stroke({ color: 0x93c5fd, width: 2, alpha: 0.8 });
		}

		// 5. Cobblestone Roads for Top and Bottom Lanes
		this.drawLaneRoad(g, TOP_LANE_Y);
		this.drawLaneRoad(g, BOTTOM_LANE_Y);

		// 6. Arched Bridges across the River
		this.drawBridge(g, riverX, TOP_LANE_Y);
		this.drawBridge(g, riverX, BOTTOM_LANE_Y);

		// 7. Authentic Warcraft III Stone Ramparts & Battlements with Crenellations
		// Center Dividing Mountain Rampart
		const ridgeY = (TOP_LANE_Y + BOTTOM_LANE_Y) / 2;
		this.drawBattlementWall(g, 400, ridgeY - 35, ARENA_WIDTH - 800, 70);

		// Top Arena Perimeter Battlement Wall
		this.drawBattlementWall(g, 20, 25, ARENA_WIDTH - 40, 36);

		// Bottom Arena Perimeter Battlement Wall (Matches reference screenshot!)
		this.drawBattlementWall(g, 20, ARENA_HEIGHT - 65, ARENA_WIDTH - 40, 42);

		// Outer Border
		g.rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
		g.stroke({ color: 0x1e293b, width: 6 });
	}

	private drawBattlementWall(g: Graphics, x: number, y: number, w: number, h: number): void {
		// Wall base shadow
		g.rect(x - 2, y + h, w + 4, 6);
		g.fill({ color: 0x000000, alpha: 0.35 });

		// Wall main stone body
		g.rect(x, y + 10, w, h - 10);
		g.fill({ color: 0x64748b });
		g.stroke({ color: 0x334155, width: 1.5 });

		// Horizontal stone masonry layers
		for (let rowY = y + 22; rowY < y + h; rowY += 14) {
			g.moveTo(x, rowY);
			g.lineTo(x + w, rowY);
			g.stroke({ color: 0x475569, width: 1 });
		}

		// Stone wall parapet ledge / coping
		g.rect(x - 4, y + 8, w + 8, 5);
		g.fill({ color: 0x94a3b8 });
		g.stroke({ color: 0x334155, width: 1 });

		// Battlement Crenellations (Teeth along the wall top)
		const toothW = 24;
		const gapW = 16;
		const step = toothW + gapW;
		const count = Math.floor(w / step);

		for (let i = 0; i < count; i++) {
			const tx = x + 4 + i * step;
			g.rect(tx, y, toothW, 10);
			g.fill({ color: 0x94a3b8 });
			g.stroke({ color: 0x334155, width: 1.5 });

			// Inner tooth face highlight
			g.rect(tx + 2, y + 2, toothW - 4, 3);
			g.fill({ color: 0xcfdbe8 });

			// Green moss creeping on random stones
			if ((i * 7) % 3 === 0) {
				g.rect(tx + 4, y + 5, 8, 4);
				g.fill({ color: 0x4d7c0f, alpha: 0.65 });
			}
		}
	}

	private drawLaneRoad(g: Graphics, laneY: number): void {
		const roadHeight = 70;
		const roadStartX = 300;
		const roadEndX = ARENA_WIDTH - 300;
		const roadWidth = roadEndX - roadStartX;

		// Stone curb shadow
		g.rect(roadStartX, laneY - roadHeight / 2 - 3, roadWidth, roadHeight + 6);
		g.fill({ color: 0x1e293b, alpha: 0.3 });

		// Cobblestone pavement ground
		g.rect(roadStartX, laneY - roadHeight / 2, roadWidth, roadHeight);
		g.fill({ color: 0x6e5c46 });

		// Light stone curb slabs on both edges
		g.rect(roadStartX, laneY - roadHeight / 2 - 2, roadWidth, 4);
		g.fill({ color: 0x94a3b8 });
		g.rect(roadStartX, laneY + roadHeight / 2 - 2, roadWidth, 4);
		g.fill({ color: 0x94a3b8 });

		// Subtle cobblestone paver pattern
		for (let px = roadStartX + 20; px < roadEndX; px += 35) {
			g.moveTo(px, laneY - roadHeight / 2 + 4);
			g.lineTo(px, laneY + roadHeight / 2 - 4);
			g.stroke({ color: 0x554734, width: 1, alpha: 0.6 });
		}

		// Center road dashed divider
		for (let px = roadStartX + 10; px < roadEndX; px += 40) {
			g.moveTo(px, laneY);
			g.lineTo(px + 18, laneY);
			g.stroke({ color: 0x8c785b, width: 2, alpha: 0.75 });
		}
	}

	private drawBridge(g: Graphics, centerX: number, laneY: number): void {
		const bridgeW = 150;
		const bridgeH = 82;

		// Bridge shadow
		g.rect(centerX - bridgeW / 2, laneY - bridgeH / 2 + 4, bridgeW, bridgeH);
		g.fill({ color: 0x000000, alpha: 0.35 });

		// Wooden floorboards base
		g.rect(centerX - bridgeW / 2, laneY - bridgeH / 2, bridgeW, bridgeH);
		g.fill({ color: 0x78350f });
		g.stroke({ color: 0x451a03, width: 2 });

		// Floorboard planks
		for (let bx = centerX - bridgeW / 2 + 10; bx < centerX + bridgeW / 2; bx += 12) {
			g.moveTo(bx, laneY - bridgeH / 2);
			g.lineTo(bx, laneY + bridgeH / 2);
			g.stroke({ color: 0x451a03, width: 1 });
		}

		// Stone Guard Railings
		g.rect(centerX - bridgeW / 2, laneY - bridgeH / 2 - 5, bridgeW, 7);
		g.fill({ color: 0x64748b });
		g.stroke({ color: 0x94a3b8, width: 1.5 });

		g.rect(centerX - bridgeW / 2, laneY + bridgeH / 2 - 2, bridgeW, 7);
		g.fill({ color: 0x64748b });
		g.stroke({ color: 0x94a3b8, width: 1.5 });

		// Bridge corner stone pillars
		const pillars = [
			{ x: centerX - bridgeW / 2, y: laneY - bridgeH / 2 - 6 },
			{ x: centerX + bridgeW / 2 - 10, y: laneY - bridgeH / 2 - 6 },
			{ x: centerX - bridgeW / 2, y: laneY + bridgeH / 2 - 3 },
			{ x: centerX + bridgeW / 2 - 10, y: laneY + bridgeH / 2 - 3 }
		];
		for (const p of pillars) {
			g.rect(p.x, p.y, 10, 10);
			g.fill({ color: 0x94a3b8 });
			g.stroke({ color: 0x334155, width: 1 });
		}
	}

	public render(): void {
		this.drawGridLayer();
		this.drawBuildingsLayer();
		this.drawWorkersLayer();
		this.drawUnitsLayer();
		this.drawCoinsLayer();
		this.drawCastles();
		this.drawProjectilesLayer();
		this.drawRescueStrikeEffects();
		this.drawSelectionHighlights();
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

			// Inner roof icon/block with race color tinting
			const raceColors: Record<string, number> = {
				Люди: 0x1e3a8a,
				Орки: 0x831843,
				Нежить: 0x14532d,
				Эльфы: 0x065f46,
				Хаос: 0x7f1d1d,
				Наги: 0x0e7490,
				Север: 0x0369a1,
				Порча: 0x581c87,
				'Ночные эльфы': 0x365314,
				Техники: 0x78350f,
				Сборщики: 0x334155
			};
			const roofColor = raceColors[b.race] || 0x0f172a;
			g.roundRect(px + 9, py + 9, CELL_SIZE - 18, CELL_SIZE - 18, 4);
			g.fill({ color: roofColor, alpha: 0.9 });

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

			// Legendary Apex Badge
			const bDef = getBuilding(b.defId);
			const isLeg = isLegendaryBuilding(bDef);
			if (isLeg) {
				g.poly([
					px + CELL_SIZE / 2,
					py + 4,
					px + CELL_SIZE / 2 + 5,
					py + 9,
					px + CELL_SIZE / 2,
					py + 14,
					px + CELL_SIZE / 2 - 5,
					py + 9
				]);
				g.fill({ color: 0xfbbf24 });
				g.stroke({ color: 0xfef08a, width: 1 });
			}

			// Spawn or attack timer progress bar above building
			if (!b.specialType || b.specialType === 'repair' || b.specialType === 'tower') {
				const maxCd =
					b.specialType === 'repair'
						? 1.0
						: b.specialType === 'tower'
							? b.attackCooldown || 1.0
							: b.spawnCooldown;
				const currentTimer = b.specialType === 'tower' ? b.attackTimer || 0 : b.spawnTimer;
				const pct = Math.max(0, Math.min(1, 1 - currentTimer / maxCd));

				const barX = px + 4;
				const barY = py - 7;
				const barW = CELL_SIZE - 8;
				const barH = 5;

				// Background container with dark border
				g.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 2);
				g.fill({ color: 0x090d16 });
				g.stroke({ color: 0x334155, width: 1 });

				// Bar fill color
				let fillColor = 0x38bdf8; // Azure spawner
				if (isLeg) {
					fillColor = 0xfbbf24; // Legendary gold
				} else if (b.specialType === 'tower') {
					fillColor = 0xa855f7; // Tower purple
				} else if (b.specialType === 'repair') {
					fillColor = 0x10b981; // Repair green
				}

				if (pct > 0) {
					g.roundRect(barX, barY, barW * pct, barH, 1.5);
					g.fill({ color: fillColor });
				}

				// Flash highlight when imminent spawn (pct > 0.9)
				if (pct > 0.9 && !b.specialType) {
					const pulse = 0.5 + Math.sin(this.sim.gameTime * 20) * 0.5;
					g.roundRect(barX + barW * pct - 3, barY, 3, barH, 1);
					g.fill({ color: 0xffffff, alpha: pulse });
				}
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

			// If flying, draw subtle shadow on the ground & wings
			if (u.flying) {
				g.ellipse(u.x, u.y + 16, radius, radius * 0.4);
				g.fill({ color: 0x000000, alpha: 0.3 });

				const flap = Math.sin(this.sim.gameTime * 15) * 3;
				g.poly([
					u.x - radius - 5,
					u.y - 2 + flap,
					u.x - radius,
					u.y - radius * 0.5,
					u.x - radius,
					u.y + radius * 0.5
				]);
				g.fill({ color: 0xe0f2fe, alpha: 0.85 });
				g.poly([
					u.x + radius + 5,
					u.y - 2 + flap,
					u.x + radius,
					u.y - radius * 0.5,
					u.x + radius,
					u.y + radius * 0.5
				]);
				g.fill({ color: 0xe0f2fe, alpha: 0.85 });
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

			// Status Effects Visuals
			if (u.isStunned) {
				const angle = this.sim.gameTime * 8;
				const starX = u.x + Math.cos(angle) * (radius + 2);
				const starY = u.y - radius - 2 + Math.sin(angle) * 3;
				g.circle(starX, starY, 3);
				g.fill({ color: 0xfacc15 });
			}

			if (u.isEnsnared) {
				g.rect(u.x - radius, u.y - radius, radius * 2, radius * 2);
				g.stroke({ color: 0xd97706, width: 1.5, alpha: 0.85 });
			}

			if (u.buffs?.some((b) => b.type === 'poison')) {
				g.circle(u.x + Math.sin(this.sim.gameTime * 6) * 6, u.y - radius - 3, 2.5);
				g.fill({ color: 0x22c55e });
			}

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

	private drawWorkersLayer(): void {
		const g = this.workersLayer;
		g.clear();

		const selectedEntity = this.getSelectedEntity?.() || { type: 'worker' };
		const isWorkerSelected = selectedEntity.type === 'worker';

		// 1. West Player's Worker ("Північний будівельник" / Race Builder)
		const westWorker = this.sim.players.west?.worker;
		if (westWorker) {
			const wx = westWorker.x;
			const wy = westWorker.y;
			const bob = Math.sin(this.sim.gameTime * 5) * 1.5;

			// Warcraft III Selection Circle at Worker's Feet (Neon Green)
			if (isWorkerSelected) {
				const pulse = 0.8 + Math.sin(this.sim.gameTime * 6) * 0.2;
				g.ellipse(wx, wy + 14, 20, 10);
				g.stroke({ color: 0x22c55e, width: 2.5, alpha: pulse });
				g.ellipse(wx, wy + 14, 23, 11.5);
				g.stroke({ color: 0x4ade80, width: 1, alpha: pulse * 0.5 });

				// 4 Corner Selection Tick Brackets
				const ang = this.sim.gameTime * 2;
				for (let a = 0; a < 4; a++) {
					const curAng = ang + (a * Math.PI) / 2;
					const bx = wx + Math.cos(curAng) * 22;
					const by = wy + 14 + Math.sin(curAng) * 11;
					g.circle(bx, by, 2);
					g.fill({ color: 0x86efac });
				}
			}

			// Peasant Shadow
			g.ellipse(wx, wy + 14, 16, 7);
			g.fill({ color: 0x000000, alpha: 0.35 });

			// Worker Body & Blue Tunic
			g.roundRect(wx - 8, wy - 4 + bob, 16, 16, 4);
			g.fill({ color: 0x2563eb }); // Royal blue tunic
			g.stroke({ color: 0x60a5fa, width: 1.5 });

			// Leather Belt & Buckle
			g.rect(wx - 7, wy + 6 + bob, 14, 3);
			g.fill({ color: 0x78350f });
			g.rect(wx - 2, wy + 5.5 + bob, 4, 4);
			g.fill({ color: 0xfbbf24 });

			// Head & Face
			g.circle(wx, wy - 10 + bob, 7);
			g.fill({ color: 0xfcd34d }); // Skin tone
			g.stroke({ color: 0xd97706, width: 1 });

			// Hair / Headband (WC3 Peasant look)
			g.arc(wx, wy - 11 + bob, 7, Math.PI, 0);
			g.fill({ color: 0x451a03 });

			// Eyes
			g.rect(wx + 1, wy - 11 + bob, 2, 2);
			g.fill({ color: 0x1e293b });

			// Construction Hammer / Mallet in Hand
			const isSwinging = westWorker.isBuilding;
			const hammerSwing = isSwinging ? Math.sin(this.sim.gameTime * 16) * 12 : 0;
			const hx = wx + 10;
			const hy = wy + bob - 2 + hammerSwing;

			// Hammer Handle
			g.moveTo(hx - 2, hy + 8);
			g.lineTo(hx + 4, hy - 4);
			g.stroke({ color: 0x92400e, width: 2.5 });

			// Hammer Iron Head
			g.rect(hx + 1, hy - 7, 7, 5);
			g.fill({ color: 0x94a3b8 });
			g.stroke({ color: 0x475569, width: 1 });

			// Spark particles if building
			if (isSwinging) {
				const spX = hx + 5 + Math.sin(this.sim.gameTime * 30) * 6;
				const spY = hy + Math.cos(this.sim.gameTime * 30) * 6;
				g.circle(spX, spY, 2);
				g.fill({ color: 0xfef08a });
			}

			// Small Health bar above worker
			const hpBarW = 32;
			const hpBarH = 4;
			g.rect(wx - hpBarW / 2 - 1, wy - 22 + bob, hpBarW + 2, hpBarH + 2);
			g.fill({ color: 0x000000, alpha: 0.8 });
			g.rect(wx - hpBarW / 2, wy - 21 + bob, hpBarW, hpBarH);
			g.fill({ color: 0x22c55e });
		}

		// 2. East Enemy Worker (Orc / Red Builder)
		const eastWorker = this.sim.players.east?.worker;
		if (eastWorker) {
			const ex = eastWorker.x;
			const ey = eastWorker.y;
			const bob = Math.sin(this.sim.gameTime * 4.5) * 1.5;

			// Shadow
			g.ellipse(ex, ey + 14, 16, 7);
			g.fill({ color: 0x000000, alpha: 0.35 });

			// Body & Crimson Tunic
			g.roundRect(ex - 8, ey - 4 + bob, 16, 16, 4);
			g.fill({ color: 0x991b1b });
			g.stroke({ color: 0xf87171, width: 1.5 });

			// Head (Orc Green skin)
			g.circle(ex, ey - 10 + bob, 7);
			g.fill({ color: 0x15803d });
			g.stroke({ color: 0x166534, width: 1 });

			// Hammer
			g.moveTo(ex - 8, ey + bob);
			g.lineTo(ex - 12, ey + bob - 8);
			g.stroke({ color: 0x78350f, width: 2.5 });
			g.rect(ex - 16, ey + bob - 11, 7, 5);
			g.fill({ color: 0x71717a });
		}
	}

	private drawSelectionHighlights(): void {
		const selectedEntity = this.getSelectedEntity?.() || { type: 'worker' };

		// Highlight selected unit if unit is selected
		if (selectedEntity.type === 'unit') {
			const u = this.sim.units.find((unit) => unit.instanceId === selectedEntity.instanceId);
			if (u && u.state !== 'DEAD') {
				const isWest = u.team === 'west';
				const color = u.team === 'neutral' ? 0xfbbf24 : isWest ? 0x22c55e : 0xef4444;
				const pulse = 0.8 + Math.sin(this.sim.gameTime * 8) * 0.2;

				this.workersLayer.ellipse(u.x, u.y + u.size * 0.6, u.size * 1.2, u.size * 0.6);
				this.workersLayer.stroke({ color, width: 2.5, alpha: pulse });

				// Brackets
				const ang = this.sim.gameTime * 2;
				for (let a = 0; a < 4; a++) {
					const curAng = ang + (a * Math.PI) / 2;
					const bx = u.x + Math.cos(curAng) * (u.size * 1.3);
					const by = u.y + u.size * 0.6 + Math.sin(curAng) * (u.size * 0.65);
					this.workersLayer.circle(bx, by, 2.5);
					this.workersLayer.fill({ color });
				}
			}
		}
	}

	public destroy(): void {
		this.isDestroyed = true;
		this.app.destroy(true, { children: true });
	}
}
