/**
 * Realtime Database abandoned room and stale state cleaner.
 * Scans rooms and deletes those inactive for longer than 24 hours.
 */
export const SWEEP_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours stale threshold

export interface SweepRoomInfo {
	createdAt?: number;
	startedAt?: number;
	aliveAt?: number;
	hostUid?: string;
}

export interface SweepRoomData {
	info?: SweepRoomInfo;
}

export function planRoomSweep(
	roomsSnapshot: Record<string, SweepRoomData | unknown> | null | undefined,
	now: number = Date.now()
): string[] {
	const pathsToDelete: string[] = [];

	if (!roomsSnapshot || typeof roomsSnapshot !== 'object') {
		return pathsToDelete;
	}

	for (const [code, room] of Object.entries(roomsSnapshot)) {
		if (!room || typeof room !== 'object') {
			pathsToDelete.push(`rooms/${code}`);
			continue;
		}

		const info = (room as SweepRoomData).info;
		if (!info) {
			// Malformed or empty room
			pathsToDelete.push(`rooms/${code}`);
			continue;
		}

		const lastActivity = info.aliveAt ?? info.startedAt ?? info.createdAt ?? 0;
		if (now - lastActivity > SWEEP_MAX_AGE_MS) {
			pathsToDelete.push(`rooms/${code}`);
			pathsToDelete.push(`lobby/${code}`);
		}
	}

	return pathsToDelete;
}
