import { storage } from './storage';

const MUTED_UIDS_KEY = 'chat_muted_uids';
const PROFANITY_FILTER_KEY = 'chat_profanity_filter';

const BLOCKED_WORDS = ['хуй', 'пизд', 'бляд', 'єбан', 'сука', 'fuck', 'shit', 'bitch'];

class ChatModerationStore {
	mutedUids = $state<string[]>(storage.getJSON<string[]>(MUTED_UIDS_KEY, []));
	filterEnabled = $state<boolean>(storage.get(PROFANITY_FILTER_KEY) !== '0');

	isMuted(uid: string): boolean {
		return this.mutedUids.includes(uid);
	}

	toggleMute(uid: string): boolean {
		if (!uid) return false;
		const exists = this.mutedUids.includes(uid);
		this.mutedUids = exists ? this.mutedUids.filter((id) => id !== uid) : [...this.mutedUids, uid];
		storage.setJSON(MUTED_UIDS_KEY, this.mutedUids);
		return !exists;
	}

	setFilterEnabled(on: boolean): void {
		this.filterEnabled = on;
		storage.set(PROFANITY_FILTER_KEY, on ? '1' : '0');
	}

	sanitizeText(text: string): string {
		if (!this.filterEnabled) return text;
		let out = text;
		for (const word of BLOCKED_WORDS) {
			const re = new RegExp(word, 'gi');
			out = out.replace(re, (m) => '*'.repeat(m.length));
		}
		return out;
	}
}

export const chatModeration = new ChatModerationStore();
