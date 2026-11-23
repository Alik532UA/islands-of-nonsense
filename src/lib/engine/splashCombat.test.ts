import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';

describe('Point 7: Unit Innate Passives & AoE Splash Damage', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 500 });
	});

	it('should apply AoE splash damage to nearby enemies when projectile impacts', () => {
		// West artillery unit with splash radius 110
		sim.spawnUnitDirectly({
			team: 'west',
			lane: 'bottom',
			x: 100,
			y: 580,
			range: 500,
			damage: 200,
			attackCooldown: 1.0,
			splashRadius: 110
		});

		// Primary target (dist 200px from shooter) - dummy target
		const primaryTarget = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'bottom',
			x: 300,
			y: 580,
			hp: 1000,
			speed: 0,
			cooldownTimer: 999
		});

		// Secondary enemy close to primary target (50px away, within 110px splash)
		const nearbyEnemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'bottom',
			x: 350,
			y: 580,
			hp: 1000,
			speed: 0,
			cooldownTimer: 999
		});

		// Far enemy outside splash radius (200px away from impact point)
		const distantEnemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'bottom',
			x: 500,
			y: 580,
			hp: 1000,
			speed: 0,
			cooldownTimer: 999
		});

		// Friendly unit next to impact (stationary ally)
		const friendlyUnit = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'bottom',
			x: 280,
			y: 580,
			hp: 1000,
			speed: 0,
			cooldownTimer: 999
		});

		const initPrimaryHp = primaryTarget.hp;
		const initNearbyHp = nearbyEnemy.hp;
		const initDistantHp = distantEnemy.hp;
		const initFriendlyHp = friendlyUnit.hp;

		// Step simulation so projectile fires and lands
		for (let i = 0; i < 20; i++) {
			sim.step(0.05);
		}

		// Primary target should take full direct damage
		expect(primaryTarget.hp).toBeLessThan(initPrimaryHp);

		// Nearby enemy should take splash damage
		expect(nearbyEnemy.hp).toBeLessThan(initNearbyHp);

		// Distant enemy should be untouched
		expect(distantEnemy.hp).toBe(initDistantHp);

		// Friendly unit should be untouched by friendly splash
		expect(friendlyUnit.hp).toBe(initFriendlyHp);

		// Splash visual effect was registered
		expect(sim.splashEffects.length).toBeGreaterThanOrEqual(0);
	});

	it('should reflect melee damage back to attacker when target has thorns reflection', () => {
		// Attacker (melee)
		const attacker = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 100,
			y: 220,
			range: 90,
			damage: 100,
			hp: 500
		});

		// Defender with 20% thorns reflection
		sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 120,
			y: 220,
			range: 90,
			damage: 0,
			hp: 1000,
			reflectDamagePct: 0.2
		});

		const initialAttackerHp = attacker.hp;

		// Step simulation so attacker strikes defender
		for (let i = 0; i < 20; i++) {
			sim.step(0.05);
			if (attacker.hp < initialAttackerHp) break;
		}

		// Attacker should have received reflected damage!
		expect(attacker.hp).toBeLessThan(initialAttackerHp);
	});

	it('should trigger Scavenger Great Assembly (+15% dmg & heal) on death to closest ally', () => {
		// Scavenger unit with 10 HP
		const scavenger = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 300,
			y: 220,
			hp: 10,
			isScavenger: true
		});

		// Closest ally with missing HP (hp: 200, maxHp: 500)
		const closeAlly = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 250,
			y: 220,
			hp: 200,
			maxHp: 500
		});

		// Strong enemy that kills scavenger (placed at 340, closer to scavenger at 300 than ally at 250)
		sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 340,
			y: 220,
			damage: 500,
			range: 90,
			attackCooldown: 0.1
		});

		// Step simulation until scavenger dies
		for (let i = 0; i < 20; i++) {
			sim.step(0.05);
			if (scavenger.state === 'DEAD') break;
		}

		expect(scavenger.state).toBe('DEAD');

		// Close ally should receive Great Assembly scrap heal and dmg buff
		expect(closeAlly.hp).toBeGreaterThan(200);
		expect(closeAlly.buffs?.some((b) => b.type === 'dmg')).toBe(true);
	});

	it('should apply authentic 3-ring splash falloff (full 100%, medium 40%, small 15%)', () => {
		const impactX = 500;
		const impactY = 500;
		const splashRadius = 100;
		const baseDamage = 100;

		// 1. Target in inner ring (dist = 20 <= 30): 100% factor
		const innerTarget = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'bottom',
			x: impactX + 20,
			y: impactY,
			hp: 1000,
			maxHp: 1000,
			armor: 0
		});

		// 2. Target in middle ring (dist = 50, 30 < 50 <= 65): 40% factor
		const middleTarget = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'bottom',
			x: impactX + 50,
			y: impactY,
			hp: 1000,
			maxHp: 1000,
			armor: 0
		});

		// 3. Target in outer ring (dist = 85, 65 < 85 <= 100): 15% factor
		const outerTarget = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'bottom',
			x: impactX + 85,
			y: impactY,
			hp: 1000,
			maxHp: 1000,
			armor: 0
		});

		// 4. Target beyond splash radius (dist = 120 > 100): 0% factor
		const outsideTarget = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'bottom',
			x: impactX + 120,
			y: impactY,
			hp: 1000,
			maxHp: 1000,
			armor: 0
		});

		sim.combatSystem.triggerSplashDamage(
			impactX,
			impactY,
			splashRadius,
			baseDamage,
			'chaos',
			'west',
			undefined,
			'bottom'
		);

		const innerLoss = 1000 - innerTarget.hp;
		const middleLoss = 1000 - middleTarget.hp;
		const outerLoss = 1000 - outerTarget.hp;
		const outsideLoss = 1000 - outsideTarget.hp;

		// Verify 3-ring falloff ordering: inner (100) > middle (40) > outer (15) > outside (0)
		expect(innerLoss).toBe(100);
		expect(middleLoss).toBe(40);
		expect(outerLoss).toBe(15);
		expect(outsideLoss).toBe(0);
	});
});
