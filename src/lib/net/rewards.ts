import { connect } from './firebase';
import { computeLevelProgress } from '$lib/config/rewards';
import { logService } from '$lib/services/logService.svelte';

export interface RewardsTotals {
	kills: number;
	castleDamage: number;
	bestMatchKills?: number;
	racesWon: Record<string, boolean>;
}

export interface RewardsData {
	xp: number;
	level: number;
	dailyStreak: number;
	bestDailyStreak: number;
	lastPlayDay?: string;
	equippedTitle?: string;
	unlocked: Record<string, number>;
	totals: RewardsTotals;
}

export const EMPTY_REWARDS: RewardsData = {
	xp: 0,
	level: 1,
	dailyStreak: 0,
	bestDailyStreak: 0,
	equippedTitle: 'recruit',
	unlocked: {},
	totals: {
		kills: 0,
		castleDamage: 0,
		bestMatchKills: 0,
		racesWon: {}
	}
};

function count(value: unknown): number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

export function sanitizeRewards(raw: unknown): RewardsData {
	if (typeof raw !== 'object' || raw === null) return structuredClone(EMPTY_REWARDS);
	const src = raw as Record<string, unknown>;
	const xp = count(src.xp);
	const level = computeLevelProgress(xp).level;

	const unlocked: Record<string, number> = {};
	if (typeof src.unlocked === 'object' && src.unlocked !== null) {
		for (const [k, v] of Object.entries(src.unlocked as Record<string, unknown>)) {
			if (/^[a-z0-9_]{1,32}$/.test(k)) {
				unlocked[k] = count(v);
			}
		}
	}

	const rawTotals =
		typeof src.totals === 'object' && src.totals !== null
			? (src.totals as Record<string, unknown>)
			: {};
	const racesWon: Record<string, boolean> = {};
	if (typeof rawTotals.racesWon === 'object' && rawTotals.racesWon !== null) {
		for (const [k, v] of Object.entries(rawTotals.racesWon as Record<string, unknown>)) {
			if (v === true && k.length > 0 && k.length <= 32) {
				racesWon[k] = true;
			}
		}
	}

	const dailyStreak = count(src.dailyStreak);
	const bestDailyStreak = Math.max(count(src.bestDailyStreak), dailyStreak);

	return {
		xp,
		level,
		dailyStreak,
		bestDailyStreak,
		...(typeof src.lastPlayDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(src.lastPlayDay)
			? { lastPlayDay: src.lastPlayDay }
			: {}),
		equippedTitle:
			typeof src.equippedTitle === 'string' && src.equippedTitle.length <= 32
				? src.equippedTitle
				: 'recruit',
		unlocked,
		totals: {
			kills: count(rawTotals.kills),
			castleDamage: count(rawTotals.castleDamage),
			bestMatchKills: count(rawTotals.bestMatchKills),
			racesWon
		}
	};
}

export function mergeRewards(local: RewardsData | null, cloud: RewardsData | null): RewardsData {
	const a = sanitizeRewards(local);
	const b = sanitizeRewards(cloud);
	const xp = Math.max(a.xp, b.xp);
	const unlocked: Record<string, number> = { ...a.unlocked };
	for (const [k, ts] of Object.entries(b.unlocked)) {
		unlocked[k] = unlocked[k] !== undefined ? Math.min(unlocked[k], ts) : ts;
	}
	const racesWon: Record<string, boolean> = { ...a.totals.racesWon, ...b.totals.racesWon };

	const useBDay = (b.lastPlayDay ?? '') > (a.lastPlayDay ?? '');
	const lastPlayDay = useBDay ? b.lastPlayDay : a.lastPlayDay;
	const dailyStreak = useBDay
		? b.dailyStreak
		: a.lastPlayDay === b.lastPlayDay
			? Math.max(a.dailyStreak, b.dailyStreak)
			: a.dailyStreak;
	const bestDailyStreak = Math.max(a.bestDailyStreak, b.bestDailyStreak, dailyStreak);

	return {
		xp,
		level: computeLevelProgress(xp).level,
		dailyStreak,
		bestDailyStreak,
		...(lastPlayDay ? { lastPlayDay } : {}),
		equippedTitle:
			b.equippedTitle && b.equippedTitle !== 'recruit' ? b.equippedTitle : a.equippedTitle,
		unlocked,
		totals: {
			kills: Math.max(a.totals.kills, b.totals.kills),
			castleDamage: Math.max(a.totals.castleDamage, b.totals.castleDamage),
			bestMatchKills: Math.max(a.totals.bestMatchKills ?? 0, b.totals.bestMatchKills ?? 0),
			racesWon
		}
	};
}

export async function readRewards(targetUid?: string): Promise<RewardsData | null> {
	try {
		const { uid, db } = await connect();
		const { get, ref } = await import('firebase/database');
		const snap = await get(ref(db, `users/${targetUid ?? uid}/rewards`));
		return snap.exists() ? sanitizeRewards(snap.val()) : null;
	} catch (error) {
		logService.warn('network', 'rewards not read', { reason: String(error) });
		return null;
	}
}

export async function writeRewards(data: RewardsData): Promise<boolean> {
	try {
		const { auth, uid, db } = await connect();
		if (auth.currentUser?.isAnonymous ?? true) return false;
		const { ref, serverTimestamp, set } = await import('firebase/database');
		const clean = sanitizeRewards(data);
		await set(ref(db, `users/${uid}/rewards`), {
			xp: clean.xp,
			level: clean.level,
			dailyStreak: clean.dailyStreak,
			bestDailyStreak: clean.bestDailyStreak,
			...(clean.lastPlayDay ? { lastPlayDay: clean.lastPlayDay } : {}),
			...(clean.equippedTitle ? { equippedTitle: clean.equippedTitle } : {}),
			...(Object.keys(clean.unlocked).length > 0 ? { unlocked: clean.unlocked } : {}),
			totals: {
				kills: clean.totals.kills,
				castleDamage: clean.totals.castleDamage,
				...(Object.keys(clean.totals.racesWon).length > 0
					? { racesWon: clean.totals.racesWon }
					: {})
			},
			at: serverTimestamp()
		});
		return true;
	} catch (error) {
		logService.warn('network', 'rewards not written', { reason: String(error) });
		return false;
	}
}
