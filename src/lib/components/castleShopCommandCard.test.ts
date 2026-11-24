import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { CASTLE_ITEMS } from '../engine/items';

describe('Castle Shop Command Card & Reference Parity', () => {
	const commandCardPath = path.resolve('src/lib/components/CommandCard.svelte');
	const refItemsIdsPath = path.resolve('reference/data/items_ids.json');

	const commandCardSrc = fs.readFileSync(commandCardPath, 'utf8');
	const refItemsIds = JSON.parse(fs.readFileSync(refItemsIdsPath, 'utf8')) as Array<{
		id: string;
	}>;

	it('ensures all 11 item IDs from reference/data/items_ids.json exist in CASTLE_ITEMS', () => {
		expect(refItemsIds.length).toBe(11);
		for (const refItem of refItemsIds) {
			expect(
				CASTLE_ITEMS[refItem.id],
				`Item ${refItem.id} from reference must be defined in CASTLE_ITEMS`
			).toBeDefined();
		}
	});

	it('ensures CommandCard does not arbitrarily slice castle items', () => {
		// Must not contain hardcoded slice(0, 3) or slice(0, 4)
		expect(commandCardSrc).not.toMatch(/CASTLE_ITEMS.*slice\(0,\s*selectedCastle/);
		expect(commandCardSrc).not.toContain('.slice(0, 3)');
		expect(commandCardSrc).not.toContain('.slice(0, 4)');
	});

	it('renders all canonical items in the Castle Command Card with interactive buttons', () => {
		for (const _refItem of refItemsIds) {
			expect(
				commandCardSrc.includes('hud-shop-item-btn-'),
				'CommandCard must declare hud-shop-item-btn testids'
			).toBe(true);
		}
		expect(commandCardSrc).toContain('hud-castle-repair-btn');
		expect(commandCardSrc).toContain('hud-repair-bridge-btn');
		expect(commandCardSrc).toContain('hud-close-castle-btn');
	});

	it('displays item tooltips on hover and cooldown timer overlays', () => {
		expect(commandCardSrc).toContain('hoveredItem');
		expect(commandCardSrc).toContain('hoveredItem.nameUk');
		expect(commandCardSrc).toContain('hoveredItem.cost');
		expect(commandCardSrc).toContain('hoveredItem.cooldown');
		expect(commandCardSrc).toContain('hoveredItem.descriptionUk');
		expect(commandCardSrc).toContain('sim.getItemCooldown');
	});
});
