import { describe, it, expect, vi, afterEach } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import unitsData from '$lib/data/units.json';
import voiceLines from '$lib/data/voiceLines.json';
import { PLAYABLE_RACES } from '$lib/engine/gameData';
import {
	getWorkerVoiceSlug,
	SoundService,
	UNIT_VOICE_VARIANTS,
	WORKER_VOICE_COOLDOWN_MS,
	WORKER_VOICE_VARIANTS,
	sound
} from './audio';

const ROOT = process.cwd();

describe('Unit & Worker Edge TTS Voice Lines', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it('provides 5 unique non-empty voice line entries and MP3 files for all 12 canonical workers', () => {
		const workers = voiceLines.workers as Record<
			string,
			{ slug: string; texts: string[]; voice: string; pitch: string; rate: string }
		>;

		for (const race of PLAYABLE_RACES) {
			const entry = workers[race];
			expect(entry, `Missing worker voice entry for ${race}`).toBeDefined();
			expect(entry.texts.length).toBe(WORKER_VOICE_VARIANTS);
			expect(new Set(entry.texts).size).toBe(WORKER_VOICE_VARIANTS);
			expect(getWorkerVoiceSlug(race)).toBe(entry.slug);

			for (let idx = 1; idx <= WORKER_VOICE_VARIANTS; idx++) {
				expect(entry.texts[idx - 1].trim().length).toBeGreaterThan(0);
				const mp3Path = resolve(
					ROOT,
					'static',
					'audio',
					'voices',
					'workers',
					`${entry.slug}_${idx}.mp3`
				);
				expect(existsSync(mp3Path), `Missing MP3 for worker ${race} #${idx}: ${mp3Path}`).toBe(
					true
				);
				expect(statSync(mp3Path).size).toBeGreaterThan(0);
			}
		}
	});

	it('maps legacy race aliases to canonical worker voice slugs', () => {
		expect(getWorkerVoiceSlug('Люди')).toBe('human');
		expect(getWorkerVoiceSlug('Хаос')).toBe('demon');
		expect(getWorkerVoiceSlug('Порча')).toBe('undead');
		expect(getWorkerVoiceSlug('Нічні ельфи')).toBe('elf');
		expect(getWorkerVoiceSlug('Збирачі')).toBe('mech');
	});

	it('provides 3 unique non-empty voice line entries and MP3 files for all 144 units', () => {
		const units = voiceLines.units as Record<
			string,
			{ texts: string[]; voice: string; pitch: string; rate: string }
		>;

		expect(unitsData.length).toBe(144);
		for (const unit of unitsData) {
			const entry = units[unit.id];
			expect(entry, `Missing unit voice entry for ${unit.id} (${unit.name})`).toBeDefined();
			expect(entry.texts.length).toBe(UNIT_VOICE_VARIANTS);
			expect(new Set(entry.texts).size, `Duplicate lines for ${unit.id}`).toBe(UNIT_VOICE_VARIANTS);

			for (let idx = 1; idx <= UNIT_VOICE_VARIANTS; idx++) {
				expect(entry.texts[idx - 1].trim().length).toBeGreaterThan(0);
				const mp3Path = resolve(
					ROOT,
					'static',
					'audio',
					'voices',
					'units',
					`${unit.id}_${idx}.mp3`
				);
				expect(existsSync(mp3Path), `Missing MP3 for unit ${unit.id} #${idx}: ${mp3Path}`).toBe(
					true
				);
				expect(statSync(mp3Path).size).toBeGreaterThan(0);
			}
		}
	});

	it('enforces 60-second cooldown for worker voice lines', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-11-26T20:00:00Z'));

		const svc = new SoundService();
		const playSpy = vi.spyOn(
			svc as unknown as { playVoiceUrl: (url: string) => void },
			'playVoiceUrl'
		);

		svc.playWorkerVoice('Альянс');
		expect(playSpy).toHaveBeenCalledTimes(1);

		// Within 1-minute cooldown — suppressed
		vi.advanceTimersByTime(WORKER_VOICE_COOLDOWN_MS - 1000);
		svc.playWorkerVoice('Альянс');
		expect(playSpy).toHaveBeenCalledTimes(1);

		// After 1-minute cooldown — plays a different variant
		vi.advanceTimersByTime(1000);
		svc.playWorkerVoice('Альянс');
		expect(playSpy).toHaveBeenCalledTimes(2);
		expect(playSpy.mock.calls[0][0]).not.toBe(playSpy.mock.calls[1][0]);
	});

	it('rotates among 3 variants without repeating consecutive unit voice lines', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-11-26T20:00:00Z'));

		const svc = new SoundService();
		const playSpy = vi.spyOn(
			svc as unknown as { playVoiceUrl: (url: string) => void },
			'playVoiceUrl'
		);

		svc.playUnitVoice('h03C');
		vi.advanceTimersByTime(600);
		svc.playUnitVoice('h03C');
		vi.advanceTimersByTime(600);
		svc.playUnitVoice('h03C');

		expect(playSpy).toHaveBeenCalledTimes(3);
		expect(playSpy.mock.calls[0][0]).not.toBe(playSpy.mock.calls[1][0]);
		expect(playSpy.mock.calls[1][0]).not.toBe(playSpy.mock.calls[2][0]);
	});

	it('exposes safe playWorkerVoice and playUnitVoice methods on sound service', () => {
		expect(() => sound.playWorkerVoice('Альянс')).not.toThrow();
		expect(() => sound.playUnitVoice('h03C')).not.toThrow();
	});
});
