import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.BASE_PATH ?? '/islands-of-nonsense';

async function startSingleplayerBattle(page: Page) {
	await page.goto(`${BASE}/play`);
	await page.getByTestId('play-battle-link').click();
	await expect(page).toHaveURL(new RegExp(`${BASE}/play/battle`));

	// In-game race selection countdown appears automatically
	const randomRaceBtn = page.getByRole('button', { name: /Випадкова раса/i });
	await expect(randomRaceBtn).toBeVisible({ timeout: 10_000 });
	await randomRaceBtn.click();

	await expect(page.getByTestId('top-bar')).toBeVisible();
	await expect(page.getByTestId('bottom-bar')).toBeVisible();
}

test.describe('Islands of Nonsense — Comprehensive E2E Verification', () => {
	test('renders main landing menu with Play, Play Online, and Order links without errors', async ({
		page
	}) => {
		const pageErrors: string[] = [];
		page.on('pageerror', (err) => pageErrors.push(err.message));

		await page.goto(`${BASE}/`);
		await expect(page).toHaveTitle(/Islands of Nonsense|Castle Fight Web/i);

		await expect(page.getByTestId('menu-play-link')).toBeVisible();
		await expect(page.getByTestId('menu-online-link')).toBeVisible();
		await expect(page.getByTestId('menu-order-link')).toBeVisible();
		await expect(page.getByTestId('menu-battle-backdrop')).toBeAttached();

		// Switching into sub-menu (/play) keeps the exact same 3x3 battle backdrop alive
		await page.getByTestId('menu-play-link').click();
		await expect(page).toHaveURL(new RegExp(`${BASE}/play`));
		await expect(page.getByTestId('menu-battle-backdrop')).toBeAttached();

		expect(pageErrors).toEqual([]);
	});

	test('navigates / -> /play -> /play/battle, focuses worker & castle, and opens/closes Forge, Shop, Commander unconditionally', async ({
		page
	}) => {
		const pageErrors: string[] = [];
		page.on('pageerror', (err) => pageErrors.push(err.message));

		await page.goto(`${BASE}/`);
		await page.getByTestId('menu-play-link').click();
		await expect(page).toHaveURL(new RegExp(`${BASE}/play`));

		await expect(page.getByTestId('play-battle-link')).toBeVisible();
		await expect(page.getByTestId('play-sandbox-link')).toBeVisible();
		await expect(page.getByTestId('play-spectator-link')).toBeVisible();
		await expect(page.getByTestId('open-custom-config-btn')).toBeVisible();

		// /play/setup cleanly redirects to /play
		await page.goto(`${BASE}/play/setup`);
		await expect(page).toHaveURL(new RegExp(`${BASE}/play$`));

		await startSingleplayerBattle(page);

		// Side docks and top-bar status must be visible
		await expect(page.getByTestId('hud-quick-focus-dock')).toBeVisible();
		await expect(page.getByTestId('topbar-game-actions-dock')).toBeVisible();
		await expect(page.getByTestId('match-status-banner')).toBeVisible();

		// Space selects worker and displays worker stats + inventory + command card
		await page.keyboard.press('Space');
		await expect(page.getByTestId('hud-stats-panel')).toBeVisible();
		await expect(page.getByTestId('hud-inventory-panel')).toBeVisible();

		// Enter selects castle and displays castle controls
		await page.keyboard.press('Enter');
		await expect(page.getByTestId('hud-stats-panel')).toBeVisible();

		// Commander modal (C)
		await page.getByTestId('hud-commander-btn').click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).not.toBeVisible();

		// Forge modal (K)
		await page.keyboard.press('k');
		await expect(page.getByRole('dialog')).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).not.toBeVisible();

		// Shop modal (B)
		await page.keyboard.press('b');
		await expect(page.getByRole('dialog')).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).not.toBeVisible();

		expect(pageErrors).toEqual([]);
	});

	test('switches language UA <-> EN live during active battle without reload', async ({ page }) => {
		await startSingleplayerBattle(page);

		await page.keyboard.press('Space');
		const statusBanner = page.getByTestId('match-status-banner');
		const statsPanel = page.getByTestId('hud-stats-panel');
		const commandCard = page.getByTestId('hud-command-card');

		await expect(statusBanner).toContainText(/Раунд/i);
		await expect(statsPanel).toContainText(/Будівельник/i);
		await expect(statsPanel).toContainText(/Швидкість:/i);

		const raceAbilityTip = page
			.getByTestId('hud-race-ability-btn')
			.locator('xpath=following-sibling::div');
		await expect(raceAbilityTip).toContainText(/Відкриється на 5:00 бою/i);
		await expect(raceAbilityTip).toContainText(/[\s\S]{40,}/);

		await page.getByTestId('topbar-locale-toggle').click();
		await expect(statusBanner).toContainText(/Round/i);
		await expect(statsPanel).toContainText(/Builder/i);
		await expect(statsPanel).toContainText(/Speed:/i);
		await expect(statsPanel).not.toContainText(/[а-яА-ЯіІїЇєЄґҐ]/);
		await expect(commandCard).not.toContainText(/[а-яА-ЯіІїЇєЄґҐ]/);
		await expect(raceAbilityTip).toContainText(/Unlocks at 5:00 of match/i);
		await expect(raceAbilityTip).toContainText(/[\s\S]{35,}/);
		await expect(raceAbilityTip).not.toContainText(/[а-яА-ЯіІїЇєЄґҐ]/);

		await page.keyboard.press('k');
		const forgeModal = page.getByTestId('forge-modal');
		await expect(forgeModal).toBeVisible();
		await expect(forgeModal).toContainText(/War Forge/i);
		await expect(forgeModal).not.toContainText(/[а-яА-ЯіІїЇєЄґҐ]/);
		await page.getByTestId('forge-close-btn').click();

		await page.getByTestId('topbar-locale-toggle').click();
		await expect(statusBanner).toContainText(/Раунд/i);
		await expect(statsPanel).toContainText(/Будівельник/i);
	});

	test('keeps HUD, minimap, and docks strictly within viewport bounds without horizontal overflow at 1280x720', async ({
		page
	}) => {
		await page.setViewportSize({ width: 1280, height: 720 });
		await startSingleplayerBattle(page);

		// Select worker so all 5 bottom panels render simultaneously
		await page.keyboard.press('Space');
		await expect(page.getByTestId('hud-stats-panel')).toBeVisible();

		const overflow = await page.evaluate(() => ({
			scrollWidth: document.documentElement.scrollWidth,
			innerWidth: window.innerWidth
		}));
		expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth);

		for (const testId of [
			'top-bar',
			'bottom-bar',
			'hud-quick-focus-dock',
			'topbar-game-actions-dock'
		]) {
			const box = await page.getByTestId(testId).boundingBox();
			expect(box, `Missing bounding box for ${testId}`).not.toBeNull();
			expect(box!.x).toBeGreaterThanOrEqual(-1);
			expect(box!.x + box!.width).toBeLessThanOrEqual(1281);
			expect(box!.y + box!.height).toBeLessThanOrEqual(721);
		}

		// Minimap collapse and expand works cleanly
		await page.getByTestId('minimap-collapse-btn').click();
		await expect(page.getByTestId('minimap-expand-btn')).toBeVisible();
		await page.getByTestId('minimap-expand-btn').click();
		await expect(page.getByTestId('minimap-collapse-btn')).toBeVisible();
	});

	test('renders /assets-showcase, /audio-showcase, /account, and 404 error boundary cleanly', async ({
		page
	}) => {
		const pageErrors: string[] = [];
		page.on('pageerror', (err) => pageErrors.push(err.message));

		// Assets showcase
		await page.goto(`${BASE}/assets-showcase`);
		await expect(page.getByTestId('assets-showcase-autoplay-voices-btn')).toBeVisible();

		// Audio showcase
		await page.goto(`${BASE}/audio-showcase`);
		await expect(page.getByTestId('audio-showcase-pack-tabs')).toBeVisible();

		// Account tabs
		await page.goto(`${BASE}/account`);
		await expect(page.getByTestId('tab-profile')).toBeVisible();
		await expect(page.getByTestId('tab-stats')).toBeVisible();
		await expect(page.getByTestId('tab-leaders')).toBeVisible();
		await page.getByTestId('tab-stats').click();
		await expect(page.getByTestId('replay-verify-btn')).toBeVisible();
		await page.getByTestId('tab-profile').click();
		await expect(page.getByTestId('input-name')).toBeVisible();

		// Error page (404)
		await page.goto(`${BASE}/non-existent-route-check-404`);
		await expect(page.locator('h1')).toContainText('404');

		expect(pageErrors).toEqual([]);
	});
});
