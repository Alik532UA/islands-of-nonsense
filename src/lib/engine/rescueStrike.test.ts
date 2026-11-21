import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { BotAI } from './botAI';

describe('Point 5: Rescue Strike (Emergency Castle Defense)', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 500 });
	});

	it('should start with rescue strike ready and set 180s cooldown upon activation', () => {
		expect(sim.canUseRescueStrike('west')).toBe(true);
		expect(sim.rescueStrikeCooldown.west).toBe(0);

		const result = sim.triggerRescueStrike('west');
		expect(result).toBeDefined();
		expect(sim.rescueStrikeCooldown.west).toBe(180);
		expect(sim.canUseRescueStrike('west')).toBe(false);

		// Advance simulation by 180s
		for (let i = 0; i < 3600; i++) {
			sim.step(0.05);
		}
		expect(sim.rescueStrikeCooldown.west).toBe(0);
		expect(sim.canUseRescueStrike('west')).toBe(true);
	});

	it('should damage enemy units in 750px radius around castle, sparing friendlies and distant enemies', () => {
		const westCastle = sim.castles.west;

		// 1. Enemy in danger zone (dist ~ 200px from west castle)
		const nearbyEnemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'bottom',
			x: westCastle.x + 200,
			y: westCastle.y,
			hp: 1500,
			armor: 2
		});

		// 2. Friendly unit near west castle
		const friendlyUnit = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'bottom',
			x: westCastle.x + 150,
			y: westCastle.y,
			hp: 800,
			armor: 2
		});

		// 3. Enemy far away outside 750px radius (dist > 1000px)
		const distantEnemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: westCastle.x + 1100,
			y: westCastle.y,
			hp: 1500,
			armor: 2
		});

		const initialEnemyHp = nearbyEnemy.hp;
		const initialFriendlyHp = friendlyUnit.hp;
		const initialDistantHp = distantEnemy.hp;

		const outcome = sim.triggerRescueStrike('west');
		expect(outcome).not.toBeNull();
		expect(outcome?.hitCount).toBe(1);

		// Nearby enemy damaged significantly
		expect(nearbyEnemy.hp).toBeLessThan(initialEnemyHp);

		// Friendly unit undamaged
		expect(friendlyUnit.hp).toBe(initialFriendlyHp);

		// Distant enemy undamaged
		expect(distantEnemy.hp).toBe(initialDistantHp);

		// Visual effect added
		expect(sim.rescueStrikeEffects.length).toBe(1);
		expect(sim.rescueStrikeEffects[0].radius).toBe(750);
	});

	it('should eliminate low-tier enemy swarms near castle', () => {
		const westCastle = sim.castles.west;

		// Spawn 3 weak enemy units (300 HP each)
		for (let i = 0; i < 3; i++) {
			sim.spawnUnitDirectly({
				team: 'east',
				lane: 'bottom',
				x: westCastle.x + 100 + i * 50,
				y: westCastle.y,
				hp: 300,
				armor: 0
			});
		}

		const outcome = sim.triggerRescueStrike('west');
		expect(outcome?.hitCount).toBe(3);

		// Units should be dead
		const aliveNearbyEast = sim.units.filter(
			(u) =>
				u.team === 'east' &&
				u.state !== 'DEAD' &&
				Math.hypot(u.x - westCastle.x, u.y - westCastle.y) <= 750
		);
		expect(aliveNearbyEast.length).toBe(0);
	});

	it('BotAI triggers rescue strike when enemies cluster around its east castle', () => {
		const botAI = new BotAI(sim);
		const eastCastle = sim.castles.east;

		// Spawn 4 enemy units approaching east castle
		for (let i = 0; i < 4; i++) {
			sim.spawnUnitDirectly({
				team: 'west',
				lane: 'top',
				x: eastCastle.x - 300 - i * 40,
				y: eastCastle.y,
				hp: 1200
			});
		}

		expect(sim.canUseRescueStrike('east')).toBe(true);

		// Run bot update (trigger decision interval >= 1.5s)
		botAI.update(2.0);

		// Bot should have fired rescue strike!
		expect(sim.rescueStrikeCooldown.east).toBe(180);
		expect(sim.canUseRescueStrike('east')).toBe(false);
	});
});
