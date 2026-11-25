import {
	EMPTY_PLAY,
	GAME_ID,
	GAME_ONLINE_ID,
	GAME_SOLO_ID,
	MATCH_HISTORY_LIMIT,
	mergePlay,
	writePlay,
	type GameRecord,
	type MatchHistoryEntry,
	type PlayData
} from '$lib/net/play';
import { publishLeader, type LeaderStatsSummary } from '$lib/net/leaders';
import { currentUserInfo, readProfile } from '$lib/net/account';
import { storage } from './storage';
import { logService } from './logService.svelte';

export const LOCAL_PLAY_KEY = 'play_data';
export const HIGH_SCORE_KEY = 'high_score';
export const MATCH_HISTORY_KEY = 'match_history';

export interface FinishedMatchInput {
	matchKey: string;
	mode: 'solo' | 'online' | 'daily';
	won: boolean;
	unitsKilled: number;
	damageToCastle: number;
	botDifficulty?: number;
	durationSec: number;
	race?: string;
	enemyRace?: string;
	westScore?: number;
	eastScore?: number;
	mvpBuilding?: string;
}

export interface RecordedMatchOutcome {
	playData: PlayData;
	entry: MatchHistoryEntry;
	scoreDelta: number;
	syncedCloud: boolean;
}

const recordedMatchKeys = new Set<string>();

export function calculateMatchScoreDelta(input: {
	won: boolean;
	mode: 'solo' | 'online' | 'daily';
	unitsKilled: number;
	damageToCastle: number;
	botDifficulty?: number;
	durationSec: number;
}): number {
	const base = input.won ? 120 : 30;
	const killPoints = Math.min(180, Math.floor(Math.max(0, input.unitsKilled) * 1.5));
	const castlePoints = Math.min(100, Math.floor(Math.max(0, input.damageToCastle) / 40));
	const diffBonus = input.won ? Math.min(80, Math.max(0, Math.round(input.botDifficulty ?? 0))) : 0;
	const modeMultiplier = input.mode === 'online' ? 1.5 : input.mode === 'daily' ? 1.35 : 1;
	return Math.max(10, Math.round((base + killPoints + castlePoints + diffBonus) * modeMultiplier));
}

export function getLocalPlayData(): PlayData {
	const raw = storage.getJSON<PlayData>(LOCAL_PLAY_KEY, EMPTY_PLAY);
	const legacyHistory = storage.getJSON<MatchHistoryEntry[]>(MATCH_HISTORY_KEY, []);
	if ((!raw.history || raw.history.length === 0) && legacyHistory.length > 0) {
		return mergePlay(raw, { ...EMPTY_PLAY, history: legacyHistory });
	}
	return mergePlay(raw, null);
}

export function saveLocalPlayData(data: PlayData): void {
	const clean = mergePlay(data, null);
	storage.setJSON(LOCAL_PLAY_KEY, clean);
	storage.setJSON(MATCH_HISTORY_KEY, clean.history ?? []);
	storage.set(HIGH_SCORE_KEY, String(clean.games[GAME_ID]?.wins ?? 0));
}

export function buildLeaderStats(playData: PlayData): LeaderStatsSummary {
	const overall = playData.games[GAME_ID] ?? { best: 0, plays: 0, wins: 0, losses: 0 };
	const plays = Math.max(overall.plays, overall.wins + (overall.losses ?? 0));
	const losses = overall.losses ?? Math.max(0, plays - overall.wins);
	const winRate = plays > 0 ? Math.round((overall.wins / plays) * 100) : 0;
	return {
		wins: overall.wins,
		losses,
		plays,
		winRate,
		best: overall.best
	};
}

function updateBucket(prev: GameRecord | undefined, won: boolean, scoreDelta: number): GameRecord {
	const base = prev ?? { best: 0, plays: 0, wins: 0, losses: 0, score: 0 };
	const wins = base.wins + (won ? 1 : 0);
	const losses = (base.losses ?? Math.max(0, base.plays - base.wins)) + (won ? 0 : 1);
	return {
		best: Math.max(base.best, scoreDelta),
		plays: base.plays + 1,
		wins,
		losses,
		score: (base.score ?? 0) + scoreDelta
	};
}

export function applyMatchToPlayData(
	current: PlayData,
	input: FinishedMatchInput
): { playData: PlayData; entry: MatchHistoryEntry; scoreDelta: number } {
	const scoreDelta = calculateMatchScoreDelta(input);
	const bucketKey = input.mode === 'online' ? GAME_ONLINE_ID : GAME_SOLO_ID;
	const winStreak = input.won ? (current.winStreak ?? 0) + 1 : 0;
	const bestWinStreak = Math.max(current.bestWinStreak ?? 0, winStreak);

	const entry: MatchHistoryEntry = {
		id: input.matchKey.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48) || `m_${Date.now()}`,
		at: Date.now(),
		mode: input.mode,
		result: input.won ? 'win' : 'loss',
		scoreDelta,
		...(input.race ? { race: input.race.slice(0, 32) } : {}),
		...(input.enemyRace ? { enemyRace: input.enemyRace.slice(0, 32) } : {}),
		...(input.westScore !== undefined ? { westScore: input.westScore } : {}),
		...(input.eastScore !== undefined ? { eastScore: input.eastScore } : {}),
		...(input.durationSec !== undefined
			? { durationSec: Math.max(0, Math.round(input.durationSec)) }
			: {}),
		...(input.unitsKilled !== undefined
			? { unitsKilled: Math.max(0, Math.round(input.unitsKilled)) }
			: {}),
		...(input.damageToCastle !== undefined
			? { damageToCastle: Math.max(0, Math.round(input.damageToCastle)) }
			: {}),
		...(input.mvpBuilding ? { mvpBuilding: input.mvpBuilding.slice(0, 48) } : {})
	};

	const next: PlayData = {
		score: current.score + scoreDelta,
		winStreak,
		bestWinStreak,
		games: {
			...current.games,
			[GAME_ID]: updateBucket(current.games[GAME_ID], input.won, scoreDelta),
			[bucketKey]: updateBucket(current.games[bucketKey], input.won, scoreDelta)
		},
		history: [entry, ...(current.history ?? []).filter((h) => h.id !== entry.id)].slice(
			0,
			MATCH_HISTORY_LIMIT
		)
	};

	return { playData: next, entry, scoreDelta };
}

export async function recordFinishedMatch(
	input: FinishedMatchInput
): Promise<RecordedMatchOutcome | null> {
	if (!input.matchKey || recordedMatchKeys.has(input.matchKey)) {
		return null;
	}
	recordedMatchKeys.add(input.matchKey);

	const current = getLocalPlayData();
	const { playData, entry, scoreDelta } = applyMatchToPlayData(current, input);
	saveLocalPlayData(playData);

	let syncedCloud = false;
	try {
		const info = await currentUserInfo();
		if (!info.isAnonymous) {
			syncedCloud = await writePlay(playData);
			const profile = await readProfile();
			if (profile && playData.score > 0) {
				await publishLeader(profile, playData.score, buildLeaderStats(playData));
			}
		}
	} catch (error) {
		logService.warn('stats', 'Cloud match progress sync failed', { reason: String(error) });
	}

	return { playData, entry, scoreDelta, syncedCloud };
}

export function exportHistoryJSON(history: readonly MatchHistoryEntry[]): string {
	return JSON.stringify(history, null, 2);
}

export function exportHistoryCSV(history: readonly MatchHistoryEntry[]): string {
	const header =
		'id,at,mode,result,scoreDelta,race,enemyRace,westScore,eastScore,durationSec,unitsKilled,damageToCastle,mvpBuilding';
	const rows = history.map((h) =>
		[
			h.id,
			new Date(h.at).toISOString(),
			h.mode,
			h.result,
			h.scoreDelta,
			h.race ?? '',
			h.enemyRace ?? '',
			h.westScore ?? '',
			h.eastScore ?? '',
			h.durationSec ?? '',
			h.unitsKilled ?? '',
			h.damageToCastle ?? '',
			`"${(h.mvpBuilding ?? '').replaceAll('"', '""')}"`
		].join(',')
	);
	return [header, ...rows].join('\n');
}
