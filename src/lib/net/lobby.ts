import type { Database } from 'firebase/database';
import type { LobbyRoom } from './roomTypes';
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
	const { ref, update } = await import('firebase/database');
	await update(ref(db, `lobby/${GAME_ID}/${code}`), { players });
}

/**
 * Remove room from lobby feed upon filling or match start.
 */
export async function removeFromLobby(db: Database, code: string): Promise<void> {
	const { ref, remove } = await import('firebase/database');
	const lobbyRef = ref(db, `lobby/${GAME_ID}/${code}`);
	await remove(lobbyRef);
}

export const LOBBY_STALE_MS = 2 * 60 * 60 * 1000;

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
				const age = typeof room.createdAt === 'number' ? now - room.createdAt : 0;
				if (age > LOBBY_STALE_MS) {
					continue;
				}
				if (room.players < room.maxPlayers) {
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
