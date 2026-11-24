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
		ArrowLeft
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
	let botVsBot = $state(false);
	let bannedRaces = $state<string[]>([]);

	function toggleBanRace(race: string) {
		if (bannedRaces.includes(race)) {
			bannedRaces = bannedRaces.filter((r) => r !== race);
		} else {
			if (bannedRaces.length >= 2) {
				bannedRaces = [...bannedRaces.slice(1), race];
			} else {
				bannedRaces = [...bannedRaces, race];
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
			startGold === 99999 &&
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
			botVsBot = true;
			westRace = 'random';
			eastRace = 'random';
			selectedMode = 'botVsBot';
			bannedRaces = [];
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
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#snippet configInner()}
	<!-- Header (fixed at top) -->
	<div
		class="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#3b3226] bg-[#121622]/90 shrink-0 {inline
			? 'rounded-t-3xl'
			: ''}"
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
			title={inline ? 'Згорнути до вибору режимів' : 'Закрити (Esc)'}
			aria-label={inline ? 'Згорнути до вибору режимів' : 'Закрити (Esc)'}
			data-testid="config-modal-close-btn"
		>
			{#if inline}
				<ArrowLeft class="w-4 h-4" />
				<span>Згорнути до вибору режимів</span>
			{:else}
				<X class="w-5 h-5" />
			{/if}
		</button>
	</div>

	<!-- Scrollable Body -->
	<div
		class="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 text-xs space-y-5 modal-scrollable-body"
	>
		<!-- Top Preset Selector -->
		<div class="bg-[#121622] border border-slate-800 rounded-2xl p-3">
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
		<!-- 1. Player & Opponent Race Setup -->
		<div class="bg-[#121622] border border-slate-800 rounded-2xl p-4 space-y-4">
			<div class="flex items-center justify-between">
				<span class="font-bold text-sm text-amber-200 flex items-center gap-2">
					<Shield class="w-4 h-4 text-cyan-400" />
					Вибір рас для битви
				</span>
				<span class="text-[11px] text-slate-400 font-mono"> Захід (Ви) vs Схід (Супротивник) </span>
			</div>

			<!-- Player Race Picker -->
			<div class="space-y-1.5">
				<div class="flex items-center justify-between">
					<span class="text-xs font-bold text-slate-300"> Ваша раса (Гравець): </span>
					<span class="text-xs text-cyan-300 font-bold font-mono">
						{#if westRace === 'in_game'}
							🎯 Обрати в грі (15с на арені)
						{:else if westRace === 'random'}
							🎲 Випадкова (+30% золота)
						{:else}
							{westRace}
						{/if}
					</span>
				</div>
				<div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
					<!-- Default: In-Game Choice -->
					<button
						type="button"
						onclick={() => (westRace = 'in_game')}
						class="py-2 px-2 rounded-xl border text-left transition cursor-pointer flex items-center justify-between {westRace ===
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
						class="py-2 px-2 rounded-xl border text-left transition cursor-pointer flex items-center justify-between {westRace ===
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
							class="py-2 px-2 rounded-xl border text-left transition cursor-pointer flex items-center justify-between {westRace ===
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

			<!-- Bot Race Picker -->
			<div class="space-y-1.5 pt-2 border-t border-slate-800">
				<div class="flex items-center justify-between">
					<span class="text-xs font-bold text-slate-300"> Раса суперника (Бот): </span>
					<span class="text-xs text-rose-300 font-bold font-mono">
						{eastRace === 'random' ? '🎲 Випадкова' : eastRace}
					</span>
				</div>
				<div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
					<button
						type="button"
						onclick={() => (eastRace = 'random')}
						class="py-2 px-2 rounded-xl border text-left transition cursor-pointer flex items-center justify-between {eastRace ===
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
						<button
							type="button"
							onclick={() => (eastRace = r.race)}
							class="py-2 px-2 rounded-xl border text-left transition cursor-pointer flex items-center justify-between {eastRace ===
							r.race
								? 'bg-rose-950/80 border-rose-400 ring-2 ring-rose-500/40 text-rose-200 font-bold shadow-md'
								: 'bg-[#181d28] border-slate-800 hover:border-slate-700 text-slate-400'}"
							data-testid="bot-race-{r.race}"
						>
							<span class="text-[11px] truncate">{r.race}</span>
							{#if eastRace === r.race}
								<Check class="w-3.5 h-3.5 text-rose-400 shrink-0 ml-1" />
							{/if}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- 2. Core Match Parameters Grid -->
		<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
			<!-- Bot Difficulty -->
			<div class="space-y-1.5" data-testid="setup-bot-difficulty">
				<label class="text-xs font-bold text-slate-300 flex items-center gap-1">
					<Bot class="w-3.5 h-3.5 text-amber-400" />
					Складність бота:
				</label>
				<div class="grid grid-cols-2 gap-1.5">
					{#each [{ val: 0, label: 'Легкий (0%)', icon: '🌱' }, { val: 15, label: 'Звичайний (15%)', icon: '⚔️' }, { val: 30, label: 'Складний (30%)', icon: '🛡️' }, { val: 80, label: 'Божевільний (80%)', icon: '🔥' }] as diff}
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
					{#each [{ val: 150, label: '150 🪙' }, { val: 300, label: '300 🪙' }, { val: 500, label: '500 🪙' }, { val: 1000, label: '1000 🪙' }] as gold}
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
					{#each [{ val: 1 as const, label: '1 на 1', sub: 'Соло' }, { val: 2 as const, label: '2 на 2', sub: 'Команда' }, { val: 3 as const, label: '3 на 3', sub: 'Масова' }] as fmt}
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

		<!-- 3. Modes, Bans & Tactical Rules -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
			<!-- Game Modes -->
			<div class="bg-[#121622] border border-slate-800 rounded-2xl p-4 space-y-2">
				<label class="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
					<Swords class="w-4 h-4 text-amber-400" />
					Режим гри:
				</label>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
					{#each Object.values(GAME_MODES) as mode}
						<button
							type="button"
							onclick={() => (selectedMode = mode.id)}
							class="p-2 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between {selectedMode ===
							mode.id
								? 'bg-amber-600/30 border-amber-500 text-amber-200 font-bold ring-1 ring-amber-500/50 shadow-sm'
								: 'bg-[#181d28] border-slate-800 hover:border-slate-700 text-slate-400'}"
						>
							<div class="text-[11px] font-bold truncate">{mode.nameUk}</div>
							<div class="text-[9px] text-slate-400 line-clamp-1 mt-0.5">
								{mode.descriptionUk}
							</div>
						</button>
					{/each}
				</div>
			</div>

			<!-- Bans, Coins & Fog -->
			<div class="bg-[#121622] border border-slate-800 rounded-2xl p-4 space-y-3">
				<!-- Banned Races Draft -->
				<div>
					<div class="flex items-center justify-between mb-1">
						<label class="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
							<Ban class="w-4 h-4 text-red-400" />
							<span>Бан рас (до 2):</span>
						</label>
						{#if bannedRaces.length > 0}
							<button
								type="button"
								onclick={() => (bannedRaces = [])}
								class="text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer"
							>
								Скинути бани
							</button>
						{/if}
					</div>
					<div class="grid grid-cols-3 sm:grid-cols-4 gap-1">
						{#each RACES_LIST as raceDef}
							{@const isBanned = bannedRaces.includes(raceDef.race)}
							<button
								type="button"
								onclick={() => toggleBanRace(raceDef.race)}
								class="py-1 px-1 rounded-lg border text-center transition cursor-pointer text-[10px] truncate {isBanned
									? 'bg-red-950/80 border-red-500 text-red-200 font-bold line-through'
									: 'bg-[#181d28] border-slate-800 text-slate-400 hover:border-slate-700'}"
							>
								{raceDef.race}
							</button>
						{/each}
					</div>
				</div>

				<!-- Tactical Toggles: Fog & Coins -->
				<div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
					<!-- Fog of War -->
					<div>
						<span class="text-[10px] font-bold text-slate-300 block mb-1">Туман війни:</span>
						<div class="grid grid-cols-2 gap-1">
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

					<!-- Coins Mode -->
					<div>
						<span class="text-[10px] font-bold text-slate-300 block mb-1">Монети:</span>
						<div class="grid grid-cols-3 gap-1">
							<button
								type="button"
								onclick={() => (coinMode = 'none')}
								class="py-1 px-0.5 rounded-lg border text-[10px] font-bold transition cursor-pointer {coinMode ===
								'none'
									? 'bg-red-600/30 border-red-500 text-red-200'
									: 'bg-[#181d28] border-slate-800 text-slate-400'}"
							>
								Ні
							</button>
							<button
								type="button"
								onclick={() => (coinMode = 'normal')}
								class="py-1 px-0.5 rounded-lg border text-[10px] font-bold transition cursor-pointer {coinMode ===
								'normal'
									? 'bg-amber-600/30 border-amber-500 text-amber-200'
									: 'bg-[#181d28] border-slate-800 text-slate-400'}"
							>
								40с
							</button>
							<button
								type="button"
								onclick={() => (coinMode = 'crazy')}
								class="py-1 px-0.5 rounded-lg border text-[10px] font-bold transition cursor-pointer {coinMode ===
								'crazy'
									? 'bg-purple-600/30 border-purple-500 text-purple-200'
									: 'bg-[#181d28] border-slate-800 text-slate-400'}"
							>
								5/20с
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Footer (fixed at bottom) -->
	<div
		class="px-5 sm:px-6 py-3.5 border-t border-[#3b3226] bg-[#121622]/90 shrink-0 flex items-center justify-between gap-3 {inline
			? 'rounded-b-3xl'
			: ''}"
	>
		<button
			type="button"
			onclick={onClose}
			class="py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold transition cursor-pointer text-xs flex items-center gap-1.5"
			data-testid="config-modal-cancel-btn"
		>
			{#if inline}
				<ArrowLeft class="w-4 h-4" />
				<span>Згорнути до карток</span>
			{:else}
				Скасувати
			{/if}
		</button>

		<button
			type="button"
			onclick={handleApply}
			class="py-2.5 px-6 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer shadow-lg shadow-amber-500/20 text-xs flex items-center gap-2"
			data-testid="config-modal-apply-btn"
		>
			<Play class="w-4 h-4 fill-current" />
			<span>{onStartMatch ? 'Розпочати бій' : 'Зберегти конфігурацію'}</span>
		</button>
	</div>
{/snippet}

{#if isOpen}
	{#if inline}
		<!-- INLINE EXPANDED VIEW ON PAGE (no fixed backdrop) -->
		<div
			class="w-full max-w-5xl bg-gradient-to-b from-[#181d28] to-[#0d1017] border-2 border-[#8c7456] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white animate-in fade-in slide-in-from-top-4 duration-300"
			style="box-shadow: 0 0 40px rgba(0,0,0,0.8), inset 0 0 20px rgba(140,116,86,0.15);"
			data-testid="match-config-modal"
		>
			{@render configInner()}
		</div>
	{:else}
		<!-- MODAL DIALOG POPUP (used during battle pause) -->
		<div
			class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[10000] p-2 sm:p-4 select-none animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-label="Конфігурація матчу"
			data-testid="match-config-modal"
		>
			<div
				class="bg-gradient-to-b from-[#181d28] to-[#0d1017] border-2 border-[#8c7456] rounded-3xl w-full max-w-5xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden text-white"
				style="box-shadow: 0 0 40px rgba(0,0,0,0.9), inset 0 0 20px rgba(140,116,86,0.15);"
			>
				{@render configInner()}
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
