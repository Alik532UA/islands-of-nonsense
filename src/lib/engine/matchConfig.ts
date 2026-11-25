import type { SimulationConfig } from './simulation';
import type { CoinMode } from './constants';
import { PLAYABLE_RACES } from './gameData';
import { getDailyChallengeSpec } from '$lib/config/dailyChallenge';

export type QuickModeKey = 'vsBot' | 'sandbox' | 'botVsBot';

export const QUICK_DIFFICULTIES = [0, 15, 30, 80] as const;
export const QUICK_GOLDS = [150, 300, 500, 1000] as const;
export const QUICK_SANDBOX_GOLDS = [99999, 1000, 500, 150] as const;
export const QUICK_COIN_MODES: readonly CoinMode[] = ['normal', 'crazy', 'none'] as const;
export const QUICK_TEAM_SIZES: readonly (1 | 2 | 3)[] = [1, 2, 3] as const;
export const QUICK_TARGET_WINS: readonly (1 | 2 | 3)[] = [1, 2, 3] as const;
export const QUICK_FOG_OPTIONS: readonly boolean[] = [true, false] as const;

export const QUICK_PLAYER_RACES = [
	{ id: 'in_game', label: 'В грі (15с)' },
	{ id: 'random', label: 'Випадкова' },
	...PLAYABLE_RACES.map((race) => ({ id: race, label: race }))
] as const;

export const QUICK_BOT_RACES = [
	{ id: 'random', label: 'Випадкова' },
	...PLAYABLE_RACES.map((race) => ({ id: race, label: race }))
] as const;

export interface QuickSettingsState {
	vsBotDiffIndex: number;
	vsBotGoldIndex: number;
	vsBotTeamIndex: number;
	vsBotWinsIndex: number;
	vsBotWestRaceIndex: number;
	vsBotEastRaceIndex: number;
	vsBotCoinIndex: number;
	vsBotFogIndex: number;

	sandboxGoldIndex: number;
	sandboxCoinIndex: number;
	sandboxFogIndex: number;
	sandboxDiffIndex: number;
	sandboxTeamIndex: number;
	sandboxWinsIndex: number;
	sandboxWestRaceIndex: number;
	sandboxEastRaceIndex: number;

	botVsBotTeamIndex: number;
	botVsBotDiffIndex: number;
	botVsBotGoldIndex: number;
	botVsBotWinsIndex: number;
	botVsBotWestRaceIndex: number;
	botVsBotEastRaceIndex: number;
	botVsBotCoinIndex: number;
	botVsBotFogIndex: number;
}

export function getDefaultQuickSettingsState(): QuickSettingsState {
	return {
		vsBotDiffIndex: 1, // 15%
		vsBotGoldIndex: 2, // 500g
		vsBotTeamIndex: 0, // 1v1
		vsBotWinsIndex: 1, // До 2
		vsBotWestRaceIndex: 0, // in_game
		vsBotEastRaceIndex: 0, // random
		vsBotCoinIndex: 0, // normal (40s)
		vsBotFogIndex: 0, // true

		sandboxGoldIndex: 0, // 99999
		sandboxCoinIndex: 1, // crazy
		sandboxFogIndex: 1, // false
		sandboxDiffIndex: 0, // 0%
		sandboxTeamIndex: 0, // 1v1
		sandboxWinsIndex: 1, // До 2
		sandboxWestRaceIndex: 0, // in_game
		sandboxEastRaceIndex: 0, // random

		botVsBotTeamIndex: 0, // 1v1
		botVsBotDiffIndex: 1, // 15%
		botVsBotGoldIndex: 2, // 500g
		botVsBotWinsIndex: 1, // До 2
		botVsBotWestRaceIndex: 0, // random
		botVsBotEastRaceIndex: 0, // random
		botVsBotCoinIndex: 0, // normal (40s)
		botVsBotFogIndex: 1 // false
	};
}

function clampIndex(value: unknown, length: number, fallback: number): number {
	if (typeof value !== 'number' || !Number.isInteger(value)) return fallback;
	if (value < 0 || value >= length) return fallback;
	return value;
}

export function sanitizeQuickSettingsState(
	raw: Partial<QuickSettingsState> | null | undefined
): QuickSettingsState {
	const d = getDefaultQuickSettingsState();
	if (!raw || typeof raw !== 'object') return d;
	return {
		vsBotDiffIndex: clampIndex(raw.vsBotDiffIndex, QUICK_DIFFICULTIES.length, d.vsBotDiffIndex),
		vsBotGoldIndex: clampIndex(raw.vsBotGoldIndex, QUICK_GOLDS.length, d.vsBotGoldIndex),
		vsBotTeamIndex: clampIndex(raw.vsBotTeamIndex, QUICK_TEAM_SIZES.length, d.vsBotTeamIndex),
		vsBotWinsIndex: clampIndex(raw.vsBotWinsIndex, QUICK_TARGET_WINS.length, d.vsBotWinsIndex),
		vsBotWestRaceIndex: clampIndex(
			raw.vsBotWestRaceIndex,
			QUICK_PLAYER_RACES.length,
			d.vsBotWestRaceIndex
		),
		vsBotEastRaceIndex: clampIndex(
			raw.vsBotEastRaceIndex,
			QUICK_BOT_RACES.length,
			d.vsBotEastRaceIndex
		),
		vsBotCoinIndex: clampIndex(raw.vsBotCoinIndex, QUICK_COIN_MODES.length, d.vsBotCoinIndex),
		vsBotFogIndex: clampIndex(raw.vsBotFogIndex, QUICK_FOG_OPTIONS.length, d.vsBotFogIndex),

		sandboxGoldIndex: clampIndex(
			raw.sandboxGoldIndex,
			QUICK_SANDBOX_GOLDS.length,
			d.sandboxGoldIndex
		),
		sandboxCoinIndex: clampIndex(raw.sandboxCoinIndex, QUICK_COIN_MODES.length, d.sandboxCoinIndex),
		sandboxFogIndex: clampIndex(raw.sandboxFogIndex, QUICK_FOG_OPTIONS.length, d.sandboxFogIndex),
		sandboxDiffIndex: clampIndex(
			raw.sandboxDiffIndex,
			QUICK_DIFFICULTIES.length,
			d.sandboxDiffIndex
		),
		sandboxTeamIndex: clampIndex(raw.sandboxTeamIndex, QUICK_TEAM_SIZES.length, d.sandboxTeamIndex),
		sandboxWinsIndex: clampIndex(
			raw.sandboxWinsIndex,
			QUICK_TARGET_WINS.length,
			d.sandboxWinsIndex
		),
		sandboxWestRaceIndex: clampIndex(
			raw.sandboxWestRaceIndex,
			QUICK_PLAYER_RACES.length,
			d.sandboxWestRaceIndex
		),
		sandboxEastRaceIndex: clampIndex(
			raw.sandboxEastRaceIndex,
			QUICK_BOT_RACES.length,
			d.sandboxEastRaceIndex
		),

		botVsBotTeamIndex: clampIndex(
			raw.botVsBotTeamIndex,
			QUICK_TEAM_SIZES.length,
			d.botVsBotTeamIndex
		),
		botVsBotDiffIndex: clampIndex(
			raw.botVsBotDiffIndex,
			QUICK_DIFFICULTIES.length,
			d.botVsBotDiffIndex
		),
		botVsBotGoldIndex: clampIndex(raw.botVsBotGoldIndex, QUICK_GOLDS.length, d.botVsBotGoldIndex),
		botVsBotWinsIndex: clampIndex(
			raw.botVsBotWinsIndex,
			QUICK_TARGET_WINS.length,
			d.botVsBotWinsIndex
		),
		botVsBotWestRaceIndex: clampIndex(
			raw.botVsBotWestRaceIndex,
			QUICK_BOT_RACES.length,
			d.botVsBotWestRaceIndex
		),
		botVsBotEastRaceIndex: clampIndex(
			raw.botVsBotEastRaceIndex,
			QUICK_BOT_RACES.length,
			d.botVsBotEastRaceIndex
		),
		botVsBotCoinIndex: clampIndex(
			raw.botVsBotCoinIndex,
			QUICK_COIN_MODES.length,
			d.botVsBotCoinIndex
		),
		botVsBotFogIndex: clampIndex(raw.botVsBotFogIndex, QUICK_FOG_OPTIONS.length, d.botVsBotFogIndex)
	};
}

export function getCoinDefaultsForMode(coinMode: CoinMode): {
	coinSpawnInterval: number;
	coinCount: number;
} {
	if (coinMode === 'crazy') return { coinSpawnInterval: 20, coinCount: 5 };
	if (coinMode === 'none') return { coinSpawnInterval: 40, coinCount: 0 };
	return { coinSpawnInterval: 40, coinCount: 1 };
}

export function buildQuickMatchConfig(
	mode: QuickModeKey,
	state: QuickSettingsState
): SimulationConfig {
	const s = sanitizeQuickSettingsState(state);
	if (mode === 'sandbox') {
		const coinMode = QUICK_COIN_MODES[s.sandboxCoinIndex];
		const coinDefaults = getCoinDefaultsForMode(coinMode);
		return {
			botDifficulty: QUICK_DIFFICULTIES[s.sandboxDiffIndex],
			startGold: QUICK_SANDBOX_GOLDS[s.sandboxGoldIndex],
			modeId: 'sandbox',
			teamSize: QUICK_TEAM_SIZES[s.sandboxTeamIndex],
			targetWins: QUICK_TARGET_WINS[s.sandboxWinsIndex],
			coinMode,
			...coinDefaults,
			fogOfWar: QUICK_FOG_OPTIONS[s.sandboxFogIndex],
			botVsBot: false,
			westRace: QUICK_PLAYER_RACES[s.sandboxWestRaceIndex].id,
			eastRace: QUICK_BOT_RACES[s.sandboxEastRaceIndex].id
		};
	}

	if (mode === 'botVsBot') {
		const coinMode = QUICK_COIN_MODES[s.botVsBotCoinIndex];
		const coinDefaults = getCoinDefaultsForMode(coinMode);
		return {
			botDifficulty: QUICK_DIFFICULTIES[s.botVsBotDiffIndex],
			startGold: QUICK_GOLDS[s.botVsBotGoldIndex],
			modeId: 'standard',
			teamSize: QUICK_TEAM_SIZES[s.botVsBotTeamIndex],
			targetWins: QUICK_TARGET_WINS[s.botVsBotWinsIndex],
			coinMode,
			...coinDefaults,
			fogOfWar: QUICK_FOG_OPTIONS[s.botVsBotFogIndex],
			botVsBot: true,
			westRace: QUICK_BOT_RACES[s.botVsBotWestRaceIndex].id,
			eastRace: QUICK_BOT_RACES[s.botVsBotEastRaceIndex].id
		};
	}

	const coinMode = QUICK_COIN_MODES[s.vsBotCoinIndex];
	const coinDefaults = getCoinDefaultsForMode(coinMode);
	return {
		botDifficulty: QUICK_DIFFICULTIES[s.vsBotDiffIndex],
		startGold: QUICK_GOLDS[s.vsBotGoldIndex],
		modeId: 'standard',
		teamSize: QUICK_TEAM_SIZES[s.vsBotTeamIndex],
		targetWins: QUICK_TARGET_WINS[s.vsBotWinsIndex],
		coinMode,
		...coinDefaults,
		fogOfWar: QUICK_FOG_OPTIONS[s.vsBotFogIndex],
		botVsBot: false,
		westRace: QUICK_PLAYER_RACES[s.vsBotWestRaceIndex].id,
		eastRace: QUICK_BOT_RACES[s.vsBotEastRaceIndex].id
	};
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
	const result: Partial<T> = {};
	for (const key of Object.keys(obj) as (keyof T)[]) {
		if (obj[key] !== undefined) {
			result[key] = obj[key];
		}
	}
	return result;
}

/**
 * Resolves the effective SimulationConfig on `/play/battle` mount, respecting both
 * explicit URL mode presets (if navigated directly) and persisted quick/custom settings.
 */
export function resolveBattleLaunchConfig(
	urlMode: string | null | undefined,
	saved?: Partial<SimulationConfig> | null
): SimulationConfig {
	const rawSaved = saved && typeof saved === 'object' ? stripUndefined(saved) : {};
	const normalizedModeId = rawSaved.modeId === 'botVsBot' ? 'standard' : rawSaved.modeId;
	const savedBotVsBot = rawSaved.botVsBot ?? (rawSaved.modeId === 'botVsBot' ? true : undefined);
	const cleanSaved: Partial<SimulationConfig> = {
		...rawSaved,
		...(normalizedModeId !== undefined ? { modeId: normalizedModeId } : {}),
		...(savedBotVsBot !== undefined ? { botVsBot: savedBotVsBot } : {})
	};

	if (urlMode === 'daily') {
		return getDailyChallengeSpec().config;
	}

	if (urlMode === 'sandbox') {
		const defaults: SimulationConfig = {
			botDifficulty: 0,
			startGold: 99999,
			modeId: 'sandbox',
			teamSize: 1,
			targetWins: 10,
			coinMode: 'crazy',
			coinSpawnInterval: 20,
			coinCount: 5,
			fogOfWar: false,
			botVsBot: false
		};
		const isCompatible = cleanSaved.modeId === 'sandbox' && !cleanSaved.botVsBot;
		return isCompatible ? { ...defaults, ...cleanSaved, modeId: 'sandbox' } : defaults;
	}

	if (urlMode === 'botVsBot') {
		const defaults: SimulationConfig = {
			botDifficulty: 20,
			startGold: 500,
			modeId: 'standard',
			teamSize: 1,
			targetWins: 2,
			coinMode: 'normal',
			coinSpawnInterval: 40,
			coinCount: 1,
			fogOfWar: false,
			botVsBot: true
		};
		const isCompatible = cleanSaved.botVsBot === true;
		return isCompatible ? { ...defaults, ...cleanSaved, botVsBot: true } : defaults;
	}

	if (urlMode === 'allRandom') {
		const defaults: SimulationConfig = {
			botDifficulty: 15,
			startGold: 500,
			modeId: 'allRandom',
			allRandom: true,
			westRace: 'random',
			teamSize: 1,
			targetWins: 2,
			coinMode: 'normal',
			coinSpawnInterval: 40,
			coinCount: 1,
			fogOfWar: true,
			botVsBot: false
		};
		const isCompatible = cleanSaved.allRandom === true || cleanSaved.modeId === 'allRandom';
		return isCompatible ? { ...defaults, ...cleanSaved, allRandom: true } : defaults;
	}

	if (urlMode === 'vsBot') {
		const defaults: SimulationConfig = {
			botDifficulty: 15,
			startGold: 500,
			modeId: 'standard',
			teamSize: 1,
			targetWins: 2,
			coinMode: 'normal',
			coinSpawnInterval: 40,
			coinCount: 1,
			fogOfWar: true,
			botVsBot: false
		};
		const isCompatible = !cleanSaved.botVsBot && cleanSaved.modeId !== 'sandbox';
		return isCompatible ? { ...defaults, ...cleanSaved, botVsBot: false } : defaults;
	}

	const defaults: SimulationConfig = {
		botDifficulty: 15,
		startGold: 500,
		modeId: 'standard',
		teamSize: 1,
		targetWins: 2,
		coinMode: 'normal',
		coinSpawnInterval: 40,
		coinCount: 1,
		fogOfWar: true,
		botVsBot: false
	};

	return {
		...defaults,
		...cleanSaved,
		teamSize: typeof cleanSaved.teamSize === 'number' ? cleanSaved.teamSize : defaults.teamSize
	};
}
