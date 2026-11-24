import { describe, it, expect, beforeEach } from 'vitest';
import {
	fullscreen,
	canFullscreen,
	isStandalone,
	buttonAction,
	type FullscreenAction
} from './fullscreen.svelte';

describe('fullscreen service', () => {
	beforeEach(() => {
		fullscreen.active = false;
		fullscreen.isModalOpen = false;
	});

	it('canFullscreen returns boolean without throwing in SSR/node environment', () => {
		expect(typeof canFullscreen()).toBe('boolean');
	});

	it('isStandalone returns false by default in test environment', () => {
		expect(isStandalone()).toBe(false);
	});

	it('watch safely returns cleanup function without throwing in non-browser environment', () => {
		const unwatch = fullscreen.watch();
		expect(typeof unwatch).toBe('function');
		expect(() => unwatch()).not.toThrow();
	});

	it('toggle does not throw when invoked', () => {
		expect(() => fullscreen.toggle()).not.toThrow();
	});

	it('buttonAction correctly determines all 5 states (FULLSCREEN-INSTALL § 2 table)', () => {
		// 1. active -> exit immediately
		expect(buttonAction({ active: true, can: true, installed: false })).toBe('exit');
		expect(buttonAction({ active: true, can: true, installed: true })).toBe('exit');

		// 2. browser can, not installed -> offer choice modal
		expect(buttonAction({ active: false, can: true, installed: false })).toBe('offer');

		// 3. browser can, already installed -> enter fullscreen directly
		expect(buttonAction({ active: false, can: true, installed: true })).toBe('enter');

		// 4. browser cannot, not installed (iPhone Safari) -> blocked (show instructions modal)
		expect(buttonAction({ active: false, can: false, installed: false })).toBe('blocked');

		// 5. browser cannot, installed (iPhone home screen) -> hidden
		expect(buttonAction({ active: false, can: false, installed: true })).toBe('hidden');
	});
});
