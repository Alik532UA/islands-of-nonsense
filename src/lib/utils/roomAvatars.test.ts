import { describe, it, expect } from 'vitest';
import { resolveRoomMemberAvatars } from './roomAvatars';
import type { Member } from '$lib/net/roomTypes';

describe('resolveRoomMemberAvatars', () => {
	it('preserves linked account avatars and deduplicates colliding anonymous avatars', () => {
		const members: Member[] = [
			{
				uid: 'anon1',
				name: 'Guest 1',
				role: 'player',
				order: 1,
				avatar: 'crown:amber',
				account: false
			},
			{
				uid: 'linked1',
				name: 'Pro',
				role: 'player',
				order: 2,
				avatar: 'crown:amber',
				account: true
			},
			{
				uid: 'anon2',
				name: 'Guest 2',
				role: 'player',
				order: 3,
				avatar: 'crown:amber',
				account: false
			}
		];

		const resolved = resolveRoomMemberAvatars(members);
		expect(resolved.get('linked1')).toBe('crown:amber');
		expect(resolved.get('anon1')).not.toBe('crown:amber');
		expect(resolved.get('anon2')).not.toBe('crown:amber');
		expect(resolved.get('anon1')).not.toBe(resolved.get('anon2'));
	});
});
