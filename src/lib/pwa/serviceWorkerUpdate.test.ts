import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyAppUpdateOrReload } from './serviceWorkerUpdate';
import { sessionStore } from '$lib/services/storage';

describe('applyAppUpdateOrReload', () => {
	const originalWindow = globalThis.window;
	const originalNavigator = globalThis.navigator;

	afterEach(() => {
		vi.restoreAllMocks();
		Object.defineProperty(globalThis, 'window', {
			value: originalWindow,
			configurable: true,
			writable: true
		});
		Object.defineProperty(globalThis, 'navigator', {
			value: originalNavigator,
			configurable: true,
			writable: true
		});
	});

	it('posts SKIP_WAITING when a waiting service worker exists', async () => {
		const postMessage = vi.fn();
		const update = vi.fn().mockResolvedValue(undefined);
		const reload = vi.fn();

		Object.defineProperty(globalThis, 'window', {
			value: { location: { pathname: '/online', reload } },
			configurable: true,
			writable: true
		});
		Object.defineProperty(globalThis, 'navigator', {
			value: {
				serviceWorker: {
					getRegistration: vi.fn().mockResolvedValue({
						update,
						waiting: { postMessage }
					})
				}
			},
			configurable: true,
			writable: true
		});

		await applyAppUpdateOrReload();
		expect(update).toHaveBeenCalledTimes(1);
		expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
		expect(reload).not.toHaveBeenCalled();
	});

	it('falls back to window.location.reload when no waiting worker is present', async () => {
		const reload = vi.fn();
		const update = vi.fn().mockResolvedValue(undefined);

		Object.defineProperty(globalThis, 'window', {
			value: { location: { pathname: '/online', reload } },
			configurable: true,
			writable: true
		});
		Object.defineProperty(globalThis, 'navigator', {
			value: {
				serviceWorker: {
					getRegistration: vi.fn().mockResolvedValue({
						update,
						waiting: null
					})
				}
			},
			configurable: true,
			writable: true
		});

		await applyAppUpdateOrReload();
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it('marks sw_updating_url in sessionStore when posting SKIP_WAITING so stuck waiting workers do not loop infinitely', async () => {
		const postMessage = vi.fn();
		const update = vi.fn().mockResolvedValue(undefined);
		const setSpy = vi.spyOn(sessionStore, 'set');

		Object.defineProperty(globalThis, 'window', {
			value: { location: { pathname: '/', reload: vi.fn() } },
			configurable: true,
			writable: true
		});
		Object.defineProperty(globalThis, 'navigator', {
			value: {
				serviceWorker: {
					getRegistration: vi.fn().mockResolvedValue({
						update,
						waiting: { postMessage, scriptURL: 'https://example.com/sw.js' }
					})
				}
			},
			configurable: true,
			writable: true
		});

		await applyAppUpdateOrReload();
		expect(setSpy).toHaveBeenCalledWith('sw_updating_url', 'https://example.com/sw.js');
	});
});
