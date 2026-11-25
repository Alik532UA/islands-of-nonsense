import { connect } from './firebase';
import { isDenied } from './denied';
import { logService } from '$lib/services/logService.svelte';

export type ChatKind = 'text' | 'emote' | 'system';

export interface ChatEntry {
	id: string;
	senderUid: string;
	senderName: string;
	senderAvatar?: string;
	kind?: ChatKind;
	emote?: string;
	text: string;
	at: number;
}

export const QUICK_EMOTES = ['🔥', '⚔️', '🛡️', '👑', '😂', '😮', 'GG', 'GL HF'] as const;

export function dmThreadId(uidA: string, uidB: string): string {
	return uidA < uidB ? `${uidA}__${uidB}` : `${uidB}__${uidA}`;
}

export async function sendGlobalChatMessage(
	senderName: string,
	text: string,
	options: { avatar?: string; kind?: ChatKind; emote?: string } = {}
): Promise<boolean> {
	const cleanText = text.trim().slice(0, 200);
	if (!cleanText) return false;

	try {
		const { uid, db } = await connect();
		const { push, ref, serverTimestamp, update } = await import('firebase/database');
		const msgKey = push(ref(db, 'globalChat')).key;
		if (!msgKey) return false;

		const stamp = serverTimestamp();
		await update(ref(db), {
			[`globalChat/${msgKey}`]: {
				senderUid: uid,
				senderName: senderName.slice(0, 48),
				...(options.avatar ? { senderAvatar: options.avatar } : {}),
				...(options.kind ? { kind: options.kind } : {}),
				...(options.emote ? { emote: options.emote.slice(0, 16) } : {}),
				text: cleanText,
				at: stamp
			},
			[`chatCooldowns/${uid}`]: stamp
		});
		return true;
	} catch (error) {
		if (!isDenied(error)) {
			logService.warn('chat', 'Global chat write failed', { reason: String(error) });
		}
		return false;
	}
}

export async function subscribeGlobalChat(
	onMessages: (messages: ChatEntry[]) => void
): Promise<() => void> {
	try {
		const { db } = await connect();
		const { limitToLast, onValue, query, ref } = await import('firebase/database');
		const q = query(ref(db, 'globalChat'), limitToLast(40));
		return onValue(q, (snap) => {
			if (!snap.exists()) {
				onMessages([]);
				return;
			}
			const list: ChatEntry[] = [];
			snap.forEach((child) => {
				if (!child.key) return;
				const val = child.val() as Omit<ChatEntry, 'id'>;
				list.push({ id: child.key, ...val });
			});
			list.sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
			onMessages(list);
		});
	} catch {
		return () => {};
	}
}

export async function sendDmMessage(
	peerUid: string,
	senderName: string,
	text: string,
	senderAvatar?: string
): Promise<boolean> {
	const cleanText = text.trim().slice(0, 200);
	if (!cleanText || !peerUid) return false;

	try {
		const { uid, db } = await connect();
		if (peerUid === uid) return false;
		const threadId = dmThreadId(uid, peerUid);
		const { push, ref, serverTimestamp, set } = await import('firebase/database');
		const msgRef = push(ref(db, `dm/${threadId}/messages`));
		await set(msgRef, {
			senderUid: uid,
			senderName: senderName.slice(0, 48),
			...(senderAvatar ? { senderAvatar } : {}),
			text: cleanText,
			at: serverTimestamp()
		});
		return true;
	} catch (error) {
		logService.warn('chat', 'DM write failed', { reason: String(error) });
		return false;
	}
}

export async function subscribeDmThread(
	peerUid: string,
	onMessages: (messages: ChatEntry[]) => void
): Promise<() => void> {
	try {
		const { uid, db } = await connect();
		if (!peerUid || peerUid === uid) return () => {};
		const threadId = dmThreadId(uid, peerUid);
		const { limitToLast, onValue, query, ref } = await import('firebase/database');
		const q = query(ref(db, `dm/${threadId}/messages`), limitToLast(50));
		return onValue(q, (snap) => {
			if (!snap.exists()) {
				onMessages([]);
				return;
			}
			const list: ChatEntry[] = [];
			snap.forEach((child) => {
				if (!child.key) return;
				const val = child.val() as Omit<ChatEntry, 'id'>;
				list.push({ id: child.key, ...val });
			});
			list.sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
			onMessages(list);
		});
	} catch {
		return () => {};
	}
}
