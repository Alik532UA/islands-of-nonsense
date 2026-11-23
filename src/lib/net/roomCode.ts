/**
 * Generates and validates readable 4-character room codes.
 * Omits easily confused glyphs (0, O, 1, I, L).
 */
const SAFE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function generateRoomCode(random: () => number = Math.random): string {
	let code = '';
	for (let i = 0; i < 4; i += 1) {
		const idx = Math.floor(random() * SAFE_CHARS.length);
		code += SAFE_CHARS[idx];
	}
	return code;
}

export function isValidRoomCode(code: unknown): code is string {
	if (typeof code !== 'string') return false;
	const trimmed = code.trim().toUpperCase();
	if (trimmed.length < 2 || trimmed.length > 6) return false;
	return /^[2-9A-HJ-NP-Z]+$/.test(trimmed);
}
