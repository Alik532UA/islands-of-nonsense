import { describe, it, expect } from 'vitest';
import { computeLevelProgress, titleLabel } from '$lib/config/rewards';
import { withAvatarFrame, parseAvatar } from '$lib/config/avatars';
import { EMPTY_PLAY, type PlayData } from '$lib/net/play';
import { EMPTY_REWARDS, mergeRewards } from '$lib/net/rewards';
import { applyMatchRewards, hasUnlockedGrant } from './rewardsService.svelte';

describe('rewards & progression system', () => {
	it('computes deterministic XP level progression', () => {
		expect(computeLevelProgress(0).level).toBe(1);
		expect(computeLevelProgress(100).level).toBe(2);
		expect(computeLevelProgress(400).level).toBe(3);
	});

	it('unlocks achievements, grants daily streak XP, and unlocks frames/titles', () => {
		const playData: PlayData = {
			...EMPTY_PLAY,
			score: 1200,
			bestWinStreak: 3,
			games: {
				castlefight: { best: 400, plays: 10, wins: 10, losses: 0, score: 1200 },
				castlefight_online: { best: 400, plays: 2, wins: 1, losses: 1, score: 400 }
			}
		};

		const day1 = Date.parse('2026-11-24T12:00:00Z');
		const res1 = applyMatchRewards(
			EMPTY_REWARDS,
			playData,
			{ won: true, mode: 'online', unitsKilled: 60, damageToCastle: 12000, race: 'Орки' },
			day1
		);

		expect(res1.dailyStreakBonus).toBe(true);
		expect(res1.rewards.dailyStreak).toBe(1);
		expect(res1.newlyUnlocked.some((a) => a.id === 'first_win')).toBe(true);
		expect(res1.newlyUnlocked.some((a) => a.id === 'veteran_10')).toBe(true);
		expect(res1.newlyUnlocked.some((a) => a.id === 'match_kills_50')).toBe(true);
		expect(hasUnlockedGrant(res1.rewards, 'frame', 'bronze')).toBe(true);
		expect(hasUnlockedGrant(res1.rewards, 'title', 'architect')).toBe(true);

		const day2 = Date.parse('2026-11-25T12:00:00Z');
		const res2 = applyMatchRewards(
			res1.rewards,
			playData,
			{ won: true, mode: 'solo', unitsKilled: 15, damageToCastle: 500, race: 'Альянс' },
			day2
		);
		expect(res2.rewards.dailyStreak).toBe(2);
		expect(res2.rewards.bestDailyStreak).toBe(2);
		expect(Object.keys(res2.rewards.totals.racesWon)).toHaveLength(2);
	});

	it('merges local and cloud rewards idempotently', () => {
		const a = {
			...EMPTY_REWARDS,
			xp: 250,
			dailyStreak: 2,
			bestDailyStreak: 4,
			lastPlayDay: '2026-11-24',
			unlocked: { first_win: 1000 },
			totals: { kills: 50, castleDamage: 2000, bestMatchKills: 20, racesWon: { Орки: true } }
		};
		const b = {
			...EMPTY_REWARDS,
			xp: 500,
			dailyStreak: 3,
			bestDailyStreak: 3,
			lastPlayDay: '2026-11-25',
			unlocked: { first_win: 900, online_duelist: 1200 },
			totals: { kills: 40, castleDamage: 5000, bestMatchKills: 30, racesWon: { Альянс: true } }
		};

		const merged = mergeRewards(a, b);
		expect(merged.xp).toBe(500);
		expect(merged.bestDailyStreak).toBe(4);
		expect(merged.unlocked.first_win).toBe(900);
		expect(merged.unlocked.online_duelist).toBe(1200);
		expect(merged.totals.kills).toBe(50);
		expect(merged.totals.castleDamage).toBe(5000);
		expect(Object.keys(merged.totals.racesWon)).toHaveLength(2);
	});

	it('applies unlocked frames onto existing avatars and resolves title labels', () => {
		const framed = withAvatarFrame('swords:emerald', 'gold');
		expect(parseAvatar(framed)?.frame).toBe('gold');
		expect(titleLabel('strategist', 'uk')).not.toBe('strategist');
		expect(titleLabel('strategist', 'en')).not.toBe('strategist');
	});
});
