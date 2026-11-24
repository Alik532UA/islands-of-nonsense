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

	await set(lobbyRef, {
		...room,
		createdAt: serverTimestamp()
	});
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

/**
 * Real-time listener for open public lobby rooms.
 */
export function subscribeLobby(db: Database, onRooms: (rooms: LobbyRoom[]) => void): () => void {
	let cancelled = false;
	let unsubscribe = () => {};

	void import('firebase/database').then(({ ref, onValue, query, limitToLast }) => {
		if (cancelled) return;
		const lobbyQuery = query(ref(db, `lobby/${GAME_ID}`), limitToLast(30));
		unsubscribe = onValue(lobbyQuery, (snapshot) => {
			if (!snapshot.exists()) {
				onRooms([]);
				return;
			}
			const val = snapshot.val() as Record<string, LobbyRoom>;
			const list = Object.values(val).filter((r) => r.players < r.maxPlayers);
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
