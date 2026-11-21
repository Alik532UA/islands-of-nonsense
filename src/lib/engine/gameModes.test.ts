import { describe, it, expect } from 'vitest';
import { GAME_MODES, getGameMode } from './gameModes';
import { Simulation } from './simulation';

describe('Point 9: Game Modes & Random Race Bonus (+30% Gold)', () => {
	it('містить стандартні, розширені та класичні турнірні режими (-ar, -ur)', () => {
		expect(GAME_MODES.standard).toBeDefined();
		expect(GAME_MODES.blitz).toBeDefined();
		expect(GAME_MODES.survival).toBeDefined();
		expect(GAME_MODES.sandbox).toBeDefined();
		expect(GAME_MODES.allRandom).toBeDefined();
		expect(GAME_MODES.uniqueRaces).toBeDefined();

		expect(GAME_MODES.allRandom.allRandom).toBe(true);
		expect(GAME_MODES.uniqueRaces.uniqueRaces).toBe(true);
	});

	it('getGameMode повертає правильні налаштування з фолбеком', () => {
		const blitz = getGameMode('blitz');
		expect(blitz.startGold).toBe(300);
		expect(blitz.incomeMultiplier).toBe(2.0);

		const fallback = getGameMode('unknown_mode');
		expect(fallback.id).toBe('standard');
	});

	it('надає +30% стартового золота за вибір випадкової раси', () => {
		const sim = new Simulation({
			botDifficulty: 0,
			startGold: 500,
			westRace: 'Люди'
		});

		// Player starts with standard 500 gold
		expect(sim.players.west.gold).toBe(500);
		expect(sim.players.west.isRandomRace).toBe(false);

		// Switch to random race at start of match
		const success = sim.setPlayerRace('west', 'random');
		expect(success).toBe(true);
		expect(sim.players.west.isRandomRace).toBe(true);

		// Gold should increase by +30% (500 + 150 = 650)
		expect(sim.players.west.gold).toBe(650);
	});

	it('скасовує бонус +30%, якщо гравець власноруч змінює випадкову расу на фіксовану', () => {
		const sim = new Simulation({
			botDifficulty: 0,
			startGold: 500,
			westRace: 'random'
		});

		// Initial random race had +30% bonus (650)
		expect(sim.players.west.gold).toBe(650);

		// Switch away from random to 'Люди'
		sim.setPlayerRace('west', 'Люди');
		expect(sim.players.west.race).toBe('Люди');
		expect(sim.players.west.isRandomRace).toBe(false);
		expect(sim.players.west.gold).toBe(500);
	});

	it('забороняє вибір однакової раси в режимі Unique Races (-ur)', () => {
		const sim = new Simulation({
			botDifficulty: 15,
			startGold: 500,
			uniqueRaces: true,
			westRace: 'Люди',
			eastRace: 'Орки'
		});

		// West attempts to pick East's race ('Орки')
		const result = sim.setPlayerRace('west', 'Орки');
		expect(result).toBe(false);
		expect(sim.players.west.race).toBe('Люди');

		// Picking another free race succeeds
		const validPick = sim.setPlayerRace('west', 'Нежить');
		expect(validPick).toBe(true);
		expect(sim.players.west.race).toBe('Нежить');
	});

	it('в режимі All Random (-ar) обидві команди отримують випадкові раси та бонус золота', () => {
		const sim = new Simulation({
			botDifficulty: 15,
			startGold: 500,
			allRandom: true,
			uniqueRaces: true
		});

		expect(sim.players.west.isRandomRace).toBe(true);
		expect(sim.players.east.isRandomRace).toBe(true);
		expect(sim.players.west.gold).toBe(650);
		expect(sim.players.east.gold).toBe(650);

		// Both teams should have different races due to uniqueRaces
		expect(sim.players.west.race).not.toBe(sim.players.east.race);
	});
});
