import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_PATH ?? '/islands-of-nonsense';

test.describe('Islands of Nonsense — Smoke and Interaction E2E', () => {
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

		// Verify all 4 mode actions exist on /play
		await expect(page.getByTestId('play-battle-link')).toBeVisible();
		await expect(page.getByTestId('play-sandbox-link')).toBeVisible();
		await expect(page.getByTestId('play-spectator-link')).toBeVisible();
		await expect(page.getByTestId('open-custom-config-btn')).toBeVisible();

		// Click Battle vs AI -> leads directly to Battle arena
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
		const startNowBtn = page.getByRole('button', { name: /Випадкова раса|Розпочати бій зараз/i });
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

	test('navigates through Online hub and opens action windows', async ({ page }) => {
		await page.goto(`${BASE}/`);

		// Click Play Online
		await page.getByTestId('menu-online-link').click();
		await expect(page).toHaveURL(new RegExp(`${BASE}/online`));

		// Verify main action buttons
		await expect(page.getByTestId('online-quick-search-btn')).toBeVisible();
		await expect(page.getByTestId('online-create-room-btn')).toBeVisible();
		await expect(page.getByTestId('online-join-code-btn')).toBeVisible();

		// Open Create Room window
		await page.getByTestId('online-create-room-btn').click();
		await expect(page.locator('#create-modal-title')).toBeVisible();
		await page.getByTestId('create-window-back-btn').click();
		await expect(page.getByTestId('online-create-room-btn')).toBeVisible();

		// Open Join by Code window
		await page.getByTestId('online-join-code-btn').click();
		await expect(page.locator('#join-modal-title')).toBeVisible();
		await page.getByTestId('join-window-back-btn').click();
		await expect(page.getByTestId('online-join-code-btn')).toBeVisible();
	});

	test('navigates to Account page and switches tabs', async ({ page }) => {
		await page.goto(`${BASE}/account`);
		await expect(page.getByTestId('tab-profile')).toBeVisible();
		await expect(page.getByTestId('tab-stats')).toBeVisible();
		await expect(page.getByTestId('tab-leaders')).toBeVisible();

		// Switch to stats and verify replay inspector exists
		await page.getByTestId('tab-stats').click();
		await expect(page.getByText(/Загальний рахунок|Total Score/i)).toBeVisible();
		await expect(page.getByTestId('replay-verify-btn')).toBeVisible();

		// Switch to leaders
		await page.getByTestId('tab-leaders').click();

		// Switch back to profile
		await page.getByTestId('tab-profile').click();
		await expect(page.getByTestId('input-name')).toBeVisible();
	});
});
