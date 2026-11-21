/**
 * Match Statistics & Event Tracker (SCALABILITY-v10 & OBSERVABILITY-v10).
 */
export interface MatchSummary {
	timestamp: number;
	durationSeconds: number;
	winner: 'WEST' | 'EAST' | 'DRAW';
	playerCommanderId: number;
	totalGoldEarned: number;
	unitsSpawned: number;
	buildingsBuilt: number;
	forgeUpgradesCount: number;
}

export class MatchStatsTracker {
	private summary: MatchSummary;

	constructor(playerCommanderId = 1) {
		this.summary = {
			timestamp: Date.now(),
			durationSeconds: 0,
			winner: 'DRAW',
			playerCommanderId,
			totalGoldEarned: 0,
			unitsSpawned: 0,
			buildingsBuilt: 0,
			forgeUpgradesCount: 0
		};
	}

	public addGold(amount: number): void {
		this.summary.totalGoldEarned += Math.max(0, amount);
	}

	public recordUnitSpawn(): void {
		this.summary.unitsSpawned++;
	}

	public recordBuildingBuilt(): void {
		this.summary.buildingsBuilt++;
	}

	public recordForgeUpgrade(): void {
		this.summary.forgeUpgradesCount++;
	}

	public finalize(durationSeconds: number, winner: 'WEST' | 'EAST' | 'DRAW'): MatchSummary {
		this.summary.durationSeconds = Math.round(durationSeconds);
		this.summary.winner = winner;
		return { ...this.summary };
	}

	public getSnapshot(): MatchSummary {
		return { ...this.summary };
	}
}
