<script lang="ts">
	import { onMount } from 'svelte';
	import type { Simulation } from '../engine/simulation';
	import { getCommander } from '../engine/commanders';
	import { getRaceAbility } from '../engine/raceAbilities';
	import { resolve } from '$app/paths';
	import { settings } from '$lib/services/settings.svelte';
	import { fullscreen, canFullscreen } from '$lib/services/fullscreen.svelte';
	import {
		ArrowLeft,
		House,
		Volume2,
		VolumeX,
		Maximize2,
		Minimize2,
		Languages,
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
		onOpenSettings,
		onBeforeLeave
	}: {
		sim: Simulation;
		uiTick?: number;
		onOpenForge: () => void;
		onOpenCommander: () => void;
		onOpenShop?: () => void;
		onOpenSettings?: () => void;
		onBeforeLeave?: (targetUrl: string) => boolean;
	} = $props();

	// Explicitly depend on uiTick so Svelte 5 re-reads properties from the class instance
	let westCastle = $derived(uiTick >= 0 ? sim.castles.west : sim.castles.west);
	let eastCastle = $derived(uiTick >= 0 ? sim.castles.east : sim.castles.east);
	let player = $derived(uiTick >= 0 ? sim.players.west : sim.players.west);
	let playerGold = $derived(uiTick >= 0 ? Math.floor(sim.players.west.gold) : 0);
	let westIncome = $derived(uiTick >= 0 ? Math.round(sim.calculateIncome('west')) : 15);
	let commander = $derived(uiTick >= 0 ? getCommander(player.commander) : getCommander(1));

	let westHp = $derived(
		uiTick >= 0 ? Math.max(0, Math.ceil(westCastle.hp)) : Math.round(westCastle.maxHp)
	);
	let eastHp = $derived(
		uiTick >= 0 ? Math.max(0, Math.ceil(eastCastle.hp)) : Math.round(eastCastle.maxHp)
	);
	let westMaxHp = $derived(Math.round(westCastle.maxHp));
	let eastMaxHp = $derived(Math.round(eastCastle.maxHp));

	let westHpPct = $derived(
		Math.max(0, Math.min(100, Math.round((westHp / (westMaxHp || 1)) * 100)))
	);
	let eastHpPct = $derived(
		Math.max(0, Math.min(100, Math.round((eastHp / (eastMaxHp || 1)) * 100)))
	);

	let raceAbility = $derived(uiTick >= 0 ? getRaceAbility(player.race) : getRaceAbility('Люди'));
	let canCastRaceSkill = $derived(uiTick >= 0 ? sim.canUseRaceSkill('west') : false);

	const baseSpeeds = [1, 2, 3, 5];
	const devSpeeds = [10, 50, 100];
	const isDev = Boolean(import.meta.env?.DEV);
	const availableSpeeds = isDev ? [...baseSpeeds, ...devSpeeds] : baseSpeeds;
	let raceSkillCd = $derived(uiTick >= 0 ? sim.raceSkillCooldown.west : 0);
	let raceSkillUnlockLeft = $derived(
		uiTick >= 0 ? Math.max(0, 300 - Math.floor(sim.gameTime)) : 300
	);

	let canUseRescue = $derived(uiTick >= 0 ? sim.canUseRescueStrike('west') : false);
	let rescueCd = $derived(uiTick >= 0 ? sim.rescueStrikeCooldown.west : 0);

	let gameTime = $derived(uiTick >= 0 ? sim.gameTime : 0);
	let bossSpawnTimer = $derived(uiTick >= 0 ? Math.max(0, Math.ceil(sim.bossSpawnTimer)) : 180);
	let activeBossInstanceId = $derived(uiTick >= 0 ? sim.activeBossInstanceId : null);
	let incomeTimer = $derived(uiTick >= 0 ? Math.ceil(sim.incomeTimer) : 0);
	let isRunning = $derived(uiTick >= 0 ? sim.isRunning : false);
	let simSpeed = $derived(uiTick >= 0 ? sim.speed : 1);
	let westLumber = $derived(uiTick >= 0 ? Math.floor(sim.players.west.lumber) : 0);

	let incomePct = $derived(
		uiTick >= 0
			? Math.max(0, Math.min(100, Math.round((1 - sim.incomeTimer / sim.incomeInterval) * 100)))
			: 0
	);

	// Day/Night Cycle calculation (every 120s full day/night cycle)
	let isDay = $derived(uiTick >= 0 ? sim.dayNightCycle === 'day' : true);
	let dayPhase = $derived(uiTick >= 0 ? sim.dayNightPhase : 'day');
	let sunAngle = $derived(uiTick >= 0 ? sim.dayNightProgress * 360 : 0);

	onMount(() => fullscreen.watch());

	function formatTime(sec: number): string {
		const totalSec = Math.floor(sec + 0.001);
		const m = Math.floor(totalSec / 60);
		const s = Math.floor(totalSec % 60);
		return `${m}:${s < 10 ? '0' : ''}${s}`;
	}
</script>

<!-- Authentic Warcraft III Top Bar -->
<header
	class="bg-[#11141c] border-b-2 border-[#544738] px-2.5 sm:px-4 py-1.5 shadow-2xl flex items-center justify-between text-white select-none backdrop-blur z-20 h-14 min-w-0 overflow-x-auto overflow-y-hidden"
	style="background: linear-gradient(180deg, #1b202c 0%, #0d1017 100%); box-shadow: 0 4px 16px rgba(0,0,0,0.8);"
>
	<!-- 1. LEFT: Nav & Menu Buttons (Назад, Додому, Довідник F9, Меню, Кузня, Магазин, Здібності) -->
	<div class="flex items-center gap-1.5 shrink-0">
		<!-- Back to Modes -->
		<a
			href={resolve('/play')}
			onclick={(e) => {
				if (onBeforeLeave && !onBeforeLeave(resolve('/play'))) {
					e.preventDefault();
				}
			}}
			class="flex items-center justify-center p-1.5 bg-[#181d28] hover:bg-[#252d3d] border border-slate-700 hover:border-amber-500/60 rounded text-slate-300 hover:text-amber-300 transition cursor-pointer active:scale-95 shadow shrink-0"
			title="Назад до вибору режимів"
			aria-label="Назад до вибору режимів"
			data-testid="topbar-back-link"
		>
			<ArrowLeft class="w-3.5 h-3.5" />
		</a>

		<!-- Main Menu (Home) -->
		<a
			href={resolve('/')}
			onclick={(e) => {
				if (onBeforeLeave && !onBeforeLeave(resolve('/'))) {
					e.preventDefault();
				}
			}}
			class="flex items-center justify-center p-1.5 bg-[#181d28] hover:bg-[#252d3d] border border-slate-700 hover:border-amber-500/60 rounded text-slate-300 hover:text-amber-300 transition cursor-pointer active:scale-95 shadow shrink-0"
			title="Головне меню"
			aria-label="Головне меню"
			data-testid="topbar-home-link"
		>
			<House class="w-3.5 h-3.5" />
		</a>

		<div class="h-4 w-px bg-[#544738]/70 mx-0.5"></div>

		<!-- Guide / Manual (F9) -->
		<button
			onclick={onOpenCommander}
			class="flex items-center gap-1 bg-[#251e16] hover:bg-[#382d21] border border-[#8c7456] px-2 py-1 rounded text-xs font-semibold text-[#fef08a] transition cursor-pointer active:scale-95 shadow shrink-0"
			title="Довідник гри та командир: {commander.name} ({commander.nickname})"
			aria-label="Довідник гри та командир: {commander.name} ({commander.nickname})"
			aria-keyshortcuts="F9"
		>
			<BookOpen class="w-3.5 h-3.5 text-amber-400 shrink-0" />
			<span class="hidden md:inline">Довідник</span>
			<span class="hidden 2xl:inline text-[10px] text-amber-400/80 font-mono">(F9)</span>
		</button>

		<!-- Game Settings Menu -->
		<button
			onclick={onOpenSettings}
			class="flex items-center gap-1 bg-[#251e16] hover:bg-[#382d21] border border-[#8c7456] px-2 py-1 rounded text-xs font-semibold text-[#fef08a] transition cursor-pointer active:scale-95 shadow shrink-0"
			title="Меню налаштувань матчу"
			aria-label="Меню налаштувань матчу"
		>
			<Sliders class="w-3.5 h-3.5 text-amber-400 shrink-0" />
			<span class="hidden sm:inline">Меню</span>
		</button>

		<!-- War Forge (F) -->
		<button
			onclick={onOpenForge}
			class="flex items-center gap-1 bg-[#2a241b] hover:bg-[#3d3427] border border-[#8c7456] px-2 py-1 rounded text-xs font-semibold text-amber-200 transition cursor-pointer active:scale-95 shadow shrink-0"
			title="Військова Кузня (Гаряча клавіша: F)"
			aria-label="Військова Кузня (Гаряча клавіша: F)"
			aria-keyshortcuts="f"
		>
			<Hammer class="w-3.5 h-3.5 text-amber-400 shrink-0" />
			<span class="hidden md:inline">Кузня</span>
			{#if player.forge.attack + player.forge.armor + player.forge.econ > 0}
				<span class="bg-amber-500 text-slate-950 text-[10px] px-1 rounded-full font-bold">
					{player.forge.attack + player.forge.armor + player.forge.econ}
				</span>
			{/if}
		</button>

		<!-- Castle Shop (B) -->
		<button
			onclick={onOpenShop}
			class="flex items-center gap-1 bg-[#172e21] hover:bg-[#1e3d2c] border border-emerald-600/70 px-2 py-1 rounded text-xs font-semibold text-emerald-200 transition cursor-pointer active:scale-95 shadow shrink-0"
			title="Магазин замку: припаси та захист (Гаряча клавіша: B)"
			aria-label="Магазин замку: припаси та захист (Гаряча клавіша: B)"
			aria-keyshortcuts="b"
		>
			<ShoppingBag class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
			<span class="hidden md:inline">Магазин</span>
			<span
				class="text-[9px] bg-emerald-950 border border-emerald-500/60 px-1 rounded text-emerald-300 font-mono font-bold"
			>
				B
			</span>
		</button>

		<div class="h-5 w-[1px] bg-[#3b3226] mx-0.5 shrink-0"></div>

		<!-- Race Ability Quick Button (R) -->
		<button
			onclick={() => {
				if (canCastRaceSkill) sim.useRaceSkill('west');
			}}
			disabled={!canCastRaceSkill}
			class="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition cursor-pointer shrink-0 {canCastRaceSkill
				? 'bg-purple-900/90 hover:bg-purple-800 border border-purple-400 text-purple-100 ring-2 ring-purple-400/50 animate-pulse'
				: 'bg-[#181d28] border border-slate-700 text-slate-500 cursor-not-allowed opacity-60'}"
			title="{raceAbility.nameUk}: {raceAbility.descriptionUk} (Гаряча клавіша: R)"
			aria-label="{raceAbility.nameUk}: {raceAbility.descriptionUk} (Гаряча клавіша: R)"
			aria-keyshortcuts="r"
		>
			<Sparkles
				class="w-3.5 h-3.5 shrink-0 {canCastRaceSkill ? 'text-purple-300' : 'text-slate-500'}"
			/>
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
			class="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition cursor-pointer shrink-0 {canUseRescue
				? 'bg-rose-950/90 hover:bg-rose-900 border border-rose-500 text-rose-100 ring-2 ring-rose-500/50'
				: 'bg-[#181d28] border border-slate-700 text-slate-500 cursor-not-allowed opacity-60'}"
			title="Рятівний Удар навколо замку (-950 шкоди, Гаряча клавіша: E)"
			aria-label="Рятівний Удар навколо замку (-950 шкоди, Гаряча клавіша: E)"
			aria-keyshortcuts="e"
		>
			<Flame
				class="w-3.5 h-3.5 shrink-0 {canUseRescue
					? 'text-rose-400 animate-pulse'
					: 'text-slate-500'}"
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
	<div class="flex items-center gap-2.5 shrink-0 select-none">
		<!-- Authentic Warcraft III Circular Day/Night Clock Dial -->
		<div
			class="relative w-10 h-10 rounded-full border-2 border-[#8c7456] bg-[#0c1017] flex items-center justify-center shadow-lg overflow-hidden shrink-0 transition-colors duration-700 {isDay
				? 'shadow-amber-500/10'
				: 'shadow-indigo-500/20'}"
			title={dayPhase === 'day'
				? 'День (Сонце)'
				: dayPhase === 'dusk'
					? 'Сутінки (Захід сонця)'
					: dayPhase === 'night'
						? 'Ніч (Місяць)'
						: 'Світанок (Схід сонця)'}
			style="box-shadow: inset 0 0 6px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.6);"
			data-testid="day-night-dial"
			data-phase={dayPhase}
			data-cycle={isDay ? 'day' : 'night'}
		>
			<div
				class="absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-linear"
				style="transform: rotate({sunAngle}deg);"
			>
				{#if isDay}
					<Sun class="w-5 h-5 text-amber-400 transition-all duration-500" />
				{:else}
					<Moon class="w-5 h-5 text-indigo-300 transition-all duration-500" />
				{/if}
			</div>
		</div>

		<!-- Match Banner & Timer (Resistant to text wrapping or collapsing) -->
		<div
			class="flex flex-col items-center justify-center shrink-0 whitespace-nowrap min-w-[136px] text-center select-none"
			data-testid="match-status-banner"
		>
			<div
				class="text-[10px] uppercase tracking-wider text-[#d4af37] font-bold flex items-center justify-center gap-1.5 whitespace-nowrap"
			>
				<span class="whitespace-nowrap">
					Раунд {sim.round} • {sim.score.west} : {sim.score.east}
				</span>
				<span class="text-[9px] text-[#9ca3af] font-mono whitespace-nowrap">
					(до {sim.targetWins})
				</span>
				<span
					class="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-700/50 whitespace-nowrap"
					title="Формат: {sim.teamSize} на {sim.teamSize} ({sim.teamSize * 2} гравців)"
				>
					{sim.teamSize}v{sim.teamSize}
				</span>
			</div>
			<div
				class="text-xs font-mono font-bold text-slate-200 tracking-wider whitespace-nowrap leading-tight mt-0.5"
			>
				{formatTime(gameTime)}
			</div>
			{#if activeBossInstanceId}
				<div
					class="text-[9px] font-bold text-amber-400 animate-pulse whitespace-nowrap leading-tight"
				>
					👑 БОС НА АРЕНІ!
				</div>
			{:else}
				<div class="text-[9px] text-slate-400 font-mono whitespace-nowrap leading-tight">
					Бос: {bossSpawnTimer}с
				</div>
			{/if}
		</div>
	</div>

	<!-- 3. RIGHT: Controls, Resources Bar & Castle HP Meters -->
	<div class="flex items-center gap-2.5 2xl:gap-3.5 shrink-0">
		<!-- Play / Pause / Speed -->
		<div
			class="flex items-center bg-[#0c1017] p-0.5 rounded border border-[#544738] gap-1 shrink-0"
			data-testid="speed-controls"
		>
			<button
				onclick={() => {
					sim.isRunning = !sim.isRunning;
					sim.notifyStateChanged();
				}}
				class="p-1 rounded hover:bg-[#2a241b] text-slate-300 transition cursor-pointer shrink-0"
				title={isRunning ? 'Пауза (Пробіл)' : 'Продовжити (Пробіл)'}
				aria-label={isRunning ? 'Пауза (Пробіл)' : 'Продовжити (Пробіл)'}
				aria-keyshortcuts="Space"
			>
				{#if isRunning}
					<Pause class="w-3.5 h-3.5 text-amber-400" />
				{:else}
					<Play class="w-3.5 h-3.5 text-emerald-400" />
				{/if}
			</button>

			<div class="h-3.5 w-px bg-[#544738]/70"></div>

			<!-- Ergonomic Segmented Speed Selector -->
			<div class="flex items-center gap-0.5 shrink-0">
				{#each availableSpeeds as sp}
					<button
						onclick={() => {
							sim.speed = sp;
							sim.notifyStateChanged();
						}}
						class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer {simSpeed ===
						sp
							? 'bg-amber-500/25 text-amber-300 border border-amber-500/60 shadow-sm shadow-amber-500/20'
							: sp >= 10
								? 'text-cyan-400/80 hover:text-cyan-200 hover:bg-[#2a241b] text-[9px] px-1'
								: 'text-slate-400 hover:text-slate-200 hover:bg-[#2a241b]'}"
						title={sp >= 10 ? `DEV турбо швидкість x${sp}` : `Швидкість гри x${sp}`}
						aria-label={sp >= 10 ? `DEV турбо швидкість x${sp}` : `Швидкість гри x${sp}`}
					>
						{sp >= 10 ? `x${sp}` : `${sp}x`}
					</button>
				{/each}
			</div>
		</div>

		<!-- Sound & Fullscreen controls -->
		<div
			class="flex items-center gap-0.5 shrink-0 bg-[#0c1017] p-0.5 rounded border border-[#544738]"
		>
			<!-- Sound toggle -->
			<button
				type="button"
				onclick={() => settings.setSound(!settings.sound)}
				class="p-1 rounded hover:bg-[#2a241b] text-slate-300 transition cursor-pointer shrink-0"
				title={settings.sound ? 'Звук: Увімкнено' : 'Звук: Вимкнено'}
				aria-label={settings.sound ? 'Звук: Увімкнено' : 'Звук: Вимкнено'}
				data-testid="topbar-sound-toggle"
			>
				{#if settings.sound}
					<Volume2 class="w-3.5 h-3.5 text-emerald-400" />
				{:else}
					<VolumeX class="w-3.5 h-3.5 text-slate-500" />
				{/if}
			</button>

			{#if canFullscreen()}
				<button
					type="button"
					onclick={() => fullscreen.toggle()}
					class="p-1 rounded hover:bg-[#2a241b] text-slate-300 transition cursor-pointer shrink-0"
					title="Повноекранний режим"
					aria-label="Повноекранний режим"
					data-testid="topbar-fullscreen-toggle"
				>
					{#if fullscreen.active}
						<Minimize2 class="w-3.5 h-3.5 text-amber-400" />
					{:else}
						<Maximize2 class="w-3.5 h-3.5 text-slate-400" />
					{/if}
				</button>
			{/if}

			<!-- Locale toggle -->
			<button
				type="button"
				onclick={() => settings.setLocale(settings.locale === 'uk' ? 'en' : 'uk')}
				class="px-1.5 py-0.5 rounded hover:bg-[#2a241b] transition cursor-pointer shrink-0 text-[10px] font-bold font-mono text-cyan-300"
				title={settings.locale === 'uk' ? 'Switch to English' : 'Перемкнути на українську'}
				aria-label={settings.locale === 'uk' ? 'Switch to English' : 'Перемкнути на українську'}
				data-testid="topbar-locale-toggle"
			>
				{settings.locale === 'uk' ? 'UA' : 'EN'}
			</button>

			<!-- Settings modal button -->
			<button
				type="button"
				onclick={() => settings.openSettings()}
				class="p-1 rounded hover:bg-[#2a241b] text-amber-300 transition cursor-pointer shrink-0"
				title="Налаштування гри"
				aria-label="Налаштування гри"
				data-testid="topbar-settings-btn"
			>
				<Sliders class="w-3.5 h-3.5" />
			</button>
		</div>

		<!-- Authentic WC3 Resource Boxes -->
		<div
			class="flex items-center gap-2.5 2xl:gap-3 bg-[#0c1017] px-2.5 2xl:px-3 py-1 rounded-md border border-[#544738] shadow-inner shrink-0"
			data-testid="resource-boxes"
		>
			<!-- 🪙 Gold -->
			<div class="flex items-center gap-1 font-bold text-amber-400 shrink-0" title="Золото гравця">
				<Coins class="w-4 h-4 text-amber-400 shrink-0" />
				<span class="text-sm font-mono tracking-tight">{playerGold}</span>
			</div>

			<!-- 💰 Gold Income -->
			<div
				class="flex items-center gap-1 text-xs text-amber-300 border-l border-[#3b3226] pl-2 shrink-0"
				title="Періодичний дохід золота: +{westIncome} кожні {sim.incomeInterval}с"
			>
				<span class="font-mono font-bold text-amber-400">+{westIncome}</span>
				<!-- Income progress bar -->
				<div
					class="w-10 xl:w-12 h-1.5 bg-[#1e2433] rounded-full overflow-hidden border border-[#3b3226]"
				>
					<div
						class="h-full bg-amber-400 transition-all duration-75"
						style="width: {incomePct}%"
					></div>
				</div>
				<span class="text-[9px] text-amber-400/90 font-mono">{incomeTimer}с</span>
			</div>

			<!-- 🌲 Lumber (Wood) Reserve -->
			<div
				class="flex items-center gap-1 text-xs {westLumber > 0
					? 'text-emerald-300'
					: 'text-slate-500'} border-l border-[#3b3226] pl-2 shrink-0"
				title="Запас деревини для вдосконалення технологій та будівель вищого тиру"
			>
				<TreePine
					class="w-3.5 h-3.5 shrink-0 {westLumber > 0 ? 'text-emerald-400' : 'text-slate-500'}"
				/>
				<span class="font-mono font-bold">{westLumber}</span>
			</div>

			<!-- 🥩 Food Cap (Legendary Building Limit) -->
			<div
				class="flex items-center gap-1 text-xs border-l border-[#3b3226] pl-2 shrink-0 {player.maxFood >
				0
					? 'text-amber-300'
					: 'text-slate-500'}"
				title="Ліміт легендарних будівель (Їжа): {player.food}/{player.maxFood}. Збільшуйте ліміт у магазині замку (B)!"
			>
				<Crown
					class="w-3.5 h-3.5 shrink-0 {player.maxFood > 0 ? 'text-amber-400' : 'text-slate-500'}"
				/>
				<span class="font-mono font-bold">{player.food}/{player.maxFood}</span>
			</div>
		</div>

		<!-- Castles HP Meters -->
		<div class="flex items-center gap-2 2xl:gap-3 shrink-0" data-testid="castle-hp-meters">
			<!-- West Castle HP (Player) -->
			<div
				class="w-24 xl:w-28 2xl:w-32 shrink-0"
				role="meter"
				aria-label="Здоров'я Західного Замку (Гравець)"
				aria-valuenow={westHp}
				aria-valuemin={0}
				aria-valuemax={westMaxHp}
				title="Західний Замок (Гравець): {westHp} / {westMaxHp}"
			>
				<div
					class="flex justify-between items-center text-[10px] font-bold mb-0.5 whitespace-nowrap gap-1"
				>
					<span class="text-blue-400 flex items-center gap-0.5">
						<Shield class="w-3 h-3 text-blue-400 shrink-0" />
						Ваш Замок
					</span>
					<span class="text-slate-300 font-mono text-[9px]">{westHp}</span>
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
				class="w-24 xl:w-28 2xl:w-32 shrink-0"
				role="meter"
				aria-label="Здоров'я Східного Замку (Ворог)"
				aria-valuenow={eastHp}
				aria-valuemin={0}
				aria-valuemax={eastMaxHp}
				title="Східний Замок ({sim.players.east.race} Бот): {eastHp} / {eastMaxHp}"
			>
				<div
					class="flex justify-between items-center text-[10px] font-bold mb-0.5 whitespace-nowrap gap-1"
				>
					<span class="text-slate-300 font-mono text-[9px]">{eastHp}</span>
					<span class="text-rose-400 flex items-center gap-0.5">
						Замок Ворога
						<Shield class="w-3 h-3 text-rose-400 shrink-0" />
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
