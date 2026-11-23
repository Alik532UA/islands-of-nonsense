import { describe, expect, it } from 'vitest';
import { generateRoomCode, isValidRoomCode } from './roomCode';

describe('Room Code generation and validation', () => {
	it('generates 4-character code from safe alphabet', () => {
		const code = generateRoomCode(() => 0.5);
		expect(code).toHaveLength(4);
		expect(isValidRoomCode(code)).toBe(true);
	});

	it('validates safe alphanumeric codes', () => {
		expect(isValidRoomCode('CF42')).toBe(true);
		expect(isValidRoomCode('AB99')).toBe(true);
		expect(isValidRoomCode('')).toBe(false);
		expect(isValidRoomCode('1O0IL')).toBe(false); // contains ambiguous glyphs
	});
});
