import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;

export default defineConfig({
	testDir: 'tests',
	fullyParallel: !process.env.CI,
	workers: process.env.CI ? 1 : 2,
	timeout: process.env.CI ? 60_000 : 30_000,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: 'on-first-retry',
		reducedMotion: 'reduce'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: `npm run preview -- --port ${PORT} --strictPort`,
		port: PORT,
		reuseExistingServer: !process.env.CI,
		timeout: 60_000
	}
});
