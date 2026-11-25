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
	onCommandApplied?: (move: Move) => void;
	onGone?: (reason: string) => void;
	onPeerStatusChange?: (status: { peerUid: string; online: boolean }) => void;
	onPeerPing?: (ping: { peerUid: string; rtt: number }) => void;
	onDesync?: (info: { tick: number; localChecksum: string; remoteChecksum: string }) => void;
}

const MAX_CHECKPOINT_HISTORY = 40;
const MAX_CATCHUP_TICKS = 216_000;
const FIXED_STEP = 1 / 60;

const IMMEDIATE_MOVE_TYPES = new Set([
	'HEARTBEAT',
	'CHECKSUM',
	'CHAT',
	'lead',
	'PAUSE',
	'RESUME',
	'SURRENDER',
	'NEXT_ROUND',
	'RESTART_MATCH'
]);

const TELEMETRY_MOVE_TYPES = new Set(['HEARTBEAT', 'CHECKSUM', 'CHAT', 'lead']);

export function computeSimStateChecksum(sim: Simulation): string {
	const westHp = Math.round(sim.castles?.west?.hp ?? 0);
	const eastHp = Math.round(sim.castles?.east?.hp ?? 0);
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

	const raw = `${sim.tick}:t${Math.round(sim.gameTime * 10)}:r${sim.round}:${sim.score.west}-${sim.score.east}:${sim.brokenBridge ?? 'none'}:${westHp},${eastHp}:${playerSignatures}:b${buildingsCount}/${buildingsHp}:u${unitsCount}`;
	let hash = 5381;
	for (let i = 0; i < raw.length; i++) {
		hash = ((hash << 5) + hash + raw.charCodeAt(i)) & 0xffffffff;
	}
	return (hash >>> 0).toString(16);
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
	private uidToSlot = new Map<string, number>();
	private hydrated = false;
	private nextSeq = 1;
	private appliedSeq = 0;
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
	private pendingRemoteChecksums = new Map<number, { peerUid: string; checksum: string }[]>();
	private pendingMoves: Move[] = [];
	private lastDispatchMs = 0;

	constructor(options: MatchSyncOptions) {
		this.sim = options.sim;
		this.transport = options.transport;
		this.localUid = options.localUid;
		this.localTeam = options.localTeam;
		this.localSlot = options.localSlot ?? (options.localTeam === 'east' ? 2 : 1);
		this.commandLeadTicks = Math.max(0, Math.floor(options.commandLeadTicks ?? 0));
		if (options.uidToSlot) {
			this.setRosterSlots(options.uidToSlot);
		}
		this.onCommandApplied = options.onCommandApplied;
		this.onPeerStatusChange = options.onPeerStatusChange;
		this.onPeerPing = options.onPeerPing;
		this.onDesync = options.onDesync;

		this.unwatch = this.transport.watch(
			(snapshot) => {
				if (snapshot.moves.length === 0 && this.appliedSeq > 0) {
					this.appliedSeq = 0;
					this.nextSeq = 1;
					this.pendingMoves = [];
					this.checksumHistory.clear();
					this.pendingRemoteChecksums.clear();
				}
				this.processMoves(snapshot.moves);
				this.checkMembers(snapshot.members);
			},
			(reason) => {
				options.onGone?.(reason);
			}
		);
	}

	setSimulation(sim: Simulation) {
		this.sim = sim;
		this.hydrated = false;
		this.appliedSeq = 0;
		this.pendingMoves = [];
		this.checksumHistory.clear();
		this.pendingRemoteChecksums.clear();
	}

	setRosterSlots(mapping: Record<string, number>) {
		this.uidToSlot.clear();
		for (const [uid, slot] of Object.entries(mapping)) {
			if (Number.isInteger(slot) && slot >= 1 && slot <= 14) {
				this.uidToSlot.set(uid, slot);
			}
		}
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
	flushTick(tick: number = this.sim.tick): number {
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
			this.onCommandApplied?.(move);
		}
		return ready.length;
	}

	/**
	 * Records the simulation checksum for the current tick and verifies any buffered
	 * remote checksums waiting for this exact tick.
	 */
	recordCheckpointChecksum(): string {
		const tick = this.sim.tick;
		const sum = this.getSimChecksum();
		this.checksumHistory.set(tick, sum);
		if (this.checksumHistory.size > MAX_CHECKPOINT_HISTORY) {
			const oldestKey = this.checksumHistory.keys().next().value;
			if (oldestKey !== undefined) {
				this.checksumHistory.delete(oldestKey);
			}
		}

		const waiting = this.pendingRemoteChecksums.get(tick);
		if (waiting) {
			this.pendingRemoteChecksums.delete(tick);
			for (const entry of waiting) {
				if (entry.checksum !== sum) {
					this.onDesync?.({
						tick,
						localChecksum: sum,
						remoteChecksum: entry.checksum
					});
				}
			}
		}
		return sum;
	}

	async sendHeartbeat(): Promise<boolean> {
		if (Date.now() - this.lastDispatchMs < 150) return false;
		return this.dispatch('HEARTBEAT', {
			clientTime: Math.floor(this.transport.now()),
			tick: this.sim.tick
		});
	}

	async broadcastChecksum(): Promise<boolean> {
		const checksum = this.recordCheckpointChecksum();
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
		const scheduledTick = IMMEDIATE_MOVE_TYPES.has(type)
			? this.sim.tick
			: this.sim.tick + (this.sim.isRunning ? this.commandLeadTicks : 0);
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

		for (const rawMove of sorted) {
			if (rawMove.seq <= this.appliedSeq) continue;

			const validation = validatePlayerMove(rawMove);
			if (!validation.valid || !validation.sanitized) {
				continue;
			}
			const move = validation.sanitized;

			this.appliedSeq = move.seq;
			this.nextSeq = Math.max(this.nextSeq, move.seq + 1);

			const targetTick = move.payload?.tick;
			if (
				!IMMEDIATE_MOVE_TYPES.has(move.type) &&
				typeof targetTick === 'number' &&
				targetTick > this.sim.tick &&
				this.sim.isRunning
			) {
				this.pendingMoves.push(move);
				continue;
			}

			this.applyMoveToSimulation(move);
			this.onCommandApplied?.(move);
		}
	}

	private replayHistoricalBatch(sorted: Move[]) {
		const validMoves: Move[] = [];
		for (const rawMove of sorted) {
			if (rawMove.seq <= this.appliedSeq) continue;
			const validation = validatePlayerMove(rawMove);
			if (!validation.valid || !validation.sanitized) continue;
			const move = validation.sanitized;
			this.appliedSeq = move.seq;
			this.nextSeq = Math.max(this.nextSeq, move.seq + 1);
			validMoves.push(move);
		}
		if (validMoves.length === 0) return;

		// Split history cleanly on round/match boundaries so each epoch steps from tick 0
		const segments: { moves: Move[]; resetMove: Move | null; targetTick: number }[] = [];
		let currentMoves: Move[] = [];
		let maxTick = 0;

		for (const move of validMoves) {
			const tick = typeof move.payload?.tick === 'number' ? move.payload.tick : 0;
			if (tick > maxTick) maxTick = tick;

			if (move.type === 'NEXT_ROUND' || move.type === 'RESTART_MATCH') {
				segments.push({ moves: currentMoves, resetMove: move, targetTick: maxTick });
				currentMoves = [];
				maxTick = 0;
				continue;
			}
			currentMoves.push(move);
		}
		segments.push({ moves: currentMoves, resetMove: null, targetTick: maxTick });

		for (const seg of segments) {
			const clampedTarget = Math.min(seg.targetTick, MAX_CATCHUP_TICKS);
			const checksums: Move[] = [];
			for (const move of seg.moves) {
				if (move.type === 'CHECKSUM') {
					checksums.push(move);
				} else if (!TELEMETRY_MOVE_TYPES.has(move.type)) {
					this.pendingMoves.push(move);
				}
			}

			// Flush initial tick-0 commands (e.g. RESUME) before checking `this.sim.isRunning`
			this.flushTick(this.sim.tick);

			while (this.sim.tick < clampedTarget && this.sim.isRunning && !this.sim.winner) {
				this.flushTick(this.sim.tick);
				this.sim.step(FIXED_STEP);
			}
			this.flushTick(this.sim.tick);

			for (const cMove of checksums) {
				this.applyMoveToSimulation(cMove);
			}

			if (seg.resetMove) {
				this.applyMoveToSimulation(seg.resetMove);
				this.onCommandApplied?.(seg.resetMove);
			}
		}
	}

	private resolvePlayerForMove(move: Move): PlayerState {
		const p = move.payload ?? {};
		const explicitSlot =
			typeof p.playerSlot === 'number' ? p.playerSlot : this.uidToSlot.get(move.by);
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
		const team = p.team === 'west' || p.team === 'east' ? p.team : player.team;

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
					this.sim.orderWorkerMove(team, p.worldX, p.worldY, player);
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

			case 'BRIDGE_REPAIR':
				this.sim.orderBridgeRepair(team, player);
				break;

			case 'RESCUE_STRIKE':
				this.sim.triggerRescueStrike(team, player);
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
							this.onDesync?.({
								tick: p.tick,
								localChecksum,
								remoteChecksum: p.checksum
							});
						}
					} else if (p.tick < this.sim.tick) {
						const historical = this.checksumHistory.get(p.tick);
						if (historical && historical !== p.checksum) {
							this.onDesync?.({
								tick: p.tick,
								localChecksum: historical,
								remoteChecksum: p.checksum
							});
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
		this.pendingMoves = [];
		this.checksumHistory.clear();
		this.pendingRemoteChecksums.clear();
	}
}
