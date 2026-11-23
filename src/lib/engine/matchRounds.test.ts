import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';

describe('Point 6: Multi-Round Match System (Best of 3 / Best of 5)', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 1000, targetWins: 2 });
	});

	it('initializes with default targetWins = 2 (Best of 3) and 0:0 score', () => {
		expect(sim.targetWins).toBe(2);
		expect(sim.score.west).toBe(0);
		expect(sim.score.east).toBe(0);
		expect(sim.round).toBe(1);
		expect(sim.winner).toBeNull();
		expect(sim.matchWinner).toBeNull();
	});

	it('awards round point when enemy castle is destroyed without ending match prematurely', () => {
		// Destroy East castle
		sim.castles.east.hp = 0;
		sim.step(0.05);

		expect(sim.winner).toBe('west');
		expect(sim.roundWinner).toBe('west');
		expect(sim.score.west).toBe(1);
		expect(sim.score.east).toBe(0);
		// Match is not over yet (needs 2 wins)
		expect(sim.matchWinner).toBeNull();
	});

	it('resets round state while preserving match series score', () => {
		sim.castles.east.hp = 0;
		sim.step(0.05);

		expect(sim.score.west).toBe(1);

		// Advance to Round 2
		sim.round++;
		sim.resetRound();

		expect(sim.round).toBe(2);
		expect(sim.score.west).toBe(1);
		expect(sim.score.east).toBe(0);
		expect(sim.winner).toBeNull();
		expect(sim.roundWinner).toBeNull();
		expect(sim.matchWinner).toBeNull();
		expect(sim.castles.west.hp).toBe(sim.castles.west.maxHp);
		expect(sim.castles.east.hp).toBe(sim.castles.east.maxHp);
	});

	it('declares matchWinner when targetWins is reached in Best of 3', () => {
		// Round 1: West wins
		sim.castles.east.hp = 0;
		sim.step(0.05);
		expect(sim.score.west).toBe(1);
		expect(sim.matchWinner).toBeNull();

		sim.round++;
		sim.resetRound();

		// Round 2: West wins again
		sim.castles.east.hp = 0;
		sim.step(0.05);
		expect(sim.score.west).toBe(2);
		expect(sim.winner).toBe('west');
		expect(sim.matchWinner).toBe('west');
	});

	it('supports Best of 5 (targetWins = 3)', () => {
		const bo5Sim = new Simulation({ botDifficulty: 0, startGold: 1000, targetWins: 3 });
		expect(bo5Sim.targetWins).toBe(3);

		// Win 2 rounds
		for (let r = 1; r <= 2; r++) {
			bo5Sim.castles.east.hp = 0;
			bo5Sim.step(0.05);
			expect(bo5Sim.score.west).toBe(r);
			expect(bo5Sim.matchWinner).toBeNull();
			bo5Sim.round++;
			bo5Sim.resetRound();
		}

		// Win round 3
		bo5Sim.castles.east.hp = 0;
		bo5Sim.step(0.05);
		expect(bo5Sim.score.west).toBe(3);
		expect(bo5Sim.matchWinner).toBe('west');
	});

	it('startNewMatch completely resets series score and winner', () => {
		sim.castles.east.hp = 0;
		sim.step(0.05);
		sim.round++;
		sim.resetRound();
		sim.castles.east.hp = 0;
		sim.step(0.05);

		expect(sim.matchWinner).toBe('west');
		expect(sim.score.west).toBe(2);

		// Start fresh match
		sim.startNewMatch(3);
		expect(sim.targetWins).toBe(3);
		expect(sim.round).toBe(1);
		expect(sim.score.west).toBe(0);
		expect(sim.score.east).toBe(0);
		expect(sim.winner).toBeNull();
		expect(sim.matchWinner).toBeNull();
	});

	it('triggers notifyStateChanged and onRoundEnd callback when castle is destroyed', () => {
		let reportedWinner: string | null = null;
		sim.onRoundEnd = (w) => {
			reportedWinner = w;
		};
		const initialVersion = sim.stateVersion;

		sim.castles.west.hp = 0;
		sim.step(0.05);

		expect(sim.winner).toBe('east');
		expect(reportedWinner).toBe('east');
		expect(sim.stateVersion).toBeGreaterThan(initialVersion);

		// While winner is declared, simulation steps return early without incrementing tick
		const frozenTick = sim.tick;
		sim.step(0.05);
		expect(sim.tick).toBe(frozenTick);

		// Calling resetRound clears winner and increments stateVersion
		const preResetVersion = sim.stateVersion;
		sim.resetRound();
		expect(sim.winner).toBeNull();
		expect(sim.stateVersion).toBeGreaterThan(preResetVersion);
	});
});
