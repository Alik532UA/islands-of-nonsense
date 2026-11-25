import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import type { Building, MatchTeam } from './types';

function mockBuilding(
	partial: Partial<Building> & {
		instanceId: string;
		defId: string;
		team: MatchTeam;
		x: number;
		y: number;
	}
): Building {
	return {
		name: 'Mock Building',
		tileX: 0,
		tileY: 0,
		hp: 1000,
		maxHp: 1000,
		armor: 5,
		armorType: 'fort',
		goldCost: 150,
		spawnUnitId: '',
		spawnCooldown: 10,
		spawnTimer: 10,
		lane: 'mid',
		upgradeFrom: null,
		race: 'human',
		isUnderConstruction: false,
		...partial
	};
}

describe('Point 5: Fog of War System & Vision Masking', () => {
	let sim: Simulation;

	beforeEach(() => {
		// Pin seed so procedural decorations stay deterministic and don't randomly reveal test coordinates
		sim = new Simulation({ botDifficulty: 0, startGold: 2000, fogOfWar: true, seed: 12345 });
	});

	it('Castle provides wide panoramic vision (750px radius)', () => {
		const westCastle = sim.castles.west;
		expect(sim.isPointRevealed('west', westCastle.x, westCastle.y)).toBe(true);
		expect(sim.isPointRevealed('west', westCastle.x + 600, westCastle.y)).toBe(true);
		expect(sim.isPointRevealed('west', westCastle.x + 850, westCastle.y)).toBe(false);
	});

	it('Towers provide extended scouting vision (750px radius vs regular building 500px)', () => {
		// Normal building placed at far coordinate (2500, 1000)
		sim.buildings.push(
			mockBuilding({
				instanceId: 'normal_bld',
				defId: 'h000',
				team: 'west',
				x: 2500,
				y: 1000
			})
		);

		// 450px away from normal building is revealed (within 500px)
		expect(sim.isPointRevealed('west', 2500 + 450, 1000)).toBe(true);
		// 600px away from normal building is outside 500px vision
		expect(sim.isPointRevealed('west', 2500 + 600, 1000)).toBe(false);

		// Now add a Guard Tower with specialType: 'tower' at (4000, 1000)
		sim.buildings.push(
			mockBuilding({
				instanceId: 'tower_bld',
				defId: 'h006',
				team: 'west',
				specialType: 'tower',
				x: 4000,
				y: 1000,
				hp: 1200,
				maxHp: 1200
			})
		);

		// 650px away from tower IS revealed by 750px scouting radius
		expect(sim.isPointRevealed('west', 4000 + 650, 1000)).toBe(true);
		// 800px away is beyond 750px
		expect(sim.isPointRevealed('west', 4000 + 800, 1000)).toBe(false);
	});

	it('Flying units provide extended aerial vision (1250px radius vs ground 1100px) and adapt to unit range', () => {
		// Spawn ground unit in the middle of map (far from base)
		const groundUnit = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'mid',
			x: 3500,
			y: sim.midLaneY,
			hp: 400,
			flying: false
		});

		// 1000px is within ground vision (1100px)
		expect(sim.isPointRevealed('west', groundUnit.x + 1000, groundUnit.y)).toBe(true);
		// 1200px away from ground unit is not revealed
		expect(sim.isPointRevealed('west', groundUnit.x + 1200, groundUnit.y)).toBe(false);

		// Spawn flying unit
		const flyingUnit = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'mid',
			x: 3500,
			y: sim.midLaneY,
			hp: 400,
			flying: true
		});

		// 1200px away from flying unit IS revealed by 1250px aerial vision
		expect(sim.isPointRevealed('west', flyingUnit.x + 1200, flyingUnit.y)).toBe(true);
		// 1350px away is beyond 1250px
		expect(sim.isPointRevealed('west', flyingUnit.x + 1350, flyingUnit.y)).toBe(false);

		// Long-range siege unit with range 1300 dynamically reveals (range + 100 = 1400px)
		const siegeUnit = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'mid',
			x: 3500,
			y: sim.midLaneY,
			hp: 400,
			range: 1300
		});
		// 1350px is revealed (within 1400px dynamic vision)
		expect(sim.isPointRevealed('west', siegeUnit.x + 1350, siegeUnit.y)).toBe(true);
		// 1450px is beyond 1400px
		expect(sim.isPointRevealed('west', siegeUnit.x + 1450, siegeUnit.y)).toBe(false);
	});

	it('Enemy units and structures in fog are masked from team vision', () => {
		// Enemy unit spawned in enemy territory
		const enemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: sim.castles.east.x - 200,
			y: sim.topLaneY,
			hp: 500
		});

		// West cannot see enemy unit
		expect(sim.isPointRevealed('west', enemy.x, enemy.y)).toBe(false);
		// East can see its own unit
		expect(sim.isPointRevealed('east', enemy.x, enemy.y)).toBe(true);
	});

	it('All points are revealed when fogOfWar configuration is disabled', () => {
		sim.config.fogOfWar = false;
		expect(sim.isPointRevealed('west', sim.castles.east.x, sim.castles.east.y)).toBe(true);
		expect(sim.isPointRevealed('east', sim.castles.west.x, sim.castles.west.y)).toBe(true);
	});
});
