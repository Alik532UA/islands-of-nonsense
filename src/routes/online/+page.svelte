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
		startPrivacyPresence,
		unfollowUser,
		watchInbox,
		type InboxItem
	} from '$lib/net/social';
	import { readProfile, type Profile } from '$lib/net/account';
	import { notifyIfHidden, requestNotifyPermission } from '$lib/services/browserNotify';
	import {
		subscribeLobby,
		publishToLobby,
		updateLobbyMatchState,
		GAME_ID,
		RULES_VERSION,
		RULES_STAMP
	} from '$lib/net/lobby';
	import { liveNet } from '$lib/net/roomNet';
	import { listOwnRooms, type OwnActiveRoom } from '$lib/net/ownRooms';
	import { checkLiveRules } from '$lib/net/rulesLive';
	import { applyAppUpdateOrReload } from '$lib/pwa/serviceWorkerUpdate';
	import { sessionStore } from '$lib/services/storage';
	import { rewardsStore } from '$lib/services/rewardsService.svelte';
	import { seekMatch, type SeekFormat } from '$lib/net/seek';
	import { buildRoomSlots, countOpenHumanCapacity } from '$lib/net/onlineMatchSetup';
	import {
		canJoinAsSpectator,
		normalizeSpectatorMode,
		type LobbyRoom,
		type SpectatorMode
	} from '$lib/net/roomTypes';

	import PlayerBar from '$lib/components/online/PlayerBar.svelte';
	import SearchWindow from '$lib/components/online/SearchWindow.svelte';
	import CreateWindow from '$lib/components/online/CreateWindow.svelte';
	import JoinWindow from '$lib/components/online/JoinWindow.svelte';
	import RoomList from '$lib/components/online/RoomList.svelte';
	import GlobalChatDrawer from '$lib/components/chat/GlobalChatDrawer.svelte';
	import DmDrawer from '$lib/components/chat/DmDrawer.svelte';
	import PublicProfileModal from '$lib/components/account/PublicProfileModal.svelte';

	const player = new PlayerIdentity();

	const RULES_RELOAD_STAMP_KEY = 'online.rules_reload_stamp';

	let openWindow = $state<'hub' | 'search' | 'create' | 'join'>('hub');
	let searchFormat = $state<SeekFormat>('1v1');
	let busy = $state(false);
	let errorMessage = $state<string | null>(null);
	let rooms = $state<LobbyRoom[]>([]);
	let ownRooms = $state<OwnActiveRoom[]>([]);
	let rulesStale = $state(false);
	let rulesReloadAttempted = $state(false);
	let rulesBannerDismissed = $state(false);
	let rulesRechecking = $state(false);
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
		spectators: number;
		spectatorMode: SpectatorMode;
	} | null>(null);
	let roomInvites = $state<InboxItem[]>([]);
	let inboxCount = $state(0);
	let lastNotifiedInviteId = '';

	$effect(() => {
		return settings.claimHeader(t('online.title'), () => goto(resolve('/')));
	});

	async function recheckLiveRules(isActive = () => true) {
		rulesRechecking = true;
		try {
			const state = await checkLiveRules();
			if (!isActive()) return;
			if (state === 'fresh') {
				sessionStore.remove(RULES_RELOAD_STAMP_KEY);
				rulesStale = false;
				rulesReloadAttempted = false;
				rulesBannerDismissed = false;
			} else if (state === 'stale') {
				rulesStale = true;
			}
		} finally {
			rulesRechecking = false;
		}
	}

	function handleRulesBannerUpdate() {
		sessionStore.set(RULES_RELOAD_STAMP_KEY, RULES_STAMP);
		rulesReloadAttempted = true;
		void applyAppUpdateOrReload();
	}

	onMount(() => {
		rulesReloadAttempted = sessionStore.get(RULES_RELOAD_STAMP_KEY) === RULES_STAMP;
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
					void readProfile().then((p) => {
						if (!active) return;
						myProfile = p;
						void startPrivacyPresence({
							name: p?.name || player.value || t('online.defaultPlayerName'),
							handle: p?.handle,
							country: p?.country || player.country,
							avatar: p?.avatar || player.avatar
						}).then((fn) => {
							if (active) stopGlobalPresence = fn;
							else fn();
						});
					});
					void loadSocialLists().then((res) => {
						friendUids = res.mutual.map((u) => u.uid);
						followingUids = res.following.map((u) => u.uid);
					});
					void watchInbox((items) => {
						inboxCount = items.length;
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
				void listOwnRooms().then((list) => {
					if (active) ownRooms = list;
				});
				void checkLiveRules().then((state) => {
					if (!active) return;
					if (state === 'fresh') {
						sessionStore.remove(RULES_RELOAD_STAMP_KEY);
						rulesStale = false;
						rulesReloadAttempted = false;
					} else if (state === 'stale') {
						rulesStale = true;
					}
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
								maxPlayers: countOpenHumanCapacity(info.config),
								spectators: (members ?? []).filter((m) => m.role === 'spectator').length,
								spectatorMode: normalizeSpectatorMode(info.config?.spectatorMode)
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

	function spectatorDeniedMessage(reason?: 'disabled' | 'lobbyOnly' | 'full'): string {
		if (reason === 'disabled') return t('online.spectator.deniedDisabled');
		if (reason === 'lobbyOnly') return t('online.spectator.deniedLobbyOnly');
		return t('online.spectator.deniedFull');
	}

	async function handleCreate(config: { isPrivate: boolean; spectatorMode: SpectatorMode }) {
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
				isPrivate: config.isPrivate,
				spectatorMode: config.spectatorMode
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
					spectators: 0,
					status: 'lobby',
					spectatorMode: config.spectatorMode,
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
			const { uid, db } = await connect();
			const existingSelf = members.find((m) => m.uid === uid);
			const playerMembers = members.filter((m) => m.role === 'player');
			const specMembers = members.filter((m) => m.role === 'spectator');
			const maxPlayers = countOpenHumanCapacity(info.config);

			if (info.status === 'playing' && existingSelf?.role !== 'player') {
				const check = canJoinAsSpectator({
					status: info.status,
					spectatorMode: info.config?.spectatorMode,
					spectatorCount: specMembers.length
				});
				if (!check.allowed) {
					errorMessage = spectatorDeniedMessage(check.reason);
					return;
				}
			}

			if (!existingSelf && playerMembers.length >= maxPlayers && info.status !== 'playing') {
				errorMessage = `Кімната ${normalizedCode} вже заповнена`;
				return;
			}
			const entryName = player.forEntry(settings.locale);
			const role =
				info.status === 'playing' && existingSelf?.role !== 'player' ? 'spectator' : 'player';
			await liveNet.joinRoom(normalizedCode, {
				name: entryName,
				role,
				country: player.country,
				avatar: player.avatar,
				race: 'in_game'
			});

			if (!info.config?.isPrivate) {
				await updateLobbyMatchState(db, normalizedCode, {
					players: Math.max(1, playerMembers.length + (role === 'player' && !existingSelf ? 1 : 0)),
					spectators: specMembers.length + (role === 'spectator' && !existingSelf ? 1 : 0)
				}).catch(() => {});
			}

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
			const [info, members] = await Promise.all([
				liveNet.peekRoom(normalizedCode),
				liveNet.peekMembers(normalizedCode)
			]);
			if (!info) {
				errorMessage = t('online.hud.roomUnavailable', { code: normalizedCode });
				return;
			}
			const memberList = members ?? [];
			const specCount = memberList.filter((m) => m.role === 'spectator').length;
			const specCheck = canJoinAsSpectator({
				status: info.status,
				spectatorMode: info.config?.spectatorMode,
				spectatorCount: specCount
			});
			if (!specCheck.allowed) {
				errorMessage = spectatorDeniedMessage(specCheck.reason);
				return;
			}
			const entryName = player.forEntry(settings.locale);
			await liveNet.joinRoom(normalizedCode, {
				name: entryName,
				role: 'spectator',
				country: player.country,
				avatar: player.avatar
			});
			if (!info.config?.isPrivate) {
				const { db } = await connect();
				await updateLobbyMatchState(db, normalizedCode, { spectators: specCount + 1 }).catch(
					() => {}
				);
			}
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

		{#if rulesStale && !rulesBannerDismissed}
			<div
				class="w-full max-w-xl mx-auto mb-4 px-4 py-3 rounded-xl bg-amber-950/90 border border-amber-500/60 text-amber-100 text-xs flex items-center justify-between gap-3"
				data-testid="online-rules-stale-banner"
			>
				<span>
					{rulesReloadAttempted ? t('online.rulesServerOutdated') : t('online.rulesStale')}
				</span>
				<div class="flex items-center gap-1.5 shrink-0">
					{#if rulesReloadAttempted}
						<button
							type="button"
							disabled={rulesRechecking}
							onclick={() => void recheckLiveRules()}
							class="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold cursor-pointer"
							data-testid="online-rules-recheck-btn"
						>
							{t('online.rulesRecheck')}
						</button>
						<button
							type="button"
							onclick={() => (rulesBannerDismissed = true)}
							class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
							aria-label={t('common.close')}
							data-testid="online-rules-dismiss-btn"
						>
							✕
						</button>
					{:else}
						<button
							type="button"
							onclick={handleRulesBannerUpdate}
							class="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer"
							data-testid="online-rules-update-btn"
						>
							{t('pwa.updateAction')}
						</button>
					{/if}
				</div>
			</div>
		{/if}

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

		<!-- Quick Social / Progression Hub Bar -->
		<div
			class="w-full max-w-xl mx-auto mt-3 flex flex-wrap items-center justify-center gap-1.5"
			data-testid="online-social-hub-links"
		>
			{#each [{ tab: 'profile', icon: 'circleUser', key: 'account.tab.profile', badge: 0 }, { tab: 'stats', icon: 'barChart', key: 'account.tab.stats', badge: 0 }, { tab: 'rewards', icon: 'award', key: 'account.tab.rewards', badge: rewardsStore.unseenCount }, { tab: 'friends', icon: 'users', key: 'account.tab.friends', badge: inboxCount }, { tab: 'leaders', icon: 'trophy', key: 'account.tab.leaders', badge: 0 }] as const as link (link.tab)}
				<a
					href={`${resolve('/account')}?tab=${link.tab}`}
					class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 text-xs font-bold text-slate-200 transition"
				>
					<UiIcon name={link.icon} class="w-3.5 h-3.5 text-amber-400" />
					<span>{t(link.key)}</span>
					{#if link.badge > 0}
						<span
							class="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black leading-none"
						>
							{link.badge}
						</span>
					{/if}
				</a>
			{/each}
		</div>

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

		<!-- Active Own Rooms (Resume / Close) -->
		{#if ownRooms.length > 0}
			<div class="w-full max-w-xl mx-auto mt-6" data-testid="own-active-rooms">
				<h3
					class="text-sm font-bold text-amber-300 uppercase tracking-wider mb-2.5 flex items-center gap-2"
				>
					<UiIcon name="play" class="w-4 h-4" />
					<span>{t('online.myRooms.title')}</span>
				</h3>
				<div class="flex flex-col gap-2">
					{#each ownRooms as myRoom (myRoom.code)}
						<div
							class="flex items-center justify-between p-3 rounded-xl bg-amber-950/20 border border-amber-500/40 text-xs"
						>
							<div>
								<div class="font-black text-amber-200 font-mono">
									{myRoom.code} ·
									<span class="font-sans font-semibold text-slate-300">
										{myRoom.status === 'playing'
											? t('online.myRooms.playing')
											: t('online.myRooms.lobby')}
									</span>
								</div>
								<div class="text-[11px] text-slate-400">
									{myRoom.players}/{myRoom.maxPlayers}
									{t('online.playersCount')}
								</div>
							</div>
							<div class="flex items-center gap-1.5 shrink-0">
								<button
									type="button"
									onclick={() => void goto(`${resolve('/play/battle')}?room=${myRoom.code}&host=1`)}
									class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer"
								>
									{t('online.myRooms.resume')}
								</button>
								<button
									type="button"
									onclick={async () => {
										await liveNet.closeRoom(myRoom.code).catch(() => {});
										ownRooms = ownRooms.filter((r) => r.code !== myRoom.code);
									}}
									class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-rose-300 font-bold cursor-pointer"
								>
									{t('online.myRooms.close')}
								</button>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

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
	{@const inviteSpecCheck = canJoinAsSpectator({
		status: pendingInvite.status,
		spectatorMode: pendingInvite.spectatorMode,
		spectatorCount: pendingInvite.spectators
	})}
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
					? inviteSpecCheck.allowed
						? t('online.preJoin.playingDesc')
						: spectatorDeniedMessage(inviteSpecCheck.reason)
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
				{#if inviteSpecCheck.allowed}
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
				{/if}
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
