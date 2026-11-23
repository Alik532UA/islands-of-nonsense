<script lang="ts">
	import type { SimulationConfig } from '../engine/simulation';
	import { GAME_MODES } from '../engine/gameModes';
	import { RACES_LIST } from '../engine/gameData';
	import { storage } from '../services/storage';
	import {
		Swords,
		Bot,
		Coins,
		Trophy,
		Dices,
		X,
		Play,
		Sliders,
		Eye,
		Users,
		Ban
	} from 'lucide-svelte';

	let {
		isOpen = false,
		currentConfig,
		onClose,
		onStartMatch
	}: {
		isOpen: boolean;
		currentConfig: SimulationConfig;
		onClose: () => void;
		onStartMatch: (config: SimulationConfig) => void;
	} = $props();

	// Local state for setup form with defaults
	let botDifficulty = $state(15);
	let startGold = $state(500);
	let selectedMode = $state('standard');
	let teamSize = $state<1 | 2 | 3>(1);
	let targetWins = $state(2);
	let raceChoiceMode = $state<'pick' | 'random'>('pick');
	let fogOfWar = $state(true);
	let coinMode = $state<'none' | 'normal' | 'crazy'>('normal');
	let botVsBot = $state(false);
	let skipStartModal = $state(false);
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

	// Synchronize when opened with currentConfig / saved storage
	$effect(() => {
		if (isOpen) {
			const saved = storage.getJSON<Partial<SimulationConfig>>('match_settings', {});
			botDifficulty = saved.botDifficulty ?? currentConfig?.botDifficulty ?? 15;
			startGold = saved.startGold ?? currentConfig?.startGold ?? 500;
			selectedMode = saved.modeId ?? currentConfig?.modeId ?? 'standard';
			teamSize = (saved.teamSize as 1 | 2 | 3) ?? currentConfig?.teamSize ?? 1;
			targetWins = saved.targetWins ?? currentConfig?.targetWins ?? 2;
			bannedRaces = saved.bannedRaces ?? currentConfig?.bannedRaces ?? [];
			raceChoiceMode =
				saved.allRandom || saved.westRace === 'random'
					? 'random'
					: currentConfig?.allRandom || currentConfig?.westRace === 'random'
						? 'random'
						: 'pick';
			fogOfWar = saved.fogOfWar ?? currentConfig?.fogOfWar ?? true;
			coinMode =
				(saved.coinMode as 'none' | 'normal' | 'crazy') ?? currentConfig?.coinMode ?? 'normal';
			botVsBot = saved.botVsBot ?? currentConfig?.botVsBot ?? false;
			skipStartModal = storage.getJSON<boolean>('skip_start_modal', false);
		}
	});

	function handleSubmit() {
		const modeConfig = GAME_MODES[selectedMode] || GAME_MODES.standard;
		const isAr =
			modeConfig.allRandom || selectedMode === 'allRandom' || raceChoiceMode === 'random';
		const isUr = modeConfig.uniqueRaces || selectedMode === 'uniqueRaces';
		const isBanDraft = modeConfig.banDraft || selectedMode === 'banDraft';

		const newConfig: SimulationConfig = {
			botDifficulty,
			startGold,
			modeId: selectedMode,
			teamSize,
			allRandom: isAr,
			uniqueRaces: isUr,
			bannedRaces: isBanDraft || bannedRaces.length > 0 ? bannedRaces : undefined,
			targetWins,
			coinMode,
			westRace: isAr
				? 'random'
				: bannedRaces.includes('Люди')
					? RACES_LIST.find((r) => !bannedRaces.includes(r.race))?.race || 'Орки'
					: 'Люди',
			fogOfWar,
			botVsBot
		};

		// Persist settings
		storage.setJSON('match_settings', newConfig);
		storage.setJSON('skip_start_modal', skipStartModal);

		onStartMatch(newConfig);
		onClose();
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[10000] p-2 sm:p-4 md:p-6 select-none"
	>
		<div
			class="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-5xl max-h-[92vh] sm:max-h-[90vh] shadow-2xl flex flex-col overflow-hidden text-white"
		>
			<!-- Header (fixed at top) -->
			<div
				class="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0"
			>
				<div class="flex items-center gap-3">
					<div class="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
						<Sliders class="w-5 h-5" />
					</div>
					<div>
						<h2 class="text-base sm:text-lg font-black tracking-wide text-slate-100 uppercase">
							Налаштування старту матчу
						</h2>
						<p class="text-xs text-slate-400">Параметри складності, режиму та формату серії</p>
					</div>
				</div>
				<button
					onclick={onClose}
					class="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
					title="Закрити (Esc)"
				>
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Scrollable Multi-column Body -->
			<div
				class="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 text-xs modal-scrollable-body"
			>
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
					<!-- Left Column: Game Modes (12 modes in 2 columns) -->
					<div class="flex flex-col">
						<label class="font-bold text-slate-300 flex items-center gap-1.5 mb-2 text-xs">
							<Swords class="w-4 h-4 text-amber-400" />
							Режим матчу:
						</label>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 content-start">
							{#each Object.values(GAME_MODES) as mode}
								<button
									type="button"
									onclick={() => (selectedMode = mode.id)}
									class="p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between {selectedMode ===
									mode.id
										? 'bg-amber-600/30 border-amber-500 text-amber-200 shadow-md shadow-amber-500/10 font-bold ring-1 ring-amber-500/50'
										: 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'}"
								>
									<div class="text-xs font-bold truncate">{mode.nameUk}</div>
									<div class="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-tight">
										{mode.descriptionUk}
									</div>
								</button>
							{/each}
						</div>
					</div>

					<!-- Right Column: Match Configuration Options -->
					<div class="space-y-4 flex flex-col justify-between">
						<!-- Bot Difficulty Selection -->
						<div>
							<label class="font-bold text-slate-300 flex items-center gap-1.5 mb-2 text-xs">
								<Bot class="w-4 h-4 text-blue-400" />
								Складність комп'ютерного суперника:
							</label>
							<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
								{#each [{ val: 0, label: 'Легкий (0%)', desc: 'Для новачків' }, { val: 15, label: 'Нормальний (+15%)', desc: 'Стандарт WC3' }, { val: 30, label: 'Складний (+30%)', desc: 'Досвідчений бот' }, { val: 80, label: 'Божевільний (+80%)', desc: 'Екстремальний' }] as diff}
									<button
										type="button"
										onclick={() => (botDifficulty = diff.val)}
										class="p-2 rounded-xl border text-center transition cursor-pointer {botDifficulty ===
										diff.val
											? 'bg-blue-600/30 border-blue-500 text-blue-200 shadow-md shadow-blue-500/10 font-bold ring-1 ring-blue-500/50'
											: 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'}"
									>
										<div class="text-xs font-bold leading-tight">{diff.label}</div>
										<div class="text-[10px] text-slate-500 mt-0.5">{diff.desc}</div>
									</button>
								{/each}
							</div>
						</div>

						<!-- Team Battle Format (1v1, 2v2, 3v3) -->
						<div>
							<div class="flex items-center justify-between mb-2">
								<label class="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
									<Users class="w-4 h-4 text-cyan-400" />
									Формат битви (Команди):
								</label>
								<label
									class="flex items-center gap-1.5 text-[11px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-800/70 hover:border-cyan-500 px-2 py-0.5 rounded-lg cursor-pointer transition select-none"
								>
									<input
										type="checkbox"
										bind:checked={botVsBot}
										class="w-3.5 h-3.5 rounded border-cyan-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500/30 cursor-pointer"
									/>
									<span>Без гравця (боти грають між собою)</span>
								</label>
							</div>
							<div class="grid grid-cols-3 gap-2">
								{#each [{ size: 1 as const, title: botVsBot ? '1 на 1 (Авто)' : '1 на 1 (Дуель)', desc: botVsBot ? 'Бот (Захід) проти Бота (Схід)' : 'Гравець проти Бота' }, { size: 2 as const, title: botVsBot ? '2 на 2 (Авто)' : '2 на 2 (Командна)', desc: botVsBot ? '2 боти проти 2 ботів' : 'Союзник-бот проти 2' }, { size: 3 as const, title: botVsBot ? '3 на 3 (Авто)' : '3 на 3 (Масова)', desc: botVsBot ? '3 боти проти 3 ботів' : 'Епічна битва (6 гравців)' }] as fmt}
									<button
										type="button"
										onclick={() => (teamSize = fmt.size)}
										class="p-2 rounded-xl border text-center transition cursor-pointer {teamSize ===
										fmt.size
											? 'bg-cyan-600/30 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-500/10 font-bold ring-1 ring-cyan-500/50'
											: 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'}"
									>
										<div class="text-xs font-bold leading-tight">{fmt.title}</div>
										<div class="text-[10px] text-slate-500 mt-0.5">{fmt.desc}</div>
									</button>
								{/each}
							</div>
						</div>

						<!-- Target Wins (Match Series Format) -->
						<div>
							<label class="font-bold text-slate-300 flex items-center gap-1.5 mb-2 text-xs">
								<Trophy class="w-4 h-4 text-emerald-400" />
								Формат серії раундів:
							</label>
							<div class="grid grid-cols-3 gap-2">
								{#each [{ wins: 1, title: '1 раунд (Швидкий)', sub: 'До 1 перемоги' }, { wins: 2, title: 'Best of 3 (Bo3)', sub: 'До 2 перемог (турнір)' }, { wins: 3, title: 'Best of 5 (Bo5)', sub: 'До 3 перемог (битва)' }] as fmt}
									<button
										type="button"
										onclick={() => (targetWins = fmt.wins)}
										class="p-2 rounded-xl border text-center transition cursor-pointer {targetWins ===
										fmt.wins
											? 'bg-emerald-600/30 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-500/10 font-bold ring-1 ring-emerald-500/50'
											: 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'}"
									>
										<div class="text-xs font-bold leading-tight">{fmt.title}</div>
										<div class="text-[10px] text-slate-500 mt-0.5">{fmt.sub}</div>
									</button>
								{/each}
							</div>
						</div>

						<!-- Starting Gold & Starting Race -->
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<!-- Starting Gold -->
							<div>
								<label class="font-bold text-slate-300 flex items-center gap-1.5 mb-1.5 text-xs">
									<Coins class="w-4 h-4 text-amber-400" />
									Стартове золото:
								</label>
								<div class="grid grid-cols-4 gap-1.5">
									{#each [150, 300, 500, 1000] as g}
										<button
											type="button"
											onclick={() => (startGold = g)}
											class="py-1.5 px-1 rounded-lg border text-center font-mono font-bold transition cursor-pointer {startGold ===
											g
												? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/50'
												: 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}"
										>
											{g}g
										</button>
									{/each}
								</div>
							</div>

							<!-- Starting Race -->
							<div>
								<label class="font-bold text-slate-300 flex items-center gap-1.5 mb-1.5 text-xs">
									<Dices class="w-4 h-4 text-purple-400" />
									Стартова раса:
								</label>
								<div class="grid grid-cols-2 gap-2">
									<button
										type="button"
										onclick={() => (raceChoiceMode = 'pick')}
										class="py-1.5 px-2 rounded-lg border text-center transition cursor-pointer {raceChoiceMode ===
										'pick'
											? 'bg-amber-600/30 border-amber-500 text-amber-200 font-bold ring-1 ring-amber-500/50'
											: 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}"
									>
										<div class="text-[11px] font-bold">Вибір раси</div>
										<div class="text-[9px] text-slate-500">10 сек на вибір</div>
									</button>
									<button
										type="button"
										onclick={() => (raceChoiceMode = 'random')}
										class="py-1.5 px-2 rounded-lg border text-center transition cursor-pointer {raceChoiceMode ===
										'random'
											? 'bg-purple-600/30 border-purple-500 text-purple-200 font-bold ring-1 ring-purple-500/50'
											: 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}"
									>
										<div class="text-[11px] font-bold">Випадкова</div>
										<div class="text-[9px] text-slate-500">+30% золота</div>
									</button>
								</div>
							</div>
						</div>

						<!-- Banned Races Draft (-ban) -->
						<div
							class="bg-slate-950/40 p-2.5 rounded-2xl border transition {selectedMode ===
							'banDraft'
								? 'border-red-500/80 ring-1 ring-red-500/40 bg-red-950/20'
								: 'border-slate-800'}"
						>
							<div class="flex items-center justify-between mb-1.5">
								<label class="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
									<Ban class="w-4 h-4 text-red-400" />
									<span>Заблоковані раси (-ban):</span>
								</label>
								<div class="flex items-center gap-1.5 text-[10px]">
									<span class="text-slate-400">
										Обрано: <strong class="text-amber-300">{bannedRaces.length}/2</strong>
									</span>
									{#if bannedRaces.length > 0}
										<button
											type="button"
											onclick={() => (bannedRaces = [])}
											class="text-[9px] text-red-400 hover:text-red-300 ml-1 underline cursor-pointer"
										>
											Очистити
										</button>
									{/if}
								</div>
							</div>
							<div class="text-[10px] text-slate-400 mb-2">
								{selectedMode === 'banDraft'
									? 'Оберіть до 2 рас, які будуть суворо виключені з драфту для обох команд'
									: 'Опціональне блокування до 2 рас (недоступні гравцям та ботам)'}
							</div>
							<div class="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
								{#each RACES_LIST as raceDef}
									{@const isBanned = bannedRaces.includes(raceDef.race)}
									<button
										type="button"
										onclick={() => toggleBanRace(raceDef.race)}
										class="py-1 px-1.5 rounded-lg border text-center transition cursor-pointer flex items-center justify-center gap-1 {isBanned
											? 'bg-red-950/80 border-red-500 text-red-200 font-bold ring-1 ring-red-500/50 shadow-sm shadow-red-500/20'
											: 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'}"
									>
										{#if isBanned}
											<span class="text-[9px] text-red-400">🚫</span>
										{/if}
										<span
											class="text-[11px] truncate {isBanned ? 'line-through text-red-300' : ''}"
										>
											{raceDef.race}
										</span>
									</button>
								{/each}
							</div>
						</div>

						<!-- Coins Spawn Mode & Fog of War -->
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<!-- Coins Spawn Mode Setting -->
							<div
								class="bg-slate-950/40 p-2.5 rounded-2xl border border-slate-800 flex flex-col justify-between"
							>
								<div>
									<div class="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
										<Coins class="w-4 h-4 text-amber-400" />
										<span>Монетки на арені:</span>
									</div>
									<div class="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
										{coinMode === 'none'
											? 'Вимкнено: без монет'
											: coinMode === 'crazy'
												? 'Шалені: по 5 монет / 20с'
												: 'Звичайний: 1 монета / 40с'}
									</div>
								</div>
								<div class="grid grid-cols-3 gap-1 mt-2">
									<button
										type="button"
										onclick={() => (coinMode = 'none')}
										class="py-1 px-1 rounded-lg border text-[11px] font-bold text-center transition cursor-pointer {coinMode ===
										'none'
											? 'bg-red-600/30 border-red-500 text-red-200 ring-1 ring-red-500/50'
											: 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'}"
									>
										Без монет
									</button>
									<button
										type="button"
										onclick={() => (coinMode = 'normal')}
										class="py-1 px-1 rounded-lg border text-[11px] font-bold text-center transition cursor-pointer {coinMode ===
										'normal'
											? 'bg-amber-600/30 border-amber-500 text-amber-200 ring-1 ring-amber-500/50'
											: 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'}"
									>
										40 сек
									</button>
									<button
										type="button"
										onclick={() => (coinMode = 'crazy')}
										class="py-1 px-1 rounded-lg border text-[11px] font-bold text-center transition cursor-pointer {coinMode ===
										'crazy'
											? 'bg-purple-600/30 border-purple-500 text-purple-200 ring-1 ring-purple-500/50'
											: 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'}"
									>
										Шалені (5)
									</button>
								</div>
							</div>

							<!-- Fog of War Setting -->
							<div
								class="bg-slate-950/40 p-2.5 rounded-2xl border border-slate-800 flex flex-col justify-between"
							>
								<div>
									<div class="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
										<Eye class="w-4 h-4 text-cyan-400" />
										<span>Туман війни:</span>
									</div>
									<div class="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
										{fogOfWar ? 'Класичний: вороги сховані' : 'Вся арена відкрита'}
									</div>
								</div>
								<div class="grid grid-cols-2 gap-1.5 mt-2">
									<button
										type="button"
										onclick={() => (fogOfWar = true)}
										class="py-1 px-2 rounded-lg border text-[11px] font-bold text-center transition cursor-pointer {fogOfWar
											? 'bg-cyan-600/30 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/50'
											: 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'}"
									>
										Увімкнено
									</button>
									<button
										type="button"
										onclick={() => (fogOfWar = false)}
										class="py-1 px-2 rounded-lg border text-[11px] font-bold text-center transition cursor-pointer {!fogOfWar
											? 'bg-amber-600/30 border-amber-500 text-amber-200 ring-1 ring-amber-500/50'
											: 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'}"
									>
										Вимкнено
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Footer Submit (pinned at bottom) -->
			<div
				class="px-5 sm:px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3"
			>
				<label
					class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none self-start sm:self-center"
				>
					<input
						type="checkbox"
						bind:checked={skipStartModal}
						onchange={() => storage.setJSON('skip_start_modal', skipStartModal)}
						class="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500/30 cursor-pointer"
					/>
					<span class="hover:text-amber-300 font-medium">Debug: не показувати, одразу грати</span>
				</label>
				<div class="flex items-center gap-2.5 w-full sm:w-auto">
					<button
						type="button"
						onclick={onClose}
						class="flex-1 sm:flex-none py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold transition cursor-pointer text-xs"
					>
						Скасувати
					</button>
					<button
						type="button"
						onclick={handleSubmit}
						class="flex-2 sm:flex-none py-2.5 px-5 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer shadow-lg shadow-amber-500/20 text-xs flex items-center justify-center gap-2"
					>
						<Play class="w-4 h-4 fill-current" />
						Застосувати та почати новий матч
					</button>
				</div>
			</div>
		</div>
	</div>
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
