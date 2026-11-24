/**
 * Realtime Database abandoned room and stale state cleaner.
 * Scans rooms, lobby entries, seek tickets, and per-user room bookmarks inactive for > 2 hours.
 */
export const SWEEP_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours stale threshold
export const DEFAULT_GAME_ID = 'islands-of-nonsense';

export interface SweepRoomInfo {
	createdAt?: number;
	updatedAt?: number;
	lastMoveAt?: number;
	gameId?: string;
}

export interface SweepRoomData {
	info?: SweepRoomInfo;
	members?: Record<string, { lastMoveAt?: number; joinedAt?: number }>;
	presence?: Record<string, { at?: number }>;
}

export interface SweepPlanExtras {
	gameId?: string;
	lobbyByGame?: Record<string, Record<string, { createdAt?: number }>> | null;
	seekByGame?: Record<string, Record<string, { at?: number }>> | null;
	myRooms?: Record<string, Record<string, { createdAt?: number }>> | null;
}

function getLatestRoomActivity(room: SweepRoomData): number {
	const info = room.info;
	let latest = Math.max(info?.createdAt ?? 0, info?.updatedAt ?? 0, info?.lastMoveAt ?? 0);
	if (room.members) {
		for (const member of Object.values(room.members)) {
			if (member && typeof member === 'object') {
				latest = Math.max(latest, member.lastMoveAt ?? 0, member.joinedAt ?? 0);
			}
		}
	}
	if (room.presence) {
		for (const p of Object.values(room.presence)) {
			if (p && typeof p === 'object') {
				latest = Math.max(latest, p.at ?? 0);
			}
		}
	}
	return latest;
}

export function planRoomSweep(
	roomsSnapshot: Record<string, SweepRoomData | unknown> | null | undefined,
	now = Date.now(),
	extras: SweepPlanExtras = {}
): string[] {
	const pathsToDelete = new Set<string>();
	const defaultGameId = extras.gameId || DEFAULT_GAME_ID;
	const survivingRooms = new Set<string>();

	if (roomsSnapshot && typeof roomsSnapshot === 'object') {
		for (const [code, room] of Object.entries(roomsSnapshot)) {
			if (!room || typeof room !== 'object') {
				pathsToDelete.add(`rooms/${code}`);
				continue;
			}
			const typed = room as SweepRoomData;
			const info = typed.info;
			if (!info || typeof info.createdAt !== 'number') {
				pathsToDelete.add(`rooms/${code}`);
				continue;
			}

			const gameId = info.gameId || defaultGameId;
			const lastActivity = getLatestRoomActivity(typed);
			if (now - lastActivity > SWEEP_MAX_AGE_MS) {
				pathsToDelete.add(`rooms/${code}`);
				pathsToDelete.add(`lobby/${gameId}/${code}`);
			} else {
				survivingRooms.add(code);
			}
		}
	}

	if (extras.lobbyByGame && typeof extras.lobbyByGame === 'object') {
		for (const [gameId, entries] of Object.entries(extras.lobbyByGame)) {
			if (!entries || typeof entries !== 'object') continue;
			for (const [code, item] of Object.entries(entries)) {
				const createdAt = item?.createdAt ?? 0;
				if (!survivingRooms.has(code) || !createdAt || now - createdAt > SWEEP_MAX_AGE_MS) {
					pathsToDelete.add(`lobby/${gameId}/${code}`);
				}
			}
		}
	}

	if (extras.seekByGame && typeof extras.seekByGame === 'object') {
		for (const [gameId, entries] of Object.entries(extras.seekByGame)) {
			if (!entries || typeof entries !== 'object') continue;
			for (const [uid, item] of Object.entries(entries)) {
				const at = item?.at ?? 0;
				if (!at || now - at > SWEEP_MAX_AGE_MS) {
					pathsToDelete.add(`seek/${gameId}/${uid}`);
				}
			}
		}
	}

	if (extras.myRooms && typeof extras.myRooms === 'object') {
		for (const [uid, rooms] of Object.entries(extras.myRooms)) {
			if (!rooms || typeof rooms !== 'object') continue;
			for (const [code, meta] of Object.entries(rooms)) {
				const createdAt = meta?.createdAt ?? 0;
				if (!survivingRooms.has(code) || (createdAt > 0 && now - createdAt > SWEEP_MAX_AGE_MS)) {
					pathsToDelete.add(`myRooms/${uid}/${code}`);
				}
			}
		}
	}

	return [...pathsToDelete];
}
