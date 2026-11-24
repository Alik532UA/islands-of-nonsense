import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_PATH ?? '/islands-of-nonsense';

test.describe('Online Lobby & Quick Match E2E Flow', () => {
	test('renders online hub actions and opens create/join modals', async ({ page }) => {
		await page.goto(`${BASE}/online`);
		await page.waitForLoadState('domcontentloaded');

		await expect(page.getByTestId('online-quick-search-btn')).toBeVisible();
		await expect(page.getByTestId('online-create-room-btn')).toBeVisible();
		await expect(page.getByTestId('online-join-code-btn')).toBeVisible();

		await page.getByTestId('online-create-room-btn').click();
		await expect(page.locator('#create-modal-title')).toBeVisible();
		await page.getByTestId('window-back-btn').click();

		await page.getByTestId('online-join-code-btn').click();
		await expect(page.locator('#join-modal-title')).toBeVisible();
	});

	test('navigates to account profile, stats, and replay verifier', async ({ page }) => {
		await page.goto(`${BASE}/account`);
		await page.waitForLoadState('domcontentloaded');

		await expect(page.getByTestId('tab-profile')).toBeVisible();
		await expect(page.getByTestId('tab-stats')).toBeVisible();
		await expect(page.getByTestId('tab-leaders')).toBeVisible();

		await page.getByTestId('tab-stats').click();
		await expect(page.getByTestId('replay-verify-btn')).toBeVisible();
	});
});
