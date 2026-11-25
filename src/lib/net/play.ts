import { connect } from './firebase';
import { logService } from '$lib/services/logService.svelte';

export const GAME_ID = 'castlefight';
export const GAME_ONLINE_ID = 'castlefight_online';
export const GAME_SOLO_ID = 'castlefight_solo';
export const MATCH_HISTORY_LIMIT = 25;

export interface GameRecord {
	best: number;
	plays: number;
	wins: number;
	losses?: number;
	score?: number;
}

export interface MatchHistoryEntry {
	id: string;
	at: number;
	mode: 'solo' | 'online' | 'daily';
	result: 'win' | 'loss';
	scoreDelta: number;
	race?: string;
	enemyRace?: string;
	westScore?: number;
	eastScore?: number;
	durationSec?: number;
	unitsKilled?: number;
	damageToCastle?: number;
	mvpBuilding?: string;
}

export interface PlayData {
	score: number;
	winStreak?: number;
	bestWinStreak?: number;
	games: Record<string, GameRecord>;
	history?: MatchHistoryEntry[];
}

export const EMPTY_PLAY: PlayData = {
	score: 0,
	winStreak: 0,
	bestWinStreak: 0,
	games: {
		[GAME_ID]: { best: 0, plays: 0, wins: 0, losses: 0, score: 0 }
	},
	history: []
};

function count(value: unknown): number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function mergeHistory(
	a: readonly MatchHistoryEntry[] | undefined,
	b: readonly MatchHistoryEntry[] | undefined
): MatchHistoryEntry[] {
	const byId = new Map<string, MatchHistoryEntry>();
	for (const item of [...(a ?? []), ...(b ?? [])]) {
		if (!item || typeof item.id !== 'string' || !item.id) continue;
		const existing = byId.get(item.id);
		if (!existing || item.at > existing.at) {
			byId.set(item.id, item);
		}
	}
	return [...byId.values()].sort((x, y) => y.at - x.at).slice(0, MATCH_HISTORY_LIMIT);
}

export function mergePlay(local: PlayData | null, cloud: PlayData | null): PlayData {
	const mine = local ?? EMPTY_PLAY;
	const theirs = cloud ?? EMPTY_PLAY;
	const games: Record<string, GameRecord> = {};

	for (const id of new Set([...Object.keys(mine.games), ...Object.keys(theirs.games)])) {
		const a = mine.games[id];
		const b = theirs.games[id];
		const wins = Math.max(a?.wins ?? 0, b?.wins ?? 0);
		const losses = Math.max(a?.losses ?? 0, b?.losses ?? 0);
		const plays = Math.max(a?.plays ?? 0, b?.plays ?? 0, wins + losses);
		games[id] = {
			best: Math.max(a?.best ?? 0, b?.best ?? 0),
			plays,
			wins,
			...(losses > 0 || a?.losses !== undefined || b?.losses !== undefined ? { losses } : {}),
			...(a?.score !== undefined || b?.score !== undefined
				? { score: Math.max(a?.score ?? 0, b?.score ?? 0) }
				: {})
		};
	}

	const minePlays = mine.games[GAME_ID]?.plays ?? 0;
	const theirPlays = theirs.games[GAME_ID]?.plays ?? 0;
	const mergedWinStreak =
		minePlays > theirPlays
			? count(mine.winStreak)
			: theirPlays > minePlays
				? count(theirs.winStreak)
				: Math.max(count(mine.winStreak), count(theirs.winStreak));
	const bestWinStreak = Math.max(
		count(mine.bestWinStreak),
		count(theirs.bestWinStreak),
		mergedWinStreak
	);
	const mergedHistory = mergeHistory(mine.history, theirs.history);

	return {
		score: Math.max(mine.score, theirs.score),
		...(mergedWinStreak > 0 || mine.winStreak !== undefined || theirs.winStreak !== undefined
			? { winStreak: mergedWinStreak }
			: {}),
		...(bestWinStreak > 0 || mine.bestWinStreak !== undefined || theirs.bestWinStreak !== undefined
			? { bestWinStreak }
			: {}),
		games,
		...(mergedHistory.length > 0 || mine.history !== undefined || theirs.history !== undefined
			? { history: mergedHistory }
			: {})
	};
}

function sanitizeHistoryEntry(raw: unknown): MatchHistoryEntry | null {
	if (typeof raw !== 'object' || raw === null) return null;
	const r = raw as Record<string, unknown>;
	if (typeof r.id !== 'string' || !r.id) return null;
	const mode = r.mode === 'online' || r.mode === 'daily' ? r.mode : 'solo';
	const result = r.result === 'win' ? 'win' : 'loss';
	return {
		id: r.id.slice(0, 48),
		at: count(r.at),
		mode,
		result,
		scoreDelta: count(r.scoreDelta),
		...(typeof r.race === 'string' && r.race ? { race: r.race.slice(0, 32) } : {}),
		...(typeof r.enemyRace === 'string' && r.enemyRace
			? { enemyRace: r.enemyRace.slice(0, 32) }
			: {}),
		...(typeof r.westScore === 'number' ? { westScore: count(r.westScore) } : {}),
		...(typeof r.eastScore === 'number' ? { eastScore: count(r.eastScore) } : {}),
		...(typeof r.durationSec === 'number' ? { durationSec: count(r.durationSec) } : {}),
		...(typeof r.unitsKilled === 'number' ? { unitsKilled: count(r.unitsKilled) } : {}),
		...(typeof r.damageToCastle === 'number' ? { damageToCastle: count(r.damageToCastle) } : {}),
		...(typeof r.mvpBuilding === 'string' && r.mvpBuilding
			? { mvpBuilding: r.mvpBuilding.slice(0, 48) }
			: {})
	};
}

function sanitize(raw: unknown): PlayData | null {
	if (typeof raw !== 'object' || raw === null) return null;
	const source = raw as {
		score?: unknown;
		winStreak?: unknown;
		bestWinStreak?: unknown;
		games?: unknown;
		history?: unknown;
	};
	const games: Record<string, GameRecord> = {};

	if (typeof source.games === 'object' && source.games !== null) {
		for (const [id, value] of Object.entries(source.games as Record<string, unknown>)) {
			const record = value as {
				best?: unknown;
				plays?: unknown;
				wins?: unknown;
				losses?: unknown;
				score?: unknown;
			};
			const wins = count(record?.wins);
			const losses = count(record?.losses);
			const plays = Math.max(count(record?.plays), wins + losses);
			games[id] = {
				best: count(record?.best),
				plays,
				wins,
				losses,
				score: count(record?.score)
			};
		}
	}

	const history: MatchHistoryEntry[] = [];
	if (typeof source.history === 'object' && source.history !== null) {
		const values = Array.isArray(source.history)
			? source.history
			: Object.values(source.history as Record<string, unknown>);
		for (const item of values) {
			const clean = sanitizeHistoryEntry(item);
			if (clean) history.push(clean);
		}
	}
	history.sort((a, b) => b.at - a.at);

	return {
		score: count(source.score),
		winStreak: count(source.winStreak),
		bestWinStreak: count(source.bestWinStreak),
		games,
		history: history.slice(0, MATCH_HISTORY_LIMIT)
	};
}

function serializeGamesForCloud(games: Record<string, GameRecord>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [id, rec] of Object.entries(games)) {
		const wins = count(rec.wins);
		const plays = Math.max(count(rec.plays), wins);
		const losses = rec.losses !== undefined ? count(rec.losses) : Math.max(0, plays - wins);
		out[id] = {
			wins,
			losses,
			plays,
			best: count(rec.best),
			score: count(rec.score ?? rec.best)
		};
	}
	return out;
}

function serializeHistoryForCloud(
	history: readonly MatchHistoryEntry[] | undefined
): Record<string, MatchHistoryEntry> | undefined {
	if (!history || history.length === 0) return undefined;
	const out: Record<string, MatchHistoryEntry> = {};
	for (const item of history.slice(0, MATCH_HISTORY_LIMIT)) {
		const safeId = item.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48);
		if (!safeId) continue;
		out[safeId] = {
			id: safeId,
			at: count(item.at),
			mode: item.mode,
			result: item.result,
			scoreDelta: count(item.scoreDelta),
			...(item.race ? { race: item.race.slice(0, 32) } : {}),
			...(item.enemyRace ? { enemyRace: item.enemyRace.slice(0, 32) } : {}),
			...(item.westScore !== undefined ? { westScore: count(item.westScore) } : {}),
			...(item.eastScore !== undefined ? { eastScore: count(item.eastScore) } : {}),
			...(item.durationSec !== undefined ? { durationSec: count(item.durationSec) } : {}),
			...(item.unitsKilled !== undefined ? { unitsKilled: count(item.unitsKilled) } : {}),
			...(item.damageToCastle !== undefined ? { damageToCastle: count(item.damageToCastle) } : {}),
			...(item.mvpBuilding ? { mvpBuilding: item.mvpBuilding.slice(0, 48) } : {})
		};
	}
	return Object.keys(out).length > 0 ? out : undefined;
}

export async function readPlay(): Promise<PlayData | null> {
	try {
		const { uid, db } = await connect();
		const { get, ref } = await import('firebase/database');
		const snapshot = await get(ref(db, `users/${uid}/play`));
		return snapshot.exists() ? sanitize(snapshot.val()) : null;
	} catch (error) {
		logService.warn('network', 'play data not read', { reason: String(error) });
		return null;
	}
}

export async function writePlay(data: PlayData): Promise<boolean> {
	try {
		const { auth, uid, db } = await connect();
		if (auth.currentUser?.isAnonymous ?? true) return false;
		const { ref, serverTimestamp, set } = await import('firebase/database');
		const historyMap = serializeHistoryForCloud(data.history);
		await set(ref(db, `users/${uid}/play`), {
			score: count(data.score),
			winStreak: count(data.winStreak),
			bestWinStreak: count(data.bestWinStreak),
			games: serializeGamesForCloud(data.games),
			...(historyMap ? { history: historyMap } : {}),
			at: serverTimestamp()
		});
		return true;
	} catch (error) {
		logService.warn('network', 'play data not written', { reason: String(error) });
		return false;
	}
}

export async function watchPlay(onData: (data: PlayData | null) => void): Promise<() => void> {
	try {
		const { uid, db } = await connect();
		const { onValue, ref } = await import('firebase/database');
		return onValue(
			ref(db, `users/${uid}/play`),
			(snapshot) => onData(snapshot.exists() ? sanitize(snapshot.val()) : null),
			(error) => logService.warn('network', 'play listener cancelled', { reason: String(error) })
		);
	} catch (error) {
		logService.warn('network', 'play data not watched', { reason: String(error) });
		return () => {};
	}
}
