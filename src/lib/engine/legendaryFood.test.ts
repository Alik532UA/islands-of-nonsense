import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { isLegendaryBuilding, getBuilding } from './gameData';

describe('Point 4: Food Cap & Legendary Buildings (Golden Cheese I004)', () => {
	let sim: Simulation;

	function addTestShop(simulation: Simulation) {
		simulation.buildings.push({
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
	}

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 5000 });
		sim.decorations = [];
	});

	it('correctly classifies legendary apex buildings', () => {
		expect(isLegendaryBuilding(getBuilding('h05F'))).toBe(true); // Древний фонтан (ufoo: 1)
		expect(isLegendaryBuilding(getBuilding('h00X'))).toBe(true); // Университет Высшей магии (ufoo: 1)
		expect(isLegendaryBuilding(getBuilding('h097'))).toBe(true); // Фабрика Элитных Големов (ufoo: 1)
		expect(isLegendaryBuilding(getBuilding('h008'))).toBe(false); // Скриня скарбів
	});

	it('initializes players with 0 food and 1 maxFood in standard mode (WC3 canon)', () => {
		expect(sim.players.west.food).toBe(0);
		expect(sim.players.west.maxFood).toBe(1);
	});

	it('initializes players with 0 food and 0 maxFood in -nu mode', () => {
		const simNu = new Simulation({
			botDifficulty: 0,
			startGold: 5000,
			gameModeConfig: { noSpecialBuildings: true }
		});
		expect(simNu.players.west.food).toBe(0);
		expect(simNu.players.west.maxFood).toBe(0);
		expect(simNu.canBuyCastleItem('west', 'I004')).toBe(false);
	});

	it('allows building first legendary structure with starting 1 food cap, blocks second without extra cheese', () => {
		sim.players.west.race = 'Наги';
		sim.players.west.gold = 5000;
		sim.players.west.lumber = 2000;

		// 1st legendary building succeeds using starting 1 food cap
		const builtFirst = sim.build('west', 'h05F', 25, 20);
		expect(builtFirst).toBe(true);
		expect(sim.players.west.food).toBe(1);
		expect(sim.players.west.maxFood).toBe(1);

		// 2nd legendary building blocked because food is full (1/1)
		const builtSecondBlocked = sim.build('west', 'h00X', 25, 24);
		expect(builtSecondBlocked).toBe(false);

		// Buy Golden Cheese -> unlocks 2nd food slot (1/2)
		addTestShop(sim);
		const boughtCheese = sim.buyCastleItem('west', 'I004');
		expect(boughtCheese).toBe(true);
		expect(sim.players.west.maxFood).toBe(2);

		// Now 2nd legendary building succeeds
		const builtSecondSuccess = sim.build('west', 'h00X', 25, 24);
		expect(builtSecondSuccess).toBe(true);
		expect(sim.players.west.food).toBe(2);
		expect(sim.players.west.maxFood).toBe(2);
	});

	it('increases maxFood by +1 when buying Golden Cheese (I004)', () => {
		expect(sim.players.west.maxFood).toBe(1);
		addTestShop(sim);
		const bought = sim.buyCastleItem('west', 'I004');
		expect(bought).toBe(true);
		expect(sim.players.west.maxFood).toBe(2);
	});

	it('frees food when a legendary building is sold', () => {
		sim.players.west.gold = 3000;
		sim.players.west.lumber = 1000;
		sim.build('west', 'h05F', 25, 20);
		expect(sim.players.west.food).toBe(1);

		const bldInstance = sim.buildings[0].instanceId;
		const sold = sim.sellBuilding('west', bldInstance);
		expect(sold).toBe(true);
		expect(sim.players.west.food).toBe(0);
	});

	it('blocks upgrading into a legendary building when food cap is full and consumes food upon upgrade', () => {
		sim.players.west.gold = 5000;
		sim.players.west.lumber = 2000;

		// Build 1st legendary structure to consume starting 1 food
		sim.build('west', 'h05F', 25, 16);
		expect(sim.players.west.food).toBe(1);
		expect(sim.players.west.maxFood).toBe(1);

		// Build parent building h00J (not legendary, no food needed)
		const builtParent = sim.build('west', 'h00J', 25, 20);
		expect(builtParent).toBe(true);
		expect(sim.players.west.food).toBe(1);

		const parentBld = sim.buildings.find((b) => b.defId === 'h00J')!;

		// Attempt to upgrade to legendary h05F without available food cap -> blocked
		const upgradedWithoutFood = sim.upgradeBuilding('west', parentBld.instanceId, 'h05F');
		expect(upgradedWithoutFood).toBe(false);
		expect(sim.players.west.food).toBe(1);

		// Unlock food cap by buying Golden Cheese
		addTestShop(sim);
		sim.buyCastleItem('west', 'I004');
		expect(sim.players.west.maxFood).toBe(2);

		// Now upgrade succeeds and consumes 1 food
		const upgradedWithFood = sim.upgradeBuilding('west', parentBld.instanceId, 'h05F');
		expect(upgradedWithFood).toBe(true);
		expect(sim.players.west.food).toBe(2);
	});

	it('frees food when a legendary building is destroyed in combat', () => {
		sim.players.west.gold = 3000;
		sim.players.west.lumber = 1000;
		sim.build('west', 'h05F', 25, 20);
		expect(sim.players.west.food).toBe(1);

		const bld = sim.buildings[0];
		// Deliver lethal enemy damage to destroy legendary structure
		sim.combatSystem.damageBuilding(bld, 50000, 'chaos', 'east');

		expect(bld.hp).toBe(0);
		expect(sim.buildings.length).toBe(0);
		expect(sim.players.west.food).toBe(0);
	});

	it('resets food and maxFood on round reset', () => {
		addTestShop(sim);
		sim.buyCastleItem('west', 'I004');
		expect(sim.players.west.maxFood).toBe(2);

		sim.resetRound();
		expect(sim.players.west.food).toBe(0);
		expect(sim.players.west.maxFood).toBe(1);
	});
});
