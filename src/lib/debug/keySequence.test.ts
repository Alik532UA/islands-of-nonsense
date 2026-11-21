// src/lib/debug/keySequence.test.ts — лише коли збір логів із пристроїв (DEBUGGING § 3)
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createKeySequence, listenForSequences, type KeyStroke } from './keySequence';

/** Натискання латинської літери; `null` — клавіша без літери (модифікатор). */
const press = (letter: string | null = 'v', extra: Partial<KeyStroke> = {}): KeyStroke => ({
	letter,
	code: letter ? `Key${letter.toUpperCase()}` : 'ShiftLeft',
	...extra
});

describe('серія натискань (DEBUGGING § 3.2)', () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('поріг набирається серією і скидає лічильник', () => {
		const onComplete = vi.fn();
		const sequence = createKeySequence({ letter: 'v', threshold: 3, onComplete });
		expect([1, 2, 3].map(() => sequence.handle(press()))).toEqual([false, false, true]);
		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(sequence.count).toBe(0);
	});

	it('автоповтор не рахується: затиснута клавіша — одне натискання', () => {
		const onComplete = vi.fn();
		const sequence = createKeySequence({ letter: 'r', threshold: 3, onComplete });
		sequence.handle(press('r'));
		for (let i = 0; i < 50; i++) sequence.handle(press('r', { repeat: true }));
		expect(onComplete).not.toHaveBeenCalled();
		expect(sequence.count).toBe(1);
	});

	it('натискання в полі вводу не рахується і не скидає', () => {
		const sequence = createKeySequence({ letter: 'v', threshold: 5, onComplete: vi.fn() });
		const field = {
			closest: (selector: string) => (selector.includes('contenteditable') ? {} : null)
		} as unknown as EventTarget;
		sequence.handle(press());
		sequence.handle(press('v', { target: field }));
		expect(sequence.count).toBe(1);
	});

	it('пауза довша за вікно скидає серію', () => {
		vi.useFakeTimers();
		const sequence = createKeySequence({
			letter: 'v',
			threshold: 5,
			windowMs: 2000,
			onComplete: vi.fn()
		});
		sequence.handle(press());
		sequence.handle(press());
		vi.advanceTimersByTime(2001);
		expect(sequence.count).toBe(0);
	});

	it('інша клавіша й сполучення з Ctrl скидають, сам модифікатор — ні', () => {
		const sequence = createKeySequence({ letter: 'v', threshold: 5, onComplete: vi.fn() });
		sequence.handle(press());
		sequence.handle(press(null));
		expect(sequence.count, 'Shift перед великою V не скидає серію').toBe(1);
		sequence.handle(press('v', { ctrlKey: true }));
		expect(sequence.count, 'Ctrl+V — вставлення, а не жест').toBe(0);
		sequence.handle(press());
		sequence.handle(press('b'));
		expect(sequence.count).toBe(0);
	});

	it('поріг-функція читається на кожне натискання', () => {
		let shown = false;
		const onComplete = vi.fn(() => (shown = !shown));
		const sequence = createKeySequence({
			letter: 'v',
			threshold: () => (shown ? 2 : 4),
			onComplete
		});
		for (let i = 0; i < 6; i++) sequence.handle(press());
		expect(onComplete, 'увімкнути — 4, вимкнути — 2').toHaveBeenCalledTimes(2);
	});

	it('reset() знімає і таймер', () => {
		vi.useFakeTimers();
		const sequence = createKeySequence({ letter: 'v', threshold: 5, onComplete: vi.fn() });
		sequence.handle(press());
		sequence.reset();
		expect(vi.getTimerCount()).toBe(0);
	});

	it('обробник гасить клавішу, що завершила серію, а зняття прибирає слухача й таймери', () => {
		vi.useFakeTimers();
		const target = new EventTarget();
		vi.stubGlobal('window', target);
		const keydown = (key: string, code: string) =>
			Object.assign(new Event('keydown', { cancelable: true }), {
				key,
				code,
				repeat: false,
				ctrlKey: false,
				altKey: false,
				metaKey: false
			});
		const onComplete = vi.fn();
		const stop = listenForSequences(createKeySequence({ letter: 'v', threshold: 2, onComplete }));

		// Кирилична розкладка: фізична V дає «м», і жест однаково набирається (HOTKEYS § 1.3).
		const first = keydown('м', 'KeyV');
		const second = keydown('v', 'KeyV');
		target.dispatchEvent(first);
		target.dispatchEvent(second);
		expect([first.defaultPrevented, second.defaultPrevented]).toEqual([false, true]);
		expect(onComplete, 'на кирилиці жест однаково набирається').toHaveBeenCalledTimes(1);

		target.dispatchEvent(keydown('v', 'KeyV'));
		stop();
		expect(vi.getTimerCount(), 'таймер серії пережив зняття').toBe(0);
		target.dispatchEvent(keydown('v', 'KeyV'));
		target.dispatchEvent(keydown('v', 'KeyV'));
		expect(onComplete, 'після зняття обробник мовчить').toHaveBeenCalledTimes(1);
	});
});
