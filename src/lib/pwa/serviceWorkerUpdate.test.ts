import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initServiceWorkerUpdate } from './serviceWorkerUpdate';
import { toast } from '$lib/controllers/toast.svelte';

vi.mock('$app/env', () => ({
	browser: true
}));

describe('serviceWorkerUpdate', () => {
	beforeEach(() => {
		toast.clear();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('returns a cleanup function without throwing in node/SSR', () => {
		const cleanup = initServiceWorkerUpdate();
		expect(typeof cleanup).toBe('function');
		expect(() => cleanup()).not.toThrow();
	});

	it('prompts user and sends SKIP_WAITING when action is run', async () => {
		const postMessageMock = vi.fn();
		const mockWorker = {
			postMessage: postMessageMock
		} as unknown as ServiceWorker;

		const addEventListenerMock = vi.fn();
		const removeEventListenerMock = vi.fn();

		const mockReg = {
			waiting: mockWorker,
			installing: null,
			addEventListener: vi.fn()
		};

		vi.stubGlobal('navigator', {
			serviceWorker: {
				addEventListener: addEventListenerMock,
				removeEventListener: removeEventListenerMock,
				getRegistration: vi.fn().mockResolvedValue(mockReg),
				controller: {}
			}
		});

		const cleanup = initServiceWorkerUpdate();
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(toast.items.length).toBe(1);
		const updateToast = toast.items[0];
		expect(updateToast.action).toBeDefined();
		expect(updateToast.action?.label).toBeTruthy();

		// Trigger action
		updateToast.action?.run();
		expect(postMessageMock).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });

		cleanup();
		expect(removeEventListenerMock).toHaveBeenCalledWith('controllerchange', expect.any(Function));
	});

	it('deduplicates multiple prompts', async () => {
		const postMessageMock = vi.fn();
		const mockWorker = {
			postMessage: postMessageMock
		} as unknown as ServiceWorker;

		const mockReg = {
			waiting: mockWorker,
			installing: null,
			addEventListener: vi.fn()
		};

		vi.stubGlobal('navigator', {
			serviceWorker: {
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				getRegistration: vi.fn().mockResolvedValue(mockReg),
				controller: {}
			}
		});

		initServiceWorkerUpdate();
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(toast.items.length).toBe(1);
	});
});
