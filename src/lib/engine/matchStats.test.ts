import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';

describe('Point 9: Detailed Post-Round / Match Breakdown & MVP Building', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 2000 });
	});

	it('tracks totalDamageDealt and damageToCastle when units attack', () => {
		const _attacker = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 2300,
			y: 400,
			damage: 100
		});

		// Attack enemy east castle
		sim.step(0.05);

		// Castle damage should be recorded in player stats
		expect(sim.players.west.stats.damageToCastle).toBeGreaterThan(0);
		expect(sim.players.west.stats.totalDamageDealt).toBeGreaterThan(0);

		// Now attack an enemy unit
		const _enemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 2310,
			y: 400,
			hp: 300
		});

		const prevTotal = sim.players.west.stats.totalDamageDealt;
		sim.step(0.05);
		expect(sim.players.west.stats.totalDamageDealt).toBeGreaterThanOrEqual(prevTotal);
	});

	it('tracks coinsCollected when picking up battlefield gold coins', () => {
		expect(sim.players.west.stats.coinsCollected).toBe(0);

		const coin = sim.spawnCoinDirectly('top', 500, 220, 50);
		const picked = sim.collectCoin(coin.id, 'west');

		expect(picked).toBe(true);
		expect(sim.players.west.stats.coinsCollected).toBe(1);
	});

	it('tracks itemsPurchased when buying consumables at castle shop', () => {
		expect(sim.players.west.stats.itemsPurchased).toBe(0);

		const success = sim.buyCastleItem('west', 'I001'); // Battle Drums
		expect(success).toBe(true);
		expect(sim.players.west.stats.itemsPurchased).toBe(1);
	});

	it('records building kills and damage to determine MVP building of the match', () => {
		// Build 2 buildings for west
		sim.build('west', 'h037', 0, 0); // Церква
		sim.build('west', 'h006', 0, 1); // Вартова вежа

		const church = sim.buildings.find((b) => b.defId === 'h037')!;
		const tower = sim.buildings.find((b) => b.defId === 'h006')!;

		// Tower damages and kills enemy
		sim.recordBuildingDamage(tower.defId, tower.name, 'west', 300);
		sim.recordBuildingKill(tower.defId, tower.name, 'west');

		// Church unit deals less damage and 0 kills
		sim.recordBuildingDamage(church.defId, church.name, 'west', 50);

		const mvp = sim.getMvpBuilding('west');
		expect(mvp).not.toBeNull();
		expect(mvp?.defId).toBe('h006');
		expect(mvp?.name).toBe('Вартова вежа');
		expect(mvp?.kills).toBe(1);
		expect(mvp?.damage).toBe(300);
	});

	it('clears MVP and round stats on resetRound()', () => {
		sim.recordBuildingDamage('h006', 'Вартова вежа', 'west', 500);
		sim.recordBuildingKill('h006', 'Вартова вежа', 'west');
		expect(sim.getMvpBuilding('west')?.kills).toBe(1);

		sim.resetRound();

		expect(Object.keys(sim.buildingStats).length).toBe(0);
		expect(sim.players.west.stats.totalDamageDealt).toBe(0);
		expect(sim.players.west.stats.damageToCastle).toBe(0);
		expect(sim.players.west.stats.coinsCollected).toBe(0);
		expect(sim.players.west.stats.itemsPurchased).toBe(0);
	});
});
