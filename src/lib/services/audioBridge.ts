import type { Simulation } from '../engine/simulation';
import type { SoundEffectType } from '../engine/types';
import { sound, type SoundService } from './audio';

/**
 * Connects simulation sound events to the procedural audio service.
 * Returns an unlisten/cleanup function to disconnect the handlers.
 */
export function attachAudioBridge(sim: Simulation, audioService: SoundService = sound): () => void {
	const handler = (type: SoundEffectType) => {
		switch (type) {
			case 'sword':
			case 'attack_normal':
				audioService.playSwordClash();
				break;
			case 'bow':
			case 'attack_pierce':
				audioService.playBowShot();
				break;
			case 'magic':
			case 'attack_magic':
				audioService.playMagicCast();
				break;
			case 'hit':
			case 'attack_siege':
				audioService.playHit();
				break;
			case 'death':
			case 'unit_death':
				audioService.playUnitDeath();
				break;
			case 'buildingDestroyed':
			case 'building_destroyed':
				audioService.playBuildingDestroyed();
				break;
			case 'building_repair':
				audioService.playRepair();
				break;
			case 'upgrade':
				audioService.playUpgrade();
				break;
			case 'coin':
				audioService.playCoin();
				break;
			case 'buildingComplete':
				audioService.playBuildingComplete();
				break;
			case 'castleUnderAttack':
				audioService.playCastleUnderAttack();
				break;
			case 'bossSpawn':
				audioService.playBossSpawn();
				break;
			case 'victory':
				audioService.playVictory();
				break;
			case 'defeat':
				audioService.playDefeat();
				break;
			case 'errorResource':
				audioService.playErrorResource();
				break;
			case 'lowCastleHp':
				audioService.playLowCastleHp();
				break;
			case 'horn':
				audioService.playHorn();
				break;
			case 'rescueStrike':
				audioService.playRescueStrike();
				break;
		}
	};

	sim.onSoundEffect = handler;

	return () => {
		if (sim.onSoundEffect === handler) {
			sim.onSoundEffect = undefined;
		}
	};
}
