import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('SEO & Social Metadata (SEO-v10)', () => {
	const root = process.cwd();
	const appHtml = readFileSync(resolve(root, 'src/app.html'), 'utf-8');

	it('app.html містить коректні Open Graph метатеги (SEO-v10 § 4.2)', () => {
		expect(appHtml).toContain('property="og:type"');
		expect(appHtml).toContain('property="og:title"');
		expect(appHtml).toContain('property="og:description"');
		expect(appHtml).toContain('property="og:image"');
		expect(appHtml).toContain('property="og:url"');
		expect(appHtml).toContain('property="og:locale"');
	});

	it('app.html містить коректні Twitter Card метатеги (SEO-v10 § 4.2)', () => {
		expect(appHtml).toContain('name="twitter:card"');
		expect(appHtml).toContain('name="twitter:title"');
		expect(appHtml).toContain('name="twitter:description"');
		expect(appHtml).toContain('name="twitter:image"');
	});

	it('robots.txt існує та налаштований для індексації', () => {
		const robotsPath = resolve(root, 'static/robots.txt');
		expect(existsSync(robotsPath)).toBe(true);
		const robots = readFileSync(robotsPath, 'utf-8');
		expect(robots).toContain('User-agent:');
	});
});
