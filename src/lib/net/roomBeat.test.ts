import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startRoomBeat } from './roomBeat';
import type { RoomTransport } from './roomTypes';
import { ROOM_BEAT_MS } from '$lib/config/roomLife';
import { logService } from '$lib/services/logService.svelte';

describe('Room Heartbeat and Transport Lifetime (REALTIME-SESSIONS-v10)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('calls transport.touch() immediately and on periodic intervals', () => {
		const touchMock = vi.fn().mockResolvedValue(undefined);
		const mockTransport: RoomTransport = {
			code: 'TEST99',
			touch: touchMock,
			now: () => Date.now(),
			watch: vi.fn().mockReturnValue(() => {}),
			append: vi.fn().mockResolvedValue(true),
			setStatus: vi.fn().mockResolvedValue(undefined)
		};

		const stopBeat = startRoomBeat(mockTransport);

		// Immediate touch on start
		expect(touchMock).toHaveBeenCalledTimes(1);

		// Advance timer by 1 beat interval
		vi.advanceTimersByTime(ROOM_BEAT_MS);
		expect(touchMock).toHaveBeenCalledTimes(2);

		// Advance timer by 2 more intervals
		vi.advanceTimersByTime(ROOM_BEAT_MS * 2);
		expect(touchMock).toHaveBeenCalledTimes(4);

		stopBeat();

		// Ensure no more touches occur after cleanup
		vi.advanceTimersByTime(ROOM_BEAT_MS * 2);
		expect(touchMock).toHaveBeenCalledTimes(4);
	});

	it('logs warning gracefully if transport.touch() fails', async () => {
		const warnSpy = vi.spyOn(logService, 'warn').mockImplementation(() => {});
		const touchMock = vi.fn().mockRejectedValue(new Error('Network offline'));

		const mockTransport: RoomTransport = {
			code: 'FAIL01',
			touch: touchMock,
			now: () => Date.now(),
			watch: vi.fn().mockReturnValue(() => {}),
			append: vi.fn().mockResolvedValue(true),
			setStatus: vi.fn().mockResolvedValue(undefined)
		};

		const stopBeat = startRoomBeat(mockTransport);
		expect(touchMock).toHaveBeenCalledTimes(1);

		await Promise.resolve(); // flush rejection microtask

		expect(warnSpy).toHaveBeenCalledWith(
			'network',
			'room beat failed',
			expect.objectContaining({ code: 'FAIL01' })
		);

		stopBeat();
	});
});
