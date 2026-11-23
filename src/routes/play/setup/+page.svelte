<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		ArrowLeft,
		Swords,
		Bot,
		Sparkles,
		Eye,
		Dices,
		Shield,
		Coins,
		Users,
		Sliders,
		Check
	} from 'lucide-svelte';
	import { RACES_LIST } from '$lib/engine/gameData';
	import { GAME_MODES } from '$lib/engine/gameModes';
	import { storage } from '$lib/services/storage';
	import { settings } from '$lib/services/settings.svelte';
	import type { SimulationConfig } from '$lib/engine/simulation';

	const modeParam = $derived(page.url.searchParams.get('mode') || 'vsBot');

	let selectedWestRace = $state<string>('Люди');
	let selectedEastRace = $state<string>('random');
	let botDifficulty = $state(15);
	let startGold = $state(500);
	let teamSize = $state<1 | 2 | 3>(1);
	let targetWins = $state(2);
	let fogOfWar = $state(true);
	let coinMode = $state<'none' | 'normal' | 'crazy'>('normal');

	onMount(() => {
		const release = settings.claimHeader('Налаштування матчу', () => goto(resolve('/play')));
		const saved = storage.getJSON<Partial<SimulationConfig>>('match_settings', {});
		if (saved.botDifficulty !== undefined) botDifficulty = saved.botDifficulty;
		if (saved.startGold !== undefined) startGold = saved.startGold;
		if (saved.teamSize !== undefined) teamSize = saved.teamSize as 1 | 2 | 3;
		if (saved.targetWins !== undefined) targetWins = saved.targetWins;
		if (saved.fogOfWar !== undefined) fogOfWar = saved.fogOfWar;
		if (saved.coinMode !== undefined) coinMode = saved.coinMode;
		if (saved.westRace) selectedWestRace = saved.westRace;

		if (modeParam === 'sandbox') {
			botDifficulty = 0;
			startGold = 99999;
			fogOfWar = false;
			coinMode = 'crazy';
		} else if (modeParam === 'allRandom') {
			selectedWestRace = 'random';
			selectedEastRace = 'random';
		} else if (modeParam === 'botVsBot') {
			fogOfWar = false;
		}
	});

	const races = $derived([
		{ id: 'random', name: '🎲 Випадкова', desc: 'Випадковий вибір раси на старті' },
		...RACES_LIST.map((r) => ({
			id: r.race,
			name: r.race,
			desc: `Королівство ${r.race}`
		}))
	]);

	function handleStartMatch() {
		const isAr = modeParam === 'allRandom' || selectedWestRace === 'random';
		const isBotVsBot = modeParam === 'botVsBot';

		const config: SimulationConfig = {
			botDifficulty,
			startGold,
			modeId: modeParam === 'sandbox' ? 'standard' : modeParam,
			teamSize,
			allRandom: isAr,
			westRace: isAr ? 'random' : selectedWestRace,
			eastRace: selectedEastRace === 'random' ? undefined : selectedEastRace,
			targetWins,
			coinMode,
			fogOfWar,
			botVsBot: isBotVsBot
		};

		storage.setJSON('match_settings', config);
		storage.setJSON('skip_start_modal', true);

		let targetUrl = resolve('/play/battle');
		if (modeParam === 'sandbox') targetUrl += '?mode=sandbox';
		else if (modeParam === 'botVsBot') targetUrl += '?mode=botVsBot';
		else if (modeParam === 'allRandom') targetUrl += '?mode=allRandom';

		goto(targetUrl);
	}
</script>

<svelte:head>
	<title>Castle Fight Web — Налаштування матчу</title>
</svelte:head>

<div class="menu-page fill min-h-screen py-6 px-4 flex flex-col items-center">
	<!-- Top Bar / Back to Play modes -->
	<div class="w-full max-w-4xl flex items-center justify-between mb-6">
		<a
			href={resolve('/play')}
			class="flex items-center gap-2 px-3 py-1.5 bg-[#181d28] hover:bg-[#252d3d] border border-slate-700 hover:border-amber-500/50 rounded-xl text-xs font-semibold text-slate-300 transition"
			data-testid="setup-back-btn"
		>
			<ArrowLeft class="w-4 h-4 text-amber-400" />
			<span>Назад до вибору режимів</span>
		</a>

		<div class="flex items-center gap-1.5">
			<span
				class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40"
			>
				{#if modeParam === 'sandbox'}
					🧪 Пісочниця
				{:else if modeParam === 'botVsBot'}
					👁️ Бот проти Бота
				{:else if modeParam === 'allRandom'}
					🎲 All Random
				{:else}
					⚔️ Бій проти Бота
				{/if}
			</span>
		</div>
	</div>

	<!-- Setup Container Card -->
	<div
		class="w-full max-w-4xl bg-[#121622]/95 border-2 border-[#8c7456] rounded-2xl shadow-2xl p-6 md:p-8 space-y-6 text-white select-none backdrop-blur"
		style="box-shadow: 0 0 35px rgba(0,0,0,0.85), inset 0 0 15px rgba(140,116,86,0.15);"
	>
		<!-- Header -->
		<div class="border-b border-[#3b3226] pb-4">
			<h1 class="text-2xl md:text-3xl font-black text-amber-300 uppercase tracking-wide">
				Передматчеве лобі
			</h1>
			<p class="text-xs text-slate-400 mt-1">
				Оберіть раси та параметри битви перед запуском ігрового поля
			</p>
		</div>

		<!-- 1. Player Race Selection -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<label class="text-sm font-bold text-amber-200 flex items-center gap-1.5">
					<Shield class="w-4 h-4 text-cyan-400" />
					Ваша раса (Гравець):
				</label>
				<span class="text-xs text-cyan-300 font-mono font-bold">{selectedWestRace}</span>
			</div>

			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
				{#each races as r}
					<button
						type="button"
						onclick={() => (selectedWestRace = r.id)}
						class="p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between {selectedWestRace ===
						r.id
							? 'bg-cyan-950/70 border-cyan-400 ring-2 ring-cyan-500/40 text-cyan-100 shadow-md'
							: 'bg-[#181d28]/70 border-slate-700/80 hover:bg-[#202738] text-slate-300'}"
						data-testid="race-option-{r.id}"
					>
						<div class="flex items-center justify-between w-full">
							<span class="font-bold text-xs">{r.name}</span>
							{#if selectedWestRace === r.id}
								<Check class="w-3.5 h-3.5 text-cyan-400 shrink-0" />
							{/if}
						</div>
						<span class="text-[10px] text-slate-400 truncate mt-1">{r.desc}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- 2. Opponent (Bot) Race Selection -->
		<div class="space-y-2 pt-2 border-t border-[#3b3226]">
			<label class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
				<Bot class="w-3.5 h-3.5 text-rose-400" />
				Раса суперника (Бот):
			</label>
			<div class="flex flex-wrap gap-1.5">
				<button
					type="button"
					onclick={() => (selectedEastRace = 'random')}
					class="px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer {selectedEastRace ===
					'random'
						? 'bg-rose-950/70 border-rose-400 text-rose-200'
						: 'bg-[#181d28] border-slate-700 text-slate-400 hover:text-slate-200'}"
				>
					🎲 Випадкова раса
				</button>
				{#each RACES_LIST.slice(0, 7) as r}
					<button
						type="button"
						onclick={() => (selectedEastRace = r.race)}
						class="px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer {selectedEastRace ===
						r.race
							? 'bg-rose-950/70 border-rose-400 text-rose-200'
							: 'bg-[#181d28] border-slate-700 text-slate-400 hover:text-slate-200'}"
					>
						{r.race}
					</button>
				{/each}
			</div>
		</div>

		<!-- 3. Match Parameters Grid -->
		<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-[#3b3226]">
			<!-- Bot Difficulty -->
			<div class="space-y-1.5">
				<label class="text-xs font-bold text-slate-300 flex items-center gap-1">
					<Bot class="w-3.5 h-3.5 text-amber-400" />
					Складність бота:
				</label>
				<select
					bind:value={botDifficulty}
					class="w-full bg-[#181d28] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
					data-testid="setup-bot-difficulty"
				>
					<option value={5}>Легкий (5) 🌱</option>
					<option value={15}>Звичайний (15) ⚔️</option>
					<option value={25}>Складний (25) 🛡️</option>
					<option value={40}>Божевільний (40) 🔥</option>
				</select>
			</div>

			<!-- Starting Gold -->
			<div class="space-y-1.5">
				<label class="text-xs font-bold text-slate-300 flex items-center gap-1">
					<Coins class="w-3.5 h-3.5 text-amber-400" />
					Стартове золото:
				</label>
				<select
					bind:value={startGold}
					class="w-full bg-[#181d28] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
					data-testid="setup-start-gold"
				>
					<option value={500}>500 золота (Стандарт)</option>
					<option value={750}>750 золота</option>
					<option value={1000}>1000 золота</option>
					<option value={2000}>2000 золота (Швидкий)</option>
					{#if modeParam === 'sandbox'}
						<option value={99999}>99999 золота (Пісочниця)</option>
					{/if}
				</select>
			</div>

			<!-- Team Size -->
			<div class="space-y-1.5">
				<label class="text-xs font-bold text-slate-300 flex items-center gap-1">
					<Users class="w-3.5 h-3.5 text-amber-400" />
					Формат гри:
				</label>
				<select
					bind:value={teamSize}
					class="w-full bg-[#181d28] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
					data-testid="setup-team-size"
				>
					<option value={1}>1 на 1 (Соло)</option>
					<option value={2}>2 на 2 (Командний)</option>
					<option value={3}>3 на 3 (Масштабний)</option>
				</select>
			</div>

			<!-- Rounds to Win -->
			<div class="space-y-1.5">
				<label class="text-xs font-bold text-slate-300 flex items-center gap-1">
					<Swords class="w-3.5 h-3.5 text-amber-400" />
					Перемог у матчі:
				</label>
				<select
					bind:value={targetWins}
					class="w-full bg-[#181d28] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
					data-testid="setup-target-wins"
				>
					<option value={1}>До 1 перемоги (Бліц)</option>
					<option value={2}>До 2 перемог (Стандарт)</option>
					<option value={3}>До 3 перемог (Турнір)</option>
				</select>
			</div>
		</div>

		<!-- Action Footer Button -->
		<div class="pt-4 border-t border-[#3b3226] flex flex-col sm:flex-row items-center justify-between gap-3">
			<a
				href={resolve('/play')}
				class="text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
			>
				<ArrowLeft class="w-3.5 h-3.5" />
				<span>Скасувати і вийти</span>
			</a>

			<button
				type="button"
				onclick={handleStartMatch}
				class="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black rounded-xl text-sm uppercase tracking-wider transition shadow-xl shadow-amber-600/30 cursor-pointer active:scale-98 flex items-center justify-center gap-2"
				data-testid="setup-start-match-btn"
			>
				<Swords class="w-4 h-4 fill-slate-950" />
				<span>Розпочати бій ⚔️</span>
			</button>
		</div>
	</div>
</div>
