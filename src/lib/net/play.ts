import { connect } from './firebase';
import { logService } from '$lib/services/logService.svelte';

export const GAME_ID = 'castlefight';

export interface GameRecord {
	best: number;
	plays: number;
	wins: number;
}

export interface PlayData {
	score: number;
	games: Record<string, GameRecord>;
}

export const EMPTY_PLAY: PlayData = {
	score: 0,
	games: {
		[GAME_ID]: { best: 0, plays: 0, wins: 0 }
	}
};

export function mergePlay(local: PlayData | null, cloud: PlayData | null): PlayData {
	const mine = local ?? EMPTY_PLAY;
	const theirs = cloud ?? EMPTY_PLAY;
	const games: Record<string, GameRecord> = {};

	for (const id of new Set([...Object.keys(mine.games), ...Object.keys(theirs.games)])) {
		const a = mine.games[id];
		const b = theirs.games[id];
		games[id] = {
			best: Math.max(a?.best ?? 0, b?.best ?? 0),
			plays: Math.max(a?.plays ?? 0, b?.plays ?? 0),
			wins: Math.max(a?.wins ?? 0, b?.wins ?? 0)
		};
	}

	return { score: Math.max(mine.score, theirs.score), games };
}

function count(value: unknown): number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function sanitize(raw: unknown): PlayData | null {
	if (typeof raw !== 'object' || raw === null) return null;
	const source = raw as { score?: unknown; games?: unknown };
	const games: Record<string, GameRecord> = {};

	if (typeof source.games === 'object' && source.games !== null) {
		for (const [id, value] of Object.entries(source.games as Record<string, unknown>)) {
			const record = value as { best?: unknown; plays?: unknown; wins?: unknown };
			games[id] = {
				best: count(record?.best),
				plays: count(record?.plays),
				wins: count(record?.wins)
			};
		}
	}

	return { score: count(source.score), games };
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
		const { uid, db } = await connect();
		const { ref, serverTimestamp, set } = await import('firebase/database');
		await set(ref(db, `users/${uid}/play`), {
			score: data.score,
			games: data.games,
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
