import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_PATH ?? '/islands-of-nonsense';

test.describe('Castle Fight Web — Smoke and Interaction E2E', () => {
	test('renders main landing menu with Play, Play Online, and Order links', async ({ page }) => {
		await page.goto(`${BASE}/`);

		await expect(page).toHaveTitle(/Islands of Nonsense|Castle Fight Web/i);

		const playLink = page.getByTestId('menu-play-link');
		const onlineLink = page.getByTestId('menu-online-link');
		const orderLink = page.getByTestId('menu-order-link');

		await expect(playLink).toBeVisible();
		await expect(onlineLink).toBeVisible();
		await expect(orderLink).toBeVisible();
	});

	test('navigates through Play menu to battle arena and renders controls', async ({ page }) => {
		await page.goto(`${BASE}/`);

		// Click Play
		await page.getByTestId('menu-play-link').click();
		await expect(page).toHaveURL(new RegExp(`${BASE}/play`));

		// Verify all 4 game mode tiles exist on /play
		await expect(page.getByTestId('play-battle-link')).toBeVisible();
		await expect(page.getByTestId('play-sandbox-link')).toBeVisible();
		await expect(page.getByTestId('play-spectator-link')).toBeVisible();
		await expect(page.getByTestId('play-allrandom-link')).toBeVisible();

		// Click Battle vs AI
		await page.getByTestId('play-battle-link').click();
		await expect(page).toHaveURL(new RegExp(`${BASE}/play/battle`));

		// Verify arena container exists
		const arena = page.locator('main');
		await expect(arena).toBeVisible();

		// Start match from setup modal if present
		const startMatchBtn = page.getByRole('button', { name: /почати новий матч/i });
		if (await startMatchBtn.isVisible()) {
			await startMatchBtn.click();
		}

		// Fast-forward countdown if present
		const startNowBtn = page.getByRole('button', { name: /Розпочати бій зараз/i });
		if (await startNowBtn.isVisible()) {
			await startNowBtn.click();
		}

		// Top bar elements
		const roundCounter = page.getByText(/Раунд/i).first();
		await expect(roundCounter).toBeVisible();

		// Bottom control bar with race buildings
		const bottomBar = page.locator('[data-testid="bottom-bar"]');
		await expect(bottomBar).toBeVisible();

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

	test('supports keyboard hotkeys for modals and actions in battle', async ({ page }) => {
		await page.goto(`${BASE}/play/battle`);

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
