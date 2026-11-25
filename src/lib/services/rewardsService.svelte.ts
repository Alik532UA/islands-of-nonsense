import { ACHIEVEMENTS, computeLevelProgress, type AchievementDef } from '$lib/config/rewards';
import { formatRaceName } from '$lib/engine/gameData';
import { GAME_ID, GAME_ONLINE_ID, type PlayData } from '$lib/net/play';
import {
	EMPTY_REWARDS,
	mergeRewards,
	readRewards,
	sanitizeRewards,
	writeRewards,
	type RewardsData
} from '$lib/net/rewards';
import { currentUserInfo } from '$lib/net/account';
import { storage } from './storage';
import { toast } from '$lib/controllers/toast.svelte';
import { t } from '$lib/i18n';

export const REWARDS_STORAGE_KEY = 'rewards_data';
export const REWARDS_UNSEEN_KEY = 'rewards_unseen';

export interface MatchRewardSummary {
	xpEarned: number;
	newlyUnlocked: AchievementDef[];
	leveledUpTo: number | null;
	dailyStreakBonus: boolean;
	rewards: RewardsData;
}

export function utcDayString(nowMs: number = Date.now()): string {
	return new Date(nowMs).toISOString().slice(0, 10);
}

export function previousUtcDayString(day: string): string {
	const ms = Date.parse(`${day}T00:00:00Z`);
	return new Date(ms - 86_400_000).toISOString().slice(0, 10);
}

export function metricValueFor(
	def: AchievementDef,
	rewards: RewardsData,
	playData: PlayData
): number {
	const overall = playData.games[GAME_ID];
	const online = playData.games[GAME_ONLINE_ID];
	switch (def.metric) {
		case 'wins':
			return overall?.wins ?? 0;
		case 'onlineWins':
			return online?.wins ?? 0;
		case 'plays':
			return overall?.plays ?? 0;
		case 'bestWinStreak':
			return playData.bestWinStreak ?? 0;
		case 'kills':
			return rewards.totals.kills;
		case 'castleDamage':
			return rewards.totals.castleDamage;
		case 'racesWon':
			return Object.keys(rewards.totals.racesWon).length;
		case 'dailyStreak':
			return rewards.bestDailyStreak;
		case 'score':
			return playData.score;
		case 'bestMatchKills':
			return rewards.totals.bestMatchKills ?? 0;
	}
}

export function hasUnlockedGrant(
	rewards: RewardsData,
	kind: 'frame' | 'title',
	id: string
): boolean {
	if (kind === 'title' && id === 'recruit') return true;
	if (kind === 'frame' && id === 'none') return true;
	return ACHIEVEMENTS.some(
		(a) => a.grant?.kind === kind && a.grant.id === id && rewards.unlocked[a.id] !== undefined
	);
}

export function applyMatchRewards(
	currentRewards: RewardsData,
	playData: PlayData,
	input: {
		won: boolean;
		mode: 'solo' | 'online' | 'daily';
		unitsKilled: number;
		damageToCastle: number;
		race?: string;
	},
	nowMs: number = Date.now()
): MatchRewardSummary {
	const next = sanitizeRewards(currentRewards);
	const prevLevel = next.level;

	next.totals.kills += Math.max(0, Math.round(input.unitsKilled));
	next.totals.castleDamage += Math.max(0, Math.round(input.damageToCastle));
	next.totals.bestMatchKills = Math.max(
		next.totals.bestMatchKills ?? 0,
		Math.max(0, Math.round(input.unitsKilled))
	);
	if (input.won && input.race) {
		const raceKey = formatRaceName(input.race).slice(0, 32);
		if (raceKey) {
			next.totals.racesWon[raceKey] = true;
		}
	}

	// Daily play streak
	const today = utcDayString(nowMs);
	let dailyStreakBonus = false;
	if (next.lastPlayDay !== today) {
		dailyStreakBonus = true;
		if (next.lastPlayDay === previousUtcDayString(today)) {
			next.dailyStreak += 1;
		} else {
			next.dailyStreak = 1;
		}
		next.bestDailyStreak = Math.max(next.bestDailyStreak, next.dailyStreak);
		next.lastPlayDay = today;
	}

	let xpEarned =
		(input.won ? 70 : 25) + (input.mode === 'online' ? 35 : input.mode === 'daily' ? 30 : 0);
	if (dailyStreakBonus) xpEarned += 75;

	next.xp += xpEarned;

	const newlyUnlocked: AchievementDef[] = [];
	for (const def of ACHIEVEMENTS) {
		if (next.unlocked[def.id] !== undefined) continue;
		const progress = metricValueFor(def, next, playData);
		if (progress >= def.target) {
			next.unlocked[def.id] = nowMs;
			next.xp += def.xp;
			xpEarned += def.xp;
			newlyUnlocked.push(def);
		}
	}

	next.level = computeLevelProgress(next.xp).level;
	const leveledUpTo = next.level > prevLevel ? next.level : null;

	return {
		xpEarned,
		newlyUnlocked,
		leveledUpTo,
		dailyStreakBonus,
		rewards: next
	};
}

class RewardsStore {
	data = $state<RewardsData>(sanitizeRewards(storage.getJSON(REWARDS_STORAGE_KEY, EMPTY_REWARDS)));
	unseenCount = $state<number>(Number(storage.get(REWARDS_UNSEEN_KEY) ?? '0') || 0);

	reloadLocal(): void {
		this.data = sanitizeRewards(storage.getJSON(REWARDS_STORAGE_KEY, EMPTY_REWARDS));
	}

	saveLocal(next: RewardsData): void {
		this.data = sanitizeRewards(next);
		storage.setJSON(REWARDS_STORAGE_KEY, this.data);
	}

	markSeen(): void {
		this.unseenCount = 0;
		storage.set(REWARDS_UNSEEN_KEY, '0');
	}

	async syncWithCloud(): Promise<void> {
		this.reloadLocal();
		const info = await currentUserInfo().catch(() => ({ isAnonymous: true, uid: '' }));
		if (info.isAnonymous) return;
		const cloud = await readRewards();
		const merged = mergeRewards(this.data, cloud);
		this.saveLocal(merged);
		if (
			!cloud ||
			merged.xp > cloud.xp ||
			Object.keys(merged.unlocked).length > Object.keys(cloud.unlocked).length
		) {
			void writeRewards(merged);
		}
	}

	async equipTitle(titleId: string): Promise<boolean> {
		if (!hasUnlockedGrant(this.data, 'title', titleId)) return false;
		const next: RewardsData = { ...this.data, equippedTitle: titleId };
		this.saveLocal(next);
		await writeRewards(next);
		return true;
	}

	async processMatch(
		playData: PlayData,
		input: {
			won: boolean;
			mode: 'solo' | 'online' | 'daily';
			unitsKilled: number;
			damageToCastle: number;
			race?: string;
		}
	): Promise<MatchRewardSummary> {
		this.reloadLocal();
		const summary = applyMatchRewards(this.data, playData, input);
		this.saveLocal(summary.rewards);

		if (summary.newlyUnlocked.length > 0) {
			this.unseenCount += summary.newlyUnlocked.length;
			storage.set(REWARDS_UNSEEN_KEY, String(this.unseenCount));
			for (const ach of summary.newlyUnlocked.slice(0, 2)) {
				toast.success(`${t('account.rewards.unlockedToast')}: ${ach.titleUk} (+${ach.xp} XP)`);
			}
		}
		if (summary.leveledUpTo) {
			toast.info(t('account.rewards.levelUpToast', { level: summary.leveledUpTo }));
		}

		const info = await currentUserInfo().catch(() => ({ isAnonymous: true }));
		if (!info.isAnonymous) {
			void writeRewards(summary.rewards);
		}
		return summary;
	}
}

export const rewardsStore = new RewardsStore();
