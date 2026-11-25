<script lang="ts">
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import { t } from '$lib/i18n';
	import {
		filterLeadersByCountry,
		findLeaderRank,
		sortLeaders,
		type Leader,
		type LeaderSort
	} from '$lib/net/leaders';
	import { followUser, unfollowUser } from '$lib/net/social';
	import type { AccountState, Profile } from '$lib/net/account';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Flag from '$lib/components/ui/Flag.svelte';
	import { titleLabel } from '$lib/config/rewards';
	import { settings } from '$lib/services/settings.svelte';
	import PublicProfileModal from './PublicProfileModal.svelte';

	interface Props {
		leaders: Leader[];
		myUid: string | null;
		accountState: AccountState;
		profile: Profile | null;
		myScore: number;
		myCountry?: string;
		friendUids?: string[];
		followingUids?: string[];
		onOpenDm?: (peer: { uid: string; name: string; avatar?: string }) => void;
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
		friendUids = [],
		followingUids,
		onOpenDm,
		onRefresh,
		onPublish,
		onWithdraw
	}: Props = $props();

	let scope = $state<'global' | 'friends' | 'country'>('global');
	let sortBy = $state<LeaderSort>('score');
	let busy = $state(false);
	let selectedLeaderUid = $state<string | null>(null);
	let localFollowingUids = $derived(followingUids ?? friendUids);

	const friendSet = $derived(new Set(friendUids));
	const followingSet = $derived(new Set(localFollowingUids));
	const scopedLeaders = $derived.by(() => {
		if (scope === 'friends') {
			return leaders.filter((l) => l.uid === myUid || friendSet.has(l.uid));
		}
		if (scope === 'country' && myCountry) {
			return filterLeadersByCountry(leaders, myCountry);
		}
		return leaders;
	});
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
					<UiIcon name="upload" class="w-3.5 h-3.5" />
					<span>{isListed ? t('account.leaders.syncMine') : t('account.leaders.publishMine')}</span>
				</button>
				{#if isListed}
					<button
						type="button"
						disabled={busy}
						onclick={() => void runAction(onWithdraw)}
						class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
					>
						<UiIcon name="eyeOff" class="w-3.5 h-3.5" />
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
				<UiIcon name="refresh" class="w-3.5 h-3.5" />
			</button>
		</div>
	</div>

	<!-- Scope & Sort Filters -->
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div class="flex items-center gap-1.5">
			{#each [{ id: 'global', icon: 'globe', label: t('account.leaders.scopeGlobal'), show: true }, { id: 'friends', icon: 'users', label: t('account.leaders.scopeFriends'), show: accountState === 'linked' }, { id: 'country', icon: 'mappin', label: myCountry?.toUpperCase() ?? '', show: Boolean(myCountry) }].filter((s) => s.show) as item (item.id)}
				<button
					type="button"
					onclick={() => (scope = item.id as typeof scope)}
					class="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer {scope ===
					item.id
						? 'bg-sky-500/20 text-sky-200 border border-sky-500/40'
						: 'bg-slate-900 text-slate-400 hover:text-slate-200'}"
				>
					<UiIcon name={item.icon as 'globe' | 'users' | 'mappin'} class="w-3.5 h-3.5" />
					<span>{item.label}</span>
				</button>
			{/each}
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
						{#if i < 3}
							<UiIcon
								name="trophy"
								class="w-4 h-4 mx-auto {i === 0
									? 'text-amber-400'
									: i === 1
										? 'text-slate-300'
										: 'text-amber-700'}"
							/>
						{:else}
							#{i + 1}
						{/if}
					</div>

					<Avatar avatar={leader.avatar ?? 'castle:amber'} size={28} />

					<button
						type="button"
						onclick={() => {
							if (!isMe) selectedLeaderUid = leader.uid;
						}}
						class="flex-1 min-w-0 text-left {isMe
							? 'cursor-default'
							: 'cursor-pointer hover:opacity-90'}"
					>
						<div class="flex items-center gap-2 flex-wrap">
							<span class="font-bold text-xs text-slate-100 truncate">{leader.name}</span>
							{#if leader.level}
								<span
									class="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold"
								>
									Lv.{leader.level}
								</span>
							{/if}
							{#if leader.title}
								<span
									class="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-200 border border-amber-500/25 font-semibold"
								>
									{titleLabel(leader.title, settings.locale)}
								</span>
							{/if}
							{#if isMe}
								<span
									class="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase"
								>
									{t('account.leaders.you')}
								</span>
							{/if}
							{#if leader.country}
								<Flag code={leader.country} showCode />
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
					</button>

					<div class="text-right">
						<span class="font-black text-xs text-amber-400 font-mono">{leader.score}</span>
						<span class="text-[9px] text-slate-500 block">{t('account.leaders.pts')}</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if selectedLeaderUid}
	<PublicProfileModal
		targetUid={selectedLeaderUid}
		isFollowing={followingSet.has(selectedLeaderUid)}
		onClose={() => (selectedLeaderUid = null)}
		onToggleFollow={async (targetUid) => {
			if (followingSet.has(targetUid)) {
				const ok = await unfollowUser(targetUid);
				if (ok) localFollowingUids = localFollowingUids.filter((id) => id !== targetUid);
			} else {
				const ok = await followUser(targetUid, profile);
				if (ok) localFollowingUids = [...localFollowingUids, targetUid];
			}
		}}
		{onOpenDm}
	/>
{/if}
