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

	it('supports botVsBot mode without human player where both teams are controlled by BotAI', () => {
		const sim = new Simulation({
			botDifficulty: 15,
			startGold: 500,
			botVsBot: true
		});

		expect(sim.players.west.isBot).toBe(true);
		expect(sim.players.east.isBot).toBe(true);
		expect(sim.players.west.name).toBe('Бот (Захід)');

		// Both West and East bots must be registered in sim.bots
		const westBot = sim.bots.find((b) => b.getTeam() === 'west');
		const eastBot = sim.bots.find((b) => b.getTeam() === 'east');

		expect(westBot).toBeDefined();
		expect(eastBot).toBeDefined();
		expect(sim.bots.length).toBeGreaterThanOrEqual(2);

		// Step simulation with updateBots
		for (let s = 0; s < 10; s++) {
			sim.step(0.1);
			sim.updateBots(0.1);
		}

		// West bot should have been able to operate its worker / economy
		expect(sim.players.west.worker).toBeDefined();
	});

	it('persists and retrieves skip_start_modal debug preference in safe storage', () => {
		expect(storage.getJSON<boolean>('skip_start_modal', false)).toBe(false);

		storage.setJSON('skip_start_modal', true);
		expect(storage.getJSON<boolean>('skip_start_modal', false)).toBe(true);

		storage.setJSON('skip_start_modal', false);
		expect(storage.getJSON<boolean>('skip_start_modal', false)).toBe(false);
	});

	it('awards +30% starting gold when selecting random race during pre-match phase', () => {
		const startGold = 500;
		const sim = new Simulation({
			botDifficulty: 0,
			startGold,
			westRace: 'Люди',
			eastRace: 'Орки'
		});

		expect(sim.players.west.gold).toBe(500);
		expect(sim.players.west.isRandomRace).toBe(false);

		// Switch to random race within first 15 seconds
		const switched = sim.setPlayerRace('west', 'random');
		expect(switched).toBe(true);
		expect(sim.players.west.isRandomRace).toBe(true);
		expect(sim.players.west.randomGoldGranted).toBe(true);
		// 500 + round(500 * 0.3) = 500 + 150 = 650
		expect(sim.players.west.gold).toBe(650);

		// If player switches to a specific race before match starts, bonus is removed
		sim.setPlayerRace('west', 'Ельфи');
		expect(sim.players.west.isRandomRace).toBe(false);
		expect(sim.players.west.randomGoldGranted).toBe(false);
		expect(sim.players.west.gold).toBe(500);
	});

	it('preserves +30% random race bonus across resetRound() in multi-round matches', () => {
		const startGold = 600;
		const sim = new Simulation({
			botDifficulty: 15,
			startGold,
			westRace: 'random',
			eastRace: 'Орки'
		});

		// Starting gold with random bonus: 600 * 1.3 = 780
		expect(sim.players.west.gold).toBe(780);
		expect(sim.players.west.isRandomRace).toBe(true);

		// Simulate expenditure and round reset
		sim.players.west.gold = 120;
		sim.resetRound();

		// After round reset, random race player gets fresh 780 gold, while east (non-random) gets 600
		expect(sim.players.west.gold).toBe(780);
		expect(sim.players.east.gold).toBe(600);
	});

	it('enforces unique race rule preventing selection of enemy race', () => {
		const sim = new Simulation({
			botDifficulty: 0,
			startGold: 500,
			uniqueRaces: true,
			westRace: 'Люди',
			eastRace: 'Орки'
		});

		const success = sim.setPlayerRace('west', 'Орки');
		expect(success).toBe(false);
		expect(sim.players.west.race).toBe('Люди');
	});
});
