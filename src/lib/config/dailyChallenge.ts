import { PLAYABLE_RACES } from '$lib/engine/gameData';
import type { SimulationConfig } from '$lib/engine/simulation';
import type { CoinMode } from '$lib/engine/constants';

export interface DailyChallengeSpec {
	dateKey: string; // UTC YYYY-MM-DD
	seed: number;
	westRace: string;
	eastRace: string;
	botDifficulty: 15 | 30 | 80;
	coinMode: CoinMode;
	startGold: number;
	config: SimulationConfig;
}

export interface DailyScoreInput {
	won: boolean;
	durationSec: number;
	castleHpRatio: number; // 0..1 remaining west castle HP
	botDifficulty: number;
	income: number;
}

export function getUtcDateKey(now: Date = new Date()): string {
	return now.toISOString().slice(0, 10);
}

function hashDateKey(dateKey: string): number {
	let h = 2166136261;
	for (let i = 0; i < dateKey.length; i++) {
		h ^= dateKey.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0 || 1;
}

function nextLcg(state: number): number {
	return (Math.imul(state, 1664525) + 1013904223) >>> 0 || 1;
}

export function getDailyChallengeSpec(now: Date = new Date()): DailyChallengeSpec {
	const dateKey = getUtcDateKey(now);
	const seed = hashDateKey(dateKey);
	let rng = seed;

	const westIdx = rng % PLAYABLE_RACES.length;
	rng = nextLcg(rng);
	let eastIdx = rng % PLAYABLE_RACES.length;
	if (eastIdx === westIdx) {
		eastIdx = (eastIdx + 1) % PLAYABLE_RACES.length;
	}
	rng = nextLcg(rng);

	const diffs: readonly (15 | 30 | 80)[] = [15, 30, 80];
	const botDifficulty = diffs[rng % diffs.length];
	rng = nextLcg(rng);

	const coins: readonly CoinMode[] = ['normal', 'crazy', 'normal'];
	const coinMode = coins[rng % coins.length];
	rng = nextLcg(rng);

	const golds = [400, 500, 650] as const;
	const startGold = golds[rng % golds.length];

	const westRace = PLAYABLE_RACES[westIdx];
	const eastRace = PLAYABLE_RACES[eastIdx];

	const config: SimulationConfig = {
		botDifficulty,
		startGold,
		modeId: 'daily',
		teamSize: 1,
		targetWins: 1,
		coinMode,
		coinSpawnInterval: coinMode === 'crazy' ? 20 : 40,
		coinCount: coinMode === 'crazy' ? 5 : 1,
		fogOfWar: true,
		botVsBot: false,
		westRace,
		eastRace,
		seed
	};

	return {
		dateKey,
		seed,
		westRace,
		eastRace,
		botDifficulty,
		coinMode,
		startGold,
		config
	};
}

export function calculateDailyScore(input: DailyScoreInput): number {
	if (!input.won) return 0;
	const base = 1000;
	const diffBonus = Math.round(input.botDifficulty * 10);
	const hpBonus = Math.round(Math.max(0, Math.min(1, input.castleHpRatio)) * 800);
	const speedBonus = Math.max(0, Math.round(1200 - input.durationSec * 1.5));
	const econBonus = Math.min(400, Math.max(0, Math.round(input.income * 4)));
	return Math.max(100, Math.min(100000, base + diffBonus + hpBonus + speedBonus + econBonus));
}
