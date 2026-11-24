/**
 * Shared Hover & Dropdown Menu Coordinator (UI Stacking + Safe-Zone Cooldown)
 *
 * Solves two recurring UI issues across all dropdowns and floating drawers:
 * 1. Z-index stacking: whichever menu was opened/activated last receives the
 *    highest z-index within [MENU_STACK_BASE_Z, MENU_STACK_MAX_Z] so it floats
 *    above sibling menus and HUD bars while staying below full-screen modals (z-40/z-50).
 * 2. Premature hover collapse: adds a configurable close grace cooldown (default 300ms)
 *    so brief cursor excursions across 8px hit-bridges or borders do not snap menus shut,
 *    and supports click-pinning, Escape key, focus-within, and outside pointerdown dismissal.
 */

export const DEFAULT_HOVER_CLOSE_DELAY_MS = 300;
export const SAFE_HOVER_BRIDGE_PX = 8;
export const MENU_STACK_BASE_Z = 31;
export const MENU_STACK_MAX_Z = 39;

/** Tailwind utility fragment for a +8px safe apron bridging trigger & bottom dropdown */
export const SAFE_BOTTOM_DROPDOWN_APRON_CLASS = 'pt-2 px-2 pb-2 -mx-2 -mb-2';
/** Tailwind utility fragment for a +8px safe apron bridging card & top floating action */
export const SAFE_TOP_FLOATER_APRON_CLASS = 'pb-2 pt-2 px-2';
/** Tailwind utility fragment for a +8px safe apron bridging card & bottom drawer */
export const SAFE_BOTTOM_FLOATER_APRON_CLASS = 'pt-2 pb-2 px-2';

export interface HoverMenuOptions {
	/** Grace delay before closing on mouse/focus leave (ms). Default: 300ms */
	closeDelayMs?: number;
	/** Optional base z-index when active (clamped into stack bounds) */
	baseZIndex?: number;
	/** Optional stack group so isolated screens share their own ordering */
	stack?: MenuLayerStack;
}

/**
 * Coordinates stacking order for active menus so the most recently opened menu
 * always paints above previously opened ones without overflowing modal z-indices.
 */
export class MenuLayerStack {
	private activeOrder: HoverMenuController[] = [];
	private readonly baseZ: number;
	private readonly maxZ: number;

	constructor(baseZ = MENU_STACK_BASE_Z, maxZ = MENU_STACK_MAX_Z) {
		this.baseZ = baseZ;
		this.maxZ = Math.max(baseZ + 1, maxZ);
	}

	/** Promote a menu to the top of the open stack and recompute active z-indices. */
	promote(menu: HoverMenuController): void {
		const idx = this.activeOrder.indexOf(menu);
		if (idx !== -1) {
			if (idx === this.activeOrder.length - 1 && menu.zIndex > this.baseZ) {
				return;
			}
			this.activeOrder.splice(idx, 1);
		}
		this.activeOrder.push(menu);
		this.recompute();
	}

	/** Remove a closed menu from the stack and reset its z-index. */
	release(menu: HoverMenuController): void {
		const idx = this.activeOrder.indexOf(menu);
		if (idx !== -1) {
			this.activeOrder.splice(idx, 1);
			this.recompute();
		}
		menu.assignStackZ(this.baseZ - 1);
	}

	/** Ordered snapshot of active controllers (oldest -> newest/topmost). */
	getActiveMenus(): readonly HoverMenuController[] {
		return this.activeOrder;
	}

	private recompute(): void {
		const count = this.activeOrder.length;
		const capacity = this.maxZ - this.baseZ + 1;
		for (let i = 0; i < count; i++) {
			const menu = this.activeOrder[i];
			// Compress older items cleanly if more than `capacity` menus are open simultaneously
			const rankOffset =
				count <= capacity ? i : Math.floor((i * (capacity - 1)) / Math.max(1, count - 1));
			const targetZ = Math.min(this.maxZ, this.baseZ + rankOffset);
			menu.assignStackZ(targetZ);
		}
	}
}

export const sharedMenuStack = new MenuLayerStack(MENU_STACK_BASE_Z, MENU_STACK_MAX_Z);

/**
 * Reactive Svelte 5 Rune controller for hover + click dropdowns and floating panels.
 */
export class HoverMenuController {
	isOpen = $state(false);
	isPinned = $state(false);
	zIndex = $state(MENU_STACK_BASE_Z - 1);

	private isHovered = false;
	private isFocused = false;
	private closeTimer: ReturnType<typeof setTimeout> | null = null;
	private readonly closeDelayMs: number;
	private readonly stack: MenuLayerStack;
	private rootEl: HTMLElement | null = null;

	constructor(options: HoverMenuOptions = {}) {
		this.closeDelayMs = Math.max(0, options.closeDelayMs ?? DEFAULT_HOVER_CLOSE_DELAY_MS);
		this.stack = options.stack ?? sharedMenuStack;
		const initialBase = options.baseZIndex ?? MENU_STACK_BASE_Z - 1;
		this.zIndex = initialBase;
	}

	/** Internal stack callback to assign current reactive stacking rank. */
	assignStackZ(value: number): void {
		this.zIndex = value;
	}

	/** Bind the DOM container element (used by Svelte action / outside-click detection). */
	bindRoot(node: HTMLElement): () => void {
		this.rootEl = node;
		const onPointerDown = (event: PointerEvent) => {
			if (!this.isOpen) return;
			const target = event.target;
			if (target instanceof Node && !node.contains(target)) {
				this.closeNow();
			}
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && this.isOpen) {
				this.closeNow();
			}
		};

		if (typeof window !== 'undefined') {
			window.addEventListener('pointerdown', onPointerDown, true);
			window.addEventListener('keydown', onKeyDown, true);
		}

		return () => {
			if (typeof window !== 'undefined') {
				window.removeEventListener('pointerdown', onPointerDown, true);
				window.removeEventListener('keydown', onKeyDown, true);
			}
			if (this.rootEl === node) {
				this.rootEl = null;
			}
			this.destroy();
		};
	}

	/** Pointer entered the trigger or safe-zone dropdown container. */
	handleMouseEnter(): void {
		this.isHovered = true;
		this.cancelClose();
		this.openAndPromote();
	}

	/** Pointer left the container; wait closeDelayMs before collapsing if not pinned/focused. */
	handleMouseLeave(): void {
		this.isHovered = false;
		this.scheduleClose();
	}

	/** Keyboard focus entered the container. */
	handleFocusIn(): void {
		this.isFocused = true;
		this.cancelClose();
		this.openAndPromote();
	}

	/** Keyboard focus left an element inside the container. */
	handleFocusOut(relatedTarget: EventTarget | null): void {
		if (this.rootEl && relatedTarget instanceof Node && this.rootEl.contains(relatedTarget)) {
			return;
		}
		this.isFocused = false;
		this.scheduleClose();
	}

	/** Click on the menu toggle button: pins open or closes immediately if already pinned. */
	togglePin(): void {
		this.cancelClose();
		if (this.isPinned) {
			this.closeNow();
			return;
		}
		this.isPinned = true;
		this.openAndPromote();
	}

	/** Explicitly open without pinning (e.g., programmatic hover test). */
	open(): void {
		this.cancelClose();
		this.openAndPromote();
	}

	/** Cancel any pending grace close timer. */
	cancelClose(): void {
		if (this.closeTimer !== null) {
			clearTimeout(this.closeTimer);
			this.closeTimer = null;
		}
	}

	/** Schedule closing after closeDelayMs unless pointer re-enters, focus remains, or pinned. */
	scheduleClose(delayMs = this.closeDelayMs): void {
		this.cancelClose();
		if (this.isPinned || this.isHovered || this.isFocused) {
			return;
		}
		if (delayMs <= 0) {
			this.commitClose();
			return;
		}
		this.closeTimer = setTimeout(() => {
			this.closeTimer = null;
			if (!this.isPinned && !this.isHovered && !this.isFocused) {
				this.commitClose();
			}
		}, delayMs);
	}

	/** Immediately close (used on item selection, Escape, outside click, or re-toggle). */
	closeNow(): void {
		this.cancelClose();
		this.isPinned = false;
		this.isHovered = false;
		this.isFocused = false;
		this.commitClose();
	}

	/** Cleanup timers and release stack slot on unmount. */
	destroy(): void {
		this.cancelClose();
		this.stack.release(this);
	}

	private openAndPromote(): void {
		this.isOpen = true;
		this.stack.promote(this);
	}

	private commitClose(): void {
		this.isOpen = false;
		this.stack.release(this);
	}
}

export function createHoverMenu(options: HoverMenuOptions = {}): HoverMenuController {
	return new HoverMenuController(options);
}

/** Svelte action shorthand: `<div use:hoverMenuContainer={menu}>` */
export function hoverMenuContainer(node: HTMLElement, controller: HoverMenuController) {
	const unbindOutside = controller.bindRoot(node);
	const onEnter = () => controller.handleMouseEnter();
	const onLeave = () => controller.handleMouseLeave();
	const onFocusIn = () => controller.handleFocusIn();
	const onFocusOut = (e: FocusEvent) => controller.handleFocusOut(e.relatedTarget);

	node.addEventListener('mouseenter', onEnter);
	node.addEventListener('mouseleave', onLeave);
	node.addEventListener('focusin', onFocusIn);
	node.addEventListener('focusout', onFocusOut);

	return {
		destroy() {
			node.removeEventListener('mouseenter', onEnter);
			node.removeEventListener('mouseleave', onLeave);
			node.removeEventListener('focusin', onFocusIn);
			node.removeEventListener('focusout', onFocusOut);
			unbindOutside();
		}
	};
}
