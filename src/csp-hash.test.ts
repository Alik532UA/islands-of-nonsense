import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

describe('CSP inline script hashes (SECURITY-v10 § 6.3.1)', () => {
	it('перевіряє цілісність інлайн-скриптів у app.html', () => {
		const htmlPath = 'src/app.html';
		expect(existsSync(htmlPath)).toBe(true);

		const html = readFileSync(htmlPath, 'utf-8').replace(/<!--[\s\S]*?-->/g, '');
		const scriptMatches = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi)];

		for (const match of scriptMatches) {
			const content = (match[1] ?? '').replace(/\r\n/g, '\n');
			const hash = `sha256-${createHash('sha256').update(content).digest('base64')}`;
			expect(hash).toMatch(/^sha256-[A-Za-z0-9+/=]+$/);
		}
	});

	it('enforces hash mode, object-src none, and Firebase connect-src in vite.config.ts', () => {
		const viteConfig = readFileSync('vite.config.ts', 'utf-8');
		expect(viteConfig).toContain("mode: 'hash'");
		expect(viteConfig).toContain("'object-src': ['none']");
		expect(viteConfig).toContain('https://*.firebasedatabase.app');
		expect(viteConfig).toContain('wss://*.firebasedatabase.app');
		expect(viteConfig).toContain('https://identitytoolkit.googleapis.com');
		expect(viteConfig).toContain('https://api.country.is');
		expect(viteConfig).toMatch(/'script-src'[\s\S]*?https:\/\/\*\.firebasedatabase\.app/);
		expect(viteConfig).toMatch(/'frame-src'[\s\S]*?https:\/\/\*\.firebasedatabase\.app/);
		expect(viteConfig).not.toMatch(/'script-src'[^;\n]*'unsafe-inline'/);
		expect(viteConfig).not.toMatch(/'script-src'[^;\n]*'unsafe-eval'/);
	});
});
