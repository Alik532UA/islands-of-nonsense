/**
 * Балансний аналізатор Castle Fight Web (BALANCE-ANALYZER-v10).
 * Портовано з reference/source/castle-fight/analyze.py та power.json.
 * Розраховує бойову цінність юнітів (EHP, DPS, потенціал) та ефективність будівель на одиницю золота (Power per Gold).
 */

import { BUILDINGS_MAP, getBuilding, getUnit } from './gameData';
import type { UnitDefinition } from './types';

export interface UnitPowerMetrics {
	unitId: string;
	name: string;
	hp: number;
	armor: number;
	ehp: number; // Ефективне здоров'я: HP * (1 + 0.06 * Armor)
	averageDamage: number;
	dps: number;
	potency: number; // Геометричне середнє бойової сили: Math.sqrt(dps * ehp)
	flying: boolean;
	range: number;
}

export interface BuildingPowerReport {
	buildingId: string;
	name: string;
	race: string;
	chainCost: number; // Сукупна вартість у золоті з урахуванням базової будівлі та всіх апгрейдів
	baseCost: number;
	isUpgrade: boolean;
	spawnUnitId: string;
	unitName: string;
	unitMetrics: UnitPowerMetrics;
	powerPerGold: number; // (potency / chainCost) * 100
}

export interface RaceBalanceReport {
	race: string;
	buildingsCount: number;
	averagePowerPerGold: number;
	deviationPercent: number; // Відхилення від глобального середнього (наприклад +2.5% або -3.1%)
	flyingCount: number;
	buildings: BuildingPowerReport[];
}

export interface OverallBalanceReport {
	races: RaceBalanceReport[];
	globalAveragePower: number;
	tolerancePercent: number;
	outliers: RaceBalanceReport[]; // Раси, чиє відхилення перевищує поріг толерантності
	totalBuildingsEvaluated: number;
}

/**
 * Рекурсивно розраховує повну вартість ланцюжка будівництва (base + upgrades).
 */
export function calculateChainCost(buildingId: string): number {
	const building = getBuilding(buildingId);
	if (!building) return 0;

	const currentCost = building.gold_cost || 0;
	if (building.upgrade_from && BUILDINGS_MAP.has(building.upgrade_from)) {
		return currentCost + calculateChainCost(building.upgrade_from);
	}
	return currentCost;
}

/**
 * Розраховує бойові метрики юніта за канонічною моделлю WC3 Castle Fight (analyze.py).
 */
export function calculateUnitCombatPower(unit: UnitDefinition): UnitPowerMetrics {
	const hp = unit.hp || 0;
	const armor = unit.armor || 0;
	const cooldown = unit.cooldown && unit.cooldown > 0 ? unit.cooldown : 1.0;

	const baseDmg = unit.damage_base || 0;
	const dice = unit.damage_dice || 1;
	const sides = unit.damage_sides || 1;
	const averageDamage = baseDmg + (dice * (sides + 1)) / 2;
	const dps = averageDamage / cooldown;

	// WC3 Armor formula: EHP = HP * (1 + 0.06 * Armor)
	const ehp = hp * (1 + 0.06 * armor);
	const potency = Math.sqrt(dps * ehp);

	return {
		unitId: unit.id,
		name: unit.name || unit.id,
		hp,
		armor,
		ehp: Math.round(ehp * 100) / 100,
		averageDamage: Math.round(averageDamage * 100) / 100,
		dps: Math.round(dps * 100) / 100,
		potency: Math.round(potency * 100) / 100,
		flying: Boolean(unit.flying || unit.move_type === 'fly'),
		range: unit.range || 100
	};
}

/**
 * Розраховує ефективність будівлі (сила за одиницю золота).
 */
export function calculateBuildingPower(buildingId: string): BuildingPowerReport | null {
	const building = getBuilding(buildingId);
	if (!building || !building.unit || !building.race) {
		return null;
	}

	const unit = getUnit(building.unit);
	if (!unit) {
		return null;
	}

	const chainCost = calculateChainCost(buildingId);
	if (chainCost <= 0) {
		return null;
	}

	const unitMetrics = calculateUnitCombatPower(unit);
	// Формула з analyze.py: val = Math.sqrt(dps * ehp) / cost * 100
	const powerPerGold = Math.round((unitMetrics.potency / chainCost) * 10000) / 100;

	return {
		buildingId: building.id,
		name: building.name || building.id,
		race: building.race,
		chainCost,
		baseCost: building.gold_cost || 0,
		isUpgrade: Boolean(building.upgrade_from),
		spawnUnitId: unit.id,
		unitName: unit.name || unit.id,
		unitMetrics,
		powerPerGold
	};
}

/**
 * Проводить комплексний аналіз балансу всіх 11 рас.
 * @param tolerancePercent Допустимий коридор відхилення від середнього (типово 15%, канон 8-10%)
 */
export function analyzeAllRaces(tolerancePercent = 15): OverallBalanceReport {
	const raceMap = new Map<string, BuildingPowerReport[]>();

	for (const building of BUILDINGS_MAP.values()) {
		if (!building.race || !building.unit) continue;
		const report = calculateBuildingPower(building.id);
		if (!report) continue;

		const list = raceMap.get(building.race) || [];
		list.push(report);
		raceMap.set(building.race, list);
	}

	const allReports: BuildingPowerReport[] = [];
	for (const list of raceMap.values()) {
		allReports.push(...list);
	}

	const totalVal = allReports.reduce((sum, r) => sum + r.powerPerGold, 0);
	const globalAveragePower =
		allReports.length > 0 ? Math.round((totalVal / allReports.length) * 100) / 100 : 0;

	const raceReports: RaceBalanceReport[] = [];
	const outliers: RaceBalanceReport[] = [];

	for (const [race, reports] of raceMap.entries()) {
		const raceTotalVal = reports.reduce((sum, r) => sum + r.powerPerGold, 0);
		const avgVal = reports.length > 0 ? Math.round((raceTotalVal / reports.length) * 100) / 100 : 0;

		const deviationPercent =
			globalAveragePower > 0 ? Math.round((avgVal / globalAveragePower - 1) * 100 * 100) / 100 : 0;

		const flyingCount = reports.filter((r) => r.unitMetrics.flying).length;

		const raceReport: RaceBalanceReport = {
			race,
			buildingsCount: reports.length,
			averagePowerPerGold: avgVal,
			deviationPercent,
			flyingCount,
			buildings: reports.sort((a, b) => b.powerPerGold - a.powerPerGold)
		};

		raceReports.push(raceReport);

		if (Math.abs(deviationPercent) > tolerancePercent) {
			outliers.push(raceReport);
		}
	}

	// Сортуємо раси за спаданням середньої сили на золото
	raceReports.sort((a, b) => b.averagePowerPerGold - a.averagePowerPerGold);

	return {
		races: raceReports,
		globalAveragePower,
		tolerancePercent,
		outliers,
		totalBuildingsEvaluated: allReports.length
	};
}

/**
 * Отримує балансний звіт для окремо обраної раси.
 */
export function getRaceBalance(raceName: string): RaceBalanceReport | undefined {
	const all = analyzeAllRaces();
	return all.races.find((r) => r.race.toLowerCase() === raceName.toLowerCase());
}
