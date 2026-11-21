// src/lib/hotkeys/hotkeys.ts
/**
 * Читає латинську літеру зі скорочення (HOTKEYS § 1.3).
 * Якщо активна кирилична розкладка (V дає 'м'), читається фізична клавіша з event.code.
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
