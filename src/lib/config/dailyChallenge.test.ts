import { describe, it, expect } from 'vitest';
import { calculateDailyScore, getDailyChallengeSpec, getUtcDateKey } from './dailyChallenge';

describe('dailyChallenge config', () => {
	it('derives UTC date key deterministically', () => {
		const date = new Date('2026-11-25T23:59:59.000Z');
		expect(getUtcDateKey(date)).toBe('2026-11-25');
	});

	it('generates consistent daily spec for the same UTC day', () => {
		const a = getDailyChallengeSpec(new Date('2026-11-25T01:00:00.000Z'));
		const b = getDailyChallengeSpec(new Date('2026-11-25T22:30:00.000Z'));
		expect(a.dateKey).toBe(b.dateKey);
		expect(a.seed).toBe(b.seed);
		expect(a.westRace).toBe(b.westRace);
		expect(a.eastRace).toBe(b.eastRace);
		expect(a.westRace).not.toBe(a.eastRace);
		expect(a.config.modeId).toBe('daily');
		expect(a.config.targetWins).toBe(1);
	});

	it('varies challenge seed across different UTC days', () => {
		const d1 = getDailyChallengeSpec(new Date('2026-11-25T12:00:00.000Z'));
		const d2 = getDailyChallengeSpec(new Date('2026-11-26T12:00:00.000Z'));
		expect(d1.seed).not.toBe(d2.seed);
	});

	it('scores wins positively with difficulty, HP, speed, and zero for losses', () => {
		expect(
			calculateDailyScore({
				won: false,
				durationSec: 120,
				castleHpRatio: 0,
				botDifficulty: 30,
				income: 20
			})
		).toBe(0);

		const fastHard = calculateDailyScore({
			won: true,
			durationSec: 180,
			castleHpRatio: 0.9,
			botDifficulty: 80,
			income: 50
		});
		const slowEasy = calculateDailyScore({
			won: true,
			durationSec: 600,
			castleHpRatio: 0.2,
			botDifficulty: 15,
			income: 15
		});
		expect(fastHard).toBeGreaterThan(slowEasy);
		expect(fastHard).toBeLessThanOrEqual(100000);
	});
});
