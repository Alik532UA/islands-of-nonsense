import { isDenied } from './denied';
import { connect, serverNow, serverTime } from './firebase';
import { logService } from '$lib/services/logService.svelte';
import { generateRoomCode } from './roomCode';
import { forgetOwnRoom, pruneOwnRooms, rememberOwnRoom } from './ownRooms';
import type {
	GoneReason,
	Member,
	MemberPatch,
	Move,
	RoomConfig,
	RoomEntry,
	RoomInfo,
	RoomSlotKey,
	RoomSnapshot,
	RoomStatus,
	RoomTransport,
	RosterEntry
} from './roomTypes';
import {
	MOVE_SEQ_MAX,
	infoFromDb,
	membersFromDb,
	moveKey,
	rosterToRecord,
	type RawInfo
} from './roomShape';
import { pickFirstAvailableSeat, pickNextTeamSlot } from './onlineMatchSetup';
import { GAME_ID } from './lobby';

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
const MOVE_RETRY_LIMIT = 10;
const DEFAULT_COOLDOWN_RETRIES = 3;
const MOVE_RATE_LIMIT_BACKOFF_MS = 95;
const MIN_OUTBOUND_MOVE_SPACING_MS = 95;

export interface RetryMoveWriteOptions {
	initialSeq: number;
	maxSeq?: number;
	maxCooldownRetries?: number;
	getHighestSeq: () => number;
	attemptWrite: (seq: number) => Promise<void>;
	doesSeqExist: (seq: number) => Promise<boolean>;
	waitMs?: (ms: number) => Promise<void>;
}

/**
 * Writes a move safely under concurrent multi-client dispatches and RTDB cooldowns.
 * Resolves sequence-number collisions by advancing past `highestSeq`, and backs off across
 * multiple bursts if rejected due to the server-side 80ms anti-spam cooldown.
 */
export async function writeMoveWithRetry(options: RetryMoveWriteOptions): Promise<boolean> {
	const maxSeq = options.maxSeq ?? MOVE_SEQ_MAX;
	const maxCooldownRetries = Math.max(0, options.maxCooldownRetries ?? DEFAULT_COOLDOWN_RETRIES);
	const wait =
		options.waitMs ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
	let seq = Math.max(1, options.initialSeq, options.getHighestSeq() + 1);
	let cooldownRetries = 0;

	for (let attempt = 0; attempt < MOVE_RETRY_LIMIT; attempt++) {
		if (seq > maxSeq || seq < 1) return false;
		try {
			await options.attemptWrite(seq);
			return true;
		} catch (error) {
			if (!isDenied(error)) throw error;
			const taken = await options.doesSeqExist(seq).catch(() => false);
			if (taken) {
				seq = Math.max(seq + 1, options.getHighestSeq() + 1);
				continue;
			}
			if (cooldownRetries < maxCooldownRetries) {
				cooldownRetries++;
				await wait(MOVE_RATE_LIMIT_BACKOFF_MS * cooldownRetries);
				seq = Math.max(seq, options.getHighestSeq() + 1);
				continue;
			}
			return false;
		}
	}
	return false;
}

interface RoomSubscriber {
	onSnapshot: (snapshot: RoomSnapshot) => void;
	onGone?: (why: GoneReason) => void;
}

interface SharedRoomChannel {
	highestSeq: number;
	inFlightSeqs: Set<number>;
	confirmSeq: (seq: number) => void;
	rejectSeq: (seq: number) => void;
	mergeServerMoves: (rawMoves: Record<string, Move> | null) => Move[];
	subscribe: (sub: RoomSubscriber) => () => void;
}

const sharedChannels = new Map<string, SharedRoomChannel>();

async function acquireSharedChannel(code: string): Promise<SharedRoomChannel> {
	const { uid, db } = await connect();
	const channelKey = `${uid}:${code}`;
	const existing = sharedChannels.get(channelKey);
	if (existing) return existing;

	const { get, onChildAdded, onChildChanged, onChildRemoved, onValue, orderByKey, query, ref } =
		await import('firebase/database');

	let info: RoomInfo | null = null;
	let infoLoaded = false;
	let members: Member[] = [];
	let membersLoaded = false;
	const movesBySeq = new Map<number, Move>();
	const subscribers = new Set<RoomSubscriber>();
	let emitQueued = false;
	let unsubFns: (() => void)[] = [];
	let disposed = false;

	const getSortedMoves = () =>
		[...movesBySeq.values()]
			.filter((m) => !channel.inFlightSeqs.has(m.seq))
			.sort((a, b) => a.seq - b.seq);

	const channel: SharedRoomChannel = {
		highestSeq: 0,
		inFlightSeqs: new Set<number>(),
		confirmSeq(seq: number) {
			if (channel.inFlightSeqs.delete(seq) && movesBySeq.has(seq)) {
				if (seq > channel.highestSeq) {
					channel.highestSeq = seq;
				}
				scheduleEmit();
			}
		},
		rejectSeq(seq: number) {
			channel.inFlightSeqs.delete(seq);
		},
		mergeServerMoves(rawMoves: Record<string, Move> | null) {
			if (rawMoves) {
				let added = false;
				for (const [key, val] of Object.entries(rawMoves)) {
					const seq = Number(key);
					if (!Number.isInteger(seq) || !val) continue;
					if (!movesBySeq.has(seq)) {
						movesBySeq.set(seq, { ...val, seq });
						if (seq > channel.highestSeq) {
							channel.highestSeq = seq;
						}
						added = true;
					}
				}
				if (added) {
					scheduleEmit();
				}
			}
			return getSortedMoves();
		},
		subscribe(sub: RoomSubscriber) {
			if (unsubFns.length === 0 && !disposed) {
				startListeners();
			}
			subscribers.add(sub);
			if (infoLoaded && membersLoaded && info) {
				sub.onSnapshot({ info, members, moves: getSortedMoves() });
			}
			return () => {
				subscribers.delete(sub);
				if (subscribers.size === 0) {
					teardown();
				}
			};
		}
	};

	function flushEmit() {
		emitQueued = false;
		if (disposed || !infoLoaded || !membersLoaded || !info) return;
		const snapshot: RoomSnapshot = {
			info,
			members,
			moves: getSortedMoves()
		};
		for (const sub of [...subscribers]) {
			sub.onSnapshot(snapshot);
		}
	}

	function scheduleEmit() {
		if (emitQueued || disposed || !infoLoaded || !membersLoaded || !info) return;
		emitQueued = true;
		queueMicrotask(flushEmit);
	}

	function notifyGone(why: GoneReason) {
		for (const sub of [...subscribers]) {
			sub.onGone?.(why);
		}
		teardown();
	}

	function startListeners() {
		const infoRef = ref(db, `rooms/${code}/info`);
		const membersRef = ref(db, `rooms/${code}/members`);
		const movesRef = ref(db, `rooms/${code}/moves`);
		const movesQuery = query(movesRef, orderByKey());

		const unsubInfo = onValue(
			infoRef,
			(snap) => {
				infoLoaded = true;
				if (!snap.exists()) {
					info = null;
					notifyGone('closed');
					return;
				}
				info = infoFromDb(snap.val() as RawInfo);
				scheduleEmit();
			},
			(error) => {
				logService.error('network', 'room info listener cancelled', {
					code,
					reason: String(error)
				});
				notifyGone('lost');
			}
		);

		const unsubMembers = onValue(
			membersRef,
			(snap) => {
				membersLoaded = true;
				members = snap.exists()
					? membersFromDb(snap.val() as Record<string, Omit<Member, 'uid'>>)
					: [];
				scheduleEmit();
			},
			(error) => {
				logService.error('network', 'room members listener cancelled', {
					code,
					reason: String(error)
				});
				notifyGone('lost');
			}
		);

		let gapHealTimer: ReturnType<typeof setTimeout> | null = null;
		const scheduleGapHeal = () => {
			if (gapHealTimer || disposed) return;
			gapHealTimer = setTimeout(() => {
				gapHealTimer = null;
				if (disposed) return;
				void get(movesRef)
					.then((snap) => {
						channel.mergeServerMoves((snap.val() as Record<string, Move> | null) ?? null);
					})
					.catch(() => {});
			}, 180);
		};

		const ingestMoveSnap = (snap: { key: string | null; val: () => unknown }) => {
			const seq = Number(snap.key);
			const val = snap.val() as Move | null;
			if (!Number.isInteger(seq) || !val) return;
			const move: Move = { ...val, seq };
			movesBySeq.set(seq, move);
			if (!channel.inFlightSeqs.has(seq)) {
				if (seq > channel.highestSeq) {
					channel.highestSeq = seq;
				}
				if (seq > 1 && !movesBySeq.has(seq - 1)) {
					scheduleGapHeal();
				}
				scheduleEmit();
			}
		};

		const unsubMovesAdd = onChildAdded(movesQuery, ingestMoveSnap, (error) => {
			logService.warn('network', 'room moves listener cancelled', {
				code,
				reason: String(error)
			});
		});

		const unsubMovesChange = onChildChanged(movesQuery, ingestMoveSnap);

		const unsubMovesRemove = onChildRemoved(movesRef, (snap) => {
			const seq = Number(snap.key);
			if (Number.isInteger(seq)) {
				movesBySeq.delete(seq);
			}
			// Reset sequence high-water mark when room clears moves on round/match start
			if (movesBySeq.size === 0) {
				channel.highestSeq = 0;
			}
			scheduleEmit();
		});

		unsubFns = [
			unsubInfo,
			unsubMembers,
			unsubMovesAdd,
			unsubMovesChange,
			unsubMovesRemove,
			() => {
				if (gapHealTimer) {
					clearTimeout(gapHealTimer);
					gapHealTimer = null;
				}
			}
		];
	}

	function teardown() {
		if (disposed) return;
		disposed = true;
		for (const u of unsubFns) u();
		unsubFns = [];
		sharedChannels.delete(channelKey);
	}

	sharedChannels.set(channelKey, channel);
	return channel;
}

export async function createRoom(options: NewRoomOptions): Promise<string> {
	const { uid, db, auth } = await connect();
	const { get, ref, set, serverTimestamp } = await import('firebase/database');
	const random = options.random ?? Math.random;

	await pruneOwnRooms();

	let lastDenial: unknown = null;

	for (let attempt = 0; attempt < CODE_TRIES; attempt++) {
		const code = generateRoomCode(random);

		let taken: boolean;
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

		const hostTeam = options.team ?? 'west';
		const hostSeat = pickFirstAvailableSeat([], hostTeam, options.config);
		const initialRace = options.race ?? 'in_game';

		await set(ref(db, `rooms/${code}/members/${uid}`), {
			name: options.name,
			role: 'player',
			order: 1,
			slot: hostSeat.slot,
			...(options.country && options.country.length === 2 ? { country: options.country } : {}),
			...(options.avatar ? { avatar: options.avatar } : {}),
			team: hostSeat.team,
			race: initialRace,
			...(options.compact ? { compact: true } : {}),
			...(auth.currentUser?.isAnonymous === false ? { account: true } : {})
		});

		await rememberOwnRoom(code);

		return code;
	}

	throw new Error('room-code-exhausted', { cause: lastDenial });
}

export async function joinRoom(code: string, entry: RoomEntry): Promise<void> {
	const { uid, db, auth } = await connect();
	const { get, ref, set } = await import('firebase/database');

	const [membersSnap, configSnap] = await Promise.all([
		get(ref(db, `rooms/${code}/members`)),
		get(ref(db, `rooms/${code}/info/config`))
	]);
	const currentMembers = membersSnap.val() as Record<
		string,
		{
			role?: string;
			team?: string;
			slot?: number;
			order?: number;
			race?: string;
			colorId?: number;
			colorPickedAt?: number;
		}
	> | null;
	const roomConfig = (configSnap.val() as RoomConfig | null) ?? undefined;
	const existingSelf = currentMembers?.[uid];
	const allMembers = currentMembers ? Object.values(currentMembers) : [];
	const otherMembers = currentMembers
		? Object.entries(currentMembers)
				.filter(([memberUid]) => memberUid !== uid)
				.map(([, member]) => member)
		: [];
	const westCount = otherMembers.filter((m) => m.role !== 'spectator' && m.team === 'west').length;
	const eastCount = otherMembers.filter((m) => m.role !== 'spectator' && m.team === 'east').length;
	const preservedTeam =
		existingSelf?.team === 'east' || existingSelf?.team === 'west' ? existingSelf.team : undefined;
	const preferredTeam: 'west' | 'east' =
		entry.team ?? preservedTeam ?? (westCount <= eastCount ? 'west' : 'east');
	const order =
		typeof existingSelf?.order === 'number' ? existingSelf.order : allMembers.length + 1;
	const resolvedRace = entry.race ?? existingSelf?.race ?? 'in_game';
	const resolvedColorId = entry.colorId ?? existingSelf?.colorId;
	const resolvedColorPickedAt = existingSelf?.colorPickedAt;

	const isSpectatorJoin = entry.role === 'spectator';
	let team: 'west' | 'east' = preferredTeam;
	let slot: number | undefined;
	if (!isSpectatorJoin) {
		const selfSlotMatchesTeam =
			typeof existingSelf?.slot === 'number' &&
			(existingSelf.slot % 2 === 0 ? 'east' : 'west') === preferredTeam &&
			!otherMembers.some((m) => m.role !== 'spectator' && m.slot === existingSelf.slot);
		if (selfSlotMatchesTeam && typeof existingSelf?.slot === 'number') {
			slot = existingSelf.slot;
		} else if (typeof entry.slot === 'number') {
			slot = entry.slot;
			team = slot % 2 === 0 ? 'east' : 'west';
		} else if (roomConfig?.slots) {
			const seat = pickFirstAvailableSeat(otherMembers, preferredTeam, roomConfig);
			team = seat.team;
			slot = seat.slot;
		} else {
			slot = pickNextTeamSlot(otherMembers, preferredTeam, roomConfig);
		}
	}

	await set(ref(db, `rooms/${code}/members/${uid}`), {
		name: entry.name,
		role: entry.role,
		order,
		...(typeof slot === 'number' ? { slot, team } : {}),
		...(entry.country && entry.country.length === 2 ? { country: entry.country } : {}),
		...(entry.avatar ? { avatar: entry.avatar } : {}),
		...(!isSpectatorJoin ? { race: resolvedRace } : {}),
		...(!isSpectatorJoin && typeof resolvedColorId === 'number'
			? { colorId: resolvedColorId }
			: {}),
		...(!isSpectatorJoin && typeof resolvedColorPickedAt === 'number'
			? { colorPickedAt: resolvedColorPickedAt }
			: {}),
		...(entry.compact ? { compact: true } : {}),
		...(auth.currentUser?.isAnonymous === false ? { account: true } : {})
	});
}

export async function updateMe(code: string, patch: MemberPatch): Promise<void> {
	const { uid, db } = await connect();
	const { ref, update } = await import('firebase/database');
	await update(ref(db, `rooms/${code}/members/${uid}`), patch);
}

/**
 * Sets or clears the current player's requested color with a server timestamp for fair lottery
 * weighting, and resets any bot slot currently holding that same color back to random.
 */
export async function pickHumanColor(
	code: string,
	colorId: number | null,
	conflictingBotKeys: readonly RoomSlotKey[] = []
): Promise<void> {
	const { uid, db } = await connect();
	const { ref, serverTimestamp, update } = await import('firebase/database');
	const updates: Record<string, unknown> = {
		[`members/${uid}/colorId`]: colorId,
		[`members/${uid}/colorPickedAt`]: colorId !== null ? serverTimestamp() : null
	};
	if (colorId !== null) {
		for (const botKey of conflictingBotKeys) {
			updates[`info/config/slots/${botKey}/colorId`] = null;
		}
	}
	await update(ref(db, `rooms/${code}`), updates);
}

/**
 * Sets or clears a bot slot's lobby color (allowed for any player while room is in lobby).
 */
export async function setBotSlotColor(
	code: string,
	slotKey: RoomSlotKey,
	colorId: number | null
): Promise<void> {
	const { db } = await connect();
	const { ref, set } = await import('firebase/database');
	await set(ref(db, `rooms/${code}/info/config/slots/${slotKey}/colorId`), colorId);
}

export async function updateMemberSlot(
	code: string,
	targetUid: string,
	team: 'west' | 'east',
	slot: number
): Promise<void> {
	const { db } = await connect();
	const { ref, update } = await import('firebase/database');
	await update(ref(db, `rooms/${code}/members/${targetUid}`), { team, slot });
}

export async function kickMember(code: string, targetUid: string): Promise<void> {
	const { db } = await connect();
	const { ref, remove } = await import('firebase/database');
	await remove(ref(db, `rooms/${code}/members/${targetUid}`));
}

/**
 * Sends an atomic, RTDB-rate-limited room chat message (simultaneously updates members/$uid/lastChatAt).
 */
export async function sendChatMessage(
	code: string,
	senderName: string,
	text: string,
	options: {
		avatar?: string;
		kind?: 'text' | 'emote' | 'system';
		emote?: string;
		channel?: 'all' | 'spectator';
	} = {}
): Promise<boolean> {
	const cleanText = text.trim().slice(0, 200);
	if (!cleanText) return false;

	const { uid, db } = await connect();
	const { push, ref, serverTimestamp, update } = await import('firebase/database');
	const msgKey = push(ref(db, `rooms/${code}/chat`)).key;
	if (!msgKey) return false;

	const stamp = serverTimestamp();
	try {
		await update(ref(db, `rooms/${code}`), {
			[`chat/${msgKey}`]: {
				senderUid: uid,
				senderName: senderName.slice(0, 48),
				...(options.avatar ? { senderAvatar: options.avatar } : {}),
				...(options.kind ? { kind: options.kind } : {}),
				...(options.channel ? { channel: options.channel } : {}),
				...(options.emote ? { emote: options.emote.slice(0, 16) } : {}),
				text: cleanText,
				at: stamp
			},
			[`members/${uid}/lastChatAt`]: stamp
		});
		return true;
	} catch (error) {
		if (!isDenied(error)) throw error;
		return false;
	}
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
	await remove(ref(db, `lobby/${GAME_ID}/${code}`)).catch(() => {});
	await remove(ref(db, `rooms/${code}`));
	await forgetOwnRoom(code);
}

export async function roomTransport(code: string): Promise<RoomTransport> {
	const { uid, db } = await connect();
	await serverTime();
	const channel = await acquireSharedChannel(code);
	const { get, ref, serverTimestamp, update } = await import('firebase/database');
	let outboundWriteChain: Promise<void> = Promise.resolve();
	let lastOutboundAttemptAt = 0;

	const enqueueOutboundWrite = <T>(fn: () => Promise<T>): Promise<T> => {
		const run = outboundWriteChain.then(async () => {
			const elapsed = Date.now() - lastOutboundAttemptAt;
			if (elapsed < MIN_OUTBOUND_MOVE_SPACING_MS) {
				await new Promise<void>((resolve) =>
					setTimeout(resolve, MIN_OUTBOUND_MOVE_SPACING_MS - elapsed)
				);
			}
			try {
				return await fn();
			} finally {
				lastOutboundAttemptAt = Date.now();
			}
		});
		outboundWriteChain = run.then(
			() => undefined,
			() => undefined
		);
		return run;
	};

	return {
		code,
		now: serverNow,

		watch(onSnapshot, onGone) {
			return channel.subscribe({ onSnapshot, onGone });
		},

		async fetchMoves() {
			const snap = await get(ref(db, `rooms/${code}/moves`));
			return channel.mergeServerMoves((snap.val() as Record<string, Move> | null) ?? null);
		},

		async append(move: Move) {
			return enqueueOutboundWrite(() =>
				writeMoveWithRetry({
					initialSeq: move.seq,
					getHighestSeq: () => channel.highestSeq,
					attemptWrite: async (seq) => {
						channel.inFlightSeqs.add(seq);
						try {
							const stamp = serverTimestamp();
							await update(ref(db, `rooms/${code}`), {
								[`moves/${moveKey(seq)}`]: {
									...move,
									by: uid,
									seq,
									at: stamp
								},
								[`members/${uid}/lastMoveAt`]: stamp
							});
							if (seq > channel.highestSeq) {
								channel.highestSeq = seq;
							}
							channel.confirmSeq(seq);
						} catch (error) {
							channel.rejectSeq(seq);
							throw error;
						}
					},
					doesSeqExist: async (seq) => {
						const snap = await get(ref(db, `rooms/${code}/moves/${moveKey(seq)}`));
						return snap.exists();
					}
				})
			);
		},

		async setStatus(status: RoomStatus, roster?: RosterEntry[], config?: RoomConfig) {
			if (status === 'playing') {
				await update(ref(db, `rooms/${code}`), {
					'info/status': status,
					'info/startedAt': serverTimestamp(),
					'info/countdownAt': null,
					...(roster && roster.length > 0 ? { 'info/roster': rosterToRecord(roster) } : {}),
					...(config ? { 'info/config': config } : {}),
					moves: null
				});
				channel.highestSeq = 0;
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
		},

		async takeLead(move: Move) {
			return writeMoveWithRetry({
				initialSeq: move.seq,
				getHighestSeq: () => channel.highestSeq,
				attemptWrite: async (seq) => {
					const key = moveKey(seq);
					channel.inFlightSeqs.add(seq);
					try {
						const stamp = serverTimestamp();
						await update(ref(db, `rooms/${code}`), {
							'info/hostUid': uid,
							'info/leadSeq': key,
							[`moves/${key}`]: {
								...move,
								type: 'lead',
								by: uid,
								seq,
								at: stamp
							},
							[`members/${uid}/lastMoveAt`]: stamp
						});
						if (seq > channel.highestSeq) {
							channel.highestSeq = seq;
						}
						channel.confirmSeq(seq);
					} catch (error) {
						channel.rejectSeq(seq);
						throw error;
					}
				},
				doesSeqExist: async (seq) => {
					const snap = await get(ref(db, `rooms/${code}/moves/${moveKey(seq)}`));
					return snap.exists();
				}
			});
		}
	};
}
