import type { Database } from 'firebase/database';
import { generateRoomCode } from './roomCode';
import { GAME_ID, RULES_VERSION, publishToLobby } from './lobby';
import type { LobbyRoom } from './roomTypes';

export interface SeekPlayer {
	uid: string;
	name: string;
	country?: string;
	avatar?: string;
}

export interface SeekResult {
	code: string;
	isHost: boolean;
}

/**
 * 1v1 Quick matchmaking seek.
 */
export async function seekMatch(
	db: Database,
	player: SeekPlayer,
	signal?: AbortSignal
): Promise<SeekResult> {
	const dbModule = await import('firebase/database');
	const { ref, get, set, remove, onDisconnect } = dbModule;
	const queueRef = ref(db, `seek/${GAME_ID}`);

	if (signal?.aborted) throw new Error('Search cancelled');

	// Check existing seeking ticket
	const snapshot = await get(queueRef);
	if (snapshot.exists()) {
		const raw = snapshot.val() as Record<string, { uid: string; code: string; createdAt: number }>;
		const now = Date.now();
		for (const [ticketId, ticket] of Object.entries(raw)) {
			// Found an active ticket from another player within last 20 seconds
			if (ticket.uid !== player.uid && now - ticket.createdAt < 20000) {
				// Claim match
				await remove(ref(db, `seek/${GAME_ID}/${ticketId}`));
				return { code: ticket.code, isHost: false };
			}
		}
	}

	// No opponent found, create our own ticket and room
	const roomCode = generateRoomCode();
	const myTicketRef = ref(db, `seek/${GAME_ID}/${player.uid}`);
	const ticketData = {
		uid: player.uid,
		code: roomCode,
		createdAt: Date.now()
	};

	await set(myTicketRef, ticketData);
	const disconnect = onDisconnect(myTicketRef);
	void disconnect.remove();

	// Publish room to lobby so anyone can join if matchmaking doesn't match immediately
	const lobbyEntry: LobbyRoom = {
		code: roomCode,
		hostUid: player.uid,
		hostName: player.name,
		hostCountry: player.country,
		hostAvatar: player.avatar,
		gameId: GAME_ID,
		rulesVersion: RULES_VERSION,
		players: 1,
		maxPlayers: 2,
		modeId: 'standard',
		createdAt: Date.now()
	};
	void publishToLobby(db, lobbyEntry);

	return { code: roomCode, isHost: true };
}
