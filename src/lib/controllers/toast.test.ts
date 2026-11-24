import { describe, it, expect, beforeEach, vi } from 'vitest';
import { toast, ToastController } from './toast.svelte';

describe('ToastController (NOTIFICATIONS.md)', () => {
	beforeEach(() => {
		toast.clear();
		vi.useFakeTimers();
	});

	it('adds a success toast with standard 4000ms duration', () => {
		const id = toast.success('Операцію завершено успішно');
		expect(toast.items).toHaveLength(1);
		expect(toast.items[0].id).toBe(id);
		expect(toast.items[0].type).toBe('success');
		expect(toast.items[0].duration).toBe(4000);

		vi.advanceTimersByTime(4000);
		expect(toast.items).toHaveLength(0);
	});

	it('adds an error toast with standard 7000ms duration and urgent flag', () => {
		toast.error('Помилка зʼєднання');
		expect(toast.items).toHaveLength(1);
		expect(toast.items[0].type).toBe('error');
		expect(toast.items[0].duration).toBe(7000);
		expect(toast.items[0].urgent).toBe(true);
	});

	it('pauses countdown on hover and resumes remaining time on leave', () => {
		const id = toast.info('Інформаційне повідомлення', { duration: 3000 });
		vi.advanceTimersByTime(1000);

		toast.pause(id);
		expect(toast.items[0].paused).toBe(true);
		expect(toast.items[0].remaining).toBeLessThanOrEqual(2000);

		// Advance time while paused: should not dismiss
		vi.advanceTimersByTime(5000);
		expect(toast.items).toHaveLength(1);

		toast.resume(id);
		expect(toast.items[0].paused).toBe(false);

		// Advance remaining time
		vi.advanceTimersByTime(2000);
		expect(toast.items).toHaveLength(0);
	});

	it('toasts with action do not auto-dismiss', () => {
		const run = vi.fn();
		toast.info('Оновлення доступне', {
			action: { label: 'Оновити', run }
		});

		expect(toast.items[0].duration).toBe(0);
		vi.advanceTimersByTime(20000);
		expect(toast.items).toHaveLength(1);

		toast.items[0].action?.run();
		expect(run).toHaveBeenCalledOnce();
	});

	it('manual dismiss immediately removes toast', () => {
		const id = toast.warn('Увага');
		expect(toast.items).toHaveLength(1);
		toast.dismiss(id);
		expect(toast.items).toHaveLength(0);
	});

	it('supports multiple holds (hover and focus) preventing premature unpause', () => {
		const id = toast.info('Сповіщення з мульти-утриманням', { duration: 4000 });
		vi.advanceTimersByTime(1000);

		// First hold (e.g. mouseenter)
		toast.pause(id);
		expect(toast.items[0].holds).toBe(1);
		expect(toast.items[0].paused).toBe(true);

		// Second hold (e.g. focusin)
		toast.pause(id);
		expect(toast.items[0].holds).toBe(2);
		expect(toast.items[0].paused).toBe(true);

		// First release (e.g. mouseleave): must stay paused because focus is still active
		toast.resume(id);
		expect(toast.items[0].holds).toBe(1);
		expect(toast.items[0].paused).toBe(true);

		vi.advanceTimersByTime(5000);
		expect(toast.items).toHaveLength(1);

		// Second release (e.g. focusout): now actually resumes
		toast.resume(id);
		expect(toast.items[0].holds).toBe(0);
		expect(toast.items[0].paused).toBe(false);

		vi.advanceTimersByTime(3000);
		expect(toast.items).toHaveLength(0);
	});

	it('calculates elapsed time accurately for progress bar animation', () => {
		const id = toast.success('Збережено', { duration: 5000 });
		expect(toast.elapsed(id)).toBe(0);

		vi.advanceTimersByTime(2000);
		const elapsedMid = toast.elapsed(id);
		expect(elapsedMid).toBeGreaterThanOrEqual(1990);
		expect(elapsedMid).toBeLessThanOrEqual(2100);

		// While paused, elapsed reflects frozen lived time
		toast.pause(id);
		const elapsedPaused = toast.elapsed(id);
		expect(elapsedPaused).toBe(elapsedMid);

		vi.advanceTimersByTime(3000);
		expect(toast.elapsed(id)).toBe(elapsedPaused);

		toast.resume(id);
		vi.advanceTimersByTime(1000);
		const elapsedAfter = toast.elapsed(id);
		expect(elapsedAfter).toBeGreaterThanOrEqual(2990);
	});
});
