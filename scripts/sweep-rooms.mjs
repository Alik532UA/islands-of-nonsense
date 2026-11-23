/**
 * Realtime Database abandoned room and stale state cleaner script.
 * @param {Record<string, any> | null | undefined} roomsSnapshot
 * @param {number} [now]
 * @returns {string[]}
 */
export const SWEEP_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * @param {Record<string, any> | null | undefined} roomsSnapshot
 * @param {number} [now]
 * @returns {string[]}
 */
export function planRoomSweep(roomsSnapshot, now = Date.now()) {
	/** @type {string[]} */
	const pathsToDelete = [];

	if (!roomsSnapshot || typeof roomsSnapshot !== 'object') {
		return pathsToDelete;
	}

	for (const [code, room] of Object.entries(roomsSnapshot)) {
		if (!room || typeof room !== 'object') {
			pathsToDelete.push(`rooms/${code}`);
			continue;
		}

		const info = room.info;
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

if (process.argv[1]?.endsWith('sweep-rooms.mjs')) {
	console.log('✅ sweep-rooms module loaded successfully. (Run via CI or firebase maintenance).');
}
