import { describe, it, expect } from 'vitest';
import { EMPTY_PLAY } from '$lib/net/play';
import {
	applyMatchToPlayData,
	buildLeaderStats,
	calculateMatchScoreDelta,
	exportHistoryCSV,
	exportHistoryJSON
} from './matchProgress.svelte';

describe('matchProgress service', () => {
	it('calculates higher match scores for online victories than solo defeats', () => {
		const onlineWin = calculateMatchScoreDelta({
			won: true,
			mode: 'online',
			unitsKilled: 40,
			damageToCastle: 2000,
			botDifficulty: 30,
			durationSec: 240
		});
		const soloLoss = calculateMatchScoreDelta({
			won: false,
			mode: 'solo',
			unitsKilled: 10,
			damageToCastle: 200,
			botDifficulty: 15,
			durationSec: 120
		});
		expect(onlineWin).toBeGreaterThan(soloLoss);
		expect(soloLoss).toBeGreaterThanOrEqual(10);
	});

	it('updates overall, per-mode buckets, streaks, and capped history deterministically', () => {
		const step1 = applyMatchToPlayData(EMPTY_PLAY, {
			matchKey: 'm_1',
			mode: 'online',
			won: true,
			unitsKilled: 30,
			damageToCastle: 1500,
			durationSec: 180,
			race: 'Орки',
			enemyRace: 'Альянс',
			westScore: 2,
			eastScore: 1,
			mvpBuilding: 'Барак'
		});
		expect(step1.playData.winStreak).toBe(1);
		expect(step1.playData.bestWinStreak).toBe(1);
		expect(step1.playData.games.castlefight.wins).toBe(1);
		expect(step1.playData.games.castlefight_online.wins).toBe(1);
		expect(step1.playData.history?.length).toBe(1);

		const step2 = applyMatchToPlayData(step1.playData, {
			matchKey: 'm_2',
			mode: 'solo',
			won: false,
			unitsKilled: 5,
			damageToCastle: 100,
			durationSec: 90
		});
		expect(step2.playData.winStreak).toBe(0);
		expect(step2.playData.bestWinStreak).toBe(1);
		expect(step2.playData.games.castlefight.plays).toBe(2);
		expect(step2.playData.games.castlefight.losses).toBe(1);
		expect(step2.playData.games.castlefight_solo.losses).toBe(1);

		const leaderStats = buildLeaderStats(step2.playData);
		expect(leaderStats.plays).toBe(2);
		expect(leaderStats.wins).toBe(1);
		expect(leaderStats.winRate).toBe(50);
	});

	it('exports match history to JSON and CSV safely', () => {
		const { playData } = applyMatchToPlayData(EMPTY_PLAY, {
			matchKey: 'exp_1',
			mode: 'solo',
			won: true,
			unitsKilled: 12,
			damageToCastle: 800,
			durationSec: 145,
			mvpBuilding: 'Башта "Грім"'
		});
		const json = exportHistoryJSON(playData.history ?? []);
		const csv = exportHistoryCSV(playData.history ?? []);
		expect(json).toContain('"exp_1"');
		expect(csv).toContain('id,at,mode,result,scoreDelta');
		expect(csv).toContain('"Башта ""Грім"""');
	});
});
