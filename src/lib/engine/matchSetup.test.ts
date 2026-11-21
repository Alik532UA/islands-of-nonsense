import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation, type SimulationConfig } from './simulation';
import { storage } from '../services/storage';

describe('Point 7: Start Match Setup & Configuration', () => {
	const mockStore: Record<string, string> = {};

	beforeEach(() => {
		for (const k of Object.keys(mockStore)) {
			delete mockStore[k];
		}
		(globalThis as unknown as { window: unknown }).window = {
			localStorage: {
				getItem: (key: string) => mockStore[key] ?? null,
				setItem: (key: string, value: string) => {
					mockStore[key] = value;
				},
				removeItem: (key: string) => {
					delete mockStore[key];
				},
				get length() {
					return Object.keys(mockStore).length;
				},
				key: (i: number) => Object.keys(mockStore)[i] ?? null
			},
			sessionStorage: {
				getItem: () => null,
				setItem: () => {},
				removeItem: () => {},
				length: 0,
				key: () => null
			}
		};
		storage.clear();
	});

	it('configures simulation with custom match settings', () => {
		const customConfig: SimulationConfig = {
			botDifficulty: 80,
			startGold: 1000,
			targetWins: 3,
			modeId: 'blitz',
			westRace: 'Орки',
			eastRace: 'Нежить'
		};

		const sim = new Simulation(customConfig);

		expect(sim.config.botDifficulty).toBe(80);
		expect(sim.config.startGold).toBe(1000);
		expect(sim.targetWins).toBe(3);
		expect(sim.players.west.race).toBe('Орки');
		expect(sim.players.east.race).toBe('Нежить');
		expect(sim.players.west.gold).toBe(1000);
		// East bot receives gold based on difficulty
		expect(sim.players.east.gold).toBeGreaterThanOrEqual(1000);
	});

	it('saves and loads match configuration in storage with namespace safety', () => {
		const settings: SimulationConfig = {
			botDifficulty: 30,
			startGold: 300,
			targetWins: 2,
			modeId: 'uniqueRaces',
			uniqueRaces: true,
			westRace: 'Хаос'
		};

		storage.setJSON('match_settings', settings);

		const retrieved = storage.getJSON<SimulationConfig | null>('match_settings', null);
		expect(retrieved).not.toBeNull();
		expect(retrieved?.botDifficulty).toBe(30);
		expect(retrieved?.startGold).toBe(300);
		expect(retrieved?.targetWins).toBe(2);
		expect(retrieved?.modeId).toBe('uniqueRaces');
		expect(retrieved?.westRace).toBe('Хаос');
	});

	it('supports sudden death 1-round match configuration', () => {
		const sim = new Simulation({
			botDifficulty: 15,
			startGold: 150,
			targetWins: 1
		});

		expect(sim.targetWins).toBe(1);

		// Winning 1 round should immediately trigger match victory
		sim.castles.east.hp = 0;
		sim.step(0.05);

		expect(sim.score.west).toBe(1);
		expect(sim.winner).toBe('west');
		expect(sim.matchWinner).toBe('west');
	});
});
