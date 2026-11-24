import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { getBuilding, getBaseBuildingsForRace, GUARD_TOWERS } from './gameData';

describe('Point 5: Defensive Guard Towers for Each Race', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 3000 });
		sim.players.west.lumber = 2000;
	});

	it('defines authentic guard towers for all 11 races', () => {
		expect(GUARD_TOWERS.length).toBe(11);

		const humanTower = getBuilding('h006');
		expect(humanTower).toBeDefined();
		expect(humanTower?.race).toBe('Люди');
		expect(humanTower?.specialType).toBe('tower');
		expect(humanTower?.attack_type).toBe('pierce');

		const orcTower = getBuilding('o000');
		expect(orcTower).toBeDefined();
		expect(orcTower?.race).toBe('Орки');
		expect(orcTower?.specialType).toBe('tower');

		const frostTower = getBuilding('h03Q');
		expect(frostTower).toBeDefined();
		expect(frostTower?.race).toBe('Північ');
		expect(frostTower?.attack_type).toBe('magic');

		const plagueTower = getBuilding('n01J');
		expect(plagueTower).toBeDefined();
		expect(plagueTower?.race).toBe('Порча');
		expect(plagueTower?.attack_type).toBe('chaos');

		const elfTower = getBuilding('h014');
		expect(elfTower).toBeDefined();
		expect(elfTower?.race).toBe('Ельфи');

		const undeadTower = getBuilding('h01O');
		expect(undeadTower).toBeDefined();
		expect(undeadTower?.race).toBe('Нежить');
	});

	it('includes guard towers in getBaseBuildingsForRace for players to construct', () => {
		const humanBase = getBaseBuildingsForRace('Люди');
		expect(humanBase.some((b) => b.id === 'h006')).toBe(true);

		const orcBase = getBaseBuildingsForRace('Орки');
		expect(orcBase.some((b) => b.id === 'o000')).toBe(true);

		const scavengerBase = getBaseBuildingsForRace('Збирачі');
		expect(scavengerBase.some((b) => b.id === 'cg0a')).toBe(true);
	});

	it('successfully builds a tower and never spawns units', () => {
		const success = sim.build('west', 'h006', 25, 20);
		expect(success).toBe(true);

		const tower = sim.buildings.find((b) => b.defId === 'h006');
		expect(tower).toBeDefined();
		expect(tower?.specialType).toBe('tower');
		expect(tower?.attackRange).toBe(500);

		// Step for 15 seconds (spawners would spawn in ~12s)
		for (let i = 0; i < 300; i++) {
			sim.step(0.05);
		}

		const spawnedUnits = sim.units.filter((u) => u.team === 'west');
		expect(spawnedUnits.length).toBe(0);
	});

	it('fires projectiles at approaching enemies in range', () => {
		// Build Human guard tower at (25, 20)
		sim.build('west', 'h006', 25, 20);
		const tower = sim.buildings.find((b) => b.defId === 'h006')!;

		// Spawn an enemy grunt within tower range
		const enemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: tower.x + 300,
			y: tower.y,
			hp: 500,
			maxHp: 500
		});
		expect(enemy).toBeDefined();

		// Step simulation to allow tower to acquire target and fire
		sim.step(0.05);

		// A projectile should have been created by the tower
		expect(sim.projectiles.length).toBeGreaterThan(0);
		const proj = sim.projectiles.find((p) => p.sourceUnitId === tower.instanceId);
		expect(proj).toBeDefined();
		expect(proj?.targetUnitId).toBe(enemy?.instanceId);
		expect(proj?.attackType).toBe('pierce');
	});

	it('Frost Tower slows enemy upon projectile hit', () => {
		sim.build('west', 'h03Q', 25, 20);
		const frostTower = sim.buildings.find((b) => b.defId === 'h03Q')!;

		const enemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: frostTower.x + 100,
			y: frostTower.y,
			hp: 500,
			maxHp: 500
		});

		// Step simulation until projectile hits (speed 650 covers 100 distance in ~0.15s)
		for (let i = 0; i < 10; i++) {
			sim.step(0.05);
		}

		// Enemy should now have a slow buff
		const slow = enemy.buffs?.find((b) => b.type === 'slow');
		expect(slow).toBeDefined();
		expect(slow?.value).toBe(0.3);
	});

	it('Plague Tower poisons enemy upon projectile hit', () => {
		sim.build('west', 'n01J', 25, 20);
		const plagueTower = sim.buildings.find((b) => b.defId === 'n01J')!;

		const enemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: plagueTower.x + 100,
			y: plagueTower.y,
			hp: 500,
			maxHp: 500
		});

		for (let i = 0; i < 10; i++) {
			sim.step(0.05);
		}

		const poison = enemy.buffs?.find((b) => b.type === 'poison');
		expect(poison).toBeDefined();
		expect(poison?.value).toBe(12);
	});
});
