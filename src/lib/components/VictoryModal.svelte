<script lang="ts">
	import type { Simulation } from '../engine/simulation';
	import { Trophy, Skull, RotateCcw, Award, Crown, Pause, Play, Clock } from 'lucide-svelte';

	let {
		sim,
		onNextRound
	}: {
		sim: Simulation;
		onNextRound: () => void;
	} = $props();

	let isWestWin = $derived(sim.winner === 'west');
	let isMatchOver = $derived(!!sim.matchWinner);
	let statsWest = $derived(sim.players.west.stats);
	let statsEast = $derived(sim.players.east.stats);
	let westMvp = $derived(sim.getMvpBuilding('west'));

	let countdown = $state(10);
	let isPaused = $state(false);

	$effect(() => {
		if (!sim.winner) {
			countdown = 10;
			isPaused = false;
			return;
		}

		if (isPaused) return;

		const timer = setInterval(() => {
			if (countdown > 1) {
				countdown--;
			} else {
				countdown = 0;
				clearInterval(timer);
				onNextRound();
			}
		}, 1000);

		return () => clearInterval(timer);
	});
</script>

{#if sim.winner}
	<div
		class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none"
	>
		<div
			class="bg-slate-900 border {isMatchOver
				? isWestWin
					? 'border-amber-400 shadow-amber-500/30 ring-2 ring-amber-400/50'
					: 'border-red-600 shadow-red-600/30'
				: isWestWin
					? 'border-blue-500/80 shadow-blue-500/20'
					: 'border-red-500/80 shadow-red-500/20'} rounded-3xl w-full max-w-md shadow-2xl p-7 text-white text-center"
		>
			<!-- Big Trophy or Skull Icon -->
			<div
				class="inline-flex p-4 rounded-2xl mb-4 {isMatchOver
					? isWestWin
						? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
						: 'bg-red-500/20 text-red-400 border border-red-500/40'
					: isWestWin
						? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
						: 'bg-red-500/20 text-red-400 border border-red-500/40'}"
			>
				{#if isMatchOver}
					{#if isWestWin}
						<Award class="w-12 h-12 text-amber-400 animate-bounce" />
					{:else}
						<Skull class="w-12 h-12 text-red-400" />
					{/if}
				{:else if isWestWin}
					<Trophy class="w-12 h-12" />
				{:else}
					<Skull class="w-12 h-12" />
				{/if}
			</div>

			<!-- Title -->
			<h2
				class="text-2xl font-black uppercase tracking-wider mb-1 {isMatchOver
					? isWestWin
						? 'text-amber-400'
						: 'text-red-400'
					: isWestWin
						? 'text-blue-400'
						: 'text-red-400'}"
			>
				{#if isMatchOver}
					{isWestWin ? 'Тріумф! Перемога у матчі!' : 'Матч програно!'}
				{:else}
					{isWestWin ? 'Перемога у раунді!' : 'Поразка у раунді!'}
				{/if}
			</h2>

			<p class="text-xs text-slate-400 mb-4">
				Рахунок серії: <span class="font-mono font-bold text-white text-sm">
					{sim.score.west} : {sim.score.east}
				</span>
				<span class="text-slate-500 text-[11px]">
					({isMatchOver ? `Серія до ${sim.targetWins}` : `гра до ${sim.targetWins} перемог`})
				</span>
			</p>

			<!-- MVP Building Banner -->
			{#if westMvp}
				<div
					class="bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-amber-950/60 border border-amber-500/40 rounded-xl p-3 mb-4 text-xs flex items-center justify-between shadow-lg shadow-amber-500/5"
				>
					<div class="flex items-center gap-2">
						<div class="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
							<Crown class="w-4 h-4" />
						</div>
						<div class="text-left">
							<div class="text-[10px] font-bold uppercase tracking-wider text-amber-400">
								MVP Споруда вашої армії
							</div>
							<div class="font-bold text-slate-100">{westMvp.name}</div>
						</div>
					</div>
					<div class="text-right text-[11px] font-mono">
						<div class="text-amber-300 font-bold">{westMvp.kills} вбивств</div>
						<div class="text-slate-400 text-[10px]">{westMvp.damage} шкоди</div>
					</div>
				</div>
			{/if}

			<!-- Round & Match Stats Summary -->
			<div
				class="bg-slate-950/80 border border-slate-800 rounded-xl p-4 mb-6 text-xs text-slate-300 grid grid-cols-2 gap-4"
			>
				<div class="border-r border-slate-800 pr-2 space-y-1 text-left">
					<div class="font-bold text-blue-400 mb-1 flex items-center justify-between">
						<span>Ваша команда</span>
						<span class="text-[10px] font-mono bg-blue-950 px-1.5 rounded text-blue-300">West</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Шкода замку:</span>
						<span class="font-bold text-rose-400 font-mono">{statsWest.damageToCastle}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Шкода армії:</span>
						<span class="font-bold text-amber-300 font-mono">{statsWest.totalDamageDealt}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Знищено ворогів:</span>
						<span class="font-bold text-white font-mono">{statsWest.unitsKilled}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Створено бійців:</span>
						<span class="font-bold text-slate-200 font-mono">{statsWest.unitsSpawned}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Монет підібрано:</span>
						<span class="font-bold text-amber-400 font-mono">{statsWest.coinsCollected}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Предметів замку:</span>
						<span class="font-bold text-indigo-300 font-mono">{statsWest.itemsPurchased}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Витрачено золота:</span>
						<span class="font-bold text-emerald-400 font-mono">{statsWest.goldSpent}g</span>
					</div>
				</div>

				<div class="pl-2 space-y-1 text-left">
					<div class="font-bold text-red-400 mb-1 flex items-center justify-between">
						<span>Бот (Супротивник)</span>
						<span class="text-[10px] font-mono bg-red-950 px-1.5 rounded text-red-300">East</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Шкода замку:</span>
						<span class="font-bold text-rose-400 font-mono">{statsEast.damageToCastle}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Шкода армії:</span>
						<span class="font-bold text-amber-300 font-mono">{statsEast.totalDamageDealt}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Знищено ворогів:</span>
						<span class="font-bold text-white font-mono">{statsEast.unitsKilled}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Створено бійців:</span>
						<span class="font-bold text-slate-200 font-mono">{statsEast.unitsSpawned}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Монет підібрано:</span>
						<span class="font-bold text-amber-400 font-mono">{statsEast.coinsCollected}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Предметів замку:</span>
						<span class="font-bold text-indigo-300 font-mono">{statsEast.itemsPurchased}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Витрачено золота:</span>
						<span class="font-bold text-emerald-400 font-mono">{statsEast.goldSpent}g</span>
					</div>
				</div>
			</div>

			<!-- Countdown Timer & Auto-Restart Notice -->
			<div class="mb-4 bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-xs">
				<div class="flex items-center justify-between mb-1.5 text-slate-300">
					<div class="flex items-center gap-1.5">
						<Clock class="w-3.5 h-3.5 text-amber-400" />
						{#if isPaused}
							<span class="text-amber-400 font-bold">Таймер на паузі</span>
						{:else}
							<span>
								Автостарт {isMatchOver ? 'нового матчу' : 'наступного раунду'}:
								<span class="font-mono font-bold text-white text-sm">{countdown}с</span>
							</span>
						{/if}
					</div>

					<button
						type="button"
						onclick={() => (isPaused = !isPaused)}
						class="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1 cursor-pointer"
						title={isPaused ? 'Відновити зворотний відлік' : 'Призупинити зворотний відлік'}
					>
						{#if isPaused}
							<Play class="w-2.5 h-2.5 text-emerald-400" />
							<span>Відновити</span>
						{:else}
							<Pause class="w-2.5 h-2.5 text-amber-400" />
							<span>Пауза</span>
						{/if}
					</button>
				</div>

				<!-- Smooth visual countdown bar -->
				<div class="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
					<div
						class="h-full transition-all duration-1000 ease-linear rounded-full {isWestWin
							? 'bg-amber-400'
							: 'bg-red-500'}"
						style="width: {(countdown / 10) * 100}%"
					></div>
				</div>
			</div>

			<!-- Action Button -->
			<button
				onclick={onNextRound}
				class="w-full py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide transition flex items-center justify-center gap-2 cursor-pointer shadow-lg {isMatchOver
					? isWestWin
						? 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-amber-600/30 font-black'
						: 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
					: isWestWin
						? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
						: 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'}"
			>
				<RotateCcw class="w-4 h-4" />
				{#if isMatchOver}
					Розпочати новий матч {!isPaused ? `(${countdown}с)` : ''}
				{:else}
					Розпочати раунд {sim.round + 1} {!isPaused ? `(${countdown}с)` : ''}
				{/if}
			</button>
		</div>
	</div>
{/if}
