import 'pixi.js/unsafe-eval';
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
	CELL_SIZE
} from '../engine/simulation';
import { sound } from '../services/audio';

export type SelectedEntity =
	| { type: 'worker' }
	| { type: 'building'; instanceId: string }
	| { type: 'unit'; instanceId: string }
	| { type: 'group'; unitIds: string[] }
	| null;

export interface RendererOptions {
	canvas: HTMLCanvasElement;
	sim: Simulation;
	onTileClick: (tileX: number, tileY: number) => void;
	onSelectEntity?: (entity: SelectedEntity) => void;
	getSelectedEntity?: () => SelectedEntity;
	getSelectedBuildingDefId: () => string | null;
	getSelectedPlacedBuildingId?: () => string | null;
	onCameraChange?: (camX: number, camY: number, zoom: number) => void;
}

export class ArenaRenderer {
	private app: Application;
	public sim: Simulation;
	private onTileClick: (tileX: number, tileY: number) => void;
	private onSelectEntity?: (entity: SelectedEntity) => void;
	private getSelectedEntity?: () => SelectedEntity;
	private getSelectedBuildingDefId: () => string | null;
	private getSelectedPlacedBuildingId?: () => string | null;
	public onCameraChange?: (camX: number, camY: number, zoom: number) => void;

	// Viewport & RTS Camera Navigation
	public cameraX = 450;
	public cameraY = 400;
	public zoom = 1.05;
	public minZoom = 0.5;
	public maxZoom = 2.4;
	private isPanning = false;
	private panStartX = 0;
	private panStartY = 0;
	private panStartCamX = 0;
	private panStartCamY = 0;

	// Drag Box Multi-Selection
	private isBoxSelecting = false;
	private boxStartWorld: { x: number; y: number } | null = null;
	private boxCurrentWorld: { x: number; y: number } | null = null;

	// RTS Order Chevrons (RMB click marker)
	private moveMarkers: { x: number; y: number; timer: number; maxTimer: number }[] = [];

	// Fog of War
	public enableFog = true;

	// Layers
	private rootContainer: Container;
	private terrainLayer: Graphics;
	private gridLayer: Graphics;
	private buildingsLayer: Graphics;
	private coinsLayer: Graphics;
	private workersLayer: Graphics;
	private unitsLayer: Graphics;
	private projectilesLayer: Graphics;
	private fogLayer: Graphics;
	private uiLayer: Graphics;

	private hoveredTile: { x: number; y: number } | null = null;
	private isDestroyed = false;
	private canvasEl: HTMLCanvasElement | null = null;

	constructor(options: RendererOptions) {
		this.sim = options.sim;
		this.onTileClick = options.onTileClick;
		this.onSelectEntity = options.onSelectEntity;
		this.getSelectedEntity = options.getSelectedEntity;
		this.getSelectedBuildingDefId = options.getSelectedBuildingDefId;
		this.getSelectedPlacedBuildingId = options.getSelectedPlacedBuildingId;
		this.onCameraChange = options.onCameraChange;

		this.app = new Application();
		this.rootContainer = new Container();
		this.terrainLayer = new Graphics();
		this.gridLayer = new Graphics();
		this.buildingsLayer = new Graphics();
		this.coinsLayer = new Graphics();
		this.workersLayer = new Graphics();
		this.unitsLayer = new Graphics();
		this.projectilesLayer = new Graphics();
		this.fogLayer = new Graphics();
		this.uiLayer = new Graphics();
	}

	public setSimulation(newSim: Simulation): void {
		this.sim = newSim;
		this.enableFog = newSim.config.fogOfWar ?? true;
	}

	public async init(canvas: HTMLCanvasElement): Promise<void> {
		this.canvasEl = canvas;
		this.enableFog = this.sim.config.fogOfWar ?? true;
		const rect = canvas.getBoundingClientRect();
		const initWidth = Math.max(800, rect.width || window.innerWidth || 1200);
		const initHeight = Math.max(400, rect.height || window.innerHeight || 600);

		await this.app.init({
			canvas,
			width: initWidth,
			height: initHeight,
			backgroundColor: 0x090d16,
			resolution: window.devicePixelRatio || 1,
			autoDensity: true
		});

		this.app.stage.addChild(this.rootContainer);
		this.rootContainer.addChild(this.terrainLayer);
		this.rootContainer.addChild(this.gridLayer);
		this.rootContainer.addChild(this.buildingsLayer);
		this.rootContainer.addChild(this.coinsLayer);
		this.rootContainer.addChild(this.workersLayer);
		this.rootContainer.addChild(this.unitsLayer);
		this.rootContainer.addChild(this.projectilesLayer);
		this.rootContainer.addChild(this.fogLayer);
		this.rootContainer.addChild(this.uiLayer);

		this.setupInteraction(canvas);
		this.drawStaticTerrain();

		this.app.ticker.add(() => {
			if (!this.isDestroyed) {
				this.updateCamera();
				this.render();
			}
		});
	}

	public screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
		const screenW = this.app.screen.width;
		const screenH = this.app.screen.height;
		const worldX = (screenX - screenW / 2) / this.zoom + this.cameraX;
		const worldY = (screenY - screenH / 2) / this.zoom + this.cameraY;
		return { x: worldX, y: worldY };
	}

	public worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
		const screenW = this.app.screen.width;
		const screenH = this.app.screen.height;
		const screenX = (worldX - this.cameraX) * this.zoom + screenW / 2;
		const screenY = (worldY - this.cameraY) * this.zoom + screenH / 2;
		return { x: screenX, y: screenY };
	}

	public setCamera(x: number, y: number, zoom?: number): void {
		if (zoom !== undefined) {
			this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
		}
		const screenW = this.app?.screen?.width || 1200;
		const screenH = this.app?.screen?.height || 800;
		const halfW = screenW / (2 * this.zoom);
		const halfH = screenH / (2 * this.zoom);

		if (2 * halfW >= ARENA_WIDTH) {
			this.cameraX = ARENA_WIDTH / 2;
		} else {
			this.cameraX = Math.max(halfW, Math.min(ARENA_WIDTH - halfW, x));
		}

		if (2 * halfH >= ARENA_HEIGHT) {
			this.cameraY = ARENA_HEIGHT / 2;
		} else {
			this.cameraY = Math.max(halfH, Math.min(ARENA_HEIGHT - halfH, y));
		}

		this.onCameraChange?.(this.cameraX, this.cameraY, this.zoom);
	}

	private updateCamera(): void {
		if (this.canvasEl) {
			const rect = this.canvasEl.getBoundingClientRect();
			if (rect.width > 0 && rect.height > 0) {
				if (this.app.screen.width !== rect.width || this.app.screen.height !== rect.height) {
					this.app.renderer.resize(rect.width, rect.height);
				}
			}
		}

		const screenW = this.app.screen.width;
		const screenH = this.app.screen.height;
		const halfW = screenW / (2 * this.zoom);
		const halfH = screenH / (2 * this.zoom);

		if (2 * halfW >= ARENA_WIDTH) {
			this.cameraX = ARENA_WIDTH / 2;
		} else {
			this.cameraX = Math.max(halfW, Math.min(ARENA_WIDTH - halfW, this.cameraX));
		}

		if (2 * halfH >= ARENA_HEIGHT) {
			this.cameraY = ARENA_HEIGHT / 2;
		} else {
			this.cameraY = Math.max(halfH, Math.min(ARENA_HEIGHT - halfH, this.cameraY));
		}

		this.rootContainer.scale.set(this.zoom);
		this.rootContainer.position.set(
			-this.cameraX * this.zoom + screenW / 2,
			-this.cameraY * this.zoom + screenH / 2
		);
	}

	private setupInteraction(canvas: HTMLCanvasElement): void {
		canvas.addEventListener('contextmenu', (e) => {
			e.preventDefault();
		});

		// 1. Zoom with mouse wheel
		canvas.addEventListener(
			'wheel',
			(e: WheelEvent) => {
				e.preventDefault();
				const rect = canvas.getBoundingClientRect();
				const mouseScreenX = e.clientX - rect.left;
				const mouseScreenY = e.clientY - rect.top;

				// World pos before zoom
				const before = this.screenToWorld(mouseScreenX, mouseScreenY);

				const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
				const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * zoomFactor));

				this.zoom = newZoom;

				// Adjust camera so mouse point stays fixed
				const screenW = this.app.screen.width;
				const screenH = this.app.screen.height;
				this.cameraX = before.x - (mouseScreenX - screenW / 2) / this.zoom;
				this.cameraY = before.y - (mouseScreenY - screenH / 2) / this.zoom;

				this.cameraX = Math.max(100, Math.min(ARENA_WIDTH - 100, this.cameraX));
				this.cameraY = Math.max(100, Math.min(ARENA_HEIGHT - 100, this.cameraY));
				this.onCameraChange?.(this.cameraX, this.cameraY, this.zoom);
			},
			{ passive: false }
		);

		// 2. Mouse Down
		canvas.addEventListener('mousedown', (e: MouseEvent) => {
			const rect = canvas.getBoundingClientRect();
			const mouseScreenX = e.clientX - rect.left;
			const mouseScreenY = e.clientY - rect.top;
			const world = this.screenToWorld(mouseScreenX, mouseScreenY);

			// Middle-click Pan or Space+Drag
			if (e.button === 1 || (e.button === 0 && e.altKey)) {
				e.preventDefault();
				this.isPanning = true;
				this.panStartX = e.clientX;
				this.panStartY = e.clientY;
				this.panStartCamX = this.cameraX;
				this.panStartCamY = this.cameraY;
				return;
			}

			// RIGHT CLICK: Move Worker / Order Action / Repair
			if (e.button === 2) {
				e.preventDefault();

				// Spawn animated RTS order chevron
				this.moveMarkers.push({
					x: world.x,
					y: world.y,
					timer: 0.55,
					maxTimer: 0.55
				});
				sound.playWorkerAck();

				// Check if RMB clicked an injured friendly building or castle to repair
				const clickedBuilding = this.sim.buildings.find(
					(b) =>
						b.team === 'west' &&
						Math.abs(world.x - (b.x + CELL_SIZE / 2)) <= CELL_SIZE &&
						Math.abs(world.y - (b.y + CELL_SIZE / 2)) <= CELL_SIZE
				);
				const westCastle = this.sim.castles.west;
				const clickedCastle = Math.hypot(world.x - westCastle.x, world.y - westCastle.y) <= 80;

				if (clickedBuilding && clickedBuilding.hp < clickedBuilding.maxHp) {
					this.sim.repairBuilding('west', clickedBuilding.instanceId);
					return;
				} else if (clickedCastle && westCastle.hp < westCastle.maxHp) {
					this.sim.repairBuilding('west', 'castle_west');
					return;
				}

				// Otherwise regular move worker order
				this.sim.moveWorker('west', world.x, world.y);
				return;
			}

			// LEFT CLICK: Start box selection or click
			if (e.button === 0) {
				if (!this.getSelectedBuildingDefId()) {
					this.boxStartWorld = { x: world.x, y: world.y };
					this.boxCurrentWorld = { x: world.x, y: world.y };
				}
			}
		});

		// 3. Mouse Move
		canvas.addEventListener('mousemove', (e: MouseEvent) => {
			const rect = canvas.getBoundingClientRect();
			const mouseScreenX = e.clientX - rect.left;
			const mouseScreenY = e.clientY - rect.top;
			const world = this.screenToWorld(mouseScreenX, mouseScreenY);

			// Panning
			if (this.isPanning) {
				const dx = (e.clientX - this.panStartX) / this.zoom;
				const dy = (e.clientY - this.panStartY) / this.zoom;
				this.cameraX = Math.max(100, Math.min(ARENA_WIDTH - 100, this.panStartCamX - dx));
				this.cameraY = Math.max(100, Math.min(ARENA_HEIGHT - 100, this.panStartCamY - dy));
				this.onCameraChange?.(this.cameraX, this.cameraY, this.zoom);
				return;
			}

			// Box selection drag
			if (this.boxStartWorld) {
				const dist = Math.hypot(world.x - this.boxStartWorld.x, world.y - this.boxStartWorld.y);
				if (dist > 8) {
					this.isBoxSelecting = true;
					this.boxCurrentWorld = { x: world.x, y: world.y };
				}
			}

			// Hovered Tile calculation on West Building Platform (Warcraft III Grid Planning)
			if (this.getSelectedBuildingDefId()) {
				const tileX = Math.round((world.x - WEST_GRID_START_X) / CELL_SIZE);
				const tileY = Math.round((world.y - WEST_GRID_START_Y) / CELL_SIZE);
				if (tileX >= -2 && tileX <= 6 && tileY >= -2 && tileY <= 10) {
					this.hoveredTile = { x: tileX, y: tileY };
				} else {
					this.hoveredTile = null;
				}
			} else {
				this.hoveredTile = null;
			}
		});

		// 4. Mouse Up / Click
		window.addEventListener('mouseup', (e: MouseEvent) => {
			if (this.isPanning) {
				this.isPanning = false;
				return;
			}

			if (e.button === 0 && this.isBoxSelecting && this.boxStartWorld && this.boxCurrentWorld) {
				// Finish Box Selection
				const minX = Math.min(this.boxStartWorld.x, this.boxCurrentWorld.x);
				const maxX = Math.max(this.boxStartWorld.x, this.boxCurrentWorld.x);
				const minY = Math.min(this.boxStartWorld.y, this.boxCurrentWorld.y);
				const maxY = Math.max(this.boxStartWorld.y, this.boxCurrentWorld.y);

				const selectedUnits = this.sim.units.filter(
					(u) =>
						u.state !== 'DEAD' &&
						u.team === 'west' &&
						u.x >= minX &&
						u.x <= maxX &&
						u.y >= minY &&
						u.y <= maxY
				);

				if (selectedUnits.length > 1) {
					this.onSelectEntity?.({
						type: 'group',
						unitIds: selectedUnits.map((u) => u.instanceId)
					});
				} else if (selectedUnits.length === 1) {
					this.onSelectEntity?.({
						type: 'unit',
						instanceId: selectedUnits[0].instanceId
					});
				}

				this.isBoxSelecting = false;
				this.boxStartWorld = null;
				this.boxCurrentWorld = null;
				return;
			}

			this.isBoxSelecting = false;
			this.boxStartWorld = null;
			this.boxCurrentWorld = null;
		});

		canvas.addEventListener('mouseleave', () => {
			this.hoveredTile = null;
			this.isPanning = false;
			this.isBoxSelecting = false;
			this.boxStartWorld = null;
		});

		// 5. Left Click: Select Entity OR Place Building
		canvas.addEventListener('click', (e: MouseEvent) => {
			if (e.button !== 0) return;
			const rect = canvas.getBoundingClientRect();
			const mouseScreenX = e.clientX - rect.left;
			const mouseScreenY = e.clientY - rect.top;
			const world = this.screenToWorld(mouseScreenX, mouseScreenY);

			// A. Collect Gold Coins
			for (const coin of this.sim.goldCoins) {
				const dx = world.x - coin.x;
				const dy = world.y - coin.y;
				if (dx * dx + dy * dy <= 28 * 28) {
					this.sim.collectCoin(coin.id, 'west');
					return;
				}
			}

			// B. If building placement mode active -> build
			if (this.getSelectedBuildingDefId()) {
				if (this.hoveredTile) {
					if (this.sim.canBuild('west', this.hoveredTile.x, this.hoveredTile.y)) {
						this.onTileClick(this.hoveredTile.x, this.hoveredTile.y);
					} else {
						const px = WEST_GRID_START_X + this.hoveredTile.x * CELL_SIZE;
						const py = WEST_GRID_START_Y + this.hoveredTile.y * CELL_SIZE;
						this.sim.addFloatingText(
							'Не можна будувати тут!',
							px + CELL_SIZE / 2,
							py - 10,
							'#ef4444'
						);
					}
				}
				return;
			}

			// C. Check Worker click
			const worker = this.sim.players.west?.worker;
			if (worker) {
				const wDist = Math.hypot(world.x - worker.x, world.y - worker.y);
				if (wDist <= 32) {
					this.onSelectEntity?.({ type: 'worker' });
					return;
				}
			}

			// D. Check Unit click
			for (const u of this.sim.units) {
				if (u.state === 'DEAD') continue;
				const dist = Math.hypot(world.x - u.x, world.y - u.y);
				if (dist <= u.size + 12) {
					this.onSelectEntity?.({ type: 'unit', instanceId: u.instanceId });
					return;
				}
			}

			// E. Check Placed Building click (2x2 footprint)
			for (const b of this.sim.buildings) {
				if (
					world.x >= b.x &&
					world.x <= b.x + CELL_SIZE &&
					world.y >= b.y &&
					world.y <= b.y + CELL_SIZE
				) {
					this.onSelectEntity?.({ type: 'building', instanceId: b.instanceId });
					return;
				}
			}

			// Default fallback: select worker
			this.onSelectEntity?.({ type: 'worker' });
		});
	}

	public drawStaticTerrain(): void {
		const g = this.terrainLayer;
		g.clear();

		// 1. Lush Summer Grass (Authentic Lordaeron Summer Palette)
		g.rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
		g.fill({ color: 0x275a1d });

		// Subtle textured grass patches
		for (let x = 40; x < ARENA_WIDTH; x += 160) {
			for (let y = 30; y < ARENA_HEIGHT; y += 120) {
				const isSunny = (x * 3 + y * 7) % 5 === 0;
				g.ellipse(x + 40, y + 20, 75, 45);
				g.fill({ color: isSunny ? 0x367627 : 0x1f4c17, alpha: 0.65 });
			}
		}

		// 2. Continuous Cobblestone Highway from West Castle (60, 400) to East Castle (2340, 400)
		this.drawContinuousRoadNetwork(g);

		// 3. Central River (X = 1200) with Sandy Banks & Ripples
		const riverX = ARENA_WIDTH / 2;
		const riverW = 150;
		// Sandy riverbank
		g.rect(riverX - riverW / 2 - 12, 0, riverW + 24, ARENA_HEIGHT);
		g.fill({ color: 0x473c2b });

		// Flowing Water
		g.rect(riverX - riverW / 2, 0, riverW, ARENA_HEIGHT);
		g.fill({ color: 0x0284c7 });

		// Deep Channel Center
		g.rect(riverX - 35, 0, 70, ARENA_HEIGHT);
		g.fill({ color: 0x0369a1 });

		// Riverbank foam ripples
		for (let y = 15; y < ARENA_HEIGHT; y += 40) {
			g.moveTo(riverX - riverW / 2 + 4, y);
			g.lineTo(riverX - riverW / 2 + 14, y + 16);
			g.stroke({ color: 0x93c5fd, width: 2, alpha: 0.8 });

			g.moveTo(riverX + riverW / 2 - 4, y + 20);
			g.lineTo(riverX + riverW / 2 - 14, y + 36);
			g.stroke({ color: 0x93c5fd, width: 2, alpha: 0.8 });
		}

		// 4. Arched Bridges over River
		this.drawBridge(g, riverX, TOP_LANE_Y);
		this.drawBridge(g, riverX, BOTTOM_LANE_Y);

		// 5. Authentic Warcraft III Stone Ramparts & Mountain dividing the Lanes
		// Central Mountain & Pine Forest (Dividing Top & Bottom lines)
		const ridgeY = (TOP_LANE_Y + BOTTOM_LANE_Y) / 2;
		this.drawMountainRidge(g, 450, ridgeY - 60, ARENA_WIDTH - 900, 120);

		// Base Courtyards: Upper and Lower platform separation walls
		this.drawBattlementWall(g, 100, 365, 300, 40); // West division wall
		this.drawBattlementWall(g, ARENA_WIDTH - 400, 365, 300, 40); // East division wall

		// Top & Bottom Arena Perimeter Walls
		this.drawBattlementWall(g, 20, 20, ARENA_WIDTH - 40, 38);
		this.drawBattlementWall(g, 20, ARENA_HEIGHT - 60, ARENA_WIDTH - 40, 42);

		// Outer Dark Border
		g.rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
		g.stroke({ color: 0x0f172a, width: 8 });
	}

	private drawContinuousRoadNetwork(g: Graphics): void {
		const roadHeight = 72;
		const wCastX = 70;
		const wCastY = 400;
		const eCastX = ARENA_WIDTH - 70;
		const eCastY = 400;

		// A. Top Lane straight highway
		g.rect(340, TOP_LANE_Y - roadHeight / 2, ARENA_WIDTH - 680, roadHeight);
		g.fill({ color: 0x67543d });
		g.stroke({ color: 0x453523, width: 2 });

		// B. Bottom Lane straight highway
		g.rect(340, BOTTOM_LANE_Y - roadHeight / 2, ARENA_WIDTH - 680, roadHeight);
		g.fill({ color: 0x67543d });
		g.stroke({ color: 0x453523, width: 2 });

		// C. West Road Branches: Connecting West Castle (70, 400) smoothly to Top and Bottom lanes
		// Fan out to Top
		g.poly([
			wCastX + 30,
			wCastY - 40,
			360,
			TOP_LANE_Y - roadHeight / 2,
			360,
			TOP_LANE_Y + roadHeight / 2,
			wCastX + 30,
			wCastY + 40
		]);
		g.fill({ color: 0x67543d });
		g.stroke({ color: 0x453523, width: 1.5 });

		// Fan out to Bottom
		g.poly([
			wCastX + 30,
			wCastY - 40,
			360,
			BOTTOM_LANE_Y - roadHeight / 2,
			360,
			BOTTOM_LANE_Y + roadHeight / 2,
			wCastX + 30,
			wCastY + 40
		]);
		g.fill({ color: 0x67543d });
		g.stroke({ color: 0x453523, width: 1.5 });

		// D. East Road Branches: Connecting East Castle (ARENA_WIDTH - 70, 400)
		g.poly([
			eCastX - 30,
			eCastY - 40,
			ARENA_WIDTH - 360,
			TOP_LANE_Y - roadHeight / 2,
			ARENA_WIDTH - 360,
			TOP_LANE_Y + roadHeight / 2,
			eCastX - 30,
			eCastY + 40
		]);
		g.fill({ color: 0x67543d });
		g.stroke({ color: 0x453523, width: 1.5 });

		g.poly([
			eCastX - 30,
			eCastY - 40,
			ARENA_WIDTH - 360,
			BOTTOM_LANE_Y - roadHeight / 2,
			ARENA_WIDTH - 360,
			BOTTOM_LANE_Y + roadHeight / 2,
			eCastX - 30,
			eCastY + 40
		]);
		g.fill({ color: 0x67543d });
		g.stroke({ color: 0x453523, width: 1.5 });

		// Stone curb slabs along the lanes
		g.rect(340, TOP_LANE_Y - roadHeight / 2 - 3, ARENA_WIDTH - 680, 4);
		g.fill({ color: 0x94a3b8 });
		g.rect(340, TOP_LANE_Y + roadHeight / 2 - 1, ARENA_WIDTH - 680, 4);
		g.fill({ color: 0x94a3b8 });

		g.rect(340, BOTTOM_LANE_Y - roadHeight / 2 - 3, ARENA_WIDTH - 680, 4);
		g.fill({ color: 0x94a3b8 });
		g.rect(340, BOTTOM_LANE_Y + roadHeight / 2 - 1, ARENA_WIDTH - 680, 4);
		g.fill({ color: 0x94a3b8 });

		// Cobblestone paver joints
		for (let px = 360; px < ARENA_WIDTH - 360; px += 45) {
			g.moveTo(px, TOP_LANE_Y - roadHeight / 2 + 4);
			g.lineTo(px, TOP_LANE_Y + roadHeight / 2 - 4);
			g.stroke({ color: 0x453523, width: 1, alpha: 0.55 });

			g.moveTo(px, BOTTOM_LANE_Y - roadHeight / 2 + 4);
			g.lineTo(px, BOTTOM_LANE_Y + roadHeight / 2 - 4);
			g.stroke({ color: 0x453523, width: 1, alpha: 0.55 });
		}
	}

	private drawMountainRidge(g: Graphics, x: number, y: number, w: number, h: number): void {
		// Shadow
		g.ellipse(x + w / 2, y + h, w / 2, 20);
		g.fill({ color: 0x000000, alpha: 0.35 });

		// Rocky base
		g.roundRect(x, y, w, h, 24);
		g.fill({ color: 0x475569 });
		g.stroke({ color: 0x1e293b, width: 3 });

		// Inner darker strata
		g.roundRect(x + 10, y + 10, w - 20, h - 20, 16);
		g.fill({ color: 0x334155 });

		// Pine Trees along the dividing mountain ridge
		for (let tx = x + 30; tx < x + w - 20; tx += 65) {
			const py = y + h / 2 + Math.sin(tx * 0.05) * 15;
			// Trunk
			g.rect(tx - 2, py + 8, 4, 10);
			g.fill({ color: 0x451a03 });
			// Foliage tiers
			g.poly([tx, py - 18, tx + 14, py + 8, tx - 14, py + 8]);
			g.fill({ color: 0x14532d });
			g.poly([tx, py - 24, tx + 10, py - 2, tx - 10, py - 2]);
			g.fill({ color: 0x166534 });
		}
	}

	private drawBattlementWall(g: Graphics, x: number, y: number, w: number, h: number): void {
		g.rect(x - 2, y + h, w + 4, 6);
		g.fill({ color: 0x000000, alpha: 0.35 });

		g.rect(x, y + 10, w, h - 10);
		g.fill({ color: 0x64748b });
		g.stroke({ color: 0x334155, width: 1.5 });

		for (let rowY = y + 20; rowY < y + h; rowY += 14) {
			g.moveTo(x, rowY);
			g.lineTo(x + w, rowY);
			g.stroke({ color: 0x475569, width: 1 });
		}

		g.rect(x - 4, y + 8, w + 8, 5);
		g.fill({ color: 0x94a3b8 });
		g.stroke({ color: 0x334155, width: 1 });

		const toothW = 24;
		const gapW = 16;
		const step = toothW + gapW;
		const count = Math.floor(w / step);

		for (let i = 0; i < count; i++) {
			const tx = x + 4 + i * step;
			g.rect(tx, y, toothW, 10);
			g.fill({ color: 0x94a3b8 });
			g.stroke({ color: 0x334155, width: 1.5 });
		}
	}

	private drawBridge(g: Graphics, centerX: number, laneY: number): void {
		const bridgeW = 160;
		const bridgeH = 86;

		g.rect(centerX - bridgeW / 2, laneY - bridgeH / 2 + 4, bridgeW, bridgeH);
		g.fill({ color: 0x000000, alpha: 0.35 });

		g.rect(centerX - bridgeW / 2, laneY - bridgeH / 2, bridgeW, bridgeH);
		g.fill({ color: 0x78350f });
		g.stroke({ color: 0x451a03, width: 2 });

		for (let bx = centerX - bridgeW / 2 + 10; bx < centerX + bridgeW / 2; bx += 14) {
			g.moveTo(bx, laneY - bridgeH / 2);
			g.lineTo(bx, laneY + bridgeH / 2);
			g.stroke({ color: 0x451a03, width: 1.5 });
		}

		g.rect(centerX - bridgeW / 2, laneY - bridgeH / 2 - 5, bridgeW, 7);
		g.fill({ color: 0x64748b });
		g.stroke({ color: 0x94a3b8, width: 1.5 });

		g.rect(centerX - bridgeW / 2, laneY + bridgeH / 2 - 2, bridgeW, 7);
		g.fill({ color: 0x64748b });
		g.stroke({ color: 0x94a3b8, width: 1.5 });
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
		this.drawOrderMarkers();
		this.drawFogOfWar();
		this.drawSelectionUI();
	}

	private drawCoinsLayer(): void {
		const g = this.coinsLayer;
		g.clear();
		for (const coin of this.sim.goldCoins) {
			const pulse = 1 + Math.sin(this.sim.gameTime * 7) * 0.15;
			const radius = 9 * pulse;

			g.circle(coin.x, coin.y, radius + 4);
			g.fill({ color: 0xfbbf24, alpha: 0.25 });

			g.circle(coin.x, coin.y, radius);
			g.fill({ color: 0xf59e0b });
			g.stroke({ color: 0xfef08a, width: 2 });

			g.circle(coin.x, coin.y, radius * 0.4);
			g.fill({ color: 0xfef08a });
		}
	}

	private drawGridLayer(): void {
		const g = this.gridLayer;
		g.clear();

		const selectedDefId = this.getSelectedBuildingDefId?.();

		// As in Warcraft III: normally the grid is completely hidden!
		// Only during building placement planning does a subtle guide grid appear.
		if (selectedDefId) {
			// Subtle guide grid across buildable base territory (~10% alpha)
			const half = CELL_SIZE / 2;
			for (let x = 0; x <= 9; x++) {
				for (let y = -2; y <= 10; y++) {
					const px = WEST_GRID_START_X + x * CELL_SIZE;
					const py = WEST_GRID_START_Y + y * CELL_SIZE;
					const canBuild = this.sim.canBuild('west', x, y);
					if (canBuild) {
						for (let sx = 0; sx < 2; sx++) {
							for (let sy = 0; sy < 2; sy++) {
								g.rect(px + sx * half + 1, py + sy * half + 1, half - 2, half - 2);
								g.fill({ color: 0x1e293b, alpha: 0.1 });
								g.stroke({ color: 0x64748b, width: 0.5, alpha: 0.2 });
							}
						}
					}
				}
			}
		}

		// Hover Highlight: Authentic Warcraft III 2x2 green grid preview
		if (selectedDefId && this.hoveredTile) {
			const px = WEST_GRID_START_X + this.hoveredTile.x * CELL_SIZE;
			const py = WEST_GRID_START_Y + this.hoveredTile.y * CELL_SIZE;
			const canBuild = this.sim.canBuild('west', this.hoveredTile.x, this.hoveredTile.y);
			const color = canBuild ? 0x22c55e : 0xef4444;
			const half = CELL_SIZE / 2;

			// 4 distinct quadrants (2x2 grid)
			for (let sx = 0; sx < 2; sx++) {
				for (let sy = 0; sy < 2; sy++) {
					const cx = px + sx * half;
					const cy = py + sy * half;
					g.rect(cx + 1.5, cy + 1.5, half - 3, half - 3);
					g.fill({ color, alpha: 0.4 });
					g.stroke({ color, width: 2, alpha: 0.95 });
				}
			}
			// Outer bounding box
			g.rect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
			g.stroke({ color, width: 2.5, alpha: 1.0 });

			// Ghost building preview if buildable
			if (canBuild) {
				g.roundRect(px + 4, py + 4, CELL_SIZE - 8, CELL_SIZE - 8, 4);
				g.fill({ color: 0x38bdf8, alpha: 0.25 });
			}
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
			const teamColor = this.sim.players[b.team]?.color?.num || (isWest ? 0x0042ff : 0xff0303);

			// Selection halo
			if (isSelected) {
				g.roundRect(px - 2, py - 2, CELL_SIZE + 4, CELL_SIZE + 4, 8);
				g.stroke({ color: 0xf59e0b, width: 3 });
			}

			// Building base stone slab (2x2 footprint)
			g.roundRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4, 6);
			g.fill({ color: 0x334155 });
			g.stroke({ color: isSelected ? 0xfbbf24 : teamColor, width: 2 });

			// 2x2 Quadrant subdivision mortar lines on foundation
			const half = CELL_SIZE / 2;
			g.moveTo(px + half, py + 3);
			g.lineTo(px + half, py + CELL_SIZE - 3);
			g.stroke({ color: 0x1e293b, width: 1.5, alpha: 0.6 });
			g.moveTo(px + 3, py + half);
			g.lineTo(px + CELL_SIZE - 3, py + half);
			g.stroke({ color: 0x1e293b, width: 1.5, alpha: 0.6 });

			// Inner roof tiles with race color tinting (spanning 2x2 quadrants)
			const raceColors: Record<string, number> = {
				Люди: 0x1e3a8a,
				Орки: 0x831843,
				Нежить: 0x14532d,
				Ельфи: 0x065f46,
				Эльфы: 0x065f46,
				Хаос: 0x7f1d1d,
				Наги: 0x0e7490,
				Північ: 0x0369a1,
				Север: 0x0369a1,
				Порча: 0x581c87,
				'Нічні ельфи': 0x365314,
				'Ночні ельфи': 0x365314,
				'Ночные эльфы': 0x365314,
				Техніки: 0x78350f,
				Техники: 0x78350f,
				Збирачі: 0x334155,
				Сборщики: 0x334155
			};
			const roofColor = raceColors[b.race] || 0x1e293b;
			g.roundRect(px + 7, py + 7, CELL_SIZE - 14, CELL_SIZE - 14, 4);
			g.fill({ color: roofColor });

			// 4 Corner stone turrets / bastions (one in each 1x1 sub-quadrant)
			const cornerPositions = [
				{ x: px + 3, y: py + 3 },
				{ x: px + CELL_SIZE - 15, y: py + 3 },
				{ x: px + 3, y: py + CELL_SIZE - 15 },
				{ x: px + CELL_SIZE - 15, y: py + CELL_SIZE - 15 }
			];
			for (const cp of cornerPositions) {
				g.roundRect(cp.x, cp.y, 12, 12, 2);
				g.fill({ color: 0x475569 });
				g.stroke({ color: 0x1e293b, width: 1 });
			}

			// Team colored banner/crest strip on roof
			g.rect(px + CELL_SIZE / 2 - 6, py + 7, 12, CELL_SIZE - 14);
			g.fill({ color: teamColor, alpha: 0.85 });

			// Front exit doorway facing the lane/road
			const doorX = isWest ? px + CELL_SIZE - 6 : px + 2;
			const doorY = py + CELL_SIZE / 2 - 7;
			g.roundRect(doorX, doorY, 4, 14, 1.5);
			g.fill({ color: 0x0f172a });

			// Under construction visual overlay & scaffolding
			if (b.isUnderConstruction) {
				g.roundRect(px + 3, py + 3, CELL_SIZE - 6, CELL_SIZE - 6, 4);
				g.fill({ color: 0x78350f, alpha: 0.65 });
				g.stroke({ color: 0xd97706, width: 2 });

				// 2x2 scaffolding diagonal cross-beams over each quadrant
				for (let sx = 0; sx < 2; sx++) {
					for (let sy = 0; sy < 2; sy++) {
						const qx = px + sx * half;
						const qy = py + sy * half;
						g.moveTo(qx + 3, qy + 3);
						g.lineTo(qx + half - 3, qy + half - 3);
						g.stroke({ color: 0xfbbf24, width: 1.5, alpha: 0.8 });
						g.moveTo(qx + half - 3, qy + 3);
						g.lineTo(qx + 3, qy + half - 3);
						g.stroke({ color: 0xfbbf24, width: 1.5, alpha: 0.8 });
					}
				}

				// Progress bar
				const bProg = b.buildProgress || 0;
				const bMax = b.maxBuildProgress || 3.5;
				const progPct = Math.max(0, Math.min(1, bProg / bMax));

				const barX = px + 4;
				const barY = py - 8;
				const barW = CELL_SIZE - 8;
				const barH = 5;

				g.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 2);
				g.fill({ color: 0x090d16 });
				g.roundRect(barX, barY, barW * progPct, barH, 1.5);
				g.fill({ color: 0xf59e0b });
				continue;
			}

			// Damaged HP Bar
			if (b.hp !== undefined && b.maxHp !== undefined && b.hp < b.maxHp) {
				const hpPct = Math.max(0, Math.min(1, b.hp / b.maxHp));
				const barX = px + 4;
				const barY = py + CELL_SIZE + 2;
				const barW = CELL_SIZE - 8;
				const barH = 4;

				g.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 1);
				g.fill({ color: 0x090d16 });
				g.roundRect(barX, barY, barW * hpPct, barH, 1);
				g.fill({ color: hpPct > 0.5 ? 0x22c55e : hpPct > 0.25 ? 0xeab308 : 0xef4444 });
			}

			// Spawn / Attack Cooldown timer bar
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
				const barH = 4;

				g.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 1);
				g.fill({ color: 0x090d16 });
				if (pct > 0) {
					g.roundRect(barX, barY, barW * pct, barH, 1);
					g.fill({ color: 0x38bdf8 });
				}
			}
		}
	}

	private drawCastles(): void {
		const g = this.buildingsLayer;
		this.renderAuthenticCastle(g, this.sim.castles.west, true);
		this.renderAuthenticCastle(g, this.sim.castles.east, false);
	}

	private renderAuthenticCastle(g: Graphics, castle: Castle, isWest: boolean): void {
		const cx = castle.x;
		const cy = castle.y;
		const teamColor = this.sim.players[castle.team]?.color?.num || (isWest ? 0x0042ff : 0xff0303);

		// Stone Courtyard Foundation Slab
		g.roundRect(cx - 55, cy - 75, 110, 150, 14);
		g.fill({ color: 0x334155 });
		g.stroke({ color: 0x1e293b, width: 2 });

		// Central Keep
		const keepW = 68;
		const keepH = 96;
		g.roundRect(cx - keepW / 2, cy - keepH / 2, keepW, keepH, 8);
		g.fill({ color: 0x475569 });
		g.stroke({ color: 0x1e293b, width: 2 });

		// 4 Massive Corner Watchtowers
		const towers = [
			{ x: cx - keepW / 2 - 6, y: cy - keepH / 2 - 6 },
			{ x: cx + keepW / 2 - 14, y: cy - keepH / 2 - 6 },
			{ x: cx - keepW / 2 - 6, y: cy + keepH / 2 - 14 },
			{ x: cx + keepW / 2 - 14, y: cy + keepH / 2 - 14 }
		];
		for (const t of towers) {
			// Tower Base
			g.rect(t.x, t.y, 20, 20);
			g.fill({ color: 0x64748b });
			g.stroke({ color: 0x1e293b, width: 1.5 });

			// Conical Roof in Player Color
			g.poly([t.x + 10, t.y - 12, t.x + 20, t.y, t.x, t.y]);
			g.fill({ color: teamColor });
			g.stroke({ color: 0x0f172a, width: 1 });
		}

		// Arched Castle Gate with Iron Portcullis Grille
		const gateDir = isWest ? 1 : -1;
		const gateX = cx + gateDir * (keepW / 2 - 12);
		g.roundRect(gateX - 8, cy - 16, 16, 32, 4);
		g.fill({ color: 0x0f172a });
		// Iron Portcullis Grate
		for (let gy = cy - 12; gy <= cy + 12; gy += 6) {
			g.moveTo(gateX - 7, gy);
			g.lineTo(gateX + 7, gy);
			g.stroke({ color: 0x94a3b8, width: 1.5 });
		}

		// Heraldic Flag / Banner Flapping Above Central Keep
		const flagPoleX = cx;
		const flagPoleY = cy - keepH / 2 - 22;
		g.moveTo(flagPoleX, cy - keepH / 2 + 10);
		g.lineTo(flagPoleX, flagPoleY);
		g.stroke({ color: 0xd97706, width: 2.5 });

		// Pennant in team color
		g.poly([flagPoleX, flagPoleY, flagPoleX + 22, flagPoleY + 7, flagPoleX, flagPoleY + 14]);
		g.fill({ color: teamColor });
		g.stroke({ color: 0xfef08a, width: 1 });

		// Castle Health Bar
		const hpPct = Math.max(0, castle.hp / castle.maxHp);
		const barWidth = 110;
		const barHeight = 8;
		const barX = cx - barWidth / 2;
		const barY = cy - keepH / 2 - 34;

		g.rect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
		g.fill({ color: 0x0f172a });
		g.rect(barX, barY, barWidth * hpPct, barHeight);
		g.fill({ color: hpPct > 0.5 ? 0x22c55e : hpPct > 0.25 ? 0xeab308 : 0xef4444 });

		// Azure Dome Invulnerability Shield
		if (this.sim.castleInvulnerableTimer[castle.team] > 0) {
			g.circle(cx, cy, 85);
			g.fill({ color: 0x06b6d4, alpha: 0.25 });
			g.stroke({ color: 0x38bdf8, width: 3, alpha: 0.85 });
		}
	}

	private drawWorkersLayer(): void {
		const g = this.workersLayer;
		g.clear();

		const selectedEntity = this.getSelectedEntity?.() || { type: 'worker' };
		const isWorkerSelected = selectedEntity.type === 'worker';

		// Render Player's Worker
		const westWorker = this.sim.players.west?.worker;
		if (westWorker) {
			const wx = westWorker.x;
			const wy = westWorker.y;
			const bob = Math.sin(this.sim.gameTime * 6) * 1.5;
			const playerColor = this.sim.players.west.color?.num || 0x0042ff;

			// Selection Ring at Worker's feet
			if (isWorkerSelected) {
				const pulse = 0.8 + Math.sin(this.sim.gameTime * 7) * 0.2;
				g.ellipse(wx, wy + 14, 20, 10);
				g.stroke({ color: 0x22c55e, width: 2.5, alpha: pulse });
			}

			// Shadow
			g.ellipse(wx, wy + 14, 16, 7);
			g.fill({ color: 0x000000, alpha: 0.35 });

			// Worker Body & Tunic in Player Color
			g.roundRect(wx - 8, wy - 4 + bob, 16, 16, 4);
			g.fill({ color: playerColor });
			g.stroke({ color: 0xe2e8f0, width: 1.5 });

			// Head & Skin
			g.circle(wx, wy - 10 + bob, 7);
			g.fill({ color: 0xfcd34d });
			g.stroke({ color: 0xd97706, width: 1 });

			// Construction Hammer / Mallet
			const isSwinging = westWorker.isBuilding || westWorker.isRepairing;
			const hammerSwing = isSwinging ? Math.sin(this.sim.gameTime * 18) * 12 : 0;
			const hx = wx + 10;
			const hy = wy + bob - 2 + hammerSwing;

			g.moveTo(hx - 2, hy + 8);
			g.lineTo(hx + 4, hy - 4);
			g.stroke({ color: 0x92400e, width: 2.5 });
			g.rect(hx + 1, hy - 7, 7, 5);
			g.fill({ color: 0x94a3b8 });

			// Sparks if building or repairing
			if (isSwinging) {
				const spX = hx + 5 + Math.sin(this.sim.gameTime * 30) * 6;
				const spY = hy + Math.cos(this.sim.gameTime * 30) * 6;
				g.circle(spX, spY, 2.5);
				g.fill({ color: 0xfef08a });
			}
		}

		// Render Bot's Worker
		const eastWorker = this.sim.players.east?.worker;
		if (eastWorker) {
			const ex = eastWorker.x;
			const ey = eastWorker.y;
			const bob = Math.sin(this.sim.gameTime * 5) * 1.5;
			const botColor = this.sim.players.east.color?.num || 0xff0303;

			g.ellipse(ex, ey + 14, 16, 7);
			g.fill({ color: 0x000000, alpha: 0.35 });

			g.roundRect(ex - 8, ey - 4 + bob, 16, 16, 4);
			g.fill({ color: botColor });
			g.stroke({ color: 0xe2e8f0, width: 1.5 });

			g.circle(ex, ey - 10 + bob, 7);
			g.fill({ color: 0x15803d }); // Orc skin
		}
	}

	private drawUnitsLayer(): void {
		const g = this.unitsLayer;
		g.clear();

		const selectedEntity = this.getSelectedEntity?.();
		const westPlayerColor = this.sim.players.west.color?.num || 0x0042ff;
		const eastPlayerColor = this.sim.players.east.color?.num || 0xff0303;

		for (const u of this.sim.units) {
			const radius = u.size;

			if (u.state === 'DEAD') {
				if (u.deathTimer !== undefined && u.deathTimer > 0) {
					const fade = Math.max(0, u.deathTimer / 0.7);
					g.ellipse(u.x, u.y, radius * 0.9, radius * 0.45);
					g.fill({ color: 0x334155, alpha: fade * 0.65 });
				}
				continue;
			}

			// Fog of War check: hide unrevealed enemy units
			if (this.enableFog && u.team === 'east') {
				const isRevealed =
					u.x <= 1200 ||
					this.sim.units.some(
						(ally) =>
							ally.team === 'west' &&
							ally.state !== 'DEAD' &&
							Math.hypot(ally.x - u.x, ally.y - u.y) <= 400
					) ||
					(this.sim.players.west.worker &&
						Math.hypot(
							this.sim.players.west.worker.x - u.x,
							this.sim.players.west.worker.y - u.y
						) <= 420);
				if (!isRevealed) continue;
			}

			const isWest = u.team === 'west';
			const isNeutral = u.team === 'neutral';
			const unitColor = isNeutral ? 0x7e22ce : isWest ? westPlayerColor : eastPlayerColor;
			const dir = isNeutral ? 1 : isWest ? 1 : -1;
			const walkBob =
				u.state === 'WALKING' ? Math.sin(this.sim.gameTime * 14 + u.x * 0.05) * 1.5 : 0;
			const attackLunge =
				u.state === 'ATTACKING' ? Math.sin((u.attackAnimTimer || 0) * Math.PI) * 4 * dir : 0;
			const unitX = u.x + attackLunge;
			const unitY = u.y + walkBob;

			// Flying Shadow & Wings
			if (u.flying) {
				g.ellipse(unitX, u.y + 18, radius, radius * 0.4);
				g.fill({ color: 0x000000, alpha: 0.35 });

				const flap = Math.sin(this.sim.gameTime * 15) * 4;
				g.poly([
					unitX - radius - 6,
					unitY - 2 + flap,
					unitX - radius,
					unitY - radius * 0.5,
					unitX - radius,
					unitY + radius * 0.5
				]);
				g.fill({ color: 0xe0f2fe, alpha: 0.85 });

				g.poly([
					unitX + radius + 6,
					unitY - 2 + flap,
					unitX + radius,
					unitY - radius * 0.5,
					unitX + radius,
					unitY + radius * 0.5
				]);
				g.fill({ color: 0xe0f2fe, alpha: 0.85 });
			}

			// Unit Body in Player Color
			g.circle(unitX, unitY, radius);
			g.fill({ color: unitColor });
			g.stroke({ color: 0xffffff, width: 1.5 });

			// Selection indicator
			const isSelected =
				(selectedEntity?.type === 'unit' && selectedEntity.instanceId === u.instanceId) ||
				(selectedEntity?.type === 'group' && selectedEntity.unitIds.includes(u.instanceId));
			if (isSelected) {
				g.ellipse(unitX, unitY + radius * 0.6, radius * 1.3, radius * 0.7);
				g.stroke({ color: 0x22c55e, width: 2 });
			}

			// Unit Health Bar
			const hpPct = Math.max(0, u.hp / u.maxHp);
			const barW = radius * 2.2;
			const barH = 3;
			const barX = unitX - barW / 2;
			const barY = unitY - radius - 7;

			g.rect(barX - 1, barY - 1, barW + 2, barH + 2);
			g.fill({ color: 0x000000, alpha: 0.8 });
			g.rect(barX, barY, barW * hpPct, barH);
			g.fill({ color: hpPct > 0.5 ? 0x4ade80 : hpPct > 0.25 ? 0xfacc15 : 0xf87171 });
		}
	}

	private drawProjectilesLayer(): void {
		const g = this.projectilesLayer;
		g.clear();

		for (const p of this.sim.projectiles) {
			if (p.damage <= 0) continue;

			// Parabolic Arc height calculation: z = 4 * H * (d/D) * (1 - d/D)
			let z = 0;
			if (p.originX !== undefined && p.originY !== undefined && p.totalDist && p.arcHeight) {
				const currentDist = Math.hypot(p.x - p.originX, p.y - p.originY);
				const norm = Math.max(0, Math.min(1, currentDist / p.totalDist));
				z = 4 * p.arcHeight * norm * (1 - norm);
			}

			// 1. Ground Shadow underneath
			g.ellipse(p.x, p.y + 4, 4 + z * 0.05, 2);
			g.fill({ color: 0x000000, alpha: 0.35 });

			// 2. Projectile elevated in the air by z
			const projY = p.y - z;

			if (p.attackType === 'magic') {
				g.circle(p.x, projY, 5);
				g.fill({ color: 0xc084fc });
				g.circle(p.x, projY, 10);
				g.fill({ color: 0xa855f7, alpha: 0.35 });
			} else if (p.attackType === 'siege') {
				g.circle(p.x, projY, 7);
				g.fill({ color: 0x475569 });
				g.stroke({ color: 0x1e293b, width: 2 });
			} else {
				// Pierce / Arrow facing direction
				const angle = Math.atan2(p.targetY - p.y, p.targetX - p.x);
				const len = 10;
				g.moveTo(p.x - Math.cos(angle) * (len / 2), projY - Math.sin(angle) * (len / 2));
				g.lineTo(p.x + Math.cos(angle) * (len / 2), projY + Math.sin(angle) * (len / 2));
				g.stroke({ color: 0xfef08a, width: 2 });
			}
		}

		// AoE Splash Circles
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
			g.fill({ color: 0xf97316, alpha: alpha * 0.2 });
			g.stroke({ color: 0xef4444, width: 4 * (1 - progress) + 1, alpha });
		}
	}

	private drawOrderMarkers(): void {
		const g = this.uiLayer;
		for (let i = this.moveMarkers.length - 1; i >= 0; i--) {
			const m = this.moveMarkers[i];
			m.timer -= 0.016;
			if (m.timer <= 0) {
				this.moveMarkers.splice(i, 1);
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

	private drawFogOfWar(): void {
		const g = this.fogLayer;
		g.clear();
		if (!this.enableFog) return;

		// Atmospheric dark mist covering east side beyond river
		g.rect(1250, 0, ARENA_WIDTH - 1250, ARENA_HEIGHT);
		g.fill({ color: 0x070b14, alpha: 0.62 });

		// Clear vision circles around friendly player entities
		for (const u of this.sim.units) {
			if (u.team === 'west' && u.state !== 'DEAD' && u.x >= 1000) {
				g.circle(u.x, u.y, 380);
				g.cut();
			}
		}

		const worker = this.sim.players.west.worker;
		if (worker && worker.x >= 1000) {
			g.circle(worker.x, worker.y, 400);
			g.cut();
		}
	}

	private drawSelectionUI(): void {
		const g = this.uiLayer;
		g.clear();

		// Drag Selection Box
		if (this.isBoxSelecting && this.boxStartWorld && this.boxCurrentWorld) {
			const x = Math.min(this.boxStartWorld.x, this.boxCurrentWorld.x);
			const y = Math.min(this.boxStartWorld.y, this.boxCurrentWorld.y);
			const w = Math.abs(this.boxStartWorld.x - this.boxCurrentWorld.x);
			const h = Math.abs(this.boxStartWorld.y - this.boxCurrentWorld.y);

			g.rect(x, y, w, h);
			g.fill({ color: 0x22c55e, alpha: 0.15 });
			g.stroke({ color: 0x4ade80, width: 1.5 });
		}
	}

	public destroy(): void {
		this.isDestroyed = true;
		this.app.destroy(true, { children: true });
	}
}
