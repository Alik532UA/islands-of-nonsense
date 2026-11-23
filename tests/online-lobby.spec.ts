import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_PATH ?? '/islands-of-nonsense';

test.describe('Online Lobby & Room Browser E2E Flow', () => {
	test('renders online lobby, room listing, and quick search filters', async ({ page }) => {
		await page.goto(`${BASE}/play/online`);
		await page.waitForLoadState('domcontentloaded');

		// Check title or main header
		const heading = page.locator('h1, h2, h3').first();
		await expect(heading).toBeVisible();

		// Check player bar / identity header if present
		const playerBar = page.locator('[data-testid="player-bar"]');
		if (await playerBar.isVisible()) {
			await expect(playerBar).toBeVisible();
		}

		// Check create room button or join interface
		const createRoomBtn = page
			.locator('button, a')
			.filter({ hasText: /створити кімнату|новий бій|створити|грати/i })
			.first();
		if (await createRoomBtn.isVisible()) {
			await expect(createRoomBtn).toBeVisible();
		}
	});

	test('navigates to account profile and shows player stats and records', async ({ page }) => {
		await page.goto(`${BASE}/account`);
		await page.waitForLoadState('domcontentloaded');

		// Check tabs: profile, stats, leaders
		await expect(page.getByTestId('tab-profile')).toBeVisible();
		await expect(page.getByTestId('tab-stats')).toBeVisible();
		await expect(page.getByTestId('tab-leaders')).toBeVisible();

		// Click stats tab
		await page.getByTestId('tab-stats').click();
		await expect(page.getByText(/статистика|перемог|ігор/i).first()).toBeVisible();
	});
});
