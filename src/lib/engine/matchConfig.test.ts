import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Simulation } from './simulation';
import { BotAI } from './botAI';
import {
	BUILDINGS_MAP,
	UNITS_MAP,
	formatRaceName,
	getUnit,
	resolveUnitMoveSpeed
} from './gameData';
import { WORKER_MOVE_SPEED, UNIT_MIN_SPEED, UNIT_MAX_SPEED } from './constants';
import {
	buildQuickMatchConfig,
	getDefaultQuickSettingsState,
	resolveBattleLaunchConfig,
	sanitizeQuickSettingsState,
	QUICK_BOT_RACES,
	QUICK_PLAYER_RACES
} from './matchConfig';

describe('Quick Settings, Match Config & GameMode Integration', () => {
	it('preserves 3v3 and all quick settings for botVsBot through resolveBattleLaunchConfig into Simulation', () => {
		const quick = getDefaultQuickSettingsState();
		quick.botVsBotTeamIndex = 2; // 3 на 3
		quick.botVsBotDiffIndex = 3; // 80%
		quick.botVsBotGoldIndex = 3; // 1000g
		quick.botVsBotWinsIndex = 2; // До 3
		quick.botVsBotWestRaceIndex = QUICK_BOT_RACES.findIndex((r) => r.id === 'Ельфи');
		quick.botVsBotEastRaceIndex = QUICK_BOT_RACES.findIndex((r) => r.id === 'Орки');
		quick.botVsBotCoinIndex = 1; // crazy
		quick.botVsBotFogIndex = 0; // true

		const savedConfig = buildQuickMatchConfig('botVsBot', quick);
		const launchConfig = resolveBattleLaunchConfig('botVsBot', savedConfig);
		const sim = new Simulation(launchConfig);

		expect(sim.config.botVsBot).toBe(true);
		expect(sim.teamSize).toBe(3);
		expect(sim.teamMembers.west).toHaveLength(3);
		expect(sim.teamMembers.east).toHaveLength(3);
		expect(sim.allPlayers).toHaveLength(6);
		expect(sim.config.botDifficulty).toBe(80);
		expect(sim.config.startGold).toBe(1000);
		expect(sim.targetWins).toBe(3);
		expect(sim.players.west.race).toBe('Ельфи');
		expect(sim.players.east.race).toBe('Орки');
		expect(sim.coinMode).toBe('crazy');
		expect(sim.config.coinCount).toBe(5);
		expect(sim.config.fogOfWar).toBe(true);
	});

	it('preserves quick settings for sandbox and vsBot modes without falling back to hardcoded 1v1', () => {
		const quick = getDefaultQuickSettingsState();
		quick.sandboxTeamIndex = 2; // 3v3
		quick.sandboxGoldIndex = 1; // 1000g
		quick.sandboxDiffIndex = 2; // 30%
		quick.sandboxWinsIndex = 0; // До 1
		quick.sandboxCoinIndex = 0; // normal
		quick.sandboxFogIndex = 0; // true
		quick.sandboxWestRaceIndex = QUICK_PLAYER_RACES.findIndex((r) => r.id === 'Нежить');

		const sandboxSaved = buildQuickMatchConfig('sandbox', quick);
		const sandboxResolved = resolveBattleLaunchConfig('sandbox', sandboxSaved);
		const sandboxSim = new Simulation(sandboxResolved);

		expect(sandboxSim.config.modeId).toBe('sandbox');
		expect(sandboxSim.teamSize).toBe(3);
		expect(sandboxSim.allPlayers).toHaveLength(6);
		expect(sandboxSim.config.startGold).toBe(1000);
		expect(sandboxSim.config.botDifficulty).toBe(30);
		expect(sandboxSim.targetWins).toBe(1);
		expect(sandboxSim.coinMode).toBe('normal');
		expect(sandboxSim.config.fogOfWar).toBe(true);
		expect(sandboxSim.players.west.race).toBe('Нежить');

		// vsBot with custom tournament rules & asymmetric teams preserved through resolveBattleLaunchConfig
		const customVsBotResolved = resolveBattleLaunchConfig('vsBot', {
			botDifficulty: 30,
			startGold: 750,
			modeId: 'uniqueRaces',
			uniqueRaces: true,
			bannedRaces: ['Демони'],
			teamSize: 2,
			teamSizeWest: 2,
			teamSizeEast: 3,
			targetWins: 3,
			coinMode: 'normal',
			coinSpawnInterval: 15,
			coinCount: 4,
			fogOfWar: false,
			botVsBot: false
		});

		expect(customVsBotResolved.uniqueRaces).toBe(true);
		expect(customVsBotResolved.bannedRaces).toEqual(['Демони']);
		expect(customVsBotResolved.coinSpawnInterval).toBe(15);
		expect(customVsBotResolved.coinCount).toBe(4);
		expect(customVsBotResolved.teamSizeWest).toBe(2);
		expect(customVsBotResolved.teamSizeEast).toBe(3);
	});

	it('uses URL mode defaults when saved match_settings belongs to a different mode', () => {
		const oldSandbox = buildQuickMatchConfig('sandbox', getDefaultQuickSettingsState());

		const directBotVsBot = resolveBattleLaunchConfig('botVsBot', oldSandbox);
		expect(directBotVsBot.botVsBot).toBe(true);
		expect(directBotVsBot.teamSize).toBe(1);
		expect(directBotVsBot.startGold).toBe(500);

		const oldBotVsBot = buildQuickMatchConfig('botVsBot', getDefaultQuickSettingsState());
		const directVsBot = resolveBattleLaunchConfig('vsBot', oldBotVsBot);
		expect(directVsBot.botVsBot).toBe(false);
		expect(directVsBot.modeId).toBe('standard');
	});

	it('sanitizes malformed or out-of-range persisted quick settings indices', () => {
		const sanitized = sanitizeQuickSettingsState({
			botVsBotTeamIndex: 99,
			vsBotGoldIndex: -4,
			sandboxDiffIndex: 2
		});
		const d = getDefaultQuickSettingsState();

		expect(sanitized.botVsBotTeamIndex).toBe(d.botVsBotTeamIndex);
		expect(sanitized.vsBotGoldIndex).toBe(d.vsBotGoldIndex);
		expect(sanitized.sandboxDiffIndex).toBe(2);
	});

	it('applies mode incomeMultiplier and coinSpawnInterval/coinCount overrides in Simulation', () => {
		const stdSim = new Simulation({
			botDifficulty: 0,
			startGold: 500,
			modeId: 'standard',
			westRace: 'Альянс'
		});
		stdSim.decorations = [];
		const blitzSim = new Simulation({
			botDifficulty: 0,
			startGold: 500,
			modeId: 'blitz',
			westRace: 'Альянс'
		});
		blitzSim.decorations = [];

		stdSim.build('west', 'h000', 25, 20);
		blitzSim.build('west', 'h000', 25, 20);

		const stdIncome = stdSim.calculateIncome('west');
		const blitzIncome = blitzSim.calculateIncome('west');
		// Standard rounds 4.55 -> 5; Blitz (2.0x) rounds 9.1 -> 9
		expect(stdIncome).toBe(5);
		expect(blitzIncome).toBe(9);
		expect(blitzIncome).toBeGreaterThan(stdIncome);

		// Custom coin interval & count in crazy mode still respects configured interval
		const coinSim = new Simulation({
			botDifficulty: 0,
			startGold: 500,
			coinMode: 'crazy',
			coinSpawnInterval: 10,
			coinCount: 3
		});
		for (let i = 0; i < 205; i++) {
			coinSim.step(0.05);
		}
		expect(coinSim.goldCoins).toHaveLength(3);
	});

	it('activates -ar and -ur from modeId alone and enforces -ur across all 3v3 slots', () => {
		const arSim = new Simulation({
			botDifficulty: 15,
			startGold: 500,
			modeId: 'allRandom'
		});
		expect(arSim.players.west.isRandomRace).toBe(true);
		expect(arSim.players.west.gold).toBe(650);

		const urSim = new Simulation({
			botDifficulty: 15,
			startGold: 500,
			modeId: 'uniqueRaces',
			teamSize: 3
		});
		const allRaces = urSim.allPlayers.map((p) => p.race);
		expect(new Set(allRaces).size).toBe(6);

		// Cannot pick a race already taken by an ally/enemy slot in 3v3
		const p3Race = urSim.allPlayers.find((p) => p.slot === 3)!.race;
		expect(urSim.setPlayerRace('west', p3Race)).toBe(false);
	});

	it('enforces allowForge: false and mode building bans (-nu, -na, -nl) in BotAI & EconomySystem', () => {
		const noForgeSim = new Simulation({
			botDifficulty: 15,
			startGold: 2000,
			gameModeConfig: { allowForge: false },
			westRace: 'Альянс'
		});
		noForgeSim.decorations = [];
		noForgeSim.players.west.lumber = 500;
		noForgeSim.build('west', 'cg11_forge', 25, 20);
		const forgeBld = noForgeSim.buildings.find((b) => b.specialType === 'forge');
		if (forgeBld) forgeBld.isUnderConstruction = false;
		expect(noForgeSim.upgradeForge('west', 'attack')).toBe(false);

		const nuSim = new Simulation({
			botDifficulty: 15,
			startGold: 2000,
			modeId: 'noSpecial',
			eastRace: 'Альянс'
		});
		const nuBot = nuSim.bots.find((b) => b.getTeam() === 'east') as BotAI;
		const forgeDef = BUILDINGS_MAP.get('cg11_forge')!;
		const shopDef = BUILDINGS_MAP.get('cg10_shop')!;
		const repairDef = BUILDINGS_MAP.get('cg09_repair')!;
		const towerDef = BUILDINGS_MAP.get('h006')!;
		expect(nuBot.isBuildingAllowedByMode(forgeDef)).toBe(false);
		expect(nuBot.isBuildingAllowedByMode(shopDef)).toBe(false);
		expect(nuBot.isBuildingAllowedByMode(repairDef)).toBe(false);
		expect(nuBot.isBuildingAllowedByMode(towerDef)).toBe(true);

		const naSim = new Simulation({
			botDifficulty: 15,
			startGold: 2000,
			modeId: 'noArtillery',
			eastRace: 'Техніки'
		});
		const naBot = naSim.bots.find((b) => b.getTeam() === 'east') as BotAI;
		const ballistaDef = BUILDINGS_MAP.get('cg0a')!;
		expect(naBot.isBuildingAllowedByMode(ballistaDef)).toBe(false);
	});

	it('verifies UI wiring fixes in Play page, MatchConfigModal, and BattleArena', () => {
		const modalSrc = fs.readFileSync(
			path.resolve(process.cwd(), 'src/lib/components/MatchConfigModal.svelte'),
			'utf-8'
		);
		const arenaSrc = fs.readFileSync(
			path.resolve(process.cwd(), 'src/lib/components/BattleArena.svelte'),
			'utf-8'
		);
		const playSrc = fs.readFileSync(
			path.resolve(process.cwd(), 'src/routes/play/+page.svelte'),
			'utf-8'
		);

		// MatchConfigModal must not force allRandom merely when westRace === 'random'
		expect(modalSrc).not.toContain("|| westRace === 'random'");
		expect(modalSrc).toContain('data-testid="botvsbot-on-btn"');
		expect(modalSrc).toContain('data-testid="botvsbot-off-btn"');

		// BattleArena delegates launch resolution to resolveBattleLaunchConfig instead of dropping saved params
		expect(arenaSrc).toContain('resolveBattleLaunchConfig(urlMode, saved)');

		// Play page persists and builds quick settings consistently
		expect(playSrc).toContain(
			"storage.getJSON<Partial<QuickSettingsState> | null>(\n\t\t\t'play_quick_settings'"
		);
		expect(playSrc).toContain("buildQuickMatchConfig('botVsBot'");
	});

	it('avoids duplicate races across all bot slots when bots play against each other', () => {
		for (let i = 0; i < 15; i++) {
			const sim1v1 = new Simulation({
				botDifficulty: 15,
				startGold: 500,
				botVsBot: true,
				westRace: 'random',
				eastRace: 'random'
			});
			expect(formatRaceName(sim1v1.players.west.race)).not.toBe(
				formatRaceName(sim1v1.players.east.race)
			);

			const sim3v3 = new Simulation({
				botDifficulty: 15,
				startGold: 500,
				botVsBot: true,
				teamSize: 3,
				westRace: 'Ельфи',
				eastRace: 'random'
			});
			const canonicalRaces = sim3v3.allPlayers.map((p) => formatRaceName(p.race));
			expect(new Set(canonicalRaces).size).toBe(6);
		}
	});

	it('sets worker speed to 170 and assigns archetype-based combat unit speeds in 120..170', () => {
		const sim = new Simulation({
			botDifficulty: 15,
			startGold: 2000,
			teamSize: 3,
			westRace: 'Альянс'
		});

		expect(WORKER_MOVE_SPEED).toBe(170);
		for (const p of sim.allPlayers) {
			expect(p.worker?.speed).toBe(170);
		}

		sim.decorations = [];
		expect(sim.build('west', 'h000', 25, 20)).toBe(true);
		const barracks = sim.buildings.find((b) => b.defId === 'h000')!;
		barracks.isUnderConstruction = false;
		const spawned = sim.buildingSystem.spawnUnitFromBuilding(barracks);
		expect(spawned).not.toBeNull();
		const unitDef = UNITS_MAP.get(barracks.spawnUnitId)!;
		expect(spawned!.speed).toBe(resolveUnitMoveSpeed(unitDef, 'Альянс'));
		expect(spawned!.speed).toBeGreaterThanOrEqual(UNIT_MIN_SPEED);
		expect(spawned!.speed).toBeLessThanOrEqual(UNIT_MAX_SPEED);

		// Verify all units stay strictly within 120..170 and obey Siege <= Heavy < Standard < Beasts
		for (const u of UNITS_MAP.values()) {
			const spd = resolveUnitMoveSpeed(u);
			expect(spd).toBeGreaterThanOrEqual(120);
			expect(spd).toBeLessThanOrEqual(170);
		}

		const siegeTank = getUnit('n01E')!; // Інфернальний танк
		const siegeMortar = getUnit('cg1a')!; // Мортира
		const beastWolf = getUnit('n017')!; // Крижаний вовк
		const fleshGolem = getUnit('n00E')!; // М'ясний Голем
		const standardFootman = getUnit(barracks.spawnUnitId)!;

		expect(resolveUnitMoveSpeed(siegeTank)).toBeLessThanOrEqual(128);
		expect(resolveUnitMoveSpeed(siegeMortar)).toBeLessThanOrEqual(128);
		expect(resolveUnitMoveSpeed(fleshGolem)).toBeLessThan(resolveUnitMoveSpeed(standardFootman));
		expect(resolveUnitMoveSpeed(beastWolf, 'Тварини')).toBeGreaterThan(
			resolveUnitMoveSpeed(standardFootman)
		);
	});
});
