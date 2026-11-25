import { connect } from './firebase';
import { readProfile } from './account';
import { getDailyChallengeSpec, type DailyChallengeSpec } from '$lib/config/dailyChallenge';
import { storage } from '$lib/services/storage';
import { logService } from '$lib/services/logService.svelte';

export interface DailyEntry {
	uid: string;
	name: string;
	avatar?: string;
	race?: string;
	score: number;
	durationSec?: number;
	at?: number;
}

export interface LocalDailyBest {
	dateKey: string;
	bestScore: number;
	durationSec: number;
	race: string;
}

const LOCAL_DAILY_KEY = 'daily_challenge_best';

export function getLocalDailyBest(
	dateKey: string = getDailyChallengeSpec().dateKey
): LocalDailyBest | null {
	const saved = storage.getJSON<LocalDailyBest | null>(LOCAL_DAILY_KEY, null);
	if (!saved || saved.dateKey !== dateKey) return null;
	return saved;
}

export async function fetchDailyBoard(
	dateKey: string = getDailyChallengeSpec().dateKey
): Promise<DailyEntry[]> {
	try {
		const { db } = await connect();
		const { get, limitToLast, orderByChild, query, ref } = await import('firebase/database');
		const found = await get(
			query(ref(db, `daily/${dateKey}`), orderByChild('score'), limitToLast(30))
		);
		if (!found.exists()) return [];
		const rows: DailyEntry[] = [];
		found.forEach((child) => {
			rows.push({ uid: child.key as string, ...(child.val() as Omit<DailyEntry, 'uid'>) });
		});
		return rows.reverse();
	} catch (err) {
		logService.warn('network', 'daily board fetch failed', { err: String(err) });
		return [];
	}
}

export async function submitDailyResult(
	spec: DailyChallengeSpec,
	metrics: { score: number; durationSec: number; race: string }
): Promise<{ savedLocal: boolean; savedCloud: boolean }> {
	const cleanScore = Math.max(1, Math.min(100000, Math.floor(metrics.score)));
	const cleanDuration = Math.max(0, Math.min(86400, Math.round(metrics.durationSec)));

	const prev = getLocalDailyBest(spec.dateKey);
	let savedLocal = false;
	if (!prev || cleanScore > prev.bestScore) {
		savedLocal = storage.setJSON<LocalDailyBest>(LOCAL_DAILY_KEY, {
			dateKey: spec.dateKey,
			bestScore: cleanScore,
			durationSec: cleanDuration,
			race: metrics.race.slice(0, 32)
		});
	}

	let savedCloud = false;
	try {
		const { auth, uid, db } = await connect();
		if (!(auth.currentUser?.isAnonymous ?? true)) {
			const { get, ref, serverTimestamp, set } = await import('firebase/database');
			const existingSnap = await get(ref(db, `daily/${spec.dateKey}/${uid}/score`));
			const existingScore = existingSnap.exists() ? Number(existingSnap.val()) : 0;
			if (cleanScore > existingScore) {
				const prof = await readProfile();
				const displayName = (prof?.name || auth.currentUser?.displayName || 'Гравець').slice(0, 48);
				await set(ref(db, `daily/${spec.dateKey}/${uid}`), {
					uid,
					name: displayName,
					...(prof?.avatar ? { avatar: prof.avatar.slice(0, 4096) } : {}),
					race: metrics.race.slice(0, 32),
					score: cleanScore,
					durationSec: cleanDuration,
					at: serverTimestamp()
				});
				savedCloud = true;
			}
		}
	} catch (err) {
		logService.warn('network', 'daily result submit failed', { err: String(err) });
	}

	return { savedLocal, savedCloud };
}
