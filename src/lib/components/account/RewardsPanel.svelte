<script lang="ts">
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import { t } from '$lib/i18n';
	import { settings } from '$lib/services/settings.svelte';
	import {
		ACHIEVEMENTS,
		PLAYER_TITLES,
		computeLevelProgress,
		titleLabel,
		type RewardCategory,
		type RewardRarity
	} from '$lib/config/rewards';
	import { parseAvatar, type AvatarFrame } from '$lib/config/avatars';
	import type { PlayData } from '$lib/net/play';
	import {
		hasUnlockedGrant,
		metricValueFor,
		rewardsStore
	} from '$lib/services/rewardsService.svelte';
	import { toast } from '$lib/controllers/toast.svelte';

	interface Props {
		playData: PlayData;
		currentAvatar?: string;
		onEquipFrame?: (frame: AvatarFrame) => void;
	}

	let { playData, currentAvatar = '', onEquipFrame }: Props = $props();

	let categoryFilter = $state<'all' | RewardCategory>('all');

	const rewards = $derived(rewardsStore.data);
	const levelInfo = $derived(computeLevelProgress(rewards.xp));
	const unlockedCount = $derived(Object.keys(rewards.unlocked).length);
	const locale = $derived(settings.locale === 'en' ? 'en' : 'uk');
	const equippedFrame = $derived(parseAvatar(currentAvatar)?.frame ?? 'none');

	const filteredAchievements = $derived(
		categoryFilter === 'all'
			? ACHIEVEMENTS
			: ACHIEVEMENTS.filter((a) => a.category === categoryFilter)
	);

	const RARITY_STYLES: Record<RewardRarity, string> = {
		common: 'border-slate-700 bg-slate-900/60 text-slate-300',
		rare: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
		epic: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
		legendary: 'border-amber-500/50 bg-amber-500/15 text-amber-300'
	};

	async function handleEquipTitle(titleId: string) {
		const ok = await rewardsStore.equipTitle(titleId);
		if (ok) {
			toast.success(t('account.rewards.titleEquipped'));
		}
	}

	function handleEquipGrant(kind: 'frame' | 'title', id: string) {
		if (kind === 'title') {
			void handleEquipTitle(id);
			return;
		}
		if (onEquipFrame) {
			onEquipFrame(id as AvatarFrame);
			toast.success(t('account.rewards.frameEquipped'));
		}
	}
</script>

<div class="space-y-6" data-testid="rewards-panel">
	<!-- Level, XP & Daily Streak Header -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
		<div class="sm:col-span-2 p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
			<div class="flex items-center justify-between gap-3">
				<div class="flex items-center gap-3">
					<div
						class="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-black text-lg"
					>
						{levelInfo.level}
					</div>
					<div>
						<div class="text-xs font-black text-amber-300 uppercase tracking-wider">
							{t('account.rewards.level', { level: levelInfo.level })} ·
							{titleLabel(rewards.equippedTitle, locale)}
						</div>
						<div class="text-[11px] text-slate-400 font-mono">
							{levelInfo.xp} / {levelInfo.nextLevelXp} XP
						</div>
					</div>
				</div>
				<div class="text-right text-xs text-emerald-300 font-bold">
					{unlockedCount} / {ACHIEVEMENTS.length}
					<span class="block text-[10px] text-slate-400 font-normal">
						{t('account.rewards.badges')}
					</span>
				</div>
			</div>

			<div class="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
				<div
					class="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
					style="width: {levelInfo.progressPct}%"
				></div>
			</div>
		</div>

		<div
			class="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col justify-between"
		>
			<div class="flex items-center justify-between">
				<span class="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
					{t('account.rewards.dailyStreak')}
				</span>
				<UiIcon name="calendar" class="w-4 h-4 text-amber-400" />
			</div>
			<div class="text-2xl font-black text-amber-300 flex items-center gap-1.5 my-1">
				<UiIcon name="flame" class="w-5 h-5 text-orange-400" />
				<span>{rewards.dailyStreak}</span>
				<span class="text-xs font-semibold text-slate-400">{t('account.rewards.days')}</span>
			</div>
			<div class="text-[11px] text-slate-400">
				{t('account.rewards.bestDaily')}: {rewards.bestDailyStreak}
			</div>
		</div>
	</div>

	<!-- Title Selector -->
	<div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2.5">
		<div
			class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5"
		>
			<UiIcon name="crown" class="w-4 h-4 text-amber-400" />
			<span>{t('account.rewards.titles')}</span>
		</div>
		<div class="flex flex-wrap gap-2">
			{#each PLAYER_TITLES as item (item.id)}
				{@const unlocked = hasUnlockedGrant(rewards, 'title', item.id)}
				{@const active = (rewards.equippedTitle ?? 'recruit') === item.id}
				<button
					type="button"
					disabled={!unlocked}
					onclick={() => void handleEquipTitle(item.id)}
					class="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition {active
						? 'bg-amber-500/20 border-amber-400 text-amber-200'
						: unlocked
							? 'bg-slate-900 border-slate-700 text-slate-200 hover:border-amber-500/50 cursor-pointer'
							: 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed opacity-60'}"
				>
					{#if !unlocked}
						<UiIcon name="lock" class="w-3 h-3" />
					{:else if active}
						<UiIcon name="checkCircle2" class="w-3.5 h-3.5 text-emerald-400" />
					{:else}
						<UiIcon name="star" class="w-3 h-3 text-amber-400" />
					{/if}
					<span>{locale === 'en' ? item.en : item.uk}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Category Filter -->
	<div class="flex flex-wrap items-center gap-1.5">
		{#each ['all', 'combat', 'online', 'economy', 'mastery'] as cat (cat)}
			<button
				type="button"
				onclick={() => (categoryFilter = cat as 'all' | RewardCategory)}
				class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer {categoryFilter ===
				cat
					? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
					: 'bg-slate-900 text-slate-400 hover:text-slate-200'}"
			>
				{t(`account.rewards.cat.${cat}`)}
			</button>
		{/each}
	</div>

	<!-- Achievements Grid -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="achievements-grid">
		{#each filteredAchievements as ach (ach.id)}
			{@const isUnlocked = rewards.unlocked[ach.id] !== undefined}
			{@const val = Math.min(ach.target, metricValueFor(ach, rewards, playData))}
			{@const pct = Math.min(100, Math.round((val / ach.target) * 100))}
			<div
				class="p-4 rounded-2xl border transition flex flex-col justify-between gap-3 {isUnlocked
					? RARITY_STYLES[ach.rarity]
					: 'bg-slate-950/50 border-slate-800/80 opacity-85'}"
			>
				<div class="flex items-start justify-between gap-2">
					<div class="flex items-start gap-2.5">
						<div
							class="p-2 rounded-xl border {isUnlocked
								? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
								: 'bg-slate-900 border-slate-800 text-slate-500'}"
						>
							{#if isUnlocked}
								<UiIcon name="award" class="w-4 h-4" />
							{:else}
								<UiIcon name="trophy" class="w-4 h-4" />
							{/if}
						</div>
						<div>
							<div class="text-xs font-extrabold text-slate-100">
								{locale === 'en' ? ach.titleEn : ach.titleUk}
							</div>
							<div class="text-[11px] text-slate-400 leading-snug mt-0.5">
								{locale === 'en' ? ach.descEn : ach.descUk}
							</div>
						</div>
					</div>
					<span
						class="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900/90 text-amber-300 shrink-0"
					>
						+{ach.xp} XP
					</span>
				</div>

				<div class="space-y-1.5">
					{#if ach.grant}
						{@const isEquipped =
							ach.grant.kind === 'title'
								? (rewards.equippedTitle ?? 'recruit') === ach.grant.id
								: equippedFrame === ach.grant.id}
						{#if isUnlocked}
							<button
								type="button"
								onclick={() => ach.grant && handleEquipGrant(ach.grant.kind, ach.grant.id)}
								class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer {isEquipped
									? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
									: 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/25'}"
							>
								<UiIcon name={isEquipped ? 'checkCircle2' : 'sparkles'} class="w-3 h-3" />
								<span>{locale === 'en' ? ach.grant.labelEn : ach.grant.labelUk}</span>
								<span class="opacity-80">
									· {isEquipped ? t('account.rewards.equipped') : t('account.rewards.equip')}
								</span>
							</button>
						{:else}
							<div class="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-300/80">
								<UiIcon name="sparkles" class="w-3 h-3" />
								<span>{locale === 'en' ? ach.grant.labelEn : ach.grant.labelUk}</span>
							</div>
						{/if}
					{/if}
					<div class="flex items-center justify-between text-[10px] text-slate-400 font-mono">
						<span>{t(`account.rewards.rarity.${ach.rarity}`)}</span>
						<span>{val} / {ach.target}</span>
					</div>
					<div class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
						<div
							class="h-full rounded-full transition-all {isUnlocked
								? 'bg-emerald-400'
								: 'bg-amber-500/70'}"
							style="width: {pct}%"
						></div>
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
