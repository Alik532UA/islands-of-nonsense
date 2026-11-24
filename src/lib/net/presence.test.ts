import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Database } from 'firebase/database';

const {
	setMock,
	removeMock,
	onDisconnectMock,
	onValueMock,
	refMock,
	connectMock,
	callbacks
} = vi.hoisted(() => {
	const callbacks: { connected?: (snap: { val: () => unknown }) => void; presence?: (snap: { val: () => unknown }) => void } = {};
	const removeMock = vi.fn().mockResolvedValue(undefined);
	const onDisconnectMock = vi.fn().mockReturnValue({ remove: removeMock });
	const setMock = vi.fn().mockResolvedValue(undefined);
	const onValueMock = vi.fn((refObj: { path: string }, cb: (snap: { val: () => unknown }) => void) => {
		if (refObj.path === '.info/connected') {
			callbacks.connected = cb;
		} else {
			callbacks.presence = cb;
		}
		return vi.fn();
	});
	const refMock = vi.fn((_db, path: string) => ({ path }));
	const connectMock = vi.fn().mockResolvedValue({ db: {}, uid: 'me' });

	return {
		setMock,
		removeMock,
		onDisconnectMock,
		onValueMock,
		refMock,
		connectMock,
		callbacks
	};
});

vi.mock('firebase/database', () => ({
	ref: refMock,
	onValue: onValueMock,
	set: setMock,
	onDisconnect: onDisconnectMock,
	serverTimestamp: () => 1700000000000
}));

vi.mock('./firebase', () => ({
	connect: connectMock
}));

import { keepPresence, watchPresence } from './presence';

describe('Player Presence and Disconnect Handling (REALTIME-SESSIONS-v10 & CDB-PRESENCE)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('keepPresence listens to .info/connected and sets onDisconnect hook', async () => {
		const mockDb = {} as Database;
		const cleanup = keepPresence(mockDb, 'TESTROOM', 'user123');

		// Wait for dynamic import
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(callbacks.connected).toBeDefined();

		// Simulate connection event
		callbacks.connected!({ val: () => true });

		expect(onDisconnectMock).toHaveBeenCalled();
		expect(removeMock).toHaveBeenCalled();
		expect(setMock).toHaveBeenCalledWith(
			expect.objectContaining({ path: 'rooms/TESTROOM/presence/user123' }),
			expect.objectContaining({ online: true, lastSeen: 1700000000000 })
		);

		cleanup();
	});

	it('watchPresence parses online user IDs from presence snapshot', async () => {
		const onChangeMock = vi.fn();
		await watchPresence('ROOM99', onChangeMock);

		expect(callbacks.presence).toBeDefined();

		// Simulate snapshot with multiple players
		callbacks.presence!({
			val: () => ({
				player1: { online: true },
				player2: { online: false },
				player3: { online: true }
			})
		});

		expect(onChangeMock).toHaveBeenCalledWith(['player1', 'player3']);

		// Simulate empty snapshot
		callbacks.presence!({ val: () => null });
		expect(onChangeMock).toHaveBeenCalledWith([]);
	});
});
