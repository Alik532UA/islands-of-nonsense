import { describe, it, expect } from 'vitest';
import {
	AVATAR_COLORS,
	AVATAR_FRAMES,
	AVATAR_ICONS,
	formatPresetAvatar,
	isAvatar,
	parseAvatar,
	withAvatarFrame
} from './avatars';

describe('avatars config & parser', () => {
	it('provides 24 icons, 12 colors, and 7 frames', () => {
		expect(AVATAR_ICONS.length).toBe(24);
		expect(AVATAR_COLORS.length).toBe(12);
		expect(AVATAR_FRAMES.length).toBe(7);
	});

	it('validates and parses preset avatars with optional frames', () => {
		const simple = formatPresetAvatar('crown', 'amber');
		expect(simple).toBe('crown:amber');
		expect(isAvatar(simple)).toBe(true);

		const framed = withAvatarFrame(simple, 'gold');
		expect(framed).toBe('crown:amber:gold');
		expect(isAvatar(framed)).toBe(true);

		const parsed = parseAvatar(framed);
		expect(parsed).toEqual({
			kind: 'preset',
			icon: 'crown',
			color: 'amber',
			frame: 'gold'
		});
	});

	it('accepts safe raster data URLs and rejects SVG/XSS payloads', () => {
		const validPng = 'data:image/png;base64,iVBORw0KGgo=';
		expect(isAvatar(validPng)).toBe(true);
		const framedImg = withAvatarFrame(validPng, 'neon');
		expect(isAvatar(framedImg)).toBe(true);
		expect(parseAvatar(framedImg)?.kind).toBe('image');
		expect(parseAvatar(framedImg)?.frame).toBe('neon');

		expect(isAvatar('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
		expect(isAvatar('https://evil.example/a.png')).toBe(false);
	});
});
