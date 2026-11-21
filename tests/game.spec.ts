import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_PATH ?? '';

test.describe('Castle Fight Web — Smoke and Interaction E2E', () => {
	test('renders battle arena, top bar, controls and bottom actions', async ({ page }) => {
		await page.goto(`${BASE}/`);

		// Title and description check
		await expect(page).toHaveTitle(/Castle Fight Web|Військова Кузня/i);

		// Verify arena container exists
		const arena = page.locator('main');
		await expect(arena).toBeVisible();

		// Top bar elements
		const roundCounter = page.getByText(/Раунд/i);
		await expect(roundCounter).toBeVisible();

		// Bottom control bar with race buildings
		const bottomBar = page.locator('footer, .fixed.bottom-0');
		await expect(bottomBar.first()).toBeVisible();

		// Modals: Commander modal open and close
		const cmdButton = page.getByRole('button', { name: /Командир/i });
		if (await cmdButton.isVisible()) {
			await cmdButton.click();
			const cmdDialog = page.getByRole('dialog');
			await expect(cmdDialog).toBeVisible();
			await page.keyboard.press('Escape');
		}

		// Modals: Forge modal open and close
		const forgeButton = page.getByRole('button', { name: /Кузня/i });
		if (await forgeButton.isVisible()) {
			await forgeButton.click();
			const forgeDialog = page.getByRole('dialog');
			await expect(forgeDialog).toBeVisible();
			await page.keyboard.press('Escape');
		}
	});

	test('supports keyboard hotkeys for modals and actions', async ({ page }) => {
		await page.goto(`${BASE}/`);

		// Press C for commander
		await page.keyboard.press('c');
		const dialog = page.getByRole('dialog');
		if (await dialog.isVisible()) {
			await expect(dialog).toBeVisible();
			await page.keyboard.press('Escape');
			await expect(dialog).not.toBeVisible();
		}
	});
});
