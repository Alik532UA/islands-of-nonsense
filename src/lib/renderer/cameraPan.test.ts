import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stepSmoothCameraPan, KEYBOARD_PAN_SPEED, type CameraPanInput } from './cameraPan';

const EMPTY_INPUT: CameraPanInput = { left: false, right: false, up: false, down: false };

describe('Smooth RTS Camera Panning (WASD & Arrows)', () => {
	it('accelerates smoothly from rest instead of jumping by fixed discrete steps', () => {
		let state = { x: 800, y: 1200, vx: 0, vy: 0 };
		const rightInput: CameraPanInput = { left: false, right: true, up: false, down: false };

		// Frame 1 at 60 FPS (16.67ms): starts moving immediately with smooth ramp
		state = stepSmoothCameraPan(state, rightInput, EMPTY_INPUT, 1.0, 1 / 60);
		expect(state.vx).toBeGreaterThan(0);
		expect(state.vx).toBeLessThan(KEYBOARD_PAN_SPEED);
		expect(state.x).toBeGreaterThan(800);
		expect(state.x).toBeLessThan(830); // Never a jarring 240px teleport

		// After ~250ms of holding key, velocity approaches target KEYBOARD_PAN_SPEED
		for (let i = 0; i < 15; i++) {
			state = stepSmoothCameraPan(state, rightInput, EMPTY_INPUT, 1.0, 1 / 60);
		}
		expect(state.vx).toBeGreaterThan(KEYBOARD_PAN_SPEED * 0.95);
	});

	it('normalizes diagonal panning speed so diagonal travel matches cardinal speed', () => {
		let cardinal = { x: 0, y: 0, vx: 0, vy: 0 };
		let diagonal = { x: 0, y: 0, vx: 0, vy: 0 };

		const rightOnly: CameraPanInput = { left: false, right: true, up: false, down: false };
		const upRight: CameraPanInput = { left: false, right: true, up: true, down: false };

		for (let i = 0; i < 30; i++) {
			cardinal = stepSmoothCameraPan(cardinal, rightOnly, EMPTY_INPUT, 1.0, 1 / 60);
			diagonal = stepSmoothCameraPan(diagonal, upRight, EMPTY_INPUT, 1.0, 1 / 60);
		}

		const cardinalDist = Math.hypot(cardinal.x, cardinal.y);
		const diagonalDist = Math.hypot(diagonal.x, diagonal.y);
		expect(diagonalDist).toBeCloseTo(cardinalDist, 2);
	});

	it('glides smoothly to a stop when directional keys are released', () => {
		let state = { x: 1000, y: 1200, vx: KEYBOARD_PAN_SPEED, vy: 0 };

		state = stepSmoothCameraPan(state, EMPTY_INPUT, EMPTY_INPUT, 1.0, 1 / 60);
		expect(state.vx).toBeGreaterThan(0);
		expect(state.vx).toBeLessThan(KEYBOARD_PAN_SPEED);

		for (let i = 0; i < 40; i++) {
			state = stepSmoothCameraPan(state, EMPTY_INPUT, EMPTY_INPUT, 1.0, 1 / 60);
		}
		expect(state.vx).toBe(0);
		expect(state.vy).toBe(0);
	});

	it('BattleArena binds smooth heldPanKeys and keyup/blur clearing respectful of controlPreset', () => {
		const arenaContent = readFileSync(
			resolve(process.cwd(), 'src/lib/components/BattleArena.svelte'),
			'utf8'
		);

		expect(arenaContent).toContain('heldPanKeys');
		expect(arenaContent).toContain('syncKeyboardPan');
		expect(arenaContent).toContain('clearHeldPanKeys');
		expect(arenaContent).toContain('onkeyup={handleKeyUp}');
		expect(arenaContent).toContain('onblur={clearHeldPanKeys}');
		expect(arenaContent).toContain("settings.controlPreset === 'islands-of-nonsense'");
		// Ensure old discrete 240px key-repeat jumps are gone
		expect(arenaContent).not.toContain('cameraX - 240');
		expect(arenaContent).not.toContain('cameraX + 240');
		expect(arenaContent).not.toContain('cameraY - 240');
		expect(arenaContent).not.toContain('cameraY + 240');
	});
});
