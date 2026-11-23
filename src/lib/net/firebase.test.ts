import { describe, expect, it, beforeEach } from 'vitest';
import { serverNow, forget } from './firebase';
import { hasSession, rememberSession, clearSession } from '$lib/services/accountFlag';
import { storage } from '$lib/services/storage';

describe('Firebase & Account infrastructure', () => {
	const mockStore: Record<string, string> = {};

	beforeEach(() => {
		for (const k of Object.keys(mockStore)) {
			delete mockStore[k];
		}
		(globalThis as unknown as { window: unknown }).window = {
			localStorage: {
				getItem: (key: string) => mockStore[key] ?? null,
				setItem: (key: string, value: string) => {
					mockStore[key] = value;
				},
				removeItem: (key: string) => {
					delete mockStore[key];
				},
				get length() {
					return Object.keys(mockStore).length;
				},
				key: (i: number) => Object.keys(mockStore)[i] ?? null
			},
			sessionStorage: {
				getItem: () => null,
				setItem: () => {},
				removeItem: () => {},
				length: 0,
				key: () => null
			}
		};
		forget();
	});

	it('serverNow provides valid timestamp close to local clock', () => {
		const before = Date.now();
		const now = serverNow();
		const after = Date.now();

		expect(now).toBeGreaterThanOrEqual(before);
		expect(now).toBeLessThanOrEqual(after);
	});

	it('manages account session flags correctly in storage', () => {
		clearSession();
		expect(hasSession()).toBe(false);

		rememberSession();
		expect(hasSession()).toBe(true);

		clearSession();
		expect(hasSession()).toBe(false);
	});

	it('forget resets session and time offset cleanly', () => {
		forget();
		expect(serverNow()).toBeTypeOf('number');
	});
});
