import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import {
	generateMatchAnalytics,
	exportMatchAnalyticsJSON,
	exportMatchAnalyticsCSV
} from './matchStats';
import { ReplaySerializer, type MatchReplayData } from './replaySerializer';

describe('Point 10: Post-Match Detailed Combat Log & Graph Analytics Export', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 15, startGold: 2000 });
		sim.players.west.lumber = 2000;
	});

	it('generates detailed match analytics with damage breakdown by attack and armor type', () => {
		const westCastle = sim.castles.west;
		const eastCastle = sim.castles.east;

		// Spawn units with known attack/armor types
		const pierceAttacker = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'mid',
			x: eastCastle.x - 50,
			y: eastCastle.y,
			damage: 60,
			attackType: 'pierce'
		});

		const mediumArmorTarget = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'mid',
			x: eastCastle.x - 40,
			y: eastCastle.y,
			hp: 500,
			armor: 3,
			armorType: 'medium'
		});

		// Apply combat damage directly to test attack/armor type attribution
		sim.combatSystem.applyUnitDamage(
			mediumArmorTarget,
			60,
			'pierce',
			'west',
			false,
			pierceAttacker
		);

		// Record analytics
		const analytics = sim.exportAnalytics();

		expect(analytics).toBeDefined();
		expect(analytics.durationSeconds).toBeGreaterThanOrEqual(0);
		expect(analytics.botDifficulty).toBe(15);
		expect(analytics.players.west.race).toBe(sim.players.west.race);
		expect(analytics.players.east.race).toBe(sim.players.east.race);

		// Attack and armor type statistics tracked
		const westAtk = analytics.players.west.damageByAttackType;
		expect(westAtk.pierce).toBeGreaterThan(0);

		const eastArm = analytics.players.east.damageByArmorType;
		expect(eastArm.medium).toBeGreaterThan(0);
	});

	it('computes unit DPS, EHP and power efficiency matching analyze.py formulas', () => {
		// Clear random decorations so fixed courtyard slots (25, 20) & (25, 24) are buildable
		sim.decorations = [];
		// Build 2 buildings for west
		sim.build('west', 'h037', 25, 20); // Church (Церква)
		sim.build('west', 'h006', 25, 24); // Guard Tower (Вартова вежа)

		const tower = sim.buildings.find((b) => b.defId === 'h006')!;
		sim.recordBuildingDamage(tower.defId, tower.name, 'west', 450);
		sim.recordBuildingKill(tower.defId, tower.name, 'west');

		const analytics = generateMatchAnalytics(sim);
		expect(analytics.buildings.length).toBeGreaterThanOrEqual(2);

		const towerEntry = analytics.buildings.find((b) => b.defId === 'h006');
		expect(towerEntry).toBeDefined();
		expect(towerEntry!.team).toBe('west');
		expect(towerEntry!.damage).toBe(450);
		expect(towerEntry!.kills).toBe(1);
		expect(towerEntry!.isMvp).toBe(true);

		// Check EHP and PowerPerGold formulas from analyze.py on spawner building (h037)
		const churchEntry = analytics.buildings.find((b) => b.defId === 'h037');
		expect(churchEntry).toBeDefined();
		expect(churchEntry!.powerPerGold).toBeGreaterThan(0);
		expect(churchEntry!.unitDps).toBeGreaterThan(0);

		// ehp = hp * (1 + 0.06 * armor)
		const expectedEhp = churchEntry!.unitHp * (1 + 0.06 * churchEntry!.unitArmor);
		expect(churchEntry!.unitEhp).toBeCloseTo(expectedEhp, 1);

		// Check MVP structure
		expect(analytics.mvpBuildings.west).toBeDefined();
		expect(analytics.mvpBuildings.west?.defId).toBe('h006');
	});

	it('exports valid JSON and CSV match analytics representations', () => {
		sim.decorations = [];
		sim.build('west', 'h006', 25, 24);
		sim.recordBuildingDamage('h006', 'Вартова вежа', 'west', 200);

		// JSON Export
		const jsonStr = sim.exportAnalyticsJSON();
		expect(typeof jsonStr).toBe('string');
		const parsed = JSON.parse(jsonStr);
		expect(parsed.buildings).toBeDefined();
		expect(parsed.players.west.damageToCastle).toBeDefined();

		// CSV Export
		const csvStr = sim.exportAnalyticsCSV();
		expect(typeof csvStr).toBe('string');
		expect(csvStr).toContain(
			'Team,Building,DefId,Race,ChainCost,Unit,UnitHP,UnitArmor,UnitDPS,UnitEHP,PowerPerGold,Kills,DamageDealt,MVP'
		);
		expect(csvStr).toContain('WEST');
		expect(csvStr).toContain('h006');
	});

	it('embeds post-match analytics in replay serializer with verified checksum integrity', () => {
		sim.decorations = [];
		sim.build('west', 'h006', 25, 24);
		const report = sim.exportAnalytics();

		const replay: MatchReplayData = {
			version: '1.0.0',
			mapId: 'three_bridges_twin_islands',
			gameMode: 'standard',
			timestamp: Date.now(),
			randomSeed: 12345,
			westCommander: '1',
			eastCommander: '2',
			actions: [],
			result: {
				winner: 'west',
				totalTicks: 500,
				westCastleHp: 3500,
				eastCastleHp: 0
			},
			analytics: report
		};

		const serialized = ReplaySerializer.serialize(replay);
		const deserialized = ReplaySerializer.deserialize(serialized);

		expect(deserialized.success).toBe(true);
		expect(deserialized.data?.analytics).toBeDefined();
		expect(deserialized.data?.analytics?.buildings.length).toBe(report.buildings.length);
	});
});
