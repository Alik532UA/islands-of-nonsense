import { connect } from './firebase';
import { logService } from '$lib/services/logService.svelte';
import { SWEEP_MAX_AGE_MS } from './sweepRooms';

const ROOM_CODE_PATTERN = /^[0-9A-Z]{2,6}$/;

/**
 * Records a newly created room under `myRooms/{uid}/{code}` so the host
 * can clean up their own abandoned rooms on subsequent room creation.
 */
export async function rememberOwnRoom(code: string): Promise<void> {
	if (!ROOM_CODE_PATTERN.test(code)) return;
	try {
		const { uid, db } = await connect();
		const { ref, serverTimestamp, set } = await import('firebase/database');
		await set(ref(db, `myRooms/${uid}/${code}`), { at: serverTimestamp() });
	} catch (error) {
		logService.warn('network', 'own room not remembered', { code, reason: String(error) });
	}
}

/**
 * Removes a room entry from `myRooms/{uid}/{code}` when explicitly closed.
 */
export async function forgetOwnRoom(code: string): Promise<void> {
	if (!ROOM_CODE_PATTERN.test(code)) return;
	try {
		const { uid, db } = await connect();
		const { ref, remove } = await import('firebase/database');
		await remove(ref(db, `myRooms/${uid}/${code}`));
	} catch {
		// Best-effort index cleanup
	}
}

/**
 * Cleans up stale rooms owned by the current user before creating a new room.
 */
export async function pruneOwnRooms(now: number = Date.now()): Promise<number> {
	try {
		const { uid, db } = await connect();
		const { get, ref, remove, update } = await import('firebase/database');
		const indexSnap = await get(ref(db, `myRooms/${uid}`));
		if (!indexSnap.exists()) return 0;

		const entries = indexSnap.val() as Record<string, { at?: number } | number>;
		let pruned = 0;

		for (const [code, raw] of Object.entries(entries)) {
			if (!ROOM_CODE_PATTERN.test(code)) {
				await remove(ref(db, `myRooms/${uid}/${code}`)).catch(() => {});
				continue;
			}
			const infoSnap = await get(ref(db, `rooms/${code}/info`));
			if (!infoSnap.exists()) {
				await remove(ref(db, `myRooms/${uid}/${code}`)).catch(() => {});
				continue;
			}
			const info = infoSnap.val() as {
				hostUid?: string;
				gameId?: string;
				aliveAt?: number;
				startedAt?: number;
				createdAt?: number;
			};
			if (info.hostUid !== uid) {
				await remove(ref(db, `myRooms/${uid}/${code}`)).catch(() => {});
				continue;
			}
			const recordedAt = typeof raw === 'number' ? raw : (raw?.at ?? 0);
			const lastSeen = info.aliveAt ?? info.startedAt ?? info.createdAt ?? recordedAt;
			if (now - lastSeen > SWEEP_MAX_AGE_MS) {
				const gameId = typeof info.gameId === 'string' ? info.gameId : 'castlefight';
				await update(ref(db), {
					[`rooms/${code}`]: null,
					[`lobby/${gameId}/${code}`]: null,
					[`myRooms/${uid}/${code}`]: null
				}).catch(() => {});
				pruned++;
			}
		}
		return pruned;
	} catch (error) {
		logService.warn('network', 'own rooms prune failed', { reason: String(error) });
		return 0;
	}
}
