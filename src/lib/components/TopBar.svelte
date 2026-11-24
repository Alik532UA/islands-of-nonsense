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
		isOnline = false,
		onOpenForge,
		onOpenCommander,
		onOpenShop,
		onOpenSettings,
		onBeforeLeave
	}: {
		sim: Simulation;
		uiTick?: number;
		isOnline?: boolean;
		onOpenForge: () => void;
		onOpenCommander: () => void;
		onOpenShop?: () => void;
		onOpenSettings?: () => void;
		onBeforeLeave?: (targetUrl: string) => boolean;
	} = $props();

	let isBotVsBot = $derived.by(() => {
		if (isOnline) return false;
		if (sim.config.botVsBot) return true;
		if (sim.allPlayers?.length) {
			return sim.allPlayers.every((p) => p.isBot);
		}
		return Boolean(sim.players.west.isBot && sim.players.east.isBot);
	});

	// Explicitly depend on uiTick so Svelte 5 re-reads properties from the class instance
	let westCastle = $derived(uiTick >= 0 ? sim.castles.west : sim.castles.west);
	let eastCastle = $derived(uiTick >= 0 ? sim.castles.east : sim.castles.east);
	let player = $derived(uiTick >= 0 ? sim.players.west : sim.players.west);
	let playerGold = $derived(uiTick >= 0 ? Math.floor(sim.players.west.gold) : 0);
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

	const availableSpeeds = [1, 2, 3, 5, 10, 50, 100];
	let raceSkillCd = $derived(uiTick >= 0 ? sim.raceSkillCooldown.west : 0);
	let raceSkillUnlockLeft = $derived(
		uiTick >= 0 ? Math.max(0, 300 - Math.floor(sim.gameTime)) : 300
	);

	let canUseRescue = $derived(uiTick >= 0 ? sim.canUseRescueStrike('west') : false);
	let rescueCd = $derived(uiTick >= 0 ? sim.rescueStrikeCooldown.west : 0);

	let gameTime = $derived(uiTick >= 0 ? sim.gameTime : 0);
	let bossSpawnTimer = $derived(uiTick >= 0 ? Math.max(0, Math.ceil(sim.bossSpawnTimer)) : 180);
	let activeBossInstanceId = $derived(uiTick >= 0 ? sim.activeBossInstanceId : null);
	let isRunning = $derived(uiTick >= 0 ? sim.isRunning : false);
	let simSpeed = $derived(uiTick >= 0 ? sim.speed : 1);
	let westLumber = $derived(uiTick >= 0 ? Math.floor(sim.players.west.lumber) : 0);

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
	class="bg-[#11141c] border-b-2 border-[#544738] px-2.5 sm:px-4 py-1.5 shadow-2xl flex items-center justify-between text-white select-none backdrop-blur z-20 h-14 min-w-0 overflow-visible"
	style="background: linear-gradient(180deg, #1b202c 0%, #0d1017 100%); box-shadow: 0 4px 16px rgba(0,0,0,0.8);"
>
	<!-- 1. LEFT: Nav & Menu Buttons (Назад, Додому, Довідник F9, Меню, Кузня, Магазин, Здібності) -->
	<div class="flex items-center gap-1.5 shrink-0">
		<!-- Back to Modes -->
		<div class="relative group/tip flex items-center">
			<a
				href={resolve('/play')}
				onclick={(e) => {
					if (onBeforeLeave && !onBeforeLeave(resolve('/play'))) {
						e.preventDefault();
					}
				}}
				class="flex items-center justify-center p-2 bg-[#181d28] hover:bg-[#252d3d] border border-slate-700 hover:border-amber-500/60 rounded text-xs font-semibold text-slate-300 hover:text-amber-300 transition cursor-pointer active:scale-95 shadow shrink-0 min-h-[36px] min-w-[36px] [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px] touch-manipulation"
				aria-label="Назад до вибору режимів"
				data-testid="topbar-back-link"
			>
				<ArrowLeft class="w-3.5 h-3.5" />
			</a>
			<div
				class="absolute top-full left-0 mt-1.5 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap bg-[#0f141f]/95 border border-[#544738] px-2.5 py-1 rounded shadow-2xl text-[11px] text-amber-100 flex items-center gap-1.5"
			>
				<span>Назад до вибору режимів</span>
			</div>
		</div>

		<!-- Main Menu (Home) -->
		<div class="relative group/tip flex items-center">
			<a
				href={resolve('/')}
				onclick={(e) => {
					if (onBeforeLeave && !onBeforeLeave(resolve('/'))) {
						e.preventDefault();
					}
				}}
				class="flex items-center justify-center p-2 bg-[#181d28] hover:bg-[#252d3d] border border-slate-700 hover:border-amber-500/60 rounded text-xs font-semibold text-slate-300 hover:text-amber-300 transition cursor-pointer active:scale-95 shadow shrink-0 min-h-[36px] min-w-[36px] [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px] touch-manipulation"
				aria-label="Головне меню"
				data-testid="topbar-home-link"
			>
				<House class="w-3.5 h-3.5" />
			</a>
			<div
				class="absolute top-full left-0 mt-1.5 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap bg-[#0f141f]/95 border border-[#544738] px-2.5 py-1 rounded shadow-2xl text-[11px] text-amber-100 flex items-center gap-1.5"
			>
				<span>Головне меню</span>
			</div>
		</div>

		<div class="h-4 w-px bg-[#544738]/70 mx-0.5"></div>

		<!-- Guide / Manual (F9) -->
		<div class="relative group/tip flex items-center">
			<button
				onclick={onOpenCommander}
				data-testid="hud-commander-btn"
				class="relative flex items-center justify-center bg-[#251e16] hover:bg-[#382d21] border border-[#8c7456] p-2 min-h-[36px] min-w-[36px] [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px] rounded text-xs font-semibold text-[#fef08a] transition cursor-pointer active:scale-95 shadow shrink-0 touch-manipulation"
				aria-label="Довідник гри та командир: {commander.name} ({commander.nickname})"
				aria-keyshortcuts="F9"
			>
				<BookOpen class="w-3.5 h-3.5 text-amber-400 shrink-0" />
			</button>
			<div
				class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap bg-[#0f141f]/95 border border-[#544738] px-2.5 py-1 rounded shadow-2xl text-[11px] text-amber-100 flex items-center gap-1.5"
			>
				<span>Довідник гри ({commander.name})</span>
				<span
					class="text-[9px] font-mono font-bold text-amber-400 bg-black/60 px-1 rounded border border-[#544738]"
				>
					F9
				</span>
			</div>
		</div>

		<!-- Game Settings Menu -->
		<div class="relative group/tip flex items-center">
			<button
				onclick={onOpenSettings}
				data-testid="hud-menu-btn"
				class="flex items-center justify-center bg-[#251e16] hover:bg-[#382d21] border border-[#8c7456] p-2 min-h-[36px] min-w-[36px] [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px] rounded text-xs font-semibold text-[#fef08a] transition cursor-pointer active:scale-95 shadow shrink-0 touch-manipulation"
				aria-label="Меню налаштувань матчу"
			>
				<Sliders class="w-3.5 h-3.5 text-amber-400 shrink-0" />
			</button>
			<div
				class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap bg-[#0f141f]/95 border border-[#544738] px-2.5 py-1 rounded shadow-2xl text-[11px] text-amber-100 flex items-center gap-1.5"
			>
				<span>Меню налаштувань</span>
				<span
					class="text-[9px] font-mono font-bold text-amber-400 bg-black/60 px-1 rounded border border-[#544738]"
				>
					Esc
				</span>
			</div>
		</div>

		<!-- War Forge (F) -->
		<div class="relative group/tip flex items-center">
			<button
				onclick={onOpenForge}
				data-testid="hud-forge-btn"
				class="relative flex items-center justify-center bg-[#2a241b] hover:bg-[#3d3427] border border-[#8c7456] p-2 min-h-[36px] min-w-[36px] [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px] rounded text-xs font-semibold text-amber-200 transition cursor-pointer active:scale-95 shadow shrink-0 touch-manipulation"
				aria-label="Військова Кузня (Гаряча клавіша: F)"
				aria-keyshortcuts="f"
			>
				<Hammer class="w-3.5 h-3.5 text-amber-400 shrink-0" />
				{#if player.forge.attack + player.forge.armor + player.forge.econ > 0}
					<span
						class="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[9px] w-4 h-4 rounded-full font-bold flex items-center justify-center leading-none"
					>
						{player.forge.attack + player.forge.armor + player.forge.econ}
					</span>
				{/if}
			</button>
			<div
				class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap bg-[#0f141f]/95 border border-[#544738] px-2.5 py-1 rounded shadow-2xl text-[11px] text-amber-100 flex items-center gap-1.5"
			>
				<span>Військова Кузня</span>
				<span
					class="text-[9px] font-mono font-bold text-amber-400 bg-black/60 px-1 rounded border border-[#544738]"
				>
					F
				</span>
			</div>
		</div>

		<!-- Castle Shop (B) -->
		<div class="relative group/tip flex items-center">
			<button
				onclick={onOpenShop}
				data-testid="hud-shop-btn"
				class="flex items-center justify-center bg-[#172e21] hover:bg-[#1e3d2c] border border-emerald-600/70 p-2 min-h-[36px] min-w-[36px] [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px] rounded text-xs font-semibold text-emerald-200 transition cursor-pointer active:scale-95 shadow shrink-0 touch-manipulation"
				aria-label="Магазин замку: припаси та захист (Гаряча клавіша: B)"
				aria-keyshortcuts="b"
			>
				<ShoppingBag class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
			</button>
			<div
				class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap bg-[#0f141f]/95 border border-[#544738] px-2.5 py-1 rounded shadow-2xl text-[11px] text-emerald-200 flex items-center gap-1.5"
			>
				<span>Магазин замку</span>
				<span
					class="text-[9px] font-mono font-bold text-emerald-300 bg-black/60 px-1 rounded border border-emerald-600/70"
				>
					B
				</span>
			</div>
		</div>

		<div class="h-5 w-[1px] bg-[#3b3226] mx-0.5 shrink-0"></div>

		<!-- Race Ability Quick Button (R) -->
		<div class="relative group/tip flex items-center">
			<button
				onclick={() => {
					if (canCastRaceSkill) sim.useRaceSkill('west');
				}}
				disabled={!canCastRaceSkill}
				data-testid="hud-race-ability-btn"
				class="relative flex items-center justify-center p-2 min-h-[36px] min-w-[36px] [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px] rounded text-xs font-semibold transition cursor-pointer shrink-0 touch-manipulation {canCastRaceSkill
					? 'bg-purple-900/90 hover:bg-purple-800 border border-purple-400 text-purple-100 ring-2 ring-purple-400/50 animate-pulse'
					: 'bg-[#181d28] border border-slate-700 text-slate-500 cursor-not-allowed opacity-60'}"
				aria-label="{raceAbility.nameUk}: {raceAbility.descriptionUk} (Гаряча клавіша: R)"
				aria-keyshortcuts="r"
			>
				<Sparkles
					class="w-3.5 h-3.5 shrink-0 {canCastRaceSkill ? 'text-purple-300' : 'text-slate-500'}"
				/>
				{#if raceSkillUnlockLeft > 0}
					<span
						class="absolute -bottom-1 -right-1 text-[8px] font-mono bg-black/80 px-0.5 rounded text-slate-400 leading-none"
					>
						{raceSkillUnlockLeft}с
					</span>
				{:else if raceSkillCd > 0}
					<span
						class="absolute -bottom-1 -right-1 text-[8px] font-mono bg-black/80 px-0.5 rounded text-amber-400 font-bold leading-none"
					>
						{Math.ceil(raceSkillCd)}с
					</span>
				{/if}
			</button>
			<div
				class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap bg-[#0f141f]/95 border border-[#544738] px-2.5 py-1 rounded shadow-2xl text-[11px] text-purple-200 flex items-center gap-1.5"
			>
				<span>{raceAbility.nameUk}</span>
				<span
					class="text-[9px] font-mono font-bold text-purple-300 bg-black/60 px-1 rounded border border-purple-500/60"
				>
					R
				</span>
			</div>
		</div>

		<!-- Rescue Strike Quick Button (E) -->
		<div class="relative group/tip flex items-center">
			<button
				onclick={() => {
					if (canUseRescue) sim.triggerRescueStrike('west');
				}}
				disabled={!canUseRescue}
				data-testid="hud-rescue-strike-btn"
				class="relative flex items-center justify-center p-2 min-h-[36px] min-w-[36px] [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px] rounded text-xs font-semibold transition cursor-pointer shrink-0 touch-manipulation {canUseRescue
					? 'bg-rose-950/90 hover:bg-rose-900 border border-rose-500 text-rose-100 ring-2 ring-rose-500/50'
					: 'bg-[#181d28] border border-slate-700 text-slate-500 cursor-not-allowed opacity-60'}"
				aria-label="Рятівний Удар навколо замку (-950 шкоди, Гаряча клавіша: E)"
				aria-keyshortcuts="e"
			>
				<Flame
					class="w-3.5 h-3.5 shrink-0 {canUseRescue
						? 'text-rose-400 animate-pulse'
						: 'text-slate-500'}"
				/>
				{#if rescueCd > 0}
					<span
						class="absolute -bottom-1 -right-1 text-[8px] font-mono bg-black/80 px-0.5 rounded text-amber-400 font-bold leading-none"
					>
						{Math.ceil(rescueCd)}с
					</span>
				{/if}
			</button>
			<div
				class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap bg-[#0f141f]/95 border border-[#544738] px-2.5 py-1 rounded shadow-2xl text-[11px] text-rose-200 flex items-center gap-1.5"
			>
				<span>Рятівний удар</span>
				<span
					class="text-[9px] font-mono font-bold text-rose-300 bg-black/60 px-1 rounded border border-rose-500/60"
				>
					E
				</span>
			</div>
		</div>
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
					class="text-[9px] font-bold text-amber-400 animate-pulse whitespace-nowrap leading-tight flex items-center justify-center gap-1"
				>
					<Crown class="w-3 h-3 text-amber-400 shrink-0 inline" />
					<span>БОС НА АРЕНІ!</span>
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
		<!-- Play / Pause / Speed (Singleplayer & Spectator only) -->
		{#if !isOnline}
			<div
				class="flex items-center bg-[#0c1017] p-0.5 rounded border border-[#544738] gap-1 shrink-0"
				data-testid="speed-controls"
			>
				<button
					onclick={() => {
						sim.isRunning = !sim.isRunning;
						sim.notifyStateChanged();
					}}
					data-testid="topbar-pause-btn"
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

				<!-- Single Speed Button with Dropdown on Hover -->
				<div class="relative group/speed flex items-center">
					<button
						type="button"
						class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer flex items-center gap-1 bg-[#181d28] hover:bg-[#252d3d] border border-amber-500/50 text-amber-300 shadow-sm"
						title="Швидкість гри: {simSpeed}x (наведіть для вибору)"
						aria-label="Швидкість гри: {simSpeed}x"
					>
						<span>{simSpeed >= 10 ? `x${simSpeed}` : `${simSpeed}x`}</span>
						<span class="text-[8px] text-amber-400/80">▾</span>
					</button>

					<!-- Dropdown options panel below on hover -->
					<div
						class="absolute top-full right-0 mt-1 pt-1 opacity-0 pointer-events-none group-hover/speed:opacity-100 group-hover/speed:pointer-events-auto transition-opacity duration-150 z-50"
					>
						<div
							class="flex flex-col gap-0.5 bg-[#0f131c] border border-[#544738] rounded-lg p-1 shadow-2xl backdrop-blur-md min-w-[76px]"
						>
							{#each availableSpeeds as sp}
								<button
									onclick={() => {
										sim.speed = sp;
										sim.notifyStateChanged();
									}}
									data-testid="topbar-speed-btn-{sp}"
									class="px-2 py-1 rounded text-[10px] font-mono font-bold transition flex items-center justify-between cursor-pointer {simSpeed ===
									sp
										? 'bg-amber-500/25 text-amber-300 border border-amber-500/60 font-black'
										: sp >= 10
											? 'text-cyan-400 hover:text-cyan-200 hover:bg-[#1f2637]'
											: 'text-slate-300 hover:text-white hover:bg-[#1f2637]'}"
									title={sp >= 10 ? `Турбо швидкість x${sp}` : `Швидкість гри x${sp}`}
									aria-label={sp >= 10 ? `Турбо швидкість x${sp}` : `Швидкість гри x${sp}`}
								>
									<span>{sp >= 10 ? `x${sp}` : `${sp}x`}</span>
									{#if simSpeed === sp}
										<span class="text-[9px] text-amber-400">✓</span>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				</div>
			</div>
		{/if}

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
			<!-- Gold -->
			<div class="flex items-center gap-1 font-bold text-amber-400 shrink-0" title="Золото гравця">
				<Coins class="w-4 h-4 text-amber-400 shrink-0" />
				<span class="text-sm font-mono tracking-tight">{playerGold}</span>
			</div>

			<!-- Lumber (Wood) Reserve -->
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

			<!-- Food Cap (Legendary Building Limit) -->
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

		<!-- Castles HP Meters (Shown only in bot-vs-bot spectator mode without human players) -->
		{#if isBotVsBot}
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
		{/if}
	</div>
</header>
