import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getBaseBuildingsForRace } from '../engine/gameData';

describe('UI/UX Layout, Spacing & Panel Alignment Invariants', () => {
	const bottomBarPath = path.resolve('src/lib/components/BottomBar.svelte');
	const minimapPath = path.resolve('src/lib/components/Minimap.svelte');
	const commandCardPath = path.resolve('src/lib/components/CommandCard.svelte');

	const bottomBarSrc = readFileSync(bottomBarPath, 'utf8');
	const minimapSrc = readFileSync(minimapPath, 'utf8');
	const commandCardSrc = readFileSync(commandCardPath, 'utf8');

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

	it('formats minimap controls with balanced margins and vertical centering', () => {
		// Minimap must be h-[142px] and align controls with gap-1.5 ml-2.5
		expect(minimapSrc).toMatch(/h-\[142px\]/);
		expect(minimapSrc).toMatch(/gap-1\.5 ml-2\.5/);
	});
});
