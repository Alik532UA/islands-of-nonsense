<script lang="ts">
	import type { Simulation } from '../engine/simulation';
	import { getCommander } from '../engine/commanders';
	import { getRaceAbility } from '../engine/raceAbilities';
	import {
		Coins,
		Shield,
		BookOpen,
		Hammer,
		Play,
		Pause,
		Sparkles,
		ShoppingBag,
		Crown,
		Flame,
		Sliders,
		TreePine,
		Sun,
		Moon
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
	let westIncome = $derived(uiTick >= 0 ? sim.calculateIncome('west') : 15);
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

	// Day/Night Cycle calculation (every 120s full day/night cycle)
	let isDay = $derived(Math.floor(sim.gameTime / 60) % 2 === 0);
	let sunAngle = $derived(((sim.gameTime % 120) / 120) * 360);

	function formatTime(sec: number): string {
		const m = Math.floor(sec / 60);
		const s = Math.floor(sec % 60);
		return `${m}:${s < 10 ? '0' : ''}${s}`;
	}
</script>

<!-- Authentic Warcraft III Top Bar -->
<header
	class="bg-[#11141c] border-b-2 border-[#544738] px-4 py-2 shadow-2xl flex items-center justify-between text-white select-none backdrop-blur z-20 h-14"
	style="background: linear-gradient(180deg, #1b202c 0%, #0d1017 100%); box-shadow: 0 4px 16px rgba(0,0,0,0.8);"
>
	<!-- 1. LEFT: Menu Buttons (Довідник F9, Меню, Кузня, Магазин, Здібності) -->
	<div class="flex items-center gap-2">
		<!-- Guide / Manual (F9) -->
		<button
			onclick={onOpenCommander}
			class="flex items-center gap-1.5 bg-[#251e16] hover:bg-[#382d21] border border-[#8c7456] px-2.5 py-1 rounded text-xs font-semibold text-[#fef08a] transition cursor-pointer active:scale-95 shadow"
			title="Довідник гри та командир: {commander.name} ({commander.nickname})"
		>
			<BookOpen class="w-3.5 h-3.5 text-amber-400" />
			<span>Довідник (F9)</span>
		</button>

		<!-- Game Settings Menu -->
		<button
			onclick={onOpenSettings}
			class="flex items-center gap-1.5 bg-[#251e16] hover:bg-[#382d21] border border-[#8c7456] px-2.5 py-1 rounded text-xs font-semibold text-[#fef08a] transition cursor-pointer active:scale-95 shadow"
			title="Меню налаштувань матчу"
		>
			<Sliders class="w-3.5 h-3.5 text-amber-400" />
			<span>Меню</span>
		</button>

		<!-- War Forge (F) -->
		<button
			onclick={onOpenForge}
			class="flex items-center gap-1.5 bg-[#2a241b] hover:bg-[#3d3427] border border-[#8c7456] px-2.5 py-1 rounded text-xs font-semibold text-amber-200 transition cursor-pointer active:scale-95 shadow"
			title="Військова Кузня (Гаряча клавіша: F)"
		>
			<Hammer class="w-3.5 h-3.5 text-amber-400" />
			<span>Кузня</span>
			{#if player.forge.attack + player.forge.armor + player.forge.econ > 0}
				<span class="bg-amber-500 text-slate-950 text-[10px] px-1 rounded-full font-bold">
					{player.forge.attack + player.forge.armor + player.forge.econ}
				</span>
			{/if}
		</button>

		<!-- Castle Shop (B) -->
		<button
			onclick={onOpenShop}
			class="flex items-center gap-1.5 bg-[#172e21] hover:bg-[#1e3d2c] border border-emerald-600/70 px-2.5 py-1 rounded text-xs font-semibold text-emerald-200 transition cursor-pointer active:scale-95 shadow"
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

		<div class="h-6 w-[1px] bg-[#3b3226] mx-1"></div>

		<!-- Race Ability Quick Button (R) -->
		<button
			onclick={() => {
				if (canCastRaceSkill) sim.useRaceSkill('west');
			}}
			disabled={!canCastRaceSkill}
			class="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition cursor-pointer {canCastRaceSkill
				? 'bg-purple-900/90 hover:bg-purple-800 border border-purple-400 text-purple-100 ring-2 ring-purple-400/50 animate-pulse'
				: 'bg-[#181d28] border border-slate-700 text-slate-500 cursor-not-allowed opacity-60'}"
			title="{raceAbility.nameUk}: {raceAbility.descriptionUk} (Гаряча клавіша: R)"
		>
			<Sparkles class="w-3.5 h-3.5 {canCastRaceSkill ? 'text-purple-300' : 'text-slate-500'}" />
			<span class="truncate max-w-[75px]">{raceAbility.nameUk}</span>
			{#if raceSkillUnlockLeft > 0}
				<span class="text-[9px] font-mono text-slate-500">({raceSkillUnlockLeft}с)</span>
			{:else if raceSkillCd > 0}
				<span class="text-[9px] font-mono text-amber-400">{Math.ceil(raceSkillCd)}с</span>
			{:else}
				<span
					class="text-[8px] bg-purple-950 border border-purple-500/60 px-1 rounded text-purple-300 font-mono font-bold"
				>
					R
				</span>
			{/if}
		</button>

		<!-- Rescue Strike Quick Button (E) -->
		<button
			onclick={() => {
				if (canUseRescue) sim.triggerRescueStrike('west');
			}}
			disabled={!canUseRescue}
			class="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition cursor-pointer {canUseRescue
				? 'bg-rose-950/90 hover:bg-rose-900 border border-rose-500 text-rose-100 ring-2 ring-rose-500/50'
				: 'bg-[#181d28] border border-slate-700 text-slate-500 cursor-not-allowed opacity-60'}"
			title="Рятівний Удар навколо замку (-950 шкоди, Гаряча клавіша: E)"
		>
			<Flame
				class="w-3.5 h-3.5 {canUseRescue ? 'text-rose-400 animate-pulse' : 'text-slate-500'}"
			/>
			<span class="truncate max-w-[80px]">Рятівний удар</span>
			{#if rescueCd > 0}
				<span class="text-[9px] font-mono text-amber-400">{Math.ceil(rescueCd)}с</span>
			{:else}
				<span
					class="text-[8px] bg-rose-950 border border-rose-500/60 px-1 rounded text-rose-300 font-mono font-bold"
				>
					E
				</span>
			{/if}
		</button>
	</div>

	<!-- 2. CENTER: Warcraft III Day/Night Dial & Round Banner -->
	<div class="flex items-center gap-4">
		<!-- Authentic Warcraft III Circular Day/Night Clock Dial -->
		<div
			class="relative w-10 h-10 rounded-full border-2 border-[#8c7456] bg-[#0c1017] flex items-center justify-center shadow-lg overflow-hidden shrink-0"
			title={isDay ? 'День (Сонце)' : 'Ніч (Місяць)'}
			style="box-shadow: inset 0 0 6px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.6);"
		>
			<div
				class="absolute inset-0 flex items-center justify-center transition-transform duration-1000"
				style="transform: rotate({sunAngle}deg);"
			>
				{#if isDay}
					<Sun class="w-5 h-5 text-amber-400" />
				{:else}
					<Moon class="w-5 h-5 text-indigo-300" />
				{/if}
			</div>
		</div>

		<!-- Match Banner & Timer -->
		<div class="text-center">
			<div class="text-[10px] uppercase tracking-wider text-[#d4af37] font-bold">
				Раунд {sim.round} • {sim.score.west} : {sim.score.east}
				<span class="text-[9px] text-[#9ca3af] font-mono">(до {sim.targetWins})</span>
			</div>
			<div class="text-xs font-mono font-bold text-slate-200">
				{formatTime(sim.gameTime)}
			</div>
			{#if sim.activeBossInstanceId}
				<div class="text-[9px] font-bold text-amber-400 animate-pulse">👑 БОС НА АРЕНІ!</div>
			{:else}
				<div class="text-[9px] text-slate-500 font-mono">
					Бос: {Math.max(0, Math.ceil(sim.bossSpawnTimer))}с
				</div>
			{/if}
		</div>

		<!-- Play / Pause / Speed -->
		<div class="flex items-center bg-[#0c1017] p-0.5 rounded border border-[#544738] gap-1">
			<button
				onclick={() => {
					sim.isRunning = !sim.isRunning;
					sim.notifyStateChanged();
				}}
				class="p-1 rounded hover:bg-[#2a241b] text-slate-300 transition cursor-pointer"
				title={sim.isRunning ? 'Пауза (Пробіл)' : 'Продовжити (Пробіл)'}
			>
				{#if sim.isRunning}
					<Pause class="w-3.5 h-3.5 text-amber-400" />
				{:else}
					<Play class="w-3.5 h-3.5 text-emerald-400" />
				{/if}
			</button>

			<button
				onclick={() => {
					sim.speed = sim.speed === 1.0 ? 2.0 : sim.speed === 2.0 ? 3.0 : 1.0;
					sim.notifyStateChanged();
				}}
				class="px-1.5 py-0.5 rounded hover:bg-[#2a241b] text-[10px] font-mono font-bold text-slate-300 transition cursor-pointer"
				title="Швидкість гри"
			>
				{sim.speed}x
			</button>
		</div>
	</div>

	<!-- 3. RIGHT: Resources Bar (Gold, Wood/Income, Food, Castle HP) -->
	<div class="flex items-center gap-5">
		<!-- Authentic WC3 Resource Boxes -->
		<div
			class="flex items-center gap-3.5 bg-[#0c1017] px-3 py-1 rounded-md border border-[#544738] shadow-inner"
		>
			<!-- 🪙 Gold -->
			<div class="flex items-center gap-1 font-bold text-amber-400" title="Золото гравця">
				<Coins class="w-4 h-4 text-amber-400" />
				<span class="text-sm font-mono tracking-tight">{playerGold}</span>
			</div>

			<!-- 💰 Gold Income -->
			<div
				class="flex items-center gap-1.5 text-xs text-amber-300 border-l border-[#3b3226] pl-2.5"
				title="Періодичний дохід золота: +{westIncome} кожні {sim.incomeInterval}с"
			>
				<span class="font-mono font-bold text-amber-400">+{westIncome}</span>
				<!-- Income progress bar -->
				<div class="w-12 h-1.5 bg-[#1e2433] rounded-full overflow-hidden border border-[#3b3226]">
					<div
						class="h-full bg-amber-400 transition-all duration-75"
						style="width: {incomePct}%"
					></div>
				</div>
				<span class="text-[9px] text-amber-400/90 font-mono">{Math.ceil(sim.incomeTimer)}с</span>
			</div>

			<!-- 🌲 Lumber (if > 0) -->
			{#if sim.players.west.lumber > 0}
				<div
					class="flex items-center gap-1 text-xs text-emerald-300 border-l border-[#3b3226] pl-2.5"
					title="Дерево для особливих технологій"
				>
					<TreePine class="w-3.5 h-3.5 text-emerald-400" />
					<span class="font-mono font-bold">{sim.players.west.lumber}</span>
				</div>
			{/if}

			<!-- 🥩 Food Cap (Legendary Building Limit) -->
			<div
				class="flex items-center gap-1 text-xs border-l border-[#3b3226] pl-2.5 {player.maxFood > 0
					? 'text-amber-300'
					: 'text-slate-500'}"
				title="Ліміт легендарних будівель (Їжа): {player.food}/{player.maxFood}. Збільшуйте ліміт у магазині замку (B)!"
			>
				<Crown class="w-3.5 h-3.5 {player.maxFood > 0 ? 'text-amber-400' : 'text-slate-500'}" />
				<span class="font-mono font-bold">{player.food}/{player.maxFood}</span>
			</div>
		</div>

		<!-- Castles HP Meters -->
		<div class="flex items-center gap-3">
			<!-- West Castle HP (Player) -->
			<div class="w-32" title="Західний Замок (Гравець): {westCastle.hp} / {westCastle.maxHp}">
				<div class="flex justify-between items-center text-[10px] font-bold mb-0.5">
					<span class="text-blue-400 flex items-center gap-0.5">
						<Shield class="w-3 h-3 text-blue-400" />
						Ваш Замок
					</span>
					<span class="text-slate-300 font-mono text-[9px]">{westCastle.hp}</span>
				</div>
				<div class="h-2 w-full bg-[#0c1017] rounded-full overflow-hidden border border-[#3b3226]">
					<div
						class="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-200"
						style="width: {westHpPct}%"
					></div>
				</div>
			</div>

			<!-- East Castle HP (Enemy Bot) -->
			<div
				class="w-32"
				title="Східний Замок ({sim.players.east.race} Бот): {eastCastle.hp} / {eastCastle.maxHp}"
			>
				<div class="flex justify-between items-center text-[10px] font-bold mb-0.5">
					<span class="text-slate-300 font-mono text-[9px]">{eastCastle.hp}</span>
					<span class="text-rose-400 flex items-center gap-0.5">
						Замок Ворога
						<Shield class="w-3 h-3 text-rose-400" />
					</span>
				</div>
				<div class="h-2 w-full bg-[#0c1017] rounded-full overflow-hidden border border-[#3b3226]">
					<div
						class="h-full bg-gradient-to-l from-red-600 to-orange-400 transition-all duration-200"
						style="width: {eastHpPct}%"
					></div>
				</div>
			</div>
		</div>
	</div>
</header>
