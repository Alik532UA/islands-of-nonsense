import 'pixi.js/unsafe-eval';
import { Application, Container, Graphics, Sprite, Texture, Assets } from 'pixi.js';
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
import type { Unit, Castle, PlayerState, MatchTeam } from '../engine/types';
import {
	WEST_CASTLE_X,
	WEST_CASTLE_Y,
	EAST_CASTLE_X,
	EAST_CASTLE_Y,
	EAST_GRID_START_X,
	EAST_GRID_START_Y,
	type DecorationObstacle
} from '../engine/constants';
import { TerrainRenderer } from './terrainRenderer';
import { EntityRenderer, type SelectedEntity } from './entityRenderer';
import { OverlayRenderer } from './overlayRenderer';
import {
	WEST_CASTLE_STAGE_URLS,
	EAST_CASTLE_STAGE_URLS,
	getCastleStageIndex,
	CASTLE_FADE_DURATION_MS,
	CASTLE_STAGE_COOLDOWN_MS,
	canTriggerCastleStageTransition
} from './castleAssets';
import type { GraphicsStyle } from '$lib/services/settings.svelte';
import { stepSmoothCameraPan, type CameraPanInput } from './cameraPan';

export type { SelectedEntity };

export interface RendererOptions {
	canvas: HTMLCanvasElement;
	sim: Simulation;
	graphicsStyle?: GraphicsStyle;
	onTileClick: (tileX: number, tileY: number, shiftKey?: boolean) => void;
	onSelectEntity?: (entity: SelectedEntity) => void;
	getSelectedEntity?: () => SelectedEntity;
	getSelectedBuildingDefId: () => string | null;
	getSelectedPlacedBuildingId?: () => string | null;
	getActiveControlPlayer?: () => PlayerState | null;
	onCameraChange?: (camX: number, camY: number, zoom: number) => void;
}

export class ArenaRenderer {
	private app: Application;
	public sim: Simulation;
	public graphicsStyle: GraphicsStyle = '2.5d';
	private onTileClick: (tileX: number, tileY: number, shiftKey?: boolean) => void;
	private onSelectEntity?: (entity: SelectedEntity) => void;
	private getSelectedEntity?: () => SelectedEntity;
	private getSelectedBuildingDefId: () => string | null;
	private getSelectedPlacedBuildingId?: () => string | null;
	private getActiveControlPlayer?: () => PlayerState | null;
	public onCameraChange?: (camX: number, camY: number, zoom: number) => void;

	// Viewport & RTS Camera Navigation
	public cameraX = 800;
	public cameraY = 1200;
	public zoom = 0.85;
	public minZoom = 0.16;
	public maxZoom = 2.0;
	private isPanning = false;
	private panStartX = 0;
	private panStartY = 0;
	private panStartCamX = 0;
	private panStartCamY = 0;
	private mouseScreenX = 0;
	private mouseScreenY = 0;
	private isMouseOverCanvas = false;
	private keyPan: CameraPanInput = { left: false, right: false, up: false, down: false };
	private camVelX = 0;
	private camVelY = 0;

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
	private waterLayer: Graphics;
	private terrainLayer: Graphics;
	private gridLayer: Graphics;
	private castleGlowLayer: Graphics;
	private castlesLayer: Container;
	private castleShadowGraphics: Graphics;
	private buildingsLayer: Graphics;
	private coinsLayer: Graphics;
	private workersLayer: Graphics;
	private unitsLayer: Graphics;
	private projectilesLayer: Graphics;
	private castlesOverlayLayer: Graphics;
	private dayNightLayer: Graphics;
	private fogLayer: Container;
	private floatingTextsLayer: Container;
	private markersLayer: Graphics;
	private uiLayer: Graphics;

	// Castle progressive destruction sprites with smooth 400ms crossfade
	private westCastleTextures: Texture[] = [];
	private eastCastleTextures: Texture[] = [];
	private westCastleBaseSprite: Sprite | null = null;
	private westCastleFadeSprite: Sprite | null = null;
	private eastCastleBaseSprite: Sprite | null = null;
	private eastCastleFadeSprite: Sprite | null = null;

	private westCastleStage = 0;
	private westCastleTargetStage = 0;
	private westCastleFadeStartTime = 0;
	private westCastleLastStageChangeTime = 0;
	private westCastleIsFading = false;

	private eastCastleStage = 0;
	private eastCastleTargetStage = 0;
	private eastCastleFadeStartTime = 0;
	private eastCastleLastStageChangeTime = 0;
	private eastCastleIsFading = false;

	private hoveredTile: { x: number; y: number } | null = null;
	private isDestroyed = false;
	private tickerFn: (() => void) | null = null;
	private windowMouseUpHandler: ((e: MouseEvent) => void) | null = null;
	private windowResizeHandler: (() => void) | null = null;
	private resizeObserver: ResizeObserver | null = null;
	private canvasEl: HTMLCanvasElement | null = null;
	private lastDrawnBrokenBridge: 'top' | 'mid' | 'bottom' | null = undefined as unknown as null;
	private lastDrawnDecorations: DecorationObstacle[] | null = null;

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
		this.getActiveControlPlayer = options.getActiveControlPlayer;
		this.onCameraChange = options.onCameraChange;
		this.graphicsStyle = options.graphicsStyle ?? '2.5d';

		this.app = new Application();
		this.rootContainer = new Container();
		this.waterLayer = new Graphics();
		this.terrainLayer = new Graphics();
		this.gridLayer = new Graphics();
		this.castleGlowLayer = new Graphics();
		this.castlesLayer = new Container();
		this.castleShadowGraphics = new Graphics();
		this.buildingsLayer = new Graphics();
		this.coinsLayer = new Graphics();
		this.workersLayer = new Graphics();
		this.unitsLayer = new Graphics();
		this.projectilesLayer = new Graphics();
		this.castlesOverlayLayer = new Graphics();
		this.dayNightLayer = new Graphics();
		this.fogLayer = new Container();
		this.floatingTextsLayer = new Container();
		this.markersLayer = new Graphics();
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
		this.resetCastleVisuals();
	}

	public resetCastleVisuals(): void {
		if (this.westCastleBaseSprite && this.westCastleTextures[0]) {
			this.westCastleBaseSprite.texture = this.westCastleTextures[0];
			this.westCastleBaseSprite.alpha = 1;
		}
		if (this.westCastleFadeSprite && this.westCastleTextures[0]) {
			this.westCastleFadeSprite.texture = this.westCastleTextures[0];
			this.westCastleFadeSprite.alpha = 0;
			this.westCastleFadeSprite.visible = false;
		}
		this.westCastleStage = 0;
		this.westCastleTargetStage = 0;
		this.westCastleFadeStartTime = 0;
		this.westCastleLastStageChangeTime = 0;
		this.westCastleIsFading = false;

		if (this.eastCastleBaseSprite && this.eastCastleTextures[0]) {
			this.eastCastleBaseSprite.texture = this.eastCastleTextures[0];
			this.eastCastleBaseSprite.alpha = 1;
		}
		if (this.eastCastleFadeSprite && this.eastCastleTextures[0]) {
			this.eastCastleFadeSprite.texture = this.eastCastleTextures[0];
			this.eastCastleFadeSprite.alpha = 0;
			this.eastCastleFadeSprite.visible = false;
		}
		this.eastCastleStage = 0;
		this.eastCastleTargetStage = 0;
		this.eastCastleFadeStartTime = 0;
		this.eastCastleLastStageChangeTime = 0;
		this.eastCastleIsFading = false;
	}

	public async loadCastleTexturesIfNeeded(): Promise<void> {
		if (this.westCastleTextures.length > 0) return;
		try {
			const [westLoaded, eastLoaded] = await Promise.all([
				Promise.all(WEST_CASTLE_STAGE_URLS.map((url) => Assets.load<Texture>(url))),
				Promise.all(EAST_CASTLE_STAGE_URLS.map((url) => Assets.load<Texture>(url)))
			]);
			this.westCastleTextures = westLoaded;
			this.eastCastleTextures = eastLoaded;

			if (this.westCastleTextures[0] && !this.westCastleBaseSprite) {
				this.westCastleBaseSprite = new Sprite(this.westCastleTextures[0]);
				this.westCastleBaseSprite.anchor.set(0.5, 0.5);
				this.westCastleBaseSprite.x = WEST_CASTLE_X;
				this.westCastleBaseSprite.y = WEST_CASTLE_Y - 20;
				this.westCastleBaseSprite.width = 410;
				this.westCastleBaseSprite.height = 380;
				this.westCastleBaseSprite.alpha = 1;

				this.westCastleFadeSprite = new Sprite(this.westCastleTextures[0]);
				this.westCastleFadeSprite.anchor.set(0.5, 0.5);
				this.westCastleFadeSprite.x = WEST_CASTLE_X;
				this.westCastleFadeSprite.y = WEST_CASTLE_Y - 20;
				this.westCastleFadeSprite.width = 410;
				this.westCastleFadeSprite.height = 380;
				this.westCastleFadeSprite.alpha = 0;
				this.westCastleFadeSprite.visible = false;

				this.castlesLayer.addChild(this.westCastleBaseSprite);
				this.castlesLayer.addChild(this.westCastleFadeSprite);
			}

			if (this.eastCastleTextures[0] && !this.eastCastleBaseSprite) {
				this.eastCastleBaseSprite = new Sprite(this.eastCastleTextures[0]);
				this.eastCastleBaseSprite.anchor.set(0.5, 0.5);
				this.eastCastleBaseSprite.x = EAST_CASTLE_X;
				this.eastCastleBaseSprite.y = EAST_CASTLE_Y - 15;
				this.eastCastleBaseSprite.width = 415;
				this.eastCastleBaseSprite.height = 335;
				this.eastCastleBaseSprite.alpha = 1;

				this.eastCastleFadeSprite = new Sprite(this.eastCastleTextures[0]);
				this.eastCastleFadeSprite.anchor.set(0.5, 0.5);
				this.eastCastleFadeSprite.x = EAST_CASTLE_X;
				this.eastCastleFadeSprite.y = EAST_CASTLE_Y - 15;
				this.eastCastleFadeSprite.width = 415;
				this.eastCastleFadeSprite.height = 335;
				this.eastCastleFadeSprite.alpha = 0;
				this.eastCastleFadeSprite.visible = false;

				this.castlesLayer.addChild(this.eastCastleBaseSprite);
				this.castlesLayer.addChild(this.eastCastleFadeSprite);
			}
		} catch {
			// In case preloading fails, renderCastles handles procedural authentic castle fallback
		}
	}

	public setGraphicsStyle(style: GraphicsStyle): void {
		if (this.graphicsStyle === style) return;
		this.graphicsStyle = style;
		if (style === '2.5d') {
			if (this.westCastleBaseSprite) this.westCastleBaseSprite.visible = false;
			if (this.westCastleFadeSprite) this.westCastleFadeSprite.visible = false;
			if (this.eastCastleBaseSprite) this.eastCastleBaseSprite.visible = false;
			if (this.eastCastleFadeSprite) this.eastCastleFadeSprite.visible = false;
		} else if (style === 'hd-webp') {
			void this.loadCastleTexturesIfNeeded();
		}
	}

	public async init(canvas: HTMLCanvasElement): Promise<void> {
		this.canvasEl = canvas;
		this.enableFog = this.sim.config.fogOfWar ?? true;
		const hostEl = canvas.parentElement ?? canvas;
		const rect = hostEl.getBoundingClientRect();
		const initWidth = Math.max(1, Math.round(rect.width || window.innerWidth || 1200));
		const initHeight = Math.max(1, Math.round(rect.height || window.innerHeight || 600));

		await this.app.init({
			canvas,
			width: initWidth,
			height: initHeight,
			backgroundColor: 0x012e4a,
			resolution: window.devicePixelRatio || 1,
			autoDensity: true
		});

		// Prevent PixiJS autoDensity inline px styles from locking canvas size on resize
		canvas.style.width = '100%';
		canvas.style.height = '100%';

		this.app.stage.addChild(this.rootContainer);
		this.rootContainer.addChild(this.waterLayer);
		this.rootContainer.addChild(this.terrainLayer);
		this.rootContainer.addChild(this.gridLayer);
		this.rootContainer.addChild(this.castleGlowLayer);
		this.rootContainer.addChild(this.castlesLayer);
		this.rootContainer.addChild(this.buildingsLayer);
		this.rootContainer.addChild(this.coinsLayer);
		this.rootContainer.addChild(this.workersLayer);
		this.rootContainer.addChild(this.unitsLayer);
		this.rootContainer.addChild(this.projectilesLayer);
		this.rootContainer.addChild(this.castlesOverlayLayer);
		this.rootContainer.addChild(this.dayNightLayer);
		this.rootContainer.addChild(this.fogLayer);
		this.rootContainer.addChild(this.floatingTextsLayer);
		this.rootContainer.addChild(this.markersLayer);
		this.rootContainer.addChild(this.uiLayer);

		// Setup Progressive Destruction Castle Textures & Sprites
		this.castlesLayer.addChild(this.castleShadowGraphics);

		if (this.graphicsStyle === 'hd-webp') {
			await this.loadCastleTexturesIfNeeded();
		}

		this.setupInteraction(canvas);
		this.drawStaticTerrain();

		if (typeof ResizeObserver !== 'undefined') {
			this.resizeObserver = new ResizeObserver(() => {
				if (!this.isDestroyed) {
					this.syncViewportSize(true);
				}
			});
			this.resizeObserver.observe(hostEl);
		}

		if (typeof window !== 'undefined') {
			this.windowResizeHandler = () => {
				if (!this.isDestroyed) {
					this.syncViewportSize(true);
				}
			};
			window.addEventListener('resize', this.windowResizeHandler);
		}

		this.tickerFn = () => {
			if (!this.isDestroyed) {
				this.updateCamera();
				this.render();
			}
		};
		this.app.ticker.add(this.tickerFn);
	}

	public getVisibleWorldBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
		const screenW = this.app?.screen?.width || 1200;
		const screenH = this.app?.screen?.height || 800;
		const halfW = screenW / (2 * this.zoom);
		const halfH = screenH / (2 * this.zoom);
		return {
			minX: this.cameraX - halfW,
			minY: this.cameraY - halfH,
			maxX: this.cameraX + halfW,
			maxY: this.cameraY + halfH
		};
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

	public setKeyboardPan(dir: Partial<CameraPanInput>): void {
		if (dir.left !== undefined) this.keyPan.left = dir.left;
		if (dir.right !== undefined) this.keyPan.right = dir.right;
		if (dir.up !== undefined) this.keyPan.up = dir.up;
		if (dir.down !== undefined) this.keyPan.down = dir.down;
	}

	public clearKeyboardPan(): void {
		this.keyPan.left = false;
		this.keyPan.right = false;
		this.keyPan.up = false;
		this.keyPan.down = false;
		this.camVelX = 0;
		this.camVelY = 0;
	}

	public setCamera(x: number, y: number, zoom?: number): void {
		this.camVelX = 0;
		this.camVelY = 0;
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

	public syncViewportSize(forceRedraw = false): boolean {
		if (!this.canvasEl || !this.app?.renderer) return false;
		const hostEl = this.canvasEl.parentElement ?? this.canvasEl;
		const rect = hostEl.getBoundingClientRect();
		const targetW = Math.max(1, Math.round(rect.width));
		const targetH = Math.max(1, Math.round(rect.height));
		if (targetW <= 0 || targetH <= 0) return false;

		const targetDpr = Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
		const sizeChanged = this.app.screen.width !== targetW || this.app.screen.height !== targetH;
		const dprChanged = this.app.renderer.resolution !== targetDpr;

		if (sizeChanged || dprChanged) {
			if (dprChanged) {
				this.app.renderer.resolution = targetDpr;
			}
			this.app.renderer.resize(targetW, targetH);
			this.canvasEl.style.width = '100%';
			this.canvasEl.style.height = '100%';

			if (forceRedraw) {
				this.updateCamera(false);
				this.render();
				this.onCameraChange?.(this.cameraX, this.cameraY, this.zoom);
			}
			return true;
		}
		return false;
	}

	private updateCamera(checkResize = true): void {
		const resized = checkResize ? this.syncViewportSize(false) : false;

		const prevCamX = this.cameraX;
		const prevCamY = this.cameraY;
		const screenW = this.app.screen.width;
		const screenH = this.app.screen.height;
		const dt = this.app?.ticker?.deltaMS ? this.app.ticker.deltaMS / 1000 : 1 / 60;

		// Edge scrolling for RTS mouse navigation + smooth keyboard panning (WASD / Arrows)
		const edgeMargin = 25;
		const allowEdge = this.isMouseOverCanvas && !this.isPanning && !this.isBoxSelecting;
		const edgeInput: CameraPanInput = {
			left: allowEdge && this.mouseScreenX < edgeMargin,
			right: allowEdge && this.mouseScreenX > screenW - edgeMargin,
			up: allowEdge && this.mouseScreenY < edgeMargin,
			down: allowEdge && this.mouseScreenY > screenH - edgeMargin
		};

		if (this.isPanning) {
			this.camVelX = 0;
			this.camVelY = 0;
		} else {
			const next = stepSmoothCameraPan(
				{ x: this.cameraX, y: this.cameraY, vx: this.camVelX, vy: this.camVelY },
				this.keyPan,
				edgeInput,
				this.zoom,
				dt
			);
			this.cameraX = next.x;
			this.cameraY = next.y;
			this.camVelX = next.vx;
			this.camVelY = next.vy;
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

		if (
			resized ||
			Math.abs(this.cameraX - prevCamX) > 0.01 ||
			Math.abs(this.cameraY - prevCamY) > 0.01
		) {
			this.onCameraChange?.(this.cameraX, this.cameraY, this.zoom);
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

			// RIGHT CLICK: Cancel Building Placement OR Move Worker / Order Action / Repair
			if (e.button === 2) {
				e.preventDefault();
				const activePlayer = this.getActiveControlPlayer?.() ?? this.sim.players.west;
				const activeTeam: MatchTeam = activePlayer.team;

				// If in building placement mode, cancel placement (Warcraft 3 style)
				if (this.getSelectedBuildingDefId()) {
					this.onSelectEntity?.({ type: 'worker', playerSlot: activePlayer.slot });
					return;
				}

				// Spawn animated RTS order chevron
				this.moveMarkers.push({
					x: world.x,
					y: world.y,
					timer: 0.55,
					maxTimer: 0.55
				});
				sound.playWorkerAck();

				// Check if RMB clicked a gold coin (command active worker to collect it)
				const clickedCoin = this.sim.goldCoins.find(
					(c) => Math.hypot(world.x - c.x, world.y - c.y) <= 32
				);
				if (clickedCoin) {
					this.sim.orderWorkerMove(activeTeam, clickedCoin.x, clickedCoin.y, activePlayer);
					return;
				}

				// Check if RMB clicked an injured friendly building or castle to repair / continue construction
				const clickedBuilding = this.sim.buildings.find(
					(b) =>
						b.team === activeTeam &&
						Math.abs(world.x - (b.x + CELL_SIZE / 2)) <= CELL_SIZE &&
						Math.abs(world.y - (b.y + CELL_SIZE / 2)) <= CELL_SIZE
				);
				const teamCastle = this.sim.castles[activeTeam];
				const clickedCastle = Math.hypot(world.x - teamCastle.x, world.y - teamCastle.y) <= 80;

				if (clickedBuilding) {
					if (clickedBuilding.isUnderConstruction) {
						this.sim.continueConstruction(activeTeam, clickedBuilding.instanceId, activePlayer);
						return;
					}
					if (clickedBuilding.hp < clickedBuilding.maxHp) {
						this.sim.repairBuilding(activeTeam, clickedBuilding.instanceId, activePlayer);
						return;
					}
				} else if (clickedCastle && teamCastle.hp < teamCastle.maxHp) {
					this.sim.repairBuilding(activeTeam, `castle_${activeTeam}`, activePlayer);
					return;
				}

				// Otherwise regular move worker order
				this.sim.moveWorker(activeTeam, world.x, world.y, activePlayer);
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

			// Hovered Tile calculation on Active Island Platform (Warcraft III Grid Planning with GRID_STEP = 32px)
			if (this.getSelectedBuildingDefId()) {
				const activeTeam: MatchTeam = this.getActiveControlPlayer?.()?.team ?? 'west';
				const gridStartX = activeTeam === 'east' ? EAST_GRID_START_X : WEST_GRID_START_X;
				const gridStartY = activeTeam === 'east' ? EAST_GRID_START_Y : WEST_GRID_START_Y;
				const minTileX = activeTeam === 'east' ? -52 : 0;
				const maxTileX = activeTeam === 'east' ? 42 : 96;
				const tileX = Math.round((world.x - gridStartX) / GRID_STEP);
				const tileY = Math.round((world.y - gridStartY) / GRID_STEP);
				if (tileX >= minTileX && tileX <= maxTileX && tileY >= 0 && tileY <= 70) {
					this.hoveredTile = { x: tileX, y: tileY };
				} else {
					this.hoveredTile = null;
				}
			} else {
				this.hoveredTile = null;
			}
		});

		// 4. Mouse Up / Click
		this.windowMouseUpHandler = (e: MouseEvent) => {
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
		};
		window.addEventListener('mouseup', this.windowMouseUpHandler);

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

			const activePlayer = this.getActiveControlPlayer?.() ?? this.sim.players.west;
			const activeTeam: MatchTeam = activePlayer.team;

			// A. Command active worker to run to Gold Coin (Warcraft 3: worker runs to coin)
			for (const coin of this.sim.goldCoins) {
				const dx = world.x - coin.x;
				const dy = world.y - coin.y;
				if (dx * dx + dy * dy <= 32 * 32) {
					this.sim.orderWorkerMove(activeTeam, coin.x, coin.y, activePlayer);
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
					const gridStartX = activeTeam === 'east' ? EAST_GRID_START_X : WEST_GRID_START_X;
					const gridStartY = activeTeam === 'east' ? EAST_GRID_START_Y : WEST_GRID_START_Y;
					if (this.sim.canBuild(activeTeam, this.hoveredTile.x, this.hoveredTile.y)) {
						this.onTileClick(this.hoveredTile.x, this.hoveredTile.y, e.shiftKey);
					} else {
						const px = gridStartX + this.hoveredTile.x * GRID_STEP;
						const py = gridStartY + this.hoveredTile.y * GRID_STEP;
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

			// C. Check Worker click across ALL players/bots (West & East, 1v1 / 2v2 / 3v3 / botVsBot)
			const allWorkersPlayers = this.sim.allPlayers?.length
				? this.sim.allPlayers
				: [this.sim.players.west, this.sim.players.east];
			let closestWorkerSlot: number | null = null;
			let closestWorkerDist = Infinity;
			for (const p of allWorkersPlayers) {
				const w = p?.worker;
				if (!w) continue;
				if (this.enableFog && p.team !== 'west' && !this.sim.isPointRevealed('west', w.x, w.y)) {
					continue;
				}
				const wDist = Math.hypot(world.x - w.x, world.y - w.y);
				if (wDist <= 34 && wDist < closestWorkerDist) {
					closestWorkerDist = wDist;
					closestWorkerSlot = p.slot ?? (p.team === 'west' ? 1 : 2);
				}
			}
			if (closestWorkerSlot !== null) {
				this.onSelectEntity?.({ type: 'worker', playerSlot: closestWorkerSlot });
				return;
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
			if (distWestCastle <= 150) {
				this.onSelectEntity?.({ type: 'castle', team: 'west' });
				return;
			}
			const distEastCastle = Math.hypot(
				world.x - this.sim.castles.east.x,
				world.y - this.sim.castles.east.y
			);
			if (distEastCastle <= 150) {
				this.onSelectEntity?.({ type: 'castle', team: 'east' });
				return;
			}

			// Default fallback: deselect when clicking on empty ground
			this.onSelectEntity?.(null);
		});
	}

	public drawStaticTerrain(): void {
		this.terrainRenderer.drawStaticTerrain(
			this.terrainLayer,
			this.sim.brokenBridge,
			1337,
			this.sim.decorations
		);
		this.lastDrawnBrokenBridge = this.sim.brokenBridge;
		this.lastDrawnDecorations = this.sim.decorations;
	}

	public render(): void {
		if (
			this.lastDrawnBrokenBridge !== this.sim.brokenBridge ||
			this.lastDrawnDecorations !== this.sim.decorations
		) {
			this.drawStaticTerrain();
		}

		this.terrainRenderer.drawDynamicWater(this.waterLayer, performance.now() * 0.001);

		const selectedDefId = this.getSelectedBuildingDefId?.() || null;
		const selectedPlacedId = this.getSelectedPlacedBuildingId?.() || null;
		const selectedEntity = this.getSelectedEntity?.() || null;
		const activeControlPlayer = this.getActiveControlPlayer?.() ?? this.sim.players.west;
		const selectedWorkerSlot =
			selectedEntity?.type === 'worker'
				? (selectedEntity.playerSlot ?? activeControlPlayer.slot ?? 1)
				: null;
		const bounds = this.getVisibleWorldBounds();

		this.overlayRenderer.drawGridLayer(
			this.gridLayer,
			selectedDefId,
			this.hoveredTile,
			activeControlPlayer.team
		);
		this.entityRenderer.drawBuildingsLayer(
			this.buildingsLayer,
			selectedPlacedId,
			this.enableFog,
			bounds
		);
		this.entityRenderer.drawWorkersLayer(
			this.workersLayer,
			selectedWorkerSlot,
			this.enableFog,
			bounds
		);
		this.entityRenderer.drawUnitsLayer(this.unitsLayer, selectedEntity, this.enableFog, bounds);
		this.entityRenderer.drawCoinsLayer(this.coinsLayer, this.enableFog, bounds);
		this.renderCastles(selectedEntity);
		this.entityRenderer.drawProjectilesLayer(this.projectilesLayer, this.enableFog, bounds);
		this.entityRenderer.drawRescueStrikeEffects(this.projectilesLayer);
		this.entityRenderer.drawLightningEffects(this.projectilesLayer);
		this.overlayRenderer.drawDayNight(
			this.dayNightLayer,
			this.sim.dayNightCycle,
			this.castleGlowLayer,
			bounds
		);
		this.overlayRenderer.drawOrderMarkers(this.markersLayer, this.moveMarkers);
		this.overlayRenderer.drawFogOfWar(this.fogLayer, this.enableFog);
		this.overlayRenderer.drawFloatingTexts(this.floatingTextsLayer, this.sim.floatingTexts);
		this.overlayRenderer.drawSelectionUI(
			this.uiLayer,
			this.isBoxSelecting,
			this.boxStartWorld,
			this.boxCurrentWorld
		);
	}

	private updateCastleCrossfade(
		isWest: boolean,
		hp: number,
		maxHp: number,
		textures: Texture[],
		baseSprite: Sprite | null,
		fadeSprite: Sprite | null
	): boolean {
		if (!baseSprite || !fadeSprite || textures.length === 0) return false;

		const targetStage = getCastleStageIndex(hp, maxHp);
		const targetTexture = textures[targetStage];
		if (!targetTexture || targetTexture.width <= 1) return false;

		const currentStage = isWest ? this.westCastleStage : this.eastCastleStage;
		const inFade = isWest ? this.westCastleIsFading : this.eastCastleIsFading;
		const fadeTarget = isWest ? this.westCastleTargetStage : this.eastCastleTargetStage;
		const now = performance.now();

		// Detect full restore (e.g. new round or match restart with full HP)
		if (targetStage === 0 && (currentStage > 1 || fadeTarget > 1)) {
			baseSprite.texture = textures[0];
			baseSprite.alpha = 1;
			fadeSprite.texture = textures[0];
			fadeSprite.alpha = 0;
			fadeSprite.visible = false;
			if (isWest) {
				this.westCastleStage = 0;
				this.westCastleTargetStage = 0;
				this.westCastleFadeStartTime = 0;
				this.westCastleLastStageChangeTime = 0;
				this.westCastleIsFading = false;
			} else {
				this.eastCastleStage = 0;
				this.eastCastleTargetStage = 0;
				this.eastCastleFadeStartTime = 0;
				this.eastCastleLastStageChangeTime = 0;
				this.eastCastleIsFading = false;
			}
			baseSprite.visible = true;
			return true;
		}

		// Stage transition check with 1000ms boundary fluctuation cooldown
		const activeTarget = inFade ? fadeTarget : currentStage;
		const lastChangeTime = isWest
			? this.westCastleLastStageChangeTime
			: this.eastCastleLastStageChangeTime;

		if (
			canTriggerCastleStageTransition(now, lastChangeTime, activeTarget, targetStage, hp, maxHp)
		) {
			if (inFade) {
				// Mid-fade retarget: promote the currently transitioning texture to base
				baseSprite.texture = fadeSprite.texture;
				baseSprite.alpha = 1;
			}
			fadeSprite.texture = targetTexture;
			fadeSprite.alpha = 0;
			fadeSprite.visible = true;

			if (isWest) {
				this.westCastleTargetStage = targetStage;
				this.westCastleFadeStartTime = now;
				this.westCastleLastStageChangeTime = now;
				this.westCastleIsFading = true;
			} else {
				this.eastCastleTargetStage = targetStage;
				this.eastCastleFadeStartTime = now;
				this.eastCastleLastStageChangeTime = now;
				this.eastCastleIsFading = true;
			}
		}

		// Progress smooth 400ms crossfade
		const isCurrentlyFading = isWest ? this.westCastleIsFading : this.eastCastleIsFading;
		if (isCurrentlyFading) {
			const startTime = isWest ? this.westCastleFadeStartTime : this.eastCastleFadeStartTime;
			const progress = Math.min(1, Math.max(0, (now - startTime) / CASTLE_FADE_DURATION_MS));
			fadeSprite.alpha = progress;
			fadeSprite.visible = true;

			if (progress >= 1) {
				baseSprite.texture = fadeSprite.texture;
				baseSprite.alpha = 1;
				fadeSprite.alpha = 0;
				fadeSprite.visible = false;
				if (isWest) {
					this.westCastleStage = this.westCastleTargetStage;
					this.westCastleIsFading = false;
				} else {
					this.eastCastleStage = this.eastCastleTargetStage;
					this.eastCastleIsFading = false;
				}
			}
		}

		baseSprite.visible = true;
		return true;
	}

	private renderCastles(selectedEntity?: SelectedEntity | null): void {
		const westCastle = this.sim.castles.west;
		const eastCastle = this.sim.castles.east;

		// 1. Clear shadow & fallback graphics layer
		this.castleShadowGraphics.clear();

		const westSelected = selectedEntity?.type === 'castle' && selectedEntity.team === 'west';
		const eastSelected = selectedEntity?.type === 'castle' && selectedEntity.team === 'east';

		if (this.graphicsStyle === '2.5d') {
			// 2.5D Mode: ensure WebP sprites are invisible and render procedural authentic castles
			if (this.westCastleBaseSprite) this.westCastleBaseSprite.visible = false;
			if (this.westCastleFadeSprite) this.westCastleFadeSprite.visible = false;
			if (this.eastCastleBaseSprite) this.eastCastleBaseSprite.visible = false;
			if (this.eastCastleFadeSprite) this.eastCastleFadeSprite.visible = false;

			this.entityRenderer.renderAuthenticCastle(
				this.castleShadowGraphics,
				westCastle,
				true,
				westSelected
			);
			this.entityRenderer.renderAuthenticCastle(
				this.castleShadowGraphics,
				eastCastle,
				false,
				eastSelected
			);
		} else {
			// HD WebP Mode (Beta):
			// 2. Render 2.5D ambient drop shadows beneath the castle bases
			this.castleShadowGraphics.ellipse(WEST_CASTLE_X + 8, WEST_CASTLE_Y + 75, 175, 68);
			this.castleShadowGraphics.fill({ color: 0x000000, alpha: 0.42 });
			this.castleShadowGraphics.ellipse(EAST_CASTLE_X + 6, EAST_CASTLE_Y + 68, 180, 64);
			this.castleShadowGraphics.fill({ color: 0x000000, alpha: 0.45 });

			// 3. Update West Castle (Human) Sprite stage based on HP with 400ms smooth fade
			const westSuccess = this.updateCastleCrossfade(
				true,
				westCastle.hp,
				westCastle.maxHp,
				this.westCastleTextures,
				this.westCastleBaseSprite,
				this.westCastleFadeSprite
			);
			if (!westSuccess) {
				if (this.westCastleBaseSprite) this.westCastleBaseSprite.visible = false;
				if (this.westCastleFadeSprite) this.westCastleFadeSprite.visible = false;
				this.entityRenderer.renderAuthenticCastle(
					this.castleShadowGraphics,
					westCastle,
					true,
					westSelected
				);
			}

			// 4. Update East Castle (Chaos) Sprite stage based on HP with 400ms smooth fade
			const eastSuccess = this.updateCastleCrossfade(
				false,
				eastCastle.hp,
				eastCastle.maxHp,
				this.eastCastleTextures,
				this.eastCastleBaseSprite,
				this.eastCastleFadeSprite
			);
			if (!eastSuccess) {
				if (this.eastCastleBaseSprite) this.eastCastleBaseSprite.visible = false;
				if (this.eastCastleFadeSprite) this.eastCastleFadeSprite.visible = false;
				this.entityRenderer.renderAuthenticCastle(
					this.castleShadowGraphics,
					eastCastle,
					false,
					eastSelected
				);
			}
		}

		// 5. Render Selection rings (for HD sprites) and Tactical Health Bars in overlay layer
		this.castlesOverlayLayer.clear();
		if (this.graphicsStyle !== '2.5d') {
			if (westSelected) {
				this.castlesOverlayLayer.beginPath();
				this.castlesOverlayLayer.ellipse(WEST_CASTLE_X, WEST_CASTLE_Y + 30, 195, 82);
				this.castlesOverlayLayer.stroke({ color: 0xfbbf24, width: 3.5, alpha: 0.95 });
			}
			if (eastSelected) {
				this.castlesOverlayLayer.beginPath();
				this.castlesOverlayLayer.ellipse(EAST_CASTLE_X, EAST_CASTLE_Y + 25, 200, 78);
				this.castlesOverlayLayer.stroke({ color: 0xf43f5e, width: 3.5, alpha: 0.95 });
			}
		}

		// High-contrast RTS Health Bars hovering directly above each castle
		this.drawCastleHealthBar(WEST_CASTLE_X, WEST_CASTLE_Y - 180, westCastle, true);
		this.drawCastleHealthBar(EAST_CASTLE_X, EAST_CASTLE_Y - 170, eastCastle, false);
	}

	private drawCastleHealthBar(cx: number, cy: number, castle: Castle, isWest: boolean): void {
		const barW = 180;
		const barH = 11;
		const barX = cx - barW / 2;
		const barY = cy;
		const hpPct = Math.max(0, Math.min(1, castle.hp / castle.maxHp));

		// Heavy dark border panel
		const castleBorderColor = castle.color?.num ?? (isWest ? 0x2563eb : 0xdc2626);
		this.castlesOverlayLayer.beginPath();
		this.castlesOverlayLayer.roundRect(barX - 2, barY - 2, barW + 4, barH + 4, 3);
		this.castlesOverlayLayer.fill({ color: 0x090d16, alpha: 0.92 });
		this.castlesOverlayLayer.stroke({ color: castleBorderColor, width: 2 });

		// Progress fill
		if (hpPct > 0) {
			const color = hpPct > 0.5 ? 0x22c55e : hpPct > 0.25 ? 0xf59e0b : 0xef4444;
			this.castlesOverlayLayer.beginPath();
			this.castlesOverlayLayer.roundRect(barX, barY, Math.max(3, barW * hpPct), barH, 2);
			this.castlesOverlayLayer.fill({ color });

			// Top gloss highlight
			this.castlesOverlayLayer.beginPath();
			this.castlesOverlayLayer.rect(barX, barY, Math.max(3, barW * hpPct), 3);
			this.castlesOverlayLayer.fill({ color: 0xffffff, alpha: 0.35 });
		}
	}

	public get destroyed(): boolean {
		return this.isDestroyed;
	}

	public destroy(): void {
		if (this.isDestroyed) return;
		this.isDestroyed = true;

		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}

		if (typeof window !== 'undefined' && this.windowResizeHandler) {
			window.removeEventListener('resize', this.windowResizeHandler);
			this.windowResizeHandler = null;
		}

		if (typeof window !== 'undefined' && this.windowMouseUpHandler) {
			window.removeEventListener('mouseup', this.windowMouseUpHandler);
			this.windowMouseUpHandler = null;
		}

		if (this.tickerFn && this.app?.ticker) {
			this.app.ticker.remove(this.tickerFn);
			this.tickerFn = null;
		}

		this.overlayRenderer?.destroy();

		if (this.app) {
			try {
				this.app.ticker?.stop();
				this.app.destroy(true, { children: true });
			} catch {
				// Prevent crashes during headless/mocked teardown
			}
		}

		this.canvasEl = null;
		this.westCastleTextures = [];
		this.eastCastleTextures = [];
		this.westCastleBaseSprite = null;
		this.westCastleFadeSprite = null;
		this.eastCastleBaseSprite = null;
		this.eastCastleFadeSprite = null;
	}
}
