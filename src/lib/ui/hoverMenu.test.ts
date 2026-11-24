import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
	DEFAULT_HOVER_CLOSE_DELAY_MS,
	MENU_STACK_BASE_Z,
	MENU_STACK_MAX_Z,
	MenuLayerStack,
	createHoverMenu
} from './hoverMenu.svelte';

describe('HoverMenuController & MenuLayerStack (UI Stacking + Safe-Zone Cooldown)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('keeps hover menu open for the full 300ms cooldown after pointer leaves and cancels close on re-entry', () => {
		const stack = new MenuLayerStack();
		const menu = createHoverMenu({ closeDelayMs: DEFAULT_HOVER_CLOSE_DELAY_MS, stack });

		menu.handleMouseEnter();
		expect(menu.isOpen).toBe(true);

		menu.handleMouseLeave();
		vi.advanceTimersByTime(299);
		expect(menu.isOpen).toBe(true);

		// Pointer re-enters safe-zone bridge before 300ms expires -> stays open permanently while hovered
		menu.handleMouseEnter();
		vi.advanceTimersByTime(600);
		expect(menu.isOpen).toBe(true);

		// Leaving without returning closes once full 300ms elapses
		menu.handleMouseLeave();
		vi.advanceTimersByTime(299);
		expect(menu.isOpen).toBe(true);
		vi.advanceTimersByTime(1);
		expect(menu.isOpen).toBe(false);
	});

	it('supports hybrid click-pinning: stays open on pointer leave until closeNow() or togglePin()', () => {
		const stack = new MenuLayerStack();
		const menu = createHoverMenu({ stack });

		menu.togglePin();
		expect(menu.isOpen).toBe(true);
		expect(menu.isPinned).toBe(true);

		menu.handleMouseLeave();
		vi.advanceTimersByTime(1000);
		expect(menu.isOpen).toBe(true);

		// Clicking an option calls closeNow()
		menu.closeNow();
		expect(menu.isOpen).toBe(false);
		expect(menu.isPinned).toBe(false);

		// Second toggle unpins immediately
		menu.togglePin();
		expect(menu.isOpen).toBe(true);
		menu.togglePin();
		expect(menu.isOpen).toBe(false);
	});

	it('elevates the most recently opened menu strictly above previously opened menus within bounded modal-safe z-index range', () => {
		const stack = new MenuLayerStack(MENU_STACK_BASE_Z, MENU_STACK_MAX_Z);
		const menuA = createHoverMenu({ stack });
		const menuB = createHoverMenu({ stack });
		const menuC = createHoverMenu({ stack });

		menuA.open();
		menuB.open();
		expect(menuB.zIndex).toBeGreaterThan(menuA.zIndex);

		menuC.open();
		expect(menuC.zIndex).toBeGreaterThan(menuB.zIndex);

		// Reactivating A puts A cleanly on top of B and C
		menuA.handleMouseEnter();
		expect(menuA.zIndex).toBeGreaterThan(menuC.zIndex);
		expect(menuA.zIndex).toBeLessThanOrEqual(MENU_STACK_MAX_Z);
		expect(menuB.zIndex).toBeGreaterThanOrEqual(MENU_STACK_BASE_Z);

		menuA.closeNow();
		menuB.closeNow();
		menuC.closeNow();
		expect(stack.getActiveMenus()).toHaveLength(0);
	});
});

describe('Project-Wide Menu Stacking & Safe-Zone Regression Guards', () => {
	it('TopBar header & speed dropdown stack strictly above BattleArena spectator-bot-switcher and have zero-gap +8px bridge', () => {
		const topBar = fs.readFileSync(
			path.resolve(process.cwd(), 'src/lib/components/TopBar.svelte'),
			'utf-8'
		);
		const arena = fs.readFileSync(
			path.resolve(process.cwd(), 'src/lib/components/BattleArena.svelte'),
			'utf-8'
		);

		expect(arena).toContain('data-testid="spectator-bot-switcher"');
		expect(arena).toContain('z-20');

		// TopBar header baseline z-30 beats z-20 spectator bar, plus dynamic speedMenu.zIndex when open
		expect(topBar).toContain('z-30 pointer-events-none');
		expect(topBar).toContain('style:z-index={speedMenu.isOpen ? speedMenu.zIndex : undefined}');
		expect(topBar).toContain('use:hoverMenuContainer={speedMenu}');
		expect(topBar).toContain('createHoverMenu({ closeDelayMs: 300 })');
		expect(topBar).toContain('pt-2 px-2 pb-2');
		expect(topBar).not.toContain('mt-1 pt-1 opacity-0 pointer-events-none group-hover/speed');
	});

	it('play/+page.svelte mode cards replace unbridged calc(100%+8px) dead gaps with seamless +8px hover aprons and 300ms cooldown', () => {
		const playPage = fs.readFileSync(
			path.resolve(process.cwd(), 'src/routes/play/+page.svelte'),
			'utf-8'
		);

		expect(playPage).not.toContain('bottom-[calc(100%+8px)]');
		expect(playPage).not.toContain('top-[calc(100%+8px)]');
		expect(playPage).toContain('use:hoverMenuContainer={cardMenus.classic}');
		expect(playPage).toContain('use:hoverMenuContainer={cardMenus.sandbox}');
		expect(playPage).toContain('use:hoverMenuContainer={cardMenus.botVsBot}');
		expect(playPage).toContain('use:hoverMenuContainer={cardMenus.custom}');
		expect(playPage).toContain('pb-2 pt-2 px-2');
		expect(playPage).toContain('pt-2 pb-2 px-2');
	});
});
