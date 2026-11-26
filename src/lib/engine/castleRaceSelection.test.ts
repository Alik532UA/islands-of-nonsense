import { describe, expect, it } from 'vitest';
import { Simulation } from './simulation';

describe('Castle race selection after in-game race pick', () => {
	it('keeps castles hidden (race undefined) until pending human players pick their races', () => {
		const sim = new Simulation({
			botDifficulty: 1,
			startGold: 150,
			westRace: 'in_game',
			eastRace: 'Орки'
		});

		expect(sim.players.west.pendingRacePick).toBe(true);
		expect(sim.castles.west.race).toBeUndefined();
		expect(sim.castles.east.race).toBeUndefined();

		const ok = sim.setPlayerRace('west', 'Нежить');
		expect(ok).toBe(true);
		expect(sim.players.west.pendingRacePick).toBe(false);
		expect(sim.castles.west.race).toBe('Нежить');
		expect(sim.castles.east.race).toBe('Орки');
	});

	it('prioritizes human player race over bot allies on the same team', () => {
		const sim = new Simulation({
			botDifficulty: 1,
			startGold: 150,
			customSlots: [
				{ slot: 1, team: 'west', isBot: false, race: 'in_game', name: 'Гравець' },
				{ slot: 3, team: 'west', isBot: true, race: 'Орки', name: 'Бот 1' },
				{ slot: 5, team: 'west', isBot: true, race: 'Демони', name: 'Бот 2' },
				{ slot: 2, team: 'east', isBot: true, race: 'Ельфи', name: 'Ворог' }
			]
		});

		expect(sim.castles.west.race).toBeUndefined();
		expect(sim.castles.east.race).toBeUndefined();

		sim.setPlayerRace('west', 'Наги', sim.teamMembers.west[0]);
		expect(sim.castles.west.race).toBe('Наги');
		expect(sim.castles.east.race).toBe('Ельфи');
	});

	it('picks randomly among human players when a team has multiple humans without bots', () => {
		const pickedRaces = new Set<string>();
		for (let seed = 1; seed <= 30; seed++) {
			const sim = new Simulation({
				botDifficulty: 1,
				startGold: 150,
				seed,
				customSlots: [
					{ slot: 1, team: 'west', isBot: false, race: 'in_game', name: 'Гравець 1' },
					{ slot: 3, team: 'west', isBot: false, race: 'in_game', name: 'Гравець 2' },
					{ slot: 2, team: 'east', isBot: true, race: 'Альянс', name: 'Ворог' }
				]
			});

			expect(sim.castles.west.race).toBeUndefined();

			sim.setPlayerRace('west', 'Північ', sim.teamMembers.west[0]);
			// Still waiting for Player 2
			expect(sim.castles.west.race).toBeUndefined();

			sim.setPlayerRace('west', 'Техніки', sim.teamMembers.west[1]);
			expect(['Північ', 'Техніки']).toContain(sim.castles.west.race);
			if (sim.castles.west.race) pickedRaces.add(sim.castles.west.race);
		}

		expect(pickedRaces.has('Північ')).toBe(true);
		expect(pickedRaces.has('Техніки')).toBe(true);
	});
});
