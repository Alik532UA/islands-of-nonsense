import { describe, it, expect, beforeEach } from 'vitest';
import {
	COMMANDERS,
	COMMANDER_CHANGE_COOLDOWN_SEC,
	COMMANDER_CHANGE_GOLD_COST,
	COMMANDER_CHANGE_LUMBER_COST,
	RANDOM_COMMANDER_MULTIPLIER,
	findCommander,
	getCommander,
	getCommanderEffectivePct,
	getCommanderDescription,
	getCommanderIncomeBonus,
	getCommanderForgeDiscount,
	getCommanderDamageBonus,
	getCommanderAttackSpeedBonus,
	getCommanderCritChance,
	getCommanderEvadeChance
} from './commanders';
import { Simulation } from './simulation';

function attachCommanderHall(sim: Simulation, underConstruction = false) {
	sim.buildings.push({
		instanceId: `cmd_hall_${sim.nextBuildingId++}`,
		defId: 'cg12_commander',
		name: 'Дім командира',
		team: 'west',
		playerId: sim.players.west.id,
		tileX: 25,
		tileY: 20,
		x: 864,
		y: 704,
		hp: underConstruction ? 150 : 1000,
		maxHp: 1000,
		armor: 5,
		armorType: 'fort',
		goldCost: 250,
		lumberCost: 250,
		spawnUnitId: '',
		spawnCooldown: 0,
		spawnTimer: 0,
		lane: 'mid',
		upgradeFrom: null,
		race: 'Альянс',
		specialType: 'commander',
		isUnderConstruction: underConstruction
	});
}

describe('Commanders System ([AC-CMD-1])', () => {
	it('містить рівно 6 канонічних командирів зі збалансованими значеннями (~5x меншими)', () => {
		expect(COMMANDERS.length).toBe(6);
		const names = COMMANDERS.map((c) => c.name);
		expect(names).toContain('Саша');
		expect(names).toContain('Алик');
		expect(names).toContain('Дима');
		expect(names).toContain('Дэн');
		expect(names).toContain('Юра');
		expect(names).toContain('Леша');

		expect(getCommander(1).baseBonusPct).toBe(4);
		expect(getCommander(2).baseBonusPct).toBe(10);
		expect(getCommander(3).baseBonusPct).toBe(5);
		expect(getCommander(4).baseBonusPct).toBe(5);
		expect(getCommander(5).baseBonusPct).toBe(5);
		expect(getCommander(6).baseBonusPct).toBe(4);
	});

	it('findCommander повертає null для 0, а getCommander повертає правильного командира та описи ×1 / ×2', () => {
		expect(findCommander(0)).toBeNull();
		expect(findCommander(undefined)).toBeNull();

		const alik = getCommander(2);
		expect(alik.name).toBe('Алик');
		expect(alik.description).toContain('10%');
		expect(getCommanderDescription(alik, false)).toContain('10%');
		expect(getCommanderDescription(alik, true)).toContain('20%');

		const fallback = getCommander(999);
		expect(fallback.id).toBe(1);
		expect(RANDOM_COMMANDER_MULTIPLIER).toBe(2);
	});

	it('забороняє вибір командира на початку гри без завершеного "Дому командира" (250g + 250w)', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 1000 });
		expect(sim.players.west.commander).toBe(0);
		expect(sim.hasCommanderHall('west')).toBe(false);

		const beforeBuild = sim.selectPlayerCommander('west', 3);
		expect(beforeBuild.ok).toBe(false);
		expect(sim.players.west.commander).toBe(0);

		// Building cg12_commander costs 250g + 250w and is limited to 1 per player
		sim.players.west.gold = 500;
		sim.players.west.lumber = 500;
		expect(sim.build('west', 'cg12_commander', 25, 20, 'top')).toBe(true);
		expect(sim.players.west.gold).toBe(250);
		expect(sim.players.west.lumber).toBe(250);
		expect(sim.build('west', 'cg12_commander', 25, 24, 'top')).toBe(false);

		// Still under construction -> cannot choose yet
		const whileBuilding = sim.selectPlayerCommander('west', 3);
		expect(whileBuilding.ok).toBe(false);
	});

	it('дозволяє перший безкоштовний вибір після будівництва, а зміну — за 250g+250w або безкоштовно після КД 5 хв', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 1000 });
		sim.players.west.lumber = 1000;
		attachCommanderHall(sim, false);

		// 1. First pick is free and starts 5-minute (300s) cooldown
		const first = sim.selectPlayerCommander('west', 3);
		expect(first.ok).toBe(true);
		expect(sim.players.west.commander).toBe(3);
		expect(sim.players.west.gold).toBe(1000);
		expect(sim.players.west.lumber).toBe(1000);
		expect(sim.players.west.commanderCooldown).toBe(COMMANDER_CHANGE_COOLDOWN_SEC);

		// 2. Early paid change within 5m requires 250g + 250w
		sim.players.west.gold = 200;
		const failedSwap = sim.selectPlayerCommander('west', 4);
		expect(failedSwap.ok).toBe(false);
		expect(sim.players.west.commander).toBe(3);

		sim.players.west.gold = 500;
		const paidSwap = sim.selectPlayerCommander('west', 'random');
		expect(paidSwap.ok).toBe(true);
		expect(paidSwap.isRandom).toBe(true);
		expect(sim.players.west.isRandomCommander).toBe(true);
		expect(sim.players.west.gold).toBe(500 - COMMANDER_CHANGE_GOLD_COST);
		expect(sim.players.west.lumber).toBe(1000 - COMMANDER_CHANGE_LUMBER_COST);
		expect(sim.players.west.commanderCooldown).toBe(300);

		// 3. Advancing simulation 300s (5 minutes) makes next commander change free
		sim.isRunning = true;
		for (let i = 0; i < 300; i++) {
			sim.step(1.0);
		}
		expect(sim.players.west.commanderCooldown).toBe(0);

		const goldBeforeFree = sim.players.west.gold;
		const lumberBeforeFree = sim.players.west.lumber;
		const freeSwap = sim.selectPlayerCommander('west', 5);
		expect(freeSwap.ok).toBe(true);
		expect(freeSwap.isRandom).toBe(false);
		expect(sim.players.west.commander).toBe(5);
		expect(sim.players.west.isRandomCommander).toBe(false);
		expect(sim.players.west.gold).toBe(goldBeforeFree);
		expect(sim.players.west.lumber).toBe(lumberBeforeFree);
		expect(sim.players.west.commanderCooldown).toBe(300);
	});

	it('подвоює відсоток бонусу (×2) при виборі випадкового командира і скидає на ×1 при звичайному виборі', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 1000 });
		sim.players.west.lumber = 1000;
		attachCommanderHall(sim, false);

		const rnd = sim.selectPlayerCommander('west', 'random');
		expect(rnd.ok).toBe(true);
		expect(rnd.isRandom).toBe(true);
		expect(sim.players.west.isRandomCommander).toBe(true);
		expect(sim.players.west.commander).toBe(rnd.commanderId);

		const cmd = getCommander(rnd.commanderId);
		expect(getCommanderEffectivePct(cmd.id, false)).toBe(cmd.baseBonusPct);
		expect(getCommanderEffectivePct(cmd.id, true)).toBe(cmd.baseBonusPct * 2);

		sim.selectPlayerCommander('west', 3);
		expect(sim.players.west.commander).toBe(3);
		expect(sim.players.west.isRandomCommander).toBe(false);
		expect(getCommanderDamageBonus(sim.players.west)).toBeCloseTo(0.05, 5);
	});

	describe('Застосування ефектів усіх 6 командирів (×1 та Випадковий ×2) у двигуні', () => {
		let sim: Simulation;

		beforeEach(() => {
			sim = new Simulation({ botDifficulty: 0, startGold: 1000 });
			sim.players.west.race = 'Альянс';
		});

		it('Саша (#1): +4% доходу золота (×1) та +8% (Випадковий ×2)', () => {
			for (let i = 0; i < 6; i++) {
				sim.buildings.push({
					instanceId: `sasha_b_${i}`,
					defId: 'h000',
					name: 'Барак',
					team: 'west',
					playerId: sim.players.west.id,
					tileX: 10 + i * 2,
					tileY: 10,
					x: 320 + i * 64,
					y: 320,
					hp: 1000,
					maxHp: 1000,
					armor: 5,
					armorType: 'fort',
					goldCost: 500,
					spawnUnitId: 'hfoo',
					spawnCooldown: 14,
					spawnTimer: 14,
					lane: 'top',
					upgradeFrom: null,
					race: 'Альянс'
				});
			}

			sim.players.west.commander = 3;
			sim.players.west.isRandomCommander = false;
			const baseIncome = sim.economySystem.calculateIncome('west');

			sim.players.west.commander = 1;
			const sashaIncome = sim.economySystem.calculateIncome('west');
			expect(getCommanderIncomeBonus(sim.players.west)).toBeCloseTo(0.04, 5);
			expect(sashaIncome).toBeGreaterThan(baseIncome);

			sim.players.west.isRandomCommander = true;
			const sashaRandomIncome = sim.economySystem.calculateIncome('west');
			expect(getCommanderIncomeBonus(sim.players.west)).toBeCloseTo(0.08, 5);
			expect(sashaRandomIncome).toBeGreaterThan(sashaIncome);
		});

		it('Алик (#2): -10% вартості будівництва Кузні й покращень (×1) та -20% (Випадковий ×2)', () => {
			sim.players.west.commander = 2;
			sim.players.west.isRandomCommander = false;
			expect(getCommanderForgeDiscount(sim.players.west)).toBeCloseTo(0.1, 5);
			expect(sim.getForgePrice('west', 'attack')).toBe(180);

			sim.players.west.gold = 500;
			expect(sim.build('west', 'cg11_forge', 25, 20, 'top')).toBe(true);
			expect(sim.players.west.gold).toBe(410); // 100g forge with -10% = 90g

			sim.players.west.isRandomCommander = true;
			expect(getCommanderForgeDiscount(sim.players.west)).toBeCloseTo(0.2, 5);
			expect(sim.getForgePrice('west', 'attack')).toBe(160);
		});

		it('Дима (#3), Дэн (#4), Юра (#5), Леша (#6): точні бойові модифікатори для ×1 і ×2', () => {
			sim.players.west.commander = 3;
			sim.players.west.isRandomCommander = false;
			expect(getCommanderDamageBonus(sim.players.west)).toBeCloseTo(0.05, 5);
			sim.players.west.isRandomCommander = true;
			expect(getCommanderDamageBonus(sim.players.west)).toBeCloseTo(0.1, 5);

			sim.players.west.commander = 4;
			sim.players.west.isRandomCommander = false;
			expect(getCommanderAttackSpeedBonus(sim.players.west)).toBeCloseTo(0.05, 5);
			sim.players.west.isRandomCommander = true;
			expect(getCommanderAttackSpeedBonus(sim.players.west)).toBeCloseTo(0.1, 5);

			sim.players.west.commander = 5;
			sim.players.west.isRandomCommander = false;
			expect(getCommanderCritChance(sim.players.west)).toBeCloseTo(0.05, 5);
			sim.players.west.isRandomCommander = true;
			expect(getCommanderCritChance(sim.players.west)).toBeCloseTo(0.1, 5);

			sim.players.west.commander = 6;
			sim.players.west.isRandomCommander = false;
			expect(getCommanderEvadeChance(sim.players.west)).toBeCloseTo(0.04, 5);
			sim.players.west.isRandomCommander = true;
			expect(getCommanderEvadeChance(sim.players.west)).toBeCloseTo(0.08, 5);
		});
	});
});
