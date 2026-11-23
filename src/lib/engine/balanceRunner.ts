import { Simulation, type SimulationConfig } from './simulation.js';

export interface HeadlessMatchReport {
	winner: 'west' | 'east' | 'draw' | 'timeout';
	ticksRun: number;
	simulationDurationMs: number;
	westFinalHp: number;
	eastFinalHp: number;
	totalUnitsSpawned: number;
	totalBuildingsBuilt: number;
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
	static runMatch(
		maxTicks: number = 300,
		config: SimulationConfig = { botDifficulty: 1, startGold: 600 }
	): HeadlessMatchReport {
		const startTime = Date.now();
		const sim = new Simulation({
			...config,
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
			totalBuildingsBuilt: sim.buildings ? sim.buildings.length : 0
		};
	}

	static runTournament(matchCount: number = 5, maxTicksPerMatch: number = 200): TournamentReport {
		let westWins = 0;
		let eastWins = 0;
		let drawsOrTimeouts = 0;
		let totalTicks = 0;
		let totalTimeMs = 0;

		for (let i = 0; i < matchCount; i++) {
			const report = this.runMatch(maxTicksPerMatch);
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
}
