import type { Simulation } from '$lib/engine/simulation';
import type { PlayerState } from '$lib/engine/types';
import type { Move, MovePayload, RoomTransport } from './roomTypes';
import { validatePlayerMove } from './actionValidation';

export interface MatchSyncOptions {
	sim: Simulation;
	transport: RoomTransport;
	localUid: string;
	localTeam: 'west' | 'east';
	localSlot?: number;
	uidToSlot?: Record<string, number>;
	commandLeadTicks?: number;
	getTargetTick?: () => number | null;
	createResyncSimulation?: () => Simulation | null;
	onSimResynced?: (sim: Simulation) => void;
	onCommandApplied?: (move: Move) => void;
	onGone?: (reason: string) => void;
	onPeerStatusChange?: (status: { peerUid: string; online: boolean }) => void;
	onPeerPing?: (ping: { peerUid: string; rtt: number }) => void;
	onDesync?: (info: { tick: number; localChecksum: string; remoteChecksum: string }) => void;
}

const MAX_CHECKPOINT_HISTORY = 40;
const MAX_CATCHUP_TICKS = 216_000;
const FIXED_STEP = 1 / 60;
const DESYNC_RESYNC_COOLDOWN_TICKS = 300;
const TELEMETRY_SEQ_SOFT_LIMIT = 9000;

const IMMEDIATE_MOVE_TYPES = new Set([
	'HEARTBEAT',
	'CHECKSUM',
	'CHAT',
	'lead',
	'RESUME',
	'NEXT_ROUND',
	'RESTART_MATCH'
]);

const TELEMETRY_MOVE_TYPES = new Set(['HEARTBEAT', 'CHECKSUM', 'CHAT', 'lead']);

export function computeSimStateSignature(sim: Simulation): { checksum: string; raw: string } {
	const westHp = Math.round((sim.castles?.west?.hp ?? 0) * 10);
	const eastHp = Math.round((sim.castles?.east?.hp ?? 0) * 10);
	const playerSignatures = (
		sim.allPlayers?.length ? sim.allPlayers : [sim.players?.west, sim.players?.east]
	)
		.filter((p): p is PlayerState => Boolean(p))
		.map(
			(p) =>
				`${p.slot ?? 0}:${Math.floor(p.gold)}:${Math.floor(p.lumber ?? 0)}:${p.commander}:${p.race}`
		)
		.join('|');
	const buildingsCount = sim.buildings?.length ?? 0;
	const buildingsHp = (sim.buildings ?? []).reduce((sum, b) => sum + Math.round(b.hp), 0);
	const unitsCount = sim.units?.length ?? 0;
	const unitsHp = (sim.units ?? []).reduce((sum, u) => sum + Math.round(u.hp), 0);
	const unitsPos = (sim.units ?? []).reduce(
		(sum, u) => (sum + Math.round(u.x) * 31 + Math.round(u.y) * 17) | 0,
		0
	);
	const rngState = typeof sim.getRngState === 'function' ? sim.getRngState() : 0;

	const cannonSig = `${sim.castleCannonUpgraded?.west ? 1 : 0}${sim.castleCannonUpgraded?.east ? 1 : 0}`;

	const raw = `${sim.tick}:t${Math.round(sim.gameTime * 10)}:r${sim.round}:${sim.score.west}-${sim.score.east}:${sim.brokenBridge ?? 'none'}:${westHp},${eastHp}:${cannonSig}:${playerSignatures}:b${buildingsCount}/${buildingsHp}:u${unitsCount}/${unitsHp}/${unitsPos}:g${rngState}`;
	let hash = 5381;
	for (let i = 0; i < raw.length; i++) {
		hash = ((hash << 5) + hash + raw.charCodeAt(i)) & 0xffffffff;
	}
	return { checksum: (hash >>> 0).toString(16), raw };
}

export function computeSimStateChecksum(sim: Simulation): string {
	return computeSimStateSignature(sim).checksum;
}

/**
 * Deterministic RTS match synchronizer.
 * Ingests local player commands, serializes them as monotonic Move records over RoomTransport,
 * executes remote and local commands deterministically at scheduled simulation ticks,
 * and validates lockstep parity on matching simulation ticks.
 */
export class MatchSync {
	public sim: Simulation;
	public transport: RoomTransport;
	public localUid: string;
	public localTeam: 'west' | 'east';
	public localSlot: number;

	private commandLeadTicks: number;
	private getTargetTick?: () => number | null;
	private createResyncSimulation?: () => Simulation | null;
	private onSimResynced?: (sim: Simulation) => void;
	private uidToSlot = new Map<string, number>();
	private hydrated = false;
	private resyncInProgress = false;
	private nextSeq = 1;
	private appliedSeq = 0;
	private processedSeqs = new Set<number>();
	private unwatch: (() => void) | null = null;
	private onCommandApplied?: (move: Move) => void;
	private onPeerStatusChange?: (status: { peerUid: string; online: boolean }) => void;
	private onPeerPing?: (ping: { peerUid: string; rtt: number }) => void;
	private onDesync?: (info: {
		tick: number;
		localChecksum: string;
		remoteChecksum: string;
	}) => void;
	private peerSeen = new Map<string, number>();
	private peerRtt = new Map<string, number>();
	private checksumHistory = new Map<number, string>();
	private rawHistory = new Map<number, string>();
	private pendingRemoteChecksums = new Map<number, { peerUid: string; checksum: string }[]>();
	private pendingMoves: Move[] = [];
	private appliedHistory: Move[] = [];
	private syncLog: string[] = [];
	private lastDispatchMs = 0;
	private lastDesyncResyncTick = -1;

	constructor(options: MatchSyncOptions) {
		this.sim = options.sim;
		this.transport = options.transport;
		this.localUid = options.localUid;
		this.localTeam = options.localTeam;
		this.localSlot = options.localSlot ?? (options.localTeam === 'east' ? 2 : 1);
		this.commandLeadTicks = Math.max(0, Math.floor(options.commandLeadTicks ?? 0));
		this.getTargetTick = options.getTargetTick;
		this.createResyncSimulation = options.createResyncSimulation;
		this.onSimResynced = options.onSimResynced;
		if (options.uidToSlot) {
			this.setRosterSlots(options.uidToSlot);
		}
		this.onCommandApplied = options.onCommandApplied;
		this.onPeerStatusChange = options.onPeerStatusChange;
		this.onPeerPing = options.onPeerPing;
		this.onDesync = options.onDesync;

		this.unwatch = this.transport.watch(
			(snapshot) => {
				if (snapshot.moves.length === 0 && (this.appliedSeq > 0 || this.processedSeqs.size > 0)) {
					this.appliedSeq = 0;
					this.nextSeq = 1;
					this.processedSeqs.clear();
					this.pendingMoves = [];
					this.appliedHistory = [];
					this.checksumHistory.clear();
					this.pendingRemoteChecksums.clear();
					this.lastDesyncResyncTick = -1;
				}
				this.processMoves(snapshot.moves);
				this.checkMembers(snapshot.members);
			},
			(reason) => {
				options.onGone?.(reason);
			}
		);
	}

	private logSyncEvent(event: string, data?: Record<string, unknown>) {
		const entry = data
			? `[t=${this.sim.tick}] ${event} ${JSON.stringify(data)}`
			: `[t=${this.sim.tick}] ${event}`;
		this.syncLog.push(entry);
		if (this.syncLog.length > 250) {
			this.syncLog.shift();
		}
	}

	getForensicLog(): string {
		const sig = computeSimStateSignature(this.sim);
		const historyLines = this.appliedHistory.slice(-60).map((m) =>
			JSON.stringify({
				seq: m.seq,
				by: m.by.slice(0, 8),
				type: m.type,
				at: m.at ?? null,
				tick: m.payload?.tick ?? null,
				slot: m.payload?.playerSlot ?? null,
				team: m.payload?.team ?? null,
				race: m.payload?.race ?? null,
				bld: m.payload?.buildingType ?? null,
				x: m.payload?.x ?? null,
				y: m.payload?.y ?? null
			})
		);
		return [
			`localUid=${this.localUid} team=${this.localTeam} slot=${this.localSlot} running=${this.sim.isRunning}`,
			`uidToSlot=${JSON.stringify(Object.fromEntries(this.uidToSlot))}`,
			`currentSig=${sig.checksum} raw=${sig.raw}`,
			`--- SYNC EVENTS (${this.syncLog.length}) ---`,
			...this.syncLog,
			`--- APPLIED HISTORY (last ${historyLines.length}/${this.appliedHistory.length}) ---`,
			...historyLines
		].join('\n');
	}

	setSimulation(sim: Simulation) {
		this.sim = sim;
		this.hydrated = false;
		this.appliedSeq = 0;
		this.processedSeqs.clear();
		this.pendingMoves = [];
		this.appliedHistory = [];
		this.checksumHistory.clear();
		this.rawHistory.clear();
		this.pendingRemoteChecksums.clear();
		this.lastDesyncResyncTick = -1;
		this.logSyncEvent('SET_SIM', { raw: computeSimStateSignature(sim).raw });
	}

	setRosterSlots(mapping: Record<string, number>) {
		this.uidToSlot.clear();
		for (const [uid, slot] of Object.entries(mapping)) {
			if (Number.isInteger(slot) && slot >= 1 && slot <= 14) {
				this.uidToSlot.set(uid, slot);
			}
		}
	}

	setLocalIdentity(localTeam: 'west' | 'east', localSlot: number) {
		this.localTeam = localTeam;
		this.localSlot = localSlot;
	}

	getPeerLatency(peerUid: string): number | undefined {
		return this.peerRtt.get(peerUid);
	}

	getAppliedSeq(): number {
		return this.appliedSeq;
	}

	getPendingMoveCount(): number {
		return this.pendingMoves.length;
	}

	getSimChecksum(): string {
		return computeSimStateChecksum(this.sim);
	}

	/**
	 * Executes any buffered tick-scheduled commands whose target tick has been reached.
	 * Should be invoked right before `sim.step(...)` in the fixed-step simulation loop.
	 */
	flushTick(tick: number = this.sim.tick, emitCallbacks = true): number {
		if (this.pendingMoves.length === 0) return 0;
		const ready: Move[] = [];
		const remaining: Move[] = [];
		for (const move of this.pendingMoves) {
			const targetTick = move.payload?.tick ?? 0;
			if (targetTick <= tick) {
				ready.push(move);
			} else {
				remaining.push(move);
			}
		}
		if (ready.length === 0) return 0;
		this.pendingMoves = remaining;
		ready.sort((a, b) => (a.payload?.tick ?? 0) - (b.payload?.tick ?? 0) || a.seq - b.seq);
		for (const move of ready) {
			this.applyMoveToSimulation(move);
			if (emitCallbacks) {
				this.onCommandApplied?.(move);
			}
		}
		return ready.length;
	}

	/**
	 * Records the simulation checksum for the current tick and verifies any buffered
	 * remote checksums waiting for this exact tick.
	 */
	recordCheckpointChecksum(): string {
		const tick = this.sim.tick;
		const { checksum: sum, raw } = computeSimStateSignature(this.sim);
		this.checksumHistory.set(tick, sum);
		this.rawHistory.set(tick, raw);
		if (this.checksumHistory.size > MAX_CHECKPOINT_HISTORY) {
			const oldestKey = this.checksumHistory.keys().next().value;
			if (oldestKey !== undefined) {
				this.checksumHistory.delete(oldestKey);
				this.rawHistory.delete(oldestKey);
			}
		}

		const waiting = this.pendingRemoteChecksums.get(tick);
		if (waiting) {
			this.pendingRemoteChecksums.delete(tick);
			for (const entry of waiting) {
				if (entry.checksum !== sum) {
					this.handleChecksumMismatch(tick, sum, entry.checksum);
				}
			}
		}
		return sum;
	}

	async sendHeartbeat(): Promise<boolean> {
		if (this.nextSeq > TELEMETRY_SEQ_SOFT_LIMIT) return false;
		if (Date.now() - this.lastDispatchMs < 150) return false;
		return this.dispatch('HEARTBEAT', {
			clientTime: Math.floor(this.transport.now()),
			tick: this.sim.tick
		});
	}

	async broadcastChecksum(): Promise<boolean> {
		const checksum = this.recordCheckpointChecksum();
		if (this.nextSeq > TELEMETRY_SEQ_SOFT_LIMIT) return false;
		return this.dispatch('CHECKSUM', {
			checksum,
			tick: this.sim.tick
		});
	}

	private checkMembers(members: readonly { uid: string; slot?: number }[]) {
		const presentUids = new Set(members.map((m) => m.uid));
		if (this.onPeerStatusChange) {
			for (const prevUid of [...this.peerSeen.keys()]) {
				if (!presentUids.has(prevUid)) {
					this.peerSeen.delete(prevUid);
					this.onPeerStatusChange({ peerUid: prevUid, online: false });
				}
			}
		}
		for (const m of members) {
			if (this.uidToSlot.size === 0 && typeof m.slot === 'number') {
				this.uidToSlot.set(m.uid, m.slot);
			}
			if (this.onPeerStatusChange && m.uid !== this.localUid) {
				this.peerSeen.set(m.uid, Date.now());
				this.onPeerStatusChange({ peerUid: m.uid, online: true });
			}
		}
	}

	/**
	 * Dispatches a player command to the room transport.
	 */
	async dispatch(type: string, payload: Partial<MovePayload> = {}): Promise<boolean> {
		this.lastDispatchMs = Date.now();
		const seq = this.nextSeq++;
		const clockTick = this.getTargetTick?.();
		const baseTick = this.sim.isRunning
			? Math.max(this.sim.tick, typeof clockTick === 'number' ? clockTick : 0)
			: this.sim.tick;
		const scheduledTick = IMMEDIATE_MOVE_TYPES.has(type)
			? this.sim.tick
			: baseTick + (this.sim.isRunning ? this.commandLeadTicks : 0);
		const move: Move = {
			seq,
			by: this.localUid,
			type,
			payload: {
				tick: scheduledTick,
				team: this.localTeam,
				playerSlot: this.localSlot,
				...payload
			}
		};

		const success = await this.transport.append(move);
		if (!success) {
			if (this.nextSeq === seq + 1) {
				this.nextSeq = seq;
			}
		}
		return success;
	}

	private processMoves(moves: Move[]) {
		const sorted = [...moves].sort((a, b) => a.seq - b.seq);
		const isInitialHydration = !this.hydrated;
		this.hydrated = true;

		if (isInitialHydration && sorted.length > 0 && this.sim.tick === 0) {
			this.replayHistoricalBatch(sorted);
			return;
		}

		let needsLateResync = false;
		const resyncTargetTick = this.sim.tick;

		for (const rawMove of sorted) {
			if (this.processedSeqs.has(rawMove.seq)) continue;

			const validation = validatePlayerMove(rawMove);
			if (!validation.valid || !validation.sanitized) {
				this.processedSeqs.add(rawMove.seq);
				continue;
			}
			const move = validation.sanitized;

			this.processedSeqs.add(move.seq);
			const isOutOfOrderSeq = move.seq < this.appliedSeq;
			this.appliedSeq = Math.max(this.appliedSeq, move.seq);
			this.nextSeq = Math.max(this.nextSeq, this.appliedSeq + 1);

			if (!TELEMETRY_MOVE_TYPES.has(move.type)) {
				this.appliedHistory.push(move);
				if (isOutOfOrderSeq) {
					this.appliedHistory.sort((a, b) => a.seq - b.seq);
				}
			}

			const targetTick = move.payload?.tick;
			if (
				!IMMEDIATE_MOVE_TYPES.has(move.type) &&
				typeof targetTick === 'number' &&
				this.sim.isRunning
			) {
				if (targetTick > this.sim.tick) {
					this.pendingMoves.push(move);
					continue;
				}
				if (
					(targetTick < this.sim.tick || isOutOfOrderSeq) &&
					this.createResyncSimulation &&
					!this.resyncInProgress
				) {
					needsLateResync = true;
					this.onCommandApplied?.(move);
					continue;
				}
			}

			this.applyMoveToSimulation(move);
			this.onCommandApplied?.(move);
		}

		if (needsLateResync) {
			this.logSyncEvent('LATE_RESYNC', { targetTick: resyncTargetTick });
			this.resyncSimulationToTick(resyncTargetTick);
		}
	}

	private replayHistoricalBatch(sorted: Move[]) {
		this.logSyncEvent('HYDRATE_BATCH_START', { count: sorted.length });
		const validMoves: Move[] = [];
		for (const rawMove of sorted) {
			if (this.processedSeqs.has(rawMove.seq)) continue;
			const validation = validatePlayerMove(rawMove);
			if (!validation.valid || !validation.sanitized) {
				this.processedSeqs.add(rawMove.seq);
				continue;
			}
			const move = validation.sanitized;
			this.processedSeqs.add(move.seq);
			this.appliedSeq = Math.max(this.appliedSeq, move.seq);
			this.nextSeq = Math.max(this.nextSeq, this.appliedSeq + 1);
			if (!TELEMETRY_MOVE_TYPES.has(move.type)) {
				this.appliedHistory.push(move);
			}
			validMoves.push(move);
		}
		if (validMoves.length === 0) return;

		this.replayMovesThroughCurrentSim(validMoves, 0, true);
	}

	private handleChecksumMismatch(tick: number, localChecksum: string, remoteChecksum: string) {
		const rawAtTick = this.rawHistory.get(tick) ?? computeSimStateSignature(this.sim).raw;
		this.logSyncEvent('CHECKSUM_MISMATCH', {
			mismatchTick: tick,
			localChecksum,
			remoteChecksum,
			rawAtTick
		});
		const canAttemptRecovery =
			Boolean(this.createResyncSimulation) &&
			!this.resyncInProgress &&
			(this.lastDesyncResyncTick < 0 ||
				this.sim.tick - this.lastDesyncResyncTick >= DESYNC_RESYNC_COOLDOWN_TICKS);

		if (!canAttemptRecovery) {
			this.onDesync?.({ tick, localChecksum, remoteChecksum });
			return;
		}

		const targetTick = this.sim.tick;
		this.lastDesyncResyncTick = targetTick;
		let verifiedChecksumAtTick: string | null = null;
		let verifiedRawAtTick: string | null = null;

		const resynced = this.resyncSimulationToTick(targetTick, {
			tick,
			onTickReached: (checksum) => {
				verifiedChecksumAtTick = checksum;
				verifiedRawAtTick = computeSimStateSignature(this.sim).raw;
			}
		});

		if (!resynced) {
			this.onDesync?.({ tick, localChecksum, remoteChecksum });
			return;
		}

		const postResyncChecksum = verifiedChecksumAtTick ?? this.getSimChecksum();
		this.logSyncEvent('CHECKSUM_POST_RESYNC', {
			mismatchTick: tick,
			verifiedChecksum: postResyncChecksum,
			remoteChecksum,
			verifiedRawAtTick
		});
		if (verifiedChecksumAtTick !== null && verifiedChecksumAtTick !== remoteChecksum) {
			this.onDesync?.({
				tick,
				localChecksum: postResyncChecksum,
				remoteChecksum
			});
		}
	}

	private resyncSimulationToTick(
		targetTick: number,
		verifyCheckpoint?: { tick: number; onTickReached: (checksum: string) => void }
	): boolean {
		if (this.resyncInProgress || !this.createResyncSimulation) return false;
		const freshSim = this.createResyncSimulation();
		if (!freshSim) return false;

		this.resyncInProgress = true;
		try {
			this.sim = freshSim;
			this.pendingMoves = [];
			this.checksumHistory.clear();
			this.rawHistory.clear();
			this.pendingRemoteChecksums.clear();
			this.replayMovesThroughCurrentSim(this.appliedHistory, targetTick, false, verifyCheckpoint);
			this.logSyncEvent('RESYNC_DONE', {
				targetTick,
				raw: computeSimStateSignature(this.sim).raw
			});
			this.onSimResynced?.(this.sim);
			return true;
		} finally {
			this.resyncInProgress = false;
		}
	}

	private replayMovesThroughCurrentSim(
		moves: Move[],
		minFinalTargetTick: number,
		emitCallbacks: boolean,
		verifyCheckpoint?: { tick: number; onTickReached: (checksum: string) => void }
	) {
		// Split history cleanly on round/match boundaries so each epoch steps from tick 0
		const segments: { moves: Move[]; resetMove: Move | null; targetTick: number }[] = [];
		let currentMoves: Move[] = [];
		let maxTick = 0;

		for (const move of moves) {
			const tick = typeof move.payload?.tick === 'number' ? move.payload.tick : 0;
			if (tick > maxTick) {
				maxTick = tick;
			}

			if (move.type === 'NEXT_ROUND' || move.type === 'RESTART_MATCH') {
				segments.push({ moves: currentMoves, resetMove: move, targetTick: maxTick });
				currentMoves = [];
				maxTick = 0;
				continue;
			}
			currentMoves.push(move);
		}
		segments.push({ moves: currentMoves, resetMove: null, targetTick: maxTick });

		for (let segIdx = 0; segIdx < segments.length; segIdx++) {
			const seg = segments[segIdx];
			const isLastSeg = segIdx === segments.length - 1;
			const desiredTarget =
				isLastSeg && minFinalTargetTick > 0 ? minFinalTargetTick : seg.targetTick;
			const clampedTarget = Math.min(desiredTarget, MAX_CATCHUP_TICKS);
			const checksums: Move[] = [];
			for (const move of seg.moves) {
				if (move.type === 'CHECKSUM') {
					checksums.push(move);
				} else if (!TELEMETRY_MOVE_TYPES.has(move.type)) {
					this.pendingMoves.push(move);
				}
			}

			// Flush initial tick-0 commands (e.g. RESUME) before checking `this.sim.isRunning`
			this.flushTick(this.sim.tick, emitCallbacks);
			if (isLastSeg && verifyCheckpoint && this.sim.tick === verifyCheckpoint.tick) {
				verifyCheckpoint.onTickReached(this.getSimChecksum());
			}

			while (this.sim.tick < clampedTarget && this.sim.isRunning && !this.sim.winner) {
				this.flushTick(this.sim.tick, emitCallbacks);
				this.sim.step(FIXED_STEP);
				if (isLastSeg && verifyCheckpoint && this.sim.tick === verifyCheckpoint.tick) {
					verifyCheckpoint.onTickReached(this.getSimChecksum());
				}
			}
			this.flushTick(this.sim.tick, emitCallbacks);
			if (isLastSeg && verifyCheckpoint && this.sim.tick === verifyCheckpoint.tick) {
				verifyCheckpoint.onTickReached(this.getSimChecksum());
			}

			for (const cMove of checksums) {
				this.applyMoveToSimulation(cMove);
			}

			if (seg.resetMove) {
				this.applyMoveToSimulation(seg.resetMove);
				if (emitCallbacks) {
					this.onCommandApplied?.(seg.resetMove);
				}
			}
		}
	}

	private resolvePlayerForMove(move: Move): PlayerState {
		const p = move.payload ?? {};
		const mappedSlot = this.uidToSlot.get(move.by);
		// Countdown auto-finalization lets coordinator assign 'random' to pending AFK players;
		// all gameplay commands must strictly act on the sender's authoritative assigned slot.
		const allowCoordinatorSetRace =
			move.type === 'SET_RACE' && p.race === 'random' && typeof p.playerSlot === 'number';
		const explicitSlot = allowCoordinatorSetRace
			? p.playerSlot
			: (mappedSlot ?? (typeof p.playerSlot === 'number' ? p.playerSlot : undefined));
		if (explicitSlot !== undefined && this.sim.allPlayers?.length) {
			const matched = this.sim.allPlayers.find((pl) => pl.slot === explicitSlot);
			if (matched) return matched;
		}
		const team = p.team === 'west' || p.team === 'east' ? p.team : this.localTeam;
		return this.sim.players[team];
	}

	private applyMoveToSimulation(move: Move) {
		const p = move.payload ?? {};
		const player = this.resolvePlayerForMove(move);
		const mappedSlot = this.uidToSlot.get(move.by);
		const allowCoordinatorSetRace =
			move.type === 'SET_RACE' && p.race === 'random' && typeof p.playerSlot === 'number';
		const team =
			mappedSlot !== undefined && !allowCoordinatorSetRace
				? player.team
				: p.team === 'west' || p.team === 'east'
					? p.team
					: player.team;

		switch (move.type) {
			case 'BUILD':
				if (
					typeof p.buildingType === 'string' &&
					typeof p.x === 'number' &&
					typeof p.y === 'number'
				) {
					this.sim.build(team, p.buildingType, p.x, p.y, undefined, player, Boolean(p.shiftKey));
				}
				break;

			case 'UPGRADE':
				if (typeof p.targetId === 'string' && typeof p.buildingType === 'string') {
					this.sim.upgradeBuilding(team, p.targetId, p.buildingType, player);
				}
				break;

			case 'SELL':
				if (typeof p.targetId === 'string') {
					this.sim.sellBuilding(team, p.targetId, player);
				}
				break;

			case 'REPAIR':
				if (typeof p.targetId === 'string') {
					this.sim.repairBuilding(team, p.targetId, player);
				}
				break;

			case 'CONTINUE_BUILD':
				if (typeof p.targetId === 'string') {
					this.sim.continueConstruction(team, p.targetId, player);
				}
				break;

			case 'MOVE_WORKER':
				if (typeof p.worldX === 'number' && typeof p.worldY === 'number') {
					this.sim.moveWorker(team, p.worldX, p.worldY, player);
				}
				break;

			case 'ORDER_WORKER_MOVE':
				if (typeof p.worldX === 'number' && typeof p.worldY === 'number') {
					if (p.targetId === 'blink') {
						this.sim.teleportWorker(team, p.worldX, p.worldY, player);
					} else {
						this.sim.orderWorkerMove(team, p.worldX, p.worldY, player);
					}
				}
				break;

			case 'USE_ABILITY':
				this.sim.useRaceSkill(team, player);
				break;

			case 'BUY_ITEM':
				if (typeof p.itemId === 'string') {
					this.sim.buyCastleItem(team, p.itemId, player);
				}
				break;

			case 'UPGRADE_FORGE':
				if (p.forgeType === 'attack' || p.forgeType === 'armor' || p.forgeType === 'econ') {
					this.sim.upgradeForge(team, p.forgeType, player);
				}
				break;

			case 'SELECT_COMMANDER':
				if (
					p.commanderId === 'random' ||
					(typeof p.commanderId === 'number' && p.commanderId >= 1 && p.commanderId <= 6)
				) {
					this.sim.selectPlayerCommander(team, p.commanderId, player);
				}
				break;

			case 'SET_RACE':
				if (typeof p.race === 'string' && p.race.length > 0) {
					this.sim.setPlayerRace(team, p.race, player);
				}
				break;

			case 'BRIDGE_REPAIR':
				this.sim.orderBridgeRepair(team, player);
				break;

			case 'RESCUE_STRIKE':
				this.sim.triggerRescueStrike(
					team,
					player,
					typeof p.worldX === 'number' ? p.worldX : undefined,
					typeof p.worldY === 'number' ? p.worldY : undefined
				);
				break;

			case 'CASTLE_SHOT':
				if (p.targetId === 'short' || p.targetId === 'long') {
					this.sim.fireCastleCannon(team, p.targetId, player);
				} else if (p.targetId === 'auto_short') {
					this.sim.setCastleCannonAutoMode(team, 'short', player);
				} else if (p.targetId === 'auto_long') {
					this.sim.setCastleCannonAutoMode(team, 'long', player);
				} else if (p.targetId === 'auto_off') {
					this.sim.setCastleCannonAutoMode(team, null, player);
				}
				break;

			case 'UPGRADE_CASTLE_CANNON':
				this.sim.upgradeCastleCannon(team, player);
				break;

			case 'SURRENDER':
				this.sim.castles[team].hp = 0;
				this.sim.isRunning = false;
				break;

			case 'PAUSE':
				this.sim.isRunning = false;
				break;

			case 'RESUME':
				this.sim.isRunning = true;
				break;

			case 'NEXT_ROUND':
				if (typeof p.round !== 'number' || p.round === this.sim.round) {
					this.pendingMoves = [];
					this.checksumHistory.clear();
					this.pendingRemoteChecksums.clear();
					this.lastDesyncResyncTick = -1;
					if (this.sim.matchWinner) {
						this.sim.startNewMatch();
					} else {
						this.sim.round++;
						this.sim.resetRound();
					}
					this.sim.isRunning = true;
				}
				break;

			case 'RESTART_MATCH':
				this.pendingMoves = [];
				this.checksumHistory.clear();
				this.pendingRemoteChecksums.clear();
				this.lastDesyncResyncTick = -1;
				this.sim.startNewMatch();
				this.sim.isRunning = true;
				break;

			case 'HEARTBEAT':
				if (typeof p.clientTime === 'number' && move.by !== this.localUid) {
					const rtt = Math.max(0, Math.round(this.transport.now() - p.clientTime));
					this.peerRtt.set(move.by, rtt);
					this.onPeerPing?.({ peerUid: move.by, rtt });
				}
				break;

			case 'CHECKSUM':
				if (
					typeof p.checksum === 'string' &&
					typeof p.tick === 'number' &&
					move.by !== this.localUid
				) {
					if (p.tick === this.sim.tick) {
						const localChecksum = this.recordCheckpointChecksum();
						if (localChecksum !== p.checksum) {
							this.handleChecksumMismatch(p.tick, localChecksum, p.checksum);
						}
					} else if (p.tick < this.sim.tick) {
						const historical = this.checksumHistory.get(p.tick);
						if (historical && historical !== p.checksum) {
							this.handleChecksumMismatch(p.tick, historical, p.checksum);
						}
					} else {
						// Remote peer is slightly ahead; verify when local sim reaches `p.tick`
						const list = this.pendingRemoteChecksums.get(p.tick) ?? [];
						list.push({ peerUid: move.by, checksum: p.checksum });
						this.pendingRemoteChecksums.set(p.tick, list);
					}
				}
				break;

			case 'CHAT':
			default:
				// Metadata/keepalive moves that don't alter simulation physics
				break;
		}
	}

	dispose() {
		if (this.unwatch) {
			this.unwatch();
			this.unwatch = null;
		}
		this.processedSeqs.clear();
		this.pendingMoves = [];
		this.appliedHistory = [];
		this.checksumHistory.clear();
		this.pendingRemoteChecksums.clear();
	}
}
