<script lang="ts">
	import type { Simulation } from '../engine/simulation';
	import { getCommander } from '../engine/commanders';
	import { Coins, Shield, Sword, Hammer, Play, Pause } from 'lucide-svelte';

	let {
		sim,
		uiTick = 0,
		onOpenForge,
		onOpenCommander
	}: {
		sim: Simulation;
		uiTick?: number;
		onOpenForge: () => void;
		onOpenCommander: () => void;
	} = $props();

	// Explicitly depend on uiTick so Svelte 5 re-reads properties from the class instance
	let westCastle = $derived(uiTick >= 0 ? sim.castles.west : sim.castles.west);
	let eastCastle = $derived(uiTick >= 0 ? sim.castles.east : sim.castles.east);
	let player = $derived(uiTick >= 0 ? sim.players.west : sim.players.west);
	let playerGold = $derived(uiTick >= 0 ? sim.players.west.gold : 0);
	let commander = $derived(uiTick >= 0 ? getCommander(player.commander) : getCommander(1));

	let westHpPct = $derived(Math.max(0, Math.round((westCastle.hp / westCastle.maxHp) * 100)));
	let eastHpPct = $derived(Math.max(0, Math.round((eastCastle.hp / eastCastle.maxHp) * 100)));

	let incomePct = $derived(
		Math.max(0, Math.min(100, Math.round((1 - sim.incomeTimer / sim.incomeInterval) * 100)))
	);

	function formatTime(sec: number): string {
		const m = Math.floor(sec / 60);
		const s = Math.floor(sec % 60);
		return `${m}:${s < 10 ? '0' : ''}${s}`;
	}
</script>

<header class="bg-slate-900/95 border-b border-slate-700/80 px-4 py-2.5 shadow-xl flex items-center justify-between text-white select-none backdrop-blur z-20">
	<!-- Left: West Castle & Resources -->
	<div class="flex items-center gap-6">
		<!-- West Castle HP -->
		<div class="w-48">
			<div class="flex justify-between items-center text-xs font-bold mb-1">
				<span class="text-blue-400 flex items-center gap-1">
					<Shield class="w-3.5 h-3.5 inline text-blue-400" />
					Ваш Замок
				</span>
				<span class="text-slate-300 font-mono">{westCastle.hp} / {westCastle.maxHp}</span>
			</div>
			<div class="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-700/50">
				<div
					class="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-200"
					style="width: {westHpPct}%"
				></div>
			</div>
		</div>

		<!-- Gold & Wood -->
		<div class="flex items-center gap-4 bg-slate-950/80 px-4 py-1.5 rounded-lg border border-slate-800">
			<!-- Gold -->
			<div class="flex items-center gap-1.5 font-bold text-amber-400">
				<Coins class="w-4 h-4 text-amber-400" />
				<span class="text-base font-mono tracking-tight">{playerGold}</span>
			</div>

			<!-- Income Countdown -->
			<div class="flex items-center gap-1.5 text-xs text-slate-300 border-l border-slate-700 pl-3">
				<span class="text-[11px] text-slate-400">Дохід:</span>
				<div class="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
					<div
						class="h-full bg-amber-500 transition-all duration-75"
						style="width: {incomePct}%"
					></div>
				</div>
				<span class="text-[10px] text-amber-400/90 font-mono">{Math.ceil(sim.incomeTimer)}с</span>
			</div>
		</div>

		<!-- Commander & Forge Quick Buttons -->
		<div class="flex items-center gap-2">
			<!-- Commander -->
			<button
				onclick={onOpenCommander}
				class="flex items-center gap-1.5 bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-700/60 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-200 transition cursor-pointer"
				title="Командир: {commander.name} ({commander.description})"
			>
				<Sword class="w-3.5 h-3.5 text-indigo-400" />
				<span>{commander.name}</span>
			</button>

			<!-- Forge -->
			<button
				onclick={onOpenForge}
				class="flex items-center gap-1.5 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-600/50 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-200 transition cursor-pointer"
			>
				<Hammer class="w-3.5 h-3.5 text-amber-400" />
				<span>Кузня</span>
				{#if player.forge.attack + player.forge.armor + player.forge.econ > 0}
					<span class="bg-amber-500 text-slate-950 text-[10px] px-1 rounded-full font-bold">
						{player.forge.attack + player.forge.armor + player.forge.econ}
					</span>
				{/if}
			</button>
		</div>
	</div>

	<!-- Center: Match Info & Controls -->
	<div class="flex items-center gap-4">
		<div class="text-center">
			<div class="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
				Раунд {sim.round} ({sim.score.west} : {sim.score.east})
			</div>
			<div class="text-sm font-mono font-bold text-slate-200">
				{formatTime(sim.gameTime)}
			</div>
		</div>

		<!-- Play / Pause / Speed -->
		<div class="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1">
			<button
				onclick={() => {
					sim.isRunning = !sim.isRunning;
					sim.notifyStateChanged();
				}}
				class="p-1.5 rounded hover:bg-slate-800 text-slate-300 transition"
				title={sim.isRunning ? 'Пауза' : 'Продовжити'}
			>
				{#if sim.isRunning}
					<Pause class="w-4 h-4 text-amber-400" />
				{:else}
					<Play class="w-4 h-4 text-emerald-400" />
				{/if}
			</button>

			<button
				onclick={() => {
					sim.speed = sim.speed === 1.0 ? 2.0 : sim.speed === 2.0 ? 3.0 : 1.0;
					sim.notifyStateChanged();
				}}
				class="px-2 py-1 rounded hover:bg-slate-800 text-xs font-mono font-bold text-slate-300 transition"
				title="Швидкість гри"
			>
				{sim.speed}x
			</button>
		</div>
	</div>

	<!-- Right: East Castle (Enemy) -->
	<div class="flex items-center gap-6">
		<div class="text-right text-xs">
			<span class="text-slate-400 font-semibold">{sim.players.east.race}</span>
			<span class="text-red-400 font-bold ml-1.5">(Бот)</span>
		</div>

		<div class="w-48">
			<div class="flex justify-between items-center text-xs font-bold mb-1">
				<span class="text-slate-300 font-mono">{eastCastle.hp} / {eastCastle.maxHp}</span>
				<span class="text-red-400 flex items-center gap-1">
					Замок Ворога
					<Shield class="w-3.5 h-3.5 inline text-red-400" />
				</span>
			</div>
			<div class="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-700/50">
				<div
					class="h-full bg-gradient-to-l from-red-600 to-orange-400 transition-all duration-200"
					style="width: {eastHpPct}%"
				></div>
			</div>
		</div>
	</div>
</header>
