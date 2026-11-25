import { connect } from './firebase';
import { logService } from '$lib/services/logService.svelte';
import type { Profile } from './account';

export const BOARD_LIMIT = 50;
export const BOARD_MIN_SCORE = 1;

export type LeaderSort = 'score' | 'wins' | 'winRate';

export interface Leader {
	uid: string;
	name: string;
	handle: string;
	score: number;
	wins?: number;
	losses?: number;
	plays?: number;
	winRate?: number;
	best?: number;
	country?: string;
	avatar?: string;
}

export interface LeaderStatsSummary {
	wins?: number;
	losses?: number;
	plays?: number;
	winRate?: number;
	best?: number;
}

export async function publishLeader(
	profile: Profile,
	score: number,
	stats?: LeaderStatsSummary
): Promise<boolean> {
	try {
		const { auth, uid, db } = await connect();
		if (auth.currentUser?.isAnonymous ?? true) return false;
		if (score < BOARD_MIN_SCORE || !profile.name || !profile.handle) return false;
		const { ref, serverTimestamp, set } = await import('firebase/database');
		await set(ref(db, `leaders/${uid}`), {
			name: profile.name,
			handle: profile.handle,
			score: Math.floor(score),
			...(stats?.wins !== undefined ? { wins: Math.max(0, Math.floor(stats.wins)) } : {}),
			...(stats?.losses !== undefined ? { losses: Math.max(0, Math.floor(stats.losses)) } : {}),
			...(stats?.plays !== undefined ? { plays: Math.max(0, Math.floor(stats.plays)) } : {}),
			...(stats?.winRate !== undefined
				? { winRate: Math.min(100, Math.max(0, Math.round(stats.winRate))) }
				: {}),
			...(stats?.best !== undefined ? { best: Math.max(0, Math.floor(stats.best)) } : {}),
			...(profile.country ? { country: profile.country } : {}),
			...(profile.avatar ? { avatar: profile.avatar } : {}),
			at: serverTimestamp()
		});
		return true;
	} catch (error) {
		logService.warn('network', 'leader row not published', { reason: String(error) });
		return false;
	}
}

export async function withdrawLeader(): Promise<void> {
	try {
		const { uid, db } = await connect();
		const { ref, remove } = await import('firebase/database');
		await remove(ref(db, `leaders/${uid}`));
	} catch (error) {
		logService.warn('network', 'leader row not withdrawn', { reason: String(error) });
	}
}

export async function topLeaders(): Promise<Leader[]> {
	try {
		const { db } = await connect();
		const { get, limitToLast, orderByChild, query, ref } = await import('firebase/database');
		const found = await get(
			query(ref(db, 'leaders'), orderByChild('score'), limitToLast(BOARD_LIMIT))
		);
		if (!found.exists()) return [];

		const rows: Leader[] = [];
		found.forEach((child) => {
			rows.push({ uid: child.key as string, ...(child.val() as Omit<Leader, 'uid'>) });
		});
		return rows.reverse();
	} catch (error) {
		logService.warn('network', 'leaders not read', { reason: String(error) });
		return [];
	}
}

export function sortLeaders(rows: readonly Leader[], sortBy: LeaderSort = 'score'): Leader[] {
	return [...rows].sort((a, b) => {
		if (sortBy === 'wins') {
			return (b.wins ?? 0) - (a.wins ?? 0) || b.score - a.score;
		}
		if (sortBy === 'winRate') {
			const rateA =
				a.winRate ?? (a.plays && a.plays > 0 ? Math.round(((a.wins ?? 0) / a.plays) * 100) : 0);
			const rateB =
				b.winRate ?? (b.plays && b.plays > 0 ? Math.round(((b.wins ?? 0) / b.plays) * 100) : 0);
			return rateB - rateA || (b.plays ?? 0) - (a.plays ?? 0) || b.score - a.score;
		}
		return b.score - a.score || (b.wins ?? 0) - (a.wins ?? 0);
	});
}

export function filterLeadersByCountry(rows: readonly Leader[], country?: string | null): Leader[] {
	const code = country?.trim().toLowerCase();
	if (!code) return [...rows];
	return rows.filter((row) => row.country?.trim().toLowerCase() === code);
}

export function findLeaderRank(
	rows: readonly Leader[],
	uid: string | null | undefined
): number | null {
	if (!uid) return null;
	const idx = rows.findIndex((r) => r.uid === uid);
	return idx >= 0 ? idx + 1 : null;
}
