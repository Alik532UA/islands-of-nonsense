<script lang="ts">
	import { onMount } from 'svelte';
	import type { Simulation } from '../engine/simulation';
	import type { PlayerState } from '../engine/types';
	import { toPlayableRace } from '../engine/gameData';
	import { resolve } from '$app/paths';
	import { settings } from '$lib/services/settings.svelte';
	import { fullscreen, canFullscreen } from '$lib/services/fullscreen.svelte';
	import { createHoverMenu, hoverMenuContainer } from '$lib/ui/hoverMenu.svelte';
	import { t } from '$lib/i18n';
	import { localizeRaceName } from '$lib/i18n/entityNames';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	let {
		sim,
		uiTick = 0,
		isOnline = false,
		isSpectator = false,
		activePlayer = null,
		onOpenGuide,
		onOpenSettings,
		onBeforeLeave
	}: {
		sim: Simulation;
		uiTick?: number;
		isOnline?: boolean;
		isSpectator?: boolean;
		activePlayer?: PlayerState | null;
		onOpenGuide?: () => void;
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
	let player = $derived(uiTick >= 0 ? (activePlayer ?? sim.players.west) : sim.players.west);
	let playerGold = $derived(uiTick >= 0 ? Math.floor(player.gold) : 0);
	let periodicGold = $derived(
		uiTick >= 0 ? sim.economySystem.calculateIncome(player.team, player) : 3
	);
	let incomeEvery = $derived(uiTick >= 0 ? Math.round(sim.incomeInterval) : 5);
	let incomeIn = $derived(uiTick >= 0 ? Math.max(0, Math.ceil(sim.incomeTimer)) : 5);

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

	const availableSpeeds = [1, 2, 3, 5, 10, 50, 100];

	let gameTime = $derived(uiTick >= 0 ? sim.gameTime : 0);
	let bossSpawnTimer = $derived(uiTick >= 0 ? Math.max(0, Math.ceil(sim.bossSpawnTimer)) : 180);
	let activeBossInstanceId = $derived(uiTick >= 0 ? sim.activeBossInstanceId : null);
	let isRunning = $derived(uiTick >= 0 ? sim.isRunning : false);
	let simSpeed = $derived(uiTick >= 0 ? sim.speed : 1);
	let isSandbox = $derived(uiTick >= 0 ? sim.config.modeId === 'sandbox' : false);
	let westLumber = $derived(uiTick >= 0 ? Math.floor(player.lumber ?? 0) : 0);

	let westTeamIncome = $derived(
		uiTick >= 0
			? sim.teamMembers.west.reduce(
					(sum, p) => sum + sim.economySystem.calculateIncome('west', p),
					0
				)
			: 0
	);
	let eastTeamIncome = $derived(
		uiTick >= 0
			? sim.teamMembers.east.reduce(
					(sum, p) => sum + sim.economySystem.calculateIncome('east', p),
					0
				)
			: 0
	);
	let isNoRescueStrike = $derived(
		uiTick >= 0 ? Boolean(sim.gameModeConfig?.noRescueStrike) : false
	);
	let westRescueTotal = $derived(
		uiTick >= 0 ? (isNoRescueStrike ? 0 : sim.teamMembers.west.length) : 0
	);
	let eastRescueTotal = $derived(
		uiTick >= 0 ? (isNoRescueStrike ? 0 : sim.teamMembers.east.length) : 0
	);
	let westRescueReady = $derived(
		uiTick >= 0 && !isNoRescueStrike
			? sim.teamMembers.west.filter((p) => sim.canUseRescueStrike('west', p)).length
			: 0
	);
	let eastRescueReady = $derived(
		uiTick >= 0 && !isNoRescueStrike
			? sim.teamMembers.east.filter((p) => sim.canUseRescueStrike('east', p)).length
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

	const dockClass =
		'lg-hud-panel rounded-b-xl rounded-t-none border-b-2 border-x-2 border-t-0 border-[#544738]/80 px-2 py-1.5 pointer-events-auto flex items-center gap-1.5 shrink-0';

	const baseBtnClass =
		'relative flex items-center justify-center w-9 h-9 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] rounded-lg border text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-95 shadow-sm shrink-0 touch-manipulation';

	const neutralBtnClass = `${baseBtnClass} lg-hud-pill border-white/15 hover:border-amber-400/75 text-slate-100 hover:text-amber-300`;
	const tipBoxClass =
		'lg-hud-tooltip absolute top-full mt-2 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap border border-[#544738]/80 px-2.5 py-1 rounded-md text-[11px]';

	const speedMenu = createHoverMenu({ closeDelayMs: 300 });
	const soundMenu = createHoverMenu({ closeDelayMs: 300 });
</script>

<!-- Floating Modular Top HUD Docks (Mirrors BottomBar modular architecture) -->
<header
	class="absolute top-0 left-0 right-0 px-2.5 sm:px-3 {isOnline
		? 'pr-[245px] sm:pr-[315px]'
		: ''} flex flex-wrap xl:flex-nowrap items-start justify-between gap-2 text-white select-none z-30 pointer-events-none min-w-0 overflow-visible"
	style:z-index={speedMenu.isOpen
		? speedMenu.zIndex
		: soundMenu.isOpen
			? soundMenu.zIndex
			: undefined}
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
					aria-label={t('topbar.backToModes')}
					data-testid="topbar-back-link"
				>
					<UiIcon name="arrowLeft" class="w-4 h-4" />
				</a>
				<div class="{tipBoxClass} left-0 text-amber-100 flex items-center gap-1.5">
					<span>{t('topbar.backToModes')}</span>
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
					aria-label={t('topbar.mainMenu')}
					data-testid="topbar-home-link"
				>
					<UiIcon name="house" class="w-4 h-4" />
				</a>
				<div class="{tipBoxClass} left-0 text-amber-100 flex items-center gap-1.5">
					<span>{t('topbar.mainMenu')}</span>
				</div>
			</div>

			<!-- Pure Reference Guide / Manual (F9) -->
			<div class="relative group/tip flex items-center">
				<button
					onclick={() => onOpenGuide?.()}
					data-testid="hud-guide-btn"
					class={neutralBtnClass}
					aria-label={t('topbar.guideAria')}
					aria-keyshortcuts="F9"
				>
					<UiIcon name="bookOpen" class="w-4 h-4 text-amber-400 shrink-0" />
				</button>
				<div
					class="{tipBoxClass} left-1/2 -translate-x-1/2 text-amber-100 flex items-center gap-1.5"
				>
					<span>{t('topbar.guide')}</span>
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
					aria-label={t('topbar.matchMenu')}
				>
					<UiIcon name="menu" class="w-4 h-4 text-amber-300 shrink-0" />
				</button>
				<div
					class="{tipBoxClass} left-1/2 -translate-x-1/2 text-amber-100 flex items-center gap-1.5"
				>
					<span>{t('topbar.matchMenu')}</span>
					<span
						class="text-[9px] font-mono font-bold text-amber-400 bg-black/60 px-1 rounded border border-[#544738]"
					>
						Esc
					</span>
				</div>
			</div>
		</div>

		<!-- Dock 1B: System Preferences (Sound, Fullscreen, Locale, Global Settings) -->
		<div
			class={dockClass}
			style:z-index={soundMenu.isOpen ? soundMenu.zIndex : undefined}
			data-testid="topbar-preferences-dock"
		>
			<!-- Sound toggle (Quick Mute + Hover Volume Mini-Menu for SFX, Music, Voice) -->
			<div
				class="relative flex items-center"
				use:hoverMenuContainer={soundMenu}
				data-testid="topbar-sound-menu"
			>
				<button
					type="button"
					onclick={() => settings.toggleMute()}
					class="{neutralBtnClass} {soundMenu.isOpen ? 'border-amber-400 bg-[#242c3d]' : ''}"
					aria-label={settings.isAudioActive ? t('topbar.soundOn') : t('topbar.soundOff')}
					aria-expanded={soundMenu.isOpen}
					aria-haspopup="menu"
					data-testid="topbar-sound-toggle"
				>
					{#if settings.isAudioActive}
						<UiIcon name="volume2" class="w-4 h-4 text-emerald-400" />
					{:else}
						<UiIcon name="volumeX" class="w-4 h-4 text-slate-500" />
					{/if}
				</button>

				<div
					class="absolute top-full -left-2 pt-2 px-2 pb-2 transition-all duration-150 z-50 {soundMenu.isOpen
						? 'opacity-100 translate-y-0 pointer-events-auto visible'
						: 'opacity-0 -translate-y-1 pointer-events-none invisible'}"
					role="menu"
					aria-label={t('topbar.soundVolumeTitle')}
					data-testid="topbar-sound-dropdown"
				>
					<div class="lg-hud-modal w-60 border border-[#544738]/80 rounded-xl p-2.5 space-y-2.5">
						<div class="flex items-center justify-between border-b border-[#3b3226] pb-1.5">
							<span class="text-[11px] font-bold text-amber-300">{t('topbar.audioVolume')}</span>
							<button
								type="button"
								onclick={() => settings.toggleMute()}
								class="text-[10px] font-semibold px-1.5 py-0.5 rounded border transition cursor-pointer {settings.isAudioActive
									? 'bg-emerald-950/70 border-emerald-600/60 text-emerald-300'
									: 'bg-rose-950/70 border-rose-600/60 text-rose-300'}"
							>
								{settings.isAudioActive ? t('topbar.enabled') : t('topbar.disabled')}
							</button>
						</div>

						<!-- SFX Volume -->
						<div class="space-y-1">
							<div class="flex items-center justify-between text-[11px]">
								<button
									type="button"
									onclick={() => settings.setSound(!settings.sound)}
									class="flex items-center gap-1.5 font-medium cursor-pointer {settings.sound
										? 'text-slate-200'
										: 'text-slate-500 line-through'}"
								>
									<span>{t('topbar.sfx')}</span>
								</button>
								<span class="font-mono text-[10px] text-amber-300 tabular-nums">
									{Math.round(settings.volume * 100)}%
								</span>
							</div>
							<input
								type="range"
								min="0"
								max="1"
								step="0.01"
								value={settings.volume}
								oninput={(e) => settings.setVolume(Number(e.currentTarget.value))}
								aria-label={t('topbar.sfxVolume')}
								data-testid="sound-slider-sfx"
								class="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-[#1f2636] accent-amber-400"
							/>
						</div>

						<!-- Music Volume -->
						<div class="space-y-1">
							<div class="flex items-center justify-between text-[11px]">
								<button
									type="button"
									onclick={() => settings.setMusicEnabled(!settings.musicEnabled)}
									class="flex items-center gap-1.5 font-medium cursor-pointer {settings.musicEnabled
										? 'text-slate-200'
										: 'text-slate-500 line-through'}"
								>
									<span>{t('topbar.music')}</span>
								</button>
								<span class="font-mono text-[10px] text-amber-300 tabular-nums">
									{Math.round(settings.musicVolume * 100)}%
								</span>
							</div>
							<input
								type="range"
								min="0"
								max="1"
								step="0.01"
								value={settings.musicVolume}
								oninput={(e) => settings.setMusicVolume(Number(e.currentTarget.value))}
								aria-label={t('topbar.musicVolume')}
								data-testid="sound-slider-music"
								class="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-[#1f2636] accent-emerald-400"
							/>
						</div>

						<!-- Voice Volume -->
						<div class="space-y-1">
							<div class="flex items-center justify-between text-[11px]">
								<button
									type="button"
									onclick={() => settings.setVoiceEnabled(!settings.voiceEnabled)}
									class="flex items-center gap-1.5 font-medium cursor-pointer {settings.voiceEnabled
										? 'text-slate-200'
										: 'text-slate-500 line-through'}"
								>
									<span>{t('topbar.voice')}</span>
								</button>
								<span class="font-mono text-[10px] text-amber-300 tabular-nums">
									{Math.round(settings.voiceVolume * 100)}%
								</span>
							</div>
							<input
								type="range"
								min="0"
								max="1"
								step="0.01"
								value={settings.voiceVolume}
								oninput={(e) => settings.setVoiceVolume(Number(e.currentTarget.value))}
								aria-label={t('topbar.voiceVolume')}
								data-testid="sound-slider-voice"
								class="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-[#1f2636] accent-sky-400"
							/>
						</div>
					</div>
				</div>
			</div>

			{#if canFullscreen()}
				<div class="relative group/tip flex items-center">
					<button
						type="button"
						onclick={() => fullscreen.toggle()}
						class={neutralBtnClass}
						aria-label={t('topbar.fullscreenEnter')}
						data-testid="topbar-fullscreen-toggle"
					>
						{#if fullscreen.active}
							<UiIcon name="minimize2" class="w-4 h-4 text-amber-400" />
						{:else}
							<UiIcon name="maximize2" class="w-4 h-4 text-slate-300" />
						{/if}
					</button>
					<div class="{tipBoxClass} left-1/2 -translate-x-1/2 text-amber-100">
						{fullscreen.active ? t('topbar.fullscreenExit') : t('topbar.fullscreenEnter')}
					</div>
				</div>
			{/if}

			<!-- Locale toggle -->
			<div class="relative group/tip flex items-center">
				<button
					type="button"
					onclick={() => settings.setLocale(settings.locale === 'uk' ? 'en' : 'uk')}
					class="{neutralBtnClass} font-mono font-bold text-cyan-300"
					aria-label={t('topbar.langSwitchAria')}
					data-testid="topbar-locale-toggle"
				>
					{t('topbar.langBadge')}
				</button>
				<div class="{tipBoxClass} left-1/2 -translate-x-1/2 text-cyan-200">
					{t('topbar.langTooltip')}
				</div>
			</div>

			<!-- Global Settings Modal button -->
			<div class="relative group/tip flex items-center">
				<button
					type="button"
					onclick={() => settings.openSettings()}
					class={neutralBtnClass}
					aria-label={t('topbar.globalSettings')}
					data-testid="topbar-settings-btn"
				>
					<UiIcon name="settings" class="w-4 h-4 text-amber-300" />
				</button>
				<div class="{tipBoxClass} left-1/2 -translate-x-1/2 text-amber-100">
					{t('topbar.globalSettings')}
				</div>
			</div>
		</div>
	</div>

	<!-- 2. CENTER: Resources (slightly left) & Warcraft III Day/Night Dial, Match Clock & Scoreboard (slightly right) -->
	<div class="flex items-start gap-2.5 shrink-0 pointer-events-none">
		<!-- Authentic WC3 Resource Boxes (Center-Left) -->
		<div
			class="lg-hud-panel rounded-b-xl rounded-t-none border-b-2 border-x-2 border-t-0 border-[#544738]/80 px-3 py-1.5 pointer-events-auto flex items-center shrink-0"
			data-testid="resource-boxes"
		>
			<div class="flex items-center gap-2.5 h-9">
				<!-- Gold -->
				<div
					class="flex items-center gap-1.5 font-bold text-amber-400 shrink-0"
					title={t('topbar.goldTitle', {
						gold: periodicGold,
						every: incomeEvery,
						inSec: incomeIn
					})}
				>
					<UiIcon name="coins" class="w-4 h-4 text-amber-400 shrink-0" />
					<span class="text-sm font-mono tracking-tight tabular-nums">
						{isSandbox ? '∞' : playerGold}
					</span>
				</div>

				<!-- Lumber (Wood) Reserve -->
				<div
					class="flex items-center gap-1.5 text-xs {isSandbox || westLumber > 0
						? 'text-emerald-300'
						: 'text-slate-500'} border-l border-[#3b3226] pl-2.5 shrink-0"
					title={t('topbar.lumberTitle')}
				>
					<UiIcon
						name="treePine"
						class="w-3.5 h-3.5 shrink-0 {isSandbox || westLumber > 0
							? 'text-emerald-400'
							: 'text-slate-500'}"
					/>
					<span class="font-mono font-bold tabular-nums">{isSandbox ? '∞' : westLumber}</span>
				</div>

				<!-- Food Cap (Legendary Building Limit) -->
				<div
					class="relative group/tip flex items-center gap-1.5 text-xs border-l border-[#3b3226] pl-2.5 shrink-0 cursor-help {player.maxFood >
					0
						? 'text-amber-300'
						: 'text-slate-500'}"
					aria-label={t('topbar.foodLabel', {
						food: player.food,
						maxFood: player.maxFood
					})}
				>
					<UiIcon
						name="crown"
						class="w-3.5 h-3.5 shrink-0 {player.maxFood > 0 ? 'text-amber-400' : 'text-slate-500'}"
					/>
					<span class="font-mono font-bold tabular-nums">{player.food}/{player.maxFood}</span>
					<div class="{tipBoxClass} right-0 text-amber-100">
						{t('topbar.foodTitle', {
							food: player.food,
							maxFood: player.maxFood
						})}
					</div>
				</div>
			</div>
		</div>

		<!-- Match Clock & Scoreboard (Center-Right) -->
		<div
			class="lg-hud-panel rounded-b-xl rounded-t-none border-b-2 border-x-2 border-t-0 border-[#544738]/80 px-3 py-1.5 pointer-events-auto flex items-center gap-2.5 shrink-0 select-none"
			data-testid="topbar-match-dock"
		>
			<!-- Authentic Warcraft III Circular Day/Night Clock Dial + Match Timer -->
			<div class="flex items-center gap-2 h-9 shrink-0">
				<div
					class="relative w-8 h-8 rounded-full border-2 border-[#8c7456] bg-[#0c1017] flex items-center justify-center shadow-lg overflow-hidden shrink-0 transition-colors duration-700 {isDay
						? 'shadow-amber-500/15'
						: 'shadow-indigo-500/20'}"
					title={dayPhase === 'day'
						? t('topbar.phaseDay')
						: dayPhase === 'dusk'
							? t('topbar.phaseDusk')
							: dayPhase === 'night'
								? t('topbar.phaseNight')
								: t('topbar.phaseDawn')}
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
							<UiIcon name="sun" class="w-4 h-4 text-amber-400 transition-all duration-500" />
						{:else}
							<UiIcon name="moon" class="w-4 h-4 text-indigo-300 transition-all duration-500" />
						{/if}
					</div>
				</div>

				<span
					class="text-sm font-mono font-bold text-slate-100 tracking-wide tabular-nums whitespace-nowrap"
					title={t('topbar.roundTimeTitle')}
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
					title={t('topbar.currentRoundTitle')}
				>
					<span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
						{t('topbar.round')}
					</span>
					<span class="text-xs font-mono font-black text-amber-300">{sim.round}</span>
				</div>

				<!-- Series Score Pill (West vs East + Target Wins) -->
				<div
					class="relative group/tip flex items-center gap-1.5 px-2.5 h-7 rounded-lg bg-[#0a0d14] border border-[#544738]/80 shadow-inner cursor-help"
					data-testid="series-score-pill"
				>
					<span class="text-xs font-mono font-black text-sky-400">{sim.score.west}</span>
					<span class="text-[10px] font-bold text-slate-500">:</span>
					<span class="text-xs font-mono font-black text-rose-400">{sim.score.east}</span>
					<span class="h-3 w-px bg-[#3b3226] mx-0.5"></span>
					<span class="text-[10px] font-medium text-slate-400">
						{t('topbar.toTarget', { target: sim.targetWins })}
					</span>
					<div
						class="{tipBoxClass} left-1/2 -translate-x-1/2 text-slate-200 min-w-[235px] p-2.5 space-y-1.5"
						data-testid="series-score-tooltip"
					>
						<div class="text-[11px] font-bold text-amber-300 border-b border-[#3b3226] pb-1">
							{t('topbar.seriesTitle', { target: sim.targetWins })}
						</div>
						<div class="flex items-center justify-between gap-3 text-[11px]">
							<span class="text-slate-400">{t('topbar.rescueStrikes')}</span>
							{#if isNoRescueStrike}
								<span class="font-mono text-slate-500">{t('topbar.disabledNr')}</span>
							{:else}
								<span class="font-mono font-bold tabular-nums">
									<span class="text-sky-400">{westRescueReady}/{westRescueTotal}</span>
									<span class="text-slate-500 mx-0.5">vs</span>
									<span class="text-rose-400">{eastRescueReady}/{eastRescueTotal}</span>
								</span>
							{/if}
						</div>
						<div class="flex items-center justify-between gap-3 text-[11px]">
							<span class="text-slate-400">{t('topbar.incomeEvery', { sec: incomeEvery })}</span>
							<span class="font-mono font-bold tabular-nums">
								<span class="text-sky-400">+{westTeamIncome}g</span>
								<span class="text-slate-500 mx-0.5">vs</span>
								<span class="text-rose-400">+{eastTeamIncome}g</span>
							</span>
						</div>
					</div>
				</div>

				<!-- Team Size Format Badge -->
				<span
					class="px-2 h-7 flex items-center rounded-lg text-[10px] font-mono font-bold bg-cyan-950/70 text-cyan-300 border border-cyan-700/50"
					title={t('topbar.formatTitle', {
						size: sim.teamSize,
						total: sim.teamSize * 2
					})}
				>
					{sim.teamSize}v{sim.teamSize}
				</span>

				<!-- Boss Timer (Shown ONLY in bot-vs-bot spectator mode without human players) -->
				{#if isBotVsBot}
					<div class="h-5 w-px bg-[#544738]/60 mx-0.5"></div>
					{#if activeBossInstanceId}
						<div
							class="px-2 h-7 rounded-lg bg-amber-950/80 border border-amber-500/70 text-[10px] font-bold text-amber-300 animate-pulse flex items-center gap-1"
							data-testid="boss-active-badge"
						>
							<UiIcon name="crown" class="w-3.5 h-3.5 text-amber-400 shrink-0" />
							<span>{t('topbar.bossActive')}</span>
						</div>
					{:else}
						<div
							class="px-2 h-7 rounded-lg bg-[#181d28] border border-[#3b3226] text-[10px] text-slate-300 font-mono flex items-center gap-1"
							title={t('topbar.bossTitle')}
							data-testid="boss-timer-badge"
						>
							<UiIcon name="crown" class="w-3 h-3 text-amber-400/80 shrink-0" />
							<span>{t('topbar.bossIn', { sec: bossSpawnTimer })}</span>
						</div>
					{/if}
				{/if}
			</div>
		</div>

		<!-- 3. RIGHT: Speed Controls & Spectator Castles -->
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
							aria-label={isRunning ? t('topbar.pauseAria') : t('topbar.resumeAria')}
							aria-keyshortcuts="Space"
						>
							{#if isRunning}
								<UiIcon name="pause" class="w-4 h-4 text-amber-400" />
							{:else}
								<UiIcon name="play" class="w-4 h-4 text-emerald-400" />
							{/if}
						</button>
						<div
							class="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 {speedMenu.isOpen
								? ''
								: 'group-hover/tip:opacity-100'} transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap bg-[#0f141f]/95 border border-[#544738] px-2.5 py-1 rounded-md shadow-2xl text-[11px] text-amber-100 flex items-center gap-1.5"
						>
							<span>{isRunning ? t('topbar.pause') : t('topbar.resume')}</span>
							<span
								class="text-[9px] font-mono font-bold text-amber-400 bg-black/60 px-1 rounded border border-[#544738]"
							>
								{t('topbar.spaceKey')}
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
							title={t('topbar.speedTitle', { speed: simSpeed })}
							aria-label={t('topbar.speedAria', { speed: simSpeed })}
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
							aria-label={t('topbar.speedMenuAria')}
							data-testid="topbar-speed-dropdown"
						>
							<div
								class="lg-hud-modal flex flex-col gap-0.5 border border-[#544738]/80 rounded-lg p-1 min-w-[76px]"
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
										title={sp >= 10
											? t('topbar.speedOptionTurbo', { speed: sp })
											: t('topbar.speedOption', { speed: sp })}
										aria-label={sp >= 10
											? t('topbar.speedOptionTurbo', { speed: sp })
											: t('topbar.speedOption', { speed: sp })}
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

			<!-- Dock 3D: Castles HP Meters (Shown in bot-vs-bot, replay, or spectator mode) -->
			{#if isBotVsBot || isSpectator}
				<div
					class="lg-hud-panel rounded-b-xl rounded-t-none border-b-2 border-x-2 border-t-0 border-[#544738]/80 px-3 py-1.5 pointer-events-auto flex items-center gap-2.5 shrink-0"
					data-testid="castle-hp-meters"
				>
					<!-- West Castle HP (Player) -->
					<div
						class="w-24 xl:w-28 2xl:w-32 shrink-0 h-9 flex flex-col justify-center"
						role="meter"
						aria-label={t('topbar.westCastleAria')}
						aria-valuenow={westHp}
						aria-valuemin={0}
						aria-valuemax={westMaxHp}
						title={t('topbar.westCastleTitle', {
							hp: westHp,
							maxHp: westMaxHp
						})}
					>
						<div
							class="flex justify-between items-center text-[10px] font-bold mb-0.5 whitespace-nowrap gap-1"
						>
							<span class="text-blue-400 flex items-center gap-0.5">
								<UiIcon name="shield" class="w-3 h-3 text-blue-400 shrink-0" />
								{t('topbar.yourCastle')}
							</span>
							<span class="text-slate-300 font-mono text-[9px]">{westHp}</span>
						</div>
						<div
							class="h-2 w-full bg-[#0c1017] rounded-full overflow-hidden border border-[#3b3226]"
						>
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
						aria-label={t('topbar.eastCastleAria')}
						aria-valuenow={eastHp}
						aria-valuemin={0}
						aria-valuemax={eastMaxHp}
						title={t('topbar.eastCastleTitle', {
							race: localizeRaceName(toPlayableRace(sim.players.east.race), settings.locale),
							hp: eastHp,
							maxHp: eastMaxHp
						})}
					>
						<div
							class="flex justify-between items-center text-[10px] font-bold mb-0.5 whitespace-nowrap gap-1"
						>
							<span class="text-slate-300 font-mono text-[9px]">{eastHp}</span>
							<span class="text-rose-400 flex items-center gap-0.5">
								{t('topbar.enemyCastle')}
								<UiIcon name="shield" class="w-3 h-3 text-rose-400 shrink-0" />
							</span>
						</div>
						<div
							class="h-2 w-full bg-[#0c1017] rounded-full overflow-hidden border border-[#3b3226]"
						>
							<div
								class="h-full bg-gradient-to-l from-red-600 to-orange-400 transition-all duration-200"
								style="width: {eastHpPct}%"
							></div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</header>
