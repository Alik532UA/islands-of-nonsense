import { connect } from './firebase';
import { logService } from '$lib/services/logService.svelte';
import { countOpenHumanCapacity } from './onlineMatchSetup';
import type { RoomConfig } from './roomTypes';
import { ABANDONED_ROOM_MAX_AGE_MS, DEFAULT_GAME_ID, SWEEP_MAX_AGE_MS } from './sweepRooms';

const ROOM_CODE_PATTERN = /^[0-9A-Z]{2,6}$/;

export interface OwnActiveRoom {
	code: string;
	status: 'lobby' | 'playing';
	players: number;
	maxPlayers: number;
	modeId: string;
	createdAt: number;
}

export function isActiveOwnRoomInfo(
	info: {
		hostUid?: string;
		status?: string;
		aliveAt?: number;
		startedAt?: number;
		createdAt?: number;
	} | null,
	uid: string,
	now: number = Date.now(),
	recordedAt: number = 0
): boolean {
	if (!info || info.hostUid !== uid) return false;
	if (info.status !== 'lobby' && info.status !== 'playing') return false;
	const lastSeen = info.aliveAt ?? info.startedAt ?? info.createdAt ?? recordedAt;
	return now - lastSeen <= SWEEP_MAX_AGE_MS;
}

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
			if (now - lastSeen > ABANDONED_ROOM_MAX_AGE_MS) {
				const gameId = typeof info.gameId === 'string' ? info.gameId : DEFAULT_GAME_ID;
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

/**
 * Lists active (`lobby` or `playing`) rooms hosted by the current user for quick resume/close.
 */
export async function listOwnRooms(now: number = Date.now()): Promise<OwnActiveRoom[]> {
	try {
		const { uid, db } = await connect();
		const { get, ref, remove, update } = await import('firebase/database');
		const indexSnap = await get(ref(db, `myRooms/${uid}`));
		if (!indexSnap.exists()) return [];

		const entries = indexSnap.val() as Record<string, { at?: number } | number>;
		const active: OwnActiveRoom[] = [];

		for (const [code, raw] of Object.entries(entries)) {
			if (!ROOM_CODE_PATTERN.test(code)) {
				await remove(ref(db, `myRooms/${uid}/${code}`)).catch(() => {});
				continue;
			}
			const [infoSnap, membersSnap] = await Promise.all([
				get(ref(db, `rooms/${code}/info`)),
				get(ref(db, `rooms/${code}/members`))
			]);
			if (!infoSnap.exists()) {
				await remove(ref(db, `myRooms/${uid}/${code}`)).catch(() => {});
				await remove(ref(db, `lobby/${DEFAULT_GAME_ID}/${code}`)).catch(() => {});
				continue;
			}
			const info = infoSnap.val() as {
				hostUid?: string;
				gameId?: string;
				status?: string;
				aliveAt?: number;
				startedAt?: number;
				createdAt?: number;
				config?: RoomConfig;
			};
			const recordedAt = typeof raw === 'number' ? raw : (raw?.at ?? 0);
			const lastSeen = info.aliveAt ?? info.startedAt ?? info.createdAt ?? recordedAt;
			const stillAlive =
				isActiveOwnRoomInfo(info, uid, now, recordedAt) &&
				now - lastSeen <= ABANDONED_ROOM_MAX_AGE_MS;
			if (!stillAlive) {
				if (info.hostUid === uid) {
					const gameId = typeof info.gameId === 'string' ? info.gameId : DEFAULT_GAME_ID;
					await update(ref(db), {
						[`rooms/${code}`]: null,
						[`lobby/${gameId}/${code}`]: null,
						[`myRooms/${uid}/${code}`]: null
					}).catch(() => {});
				} else {
					await remove(ref(db, `myRooms/${uid}/${code}`)).catch(() => {});
				}
				continue;
			}

			const membersVal = membersSnap.exists()
				? (membersSnap.val() as Record<string, { role?: string }>)
				: {};
			const players = Object.values(membersVal).filter((m) => m?.role === 'player').length;
			active.push({
				code,
				status: info.status === 'playing' ? 'playing' : 'lobby',
				players,
				maxPlayers: countOpenHumanCapacity(info.config),
				modeId: info.config?.modeId ?? 'standard',
				createdAt: info.createdAt ?? recordedAt
			});
		}

		active.sort((a, b) => b.createdAt - a.createdAt);
		return active;
	} catch (error) {
		logService.warn('network', 'list own rooms failed', { reason: String(error) });
		return [];
	}
}
