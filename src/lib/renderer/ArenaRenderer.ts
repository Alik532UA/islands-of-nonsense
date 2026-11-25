import 'pixi.js/unsafe-eval';
import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';

const castleTextureCache = new Map<string, Promise<Texture>>();
function loadCastleTexture(url: string): Promise<Texture> {
	let cached = castleTextureCache.get(url);
	if (!cached) {
		cached = new Promise<Texture>((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(Texture.from(img));
			img.onerror = (err) => {
				castleTextureCache.delete(url);
				reject(err);
			};
			img.src = url;
		});
		castleTextureCache.set(url, cached);
	}
	return cached;
}
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
import { computeSunShadow } from './buildingModels';
import {
	WEST_CASTLE_STAGE_URLS,
	EAST_CASTLE_STAGE_URLS,
	getCastleStageIndex,
	CASTLE_FADE_DURATION_MS,
	canTriggerCastleStageTransition
} from './castleAssets';
import type { GraphicsStyle } from '$lib/services/settings.svelte';
import { stepSmoothCameraPan, type CameraPanInput } from './cameraPan';
import { rc, rr, el } from './gfx';
import { resolveBoxSelection } from './boxSelection';

type CastleVisualSide = {
	textures: Texture[];
	base: Sprite | null;
	fade: Sprite | null;
	stage: number;
	targetStage: number;
	fadeStart: number;
	lastChange: number;
	isFading: boolean;
};

const emptyCastleSide = (): CastleVisualSide => ({
	textures: [],
	base: null,
	fade: null,
	stage: 0,
	targetStage: 0,
	fadeStart: 0,
	lastChange: 0,
	isFading: false
});

export type { SelectedEntity };

export type WorkerCanvasCommand =
	| { type: 'ORDER_WORKER_MOVE'; worldX: number; worldY: number }
	| { type: 'CONTINUE_BUILD'; targetId: string }
	| { type: 'REPAIR'; targetId: string }
	| { type: 'MOVE_WORKER'; worldX: number; worldY: number };

export interface RendererOptions {
	canvas: HTMLCanvasElement;
	sim: Simulation;
	graphicsStyle?: GraphicsStyle;
	onTileClick: (tileX: number, tileY: number, shiftKey?: boolean) => void;
	onWorkerCommand?: (cmd: WorkerCanvasCommand) => boolean;
	onSelectEntity?: (entity: SelectedEntity) => void;
	getSelectedEntity?: () => SelectedEntity;
	getSelectedBuildingDefId: () => string | null;
	getSelectedPlacedBuildingId?: () => string | null;
	getActiveControlPlayer?: () => PlayerState | null;
	getControllableSlots?: () => ReadonlySet<number> | null;
	getIsRescueTargeting?: () => boolean;
	getSpectatorVision?: () => 'all' | 'west' | 'east' | null;
	onRescueTargetClick?: (worldX: number, worldY: number) => void;
	onCancelRescueTargeting?: () => void;
	onCameraChange?: (camX: number, camY: number, zoom: number) => void;
}

export class ArenaRenderer {
	private app: Application;
	public sim: Simulation;
	public graphicsStyle: GraphicsStyle = '2.5d';
	private onTileClick: (tileX: number, tileY: number, shiftKey?: boolean) => void;
	private onWorkerCommand?: (cmd: WorkerCanvasCommand) => boolean;
	private onSelectEntity?: (entity: SelectedEntity) => void;
	private getSelectedEntity?: () => SelectedEntity;
	private getSelectedBuildingDefId: () => string | null;
	private getSelectedPlacedBuildingId?: () => string | null;
	private getActiveControlPlayer?: () => PlayerState | null;
	private getControllableSlots?: () => ReadonlySet<number> | null;
	private getIsRescueTargeting?: () => boolean;
	private getSpectatorVision?: () => 'all' | 'west' | 'east' | null;
	private onRescueTargetClick?: (worldX: number, worldY: number) => void;
	private onCancelRescueTargeting?: () => void;
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
	private suppressNextClick = false;

	// RTS Order Chevrons (RMB click marker)
	private moveMarkers: { x: number; y: number; timer: number; maxTimer: number }[] = [];
	private hoveredCastleCannonMode: 'short' | 'long' | null = null;

	public setHoveredCastleCannonMode(mode: 'short' | 'long' | null): void {
		this.hoveredCastleCannonMode = mode;
	}

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
	private castleVisuals: Record<MatchTeam, CastleVisualSide> = {
		west: emptyCastleSide(),
		east: emptyCastleSide()
	};

	private get westCastleTextures(): Texture[] {
		return this.castleVisuals.west.textures;
	}
	private set westCastleTextures(val: Texture[]) {
		this.castleVisuals.west.textures = val;
	}
	private get eastCastleTextures(): Texture[] {
		return this.castleVisuals.east.textures;
	}
	private set eastCastleTextures(val: Texture[]) {
		this.castleVisuals.east.textures = val;
	}

	private hoveredTile: { x: number; y: number } | null = null;
	private hoveredWorld: { x: number; y: number } | null = null;
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
		this.onWorkerCommand = options.onWorkerCommand;
		this.onSelectEntity = options.onSelectEntity;
		this.getSelectedEntity = options.getSelectedEntity;
		this.getSelectedBuildingDefId = options.getSelectedBuildingDefId;
		this.getSelectedPlacedBuildingId = options.getSelectedPlacedBuildingId;
		this.getActiveControlPlayer = options.getActiveControlPlayer;
		this.getControllableSlots = options.getControllableSlots;
		this.getIsRescueTargeting = options.getIsRescueTargeting;
		this.getSpectatorVision = options.getSpectatorVision;
		this.onRescueTargetClick = options.onRescueTargetClick;
		this.onCancelRescueTargeting = options.onCancelRescueTargeting;
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
		for (const side of [this.castleVisuals.west, this.castleVisuals.east]) {
			const tex0 = side.textures[0];
			if (side.base && tex0) {
				side.base.texture = tex0;
				side.base.alpha = 1;
			}
			if (side.fade && tex0) {
				side.fade.texture = tex0;
				side.fade.alpha = 0;
				side.fade.visible = false;
			}
			side.stage = 0;
			side.targetStage = 0;
			side.fadeStart = 0;
			side.lastChange = 0;
			side.isFading = false;
		}
	}

	private initCastleSprites(
		side: CastleVisualSide,
		x: number,
		y: number,
		width: number,
		height: number
	): void {
		const tex = side.textures[0];
		if (!tex || side.base) return;
		const makeSprite = (visible: boolean, alpha: number) => {
			const sp = new Sprite(tex);
			sp.anchor.set(0.5, 0.5);
			sp.x = x;
			sp.y = y;
			sp.width = width;
			sp.height = height;
			sp.alpha = alpha;
			sp.visible = visible;
			this.castlesLayer.addChild(sp);
			return sp;
		};
		side.base = makeSprite(true, 1);
		side.fade = makeSprite(false, 0);
	}

	public async loadCastleTexturesIfNeeded(): Promise<void> {
		if (this.castleVisuals.west.textures.length > 0) return;
		try {
			const [westLoaded, eastLoaded] = await Promise.all([
				Promise.all(WEST_CASTLE_STAGE_URLS.map(loadCastleTexture)),
				Promise.all(EAST_CASTLE_STAGE_URLS.map(loadCastleTexture))
			]);
			this.castleVisuals.west.textures = westLoaded;
			this.castleVisuals.east.textures = eastLoaded;
			this.initCastleSprites(this.castleVisuals.west, WEST_CASTLE_X, WEST_CASTLE_Y - 20, 410, 380);
			this.initCastleSprites(this.castleVisuals.east, EAST_CASTLE_X, EAST_CASTLE_Y - 15, 415, 335);
		} catch {
			// Fallback handled by renderCastles
		}
	}

	private hideCastleSprites(side?: CastleVisualSide): void {
		const sides = side ? [side] : [this.castleVisuals.west, this.castleVisuals.east];
		for (const s of sides) {
			if (s.base) s.base.visible = false;
			if (s.fade) s.fade.visible = false;
		}
	}

	public setGraphicsStyle(style: GraphicsStyle): void {
		if (this.graphicsStyle === style) return;
		this.graphicsStyle = style;
		if (style === '2.5d') {
			this.hideCastleSprites();
		} else if (style === 'hd-webp') {
			void this.loadCastleTexturesIfNeeded();
		}
	}

	public async init(canvas: HTMLCanvasElement | null | undefined): Promise<void> {
		if (!canvas || this.isDestroyed) return;
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

			// RIGHT CLICK: Cancel Rescue Targeting / Building Placement OR Move Worker / Order Action / Repair
			if (e.button === 2) {
				e.preventDefault();
				if (this.getIsRescueTargeting?.()) {
					this.onCancelRescueTargeting?.();
					return;
				}
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
					if (
						!this.onWorkerCommand?.({
							type: 'ORDER_WORKER_MOVE',
							worldX: clickedCoin.x,
							worldY: clickedCoin.y
						})
					) {
						this.sim.orderWorkerMove(activeTeam, clickedCoin.x, clickedCoin.y, activePlayer);
					}
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
						if (
							!this.onWorkerCommand?.({
								type: 'CONTINUE_BUILD',
								targetId: clickedBuilding.instanceId
							})
						) {
							this.sim.continueConstruction(activeTeam, clickedBuilding.instanceId, activePlayer);
						}
						return;
					}
					if (clickedBuilding.hp < clickedBuilding.maxHp) {
						if (
							!this.onWorkerCommand?.({
								type: 'REPAIR',
								targetId: clickedBuilding.instanceId
							})
						) {
							this.sim.repairBuilding(activeTeam, clickedBuilding.instanceId, activePlayer);
						}
						return;
					}
				} else if (clickedCastle && teamCastle.hp < teamCastle.maxHp) {
					if (
						!this.onWorkerCommand?.({
							type: 'REPAIR',
							targetId: `castle_${activeTeam}`
						})
					) {
						this.sim.repairBuilding(activeTeam, `castle_${activeTeam}`, activePlayer);
					}
					return;
				}

				// Otherwise regular move worker order
				if (
					!this.onWorkerCommand?.({
						type: 'MOVE_WORKER',
						worldX: world.x,
						worldY: world.y
					})
				) {
					this.sim.moveWorker(activeTeam, world.x, world.y, activePlayer);
				}
				return;
			}

			// LEFT CLICK: Start box selection or click
			if (e.button === 0) {
				this.suppressNextClick = false;
				if (!this.getSelectedBuildingDefId() && !this.getIsRescueTargeting?.()) {
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
			this.hoveredWorld = { x: world.x, y: world.y };

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

				const activePlayer = this.getActiveControlPlayer?.() ?? null;
				const viewerTeam: MatchTeam = activePlayer?.team ?? 'west';
				const activeSlot = activePlayer?.slot ?? null;
				const playersList = this.sim.allPlayers?.length
					? this.sim.allPlayers
					: [this.sim.players.west, this.sim.players.east];
				const controllableSlots =
					this.getControllableSlots?.() ??
					(activeSlot !== null ? new Set<number>([activeSlot]) : null);

				const selected = resolveBoxSelection({
					bounds: { minX, maxX, minY, maxY },
					players: playersList,
					units: this.sim.units,
					viewerTeam,
					activeControlSlot: activeSlot,
					controllableSlots,
					enableFog: this.enableFog,
					isPointRevealed: (team, x, y) => this.sim.isPointRevealed(team, x, y)
				});
				if (selected) {
					this.onSelectEntity?.(selected);
				}

				this.suppressNextClick = true;
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
			this.hoveredWorld = null;
			this.isPanning = false;
			this.isBoxSelecting = false;
			this.boxStartWorld = null;
		});

		// 5. Left Click: Select Entity OR Place Building OR Fire Rescue Strike
		canvas.addEventListener('click', (e: MouseEvent) => {
			if (e.button !== 0) return;
			if (this.suppressNextClick) {
				this.suppressNextClick = false;
				return;
			}
			const rect = canvas.getBoundingClientRect();
			const mouseScreenX = e.clientX - rect.left;
			const mouseScreenY = e.clientY - rect.top;
			const world = this.screenToWorld(mouseScreenX, mouseScreenY);

			if (this.getIsRescueTargeting?.()) {
				this.onRescueTargetClick?.(Math.round(world.x), Math.round(world.y));
				return;
			}

			const activePlayer = this.getActiveControlPlayer?.() ?? this.sim.players.west;
			const activeTeam: MatchTeam = activePlayer.team;

			// A. Command active worker to run to Gold Coin (Warcraft 3: worker runs to coin)
			for (const coin of this.sim.goldCoins) {
				if (this.enableFog && !this.sim.isPointRevealed(activeTeam, coin.x, coin.y)) continue;
				const dx = world.x - coin.x;
				const dy = world.y - coin.y;
				if (dx * dx + dy * dy <= 32 * 32) {
					if (
						!this.onWorkerCommand?.({
							type: 'ORDER_WORKER_MOVE',
							worldX: coin.x,
							worldY: coin.y
						})
					) {
						this.sim.orderWorkerMove(activeTeam, coin.x, coin.y, activePlayer);
					}
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
				if (
					this.enableFog &&
					p.team !== activeTeam &&
					!this.sim.isPointRevealed(activeTeam, w.x, w.y)
				) {
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
				if (
					this.enableFog &&
					u.team !== activeTeam &&
					!this.sim.isPointRevealed(activeTeam, u.x, u.y)
				) {
					continue;
				}
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
					this.enableFog &&
					b.team !== activeTeam &&
					!this.sim.isPointRevealed(activeTeam, b.x + CELL_SIZE / 2, b.y + CELL_SIZE / 2)
				) {
					continue;
				}
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

		const spectatorVision = this.getSpectatorVision?.() ?? null;
		const effectiveFog = spectatorVision === 'all' ? false : this.enableFog;
		const viewerTeam: MatchTeam =
			spectatorVision === 'west' || spectatorVision === 'east'
				? spectatorVision
				: activeControlPlayer.team;

		this.overlayRenderer.drawGridLayer(this.gridLayer, selectedDefId, this.hoveredTile, viewerTeam);
		this.entityRenderer.drawBuildingsLayer(
			this.buildingsLayer,
			selectedPlacedId,
			effectiveFog,
			bounds,
			viewerTeam
		);
		this.entityRenderer.drawWorkersLayer(
			this.workersLayer,
			selectedWorkerSlot,
			effectiveFog,
			bounds,
			viewerTeam
		);
		this.entityRenderer.drawUnitsLayer(
			this.unitsLayer,
			selectedEntity,
			effectiveFog,
			bounds,
			viewerTeam
		);
		this.entityRenderer.drawCoinsLayer(this.coinsLayer, effectiveFog, bounds, viewerTeam);
		this.renderCastles(selectedEntity);
		this.entityRenderer.drawProjectilesLayer(
			this.projectilesLayer,
			effectiveFog,
			bounds,
			viewerTeam
		);
		this.entityRenderer.drawRescueStrikeEffects(this.projectilesLayer);
		this.entityRenderer.drawLightningEffects(this.projectilesLayer);
		this.overlayRenderer.drawDayNight(
			this.dayNightLayer,
			this.sim.dayNightCycle,
			this.castleGlowLayer,
			bounds,
			effectiveFog,
			viewerTeam
		);
		this.overlayRenderer.drawOrderMarkers(this.markersLayer, this.moveMarkers);
		this.overlayRenderer.drawFogOfWar(this.fogLayer, effectiveFog, viewerTeam);
		this.overlayRenderer.drawFloatingTexts(this.floatingTextsLayer, this.sim.floatingTexts);
		const castleRangeOverlay =
			this.hoveredCastleCannonMode !== null
				? { team: viewerTeam, hoveredMode: this.hoveredCastleCannonMode }
				: selectedEntity?.type === 'castle'
					? { team: selectedEntity.team, hoveredMode: null }
					: null;
		const pendingRescue = activeControlPlayer.worker?.pendingRescueStrike ?? null;
		const rescueOverlay =
			this.getIsRescueTargeting?.() || pendingRescue
				? {
						team: viewerTeam,
						workerX: activeControlPlayer.worker?.x ?? null,
						workerY: activeControlPlayer.worker?.y ?? null,
						hoverX: this.getIsRescueTargeting?.() ? (this.hoveredWorld?.x ?? null) : null,
						hoverY: this.getIsRescueTargeting?.() ? (this.hoveredWorld?.y ?? null) : null,
						pendingTarget: pendingRescue
					}
				: null;
		this.overlayRenderer.drawSelectionUI(
			this.uiLayer,
			this.isBoxSelecting,
			this.boxStartWorld,
			this.boxCurrentWorld,
			castleRangeOverlay,
			rescueOverlay
		);
	}

	private updateCastleCrossfade(team: MatchTeam, hp: number, maxHp: number): boolean {
		const side = this.castleVisuals[team];
		if (!side.base || !side.fade || side.textures.length === 0) return false;

		const targetStage = getCastleStageIndex(hp, maxHp);
		const targetTexture = side.textures[targetStage];
		if (!targetTexture || targetTexture.width <= 1) return false;

		const now = performance.now();
		if (targetStage === 0 && (side.stage > 1 || side.targetStage > 1)) {
			side.base.texture = side.textures[0];
			side.base.alpha = 1;
			side.fade.texture = side.textures[0];
			side.fade.alpha = 0;
			side.fade.visible = false;
			side.stage = 0;
			side.targetStage = 0;
			side.fadeStart = 0;
			side.lastChange = 0;
			side.isFading = false;
			side.base.visible = true;
			return true;
		}

		const activeTarget = side.isFading ? side.targetStage : side.stage;
		if (
			canTriggerCastleStageTransition(now, side.lastChange, activeTarget, targetStage, hp, maxHp)
		) {
			if (side.isFading) {
				side.base.texture = side.fade.texture;
				side.base.alpha = 1;
			}
			side.fade.texture = targetTexture;
			side.fade.alpha = 0;
			side.fade.visible = true;
			side.targetStage = targetStage;
			side.fadeStart = now;
			side.lastChange = now;
			side.isFading = true;
		}

		if (side.isFading) {
			const progress = Math.min(1, Math.max(0, (now - side.fadeStart) / CASTLE_FADE_DURATION_MS));
			side.fade.alpha = progress;
			side.fade.visible = true;
			if (progress >= 1) {
				side.base.texture = side.fade.texture;
				side.base.alpha = 1;
				side.fade.alpha = 0;
				side.fade.visible = false;
				side.stage = side.targetStage;
				side.isFading = false;
			}
		}

		side.base.visible = true;
		return true;
	}

	private renderCastles(selectedEntity?: SelectedEntity | null): void {
		const westCastle = this.sim.castles.west;
		const eastCastle = this.sim.castles.east;
		this.castleShadowGraphics.clear();

		const westSelected = selectedEntity?.type === 'castle' && selectedEntity.team === 'west';
		const eastSelected = selectedEntity?.type === 'castle' && selectedEntity.team === 'east';

		if (this.graphicsStyle === '2.5d') {
			this.hideCastleSprites();
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
			const sun = computeSunShadow(this.sim.dayNightProgress);
			el(
				this.castleShadowGraphics,
				WEST_CASTLE_X + sun.dx * 1.5,
				WEST_CASTLE_Y + 66 + sun.dy * 1.2,
				175 + Math.abs(sun.dx),
				68,
				0x000000,
				undefined,
				sun.alpha
			);
			el(
				this.castleShadowGraphics,
				EAST_CASTLE_X + sun.dx * 1.5,
				EAST_CASTLE_Y + 60 + sun.dy * 1.2,
				180 + Math.abs(sun.dx),
				64,
				0x000000,
				undefined,
				sun.alpha
			);

			for (const [team, castle, isWest, sel] of [
				['west', westCastle, true, westSelected],
				['east', eastCastle, false, eastSelected]
			] as const) {
				if (!this.updateCastleCrossfade(team, castle.hp, castle.maxHp)) {
					this.hideCastleSprites(this.castleVisuals[team]);
					this.entityRenderer.renderAuthenticCastle(this.castleShadowGraphics, castle, isWest, sel);
				}
			}
		}

		this.castlesOverlayLayer.clear();
		if (this.graphicsStyle !== '2.5d') {
			if (westSelected)
				el(this.castlesOverlayLayer, WEST_CASTLE_X, WEST_CASTLE_Y + 30, 195, 82, undefined, {
					color: 0xfbbf24,
					width: 3.5,
					alpha: 0.95
				});
			if (eastSelected)
				el(this.castlesOverlayLayer, EAST_CASTLE_X, EAST_CASTLE_Y + 25, 200, 78, undefined, {
					color: 0xf43f5e,
					width: 3.5,
					alpha: 0.95
				});
		}

		this.drawCastleHealthBar(WEST_CASTLE_X, WEST_CASTLE_Y - 180, westCastle, true);
		this.drawCastleHealthBar(EAST_CASTLE_X, EAST_CASTLE_Y - 170, eastCastle, false);
	}

	private drawCastleHealthBar(cx: number, cy: number, castle: Castle, isWest: boolean): void {
		const barW = 180;
		const barH = 11;
		const barX = cx - barW / 2;
		const hpPct = Math.max(0, Math.min(1, castle.hp / castle.maxHp));
		const borderCol = castle.color?.num ?? (isWest ? 0x2563eb : 0xdc2626);
		rr(
			this.castlesOverlayLayer,
			barX - 2,
			cy - 2,
			barW + 4,
			barH + 4,
			3,
			{ color: 0x090d16, alpha: 0.92 },
			{ color: borderCol, width: 2 }
		);
		if (hpPct > 0) {
			const w = Math.max(3, barW * hpPct);
			rr(
				this.castlesOverlayLayer,
				barX,
				cy,
				w,
				barH,
				2,
				hpPct > 0.5 ? 0x22c55e : hpPct > 0.25 ? 0xf59e0b : 0xef4444
			);
			rc(this.castlesOverlayLayer, barX, cy, w, 3, 0xffffff, undefined, 0.35);
		}
	}

	public get destroyed(): boolean {
		return this.isDestroyed;
	}

	public destroy(): void {
		if (this.isDestroyed) return;
		this.isDestroyed = true;
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
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
				// Prevent crashes during teardown
			}
		}
		this.canvasEl = null;
		this.castleVisuals = { west: emptyCastleSide(), east: emptyCastleSide() };
	}
}
