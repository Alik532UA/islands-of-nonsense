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
	onCommandApplied?: (move: Move) => void;
	onGone?: (reason: string) => void;
	onPeerStatusChange?: (status: { peerUid: string; online: boolean }) => void;
	onPeerPing?: (ping: { peerUid: string; rtt: number }) => void;
	onDesync?: (info: { tick: number; localChecksum: string; remoteChecksum: string }) => void;
}

const MAX_CHECKPOINT_HISTORY = 40;

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
	const unitsCount = sim.units?.length ?? 0;

	const raw = `${sim.tick}:r${sim.round}:${sim.score.west}-${sim.score.east}:${sim.brokenBridge ?? 'none'}:${westHp},${eastHp}:${playerSignatures}:b${buildingsCount}:u${unitsCount}`;
	let hash = 5381;
	for (let i = 0; i < raw.length; i++) {
		hash = ((hash << 5) + hash + raw.charCodeAt(i)) & 0xffffffff;
	}
	return (hash >>> 0).toString(16);
}

/**
 * Deterministic RTS match synchronizer.
 * Ingests local player commands, serializes them as monotonic Move records over RoomTransport,
 * executes remote and local commands deterministically on the local Simulation instance,
 * and validates lockstep parity on matching simulation ticks.
 */
export class MatchSync {
	public sim: Simulation;
	public transport: RoomTransport;
	public localUid: string;
	public localTeam: 'west' | 'east';
	public localSlot: number;

	private uidToSlot = new Map<string, number>();
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

	constructor(options: MatchSyncOptions) {
		this.sim = options.sim;
		this.transport = options.transport;
		this.localUid = options.localUid;
		this.localTeam = options.localTeam;
		this.localSlot = options.localSlot ?? (options.localTeam === 'east' ? 2 : 1);
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
				}
				this.processMoves(snapshot.moves);
				this.checkMembers(snapshot.members);
			},
			(reason) => {
				options.onGone?.(reason);
			}
		);
	}

	setRosterSlots(mapping: Record<string, number>) {
		this.uidToSlot.clear();
		for (const [uid, slot] of Object.entries(mapping)) {
			if (Number.isInteger(slot) && slot >= 1 && slot <= 6) {
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

	getSimChecksum(): string {
		return computeSimStateChecksum(this.sim);
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
		return this.dispatch('HEARTBEAT', {
			clientTime: Date.now(),
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
		for (const m of members) {
			if (typeof m.slot === 'number' && !this.uidToSlot.has(m.uid)) {
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
		const seq = this.nextSeq++;
		const move: Move = {
			seq,
			by: this.localUid,
			type,
			payload: {
				tick: this.sim.tick,
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

		for (const rawMove of sorted) {
			if (rawMove.seq <= this.appliedSeq) continue;

			const validation = validatePlayerMove(rawMove);
			if (!validation.valid || !validation.sanitized) {
				continue;
			}
			const move = validation.sanitized;

			this.applyMoveToSimulation(move);
			this.appliedSeq = move.seq;
			this.nextSeq = Math.max(this.nextSeq, move.seq + 1);

			this.onCommandApplied?.(move);
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

			case 'HEARTBEAT':
				if (typeof p.clientTime === 'number' && move.by !== this.localUid) {
					const rtt = Math.max(0, Date.now() - p.clientTime);
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
		this.checksumHistory.clear();
		this.pendingRemoteChecksums.clear();
	}
}
