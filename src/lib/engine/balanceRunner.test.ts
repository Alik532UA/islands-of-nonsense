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

	it('should produce 100% deterministic results when executed with identical seed', () => {
		const seed = 4242;
		const matchA = HeadlessBalanceRunner.runMatch(
			120,
			{ botDifficulty: 1, startGold: 600, westRace: 'human', eastRace: 'orc' },
			seed
		);
		const matchB = HeadlessBalanceRunner.runMatch(
			120,
			{ botDifficulty: 1, startGold: 600, westRace: 'human', eastRace: 'orc' },
			seed
		);

		expect(matchA.seed).toBe(seed);
		expect(matchB.seed).toBe(seed);
		expect(matchA.ticksRun).toBe(matchB.ticksRun);
		expect(matchA.winner).toBe(matchB.winner);
		expect(matchA.westFinalHp).toBe(matchB.westFinalHp);
		expect(matchA.eastFinalHp).toBe(matchB.eastFinalHp);
		expect(matchA.totalUnitsSpawned).toBe(matchB.totalUnitsSpawned);
		expect(matchA.totalBuildingsBuilt).toBe(matchB.totalBuildingsBuilt);
	});

	it('should produce deterministic aggregated results across seeded tournaments', () => {
		const baseSeed = 8888;
		const tourneyA = HeadlessBalanceRunner.runTournament(2, 40, baseSeed);
		const tourneyB = HeadlessBalanceRunner.runTournament(2, 40, baseSeed);

		expect(tourneyA.matchesCount).toBe(tourneyB.matchesCount);
		expect(tourneyA.westWins).toBe(tourneyB.westWins);
		expect(tourneyA.eastWins).toBe(tourneyB.eastWins);
		expect(tourneyA.drawsOrTimeouts).toBe(tourneyB.drawsOrTimeouts);
		expect(tourneyA.averageTicks).toBe(tourneyB.averageTicks);
	});

	it('should restore global Math.random after seeded match execution', () => {
		const initialRandom = Math.random;
		HeadlessBalanceRunner.runMatch(30, { botDifficulty: 1, startGold: 600 }, 12345);

		// Math.random must still be functional and return standard (0, 1) float
		const r = Math.random();
		expect(r).toBeGreaterThanOrEqual(0);
		expect(r).toBeLessThan(1);
		expect(Math.random).toBe(initialRandom);
	});
});
