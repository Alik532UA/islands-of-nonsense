import type { Simulation } from '$lib/engine/simulation';
import type { Move, MovePayload, RoomTransport } from './roomTypes';
import { validatePlayerMove } from './actionValidation';

export interface MatchSyncOptions {
	sim: Simulation;
	transport: RoomTransport;
	localUid: string;
	localTeam: 'west' | 'east';
	onCommandApplied?: (move: Move) => void;
	onGone?: (reason: string) => void;
	onPeerStatusChange?: (status: { peerUid: string; online: boolean }) => void;
	onPeerPing?: (ping: { peerUid: string; rtt: number }) => void;
	onDesync?: (info: { tick: number; localChecksum: string; remoteChecksum: string }) => void;
}

export function computeSimStateChecksum(sim: Simulation): string {
	const westHp = Math.round(sim.castles?.west?.hp ?? 0);
	const eastHp = Math.round(sim.castles?.east?.hp ?? 0);
	const westGold = Math.floor(sim.players?.west?.gold ?? 0);
	const eastGold = Math.floor(sim.players?.east?.gold ?? 0);
	const buildingsCount = sim.buildings?.length ?? 0;
	const unitsCount = sim.units?.length ?? 0;

	const raw = `${sim.tick}:${westHp},${eastHp}:${westGold},${eastGold}:${buildingsCount}:${unitsCount}`;
	let hash = 5381;
	for (let i = 0; i < raw.length; i++) {
		hash = ((hash << 5) + hash + raw.charCodeAt(i)) & 0xffffffff;
	}
	return (hash >>> 0).toString(16);
}

/**
 * Deterministic RTS match synchronizer.
 * Ingests local player commands, serializes them as monotonic Move records over RoomTransport,
 * and executes remote and local commands deterministically on the local Simulation instance.
 * Features state checksum validation, latency ping heartbeats, and reconnect reconciliation.
 */
export class MatchSync {
	public sim: Simulation;
	public transport: RoomTransport;
	public localUid: string;
	public localTeam: 'west' | 'east';

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

	constructor(options: MatchSyncOptions) {
		this.sim = options.sim;
		this.transport = options.transport;
		this.localUid = options.localUid;
		this.localTeam = options.localTeam;
		this.onCommandApplied = options.onCommandApplied;
		this.onPeerStatusChange = options.onPeerStatusChange;
		this.onPeerPing = options.onPeerPing;
		this.onDesync = options.onDesync;

		this.unwatch = this.transport.watch(
			(snapshot) => {
				this.processMoves(snapshot.moves);
				this.checkMembers(snapshot.members);
			},
			(reason) => {
				options.onGone?.(reason);
			}
		);
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

	async sendHeartbeat(): Promise<boolean> {
		return this.dispatch('HEARTBEAT', {
			clientTime: Date.now(),
			tick: this.sim.tick
		});
	}

	async broadcastChecksum(): Promise<boolean> {
		return this.dispatch('CHECKSUM', {
			checksum: this.getSimChecksum(),
			tick: this.sim.tick
		});
	}

	private checkMembers(members: readonly { uid: string }[]) {
		if (!this.onPeerStatusChange) return;
		for (const m of members) {
			if (m.uid !== this.localUid) {
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
				...payload
			}
		};

		const success = await this.transport.append(move);
		if (!success) {
			// Rollback sequence anticipation on reject
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

	private applyMoveToSimulation(move: Move) {
		const p = move.payload ?? {};
		const team = p.team === 'west' || p.team === 'east' ? p.team : this.localTeam;

		switch (move.type) {
			case 'BUILD':
				if (
					typeof p.buildingType === 'string' &&
					typeof p.x === 'number' &&
					typeof p.y === 'number'
				) {
					this.sim.build(team, p.buildingType, p.x, p.y);
				}
				break;

			case 'UPGRADE':
				if (typeof p.targetId === 'string' && typeof p.buildingType === 'string') {
					this.sim.upgradeBuilding(team, p.targetId, p.buildingType);
				}
				break;

			case 'SELL':
				if (typeof p.targetId === 'string') {
					this.sim.sellBuilding(team, p.targetId);
				}
				break;

			case 'REPAIR':
				if (typeof p.targetId === 'string') {
					this.sim.repairBuilding(team, p.targetId);
				}
				break;

			case 'USE_ABILITY':
				this.sim.useRaceSkill(team);
				break;

			case 'BUY_ITEM':
				if (typeof p.itemId === 'string') {
					this.sim.buyCastleItem(team, p.itemId);
				}
				break;

			case 'UPGRADE_FORGE':
				if (typeof p.forgeType === 'string') {
					this.sim.upgradeForge(team, p.forgeType as any);
				}
				break;

			case 'BRIDGE_REPAIR':
				this.sim.orderBridgeRepair(team);
				break;

			case 'RESCUE_STRIKE':
				this.sim.triggerRescueStrike(team);
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
					const localChecksum = this.getSimChecksum();
					if (localChecksum !== p.checksum && Math.abs(this.sim.tick - p.tick) <= 5) {
						this.onDesync?.({
							tick: p.tick,
							localChecksum,
							remoteChecksum: p.checksum
						});
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
	}
}
