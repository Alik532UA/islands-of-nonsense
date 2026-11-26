import { describe, it, expect } from 'vitest';
import {
	calculateChainCost,
	calculateUnitCombatPower,
	calculateBuildingPower,
	analyzeAllRaces,
	getRaceBalance
} from './balanceAnalyzer';
import { getUnit } from './gameData';

describe('Point 1: Balance Power Calculator (analyze.py & power.json)', () => {
	it('calculates unit combat power with authentic WC3 EHP and DPS formulas', () => {
		const footman = getUnit('h03B');
		expect(footman).toBeDefined();
		if (!footman) return;

		const metrics = calculateUnitCombatPower(footman);
		expect(metrics.unitId).toBe('h03B');
		expect(metrics.hp).toBe(footman.hp);
		expect(metrics.armor).toBe(footman.armor);
		// EHP = hp * (1 + 0.06 * armor)
		const expectedEhp = footman.hp * (1 + 0.06 * footman.armor);
		expect(metrics.ehp).toBeCloseTo(expectedEhp, 1);

		// DPS = avgDmg / cooldown
		const avgDmg =
			(footman.damage_base || 0) +
			((footman.damage_dice || 1) * ((footman.damage_sides || 1) + 1)) / 2;
		const expectedDps = avgDmg / (footman.cooldown || 1);
		expect(metrics.dps).toBeCloseTo(expectedDps, 1);

		// Potency = Math.sqrt(dps * ehp)
		const expectedPotency = Math.sqrt(expectedDps * expectedEhp);
		expect(metrics.potency).toBeCloseTo(expectedPotency, 1);
	});

	it('calculates cumulative chain cost for upgraded buildings (base + upgrades)', () => {
		// h037 (Каплиця, 280g) -> h038 (Собор, +245g) = 525g total chain cost
		const baseCost = calculateChainCost('h037');
		expect(baseCost).toBe(280);

		const cathedralCost = calculateChainCost('h038');
		expect(cathedralCost).toBe(525);
	});

	it('calculates building power per gold ratio matching reference values', () => {
		const report = calculateBuildingPower('h037');
		expect(report).toBeDefined();
		if (!report) return;

		expect(report.buildingId).toBe('h037');
		expect(report.race).toBe('Люди');
		expect(report.chainCost).toBe(280);
		expect(report.isUpgrade).toBe(false);
		expect(report.spawnUnitId).toBe('h03B');
		expect(report.powerPerGold).toBeGreaterThan(50);
		expect(report.powerPerGold).toBeLessThan(80);
	});

	it('analyzes all 11 races and verifies balance corridor within +-12%', () => {
		const overall = analyzeAllRaces(12);

		// All 11 races must be evaluated
		expect(overall.races.length).toBe(11);
		expect(overall.totalBuildingsEvaluated).toBeGreaterThan(90);
		expect(overall.globalAveragePower).toBeGreaterThan(50);
		expect(overall.globalAveragePower).toBeLessThan(70);

		// Verified that every race has buildings and flying units accounted for
		for (const r of overall.races) {
			expect(r.buildingsCount).toBeGreaterThanOrEqual(7);
			expect(r.averagePowerPerGold).toBeGreaterThan(45);
			expect(r.averagePowerPerGold).toBeLessThan(75);
		}

		// In mod v37 / changes.txt all races are tuned within -6%..+10%, no outliers > 12%
		expect(overall.outliers.length).toBe(0);
	});

	it('retrieves detailed race balance report by race name', () => {
		const scavengers = getRaceBalance('Збирачі');
		expect(scavengers).toBeDefined();
		expect(scavengers?.race).toBe('Збирачі');
		expect(scavengers?.buildingsCount).toBe(11);
		expect(scavengers?.flyingCount).toBe(2);

		const human = getRaceBalance('Люди');
		expect(human).toBeDefined();
		expect(human?.race).toBe('Люди');
		expect(human?.flyingCount).toBe(2);
	});
});
