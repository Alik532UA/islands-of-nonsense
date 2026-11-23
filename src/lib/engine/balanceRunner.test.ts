import { describe, it, expect } from 'vitest';
import { HeadlessBalanceRunner } from './balanceRunner.js';

describe('HeadlessBalanceRunner (Deterministic Simulation Benchmark)', () => {
	it('should execute a headless match without DOM in under 1 second', () => {
		const report = HeadlessBalanceRunner.runMatch(60, {
			botDifficulty: 1,
			startGold: 600,
			isRunning: true
		});

		expect(report).toBeDefined();
		expect(report.ticksRun).toBe(60);
		expect(typeof report.westFinalHp).toBe('number');
		expect(typeof report.eastFinalHp).toBe('number');
		expect(report.simulationDurationMs).toBeLessThan(1000);
	});

	it('should simulate a mini tournament of matches and aggregate metrics', () => {
		const tournament = HeadlessBalanceRunner.runTournament(2, 30);

		expect(tournament.matchesCount).toBe(2);
		expect(tournament.averageTicks).toBe(30);
		expect(tournament.westWins + tournament.eastWins + tournament.drawsOrTimeouts).toBe(2);
	});
});
