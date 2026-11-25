import { describe, it, expect } from 'vitest';
import { Simulation } from './simulation';
import { calculateDamage } from './damageMatrix';
import type { ArmorType, PlayerState, Unit } from './types';
import {
	CASTLE_CANNON_BASE_COOLDOWN,
	CASTLE_CANNON_BASE_DAMAGE,
	CASTLE_CANNON_FRIENDLY_FIRE_FACTOR,
	CASTLE_CANNON_LONG_COST,
	CASTLE_CANNON_LONG_RANGE,
	CASTLE_CANNON_SHORT_COST,
	CASTLE_CANNON_SHORT_RANGE,
	CASTLE_CANNON_UPGRADED_COOLDOWN,
	CASTLE_CANNON_UPGRADE_GOLD,
	CASTLE_CANNON_UPGRADE_LUMBER
} from './constants';

function makeTestUnit(overrides: Partial<Unit>): Unit {
	return {
		defId: 'test_unit',
		instanceId: `u_${Math.random().toString(36).slice(2, 9)}`,
		team: 'east',
		name: 'Тест Боєць',
		x: 1600,
		y: 1200,
		prevX: 1600,
		prevY: 1200,
		hp: 500,
		maxHp: 500,
		size: 16,
		speed: 0,
		attackCooldown: 10,
		cooldownTimer: 10,
		damageMin: 1,
		damageMax: 1,
		damageBonusPct: 0,
		armorBonus: 0,
		attackType: 'normal',
		range: 40,
		armor: 0,
		armorType: 'none' as ArmorType,
		state: 'WALKING',
		lane: 'mid',
		flying: false,
		currentTargetId: null,
		targetX: 1600,
		targetY: 1200,
		bounty: 10,
		...overrides
	};
}

describe('Manual Castle Cannon Defense Mechanics', () => {
	it('castle does NOT auto-fire when enemies enter 500px or 800px range', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 500, seed: 42 });
		const enemy = makeTestUnit({
			instanceId: 'enemy_close',
			team: 'east',
			x: sim.castles.west.x + 300,
			y: sim.castles.west.y
		});
		sim.units.push(enemy);

		for (let i = 0; i < 30; i++) {
			sim.step(0.1);
		}

		const castleShots = sim.projectiles.filter((p) => p.sourceUnitId === 'castle_west');
		expect(castleShots.length).toBe(0);
		expect(enemy.hp).toBe(500);
	});

	it('short shot (500px) costs 1g, hits random enemy for 85 siege + splash, and grants ZERO kill bounty', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 100, seed: 123 });
		const player = sim.players.west;
		const enemy = makeTestUnit({
			instanceId: 'enemy_500',
			team: 'east',
			x: sim.castles.west.x + 420,
			y: sim.castles.west.y,
			hp: 50,
			maxHp: 50,
			bounty: 25
		});
		const enemyOut = makeTestUnit({
			instanceId: 'enemy_700',
			team: 'east',
			x: sim.castles.west.x + 700,
			y: sim.castles.west.y,
			hp: 500,
			maxHp: 500
		});
		sim.units.push(enemy, enemyOut);
		sim.step(0.05); // populate spatial grid

		const res = sim.fireCastleCannon('west', 'short', player);
		expect(res.fired).toBe(true);
		expect(res.hitEnemy).toBe(true);
		expect(res.targetId).toBe('enemy_500');
		expect(player.gold).toBe(100 - CASTLE_CANNON_SHORT_COST);
		expect(sim.getCastleCannonCooldown('west')).toBe(CASTLE_CANNON_BASE_COOLDOWN);

		for (let i = 0; i < 20; i++) {
			sim.step(0.05);
		}

		expect(enemy.state).toBe('DEAD');
		expect(player.gold).toBe(100 - CASTLE_CANNON_SHORT_COST);
		expect(player.stats.unitsKilled).toBe(1);
		expect(enemyOut.hp).toBe(500);
	});

	it('long shot (1500px) costs 3g and reaches distant enemies', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 100, seed: 7 });
		const player = sim.players.west;
		const farEnemy = makeTestUnit({
			instanceId: 'enemy_1400',
			team: 'east',
			x: sim.castles.west.x + 1400,
			y: sim.castles.west.y,
			hp: 300,
			maxHp: 300
		});
		sim.units.push(farEnemy);
		sim.step(0.05);

		// Short shot misses enemy at 1400px -> no units around at all
		expect(sim.getCastleCannonEnemyCount('west', CASTLE_CANNON_SHORT_RANGE)).toBe(0);
		expect(sim.getCastleCannonEnemyCount('west', CASTLE_CANNON_LONG_RANGE)).toBe(1);

		const res = sim.fireCastleCannon('west', 'long', player);
		expect(res.fired).toBe(true);
		expect(res.hitEnemy).toBe(true);
		expect(res.targetId).toBe('enemy_1400');
		expect(player.gold).toBe(100 - CASTLE_CANNON_LONG_COST);

		for (let i = 0; i < 60; i++) {
			sim.step(0.05);
		}

		const expectedDmg = calculateDamage('siege', 'none', CASTLE_CANNON_BASE_DAMAGE, 0);
		expect(farEnemy.hp).toBe(300 - expectedDmg);
	});

	it('enforces shared team cooldown across 3v3 allies', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 100, teamSize: 3, seed: 99 });
		const p1: PlayerState = sim.teamMembers.west[0];
		const p2: PlayerState = sim.teamMembers.west[1];
		const enemy = makeTestUnit({
			instanceId: 'enemy_3v3',
			team: 'east',
			x: sim.castles.west.x + 350,
			y: sim.castles.west.y
		});
		sim.units.push(enemy);
		sim.step(0.05);

		const firstShot = sim.fireCastleCannon('west', 'short', p1);
		expect(firstShot.fired).toBe(true);
		expect(sim.canFireCastleCannon('west', 'short', p2)).toBe(false);

		const secondShot = sim.fireCastleCannon('west', 'short', p2);
		expect(secondShot.fired).toBe(false);
		expect(p2.gold).toBe(100);

		// Advance 2.0s so shared cooldown finishes
		for (let i = 0; i < 20; i++) {
			sim.step(0.1);
		}
		expect(sim.canFireCastleCannon('west', 'short', p2)).toBe(true);
	});

	it('friendly-fire fallback when no enemies in range: prioritizes shooter units at 50% reduced damage and skips damage stats/recycler', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 100, teamSize: 3, seed: 55 });
		const p1 = sim.teamMembers.west[0];
		const p2 = sim.teamMembers.west[1];

		const p1Unit = makeTestUnit({
			instanceId: 'ally_p1',
			team: 'west',
			playerSlot: p1.slot,
			playerId: p1.id,
			x: sim.castles.west.x + 250,
			y: sim.castles.west.y,
			hp: 200,
			maxHp: 200
		});
		const p2Unit = makeTestUnit({
			instanceId: 'ally_p2',
			team: 'west',
			playerSlot: p2.slot,
			playerId: p2.id,
			x: sim.castles.west.x + 260,
			y: sim.castles.west.y,
			hp: 200,
			maxHp: 200
		});
		sim.units.push(p1Unit, p2Unit);
		sim.step(0.05);

		// p1 fires blindly -> must hit p1Unit (shooter's own unit) rather than teammate p2Unit
		const res = sim.fireCastleCannon('west', 'short', p1);
		expect(res.fired).toBe(true);
		expect(res.hitEnemy).toBe(false);
		expect(res.hitAlly).toBe(true);
		expect(res.targetId).toBe('ally_p1');

		for (let i = 0; i < 20; i++) {
			sim.step(0.05);
		}

		const friendlyRaw = Math.round(CASTLE_CANNON_BASE_DAMAGE * CASTLE_CANNON_FRIENDLY_FIRE_FACTOR);
		const expectedFriendlyDmg = calculateDamage('siege', 'none', friendlyRaw, 0);
		expect(p1Unit.hp).toBe(200 - expectedFriendlyDmg);
		expect(p2Unit.hp).toBe(200);
		expect(sim.players.west.stats.totalDamageDealt).toBe(0);
	});

	it('upgrade (100g + 100w) lowers shared cooldown from 2s to 1s and resets between rounds', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 300, teamSize: 2, seed: 11 });
		const p1 = sim.teamMembers.west[0];
		const p2 = sim.teamMembers.west[1];
		p1.lumber = 125;

		expect(sim.getCastleCannonEffectiveMaxCooldown('west')).toBe(CASTLE_CANNON_BASE_COOLDOWN);
		const upgraded = sim.upgradeCastleCannon('west', p1);
		expect(upgraded).toBe(true);
		expect(sim.castleCannonUpgraded.west).toBe(true);
		expect(p1.gold).toBe(300 - CASTLE_CANNON_UPGRADE_GOLD);
		expect(p1.lumber).toBe(125 - CASTLE_CANNON_UPGRADE_LUMBER);
		expect(sim.getCastleCannonEffectiveMaxCooldown('west')).toBe(CASTLE_CANNON_UPGRADED_COOLDOWN);

		// Second purchase blocked
		p2.lumber = 125;
		expect(sim.upgradeCastleCannon('west', p2)).toBe(false);

		// Shot uses 1.0s shared cooldown
		const enemy = makeTestUnit({
			instanceId: 'e_upg',
			team: 'east',
			x: sim.castles.west.x + 300,
			y: sim.castles.west.y
		});
		sim.units.push(enemy);
		sim.step(0.05);
		sim.fireCastleCannon('west', 'short', p2);
		expect(sim.getCastleCannonCooldown('west')).toBe(CASTLE_CANNON_UPGRADED_COOLDOWN);

		// Reset round resets upgrade
		sim.resetRound();
		expect(sim.castleCannonUpgraded.west).toBe(false);
		expect(sim.getCastleCannonEffectiveMaxCooldown('west')).toBe(CASTLE_CANNON_BASE_COOLDOWN);
	});

	it('Rune of Power (I005) makes shots free (0g), doubles damage (170), and halves cooldown', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 200, seed: 22 });
		sim.buildings.push({
			instanceId: 'test_shop_west',
			defId: 'cg10_shop',
			name: 'Магазин',
			team: 'west',
			specialType: 'shop',
			tileX: 10,
			tileY: 10,
			x: 1600,
			y: 1200,
			hp: 1000,
			maxHp: 1000,
			armor: 5,
			armorType: 'fort',
			goldCost: 50,
			lumberCost: 50,
			spawnUnitId: '',
			spawnCooldown: 0,
			spawnTimer: 0,
			lane: 'mid',
			upgradeFrom: null,
			race: 'Альянс'
		});
		const player = sim.players.west;
		expect(sim.buyCastleItem('west', 'I005', player)).toBe(true);
		expect(player.gold).toBe(50);

		expect(sim.getCastleCannonShotCost('west', 'short')).toBe(0);
		expect(sim.getCastleCannonShotCost('west', 'long')).toBe(0);
		expect(sim.getCastleCannonEffectiveMaxCooldown('west')).toBe(1.0);

		const enemy = makeTestUnit({
			instanceId: 'e_over',
			team: 'east',
			x: sim.castles.west.x + 400,
			y: sim.castles.west.y,
			hp: 400,
			maxHp: 400
		});
		sim.units.push(enemy);
		sim.step(0.05);

		const res = sim.fireCastleCannon('west', 'long', player);
		expect(res.fired).toBe(true);
		expect(player.gold).toBe(50); // 0g cost while overcharged
		expect(sim.getCastleCannonCooldown('west')).toBe(1.0);

		for (let i = 0; i < 20; i++) {
			sim.step(0.05);
		}
		const expectedDmg = calculateDamage('siege', 'none', CASTLE_CANNON_BASE_DAMAGE * 2, 0);
		expect(enemy.hp).toBe(400 - expectedDmg);
	});

	it('BotAI fires manual castle cannon only when enemies are in range', () => {
		const sim = new Simulation({ botDifficulty: 30, startGold: 300, seed: 33 });
		const bot = sim.bots.find((b) => b.getTeam() === 'east');
		expect(bot).toBeDefined();
		const botPlayer = sim.players.east;

		// No enemies -> bot does NOT fire blindly
		bot?.tryOperateCastleCannon(botPlayer, 1.0);
		expect(sim.getCastleCannonCooldown('east')).toBe(0);

		// Enemy enters 500px near east castle -> bot fires short shot
		const westInvader = makeTestUnit({
			instanceId: 'west_invader',
			team: 'west',
			x: sim.castles.east.x - 400,
			y: sim.castles.east.y
		});
		sim.units.push(westInvader);
		sim.step(0.05);

		const fired = bot?.tryOperateCastleCannon(botPlayer, 1.0);
		expect(fired).toBe(true);
		expect(sim.getCastleCannonCooldown('east')).toBe(CASTLE_CANNON_BASE_COOLDOWN);
	});
});
