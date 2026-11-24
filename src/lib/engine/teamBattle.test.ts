import { describe, it, expect } from 'vitest';
import { Simulation } from './simulation';
import { WC3_PLAYER_COLORS } from './types';

describe('Point 9: Authentic WC3 Team Battle (2v2 and 3v3)', () => {
	it('should correctly configure 2v2 match with 4 distinct players and authentic WC3 slots', () => {
		const sim = new Simulation({
			botDifficulty: 15,
			startGold: 500,
			teamSize: 2,
			westRace: 'Люди',
			eastRace: 'Орки',
			randomColors: false
		});

		expect(sim.teamSize).toBe(2);
		expect(sim.allPlayers.length).toBe(4);
		expect(sim.teamMembers.west.length).toBe(2);
		expect(sim.teamMembers.east.length).toBe(2);

		// West Slot 1 (Red, Human)
		const p1 = sim.players.west;
		expect(p1.id).toBe('p1');
		expect(p1.slot).toBe(1);
		expect(p1.team).toBe('west');
		expect(p1.isBot).toBe(false);
		expect(p1.color.num).toBe(WC3_PLAYER_COLORS[0].num);
		expect(p1.worker).toBeDefined();
		expect(p1.worker?.x).toBe(sim.castles.west.x + 160);
		expect(p1.worker?.y).toBe(1200);

		// East Slot 2 (Blue, Bot 1)
		const p2 = sim.players.east;
		expect(p2.id).toBe('p2');
		expect(p2.slot).toBe(2);
		expect(p2.team).toBe('east');
		expect(p2.isBot).toBe(true);
		expect(p2.color.num).toBe(WC3_PLAYER_COLORS[1].num);
		expect(p2.worker).toBeDefined();
		expect(p2.worker?.x).toBe(sim.castles.east.x - 160);
		expect(p2.worker?.y).toBe(1200);

		// West Slot 3 (Teal, Bot Ally 1)
		const p3 = sim.teamMembers.west[1];
		expect(p3.id).toBe('p3');
		expect(p3.slot).toBe(3);
		expect(p3.team).toBe('west');
		expect(p3.isBot).toBe(true);
		expect(p3.color.num).toBe(WC3_PLAYER_COLORS[2].num);
		expect(p3.worker).toBeDefined();
		expect(p3.worker?.x).toBe(sim.castles.west.x + 160);
		expect(p3.worker?.y).toBe(1120);

		// East Slot 4 (Purple, Enemy Bot 2)
		const p4 = sim.teamMembers.east[1];
		expect(p4.id).toBe('p4');
		expect(p4.slot).toBe(4);
		expect(p4.team).toBe('east');
		expect(p4.isBot).toBe(true);
		expect(p4.color.num).toBe(WC3_PLAYER_COLORS[3].num);
		expect(p4.worker).toBeDefined();
		expect(p4.worker?.x).toBe(sim.castles.east.x - 160);
		expect(p4.worker?.y).toBe(1120);

		// Check bots instantiated for bot players
		expect(sim.bots.length).toBe(3); // p2, p3, p4 are bots
	});

	it('should correctly configure 3v3 match with 6 distinct players across both teams', () => {
		const sim = new Simulation({
			botDifficulty: 15,
			startGold: 500,
			teamSize: 3,
			westRace: 'Люди',
			eastRace: 'Орки',
			randomColors: false
		});

		expect(sim.teamSize).toBe(3);
		expect(sim.allPlayers.length).toBe(6);
		expect(sim.teamMembers.west.length).toBe(3);
		expect(sim.teamMembers.east.length).toBe(3);

		// West Slot 5 (Yellow, Bot Ally 2)
		const p5 = sim.teamMembers.west[2];
		expect(p5.id).toBe('p5');
		expect(p5.slot).toBe(5);
		expect(p5.team).toBe('west');
		expect(p5.isBot).toBe(true);
		expect(p5.color.num).toBe(WC3_PLAYER_COLORS[4].num);
		expect(p5.worker?.y).toBe(1280);

		// East Slot 6 (Orange, Enemy Bot 3)
		const p6 = sim.teamMembers.east[2];
		expect(p6.id).toBe('p6');
		expect(p6.slot).toBe(6);
		expect(p6.team).toBe('east');
		expect(p6.isBot).toBe(true);
		expect(p6.color.num).toBe(WC3_PLAYER_COLORS[5].num);
		expect(p6.worker?.y).toBe(1280);

		expect(sim.bots.length).toBe(5); // 5 bots (p2, p3, p4, p5, p6)
	});

	it('should distribute unique races across all players when uniqueRaces is active', () => {
		const sim = new Simulation({
			botDifficulty: 15,
			startGold: 500,
			teamSize: 3,
			uniqueRaces: true
		});

		const races = sim.allPlayers.map((p) => p.race);
		const uniqueRacesSet = new Set(races);
		expect(uniqueRacesSet.size).toBe(6);
	});

	it('should maintain independent economies and lumber payouts for all teammates', () => {
		const sim = new Simulation({
			botDifficulty: 0,
			startGold: 500,
			teamSize: 2,
			westRace: 'Люди',
			eastRace: 'Орки'
		});

		const p1 = sim.players.west;
		const p3 = sim.teamMembers.west[1];

		// P1 builds a structure
		sim.build('west', 'h003', 25, 20, 'top', p1);
		expect(sim.buildings.length).toBe(1);
		expect(sim.buildings[0].playerId).toBe('p1');
		expect(sim.buildings[0].playerSlot).toBe(1);

		// P3 builds a structure
		sim.build('west', 'h003', 25, 24, 'top', p3);
		expect(sim.buildings.length).toBe(2);
		expect(sim.buildings[1].playerId).toBe('p3');
		expect(sim.buildings[1].playerSlot).toBe(3);

		// Trigger economic payout
		sim.incomeTimer = 0.05;
		sim.step(0.1);

		// Both players receive independent gold payouts
		expect(p1.gold).toBeGreaterThan(0);
		expect(p3.gold).toBeGreaterThan(0);

		// Worker finishes P1 building -> awards lumber exclusively to P1
		const bld1 = sim.buildings[0];
		p1.worker!.x = bld1.x;
		p1.worker!.y = bld1.y;
		bld1.buildProgress = bld1.maxBuildProgress || 3.5;
		sim.workerSystem.updateWorkers(0.1);
		expect(p1.lumber).toBe(125 + bld1.goldCost);
		expect(p3.lumber).toBe(125);
	});

	it('should tag spawned units with their respective player owner and slot', () => {
		const sim = new Simulation({
			botDifficulty: 0,
			startGold: 1000,
			teamSize: 2,
			westRace: 'Люди',
			eastRace: 'Орки'
		});

		const p3 = sim.teamMembers.west[1]; // West Bot Ally
		sim.build('west', 'h003', 25, 20, 'top', p3);
		const bld = sim.buildings[0];
		bld.isUnderConstruction = false;

		const spawnedUnit = sim.spawnUnitFromBuilding(bld);
		expect(spawnedUnit).toBeDefined();
		expect(spawnedUnit?.team).toBe('west');
		expect(spawnedUnit?.playerId).toBe('p3');
		expect(spawnedUnit?.playerSlot).toBe(3);
	});

	it('should enable BotAI on both West and East teams to make strategic decisions', () => {
		const sim = new Simulation({
			botDifficulty: 15,
			startGold: 800,
			teamSize: 2,
			westRace: 'Люди',
			eastRace: 'Орки'
		});

		const westBot = sim.bots.find((b) => b.getTeam() === 'west');
		const eastBot = sim.bots.find((b) => b.getTeam() === 'east');

		expect(westBot).toBeDefined();
		expect(eastBot).toBeDefined();

		// Set forge to max so bots proceed directly to building placement
		for (const p of sim.allPlayers) {
			p.forge = { attack: 5, armor: 4, econ: 2 };
		}

		// Update both bots
		westBot?.update(2.0);
		eastBot?.update(2.0);

		// Check that bots issued orders
		const westBuildings = sim.buildings.filter((b) => b.team === 'west');
		const eastBuildings = sim.buildings.filter((b) => b.team === 'east');

		expect(westBuildings.length + eastBuildings.length).toBeGreaterThan(0);
	});

	it('should credit coin pickups to the collecting player in 2v2', () => {
		const sim = new Simulation({
			botDifficulty: 0,
			startGold: 500,
			teamSize: 2
		});

		const p3 = sim.teamMembers.west[1];
		const initialGold = p3.gold;

		// Spawn coin near p3 worker
		const _coin = sim.economySystem.spawnCoinDirectly('top', p3.worker!.x, p3.worker!.y + 10, 50);
		expect(sim.goldCoins.length).toBe(1);

		// Step simulation so worker collects coin
		sim.step(0.05);

		expect(p3.gold).toBe(initialGold + 50);
		expect(p3.stats.coinsCollected).toBe(1);
	});

	it('should reset all players and workers properly on new round', () => {
		const sim = new Simulation({
			botDifficulty: 15,
			startGold: 500,
			teamSize: 2
		});

		const p3 = sim.teamMembers.west[1];
		p3.gold = 1500;
		p3.lumber = 300;
		if (p3.worker) {
			p3.worker.x = 900;
			p3.worker.y = 900;
		}

		sim.resetRound();

		expect(p3.gold).toBe(500);
		expect(p3.lumber).toBe(125);
		expect(p3.worker?.x).toBe(sim.castles.west.x + 160);
		expect(p3.worker?.y).toBe(1120);
	});

	it('assigns random WC3 colors to all players and bots by default, and random team color to castles', () => {
		const sim = new Simulation({
			botDifficulty: 15,
			startGold: 500,
			teamSize: 2
		});

		// 1. All players have valid distinct WC3 colors
		const colors = sim.allPlayers.map((p) => p.color);
		expect(colors.length).toBe(4);
		for (const c of colors) {
			expect(WC3_PLAYER_COLORS.some((wc3) => wc3.num === c.num)).toBe(true);
		}
		// Colors across active players are unique
		const colorNums = new Set(colors.map((c) => c.num));
		expect(colorNums.size).toBe(4);

		// 2. Castles receive a color from one of their team members
		const westMemberColors = sim.teamMembers.west.map((p) => p.color.num);
		const eastMemberColors = sim.teamMembers.east.map((p) => p.color.num);
		expect(sim.castles.west.color).toBeDefined();
		expect(sim.castles.east.color).toBeDefined();
		expect(westMemberColors).toContain(sim.castles.west.color!.num);
		expect(eastMemberColors).toContain(sim.castles.east.color!.num);
	});
});
