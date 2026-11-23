import {
	configAllowed,
	hostOnly,
	moveAllowed,
	rosterAllowed,
	touchAllowed,
	type RoomState,
	wipeAllowed
} from './localRules';
import type {
	GoneReason,
	Member,
	Move,
	RoomConfig,
	RoomInfo,
	RoomSnapshot,
	RoomStatus,
	RoomTransport,
	RosterEntry
} from './roomTypes';

export interface LocalTransportOptions {
	echo?: boolean;
	as?: string;
}

const denied = (): never => {
	throw new Error('PERMISSION_DENIED: Permission denied');
};

/**
 * Headless In-Memory Room Transport.
 * Simulates Firebase RTDB room behavior for deterministic tests without network.
 */
export class LocalRoom {
	#info: RoomInfo;
	#members: Member[];
	#moves: Move[] = [];
	#listeners = new Set<(snapshot: RoomSnapshot) => void>();
	#goneListeners = new Set<(why: GoneReason) => void>();
	#present: Set<string> | null = null;
	#now: number;

	constructor(info: RoomInfo, members: Member[], startAt = 1_000_000) {
		this.#info = { ...info };
		this.#members = [...members];
		this.#now = startAt;
		if (info.status === 'playing' && info.startedAt === undefined) {
			this.#info.startedAt = startAt;
		}
	}

	tick(ms: number): number {
		this.#now += ms;
		return this.#now;
	}

	setPresent(uids: string[] | null) {
		this.#present = uids ? new Set(uids) : null;
	}

	#state(): RoomState {
		return {
			info: this.#info,
			members: this.#members,
			moves: this.#moves,
			present: this.#present
		};
	}

	#snapshot(): RoomSnapshot {
		return {
			info: { ...this.#info },
			members: this.#members.map((m) => ({ ...m })),
			moves: this.#moves.map((m) => ({ ...m }))
		};
	}

	#emit() {
		const snap = this.#snapshot();
		for (const listener of this.#listeners) {
			listener(snap);
		}
	}

	close(reason: GoneReason = 'closed') {
		for (const listener of this.#goneListeners) {
			listener(reason);
		}
		this.#listeners.clear();
		this.#goneListeners.clear();
	}

	transport(options: LocalTransportOptions = {}): RoomTransport {
		const own = new Set<(snapshot: RoomSnapshot) => void>();

		return {
			code: 'LOCAL',
			now: () => this.#now,

			watch: (onSnapshot, onGone) => {
				this.#listeners.add(onSnapshot);
				own.add(onSnapshot);
				if (onGone) this.#goneListeners.add(onGone);
				onSnapshot(this.#snapshot());
				return () => {
					this.#listeners.delete(onSnapshot);
					own.delete(onSnapshot);
					if (onGone) this.#goneListeners.delete(onGone);
				};
			},

			append: async (move) => {
				for (const [key, value] of Object.entries(move)) {
					if (value === undefined) throw new Error(`move.${key} is undefined`);
				}

				if (options.echo) {
					const echoed = this.#snapshot();
					echoed.moves = [
						...echoed.moves.filter((existing) => existing.seq !== move.seq),
						{ ...move, at: this.#now }
					].sort((a, b) => a.seq - b.seq);
					for (const listener of own) listener(echoed);
					await Promise.resolve();
				}

				const refused = !moveAllowed(this.#state(), move, options.as);
				if (options.echo && refused) {
					const truth = this.#snapshot();
					for (const listener of own) listener(truth);
					return false;
				}
				if (refused) return false;

				this.#moves.push({ ...move, at: this.#now });
				this.#moves.sort((a, b) => a.seq - b.seq);
				this.#emit();
				return true;
			},

			setStatus: async (status: RoomStatus, roster?: RosterEntry[], config?: RoomConfig) => {
				if (!hostOnly(this.#state(), options.as)) denied();

				if (roster && (status !== 'playing' || !rosterAllowed(roster, this.#members))) {
					throw new Error('PERMISSION_DENIED: roster');
				}

				const starting = status === 'playing';
				if (starting && !wipeAllowed(this.#state(), this.#info.seed)) {
					throw new Error('PERMISSION_DENIED: start');
				}
				if (starting) this.#moves = [];

				const { countdownAt: _stale, ...rest } = this.#info;
				this.#info =
					status === 'playing'
						? {
								...rest,
								status,
								startedAt: this.#now,
								...(roster ? { roster: [...roster] } : {}),
								...(config ? { config } : {})
							}
						: { ...rest, status };
				this.#emit();
			},

			touch: async () => {
				if (!touchAllowed(this.#state(), options.as)) denied();
				this.#info = { ...this.#info, aliveAt: this.#now };
				this.#emit();
			},

			setAutoStart: async (on: boolean) => {
				if (!hostOnly(this.#state(), options.as)) denied();
				const { countdownAt: _reset, ...rest } = this.#info;
				this.#info = { ...rest, autoStart: on };
				this.#emit();
			},

			setConfig: async (config: RoomConfig) => {
				if (!hostOnly(this.#state(), options.as)) denied();
				if (!configAllowed(this.#state())) throw new Error('PERMISSION_DENIED: config');
				this.#info = { ...this.#info, config };
				this.#emit();
			}
		};
	}
}
