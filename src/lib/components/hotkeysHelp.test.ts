import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('HotkeysHelpModal & Arena Ergonomics (UI/UX)', () => {
	const modalPath = resolve(__dirname, './HotkeysHelpModal.svelte');
	const arenaPath = resolve(__dirname, './BattleArena.svelte');

	it('HotkeysHelpModal exists and defines all game hotkeys', () => {
		expect(existsSync(modalPath)).toBe(true);
		const content = readFileSync(modalPath, 'utf8');

		expect(content).toContain('Гарячі клавіші');
		expect(content).toContain('Rescue Strike');
		expect(content).toContain('data-testid="hotkeys-close-btn"');
		expect(content).toContain('1 – 6');
	});

	it('BattleArena integrates floating touch controls for zoom and help', () => {
		expect(existsSync(arenaPath)).toBe(true);
		const content = readFileSync(arenaPath, 'utf8');

		expect(content).toContain('data-testid="arena-zoom-in"');
		expect(content).toContain('data-testid="arena-zoom-out"');
		expect(content).toContain('data-testid="arena-center-base"');
		expect(content).toContain('data-testid="arena-help-btn"');
		expect(content).toContain('HotkeysHelpModal');
	});
});
