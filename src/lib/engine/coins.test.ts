import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';

describe('Point 2: Battlefield Gold Coins (I000)', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 500 });
	});

	it('initializes with empty coin roster and default 40s timer', () => {
		expect(sim.goldCoins).toEqual([]);
		expect(sim.coinSpawnTimer).toBe(40.0);
		expect(sim.coinSpawnInterval).toBe(40.0);
	});

	it('spawns gold coins periodically along neutral battle zone', () => {
		// Fast-forward 40 seconds (801 steps of 0.05s)
		for (let i = 0; i < 801; i++) {
			sim.step(0.05);
		}

		expect(sim.goldCoins.length).toBe(1);
		const coin = sim.goldCoins[0];
		expect(coin.value).toBe(50);
		expect(coin.x).toBeGreaterThanOrEqual(850);
		expect(coin.x).toBeLessThanOrEqual(1600);
		expect(coin.lifeTime).toBeLessThanOrEqual(35.0);
		expect(coin.lifeTime).toBeGreaterThan(30.0);
	});

	it('awards gold when a friendly or enemy unit marches over the coin', () => {
		const coin = sim.spawnCoinDirectly('top', 1200, 220, 50);
		const initialGold = sim.players.west.gold;

		// Marching friendly unit walking towards coin
		sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 1195,
			y: 220,
			hp: 300
		});

		// Step simulation to trigger pickup
		sim.step(0.05);

		expect(sim.goldCoins.length).toBe(0);
		expect(sim.players.west.gold).toBe(initialGold + coin.value);
	});

	it('allows manual collection via collectCoin()', () => {
		const coin = sim.spawnCoinDirectly('bottom', 1100, 580, 75);
		const initialGold = sim.players.west.gold;

		const success = sim.collectCoin(coin.id, 'west');
		expect(success).toBe(true);
		expect(sim.goldCoins.length).toBe(0);
		expect(sim.players.west.gold).toBe(initialGold + 75);

		// Cannot collect non-existent coin
		expect(sim.collectCoin('invalid_id', 'west')).toBe(false);
	});

	it('removes expired coins after lifeTime runs out', () => {
		const coin = sim.spawnCoinDirectly('top', 1000, 220, 50);
		coin.lifeTime = 0.1;

		sim.step(0.05);
		expect(sim.goldCoins.length).toBe(1);

		sim.step(0.1);
		expect(sim.goldCoins.length).toBe(0);
	});

	it('resets coins on round reset', () => {
		sim.spawnCoinDirectly('top', 1000, 220, 50);
		sim.spawnCoinDirectly('bottom', 1300, 580, 50);
		expect(sim.goldCoins.length).toBe(2);

		sim.resetRound();
		expect(sim.goldCoins.length).toBe(0);
		expect(sim.coinSpawnTimer).toBe(40.0);
	});
});
