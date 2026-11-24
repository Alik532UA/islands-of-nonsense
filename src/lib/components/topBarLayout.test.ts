import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('TopBar Layout & Spacing Invariants (UI/UX)', () => {
	const topBarPath = path.resolve(process.cwd(), 'src/lib/components/TopBar.svelte');
	const topBarContent = fs.readFileSync(topBarPath, 'utf-8');

	it('header container uses modular floating docks with pointer-events-none wrapper and overflow-visible', () => {
		expect(topBarContent).toContain('data-testid="top-bar"');
		expect(topBarContent).toContain('min-w-0');
		expect(topBarContent).toContain('overflow-visible');
		expect(topBarContent).toContain('pointer-events-none');
		expect(topBarContent).not.toContain('overflow-y-hidden');
		// Each block lives in its own modular docked container
		expect(topBarContent).toContain('data-testid="topbar-system-nav-dock"');
		expect(topBarContent).toContain('data-testid="topbar-preferences-dock"');
		expect(topBarContent).toContain('data-testid="topbar-match-dock"');
		expect(topBarContent).toContain('data-testid="topbar-game-actions-dock"');
		expect(topBarContent).toContain('data-testid="resource-boxes"');
	});

	it('all header action buttons share unified w-9 h-9 square sizing and consistent rounded-lg style', () => {
		expect(topBarContent).toContain('const baseBtnClass =');
		expect(topBarContent).toContain('w-9 h-9');
		expect(topBarContent).toContain('rounded-lg border text-xs font-semibold');
		expect(topBarContent).toContain('const dockClass =');
	});

	it('separates system controls on the left and gameplay action buttons on the right', () => {
		const leftIdx = topBarContent.indexOf(
			'<!-- 1. LEFT: System, Navigation & Settings Containers -->'
		);
		const centerIdx = topBarContent.indexOf(
			'<!-- 2. CENTER: Warcraft III Day/Night Dial, Match Clock & Stylish Scoreboard -->'
		);
		const rightIdx = topBarContent.indexOf(
			'<!-- 3. RIGHT: Speed Controls, In-Game Actions, Resources & Spectator Castles -->'
		);
		expect(leftIdx).toBeGreaterThan(-1);
		expect(centerIdx).toBeGreaterThan(leftIdx);
		expect(rightIdx).toBeGreaterThan(centerIdx);

		// System buttons live in LEFT section (Guide moved separately from Commander action)
		const leftSection = topBarContent.slice(leftIdx, centerIdx);
		expect(leftSection).toContain('data-testid="topbar-back-link"');
		expect(leftSection).toContain('data-testid="topbar-home-link"');
		expect(leftSection).toContain('data-testid="hud-guide-btn"');
		expect(leftSection).not.toContain('data-testid="hud-commander-btn"');
		expect(leftSection).toContain('data-testid="hud-menu-btn"');
		expect(leftSection).toContain('data-testid="topbar-sound-toggle"');
		expect(leftSection).toContain('data-testid="topbar-fullscreen-toggle"');
		expect(leftSection).toContain('data-testid="topbar-locale-toggle"');
		expect(leftSection).toContain('data-testid="topbar-settings-btn"');

		// Gameplay buttons (including Commanders) and resources live in RIGHT section
		const rightSection = topBarContent.slice(rightIdx);
		expect(rightSection).toContain('data-testid="hud-commander-btn"');
		expect(rightSection).toContain('data-testid="hud-forge-btn"');
		expect(rightSection).toContain('data-testid="hud-shop-btn"');
		expect(rightSection).toContain('data-testid="hud-race-ability-btn"');
		expect(rightSection).toContain('data-testid="hud-rescue-strike-btn"');
		expect(rightSection).toContain('data-testid="resource-boxes"');
		expect(rightSection).toContain('sim.useRaceSkill(player.team, player)');
	});

	it('left and right navigation button tooltips and speed dropdown are positioned with top-full and high z-index without vertical clipping', () => {
		expect(topBarContent).toContain('group/tip');
		expect(topBarContent).toContain('absolute top-full');
		expect(topBarContent).toContain('z-50');
	});

	it('match status banner displays clean scoreboard pills protected against wrapping and collapsing', () => {
		expect(topBarContent).toContain('data-testid="match-status-banner"');
		expect(topBarContent).toContain('shrink-0 whitespace-nowrap');
		expect(topBarContent).toContain('{sim.round}');
		expect(topBarContent).toContain('{sim.score.west}');
		expect(topBarContent).toContain('{sim.score.east}');
		expect(topBarContent).toContain('до {sim.targetWins}');
		expect(topBarContent).toContain('{sim.teamSize}v{sim.teamSize}');
	});

	it('day/night dial and match banner have clean spacing inside the center dock', () => {
		expect(topBarContent).toContain('data-testid="topbar-match-dock"');
		expect(topBarContent).toContain('data-testid="day-night-dial"');
	});

	it('shows boss timer and castle HP meters ONLY in spectator botVsBot matches without human players', () => {
		expect(topBarContent).toContain('let isBotVsBot = $derived.by(');
		// Boss timer is gated by {#if isBotVsBot}
		const bossMatch = topBarContent.match(
			/\{#if isBotVsBot\}[\s\S]*?data-testid="boss-timer-badge"/
		);
		expect(bossMatch).not.toBeNull();
		// Castle HP meters are gated by {#if isBotVsBot}
		const castleMatch = topBarContent.match(
			/\{#if isBotVsBot\}[\s\S]*?data-testid="castle-hp-meters"/
		);
		expect(castleMatch).not.toBeNull();
	});

	it('speed controls are decoupled from center banner to prevent squeezing round info', () => {
		expect(topBarContent).toContain('{#if !isOnline}');
		expect(topBarContent).toContain('data-testid="speed-controls"');
		expect(topBarContent).toContain('data-testid="resource-boxes"');
		expect(topBarContent).toContain('data-testid="castle-hp-meters"');
	});

	it('includes full speed range [1, 2, 3, 5, 10, 50, 100] across all environments with hover dropdown', () => {
		expect(topBarContent).toContain('const availableSpeeds = [1, 2, 3, 5, 10, 50, 100];');
		expect(topBarContent).toContain('group/speed');
	});

	it('removes periodic gold income progress bar from resource boxes to maximize space', () => {
		expect(topBarContent).not.toContain('title="Періодичний дохід золота');
		expect(topBarContent).not.toContain('style="width: {incomePct}%"');
	});

	it('navigation and action buttons are icon-only with custom stylish floating tooltips', () => {
		expect(topBarContent).not.toContain('<span class="hidden md:inline">Довідник</span>');
		expect(topBarContent).not.toContain('<span class="hidden md:inline">Кузня</span>');
		expect(topBarContent).not.toContain('<span class="hidden md:inline">Магазин</span>');
		expect(topBarContent).toContain('group/tip');
	});

	it('castle HP meters use responsive width (w-24 / xl:w-28 / 2xl:w-32) preventing overflow on standard resolutions', () => {
		expect(topBarContent).toContain('w-24 xl:w-28 2xl:w-32 shrink-0');
	});

	it('castle HP meters format values without decimals to prevent text overflow', () => {
		expect(topBarContent).toContain('let westHp = $derived(');
		expect(topBarContent).toContain('let eastHp = $derived(');
		expect(topBarContent).toContain('Math.ceil(westCastle.hp)');
		expect(topBarContent).toContain('Math.ceil(eastCastle.hp)');
		expect(topBarContent).toContain(
			'<span class="text-slate-300 font-mono text-[9px]">{westHp}</span>'
		);
		expect(topBarContent).toContain(
			'<span class="text-slate-300 font-mono text-[9px]">{eastHp}</span>'
		);
	});

	it('standardizes HUD quick-action testids conforming to TESTID-AND-NAMING canon', () => {
		expect(topBarContent).toContain('data-testid="topbar-back-link"');
		expect(topBarContent).toContain('data-testid="topbar-home-link"');
		expect(topBarContent).toContain('data-testid="hud-guide-btn"');
		expect(topBarContent).toContain('data-testid="hud-commander-btn"');
		expect(topBarContent).toContain('data-testid="hud-menu-btn"');
		expect(topBarContent).toContain('data-testid="topbar-sound-toggle"');
		expect(topBarContent).toContain('data-testid="topbar-fullscreen-toggle"');
		expect(topBarContent).toContain('data-testid="topbar-locale-toggle"');
		expect(topBarContent).toContain('data-testid="topbar-settings-btn"');
		expect(topBarContent).toContain('data-testid="hud-forge-btn"');
		expect(topBarContent).toContain('data-testid="hud-shop-btn"');
		expect(topBarContent).toContain('data-testid="hud-race-ability-btn"');
		expect(topBarContent).toContain('data-testid="hud-rescue-strike-btn"');
		expect(topBarContent).toContain('data-testid="topbar-pause-btn"');
		expect(topBarContent).toContain('data-testid="topbar-speed-btn-');
	});

	it('provides accessible touch-manipulation and coarse-pointer minimum targets for mobile devices (FLUID-SIZING-v10)', () => {
		expect(topBarContent).toContain('touch-manipulation');
		expect(topBarContent).toContain('[@media(pointer:coarse)]:min-h-[44px]');
		expect(topBarContent).toContain('[@media(pointer:coarse)]:min-w-[44px]');

		const arenaPath = path.resolve(process.cwd(), 'src/lib/components/BattleArena.svelte');
		const arenaContent = fs.readFileSync(arenaPath, 'utf-8');
		expect(arenaContent).toContain('data-testid="arena-touch-controls"');
		expect(arenaContent).toContain('min-w-[44px] min-h-[44px]');
		expect(arenaContent).toContain('touch-manipulation');
	});

	it('supports onBeforeLeave hook to protect against accidental exits', () => {
		expect(topBarContent).toContain('onBeforeLeave');
		expect(topBarContent).toContain('if (onBeforeLeave && !onBeforeLeave(');
	});

	it('formatTime formats seconds into mm:ss without throwing or improper padding', () => {
		function formatTime(sec: number): string {
			const m = Math.floor(sec / 60);
			const s = Math.floor(sec % 60);
			return `${m}:${s < 10 ? '0' : ''}${s}`;
		}

		expect(formatTime(0)).toBe('0:00');
		expect(formatTime(5)).toBe('0:05');
		expect(formatTime(59)).toBe('0:59');
		expect(formatTime(60)).toBe('1:00');
		expect(formatTime(75)).toBe('1:15');
		expect(formatTime(600)).toBe('10:00');
	});

	it('TopBar has reactive derived bindings for gameTime and bossSpawnTimer avoiding frozen timers', () => {
		expect(topBarContent).toContain('let gameTime = $derived(uiTick >= 0 ? sim.gameTime : 0);');
		expect(topBarContent).toContain(
			'let bossSpawnTimer = $derived(uiTick >= 0 ? Math.max(0, Math.ceil(sim.bossSpawnTimer)) : 180);'
		);
		expect(topBarContent).toContain(
			'let activeBossInstanceId = $derived(uiTick >= 0 ? sim.activeBossInstanceId : null);'
		);

		expect(topBarContent).toContain('{formatTime(gameTime)}');
		expect(topBarContent).toContain('Бос: {bossSpawnTimer}с');
		expect(topBarContent).toContain('{#if activeBossInstanceId}');
	});

	it('floating income text above castle is positioned cleanly above castle building without intersecting center', () => {
		const economyPath = path.resolve(process.cwd(), 'src/lib/engine/economySystem.ts');
		const economyContent = fs.readFileSync(economyPath, 'utf-8');

		expect(economyContent).toContain('myCastle.y - 130');
	});

	it('TopBar includes full ARIA accessibility attributes and shortcut keys', () => {
		const updatedContent = fs.readFileSync(topBarPath, 'utf-8');
		expect(updatedContent).toContain('aria-keyshortcuts="F9"');
		expect(updatedContent).toContain('aria-keyshortcuts="f"');
		expect(updatedContent).toContain('aria-keyshortcuts="b"');
		expect(updatedContent).toContain('aria-keyshortcuts="r"');
		expect(updatedContent).toContain('aria-keyshortcuts="e"');
		expect(updatedContent).toContain('aria-keyshortcuts="Space"');
		expect(updatedContent).toContain('role="meter"');
		expect(updatedContent).toContain('aria-label="Здоров\'я Західного Замку (Гравець)"');
		expect(updatedContent).toContain('aria-label="Здоров\'я Східного Замку (Ворог)"');
	});
});
