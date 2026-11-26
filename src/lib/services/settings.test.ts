import { describe, it, expect } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { settings, RACE_CURSORS, CURSOR_STYLES } from './settings.svelte';
import { sound, music } from './audio';
import { t, setLocale } from '$lib/i18n';

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

	it('defaults SFX volume to 4% (0.04), music volume to 2% (0.02), and soundPack to synth-pro', () => {
		expect(settings.volume).toBe(0.04);
		expect(sound.getVolume()).toBe(0.04);
		expect(settings.musicVolume).toBe(0.02);
		expect(settings.voiceVolume).toBe(0.15);
		expect(sound.getVoiceVolume()).toBe(0.15);
		expect(settings.voiceEnabled).toBe(true);
		expect(sound.isVoiceEnabled()).toBe(true);
		expect(settings.soundPack).toBe('synth-pro');
		expect(sound.getPack()).toBe('synth-pro');

		settings.setVoiceVolume(0.4);
		expect(settings.voiceVolume).toBe(0.4);
		expect(sound.getVoiceVolume()).toBe(0.4);
		settings.setVoiceVolume(1.5);
		expect(settings.voiceVolume).toBe(1.0);
		settings.setVoiceVolume(-0.1);
		expect(settings.voiceVolume).toBe(0.0);
		settings.setVoiceVolume(0.15);

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

		settings.setVolume(0.04);
	});

	it('toggleMute mutes and unmutes both SFX and music while preserving individual flags', () => {
		settings.setMuted(false);
		settings.setSound(true);
		settings.setMusicEnabled(true);
		expect(settings.isAudioActive).toBe(true);
		expect(sound.isEnabled()).toBe(true);
		expect(music.isEnabled()).toBe(true);

		// Quick mute turns off both SFX and music
		settings.toggleMute();
		expect(settings.muted).toBe(true);
		expect(settings.isAudioActive).toBe(false);
		expect(sound.isEnabled()).toBe(false);
		expect(music.isEnabled()).toBe(false);

		// Quick unmute restores both SFX and music
		settings.toggleMute();
		expect(settings.muted).toBe(false);
		expect(settings.isAudioActive).toBe(true);
		expect(sound.isEnabled()).toBe(true);
		expect(music.isEnabled()).toBe(true);

		// Preserves music=false across mute/unmute cycle
		settings.setMusicEnabled(false);
		settings.toggleMute();
		expect(sound.isEnabled()).toBe(false);
		expect(music.isEnabled()).toBe(false);
		settings.toggleMute();
		expect(sound.isEnabled()).toBe(true);
		expect(music.isEnabled()).toBe(false);

		// Restore defaults
		settings.setMusicEnabled(true);
		settings.setMuted(false);
	});

	it('toggles locale reactively between uk and en', () => {
		settings.setLocale('en');
		expect(settings.locale).toBe('en');
		expect(t('gold')).toBe('Gold');

		setLocale('uk');
		expect(settings.locale).toBe('uk');
		expect(t('gold')).toBe('Золото');
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

	it('manages build queue mode (convenient vs classic)', () => {
		expect(settings.buildQueueMode).toBe('convenient');

		settings.setBuildQueueMode('classic');
		expect(settings.buildQueueMode).toBe('classic');

		settings.setBuildQueueMode('convenient');
		expect(settings.buildQueueMode).toBe('convenient');
	});

	it('provides 12 race SVG cursors, defaults to adaptive, and allows random, static, or default selection', () => {
		expect(RACE_CURSORS.length).toBe(12);
		expect(CURSOR_STYLES).toContain('adaptive');
		expect(CURSOR_STYLES).toContain('random');
		expect(CURSOR_STYLES).toContain('default');

		for (const race of RACE_CURSORS) {
			const svgPath = resolve(process.cwd(), 'static', 'cursors', `${race}.svg`);
			expect(existsSync(svgPath), `Missing cursor SVG: ${svgPath}`).toBe(true);
			expect(statSync(svgPath).size).toBeGreaterThan(0);
		}

		expect(settings.cursorStyle).toBe('adaptive');
		expect(RACE_CURSORS).toContain(settings.activeCursor);

		settings.syncAdaptiveCursorRace('Нежить');
		expect(settings.activeCursor).toBe('undead');

		settings.syncAdaptiveCursorRace('Ельфи');
		expect(settings.activeCursor).toBe('elf');

		settings.setCursorStyle('default');
		expect(settings.cursorStyle).toBe('default');
		expect(settings.activeCursor).toBe('default');

		// Adaptive race updates should not override static/default choice
		settings.syncAdaptiveCursorRace('Демони');
		expect(settings.activeCursor).toBe('default');

		settings.setCursorStyle('orc');
		expect(settings.cursorStyle).toBe('orc');
		expect(settings.activeCursor).toBe('orc');

		settings.setCursorStyle('random');
		expect(settings.cursorStyle).toBe('random');
		expect(RACE_CURSORS).toContain(settings.activeCursor);

		settings.setCursorStyle('adaptive');
		expect(settings.cursorStyle).toBe('adaptive');
		expect(settings.activeCursor).toBe('demon');
	});
});
