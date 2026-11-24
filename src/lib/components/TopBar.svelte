<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import type { Simulation } from '../engine/simulation';
	import type { PlayerState } from '../engine/types';
	import { findCommander } from '../engine/commanders';
	import { getRaceAbility } from '../engine/raceAbilities';
	import { toPlayableRace } from '../engine/gameData';
	import { BATTLE_COMMAND_ROUTER_KEY, type BattleCommandRouter } from '$lib/net/onlineMatchSetup';
	import { resolve } from '$app/paths';
	import { settings } from '$lib/services/settings.svelte';
	import { fullscreen, canFullscreen } from '$lib/services/fullscreen.svelte';
	import { createHoverMenu, hoverMenuContainer } from '$lib/ui/hoverMenu.svelte';
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
		Menu,
		Settings,
		TreePine,
		Sun,
		Moon
	} from 'lucide-svelte';

	let {
		sim,
		uiTick = 0,
		isOnline = false,
		activePlayer = null,
		onOpenForge,
		onOpenCommander,
		onOpenGuide,
		onOpenShop,
		onOpenSettings,
		onBeforeLeave
	}: {
		sim: Simulation;
		uiTick?: number;
		isOnline?: boolean;
		activePlayer?: PlayerState | null;
		onOpenForge: () => void;
		onOpenCommander: () => void;
		onOpenGuide?: () => void;
		onOpenShop?: () => void;
		onOpenSettings?: () => void;
		onBeforeLeave?: (targetUrl: string) => boolean;
	} = $props();

	const routeBattleCommand = getContext<BattleCommandRouter | undefined>(BATTLE_COMMAND_ROUTER_KEY);

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
	let player = $derived(uiTick >= 0 ? (activePlayer ?? sim.players.west) : sim.players.west);
	let playerGold = $derived(uiTick >= 0 ? Math.floor(player.gold) : 0);
	let periodicGold = $derived(
		uiTick >= 0 ? sim.economySystem.calculateIncome(player.team, player) : 3
	);
	let incomeEvery = $derived(uiTick >= 0 ? Math.round(sim.incomeInterval) : 5);
	let incomeIn = $derived(uiTick >= 0 ? Math.max(0, Math.ceil(sim.incomeTimer)) : 5);
	let commander = $derived(uiTick >= 0 ? findCommander(player.commander) : null);
	let commanderStatus = $derived(
		uiTick >= 0
			? sim.canSelectOrChangeCommander(player.team, player)
			: sim.canSelectOrChangeCommander(player.team, player)
	);

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

	let raceAbility = $derived(uiTick >= 0 ? getRaceAbility(player.race) : getRaceAbility('Альянс'));
	let canCastRaceSkill = $derived(uiTick >= 0 ? sim.canUseRaceSkill(player.team) : false);

	const availableSpeeds = [1, 2, 3, 5, 10, 50, 100];
	let raceSkillCd = $derived(uiTick >= 0 ? sim.raceSkillCooldown[player.team] : 0);
	let raceSkillUnlockLeft = $derived(
		uiTick >= 0 ? Math.max(0, 300 - Math.floor(sim.gameTime)) : 300
	);

	let canUseRescue = $derived(uiTick >= 0 ? sim.canUseRescueStrike(player.team, player) : false);
	let rescueCd = $derived(uiTick >= 0 ? sim.getRescueStrikeCooldown(player.team, player) : 0);

	let gameTime = $derived(uiTick >= 0 ? sim.gameTime : 0);
	let bossSpawnTimer = $derived(uiTick >= 0 ? Math.max(0, Math.ceil(sim.bossSpawnTimer)) : 180);
	let activeBossInstanceId = $derived(uiTick >= 0 ? sim.activeBossInstanceId : null);
	let isRunning = $derived(uiTick >= 0 ? sim.isRunning : false);
	let simSpeed = $derived(uiTick >= 0 ? sim.speed : 1);
	let westLumber = $derived(uiTick >= 0 ? Math.floor(player.lumber ?? 0) : 0);

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

	const dockClass =
		'bg-[#131722]/95 backdrop-blur-md rounded-b-xl rounded-t-none border-b-2 border-x-2 border-t-0 border-[#544738] px-2 py-1.5 shadow-2xl pointer-events-auto flex items-center gap-1.5 shrink-0';

	const baseBtnClass =
		'relative flex items-center justify-center w-9 h-9 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] rounded-lg border text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-95 shadow-sm shrink-0 touch-manipulation';

	const neutralBtnClass = `${baseBtnClass} bg-[#181d28] hover:bg-[#242c3d] border-[#3b3226] hover:border-amber-500/70 text-slate-200 hover:text-amber-300`;

	const speedMenu = createHoverMenu({ closeDelayMs: 300 });
</script>

<!-- Floating Modular Top HUD Docks (Mirrors BottomBar modular architecture) -->
<header
	class="absolute top-0 left-0 right-0 px-2.5 sm:px-3 flex flex-wrap xl:flex-nowrap items-start justify-between gap-2 text-white select-none z-30 pointer-events-none min-w-0 overflow-visible"
	style:z-index={speedMenu.isOpen ? speedMenu.zIndex : undefined}
	data-testid="top-bar"
>
	<!-- 1. LEFT: System, Navigation & Settings Containers -->
	<div class="flex items-start gap-2 shrink-0 pointer-events-none">
		<!-- Dock 1A: Navigation & Match Info (Back, Home, Guide F9, Match Menu Esc) -->
		<div class={dockClass} data-testid="topbar-system-nav-dock">
			<!-- Back to Modes -->
			<div class="relative group/tip flex items-center">
				<a
					href={resolve('/play')}
					onclick={(e) => {
						if (onBeforeLeave && !onBeforeLeave(resolve('/play'))) {
							e.preventDefault();
						}
					}}
					class={neutralBtnClass}
					aria-label="Назад до вибору режимів"
					data-testid="topbar-back-link"
				>
					<ArrowLeft class="w-4 h-4" />
				</a>
				<div
					class="absolute top-full left-0 mt-2 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap bg-[#0f141f]/95 border border-[#544738] px-2.5 py-1 rounded-md shadow-2xl text-[11px] text-amber-100 flex items-center gap-1.5"
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
					class={neutralBtnClass}
					aria-label="Головне меню"
					data-testid="topbar-home-link"
				>
					<House class="w-4 h-4" />
				</a>
				<div
					class="absolute top-full left-0 mt-2 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap bg-[#0f141f]/95 border border-[#544738] px-2.5 py-1 rounded-md shadow-2xl text-[11px] text-amber-100 flex items-center gap-1.5"
				>
					<span>Головне меню</span>
				</div>
			</div>

			<!-- Pure Reference Guide / Manual (F9) -->
			<div class="relative group/tip flex items-center">
				<button
					onclick={() => onOpenGuide?.()}
					data-testid="hud-guide-btn"
					class={neutralBtnClass}
					aria-label="Довідник гри: правила, економіка та гарячі клавіші (F9)"
					aria-keyshortcuts="F9"
				>
					<BookOpen class="w-4 h-4 text-amber-400 shrink-0" />
				</button>
				<div
					class="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap bg-[#0f141f]/95 border border-[#544738] px-2.5 py-1 rounded-md shadow-2xl text-[11px] text-amber-100 flex items-center gap-1.5"
				>
					<span>Довідник гри</span>
					<span
						class="text-[9px] font-mono font-bold text-amber-400 bg-black/60 px-1 rounded border border-[#544738]"
					>
						F9
					</span>
				</div>
			</div>

			<!-- Match Menu (Esc) -->
			<div class="relative group/tip flex items-center">
				<button
					onclick={onOpenSettings}
					data-testid="hud-menu-btn"
					class={neutralBtnClass}
					aria-label="Меню налаштувань матчу"
				>
					<Menu class="w-4 h-4 text-amber-300 shrink-0" />
				</button>
				<div
					class="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap bg-[#0f141f]/95 border border-[#544738] px-2.5 py-1 rounded-md shadow-2xl text-[11px] text-amber-100 flex items-center gap-1.5"
				>
					<span>Меню матчу</span>
					<span
						class="text-[9px] font-mono font-bold text-amber-400 bg-black/60 px-1 rounded border border-[#544738]"
					>
						Esc
					</span>
				</div>
			</div>
		</div>

		<!-- Dock 1B: System Preferences (Sound, Fullscreen, Locale, Global Settings) -->
		<div class={dockClass} data-testid="topbar-preferences-dock">
			<!-- Sound toggle -->
			<div class="relative group/tip flex items-center">
				<button
					type="button"
					onclick={() => settings.setSound(!settings.sound)}
					class={neutralBtnClass}
					aria-label={settings.sound ? 'Звук: Увімкнено' : 'Звук: Вимкнено'}
					data-testid="topbar-sound-toggle"
				>
					{#if settings.sound}
						<Volume2 class="w-4 h-4 text-emerald-400" />
					{:else}
						<VolumeX class="w-4 h-4 text-slate-500" />
					{/if}
				</button>
				<div
					class="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap bg-[#0f141f]/95 border border-[#544738] px-2.5 py-1 rounded-md shadow-2xl text-[11px] text-amber-100"
				>
					{settings.sound ? 'Звук: Увімкнено' : 'Звук: Вимкнено'}
				</div>
			</div>

			{#if canFullscreen()}
				<div class="relative group/tip flex items-center">
					<button
						type="button"
						onclick={() => fullscreen.toggle()}
						class={neutralBtnClass}
						aria-label="Повноекранний режим"
						data-testid="topbar-fullscreen-toggle"
					>
						{#if fullscreen.active}
							<Minimize2 class="w-4 h-4 text-amber-400" />
						{:else}
							<Maximize2 class="w-4 h-4 text-slate-300" />
						{/if}
					</button>
					<div
						class="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap bg-[#0f141f]/95 border border-[#544738] px-2.5 py-1 rounded-md shadow-2xl text-[11px] text-amber-100"
					>
						{fullscreen.active ? 'Вийти з повного екрана' : 'Повноекранний режим'}
					</div>
				</div>
			{/if}

			<!-- Locale toggle -->
			<div class="relative group/tip flex items-center">
				<button
					type="button"
					onclick={() => settings.setLocale(settings.locale === 'uk' ? 'en' : 'uk')}
					class="{neutralBtnClass} font-mono font-bold text-cyan-300"
					aria-label={settings.locale === 'uk' ? 'Switch to English' : 'Перемкнути на українську'}
					data-testid="topbar-locale-toggle"
				>
					{settings.locale === 'uk' ? 'UA' : 'EN'}
				</button>
				<div
					class="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap bg-[#0f141f]/95 border border-[#544738] px-2.5 py-1 rounded-md shadow-2xl text-[11px] text-cyan-200"
				>
					{settings.locale === 'uk' ? 'Мова: Українська (EN)' : 'Language: English (UA)'}
				</div>
			</div>

			<!-- Global Settings Modal button -->
			<div class="relative group/tip flex items-center">
				<button
					type="button"
					onclick={() => settings.openSettings()}
					class={neutralBtnClass}
					aria-label="Загальні налаштування"
					data-testid="topbar-settings-btn"
				>
					<Settings class="w-4 h-4 text-amber-300" />
				</button>
				<div
					class="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap bg-[#0f141f]/95 border border-[#544738] px-2.5 py-1 rounded-md shadow-2xl text-[11px] text-amber-100"
				>
					Загальні налаштування
				</div>
			</div>
		</div>
	</div>

	<!-- 2. CENTER: Warcraft III Day/Night Dial, Match Clock & Stylish Scoreboard -->
	<div
		class="bg-[#131722]/95 backdrop-blur-md rounded-b-xl rounded-t-none border-b-2 border-x-2 border-t-0 border-[#544738] px-3 py-1.5 shadow-2xl pointer-events-auto flex items-center gap-2.5 shrink-0 select-none"
		data-testid="topbar-match-dock"
	>
		<!-- Authentic Warcraft III Circular Day/Night Clock Dial + Match Timer -->
		<div class="flex items-center gap-2 h-9 shrink-0">
			<div
				class="relative w-8 h-8 rounded-full border-2 border-[#8c7456] bg-[#0c1017] flex items-center justify-center shadow-lg overflow-hidden shrink-0 transition-colors duration-700 {isDay
					? 'shadow-amber-500/15'
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
						<Sun class="w-4 h-4 text-amber-400 transition-all duration-500" />
					{:else}
						<Moon class="w-4 h-4 text-indigo-300 transition-all duration-500" />
					{/if}
				</div>
			</div>

			<span
				class="text-sm font-mono font-bold text-slate-100 tracking-wide tabular-nums whitespace-nowrap"
				title="Час поточного раунду"
			>
				{formatTime(gameTime)}
			</span>
		</div>

		<div class="h-5 w-px bg-[#544738]/60 shrink-0"></div>

		<!-- Match Scoreboard Pills (Clean visual separation of Round, Team Score, Target, Format) -->
		<div
			class="flex items-center gap-1.5 h-9 shrink-0 whitespace-nowrap select-none"
			data-testid="match-status-banner"
		>
			<!-- Round Pill -->
			<div
				class="flex items-center gap-1 px-2 h-7 rounded-lg bg-[#181d28] border border-[#3b3226]"
				title="Поточний раунд матчу"
			>
				<span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Раунд</span>
				<span class="text-xs font-mono font-black text-amber-300">{sim.round}</span>
			</div>

			<!-- Series Score Pill (West vs East + Target Wins) -->
			<div
				class="flex items-center gap-1.5 px-2.5 h-7 rounded-lg bg-[#0a0d14] border border-[#544738]/80 shadow-inner"
				title="Рахунок серії (до {sim.targetWins} перемог)"
			>
				<span class="text-xs font-mono font-black text-sky-400">{sim.score.west}</span>
				<span class="text-[10px] font-bold text-slate-500">:</span>
				<span class="text-xs font-mono font-black text-rose-400">{sim.score.east}</span>
				<span class="h-3 w-px bg-[#3b3226] mx-0.5"></span>
				<span class="text-[10px] font-medium text-slate-400">до {sim.targetWins}</span>
			</div>

			<!-- Team Size Format Badge -->
			<span
				class="px-2 h-7 flex items-center rounded-lg text-[10px] font-mono font-bold bg-cyan-950/70 text-cyan-300 border border-cyan-700/50"
				title="Формат матчу: {sim.teamSize} на {sim.teamSize} ({sim.teamSize * 2} гравців)"
			>
				{sim.teamSize}v{sim.teamSize}
			</span>

			<!-- Boss Timer (Shown ONLY in bot-vs-bot spectator mode without human players) -->
			{#if isBotVsBot}
				<div class="h-5 w-px bg-[#544738]/60 mx-0.5"></div>
				{#if activeBossInstanceId}
					<div
						class="px-2 h-7 rounded-lg bg-amber-950/80 border border-amber-500/70 text-[10px] font-bold text-amber-300 animate-pulse flex items-center gap-1"
						data-testid="boss-timer-badge"
					>
						<Crown class="w-3.5 h-3.5 text-amber-400 shrink-0" />
						<span>БОС НА АРЕНІ!</span>
					</div>
				{:else}
					<div
						class="px-2 h-7 rounded-lg bg-[#181d28] border border-[#3b3226] text-[10px] text-slate-300 font-mono flex items-center gap-1"
						title="Час до появи нейтрального боса"
						data-testid="boss-timer-badge"
					>
						<Crown class="w-3 h-3 text-amber-400/80 shrink-0" />
						<span>Бос: {bossSpawnTimer}с</span>
					</div>
				{/if}
			{/if}
		</div>
	</div>

	<!-- 3. RIGHT: Speed Controls, In-Game Actions, Resources & Spectator Castles -->
	<div class="flex items-start gap-2 shrink-0 pointer-events-none">
		<!-- Dock 3A: Play / Pause / Speed (Singleplayer & Spectator only, decoupled from banner) -->
		{#if !isOnline}
			<div
				class="relative {dockClass}"
				style:z-index={speedMenu.isOpen ? speedMenu.zIndex : undefined}
				data-testid="speed-controls"
			>
				<div class="relative group/tip flex items-center">
					<button
						onclick={() => {
							sim.isRunning = !sim.isRunning;
							sim.notifyStateChanged();
						}}
						data-testid="topbar-pause-btn"
						class={neutralBtnClass}
						aria-label={isRunning ? 'Пауза (Пробіл)' : 'Продовжити (Пробіл)'}
						aria-keyshortcuts="Space"
					>
						{#if isRunning}
							<Pause class="w-4 h-4 text-amber-400" />
						{:else}
							<Play class="w-4 h-4 text-emerald-400" />
						{/if}
					</button>
					<div
						class="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 {speedMenu.isOpen
							? ''
							: 'group-hover/tip:opacity-100'} transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap bg-[#0f141f]/95 border border-[#544738] px-2.5 py-1 rounded-md shadow-2xl text-[11px] text-amber-100 flex items-center gap-1.5"
					>
						<span>{isRunning ? 'Пауза' : 'Продовжити'}</span>
						<span
							class="text-[9px] font-mono font-bold text-amber-400 bg-black/60 px-1 rounded border border-[#544738]"
						>
							Пробіл
						</span>
					</div>
				</div>

				<!-- Single Speed Button with Hybrid Click + Safe-Zone Hover Dropdown -->
				<div
					class="relative group/speed flex items-center"
					use:hoverMenuContainer={speedMenu}
					data-testid="topbar-speed-menu"
				>
					<button
						type="button"
						onclick={() => speedMenu.togglePin()}
						data-testid="topbar-speed-trigger"
						class="relative flex items-center justify-center h-9 min-w-[44px] px-2 [@media(pointer:coarse)]:min-h-[44px] rounded-lg border text-[11px] font-mono font-bold transition-all duration-150 cursor-pointer active:scale-95 shadow-sm shrink-0 touch-manipulation bg-[#181d28] hover:bg-[#242c3d] {speedMenu.isOpen
							? 'border-amber-400 bg-[#242c3d]'
							: 'border-amber-500/50 hover:border-amber-400'} text-amber-300 gap-1"
						title="Швидкість гри: {simSpeed}x (натисніть або наведіть для вибору)"
						aria-label="Швидкість гри: {simSpeed}x"
						aria-expanded={speedMenu.isOpen}
						aria-haspopup="menu"
					>
						<span>{simSpeed >= 10 ? `x${simSpeed}` : `${simSpeed}x`}</span>
						<span
							class="text-[8px] text-amber-400/80 transition-transform duration-150 {speedMenu.isOpen
								? 'rotate-180'
								: ''}"
						>
							▾
						</span>
					</button>

					<!-- Safe-zone (+8px apron + 300ms close cooldown) dropdown options panel -->
					<div
						class="absolute top-full -right-2 pt-2 px-2 pb-2 transition-all duration-150 z-50 {speedMenu.isOpen
							? 'opacity-100 translate-y-0 pointer-events-auto visible'
							: 'opacity-0 -translate-y-1 pointer-events-none invisible'}"
						role="menu"
						aria-label="Вибір швидкості гри"
						data-testid="topbar-speed-dropdown"
					>
						<div
							class="flex flex-col gap-0.5 bg-[#0f131c] border border-[#544738] rounded-lg p-1 shadow-2xl backdrop-blur-md min-w-[76px]"
						>
							{#each availableSpeeds as sp}
								<button
									type="button"
									role="menuitemradio"
									aria-checked={simSpeed === sp}
									onclick={() => {
										sim.speed = sp;
										sim.notifyStateChanged();
										speedMenu.closeNow();
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

		<!-- Dock 3B: In-Game Action Buttons (Командири, Кузня, Магазин, Супер сила, Рятівний удар) -->
		<div class={dockClass} data-testid="topbar-game-actions-dock">
			<!-- Commanders (C) -->
			<div class="relative group/tip flex items-center">
				<button
					onclick={onOpenCommander}
					data-testid="hud-commander-btn"
					class="{baseBtnClass} bg-[#16192b] hover:bg-[#222745] border-indigo-500/70 hover:border-indigo-400 text-indigo-200 {commanderStatus.isFree &&
					!commander
						? 'ring-2 ring-indigo-400/50'
						: ''}"
					aria-label="Командири: {commander
						? `${commander.name}${player.isRandomCommander ? ' ×2' : ''} (${commander.nickname})`
						: commanderStatus.hasHall
							? 'доступний вибір командира'
							: 'потрібен Дім командира'} (Гаряча клавіша: C)"
					aria-keyshortcuts="c"
				>
					<Crown class="w-4 h-4 shrink-0 {commander ? 'text-indigo-300' : 'text-indigo-400/80'}" />
					{#if commanderStatus.isFree && !commander}
						<span
							class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-indigo-400 ring-2 ring-[#131722] animate-pulse"
						></span>
					{:else if commander}
						<span
							class="absolute -bottom-1 -right-1 text-[8px] font-mono bg-indigo-600 px-1 py-0.5 rounded text-white font-bold leading-none border border-indigo-300/60"
						>
							{player.isRandomCommander ? '×2' : '✓'}
						</span>
					{/if}
				</button>
				<div
					class="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap bg-[#0f141f]/95 border border-[#544738] px-2.5 py-1 rounded-md shadow-2xl text-[11px] text-indigo-200 flex items-center gap-1.5"
				>
					<span>
						Командир: {commander
							? `${commander.name}${player.isRandomCommander ? ' (×2)' : ''}`
							: commanderStatus.hasHall
								? 'Можна обрати'
								: 'Не обрано'}
					</span>
					<span
						class="text-[9px] font-mono font-bold text-indigo-300 bg-black/60 px-1 rounded border border-indigo-500/60"
					>
						C
					</span>
				</div>
			</div>

			<!-- War Forge (F) -->
			<div class="relative group/tip flex items-center">
				<button
					onclick={onOpenForge}
					data-testid="hud-forge-btn"
					class={neutralBtnClass}
					aria-label="Військова Кузня (Гаряча клавіша: F)"
					aria-keyshortcuts="f"
				>
					<Hammer class="w-4 h-4 text-amber-400 shrink-0" />
					{#if player.forge.attack + player.forge.armor + player.forge.econ > 0}
						<span
							class="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[9px] w-4 h-4 rounded-full font-bold flex items-center justify-center leading-none shadow"
						>
							{player.forge.attack + player.forge.armor + player.forge.econ}
						</span>
					{/if}
				</button>
				<div
					class="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap bg-[#0f141f]/95 border border-[#544738] px-2.5 py-1 rounded-md shadow-2xl text-[11px] text-amber-100 flex items-center gap-1.5"
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
					class="{baseBtnClass} bg-[#15281e] hover:bg-[#1b3828] border-emerald-600/70 hover:border-emerald-400 text-emerald-300"
					aria-label="Магазин замку: припаси та захист (Гаряча клавіша: B)"
					aria-keyshortcuts="b"
				>
					<ShoppingBag class="w-4 h-4 text-emerald-400 shrink-0" />
				</button>
				<div
					class="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap bg-[#0f141f]/95 border border-[#544738] px-2.5 py-1 rounded-md shadow-2xl text-[11px] text-emerald-200 flex items-center gap-1.5"
				>
					<span>Магазин замку</span>
					<span
						class="text-[9px] font-mono font-bold text-emerald-300 bg-black/60 px-1 rounded border border-emerald-600/70"
					>
						B
					</span>
				</div>
			</div>

			<!-- Race Ability Quick Button (R) -->
			<div class="relative group/tip flex items-center">
				<button
					onclick={() => {
						if (!canCastRaceSkill) return;
						if (
							!routeBattleCommand?.('USE_ABILITY', {
								team: player.team,
								playerSlot: player.slot
							})
						) {
							sim.useRaceSkill(player.team, player);
						}
					}}
					disabled={!canCastRaceSkill}
					data-testid="hud-race-ability-btn"
					class="{baseBtnClass} {canCastRaceSkill
						? 'bg-purple-900/90 hover:bg-purple-800 border-purple-400 text-purple-100 ring-2 ring-purple-400/50 animate-pulse'
						: 'bg-[#181d28] border-[#3b3226] text-slate-500 cursor-not-allowed opacity-60'}"
					aria-label="{raceAbility.nameUk}: {raceAbility.descriptionUk} (Гаряча клавіша: R)"
					aria-keyshortcuts="r"
				>
					<Sparkles
						class="w-4 h-4 shrink-0 {canCastRaceSkill ? 'text-purple-300' : 'text-slate-500'}"
					/>
					{#if raceSkillUnlockLeft > 0}
						<span
							class="absolute -bottom-1 -right-1 text-[8px] font-mono bg-black/85 px-1 py-0.5 rounded text-slate-400 leading-none border border-slate-700"
						>
							{raceSkillUnlockLeft}с
						</span>
					{:else if raceSkillCd > 0}
						<span
							class="absolute -bottom-1 -right-1 text-[8px] font-mono bg-black/85 px-1 py-0.5 rounded text-amber-400 font-bold leading-none border border-amber-500/40"
						>
							{Math.ceil(raceSkillCd)}с
						</span>
					{/if}
				</button>
				<div
					class="absolute top-full right-0 mt-2 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap bg-[#0f141f]/95 border border-[#544738] px-2.5 py-1 rounded-md shadow-2xl text-[11px] text-purple-200 flex items-center gap-1.5"
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
						if (!canUseRescue) return;
						if (
							!routeBattleCommand?.('RESCUE_STRIKE', {
								team: player.team,
								playerSlot: player.slot
							})
						) {
							sim.triggerRescueStrike(player.team, player);
						}
					}}
					disabled={!canUseRescue}
					data-testid="hud-rescue-strike-btn"
					class="{baseBtnClass} {canUseRescue
						? 'bg-rose-950/90 hover:bg-rose-900 border-rose-500 text-rose-100 ring-2 ring-rose-500/50'
						: 'bg-[#181d28] border-[#3b3226] text-slate-500 cursor-not-allowed opacity-60'}"
					aria-label="Рятівний Удар навколо вашого замку (-950 облогової шкоди ворогам у 750px, 2× золото за вбитих, особистий КД 180с, клавіша E)"
					aria-keyshortcuts="e"
				>
					<Flame
						class="w-4 h-4 shrink-0 {canUseRescue
							? 'text-rose-400 animate-pulse'
							: 'text-slate-500'}"
					/>
					{#if rescueCd > 0}
						<span
							class="absolute -bottom-1 -right-1 text-[8px] font-mono bg-black/85 px-1 py-0.5 rounded text-amber-400 font-bold leading-none border border-amber-500/40"
						>
							{Math.ceil(rescueCd)}с
						</span>
					{/if}
				</button>
				<div
					class="absolute top-full right-0 mt-2 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap bg-[#0f141f]/95 border border-[#544738] px-2.5 py-1.5 rounded-md shadow-2xl text-[11px] text-rose-200 flex flex-col gap-0.5"
				>
					<div class="flex items-center gap-1.5 font-bold">
						<span>Рятівний удар</span>
						<span
							class="text-[9px] font-mono font-bold text-rose-300 bg-black/60 px-1 rounded border border-rose-500/60"
						>
							E
						</span>
					</div>
					<span class="text-[10px] text-slate-300 font-normal">
						950 шкоди ворогам у 750px • 2× золото за знищених • КД: 180с
					</span>
				</div>
			</div>
		</div>

		<!-- Dock 3C: Authentic WC3 Resource Boxes (Dedicated Visual Container) -->
		<div
			class="bg-[#131722]/95 backdrop-blur-md rounded-b-xl rounded-t-none border-b-2 border-x-2 border-t-0 border-[#544738] px-3 py-1.5 shadow-2xl pointer-events-auto flex items-center shrink-0"
			data-testid="resource-boxes"
		>
			<div class="flex items-center gap-2.5 h-9">
				<!-- Gold -->
				<div
					class="flex items-center gap-1.5 font-bold text-amber-400 shrink-0"
					title="Золото гравця • Дохід: +{periodicGold}g кожні {incomeEvery}с (наступне через {incomeIn}с)"
				>
					<Coins class="w-4 h-4 text-amber-400 shrink-0" />
					<span class="text-sm font-mono tracking-tight tabular-nums">{playerGold}</span>
				</div>

				<!-- Lumber (Wood) Reserve -->
				<div
					class="flex items-center gap-1.5 text-xs {westLumber > 0
						? 'text-emerald-300'
						: 'text-slate-500'} border-l border-[#3b3226] pl-2.5 shrink-0"
					title="Запас деревини для вдосконалення технологій та будівель вищого тиру"
				>
					<TreePine
						class="w-3.5 h-3.5 shrink-0 {westLumber > 0 ? 'text-emerald-400' : 'text-slate-500'}"
					/>
					<span class="font-mono font-bold tabular-nums">{westLumber}</span>
				</div>

				<!-- Food Cap (Legendary Building Limit) -->
				<div
					class="flex items-center gap-1.5 text-xs border-l border-[#3b3226] pl-2.5 shrink-0 {player.maxFood >
					0
						? 'text-amber-300'
						: 'text-slate-500'}"
					title="Ліміт легендарних будівель (Їжа): {player.food}/{player.maxFood}. Збільшуйте ліміт у магазині замку (B)!"
				>
					<Crown
						class="w-3.5 h-3.5 shrink-0 {player.maxFood > 0 ? 'text-amber-400' : 'text-slate-500'}"
					/>
					<span class="font-mono font-bold tabular-nums">{player.food}/{player.maxFood}</span>
				</div>
			</div>
		</div>

		<!-- Dock 3D: Castles HP Meters (Shown ONLY in bot-vs-bot spectator mode without human players) -->
		{#if isBotVsBot}
			<div
				class="bg-[#131722]/95 backdrop-blur-md rounded-b-xl rounded-t-none border-b-2 border-x-2 border-t-0 border-[#544738] px-3 py-1.5 shadow-2xl pointer-events-auto flex items-center gap-2.5 shrink-0"
				data-testid="castle-hp-meters"
			>
				<!-- West Castle HP (Player) -->
				<div
					class="w-24 xl:w-28 2xl:w-32 shrink-0 h-9 flex flex-col justify-center"
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
					class="w-24 xl:w-28 2xl:w-32 shrink-0 h-9 flex flex-col justify-center"
					role="meter"
					aria-label="Здоров'я Східного Замку (Ворог)"
					aria-valuenow={eastHp}
					aria-valuemin={0}
					aria-valuemax={eastMaxHp}
					title="Східний Замок ({toPlayableRace(
						sim.players.east.race
					)} Бот): {eastHp} / {eastMaxHp}"
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
