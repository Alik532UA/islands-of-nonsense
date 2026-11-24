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
});
