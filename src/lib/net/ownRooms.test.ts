import { describe, it, expect } from 'vitest';
import { isActiveOwnRoomInfo } from './ownRooms';
import { isLiveRoomInfo } from './lobby';
import { ABANDONED_ROOM_MAX_AGE_MS, SWEEP_MAX_AGE_MS } from './sweepRooms';

describe('ownRooms & live lobby room helpers', () => {
	it('recognises active lobby/playing rooms within sweep TTL', () => {
		const now = 1_000_000_000;
		expect(
			isActiveOwnRoomInfo({ hostUid: 'u1', status: 'lobby', aliveAt: now - 5_000 }, 'u1', now)
		).toBe(true);
		expect(
			isActiveOwnRoomInfo({ hostUid: 'u1', status: 'playing', aliveAt: now - 10_000 }, 'u1', now)
		).toBe(true);
		expect(
			isActiveOwnRoomInfo({ hostUid: 'u1', status: 'over', aliveAt: now - 5_000 }, 'u1', now)
		).toBe(false);
		expect(
			isActiveOwnRoomInfo({ hostUid: 'other', status: 'lobby', aliveAt: now - 5_000 }, 'u1', now)
		).toBe(false);
		expect(
			isActiveOwnRoomInfo(
				{ hostUid: 'u1', status: 'lobby', aliveAt: now - SWEEP_MAX_AGE_MS - 1 },
				'u1',
				now
			)
		).toBe(false);
	});

	it('filters out dead or abandoned lobby rooms via isLiveRoomInfo', () => {
		const now = 1_000_000_000;
		expect(isLiveRoomInfo({ status: 'lobby', aliveAt: now - 30_000 }, now)).toBe(true);
		expect(isLiveRoomInfo({ status: 'over', aliveAt: now - 5_000 }, now)).toBe(false);
		expect(
			isLiveRoomInfo({ status: 'lobby', aliveAt: now - ABANDONED_ROOM_MAX_AGE_MS - 1000 }, now)
		).toBe(false);
		expect(isLiveRoomInfo(null, now)).toBe(false);
	});
});
