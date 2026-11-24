import { Simulation, type SimulationConfig } from './simulation.js';
import { analyzeAllRaces, type OverallBalanceReport } from './balanceAnalyzer.js';

export interface HeadlessMatchReport {
	winner: 'west' | 'east' | 'draw' | 'timeout';
	ticksRun: number;
	simulationDurationMs: number;
	westFinalHp: number;
	eastFinalHp: number;
	totalUnitsSpawned: number;
	totalBuildingsBuilt: number;
	seed?: number;
}

export interface TournamentReport {
	matchesCount: number;
	westWins: number;
	eastWins: number;
	drawsOrTimeouts: number;
	averageTicks: number;
	averageExecutionTimeMs: number;
}

export class HeadlessBalanceRunner {
	/**
	 * Mulberry32 32-bit deterministic PRNG generator.
	 */
	static createPRNG(seed: number): () => number {
		let s = seed >>> 0;
		return function () {
			s = (s + 0x6d2b79f5) >>> 0;
			let t = Math.imul(s ^ (s >>> 15), 1 | s);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	static runMatch(
		maxTicks: number = 300,
		config: SimulationConfig = { botDifficulty: 1, startGold: 600 },
		seed?: number
	): HeadlessMatchReport {
		const effectiveSeed = seed ?? config.seed;
		const origRandom = Math.random;
		if (effectiveSeed !== undefined) {
			Math.random = HeadlessBalanceRunner.createPRNG(effectiveSeed);
		}

		try {
			const startTime = Date.now();
			const sim = new Simulation({
				...config,
				seed: effectiveSeed,
				isRunning: true
			});

			let ticksRun = 0;
			const dt = 1 / 60;

			const isOver = () => {
				const wHp = sim.castles?.west?.hp ?? 0;
				const eHp = sim.castles?.east?.hp ?? 0;
				return sim.winner !== null || sim.matchWinner !== null || wHp <= 0 || eHp <= 0;
			};

			while (ticksRun < maxTicks && !isOver()) {
				sim.step(dt);
				ticksRun++;
			}

			const durationMs = Date.now() - startTime;
			let winner: 'west' | 'east' | 'draw' | 'timeout' = 'draw';

			const westHp = sim.castles?.west?.hp ?? 0;
			const eastHp = sim.castles?.east?.hp ?? 0;

			if (isOver()) {
				if (westHp <= 0 && eastHp <= 0) {
					winner = 'draw';
				} else if (westHp <= 0 || sim.winner === 'east' || sim.matchWinner === 'east') {
					winner = 'east';
				} else if (eastHp <= 0 || sim.winner === 'west' || sim.matchWinner === 'west') {
					winner = 'west';
				}
			} else {
				winner = 'timeout';
			}

			return {
				winner,
				ticksRun,
				simulationDurationMs: durationMs,
				westFinalHp: Math.max(0, westHp),
				eastFinalHp: Math.max(0, eastHp),
				totalUnitsSpawned: sim.units ? sim.units.length : 0,
				totalBuildingsBuilt: sim.buildings ? sim.buildings.length : 0,
				seed: effectiveSeed
			};
		} finally {
			if (effectiveSeed !== undefined) {
				Math.random = origRandom;
			}
		}
	}

	static runTournament(
		matchCount: number = 5,
		maxTicksPerMatch: number = 200,
		baseSeed?: number
	): TournamentReport {
		let westWins = 0;
		let eastWins = 0;
		let drawsOrTimeouts = 0;
		let totalTicks = 0;
		let totalTimeMs = 0;

		for (let i = 0; i < matchCount; i++) {
			const seed = baseSeed !== undefined ? (baseSeed + i * 10007) >>> 0 : undefined;
			const report = this.runMatch(
				maxTicksPerMatch,
				{ botDifficulty: 1, startGold: 600, seed },
				seed
			);
			totalTicks += report.ticksRun;
			totalTimeMs += report.simulationDurationMs;

			if (report.winner === 'west') westWins++;
			else if (report.winner === 'east') eastWins++;
			else drawsOrTimeouts++;
		}

		return {
			matchesCount: matchCount,
			westWins,
			eastWins,
			drawsOrTimeouts,
			averageTicks: Math.round(totalTicks / matchCount),
			averageExecutionTimeMs: Math.round(totalTimeMs / matchCount)
		};
	}

	/**
	 * Executes mathematical balance audit across all 11 races.
	 * Asserts that all race power-per-gold metrics stay within the tolerance corridor (canon ±12%).
	 */
	static runBalanceAudit(tolerancePercent: number = 12): OverallBalanceReport {
		return analyzeAllRaces(tolerancePercent);
	}

	/**
	 * Checks whether all 11 races pass the CI balance gate.
	 */
	static verifyRaceBalanceGate(tolerancePercent: number = 12): {
		passed: boolean;
		report: OverallBalanceReport;
	} {
		const report = analyzeAllRaces(tolerancePercent);
		return {
			passed: report.outliers.length === 0 && report.races.length === 11,
			report
		};
	}
}
