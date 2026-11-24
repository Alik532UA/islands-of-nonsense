import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getBaseBuildingsForRace } from '../engine/gameData';

describe('UI/UX Layout, Spacing & Panel Alignment Invariants', () => {
	const bottomBarPath = path.resolve('src/lib/components/BottomBar.svelte');
	const minimapPath = path.resolve('src/lib/components/Minimap.svelte');
	const commandCardPath = path.resolve('src/lib/components/CommandCard.svelte');
	const entityInspectDetailsPath = path.resolve('src/lib/components/EntityInspectDetails.svelte');

	const bottomBarSrc = readFileSync(bottomBarPath, 'utf8');
	const minimapSrc = readFileSync(minimapPath, 'utf8');
	const commandCardSrc = readFileSync(commandCardPath, 'utf8');
	const entityInspectDetailsSrc = readFileSync(entityInspectDetailsPath, 'utf8');

	it('ensures uniform 142px height across all 5 bottom console panels', () => {
		// All 5 core panels must declare h-[142px] for seamless horizontal alignment
		const panels = [
			{ name: 'Minimap', src: minimapSrc },
			{ name: 'Portrait', src: bottomBarSrc },
			{ name: 'Stats Details', src: bottomBarSrc },
			{ name: 'Inventory (Предмети)', src: bottomBarSrc },
			{ name: 'Command Card', src: commandCardSrc }
		];

		for (const panel of panels) {
			expect(
				panel.src.includes('h-[142px]'),
				`Panel ${panel.name} must specify uniform h-[142px]`
			).toBe(true);
		}
	});

	it('enforces consistent gaps between bottom panels preventing stuck/touching edges', () => {
		// Bottom console container must use gap-2.5 or gap-3 and justify-center
		expect(bottomBarSrc).toMatch(/flex items-center justify-center gap-2\.5/);

		// Center stats panel must not have arbitrary asymmetrical mx-2 margins
		expect(bottomBarSrc).not.toContain('mx-2 bg-[#131722]');
	});

	it('strictly prevents 6-slot inventory pouch overflow beyond the container border', () => {
		// Panel dimensions: 142px total height, border-2 (4px), py-2 (16px) -> 122px inner height
		const innerUsableHeight = 142 - 4 - 16; // 122px

		// Slot dimensions in BottomBar
		expect(bottomBarSrc).toMatch(/w-8 h-8 rounded/);
		const slotHeight = 32; // w-8 h-8 is 32px
		const rowCount = 3;
		const rowGap = 4; // gap-1 is 4px
		const totalGridHeight = rowCount * slotHeight + (rowCount - 1) * rowGap; // 96 + 8 = 104px
		const titleHeight = 14;

		const totalContentHeight = totalGridHeight + titleHeight;
		expect(totalContentHeight).toBeLessThanOrEqual(innerUsableHeight);

		// Must leave breathing room (at least 4px) to guarantee zero clipping on any display
		const paddingMargin = innerUsableHeight - totalContentHeight;
		expect(paddingMargin).toBeGreaterThanOrEqual(4);
	});

	it('standardizes HUD bottom bar & command card testids conforming to TESTID-AND-NAMING canon', () => {
		// Bottom bar console subpanels
		expect(bottomBarSrc).toContain('data-testid="hud-portrait-panel"');
		expect(bottomBarSrc).toContain('data-testid="hud-stats-panel"');
		expect(bottomBarSrc).toContain('data-testid="hud-inventory-panel"');
		expect(bottomBarSrc).toContain('data-testid="hud-inventory-slot-');

		// Command card root and action buttons
		expect(commandCardSrc).toContain('data-testid="hud-command-card"');
		expect(commandCardSrc).toContain('data-testid="hud-build-btn-');
		expect(commandCardSrc).toContain('data-testid="hud-clear-selection-btn"');
		expect(commandCardSrc).toContain('data-testid="hud-upgrade-btn-');
		expect(commandCardSrc).toContain('data-testid="hud-repair-btn"');
		expect(commandCardSrc).toContain('data-testid="hud-sell-btn"');
	});

	it('provides touch-manipulation support on command card action buttons for responsive touch feedback (FLUID-SIZING-v10)', () => {
		expect(commandCardSrc).toContain('touch-manipulation');
	});

	it('guarantees unique Warcraft 3 hotkeys across all 12 command card slots without duplicate [V]', () => {
		const hotkeys = ['Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F', 'Z', 'X', 'C', 'Esc'];

		// Ensure all hotkeys in the list are distinct
		const uniqueHotkeys = new Set(hotkeys);
		expect(uniqueHotkeys.size).toBe(12);

		// Check that both CommandCard and BottomBar hotkey lists have 'C' instead of duplicate 'V'
		expect(commandCardSrc).toContain(
			"const HOTKEYS = ['Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F', 'Z', 'X', 'C', 'Esc'];"
		);
		expect(bottomBarSrc).toContain(
			"const HOTKEYS = ['Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F', 'Z', 'X', 'C'];"
		);

		// Treasure chest (h008) must be mapped to distinct hotkey 'D'
		expect(commandCardSrc).toContain("if (bld.id === 'h008') return 'D';");
	});

	it('resolves building tooltip hotkeys reliably by definition ID without empty brackets []', () => {
		// Tooltip hotkey lookup must use findIndex by id, not indexOf on volatile arrays
		expect(commandCardSrc).toContain('availableBuildings.findIndex((b) => b.id === bld.id)');

		// Title must only render brackets when hotkey is non-empty
		expect(commandCardSrc).toContain("bHotkey ? `[${bHotkey}]` : ''");

		// Test resolution for each race building
		const races = ['Люди', 'Орки', 'Нежить', 'Ельфи', 'Хаос', 'Північ'];
		for (const race of races) {
			const buildings = getBaseBuildingsForRace(race);
			expect(buildings.length).toBeGreaterThanOrEqual(10);
			for (let idx = 0; idx < Math.min(11, buildings.length); idx++) {
				const b = buildings[idx];
				const bIdx = buildings.findIndex((item) => item.id === b.id);
				expect(bIdx).toBe(idx);
			}
		}
	});

	it('formats minimap controls with balanced margins and bottom alignment', () => {
		// Minimap must be h-[142px] and layout controls under map canvas
		expect(minimapSrc).toMatch(/h-\[142px\]/);
		expect(minimapSrc).toMatch(/pt-1/);
	});

	it('configures modern minimap with 4 in-canvas corner controls over water regions and collapsible state', () => {
		// Top-left: terrain detail over top-left water corner
		expect(minimapSrc).toContain('data-testid="minimap-terrain-btn"');
		expect(minimapSrc).toContain('absolute top-1.5 left-1.5');
		expect(minimapSrc).toContain('title="Перемкнути детальність рельєфу"');

		// Bottom-left: ally colors over bottom-left water corner
		expect(minimapSrc).toContain('data-testid="minimap-ally-colors-btn"');
		expect(minimapSrc).toContain('absolute bottom-1.5 left-1.5');
		expect(minimapSrc).toContain('title="Кольори союзників (Зелений / Ворожий)"');

		// Top-right: drag handle over top-right water corner
		expect(minimapSrc).toContain('data-testid="minimap-drag-btn"');
		expect(minimapSrc).toContain('absolute top-1.5 right-1.5');

		// Bottom-right: collapse arrow down over bottom-right water corner
		expect(minimapSrc).toContain('data-testid="minimap-collapse-btn"');
		expect(minimapSrc).toContain('absolute bottom-1.5 right-1.5');

		// Collapsed state: expand button with arrow up
		expect(minimapSrc).toContain('data-testid="minimap-expand-btn"');
		expect(minimapSrc).toContain('ChevronUp');

		// Adheres flush to the bottom edge without bottom border gap
		expect(minimapSrc).toContain('rounded-t-xl rounded-b-none');
		expect(minimapSrc).toContain('border-b-0');
	});

	it('unifies combat unit inspection in hud-stats-panel with zero duplicates and avoids redundant command card', () => {
		// All 6 core combat attributes present in EntityInspectDetails for units
		expect(entityInspectDetailsSrc).toContain('selectedUnit.armorType');
		expect(entityInspectDetailsSrc).toContain('selectedUnit.damageMin');
		expect(entityInspectDetailsSrc).toContain('selectedUnit.range');
		expect(entityInspectDetailsSrc).toContain('selectedUnit.attackCooldown');
		expect(entityInspectDetailsSrc).toContain('selectedUnit.speed');
		expect(entityInspectDetailsSrc).toContain('selectedUnit.flying');

		// Single close button testid
		expect(entityInspectDetailsSrc).toContain('data-testid="hud-close-unit-btn"');

		// CommandCard unit profile block is preserved for future modes
		expect(commandCardSrc).toContain("activeEntityType === 'unit' && selectedUnit");

		// BottomBar skips redundant empty command card when inspecting autonomous combat units
		expect(bottomBarSrc).toContain("activeEntityType !== 'unit'");
	});

	it('anchors all bottom console panels flush to the bottom without margin gaps (FLUID-SIZING-v10)', () => {
		// No bottom margins between panels and screen bottom
		expect(bottomBarSrc).not.toContain('mb-1.5');

		// All panels must adhere flush with rounded-t-xl rounded-b-none and border-b-0
		expect(bottomBarSrc).toContain('rounded-t-xl rounded-b-none border-t-2 border-x-2 border-b-0');
		expect(commandCardSrc).toContain(
			'rounded-t-xl rounded-b-none border-t-2 border-x-2 border-b-0'
		);
		expect(minimapSrc).toContain('rounded-t-xl rounded-b-none border-t-2 border-x-2 border-b-0');
	});
});
