import { describe, it, expect } from 'vitest';
import { buildErasePatch } from './erase';

describe('erase account data patch', () => {
	it('builds an atomic multi-path null patch for user data, handles, edges, and owned rooms', () => {
		const patch = buildErasePatch({
			uid: 'u_me',
			handle: 'hero_1',
			followingUids: ['u_a', 'u_me'],
			followerUids: ['u_b'],
			ownedRooms: [{ code: 'AB12', gameId: 'castlefight' }]
		});

		expect(patch).toEqual({
			'rooms/AB12': null,
			'lobby/castlefight/AB12': null,
			'users/u_a/followers/u_me': null,
			'users/u_b/following/u_me': null,
			'handles/hero_1': null,
			'find/hero_1': null,
			'leaders/u_me': null,
			'chatCooldowns/u_me': null,
			'presenceGlobal/u_me': null,
			'myRooms/u_me': null,
			'users/u_me': null
		});
	});
});
