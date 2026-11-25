import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('RadialMenu & UnitSilhouette Visual Architecture', () => {
	const radialMenuPath = path.resolve('src/lib/components/RadialMenu.svelte');
	const silhouettePath = path.resolve('src/lib/components/ui/UnitSilhouette.svelte');

	const radialMenuSrc = readFileSync(radialMenuPath, 'utf8');
	const silhouetteSrc = readFileSync(silhouettePath, 'utf8');

	it('implements all 7 unit archetypes and 6 structure silhouettes in UnitSilhouette', () => {
		const unitKinds = ['flyer', 'siege', 'caster', 'ranger', 'colossus', 'beast', 'warrior'];
		const buildingKinds = ['shop', 'forge', 'commander', 'chest', 'tower', 'special'];

		for (const kind of [...unitKinds, ...buildingKinds]) {
			expect(
				silhouetteSrc.includes(`'${kind}'`),
				`UnitSilhouette must declare kind '${kind}'`
			).toBe(true);
		}

		// Archetype classification branches matching unitRenderer.ts
		expect(silhouetteSrc).toContain("if (unit.flying) return 'flyer'");
		expect(silhouetteSrc).toContain("if (unit.attack_type === 'siege') return 'siege'");
		expect(silhouetteSrc).toContain("unit.attack_type === 'magic' || hasCasterSpell");
		expect(silhouetteSrc).toContain("unit.attack_type === 'pierce' || (unit.range ?? 0) > 200");
		expect(silhouetteSrc).toContain(
			"unit.armor_type === 'fort' || unit.armor_type === 'large' || unit.hp >= 800"
		);
		expect(silhouetteSrc).toContain("return 'beast'");
		expect(silhouetteSrc).toContain("return 'warrior'");

		// Special structure branches
		expect(silhouetteSrc).toContain("building?.specialType === 'shop'");
		expect(silhouetteSrc).toContain("building?.specialType === 'forge'");
		expect(silhouetteSrc).toContain("building?.specialType === 'commander'");
		expect(silhouetteSrc).toContain(
			"building?.id === 'h008' || building?.specialType === 'treasure'"
		);
		expect(silhouetteSrc).toContain("building?.specialType === 'tower'");
	});

	it('renders UnitSilhouette previews and Coins/TreePine resource badges inside RadialMenu', () => {
		expect(radialMenuSrc).toContain("import UnitSilhouette from './ui/UnitSilhouette.svelte';");
		expect(radialMenuSrc).toContain('<UnitSilhouette');
		expect(radialMenuSrc).toContain('<Coins');
		expect(radialMenuSrc).toContain('<TreePine');
		expect(radialMenuSrc).toContain('isLegendaryBuilding(b)');
		expect(radialMenuSrc).toContain('<Crown');
	});

	it('uses RADIUS >= 230, polar percentage centering, and non-overlapping 8-node geometry', () => {
		const match = radialMenuSrc.match(/const RADIUS = (\d+);/);
		expect(match).not.toBeNull();
		const radius = Number(match![1]);
		expect(radius).toBeGreaterThanOrEqual(230);

		expect(radialMenuSrc).toContain('w-[168px] min-h-[78px]');
		expect(radialMenuSrc).toContain('-translate-x-1/2 -translate-y-1/2');
		expect(radialMenuSrc).not.toContain('-ml-[66px]');
		const cardWidth = 168;
		const cardHeight = 78;
		const count = 8;
		const coords = Array.from({ length: count }, (_, idx) => {
			const angle = (idx / count) * 2 * Math.PI - Math.PI / 2;
			return {
				x: Math.round(Math.cos(angle) * radius),
				y: Math.round(Math.sin(angle) * radius)
			};
		});

		for (let i = 0; i < count; i++) {
			for (let j = i + 1; j < count; j++) {
				const dx = Math.abs(coords[i].x - coords[j].x);
				const dy = Math.abs(coords[i].y - coords[j].y);
				expect(
					dx >= cardWidth || dy >= cardHeight,
					`Radial cards ${i} and ${j} overlap (dx=${dx}, dy=${dy})`
				).toBe(true);
			}
		}
	});

	it('preserves required testids, avoids pill rounded-lg, and provides radial-hover-details inspector', () => {
		expect(radialMenuSrc).toContain('data-testid="radial-menu-overlay"');
		expect(radialMenuSrc).toContain('data-testid="radial-menu"');
		expect(radialMenuSrc).toContain('data-testid="radial-menu-center-hub"');
		expect(radialMenuSrc).toContain('data-testid={`radial-item-${item.id}`}');
		expect(radialMenuSrc).toContain('data-testid="radial-hover-details"');
		expect(radialMenuSrc).not.toContain('rounded-lg');
	});
});
