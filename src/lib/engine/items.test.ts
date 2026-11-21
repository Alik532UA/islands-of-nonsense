import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { CASTLE_ITEMS } from './items';
import type { ActiveBuff } from './types';

describe('Point 1: Castle Shop & Complete Consumables Roster', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 5000 });
	});

	it('defines complete 10-item WC3 castle shop roster with correct costs and cooldowns', () => {
		const expectedItems: Record<string, { cost: number; cooldown: number }> = {
			I001: { cost: 150, cooldown: 30 },
			I005: { cost: 150, cooldown: 35 },
			I00E: { cost: 300, cooldown: 45 },
			I009: { cost: 500, cooldown: 40 },
			I00A: { cost: 575, cooldown: 45 },
			I008: { cost: 600, cooldown: 60 },
			I003: { cost: 650, cooldown: 50 },
			I00F: { cost: 900, cooldown: 90 },
			I007: { cost: 1400, cooldown: 75 },
			I004: { cost: 1500, cooldown: 120 }
		};

		for (const [id, stats] of Object.entries(expectedItems)) {
			expect(CASTLE_ITEMS[id]).toBeDefined();
			expect(CASTLE_ITEMS[id].cost).toBe(stats.cost);
			expect(CASTLE_ITEMS[id].cooldown).toBe(stats.cooldown);
		}
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
			x: 350,
			y: 220,
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
			x: 200,
			y: 400,
			hp: 1000
		});

		const distantEnemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'bottom',
			x: 2200,
			y: 400,
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

		sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: westCastle.x + 30,
			y: westCastle.y,
			hp: 2000,
			damage: 300,
			range: 80,
			attackCooldown: 0.1
		});

		sim.buyCastleItem('west', 'I00F');
		expect(sim.castleInvulnerableTimer.west).toBe(6.0);

		for (let i = 0; i < 40; i++) {
			sim.step(0.05);
		}
		expect(westCastle.hp).toBe(initialHp);

		for (let i = 0; i < 100; i++) {
			sim.step(0.05);
		}
		expect(sim.castleInvulnerableTimer.west).toBe(0);
		expect(westCastle.hp).toBeLessThan(initialHp);
	});

	it('Golden Cheese (I004) heals castle for +2500 HP and gives +100 gold bonus', () => {
		const westCastle = sim.castles.west;
		westCastle.hp = 8000;
		sim.players.west.gold = 1500;

		const bought = sim.buyCastleItem('west', 'I004');
		expect(bought).toBe(true);
		expect(westCastle.hp).toBe(10500);
		expect(sim.players.west.gold).toBe(100);
	});
});
