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

	it('should run balance audit and assert all 11 races stay within canon tolerance corridor (±12%)', () => {
		const report = HeadlessBalanceRunner.runBalanceAudit(12);

		expect(report.races.length).toBe(11);
		expect(report.totalBuildingsEvaluated).toBeGreaterThan(90);
		expect(report.globalAveragePower).toBeGreaterThan(50);
		expect(report.outliers.length).toBe(0);

		for (const race of report.races) {
			expect(Math.abs(race.deviationPercent)).toBeLessThanOrEqual(12);
		}
	});

	it('should enforce CI balance gate ensuring passed === true for all 11 races', () => {
		const result = HeadlessBalanceRunner.verifyRaceBalanceGate(12);

		expect(result.passed).toBe(true);
		expect(result.report.outliers.length).toBe(0);
		expect(result.report.races.length).toBe(11);
	});
});
