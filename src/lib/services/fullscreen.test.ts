import { describe, it, expect, beforeEach } from 'vitest';
import { fullscreen, canFullscreen, isStandalone } from './fullscreen.svelte';

describe('fullscreen service', () => {
	beforeEach(() => {
		fullscreen.active = false;
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
});
