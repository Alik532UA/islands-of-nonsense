<script lang="ts">
	import type { Simulation } from '../engine/simulation';
	import { getCommander } from '../engine/commanders';
	import { getRaceAbility } from '../engine/raceAbilities';
	import {
		Coins,
		Shield,
		Sword,
		Hammer,
		Play,
		Pause,
		Sparkles,
		ShoppingBag,
		Crown,
		Flame,
		Sliders
	} from 'lucide-svelte';

	let {
		sim,
		uiTick = 0,
		onOpenForge,
		onOpenCommander,
		onOpenShop,
		onOpenSettings
	}: {
		sim: Simulation;
		uiTick?: number;
		onOpenForge: () => void;
		onOpenCommander: () => void;
		onOpenShop?: () => void;
		onOpenSettings?: () => void;
	} = $props();

	// Explicitly depend on uiTick so Svelte 5 re-reads properties from the class instance
	let westCastle = $derived(uiTick >= 0 ? sim.castles.west : sim.castles.west);
	let eastCastle = $derived(uiTick >= 0 ? sim.castles.east : sim.castles.east);
	let player = $derived(uiTick >= 0 ? sim.players.west : sim.players.west);
	let playerGold = $derived(uiTick >= 0 ? sim.players.west.gold : 0);
	let commander = $derived(uiTick >= 0 ? getCommander(player.commander) : getCommander(1));

	let westHpPct = $derived(Math.max(0, Math.round((westCastle.hp / westCastle.maxHp) * 100)));
	let eastHpPct = $derived(Math.max(0, Math.round((eastCastle.hp / eastCastle.maxHp) * 100)));

	let raceAbility = $derived(uiTick >= 0 ? getRaceAbility(player.race) : getRaceAbility('Люди'));
	let canCastRaceSkill = $derived(uiTick >= 0 ? sim.canUseRaceSkill('west') : false);
	let raceSkillCd = $derived(uiTick >= 0 ? sim.raceSkillCooldown.west : 0);
	let raceSkillUnlockLeft = $derived(
		uiTick >= 0 ? Math.max(0, 300 - Math.floor(sim.gameTime)) : 300
	);

	let canUseRescue = $derived(uiTick >= 0 ? sim.canUseRescueStrike('west') : false);
	let rescueCd = $derived(uiTick >= 0 ? sim.rescueStrikeCooldown.west : 0);

	let incomePct = $derived(
		Math.max(0, Math.min(100, Math.round((1 - sim.incomeTimer / sim.incomeInterval) * 100)))
	);

	function formatTime(sec: number): string {
		const m = Math.floor(sec / 60);
		const s = Math.floor(sec % 60);
		return `${m}:${s < 10 ? '0' : ''}${s}`;
	}
</script>

<header
	class="bg-slate-900/95 border-b border-slate-700/80 px-4 py-2.5 shadow-xl flex items-center justify-between text-white select-none backdrop-blur z-20"
>
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
			<div
				class="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-700/50"
			>
				<div
					class="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-200"
					style="width: {westHpPct}%"
				></div>
			</div>
		</div>

		<!-- Gold & Wood -->
		<div
			class="flex items-center gap-4 bg-slate-950/80 px-4 py-1.5 rounded-lg border border-slate-800"
		>
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

			<!-- Food Cap (Legendary Building Limit) -->
			<div
				class="flex items-center gap-1.5 text-xs border-l border-slate-700 pl-3 {player.maxFood > 0
					? 'text-amber-300'
					: 'text-slate-500'}"
				title="Ліміт легендарних будівель (Їжа): {player.food}/{player.maxFood}. Купіть Золотий Сир у магазині замку (B) за 1500g, щоб збільшити ліміт!"
			>
				<Crown class="w-3.5 h-3.5 {player.maxFood > 0 ? 'text-amber-400' : 'text-slate-500'}" />
				<span class="text-[11px] text-slate-400">Їжа:</span>
				<span class="font-mono font-bold">{player.food}/{player.maxFood}</span>
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

			<!-- Castle Shop Button -->
			<button
				onclick={onOpenShop}
				class="flex items-center gap-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-600/50 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-200 transition cursor-pointer"
				title="Магазин замку: припаси та захист (Гаряча клавіша: B)"
			>
				<ShoppingBag class="w-3.5 h-3.5 text-emerald-400" />
				<span>Магазин</span>
				<span
					class="text-[9px] bg-emerald-950 border border-emerald-500/60 px-1 rounded text-emerald-300 font-mono font-bold"
				>
					B
				</span>
			</button>

			<!-- Race Ability Button -->
			<button
				onclick={() => {
					if (canCastRaceSkill) {
						sim.useRaceSkill('west');
					}
				}}
				disabled={!canCastRaceSkill}
				class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer {canCastRaceSkill
					? 'bg-purple-900/80 hover:bg-purple-800 border border-purple-400 text-purple-100 ring-2 ring-purple-400/50 animate-pulse'
					: 'bg-slate-950/60 border border-slate-800 text-slate-500 cursor-not-allowed opacity-70'}"
				title="{raceAbility.nameUk}: {raceAbility.descriptionUk} (Гаряча клавіша: R)"
			>
				<Sparkles class="w-3.5 h-3.5 {canCastRaceSkill ? 'text-purple-300' : 'text-slate-500'}" />
				<span class="truncate max-w-[80px]">{raceAbility.nameUk}</span>
				{#if raceSkillUnlockLeft > 0}
					<span class="text-[10px] font-mono text-slate-500">({raceSkillUnlockLeft}с)</span>
				{:else if raceSkillCd > 0}
					<span class="text-[10px] font-mono text-amber-400">{Math.ceil(raceSkillCd)}с</span>
				{:else}
					<span
						class="text-[9px] bg-purple-950 border border-purple-500/60 px-1 rounded text-purple-300 font-mono font-bold"
					>
						R
					</span>
				{/if}
			</button>

			<!-- Emergency Rescue Strike Button -->
			<button
				onclick={() => {
					if (canUseRescue) {
						sim.triggerRescueStrike('west');
					}
				}}
				disabled={!canUseRescue}
				class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer {canUseRescue
					? 'bg-rose-950/80 hover:bg-rose-900 border border-rose-500 text-rose-100 ring-2 ring-rose-500/50'
					: 'bg-slate-950/60 border border-slate-800 text-slate-500 cursor-not-allowed opacity-70'}"
				title="Рятівний Удар: артилерійський залп навколо замку (-950 шкоди, КД 180с, Гаряча клавіша: E)"
			>
				<Flame
					class="w-3.5 h-3.5 {canUseRescue ? 'text-rose-400 animate-pulse' : 'text-slate-500'}"
				/>
				<span class="truncate max-w-[90px]">Рятівний удар</span>
				{#if rescueCd > 0}
					<span class="text-[10px] font-mono text-amber-400">{Math.ceil(rescueCd)}с</span>
				{:else}
					<span
						class="text-[9px] bg-rose-950 border border-rose-500/60 px-1 rounded text-rose-300 font-mono font-bold"
					>
						E
					</span>
				{/if}
			</button>
		</div>
	</div>

	<!-- Center: Match Info & Controls -->
	<div class="flex items-center gap-4">
		<div class="text-center">
			<div class="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
				Раунд {sim.round} • {sim.score.west} : {sim.score.east}
				<span class="text-[10px] text-amber-400/90 font-mono">(до {sim.targetWins})</span>
			</div>
			<div class="text-sm font-mono font-bold text-slate-200">
				{formatTime(sim.gameTime)}
			</div>
			{#if sim.activeBossInstanceId}
				<div class="text-[10px] font-bold text-amber-400 animate-pulse">👑 БОС НА АРЕНІ!</div>
			{:else}
				<div class="text-[10px] text-slate-500 font-mono">
					Бос: {Math.max(0, Math.ceil(sim.bossSpawnTimer))}с
				</div>
			{/if}
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

			<button
				onclick={onOpenSettings}
				class="p-1.5 rounded hover:bg-slate-800 text-slate-300 transition"
				title="Налаштування старту матчу"
			>
				<Sliders class="w-4 h-4 text-amber-400" />
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
			<div
				class="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-700/50"
			>
				<div
					class="h-full bg-gradient-to-l from-red-600 to-orange-400 transition-all duration-200"
					style="width: {eastHpPct}%"
				></div>
			</div>
		</div>
	</div>
</header>
