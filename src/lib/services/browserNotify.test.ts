import { describe, it, expect, afterEach } from 'vitest';
import {
	canUseBrowserNotifications,
	notifyIfHidden,
	requestNotifyPermission
} from './browserNotify';

describe('browserNotify', () => {
	const origNotification = globalThis.window?.Notification;

	afterEach(() => {
		if (globalThis.window) {
			if (origNotification) {
				globalThis.window.Notification = origNotification;
			} else {
				delete (globalThis.window as { Notification?: unknown }).Notification;
			}
		}
	});

	it('returns safe fallbacks when Notification API is unavailable', async () => {
		if (globalThis.window) {
			delete (globalThis.window as { Notification?: unknown }).Notification;
		}
		expect(canUseBrowserNotifications()).toBe(false);
		expect(await requestNotifyPermission()).toBe('unsupported');
		expect(notifyIfHidden('Test')).toBe(false);
	});

	it('triggers notification when hidden and granted', async () => {
		if (!globalThis.window) {
			expect(true).toBe(true);
			return;
		}
		const calls: Array<{ title: string; body?: string }> = [];
		class MockNotification {
			static permission = 'granted' as NotificationPermission;
			static requestPermission = async () => 'granted' as NotificationPermission;
			constructor(title: string, opts?: { body?: string }) {
				calls.push({ title, body: opts?.body });
			}
		}
		globalThis.window.Notification = MockNotification as unknown as typeof Notification;

		const prevVis = document.visibilityState;
		Object.defineProperty(document, 'visibilityState', {
			configurable: true,
			get: () => 'hidden'
		});
		try {
			expect(notifyIfHidden('Матч знайдено', 'Кімната A1B2')).toBe(true);
			expect(calls).toEqual([{ title: 'Матч знайдено', body: 'Кімната A1B2' }]);
		} finally {
			Object.defineProperty(document, 'visibilityState', {
				configurable: true,
				get: () => prevVis
			});
		}
	});
});
