import { describe, it, expect } from 'vitest';
import { generateQrSvgPath } from './qrSvg';

describe('generateQrSvgPath', () => {
	it('generates version 1 SVG path for short invite URL', () => {
		const res = generateQrSvgPath('https://ex.gg/A1B');
		expect(res.version).toBe(1);
		expect(res.size).toBe(25); // 21 + margin(2)*2
		expect(res.path.startsWith('M')).toBe(true);
		expect(res.path.length).toBeGreaterThan(80);
	});

	it('scales version cleanly for longer URLs up to version 6', () => {
		const longUrl = 'https://islands-of-nonsense.example.com/online?room=K9P4M2&ref=friend';
		const res = generateQrSvgPath(longUrl);
		expect(res.version).toBeGreaterThanOrEqual(4);
		expect(res.version).toBeLessThanOrEqual(6);
		expect(res.size).toBeGreaterThan(33);
		expect(res.path).toContain('M2,2h7v1h-7z'); // top-left finder top row
	});

	it('produces deterministic output for identical inputs', () => {
		const a = generateQrSvgPath('https://game.test/online?room=ABCD');
		const b = generateQrSvgPath('https://game.test/online?room=ABCD');
		expect(a).toEqual(b);
	});
});
