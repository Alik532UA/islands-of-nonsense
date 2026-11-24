import { describe, it, expect, vi } from 'vitest';
import { ArenaRenderer } from './ArenaRenderer';
import { Simulation } from '../engine/simulation';

describe('ArenaRenderer Lifecycle Teardown & Memory Cleanup (PERFORMANCE)', () => {
	function createRenderer(): ArenaRenderer {
		const sim = new Simulation({
			botDifficulty: 1,
			startGold: 600,
			isRunning: true
		});

		return new ArenaRenderer({
			canvas: {} as HTMLCanvasElement,
			sim,
			graphicsStyle: '2.5d',
			onTileClick: () => {},
			onSelectEntity: () => {},
			getSelectedEntity: () => null,
			getSelectedBuildingDefId: () => null,
			getSelectedPlacedBuildingId: () => null,
			onCameraChange: () => {}
		});
	}

	it('initializes in active (non-destroyed) state', () => {
		const renderer = createRenderer();
		expect(renderer.destroyed).toBe(false);
	});

	it('marks renderer as destroyed and tears down resources upon destroy()', () => {
		const renderer = createRenderer();

		renderer.destroy();

		expect(renderer.destroyed).toBe(true);
	});

	it('is idempotent: calling destroy() multiple times is safe and does not throw', () => {
		const renderer = createRenderer();

		expect(() => {
			renderer.destroy();
			renderer.destroy();
			renderer.destroy();
		}).not.toThrow();

		expect(renderer.destroyed).toBe(true);
	});

	it('removes window event listeners if registered during setupInteraction', () => {
		const removeSpy = vi.fn();
		const origWindow = globalThis.window;

		vi.stubGlobal('window', {
			addEventListener: vi.fn(),
			removeEventListener: removeSpy,
			innerWidth: 1200,
			innerHeight: 800,
			devicePixelRatio: 1
		});

		try {
			const renderer = createRenderer();
			const disconnectSpy = vi.fn();
			// Simulate registering handlers
			(renderer as unknown as { windowMouseUpHandler: () => void }).windowMouseUpHandler = () => {};
			(renderer as unknown as { windowResizeHandler: () => void }).windowResizeHandler = () => {};
			(renderer as unknown as { resizeObserver: { disconnect: () => void } }).resizeObserver = {
				disconnect: disconnectSpy
			};

			renderer.destroy();

			expect(removeSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
			expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
			expect(disconnectSpy).toHaveBeenCalledTimes(1);
			expect(
				(renderer as unknown as { windowMouseUpHandler: unknown }).windowMouseUpHandler
			).toBeNull();
			expect(
				(renderer as unknown as { windowResizeHandler: unknown }).windowResizeHandler
			).toBeNull();
			expect((renderer as unknown as { resizeObserver: unknown }).resizeObserver).toBeNull();
		} finally {
			if (origWindow) {
				vi.stubGlobal('window', origWindow);
			} else {
				vi.unstubAllGlobals();
			}
		}
	});

	it('safely clears texture and sprite references to release GPU memory', () => {
		const renderer = createRenderer();

		// Populate dummy textures and sprite refs
		(renderer as unknown as { westCastleTextures: unknown[] }).westCastleTextures = [{}];
		(renderer as unknown as { eastCastleTextures: unknown[] }).eastCastleTextures = [{}];

		renderer.destroy();

		expect(
			(renderer as unknown as { westCastleTextures: unknown[] }).westCastleTextures
		).toHaveLength(0);
		expect(
			(renderer as unknown as { eastCastleTextures: unknown[] }).eastCastleTextures
		).toHaveLength(0);
	});

	it('resizes renderer to host parentElement dimensions when window resizes instead of staying locked to old canvas bounds', () => {
		const sim = new Simulation({ botDifficulty: 1, startGold: 600, isRunning: true });
		const cameraUpdates: { x: number; y: number; zoom: number }[] = [];
		const renderer = new ArenaRenderer({
			canvas: {} as HTMLCanvasElement,
			sim,
			graphicsStyle: '2.5d',
			onTileClick: () => {},
			onSelectEntity: () => {},
			getSelectedEntity: () => null,
			getSelectedBuildingDefId: () => null,
			getSelectedPlacedBuildingId: () => null,
			onCameraChange: (x, y, zoom) => cameraUpdates.push({ x, y, zoom })
		});

		const resizeSpy = vi.fn((w: number, h: number) => {
			mockApp.screen.width = w;
			mockApp.screen.height = h;
		});
		const mockApp = {
			screen: { width: 1000, height: 600 },
			renderer: { resolution: 1, resize: resizeSpy },
			ticker: { deltaMS: 16.67 }
		};
		const mockCanvas = {
			style: { width: '1000px', height: '600px' },
			getBoundingClientRect: () => ({ width: 1000, height: 600 }),
			parentElement: {
				getBoundingClientRect: () => ({ width: 1920, height: 1080 })
			}
		};

		(renderer as unknown as { app: unknown }).app = mockApp;
		(renderer as unknown as { canvasEl: unknown }).canvasEl = mockCanvas;
		(renderer as unknown as { updateCamera: (c?: boolean) => void }).updateCamera = vi.fn();
		(renderer as unknown as { render: () => void }).render = vi.fn();

		const resized = renderer.syncViewportSize(true);

		expect(resized).toBe(true);
		expect(resizeSpy).toHaveBeenCalledWith(1920, 1080);
		expect(mockCanvas.style.width).toBe('100%');
		expect(mockCanvas.style.height).toBe('100%');
		expect(cameraUpdates.length).toBe(1);
	});
});
