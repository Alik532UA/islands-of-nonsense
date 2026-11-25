<script lang="ts">
	import { Trophy, Globe, MapPin, RefreshCw, EyeOff, Upload } from 'lucide-svelte';
	import { t } from '$lib/i18n';
	import {
		filterLeadersByCountry,
		findLeaderRank,
		sortLeaders,
		type Leader,
		type LeaderSort
	} from '$lib/net/leaders';
	import type { AccountState, Profile } from '$lib/net/account';
	import Avatar from '$lib/components/ui/Avatar.svelte';

	interface Props {
		leaders: Leader[];
		myUid: string | null;
		accountState: AccountState;
		profile: Profile | null;
		myScore: number;
		myCountry?: string;
		onRefresh: () => Promise<void> | void;
		onPublish: () => Promise<boolean> | void;
		onWithdraw: () => Promise<void> | void;
	}

	let {
		leaders,
		myUid,
		accountState,
		profile,
		myScore,
		myCountry = '',
		onRefresh,
		onPublish,
		onWithdraw
	}: Props = $props();

	let scope = $state<'global' | 'country'>('global');
	let sortBy = $state<LeaderSort>('score');
	let busy = $state(false);

	const scopedLeaders = $derived(
		scope === 'country' && myCountry ? filterLeadersByCountry(leaders, myCountry) : leaders
	);
	const sortedLeaders = $derived(sortLeaders(scopedLeaders, sortBy));
	const myRank = $derived(findLeaderRank(sortedLeaders, myUid));
	const isListed = $derived(Boolean(myUid && leaders.some((l) => l.uid === myUid)));
	const topScore = $derived(sortedLeaders[0]?.score ?? 0);

	async function runAction(fn: () => Promise<unknown> | unknown) {
		if (busy) return;
		busy = true;
		try {
			await fn();
		} finally {
			busy = false;
		}
	}
</script>

<div class="space-y-4">
	<!-- My Rank & Controls Banner -->
	<div
		class="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3"
		data-testid="leaderboard-my-banner"
	>
		<div>
			<div class="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
				{t('account.leaders.myRankTitle')}
			</div>
			{#if accountState === 'anonymous'}
				<div class="text-xs text-slate-300 mt-0.5">{t('account.leaders.linkRequired')}</div>
			{:else if myRank !== null}
				<div class="text-sm font-black text-amber-300 mt-0.5">
					#{myRank} · {myScore}
					{t('account.leaders.pts')}
					{#if myRank > 1 && topScore > myScore}
						<span class="text-xs font-normal text-slate-400">
							({t('account.leaders.gapToTop', { gap: topScore - myScore })})
						</span>
					{/if}
				</div>
			{:else}
				<div class="text-xs text-slate-300 mt-0.5">
					{myScore > 0
						? t('account.leaders.notPublished', { score: myScore })
						: t('account.leaders.playToJoin')}
				</div>
			{/if}
		</div>

		<div class="flex flex-wrap items-center gap-2">
			{#if accountState === 'linked' && profile && myScore > 0}
				<button
					type="button"
					disabled={busy}
					onclick={() => void runAction(onPublish)}
					class="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
				>
					<Upload class="w-3.5 h-3.5" />
					<span>{isListed ? t('account.leaders.syncMine') : t('account.leaders.publishMine')}</span>
				</button>
				{#if isListed}
					<button
						type="button"
						disabled={busy}
						onclick={() => void runAction(onWithdraw)}
						class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
					>
						<EyeOff class="w-3.5 h-3.5" />
						<span>{t('account.leaders.hideMine')}</span>
					</button>
				{/if}
			{/if}
			<button
				type="button"
				disabled={busy}
				onclick={() => void runAction(onRefresh)}
				class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer disabled:opacity-50"
				title={t('account.leaders.refresh')}
				aria-label={t('account.leaders.refresh')}
			>
				<RefreshCw class="w-3.5 h-3.5" />
			</button>
		</div>
	</div>

	<!-- Scope & Sort Filters -->
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div class="flex items-center gap-1.5">
			<button
				type="button"
				onclick={() => (scope = 'global')}
				class="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer {scope ===
				'global'
					? 'bg-sky-500/20 text-sky-200 border border-sky-500/40'
					: 'bg-slate-900 text-slate-400 hover:text-slate-200'}"
			>
				<Globe class="w-3.5 h-3.5" />
				<span>{t('account.leaders.scopeGlobal')}</span>
			</button>
			{#if myCountry}
				<button
					type="button"
					onclick={() => (scope = 'country')}
					class="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer {scope ===
					'country'
						? 'bg-sky-500/20 text-sky-200 border border-sky-500/40'
						: 'bg-slate-900 text-slate-400 hover:text-slate-200'}"
				>
					<MapPin class="w-3.5 h-3.5" />
					<span>{myCountry.toUpperCase()}</span>
				</button>
			{/if}
		</div>

		<div class="flex items-center gap-1.5">
			{#each ['score', 'wins', 'winRate'] as key (key)}
				<button
					type="button"
					onclick={() => (sortBy = key as LeaderSort)}
					class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer {sortBy ===
					key
						? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
						: 'bg-slate-900 text-slate-400 hover:text-slate-200'}"
				>
					{t(`account.leaders.sort.${key}`)}
				</button>
			{/each}
		</div>
	</div>

	<!-- Ranked Table -->
	{#if sortedLeaders.length === 0}
		<div class="py-12 text-center text-xs text-slate-500">
			{t('account.leaders.empty')}
		</div>
	{:else}
		<div
			class="divide-y divide-slate-800/60 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40"
			data-testid="leaderboard-list"
		>
			{#each sortedLeaders as leader, i (leader.uid)}
				{@const isMe = Boolean(myUid && leader.uid === myUid)}
				{@const computedWr =
					leader.winRate ??
					(leader.plays && leader.plays > 0
						? Math.round(((leader.wins ?? 0) / leader.plays) * 100)
						: null)}
				<div
					class="flex items-center gap-3 p-3.5 transition {isMe
						? 'bg-amber-500/10 ring-1 ring-inset ring-amber-500/30'
						: 'hover:bg-slate-900/40'}"
				>
					<div
						class="w-7 text-center font-black text-xs text-slate-400 flex items-center justify-center"
					>
						{#if i === 0}
							<Trophy class="w-4 h-4 text-amber-400 mx-auto" />
						{:else if i === 1}
							<Trophy class="w-4 h-4 text-slate-300 mx-auto" />
						{:else if i === 2}
							<Trophy class="w-4 h-4 text-amber-700 mx-auto" />
						{:else}
							#{i + 1}
						{/if}
					</div>

					<Avatar avatar={leader.avatar ?? 'castle:amber'} size={28} />

					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2">
							<span class="font-bold text-xs text-slate-100 truncate">{leader.name}</span>
							{#if isMe}
								<span
									class="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase"
								>
									{t('account.leaders.you')}
								</span>
							{/if}
							{#if leader.country}
								<span class="text-[9px] px-1 bg-slate-800 rounded text-slate-300 uppercase">
									{leader.country}
								</span>
							{/if}
						</div>
						<div class="text-[10px] text-slate-400 truncate flex items-center gap-2">
							<span>@{leader.handle}</span>
							{#if leader.wins !== undefined || leader.plays !== undefined}
								<span>· {leader.wins ?? 0}W / {leader.plays ?? leader.wins ?? 0}M</span>
							{/if}
							{#if computedWr !== null}
								<span class="text-cyan-400">({computedWr}%)</span>
							{/if}
						</div>
					</div>

					<div class="text-right">
						<span class="font-black text-xs text-amber-400 font-mono">{leader.score}</span>
						<span class="text-[9px] text-slate-500 block">{t('account.leaders.pts')}</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
