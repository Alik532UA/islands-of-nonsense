import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { CASTLE_ITEMS } from './items';
import type { ActiveBuff } from './types';

describe('Point 1: Castle Shop & Complete Consumables Roster', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 5000 });
		sim.buildings.push({
			instanceId: 'test_shop_west',
			defId: 'cg10_shop',
			name: 'Магазин',
			team: 'west',
			specialType: 'shop',
			tileX: 10,
			tileY: 10,
			x: 1600,
			y: 1200,
			hp: 1000,
			maxHp: 1000,
			armor: 5,
			armorType: 'fort',
			goldCost: 50,
			lumberCost: 50,
			spawnUnitId: '',
			spawnCooldown: 0,
			spawnTimer: 0,
			lane: 'mid',
			upgradeFrom: null,
			race: 'Люди'
		});
	});

	it('defines complete 12-item WC3 castle shop roster with correct costs and cooldowns', () => {
		const expectedItems: Record<string, { cost: number; cooldown: number }> = {
			I001: { cost: 150, cooldown: 30 },
			I005: { cost: 150, cooldown: 35 },
			I00E: { cost: 300, cooldown: 45 },
			I000: { cost: 350, cooldown: 35 },
			I009: { cost: 500, cooldown: 40 },
			I00A: { cost: 575, cooldown: 45 },
			I008: { cost: 600, cooldown: 60 },
			I003: { cost: 650, cooldown: 50 },
			I00N: { cost: 650, cooldown: 60 },
			I00F: { cost: 900, cooldown: 90 },
			I007: { cost: 1400, cooldown: 75 },
			I004: { cost: 1500, cooldown: 120 }
		};

		expect(Object.keys(CASTLE_ITEMS).length).toBe(12);
		for (const [id, stats] of Object.entries(expectedItems)) {
			expect(CASTLE_ITEMS[id]).toBeDefined();
			expect(CASTLE_ITEMS[id].cost).toBe(stats.cost);
			expect(CASTLE_ITEMS[id].cooldown).toBe(stats.cooldown);
		}
	});

	it('Wand of Negation (I000) dispels all positive and negative magical effects from units on lanes', () => {
		const unit = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 220,
			hp: 500
		});
		unit.buffs = [
			{ type: 'as', timer: 10, value: 0.25 },
			{ type: 'weakness', timer: 10, value: 0.4 }
		];

		const bought = sim.buyCastleItem('west', 'I000');
		expect(bought).toBe(true);
		expect(unit.buffs.length).toBe(0);
	});

	it('enforces gold requirement and cooldown when buying items', () => {
		sim.players.west.gold = 500;
		expect(sim.canBuyCastleItem('west', 'I00F')).toBe(false); // cost 900 > 500
		expect(sim.canBuyCastleItem('west', 'I00E')).toBe(true); // cost 300 <= 500

		const bought = sim.buyCastleItem('west', 'I00E');
		expect(bought).toBe(true);
		expect(sim.players.west.gold).toBe(200);
		expect(sim.getItemCooldown('west', 'I00E')).toBe(45);

		// Cannot buy again while on cooldown
		sim.players.west.gold = 1000;
		expect(sim.canBuyCastleItem('west', 'I00E')).toBe(false);

		// Advance simulation by 45s
		for (let i = 0; i < 900; i++) {
			sim.step(0.05);
		}
		expect(sim.getItemCooldown('west', 'I00E')).toBe(0);
		expect(sim.canBuyCastleItem('west', 'I00E')).toBe(true);
	});

	it('Battle Drums (I001) buffs all friendly units with +25% attack speed', () => {
		const friendly = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 220,
			hp: 500
		});

		const bought = sim.buyCastleItem('west', 'I001');
		expect(bought).toBe(true);

		const buff = friendly.buffs?.find((b: ActiveBuff) => b.type === 'as');
		expect(buff).toBeDefined();
		expect(buff?.value).toBe(0.25);
		expect(buff?.timer).toBe(15);
	});

	it('Battle Horn (I003) buffs all friendly units with +4 armor', () => {
		const friendly = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'bottom',
			x: 500,
			y: 580,
			hp: 500
		});

		const bought = sim.buyCastleItem('west', 'I003');
		expect(bought).toBe(true);

		const buff = friendly.buffs?.find((b: ActiveBuff) => b.type === 'shield');
		expect(buff).toBeDefined();
		expect(buff?.value).toBe(4);
		expect(buff?.timer).toBe(20);
	});

	it('Rune of Power (I005) activates 20s castle turret overcharge', () => {
		const bought = sim.buyCastleItem('west', 'I005');
		expect(bought).toBe(true);
		expect(sim.castleOverchargeTimer.west).toBe(20.0);

		sim.step(1.0);
		expect(sim.castleOverchargeTimer.west).toBe(19.0);
	});

	it('Scroll of Stone (I008) summons a tough Stone Golem defender', () => {
		const initialCount = sim.units.length;
		const bought = sim.buyCastleItem('west', 'I008');
		expect(bought).toBe(true);
		expect(sim.units.length).toBe(initialCount + 1);

		const golem = sim.units.find((u) => u.name === 'Кам’яний Голем');
		expect(golem).toBeDefined();
		expect(golem?.hp).toBe(1800);
		expect(golem?.armor).toBe(12);
		expect(golem?.team).toBe('west');
	});

	it('Rune of Repair (I009) instantly restores 1200 HP to castle', () => {
		const westCastle = sim.castles.west;
		westCastle.hp = 8000;

		const bought = sim.buyCastleItem('west', 'I009');
		expect(bought).toBe(true);
		expect(westCastle.hp).toBe(9200);
	});

	it('Lightning Orb (I00A) damages enemy units near castle', () => {
		const enemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: sim.castles.west.x + 300,
			y: sim.castles.west.y,
			hp: 1000
		});

		const bought = sim.buyCastleItem('west', 'I00A');
		expect(bought).toBe(true);
		expect(enemy.hp).toBeLessThan(1000);
	});

	it('Magic Wand (I007) cleanses friendly debuffs and curses enemies with -30% damage', () => {
		const friendly = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 220,
			hp: 500
		});
		friendly.buffs = [{ type: 'weakness', timer: 10, value: 0.4 }];

		const enemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 1200,
			y: 220,
			hp: 500
		});

		const bought = sim.buyCastleItem('west', 'I007');
		expect(bought).toBe(true);

		// Friendly cleansed of weakness
		expect(friendly.buffs.some((b) => b.type === 'weakness')).toBe(false);

		// Enemy cursed with -30% damage
		const curse = enemy.buffs?.find((b) => b.type === 'dmg');
		expect(curse).toBeDefined();
		expect(curse?.value).toBe(-0.3);
	});

	it('Scroll of Weakness (I00E) applies weakness debuff to enemy units near castle', () => {
		const enemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'bottom',
			x: sim.castles.west.x + 200,
			y: sim.castles.west.y + 100,
			hp: 1000
		});

		const distantEnemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'bottom',
			x: sim.castles.west.x + 2200,
			y: sim.castles.west.y,
			hp: 1000
		});

		const success = sim.buyCastleItem('west', 'I00E');
		expect(success).toBe(true);

		const buff = enemy.buffs?.find((b: ActiveBuff) => b.type === 'weakness');
		expect(buff).toBeDefined();
		expect(buff?.timer).toBe(15);
		expect(distantEnemy.buffs?.some((b: ActiveBuff) => b.type === 'weakness')).toBeFalsy();
	});

	it('Azure Dome (I00F) grants castle invulnerability against enemy attacks', () => {
		const westCastle = sim.castles.west;
		const initialHp = westCastle.hp;

		const enemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'mid',
			x: westCastle.x + 150,
			y: westCastle.y,
			hp: 2000,
			damage: 300,
			range: 100,
			attackCooldown: 0.1
		});

		sim.buyCastleItem('west', 'I00F');
		expect(sim.castleInvulnerableTimer.west).toBe(6.0);

		// Attack while under invulnerability dome deals no damage
		sim.combatSystem.defenseSystem.attackCastle(enemy, westCastle);
		expect(westCastle.hp).toBe(initialHp);

		// Advance simulation by 7s (140 ticks) so invulnerability timer expires
		for (let i = 0; i < 140; i++) {
			sim.step(0.05);
		}
		expect(sim.castleInvulnerableTimer.west).toBe(0);

		// Attack after dome wears off successfully damages castle
		sim.combatSystem.defenseSystem.attackCastle(enemy, westCastle);
		expect(westCastle.hp).toBeLessThan(initialHp);
	});

	it('Golden Cheese (I004) grants +1 Food Cap without healing castle or cash refund', () => {
		const westCastle = sim.castles.west;
		westCastle.hp = 8000;
		sim.players.west.gold = 1500;
		expect(sim.players.west.maxFood).toBe(1);

		const bought = sim.buyCastleItem('west', 'I004');
		expect(bought).toBe(true);
		expect(westCastle.hp).toBe(8000); // Castle HP is NOT healed (WC3 canon)
		expect(sim.players.west.gold).toBe(0); // 1500 spent, no +100 refund
		expect(sim.players.west.maxFood).toBe(2); // +1 Food Cap granted
	});
});
