import { isDenied } from './denied';
import { connect, serverNow, serverTime } from './firebase';
import { logService } from '$lib/services/logService.svelte';
import { generateRoomCode } from './roomCode';
import type {
	Member,
	MemberPatch,
	Move,
	RoomConfig,
	RoomEntry,
	RoomInfo,
	RoomStatus,
	RoomTransport,
	RosterEntry
} from './roomTypes';
import { infoFromDb, membersFromDb, moveKey, rosterToRecord, snapshotFromDb } from './roomShape';

export interface NewRoomOptions {
	gameId: string;
	rulesVersion: number;
	seed: number;
	config: RoomConfig;
	name: string;
	country?: string;
	avatar?: string;
	team?: 'west' | 'east';
	race?: string;
	autoStart?: boolean;
	isPrivate?: boolean;
	compact?: boolean;
	random?: () => number;
}

const CODE_TRIES = 12;

export async function createRoom(options: NewRoomOptions): Promise<string> {
	const { uid, db, auth } = await connect();
	const { get, ref, set, serverTimestamp } = await import('firebase/database');
	const random = options.random ?? Math.random;

	let lastDenial: unknown = null;

	for (let attempt = 0; attempt < CODE_TRIES; attempt++) {
		const code = generateRoomCode(random);

		let taken = false;
		try {
			taken = (await get(ref(db, `rooms/${code}/info`))).exists();
		} catch (error) {
			throw new Error('rules-missing', { cause: error });
		}
		if (taken) continue;

		const info: Omit<RoomInfo, 'createdAt'> & { createdAt: object } = {
			gameId: options.gameId,
			rulesVersion: options.rulesVersion,
			seed: options.seed,
			status: 'lobby',
			hostUid: uid,
			config: options.config,
			autoStart: options.autoStart ?? false,
			listed: !options.isPrivate,
			createdAt: serverTimestamp()
		};

		try {
			await set(ref(db, `rooms/${code}/info`), info);
		} catch (error) {
			if (!isDenied(error)) throw error;
			lastDenial = error;
			continue;
		}

		await set(ref(db, `rooms/${code}/members/${uid}`), {
			name: options.name,
			role: 'player',
			order: 1,
			...(options.country ? { country: options.country } : {}),
			...(options.avatar ? { avatar: options.avatar } : {}),
			...(options.team ? { team: options.team } : { team: 'west' }),
			...(options.race ? { race: options.race } : {}),
			...(options.compact ? { compact: true } : {}),
			...(auth.currentUser?.isAnonymous === false ? { account: true } : {})
		});

		return code;
	}

	throw new Error('room-code-exhausted', { cause: lastDenial });
}

export async function joinRoom(code: string, entry: RoomEntry): Promise<void> {
	const { uid, db, auth } = await connect();
	const { get, ref, set } = await import('firebase/database');

	const membersSnap = await get(ref(db, `rooms/${code}/members`));
	const currentMembers = membersSnap.val() as Record<string, unknown> | null;
	const count = currentMembers ? Object.keys(currentMembers).length : 0;

	await set(ref(db, `rooms/${code}/members/${uid}`), {
		name: entry.name,
		role: entry.role,
		order: count + 1,
		...(entry.country ? { country: entry.country } : {}),
		...(entry.avatar ? { avatar: entry.avatar } : {}),
		...(entry.team ? { team: entry.team } : { team: count % 2 === 0 ? 'west' : 'east' }),
		...(entry.race ? { race: entry.race } : {}),
		...(entry.compact ? { compact: true } : {}),
		...(auth.currentUser?.isAnonymous === false ? { account: true } : {})
	});
}

export async function updateMe(code: string, patch: MemberPatch): Promise<void> {
	const { uid, db } = await connect();
	const { ref, update } = await import('firebase/database');
	await update(ref(db, `rooms/${code}/members/${uid}`), patch);
}

export async function peekRoom(code: string): Promise<RoomInfo | null> {
	const { db } = await connect();
	const { get, ref } = await import('firebase/database');
	const snapshot = await get(ref(db, `rooms/${code}/info`));
	return snapshot.exists() ? infoFromDb(snapshot.val()) : null;
}

export async function peekMembers(code: string): Promise<Member[] | null> {
	const { db } = await connect();
	const { get, ref } = await import('firebase/database');
	const snapshot = await get(ref(db, `rooms/${code}/members`));
	return snapshot.exists() ? membersFromDb(snapshot.val()) : null;
}

export async function closeRoom(code: string): Promise<void> {
	const { db } = await connect();
	const { ref, remove } = await import('firebase/database');
	await remove(ref(db, `rooms/${code}`));
}

export async function roomTransport(code: string): Promise<RoomTransport> {
	const { db } = await connect();
	await serverTime();
	const { onValue, ref, serverTimestamp, set, update } = await import('firebase/database');
	const room = ref(db, `rooms/${code}`);

	return {
		code,
		now: serverNow,

		watch(onSnapshot, onGone) {
			return onValue(
				room,
				(snapshot) => {
					const next = snapshotFromDb(snapshot.val());
					if (next) onSnapshot(next);
					else onGone?.('closed');
				},
				(error) => {
					logService.error('network', 'room listener cancelled', { code, reason: String(error) });
					onGone?.('lost');
				}
			);
		},

		async append(move: Move) {
			try {
				await set(ref(db, `rooms/${code}/moves/${moveKey(move.seq)}`), {
					...move,
					at: serverTimestamp()
				});
				return true;
			} catch (error) {
				if (!isDenied(error)) throw error;
				return false;
			}
		},

		async setStatus(status: RoomStatus, roster?: RosterEntry[], config?: RoomConfig) {
			if (status === 'playing') {
				await update(ref(db, `rooms/${code}`), {
					'info/status': status,
					'info/startedAt': serverTimestamp(),
					'info/countdownAt': null,
					...(roster ? { 'info/roster': rosterToRecord(roster) } : {}),
					...(config ? { 'info/config': config } : {}),
					moves: null
				});
				return;
			}
			await update(ref(db, `rooms/${code}/info`), { status, countdownAt: null });
		},

		async touch() {
			await update(ref(db, `rooms/${code}/info`), { aliveAt: serverTimestamp() });
		},

		async setAutoStart(on: boolean) {
			await update(ref(db, `rooms/${code}/info`), { autoStart: on, countdownAt: null });
		},

		async setConfig(config: RoomConfig) {
			await update(ref(db, `rooms/${code}/info`), { config });
		}
	};
}
