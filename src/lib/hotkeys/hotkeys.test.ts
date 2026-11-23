// src/lib/hotkeys/hotkeys.test.ts
import { describe, it, expect } from 'vitest';
import { shortcutLetter, shortcutDigit, isEditableTarget } from './hotkeys';

describe('hotkeys: layout-independent keyboard shortcuts', () => {
	function createKeyEvent(key: string, code: string): KeyboardEvent {
		return {
			key,
			code
		} as unknown as KeyboardEvent;
	}

	it('reads English letters regardless of case', () => {
		expect(shortcutLetter(createKeyEvent('q', 'KeyQ'))).toBe('q');
		expect(shortcutLetter(createKeyEvent('Q', 'KeyQ'))).toBe('q');
		expect(shortcutLetter(createKeyEvent('f', 'KeyF'))).toBe('f');
		expect(shortcutLetter(createKeyEvent('L', 'KeyL'))).toBe('l');
	});

	it('reads Ukrainian layout letters via event.code fallback', () => {
		// Ukrainian Cyrillic keys on physical QWERTY positions
		expect(shortcutLetter(createKeyEvent('й', 'KeyQ')), 'й -> q').toBe('q');
		expect(shortcutLetter(createKeyEvent('Й', 'KeyQ')), 'Й -> q').toBe('q');
		expect(shortcutLetter(createKeyEvent('ц', 'KeyW')), 'ц -> w').toBe('w');
		expect(shortcutLetter(createKeyEvent('у', 'KeyE')), 'у -> e').toBe('e');
		expect(shortcutLetter(createKeyEvent('к', 'KeyR')), 'к -> r').toBe('r');
		expect(shortcutLetter(createKeyEvent('а', 'KeyF')), 'а -> f').toBe('f');
		expect(shortcutLetter(createKeyEvent('с', 'KeyC')), 'с -> c').toBe('c');
		expect(shortcutLetter(createKeyEvent('и', 'KeyB')), 'и -> b').toBe('b');
		expect(shortcutLetter(createKeyEvent('д', 'KeyL')), 'д -> l (5x L log)').toBe('l');
		expect(shortcutLetter(createKeyEvent('м', 'KeyV')), 'м -> v').toBe('v');
	});

	it('returns null for non-letter keys', () => {
		expect(shortcutLetter(createKeyEvent(' ', 'Space'))).toBeNull();
		expect(shortcutLetter(createKeyEvent('Escape', 'Escape'))).toBeNull();
		expect(shortcutLetter(createKeyEvent('F9', 'F9'))).toBeNull();
		expect(shortcutLetter(createKeyEvent('ArrowLeft', 'ArrowLeft'))).toBeNull();
	});

	it('reads digits 0-9 from event.key and event.code', () => {
		expect(shortcutDigit(createKeyEvent('1', 'Digit1'))).toBe(1);
		expect(shortcutDigit(createKeyEvent('5', 'Digit5'))).toBe(5);
		expect(shortcutDigit(createKeyEvent('&', 'Digit1')), 'AZERTY shifted digit').toBe(1);
		expect(shortcutDigit(createKeyEvent('3', 'Numpad3'))).toBe(3);
		expect(shortcutDigit(createKeyEvent('q', 'KeyQ'))).toBeNull();
		expect(shortcutDigit(createKeyEvent('Escape', 'Escape'))).toBeNull();
	});

	it('correctly identifies editable targets', () => {
		const inputEl = {
			closest: (sel: string) => (sel.includes('input') ? {} : null)
		};
		const divEl = {
			closest: () => null
		};

		expect(isEditableTarget(inputEl as unknown as EventTarget)).toBe(true);
		expect(isEditableTarget(divEl as unknown as EventTarget)).toBe(false);
		expect(isEditableTarget(null)).toBe(false);
	});
});
