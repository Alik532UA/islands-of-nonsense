import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { sound, SoundService } from '../services/audio';
import type { SoundEffectType } from './types';

describe('Rescue Strike Warning & Tactical Audio Cue', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 1000 });
	});

	it('triggers rescueStrike sound effect and tactical warning callback on emergency castle rescue strike', () => {
		const soundEvents: SoundEffectType[] = [];
		sim.onSoundEffect = (s) => soundEvents.push(s);

		let warningEvent: {
			team: string;
			x: number;
			y: number;
			radius: number;
			kind: string;
		} | null = null;
		sim.onRescueStrikeWarning = (w) => {
			warningEvent = w;
		};

		const result = sim.triggerRescueStrike('west');
		expect(result).not.toBeNull();

		// Sound effect emitted
		expect(soundEvents).toContain('rescueStrike');

		// Tactical warning callback invoked
		expect(warningEvent).not.toBeNull();
		expect(warningEvent!.team).toBe('west');
		expect(warningEvent!.x).toBe(sim.castles.west.x);
		expect(warningEvent!.y).toBe(sim.castles.west.y);
		expect(warningEvent!.radius).toBe(750);
		expect(warningEvent!.kind).toBe('rescue');

		// Rescue strike effect registered with kind
		expect(sim.rescueStrikeEffects.length).toBe(1);
		expect(sim.rescueStrikeEffects[0].kind).toBe('rescue');
		expect(sim.rescueStrikeEffects[0].radius).toBe(750);
	});

	it('triggers rescueStrike sound and nuclear warning callback on Nuclear Warhead (I00N) usage', () => {
		const soundEvents: SoundEffectType[] = [];
		sim.onSoundEffect = (s) => soundEvents.push(s);

		let warningEvent: {
			team: string;
			x: number;
			y: number;
			radius: number;
			kind: string;
		} | null = null;
		sim.onRescueStrikeWarning = (w) => {
			warningEvent = w;
		};

		// Enable nuclear warheads in game mode config
		sim.gameModeConfig = {
			...sim.gameModeConfig,
			nuclearWarheads: true
		};

		// Buy I00N (cost 850g)
		sim.players.west.gold = 1000;
		const bought = sim.buyCastleItem('west', 'I00N');
		expect(bought).toBe(true);

		// Sound effect emitted
		expect(soundEvents).toContain('rescueStrike');

		// Nuclear warning callback fired
		expect(warningEvent).not.toBeNull();
		expect(warningEvent!.team).toBe('west');
		expect(warningEvent!.x).toBe(sim.castles.east.x);
		expect(warningEvent!.y).toBe(sim.castles.east.y);
		expect(warningEvent!.radius).toBe(900);
		expect(warningEvent!.kind).toBe('nuke');

		// Effect created with nuke styling
		const nukeEff = sim.rescueStrikeEffects.find((e) => e.kind === 'nuke');
		expect(nukeEff).toBeDefined();
		expect(nukeEff!.radius).toBe(900);
	});

	it('sound service playRescueStrike executes safely in headless environment', () => {
		const svc = new SoundService();
		expect(() => svc.playRescueStrike()).not.toThrow();
		expect(() => sound.playRescueStrike()).not.toThrow();
	});
});
