<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { Bot, Sparkles, Eye, Sliders, ChevronLeft, ChevronRight, Play } from 'lucide-svelte';
	import { t } from '$lib/i18n';
	import { settings } from '$lib/services/settings.svelte';
	import { storage } from '$lib/services/storage';
	import { type SimulationConfig } from '$lib/engine/simulation';
	import {
		QUICK_DIFFICULTIES as DIFFICULTIES,
		QUICK_GOLDS as GOLDS,
		QUICK_SANDBOX_GOLDS as SANDBOX_GOLDS,
		QUICK_COIN_MODES as COIN_MODES,
		QUICK_TEAM_SIZES as TEAM_SIZES,
		QUICK_TARGET_WINS as TARGET_WINS,
		QUICK_FOG_OPTIONS as FOG_OPTIONS,
		QUICK_PLAYER_RACES as PLAYER_RACES,
		QUICK_BOT_RACES as BOT_RACES,
		getDefaultQuickSettingsState,
		sanitizeQuickSettingsState,
		buildQuickMatchConfig,
		type QuickSettingsState
	} from '$lib/engine/matchConfig';
	import MatchConfigModal from '$lib/components/MatchConfigModal.svelte';

	// State for MatchConfigModal
	let isConfigOpen = $state(false);
	let configInitialParams = $state<Partial<SimulationConfig>>({});

	$effect(() => {
		const release = settings.claimHeader(
			isConfigOpen ? 'Конфігурація матчу' : t('menu.singleplayer'),
			() => {
				if (isConfigOpen) {
					isConfigOpen = false;
				} else {
					goto(resolve('/'));
				}
			}
		);
		return release;
	});

	const defaults = getDefaultQuickSettingsState();

	// Mode 1: vsBot state
	let vsBotDiffIndex = $state(defaults.vsBotDiffIndex);
	let vsBotGoldIndex = $state(defaults.vsBotGoldIndex);
	let vsBotTeamIndex = $state(defaults.vsBotTeamIndex);
	let vsBotWinsIndex = $state(defaults.vsBotWinsIndex);
	let vsBotWestRaceIndex = $state(defaults.vsBotWestRaceIndex);
	let vsBotEastRaceIndex = $state(defaults.vsBotEastRaceIndex);
	let vsBotCoinIndex = $state(defaults.vsBotCoinIndex);
	let vsBotFogIndex = $state(defaults.vsBotFogIndex);

	// Mode 2: sandbox state
	let sandboxGoldIndex = $state(defaults.sandboxGoldIndex);
	let sandboxCoinIndex = $state(defaults.sandboxCoinIndex);
	let sandboxFogIndex = $state(defaults.sandboxFogIndex);
	let sandboxDiffIndex = $state(defaults.sandboxDiffIndex);
	let sandboxTeamIndex = $state(defaults.sandboxTeamIndex);
	let sandboxWinsIndex = $state(defaults.sandboxWinsIndex);
	let sandboxWestRaceIndex = $state(defaults.sandboxWestRaceIndex);
	let sandboxEastRaceIndex = $state(defaults.sandboxEastRaceIndex);

	// Mode 3: botVsBot state
	let botVsBotTeamIndex = $state(defaults.botVsBotTeamIndex);
	let botVsBotDiffIndex = $state(defaults.botVsBotDiffIndex);
	let botVsBotGoldIndex = $state(defaults.botVsBotGoldIndex);
	let botVsBotWinsIndex = $state(defaults.botVsBotWinsIndex);
	let botVsBotWestRaceIndex = $state(defaults.botVsBotWestRaceIndex);
	let botVsBotEastRaceIndex = $state(defaults.botVsBotEastRaceIndex);
	let botVsBotCoinIndex = $state(defaults.botVsBotCoinIndex);
	let botVsBotFogIndex = $state(defaults.botVsBotFogIndex);

	let quickHydrated = false;

	function currentQuickState(): QuickSettingsState {
		return {
			vsBotDiffIndex,
			vsBotGoldIndex,
			vsBotTeamIndex,
			vsBotWinsIndex,
			vsBotWestRaceIndex,
			vsBotEastRaceIndex,
			vsBotCoinIndex,
			vsBotFogIndex,
			sandboxGoldIndex,
			sandboxCoinIndex,
			sandboxFogIndex,
			sandboxDiffIndex,
			sandboxTeamIndex,
			sandboxWinsIndex,
			sandboxWestRaceIndex,
			sandboxEastRaceIndex,
			botVsBotTeamIndex,
			botVsBotDiffIndex,
			botVsBotGoldIndex,
			botVsBotWinsIndex,
			botVsBotWestRaceIndex,
			botVsBotEastRaceIndex,
			botVsBotCoinIndex,
			botVsBotFogIndex
		};
	}

	function applyQuickState(s: QuickSettingsState) {
		vsBotDiffIndex = s.vsBotDiffIndex;
		vsBotGoldIndex = s.vsBotGoldIndex;
		vsBotTeamIndex = s.vsBotTeamIndex;
		vsBotWinsIndex = s.vsBotWinsIndex;
		vsBotWestRaceIndex = s.vsBotWestRaceIndex;
		vsBotEastRaceIndex = s.vsBotEastRaceIndex;
		vsBotCoinIndex = s.vsBotCoinIndex;
		vsBotFogIndex = s.vsBotFogIndex;

		sandboxGoldIndex = s.sandboxGoldIndex;
		sandboxCoinIndex = s.sandboxCoinIndex;
		sandboxFogIndex = s.sandboxFogIndex;
		sandboxDiffIndex = s.sandboxDiffIndex;
		sandboxTeamIndex = s.sandboxTeamIndex;
		sandboxWinsIndex = s.sandboxWinsIndex;
		sandboxWestRaceIndex = s.sandboxWestRaceIndex;
		sandboxEastRaceIndex = s.sandboxEastRaceIndex;

		botVsBotTeamIndex = s.botVsBotTeamIndex;
		botVsBotDiffIndex = s.botVsBotDiffIndex;
		botVsBotGoldIndex = s.botVsBotGoldIndex;
		botVsBotWinsIndex = s.botVsBotWinsIndex;
		botVsBotWestRaceIndex = s.botVsBotWestRaceIndex;
		botVsBotEastRaceIndex = s.botVsBotEastRaceIndex;
		botVsBotCoinIndex = s.botVsBotCoinIndex;
		botVsBotFogIndex = s.botVsBotFogIndex;
	}

	onMount(() => {
		const savedQuick = storage.getJSON<Partial<QuickSettingsState> | null>(
			'play_quick_settings',
			null
		);
		if (savedQuick) {
			applyQuickState(sanitizeQuickSettingsState(savedQuick));
		}
		quickHydrated = true;
	});

	$effect(() => {
		const snapshot = currentQuickState();
		if (quickHydrated) {
			storage.setJSON('play_quick_settings', snapshot);
		}
	});

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
		launchMatch(buildQuickMatchConfig('vsBot', currentQuickState()), 'vsBot');
	}

	function startSandboxQuick() {
		launchMatch(buildQuickMatchConfig('sandbox', currentQuickState()), 'sandbox');
	}

	function startBotVsBotQuick() {
		launchMatch(buildQuickMatchConfig('botVsBot', currentQuickState()), 'botVsBot');
	}

	function openConfigFor(mode: 'classic' | 'sandbox' | 'botVsBot' | 'custom') {
		if (mode === 'classic') {
			configInitialParams = buildQuickMatchConfig('vsBot', currentQuickState());
		} else if (mode === 'sandbox') {
			configInitialParams = buildQuickMatchConfig('sandbox', currentQuickState());
		} else if (mode === 'botVsBot') {
			configInitialParams = buildQuickMatchConfig('botVsBot', currentQuickState());
		} else {
			const saved = storage.getJSON<Partial<SimulationConfig>>('match_settings', {});
			configInitialParams = saved;
		}
		isConfigOpen = true;
	}
</script>

<svelte:head>
	<title>Castle Fight Web — {t('menu.singleplayer')}</title>
</svelte:head>

<div
	class="menu-page fill min-h-[calc(100dvh-56px)] {isConfigOpen
		? 'h-auto py-3 px-1 sm:px-3'
		: 'h-auto lg:h-[calc(100dvh-56px)] px-4'} flex flex-col items-center relative overflow-y-auto overflow-x-hidden"
>
	{#if !isConfigOpen}
		<!-- Top Spacer: 1 part for ~20% above-center placement -->
		<div class="flex-[1] min-h-[16px] max-h-[14vh] pointer-events-none shrink-0"></div>

		<!-- 4 Modes in a Row (Adaptive: 4 in a row on desktop lg, 2 on tablet sm, 1 on mobile) -->
		<div
			class="w-full max-w-7xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-2 items-start animate-in fade-in duration-300 shrink-0"
		>
			<!-- 1. Classic Battle vs Computer -->
			<div
				class="group relative bg-[var(--color-bg-card,#131826)] hover:bg-[var(--color-bg-card-hover,#182033)] border-2 border-[var(--color-border-card,#2e3d5a)] hover:border-amber-400/80 rounded-2xl shadow-xl transition-colors duration-200 flex flex-col"
				style="box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);"
				data-testid="play-battle-card"
			>
				<!-- Top Button: Customize (slides up on hover, no extra wrapper container) -->
				<button
					type="button"
					onclick={() => openConfigFor('classic')}
					class="absolute bottom-[calc(100%+8px)] left-3 right-3 z-40 opacity-0 -translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto transition-all duration-200 py-1.5 px-3 rounded-xl bg-[var(--color-bg-card,#131826)]/95 hover:bg-amber-500/20 backdrop-blur-md border border-amber-400/70 text-[var(--color-heading,#fef08a)] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg invisible group-hover:visible group-focus-within:visible"
					style="box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);"
					data-testid="customize-btn-vsBot"
				>
					<Sliders class="w-3.5 h-3.5 text-amber-300" />
					<span>Налаштувати</span>
				</button>

				<!-- Top Main Click Area (Starts Battle Immediately) -->
				<button
					type="button"
					onclick={startVsBotQuick}
					class="w-full p-6 text-center flex flex-col items-center justify-center gap-3 cursor-pointer group/btn focus:outline-none relative"
					data-testid="play-battle-link"
				>
					<!-- Large Rotating Icon morphing to Play button on hover -->
					<div class="relative w-24 h-24 my-2 flex items-center justify-center">
						<!-- Ambient glow backlight -->
						<div
							class="absolute inset-0 rounded-full bg-amber-500/10 blur-xl group-hover:bg-amber-500/25 transition-all duration-300"
						></div>

						<!-- Normal state: Large Bot Icon (rotates 90deg and fades out on hover) -->
						<div
							class="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out transform group-hover:rotate-90 group-hover:scale-50 group-hover:opacity-0"
						>
							<Bot class="w-20 h-20 text-amber-400 drop-shadow-[0_4px_16px_rgba(245,158,11,0.4)]" />
						</div>

						<!-- Hover state: Big Play Button (rotates from -90deg to 0deg and fades in) -->
						<div
							class="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out transform -rotate-90 scale-50 opacity-0 group-hover:rotate-0 group-hover:scale-100 group-hover:opacity-100"
						>
							<div
								class="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center shadow-[0_0_24px_rgba(245,158,11,0.6)] group-hover:scale-105 transition-transform"
							>
								<Play class="w-10 h-10 text-amber-300 fill-amber-300 ml-1.5 drop-shadow" />
							</div>
						</div>
					</div>

					<!-- Title Only (No Description, No (AI)) -->
					<h2
						class="text-lg font-black text-[var(--color-heading,#fef08a)] tracking-wide text-center"
					>
						{t('menu.vsBot')}
					</h2>
				</button>

				<!-- Quick Settings Drawer (Floats downward without shifting neighboring elements) -->
				<div
					class="absolute top-[calc(100%+8px)] left-3 right-3 z-40 opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto transition-all duration-200 bg-[var(--color-bg-card,#131826)]/95 backdrop-blur-md border border-amber-400/70 rounded-xl shadow-2xl p-3 space-y-1.5 invisible group-hover:visible group-focus-within:visible"
					style="box-shadow: 0 16px 32px rgba(0, 0, 0, 0.6);"
				>
					<!-- 1. Difficulty -->
					<div class="flex items-center justify-between text-[11px] py-0.5">
						<span class="text-[var(--color-text-muted)] truncate">Складність:</span>
						<div
							class="flex items-center gap-1 bg-[var(--color-pill-bg,#141b2a)] px-1.5 py-0.5 rounded border border-[var(--color-pill-border,#2e3d5a)]"
						>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									vsBotDiffIndex = cycle(DIFFICULTIES, vsBotDiffIndex, -1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronLeft class="w-3.5 h-3.5" />
							</button>
							<span
								class="font-bold text-[var(--color-text)] text-[10px] w-24 text-center truncate"
							>
								{getDiffName(DIFFICULTIES[vsBotDiffIndex])}
							</span>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									vsBotDiffIndex = cycle(DIFFICULTIES, vsBotDiffIndex, 1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<!-- 2. Gold -->
					<div class="flex items-center justify-between text-[11px] py-0.5">
						<span class="text-[var(--color-text-muted)] truncate">Золото:</span>
						<div
							class="flex items-center gap-1 bg-[var(--color-pill-bg,#141b2a)] px-1.5 py-0.5 rounded border border-[var(--color-pill-border,#2e3d5a)]"
						>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									vsBotGoldIndex = cycle(GOLDS, vsBotGoldIndex, -1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronLeft class="w-3.5 h-3.5" />
							</button>
							<span class="font-mono font-bold text-amber-300 text-[10px] w-24 text-center">
								{GOLDS[vsBotGoldIndex]}g
							</span>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									vsBotGoldIndex = cycle(GOLDS, vsBotGoldIndex, 1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<!-- 3. Format -->
					<div class="flex items-center justify-between text-[11px] py-0.5">
						<span class="text-[var(--color-text-muted)] truncate">Формат:</span>
						<div
							class="flex items-center gap-1 bg-[var(--color-pill-bg,#141b2a)] px-1.5 py-0.5 rounded border border-[var(--color-pill-border,#2e3d5a)]"
						>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									vsBotTeamIndex = cycle(TEAM_SIZES, vsBotTeamIndex, -1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronLeft class="w-3.5 h-3.5" />
							</button>
							<span class="font-bold text-[var(--color-text)] text-[10px] w-24 text-center">
								{TEAM_SIZES[vsBotTeamIndex]} на {TEAM_SIZES[vsBotTeamIndex]}
							</span>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									vsBotTeamIndex = cycle(TEAM_SIZES, vsBotTeamIndex, 1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<!-- 4. Target Wins -->
					<div class="flex items-center justify-between text-[11px] py-0.5">
						<span class="text-[var(--color-text-muted)] truncate">Перемог:</span>
						<div
							class="flex items-center gap-1 bg-[var(--color-pill-bg,#141b2a)] px-1.5 py-0.5 rounded border border-[var(--color-pill-border,#2e3d5a)]"
						>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									vsBotWinsIndex = cycle(TARGET_WINS, vsBotWinsIndex, -1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronLeft class="w-3.5 h-3.5" />
							</button>
							<span class="font-bold text-[var(--color-text)] text-[10px] w-24 text-center">
								До {TARGET_WINS[vsBotWinsIndex]}
								{TARGET_WINS[vsBotWinsIndex] === 1 ? 'перемоги' : 'перемог'}
							</span>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									vsBotWinsIndex = cycle(TARGET_WINS, vsBotWinsIndex, 1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<!-- 5. Player Race -->
					<div class="flex items-center justify-between text-[11px] py-0.5">
						<span class="text-[var(--color-text-muted)] truncate">Ваша раса:</span>
						<div
							class="flex items-center gap-1 bg-[var(--color-pill-bg,#141b2a)] px-1.5 py-0.5 rounded border border-[var(--color-pill-border,#2e3d5a)]"
						>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									vsBotWestRaceIndex = cycle(PLAYER_RACES, vsBotWestRaceIndex, -1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronLeft class="w-3.5 h-3.5" />
							</button>
							<span
								class="font-bold text-[var(--color-text)] text-[10px] w-24 text-center truncate"
							>
								{PLAYER_RACES[vsBotWestRaceIndex].label}
							</span>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									vsBotWestRaceIndex = cycle(PLAYER_RACES, vsBotWestRaceIndex, 1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<!-- 6. Bot Race -->
					<div class="flex items-center justify-between text-[11px] py-0.5">
						<span class="text-[var(--color-text-muted)] truncate">Раса бота:</span>
						<div
							class="flex items-center gap-1 bg-[var(--color-pill-bg,#141b2a)] px-1.5 py-0.5 rounded border border-[var(--color-pill-border,#2e3d5a)]"
						>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									vsBotEastRaceIndex = cycle(BOT_RACES, vsBotEastRaceIndex, -1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronLeft class="w-3.5 h-3.5" />
							</button>
							<span
								class="font-bold text-[var(--color-text)] text-[10px] w-24 text-center truncate"
							>
								{BOT_RACES[vsBotEastRaceIndex].label}
							</span>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									vsBotEastRaceIndex = cycle(BOT_RACES, vsBotEastRaceIndex, 1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<!-- 7. Coins -->
					<div class="flex items-center justify-between text-[11px] py-0.5">
						<span class="text-[var(--color-text-muted)] truncate">Монети:</span>
						<div
							class="flex items-center gap-1 bg-[var(--color-pill-bg,#141b2a)] px-1.5 py-0.5 rounded border border-[var(--color-pill-border,#2e3d5a)]"
						>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									vsBotCoinIndex = cycle(COIN_MODES, vsBotCoinIndex, -1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronLeft class="w-3.5 h-3.5" />
							</button>
							<span
								class="font-bold text-[var(--color-text)] text-[10px] w-24 text-center truncate"
							>
								{getCoinName(COIN_MODES[vsBotCoinIndex])}
							</span>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									vsBotCoinIndex = cycle(COIN_MODES, vsBotCoinIndex, 1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<!-- 8. Fog of War -->
					<div class="flex items-center justify-between text-[11px] py-0.5">
						<span class="text-[var(--color-text-muted)] truncate">Туман війни:</span>
						<div
							class="flex items-center gap-1 bg-[var(--color-pill-bg,#141b2a)] px-1.5 py-0.5 rounded border border-[var(--color-pill-border,#2e3d5a)]"
						>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									vsBotFogIndex = cycle(FOG_OPTIONS, vsBotFogIndex, -1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronLeft class="w-3.5 h-3.5" />
							</button>
							<span class="font-bold text-[var(--color-text)] text-[10px] w-24 text-center">
								{FOG_OPTIONS[vsBotFogIndex] ? 'Увімкнено' : 'Вимкнено'}
							</span>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									vsBotFogIndex = cycle(FOG_OPTIONS, vsBotFogIndex, 1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- 2. Sandbox Testing Mode -->
			<div
				class="group relative bg-[var(--color-bg-card,#131826)] hover:bg-[var(--color-bg-card-hover,#152331)] border-2 border-[var(--color-border-card,#2e3d5a)] hover:border-cyan-400/80 rounded-2xl shadow-xl transition-colors duration-200 flex flex-col"
				style="box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);"
				data-testid="play-sandbox-card"
			>
				<!-- Top Button: Customize (slides up on hover, no extra wrapper container) -->
				<button
					type="button"
					onclick={() => openConfigFor('sandbox')}
					class="absolute bottom-[calc(100%+8px)] left-3 right-3 z-40 opacity-0 -translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto transition-all duration-200 py-1.5 px-3 rounded-xl bg-[var(--color-bg-card,#131826)]/95 hover:bg-cyan-500/20 backdrop-blur-md border border-cyan-400/70 text-[var(--color-heading,#fef08a)] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg invisible group-hover:visible group-focus-within:visible"
					style="box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);"
					data-testid="customize-btn-sandbox"
				>
					<Sliders class="w-3.5 h-3.5 text-cyan-300" />
					<span>Налаштувати</span>
				</button>

				<!-- Top Main Click Area (Starts Sandbox Immediately) -->
				<button
					type="button"
					onclick={startSandboxQuick}
					class="w-full p-6 text-center flex flex-col items-center justify-center gap-3 cursor-pointer group/btn focus:outline-none relative"
					data-testid="play-sandbox-link"
				>
					<!-- Large Rotating Icon morphing to Play button on hover -->
					<div class="relative w-24 h-24 my-2 flex items-center justify-center">
						<!-- Ambient glow backlight -->
						<div
							class="absolute inset-0 rounded-full bg-cyan-500/10 blur-xl group-hover:bg-cyan-500/25 transition-all duration-300"
						></div>

						<!-- Normal state: Large Sparkles Icon (rotates 90deg and fades out on hover) -->
						<div
							class="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out transform group-hover:rotate-90 group-hover:scale-50 group-hover:opacity-0"
						>
							<Sparkles
								class="w-20 h-20 text-cyan-400 drop-shadow-[0_4px_16px_rgba(6,182,212,0.4)]"
							/>
						</div>

						<!-- Hover state: Big Play Button (rotates from -90deg to 0deg and fades in) -->
						<div
							class="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out transform -rotate-90 scale-50 opacity-0 group-hover:rotate-0 group-hover:scale-100 group-hover:opacity-100"
						>
							<div
								class="w-20 h-20 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_24px_rgba(6,182,212,0.6)] group-hover:scale-105 transition-transform"
							>
								<Play class="w-10 h-10 text-cyan-300 fill-cyan-300 ml-1.5 drop-shadow" />
							</div>
						</div>
					</div>

					<!-- Title Only -->
					<h2
						class="text-lg font-black text-[var(--color-heading,#fef08a)] tracking-wide text-center"
					>
						{t('menu.sandbox')}
					</h2>
				</button>

				<!-- Quick Settings Drawer (Floats downward without shifting neighboring elements) -->
				<div
					class="absolute top-[calc(100%+8px)] left-3 right-3 z-40 opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto transition-all duration-200 bg-[var(--color-bg-card,#131826)]/95 backdrop-blur-md border border-cyan-400/70 rounded-xl shadow-2xl p-3 space-y-1.5 invisible group-hover:visible group-focus-within:visible"
					style="box-shadow: 0 16px 32px rgba(0, 0, 0, 0.6);"
				>
					<!-- 1. Gold -->
					<div class="flex items-center justify-between text-[11px] py-0.5">
						<span class="text-[var(--color-text-muted)] truncate">Золото:</span>
						<div
							class="flex items-center gap-1 bg-[var(--color-pill-bg,#141b2a)] px-1.5 py-0.5 rounded border border-[var(--color-pill-border,#2e3d5a)]"
						>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									sandboxGoldIndex = cycle(SANDBOX_GOLDS, sandboxGoldIndex, -1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronLeft class="w-3.5 h-3.5" />
							</button>
							<span class="font-mono font-bold text-cyan-300 text-[10px] w-24 text-center">
								{SANDBOX_GOLDS[sandboxGoldIndex] > 90000
									? '∞ Необмежено'
									: `${SANDBOX_GOLDS[sandboxGoldIndex]}g`}
							</span>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									sandboxGoldIndex = cycle(SANDBOX_GOLDS, sandboxGoldIndex, 1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<!-- 2. Coins Mode -->
					<div class="flex items-center justify-between text-[11px] py-0.5">
						<span class="text-[var(--color-text-muted)] truncate">Монети:</span>
						<div
							class="flex items-center gap-1 bg-[var(--color-pill-bg,#141b2a)] px-1.5 py-0.5 rounded border border-[var(--color-pill-border,#2e3d5a)]"
						>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									sandboxCoinIndex = cycle(COIN_MODES, sandboxCoinIndex, -1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronLeft class="w-3.5 h-3.5" />
							</button>
							<span
								class="font-bold text-[var(--color-text)] text-[10px] w-24 text-center truncate"
							>
								{getCoinName(COIN_MODES[sandboxCoinIndex])}
							</span>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									sandboxCoinIndex = cycle(COIN_MODES, sandboxCoinIndex, 1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<!-- 3. Fog of War -->
					<div class="flex items-center justify-between text-[11px] py-0.5">
						<span class="text-[var(--color-text-muted)] truncate">Туман війни:</span>
						<div
							class="flex items-center gap-1 bg-[var(--color-pill-bg,#141b2a)] px-1.5 py-0.5 rounded border border-[var(--color-pill-border,#2e3d5a)]"
						>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									sandboxFogIndex = cycle(FOG_OPTIONS, sandboxFogIndex, -1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronLeft class="w-3.5 h-3.5" />
							</button>
							<span class="font-bold text-[var(--color-text)] text-[10px] w-24 text-center">
								{FOG_OPTIONS[sandboxFogIndex] ? 'Увімкнено' : 'Вимкнено'}
							</span>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									sandboxFogIndex = cycle(FOG_OPTIONS, sandboxFogIndex, 1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<!-- 4. Bot Difficulty -->
					<div class="flex items-center justify-between text-[11px] py-0.5">
						<span class="text-[var(--color-text-muted)] truncate">Складність:</span>
						<div
							class="flex items-center gap-1 bg-[var(--color-pill-bg,#141b2a)] px-1.5 py-0.5 rounded border border-[var(--color-pill-border,#2e3d5a)]"
						>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									sandboxDiffIndex = cycle(DIFFICULTIES, sandboxDiffIndex, -1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronLeft class="w-3.5 h-3.5" />
							</button>
							<span
								class="font-bold text-[var(--color-text)] text-[10px] w-24 text-center truncate"
							>
								{getDiffName(DIFFICULTIES[sandboxDiffIndex])}
							</span>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									sandboxDiffIndex = cycle(DIFFICULTIES, sandboxDiffIndex, 1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<!-- 5. Format -->
					<div class="flex items-center justify-between text-[11px] py-0.5">
						<span class="text-[var(--color-text-muted)] truncate">Формат:</span>
						<div
							class="flex items-center gap-1 bg-[var(--color-pill-bg,#141b2a)] px-1.5 py-0.5 rounded border border-[var(--color-pill-border,#2e3d5a)]"
						>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									sandboxTeamIndex = cycle(TEAM_SIZES, sandboxTeamIndex, -1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronLeft class="w-3.5 h-3.5" />
							</button>
							<span class="font-bold text-[var(--color-text)] text-[10px] w-24 text-center">
								{TEAM_SIZES[sandboxTeamIndex]} на {TEAM_SIZES[sandboxTeamIndex]}
							</span>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									sandboxTeamIndex = cycle(TEAM_SIZES, sandboxTeamIndex, 1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<!-- 6. Target Wins -->
					<div class="flex items-center justify-between text-[11px] py-0.5">
						<span class="text-[var(--color-text-muted)] truncate">Перемог:</span>
						<div
							class="flex items-center gap-1 bg-[var(--color-pill-bg,#141b2a)] px-1.5 py-0.5 rounded border border-[var(--color-pill-border,#2e3d5a)]"
						>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									sandboxWinsIndex = cycle(TARGET_WINS, sandboxWinsIndex, -1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronLeft class="w-3.5 h-3.5" />
							</button>
							<span class="font-bold text-[var(--color-text)] text-[10px] w-24 text-center">
								До {TARGET_WINS[sandboxWinsIndex]}
							</span>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									sandboxWinsIndex = cycle(TARGET_WINS, sandboxWinsIndex, 1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<!-- 7. Player Race -->
					<div class="flex items-center justify-between text-[11px] py-0.5">
						<span class="text-[var(--color-text-muted)] truncate">Ваша раса:</span>
						<div
							class="flex items-center gap-1 bg-[var(--color-pill-bg,#141b2a)] px-1.5 py-0.5 rounded border border-[var(--color-pill-border,#2e3d5a)]"
						>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									sandboxWestRaceIndex = cycle(PLAYER_RACES, sandboxWestRaceIndex, -1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronLeft class="w-3.5 h-3.5" />
							</button>
							<span
								class="font-bold text-[var(--color-text)] text-[10px] w-24 text-center truncate"
							>
								{PLAYER_RACES[sandboxWestRaceIndex].label}
							</span>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									sandboxWestRaceIndex = cycle(PLAYER_RACES, sandboxWestRaceIndex, 1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<!-- 8. Bot Race -->
					<div class="flex items-center justify-between text-[11px] py-0.5">
						<span class="text-[var(--color-text-muted)] truncate">Раса бота:</span>
						<div
							class="flex items-center gap-1 bg-[var(--color-pill-bg,#141b2a)] px-1.5 py-0.5 rounded border border-[var(--color-pill-border,#2e3d5a)]"
						>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									sandboxEastRaceIndex = cycle(BOT_RACES, sandboxEastRaceIndex, -1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronLeft class="w-3.5 h-3.5" />
							</button>
							<span
								class="font-bold text-[var(--color-text)] text-[10px] w-24 text-center truncate"
							>
								{BOT_RACES[sandboxEastRaceIndex].label}
							</span>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									sandboxEastRaceIndex = cycle(BOT_RACES, sandboxEastRaceIndex, 1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- 3. AI vs AI Spectator Mode -->
			<div
				class="group relative bg-[var(--color-bg-card,#131826)] hover:bg-[var(--color-bg-card-hover,#14241e)] border-2 border-[var(--color-border-card,#2e3d5a)] hover:border-emerald-400/80 rounded-2xl shadow-xl transition-colors duration-200 flex flex-col"
				style="box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);"
				data-testid="play-spectator-card"
			>
				<!-- Top Button: Customize (slides up on hover, no extra wrapper container) -->
				<button
					type="button"
					onclick={() => openConfigFor('botVsBot')}
					class="absolute bottom-[calc(100%+8px)] left-3 right-3 z-40 opacity-0 -translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto transition-all duration-200 py-1.5 px-3 rounded-xl bg-[var(--color-bg-card,#131826)]/95 hover:bg-emerald-500/20 backdrop-blur-md border border-emerald-400/70 text-[var(--color-heading,#fef08a)] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg invisible group-hover:visible group-focus-within:visible"
					style="box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);"
					data-testid="customize-btn-botVsBot"
				>
					<Sliders class="w-3.5 h-3.5 text-emerald-300" />
					<span>Налаштувати</span>
				</button>

				<!-- Top Main Click Area (Starts Bot vs Bot Immediately) -->
				<button
					type="button"
					onclick={startBotVsBotQuick}
					class="w-full p-6 text-center flex flex-col items-center justify-center gap-3 cursor-pointer group/btn focus:outline-none relative"
					data-testid="play-spectator-link"
				>
					<!-- Large Rotating Icon morphing to Play button on hover -->
					<div class="relative w-24 h-24 my-2 flex items-center justify-center">
						<!-- Ambient glow backlight -->
						<div
							class="absolute inset-0 rounded-full bg-emerald-500/10 blur-xl group-hover:bg-emerald-500/25 transition-all duration-300"
						></div>

						<!-- Normal state: Large Eye Icon (rotates 90deg and fades out on hover) -->
						<div
							class="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out transform group-hover:rotate-90 group-hover:scale-50 group-hover:opacity-0"
						>
							<Eye
								class="w-20 h-20 text-emerald-400 drop-shadow-[0_4px_16px_rgba(16,185,129,0.4)]"
							/>
						</div>

						<!-- Hover state: Big Play Button (rotates from -90deg to 0deg and fades in) -->
						<div
							class="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out transform -rotate-90 scale-50 opacity-0 group-hover:rotate-0 group-hover:scale-100 group-hover:opacity-100"
						>
							<div
								class="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_24px_rgba(16,185,129,0.6)] group-hover:scale-105 transition-transform"
							>
								<Play class="w-10 h-10 text-emerald-300 fill-emerald-300 ml-1.5 drop-shadow" />
							</div>
						</div>
					</div>

					<!-- Title Only -->
					<h2
						class="text-lg font-black text-[var(--color-heading,#fef08a)] tracking-wide text-center"
					>
						{t('menu.botVsBot')}
					</h2>
				</button>

				<!-- Quick Settings Drawer (Floats downward without shifting neighboring elements) -->
				<div
					class="absolute top-[calc(100%+8px)] left-3 right-3 z-40 opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto transition-all duration-200 bg-[var(--color-bg-card,#131826)]/95 backdrop-blur-md border border-emerald-400/70 rounded-xl shadow-2xl p-3 space-y-1.5 invisible group-hover:visible group-focus-within:visible"
					style="box-shadow: 0 16px 32px rgba(0, 0, 0, 0.6);"
				>
					<!-- 1. Format -->
					<div class="flex items-center justify-between text-[11px] py-0.5">
						<span class="text-[var(--color-text-muted)] truncate">Формат:</span>
						<div
							class="flex items-center gap-1 bg-[var(--color-pill-bg,#141b2a)] px-1.5 py-0.5 rounded border border-[var(--color-pill-border,#2e3d5a)]"
						>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									botVsBotTeamIndex = cycle(TEAM_SIZES, botVsBotTeamIndex, -1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronLeft class="w-3.5 h-3.5" />
							</button>
							<span class="font-bold text-[var(--color-text)] text-[10px] w-24 text-center">
								{TEAM_SIZES[botVsBotTeamIndex]} на {TEAM_SIZES[botVsBotTeamIndex]}
							</span>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									botVsBotTeamIndex = cycle(TEAM_SIZES, botVsBotTeamIndex, 1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<!-- 2. Difficulty -->
					<div class="flex items-center justify-between text-[11px] py-0.5">
						<span class="text-[var(--color-text-muted)] truncate">Складність:</span>
						<div
							class="flex items-center gap-1 bg-[var(--color-pill-bg,#141b2a)] px-1.5 py-0.5 rounded border border-[var(--color-pill-border,#2e3d5a)]"
						>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									botVsBotDiffIndex = cycle(DIFFICULTIES, botVsBotDiffIndex, -1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronLeft class="w-3.5 h-3.5" />
							</button>
							<span
								class="font-bold text-[var(--color-text)] text-[10px] w-24 text-center truncate"
							>
								{getDiffName(DIFFICULTIES[botVsBotDiffIndex])}
							</span>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									botVsBotDiffIndex = cycle(DIFFICULTIES, botVsBotDiffIndex, 1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<!-- 3. Gold -->
					<div class="flex items-center justify-between text-[11px] py-0.5">
						<span class="text-[var(--color-text-muted)] truncate">Золото:</span>
						<div
							class="flex items-center gap-1 bg-[var(--color-pill-bg,#141b2a)] px-1.5 py-0.5 rounded border border-[var(--color-pill-border,#2e3d5a)]"
						>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									botVsBotGoldIndex = cycle(GOLDS, botVsBotGoldIndex, -1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronLeft class="w-3.5 h-3.5" />
							</button>
							<span class="font-mono font-bold text-emerald-300 text-[10px] w-24 text-center">
								{GOLDS[botVsBotGoldIndex]}g
							</span>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									botVsBotGoldIndex = cycle(GOLDS, botVsBotGoldIndex, 1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<!-- 4. Target Wins -->
					<div class="flex items-center justify-between text-[11px] py-0.5">
						<span class="text-[var(--color-text-muted)] truncate">Перемог:</span>
						<div
							class="flex items-center gap-1 bg-[var(--color-pill-bg,#141b2a)] px-1.5 py-0.5 rounded border border-[var(--color-pill-border,#2e3d5a)]"
						>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									botVsBotWinsIndex = cycle(TARGET_WINS, botVsBotWinsIndex, -1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronLeft class="w-3.5 h-3.5" />
							</button>
							<span class="font-bold text-[var(--color-text)] text-[10px] w-24 text-center">
								До {TARGET_WINS[botVsBotWinsIndex]}
							</span>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									botVsBotWinsIndex = cycle(TARGET_WINS, botVsBotWinsIndex, 1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<!-- 5. West Bot Race -->
					<div class="flex items-center justify-between text-[11px] py-0.5">
						<span class="text-[var(--color-text-muted)] truncate">Раса Заходу:</span>
						<div
							class="flex items-center gap-1 bg-[var(--color-pill-bg,#141b2a)] px-1.5 py-0.5 rounded border border-[var(--color-pill-border,#2e3d5a)]"
						>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									botVsBotWestRaceIndex = cycle(BOT_RACES, botVsBotWestRaceIndex, -1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronLeft class="w-3.5 h-3.5" />
							</button>
							<span
								class="font-bold text-[var(--color-text)] text-[10px] w-24 text-center truncate"
							>
								{BOT_RACES[botVsBotWestRaceIndex].label}
							</span>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									botVsBotWestRaceIndex = cycle(BOT_RACES, botVsBotWestRaceIndex, 1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<!-- 6. East Bot Race -->
					<div class="flex items-center justify-between text-[11px] py-0.5">
						<span class="text-[var(--color-text-muted)] truncate">Раса Сходу:</span>
						<div
							class="flex items-center gap-1 bg-[var(--color-pill-bg,#141b2a)] px-1.5 py-0.5 rounded border border-[var(--color-pill-border,#2e3d5a)]"
						>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									botVsBotEastRaceIndex = cycle(BOT_RACES, botVsBotEastRaceIndex, -1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronLeft class="w-3.5 h-3.5" />
							</button>
							<span
								class="font-bold text-[var(--color-text)] text-[10px] w-24 text-center truncate"
							>
								{BOT_RACES[botVsBotEastRaceIndex].label}
							</span>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									botVsBotEastRaceIndex = cycle(BOT_RACES, botVsBotEastRaceIndex, 1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<!-- 7. Coins -->
					<div class="flex items-center justify-between text-[11px] py-0.5">
						<span class="text-[var(--color-text-muted)] truncate">Монети:</span>
						<div
							class="flex items-center gap-1 bg-[var(--color-pill-bg,#141b2a)] px-1.5 py-0.5 rounded border border-[var(--color-pill-border,#2e3d5a)]"
						>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									botVsBotCoinIndex = cycle(COIN_MODES, botVsBotCoinIndex, -1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronLeft class="w-3.5 h-3.5" />
							</button>
							<span
								class="font-bold text-[var(--color-text)] text-[10px] w-24 text-center truncate"
							>
								{getCoinName(COIN_MODES[botVsBotCoinIndex])}
							</span>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									botVsBotCoinIndex = cycle(COIN_MODES, botVsBotCoinIndex, 1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<!-- 8. Fog of War -->
					<div class="flex items-center justify-between text-[11px] py-0.5">
						<span class="text-[var(--color-text-muted)] truncate">Туман війни:</span>
						<div
							class="flex items-center gap-1 bg-[var(--color-pill-bg,#141b2a)] px-1.5 py-0.5 rounded border border-[var(--color-pill-border,#2e3d5a)]"
						>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									botVsBotFogIndex = cycle(FOG_OPTIONS, botVsBotFogIndex, -1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronLeft class="w-3.5 h-3.5" />
							</button>
							<span class="font-bold text-[var(--color-text)] text-[10px] w-24 text-center">
								{FOG_OPTIONS[botVsBotFogIndex] ? 'Увімкнено' : 'Вимкнено'}
							</span>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									botVsBotFogIndex = cycle(FOG_OPTIONS, botVsBotFogIndex, 1);
								}}
								class="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] p-0.5 cursor-pointer"
							>
								<ChevronRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- 4. Custom Match Mode -->
			<div
				class="group relative bg-[var(--color-bg-card,#131826)] hover:bg-[var(--color-bg-card-hover,#182033)] border-2 border-[var(--color-border-card,#2e3d5a)] hover:border-purple-400/80 rounded-2xl shadow-xl transition-all duration-300 flex flex-col"
				style="box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);"
				data-testid="play-custom-card"
			>
				<!-- Top Button: Customize (slides up on hover, no extra wrapper container) -->
				<button
					type="button"
					onclick={() => openConfigFor('custom')}
					class="absolute bottom-[calc(100%+8px)] left-3 right-3 z-40 opacity-0 -translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto transition-all duration-200 py-1.5 px-3 rounded-xl bg-[var(--color-bg-card,#131826)]/95 hover:bg-purple-500/20 backdrop-blur-md border border-purple-400/70 text-[var(--color-heading,#fef08a)] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg invisible group-hover:visible group-focus-within:visible"
					style="box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);"
				>
					<Sliders class="w-3.5 h-3.5 text-purple-300" />
					<span>Всі параметри</span>
				</button>

				<!-- Top Main Click Area (Opens Full Configuration Directly) -->
				<button
					type="button"
					onclick={() => openConfigFor('custom')}
					class="w-full p-6 text-center flex flex-col items-center justify-center gap-3 cursor-pointer group/btn focus:outline-none relative"
					data-testid="open-custom-config-btn"
				>
					<!-- Large Rotating Icon morphing on hover -->
					<div class="relative w-24 h-24 my-2 flex items-center justify-center">
						<!-- Ambient glow backlight -->
						<div
							class="absolute inset-0 rounded-full bg-purple-500/10 blur-xl group-hover:bg-purple-500/25 transition-all duration-300"
						></div>

						<!-- Normal state: Large Sliders Icon (rotates 90deg and fades out on hover) -->
						<div
							class="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out transform group-hover:rotate-90 group-hover:scale-50 group-hover:opacity-0"
						>
							<Sliders
								class="w-20 h-20 text-purple-400 drop-shadow-[0_4px_16px_rgba(168,85,247,0.4)]"
							/>
						</div>

						<!-- Hover state: Big Play / Config Icon (rotates from -90deg to 0deg and fades in) -->
						<div
							class="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out transform -rotate-90 scale-50 opacity-0 group-hover:rotate-0 group-hover:scale-100 group-hover:opacity-100"
						>
							<div
								class="w-20 h-20 rounded-full bg-purple-500/20 border-2 border-purple-400 flex items-center justify-center shadow-[0_0_24px_rgba(168,85,247,0.6)] group-hover:scale-105 transition-transform"
							>
								<Play class="w-10 h-10 text-purple-300 fill-purple-300 ml-1.5 drop-shadow" />
							</div>
						</div>
					</div>

					<!-- Title Only -->
					<h2
						class="text-lg font-black text-[var(--color-heading,#fef08a)] tracking-wide text-center"
					>
						Власний бій
					</h2>
				</button>

				<!-- Details Drawer (Floats downward without shifting neighboring elements) -->
				<div
					class="absolute top-[calc(100%+8px)] left-3 right-3 z-40 opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto transition-all duration-200 bg-[var(--color-bg-card,#131826)]/95 backdrop-blur-md border border-purple-400/70 rounded-xl shadow-2xl p-3 space-y-2.5 invisible group-hover:visible group-focus-within:visible"
					style="box-shadow: 0 16px 32px rgba(0, 0, 0, 0.6);"
				>
					<p class="text-xs text-[var(--color-text)] text-center leading-relaxed">
						Повна свобода правил: 12 додаткових модів, бани розширених рас, гнучкий баланс.
					</p>

					<!-- Big CTA Button to open configuration modal -->
					<button
						type="button"
						onclick={() => openConfigFor('custom')}
						class="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-900/40"
					>
						<Sliders class="w-3.5 h-3.5" />
						<span>Відкрити конфігурацію</span>
					</button>
				</div>
			</div>
		</div>

		<!-- Bottom Spacer: 2.5 parts so drawer fits below without screen overflow -->
		<div class="flex-[2.5] min-h-[32px] pointer-events-none shrink-0"></div>
	{:else}
		<!-- In-Place Configuration (Full Page Width >90%, Seamlessly Integrated) -->
		<div
			class="w-full max-w-[96vw] 2xl:max-w-[94vw] flex justify-center px-1 animate-in fade-in slide-in-from-top-2 duration-300"
		>
			<MatchConfigModal
				isOpen={true}
				inline={true}
				currentConfig={configInitialParams}
				onClose={() => (isConfigOpen = false)}
				onStartMatch={(config) => launchMatch(config)}
			/>
		</div>
	{/if}
</div>
