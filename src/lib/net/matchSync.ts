import type { Simulation } from '$lib/engine/simulation';
import type { Move, MovePayload, RoomTransport } from './roomTypes';

export interface MatchSyncOptions {
	sim: Simulation;
	transport: RoomTransport;
	localUid: string;
	localTeam: 'west' | 'east';
	onCommandApplied?: (move: Move) => void;
	onGone?: (reason: string) => void;
}

/**
 * Deterministic RTS match synchronizer.
 * Ingests local player commands, serializes them as monotonic Move records over RoomTransport,
 * and executes remote and local commands deterministically on the local Simulation instance.
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

	constructor(options: MatchSyncOptions) {
		this.sim = options.sim;
		this.transport = options.transport;
		this.localUid = options.localUid;
		this.localTeam = options.localTeam;
		this.onCommandApplied = options.onCommandApplied;

		this.unwatch = this.transport.watch(
			(snapshot) => {
				this.processMoves(snapshot.moves);
			},
			(reason) => {
				options.onGone?.(reason);
			}
		);
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

		for (const move of sorted) {
			if (move.seq <= this.appliedSeq) continue;

			this.applyMoveToSimulation(move);
			this.appliedSeq = move.seq;
			this.nextSeq = Math.max(this.nextSeq, move.seq + 1);

			this.onCommandApplied?.(move);
		}
	}

	private applyMoveToSimulation(move: Move) {
		const p = move.payload ?? {};
		const team = (p.team === 'west' || p.team === 'east') ? p.team : this.localTeam;

		switch (move.type) {
			case 'BUILD':
				if (typeof p.buildingType === 'string' && typeof p.x === 'number' && typeof p.y === 'number') {
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

			case 'HEARTBEAT':
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
