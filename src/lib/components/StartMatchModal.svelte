<script lang="ts">
	import type { SimulationConfig } from '../engine/simulation';
	import { GAME_MODES } from '../engine/gameModes';
	import { storage } from '../services/storage';
	import { Swords, Bot, Coins, Trophy, Dices, X, Play, Sliders, Eye, Users } from 'lucide-svelte';

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

	// Local state for setup form
	let botDifficulty = $state(currentConfig.botDifficulty ?? 15);
	let startGold = $state(currentConfig.startGold ?? 500);
	let selectedMode = $state(currentConfig.modeId ?? 'standard');
	let teamSize = $state<1 | 2 | 3>(currentConfig.teamSize ?? 1);
	let targetWins = $state(currentConfig.targetWins ?? 2);
	let raceChoiceMode = $state<'pick' | 'random'>(
		currentConfig.allRandom || currentConfig.westRace === 'random' ? 'random' : 'pick'
	);
	let fogOfWar = $state(currentConfig.fogOfWar ?? true);
	let coinMode = $state<'none' | 'normal' | 'crazy'>(currentConfig.coinMode ?? 'normal');

	// Synchronize when opened with currentConfig
	$effect(() => {
		if (isOpen) {
			const saved = storage.getJSON<Partial<SimulationConfig>>('match_settings', {});
			botDifficulty = saved.botDifficulty ?? currentConfig.botDifficulty ?? 15;
			startGold = saved.startGold ?? currentConfig.startGold ?? 500;
			selectedMode = saved.modeId ?? currentConfig.modeId ?? 'standard';
			teamSize = (saved.teamSize as 1 | 2 | 3) ?? currentConfig.teamSize ?? 1;
			targetWins = saved.targetWins ?? currentConfig.targetWins ?? 2;
			raceChoiceMode =
				saved.allRandom || saved.westRace === 'random'
					? 'random'
					: currentConfig.allRandom || currentConfig.westRace === 'random'
						? 'random'
						: 'pick';
			fogOfWar = saved.fogOfWar ?? currentConfig.fogOfWar ?? true;
			coinMode =
				(saved.coinMode as 'none' | 'normal' | 'crazy') ?? currentConfig.coinMode ?? 'normal';
		}
	});

	function handleSubmit() {
		const modeConfig = GAME_MODES[selectedMode] || GAME_MODES.standard;
		const isAr =
			modeConfig.allRandom || selectedMode === 'allRandom' || raceChoiceMode === 'random';
		const isUr = modeConfig.uniqueRaces || selectedMode === 'uniqueRaces';

		const newConfig: SimulationConfig = {
			botDifficulty,
			startGold,
			modeId: selectedMode,
			teamSize,
			allRandom: isAr,
			uniqueRaces: isUr,
			targetWins,
			coinMode,
			westRace: isAr ? 'random' : 'Люди',
			fogOfWar
		};

		// Persist settings
		storage.setJSON('match_settings', newConfig);

		onStartMatch(newConfig);
		onClose();
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none"
	>
		<div
			class="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-xl shadow-2xl p-6 text-white"
		>
			<!-- Header -->
			<div class="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
				<div class="flex items-center gap-2.5">
					<div class="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
						<Sliders class="w-5 h-5" />
					</div>
					<div>
						<h2 class="text-lg font-black tracking-wide text-slate-100 uppercase">
							Налаштування старту матчу
						</h2>
						<p class="text-xs text-slate-400">Параметри складності, режиму та формату серії</p>
					</div>
				</div>
				<button
					onclick={onClose}
					class="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
					title="Закрити (Esc)"
				>
					<X class="w-5 h-5" />
				</button>
			</div>

			<div class="space-y-4 text-xs">
				<!-- Bot Difficulty Selection -->
				<div>
					<label class="font-bold text-slate-300 flex items-center gap-1.5 mb-2">
						<Bot class="w-4 h-4 text-blue-400" />
						Складність комп'ютерного суперника:
					</label>
					<div class="grid grid-cols-4 gap-2">
						{#each [{ val: 0, label: 'Легкий (0%)', desc: 'Для новачків' }, { val: 15, label: 'Нормальний (+15%)', desc: 'Стандарт WC3' }, { val: 30, label: 'Складний (+30%)', desc: 'Досвідчений бот' }, { val: 80, label: 'Божевільний (+80%)', desc: 'Екстремальний' }] as diff}
							<button
								type="button"
								onclick={() => (botDifficulty = diff.val)}
								class="p-2.5 rounded-xl border text-center transition cursor-pointer {botDifficulty ===
								diff.val
									? 'bg-blue-600/30 border-blue-500 text-blue-200 shadow-lg shadow-blue-500/10 font-bold'
									: 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'}"
							>
								<div class="text-xs font-bold">{diff.label}</div>
								<div class="text-[10px] text-slate-500 mt-0.5">{diff.desc}</div>
							</button>
						{/each}
					</div>
				</div>

				<!-- Game Mode Selection -->
				<div>
					<label class="font-bold text-slate-300 flex items-center gap-1.5 mb-2">
						<Swords class="w-4 h-4 text-amber-400" />
						Режим матчу:
					</label>
					<div class="grid grid-cols-3 gap-2">
						{#each Object.values(GAME_MODES) as mode}
							<button
								type="button"
								onclick={() => (selectedMode = mode.id)}
								class="p-2.5 rounded-xl border text-left transition cursor-pointer {selectedMode ===
								mode.id
									? 'bg-amber-600/30 border-amber-500 text-amber-200 shadow-lg shadow-amber-500/10 font-bold'
									: 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'}"
							>
								<div class="text-xs font-bold truncate">{mode.nameUk}</div>
								<div class="text-[10px] text-slate-400 line-clamp-2 mt-0.5">
									{mode.descriptionUk}
								</div>
							</button>
						{/each}
					</div>
				</div>

				<!-- Team Battle Format (1v1, 2v2, 3v3) -->
				<div>
					<label class="font-bold text-slate-300 flex items-center gap-1.5 mb-2">
						<Users class="w-4 h-4 text-cyan-400" />
						Формат битви (Команди):
					</label>
					<div class="grid grid-cols-3 gap-2">
						{#each [{ size: 1 as const, title: '1 на 1 (Дуель)', desc: 'Гравець проти Бота' }, { size: 2 as const, title: '2 на 2 (Командна)', desc: 'Союзник-бот проти 2 ботів' }, { size: 3 as const, title: '3 на 3 (Масова)', desc: 'Епічна битва (6 гравців)' }] as fmt}
							<button
								type="button"
								onclick={() => (teamSize = fmt.size)}
								class="p-2.5 rounded-xl border text-center transition cursor-pointer {teamSize ===
								fmt.size
									? 'bg-cyan-600/30 border-cyan-500 text-cyan-200 shadow-lg shadow-cyan-500/10 font-bold'
									: 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'}"
							>
								<div class="text-xs font-bold">{fmt.title}</div>
								<div class="text-[10px] text-slate-500 mt-0.5">{fmt.desc}</div>
							</button>
						{/each}
					</div>
				</div>

				<!-- Target Wins (Match Series Format) -->
				<div>
					<label class="font-bold text-slate-300 flex items-center gap-1.5 mb-2">
						<Trophy class="w-4 h-4 text-emerald-400" />
						Формат серії раундів:
					</label>
					<div class="grid grid-cols-3 gap-2">
						{#each [{ wins: 1, title: '1 раунд (Швидкий)', sub: 'До 1 перемоги' }, { wins: 2, title: 'Best of 3 (Bo3)', sub: 'До 2 перемог (турнір)' }, { wins: 3, title: 'Best of 5 (Bo5)', sub: 'До 3 перемог (битва)' }] as fmt}
							<button
								type="button"
								onclick={() => (targetWins = fmt.wins)}
								class="p-2.5 rounded-xl border text-center transition cursor-pointer {targetWins ===
								fmt.wins
									? 'bg-emerald-600/30 border-emerald-500 text-emerald-200 shadow-lg shadow-emerald-500/10 font-bold'
									: 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'}"
							>
								<div class="text-xs font-bold">{fmt.title}</div>
								<div class="text-[10px] text-slate-500 mt-0.5">{fmt.sub}</div>
							</button>
						{/each}
					</div>
				</div>

				<!-- Starting Gold & Starting Race -->
				<div class="grid grid-cols-2 gap-4">
					<!-- Starting Gold -->
					<div>
						<label class="font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
							<Coins class="w-4 h-4 text-amber-400" />
							Стартове золото:
						</label>
						<div class="flex items-center gap-2">
							{#each [150, 300, 500, 1000] as g}
								<button
									type="button"
									onclick={() => (startGold = g)}
									class="flex-1 py-1.5 px-2 rounded-lg border text-center font-mono font-bold transition cursor-pointer {startGold ===
									g
										? 'bg-amber-500/20 border-amber-500 text-amber-300'
										: 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}"
								>
									{g}g
								</button>
							{/each}
						</div>
					</div>

					<!-- Starting Race -->
					<div>
						<label class="font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
							<Dices class="w-4 h-4 text-purple-400" />
							Стартова раса:
						</label>
						<div class="grid grid-cols-2 gap-2">
							<button
								type="button"
								onclick={() => (raceChoiceMode = 'pick')}
								class="py-1.5 px-2.5 rounded-lg border text-center transition cursor-pointer {raceChoiceMode ===
								'pick'
									? 'bg-amber-600/30 border-amber-500 text-amber-200 font-bold shadow'
									: 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}"
							>
								<div class="text-[11px] font-bold">Можна вибрати</div>
								<div class="text-[9px] text-slate-500">10 сек на вибір</div>
							</button>
							<button
								type="button"
								onclick={() => (raceChoiceMode = 'random')}
								class="py-1.5 px-2.5 rounded-lg border text-center transition cursor-pointer {raceChoiceMode ===
								'random'
									? 'bg-purple-600/30 border-purple-500 text-purple-200 font-bold shadow'
									: 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}"
							>
								<div class="text-[11px] font-bold">Випадкова раса</div>
								<div class="text-[9px] text-slate-500">+30% золота</div>
							</button>
						</div>
					</div>
				</div>

				<!-- Coins Spawn Mode Setting -->
				<div class="bg-slate-950/40 p-3 rounded-2xl border border-slate-800">
					<div class="flex items-center justify-between">
						<div>
							<div class="font-bold text-slate-200 flex items-center gap-1.5">
								<Coins class="w-4 h-4 text-amber-400" />
								<span>Монетки на арені:</span>
							</div>
							<div class="text-[10px] text-slate-400 mt-0.5">
								{coinMode === 'none'
									? 'Вимкнено: монетки не з’являються'
									: coinMode === 'crazy'
										? 'Шалені монетки: по 5 монет кожні 20с'
										: 'Звичайний: 1 монетка кожні 40с на базі'}
							</div>
						</div>
						<div class="flex items-center gap-1.5">
							<button
								type="button"
								onclick={() => (coinMode = 'none')}
								class="py-1.5 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer {coinMode ===
								'none'
									? 'bg-red-600/30 border-red-500 text-red-200 shadow'
									: 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'}"
							>
								Без монет
							</button>
							<button
								type="button"
								onclick={() => (coinMode = 'normal')}
								class="py-1.5 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer {coinMode ===
								'normal'
									? 'bg-amber-600/30 border-amber-500 text-amber-200 shadow'
									: 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'}"
							>
								40 сек
							</button>
							<button
								type="button"
								onclick={() => (coinMode = 'crazy')}
								class="py-1.5 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer {coinMode ===
								'crazy'
									? 'bg-purple-600/30 border-purple-500 text-purple-200 shadow'
									: 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'}"
							>
								Шалені (5)
							</button>
						</div>
					</div>
				</div>

				<!-- Fog of War Setting -->
				<div class="bg-slate-950/40 p-3 rounded-2xl border border-slate-800">
					<div class="flex items-center justify-between">
						<div>
							<div class="font-bold text-slate-200 flex items-center gap-1.5">
								<Eye class="w-4 h-4 text-cyan-400" />
								<span>Туман війни:</span>
							</div>
							<div class="text-[10px] text-slate-400 mt-0.5">
								{fogOfWar
									? 'Класичний режим: вороги сховані за річкою'
									: 'Вся карта повністю відкрита для огляду'}
							</div>
						</div>
						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={() => (fogOfWar = true)}
								class="py-1.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer {fogOfWar
									? 'bg-cyan-600/30 border-cyan-500 text-cyan-200 shadow-lg shadow-cyan-500/10'
									: 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'}"
							>
								Увімкнено
							</button>
							<button
								type="button"
								onclick={() => (fogOfWar = false)}
								class="py-1.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer {!fogOfWar
									? 'bg-amber-600/30 border-amber-500 text-amber-200 shadow-lg shadow-amber-500/10'
									: 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'}"
							>
								Вимкнено
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Footer Submit -->
			<div class="pt-5 border-t border-slate-800 mt-5 flex gap-3">
				<button
					type="button"
					onclick={onClose}
					class="flex-1 py-3 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold transition cursor-pointer text-xs"
				>
					Скасувати
				</button>
				<button
					type="button"
					onclick={handleSubmit}
					class="flex-2 py-3 px-4 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer shadow-lg shadow-amber-500/20 text-xs flex items-center justify-center gap-2"
				>
					<Play class="w-4 h-4 fill-current" />
					Застосувати та почати новий матч
				</button>
			</div>
		</div>
	</div>
{/if}
