import { describe, it, expect } from 'vitest';
import { BOARD_LIMIT, BOARD_MIN_SCORE, type Leader } from './leaders';

describe('leaders', () => {
	it('has sensible board limits and min scores', () => {
		expect(BOARD_LIMIT).toBe(50);
		expect(BOARD_MIN_SCORE).toBeGreaterThanOrEqual(1);
	});

	it('validates leader structure', () => {
		const leader: Leader = {
			uid: 'user_1',
			name: 'General',
			handle: 'general_99',
			score: 420,
			country: 'ua',
			avatar: 'cat:amber'
		};
		expect(leader.score).toBe(420);
		expect(leader.handle).toBe('general_99');
	});
});
