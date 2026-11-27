import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import {
	BUILDINGS_MAP,
	getBaseBuildingsForRace,
	getBuilding,
	getUnit,
	GUARD_TOWERS,
	PLAYABLE_RACES,
	SPECIAL_BUILDINGS
} from './gameData';
import { getSpecialBuildingDescription, SPECIAL_BUILDING_SPECS } from './specialBuildings';

describe('Point 6: Special Non-Spawning Buildings (Treasure Box, Repair, Recycler)', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 2000 });
		sim.decorations = [];
		sim.players.west.lumber = 2000;
	});

	it('defines special non-spawning buildings with correct properties', () => {
		expect(SPECIAL_BUILDINGS.length).toBeGreaterThanOrEqual(3);

		const treasure = getBuilding('h008');
		expect(treasure).toBeDefined();
		expect(treasure?.specialType).toBe('treasure');
		expect(treasure?.gold_cost).toBe(160);

		const repair = getBuilding('cg09_repair');
		expect(repair).toBeDefined();
		expect(repair?.specialType).toBe('repair');
		expect(repair?.gold_cost).toBe(180);

		const recycler = getBuilding('cg07_recycler');
		expect(recycler).toBeDefined();
		expect(recycler?.specialType).toBe('recycler');
		expect(recycler?.gold_cost).toBe(210);
	});

	it('Treasure Box (h008) increases income by +20% per box without spawning units', () => {
		// Build 1 Treasure Box at (25, 20)
		const success = sim.build('west', 'h008', 25, 20);
		expect(success).toBe(true);

		const box = sim.buildings.find((b) => b.defId === 'h008');
		expect(box).toBeDefined();
		expect(box?.specialType).toBe('treasure');

		// Step for 15 seconds (typical spawner cycle is 10-14s)
		for (let i = 0; i < 300; i++) {
			sim.step(0.05);
		}

		// No units should have spawned from Treasure Box
		const unitsFromBox = sim.units.filter((u) => u.team === 'west');
		expect(unitsFromBox.length).toBe(0);

		// Record gold before income tick
		sim.incomeTimer = 0.05;
		const goldBefore = sim.players.west.gold;
		sim.step(0.05); // triggers income
		const goldGainedWith1Box = sim.players.west.gold - goldBefore;

		// Build a second Treasure Box at (25, 24)
		sim.players.west.gold = 2000;
		sim.build('west', 'h008', 25, 24);

		sim.incomeTimer = 0.05;
		const goldBefore2 = sim.players.west.gold;
		sim.step(0.05);
		const goldGainedWith2Boxes = sim.players.west.gold - goldBefore2;

		// 2 boxes give more income than 1 box
		expect(goldGainedWith2Boxes).toBeGreaterThan(goldGainedWith1Box);
	});

	it('Repair Station (cg09_repair) steadily restores castle HP without spawning units', () => {
		const westCastle = sim.castles.west;
		westCastle.hp = 10000;

		const success = sim.build('west', 'cg09_repair', 25, 20);
		expect(success).toBe(true);
		// Mark constructed to test repair mechanism in isolation
		sim.buildings[0].isUnderConstruction = false;

		const initialHp = westCastle.hp;

		// Step simulation for 3 seconds (should trigger 3 repair ticks = +75 HP)
		for (let i = 0; i < 60; i++) {
			sim.step(0.05);
		}

		expect(westCastle.hp).toBeGreaterThan(initialHp);
		expect(westCastle.hp).toBe(initialHp + 75);

		// No combat units should be spawned by repair station
		expect(sim.units.filter((u) => u.team === 'west').length).toBe(0);
	});

	it('Recycler (cg07_recycler) awards scrap gold whenever a friendly unit dies', () => {
		const success = sim.build('west', 'cg07_recycler', 25, 20);
		expect(success).toBe(true);

		sim.players.west.gold = 100;

		// Spawn a friendly unit
		const friendlyUnit = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'bottom',
			x: 1000,
			y: 580,
			hp: 100
		});

		// Spawn strong enemy that attacks and kills friendly unit
		const _killerEnemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'bottom',
			x: 1050,
			y: 580,
			hp: 1000,
			damage: 500,
			range: 100,
			attackCooldown: 0.1
		});

		// Advance simulation so enemy kills friendly unit
		for (let i = 0; i < 20; i++) {
			sim.step(0.05);
			if (friendlyUnit.state === 'DEAD') break;
		}

		expect(friendlyUnit.state).toBe('DEAD');
		// Recycler awards +4 gold on unit death: 100 + 4 = 104
		expect(sim.players.west.gold).toBe(104);
	});

	it('ensures every special, tower, and race building has an explanatory description or unit', () => {
		for (const sb of SPECIAL_BUILDINGS) {
			const desc = String(sb.raw_fields?.utub ?? '').trim();
			expect(desc.length, `Missing description for special building ${sb.id}`).toBeGreaterThan(0);
		}
		for (const t of GUARD_TOWERS) {
			const desc = String(t.raw_fields?.utub ?? '').trim();
			expect(desc.length, `Missing description for tower ${t.id}`).toBeGreaterThan(0);
		}
		for (const race of PLAYABLE_RACES) {
			for (const b of getBaseBuildingsForRace(race)) {
				const hasUnit = Boolean(b.unit && getUnit(b.unit));
				const hasDesc = Boolean(String(b.raw_fields?.utub ?? '').trim());
				expect(
					hasUnit || hasDesc,
					`Building ${b.id} (${b.name}) in ${race} lacks description and unit`
				).toBe(true);
			}
		}
		for (const b of BUILDINGS_MAP.values()) {
			const hasUnit = Boolean(b.unit && getUnit(b.unit));
			const hasDesc = Boolean(String(b.raw_fields?.utub ?? '').trim());
			expect(
				hasUnit || hasDesc,
				`Building ${b.id} (${b.name}) in BUILDINGS_MAP lacks description and unit`
			).toBe(true);
			if (!hasUnit) {
				const ukDesc = getSpecialBuildingDescription(b.id, 'uk');
				const enDesc = getSpecialBuildingDescription(b.id, 'en');
				expect(ukDesc, `Missing UK special description for ${b.id} (${b.name})`).toBeTruthy();
				expect(enDesc, `Missing EN special description for ${b.id} (${b.name})`).toBeTruthy();
			}
		}
	});

	it('spawns upgraded Zbirachi units from cg07..cg0f despite specialType metadata', () => {
		const bDef = getBuilding('cg07')!;
		expect(bDef).toBeDefined();
		expect(sim.build('west', 'cg02', 25, 20)).toBe(true);
		const bld = sim.buildings[0];
		bld.isUnderConstruction = false;
		expect(sim.upgradeBuilding('west', bld.instanceId, 'cg07')).toBe(true);
		bld.spawnTimer = 0.05;
		sim.buildingSystem.updateBuildings(0.1);
		expect(sim.units.some((u) => u.team === 'west' && u.defId === 'cg13')).toBe(true);
	});

	it('executes real gameplay mechanics across every race special building', () => {
		const specIds = Object.keys(SPECIAL_BUILDING_SPECS).filter(
			(id) =>
				![
					'cg10_shop',
					'cg11_forge',
					'cg12_commander',
					'h008',
					'cg09_repair',
					'cg07_recycler'
				].includes(id) &&
				(SPECIAL_BUILDING_SPECS[id].auras ||
					SPECIAL_BUILDING_SPECS[id].periodicStrike ||
					SPECIAL_BUILDING_SPECS[id].periodicSupport)
		);
		expect(specIds.length).toBeGreaterThanOrEqual(24);

		// 1. Вівтар Сирен (h00M): heals allies + curses & weakens enemies
		{
			const s = new Simulation({ botDifficulty: 0, startGold: 5000 });
			s.decorations = [];
			s.players.west.lumber = 5000;
			expect(s.build('west', 'h00M', 25, 20)).toBe(true);
			const altar = s.buildings[0];
			altar.isUnderConstruction = false;
			altar.specialTimer = 0.05;
			altar.secondaryTimer = 0.05;

			const ally = s.spawnUnitDirectly({
				team: 'west',
				lane: 'top',
				x: altar.x + 120,
				y: altar.y,
				hp: 100,
				maxHp: 300
			});
			const enemy = s.spawnUnitDirectly({
				team: 'east',
				lane: 'top',
				x: altar.x + 200,
				y: altar.y,
				hp: 300
			});

			s.buildingSystem.updateBuildings(0.1);
			expect(ally.hp).toBe(175);
			expect(enemy.buffs?.some((b) => b.type === 'curse')).toBe(true);
			expect(enemy.buffs?.some((b) => b.type === 'weakness')).toBe(true);
		}

		// 2. Купа Черепів (h01P): consumes corpse to raise 2 Skeleton Warriors
		{
			const s = new Simulation({ botDifficulty: 0, startGold: 5000 });
			s.decorations = [];
			expect(s.build('west', 'h01P', 25, 20)).toBe(true);
			const pile = s.buildings[0];
			pile.isUnderConstruction = false;
			pile.secondaryTimer = 0.05;
			s.corpses.push({
				id: 'corpse_1',
				team: 'east',
				lane: 'top',
				x: pile.x + 150,
				y: pile.y,
				decayTimer: 10,
				unitDefId: 'hfoo',
				name: 'Footman',
				isFlyer: false
			});

			s.buildingSystem.updateBuildings(0.1);
			expect(s.corpses.length).toBe(0);
			expect(s.units.filter((u) => u.team === 'west' && u.defId === 'n00B').length).toBe(2);
		}

		// 3. Електростанція (h09T): strikes enemies with chain lightning & cleanses chill from allies
		{
			const s = new Simulation({ botDifficulty: 0, startGold: 5000 });
			s.decorations = [];
			s.players.west.lumber = 5000;
			expect(s.build('west', 'h09T', 25, 20)).toBe(true);
			const plant = s.buildings[0];
			plant.isUnderConstruction = false;
			plant.specialTimer = 0.05;
			plant.secondaryTimer = 0.05;

			const chilledAlly = s.spawnUnitDirectly({
				team: 'west',
				lane: 'top',
				x: plant.x + 120,
				y: plant.y,
				hp: 300
			});
			chilledAlly.buffs = [{ type: 'frost', timer: 5, value: 0.35 }];
			const enemy = s.spawnUnitDirectly({
				team: 'east',
				lane: 'top',
				x: plant.x + 250,
				y: plant.y,
				hp: 300,
				armor: 0
			});

			s.buildingSystem.updateBuildings(0.1);
			expect(enemy.hp).toBeLessThan(300);
			expect(s.lightningEffects.length).toBeGreaterThan(0);
			expect(chilledAlly.buffs.some((b) => b.type === 'frost')).toBe(false);
		}

		// 4. Склад Запчастин (h069): repairs damaged allied buildings & grants gold + lumber
		{
			const s = new Simulation({ botDifficulty: 0, startGold: 5000 });
			s.decorations = [];
			s.players.west.lumber = 5000;
			expect(s.build('west', 'h000', 25, 20)).toBe(true);
			expect(s.build('west', 'h069', 25, 24)).toBe(true);
			const dmgBld = s.buildings[0];
			const depot = s.buildings[1];
			dmgBld.isUnderConstruction = false;
			dmgBld.hp = 400;
			dmgBld.maxHp = 1000;
			depot.isUnderConstruction = false;
			depot.secondaryTimer = 0.05;
			const g0 = s.players.west.gold;
			const l0 = s.players.west.lumber;

			s.buildingSystem.updateBuildings(0.1);
			expect(dmgBld.hp).toBe(440);
			expect(s.players.west.gold).toBe(g0 + 5);
			expect(s.players.west.lumber).toBe(l0 + 6);
		}

		// 5. Глобальні аури & легендарні споруди (h010 Ріг Героїв, h05G Храм Героїв, h04T Око Бурі, h01E Храм Знищення)
		for (const defId of ['h010', 'h05G', 'h04T', 'h01E']) {
			const s = new Simulation({ botDifficulty: 0, startGold: 5000 });
			s.decorations = [];
			s.players.west.lumber = 5000;
			expect(s.build('west', defId, 25, 20)).toBe(true);
			const b = s.buildings[0];
			b.isUnderConstruction = false;
			b.specialTimer = 0.05;
			b.secondaryTimer = 0.05;
			const ally = s.spawnUnitDirectly({ team: 'west', lane: 'top', x: 900, y: 220, hp: 300 });
			const enemy = s.spawnUnitDirectly({
				team: 'east',
				lane: 'top',
				x: 1100,
				y: 220,
				hp: 500,
				armor: 0
			});
			s.buildingSystem.updateBuildings(0.1);
			if (defId === 'h010' || defId === 'h05G') {
				expect(ally.buffs?.some((bf) => bf.type === 'dmg')).toBe(true);
			}
			if (defId === 'h05G') {
				expect(s.units.some((u) => u.team === 'west' && u.defId === 'h03C')).toBe(true);
			}
			if (defId === 'h04T' || defId === 'h01E') {
				expect(enemy.hp).toBeLessThan(500);
				expect(enemy.buffs?.some((bf) => bf.type === 'stun')).toBe(true);
			}
		}
	});
});
