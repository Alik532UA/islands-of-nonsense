import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { getBuilding, getUnit, resolveUnitKillBounty } from './gameData';
import { WEST_CASTLE_X, WEST_CASTLE_Y, TOP_LANE_Y } from './constants';

describe('Enemy Unit Kill Bounty & 2x Rescue Strike Comeback', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({
			botDifficulty: 0,
			startGold: 1000,
			westRace: 'Альянс',
			eastRace: 'Альянс',
			isRunning: true
		});
		sim.decorations = [];
	});

	it('resolves authentic WC3 ubba bounty and sensible fallbacks for units missing ubba', () => {
		const paladin = getUnit('h03C'); // ubba = 15
		const hydra = getUnit('n01P'); // ubba = 27
		const footman = getUnit('hfoo'); // missing ubba, barracks h000 = 100g
		const barracks = getBuilding('h000');

		expect(resolveUnitKillBounty(paladin, 245)).toBe(15);
		expect(resolveUnitKillBounty(hydra, 725)).toBe(27);
		expect(resolveUnitKillBounty(footman, barracks?.gold_cost ?? 100)).toBe(3);
	});

	it('awards gold bounty and floating text when killing normal enemy units', () => {
		const attacker = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 3400,
			y: TOP_LANE_Y,
			hp: 1000,
			damage: 2000,
			attackCooldown: 0.5
		});

		sim.build('east', 'h038', 25, 20, 'top'); // Paladin building (ubba = 15)
		const bld = sim.buildings[0];
		bld.isUnderConstruction = false;
		const paladin = sim.buildingSystem.spawnUnitFromBuilding(bld)!;
		expect(paladin.bounty).toBe(15);

		paladin.x = 3450;
		paladin.y = TOP_LANE_Y;
		paladin.armor = 0;

		const goldBefore = sim.players.west.gold;
		const killsBefore = sim.players.west.stats.unitsKilled;

		sim.combatSystem.applyUnitDamage(paladin, 5000, 'chaos', 'west', false, attacker);

		expect(paladin.state).toBe('DEAD');
		expect(sim.players.west.gold).toBe(goldBefore + 15);
		expect(sim.players.west.stats.unitsKilled).toBe(killsBefore + 1);
		expect(sim.floatingTexts.some((t) => t.text === '+15g')).toBe(true);
	});

	it('credits bounty specifically to the owning teammate in 2v2/3v3 matches', () => {
		const teamSim = new Simulation({
			teamSize: 2,
			botDifficulty: 0,
			startGold: 1000,
			westRace: 'Альянс',
			eastRace: 'Орки'
		});
		teamSim.decorations = [];

		const p1 = teamSim.teamMembers.west[0];
		const p3 = teamSim.teamMembers.west[1];
		const p1GoldBefore = p1.gold;
		const p3GoldBefore = p3.gold;

		const p3Unit = teamSim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 3400,
			y: TOP_LANE_Y,
			hp: 500,
			damage: 500
		});
		p3Unit.playerId = p3.id;
		p3Unit.playerSlot = p3.slot;

		const enemy = teamSim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 3450,
			y: TOP_LANE_Y,
			hp: 200,
			armor: 0
		});
		enemy.bounty = 12;

		teamSim.combatSystem.applyUnitDamage(enemy, 1000, 'chaos', 'west', false, p3Unit);

		expect(enemy.state).toBe('DEAD');
		expect(p3.gold).toBe(p3GoldBefore + 12);
		expect(p1.gold).toBe(p1GoldBefore);
	});

	it('awards 2x gold bounty for every enemy unit killed by Rescue Strike', () => {
		const goldBefore = sim.players.west.gold;

		// Two enemy units inside 750px Rescue Strike radius that will die to 2850 chaos dmg
		const victim1 = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'mid',
			x: WEST_CASTLE_X + 200,
			y: WEST_CASTLE_Y,
			hp: 400,
			armor: 0,
			armorType: 'none'
		});
		victim1.bounty = 10;

		const victim2 = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'mid',
			x: WEST_CASTLE_X + 350,
			y: WEST_CASTLE_Y + 50,
			hp: 500,
			armor: 0,
			armorType: 'none'
		});
		victim2.bounty = 15;

		// Tough enemy that survives 2850 chaos dmg (must not grant kill bounty)
		const survivor = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'mid',
			x: WEST_CASTLE_X + 400,
			y: WEST_CASTLE_Y,
			hp: 3000,
			armor: 0,
			armorType: 'none'
		});
		survivor.bounty = 25;

		const result = sim.triggerRescueStrike('west');
		expect(result).not.toBeNull();
		expect(result?.hitCount).toBe(3);
		expect(result?.killCount).toBe(2);
		// (10 + 15) * 2 = 50g
		expect(result?.bountyEarned).toBe(50);

		expect(victim1.state).toBe('DEAD');
		expect(victim2.state).toBe('DEAD');
		expect(survivor.state).not.toBe('DEAD');
		expect(sim.players.west.gold).toBe(goldBefore + 50);
		expect(sim.floatingTexts.some((t) => t.text.includes('+50g'))).toBe(true);
	});

	it('does not award bounty on Reincarnation or duplicate hits after death', () => {
		const phoenix = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 3500,
			y: TOP_LANE_Y,
			hp: 100,
			armor: 0,
			hasReincarnated: false,
			abilityType: 'reincarnation'
		});
		phoenix.bounty = 20;

		const goldBefore = sim.players.west.gold;

		// First lethal hit triggers reincarnation -> unit stays alive, no bounty yet
		sim.combatSystem.applyUnitDamage(phoenix, 500, 'chaos', 'west', false);
		expect(phoenix.hp).toBe(phoenix.maxHp);
		expect(phoenix.hasReincarnated).toBe(true);
		expect(sim.players.west.gold).toBe(goldBefore);

		// Second lethal hit truly kills -> awards bounty once
		sim.combatSystem.applyUnitDamage(phoenix, 500, 'chaos', 'west', false);
		expect(phoenix.state).toBe('DEAD');
		expect(sim.players.west.gold).toBe(goldBefore + 20);

		// Extra hit on already DEAD unit must not grant duplicate bounty
		sim.combatSystem.applyUnitDamage(phoenix, 500, 'chaos', 'west', false);
		expect(sim.players.west.gold).toBe(goldBefore + 20);
	});
});
