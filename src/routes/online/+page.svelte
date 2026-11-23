<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Swords, PlusCircle, KeyRound, ArrowLeft } from 'lucide-svelte';
	import { t } from '$lib/i18n';
	import { settings } from '$lib/services/settings.svelte';
	import { PlayerIdentity } from '$lib/controllers/playerIdentity.svelte';
	import { connect } from '$lib/net/firebase';
	import { subscribeLobby, publishToLobby, GAME_ID, RULES_VERSION } from '$lib/net/lobby';
	import { seekMatch } from '$lib/net/seek';
	import { generateRoomCode } from '$lib/net/roomCode';
	import type { LobbyRoom } from '$lib/net/roomTypes';

	import PlayerBar from '$lib/components/online/PlayerBar.svelte';
	import SearchWindow from '$lib/components/online/SearchWindow.svelte';
	import CreateWindow from '$lib/components/online/CreateWindow.svelte';
	import JoinWindow from '$lib/components/online/JoinWindow.svelte';
	import RoomList from '$lib/components/online/RoomList.svelte';

	const player = new PlayerIdentity();

	let openWindow = $state<'hub' | 'search' | 'create' | 'join'>('hub');
	let busy = $state(false);
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

	async function handleQuickSearch() {
		openWindow = 'search';
		busy = true;
		searchController = new AbortController();

		try {
			const { db } = await connect();
			const entryName = player.forEntry(settings.locale);
			const result = await seekMatch(
				db,
				{
					uid: player.avatar ? `${player.avatar}_${Date.now()}` : `user_${Date.now()}`,
					name: entryName,
					country: player.country,
					avatar: player.avatar
				},
				searchController.signal
			);

			await goto(`${resolve('/play/battle')}?room=${encodeURIComponent(result.code)}${result.isHost ? '&host=1' : ''}`);
		} catch {
			openWindow = 'hub';
		} finally {
			busy = false;
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

	async function handleCreate(config: { modeId: string; teamSize: 1 | 2 | 3; isPrivate: boolean }) {
		busy = true;
		try {
			const { db, uid } = await connect();
			const entryName = player.forEntry(settings.locale);
			const code = generateRoomCode();

			if (!config.isPrivate) {
				const lobbyEntry: LobbyRoom = {
					code,
					hostUid: uid,
					hostName: entryName,
					hostCountry: player.country,
					hostAvatar: player.avatar,
					gameId: GAME_ID,
					rulesVersion: RULES_VERSION,
					players: 1,
					maxPlayers: config.teamSize * 2,
					modeId: config.modeId,
					createdAt: Date.now()
				};
				await publishToLobby(db, lobbyEntry);
			}

			await goto(`${resolve('/play/battle')}?room=${encodeURIComponent(code)}&host=1`);
		} finally {
			busy = false;
		}
	}

	async function handleJoin(code: string) {
		busy = true;
		try {
			player.forEntry(settings.locale);
			await goto(`${resolve('/play/battle')}?room=${encodeURIComponent(code)}`);
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Castle Fight Web — {t('online.title')}</title>
</svelte:head>

<div class="menu-page fill min-h-screen">
	{#if openWindow === 'search'}
		<SearchWindow onCancel={cancelSearch} />
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
				onclick={handleQuickSearch}
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
