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

	it('strictly prevents 6-slot inventory pouch overflow beyond the container border while maximizing slot size', () => {
		// Panel dimensions: 142px total height, border-t-2 (2px), border-b-0 -> 140px inner height
		const innerUsableHeight = 142 - 2; // 140px

		// Slot dimensions in BottomBar: enlarged to 44x39px with rounded-[3px] matching command card
		expect(bottomBarSrc).toMatch(/w-\[44px\] h-\[39px\] rounded-\[3px\]/);
		const slotHeight = 39;
		const rowCount = 3;
		const rowGap = 6; // gap-1.5 is 6px
		const totalGridHeight = rowCount * slotHeight + (rowCount - 1) * rowGap; // 117 + 12 = 129px

		expect(totalGridHeight).toBeLessThanOrEqual(innerUsableHeight);

		// Must leave breathing room (at least 4px) to guarantee zero clipping on any display
		const verticalBreathingRoom = innerUsableHeight - totalGridHeight; // 11px total (5.5px top/bottom)
		expect(verticalBreathingRoom).toBeGreaterThanOrEqual(4);

		// Width bounds: w-28 (112px) with border-x-2 (4px) leaves 108px usable width
		const innerUsableWidth = 112 - 4; // 108px
		const slotWidth = 44;
		const colCount = 2;
		const colGap = 6;
		const totalGridWidth = colCount * slotWidth + (colCount - 1) * colGap; // 88 + 6 = 94px
		expect(totalGridWidth).toBeLessThanOrEqual(innerUsableWidth);
		const horizontalBreathingRoom = innerUsableWidth - totalGridWidth; // 14px total (7px left/right)
		expect(horizontalBreathingRoom).toBeGreaterThanOrEqual(4);
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
		expect(entityInspectDetailsSrc).toContain('data-testid="hud-close-building-btn"');
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

		// Title renders hotkey directly without brackets
		expect(commandCardSrc).toContain('bHotkey');

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

	it('configures command card buttons with corner badges for hotkey and costs, using SVG icons with zero emojis', () => {
		// Subtle rounded-[3px] border corners (reduced rounding by half)
		expect(commandCardSrc).toContain('rounded-[3px]');

		// Archetype icon in top-left corner (docked to top-0.5 left-0.5 to prevent overlapping centered text)
		expect(commandCardSrc).toContain('absolute top-0.5 left-0.5');

		// Top-right corner hotkey badge without square brackets
		expect(commandCardSrc).toContain('absolute top-0 right-0');
		expect(commandCardSrc).toContain('{hotkey}');
		expect(commandCardSrc).not.toContain('[{hotkey}]');

		// Bottom-left corner gold cost: Coins SVG icon then amount
		expect(commandCardSrc).toContain('absolute bottom-0 left-0');
		expect(commandCardSrc).toContain('name="coins"');
		expect(commandCardSrc).toContain('{effectiveGoldCost}');

		// Bottom-right corner lumber cost: amount then TreePine SVG icon
		expect(commandCardSrc).toContain('absolute bottom-0 right-0');
		expect(commandCardSrc).toContain('name="treePine"');
		expect(commandCardSrc).toContain(
			'<span>{bldLumber}</span>\n\t\t\t\t\t\t\t<UiIcon name="treePine"'
		);

		// Dead-center building name without overlapping badges
		expect(commandCardSrc).toContain('shortenName(bld.name)');
		expect(commandCardSrc).toContain('truncate max-w-[46px]');

		// Redundant Esc Cancel button removed from worker 5x3 grid to prevent 4th-row overflow
		expect(commandCardSrc).not.toContain('data-testid="hud-clear-selection-btn"');
		expect(commandCardSrc).toContain('grid-cols-5 gap-1.5 w-[325px]');

		// Zero emojis in CommandCard and BottomBar
		const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
		expect(commandCardSrc).not.toMatch(emojiRegex);
		expect(bottomBarSrc).not.toMatch(emojiRegex);
	});

	it('formats minimap controls with seamless top alignment and zero dark stripe gaps', () => {
		// Minimap must be h-[142px] and have zero top padding to eliminate any dark border stripe
		expect(minimapSrc).toMatch(/h-\[142px\]/);
		expect(minimapSrc).not.toContain('pt-1');
	});

	it('configures modern minimap with 4 in-canvas corner controls flush in the corners and collapsible state', () => {
		// Top-left: terrain detail flush in top-left corner
		expect(minimapSrc).toContain('data-testid="minimap-terrain-btn"');
		expect(minimapSrc).toContain('absolute top-0 left-0');
		expect(minimapSrc).toContain('title="Перемкнути детальність рельєфу"');

		// Bottom-left: ally colors flush in bottom-left corner
		expect(minimapSrc).toContain('data-testid="minimap-ally-colors-btn"');
		expect(minimapSrc).toContain('absolute bottom-0 left-0');
		expect(minimapSrc).toContain('title="Кольори союзників (Зелений / Ворожий)"');

		// Top-right: drag handle flush in top-right corner
		expect(minimapSrc).toContain('data-testid="minimap-drag-btn"');
		expect(minimapSrc).toContain('absolute top-0 right-0');

		// Bottom-right: collapse arrow down flush in bottom-right corner
		expect(minimapSrc).toContain('data-testid="minimap-collapse-btn"');
		expect(minimapSrc).toContain('absolute bottom-0 right-0');

		// Collapsed state: expand button with arrow up
		expect(minimapSrc).toContain('data-testid="minimap-expand-btn"');
		expect(minimapSrc).toContain('chevronUp');

		// Adheres flush to the bottom edge without bottom border gap
		expect(minimapSrc).toContain('rounded-t-xl rounded-b-none');
		expect(minimapSrc).toContain('border-b-0');
	});

	it('reproduces true 3:1 arena proportions and authentic island geometry on the minimap', () => {
		// Minimap uses exact 3:1 aspect ratio matching 7200x2400 arena
		expect(minimapSrc).toContain('const MAP_WIDTH = 420;');
		expect(minimapSrc).toContain('const MAP_HEIGHT = 140;');
		expect(minimapSrc).toContain('w-[424px]');

		// True procedural island geometry with cape promontories instead of plain circles
		expect(minimapSrc).toContain('createIslandPolygon');
		expect(minimapSrc).toContain('tracePolygon');
		expect(minimapSrc).toContain('westIslandPoly');
		expect(minimapSrc).toContain('eastIslandPoly');

		// Cobblestone fan-out highway network
		expect(minimapSrc).toContain('WEST_ROAD_MERGE_X');
		expect(minimapSrc).toContain('EAST_ROAD_MERGE_X');
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

		// BottomBar skips redundant empty command card when inspecting autonomous combat units or groups
		expect(bottomBarSrc).toContain("activeEntityType !== 'unit'");
		expect(bottomBarSrc).toContain("activeEntityType !== 'group'");
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

	it('configures minimalist worker inspection panel with faction badge, single speed stat, zero text overlap, and hides redundant vital bar', () => {
		// Title and faction badge without square brackets
		expect(entityInspectDetailsSrc).toContain('Будівельник');
		expect(entityInspectDetailsSrc).toContain('formatFactionName');
		expect(entityInspectDetailsSrc).toContain('{formatFactionName(player.race)}');
		expect(entityInspectDetailsSrc).not.toContain('[{formatFactionName(player.race)}]');

		// No pulsing green dot
		expect(entityInspectDetailsSrc).not.toContain('animate-pulse');

		// Compact stats container for worker
		expect(bottomBarSrc).toContain("activeEntityType === 'worker'\n\t\t\t? 'w-40 shrink-0'");

		// Portrait frame expands to 100% of container for worker
		expect(bottomBarSrc).toContain("activeEntityType === 'worker'\n\t\t\t\t? 'w-full h-full'");

		// Inventory header title stripped (self-explanatory slots)
		expect(bottomBarSrc).not.toMatch(/>\s*Предмети\s*<\/span>/);

		// Worker attribute row contains dynamic Speed (WORKER_MOVE_SPEED = 170) with Footprints icon
		expect(entityInspectDetailsSrc).toContain("activeEntityType === 'worker'");
		expect(entityInspectDetailsSrc).toContain('Швидкість:');
		expect(entityInspectDetailsSrc).toContain('WORKER_MOVE_SPEED');

		// Redundant stats removed for worker (zero text collision or overlapping)
		expect(entityInspectDetailsSrc).not.toContain('Неуразливий');
		expect(entityInspectDetailsSrc).not.toContain('Готовий до праці');

		// Route footer stripped for worker
		expect(entityInspectDetailsSrc).not.toContain('Маршрут: Авто');

		// Displays active commander inside builder's hud-stats-panel once selected
		expect(entityInspectDetailsSrc).toContain('data-testid="worker-commander-info"');
		expect(entityInspectDetailsSrc).toContain('findCommander(player.commander)');
		expect(commandCardSrc).toContain("placedBuilding.specialType === 'commander'");
		expect(commandCardSrc).toContain('data-testid="hud-open-commander-btn"');

		// BottomBar hides redundant vital health bar (220/220) for invulnerable worker
		expect(bottomBarSrc).toContain("activeEntityType !== 'worker' && activeEntityType !== 'none'");
		expect(bottomBarSrc).not.toContain('wHp / wMaxHp');
	});

	it('displays canonical owner race via resolveBuildingDisplayRace instead of raw placedBuilding.race', () => {
		expect(bottomBarSrc).toContain('resolveBuildingDisplayRace(');
		expect(bottomBarSrc).not.toContain('{placedBuilding.race}');
	});

	it('adaptively scales and collapses empty side clusters on narrower viewports so panels never clip off-screen', () => {
		expect(bottomBarSrc).toContain('bind:innerWidth={viewportWidth}');
		expect(bottomBarSrc).toContain('bind:clientWidth={contentWidth}');
		expect(bottomBarSrc).toContain('hudScale');
		expect(bottomBarSrc).toContain('transform-origin');
	});

	it('updates placedUnit, availableUpgrades, forge levels, and shop cooldowns reactively with uiTick without re-selecting', () => {
		expect(bottomBarSrc).toMatch(
			/placedUnit\s*=\s*\$derived\(\s*uiTick\s*>=\s*0\s*&&\s*placedBuilding/
		);
		expect(bottomBarSrc).toMatch(
			/availableUpgrades\s*=\s*\$derived\(\s*uiTick\s*>=\s*0\s*&&\s*placedBuilding/
		);
		expect(commandCardSrc).toContain('uiTick >= 0 ? player.forge.attack : 0');
		expect(commandCardSrc).toContain('uiTick >= 0 ? sim.getItemCooldown(player.team, item.id) : 0');
	});

	it('updates placedUnit, availableUpgrades, forge levels, and shop cooldowns reactively with uiTick without re-selecting', () => {
		expect(bottomBarSrc).toMatch(
			/placedUnit\s*=\s*\$derived\(\s*uiTick\s*>=\s*0\s*&&\s*placedBuilding/
		);
		expect(bottomBarSrc).toMatch(
			/availableUpgrades\s*=\s*\$derived\(\s*uiTick\s*>=\s*0\s*&&\s*placedBuilding/
		);
		expect(commandCardSrc).toContain('uiTick >= 0 ? player.forge.attack : 0');
		expect(commandCardSrc).toContain('uiTick >= 0 ? sim.getItemCooldown(player.team, item.id) : 0');
	});
});
