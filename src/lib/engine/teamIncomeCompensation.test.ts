import { describe, it, expect } from 'vitest';
import { Simulation } from './simulation';

describe('Point 4: Unequal Team Income Multiplier (jo[team] = opponentCount / allyCount)', () => {
	it('applies 1.0 multiplier when teams are balanced (1v1, 2v2, 3v3)', () => {
		const sim1v1 = new Simulation({ teamSize: 1, botDifficulty: 0, startGold: 2000 });
		sim1v1.decorations = [];
		sim1v1.build('west', 'h037', 25, 20);
		const inc1 = sim1v1.calculateIncome('west');

		const sim2v2 = new Simulation({ teamSize: 2, botDifficulty: 0, startGold: 2000 });
		sim2v2.decorations = [];
		sim2v2.build('west', 'h037', 25, 20);
		const inc2 = sim2v2.calculateIncome('west', sim2v2.players.west);

		expect(inc1).toBe(inc2);
	});

	it('compensates outnumbered team with 2.0x income in 1v2 matches', () => {
		const sim1v1 = new Simulation({ teamSize: 1, botDifficulty: 0, startGold: 2000 });
		sim1v1.decorations = [];
		sim1v1.build('west', 'h037', 25, 20);
		const normalIncome = sim1v1.calculateIncome('west');

		const sim1v2 = new Simulation({
			teamSizeWest: 1,
			teamSizeEast: 2,
			botDifficulty: 0,
			startGold: 2000
		});
		sim1v2.decorations = [];
		expect(sim1v2.teamMembers.west.length).toBe(1);
		expect(sim1v2.teamMembers.east.length).toBe(2);

		sim1v2.build('west', 'h037', 25, 20);
		const soloIncome = sim1v2.calculateIncome('west');

		// 2.0x multiplier: should be exactly double the normal income
		expect(soloIncome).toBe(normalIncome * 2);

		// Enemy team has 2 players against 1, so jo[east] is 1.0
		sim1v2.build('east', 'h037', 25, 20);
		const enemyIncome = sim1v2.calculateIncome('east', sim1v2.players.east);
		expect(enemyIncome).toBe(normalIncome);
	});

	it('compensates outnumbered team with 3.0x income in 1v3 matches', () => {
		const sim1v1 = new Simulation({ teamSize: 1, botDifficulty: 0, startGold: 2000 });
		sim1v1.decorations = [];
		sim1v1.build('west', 'h037', 25, 20);
		const normalIncome = sim1v1.calculateIncome('west');

		const sim1v3 = new Simulation({
			teamSizeWest: 1,
			teamSizeEast: 3,
			botDifficulty: 0,
			startGold: 2000
		});
		sim1v3.decorations = [];
		expect(sim1v3.teamMembers.west.length).toBe(1);
		expect(sim1v3.teamMembers.east.length).toBe(3);

		sim1v3.build('west', 'h037', 25, 20);
		const soloIncome = sim1v3.calculateIncome('west');

		expect(soloIncome).toBe(normalIncome * 3);
	});

	it('compensates 2v3 matches with 1.5x income multiplier for the 2-player team', () => {
		const sim1v1 = new Simulation({ teamSize: 1, botDifficulty: 0, startGold: 2000 });
		sim1v1.decorations = [];
		sim1v1.build('west', 'h037', 25, 20);
		sim1v1.build('west', 'h038', 25, 24);
		const normalIncome = sim1v1.calculateIncome('west');

		const sim2v3 = new Simulation({
			teamSizeWest: 2,
			teamSizeEast: 3,
			botDifficulty: 0,
			startGold: 2000
		});
		sim2v3.decorations = [];
		expect(sim2v3.teamMembers.west.length).toBe(2);
		expect(sim2v3.teamMembers.east.length).toBe(3);

		sim2v3.build('west', 'h037', 25, 20);
		sim2v3.build('west', 'h038', 25, 24);
		const duoIncome = sim2v3.calculateIncome('west', sim2v3.players.west);

		expect(duoIncome).toBeGreaterThan(normalIncome);
		expect(duoIncome).toBe(Math.round(normalIncome * 1.5));
	});
});
