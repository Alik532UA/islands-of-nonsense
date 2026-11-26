import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { SOUND_PACKS } from '$lib/services/audio';

describe('Audio Showcase Route (/audio-showcase)', () => {
	it('exists and exposes all 4 sound packs, SFX cards, music tracks, and voice lines', () => {
		const pagePath = path.resolve('src/routes/audio-showcase/+page.svelte');
		expect(existsSync(pagePath)).toBe(true);
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toContain('SOUND_PACKS');
		expect(SOUND_PACKS).toEqual(['8-bit', 'synth-pro', 'fantasy-rpg', 'dark-siege']);
		expect(src).toContain('data-testid="audio-showcase-pack-tabs"');
		expect(src).toContain('data-testid="sfx-play-{entry.id}-{pack}"');
		expect(src).toContain('playWorkerRaceAll');
		expect(src).toContain('playUnitAll');
	});
});
