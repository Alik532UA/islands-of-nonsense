// src/lib/hotkeys/hotkeys.ts

const EDITABLE = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

/**
 * Перевіряє, чи подія відбулася всередині поля вводу.
 */
export function isEditableTarget(target: EventTarget | null | undefined): boolean {
	const element = target as Partial<Element> | null | undefined;
	return typeof element?.closest === 'function' && element.closest(EDITABLE) !== null;
}

/**
 * Читає латинську літеру зі скорочення (HOTKEYS § 1.3).
 * Якщо активна кирилична або будь-яка інша розкладка (наприклад, V дає 'м', Q дає 'й'),
 * читається фізична клавіша з event.code.
 */
export function shortcutLetter(event: KeyboardEvent): string | null {
	if (typeof event.key === 'string' && /^[a-zA-Z]$/.test(event.key)) {
		return event.key.toLowerCase();
	}
	if (typeof event.code === 'string' && /^Key([A-Z])$/.test(event.code)) {
		return event.code.slice(3).toLowerCase();
	}
	return null;
}

/**
 * Читає цифру 0-9 з event.key або event.code (Digit0-9, Numpad0-9) незалежно від розкладки.
 */
export function shortcutDigit(event: KeyboardEvent): number | null {
	if (typeof event.key === 'string' && /^[0-9]$/.test(event.key)) {
		return parseInt(event.key, 10);
	}
	if (typeof event.code === 'string') {
		const match = event.code.match(/^(?:Digit|Numpad)([0-9])$/);
		if (match && match[1]) {
			return parseInt(match[1], 10);
		}
	}
	return null;
}
