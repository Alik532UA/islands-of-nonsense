import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { BotAI } from './botAI';

describe('Point 8: Worker Building & Castle Repair Mechanic', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 1000 });
	});

	it('наказує робітнику відремонтувати пошкоджену союзну споруду', () => {
		sim.build('west', 'h003', 25, 20, 'top');
		const bld = sim.buildings[0];
		bld.isUnderConstruction = false;
		bld.hp = Math.round(bld.maxHp * 0.5); // 50% HP

		const orderSuccess = sim.repairBuilding('west', bld.instanceId);
		expect(orderSuccess).toBe(true);

		const worker = sim.players.west.worker;
		expect(worker).toBeDefined();
		expect(worker?.isRepairing).toBe(true);
		expect(worker?.targetRepairBuildingId).toBe(bld.instanceId);
	});

	it('робітник відновлює HP споруди та списує золото під час ремонту', () => {
		sim.build('west', 'h003', 25, 20, 'top');
		const bld = sim.buildings[0];
		bld.isUnderConstruction = false;
		bld.hp = 100;
		bld.maxHp = 500;

		const worker = sim.players.west.worker;
		expect(worker).toBeDefined();
		if (!worker) return;

		// Move worker directly to building repair spot
		worker.x = bld.x;
		worker.y = bld.y;
		sim.repairBuilding('west', bld.instanceId);

		const initialGold = sim.players.west.gold;
		const initialHp = bld.hp;

		// Update workers for 1 second
		sim.workerSystem.updateWorkers(1.0);

		expect(bld.hp).toBeGreaterThan(initialHp);
		expect(sim.players.west.gold).toBeLessThan(initialGold);
	});

	it('завершує ремонт і скидає стан робітника при досягненні 100% HP', () => {
		sim.build('west', 'h003', 25, 20, 'top');
		const bld = sim.buildings[0];
		bld.isUnderConstruction = false;
		bld.hp = bld.maxHp - 10; // almost full

		const worker = sim.players.west.worker;
		expect(worker).toBeDefined();
		if (!worker) return;

		worker.x = bld.x;
		worker.y = bld.y;
		sim.repairBuilding('west', bld.instanceId);

		sim.workerSystem.updateWorkers(1.0);

		expect(bld.hp).toBe(bld.maxHp);
		expect(worker.isRepairing).toBe(false);
		expect(worker.targetRepairBuildingId).toBeNull();
	});

	it('зупиняє ремонт якщо у гравця закінчилося золото', () => {
		sim.build('west', 'h003', 25, 20, 'top');
		const bld = sim.buildings[0];
		bld.isUnderConstruction = false;
		bld.hp = 100;
		bld.maxHp = 500;

		const worker = sim.players.west.worker;
		expect(worker).toBeDefined();
		if (!worker) return;

		worker.x = bld.x;
		worker.y = bld.y;
		sim.players.west.gold = 0; // zero gold
		sim.repairBuilding('west', bld.instanceId);

		sim.workerSystem.updateWorkers(0.1);

		expect(worker.isRepairing).toBe(false);
		expect(worker.targetRepairBuildingId).toBeNull();
	});

	it('робітник може ремонтувати пошкоджену цитадель (Castle)', () => {
		const castle = sim.castles.west;
		castle.hp = 500; // damaged castle

		const orderSuccess = sim.repairBuilding('west', 'castle_west');
		expect(orderSuccess).toBe(true);

		const worker = sim.players.west.worker;
		expect(worker?.isRepairing).toBe(true);
		expect(worker?.targetRepairBuildingId).toBe('castle_west');

		if (worker) {
			worker.x = castle.x;
			worker.y = castle.y;
			sim.workerSystem.updateWorkers(1.0);
			expect(castle.hp).toBeGreaterThan(500);
		}
	});

	it('BotAI автоматично відправляє робітника ремонтувати пошкоджену споруду коли робітник вільний', () => {
		const botSim = new Simulation({ botDifficulty: 30, startGold: 2000 });
		const bot = new BotAI(botSim);

		// Build a structure for East bot
		botSim.build('east', 'h003', 25, 20, 'top');
		const botBld = botSim.buildings.find((b) => b.team === 'east');
		expect(botBld).toBeDefined();
		if (!botBld) return;

		botBld.isUnderConstruction = false;
		botBld.hp = Math.round(botBld.maxHp * 0.5); // heavily damaged (50%)

		const botWorker = botSim.players.east.worker;
		expect(botWorker).toBeDefined();
		if (!botWorker) return;

		botWorker.isBuilding = false;
		botWorker.isRepairing = false;
		botWorker.targetBuildingId = null;

		// Bot AI tick (decisionTimer is 1.5s)
		bot.update(2.0);

		expect(botWorker.isRepairing).toBe(true);
		expect(botWorker.targetRepairBuildingId).toBe(botBld.instanceId);
	});
});
