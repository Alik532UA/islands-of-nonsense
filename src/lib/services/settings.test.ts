import { describe, it, expect } from 'vitest';
import { settings } from './settings.svelte';
import { sound } from './audio';

describe('SettingsService & Header Claiming', () => {
	it('allows claiming and releasing header titles and custom back actions', () => {
		expect(settings.headerTitle).toBeNull();
		expect(settings.headerBack).toBeNull();

		let called = false;
		const customBack = () => {
			called = true;
		};

		const release1 = settings.claimHeader('Play Online', customBack);
		expect(settings.headerTitle).toBe('Play Online');
		expect(settings.headerBack).toBe(customBack);

		settings.headerBack?.();
		expect(called).toBe(true);

		const release2 = settings.claimHeader('Room #1234');
		expect(settings.headerTitle).toBe('Room #1234');
		expect(settings.headerBack).toBeNull();

		release2();
		expect(settings.headerTitle).toBe('Play Online');
		expect(settings.headerBack).toBe(customBack);

		release1();
		expect(settings.headerTitle).toBeNull();
		expect(settings.headerBack).toBeNull();
	});

	it('toggles sound and synchronizes with sound engine', () => {
		settings.setSound(false);
		expect(settings.sound).toBe(false);
		expect(sound.isEnabled()).toBe(false);

		settings.setSound(true);
		expect(settings.sound).toBe(true);
		expect(sound.isEnabled()).toBe(true);

		settings.setVolume(0.5);
		expect(settings.volume).toBe(0.5);
		expect(sound.getVolume()).toBe(0.5);

		// Clamping tests
		settings.setVolume(1.5);
		expect(settings.volume).toBe(1.0);
		expect(sound.getVolume()).toBe(1.0);

		settings.setVolume(-0.2);
		expect(settings.volume).toBe(0.0);
		expect(sound.getVolume()).toBe(0.0);
	});

	it('toggles locale', () => {
		settings.setLocale('en');
		expect(settings.locale).toBe('en');

		settings.setLocale('uk');
		expect(settings.locale).toBe('uk');
	});

	it('manages UI scale and settings modal state', () => {
		expect(settings.isSettingsOpen).toBe(false);

		settings.openSettings();
		expect(settings.isSettingsOpen).toBe(true);

		settings.closeSettings();
		expect(settings.isSettingsOpen).toBe(false);

		settings.toggleSettings();
		expect(settings.isSettingsOpen).toBe(true);

		settings.toggleSettings();
		expect(settings.isSettingsOpen).toBe(false);

		settings.setUiScale(1.15);
		expect(settings.uiScale).toBe(1.15);

		settings.setUiScale(0.85);
		expect(settings.uiScale).toBe(0.85);

		settings.setUiScale(1);
		expect(settings.uiScale).toBe(1);
	});

	it('manages graphics style (2.5d vs hd-webp)', () => {
		expect(settings.graphicsStyle).toBe('2.5d');

		settings.setGraphicsStyle('hd-webp');
		expect(settings.graphicsStyle).toBe('hd-webp');

		settings.setGraphicsStyle('2.5d');
		expect(settings.graphicsStyle).toBe('2.5d');
	});
});
