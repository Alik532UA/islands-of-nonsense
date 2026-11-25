import type { NewRoomOptions } from './rtdbRoom';
import type {
	Member,
	MemberPatch,
	RoomEntry,
	RoomInfo,
	RoomSlotKey,
	RoomTransport
} from './roomTypes';
import { startRoomBeat } from './roomBeat';

export interface RoomNet {
	createRoom(options: NewRoomOptions): Promise<string>;
	joinRoom(code: string, entry: RoomEntry): Promise<void>;
	updateMe(code: string, patch: MemberPatch): Promise<void>;
	pickHumanColor(
		code: string,
		colorId: number | null,
		conflictingBotKeys?: readonly RoomSlotKey[]
	): Promise<void>;
	setBotSlotColor(code: string, slotKey: RoomSlotKey, colorId: number | null): Promise<void>;
	updateMemberSlot(
		code: string,
		targetUid: string,
		team: 'west' | 'east',
		slot: number
	): Promise<void>;
	kickMember(code: string, targetUid: string): Promise<void>;
	peekRoom(code: string): Promise<RoomInfo | null>;
	peekMembers(code: string): Promise<Member[] | null>;
	roomTransport(code: string): Promise<RoomTransport>;
	closeRoom(code: string): Promise<void>;
	sendChatMessage(
		code: string,
		senderName: string,
		text: string,
		options?: {
			avatar?: string;
			kind?: 'text' | 'emote' | 'system';
			emote?: string;
			channel?: 'all' | 'spectator';
		}
	): Promise<boolean>;
	me(): Promise<string>;
	trackPresence(code: string): Promise<() => void>;
	watchPresence(code: string, onChange: (online: string[]) => void): Promise<() => void>;
	beat(transport: RoomTransport): () => void;
}

export const liveNet: RoomNet = {
	createRoom: async (options) => (await import('./rtdbRoom')).createRoom(options),
	joinRoom: async (code, entry) => (await import('./rtdbRoom')).joinRoom(code, entry),
	updateMe: async (code, patch) => (await import('./rtdbRoom')).updateMe(code, patch),
	pickHumanColor: async (code, colorId, conflictingBotKeys) =>
		(await import('./rtdbRoom')).pickHumanColor(code, colorId, conflictingBotKeys),
	setBotSlotColor: async (code, slotKey, colorId) =>
		(await import('./rtdbRoom')).setBotSlotColor(code, slotKey, colorId),
	updateMemberSlot: async (code, targetUid, team, slot) =>
		(await import('./rtdbRoom')).updateMemberSlot(code, targetUid, team, slot),
	kickMember: async (code, targetUid) => (await import('./rtdbRoom')).kickMember(code, targetUid),
	peekRoom: async (code) => (await import('./rtdbRoom')).peekRoom(code),
	peekMembers: async (code) => (await import('./rtdbRoom')).peekMembers(code),
	roomTransport: async (code) => (await import('./rtdbRoom')).roomTransport(code),
	closeRoom: async (code) => (await import('./rtdbRoom')).closeRoom(code),
	sendChatMessage: async (code, senderName, text, options) =>
		(await import('./rtdbRoom')).sendChatMessage(code, senderName, text, options),
	me: async () => (await (await import('./firebase')).connect()).uid,
	trackPresence: async (code) => (await import('./presence')).trackPresence(code),
	watchPresence: async (code, onChange) =>
		(await import('./presence')).watchPresence(code, onChange),
	beat: (transport) => startRoomBeat(transport)
};
