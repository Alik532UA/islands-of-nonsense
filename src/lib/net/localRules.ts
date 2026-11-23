import { MOVE_SEQ_MAX } from './roomShape';
import type { Member, Move, RoomInfo, RosterEntry } from './roomTypes';

export interface RoomState {
	info: RoomInfo;
	members: readonly Member[];
	moves: readonly Move[];
	present: ReadonlySet<string> | null;
}

export const validSeq = (seq: number): boolean =>
	Number.isInteger(seq) && seq >= 1 && seq <= MOVE_SEQ_MAX;

export function rosterAllowed(roster: readonly RosterEntry[], members: readonly Member[]): boolean {
	return roster.every((entry) =>
		members.some(
			(member) => member.uid === entry.uid && member.role === 'player' && member.name === entry.name
		)
	);
}

export const hostOnly = (state: RoomState, caller?: string): boolean =>
	caller === undefined || caller === state.info.hostUid;

export const removeAllowed = (state: RoomState, uid: string, caller?: string): boolean =>
	caller === undefined || caller === uid || caller === state.info.hostUid;

export const touchAllowed = (state: RoomState, caller?: string): boolean =>
	caller === undefined || state.members.some((member) => member.uid === caller);

export function moveAllowed(state: RoomState, move: Move, caller?: string): boolean {
	const { info, members, moves } = state;
	if (caller !== undefined && move.by !== caller) return false;
	if (!members.some((member) => member.uid === move.by)) return false;
	if (info.status !== 'playing' && move.type !== 'lead' && move.type !== 'CHAT' && move.type !== 'HEARTBEAT') {
		return false;
	}
	if (!validSeq(move.seq)) return false;
	if (moves.some((existing) => existing.seq === move.seq)) return false;
	return true;
}

export const wipeAllowed = (state: RoomState, seed: number): boolean =>
	state.info.status !== 'playing' || seed !== state.info.seed;

export const configAllowed = (state: RoomState): boolean =>
	state.info.status === 'lobby' || state.moves.length === 0;
