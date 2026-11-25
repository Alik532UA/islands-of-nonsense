import { describe, it, expect } from 'vitest';
import { DEFAULT_PRIVACY, markMutualConnections, type SocialUser } from './social';

describe('social & follow graph helpers', () => {
	it('marks mutual connections across following and followers lists', () => {
		const following: SocialUser[] = [
			{ uid: 'u1', name: 'Alice', handle: 'alice' },
			{ uid: 'u2', name: 'Bob', handle: 'bob' }
		];
		const followers: SocialUser[] = [
			{ uid: 'u2', name: 'Bob', handle: 'bob' },
			{ uid: 'u3', name: 'Charlie', handle: 'charlie' }
		];

		const res = markMutualConnections(following, followers);
		expect(res.mutual.map((u) => u.uid)).toEqual(['u2']);
		expect(res.following.find((u) => u.uid === 'u1')?.mutual).toBe(false);
		expect(res.following.find((u) => u.uid === 'u2')?.mutual).toBe(true);
		expect(res.followers.find((u) => u.uid === 'u3')?.mutual).toBe(false);
	});

	it('defaults all social privacy flags to enabled', () => {
		expect(DEFAULT_PRIVACY).toEqual({
			search: true,
			follow: true,
			board: true,
			onlineStatus: true
		});
	});
});
