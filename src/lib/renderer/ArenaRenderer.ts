import 'pixi.js/unsafe-eval';
import { Application, Container, Graphics } from 'pixi.js';
import type { Simulation } from '../engine/simulation';
import {
	ARENA_WIDTH,
	ARENA_HEIGHT,
	WEST_GRID_START_X,
	WEST_GRID_START_Y,
	CELL_SIZE,
	GRID_STEP
} from '../engine/simulation';
import { sound } from '../services/audio';
import type { Unit } from '../engine/types';
import { TerrainRenderer } from './terrainRenderer';
import { EntityRenderer, type SelectedEntity } from './entityRenderer';
import { OverlayRenderer } from './overlayRenderer';

export type { SelectedEntity };

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
	public cameraX = 800;
	public cameraY = 1200;
	public zoom = 0.85;
	public minZoom = 0.35;
	public maxZoom = 2.0;
	private isPanning = false;
	private panStartX = 0;
	private panStartY = 0;
	private panStartCamX = 0;
	private panStartCamY = 0;
	private mouseScreenX = 0;
	private mouseScreenY = 0;
	private isMouseOverCanvas = false;

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
	private dayNightLayer: Graphics;
	private fogLayer: Graphics;
	private floatingTextsLayer: Container;
	private uiLayer: Graphics;

	private hoveredTile: { x: number; y: number } | null = null;
	private isDestroyed = false;
	private canvasEl: HTMLCanvasElement | null = null;
	private lastDrawnBrokenBridge: 'top' | 'mid' | 'bottom' | null = undefined as unknown as null;

	// Subsystems
	private terrainRenderer: TerrainRenderer;
	private entityRenderer: EntityRenderer;
	private overlayRenderer: OverlayRenderer;

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
		this.dayNightLayer = new Graphics();
		this.fogLayer = new Graphics();
		this.floatingTextsLayer = new Container();
		this.uiLayer = new Graphics();

		this.terrainRenderer = new TerrainRenderer();
		this.entityRenderer = new EntityRenderer(this.sim);
		this.overlayRenderer = new OverlayRenderer(this.sim);
	}

	public setSimulation(newSim: Simulation): void {
		this.sim = newSim;
		this.enableFog = newSim.config.fogOfWar ?? true;
		this.entityRenderer.setSimulation(newSim);
		this.overlayRenderer.setSimulation(newSim);
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
		this.rootContainer.addChild(this.dayNightLayer);
		this.rootContainer.addChild(this.fogLayer);
		this.rootContainer.addChild(this.floatingTextsLayer);
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

		// Edge scrolling for RTS mouse navigation
		if (this.isMouseOverCanvas && !this.isPanning && !this.isBoxSelecting) {
			const edgeMargin = 25;
			const edgeSpeed = (750 * (1 / 60)) / this.zoom;
			if (this.mouseScreenX < edgeMargin) {
				this.cameraX -= edgeSpeed;
			} else if (this.mouseScreenX > screenW - edgeMargin) {
				this.cameraX += edgeSpeed;
			}
			if (this.mouseScreenY < edgeMargin) {
				this.cameraY -= edgeSpeed;
			} else if (this.mouseScreenY > screenH - edgeMargin) {
				this.cameraY += edgeSpeed;
			}
		}

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

				// Check if RMB clicked a gold coin (command worker to run and collect it)
				const clickedCoin = this.sim.goldCoins.find(
					(c) => Math.hypot(world.x - c.x, world.y - c.y) <= 32
				);
				if (clickedCoin) {
					this.sim.orderWorkerMove('west', clickedCoin.x, clickedCoin.y);
					return;
				}

				// Check if RMB clicked an injured friendly building or castle to repair / continue construction
				const clickedBuilding = this.sim.buildings.find(
					(b) =>
						b.team === 'west' &&
						Math.abs(world.x - (b.x + CELL_SIZE / 2)) <= CELL_SIZE &&
						Math.abs(world.y - (b.y + CELL_SIZE / 2)) <= CELL_SIZE
				);
				const westCastle = this.sim.castles.west;
				const clickedCastle = Math.hypot(world.x - westCastle.x, world.y - westCastle.y) <= 80;

				if (clickedBuilding) {
					if (clickedBuilding.isUnderConstruction) {
						this.sim.continueConstruction('west', clickedBuilding.instanceId);
						return;
					}
					if (clickedBuilding.hp < clickedBuilding.maxHp) {
						this.sim.repairBuilding('west', clickedBuilding.instanceId);
						return;
					}
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

		canvas.addEventListener('mouseenter', () => {
			this.isMouseOverCanvas = true;
		});

		// 3. Mouse Move
		canvas.addEventListener('mousemove', (e: MouseEvent) => {
			const rect = canvas.getBoundingClientRect();
			const mouseScreenX = e.clientX - rect.left;
			const mouseScreenY = e.clientY - rect.top;
			this.mouseScreenX = mouseScreenX;
			this.mouseScreenY = mouseScreenY;
			this.isMouseOverCanvas = true;
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

			// Hovered Tile calculation on West Building Platform (Warcraft III Grid Planning with GRID_STEP = 32px)
			if (this.getSelectedBuildingDefId()) {
				const tileX = Math.round((world.x - WEST_GRID_START_X) / GRID_STEP);
				const tileY = Math.round((world.y - WEST_GRID_START_Y) / GRID_STEP);
				if (tileX >= 0 && tileX <= 42 && tileY >= 0 && tileY <= 70) {
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
					(u) => u.state !== 'DEAD' && u.x >= minX && u.x <= maxX && u.y >= minY && u.y <= maxY
				);

				const friendly = selectedUnits.filter((u) => u.team === 'west');
				const targets = friendly.length > 0 ? friendly : selectedUnits;

				if (targets.length > 1) {
					this.onSelectEntity?.({
						type: 'group',
						unitIds: targets.map((u) => u.instanceId)
					});
				} else if (targets.length === 1) {
					this.onSelectEntity?.({
						type: 'unit',
						instanceId: targets[0].instanceId
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
			this.isMouseOverCanvas = false;
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

			// A. Command worker to run to Gold Coin (Warcraft 3: worker runs to coin)
			for (const coin of this.sim.goldCoins) {
				const dx = world.x - coin.x;
				const dy = world.y - coin.y;
				if (dx * dx + dy * dy <= 32 * 32) {
					this.sim.orderWorkerMove('west', coin.x, coin.y);
					this.moveMarkers.push({
						x: coin.x,
						y: coin.y,
						timer: 0.55,
						maxTimer: 0.55
					});
					sound.playWorkerAck();
					return;
				}
			}

			// B. If building placement mode active -> build
			if (this.getSelectedBuildingDefId()) {
				if (this.hoveredTile) {
					if (this.sim.canBuild('west', this.hoveredTile.x, this.hoveredTile.y)) {
						this.onTileClick(this.hoveredTile.x, this.hoveredTile.y);
					} else {
						const px = WEST_GRID_START_X + this.hoveredTile.x * GRID_STEP;
						const py = WEST_GRID_START_Y + this.hoveredTile.y * GRID_STEP;
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

			// D. Check Unit click (friendly, enemy or neutral mobs)
			let closestUnit: Unit | null = null;
			let closestUnitDist = Infinity;
			for (const u of this.sim.units) {
				if (u.state === 'DEAD') continue;
				const dist = Math.hypot(world.x - u.x, world.y - u.y);
				const hitRadius = Math.max(u.size * 2.2, 38);
				if (dist <= hitRadius && dist < closestUnitDist) {
					closestUnitDist = dist;
					closestUnit = u;
				}
			}
			if (closestUnit) {
				this.onSelectEntity?.({ type: 'unit', instanceId: closestUnit.instanceId });
				return;
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

			// F. Check Castle click (West or East Castle)
			const distWestCastle = Math.hypot(
				world.x - this.sim.castles.west.x,
				world.y - this.sim.castles.west.y
			);
			if (distWestCastle <= 110) {
				this.onSelectEntity?.({ type: 'castle', team: 'west' });
				return;
			}
			const distEastCastle = Math.hypot(
				world.x - this.sim.castles.east.x,
				world.y - this.sim.castles.east.y
			);
			if (distEastCastle <= 110) {
				this.onSelectEntity?.({ type: 'castle', team: 'east' });
				return;
			}

			// Default fallback: deselect when clicking on empty ground
			this.onSelectEntity?.(null);
		});
	}

	public drawStaticTerrain(): void {
		this.terrainRenderer.drawStaticTerrain(this.terrainLayer, this.sim.brokenBridge);
		this.lastDrawnBrokenBridge = this.sim.brokenBridge;
	}

	public render(): void {
		if (this.lastDrawnBrokenBridge !== this.sim.brokenBridge) {
			this.drawStaticTerrain();
		}

		const selectedDefId = this.getSelectedBuildingDefId?.() || null;
		const selectedPlacedId = this.getSelectedPlacedBuildingId?.() || null;
		const selectedEntity = this.getSelectedEntity?.() || null;
		const isWorkerSelected = selectedEntity?.type === 'worker';

		this.overlayRenderer.drawGridLayer(this.gridLayer, selectedDefId, this.hoveredTile);
		this.entityRenderer.drawBuildingsLayer(this.buildingsLayer, selectedPlacedId);
		this.entityRenderer.drawWorkersLayer(this.workersLayer, isWorkerSelected);
		this.entityRenderer.drawUnitsLayer(this.unitsLayer, selectedEntity, this.enableFog);
		this.entityRenderer.drawCoinsLayer(this.coinsLayer);
		this.entityRenderer.drawCastles(this.buildingsLayer, selectedEntity);
		this.entityRenderer.drawProjectilesLayer(this.projectilesLayer);
		this.entityRenderer.drawRescueStrikeEffects(this.projectilesLayer);
		this.entityRenderer.drawLightningEffects(this.projectilesLayer);
		this.overlayRenderer.drawDayNight(this.dayNightLayer, this.sim.dayNightCycle);
		this.overlayRenderer.drawOrderMarkers(this.uiLayer, this.moveMarkers);
		this.overlayRenderer.drawFogOfWar(this.fogLayer, this.enableFog);
		this.overlayRenderer.drawFloatingTexts(this.floatingTextsLayer, this.sim.floatingTexts);
		this.overlayRenderer.drawSelectionUI(
			this.uiLayer,
			this.isBoxSelecting,
			this.boxStartWorld,
			this.boxCurrentWorld
		);
	}

	public destroy(): void {
		this.isDestroyed = true;
		this.app.destroy(true, { children: true });
	}
}
