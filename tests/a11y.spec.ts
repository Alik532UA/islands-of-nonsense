import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE = process.env.BASE_PATH ?? '';

test.describe('Castle Fight Web — Accessibility (WCAG 2.2 AA)', () => {
	test('main page meets WCAG accessibility guidelines', async ({ page }) => {
		await page.goto(`${BASE}/`);
		await page.waitForLoadState('domcontentloaded');

		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.exclude('canvas') // Canvas is WebGL game surface, interactive controls are in DOM overlay
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});

	test('all interactive buttons have accessible names', async ({ page }) => {
		await page.goto(`${BASE}/`);
		const buttons = await page.locator('button').all();
		for (const button of buttons) {
			const name = await button.innerText();
			const ariaLabel = await button.getAttribute('aria-label');
			const title = await button.getAttribute('title');
			expect(name || ariaLabel || title).toBeTruthy();
		}
	});
});
