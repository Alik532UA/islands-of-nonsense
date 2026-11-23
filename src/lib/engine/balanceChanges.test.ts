import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { getBuilding, getUnit } from './gameData';

describe('Balance Changes and Anti-Air Sync (changes.txt & power.json)', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation();
	});

	it('h06T (Легкий танк) has air in ua1g and can target flying enemies', () => {
		const tankDef = getUnit('h06T');
		expect(tankDef).toBeDefined();
		expect(tankDef?.hp).toBe(380); // changes.txt: 400 -> 380
		expect(String(tankDef?.raw_fields?.ua1g)).toContain('air'); // changes.txt: TRIGSTR_593 теперь бьёт по воздуху

		// Place tank spawner and spawn a tank
		sim.players.west.gold = 1000;
		sim.build('west', 'h05X', 25, 20, 'top');
		const building = sim.buildings[0];
		expect(building.defId).toBe('h05X');
		building.isUnderConstruction = false;

		// Force spawn
		sim.buildingSystem.spawnUnitFromBuilding(building);
		expect(sim.units.length).toBe(1);
		const tank = sim.units[0];
		expect(tank.canHitAir).toBe(true);

		// Spawn enemy flying unit
		const flyingEnemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: tank.x + 200,
			y: tank.y,
			range: 100,
			flying: true
		});

		sim.spatialGrid.clear();
		sim.spatialGrid.insert(tank);
		sim.spatialGrid.insert(flyingEnemy);

		const target = sim.combatSystem.findBestTarget(tank);
		expect(target).toBe(flyingEnemy);
	});

	it('ranged siege units without air target (hmtm, h06S) cannot target flying enemies', () => {
		const mortarDef = getUnit('hmtm');
		expect(mortarDef).toBeDefined();
		expect(String(mortarDef?.raw_fields?.ua1g)).not.toContain('air');

		// Spawn mortar
		const mortar = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 200,
			range: 1000,
			canHitAir: false,
			flying: false
		});

		const flyingEnemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 600,
			y: 200,
			range: 100,
			flying: true
		});

		sim.spatialGrid.clear();
		sim.spatialGrid.insert(mortar);
		sim.spatialGrid.insert(flyingEnemy);

		const target = sim.combatSystem.findBestTarget(mortar);
		expect(target).toBeNull();
	});

	it('building baseline costs match changes.txt', () => {
		expect(getBuilding('h015')?.gold_cost).toBe(275);
		expect(getBuilding('h01Y')?.gold_cost).toBe(255);
		expect(getBuilding('h009')?.gold_cost).toBe(385);
		expect(getBuilding('h06Y')?.gold_cost).toBe(340);
		expect(getBuilding('h01S')?.gold_cost).toBe(550);
		expect(getBuilding('h02P')?.gold_cost).toBe(240);
		expect(getBuilding('h03I')?.gold_cost).toBe(310);
		expect(getBuilding('h04O')?.gold_cost).toBe(260);
		expect(getBuilding('h00B')?.gold_cost).toBe(285);
		expect(getBuilding('h05J')?.gold_cost).toBe(175);
		expect(getBuilding('cg06')?.gold_cost).toBe(330); // Ангар
	});

	it('building upgrade costs match changes.txt and deduct exact amount', () => {
		// h02K -> h092 (Ферма Кодо-заклиначів: 155g)
		expect(getBuilding('h092')?.gold_cost).toBe(155);
		expect(getBuilding('h035')?.gold_cost).toBe(155);
		expect(getBuilding('h036')?.gold_cost).toBe(155);
		expect(getBuilding('h05E')?.gold_cost).toBe(120);
		expect(getBuilding('h04M')?.gold_cost).toBe(180);
		expect(getBuilding('h09L')?.gold_cost).toBe(200);
		expect(getBuilding('cg0f')?.gold_cost).toBe(285); // Штурмовий ангар

		// Test actual upgrade flow in simulation
		sim.players.west.gold = 500;
		sim.build('west', 'h02K', 25, 20, 'top');
		const b = sim.buildings[0];
		b.isUnderConstruction = false;
		expect(b.goldCost).toBe(260);

		// Gold before upgrade
		const goldBefore = sim.players.west.gold;
		const upgraded = sim.upgradeBuilding('west', b.instanceId, 'h092');
		expect(upgraded).toBe(true);
		expect(sim.players.west.gold).toBe(goldBefore - 155);
		expect(b.goldCost).toBe(260 + 155);
		expect(b.defId).toBe('h092');
	});
});
