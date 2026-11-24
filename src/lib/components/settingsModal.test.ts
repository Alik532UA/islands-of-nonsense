import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('SettingsModal and Settings Integration Tests', () => {
	const settingsModalPath = path.resolve(process.cwd(), 'src/lib/components/SettingsModal.svelte');
	const headerControlsPath = path.resolve(
		process.cwd(),
		'src/lib/components/HeaderControls.svelte'
	);
	const topBarPath = path.resolve(process.cwd(), 'src/lib/components/TopBar.svelte');
	const pauseMenuPath = path.resolve(process.cwd(), 'src/lib/components/PauseMenuModal.svelte');
	const layoutPath = path.resolve(process.cwd(), 'src/routes/+layout.svelte');

	const modalContent = fs.readFileSync(settingsModalPath, 'utf-8');
	const headerContent = fs.readFileSync(headerControlsPath, 'utf-8');
	const topBarContent = fs.readFileSync(topBarPath, 'utf-8');
	const pauseContent = fs.readFileSync(pauseMenuPath, 'utf-8');
	const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

	it('SettingsModal implements accessible dialog standards (WCAG 2.2 AA)', () => {
		expect(modalContent).toContain('role="dialog"');
		expect(modalContent).toContain('aria-modal="true"');
		expect(modalContent).toContain("aria-label={t('settings.title')}");
		expect(modalContent).toContain('data-testid="settings-close-btn"');
		expect(modalContent).toContain("if (e.key === 'Escape')");
	});

	it('SettingsModal includes all required sections and controls', () => {
		expect(modalContent).toContain('data-testid="settings-modal"');
		expect(modalContent).toContain('data-testid="settings-tab-audio"');
		expect(modalContent).toContain('data-testid="settings-tab-language"');
		expect(modalContent).toContain('data-testid="settings-tab-interface"');

		// Audio controls
		expect(modalContent).toContain('data-testid="settings-volume-slider"');
		expect(modalContent).toContain('data-testid="settings-sound-toggle"');
		expect(modalContent).toContain('data-testid="settings-test-sound-btn"');

		// Language controls
		expect(modalContent).toContain('data-testid="settings-lang-uk"');
		expect(modalContent).toContain('data-testid="settings-lang-en"');

		// Interface scale controls
		expect(modalContent).toContain('data-testid={`settings-scale-${scale}`}');
		expect(modalContent).toContain('data-testid={`settings-graphics-${styleId}`}');
		expect(modalContent).toContain('data-testid="settings-fullscreen-btn"');
	});

	it('HeaderControls includes quick sound toggle and settings modal trigger', () => {
		expect(headerContent).toContain('data-testid="header-sound-toggle"');
		expect(headerContent).toContain('data-testid="header-lang-toggle"');
		expect(headerContent).toContain('data-testid="header-settings-btn"');
		expect(headerContent).toContain('settings.openSettings()');
	});

	it('TopBar includes quick sound toggle and settings modal trigger', () => {
		expect(topBarContent).toContain('data-testid="topbar-sound-toggle"');
		expect(topBarContent).toContain('data-testid="topbar-settings-btn"');
		expect(topBarContent).toContain('settings.openSettings()');
	});

	it('PauseMenuModal includes game settings trigger and quick sound toggle', () => {
		expect(pauseContent).toContain('data-testid="pause-sound-toggle"');
		expect(pauseContent).toContain('data-testid="pause-game-settings-btn"');
		expect(pauseContent).toContain('settings.openSettings()');
	});

	it('+layout.svelte mounts global SettingsModal', () => {
		expect(layoutContent).toContain('SettingsModal');
		expect(layoutContent).toContain('isOpen={settings.isSettingsOpen}');
		expect(layoutContent).toContain('onClose={() => settings.closeSettings()}');
	});
});
