import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('PWA manifest icons & maskable compliance (PWA-v10 § 4)', () => {
	const root = process.cwd();
	const manifestPath = resolve(root, 'static/manifest.json');

	it('маніфест існує та містить коректні поля', () => {
		expect(existsSync(manifestPath)).toBe(true);
		const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
		expect(manifest.name).toBeTruthy();
		expect(manifest.icons).toBeInstanceOf(Array);
		expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
	});

	it('має растрові квадратні іконки 192px і 512px з purpose "any"', () => {
		const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
		const anyIcons = manifest.icons.filter((i: { purpose?: string }) =>
			(i.purpose ?? 'any').split(/\s+/).includes('any')
		);

		const sizes = anyIcons.map((i: { sizes: string }) => i.sizes);
		expect(sizes).toContain('192x192');
		expect(sizes).toContain('512x512');
	});

	it('має підготовлену масковану іконку maskable 512px', () => {
		const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
		const maskableIcons = manifest.icons.filter((i: { purpose?: string }) =>
			(i.purpose ?? '').split(/\s+/).includes('maskable')
		);

		expect(maskableIcons.length).toBeGreaterThanOrEqual(1);
		expect(maskableIcons[0].sizes).toBe('512x512');
	});

	it('усі файли з маніфесту існують на диску та є валідними PNG файлами', () => {
		const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
		const PNG_SIG = '89504e470d0a1a0a';

		for (const icon of manifest.icons) {
			const cleanSrc = icon.src.replace(/^\.\//, '');
			const fullPath = resolve(root, 'static', cleanSrc);
			expect(existsSync(fullPath), `Іконка ${cleanSrc} повинна існувати у static/`).toBe(true);

			const buf = readFileSync(fullPath);
			expect(buf.subarray(0, 8).toString('hex')).toBe(PNG_SIG);

			// Check IHDR dimensions
			const width = buf.readUInt32BE(16);
			const height = buf.readUInt32BE(20);
			const expectedSize = parseInt(icon.sizes.split('x')[0], 10);
			expect(width).toBe(expectedSize);
			expect(height).toBe(expectedSize);
		}
	});

	it('статичний favicon.png існує', () => {
		const favPath = resolve(root, 'static/favicon.png');
		expect(existsSync(favPath)).toBe(true);
	});
});
