/**
 * Toast Notifications Controller (NOTIFICATIONS.md v10).
 * Manages toast queue, automatic timers, pause on hover/focus, and actions.
 */

export type ToastType = 'success' | 'error' | 'warn' | 'info';

export interface ToastAction {
	label: string;
	run: () => void;
}

export interface ToastOptions {
	/** Milliseconds before auto-dismissal. 0 means persistent until closed. */
	duration?: number;
	action?: ToastAction;
	urgent?: boolean;
}

export interface ToastItem {
	id: number;
	type: ToastType;
	message: string;
	duration: number;
	remaining: number;
	paused: boolean;
	holds: number;
	action?: ToastAction;
	urgent?: boolean;
	startTime: number;
}

const DEFAULT_DURATIONS: Record<ToastType, number> = {
	info: 3000,
	success: 4000,
	warn: 5000,
	error: 7000
};

const MAX_TOASTS = 5;

export class ToastController {
	private nextId = 1;
	items = $state<ToastItem[]>([]);
	private timers = new Map<number, ReturnType<typeof setTimeout>>();

	show(type: ToastType, message: string, options?: ToastOptions): number {
		const id = this.nextId++;
		const duration = options?.action
			? 0 // Actions do not auto-dismiss by canon
			: options?.duration !== undefined
				? options.duration
				: DEFAULT_DURATIONS[type];

		const item: ToastItem = {
			id,
			type,
			message,
			duration,
			remaining: duration,
			paused: false,
			holds: 0,
			action: options?.action,
			urgent: options?.urgent ?? type === 'error',
			startTime: Date.now()
		};

		// Enforce MAX_TOASTS limit by evicting oldest auto-dismissable toast
		if (this.items.length >= MAX_TOASTS) {
			const evictIdx = this.items.findIndex((t) => t.duration > 0 && !t.paused);
			if (evictIdx !== -1) {
				const evicted = this.items[evictIdx];
				this.dismiss(evicted.id);
			}
		}

		this.items = [...this.items, item];

		if (duration > 0) {
			this.startTimer(id, duration);
		}

		return id;
	}

	success(message: string, options?: ToastOptions): number {
		return this.show('success', message, options);
	}

	error(message: string, options?: ToastOptions): number {
		return this.show('error', message, options);
	}

	warn(message: string, options?: ToastOptions): number {
		return this.show('warn', message, options);
	}

	info(message: string, options?: ToastOptions): number {
		return this.show('info', message, options);
	}

	dismiss(id: number) {
		this.clearTimer(id);
		this.items = this.items.filter((item) => item.id !== id);
	}

	pause(id: number) {
		const item = this.items.find((t) => t.id === id);
		if (!item || item.duration === 0) return;

		item.holds += 1;
		if (item.paused) return;

		this.clearTimer(id);
		const elapsed = Date.now() - item.startTime;
		item.remaining = Math.max(0, item.remaining - elapsed);
		item.paused = true;
	}

	resume(id: number) {
		const item = this.items.find((t) => t.id === id);
		if (!item || item.duration === 0 || item.holds === 0) return;

		item.holds -= 1;
		if (item.holds > 0) return;

		item.paused = false;
		item.startTime = Date.now();
		if (item.remaining > 0) {
			this.startTimer(id, item.remaining);
		} else {
			this.dismiss(id);
		}
	}

	elapsed(id: number): number {
		const item = this.items.find((t) => t.id === id);
		if (!item) return 0;
		if (item.duration === 0) return 0;
		if (item.paused) {
			return Math.min(item.duration, Math.max(0, item.duration - item.remaining));
		}
		const currentElapsed = item.duration - item.remaining + (Date.now() - item.startTime);
		return Math.min(item.duration, Math.max(0, currentElapsed));
	}

	clear() {
		for (const id of this.timers.keys()) {
			this.clearTimer(id);
		}
		this.items = [];
	}

	private startTimer(id: number, delayMs: number) {
		this.clearTimer(id);
		const timer = setTimeout(() => {
			this.dismiss(id);
		}, delayMs);
		this.timers.set(id, timer);
	}

	private clearTimer(id: number) {
		const timer = this.timers.get(id);
		if (timer) {
			clearTimeout(timer);
			this.timers.delete(id);
		}
	}
}

export const toast = new ToastController();
