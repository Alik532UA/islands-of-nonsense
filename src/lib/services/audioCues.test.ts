import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sound, SoundService } from './audio';
import { Simulation } from '../engine/simulation';
import type { SoundEffectType } from '../engine/types';

describe('Point 10: Authentic WC3 Ambient Audio Cues and Voice Alerts', () => {
	describe('SoundService Unit Tests', () => {
		it('should safely handle audio playback in headless environment without window.AudioContext', () => {
			const svc = new SoundService();
			expect(svc.isEnabled()).toBe(true);
			expect(svc.getVolume()).toBe(0.5);

			// Calling any sound method should not throw even if AudioContext is unavailable
			expect(() => svc.playBuild()).not.toThrow();
			expect(() => svc.playUpgrade()).not.toThrow();
			expect(() => svc.playBuildingComplete()).not.toThrow();
			expect(() => svc.playCastleUnderAttack()).not.toThrow();
			expect(() => svc.playBossSpawn()).not.toThrow();
			expect(() => svc.playVictory()).not.toThrow();
			expect(() => svc.playDefeat()).not.toThrow();
			expect(() => svc.playErrorResource()).not.toThrow();
			expect(() => svc.playLowCastleHp()).not.toThrow();
			expect(() => svc.playWorkerSelect()).not.toThrow();
			expect(() => svc.playHorn()).not.toThrow();
		});

		it('should respect enabled toggle and volume bounds', () => {
			const svc = new SoundService();
			svc.setEnabled(false);
			expect(svc.isEnabled()).toBe(false);

			svc.setVolume(1.5);
			expect(svc.getVolume()).toBe(1.0);

			svc.setVolume(-0.5);
			expect(svc.getVolume()).toBe(0.0);

			svc.setVolume(0.7);
			expect(svc.getVolume()).toBe(0.7);
		});

		it('should interact properly with Web Audio API mock nodes', () => {
			const createdOscillators: {
				type: string;
				freq: number;
				started: boolean;
				stopped: boolean;
			}[] = [];
			const createdGains: { value: number }[] = [];

			const createFilterSpy = vi.fn(() => ({
				type: 'lowpass',
				frequency: { setValueAtTime: vi.fn() },
				Q: { setValueAtTime: vi.fn() },
				connect: vi.fn()
			}));

			class MockAudioContext {
				currentTime = 10.0;
				state = 'running';
				destination = {};
				resume = vi.fn().mockResolvedValue(undefined);
				createOscillator = vi.fn(() => {
					const osc = {
						type: 'sine',
						frequency: {
							setValueAtTime: vi.fn((val: number) => {
								oscData.freq = val;
							}),
							exponentialRampToValueAtTime: vi.fn()
						},
						connect: vi.fn(),
						start: vi.fn(() => {
							oscData.started = true;
						}),
						stop: vi.fn(() => {
							oscData.stopped = true;
						})
					};
					const oscData = { type: 'sine', freq: 440, started: false, stopped: false };
					createdOscillators.push(oscData);
					return osc;
				});
				createGain = vi.fn(() => {
					const gain = {
						gain: {
							setValueAtTime: vi.fn((val: number) => {
								gainData.value = val;
							}),
							exponentialRampToValueAtTime: vi.fn()
						},
						connect: vi.fn()
					};
					const gainData = { value: 1.0 };
					createdGains.push(gainData);
					return gain;
				});
				createBiquadFilter = createFilterSpy;
			}

			// Provide mock to window
			const originalWindow = global.window;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(global as any).window = {
				AudioContext: MockAudioContext
			};

			try {
				const svc = new SoundService();
				svc.setVolume(0.8);

				// 1. Building complete
				svc.playBuildingComplete();
				expect(createdOscillators.length).toBeGreaterThan(0);

				// 2. Castle under attack war horn
				createdOscillators.length = 0;
				svc.playCastleUnderAttack();
				expect(createdOscillators.length).toBe(2);
				expect(createFilterSpy).toHaveBeenCalled();

				// 3. Victory fanfare
				createdOscillators.length = 0;
				svc.playVictory();
				expect(createdOscillators.length).toBe(4);

				// 4. Defeat cue
				createdOscillators.length = 0;
				svc.playDefeat();
				expect(createdOscillators.length).toBe(4);

				// 5. Boss spawn
				createdOscillators.length = 0;
				svc.playBossSpawn();
				expect(createdOscillators.length).toBe(5); // 1 sub + 3 gong + 1 roar

				// 6. Resource error buzz
				createdOscillators.length = 0;
				svc.playErrorResource();
				expect(createdOscillators.length).toBe(2); // dual buzz oscillators

				// 7. Low castle HP pulse
				createdOscillators.length = 0;
				svc.playLowCastleHp();
				expect(createdOscillators.length).toBe(2);
			} finally {
				global.window = originalWindow;
			}
		});
	});

	describe('Engine Audio Cue Triggers and Events', () => {
		let sim: Simulation;
		const soundEvents: SoundEffectType[] = [];

		beforeEach(() => {
			soundEvents.length = 0;
			sim = new Simulation({
				botDifficulty: 0,
				startGold: 1000,
				westRace: 'Люди',
				eastRace: 'Орки'
			});
			sim.decorations = [];
			sim.onSoundEffect = (s: SoundEffectType) => {
				soundEvents.push(s);
			};
		});

		afterEach(() => {
			soundEvents.length = 0;
		});

		it('should trigger buildingComplete audio cue when building construction finishes', () => {
			let completedBuildingInstance = '';
			sim.onBuildingComplete = (b) => {
				completedBuildingInstance = b.instanceId;
			};

			const success = sim.build('west', 'h003', 25, 20);
			expect(success).toBe(true);
			const bld = sim.buildings[0];
			expect(bld.isUnderConstruction).toBe(true);

			// Worker arrives and finishes construction
			if (sim.players.west.worker) {
				sim.players.west.worker.x = bld.x;
				sim.players.west.worker.y = bld.y;
				sim.players.west.worker.targetBuildingId = bld.instanceId;
			}
			bld.buildProgress = bld.maxBuildProgress || 3.5;
			sim.workerSystem.updateWorkers(0.1);

			expect(bld.isUnderConstruction).toBe(false);
			expect(soundEvents).toContain('buildingComplete');
			expect(completedBuildingInstance).toBe(bld.instanceId);
		});

		it('should trigger castleUnderAttack cue when castle takes damage, rate limited to avoid spam', () => {
			let underAttackTeam = '';
			sim.onCastleUnderAttack = (team, _ratio) => {
				underAttackTeam = team;
			};

			const attacker = sim.spawnUnitDirectly({
				team: 'east',
				lane: 'top',
				x: 200,
				y: sim.topLaneY,
				damage: 50
			});

			sim.step(0.1);

			// Deal damage to west castle
			sim.combatSystem.defenseSystem.attackCastle(attacker, sim.castles.west);

			expect(soundEvents).toContain('castleUnderAttack');
			expect(underAttackTeam).toBe('west');

			// Immediate subsequent hit should NOT trigger a second audio alert (rate limited)
			const initialEventsCount = soundEvents.filter((s) => s === 'castleUnderAttack').length;
			sim.combatSystem.defenseSystem.attackCastle(attacker, sim.castles.west);
			const secondEventsCount = soundEvents.filter((s) => s === 'castleUnderAttack').length;
			expect(secondEventsCount).toBe(initialEventsCount);

			// After 10+ seconds elapse, alert fires again
			sim.step(11.0);
			sim.combatSystem.defenseSystem.attackCastle(attacker, sim.castles.west);
			const thirdEventsCount = soundEvents.filter((s) => s === 'castleUnderAttack').length;
			expect(thirdEventsCount).toBe(initialEventsCount + 1);
		});

		it('should trigger bossSpawn cue when neutral Boss or Legendary unit appears', () => {
			let spawnedBossName = '';
			sim.onBossSpawn = (u) => {
				spawnedBossName = u.name;
			};

			const boss = sim.spawnBoss();
			expect(boss.isBoss).toBe(true);
			expect(soundEvents).toContain('bossSpawn');
			expect(spawnedBossName).toBe(boss.name);
		});

		it('should trigger victory cue when west wins round, and defeat when east wins', () => {
			// West wins round
			sim.castles.east.hp = 0;
			sim.step(0.05);

			expect(soundEvents).toContain('victory');
			expect(sim.roundWinner).toBe('west');

			// Reset and test defeat
			sim.resetRound();
			soundEvents.length = 0;

			sim.castles.west.hp = 0;
			sim.step(0.05);

			expect(soundEvents).toContain('defeat');
			expect(sim.roundWinner).toBe('east');
		});

		it('should trigger lowCastleHp cue when west castle is critically damaged (<30% HP)', () => {
			sim.castles.west.hp = sim.castles.west.maxHp * 0.2; // 20% HP
			sim.step(0.1);

			expect(soundEvents).toContain('lowCastleHp');

			// Rate limited
			const count1 = soundEvents.filter((s) => s === 'lowCastleHp').length;
			sim.step(1.0);
			const count2 = soundEvents.filter((s) => s === 'lowCastleHp').length;
			expect(count2).toBe(count1);

			// After 8s, fires again
			sim.step(8.5);
			const count3 = soundEvents.filter((s) => s === 'lowCastleHp').length;
			expect(count3).toBe(count1 + 1);
		});

		it('should trigger errorResource cue when human player lacks gold or food for building', () => {
			sim.players.west.gold = 20; // Not enough gold for h003 (cost 160)
			soundEvents.length = 0;

			const built = sim.build('west', 'h003', 25, 20);
			expect(built).toBe(false);
			expect(soundEvents).toContain('errorResource');

			// Not enough food for legendary building
			sim.players.west.gold = 5000;
			sim.players.west.food = 1;
			sim.players.west.maxFood = 1;
			soundEvents.length = 0;

			const builtLeg = sim.build('west', 'h05F', 25, 20);
			expect(builtLeg).toBe(false);
			expect(soundEvents).toContain('errorResource');
		});

		it('should trigger upgrade cue when building upgrade completes successfully', () => {
			sim.players.west.gold = 2000;
			sim.players.west.lumber = 500;
			soundEvents.length = 0;

			sim.build('west', 'h003', 25, 20);
			const bld = sim.buildings[0];
			soundEvents.length = 0;

			const upgraded = sim.upgradeBuilding('west', bld.instanceId, 'h05D');
			expect(upgraded).toBe(true);
			expect(soundEvents).toContain('upgrade');
		});

		it('singleton sound instance should be defined and exported', () => {
			expect(sound).toBeDefined();
			expect(typeof sound.playBuild).toBe('function');
			expect(typeof sound.playCastleUnderAttack).toBe('function');
			expect(typeof sound.playBuildingComplete).toBe('function');
			expect(typeof sound.playBossSpawn).toBe('function');
			expect(typeof sound.playVictory).toBe('function');
			expect(typeof sound.playDefeat).toBe('function');
			expect(typeof sound.playErrorResource).toBe('function');
		});
	});
});
