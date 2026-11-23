import { describe, it, expect, vi } from 'vitest';
import { attachAudioBridge } from './audioBridge';
import { Simulation } from '../engine/simulation';
import type { SoundService } from './audio';
import type { SoundEffectType } from '../engine/types';

describe('audioBridge service', () => {
	it('attaches sound effect handlers and forwards all event types to SoundService', () => {
		const sim = new Simulation();
		const mockSound = {
			playSwordClash: vi.fn(),
			playBowShot: vi.fn(),
			playMagicCast: vi.fn(),
			playHit: vi.fn(),
			playUnitDeath: vi.fn(),
			playBuildingDestroyed: vi.fn(),
			playRepair: vi.fn(),
			playUpgrade: vi.fn(),
			playCoin: vi.fn(),
			playBuildingComplete: vi.fn(),
			playCastleUnderAttack: vi.fn(),
			playBossSpawn: vi.fn(),
			playVictory: vi.fn(),
			playDefeat: vi.fn(),
			playErrorResource: vi.fn(),
			playLowCastleHp: vi.fn(),
			playHorn: vi.fn(),
			playRescueStrike: vi.fn()
		} as unknown as SoundService;

		const unlisten = attachAudioBridge(sim, mockSound);
		expect(typeof sim.onSoundEffect).toBe('function');

		const events: SoundEffectType[] = [
			'sword',
			'attack_normal',
			'bow',
			'attack_pierce',
			'magic',
			'attack_magic',
			'hit',
			'attack_siege',
			'death',
			'unit_death',
			'buildingDestroyed',
			'building_destroyed',
			'building_repair',
			'upgrade',
			'coin',
			'buildingComplete',
			'castleUnderAttack',
			'bossSpawn',
			'victory',
			'defeat',
			'errorResource',
			'lowCastleHp',
			'horn',
			'rescueStrike'
		];

		for (const ev of events) {
			sim.onSoundEffect!(ev);
		}

		expect(mockSound.playSwordClash).toHaveBeenCalledTimes(2);
		expect(mockSound.playBowShot).toHaveBeenCalledTimes(2);
		expect(mockSound.playMagicCast).toHaveBeenCalledTimes(2);
		expect(mockSound.playHit).toHaveBeenCalledTimes(2);
		expect(mockSound.playUnitDeath).toHaveBeenCalledTimes(2);
		expect(mockSound.playBuildingDestroyed).toHaveBeenCalledTimes(2);
		expect(mockSound.playRepair).toHaveBeenCalledTimes(1);
		expect(mockSound.playUpgrade).toHaveBeenCalledTimes(1);
		expect(mockSound.playCoin).toHaveBeenCalledTimes(1);
		expect(mockSound.playBuildingComplete).toHaveBeenCalledTimes(1);
		expect(mockSound.playCastleUnderAttack).toHaveBeenCalledTimes(1);
		expect(mockSound.playBossSpawn).toHaveBeenCalledTimes(1);
		expect(mockSound.playVictory).toHaveBeenCalledTimes(1);
		expect(mockSound.playDefeat).toHaveBeenCalledTimes(1);
		expect(mockSound.playErrorResource).toHaveBeenCalledTimes(1);
		expect(mockSound.playLowCastleHp).toHaveBeenCalledTimes(1);
		expect(mockSound.playHorn).toHaveBeenCalledTimes(1);
		expect(mockSound.playRescueStrike).toHaveBeenCalledTimes(1);

		unlisten();
		expect(sim.onSoundEffect).toBeUndefined();
	});
});
