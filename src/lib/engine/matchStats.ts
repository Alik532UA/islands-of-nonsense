/**
 * Match Statistics & Event Tracker (SCALABILITY-v10 & OBSERVABILITY-v10).
 * Expanded with authentic WC3 post-match analytics and unit efficiency metrics (analyze.py / power.json).
 */
import type { Simulation } from './simulation';
import type { MatchTeam } from './types';
import { calculateBuildingPower } from './balanceAnalyzer';
import { getBuilding } from './gameData';

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

export interface PlayerAnalytics {
	team: MatchTeam;
	commander: number;
	race: string;
	castleHp: number;
	castleMaxHp: number;
	totalDamageDealt: number;
	damageToCastle: number;
	unitsSpawned: number;
	unitsKilled: number;
	goldEarned: number;
	goldSpent: number;
	lumberEarned: number;
	lumberSpent: number;
	coinsCollected: number;
	itemsPurchased: number;
	damageByAttackType: Record<string, number>;
	damageByArmorType: Record<string, number>;
}

export interface BuildingAnalyticsEntry {
	defId: string;
	name: string;
	team: MatchTeam;
	race: string;
	chainCost: number;
	unitId: string;
	unitName: string;
	unitHp: number;
	unitArmor: number;
	unitDps: number;
	unitEhp: number;
	powerPerGold: number;
	kills: number;
	damage: number;
	isMvp: boolean;
}

export interface MatchAnalyticsReport {
	timestamp: number;
	durationSeconds: number;
	winner: MatchTeam | 'draw' | null;
	gameMode: string;
	botDifficulty: number;
	players: {
		west: PlayerAnalytics;
		east: PlayerAnalytics;
	};
	buildings: BuildingAnalyticsEntry[];
	mvpBuildings: {
		west: BuildingAnalyticsEntry | null;
		east: BuildingAnalyticsEntry | null;
	};
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

export function generateMatchAnalytics(sim: Simulation): MatchAnalyticsReport {
	const pWest = sim.players.west;
	const pEast = sim.players.east;
	const cWest = sim.castles.west;
	const cEast = sim.castles.east;

	const westAnalytics: PlayerAnalytics = {
		team: 'west',
		commander: pWest.commander,
		race: pWest.race,
		castleHp: Math.max(0, Math.round(cWest.hp)),
		castleMaxHp: cWest.maxHp,
		totalDamageDealt: Math.round(pWest.stats.totalDamageDealt),
		damageToCastle: Math.round(pWest.stats.damageToCastle),
		unitsSpawned: pWest.stats.unitsSpawned,
		unitsKilled: pWest.stats.unitsKilled,
		goldEarned: Math.round(pWest.gold),
		goldSpent: pWest.stats.goldSpent,
		lumberEarned: pWest.stats.lumberEarned ?? 0,
		lumberSpent: pWest.stats.lumberSpent ?? 0,
		coinsCollected: pWest.stats.coinsCollected,
		itemsPurchased: pWest.stats.itemsPurchased,
		damageByAttackType: { ...(pWest.stats.damageByAttackType || {}) },
		damageByArmorType: { ...(pWest.stats.damageByArmorType || {}) }
	};

	const eastAnalytics: PlayerAnalytics = {
		team: 'east',
		commander: pEast.commander,
		race: pEast.race,
		castleHp: Math.max(0, Math.round(cEast.hp)),
		castleMaxHp: cEast.maxHp,
		totalDamageDealt: Math.round(pEast.stats.totalDamageDealt),
		damageToCastle: Math.round(pEast.stats.damageToCastle),
		unitsSpawned: pEast.stats.unitsSpawned,
		unitsKilled: pEast.stats.unitsKilled,
		goldEarned: Math.round(pEast.gold),
		goldSpent: pEast.stats.goldSpent,
		lumberEarned: pEast.stats.lumberEarned ?? 0,
		lumberSpent: pEast.stats.lumberSpent ?? 0,
		coinsCollected: pEast.stats.coinsCollected,
		itemsPurchased: pEast.stats.itemsPurchased,
		damageByAttackType: { ...(pEast.stats.damageByAttackType || {}) },
		damageByArmorType: { ...(pEast.stats.damageByArmorType || {}) }
	};

	const westMvp = sim.getMvpBuilding('west');
	const eastMvp = sim.getMvpBuilding('east');

	const buildings: BuildingAnalyticsEntry[] = [];

	// Iterate through all buildings present in simulation plus any recorded in buildingStats
	const allDefIds = new Set<string>();
	for (const b of sim.buildings) allDefIds.add(`${b.team}_${b.defId}`);
	for (const [defId, bs] of Object.entries(sim.buildingStats)) allDefIds.add(`${bs.team}_${defId}`);

	for (const key of allDefIds) {
		const [team, defId] = key.split('_') as [MatchTeam, string];
		const bDef = getBuilding(defId);
		const bPower = calculateBuildingPower(defId);
		const bStat = sim.buildingStats[defId];

		const name = bDef?.name || bStat?.name || defId;
		const kills = bStat?.kills || 0;
		const damage = bStat?.damage || 0;
		const isMvp =
			(team === 'west' && westMvp?.defId === defId) ||
			(team === 'east' && eastMvp?.defId === defId);

		buildings.push({
			defId,
			name,
			team,
			race: bDef?.race || '',
			chainCost: bPower?.chainCost || bDef?.gold_cost || 0,
			unitId: bPower?.unitMetrics.unitId || bDef?.unit || '',
			unitName: bPower?.unitMetrics.name || '',
			unitHp: bPower?.unitMetrics.hp || 0,
			unitArmor: bPower?.unitMetrics.armor || 0,
			unitDps: bPower?.unitMetrics.dps || 0,
			unitEhp: bPower?.unitMetrics.ehp || 0,
			powerPerGold: bPower?.powerPerGold || 0,
			kills,
			damage,
			isMvp: !!isMvp
		});
	}

	buildings.sort((a, b) => b.damage - a.damage);

	const mvpWestEntry = buildings.find((b) => b.team === 'west' && b.isMvp) || null;
	const mvpEastEntry = buildings.find((b) => b.team === 'east' && b.isMvp) || null;

	return {
		timestamp: Date.now(),
		durationSeconds: Math.round(sim.gameTime),
		winner: sim.winner || sim.roundWinner || null,
		gameMode: sim.gameModeConfig?.id || 'standard',
		botDifficulty: sim.config.botDifficulty ?? 0,
		players: {
			west: westAnalytics,
			east: eastAnalytics
		},
		buildings,
		mvpBuildings: {
			west: mvpWestEntry,
			east: mvpEastEntry
		}
	};
}

export function exportMatchAnalyticsJSON(sim: Simulation): string {
	const report = generateMatchAnalytics(sim);
	return JSON.stringify(report, null, 2);
}

export function exportMatchAnalyticsCSV(sim: Simulation): string {
	const report = generateMatchAnalytics(sim);
	const headers = [
		'Team',
		'Building',
		'DefId',
		'Race',
		'ChainCost',
		'Unit',
		'UnitHP',
		'UnitArmor',
		'UnitDPS',
		'UnitEHP',
		'PowerPerGold',
		'Kills',
		'DamageDealt',
		'MVP'
	];

	const rows = report.buildings.map((b) => [
		b.team.toUpperCase(),
		`"${b.name.replace(/"/g, '""')}"`,
		b.defId,
		`"${b.race}"`,
		b.chainCost,
		`"${b.unitName.replace(/"/g, '""')}"`,
		b.unitHp,
		b.unitArmor,
		b.unitDps.toFixed(1),
		b.unitEhp.toFixed(1),
		b.powerPerGold.toFixed(2),
		b.kills,
		b.damage,
		b.isMvp ? 'YES' : 'NO'
	]);

	return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
