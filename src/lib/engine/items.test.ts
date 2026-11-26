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

	it('defines complete 14-item WC3 castle shop roster with correct costs and cooldowns', () => {
		const expectedItems: Record<string, { cost: number; cooldown: number }> = {
			I001: { cost: 150, cooldown: 30 },
			I002: { cost: 520, cooldown: 45 },
			I005: { cost: 150, cooldown: 35 },
			I00E: { cost: 300, cooldown: 45 },
			I000: { cost: 350, cooldown: 35 },
			I009: { cost: 500, cooldown: 40 },
			I006: { cost: 550, cooldown: 45 },
			I00A: { cost: 575, cooldown: 45 },
			I008: { cost: 600, cooldown: 60 },
			I003: { cost: 650, cooldown: 50 },
			I00N: { cost: 650, cooldown: 60 },
			I00F: { cost: 900, cooldown: 90 },
			I007: { cost: 1400, cooldown: 75 },
			I004: { cost: 1500, cooldown: 120 }
		};

		expect(Object.keys(CASTLE_ITEMS).length).toBe(14);
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

	it('Magic Wand (I001) and Improved Magic Wand (I002) enter worker inventory and auto-attack enemies within 300 range', () => {
		const w = sim.players.west.worker!;
		const enemyNear = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: w.x + 250,
			y: w.y,
			hp: 1000
		});
		const enemyFar = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: w.x + 450,
			y: w.y,
			hp: 1000
		});

		expect(sim.buyCastleItem('west', 'I001')).toBe(true);
		expect(w.inventory?.[1]?.id).toBe('I001');
		sim.workerSystem.updateWorkers(0.1);
		expect(sim.projectiles.length).toBe(1);
		expect(enemyFar.hp).toBe(1000); // out of 300 range
		for (let i = 0; i < 15; i++) {
			sim.step(0.05);
		}
		expect(enemyNear.hp).toBeLessThan(1000); // projectile hit & dealt magic damage

		const hpAfterFirstWand = enemyNear.hp;
		expect(sim.buyCastleItem('west', 'I002')).toBe(true);
		expect(w.inventory?.[2]?.id).toBe('I002');
		sim.workerSystem.updateWorkers(0.1);
		for (let i = 0; i < 15; i++) {
			sim.step(0.05);
		}
		expect(enemyNear.hp).toBeLessThan(hpAfterFirstWand); // improved wand projectile also hit
	});

	it('Battle Drums (I003) buffs all friendly units with +33% damage', () => {
		const friendly = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'bottom',
			x: 500,
			y: 580,
			hp: 500
		});

		const bought = sim.buyCastleItem('west', 'I003');
		expect(bought).toBe(true);

		const buff = friendly.buffs?.find((b: ActiveBuff) => b.type === 'dmg');
		expect(buff).toBeDefined();
		expect(buff?.value).toBe(0.33);
		expect(buff?.timer).toBe(20);
	});

	it('Rune of Power (I005) activates 20s castle turret overcharge', () => {
		const bought = sim.buyCastleItem('west', 'I005');
		expect(bought).toBe(true);
		expect(sim.castleOverchargeTimer.west).toBe(20.0);

		sim.step(1.0);
		expect(sim.castleOverchargeTimer.west).toBe(19.0);
	});

	it('Double Damage (I008) buffs all friendly units with +100% damage for 30s', () => {
		const friendly = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 220,
			hp: 500
		});
		const bought = sim.buyCastleItem('west', 'I008');
		expect(bought).toBe(true);
		const buff = friendly.buffs?.find((b: ActiveBuff) => b.type === 'dmg');
		expect(buff).toBeDefined();
		expect(buff?.value).toBe(1.0);
		expect(buff?.timer).toBe(30);
	});

	it('Rune of Repair (I009) instantly restores 1200 HP to castle', () => {
		const westCastle = sim.castles.west;
		westCastle.hp = 8000;

		const bought = sim.buyCastleItem('west', 'I009');
		expect(bought).toBe(true);
		expect(westCastle.hp).toBe(9200);
	});

	it('Lightning Orb (I006) enters worker inventory as reusable active item with 60s cooldown', () => {
		const w = sim.players.west.worker!;
		const enemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: w.x + 300,
			y: w.y,
			hp: 1500
		});

		expect(sim.buyCastleItem('west', 'I006')).toBe(true);
		expect(w.inventory?.[1]?.id).toBe('I006');

		// Activate from inventory
		expect(sim.useWorkerItem('west', 1)).toBe(true);
		expect(enemy.hp).toBeLessThan(1500); // took magic lightning damage
		const hpAfterFirstBolt = enemy.hp;
		expect(w.inventory?.[1]?.id).toBe('I006'); // Permanent, stays in inventory
		expect(w.inventory?.[1]?.cooldownRemaining).toBe(60);

		// Cannot activate while on cooldown
		expect(sim.useWorkerItem('west', 1)).toBe(false);

		// Advance 60s -> ready again
		for (let i = 0; i < 60; i++) {
			sim.workerSystem.updateWorkers(1.0);
		}
		expect(w.inventory?.[1]?.cooldownRemaining).toBe(0);
		expect(sim.useWorkerItem('west', 1)).toBe(true);
		expect(enemy.hp).toBeLessThan(hpAfterFirstBolt);
	});

	it('Battle Horn (I00A) buffs all friendly units with +15% move speed and +30% attack speed', () => {
		const friendly = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 220,
			hp: 500
		});
		const bought = sim.buyCastleItem('west', 'I00A');
		expect(bought).toBe(true);
		expect(friendly.buffs?.find((b: ActiveBuff) => b.type === 'ms')?.value).toBe(0.15);
		expect(friendly.buffs?.find((b: ActiveBuff) => b.type === 'as')?.value).toBe(0.3);
	});

	it('Quad Damage (I007) buffs all friendly units with +300% damage for 30s', () => {
		const friendly = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 220,
			hp: 500
		});

		const bought = sim.buyCastleItem('west', 'I007');
		expect(bought).toBe(true);

		const buff = friendly.buffs?.find((b: ActiveBuff) => b.type === 'dmg');
		expect(buff).toBeDefined();
		expect(buff?.value).toBe(3.0);
		expect(buff?.timer).toBe(30);
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
