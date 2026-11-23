<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { ArrowLeft, Swords, Bot, Shield, Coins, Users, Trophy, Check } from 'lucide-svelte';
	import { RACES_LIST } from '$lib/engine/gameData';
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
		const release = settings.claimHeader('Передматчеве лобі', () => goto(resolve('/play')));
		const saved = storage.getJSON<Partial<SimulationConfig>>('match_settings', {});
		if (saved.botDifficulty !== undefined) botDifficulty = saved.botDifficulty;
		if (saved.startGold !== undefined) startGold = saved.startGold;
		if (saved.teamSize !== undefined) teamSize = saved.teamSize as 1 | 2 | 3;
		if (saved.targetWins !== undefined) targetWins = saved.targetWins;
		if (saved.fogOfWar !== undefined) fogOfWar = saved.fogOfWar;
		if (saved.coinMode !== undefined) coinMode = saved.coinMode;
		if (saved.westRace) selectedWestRace = saved.westRace;
		if (saved.eastRace) selectedEastRace = saved.eastRace;

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

		return release;
	});

	const playerRaceOptions = $derived([
		{ id: 'random', name: '🎲 Випадкова' },
		...RACES_LIST.map((r) => ({
			id: r.race,
			name: r.race
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
	<title>Castle Fight Web — Передматчеве лобі</title>
</svelte:head>

<div class="menu-page fill min-h-screen py-6 px-4 flex flex-col items-center">
	<!-- Top Bar / Back to Play modes (single canonical back link) -->
	<div class="w-full max-w-4xl flex items-center justify-between mb-4">
		<a
			href={resolve('/play')}
			class="flex items-center gap-2 px-3 py-1.5 bg-[#181d28] hover:bg-[#252d3d] border border-slate-700 hover:border-amber-500/50 rounded-xl text-xs font-semibold text-slate-300 transition"
			data-testid="setup-back-btn"
		>
			<ArrowLeft class="w-4 h-4 text-amber-400" />
			<span>Назад до вибору режимів</span>
		</a>

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

	<!-- Setup Container Card -->
	<div
		class="w-full max-w-4xl bg-[#121622]/95 border-2 border-[#8c7456] rounded-2xl shadow-2xl p-6 md:p-8 space-y-5 text-white select-none backdrop-blur"
		style="box-shadow: 0 0 35px rgba(0,0,0,0.85), inset 0 0 15px rgba(140,116,86,0.15);"
	>
		<!-- Header -->
		<div class="border-b border-[#3b3226] pb-3">
			<h1 class="text-2xl md:text-3xl font-black text-amber-300 uppercase tracking-wide">
				Передматчеве лобі
			</h1>
			<p class="text-xs text-slate-400 mt-1">
				Оберіть раси та параметри битви перед запуском ігрового поля
			</p>
		</div>

		<!-- 1. Player Race Selection (Clean, no redundant kingdom subtitle) -->
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<label class="text-xs font-bold text-amber-200 flex items-center gap-1.5">
					<Shield class="w-4 h-4 text-cyan-400" />
					Ваша раса (Гравець):
				</label>
				<span class="text-xs text-cyan-300 font-mono font-bold">
					{selectedWestRace === 'random' ? 'Випадкова раса' : selectedWestRace}
				</span>
			</div>

			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
				{#each playerRaceOptions as r}
					<button
						type="button"
						onclick={() => (selectedWestRace = r.id)}
						class="p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between {selectedWestRace ===
						r.id
							? 'bg-cyan-950/70 border-cyan-400 ring-2 ring-cyan-500/40 text-cyan-100 shadow-md font-bold'
							: 'bg-[#181d28]/70 border-slate-700/80 hover:bg-[#202738] text-slate-300'}"
						data-testid="race-option-{r.id}"
					>
						<span class="font-bold text-xs">{r.name}</span>
						{#if selectedWestRace === r.id}
							<Check class="w-4 h-4 text-cyan-400 shrink-0" />
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<!-- 2. Opponent (Bot) Race Selection (FULL list of all races, no arbitrary truncating) -->
		<div class="space-y-2 pt-2 border-t border-[#3b3226]">
			<div class="flex items-center justify-between">
				<label class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
					<Bot class="w-4 h-4 text-rose-400" />
					Раса суперника (Бот):
				</label>
				<span class="text-xs text-rose-300 font-mono font-bold">
					{selectedEastRace === 'random' ? 'Випадкова раса' : selectedEastRace}
				</span>
			</div>

			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
				<button
					type="button"
					onclick={() => (selectedEastRace = 'random')}
					class="p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between {selectedEastRace ===
					'random'
						? 'bg-rose-950/70 border-rose-400 ring-2 ring-rose-500/40 text-rose-100 shadow-md font-bold'
						: 'bg-[#181d28]/70 border-slate-700/80 hover:bg-[#202738] text-slate-300'}"
					data-testid="bot-race-random"
				>
					<span class="font-bold text-xs">🎲 Випадкова</span>
					{#if selectedEastRace === 'random'}
						<Check class="w-4 h-4 text-rose-400 shrink-0" />
					{/if}
				</button>
				{#each RACES_LIST as r}
					<button
						type="button"
						onclick={() => (selectedEastRace = r.race)}
						class="p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between {selectedEastRace ===
						r.race
							? 'bg-rose-950/70 border-rose-400 ring-2 ring-rose-500/40 text-rose-100 shadow-md font-bold'
							: 'bg-[#181d28]/70 border-slate-700/80 hover:bg-[#202738] text-slate-300'}"
						data-testid="bot-race-{r.race}"
					>
						<span class="font-bold text-xs">{r.race}</span>
						{#if selectedEastRace === r.race}
							<Check class="w-4 h-4 text-rose-400 shrink-0" />
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<!-- 3. Match Parameters (No dropdowns - interactive buttons/pills) -->
		<div
			class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-[#3b3226]"
		>
			<!-- Bot Difficulty -->
			<div class="space-y-1.5" data-testid="setup-bot-difficulty">
				<label class="text-xs font-bold text-slate-300 flex items-center gap-1">
					<Bot class="w-3.5 h-3.5 text-amber-400" />
					Складність бота:
				</label>
				<div class="grid grid-cols-2 gap-1.5">
					{#each [{ val: 0, label: 'Легкий (0)', icon: '🌱' }, { val: 15, label: 'Звичайний (15)', icon: '⚔️' }, { val: 30, label: 'Складний (30)', icon: '🛡️' }, { val: 80, label: 'Божевільний (80)', icon: '🔥' }] as diff}
						<button
							type="button"
							onclick={() => (botDifficulty = diff.val)}
							class="py-2 px-1.5 rounded-lg border text-center transition cursor-pointer flex items-center justify-center gap-1 text-[11px] {botDifficulty ===
							diff.val
								? 'bg-amber-500/20 border-amber-500 text-amber-200 font-bold ring-1 ring-amber-500/40 shadow-sm'
								: 'bg-[#181d28] border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'}"
							data-testid="difficulty-btn-{diff.val}"
						>
							<span>{diff.icon}</span>
							<span>{diff.label}</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Starting Gold -->
			<div class="space-y-1.5" data-testid="setup-start-gold">
				<label class="text-xs font-bold text-slate-300 flex items-center gap-1">
					<Coins class="w-3.5 h-3.5 text-amber-400" />
					Стартове золото:
				</label>
				<div class="grid grid-cols-2 gap-1.5">
					{#each modeParam === 'sandbox' ? [{ val: 500, label: '500 🪙' }, { val: 1000, label: '1000 🪙' }, { val: 2000, label: '2000 🪙' }, { val: 99999, label: '99999 🪙' }] : [{ val: 500, label: '500 🪙' }, { val: 750, label: '750 🪙' }, { val: 1000, label: '1000 🪙' }, { val: 2000, label: '2000 🪙' }] as gold}
						<button
							type="button"
							onclick={() => (startGold = gold.val)}
							class="py-2 px-1.5 rounded-lg border text-center transition cursor-pointer flex items-center justify-center text-[11px] {startGold ===
							gold.val
								? 'bg-amber-500/20 border-amber-500 text-amber-200 font-bold ring-1 ring-amber-500/40 shadow-sm'
								: 'bg-[#181d28] border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'}"
							data-testid="gold-btn-{gold.val}"
						>
							<span>{gold.label}</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Team Size -->
			<div class="space-y-1.5" data-testid="setup-team-size">
				<label class="text-xs font-bold text-slate-300 flex items-center gap-1">
					<Users class="w-3.5 h-3.5 text-cyan-400" />
					Формат гри:
				</label>
				<div class="grid grid-cols-3 gap-1.5">
					{#each [{ val: 1 as const, label: '1 на 1', sub: 'Соло' }, { val: 2 as const, label: '2 на 2', sub: 'Командна' }, { val: 3 as const, label: '3 на 3', sub: 'Масова' }] as fmt}
						<button
							type="button"
							onclick={() => (teamSize = fmt.val)}
							class="py-2 px-1 rounded-lg border text-center transition cursor-pointer flex flex-col items-center justify-center {teamSize ===
							fmt.val
								? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 font-bold ring-1 ring-cyan-500/40 shadow-sm'
								: 'bg-[#181d28] border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'}"
							data-testid="teamsize-btn-{fmt.val}"
						>
							<span class="text-[11px] font-bold">{fmt.label}</span>
							<span class="text-[9px] text-slate-500">{fmt.sub}</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Rounds to Win -->
			<div class="space-y-1.5" data-testid="setup-target-wins">
				<label class="text-xs font-bold text-slate-300 flex items-center gap-1">
					<Trophy class="w-3.5 h-3.5 text-emerald-400" />
					Перемог у матчі:
				</label>
				<div class="grid grid-cols-3 gap-1.5">
					{#each [{ val: 1, label: 'До 1', sub: 'Бліц' }, { val: 2, label: 'До 2', sub: 'Bo3' }, { val: 3, label: 'До 3', sub: 'Bo5' }] as wins}
						<button
							type="button"
							onclick={() => (targetWins = wins.val)}
							class="py-2 px-1 rounded-lg border text-center transition cursor-pointer flex flex-col items-center justify-center {targetWins ===
							wins.val
								? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-bold ring-1 ring-emerald-500/40 shadow-sm'
								: 'bg-[#181d28] border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'}"
							data-testid="targetwins-btn-{wins.val}"
						>
							<span class="text-[11px] font-bold">{wins.label}</span>
							<span class="text-[9px] text-slate-500">{wins.sub}</span>
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- Action Footer: Clean, non-duplicated single CTA -->
		<div class="pt-4 border-t border-[#3b3226] flex items-center justify-end">
			<button
				type="button"
				onclick={handleStartMatch}
				class="w-full sm:w-auto px-10 py-3.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black rounded-xl text-sm uppercase tracking-wider transition shadow-xl shadow-amber-600/30 cursor-pointer active:scale-98 flex items-center justify-center gap-2"
				data-testid="setup-start-match-btn"
			>
				<Swords class="w-4 h-4 fill-slate-950" />
				<span>Розпочати бій ⚔️</span>
			</button>
		</div>
	</div>
</div>
