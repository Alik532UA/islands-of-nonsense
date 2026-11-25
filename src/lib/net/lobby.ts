import type { Database } from 'firebase/database';
import {
	MAX_ROOM_SPECTATORS,
	normalizeSpectatorMode,
	type LobbyRoom,
	type RoomStatus,
	type SpectatorMode
} from './roomTypes';
import { RULES_VERSION, RULES_STAMP } from './rulesVersion';

export const GAME_ID = 'castlefight';
export { RULES_VERSION, RULES_STAMP };

export type LobbyPublishInput = Omit<LobbyRoom, 'createdAt'> & { createdAt?: number };

/**
 * Publish an open room to RTDB lobby feed using serverTimestamp().
 */
export async function publishToLobby(db: Database, room: LobbyPublishInput): Promise<() => void> {
	const dbModule = await import('firebase/database');
	const { ref, set, onDisconnect, remove, serverTimestamp } = dbModule;
	const lobbyRef = ref(db, `lobby/${GAME_ID}/${room.code}`);

	const payload: Record<string, unknown> = {
		code: room.code,
		hostUid: room.hostUid,
		hostName: room.hostName,
		...(room.hostCountry && room.hostCountry.length === 2 ? { hostCountry: room.hostCountry } : {}),
		...(room.hostAvatar ? { hostAvatar: room.hostAvatar } : {}),
		gameId: room.gameId,
		rulesVersion: room.rulesVersion,
		players: room.players,
		maxPlayers: room.maxPlayers,
		spectators: room.spectators ?? 0,
		status: room.status === 'playing' ? 'playing' : 'lobby',
		spectatorMode: normalizeSpectatorMode(room.spectatorMode),
		modeId: room.modeId,
		createdAt: serverTimestamp()
	};

	await set(lobbyRef, payload);
	const disconnectHandler = onDisconnect(lobbyRef);
	void disconnectHandler.remove();

	return () => {
		void remove(lobbyRef);
		void disconnectHandler.cancel();
	};
}

/**
 * Update player count in an open lobby room.
 */
export async function updateLobbyPlayers(
	db: Database,
	code: string,
	players: number
): Promise<void> {
	await updateLobbyMatchState(db, code, { players });
}

/**
 * Update lobby feed metadata (player/spectator counts, status, spectator policy).
 */
export async function updateLobbyMatchState(
	db: Database,
	code: string,
	patch: {
		players?: number;
		maxPlayers?: number;
		spectators?: number;
		status?: Extract<RoomStatus, 'lobby' | 'playing'>;
		spectatorMode?: SpectatorMode;
		modeId?: string;
	}
): Promise<void> {
	const { ref, update } = await import('firebase/database');
	await update(ref(db, `lobby/${GAME_ID}/${code}`), patch);
}

/**
 * Remove room from lobby feed upon filling or match start.
 */
export async function removeFromLobby(db: Database, code: string): Promise<void> {
	const { ref, remove } = await import('firebase/database');
	const lobbyRef = ref(db, `lobby/${GAME_ID}/${code}`);
	await remove(lobbyRef);
}

export const LOBBY_STALE_MS = 15 * 60 * 1000;
export const ROOM_HEARTBEAT_STALE_MS = 3 * 60 * 1000;

export function isLiveRoomInfo(
	info: {
		status?: string;
		aliveAt?: number;
		startedAt?: number;
		createdAt?: number;
	} | null,
	now: number = Date.now()
): boolean {
	if (!info || info.status === 'over') return false;
	const lastSeen = info.aliveAt ?? info.startedAt ?? info.createdAt ?? 0;
	if (!lastSeen) return false;
	return now - lastSeen <= ROOM_HEARTBEAT_STALE_MS;
}

export function isCompatibleLobbyRoom(room: LobbyRoom, now: number = Date.now()): boolean {
	if (!room) return false;
	const age = typeof room.createdAt === 'number' ? now - room.createdAt : 0;
	if (age > LOBBY_STALE_MS) return false;
	if (typeof room.rulesVersion === 'number' && room.rulesVersion !== RULES_VERSION) return false;
	const specMode = normalizeSpectatorMode(room.spectatorMode);
	const canSpec = (room.spectators ?? 0) < MAX_ROOM_SPECTATORS;
	if (room.status === 'playing') {
		return specMode === 'anytime' && canSpec;
	}
	return room.players < room.maxPlayers || (specMode !== 'none' && canSpec);
}

/**
 * Real-time listener for open public lobby rooms.
 */
export function subscribeLobby(db: Database, onRooms: (rooms: LobbyRoom[]) => void): () => void {
	let cancelled = false;
	let unsubscribe = () => {};

	void import('firebase/database').then(({ ref, onValue, orderByChild, query, limitToLast }) => {
		if (cancelled) return;
		const lobbyQuery = query(
			ref(db, `lobby/${GAME_ID}`),
			orderByChild('createdAt'),
			limitToLast(30)
		);
		unsubscribe = onValue(lobbyQuery, (snapshot) => {
			if (!snapshot.exists()) {
				onRooms([]);
				return;
			}
			const now = Date.now();
			const val = snapshot.val() as Record<string, LobbyRoom>;
			const list: LobbyRoom[] = [];
			for (const room of Object.values(val)) {
				if (isCompatibleLobbyRoom(room, now)) {
					list.push(room);
				}
			}
			// Sort newest first
			list.sort((a, b) => b.createdAt - a.createdAt);
			onRooms(list);
		});
	});

	return () => {
		cancelled = true;
		unsubscribe();
	};
}
