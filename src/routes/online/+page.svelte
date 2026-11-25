<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import { t } from '$lib/i18n';
	import { settings } from '$lib/services/settings.svelte';
	import { PlayerIdentity } from '$lib/controllers/playerIdentity.svelte';
	import { connect } from '$lib/net/firebase';
	import {
		dismissInboxItem,
		followUser,
		loadSocialLists,
		readPrivacy,
		trackGlobalPresence,
		unfollowUser,
		watchInbox,
		type InboxItem
	} from '$lib/net/social';
	import { readProfile, type Profile } from '$lib/net/account';
	import { notifyIfHidden, requestNotifyPermission } from '$lib/services/browserNotify';
	import {
		subscribeLobby,
		publishToLobby,
		updateLobbyPlayers,
		GAME_ID,
		RULES_VERSION
	} from '$lib/net/lobby';
	import { liveNet } from '$lib/net/roomNet';
	import { seekMatch, type SeekFormat } from '$lib/net/seek';
	import { buildRoomSlots, countOpenHumanCapacity } from '$lib/net/onlineMatchSetup';
	import type { LobbyRoom } from '$lib/net/roomTypes';

	import PlayerBar from '$lib/components/online/PlayerBar.svelte';
	import SearchWindow from '$lib/components/online/SearchWindow.svelte';
	import CreateWindow from '$lib/components/online/CreateWindow.svelte';
	import JoinWindow from '$lib/components/online/JoinWindow.svelte';
	import RoomList from '$lib/components/online/RoomList.svelte';
	import GlobalChatDrawer from '$lib/components/chat/GlobalChatDrawer.svelte';
	import DmDrawer from '$lib/components/chat/DmDrawer.svelte';
	import PublicProfileModal from '$lib/components/account/PublicProfileModal.svelte';

	const player = new PlayerIdentity();

	let openWindow = $state<'hub' | 'search' | 'create' | 'join'>('hub');
	let searchFormat = $state<SeekFormat>('1v1');
	let busy = $state(false);
	let errorMessage = $state<string | null>(null);
	let rooms = $state<LobbyRoom[]>([]);
	let friendUids = $state<string[]>([]);
	let followingUids = $state<string[]>([]);
	let myUid = $state<string | null>(null);
	let myProfile = $state<Profile | null>(null);
	let dmPeer = $state<{ uid: string; name: string; avatar?: string } | null>(null);
	let inspectUid = $state<string | null>(null);
	let searchController: AbortController | null = null;
	let pendingInvite = $state<{
		code: string;
		status: 'lobby' | 'playing';
		players: number;
		maxPlayers: number;
	} | null>(null);
	let roomInvites = $state<InboxItem[]>([]);
	let lastNotifiedInviteId = '';

	$effect(() => {
		return settings.claimHeader(t('online.title'), () => goto(resolve('/')));
	});

	onMount(() => {
		void player.load(settings.locale);
		void player.loadCountry();

		let unsubscribeLobby = () => {};
		let unsubscribeInbox = () => {};
		let stopGlobalPresence = () => {};
		let active = true;

		const urlCode =
			typeof window !== 'undefined'
				? new URLSearchParams(window.location.search).get('room')?.trim().toUpperCase()
				: null;

		void connect()
			.then(({ auth, db, uid }) => {
				if (!active) return;
				myUid = uid;
				if (!auth.currentUser?.isAnonymous) {
					void Promise.all([readProfile(), readPrivacy()]).then(([p, priv]) => {
						if (!active) return;
						myProfile = p;
						if (priv.onlineStatus) {
							void trackGlobalPresence({
								name: p?.name || player.value || t('online.defaultPlayerName'),
								handle: p?.handle,
								country: p?.country || player.country,
								avatar: p?.avatar || player.avatar
							}).then((fn) => {
								if (active) stopGlobalPresence = fn;
								else fn();
							});
						}
					});
					void loadSocialLists().then((res) => {
						friendUids = res.mutual.map((u) => u.uid);
						followingUids = res.following.map((u) => u.uid);
					});
					void watchInbox((items) => {
						const invites = items.filter((i) => i.type === 'room_invite' && i.roomCode);
						roomInvites = invites;
						if (invites.length > 0 && invites[0].id !== lastNotifiedInviteId) {
							lastNotifiedInviteId = invites[0].id;
							notifyIfHidden(
								t('notify.inviteTitle', { code: invites[0].roomCode ?? '' }),
								t('notify.inviteBody', { name: invites[0].fromName })
							);
						}
					}).then((unsub) => {
						unsubscribeInbox = unsub;
					});
				}
				unsubscribeLobby = subscribeLobby(db, (updated) => {
					rooms = updated;
				});

				if (urlCode && /^[0-9A-Z]{2,6}$/.test(urlCode)) {
					void Promise.all([liveNet.peekRoom(urlCode), liveNet.peekMembers(urlCode)])
						.then(([info, members]) => {
							if (!info) {
								errorMessage = t('online.hud.roomUnavailable', { code: urlCode });
								return;
							}
							pendingInvite = {
								code: urlCode,
								status: info.status === 'playing' ? 'playing' : 'lobby',
								players: (members ?? []).filter((m) => m.role === 'player').length,
								maxPlayers: countOpenHumanCapacity(info.config)
							};
						})
						.catch(() => {});
				}
			})
			.catch(() => {
				// Offline or emulator down
			});

		return () => {
			active = false;
			stopGlobalPresence();
			unsubscribeLobby();
			unsubscribeInbox();
			if (searchController) searchController.abort();
		};
	});

	async function handleQuickSearch(nextFormat: SeekFormat = searchFormat) {
		void requestNotifyPermission();
		searchFormat = nextFormat;
		if (searchController) {
			searchController.abort();
		}
		openWindow = 'search';
		busy = true;
		errorMessage = null;
		const controller = new AbortController();
		searchController = controller;

		try {
			const { db, uid } = await connect();
			const entryName = player.forEntry(settings.locale);
			const result = await seekMatch(
				db,
				{
					uid,
					name: entryName,
					country: player.country,
					avatar: player.avatar
				},
				controller.signal,
				{},
				{ format: nextFormat }
			);

			notifyIfHidden(
				t('notify.matchFoundTitle'),
				t('notify.matchFoundBody', { code: result.code })
			);

			await goto(
				`${resolve('/play/battle')}?room=${encodeURIComponent(result.code)}${result.isHost ? '&host=1' : ''}`
			);
		} catch (err) {
			if (!controller.signal.aborted) {
				errorMessage =
					err instanceof Error ? err.message : 'Не вдалося підключитися до пошуку матчів';
				openWindow = 'hub';
			}
		} finally {
			if (searchController === controller) {
				busy = false;
			}
		}
	}

	function cancelSearch() {
		if (searchController) {
			searchController.abort();
			searchController = null;
		}
		openWindow = 'hub';
		busy = false;
	}

	async function handleCreate(config: { isPrivate: boolean }) {
		busy = true;
		errorMessage = null;
		try {
			const { db, uid } = await connect();
			const entryName = player.forEntry(settings.locale);
			const seed = Math.floor(Math.random() * 1_000_000);
			const teamSizeWest = 3;
			const teamSizeEast = 3;
			const teamSize = 3;
			const slots = buildRoomSlots(teamSizeWest, teamSizeEast);
			const roomConfig = {
				modeId: 'standard',
				teamSize,
				teamSizeWest,
				teamSizeEast,
				slots,
				allRandom: false,
				uniqueRaces: false,
				targetWins: 2,
				startGold: 500,
				coinMode: 'normal' as const,
				coinSpawnInterval: 40,
				coinCount: 1,
				fogOfWar: true,
				isPrivate: config.isPrivate
			};
			const maxPlayers = countOpenHumanCapacity(roomConfig);
			const code = await liveNet.createRoom({
				gameId: GAME_ID,
				rulesVersion: RULES_VERSION,
				seed,
				config: roomConfig,
				name: entryName,
				country: player.country,
				avatar: player.avatar,
				team: 'west',
				race: 'in_game',
				isPrivate: config.isPrivate
			});

			if (!config.isPrivate) {
				await publishToLobby(db, {
					code,
					hostUid: uid,
					hostName: entryName,
					hostCountry: player.country,
					hostAvatar: player.avatar,
					gameId: GAME_ID,
					rulesVersion: RULES_VERSION,
					players: 1,
					maxPlayers,
					modeId: roomConfig.modeId
				});
			}

			await goto(`${resolve('/play/battle')}?room=${encodeURIComponent(code)}&host=1`);
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Не вдалося створити кімнату';
		} finally {
			busy = false;
		}
	}

	async function handleJoin(code: string) {
		busy = true;
		errorMessage = null;
		try {
			const normalizedCode = code.trim().toUpperCase();
			const info = await liveNet.peekRoom(normalizedCode);
			if (!info) {
				errorMessage = `Кімнату ${normalizedCode} не знайдено або вона вже закрита`;
				return;
			}
			const members = (await liveNet.peekMembers(normalizedCode)) ?? [];
			const maxPlayers = countOpenHumanCapacity(info.config);
			if (
				members.filter((m) => m.role === 'player').length >= maxPlayers &&
				info.status !== 'playing'
			) {
				errorMessage = `Кімната ${normalizedCode} вже заповнена`;
				return;
			}
			const entryName = player.forEntry(settings.locale);
			const role = info.status === 'playing' ? 'spectator' : 'player';
			await liveNet.joinRoom(normalizedCode, {
				name: entryName,
				role,
				country: player.country,
				avatar: player.avatar,
				race: 'in_game'
			});

			const { db } = await connect();
			await updateLobbyPlayers(db, normalizedCode, members.length + 1).catch(() => {});

			await goto(`${resolve('/play/battle')}?room=${encodeURIComponent(normalizedCode)}`);
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Не вдалося увійти в кімнату';
		} finally {
			busy = false;
		}
	}

	async function handleSpectate(code: string) {
		busy = true;
		errorMessage = null;
		try {
			const normalizedCode = code.trim().toUpperCase();
			const info = await liveNet.peekRoom(normalizedCode);
			if (!info) {
				errorMessage = t('online.hud.roomUnavailable', { code: normalizedCode });
				return;
			}
			const entryName = player.forEntry(settings.locale);
			await liveNet.joinRoom(normalizedCode, {
				name: entryName,
				role: 'spectator',
				country: player.country,
				avatar: player.avatar
			});
			pendingInvite = null;
			await goto(`${resolve('/play/battle')}?room=${encodeURIComponent(normalizedCode)}`);
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Не вдалося підключитися спостерігачем';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Castle Fight Web — {t('online.title')}</title>
</svelte:head>

<div class="menu-page fill min-h-screen">
	{#if errorMessage}
		<div
			role="alert"
			class="w-full max-w-xl mx-auto mb-4 px-4 py-3 rounded-xl bg-rose-950/90 border border-rose-500/60 text-rose-200 text-sm flex items-center justify-between gap-3"
			data-testid="online-error-alert"
		>
			<span>{errorMessage}</span>
			<button
				type="button"
				onclick={() => (errorMessage = null)}
				class="px-2 py-1 text-xs font-bold rounded bg-rose-500/20 hover:bg-rose-500/30"
			>
				✕
			</button>
		</div>
	{/if}
	{#if openWindow === 'search'}
		<SearchWindow
			format={searchFormat}
			onChangeFormat={(fmt) => void handleQuickSearch(fmt)}
			onCancel={cancelSearch}
		/>
	{:else if openWindow === 'create'}
		<CreateWindow {busy} onCreate={handleCreate} onBack={() => (openWindow = 'hub')} />
	{:else if openWindow === 'join'}
		<JoinWindow {busy} onJoin={handleJoin} onBack={() => (openWindow = 'hub')} />
	{:else}
		<header class="w-full max-w-2xl text-center mb-6">
			<h1 class="text-3xl md:text-4xl font-extrabold text-sky-300 tracking-wider uppercase mb-2">
				{t('online.title')}
			</h1>
			<p class="text-sm text-slate-400">
				{t('online.subtitle')}
			</p>
		</header>

		<!-- Player Identity Customizer -->
		{#if roomInvites.length > 0}
			{@const topInvite = roomInvites[0]}
			<div
				class="w-full max-w-xl mx-auto mb-4 px-4 py-3 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-100 text-xs flex items-center justify-between gap-3"
				data-testid="online-invite-banner"
			>
				<div class="flex items-center gap-2 min-w-0">
					<UiIcon name="bell" class="w-4 h-4 text-emerald-400 shrink-0" />
					<span class="truncate font-semibold">
						{t('online.inviteBanner.text', {
							name: topInvite.fromName,
							code: topInvite.roomCode ?? ''
						})}
					</span>
				</div>
				<div class="flex items-center gap-1.5 shrink-0">
					<button
						type="button"
						onclick={async () => {
							const code = topInvite.roomCode;
							await dismissInboxItem(topInvite.id);
							if (code) await handleJoin(code);
						}}
						class="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer"
					>
						{t('online.join')}
					</button>
					<button
						type="button"
						onclick={() => void dismissInboxItem(topInvite.id)}
						class="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
					>
						✕
					</button>
				</div>
			</div>
		{/if}

		<PlayerBar
			bind:name={player.value}
			avatar={player.avatar}
			country={player.country}
			onReroll={() => player.reroll(settings.locale)}
			onSelectAvatar={(next) => player.chooseAvatar(next)}
		/>

		<!-- Action Tiles -->
		<nav class="menu-tiles mt-6">
			<!-- Quick Match -->
			<button
				type="button"
				class="menu-btn menu-btn--game menu-tile anim-stagger-1 text-left"
				onclick={() => void handleQuickSearch()}
				data-testid="online-quick-search-btn"
			>
				<UiIcon name="swords" class="menu-tile__icon text-amber-400" />
				<span class="font-bold text-amber-100">{t('online.quickSearch')}</span>
				<span class="text-xs text-slate-400 font-normal">{t('online.quickSearchDesc')}</span>
			</button>

			<!-- Create Room -->
			<button
				type="button"
				class="menu-btn menu-btn--game menu-tile anim-stagger-2 text-left"
				onclick={() => (openWindow = 'create')}
				data-testid="online-create-room-btn"
			>
				<UiIcon name="plusCircle" class="menu-tile__icon text-emerald-400" />
				<span class="font-bold text-emerald-100">{t('online.createRoom')}</span>
				<span class="text-xs text-slate-400 font-normal">{t('online.createRoomDesc')}</span>
			</button>

			<!-- Join by Code -->
			<button
				type="button"
				class="menu-btn menu-btn--game menu-tile anim-stagger-3 text-left"
				onclick={() => (openWindow = 'join')}
				data-testid="online-join-code-btn"
			>
				<UiIcon name="keyRound" class="menu-tile__icon text-sky-400" />
				<span class="font-bold text-sky-100">{t('online.joinByCode')}</span>
				<span class="text-xs text-slate-400 font-normal">{t('online.joinByCodeDesc')}</span>
			</button>
		</nav>

		<!-- Open Rooms List -->
		<RoomList {rooms} {friendUids} onJoin={handleJoin} onSpectate={handleSpectate} />

		<!-- Global Lobby Chat -->
		<GlobalChatDrawer
			senderName={player.value || t('online.defaultPlayerName')}
			senderAvatar={player.avatar}
			{myUid}
			onOpenDm={(peer) => (dmPeer = peer)}
			onInspectProfile={(uid) => (inspectUid = uid)}
		/>

		<div class="menu-links mt-8">
			<a href={resolve('/')} class="menu-btn menu-btn--link" data-testid="online-back-link">
				<UiIcon name="arrowLeft" class="menu-link__icon" />
				<span>{t('menu.back')}</span>
			</a>
		</div>
	{/if}
</div>

{#if pendingInvite}
	<div
		class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		data-testid="room-prejoin-modal"
	>
		<div
			class="w-full max-w-md rounded-2xl bg-slate-900 border-2 border-amber-400/70 p-5 space-y-4 shadow-2xl"
		>
			<h3 class="text-base font-black text-amber-300 uppercase tracking-wide">
				{t('online.preJoin.title', { code: pendingInvite.code })}
			</h3>
			<p class="text-xs text-slate-300">
				{pendingInvite.status === 'playing'
					? t('online.preJoin.playingDesc')
					: t('online.preJoin.desc')}
			</p>
			<div class="flex flex-wrap gap-2">
				{#if pendingInvite.status === 'lobby' && pendingInvite.players < pendingInvite.maxPlayers}
					<button
						type="button"
						disabled={busy}
						onclick={async () => {
							const code = pendingInvite?.code;
							pendingInvite = null;
							if (code) await handleJoin(code);
						}}
						class="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
						data-testid="prejoin-player-btn"
					>
						{t('online.preJoin.asPlayer')}
					</button>
				{/if}
				<button
					type="button"
					disabled={busy}
					onclick={() => pendingInvite && void handleSpectate(pendingInvite.code)}
					class="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-sky-500/40 text-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
					data-testid="prejoin-spectate-btn"
				>
					<UiIcon name="eye" class="w-4 h-4" />
					<span>{t('online.preJoin.asSpectator')}</span>
				</button>
				<button
					type="button"
					onclick={() => (pendingInvite = null)}
					class="min-h-[44px] px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 text-xs cursor-pointer"
				>
					{t('online.cancel')}
				</button>
			</div>
		</div>
	</div>
{/if}

{#if inspectUid}
	<PublicProfileModal
		targetUid={inspectUid}
		isFollowing={followingUids.includes(inspectUid)}
		onClose={() => (inspectUid = null)}
		onToggleFollow={async (targetUid) => {
			if (followingUids.includes(targetUid)) {
				const ok = await unfollowUser(targetUid);
				if (ok) {
					followingUids = followingUids.filter((id) => id !== targetUid);
					friendUids = friendUids.filter((id) => id !== targetUid);
				}
			} else {
				const ok = await followUser(targetUid, myProfile);
				if (ok) {
					const lists = await loadSocialLists();
					followingUids = lists.following.map((u) => u.uid);
					friendUids = lists.mutual.map((u) => u.uid);
				}
			}
		}}
		onOpenDm={(peer) => (dmPeer = peer)}
	/>
{/if}

{#if dmPeer && myUid}
	<DmDrawer
		peerUid={dmPeer.uid}
		peerName={dmPeer.name}
		peerAvatar={dmPeer.avatar}
		{myUid}
		myName={player.value || t('online.defaultPlayerName')}
		myAvatar={player.avatar}
		onClose={() => (dmPeer = null)}
	/>
{/if}
