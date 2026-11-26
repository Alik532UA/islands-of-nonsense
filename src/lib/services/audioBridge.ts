import type { Simulation } from '../engine/simulation';
import type { MatchTeam, SoundEffectType } from '../engine/types';
import { sound, type SoundService } from './audio';

/**
 * Connects simulation sound events to the procedural audio service.
 * When `getLocalTeam` is provided, team-scoped alerts (`victory`, `defeat`,
 * `castleUnderAttack`, `lowCastleHp`) are resolved relative to the local team.
 * Returns an unlisten/cleanup function to disconnect the handlers.
 */
export function attachAudioBridge(
	sim: Simulation,
	audioService: SoundService = sound,
	getLocalTeam?: () => MatchTeam
): () => void {
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
				if (!getLocalTeam) {
					audioService.playCastleUnderAttack();
				}
				break;
			case 'bossSpawn':
				audioService.playBossSpawn();
				break;
			case 'victory':
			case 'defeat': {
				if (sim.winner) {
					const localTeam = getLocalTeam ? getLocalTeam() : 'west';
					if (sim.winner === localTeam) {
						audioService.playVictory();
					} else {
						audioService.playDefeat();
					}
				} else if (type === 'victory') {
					audioService.playVictory();
				} else {
					audioService.playDefeat();
				}
				break;
			}
			case 'errorResource':
				audioService.playErrorResource();
				break;
			case 'lowCastleHp':
				if (!getLocalTeam) {
					audioService.playLowCastleHp();
				}
				break;
			case 'horn':
				audioService.playHorn();
				break;
			case 'rescueStrike':
				audioService.playRescueStrike();
				break;
		}
	};

	const underAttackHandler = (team: MatchTeam) => {
		if (!getLocalTeam || team === getLocalTeam()) {
			audioService.playCastleUnderAttack();
		}
	};

	const lowHpHandler = (team: MatchTeam) => {
		if (!getLocalTeam || team === getLocalTeam()) {
			audioService.playLowCastleHp();
		}
	};

	sim.onSoundEffect = handler;
	if (getLocalTeam) {
		sim.onCastleUnderAttack = underAttackHandler;
		sim.onCastleLowHp = lowHpHandler;
	}

	return () => {
		if (sim.onSoundEffect === handler) {
			sim.onSoundEffect = undefined;
		}
		if (sim.onCastleUnderAttack === underAttackHandler) {
			sim.onCastleUnderAttack = undefined;
		}
		if (sim.onCastleLowHp === lowHpHandler) {
			sim.onCastleLowHp = undefined;
		}
	};
}
