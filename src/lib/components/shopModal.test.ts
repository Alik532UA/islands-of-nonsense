import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('ShopModal Multi-Column Grid & Direct Build UI/UX', () => {
	const shopPath = resolve(process.cwd(), 'src/lib/components/ShopModal.svelte');
	const arenaPath = resolve(process.cwd(), 'src/lib/components/BattleArena.svelte');
	const shopContent = readFileSync(shopPath, 'utf8');
	const arenaContent = readFileSync(arenaPath, 'utf8');

	it('uses widened modal container with 2/3-column responsive grid to eliminate desktop vertical scrolling', () => {
		expect(shopContent).toContain('max-w-5xl');
		expect(shopContent).toContain('grid-cols-1 sm:grid-cols-2 lg:grid-cols-3');
		expect(shopContent).toContain('data-testid="shop-items-grid"');
	});

	it('supports direct Будувати Магазин flow wired to cg10_shop worker placement in BattleArena', () => {
		expect(shopContent).toContain('data-testid="shop-not-built-banner"');
		expect(shopContent).toContain('data-testid="shop-build-btn"');
		expect(shopContent).toContain('onBuildShop');
		expect(shopContent).toContain("BUILDINGS_MAP.get('cg10_shop')");

		expect(arenaContent).toContain('onBuildShop={() => {');
		expect(arenaContent).toContain("selectedBuildingId = 'cg10_shop'");
		expect(arenaContent).toContain('onBuyItem=');
	});
});
