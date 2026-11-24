import type { Database } from 'firebase/database';
import { GAME_ID, RULES_VERSION, publishToLobby, updateLobbyPlayers } from './lobby';
import type { createRoom, joinRoom } from './rtdbRoom';
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

export interface SeekDeps {
	createRoom?: typeof createRoom;
	joinRoom?: typeof joinRoom;
	publishToLobby?: typeof publishToLobby;
	updateLobbyPlayers?: typeof updateLobbyPlayers;
	now?: () => number;
}

const SEEK_WINDOW_MS = 20_000;
const POLL_WAIT_MS = 3_000;
const POLL_STEP_MS = 400;

/**
 * Builds an RTDB-rule-compliant ticket for `/seek/{gameId}/{uid}`.
 */
export function buildSeekTicket(
	player: SeekPlayer,
	timestampSentinel: object | number
): Record<string, unknown> {
	return {
		uid: player.uid,
		name: player.name,
		...(player.country && player.country.length === 2 ? { country: player.country } : {}),
		...(player.avatar ? { avatar: player.avatar } : {}),
		at: timestampSentinel
	};
}

function findJoinableLobbyRoom(
	raw: Record<string, LobbyRoom> | null,
	myUid: string,
	now: number
): LobbyRoom | null {
	if (!raw) return null;
	const candidates = Object.values(raw)
		.filter(
			(r) =>
				r &&
				r.hostUid !== myUid &&
				r.players < r.maxPlayers &&
				r.modeId === 'standard' &&
				now - (r.createdAt ?? 0) < 60_000
		)
		.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
	return candidates[0] ?? null;
}

/**
 * 1v1 Quick matchmaking seek compatible with `database.rules.json`:
 * 1. Joins an open 1v1 lobby room if one is waiting.
 * 2. Registers `/seek/{gameId}/{uid}` with `at: serverTimestamp()` + `onDisconnect`.
 * 3. Pairs with active seekers using deterministic UID ordering or creates a real RTDB room.
 */
export async function seekMatch(
	db: Database,
	player: SeekPlayer,
	signal?: AbortSignal,
	deps: SeekDeps = {}
): Promise<SeekResult> {
	const dbModule = await import('firebase/database');
	const { ref, get, set, remove, onDisconnect, serverTimestamp, query, orderByChild, limitToLast } =
		dbModule;

	const doCreateRoom = deps.createRoom ?? (await import('./rtdbRoom')).createRoom;
	const doJoinRoom = deps.joinRoom ?? (await import('./rtdbRoom')).joinRoom;
	const doPublish = deps.publishToLobby ?? publishToLobby;
	const doUpdatePlayers = deps.updateLobbyPlayers ?? updateLobbyPlayers;
	const nowFn = deps.now ?? Date.now;

	if (signal?.aborted) throw new Error('Search cancelled');

	const lobbyRef = query(ref(db, `lobby/${GAME_ID}`), orderByChild('createdAt'), limitToLast(30));
	const lobbySnap = await get(lobbyRef);
	if (lobbySnap.exists()) {
		const open = findJoinableLobbyRoom(
			lobbySnap.val() as Record<string, LobbyRoom>,
			player.uid,
			nowFn()
		);
		if (open) {
			await doJoinRoom(open.code, {
				name: player.name,
				role: 'player',
				country: player.country,
				avatar: player.avatar,
				team: 'east'
			});
			await doUpdatePlayers(db, open.code, open.players + 1).catch(() => {});
			return { code: open.code, isHost: false };
		}
	}

	if (signal?.aborted) throw new Error('Search cancelled');

	const queueRef = query(ref(db, `seek/${GAME_ID}`), orderByChild('at'), limitToLast(30));
	const myTicketRef = ref(db, `seek/${GAME_ID}/${player.uid}`);
	await set(myTicketRef, buildSeekTicket(player, serverTimestamp()));
	const disconnect = onDisconnect(myTicketRef);
	void disconnect.remove();

	const cleanupTicket = async () => {
		await remove(myTicketRef).catch(() => {});
		await disconnect.cancel().catch(() => {});
	};

	const abortListener = () => {
		void cleanupTicket();
	};
	signal?.addEventListener('abort', abortListener, { once: true });

	try {
		const queueSnap = await get(queueRef);
		const now = nowFn();
		let peerUid: string | null = null;
		if (queueSnap.exists()) {
			const raw = queueSnap.val() as Record<string, { uid: string; at?: number }>;
			for (const ticket of Object.values(raw)) {
				if (ticket && ticket.uid !== player.uid && now - (ticket.at ?? 0) < SEEK_WINDOW_MS) {
					peerUid = ticket.uid;
					break;
				}
			}
		}

		// If peer exists and peer has lexicographically smaller UID, wait briefly for their room in lobby
		if (peerUid && player.uid > peerUid) {
			const deadline = nowFn() + POLL_WAIT_MS;
			while (nowFn() < deadline) {
				if (signal?.aborted) throw new Error('Search cancelled');
				await new Promise((r) => setTimeout(r, POLL_STEP_MS));
				if (signal?.aborted) throw new Error('Search cancelled');
				const checkLobby = await get(lobbyRef);
				if (checkLobby.exists()) {
					const matchRoom = Object.values(checkLobby.val() as Record<string, LobbyRoom>).find(
						(r) => r && r.hostUid === peerUid && r.players < r.maxPlayers
					);
					if (matchRoom) {
						await cleanupTicket();
						await doJoinRoom(matchRoom.code, {
							name: player.name,
							role: 'player',
							country: player.country,
							avatar: player.avatar,
							team: 'east'
						});
						await doUpdatePlayers(db, matchRoom.code, matchRoom.players + 1).catch(() => {});
						return { code: matchRoom.code, isHost: false };
					}
				}
			}
		}

		if (signal?.aborted) throw new Error('Search cancelled');

		const seed = Math.floor(Math.random() * 1_000_000);
		const roomCode = await doCreateRoom({
			gameId: GAME_ID,
			rulesVersion: RULES_VERSION,
			seed,
			config: { modeId: 'standard', teamSize: 1, targetWins: 2 },
			name: player.name,
			country: player.country,
			avatar: player.avatar,
			team: 'west',
			autoStart: true
		});

		await doPublish(db, {
			code: roomCode,
			hostUid: player.uid,
			hostName: player.name,
			hostCountry: player.country,
			hostAvatar: player.avatar,
			gameId: GAME_ID,
			rulesVersion: RULES_VERSION,
			players: 1,
			maxPlayers: 2,
			modeId: 'standard'
		});

		await cleanupTicket();
		return { code: roomCode, isHost: true };
	} finally {
		signal?.removeEventListener('abort', abortListener);
	}
}
