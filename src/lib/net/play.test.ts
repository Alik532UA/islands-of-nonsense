import { describe, it, expect } from 'vitest';
import { mergePlay, EMPTY_PLAY, type PlayData } from './play';

describe('play data', () => {
	it('merges empty plays deterministically', () => {
		const merged = mergePlay(null, null);
		expect(merged.score).toBe(0);
	});

	it('merges local and cloud play taking maximum values idempotently', () => {
		const local: PlayData = {
			score: 100,
			games: {
				castlefight: { best: 80, plays: 10, wins: 7 }
			}
		};
		const cloud: PlayData = {
			score: 150,
			games: {
				castlefight: { best: 120, plays: 8, wins: 5 }
			}
		};

		const merged = mergePlay(local, cloud);
		expect(merged.score).toBe(150);
		expect(merged.games.castlefight.best).toBe(120);
		expect(merged.games.castlefight.plays).toBe(10);
		expect(merged.games.castlefight.wins).toBe(7);

		// Idempotency: merging again produces identical result
		const twice = mergePlay(merged, cloud);
		expect(twice).toEqual(merged);
	});
});
