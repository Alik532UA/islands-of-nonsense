import { ROOM_BEAT_MS } from '$lib/config/roomLife';
import { logService } from '$lib/services/logService.svelte';
import type { RoomTransport } from './roomTypes';

/**
 * Periodically beats to signal the room is actively being held by a client.
 */
export function startRoomBeat(transport: RoomTransport): () => void {
	let stopped = false;

	const beat = () => {
		if (stopped) return;
		transport.touch().catch((error: unknown) => {
			logService.warn('network', 'room beat failed', {
				code: transport.code,
				reason: String(error)
			});
		});
	};

	beat();
	const timer = setInterval(beat, ROOM_BEAT_MS);

	return () => {
		stopped = true;
		clearInterval(timer);
	};
}
