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

	it('BotAI does NOT trigger rescue strike prematurely when castle HP >= 50%', () => {
		const botAI = new BotAI(sim, 'east', sim.players.east);
		const eastCastle = sim.castles.east;

		// Spawn 4 enemy units near full-HP east castle
		for (let i = 0; i < 4; i++) {
			sim.spawnUnitDirectly({
				team: 'west',
				lane: 'top',
				x: eastCastle.x - 300 - i * 40,
				y: eastCastle.y,
				hp: 1200,
				damage: 55,
				attackCooldown: 1.0
			});
		}

		expect(eastCastle.hp).toBe(eastCastle.maxHp);
		expect(sim.canUseRescueStrike('east', sim.players.east)).toBe(true);

		botAI.update(2.0);

		// Should NOT fire above 50% HP
		expect(sim.getRescueStrikeCooldown('east', sim.players.east)).toBe(0);
		expect(sim.canUseRescueStrike('east', sim.players.east)).toBe(true);
	});

	it('BotAI triggers rescue strike when castle HP < 50% under active high threat', () => {
		const botAI = new BotAI(sim, 'east', sim.players.east);
		const eastCastle = sim.castles.east;

		// Drop castle below 50% and simulate ongoing HP loss velocity
		eastCastle.hp = eastCastle.maxHp * 0.42;
		sim.castleHpLossRate.east = 95;

		for (let i = 0; i < 3; i++) {
			sim.spawnUnitDirectly({
				team: 'west',
				lane: 'top',
				x: eastCastle.x - 250 - i * 40,
				y: eastCastle.y,
				hp: 1200,
				damage: 50,
				attackCooldown: 1.0
			});
		}

		botAI.update(2.0);

		expect(sim.getRescueStrikeCooldown('east', sim.players.east)).toBe(180);
		expect(sim.canUseRescueStrike('east', sim.players.east)).toBe(false);
		expect(sim.teamBotRescueCooldown.east).toBe(10);
	});

	it('tracks rescue strike cooldown independently per player in 3v3', () => {
		const sim3v3 = new Simulation({ botDifficulty: 0, startGold: 500, teamSize: 3 });
		const westPlayers = sim3v3.allPlayers.filter((p) => p.team === 'west');
		expect(westPlayers.length).toBe(3);

		const [p1, p3, p5] = westPlayers;
		expect(sim3v3.canUseRescueStrike('west', p1)).toBe(true);
		expect(sim3v3.canUseRescueStrike('west', p3)).toBe(true);
		expect(sim3v3.canUseRescueStrike('west', p5)).toBe(true);

		sim3v3.triggerRescueStrike('west', p1);

		expect(sim3v3.getRescueStrikeCooldown('west', p1)).toBe(180);
		expect(sim3v3.canUseRescueStrike('west', p1)).toBe(false);
		// Allied teammates keep their own ready rescue strike
		expect(sim3v3.getRescueStrikeCooldown('west', p3)).toBe(0);
		expect(sim3v3.canUseRescueStrike('west', p3)).toBe(true);
		expect(sim3v3.getRescueStrikeCooldown('west', p5)).toBe(0);
		expect(sim3v3.canUseRescueStrike('west', p5)).toBe(true);
	});

	it('staggers allied bots with a 10s team cooldown so 3 bots do not fire together', () => {
		const sim3v3 = new Simulation({ botDifficulty: 0, startGold: 500, teamSize: 3 });
		const westBots = sim3v3.allPlayers.filter((p) => p.team === 'west');
		westBots.forEach((p) => {
			p.isBot = true;
		});
		const botAIs = westBots.map((p) => new BotAI(sim3v3, 'west', p));

		const westCastle = sim3v3.castles.west;
		westCastle.hp = westCastle.maxHp * 0.4;
		sim3v3.castleHpLossRate.west = 110;

		for (let i = 0; i < 4; i++) {
			sim3v3.spawnUnitDirectly({
				team: 'east',
				lane: 'top',
				x: westCastle.x + 250 + i * 40,
				y: westCastle.y,
				hp: 4000,
				damage: 55,
				attackCooldown: 1.0
			});
		}

		// All 3 bots evaluate simultaneously
		for (const bot of botAIs) {
			bot.update(2.0);
		}

		// Only 1 bot should have fired; the other 2 must hold due to 10s team stagger
		const firedCountInitial = westBots.filter(
			(p) => sim3v3.getRescueStrikeCooldown('west', p) > 0
		).length;
		expect(firedCountInitial).toBe(1);
		expect(sim3v3.teamBotRescueCooldown.west).toBe(10);

		// Advance 10.2s while castle remains under pressure
		for (let i = 0; i < 205; i++) {
			sim3v3.step(0.05);
		}
		sim3v3.castleHpLossRate.west = 110;
		expect(sim3v3.teamBotRescueCooldown.west).toBe(0);

		for (const bot of botAIs) {
			bot.update(2.0);
		}
		// Allow second bot's worker enough time to walk back within 500px range from any build spot on the island
		for (let i = 0; i < 180; i++) {
			sim3v3.step(0.05);
			const fired = westBots.filter((p) => sim3v3.getRescueStrikeCooldown('west', p) > 0).length;
			if (fired >= 2) break;
		}

		// Now a second bot fires (either immediately or upon entering 500px cast range), while the third still holds
		const firedCountAfterStagger = westBots.filter(
			(p) => sim3v3.getRescueStrikeCooldown('west', p) > 0
		).length;
		expect(firedCountAfterStagger).toBe(2);
	});

	it('rejects targeted Rescue Strike outside own island without triggering cooldown', () => {
		const enemyIslandTarget = { x: 5600, y: 1200 };
		const riverTarget = { x: 3600, y: 1200 };

		expect(
			sim.triggerRescueStrike('west', sim.players.west, enemyIslandTarget.x, enemyIslandTarget.y)
		).toBeNull();
		expect(
			sim.triggerRescueStrike('west', sim.players.west, riverTarget.x, riverTarget.y)
		).toBeNull();
		expect(sim.canUseRescueStrike('west', sim.players.west)).toBe(true);
		expect(sim.rescueStrikeEffects.length).toBe(0);
	});

	it('walks worker within 500px of selected island target before triggering strike', () => {
		const player = sim.players.west;
		const worker = player.worker!;
		worker.x = 1200;
		worker.y = 1200;

		const targetX = 2400; // On west island, dist = 1200px > 500px
		const targetY = 1200;
		expect(sim.isPointOnIsland('west', targetX, targetY, 0)).toBe(true);

		const enemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'mid',
			x: targetX + 100,
			y: targetY,
			hp: 1500
		});

		const orderRes = sim.triggerRescueStrike('west', player, targetX, targetY);
		expect(orderRes?.queued).toBe(true);
		expect(worker.pendingRescueStrike).toEqual({ x: targetX, y: targetY });
		// Cooldown must NOT start until worker walks into 500px range
		expect(sim.canUseRescueStrike('west', player)).toBe(true);
		expect(sim.rescueStrikeEffects.length).toBe(0);

		// Step simulation until worker arrives within 500px
		for (let i = 0; i < 200; i++) {
			sim.step(0.05);
			if (!worker.pendingRescueStrike) break;
		}

		expect(worker.pendingRescueStrike).toBeNull();
		expect(Math.hypot(worker.x - targetX, worker.y - targetY)).toBeLessThanOrEqual(505);
		expect(sim.canUseRescueStrike('west', player)).toBe(false);
		expect(sim.rescueStrikeEffects.length).toBe(1);
		expect(sim.rescueStrikeEffects[0].x).toBe(targetX);
		expect(sim.rescueStrikeEffects[0].y).toBe(targetY);
		expect(enemy.hp).toBeLessThan(1500);
	});

	it('cancels queued Rescue Strike when a manual worker move overrides it', () => {
		const player = sim.players.west;
		const worker = player.worker!;
		worker.x = 1200;
		worker.y = 1200;

		const orderRes = sim.triggerRescueStrike('west', player, 2400, 1200);
		expect(orderRes?.queued).toBe(true);
		expect(worker.pendingRescueStrike).not.toBeNull();

		sim.moveWorker('west', 1100, 1100, player);
		expect(worker.pendingRescueStrike).toBeNull();
		expect(sim.canUseRescueStrike('west', player)).toBe(true);
	});

	it('damages all enemy ground and flying units (including medium armor and banished flyers) uniformly', () => {
		const westCastle = sim.castles.west;

		const groundEnemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'mid',
			x: westCastle.x + 150,
			y: westCastle.y,
			hp: 400,
			armor: 0,
			armorType: 'medium',
			flying: false
		});

		const mediumArmorFlyer = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'mid',
			x: westCastle.x + 220,
			y: westCastle.y - 40,
			hp: 620,
			armor: 4,
			armorType: 'medium',
			flying: true
		});

		const banishedFlyer = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: westCastle.x + 260,
			y: westCastle.y + 40,
			hp: 500,
			armor: 2,
			armorType: 'small',
			flying: true
		});
		banishedFlyer.isBanished = true;

		const outcome = sim.triggerRescueStrike('west');
		expect(outcome?.hitCount).toBe(3);
		expect(groundEnemy.state).toBe('DEAD');
		expect(mediumArmorFlyer.state).toBe('DEAD');
		expect(banishedFlyer.state).toBe('DEAD');
	});
});
