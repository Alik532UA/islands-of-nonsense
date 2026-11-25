// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { buildSeekTicket, seekMatch } from './seek';
import type { Database } from 'firebase/database';

describe('seek matchmaking & RTDB schema compliance', () => {
	it('builds seek ticket with strictly allowed schema fields (uid, name, at)', () => {
		const ticket = buildSeekTicket(
			{ uid: 'auth_uid_1', name: 'Knight', country: 'UA', avatar: 'lion' },
			123456
		);

		expect(ticket).toEqual({
			uid: 'auth_uid_1',
			name: 'Knight',
			country: 'UA',
			avatar: 'lion',
			at: 123456
		});
		expect('code' in ticket).toBe(false);
		expect('createdAt' in ticket).toBe(false);
	});

	it('throws immediately if AbortSignal is already aborted', async () => {
		const controller = new AbortController();
		controller.abort();

		await expect(
			seekMatch({} as Database, { uid: 'u1', name: 'Tester' }, controller.signal, {
				createRoom: vi.fn(),
				joinRoom: vi.fn()
			})
		).rejects.toThrow('Search cancelled');
	});

	it('validates format-specific seek options (1v1/2v2/3v3/any)', async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(
			seekMatch(
				{} as Database,
				{ uid: 'u1', name: 'Tester' },
				controller.signal,
				{ createRoom: vi.fn(), joinRoom: vi.fn() },
				{ format: '3v3' }
			)
		).rejects.toThrow('Search cancelled');
	});
});
