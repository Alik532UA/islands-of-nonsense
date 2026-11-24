import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { getBuilding } from './gameData';

describe('Point 5: Stationary Building Passive Auras (Altar, Fountain, Obelisk)', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 5000 });
		sim.decorations = [];
		sim.players.west.lumber = 2000;
	});

	it('defines stationary aura buildings in SPECIAL_BUILDINGS', () => {
		const altar = getBuilding('h045_altar');
		expect(altar).toBeDefined();
		expect(altar?.specialType).toBe('special');
		expect(altar?.aura?.type).toBe('armor');
		expect(altar?.aura?.value).toBe(3);
		expect(altar?.aura?.radius).toBe(600);

		const fountain = getBuilding('h046_fountain');
		expect(fountain).toBeDefined();
		expect(fountain?.specialType).toBe('special');
		expect(fountain?.aura?.type).toBe('heal');
		expect(fountain?.aura?.value).toBe(25);
		expect(fountain?.aura?.radius).toBe(600);

		const obelisk = getBuilding('h047_obelisk');
		expect(obelisk).toBeDefined();
		expect(obelisk?.specialType).toBe('special');
		expect(obelisk?.aura?.type).toBe('mana');
		expect(obelisk?.aura?.value).toBe(10);
		expect(obelisk?.aura?.radius).toBe(600);
	});

	it('Altar of Protection (h045_altar) emits +3 armor aura to nearby allies but not enemies', () => {
		const success = sim.build('west', 'h045_altar', 25, 20);
		expect(success).toBe(true);
		const altar = sim.buildings.find((b) => b.defId === 'h045_altar');
		expect(altar).toBeDefined();
		// Finish construction instantly
		altar!.isUnderConstruction = false;
		altar!.hp = altar!.maxHp;

		// Spawn friendly unit inside aura radius (dist <= 600)
		const friendlyInside = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: altar!.x + 100,
			y: altar!.y + 50,
			hp: 500,
			armor: 2
		});

		// Spawn friendly unit far away (dist > 600)
		const friendlyFar = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: altar!.x + 1000,
			y: altar!.y,
			hp: 500,
			armor: 2
		});

		// Spawn enemy inside aura radius
		const enemyInside = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: altar!.x + 50,
			y: altar!.y + 50,
			hp: 500,
			armor: 2
		});

		sim.buildingSystem.updateBuildings(0.1);

		// Friendly inside receives shield buff with value 3
		const shieldBuff = friendlyInside.buffs?.find((b) => b.type === 'shield');
		expect(shieldBuff).toBeDefined();
		expect(shieldBuff?.value).toBe(3);

		// Friendly outside has no shield buff
		expect(friendlyFar.buffs?.some((b) => b.type === 'shield')).toBeFalsy();

		// Enemy inside does not receive shield buff from friendly building
		expect(enemyInside.buffs?.some((b) => b.type === 'shield')).toBeFalsy();
	});

	it('Fountain of Health (h046_fountain) heals nearby allies over time', () => {
		sim.build('west', 'h046_fountain', 25, 20);
		const fountain = sim.buildings.find((b) => b.defId === 'h046_fountain');
		expect(fountain).toBeDefined();
		fountain!.isUnderConstruction = false;

		const wounded = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: fountain!.x + 150,
			y: fountain!.y,
			hp: 300,
			maxHp: 500
		});

		// Step 2 seconds with 25 HP/s aura
		sim.buildingSystem.updateBuildings(2.0);

		// 300 + 25 * 2 = 350
		expect(wounded.hp).toBe(350);
	});

	it('Mana Obelisk (h047_obelisk) restores mana to nearby spellcasters', () => {
		sim.build('west', 'h047_obelisk', 25, 20);
		const obelisk = sim.buildings.find((b) => b.defId === 'h047_obelisk');
		expect(obelisk).toBeDefined();
		obelisk!.isUnderConstruction = false;

		const caster = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: obelisk!.x + 100,
			y: obelisk!.y,
			hp: 400
		});
		caster.mana = 20;
		caster.maxMana = 100;

		// Step 3 seconds with 10 mana/s aura
		sim.buildingSystem.updateBuildings(3.0);

		// 20 + 10 * 3 = 50
		expect(caster.mana).toBe(50);
	});
});
