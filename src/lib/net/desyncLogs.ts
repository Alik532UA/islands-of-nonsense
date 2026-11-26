import { connect } from './firebase';
import { logService } from '$lib/services/logService.svelte';

export interface DesyncLogUploadPayload {
	roomCode: string;
	startedAt?: number | null;
	playerName: string;
	tick: number;
	localChecksum: string;
	remoteChecksum: string;
	historyHash: string;
	historyCount: number;
	log: string;
}

/**
 * Automatically uploads an online desync forensic log to Firebase RTDB under
 * `desyncLogs/{YYYY-MM-DD}/{roomCode}_{startedAt}/{uid}` for easy inspection and sorting.
 */
export async function uploadDesyncLog(payload: DesyncLogUploadPayload): Promise<boolean> {
	try {
		const { uid, db } = await connect();
		const { ref, serverTimestamp, set } = await import('firebase/database');
		const dateKey = new Date().toISOString().slice(0, 10);
		const safeRoom =
			payload.roomCode
				.toUpperCase()
				.replace(/[^0-9A-Z]/g, '')
				.slice(0, 6) || 'ROOM';
		const matchTs =
			typeof payload.startedAt === 'number' && payload.startedAt > 0
				? Math.floor(payload.startedAt)
				: Math.floor(Date.now() / 1000);
		const matchKey = `${safeRoom}_${matchTs}`;
		await set(ref(db, `desyncLogs/${dateKey}/${matchKey}/${uid}`), {
			uid,
			name: payload.playerName.slice(0, 48),
			room: safeRoom,
			tick: Math.max(0, Math.round(payload.tick)),
			localChecksum: payload.localChecksum.slice(0, 16),
			remoteChecksum: payload.remoteChecksum.slice(0, 16),
			historyHash: payload.historyHash.slice(0, 16),
			historyCount: Math.max(0, Math.round(payload.historyCount)),
			log: payload.log.slice(0, 32000),
			at: serverTimestamp()
		});
		return true;
	} catch (error) {
		logService.warn('network', 'Failed to upload desync log to Firebase', {
			reason: String(error)
		});
		return false;
	}
}
