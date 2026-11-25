import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('ForgeModal Game-Style UI/UX & Direct Build Flow', () => {
	const forgePath = resolve(process.cwd(), 'src/lib/components/ForgeModal.svelte');
	const arenaPath = resolve(process.cwd(), 'src/lib/components/BattleArena.svelte');
	const forgeContent = readFileSync(forgePath, 'utf8');
	const arenaContent = readFileSync(arenaPath, 'utf8');

	it('uses game HUD palette (#121622, #8c7456) and SVG resource icons without plain g/w text suffixes', () => {
		expect(forgeContent).toContain('bg-[#121622]');
		expect(forgeContent).toContain('border-[#8c7456]');
		expect(forgeContent).toContain('name="coins"');
		expect(forgeContent).toContain('name="treePine"');
		expect(forgeContent).not.toContain('{attackPrice}g');
		expect(forgeContent).not.toContain('{armorPrice}g');
		expect(forgeContent).not.toContain('{econPrice}g');
	});

	it('provides a direct Будувати Кузню button inside ForgeModal wired to cg11_forge worker placement in BattleArena', () => {
		expect(forgeContent).toContain('data-testid="forge-not-built-banner"');
		expect(forgeContent).toContain('data-testid="forge-build-btn"');
		expect(forgeContent).toContain('onBuildForge');
		expect(forgeContent).toContain("BUILDINGS_MAP.get('cg11_forge')");

		expect(arenaContent).toContain('onBuildForge={() => {');
		expect(arenaContent).toContain("selectedBuildingId = 'cg11_forge'");
		expect(arenaContent).toContain('onUpgradeForge=');
	});

	it('displays segmented RPG upgrade level pips and construction progress banner', () => {
		expect(forgeContent).toContain('data-testid="forge-building-progress"');
		expect(forgeContent).toContain('data-testid="forge-active-banner"');
		expect(forgeContent).toContain('data-testid="forge-upgrade-card-{up.type}"');
		expect(forgeContent).toContain('data-testid="forge-upgrade-btn-{up.type}"');
		expect(forgeContent).toContain('Array.from({ length: up.maxLevel })');
	});
});
