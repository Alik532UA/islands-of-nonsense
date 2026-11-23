<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import {
		Bot,
		Sparkles,
		ArrowLeft,
		Eye,
		Sliders,
		ChevronLeft,
		ChevronRight,
		Play
	} from 'lucide-svelte';
	import { t } from '$lib/i18n';
	import { settings } from '$lib/services/settings.svelte';
	import { storage } from '$lib/services/storage';
	import type { SimulationConfig } from '$lib/engine/simulation';
	import MatchConfigModal from '$lib/components/MatchConfigModal.svelte';

	onMount(() => settings.claimHeader(t('menu.singleplayer'), () => goto(resolve('/'))));

	// State for MatchConfigModal
	let isConfigOpen = $state(false);
	let configInitialParams = $state<Partial<SimulationConfig>>({});

	// Quick adjustments state for Mode 1: vsBot
	const DIFFICULTIES = [0, 15, 30, 80] as const;
	const GOLDS = [150, 300, 500, 1000] as const;
	let vsBotDiffIndex = $state(1); // 15%
	let vsBotGoldIndex = $state(2); // 500g

	// Quick adjustments state for Mode 2: sandbox
	const COIN_MODES: ('none' | 'normal' | 'crazy')[] = ['normal', 'crazy', 'none'];
	let sandboxCoinIndex = $state(1); // crazy
	let sandboxDiffIndex = $state(0); // 0%

	// Quick adjustments state for Mode 3: botVsBot
	const TEAM_SIZES: (1 | 2 | 3)[] = [1, 2, 3];
	let botVsBotTeamIndex = $state(0); // 1v1
	let botVsBotDiffIndex = $state(1); // 15%

	function cycle<T>(arr: readonly T[] | T[], current: number, dir: -1 | 1): number {
		const next = current + dir;
		if (next < 0) return arr.length - 1;
		if (next >= arr.length) return 0;
		return next;
	}

	function getDiffName(val: number): string {
		switch (val) {
			case 0:
				return 'Легкий (0%)';
			case 15:
				return 'Звичайний (15%)';
			case 30:
				return 'Складний (30%)';
			case 80:
				return 'Божевільний (80%)';
			default:
				return `${val}%`;
		}
	}

	function getCoinName(val: 'none' | 'normal' | 'crazy'): string {
		switch (val) {
			case 'none':
				return 'Вимкнено';
			case 'normal':
				return '40 сек';
			case 'crazy':
				return 'Шалені (5)';
		}
	}

	function launchMatch(config: SimulationConfig, urlParam = '') {
		storage.setJSON('match_settings', config);
		let targetUrl = resolve('/play/battle');
		if (urlParam) targetUrl += `?mode=${urlParam}`;
		goto(targetUrl);
	}

	function startVsBotQuick() {
		launchMatch(
			{
				botDifficulty: DIFFICULTIES[vsBotDiffIndex],
				startGold: GOLDS[vsBotGoldIndex],
				modeId: 'standard',
				teamSize: 1,
				targetWins: 2,
				coinMode: 'normal',
				fogOfWar: true,
				botVsBot: false,
				westRace: 'in_game',
				eastRace: 'random'
			},
			'vsBot'
		);
	}

	function startSandboxQuick() {
		launchMatch(
			{
				botDifficulty: DIFFICULTIES[sandboxDiffIndex],
				startGold: 99999,
				modeId: 'sandbox',
				teamSize: 1,
				targetWins: 2,
				coinMode: COIN_MODES[sandboxCoinIndex],
				fogOfWar: false,
				botVsBot: false,
				westRace: 'in_game',
				eastRace: 'random'
			},
			'sandbox'
		);
	}

	function startBotVsBotQuick() {
		launchMatch(
			{
				botDifficulty: DIFFICULTIES[botVsBotDiffIndex],
				startGold: 500,
				modeId: 'botVsBot',
				teamSize: TEAM_SIZES[botVsBotTeamIndex],
				targetWins: 2,
				coinMode: 'normal',
				fogOfWar: false,
				botVsBot: true,
				westRace: 'random',
				eastRace: 'random'
			},
			'botVsBot'
		);
	}

	function openConfigFor(mode: 'classic' | 'sandbox' | 'botVsBot' | 'custom') {
		if (mode === 'classic') {
			configInitialParams = {
				botDifficulty: DIFFICULTIES[vsBotDiffIndex],
				startGold: GOLDS[vsBotGoldIndex],
				modeId: 'standard',
				teamSize: 1,
				targetWins: 2,
				coinMode: 'normal',
				fogOfWar: true,
				botVsBot: false,
				westRace: 'in_game',
				eastRace: 'random'
			};
		} else if (mode === 'sandbox') {
			configInitialParams = {
				botDifficulty: DIFFICULTIES[sandboxDiffIndex],
				startGold: 99999,
				modeId: 'sandbox',
				teamSize: 1,
				targetWins: 2,
				coinMode: COIN_MODES[sandboxCoinIndex],
				fogOfWar: false,
				botVsBot: false,
				westRace: 'in_game',
				eastRace: 'random'
			};
		} else if (mode === 'botVsBot') {
			configInitialParams = {
				botDifficulty: DIFFICULTIES[botVsBotDiffIndex],
				startGold: 500,
				modeId: 'botVsBot',
				teamSize: TEAM_SIZES[botVsBotTeamIndex],
				targetWins: 2,
				coinMode: 'normal',
				fogOfWar: false,
				botVsBot: true,
				westRace: 'random',
				eastRace: 'random'
			};
		} else {
			// Custom
			const saved = storage.getJSON<Partial<SimulationConfig>>('match_settings', {});
			configInitialParams = saved;
		}
		isConfigOpen = true;
	}
</script>

<svelte:head>
	<title>Castle Fight Web — {t('menu.singleplayer')}</title>
</svelte:head>

<div class="menu-page fill min-h-screen py-6 px-4 flex flex-col items-center justify-between">
	<!-- Header -->
	<header class="w-full max-w-4xl text-center mb-6">
		<h1 class="text-3xl md:text-4xl font-extrabold text-amber-300 tracking-wider uppercase mb-2">
			{t('menu.singleplayer')}
		</h1>
		<p class="text-sm text-slate-400">
			{t('menu.singleplayerDesc')}
		</p>
	</header>

	<!-- 4 Modes in a Row (Adaptive: 4 in a row on desktop lg, 2 on tablet sm, 1 on mobile) -->
	<div class="w-full max-w-7xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-2">
		<!-- 1. Classic Battle vs Bot -->
		<div
			class="group relative bg-[#131826] hover:bg-[#1a2236] border-2 border-[#2e3d5a] hover:border-amber-400/80 rounded-2xl shadow-xl transition-all duration-200 flex flex-col justify-between overflow-hidden"
			style="box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);"
			data-testid="play-battle-card"
		>
			<!-- Main Clickable Area (Starts Battle Immediately) -->
			<button
				type="button"
				onclick={startVsBotQuick}
				class="w-full p-5 text-center flex flex-col items-center gap-3 cursor-pointer flex-1"
				data-testid="play-battle-link"
				title="Швидкий бій проти ШІ"
			>
				<div
					class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 group-hover:scale-105 transition-transform"
				>
					<Bot class="w-10 h-10" />
				</div>
				<div>
					<h2 class="text-base font-extrabold text-amber-100">{t('menu.vsBot')}</h2>
					<p class="text-xs text-slate-400 mt-1 line-clamp-2">{t('menu.vsBotDesc')}</p>
				</div>
				<div
					class="mt-2 py-1 px-3 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[11px] flex items-center gap-1"
				>
					<Play class="w-3 h-3 fill-current" />
					<span>Швидкий бій</span>
				</div>
			</button>

			<!-- Hover Quick Controls Drawer -->
			<div class="bg-[#0e121d] border-t border-slate-800 p-3 space-y-2">
				<!-- Quick Arrow: Bot Difficulty -->
				<div class="flex items-center justify-between text-[11px]">
					<span class="text-slate-400">Складність:</span>
					<div
						class="flex items-center gap-1 bg-[#171e2e] px-1.5 py-0.5 rounded border border-slate-700"
					>
						<button
							type="button"
							onclick={(e) => {
								e.stopPropagation();
								vsBotDiffIndex = cycle(DIFFICULTIES, vsBotDiffIndex, -1);
							}}
							class="text-slate-400 hover:text-amber-300 p-0.5 cursor-pointer"
							title="Попередня складність"
						>
							<ChevronLeft class="w-3.5 h-3.5" />
						</button>
						<span class="font-bold text-amber-200 text-[10px] w-24 text-center truncate">
							{getDiffName(DIFFICULTIES[vsBotDiffIndex])}
						</span>
						<button
							type="button"
							onclick={(e) => {
								e.stopPropagation();
								vsBotDiffIndex = cycle(DIFFICULTIES, vsBotDiffIndex, 1);
							}}
							class="text-slate-400 hover:text-amber-300 p-0.5 cursor-pointer"
							title="Наступна складність"
						>
							<ChevronRight class="w-3.5 h-3.5" />
						</button>
					</div>
				</div>

				<!-- Quick Arrow: Gold -->
				<div class="flex items-center justify-between text-[11px]">
					<span class="text-slate-400">Золото:</span>
					<div
						class="flex items-center gap-1 bg-[#171e2e] px-1.5 py-0.5 rounded border border-slate-700"
					>
						<button
							type="button"
							onclick={(e) => {
								e.stopPropagation();
								vsBotGoldIndex = cycle(GOLDS, vsBotGoldIndex, -1);
							}}
							class="text-slate-400 hover:text-amber-300 p-0.5 cursor-pointer"
							title="Менше золота"
						>
							<ChevronLeft class="w-3.5 h-3.5" />
						</button>
						<span class="font-mono font-bold text-amber-300 text-[10px] w-14 text-center">
							{GOLDS[vsBotGoldIndex]}g
						</span>
						<button
							type="button"
							onclick={(e) => {
								e.stopPropagation();
								vsBotGoldIndex = cycle(GOLDS, vsBotGoldIndex, 1);
							}}
							class="text-slate-400 hover:text-amber-300 p-0.5 cursor-pointer"
							title="Більше золота"
						>
							<ChevronRight class="w-3.5 h-3.5" />
						</button>
					</div>
				</div>

				<!-- Customize Button -->
				<button
					type="button"
					onclick={() => openConfigFor('classic')}
					class="w-full py-1.5 px-2 rounded-lg bg-[#182133] hover:bg-[#222e47] border border-amber-500/30 text-amber-300 text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
					data-testid="customize-btn-vsBot"
				>
					<Sliders class="w-3.5 h-3.5" />
					<span>Налаштувати</span>
				</button>
			</div>
		</div>

		<!-- 2. Sandbox Testing Mode -->
		<div
			class="group relative bg-[#131826] hover:bg-[#1a2236] border-2 border-[#2e3d5a] hover:border-cyan-400/80 rounded-2xl shadow-xl transition-all duration-200 flex flex-col justify-between overflow-hidden"
			style="box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);"
			data-testid="play-sandbox-card"
		>
			<!-- Main Clickable Area -->
			<button
				type="button"
				onclick={startSandboxQuick}
				class="w-full p-5 text-center flex flex-col items-center gap-3 cursor-pointer flex-1"
				data-testid="play-sandbox-link"
				title="Швидкий запуск пісочниці"
			>
				<div
					class="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 group-hover:scale-105 transition-transform"
				>
					<Sparkles class="w-10 h-10" />
				</div>
				<div>
					<h2 class="text-base font-extrabold text-cyan-100">{t('menu.sandbox')}</h2>
					<p class="text-xs text-slate-400 mt-1 line-clamp-2">{t('menu.sandboxDesc')}</p>
				</div>
				<div
					class="mt-2 py-1 px-3 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[11px] flex items-center gap-1"
				>
					<Play class="w-3 h-3 fill-current" />
					<span>Швидкий запуск</span>
				</div>
			</button>

			<!-- Hover Quick Controls Drawer -->
			<div class="bg-[#0e121d] border-t border-slate-800 p-3 space-y-2">
				<!-- Quick Arrow: Coins Mode -->
				<div class="flex items-center justify-between text-[11px]">
					<span class="text-slate-400">Монети:</span>
					<div
						class="flex items-center gap-1 bg-[#171e2e] px-1.5 py-0.5 rounded border border-slate-700"
					>
						<button
							type="button"
							onclick={(e) => {
								e.stopPropagation();
								sandboxCoinIndex = cycle(COIN_MODES, sandboxCoinIndex, -1);
							}}
							class="text-slate-400 hover:text-cyan-300 p-0.5 cursor-pointer"
						>
							<ChevronLeft class="w-3.5 h-3.5" />
						</button>
						<span class="font-bold text-cyan-200 text-[10px] w-20 text-center truncate">
							{getCoinName(COIN_MODES[sandboxCoinIndex])}
						</span>
						<button
							type="button"
							onclick={(e) => {
								e.stopPropagation();
								sandboxCoinIndex = cycle(COIN_MODES, sandboxCoinIndex, 1);
							}}
							class="text-slate-400 hover:text-cyan-300 p-0.5 cursor-pointer"
						>
							<ChevronRight class="w-3.5 h-3.5" />
						</button>
					</div>
				</div>

				<!-- Quick Arrow: Bot Diff -->
				<div class="flex items-center justify-between text-[11px]">
					<span class="text-slate-400">Бот:</span>
					<div
						class="flex items-center gap-1 bg-[#171e2e] px-1.5 py-0.5 rounded border border-slate-700"
					>
						<button
							type="button"
							onclick={(e) => {
								e.stopPropagation();
								sandboxDiffIndex = cycle(DIFFICULTIES, sandboxDiffIndex, -1);
							}}
							class="text-slate-400 hover:text-cyan-300 p-0.5 cursor-pointer"
						>
							<ChevronLeft class="w-3.5 h-3.5" />
						</button>
						<span class="font-bold text-cyan-200 text-[10px] w-20 text-center truncate">
							{getDiffName(DIFFICULTIES[sandboxDiffIndex])}
						</span>
						<button
							type="button"
							onclick={(e) => {
								e.stopPropagation();
								sandboxDiffIndex = cycle(DIFFICULTIES, sandboxDiffIndex, 1);
							}}
							class="text-slate-400 hover:text-cyan-300 p-0.5 cursor-pointer"
						>
							<ChevronRight class="w-3.5 h-3.5" />
						</button>
					</div>
				</div>

				<!-- Customize Button -->
				<button
					type="button"
					onclick={() => openConfigFor('sandbox')}
					class="w-full py-1.5 px-2 rounded-lg bg-[#142333] hover:bg-[#1b3147] border border-cyan-500/30 text-cyan-300 text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
					data-testid="customize-btn-sandbox"
				>
					<Sliders class="w-3.5 h-3.5" />
					<span>Налаштувати</span>
				</button>
			</div>
		</div>

		<!-- 3. AI vs AI Spectator Mode -->
		<div
			class="group relative bg-[#131826] hover:bg-[#1a2236] border-2 border-[#2e3d5a] hover:border-emerald-400/80 rounded-2xl shadow-xl transition-all duration-200 flex flex-col justify-between overflow-hidden"
			style="box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);"
			data-testid="play-spectator-card"
		>
			<!-- Main Clickable Area -->
			<button
				type="button"
				onclick={startBotVsBotQuick}
				class="w-full p-5 text-center flex flex-col items-center gap-3 cursor-pointer flex-1"
				data-testid="play-spectator-link"
				title="Швидкий запуск спостереження"
			>
				<div
					class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 group-hover:scale-105 transition-transform"
				>
					<Eye class="w-10 h-10" />
				</div>
				<div>
					<h2 class="text-base font-extrabold text-emerald-100">{t('menu.botVsBot')}</h2>
					<p class="text-xs text-slate-400 mt-1 line-clamp-2">{t('menu.botVsBotDesc')}</p>
				</div>
				<div
					class="mt-2 py-1 px-3 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[11px] flex items-center gap-1"
				>
					<Play class="w-3 h-3 fill-current" />
					<span>Спостерігати</span>
				</div>
			</button>

			<!-- Hover Quick Controls Drawer -->
			<div class="bg-[#0e121d] border-t border-slate-800 p-3 space-y-2">
				<!-- Quick Arrow: Format -->
				<div class="flex items-center justify-between text-[11px]">
					<span class="text-slate-400">Формат:</span>
					<div
						class="flex items-center gap-1 bg-[#171e2e] px-1.5 py-0.5 rounded border border-slate-700"
					>
						<button
							type="button"
							onclick={(e) => {
								e.stopPropagation();
								botVsBotTeamIndex = cycle(TEAM_SIZES, botVsBotTeamIndex, -1);
							}}
							class="text-slate-400 hover:text-emerald-300 p-0.5 cursor-pointer"
						>
							<ChevronLeft class="w-3.5 h-3.5" />
						</button>
						<span class="font-bold text-emerald-200 text-[10px] w-16 text-center">
							{TEAM_SIZES[botVsBotTeamIndex]} на {TEAM_SIZES[botVsBotTeamIndex]}
						</span>
						<button
							type="button"
							onclick={(e) => {
								e.stopPropagation();
								botVsBotTeamIndex = cycle(TEAM_SIZES, botVsBotTeamIndex, 1);
							}}
							class="text-slate-400 hover:text-emerald-300 p-0.5 cursor-pointer"
						>
							<ChevronRight class="w-3.5 h-3.5" />
						</button>
					</div>
				</div>

				<!-- Quick Arrow: Bot Diff -->
				<div class="flex items-center justify-between text-[11px]">
					<span class="text-slate-400">Складність:</span>
					<div
						class="flex items-center gap-1 bg-[#171e2e] px-1.5 py-0.5 rounded border border-slate-700"
					>
						<button
							type="button"
							onclick={(e) => {
								e.stopPropagation();
								botVsBotDiffIndex = cycle(DIFFICULTIES, botVsBotDiffIndex, -1);
							}}
							class="text-slate-400 hover:text-emerald-300 p-0.5 cursor-pointer"
						>
							<ChevronLeft class="w-3.5 h-3.5" />
						</button>
						<span class="font-bold text-emerald-200 text-[10px] w-20 text-center truncate">
							{getDiffName(DIFFICULTIES[botVsBotDiffIndex])}
						</span>
						<button
							type="button"
							onclick={(e) => {
								e.stopPropagation();
								botVsBotDiffIndex = cycle(DIFFICULTIES, botVsBotDiffIndex, 1);
							}}
							class="text-slate-400 hover:text-emerald-300 p-0.5 cursor-pointer"
						>
							<ChevronRight class="w-3.5 h-3.5" />
						</button>
					</div>
				</div>

				<!-- Customize Button -->
				<button
					type="button"
					onclick={() => openConfigFor('botVsBot')}
					class="w-full py-1.5 px-2 rounded-lg bg-[#14261f] hover:bg-[#1a382d] border border-emerald-500/30 text-emerald-300 text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
					data-testid="customize-btn-botVsBot"
				>
					<Sliders class="w-3.5 h-3.5" />
					<span>Налаштувати</span>
				</button>
			</div>
		</div>

		<!-- 4. Custom Match (Replaces All Random) -->
		<div
			class="group relative bg-[#151326] hover:bg-[#1f1a38] border-2 border-[#3d2e5a] hover:border-purple-400/80 rounded-2xl shadow-xl transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer"
			style="box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);"
			onclick={() => openConfigFor('custom')}
			role="button"
			tabindex="0"
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') openConfigFor('custom');
			}}
			data-testid="play-custom-card"
		>
			<!-- Clickable card body opens configuration directly -->
			<div class="p-5 text-center flex flex-col items-center gap-3 flex-1 justify-center">
				<div
					class="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 group-hover:scale-105 transition-transform"
				>
					<Sliders class="w-10 h-10" />
				</div>
				<div>
					<h2 class="text-base font-extrabold text-purple-100">Власний бій (Custom)</h2>
					<p class="text-xs text-slate-400 mt-1 line-clamp-3">
						Повна свобода правил: будь-які раси, бани, ресурси, швидкість та 12 режимів
					</p>
				</div>
				<div
					class="mt-2 py-1 px-3 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[11px] flex items-center gap-1 border border-purple-500/40"
				>
					<span>⚙️</span>
					<span>Повна конфігурація</span>
				</div>
			</div>

			<!-- Footer CTA -->
			<div class="bg-[#0f0e1d] border-t border-slate-800 p-3">
				<button
					type="button"
					onclick={() => openConfigFor('custom')}
					class="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-purple-900/30"
					data-testid="open-custom-config-btn"
				>
					<Sliders class="w-3.5 h-3.5" />
					<span>Відкрити конфігурацію</span>
				</button>
			</div>
		</div>
	</div>

	<!-- Back link -->
	<div class="menu-links mt-8">
		<a href={resolve('/')} class="menu-btn menu-btn--link" data-testid="back-to-menu-link">
			<ArrowLeft class="menu-link__icon" />
			<span>{t('menu.back')}</span>
		</a>
	</div>
</div>

<!-- Unified Match Configuration Modal -->
<MatchConfigModal
	isOpen={isConfigOpen}
	currentConfig={configInitialParams}
	onClose={() => (isConfigOpen = false)}
	onStartMatch={(config) => launchMatch(config)}
/>
