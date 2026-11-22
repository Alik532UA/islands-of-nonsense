import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { isLegendaryBuilding, getBuilding } from './gameData';

describe('Point 4: Food Cap & Legendary Buildings (Golden Cheese I004)', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 5000 });
	});

	it('correctly classifies legendary apex buildings', () => {
		expect(isLegendaryBuilding(getBuilding('h05F'))).toBe(true); // Древний фонтан (ufoo: 1)
		expect(isLegendaryBuilding(getBuilding('h00X'))).toBe(true); // Университет Высшей магии (ufoo: 1)
		expect(isLegendaryBuilding(getBuilding('h097'))).toBe(true); // Фабрика Элитных Големов (ufoo: 1)
		expect(isLegendaryBuilding(getBuilding('h008'))).toBe(false); // Скриня скарбів
	});

	it('initializes players with 0 food and 0 maxFood', () => {
		expect(sim.players.west.food).toBe(0);
		expect(sim.players.west.maxFood).toBe(0);
	});

	it('blocks construction of legendary structures without available food cap', () => {
		sim.players.west.race = 'Наги';
		const legDef = getBuilding('h05F'); // Древний фонтан
		expect(legDef).toBeDefined();

		// Cannot build because food (0) >= maxFood (0)
		const built = sim.build('west', 'h05F', 25, 20);
		expect(built).toBe(false);
		expect(sim.buildings.length).toBe(0);
	});

	it('increases maxFood by +1 when buying Golden Cheese (I004)', () => {
		expect(sim.players.west.maxFood).toBe(0);
		const bought = sim.buyCastleItem('west', 'I004');
		expect(bought).toBe(true);
		expect(sim.players.west.maxFood).toBe(1);
	});

	it('allows legendary building construction after unlocking food cap', () => {
		// Buy Golden Cheese to unlock 1 food cap
		sim.buyCastleItem('west', 'I004');
		expect(sim.players.west.maxFood).toBe(1);

		sim.players.west.gold = 3000;
		sim.players.west.lumber = 1000;
		const built = sim.build('west', 'h05F', 25, 20);
		expect(built).toBe(true);

		// Consumed 1 food
		expect(sim.players.west.food).toBe(1);
		expect(sim.players.west.maxFood).toBe(1);

		// Second legendary building blocked because food is full (1/1)
		const builtSecond = sim.build('west', 'h00X', 25, 24);
		expect(builtSecond).toBe(false);
	});

	it('frees food when a legendary building is sold', () => {
		sim.buyCastleItem('west', 'I004');
		sim.players.west.gold = 3000;
		sim.players.west.lumber = 1000;
		sim.build('west', 'h05F', 25, 20);
		expect(sim.players.west.food).toBe(1);

		const bldInstance = sim.buildings[0].instanceId;
		const sold = sim.sellBuilding('west', bldInstance);
		expect(sold).toBe(true);
		expect(sim.players.west.food).toBe(0);
	});

	it('resets food and maxFood on round reset', () => {
		sim.buyCastleItem('west', 'I004');
		expect(sim.players.west.maxFood).toBe(1);

		sim.resetRound();
		expect(sim.players.west.food).toBe(0);
		expect(sim.players.west.maxFood).toBe(0);
	});
});
