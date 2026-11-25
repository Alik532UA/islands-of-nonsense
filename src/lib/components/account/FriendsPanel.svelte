<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Eye, MessageSquare, Shield, UserPlus, Users, X } from 'lucide-svelte';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import type { AccountState, Profile } from '$lib/net/account';
	import {
		DEFAULT_PRIVACY,
		dismissInboxItem,
		followUser,
		loadSocialLists,
		readPrivacy,
		removeFollowerUser,
		savePrivacy,
		searchHandles,
		trackGlobalPresence,
		unfollowUser,
		watchGlobalPresence,
		watchInbox,
		type InboxItem,
		type SocialPrivacy,
		type SocialUser
	} from '$lib/net/social';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Flag from '$lib/components/ui/Flag.svelte';
	import PublicProfileModal from './PublicProfileModal.svelte';
	import { toast } from '$lib/controllers/toast.svelte';
	import { t } from '$lib/i18n';

	interface Props {
		accountState: AccountState;
		profile: Profile | null;
		onOpenDm: (peer: { uid: string; name: string; avatar?: string }) => void;
	}

	let { accountState, profile, onOpenDm }: Props = $props();

	let searchQuery = $state('');
	let searchResults = $state<SocialUser[]>([]);
	let searching = $state(false);
	let listTab = $state<'mutual' | 'following' | 'followers' | 'discovery'>('mutual');
	let following = $state<SocialUser[]>([]);
	let followers = $state<SocialUser[]>([]);
	let mutual = $state<SocialUser[]>([]);
	let onlineUsers = $state<SocialUser[]>([]);
	let inbox = $state<InboxItem[]>([]);
	let privacy = $state<SocialPrivacy>({ ...DEFAULT_PRIVACY });
	let selectedUid = $state<string | null>(null);

	const followingSet = $derived(new Set(following.map((u) => u.uid)));
	const onlineByUid = $derived(new Map(onlineUsers.map((u) => [u.uid, u])));

	async function refreshLists() {
		if (accountState !== 'linked') return;
		const lists = await loadSocialLists();
		following = lists.following;
		followers = lists.followers;
		mutual = lists.mutual;
	}

	onMount(() => {
		let stopPresence = () => {};
		let stopWatchPresence = () => {};
		let stopInbox = () => {};

		if (accountState === 'linked') {
			void refreshLists();
			void readPrivacy().then((p) => {
				privacy = p;
				if (p.onlineStatus && profile) {
					void trackGlobalPresence({
						name: profile.name,
						handle: profile.handle,
						country: profile.country,
						avatar: profile.avatar
					}).then((fn) => {
						stopPresence = fn;
					});
				}
			});
			void watchGlobalPresence((users) => {
				onlineUsers = users;
			}).then((fn) => {
				stopWatchPresence = fn;
			});
			void watchInbox((items) => {
				inbox = items;
			}).then((fn) => {
				stopInbox = fn;
			});
		}

		return () => {
			stopPresence();
			stopWatchPresence();
			stopInbox();
		};
	});

	async function runSearch(e: SubmitEvent) {
		e.preventDefault();
		if (searchQuery.trim().length < 2) {
			searchResults = [];
			return;
		}
		searching = true;
		try {
			searchResults = await searchHandles(searchQuery);
		} finally {
			searching = false;
		}
	}

	async function handleFollow(targetUid: string) {
		const ok = await followUser(targetUid, profile);
		if (ok) {
			toast.success(t('social.followedToast'));
			await refreshLists();
		}
	}

	async function handleUnfollow(targetUid: string) {
		const ok = await unfollowUser(targetUid);
		if (ok) {
			await refreshLists();
		}
	}

	async function handleRemoveFollower(followerUid: string) {
		const ok = await removeFollowerUser(followerUid);
		if (ok) {
			await refreshLists();
		}
	}

	async function handleToggleFollow(uid: string) {
		if (followingSet.has(uid)) await handleUnfollow(uid);
		else await handleFollow(uid);
	}

	async function togglePrivacy(key: keyof SocialPrivacy) {
		const next = { ...privacy, [key]: !privacy[key] };
		privacy = next;
		const ok = await savePrivacy(next, profile);
		if (ok) {
			toast.success(t('account.saved'));
		}
	}

	const activeList = $derived(
		listTab === 'mutual'
			? mutual
			: listTab === 'following'
				? following
				: listTab === 'followers'
					? followers
					: onlineUsers
	);
</script>

<div class="space-y-5" data-testid="friends-panel">
	{#if accountState !== 'linked'}
		<div class="p-6 bg-slate-950/60 border border-slate-800 rounded-2xl text-center space-y-2">
			<Users class="w-8 h-8 text-amber-400 mx-auto" />
			<div class="text-sm font-bold text-slate-200">{t('social.linkTitle')}</div>
			<div class="text-xs text-slate-400">{t('social.linkDesc')}</div>
		</div>
	{:else}
		<!-- Inbox / Notifications -->
		{#if inbox.length > 0}
			<div class="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
				<div class="text-xs font-bold text-amber-300 flex items-center gap-1.5">
					<UiIcon name="bell" class="w-3.5 h-3.5" />
					<span>{t('social.inboxTitle')} ({inbox.length})</span>
				</div>
				{#each inbox.slice(0, 5) as item (item.id)}
					<div
						class="flex items-center justify-between gap-2 text-xs bg-slate-950/70 p-2 rounded-xl"
					>
						<div class="flex items-center gap-2 min-w-0">
							<Avatar avatar={item.fromAvatar ?? 'castle:amber'} size={22} showDefault />
							<span class="truncate text-slate-200">
								<strong class="text-amber-300">{item.fromName}</strong>
								{#if item.type === 'room_invite'}
									{t('social.invitedYou', { code: item.roomCode ?? '' })}
								{:else}
									{t('social.followedYou')}
								{/if}
							</span>
						</div>
						<div class="flex items-center gap-1.5 shrink-0">
							{#if item.type === 'room_invite' && item.roomCode}
								<button
									type="button"
									onclick={() => {
										void dismissInboxItem(item.id);
										void goto(
											`${resolve('/play/battle')}?room=${encodeURIComponent(item.roomCode ?? '')}`
										);
									}}
									class="px-2 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[11px] cursor-pointer"
								>
									{t('online.join')}
								</button>
							{:else if !followingSet.has(item.fromUid)}
								<button
									type="button"
									onclick={() => {
										void handleFollow(item.fromUid);
										void dismissInboxItem(item.id);
									}}
									class="px-2 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-[11px] cursor-pointer"
								>
									{t('social.followBack')}
								</button>
							{/if}
							<button
								type="button"
								onclick={() => void dismissInboxItem(item.id)}
								class="p-1 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
								aria-label={t('common.close')}
							>
								<X class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Handle Search -->
		<form onsubmit={runSearch} class="flex gap-2">
			<div class="relative flex-1">
				<UiIcon
					name="search"
					class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
				/>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder={t('social.searchPlaceholder')}
					class="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
					data-testid="friends-search-input"
				/>
			</div>
			<button
				type="submit"
				disabled={searching}
				class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer disabled:opacity-50"
				data-testid="friends-search-btn"
			>
				{t('social.searchBtn')}
			</button>
		</form>

		{#if searchResults.length > 0}
			<div class="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
				<div class="text-[11px] font-bold uppercase text-slate-400">
					{t('social.searchResults')}
				</div>
				{#each searchResults as user (user.uid)}
					<div
						class="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/70 text-xs"
					>
						<button
							type="button"
							onclick={() => (selectedUid = user.uid)}
							class="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
						>
							<Avatar avatar={user.avatar ?? 'castle:amber'} size={26} showDefault />
							<div class="min-w-0">
								<div class="font-bold text-slate-100 truncate">{user.name}</div>
								<div class="text-[10px] text-amber-400">@{user.handle}</div>
							</div>
						</button>
						<button
							type="button"
							onclick={() => void handleToggleFollow(user.uid)}
							class="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer {followingSet.has(
								user.uid
							)
								? 'bg-slate-800 text-slate-300'
								: 'bg-amber-500 text-slate-950'}"
						>
							{#if followingSet.has(user.uid)}
								<UiIcon name="userMinus" class="w-3 h-3" />
								<span>{t('social.unfollow')}</span>
							{:else}
								<UserPlus class="w-3 h-3" />
								<span>{t('social.follow')}</span>
							{/if}
						</button>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Social Graph Tabs -->
		<div class="flex flex-wrap gap-1.5">
			{#each [{ id: 'mutual', label: `${t('social.tab.mutual')} (${mutual.length})` }, { id: 'following', label: `${t('social.tab.following')} (${following.length})` }, { id: 'followers', label: `${t('social.tab.followers')} (${followers.length})` }, { id: 'discovery', label: `${t('social.tab.discovery')} (${onlineUsers.length})` }] as tabItem (tabItem.id)}
				<button
					type="button"
					onclick={() =>
						(listTab = tabItem.id as 'mutual' | 'following' | 'followers' | 'discovery')}
					class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 {listTab ===
					tabItem.id
						? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
						: 'bg-slate-900 text-slate-400 hover:text-slate-200'}"
				>
					{#if tabItem.id === 'discovery'}
						<UiIcon name="radio" class="w-3.5 h-3.5 text-emerald-400" />
					{/if}
					<span>{tabItem.label}</span>
				</button>
			{/each}
		</div>

		<!-- Users List -->
		{#if activeList.length === 0}
			<div
				class="py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800"
			>
				{t('social.emptyList')}
			</div>
		{:else}
			<div
				class="divide-y divide-slate-800/60 rounded-2xl border border-slate-800 bg-slate-950/40 overflow-hidden"
			>
				{#each activeList as user (user.uid)}
					{@const liveInfo = onlineByUid.get(user.uid)}
					{@const isOnline = Boolean(user.online || liveInfo)}
					{@const liveRoom = user.roomCode ?? liveInfo?.roomCode}
					<div class="flex items-center justify-between gap-3 p-3 text-xs">
						<button
							type="button"
							onclick={() => (selectedUid = user.uid)}
							class="flex items-center gap-2.5 min-w-0 text-left cursor-pointer flex-1"
						>
							<div class="relative">
								<Avatar avatar={user.avatar ?? 'castle:amber'} size={28} showDefault />
								{#if isOnline}
									<span
										class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950"
									></span>
								{/if}
							</div>
							<div class="min-w-0">
								<div class="flex items-center gap-1.5">
									<span class="font-bold text-slate-100 truncate">{user.name}</span>
									{#if user.mutual}
										<span
											class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold"
										>
											{t('social.mutualBadge')}
										</span>
									{/if}
								</div>
								<div class="text-[10px] text-slate-400 flex items-center gap-1.5">
									<span>{user.handle ? `@${user.handle}` : ''}</span>
									{#if user.country}
										<Flag code={user.country} showCode />
									{/if}
								</div>
							</div>
						</button>

						<div class="flex items-center gap-1.5 shrink-0">
							{#if liveRoom}
								<button
									type="button"
									onclick={() =>
										void goto(`${resolve('/online')}?room=${encodeURIComponent(liveRoom)}`)}
									class="px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
								>
									<UiIcon name="logIn" class="w-3 h-3" />
									<span>{t('social.joinRoom', { code: liveRoom })}</span>
								</button>
							{/if}
							<button
								type="button"
								onclick={() => (selectedUid = user.uid)}
								class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
								title={t('social.viewProfile')}
								aria-label={t('social.viewProfile')}
							>
								<Eye class="w-3.5 h-3.5" />
							</button>
							<button
								type="button"
								onclick={() => onOpenDm({ uid: user.uid, name: user.name, avatar: user.avatar })}
								class="p-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 cursor-pointer"
								title={t('chat.openDm')}
								aria-label={t('chat.openDm')}
							>
								<MessageSquare class="w-3.5 h-3.5" />
							</button>
							{#if listTab === 'followers'}
								{#if !followingSet.has(user.uid)}
									<button
										type="button"
										onclick={() => void handleFollow(user.uid)}
										class="px-2 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-[11px] cursor-pointer"
									>
										{t('social.followBack')}
									</button>
								{/if}
								<button
									type="button"
									onclick={() => void handleRemoveFollower(user.uid)}
									class="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-rose-300 cursor-pointer"
									title={t('social.removeFollower')}
									aria-label={t('social.removeFollower')}
								>
									<X class="w-3.5 h-3.5" />
								</button>
							{:else}
								<button
									type="button"
									onclick={() => void handleToggleFollow(user.uid)}
									class="px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer {followingSet.has(
										user.uid
									)
										? 'bg-slate-800 text-slate-300 hover:bg-rose-900/40'
										: 'bg-amber-500 text-slate-950'}"
								>
									{followingSet.has(user.uid) ? t('social.unfollow') : t('social.follow')}
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Privacy Settings -->
		<div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2.5">
			<div
				class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5"
			>
				<Shield class="w-4 h-4 text-sky-400" />
				<span>{t('social.privacy.title')}</span>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
				{#each [{ key: 'search', label: t('social.privacy.search') }, { key: 'follow', label: t('social.privacy.follow') }, { key: 'board', label: t('social.privacy.board') }, { key: 'onlineStatus', label: t('social.privacy.online') }] as opt (opt.key)}
					{@const k = opt.key as keyof SocialPrivacy}
					<button
						type="button"
						onclick={() => void togglePrivacy(k)}
						class="flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer {privacy[
							k
						]
							? 'bg-emerald-500/10 border-emerald-500/30 text-slate-100'
							: 'bg-slate-900 border-slate-800 text-slate-400'}"
					>
						<span>{opt.label}</span>
						<span class="font-bold uppercase text-[10px]">
							{privacy[k] ? 'ON' : 'OFF'}
						</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

{#if selectedUid}
	<PublicProfileModal
		targetUid={selectedUid}
		isFollowing={followingSet.has(selectedUid)}
		onClose={() => (selectedUid = null)}
		onToggleFollow={handleToggleFollow}
		{onOpenDm}
	/>
{/if}
