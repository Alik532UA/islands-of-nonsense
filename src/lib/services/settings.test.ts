import { describe, it, expect } from 'vitest';
import { settings } from './settings.svelte';

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

	it('toggles sound and volume', () => {
		settings.setSound(false);
		expect(settings.sound).toBe(false);

		settings.setSound(true);
		expect(settings.sound).toBe(true);

		settings.setVolume(0.5);
		expect(settings.volume).toBe(0.5);
	});

	it('toggles locale', () => {
		settings.setLocale('en');
		expect(settings.locale).toBe('en');

		settings.setLocale('uk');
		expect(settings.locale).toBe('uk');
	});
});
