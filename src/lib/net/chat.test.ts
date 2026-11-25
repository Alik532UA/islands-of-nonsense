import { describe, it, expect } from 'vitest';
import { dmThreadId, QUICK_EMOTES, sendDmMessage, sendGlobalChatMessage } from './chat';
import { chatModeration } from '$lib/services/chatModeration.svelte';

describe('chat & moderation', () => {
	it('computes symmetric deterministic DM thread IDs', async () => {
		expect(dmThreadId('alice', 'bob')).toBe('alice__bob');
		expect(dmThreadId('bob', 'alice')).toBe('alice__bob');
		expect(QUICK_EMOTES.length).toBeGreaterThanOrEqual(6);
		expect(await sendGlobalChatMessage('Player', '   ')).toBe(false);
		expect(await sendDmMessage('', 'Player', 'hi')).toBe(false);
		expect(await sendDmMessage('peer1', 'Player', '   ')).toBe(false);
	});

	it('mutes/unmutes users and masks profane words when filter is active', () => {
		expect(chatModeration.isMuted('spammer_1')).toBe(false);
		expect(chatModeration.toggleMute('spammer_1')).toBe(true);
		expect(chatModeration.isMuted('spammer_1')).toBe(true);
		expect(chatModeration.toggleMute('spammer_1')).toBe(false);
		expect(chatModeration.isMuted('spammer_1')).toBe(false);

		chatModeration.setFilterEnabled(true);
		expect(chatModeration.sanitizeText('what the fuck')).toBe('what the ****');
		chatModeration.setFilterEnabled(false);
		expect(chatModeration.sanitizeText('what the fuck')).toBe('what the fuck');
		chatModeration.setFilterEnabled(true);
	});
});
