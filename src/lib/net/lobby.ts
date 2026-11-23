import type { Database } from 'firebase/database';
import type { LobbyRoom } from './roomTypes';

export const GAME_ID = 'castlefight';
export const RULES_VERSION = 1;

/**
 * Publish an open room to RTDB lobby feed.
 */
export async function publishToLobby(db: Database, room: LobbyRoom): Promise<() => void> {
	const dbModule = await import('firebase/database');
	const { ref, set, onDisconnect, remove } = dbModule;
	const lobbyRef = ref(db, `lobby/${GAME_ID}/${room.code}`);

	await set(lobbyRef, room);
	const disconnectHandler = onDisconnect(lobbyRef);
	void disconnectHandler.remove();

	return () => {
		void remove(lobbyRef);
		void disconnectHandler.cancel();
	};
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
