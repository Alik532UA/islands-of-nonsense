<script lang="ts">
	import type { SimulationConfig } from '../engine/simulation';
	import { GAME_MODES } from '../engine/gameModes';
	import { RACES_LIST } from '../engine/gameData';
	import { storage } from '../services/storage';
	import {
		Swords,
		Bot,
		Sparkles,
		Eye,
		Coins,
		Trophy,
		X,
		Play,
		Sliders,
		Users,
		Ban,
		Shield,
		Check,
		Settings2
	} from 'lucide-svelte';

	let {
		isOpen = false,
		inline = false,
		currentConfig,
		onClose,
		onSave,
		onStartMatch
	}: {
		isOpen: boolean;
		inline?: boolean;
		currentConfig?: Partial<SimulationConfig>;
		onClose: () => void;
		onSave?: (config: SimulationConfig) => void;
		onStartMatch?: (config: SimulationConfig) => void;
	} = $props();

	// Local state for setup form with defaults
	let botDifficulty = $state(15);
	let startGold = $state(500);
	let selectedMode = $state('standard');
	let teamSize = $state<1 | 2 | 3>(1);
	let targetWins = $state(2);
	let westRace = $state<string>('in_game'); // Default: choose in game!
	let eastRace = $state<string>('random');
	let fogOfWar = $state(true);
	let coinMode = $state<'none' | 'normal' | 'crazy'>('normal');
	let coinSpawnInterval = $state(40);
	let coinCount = $state(1);
	let showCoinCustom = $state(false);
	let botVsBot = $state(false);
	let bannedRaces = $state<string[]>([]);

	function toggleBanRace(race: string) {
		if (bannedRaces.includes(race)) {
			bannedRaces = bannedRaces.filter((r) => r !== race);
		} else {
			// Can ban any number of races, but at least 1 must remain available
			if (bannedRaces.length < RACES_LIST.length - 1) {
				bannedRaces = [...bannedRaces, race];
				// If bot was explicitly set to this race, revert to random
				if (eastRace === race) {
					eastRace = 'random';
				}
			}
		}
	}

	let activePreset = $derived.by<'classic' | 'sandbox' | 'botVsBot' | 'custom'>(() => {
		if (
			botDifficulty === 15 &&
			startGold === 500 &&
			teamSize === 1 &&
			targetWins === 2 &&
			fogOfWar === true &&
			coinMode === 'normal' &&
			coinSpawnInterval === 40 &&
			coinCount === 1 &&
			!botVsBot &&
			(westRace === 'in_game' || westRace === 'Люди') &&
			eastRace === 'random' &&
			selectedMode === 'standard' &&
			bannedRaces.length === 0
		) {
			return 'classic';
		}
		if (
			botDifficulty === 0 &&
			startGold >= 90000 &&
			teamSize === 1 &&
			targetWins === 2 &&
			!fogOfWar &&
			coinMode === 'crazy' &&
			!botVsBot &&
			selectedMode === 'sandbox' &&
			bannedRaces.length === 0
		) {
			return 'sandbox';
		}
		if (
			botDifficulty === 15 &&
			startGold === 500 &&
			teamSize === 1 &&
			targetWins === 2 &&
			!fogOfWar &&
			coinMode === 'normal' &&
			coinSpawnInterval === 40 &&
			coinCount === 1 &&
			botVsBot &&
			selectedMode === 'botVsBot' &&
			bannedRaces.length === 0
		) {
			return 'botVsBot';
		}
		return 'custom';
	});

	function applyPreset(presetId: 'classic' | 'sandbox' | 'botVsBot') {
		if (presetId === 'classic') {
			botDifficulty = 15;
			startGold = 500;
			teamSize = 1;
			targetWins = 2;
			fogOfWar = true;
			coinMode = 'normal';
			coinSpawnInterval = 40;
			coinCount = 1;
			botVsBot = false;
			westRace = 'in_game';
			eastRace = 'random';
			selectedMode = 'standard';
			bannedRaces = [];
		} else if (presetId === 'sandbox') {
			botDifficulty = 0;
			startGold = 99999;
			teamSize = 1;
			targetWins = 2;
			fogOfWar = false;
			coinMode = 'crazy';
			coinSpawnInterval = 20;
			coinCount = 5;
			botVsBot = false;
			westRace = 'in_game';
			eastRace = 'random';
			selectedMode = 'sandbox';
			bannedRaces = [];
		} else if (presetId === 'botVsBot') {
			botDifficulty = 15;
			startGold = 500;
			teamSize = 1;
			targetWins = 2;
			fogOfWar = false;
			coinMode = 'normal';
			coinSpawnInterval = 40;
			coinCount = 1;
			botVsBot = true;
			westRace = 'random';
			eastRace = 'random';
			selectedMode = 'botVsBot';
			bannedRaces = [];
		}
	}

	function applyCoinPreset(preset: 'none' | 'normal' | 'crazy') {
		coinMode = preset;
		if (preset === 'none') {
			coinCount = 0;
		} else if (preset === 'normal') {
			coinSpawnInterval = 40;
			coinCount = 1;
		} else if (preset === 'crazy') {
			coinSpawnInterval = 20;
			coinCount = 5;
		}
	}

	// Synchronize when opened with currentConfig / saved storage
	$effect(() => {
		if (isOpen) {
			const saved = storage.getJSON<Partial<SimulationConfig>>('match_settings', {});
			botDifficulty = currentConfig?.botDifficulty ?? saved.botDifficulty ?? 15;
			startGold = currentConfig?.startGold ?? saved.startGold ?? 500;
			selectedMode = currentConfig?.modeId ?? saved.modeId ?? 'standard';
			teamSize = (currentConfig?.teamSize ?? saved.teamSize ?? 1) as 1 | 2 | 3;
			targetWins = currentConfig?.targetWins ?? saved.targetWins ?? 2;
			bannedRaces = currentConfig?.bannedRaces ?? saved.bannedRaces ?? [];
			westRace = currentConfig?.westRace ?? saved.westRace ?? 'in_game';
			eastRace = currentConfig?.eastRace ?? saved.eastRace ?? 'random';
			fogOfWar = currentConfig?.fogOfWar ?? saved.fogOfWar ?? true;
			coinMode = (currentConfig?.coinMode ?? saved.coinMode ?? 'normal') as
				'none' | 'normal' | 'crazy';
			coinSpawnInterval =
				currentConfig?.coinSpawnInterval ??
				saved.coinSpawnInterval ??
				(coinMode === 'crazy' ? 20 : 40);
			coinCount =
				currentConfig?.coinCount ??
				saved.coinCount ??
				(coinMode === 'crazy' ? 5 : coinMode === 'none' ? 0 : 1);
			botVsBot = currentConfig?.botVsBot ?? saved.botVsBot ?? false;
		}
	});

	function buildConfig(): SimulationConfig {
		const modeConfig = GAME_MODES[selectedMode] || GAME_MODES.standard;
		const isAr = modeConfig.allRandom || selectedMode === 'allRandom' || westRace === 'random';
		const isUr = modeConfig.uniqueRaces || selectedMode === 'uniqueRaces';
		const isBanDraft = modeConfig.banDraft || selectedMode === 'banDraft';

		return {
			botDifficulty,
			startGold,
			modeId: selectedMode,
			teamSize,
			allRandom: isAr,
			uniqueRaces: isUr,
			bannedRaces: isBanDraft || bannedRaces.length > 0 ? bannedRaces : undefined,
			targetWins,
			coinMode,
			coinSpawnInterval,
			coinCount,
			westRace,
			eastRace: eastRace === 'random' ? undefined : eastRace,
			fogOfWar,
			botVsBot
		};
	}

	function handleApply() {
		const newConfig = buildConfig();
		storage.setJSON('match_settings', newConfig);

		if (onStartMatch) {
			onStartMatch(newConfig);
		} else if (onSave) {
			onSave(newConfig);
		}
		onClose();
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (!isOpen) return;
		if (e.key === 'Escape') {
			e.stopPropagation();
			onClose();
		} else if (e.key === 'Enter') {
			const activeTag = (document.activeElement?.tagName || '').toLowerCase();
			if (activeTag !== 'input' && activeTag !== 'textarea') {
				e.preventDefault();
				handleApply();
			}
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#snippet configBody()}
	<!-- 3-Column Command Layout: Left (West / Player), Center (Settings & Central Action Hero), Right (East / Bot) -->
	<div
		class="grid grid-cols-1 lg:grid-cols-[190px_1fr_190px] xl:grid-cols-[220px_1fr_220px] 2xl:grid-cols-[250px_1fr_250px] gap-3.5 items-start w-full"
	>
		<!-- COLUMN 1: WEST (PLAYER / ЗАХІД) -->
		<div
			class="bg-[#121622]/95 border border-slate-800 rounded-2xl p-3 flex flex-col gap-1.5 shadow-md"
		>
			<div class="flex items-center justify-between pb-1.5 border-b border-slate-800">
				<span class="font-bold text-xs text-amber-200 flex items-center gap-1.5">
					<Shield class="w-3.5 h-3.5 text-cyan-400" />
					<span>Захід (Гравець)</span>
				</span>
			</div>
			<div class="text-[10px] text-cyan-300 font-bold font-mono truncate px-0.5">
				{#if westRace === 'in_game'}
					🎯 Обрати в грі (15с)
				{:else if westRace === 'random'}
					🎲 Випадкова (+30%)
				{:else}
					{westRace}
				{/if}
			</div>

			<div class="flex flex-col gap-1 pt-0.5">
				<!-- Default: In-Game Choice -->
				<button
					type="button"
					onclick={() => (westRace = 'in_game')}
					class="py-1.5 px-2 rounded-xl border text-left transition cursor-pointer flex items-center justify-between {westRace ===
					'in_game'
						? 'bg-cyan-950/80 border-cyan-400 ring-2 ring-cyan-500/40 text-cyan-200 font-bold shadow-md'
						: 'bg-[#181d28] border-slate-800 hover:border-slate-700 text-slate-400'}"
					data-testid="race-option-in_game"
				>
					<span class="text-[11px] font-bold truncate">🎯 В грі (15с)</span>
					{#if westRace === 'in_game'}
						<Check class="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />
					{/if}
				</button>

				<!-- Random Race -->
				<button
					type="button"
					onclick={() => (westRace = 'random')}
					class="py-1.5 px-2 rounded-xl border text-left transition cursor-pointer flex items-center justify-between {westRace ===
					'random'
						? 'bg-purple-950/80 border-purple-400 ring-2 ring-purple-500/40 text-purple-200 font-bold shadow-md'
						: 'bg-[#181d28] border-slate-800 hover:border-slate-700 text-slate-400'}"
					data-testid="race-option-random"
				>
					<span class="text-[11px] font-bold truncate">🎲 Випадкова</span>
					{#if westRace === 'random'}
						<Check class="w-3.5 h-3.5 text-purple-400 shrink-0 ml-1" />
					{/if}
				</button>

				{#each RACES_LIST as r}
					<button
						type="button"
						onclick={() => (westRace = r.race)}
						class="py-1.5 px-2 rounded-xl border text-left transition cursor-pointer flex items-center justify-between {westRace ===
						r.race
							? 'bg-cyan-950/80 border-cyan-400 ring-2 ring-cyan-500/40 text-cyan-200 font-bold shadow-md'
							: 'bg-[#181d28] border-slate-800 hover:border-slate-700 text-slate-400'}"
						data-testid="race-option-{r.race}"
					>
						<span class="text-[11px] truncate">{r.race}</span>
						{#if westRace === r.race}
							<Check class="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<!-- COLUMN 2: CENTER (PRESETS, PARAMETERS, CENTRAL START BUTTON, AND FULL-WIDTH MODES) -->
		<div class="flex flex-col gap-3.5">
			<!-- 1. Top Presets Bar (Full Width across Center) -->
			<div class="bg-[#121622]/95 border border-slate-800 rounded-2xl p-3 shadow-md">
				<div class="text-[11px] font-bold text-slate-400 mb-2 flex items-center justify-between">
					<span>Шаблони конфігурації (Пресети):</span>
					<span
						class="text-[10px] font-mono {activePreset === 'custom'
							? 'text-amber-400 font-bold'
							: 'text-cyan-400'}"
					>
						{activePreset === 'custom' ? '⚙️ Користувацькі правила' : '✓ Стандартний пресет'}
					</span>
				</div>
				<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
					<button
						type="button"
						onclick={() => applyPreset('classic')}
						class="py-2 px-2 rounded-xl border text-center transition cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold {activePreset ===
						'classic'
							? 'bg-amber-500/20 border-amber-500 text-amber-200 ring-1 ring-amber-500/40 shadow-sm'
							: 'bg-[#181d28] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'}"
						data-testid="preset-btn-classic"
					>
						<Bot class="w-4 h-4 text-amber-400" />
						<span>Бій проти компʼютера</span>
					</button>

					<button
						type="button"
						onclick={() => applyPreset('sandbox')}
						class="py-2 px-2 rounded-xl border text-center transition cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold {activePreset ===
						'sandbox'
							? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/40 shadow-sm'
							: 'bg-[#181d28] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'}"
						data-testid="preset-btn-sandbox"
					>
						<Sparkles class="w-4 h-4 text-cyan-400" />
						<span>Пісочниця</span>
					</button>

					<button
						type="button"
						onclick={() => applyPreset('botVsBot')}
						class="py-2 px-2 rounded-xl border text-center transition cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold {activePreset ===
						'botVsBot'
							? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/40 shadow-sm'
							: 'bg-[#181d28] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'}"
						data-testid="preset-btn-botVsBot"
					>
						<Eye class="w-4 h-4 text-emerald-400" />
						<span>Битва компʼютерів</span>
					</button>

					<!-- Custom Preset: automatically active when params differ! -->
					<div
						class="py-2 px-2 rounded-xl border text-center flex items-center justify-center gap-1.5 text-xs font-bold select-none {activePreset ===
						'custom'
							? 'bg-purple-500/20 border-purple-500 text-purple-200 ring-1 ring-purple-500/40 shadow-sm'
							: 'bg-[#131620] border-slate-800/60 text-slate-600'}"
						data-testid="preset-btn-custom"
					>
						<Sliders class="w-4 h-4 text-purple-400" />
						<span>Власний бій</span>
						{#if activePreset === 'custom'}
							<span class="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse ml-0.5"></span>
						{/if}
					</div>
				</div>
			</div>

			<!-- 2. Middle Row: Left Settings | Central Hero Start Button | Right Settings -->
			<div
				class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_auto_1fr] gap-3.5 items-stretch"
			>
				<!-- SUB-COLUMN 1 (LEFT SETTINGS): Bot Difficulty & Starting Gold -->
				<div
					class="bg-[#121622]/95 border border-slate-800 rounded-2xl p-3.5 space-y-3.5 shadow-md flex flex-col justify-between"
				>
					<!-- Bot Difficulty Slider (0% to 100%) -->
					<div class="space-y-1.5" data-testid="setup-bot-difficulty">
						<div class="flex items-center justify-between">
							<label class="text-xs font-bold text-slate-300 flex items-center gap-1">
								<Bot class="w-3.5 h-3.5 text-amber-400" />
								<span>Складність бота:</span>
							</label>
							<span
								class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full {botDifficulty === 0
									? 'text-emerald-300 bg-emerald-950/70 border border-emerald-500/40'
									: botDifficulty <= 20
										? 'text-amber-300 bg-amber-950/70 border border-amber-500/40'
										: botDifficulty <= 50
											? 'text-orange-300 bg-orange-950/70 border border-orange-500/40'
											: 'text-red-300 bg-red-950/70 border border-red-500/40'}"
							>
								{#if botDifficulty === 0}
									🌱 0% (Легкий)
								{:else if botDifficulty <= 20}
									⚔️ {botDifficulty}% (Звичайний)
								{:else if botDifficulty <= 50}
									🛡️ {botDifficulty}% (Складний)
								{:else}
									🔥 {botDifficulty}% (Божевільний)
								{/if}
							</span>
						</div>

						<!-- Continuous range slider 0 to 100% -->
						<input
							type="range"
							min="0"
							max="100"
							step="1"
							bind:value={botDifficulty}
							data-testid="bot-difficulty-slider"
							class="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
						/>

						<!-- Quick Preset Buttons -->
						<div class="grid grid-cols-4 gap-1 pt-0.5">
							{#each [{ val: 0, label: '0%', icon: '🌱' }, { val: 15, label: '15%', icon: '⚔️' }, { val: 30, label: '30%', icon: '🛡️' }, { val: 80, label: '80%', icon: '🔥' }] as diff}
								<button
									type="button"
									onclick={() => (botDifficulty = diff.val)}
									class="py-1 px-1 rounded-lg border text-center transition cursor-pointer text-[10px] {botDifficulty ===
									diff.val
										? 'bg-amber-500/25 border-amber-500 text-amber-200 font-bold ring-1 ring-amber-500/40 shadow-sm'
										: 'bg-[#181d28] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'}"
									data-testid="difficulty-btn-{diff.val}"
								>
									<span>{diff.icon} {diff.label}</span>
								</button>
							{/each}
						</div>
					</div>

					<!-- Starting Gold Slider (150 to 1500g + Infinite option) -->
					<div class="space-y-1.5 pt-2 border-t border-slate-800/80" data-testid="setup-start-gold">
						<div class="flex items-center justify-between">
							<label class="text-xs font-bold text-slate-300 flex items-center gap-1">
								<Coins class="w-3.5 h-3.5 text-amber-400" />
								<span>Стартове золото:</span>
							</label>
							<span
								class="text-[11px] font-mono font-bold text-amber-300 px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/40"
							>
								{startGold >= 90000 ? '∞ Безкінечно' : `${startGold} 🪙`}
							</span>
						</div>

						<!-- Continuous range slider 150 to 1500g -->
						<input
							type="range"
							min="150"
							max="1500"
							step="50"
							value={startGold >= 90000 ? 1500 : startGold}
							oninput={(e) => {
								startGold = Number((e.currentTarget as HTMLInputElement).value);
							}}
							data-testid="start-gold-slider"
							class="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
						/>

						<!-- Quick Preset Buttons + Infinite Gold Toggle -->
						<div class="grid grid-cols-5 gap-1 pt-0.5">
							{#each [{ val: 150, label: '150' }, { val: 300, label: '300' }, { val: 500, label: '500' }, { val: 1000, label: '1000' }] as gold}
								<button
									type="button"
									onclick={() => (startGold = gold.val)}
									class="py-1 px-0.5 rounded-lg border text-center transition cursor-pointer text-[10px] {startGold ===
									gold.val
										? 'bg-amber-500/25 border-amber-500 text-amber-200 font-bold ring-1 ring-amber-500/40 shadow-sm'
										: 'bg-[#181d28] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'}"
									data-testid="gold-btn-{gold.val}"
								>
									<span>{gold.label}🪙</span>
								</button>
							{/each}
							<button
								type="button"
								onclick={() => (startGold = 99999)}
								class="py-1 px-0.5 rounded-lg border text-center transition cursor-pointer text-[10px] {startGold >=
								90000
									? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 font-bold ring-1 ring-cyan-500/40 shadow-sm'
									: 'bg-[#181d28] border-slate-800 text-cyan-400 hover:text-cyan-200 hover:border-slate-700'}"
								data-testid="gold-btn-infinite"
								title="Безкінечне золото для режиму Пісочниці"
							>
								<span>∞ Необм.</span>
							</button>
						</div>
					</div>
				</div>

				<!-- SUB-COLUMN 2 (CENTER ACTION HERO): Big Start Button in the Center -->
				<div
					class="md:col-span-2 xl:col-span-1 flex flex-col justify-center items-center w-full xl:w-[240px] 2xl:w-[280px]"
				>
					<button
						type="button"
						onclick={handleApply}
						class="w-full h-full min-h-[170px] md:min-h-[220px] rounded-2xl bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:via-amber-500 hover:to-amber-600 active:scale-[0.98] text-slate-950 font-black transition-all duration-200 cursor-pointer shadow-[0_0_35px_rgba(245,158,11,0.4)] hover:shadow-[0_0_55px_rgba(245,158,11,0.7)] border-2 border-amber-300/80 flex flex-col items-center justify-center p-4 gap-3 group relative overflow-hidden select-none"
						data-testid="config-modal-apply-btn"
						title={onStartMatch ? 'Розпочати бій (Enter)' : 'Зберегти конфігурацію'}
					>
						<!-- Ambient glow and shimmer -->
						<div
							class="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/20 pointer-events-none"
						></div>
						<div
							class="absolute -inset-1 bg-amber-400/20 blur-lg rounded-2xl group-hover:bg-amber-300/30 transition-all pointer-events-none"
						></div>

						<!-- Big Play Icon -->
						<div
							class="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-950/20 border-2 border-slate-950/40 flex items-center justify-center group-hover:scale-110 group-hover:bg-slate-950/30 transition-transform duration-300 shadow-inner"
						>
							<Play
								class="w-8 h-8 sm:w-10 sm:h-10 fill-slate-950 text-slate-950 ml-1 drop-shadow"
							/>
						</div>

						<!-- Title & Status Pill -->
						<div class="relative text-center">
							<span
								class="block text-base sm:text-xl font-black uppercase tracking-wider text-slate-950 drop-shadow-sm"
							>
								{onStartMatch ? 'Розпочати бій' : 'Зберегти'}
							</span>
							<span
								class="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-900 bg-amber-400/50 px-2.5 py-0.5 rounded-full mt-1.5"
							>
								<span>{teamSize} на {teamSize}</span>
								<span>•</span>
								<span>До {targetWins}</span>
								<span>•</span>
								<span>{startGold >= 90000 ? '∞ Золота' : `${startGold}🪙`}</span>
							</span>
						</div>

						<div
							class="relative text-[10px] text-slate-900/70 font-mono tracking-tight font-semibold"
						>
							Натисніть для запуску [Enter]
						</div>
					</button>
				</div>

				<!-- SUB-COLUMN 3 (RIGHT SETTINGS): Team Size, Target Wins, Fog of War, Coins -->
				<div
					class="bg-[#121622]/95 border border-slate-800 rounded-2xl p-3.5 space-y-3.5 shadow-md flex flex-col justify-between"
				>
					<!-- Team Size & Target Wins -->
					<div class="space-y-3">
						<!-- Team Size -->
						<div class="space-y-1.5" data-testid="setup-team-size">
							<label class="text-xs font-bold text-slate-300 flex items-center gap-1">
								<Users class="w-3.5 h-3.5 text-cyan-400" />
								Формат гри:
							</label>
							<div class="grid grid-cols-3 gap-1.5">
								{#each [{ val: 1 as const, label: '1 на 1', sub: 'Соло' }, { val: 2 as const, label: '2 на 2', sub: 'Команда' }, { val: 3 as const, label: '3 на 3', sub: 'Масова' }] as fmt}
									<button
										type="button"
										onclick={() => (teamSize = fmt.val)}
										class="py-1.5 px-1 rounded-lg border text-center transition cursor-pointer flex flex-col items-center justify-center {teamSize ===
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
										class="py-1.5 px-1 rounded-lg border text-center transition cursor-pointer flex flex-col items-center justify-center {targetWins ===
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

					<!-- Tactical Toggles: Fog of War & Coins -->
					<div class="space-y-2 pt-2 border-t border-slate-800">
						<!-- Fog of War -->
						<div class="flex items-center justify-between">
							<span class="text-[10px] font-bold text-slate-300">Туман війни:</span>
							<div class="grid grid-cols-2 gap-1 w-28">
								<button
									type="button"
									onclick={() => (fogOfWar = true)}
									class="py-1 px-1 rounded-lg border text-[10px] font-bold transition cursor-pointer {fogOfWar
										? 'bg-cyan-600/30 border-cyan-500 text-cyan-200'
										: 'bg-[#181d28] border-slate-800 text-slate-400'}"
								>
									Вкл
								</button>
								<button
									type="button"
									onclick={() => (fogOfWar = false)}
									class="py-1 px-1 rounded-lg border text-[10px] font-bold transition cursor-pointer {!fogOfWar
										? 'bg-amber-600/30 border-amber-500 text-amber-200'
										: 'bg-[#181d28] border-slate-800 text-slate-400'}"
								>
									Викл
								</button>
							</div>
						</div>

						<!-- Coins Section: 3 Preset Buttons + Custom Sliders Drawer -->
						<div class="space-y-1.5" data-testid="setup-coins">
							<div class="flex items-center justify-between">
								<span class="text-[10px] font-bold text-slate-300 flex items-center gap-1">
									<Coins class="w-3.5 h-3.5 text-amber-400" />
									<span>Монети:</span>
								</span>
								<button
									type="button"
									onclick={() => (showCoinCustom = !showCoinCustom)}
									class="text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded border transition cursor-pointer {showCoinCustom
										? 'bg-amber-500/20 border-amber-400 text-amber-300'
										: 'bg-[#181d28] border-slate-800 text-slate-400 hover:text-slate-200'}"
									title="Налаштування інтервалу та кількості монет"
									data-testid="toggle-custom-coins-btn"
								>
									<Settings2 class="w-3 h-3" />
									<span>{showCoinCustom ? 'Сховати' : 'Повзунки'}</span>
								</button>
							</div>

							<!-- 3 Static Preset Buttons -->
							<div class="grid grid-cols-3 gap-1">
								<button
									type="button"
									onclick={() => applyCoinPreset('none')}
									class="py-1 px-0.5 rounded-lg border text-[10px] font-bold transition cursor-pointer {coinMode ===
										'none' && coinCount === 0
										? 'bg-red-600/30 border-red-500 text-red-200'
										: 'bg-[#181d28] border-slate-800 text-slate-400'}"
								>
									Ні
								</button>
								<button
									type="button"
									onclick={() => applyCoinPreset('normal')}
									class="py-1 px-0.5 rounded-lg border text-[10px] font-bold transition cursor-pointer {coinMode ===
										'normal' &&
									coinSpawnInterval === 40 &&
									coinCount === 1
										? 'bg-amber-600/30 border-amber-500 text-amber-200'
										: 'bg-[#181d28] border-slate-800 text-slate-400'}"
								>
									40с
								</button>
								<button
									type="button"
									onclick={() => applyCoinPreset('crazy')}
									class="py-1 px-0.5 rounded-lg border text-[10px] font-bold transition cursor-pointer {coinMode ===
										'crazy' &&
									coinSpawnInterval === 20 &&
									coinCount === 5
										? 'bg-purple-600/30 border-purple-500 text-purple-200'
										: 'bg-[#181d28] border-slate-800 text-slate-400'}"
								>
									5/20с
								</button>
							</div>

							<!-- Custom Coins Sliders (Interval: 1s to 100s, Count: 0 to 15 coins) -->
							{#if showCoinCustom}
								<div
									class="p-2.5 rounded-xl bg-[#0e121a] border border-amber-500/30 space-y-2.5 mt-2 animate-in fade-in slide-in-from-top-1 duration-150"
								>
									<!-- Interval Slider: 1s to 100s -->
									<div class="space-y-1">
										<div class="flex items-center justify-between text-[10px]">
											<span class="text-slate-400">Частота появи:</span>
											<span class="font-mono font-bold text-amber-300">
												{coinSpawnInterval} сек
											</span>
										</div>
										<input
											type="range"
											min="1"
											max="100"
											step="1"
											bind:value={coinSpawnInterval}
											oninput={() => {
												if (coinCount === 0) coinCount = 1;
												coinMode = 'normal';
											}}
											data-testid="coin-interval-slider"
											class="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
										/>
									</div>

									<!-- Count Slider: 0 to 15 coins -->
									<div class="space-y-1">
										<div class="flex items-center justify-between text-[10px]">
											<span class="text-slate-400">Кількість монет:</span>
											<span class="font-mono font-bold text-amber-300">
												{coinCount} шт
											</span>
										</div>
										<input
											type="range"
											min="0"
											max="15"
											step="1"
											bind:value={coinCount}
											oninput={() => {
												coinMode = coinCount === 0 ? 'none' : 'normal';
											}}
											data-testid="coin-count-slider"
											class="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
										/>
									</div>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<!-- 3. Bottom Row: Game Modes across FULL WIDTH (No vertical scrollbar!) -->
			<div class="bg-[#121622]/95 border border-slate-800 rounded-2xl p-3.5 space-y-2 shadow-md">
				<div class="flex items-center justify-between">
					<label class="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
						<Swords class="w-4 h-4 text-amber-400" />
						<span>Режим гри:</span>
					</label>
					<span class="text-[10px] text-slate-400 font-mono">
						Обрано: <strong class="text-amber-300">
							{GAME_MODES[selectedMode]?.nameUk || selectedMode}
						</strong>
					</span>
				</div>
				<div
					class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-2"
				>
					{#each Object.values(GAME_MODES) as mode}
						<button
							type="button"
							onclick={() => (selectedMode = mode.id)}
							class="p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between {selectedMode ===
							mode.id
								? 'bg-amber-600/30 border-amber-500 text-amber-200 font-bold ring-1 ring-amber-500/50 shadow-sm'
								: 'bg-[#181d28] border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'}"
							data-testid="mode-card-{mode.id}"
						>
							<div class="text-[11px] font-bold truncate">{mode.nameUk}</div>
							<div class="text-[9px] text-slate-400 line-clamp-2 mt-1 leading-snug">
								{mode.descriptionUk}
							</div>
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- COLUMN 3: EAST (BOT / СХІД) WITH INTEGRATED RACE BANNING -->
		<div
			class="bg-[#121622]/95 border border-slate-800 rounded-2xl p-3 flex flex-col gap-1.5 shadow-md"
		>
			<div class="flex items-center justify-between pb-1.5 border-b border-slate-800">
				<span class="font-bold text-xs text-rose-200 flex items-center gap-1.5">
					<Bot class="w-3.5 h-3.5 text-rose-400" />
					<span>Схід (Бот)</span>
				</span>
				{#if bannedRaces.length > 0}
					<button
						type="button"
						onclick={() => (bannedRaces = [])}
						class="text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer font-bold"
						title="Скинути всі бани рас"
						data-testid="reset-bans-btn"
					>
						Скинути ({bannedRaces.length})
					</button>
				{/if}
			</div>

			<div class="flex items-center justify-between px-0.5 text-[10px] text-rose-300 font-mono">
				<span class="font-bold truncate">
					{eastRace === 'random' ? '🎲 Випадкова' : eastRace}
				</span>
				{#if bannedRaces.length > 0}
					<span class="text-red-400 font-bold">🚫 {bannedRaces.length} забан.</span>
				{/if}
			</div>

			<div class="flex flex-col gap-1 pt-0.5">
				<!-- Random Race for Bot -->
				<button
					type="button"
					onclick={() => (eastRace = 'random')}
					class="py-1.5 px-2 rounded-xl border text-left transition cursor-pointer flex items-center justify-between {eastRace ===
					'random'
						? 'bg-rose-950/80 border-rose-400 ring-2 ring-rose-500/40 text-rose-200 font-bold shadow-md'
						: 'bg-[#181d28] border-slate-800 hover:border-slate-700 text-slate-400'}"
					data-testid="bot-race-random"
				>
					<span class="text-[11px] font-bold truncate">🎲 Випадкова</span>
					{#if eastRace === 'random'}
						<Check class="w-3.5 h-3.5 text-rose-400 shrink-0 ml-1" />
					{/if}
				</button>

				{#each RACES_LIST as r}
					{@const isBanned = bannedRaces.includes(r.race)}
					<div
						class="relative group/race flex items-center rounded-xl border transition {isBanned
							? 'bg-red-950/30 border-red-900/50 text-red-300/70'
							: eastRace === r.race
								? 'bg-rose-950/80 border-rose-400 ring-2 ring-rose-500/40 text-rose-200 font-bold shadow-md'
								: 'bg-[#181d28] border-slate-800 hover:border-slate-700 text-slate-400'}"
					>
						<!-- Main select race button -->
						<button
							type="button"
							disabled={isBanned}
							onclick={() => (eastRace = r.race)}
							class="flex-1 py-1.5 px-2 text-left flex items-center justify-between cursor-pointer disabled:cursor-not-allowed select-none truncate"
							data-testid="bot-race-{r.race}"
							title={isBanned ? `${r.race} забанено для бота` : `Обрати ${r.race}`}
						>
							<span class="text-[11px] truncate {isBanned ? 'line-through text-red-400/60' : ''}">
								{r.race}
							</span>
							{#if eastRace === r.race && !isBanned}
								<Check class="w-3.5 h-3.5 text-rose-400 shrink-0 ml-1" />
							{/if}
						</button>

						<!-- Ban Toggle Button: shows on hover or permanently if banned -->
						<button
							type="button"
							onclick={(e) => {
								e.stopPropagation();
								toggleBanRace(r.race);
							}}
							class="py-1 px-1.5 mr-1 rounded-lg transition cursor-pointer shrink-0 flex items-center justify-center {isBanned
								? 'bg-red-600/30 text-red-300 border border-red-500/60 hover:bg-red-600/50'
								: 'opacity-0 group-hover/race:opacity-100 hover:bg-red-500/20 text-slate-500 hover:text-red-400'}"
							title={isBanned ? `Розбанити ${r.race}` : `Забанити ${r.race} для бота`}
							aria-label={isBanned ? `Розбанити ${r.race}` : `Забанити ${r.race}`}
							data-testid="ban-race-{r.race}"
						>
							<Ban class="w-3.5 h-3.5 {isBanned ? 'text-red-400' : ''}" />
						</button>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/snippet}

{#if isOpen}
	{#if inline}
		<!-- INLINE PAGE VIEW (NO PSEUDO-WINDOW: directly on page, adaptive >90% width) -->
		<div
			class="w-full text-white animate-in fade-in slide-in-from-top-2 duration-200"
			data-testid="match-config-modal"
		>
			{@render configBody()}
		</div>
	{:else}
		<!-- MODAL DIALOG POPUP (used during in-battle pause) -->
		<div
			class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[10000] p-2 sm:p-4 select-none animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-label="Конфігурація матчу"
			data-testid="match-config-modal"
		>
			<div
				class="bg-gradient-to-b from-[#181d28] to-[#0d1017] border-2 border-[#8c7456] rounded-3xl w-full max-w-6xl xl:max-w-7xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden text-white"
				style="box-shadow: 0 0 40px rgba(0,0,0,0.9), inset 0 0 20px rgba(140,116,86,0.15);"
			>
				<!-- Dialog Header -->
				<div
					class="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#3b3226] bg-[#121622]/90 shrink-0"
				>
					<div class="flex items-center gap-3">
						<div
							class="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 shrink-0"
						>
							<Sliders class="w-5 h-5" />
						</div>
						<div>
							<h2
								class="text-base sm:text-lg font-black tracking-wide text-amber-300 uppercase"
								data-testid="config-modal-title"
							>
								Конфігурація матчу
							</h2>
							<p class="text-xs text-slate-400">
								Тонкі налаштування рас, правил, складності та балансу гри
							</p>
						</div>
					</div>
					<button
						onclick={onClose}
						class="py-1.5 px-3 rounded-xl text-xs font-bold text-amber-300 hover:text-white bg-[#1a2336] hover:bg-[#25324d] border border-amber-500/30 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
						title="Закрити (Esc)"
						aria-label="Закрити (Esc)"
						data-testid="config-modal-close-btn"
					>
						<X class="w-5 h-5" />
					</button>
				</div>

				<!-- Dialog Body -->
				<div
					class="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5 text-xs modal-scrollable-body"
				>
					{@render configBody()}
				</div>

				<!-- Dialog Footer -->
				<div
					class="px-5 sm:px-6 py-3.5 border-t border-[#3b3226] bg-[#121622]/90 shrink-0 flex items-center justify-between gap-3"
				>
					<button
						type="button"
						onclick={onClose}
						class="py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold transition cursor-pointer text-xs flex items-center gap-1.5"
						data-testid="config-modal-cancel-btn"
					>
						Скасувати
					</button>

					<button
						type="button"
						onclick={handleApply}
						class="py-2.5 px-6 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer shadow-lg shadow-amber-500/20 text-xs flex items-center gap-2"
					>
						<Play class="w-4 h-4 fill-current" />
						<span>{onStartMatch ? 'Розпочати бій' : 'Зберегти конфігурацію'}</span>
					</button>
				</div>
			</div>
		</div>
	{/if}
{/if}

<style>
	.modal-scrollable-body {
		-webkit-overflow-scrolling: touch;
		scrollbar-width: thin;
		scrollbar-color: rgba(148, 163, 184, 0.3) transparent;
	}
	.modal-scrollable-body::-webkit-scrollbar {
		width: 6px;
	}
	.modal-scrollable-body::-webkit-scrollbar-track {
		background: transparent;
	}
	.modal-scrollable-body::-webkit-scrollbar-thumb {
		background-color: rgba(148, 163, 184, 0.3);
		border-radius: 9999px;
	}
	.modal-scrollable-body::-webkit-scrollbar-thumb:hover {
		background-color: rgba(148, 163, 184, 0.5);
	}
</style>
