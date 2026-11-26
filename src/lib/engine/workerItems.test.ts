import { describe, it, expect } from 'vitest';
import { Simulation } from './simulation';
import { validatePlayerMove } from '$lib/net/actionValidation';

function addShop(sim: Simulation, team: 'west' | 'east', playerSlot = 1) {
	const p =
		sim.allPlayers.find((pl) => pl.team === team && pl.slot === playerSlot) ?? sim.players[team];
	sim.buildings.push({
		instanceId: `shop_${team}_${playerSlot}`,
		defId: 'cg10_shop',
		name: 'Крамниця',
		race: p.race,
		team,
		playerId: p.id,
		playerSlot: p.slot,
		x: team === 'west' ? 400 : 6200,
		y: 1200,
		tileX: 10,
		tileY: 36,
		hp: 1000,
		maxHp: 1000,
		armor: 5,
		armorType: 'large',
		lane: 'top',
		upgradeFrom: null,
		goldCost: 150,
		lumberCost: 0,
		spawnUnitId: '',
		spawnCooldown: 0,
		spawnTimer: 0,
		isUnderConstruction: false,
		buildProgress: 1,
		maxBuildProgress: 1,
		specialType: 'shop'
	});
	return p;
}

describe('Worker WC3 Inventory: Drop, Pickup, Transfer & Swap', () => {
	it('starts with Golden Cheese in slot 0 granting 1 food, buys second cheese, drops and picks back up', () => {
		const sim = new Simulation({ startGold: 2000, botDifficulty: 1, isRunning: true });
		const p = addShop(sim, 'west', 1);
		const w = p.worker!;
		expect(p.maxFood).toBe(1);
		expect(w.inventory?.[0]?.id).toBe('I004');

		// Dropping starting cheese reduces maxFood to 0
		expect(sim.dropWorkerItem('west', 0, w.x + 20, w.y + 20, p)).toBe(true);
		expect(w.inventory?.[0]).toBeNull();
		expect(p.maxFood).toBe(0);
		expect(sim.groundItems.length).toBe(1);
		const startingDroppedId = sim.groundItems[0].instanceId;

		// Pick starting cheese back up -> maxFood restored to 1
		expect(sim.pickupGroundItem('west', startingDroppedId, p)).toBe(true);
		expect(sim.groundItems.length).toBe(0);
		expect(w.inventory?.[0]?.id).toBe('I004');
		expect(p.maxFood).toBe(1);

		// Buy second Golden Cheese (I004) into slot 1
		expect(sim.buyCastleItem('west', 'I004', p)).toBe(true);
		expect(p.maxFood).toBe(2);
		expect(w.inventory?.[1]?.id).toBe('I004');

		// Drop second cheese onto ground nearby
		expect(sim.dropWorkerItem('west', 1, w.x + 20, w.y + 20, p)).toBe(true);
		expect(w.inventory?.[1]).toBeNull();
		expect(p.maxFood).toBe(1);
		expect(sim.groundItems.length).toBe(1);
		const droppedId = sim.groundItems[0].instanceId;

		// Pick it back up
		expect(sim.pickupGroundItem('west', droppedId, p)).toBe(true);
		expect(sim.groundItems.length).toBe(0);
		expect(w.inventory?.[1]?.id).toBe('I004');
		expect(p.maxFood).toBe(2);
	});

	it('walks to distant drop/pickup points and executes upon arrival', () => {
		const sim = new Simulation({ startGold: 2000, botDifficulty: 1, isRunning: true });
		const p = addShop(sim, 'west', 1);
		const w = p.worker!;

		// Drop starting Golden Cheese 250px away -> worker starts walking
		const targetX = w.x + 250;
		const targetY = w.y;
		expect(sim.dropWorkerItem('west', 0, targetX, targetY, p)).toBe(true);
		expect(w.pendingItemOrder?.kind).toBe('drop');
		expect(sim.groundItems.length).toBe(0);

		// Simulate worker walking to target
		for (let i = 0; i < 60; i++) {
			sim.workerSystem.updateWorkers(0.1);
			if (sim.groundItems.length > 0) break;
		}
		expect(sim.groundItems.length).toBe(1);
		expect(w.pendingItemOrder).toBeNull();
	});

	it('transfers an item from one allied worker to another in 2v2', () => {
		const sim = new Simulation({
			startGold: 2000,
			botDifficulty: 1,
			isRunning: true,
			customSlots: [
				{ slot: 1, team: 'west', isBot: false, race: 'Альянс', name: 'P1' },
				{ slot: 3, team: 'west', isBot: false, race: 'Ельфи', name: 'P3' },
				{ slot: 2, team: 'east', isBot: true, race: 'Орки', name: 'B2' },
				{ slot: 4, team: 'east', isBot: true, race: 'Нежить', name: 'B4' }
			]
		});
		const p1 = addShop(sim, 'west', 1);
		const p3 = sim.allPlayers.find((pl) => pl.slot === 3)!;
		expect(p1.worker).toBeDefined();
		expect(p3.worker).toBeDefined();

		// Position P3 worker next to P1 worker
		p3.worker!.x = p1.worker!.x + 40;
		p3.worker!.y = p1.worker!.y;

		expect(p1.maxFood).toBe(1);
		expect(p3.maxFood).toBe(1);

		expect(sim.transferWorkerItem('west', 0, 3, p1)).toBe(true);
		expect(p1.worker!.inventory?.[0]).toBeNull();
		expect(p3.worker!.inventory?.[1]?.id).toBe('I004');
		expect(p1.maxFood).toBe(0);
		expect(p3.maxFood).toBe(2);
	});

	it('swaps inventory slots and validates online item commands', () => {
		const sim = new Simulation({ startGold: 2000, botDifficulty: 1, isRunning: true });
		const p = addShop(sim, 'west', 1);

		expect(sim.swapWorkerInventorySlots('west', 0, 4, p)).toBe(true);
		expect(p.worker!.inventory?.[0]).toBeNull();
		expect(p.worker!.inventory?.[4]?.id).toBe('I004');

		expect(
			validatePlayerMove({
				seq: 1,
				by: 'uid1',
				type: 'DROP_ITEM',
				payload: { team: 'west', playerSlot: 1, slotIdx: 4, worldX: 500, worldY: 1200 }
			}).valid
		).toBe(true);
		expect(
			validatePlayerMove({
				seq: 2,
				by: 'uid1',
				type: 'TRANSFER_ITEM',
				payload: { team: 'west', playerSlot: 1, slotIdx: 0, targetPlayerSlot: 3 }
			}).valid
		).toBe(true);
		expect(
			validatePlayerMove({
				seq: 3,
				by: 'uid1',
				type: 'DROP_ITEM',
				payload: { team: 'west', slotIdx: 99 }
			}).valid
		).toBe(false);
	});

	it('provides infinite gold and lumber in sandbox mode', () => {
		const sim = new Simulation({
			modeId: 'sandbox',
			startGold: 500,
			botDifficulty: 0,
			isRunning: true
		});
		const p = sim.players.west;
		expect(p.gold).toBe(999999);
		expect(p.lumber).toBe(999999);

		p.gold -= 10000;
		p.lumber -= 5000;
		sim.step(0.05);
		expect(p.gold).toBe(999999);
		expect(p.lumber).toBe(999999);
	});
});
