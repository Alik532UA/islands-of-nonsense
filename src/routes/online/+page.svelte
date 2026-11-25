<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Swords, PlusCircle, KeyRound, ArrowLeft } from 'lucide-svelte';
	import { t } from '$lib/i18n';
	import { settings } from '$lib/services/settings.svelte';
	import { PlayerIdentity } from '$lib/controllers/playerIdentity.svelte';
	import { connect } from '$lib/net/firebase';
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

	const player = new PlayerIdentity();

	let openWindow = $state<'hub' | 'search' | 'create' | 'join'>('hub');
	let searchFormat = $state<SeekFormat>('1v1');
	let busy = $state(false);
	let errorMessage = $state<string | null>(null);
	let rooms = $state<LobbyRoom[]>([]);
	let searchController: AbortController | null = null;

	onMount(() => {
		const release = settings.claimHeader(t('online.title'), () => goto(resolve('/')));
		void player.load(settings.locale);
		void player.loadCountry();

		let unsubscribeLobby = () => {};

		void connect()
			.then(({ db }) => {
				unsubscribeLobby = subscribeLobby(db, (updated) => {
					rooms = updated;
				});
			})
			.catch(() => {
				// Offline or emulator down
			});

		return () => {
			unsubscribeLobby();
			if (searchController) searchController.abort();
			release();
		};
	});

	async function handleQuickSearch(nextFormat: SeekFormat = searchFormat) {
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

	async function handleCreate(config: {
		modeId: string;
		teamSizeWest: number;
		teamSizeEast: number;
		isPrivate: boolean;
		fogOfWar: boolean;
	}) {
		busy = true;
		errorMessage = null;
		try {
			const { db, uid } = await connect();
			const entryName = player.forEntry(settings.locale);
			const seed = Math.floor(Math.random() * 1_000_000);
			const teamSize = Math.max(config.teamSizeWest, config.teamSizeEast);
			const slots = buildRoomSlots(config.teamSizeWest, config.teamSizeEast);
			const roomConfig = {
				modeId: config.modeId,
				teamSize,
				teamSizeWest: config.teamSizeWest,
				teamSizeEast: config.teamSizeEast,
				slots,
				allRandom: config.modeId === 'allRandom',
				targetWins: 2,
				fogOfWar: config.fogOfWar,
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
					modeId: config.modeId
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
				avatar: player.avatar
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
		<PlayerBar
			bind:name={player.value}
			avatar={player.avatar}
			country={player.country}
			onReroll={() => player.reroll(settings.locale)}
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
				<Swords class="menu-tile__icon text-amber-400" />
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
				<PlusCircle class="menu-tile__icon text-emerald-400" />
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
				<KeyRound class="menu-tile__icon text-sky-400" />
				<span class="font-bold text-sky-100">{t('online.joinByCode')}</span>
				<span class="text-xs text-slate-400 font-normal">{t('online.joinByCodeDesc')}</span>
			</button>
		</nav>

		<!-- Open Rooms List -->
		<RoomList {rooms} onJoin={handleJoin} />

		<div class="menu-links mt-8">
			<a href={resolve('/')} class="menu-btn menu-btn--link" data-testid="online-back-link">
				<ArrowLeft class="menu-link__icon" />
				<span>{t('menu.back')}</span>
			</a>
		</div>
	{/if}
</div>
