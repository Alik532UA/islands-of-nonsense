import { describe, it, expect } from 'vitest';
import { initServiceWorkerUpdate } from './serviceWorkerUpdate';

describe('serviceWorkerUpdate', () => {
	it('returns a cleanup function without throwing in node/SSR', () => {
		const cleanup = initServiceWorkerUpdate();
		expect(typeof cleanup).toBe('function');
		expect(() => cleanup()).not.toThrow();
	});
});
