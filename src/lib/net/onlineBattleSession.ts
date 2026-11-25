import type { Simulation } from '$lib/engine/simulation';
import { logService } from '$lib/services/logService.svelte';
import type { MatchSync } from './matchSync';
import { createOnlineSimulation } from './onlineMatchSetup';
import type { Member, Move, RoomInfo } from './roomTypes';

export interface OnlineBattleSessionCallbacks {
	sim: Simulation;
	onSimInitialized: (
		nextSim: Simulation,
		info: {
			localSlot: number;
			localTeam: 'west' | 'east';
			cameraX: number;
			cameraY: number;
			isSpectator: boolean;
		}
	) => void;
	onHostChange: (isHost: boolean) => void;
	onPeerStatusChange: (status: { peerOnline: boolean; notice?: string | null }) => void;
	onPeerPing: (rtt: number) => void;
	onDesync: (tick: number) => void;
	onGone: (reason: string) => void;
	onCommandApplied: (move: Move) => void;
	onMatchStarted: (nextSim: Simulation, localSlot: number, isSpectator: boolean) => void;
	onErrorNotice: (message: string) => void;
}

export interface OnlineBattleSession {
	readonly matchSync: MatchSync;
	readonly localTeam: 'west' | 'east';
	readonly localSlot: number;
	readonly isSpectator: boolean;
	getTargetTick: () => number | null;
	getCountdownRemainingSec: () => number | null;
	dispose: () => void;
}

/**
 * Picks the deterministic next-in-line online player (lowest join `order`)
 * eligible to claim room lead if the current host disconnects.
 */
export function selectAutoHandoverUid(
	members: readonly Member[],
	onlineUids: readonly string[],
	hostUid: string
): string | null {
	if (!hostUid || onlineUids.includes(hostUid)) return null;
	const onlineSet = new Set(onlineUids);
	const candidate = members
		.filter((m) => m.role === 'player' && onlineSet.has(m.uid))
		.sort((a, b) => a.order - b.order)[0];
	return candidate?.uid ?? null;
}

/**
 * Starts and manages an online RTDB + MatchSync battle session cleanly outside UI components.
 */
export async function startOnlineBattleSession(
	roomCode: string,
	isHostHint: boolean,
	callbacks: OnlineBattleSessionCallbacks
): Promise<OnlineBattleSession | null> {
	let stopPresenceTrack: (() => void) | null = null;
	let stopPresenceWatch: (() => void) | null = null;
	let stopRoomWatch: (() => void) | null = null;
	let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
	let sync: MatchSync | null = null;

	try {
		const { liveNet } = await import('$lib/net/roomNet');
		const { MatchSync: MS } = await import('$lib/net/matchSync');
		const uid = await liveNet.me();

		// Wait briefly for OnlineRoomHUD to finish joinRoom before reading moves under RTDB membership rules
		let roomInfo = await liveNet.peekRoom(roomCode);
		let members = (await liveNet.peekMembers(roomCode)) ?? [];
		for (let waitTry = 0; waitTry < 15 && !members.some((m) => m.uid === uid); waitTry++) {
			await new Promise((resolveWait) => setTimeout(resolveWait, 100));
			members = (await liveNet.peekMembers(roomCode)) ?? [];
			if (!roomInfo) {
				roomInfo = await liveNet.peekRoom(roomCode);
			}
		}

		let activeSim = callbacks.sim;
		const onlineInit = roomInfo ? createOnlineSimulation(roomInfo, members, uid) : null;
		const localTeam = onlineInit?.localTeam ?? (isHostHint ? 'west' : 'east');
		const localSlot = onlineInit?.localSlot ?? (localTeam === 'east' ? 2 : 1);
		let isSpectator = !members.some((m) => m.uid === uid && m.role === 'player');

		if (onlineInit) {
			activeSim = onlineInit.sim;
			callbacks.onSimInitialized(activeSim, {
				localSlot,
				localTeam,
				cameraX: isSpectator ? 3600 : localTeam === 'east' ? 5600 : 1600,
				cameraY: 1200,
				isSpectator
			});
		}

		const transport = await liveNet.roomTransport(roomCode);
		let onlineStarted = Boolean(roomInfo?.status === 'playing');
		let latestRoomInfo: RoomInfo | null = roomInfo;
		let latestMembers: Member[] = members;
		let memberPeerOnline = false;
		let presencePeerOnline = false;
		let handoverInFlight = false;
		let currentDesyncNotice: string | null = null;
		const initialAwaitingPick = activeSim.allPlayers.some((p) => !p.isBot && p.pendingRacePick);
		let countdownAnchorServerMs: number | null =
			roomInfo?.status === 'playing' && initialAwaitingPick
				? (roomInfo.startedAt ?? Date.now())
				: null;
		let epochAnchorServerMs: number | null =
			roomInfo?.status === 'playing' &&
			!initialAwaitingPick &&
			typeof roomInfo?.startedAt === 'number'
				? roomInfo.startedAt
				: null;

		const publishPeerOnline = () => {
			const peerOnline = presencePeerOnline || memberPeerOnline;
			if (peerOnline) {
				callbacks.onPeerStatusChange({ peerOnline: true, notice: currentDesyncNotice });
			} else if (onlineStarted && !currentDesyncNotice) {
				callbacks.onPeerStatusChange({
					peerOnline: false,
					notice: 'Суперник тимчасово офлайн'
				});
			} else {
				callbacks.onPeerStatusChange({ peerOnline: false });
			}
		};

		// Subscribe BEFORE MatchSync so 'playing' simulation re-initialization always runs
		// prior to MatchSync processing any initial match moves/RESUME in the same snapshot.
		stopRoomWatch = transport.watch((snap) => {
			latestRoomInfo = snap.info;
			latestMembers = snap.members;
			callbacks.onHostChange(snap.info.hostUid === uid);
			if (snap.info.status === 'playing' && !onlineStarted) {
				onlineStarted = true;
				isSpectator = !snap.members.some((m) => m.uid === uid && m.role === 'player');
				const fresh = createOnlineSimulation(snap.info, snap.members, uid);
				activeSim = fresh.sim;
				const awaitingPick = activeSim.allPlayers.some((p) => !p.isBot && p.pendingRacePick);
				const startedMs =
					typeof snap.info.startedAt === 'number' ? snap.info.startedAt : transport.now();
				if (awaitingPick) {
					countdownAnchorServerMs = startedMs;
					epochAnchorServerMs = null;
				} else {
					countdownAnchorServerMs = null;
					epochAnchorServerMs = startedMs;
				}
				sync?.setRosterSlots(fresh.uidToSlot);
				sync?.setSimulation(activeSim);
				callbacks.onMatchStarted(activeSim, fresh.localSlot, isSpectator);
			}
		});

		callbacks.onHostChange(Boolean(roomInfo?.hostUid === uid));
		sync = new MS({
			sim: activeSim,
			transport,
			localUid: uid,
			localTeam,
			localSlot,
			uidToSlot: onlineInit?.uidToSlot,
			commandLeadTicks: 10,
			onPeerStatusChange: (status) => {
				memberPeerOnline = status.online;
				publishPeerOnline();
			},
			onPeerPing: ({ rtt }) => {
				callbacks.onPeerPing(rtt);
			},
			onDesync: ({ tick }) => {
				currentDesyncNotice = `Увага: розсинхронізація на тіку ${tick}`;
				logService.warn('network', 'Simulation checksum mismatch', { tick });
				callbacks.onDesync(tick);
			},
			onGone: (reason) => {
				if (heartbeatTimer) {
					clearInterval(heartbeatTimer);
					heartbeatTimer = null;
				}
				callbacks.onGone(reason);
			},
			onCommandApplied: (move) => {
				if (
					(move.type === 'RESUME' && epochAnchorServerMs === null) ||
					move.type === 'NEXT_ROUND' ||
					move.type === 'RESTART_MATCH'
				) {
					epochAnchorServerMs = typeof move.at === 'number' ? move.at : transport.now();
					countdownAnchorServerMs = null;
				}
				callbacks.onCommandApplied(move);
			}
		});

		stopPresenceTrack = await liveNet.trackPresence(roomCode);
		stopPresenceWatch = await liveNet.watchPresence(roomCode, (onlineUids) => {
			presencePeerOnline = onlineUids.some((id) => id !== uid);
			publishPeerOnline();

			if (
				latestRoomInfo &&
				onlineUids.includes(uid) &&
				!handoverInFlight &&
				transport.takeLead &&
				selectAutoHandoverUid(latestMembers, onlineUids, latestRoomInfo.hostUid) === uid
			) {
				handoverInFlight = true;
				void transport
					.takeLead({
						seq: (sync?.getAppliedSeq() ?? 0) + 1,
						by: uid,
						type: 'lead',
						payload: { from: latestRoomInfo.hostUid }
					})
					.catch(() => false)
					.finally(() => {
						handoverInFlight = false;
					});
			}
		});

		heartbeatTimer = setInterval(() => {
			if (sync && activeSim.isRunning) {
				void sync.sendHeartbeat();
			}
		}, 12_000);

		const createdSync = sync;
		return {
			matchSync: createdSync,
			localTeam,
			localSlot,
			get isSpectator() {
				return isSpectator;
			},
			getTargetTick() {
				if (!onlineStarted || epochAnchorServerMs === null) return null;
				const elapsedMs = Math.max(0, transport.now() - epochAnchorServerMs);
				return Math.floor((elapsedMs / 1000) * 60);
			},
			getCountdownRemainingSec() {
				if (countdownAnchorServerMs === null || epochAnchorServerMs !== null) return null;
				const elapsedSec = Math.floor(
					Math.max(0, transport.now() - countdownAnchorServerMs) / 1000
				);
				return Math.max(0, 15 - elapsedSec);
			},
			dispose() {
				stopPresenceTrack?.();
				stopPresenceTrack = null;
				stopPresenceWatch?.();
				stopPresenceWatch = null;
				stopRoomWatch?.();
				stopRoomWatch = null;
				if (heartbeatTimer) {
					clearInterval(heartbeatTimer);
					heartbeatTimer = null;
				}
				createdSync.dispose();
			}
		};
	} catch (err) {
		stopPresenceTrack?.();
		stopPresenceWatch?.();
		stopRoomWatch?.();
		if (heartbeatTimer) clearInterval(heartbeatTimer);
		sync?.dispose();

		logService.warn('network', 'Failed to connect room match sync', { err: String(err) });
		try {
			const { probeNetProblem } = await import('$lib/utils/netProblem');
			const problem = await probeNetProblem(err);
			callbacks.onErrorNotice(problem.title);
		} catch {
			callbacks.onErrorNotice('Помилка мережевого з’єднання');
		}
		return null;
	}
}
