import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE = process.env.BASE_PATH ?? '/islands-of-nonsense';
const SCAN_ROUTES = ['/', '/play', '/online', '/account'] as const;

test.describe('Islands of Nonsense — Accessibility (WCAG 2.2 AA)', () => {
	for (const route of SCAN_ROUTES) {
		test(`${route} meets WCAG accessibility guidelines`, async ({ page }) => {
			await page.goto(`${BASE}${route}`);
			await page.waitForLoadState('domcontentloaded');
			await page.waitForTimeout(400);

			const accessibilityScanResults = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
				.exclude('canvas')
				.analyze();

			expect(accessibilityScanResults.violations).toEqual([]);
		});
	}

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
