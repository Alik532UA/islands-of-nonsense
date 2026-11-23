<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		ArrowLeft,
		Swords,
		Bot,
		Shield,
		Coins,
		Users,
		Trophy,
		Eye,
		Sliders
	} from 'lucide-svelte';
	import { storage } from '$lib/services/storage';
	import { settings } from '$lib/services/settings.svelte';
	import type { SimulationConfig } from '$lib/engine/simulation';
	import MatchConfigModal from '$lib/components/MatchConfigModal.svelte';

	const modeParam = $derived(page.url.searchParams.get('mode') || 'vsBot');

	let isConfigOpen = $state(false);

	let selectedWestRace = $state<string>('in_game');
	let selectedEastRace = $state<string>('random');
	let botDifficulty = $state(15);
	let startGold = $state(500);
	let teamSize = $state<1 | 2 | 3>(1);
	let targetWins = $state(2);
	let fogOfWar = $state(true);
	let coinMode = $state<'none' | 'normal' | 'crazy'>('normal');
	let botVsBot = $state(false);

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
		if (saved.botVsBot !== undefined) botVsBot = saved.botVsBot;

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
			botVsBot = true;
		}

		return release;
	});

	function handleConfigSaved(newConfig: SimulationConfig) {
		botDifficulty = newConfig.botDifficulty;
		startGold = newConfig.startGold;
		teamSize = (newConfig.teamSize ?? 1) as 1 | 2 | 3;
		targetWins = newConfig.targetWins ?? 2;
		fogOfWar = newConfig.fogOfWar ?? true;
		coinMode = newConfig.coinMode ?? 'normal';
		if (newConfig.westRace) selectedWestRace = newConfig.westRace;
		if (newConfig.eastRace) selectedEastRace = newConfig.eastRace;
		if (newConfig.botVsBot !== undefined) botVsBot = newConfig.botVsBot;
	}

	function handleStartMatch() {
		const isAr = modeParam === 'allRandom' || selectedWestRace === 'random';
		const isBotVsBot = modeParam === 'botVsBot' || botVsBot;

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

		let targetUrl = resolve('/play/battle');
		if (modeParam === 'sandbox') targetUrl += '?mode=sandbox';
		else if (modeParam === 'botVsBot') targetUrl += '?mode=botVsBot';
		else if (modeParam === 'allRandom') targetUrl += '?mode=allRandom';

		goto(targetUrl);
	}

	function getDifficultyLabel(diff: number): string {
		switch (diff) {
			case 0:
				return 'Легкий бот (0%)';
			case 15:
				return 'Звичайний бот (15%)';
			case 30:
				return 'Складний бот (30%)';
			case 80:
				return 'Божевільний бот (80%)';
			default:
				return `Бот (${diff}%)`;
		}
	}
</script>

<svelte:head>
	<title>Castle Fight Web — Передматчеве лобі</title>
</svelte:head>

<div class="menu-page fill min-h-screen py-6 px-4 flex flex-col items-center">
	<!-- Top Bar / Back to Play modes -->
	<div class="w-full max-w-3xl flex items-center justify-between mb-4">
		<a
			href={resolve('/play')}
			class="flex items-center gap-2 px-3 py-1.5 bg-[#181d28] hover:bg-[#252d3d] border border-slate-700 hover:border-amber-500/50 rounded-xl text-xs font-semibold text-slate-300 transition cursor-pointer"
			data-testid="setup-back-btn"
		>
			<ArrowLeft class="w-4 h-4 text-amber-400" />
			<span>Назад до вибору режимів</span>
		</a>

		<span
			class="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40"
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

	<!-- Match Setup Summary Card (Clean, Progressive Disclosure) -->
	<div
		class="w-full max-w-3xl bg-[#121622]/95 border-2 border-[#8c7456] rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 text-white select-none backdrop-blur"
		style="box-shadow: 0 0 40px rgba(0,0,0,0.85), inset 0 0 20px rgba(140,116,86,0.15);"
		data-testid="match-lobby-card"
	>
		<!-- Header -->
		<div class="border-b border-[#3b3226] pb-4 flex items-center justify-between">
			<div>
				<h1 class="text-2xl md:text-3xl font-black text-amber-300 uppercase tracking-wide">
					Передматчеве лобі
				</h1>
				<p class="text-xs text-slate-400 mt-1">
					Зведена інформація про майбутню битву. Готові до бою?
				</p>
			</div>

			<button
				type="button"
				onclick={() => (isConfigOpen = true)}
				class="hidden sm:flex items-center gap-2 py-2 px-3.5 bg-[#181d28] hover:bg-[#252d3d] border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
				data-testid="setup-config-btn-header"
			>
				<Sliders class="w-4 h-4" />
				<span>Конфігурація</span>
			</button>
		</div>

		<!-- Versus Match Card -->
		<div
			class="bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-rose-950/40 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4"
		>
			<!-- West: Player -->
			<div class="flex-1 text-center sm:text-left space-y-1">
				<div
					class="text-[10px] text-cyan-400 uppercase tracking-widest font-bold flex items-center justify-center sm:justify-start gap-1"
				>
					<Shield class="w-3.5 h-3.5" />
					<span>Західний замок (Ви)</span>
				</div>
				<div class="text-lg font-black text-cyan-200">
					{#if selectedWestRace === 'in_game'}
						🎯 Обрати на арені (15с)
					{:else if selectedWestRace === 'random'}
						🎲 Випадкова (+30% gold)
					{:else}
						{selectedWestRace}
					{/if}
				</div>
				<div class="text-[11px] text-slate-400">
					{selectedWestRace === 'in_game'
						? 'Вибір після старту битви'
						: 'Раса зафіксована у налаштуваннях'}
				</div>
			</div>

			<!-- VS Badge -->
			<div class="shrink-0 flex items-center justify-center">
				<span
					class="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center font-black text-sm text-amber-300 font-mono shadow-inner"
				>
					VS
				</span>
			</div>

			<!-- East: Bot -->
			<div class="flex-1 text-center sm:text-right space-y-1">
				<div
					class="text-[10px] text-rose-400 uppercase tracking-widest font-bold flex items-center justify-center sm:justify-end gap-1"
				>
					<Bot class="w-3.5 h-3.5" />
					<span>Східний замок (Бот)</span>
				</div>
				<div class="text-lg font-black text-rose-200">
					{selectedEastRace === 'random' ? '🎲 Випадкова раса' : selectedEastRace}
				</div>
				<div class="text-[11px] text-slate-400">
					{getDifficultyLabel(botDifficulty)}
				</div>
			</div>
		</div>

		<!-- Interactive Summary Pills (Click opens Configuration Modal) -->
		<div class="space-y-2">
			<div class="flex items-center justify-between text-xs font-bold text-slate-300">
				<span>Параметри матчу (натисніть для зміни):</span>
				<button
					type="button"
					onclick={() => (isConfigOpen = true)}
					class="text-amber-400 hover:text-amber-300 underline cursor-pointer text-[11px]"
				>
					Змінити всі
				</button>
			</div>

			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
				<!-- Bot Difficulty Pill -->
				<button
					type="button"
					onclick={() => (isConfigOpen = true)}
					class="py-2 px-2.5 rounded-xl border border-slate-800 bg-[#151a26] hover:border-amber-500/50 hover:bg-[#1b2233] transition cursor-pointer text-left flex flex-col justify-between gap-1"
					data-testid="summary-pill-difficulty"
				>
					<span class="text-[10px] text-slate-400 flex items-center gap-1">
						<Bot class="w-3 h-3 text-amber-400" />
						Складність
					</span>
					<span class="text-xs font-bold text-slate-200 truncate">
						{botDifficulty === 0
							? '0% Легка'
							: botDifficulty === 15
								? '15% Норма'
								: botDifficulty === 30
									? '30% Складна'
									: '80% Божевільна'}
					</span>
				</button>

				<!-- Starting Gold Pill -->
				<button
					type="button"
					onclick={() => (isConfigOpen = true)}
					class="py-2 px-2.5 rounded-xl border border-slate-800 bg-[#151a26] hover:border-amber-500/50 hover:bg-[#1b2233] transition cursor-pointer text-left flex flex-col justify-between gap-1"
					data-testid="summary-pill-gold"
				>
					<span class="text-[10px] text-slate-400 flex items-center gap-1">
						<Coins class="w-3 h-3 text-amber-400" />
						Золото
					</span>
					<span class="text-xs font-bold text-amber-300 font-mono">
						{startGold}g
					</span>
				</button>

				<!-- Team Size Pill -->
				<button
					type="button"
					onclick={() => (isConfigOpen = true)}
					class="py-2 px-2.5 rounded-xl border border-slate-800 bg-[#151a26] hover:border-amber-500/50 hover:bg-[#1b2233] transition cursor-pointer text-left flex flex-col justify-between gap-1"
					data-testid="summary-pill-team"
				>
					<span class="text-[10px] text-slate-400 flex items-center gap-1">
						<Users class="w-3 h-3 text-cyan-400" />
						Формат
					</span>
					<span class="text-xs font-bold text-cyan-200">
						{teamSize} на {teamSize}
					</span>
				</button>

				<!-- Target Wins Pill -->
				<button
					type="button"
					onclick={() => (isConfigOpen = true)}
					class="py-2 px-2.5 rounded-xl border border-slate-800 bg-[#151a26] hover:border-amber-500/50 hover:bg-[#1b2233] transition cursor-pointer text-left flex flex-col justify-between gap-1"
					data-testid="summary-pill-wins"
				>
					<span class="text-[10px] text-slate-400 flex items-center gap-1">
						<Trophy class="w-3 h-3 text-emerald-400" />
						Серія
					</span>
					<span class="text-xs font-bold text-emerald-200">
						До {targetWins}
						{targetWins === 1 ? 'перемоги' : 'перемог'}
					</span>
				</button>

				<!-- Fog of War Pill -->
				<button
					type="button"
					onclick={() => (isConfigOpen = true)}
					class="py-2 px-2.5 rounded-xl border border-slate-800 bg-[#151a26] hover:border-amber-500/50 hover:bg-[#1b2233] transition cursor-pointer text-left flex flex-col justify-between gap-1"
					data-testid="summary-pill-fog"
				>
					<span class="text-[10px] text-slate-400 flex items-center gap-1">
						<Eye class="w-3 h-3 text-cyan-400" />
						Туман
					</span>
					<span class="text-xs font-bold {fogOfWar ? 'text-cyan-300' : 'text-slate-500'}">
						{fogOfWar ? 'Увімкнено' : 'Вимкнено'}
					</span>
				</button>

				<!-- Coins Pill -->
				<button
					type="button"
					onclick={() => (isConfigOpen = true)}
					class="py-2 px-2.5 rounded-xl border border-slate-800 bg-[#151a26] hover:border-amber-500/50 hover:bg-[#1b2233] transition cursor-pointer text-left flex flex-col justify-between gap-1"
					data-testid="summary-pill-coins"
				>
					<span class="text-[10px] text-slate-400 flex items-center gap-1">
						<Coins class="w-3 h-3 text-amber-400" />
						Монети
					</span>
					<span class="text-xs font-bold text-slate-200">
						{coinMode === 'none' ? 'Вимкнено' : coinMode === 'crazy' ? 'Шалені' : '40 сек'}
					</span>
				</button>
			</div>
		</div>

		<!-- Action Footer: Two Clear Choices (Config vs Play) -->
		<div
			class="pt-5 border-t border-[#3b3226] flex flex-col sm:flex-row items-center justify-between gap-3"
		>
			<button
				type="button"
				onclick={() => (isConfigOpen = true)}
				class="w-full sm:w-auto py-3 px-5 rounded-xl border border-slate-700 bg-[#181d28] hover:bg-[#252d3d] text-slate-200 hover:text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
				data-testid="setup-config-btn"
			>
				<Sliders class="w-4 h-4 text-amber-400" />
				<span>Конфігурація (всі налаштування)</span>
			</button>

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

<!-- Unified Match Configuration Modal -->
<MatchConfigModal
	isOpen={isConfigOpen}
	currentConfig={{
		botDifficulty,
		startGold,
		teamSize,
		targetWins,
		fogOfWar,
		coinMode,
		westRace: selectedWestRace,
		eastRace: selectedEastRace,
		botVsBot
	}}
	onClose={() => (isConfigOpen = false)}
	onSave={handleConfigSaved}
/>
