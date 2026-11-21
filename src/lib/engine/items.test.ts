import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { CASTLE_ITEMS } from './items';
import type { ActiveBuff } from './types';

describe('Point 4: Castle Shop & Consumables', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 2000 });
	});

	it('defines standard WC3 castle items with correct costs and cooldowns', () => {
		expect(CASTLE_ITEMS['I00E']).toBeDefined();
		expect(CASTLE_ITEMS['I00E'].cost).toBe(300);
		expect(CASTLE_ITEMS['I00E'].cooldown).toBe(45);

		expect(CASTLE_ITEMS['I00F']).toBeDefined();
		expect(CASTLE_ITEMS['I00F'].cost).toBe(900);
		expect(CASTLE_ITEMS['I00F'].cooldown).toBe(90);

		expect(CASTLE_ITEMS['I004']).toBeDefined();
		expect(CASTLE_ITEMS['I004'].cost).toBe(1500);
		expect(CASTLE_ITEMS['I004'].cooldown).toBe(120);
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

	it('Scroll of Weakness (I00E) applies weakness debuff to enemy units near castle', () => {
		// Spawn enemy unit near west castle (x=200, y=400)
		const enemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'bottom',
			x: 200,
			y: 400,
			hp: 1000
		});

		// Spawn enemy unit far away (x=2200, y=400)
		const distantEnemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'bottom',
			x: 2200,
			y: 400,
			hp: 1000
		});

		sim.players.west.gold = 1000;
		const success = sim.buyCastleItem('west', 'I00E');
		expect(success).toBe(true);

		// Nearby enemy should receive weakness buff
		const buff = enemy.buffs?.find((b: ActiveBuff) => b.type === 'weakness');
		expect(buff).toBeDefined();
		expect(buff?.timer).toBe(15);

		// Distant enemy should NOT receive weakness buff
		expect(distantEnemy.buffs?.some((b: ActiveBuff) => b.type === 'weakness')).toBeFalsy();
	});

	it('Azure Dome (I00F) grants castle invulnerability against enemy attacks', () => {
		sim.players.west.gold = 1500;
		const westCastle = sim.castles.west;
		const initialHp = westCastle.hp;

		// Spawn enemy unit right next to west castle
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

		// Activate Azure Dome
		sim.buyCastleItem('west', 'I00F');
		expect(sim.castleInvulnerableTimer.west).toBe(6.0);

		// Step simulation while dome is active
		for (let i = 0; i < 40; i++) {
			sim.step(0.05); // 2 seconds
		}
		expect(westCastle.hp).toBe(initialHp); // No damage taken!

		// Fast-forward past dome duration (remaining 4.0s)
		for (let i = 0; i < 100; i++) {
			sim.step(0.05); // 5 seconds
		}
		expect(sim.castleInvulnerableTimer.west).toBe(0);
		// Castle now takes damage
		expect(westCastle.hp).toBeLessThan(initialHp);
	});

	it('Golden Cheese (I004) heals castle for +2500 HP and gives +100 gold bonus', () => {
		const westCastle = sim.castles.west;
		westCastle.hp = 8000;
		sim.players.west.gold = 1500;

		const bought = sim.buyCastleItem('west', 'I004');
		expect(bought).toBe(true);

		// Castle healed by +2500
		expect(westCastle.hp).toBe(10500);
		// Player gold: 1500 - 1500 + 100 = 100
		expect(sim.players.west.gold).toBe(100);
	});
});
