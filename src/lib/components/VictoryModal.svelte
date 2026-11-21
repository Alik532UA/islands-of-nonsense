<script lang="ts">
	import type { Simulation } from '../engine/simulation';
	import { Trophy, Skull, RotateCcw } from 'lucide-svelte';

	let {
		sim,
		onNextRound
	}: {
		sim: Simulation;
		onNextRound: () => void;
	} = $props();

	let isWestWin = $derived(sim.winner === 'west');
	let statsWest = $derived(sim.players.west.stats);
	let statsEast = $derived(sim.players.east.stats);
</script>

{#if sim.winner}
	<div class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none">
		<div class="bg-slate-900 border {isWestWin ? 'border-blue-500/80 shadow-blue-500/20' : 'border-red-500/80 shadow-red-500/20'} rounded-3xl w-full max-w-md shadow-2xl p-7 text-white text-center">
			<!-- Big Trophy or Skull Icon -->
			<div class="inline-flex p-4 rounded-2xl mb-4 {isWestWin ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'}">
				{#if isWestWin}
					<Trophy class="w-12 h-12" />
				{:else}
					<Skull class="w-12 h-12" />
				{/if}
			</div>

			<!-- Title -->
			<h2 class="text-2xl font-black uppercase tracking-wider mb-1 {isWestWin ? 'text-blue-400' : 'text-red-400'}">
				{isWestWin ? 'Перемога Заходу!' : 'Поразка Замку!'}
			</h2>
			<p class="text-xs text-slate-400 mb-6">
				Рахунок матчу: <span class="font-mono font-bold text-white text-sm">{sim.score.west} : {sim.score.east}</span>
			</p>

			<!-- Round Stats Summary -->
			<div class="bg-slate-950/80 border border-slate-800 rounded-xl p-4 mb-6 text-xs text-slate-300 grid grid-cols-2 gap-4">
				<div class="border-r border-slate-800 pr-2">
					<div class="font-bold text-blue-400 mb-1">Ваша команда</div>
					<div>Створено бійців: <span class="font-bold text-white">{statsWest.unitsSpawned}</span></div>
					<div>Знищено ворогів: <span class="font-bold text-white">{statsWest.unitsKilled}</span></div>
					<div>Витрачено золота: <span class="font-bold text-white">{statsWest.goldSpent}g</span></div>
				</div>
				<div class="pl-2">
					<div class="font-bold text-red-400 mb-1">Супротивник (Бот)</div>
					<div>Створено бійців: <span class="font-bold text-white">{statsEast.unitsSpawned}</span></div>
					<div>Знищено ворогів: <span class="font-bold text-white">{statsEast.unitsKilled}</span></div>
					<div>Витрачено золота: <span class="font-bold text-white">{statsEast.goldSpent}g</span></div>
				</div>
			</div>

			<!-- Next Round Button -->
			<button
				onclick={onNextRound}
				class="w-full py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide transition flex items-center justify-center gap-2 cursor-pointer shadow-lg {isWestWin
					? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
					: 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'}"
			>
				<RotateCcw class="w-4 h-4" />
				Розпочати наступний раунд
			</button>
		</div>
	</div>
{/if}
