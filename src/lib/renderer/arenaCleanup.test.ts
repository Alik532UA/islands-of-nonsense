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
			// Simulate registering handler
			(renderer as unknown as { windowMouseUpHandler: () => void }).windowMouseUpHandler = () => {};

			renderer.destroy();

			expect(removeSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
			expect(
				(renderer as unknown as { windowMouseUpHandler: unknown }).windowMouseUpHandler
			).toBeNull();
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
});
