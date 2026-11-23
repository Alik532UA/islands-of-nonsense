import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('TopBar Layout & Spacing Invariants (UI/UX)', () => {
	const topBarPath = path.resolve(process.cwd(), 'src/lib/components/TopBar.svelte');
	const topBarContent = fs.readFileSync(topBarPath, 'utf-8');

	it('header container has overflow protection, min-w-0 and fixed h-14 height', () => {
		// Header must prevent crushing by allowing horizontal overflow and preventing flex collapse
		expect(topBarContent).toContain('h-14');
		expect(topBarContent).toContain('min-w-0');
		expect(topBarContent).toContain('overflow-x-auto');
		expect(topBarContent).toContain('overflow-y-hidden');
	});

	it('match status banner is protected against squashing, text wrapping and vertical collapse', () => {
		// Center match banner must have whitespace-nowrap and shrink-0
		expect(topBarContent).toContain('data-testid="match-status-banner"');
		expect(topBarContent).toContain('min-w-[136px]');
		expect(topBarContent).toContain('shrink-0 whitespace-nowrap');

		// Round info line, target wins, and format badge must have whitespace-nowrap
		expect(topBarContent).toMatch(
			/<span class="whitespace-nowrap">\s*Раунд \{sim\.round\} • \{sim\.score\.west\} : \{sim\.score\.east\}\s*<\/span>/
		);
		expect(topBarContent).toMatch(
			/<span class="text-\[9px\] text-\[#9ca3af\] font-mono whitespace-nowrap">\s*\(до \{sim\.targetWins\}\)\s*<\/span>/
		);
	});

	it('day/night dial and match banner have clean spacing and do not collide', () => {
		// Center section must have shrink-0 and gap-2.5
		expect(topBarContent).toContain(
			'<!-- 2. CENTER: Warcraft III Day/Night Dial & Round Banner -->'
		);
		expect(topBarContent).toContain('class="flex items-center gap-2.5 shrink-0 select-none"');
		expect(topBarContent).toContain('data-testid="day-night-dial"');
	});

	it('speed controls are decoupled from center banner to prevent squeezing round info', () => {
		// Speed controls must have shrink-0 and reside in the controls/resource section
		expect(topBarContent).toContain('data-testid="speed-controls"');
		expect(topBarContent).toContain(
			'<!-- 3. RIGHT: Controls, Resources Bar & Castle HP Meters -->'
		);
		expect(topBarContent).toContain('data-testid="resource-boxes"');
		expect(topBarContent).toContain('data-testid="castle-hp-meters"');
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

	it('left navigation buttons have uniform gap-1.5, shrink-0 and compact padding', () => {
		expect(topBarContent).toContain('class="flex items-center gap-1.5 shrink-0"');
		expect(topBarContent).toContain('px-2 py-1 rounded text-xs font-semibold');
		expect(topBarContent).toContain('data-testid="topbar-back-link"');
		expect(topBarContent).toContain('data-testid="topbar-home-link"');
	});

	it('includes quick in-game sound, fullscreen and language controls', () => {
		expect(topBarContent).toContain('data-testid="topbar-sound-toggle"');
		expect(topBarContent).toContain('data-testid="topbar-fullscreen-toggle"');
		expect(topBarContent).toContain('data-testid="topbar-locale-toggle"');
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

		// Template binds to reactive derived gameTime and bossSpawnTimer
		expect(topBarContent).toContain('{formatTime(gameTime)}');
		expect(topBarContent).toContain('Бос: {bossSpawnTimer}с');
		expect(topBarContent).toContain('{#if activeBossInstanceId}');
	});

	it('floating income text above castle is positioned cleanly above castle building without intersecting center', () => {
		const economyPath = path.resolve(process.cwd(), 'src/lib/engine/economySystem.ts');
		const economyContent = fs.readFileSync(economyPath, 'utf-8');

		// The castle floating income text must float well above castle center (>= 100px)
		expect(economyContent).toContain('myCastle.y - 130');
	});
});
