import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

function collectSvelteFiles(dir: string): string[] {
	const results: string[] = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...collectSvelteFiles(fullPath));
		} else if (entry.isFile() && entry.name.endsWith('.svelte')) {
			results.push(fullPath);
		}
	}
	return results;
}

describe('HOTKEY-UNIQUENESS: No single key triggers two different actions', () => {
	it('has zero duplicate static aria-keyshortcuts across all Svelte HUD components', () => {
		const srcRoot = path.resolve('src');
		const svelteFiles = collectSvelteFiles(srcRoot);
		const seen = new Map<string, string[]>();
		const regex = /aria-keyshortcuts="([^"]+)"/g;

		for (const filePath of svelteFiles) {
			const relPath = path.relative(srcRoot, filePath).replace(/\\/g, '/');
			const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
			for (let idx = 0; idx < lines.length; idx++) {
				regex.lastIndex = 0;
				let match: RegExpExecArray | null;
				while ((match = regex.exec(lines[idx])) !== null) {
					const key = match[1].toLowerCase();
					const loc = `${relPath}:${idx + 1}`;
					const list = seen.get(key) ?? [];
					list.push(loc);
					seen.set(key, list);
				}
			}
		}

		const duplicates = [...seen.entries()]
			.filter(([, locs]) => locs.length > 1)
			.map(([key, locs]) => `${key} -> [${locs.join(', ')}]`);

		expect(duplicates).toEqual([]);
	});

	it('assigns unique hotkeys to all side-dock quick buttons (no E/R/F collisions)', () => {
		const arenaSrc = fs.readFileSync(path.resolve('src/lib/components/BattleArena.svelte'), 'utf8');

		// Every quick-focus & game-actions button must map to a distinct key
		const expectedBindings: Array<[string, string]> = [
			['hud-race-ability-btn', 'z'],
			['hud-rescue-strike-btn', 'x'],
			['hud-quick-blink-btn', 'f'],
			['hud-commander-btn', 'c'],
			['hud-forge-btn', 'k'],
			['hud-shop-btn', 'b']
		];

		const keys = new Set<string>();
		for (const [testId, key] of expectedBindings) {
			const idx = arenaSrc.indexOf(`data-testid="${testId}"`);
			expect(idx).toBeGreaterThan(-1);
			const slice = arenaSrc.slice(idx, idx + 450);
			expect(slice).toContain(`aria-keyshortcuts="${key}"`);
			expect(keys.has(key)).toBe(false);
			keys.add(key);
		}

		// Quick build flyouts use E (army) and R (special), cannon quick shots use T (500px) and G (1500px)
		expect(arenaSrc).toContain("key: 'army'");
		expect(arenaSrc).toContain("hotkey: 'E'");
		expect(arenaSrc).toContain("key: 'special'");
		expect(arenaSrc).toContain("hotkey: 'R'");
		expect(arenaSrc).toContain("mode: 'short' as const");
		expect(arenaSrc).toContain("hotkey: 'T'");
		expect(arenaSrc).toContain("mode: 'long' as const");
		expect(arenaSrc).toContain("hotkey: 'G'");
		expect(keys.has('e')).toBe(false);
		expect(keys.has('r')).toBe(false);
		expect(keys.has('t')).toBe(false);
		expect(keys.has('g')).toBe(false);
	});

	it('assigns F exclusively to Worker Teleport, K to Forge, Z to Race Skill, X to Rescue Strike in BattleArena', () => {
		const arenaSrc = fs.readFileSync(path.resolve('src/lib/components/BattleArena.svelte'), 'utf8');

		// F must only trigger activateBlinkTargeting, never Forge
		const fHandlerMatch = arenaSrc.match(/letter === 'f'[\s\S]{0,200}/g) ?? [];
		expect(fHandlerMatch.length).toBe(1);
		expect(fHandlerMatch[0]).toContain('activateBlinkTargeting');
		expect(fHandlerMatch[0]).not.toContain("openExclusiveModal('forge'");

		// K must trigger Forge
		const kHandlerMatch = arenaSrc.match(/letter === 'k'[\s\S]{0,160}/g) ?? [];
		expect(kHandlerMatch.length).toBe(1);
		expect(kHandlerMatch[0]).toContain("openExclusiveModal('forge'");

		// Z must trigger Race Skill, X must trigger Rescue Strike
		const zHandlerMatch = arenaSrc.match(/letter === 'z'[\s\S]{0,320}/g) ?? [];
		expect(zHandlerMatch.length).toBe(1);
		expect(zHandlerMatch[0]).toContain('useRaceSkill');

		const xHandlerMatch = arenaSrc.match(/letter === 'x'[\s\S]{0,160}/g) ?? [];
		expect(xHandlerMatch.length).toBe(1);
		expect(xHandlerMatch[0]).toContain('activateRescueStrikeTargeting');

		// E in handleKeydown must only open radial army menu (not Rescue Strike)
		const eMatches = arenaSrc.match(/letter === 'e'/g) ?? [];
		expect(eMatches.length).toBe(1);
	});

	it('prevents BottomBar from hijacking Shop hotkey B', () => {
		const bottomBarSrc = fs.readFileSync(
			path.resolve('src/lib/components/BottomBar.svelte'),
			'utf8'
		);
		expect(bottomBarSrc).not.toContain("letter === 'B'");
	});

	it('has unique shortcut keys in HotkeysHelpModal and documents F=Teleport, K=Forge, Z=Skill, X=Rescue', () => {
		const helpSrc = fs.readFileSync(
			path.resolve('src/lib/components/HotkeysHelpModal.svelte'),
			'utf8'
		);
		const keys = [...helpSrc.matchAll(/\{\s*key:\s*'([^']+)'/g)].map((m) => m[1]);
		expect(keys.length).toBeGreaterThan(10);
		expect(new Set(keys).size).toBe(keys.length);
		expect(helpSrc).toContain("{ key: 'K', desc: 'Кузня");
		expect(helpSrc).toContain("{ key: 'F', desc: 'Телепорт");
		expect(helpSrc).toContain("{ key: 'X', desc: 'Рятівний удар");
		expect(helpSrc).toContain("{ key: 'Z', desc: 'Навичка раси");
	});
});
