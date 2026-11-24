import type { NewRoomOptions } from './rtdbRoom';
import type { Member, MemberPatch, RoomEntry, RoomInfo, RoomTransport } from './roomTypes';
import { startRoomBeat } from './roomBeat';

export interface RoomNet {
	createRoom(options: NewRoomOptions): Promise<string>;
	joinRoom(code: string, entry: RoomEntry): Promise<void>;
	updateMe(code: string, patch: MemberPatch): Promise<void>;
	peekRoom(code: string): Promise<RoomInfo | null>;
	peekMembers(code: string): Promise<Member[] | null>;
	roomTransport(code: string): Promise<RoomTransport>;
	closeRoom(code: string): Promise<void>;
	sendChatMessage(code: string, senderName: string, text: string): Promise<boolean>;
	me(): Promise<string>;
	trackPresence(code: string): Promise<() => void>;
	watchPresence(code: string, onChange: (online: string[]) => void): Promise<() => void>;
	beat(transport: RoomTransport): () => void;
}

export const liveNet: RoomNet = {
	createRoom: async (options) => (await import('./rtdbRoom')).createRoom(options),
	joinRoom: async (code, entry) => (await import('./rtdbRoom')).joinRoom(code, entry),
	updateMe: async (code, patch) => (await import('./rtdbRoom')).updateMe(code, patch),
	peekRoom: async (code) => (await import('./rtdbRoom')).peekRoom(code),
	peekMembers: async (code) => (await import('./rtdbRoom')).peekMembers(code),
	roomTransport: async (code) => (await import('./rtdbRoom')).roomTransport(code),
	closeRoom: async (code) => (await import('./rtdbRoom')).closeRoom(code),
	sendChatMessage: async (code, senderName, text) =>
		(await import('./rtdbRoom')).sendChatMessage(code, senderName, text),
	me: async () => (await (await import('./firebase')).connect()).uid,
	trackPresence: async (code) => (await import('./presence')).trackPresence(code),
	watchPresence: async (code, onChange) =>
		(await import('./presence')).watchPresence(code, onChange),
	beat: (transport) => startRoomBeat(transport)
};
