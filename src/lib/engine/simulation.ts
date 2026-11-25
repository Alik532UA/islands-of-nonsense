import { ALL_PLAYER_COLORS, WC3_PLAYER_COLORS } from './types';
import type {
	Unit,
	Building,
	Projectile,
	Castle,
	PlayerState,
	Team,
	MatchTeam,
	Lane,
	FloatingText,
	GoldCoin,
	AttackType,
	ArmorType,
	BuildingPerformance,
	LightningEffect,
	SoundEffectType,
	Corpse
} from './types';
import { SpatialHashGrid } from './spatialGrid';
import { getBuilderNameForRace, RACES_LIST, PLAYABLE_RACES, formatRaceName } from './gameData';
import {
	getCommander,
	findCommander,
	pickRandomCommanderId,
	getCommanderEffectivePct,
	COMMANDER_CHANGE_GOLD_COST,
	COMMANDER_CHANGE_LUMBER_COST,
	COMMANDER_CHANGE_COOLDOWN_SEC
} from './commanders';
import { getRandomBoss } from './bosses';
import { WorkerSystem } from './workerSystem';
import { BuildingSystem } from './buildingSystem';
export { SimulationError, BuildingPlacementError } from '$lib/errors';
export { ReplaySerializer, type MatchReplayData, type ReplayAction } from './replaySerializer';
import type { ReplayAction } from './replaySerializer';
import { CombatSystem } from './combatSystem';
import { EconomySystem } from './economySystem';
import { BotAI } from './botAI';
import { getGameMode, type GameModeConfig } from './gameModes';
import {
	generateMatchAnalytics,
	exportMatchAnalyticsJSON,
	exportMatchAnalyticsCSV,
	type MatchAnalyticsReport
} from './matchStats';

import {
	ARENA_WIDTH,
	ARENA_HEIGHT,
	TOP_LANE_Y,
	MID_LANE_Y,
	BOTTOM_LANE_Y,
	WEST_CASTLE_X,
	WEST_CASTLE_Y,
	EAST_CASTLE_X,
	EAST_CASTLE_Y,
	CELL_SIZE,
	WORKER_MOVE_SPEED,
	type CoinMode,
	type DecorationObstacle
} from './constants';
import { createRandomDecorationSeed, generateDecorations } from './decorationGenerator';
export * from './constants';

export interface DebrisItem {
	id: string;
	x: number;
	y: number;
	team: MatchTeam;
	value: number;
	lifeTime: number;
}

export const MAX_PLAYERS_PER_TEAM = 7;

export interface SimCustomSlot {
	slot: number; // 1..14
	team: MatchTeam;
	isBot: boolean;
	botDifficulty?: number;
	name?: string;
	race?: string;
	colorId?: number;
}

/**
 * Computes deterministic initial worker spawn coordinates around the team's castle.
 * Preserves exact 1v1..3v3 positions and spreads 4..7 players along a compact arc.
 */
export function computeWorkerSpawnPoint(
	team: MatchTeam,
	indexOnTeam: number,
	teamCount: number
): { x: number; y: number } {
	const isWest = team === 'west';
	const castleX = isWest ? WEST_CASTLE_X : EAST_CASTLE_X;
	const castleY = isWest ? WEST_CASTLE_Y : EAST_CASTLE_Y;

	if (teamCount <= 3) {
		const yOffsets = [0, -80, 80];
		const offsetY = yOffsets[indexOnTeam] ?? 0;
		return {
			x: isWest ? castleX + 160 : castleX - 160,
			y: castleY + offsetY
		};
	}

	const count = Math.min(MAX_PLAYERS_PER_TEAM, Math.max(1, teamCount));
	const frac = count > 1 ? indexOnTeam / (count - 1) : 0.5;
	const maxSpread = Math.PI * 0.42;
	const angle = -maxSpread + frac * (maxSpread * 2);
	const radius = 175;
	return {
		x: Math.round(isWest ? castleX + Math.cos(angle) * radius : castleX - Math.cos(angle) * radius),
		y: Math.round(castleY + Math.sin(angle) * radius)
	};
}

export interface SimulationConfig {
	botDifficulty: number; // 0, 15, 30, 80
	startGold: number;
	modeId?: string;
	gameModeConfig?: Partial<GameModeConfig>;
	uniqueRaces?: boolean;
	allRandom?: boolean;
	bannedRaces?: string[];
	banDraft?: boolean;
	banCount?: number;
	westRace?: string;
	eastRace?: string;
	targetWins?: number;
	fogOfWar?: boolean;
	coinMode?: CoinMode;
	coinSpawnInterval?: number;
	coinCount?: number;
	teamSize?: number;
	teamSizeWest?: number;
	teamSizeEast?: number;
	customSlots?: SimCustomSlot[];
	autoStepBots?: boolean;
	botVsBot?: boolean; // Spectator mode: bots play against each other without human player
	randomColors?: boolean; // Default true: randomizes player and bot colors across match
	seed?: number; // Deterministic PRNG seed for headless benchmarks and replays
	isRunning?: boolean;
}

/**
 * Headless Castle Fight simulation engine.
 * Coordinates match lifecycle, entity collections, round state,
 * and delegates domain behaviors to specialized subsystems.
 */
export class Simulation {
	public config: SimulationConfig;
	public gameModeConfig: GameModeConfig;
	public tick = 0;
	public gameTime = 0; // seconds
	public isRunning = true;
	public speed = 1.0;
	public stateVersion = 0; // Incremented on any state change for fine-grained Svelte UI reactivity

	public readonly arenaWidth = ARENA_WIDTH;
	public readonly arenaHeight = ARENA_HEIGHT;
	public readonly topLaneY = TOP_LANE_Y;
	public readonly midLaneY = MID_LANE_Y;
	public readonly bottomLaneY = BOTTOM_LANE_Y;

	public units: Unit[] = [];
	public buildings: Building[] = [];
	public projectiles: Projectile[] = [];
	public floatingTexts: FloatingText[] = [];
	public debris: DebrisItem[] = [];
	public corpses: Corpse[] = [];
	public decorations: DecorationObstacle[] = [];
	public decorationSeed = 0;

	public castles: Record<MatchTeam, Castle>;
	public players: Record<MatchTeam, PlayerState>;
	public teamSize = 1;
	public allPlayers: PlayerState[] = [];
	public teamMembers: Record<MatchTeam, PlayerState[]> = { west: [], east: [] };
	public bots: BotAI[] = [];

	public spatialGrid = new SpatialHashGrid(160);

	public winner: MatchTeam | null = null;
	public roundWinner: MatchTeam | null = null;
	public matchWinner: MatchTeam | null = null;
	public targetWins = 2;
	public round = 1;
	public score = { west: 0, east: 0 };
	public bannedRaces: string[] = [];

	// Economy state (minute 1: every 5s, minute 2: every 6s, minute 3: every 7s, ...)
	public incomeTimer = 5.0; // Current countdown
	public incomeInterval = 5.0;

	// Race skills cooldown (unlocked at 300s, cooldown 150s)
	public raceSkillCooldown = { west: 0, east: 0 };

	// Castle Shop & Consumables & Manual Castle Cannon
	public castleInvulnerableTimer: Record<MatchTeam, number> = { west: 0, east: 0 };
	public castleOverchargeTimer: Record<MatchTeam, number> = { west: 0, east: 0 };
	public castleCannonUpgraded: Record<MatchTeam, boolean> = { west: false, east: false };
	public itemCooldowns: Record<MatchTeam, Record<string, number>> = { west: {}, east: {} };

	// Rescue Strike (Emergency Castle Defense, 180s personal CD + 10s bot team stagger)
	public rescueStrikeCooldown: Record<MatchTeam, number> = { west: 0, east: 0 };
	public teamBotRescueCooldown: Record<MatchTeam, number> = { west: 0, east: 0 };
	public castleHpLossRate: Record<MatchTeam, number> = { west: 0, east: 0 };
	private lastCastleHpSnapshot: Record<MatchTeam, number> = { west: 14000, east: 14000 };
	public greatAssemblyTimer: Record<MatchTeam, number> = { west: 0, east: 0 };
	public rescueStrikeEffects: {
		team: MatchTeam;
		x: number;
		y: number;
		radius: number;
		timer: number;
		maxTimer: number;
		kind?: 'rescue' | 'nuke';
	}[] = [];

	// AoE Splash Effects
	public splashEffects: {
		x: number;
		y: number;
		radius: number;
		timer: number;
		maxTimer: number;
	}[] = [];

	// Procedural Lightning Effects (Chain Lightning, Thunderbolt)
	public lightningEffects: LightningEffect[] = [];

	// Neutral Central Bosses (Spawn every 180s, alternating lanes)
	public bossSpawnTimer = 180.0;
	public bossIndex = 0;
	public lastBossLane: Lane = 'bottom';
	public lastBossId = -1;
	public activeBossInstanceId: string | null = null;

	// Battlefield Gold Coins (Spawn every 40s along neutral zone, I000)
	public goldCoins: GoldCoin[] = [];
	public coinSpawnTimer = 40.0;
	public coinSpawnInterval = 40.0;
	public coinMode: CoinMode = 'normal';

	// MVP & Building Performance Breakdown
	public buildingStats: Record<string, BuildingPerformance> = {};

	// Subsystems
	public readonly workerSystem: WorkerSystem;
	public readonly buildingSystem: BuildingSystem;
	public readonly combatSystem: CombatSystem;
	public readonly economySystem: EconomySystem;

	// WC3 Combat & Audio Alert Timers
	public lastCastleAttackAlert: Record<MatchTeam, number> = { west: -99, east: -99 };
	public lastLowCastleHpAlert: Record<MatchTeam, number> = { west: -99, east: -99 };

	// Callbacks
	public onFloatingText?: (text: FloatingText) => void;
	public onRoundEnd?: (winner: MatchTeam) => void;
	public onRoundStart?: (roundNumber: number) => void;
	public onSoundEffect?: (sound: SoundEffectType) => void;
	public onCastleUnderAttack?: (team: MatchTeam, hpPercent: number) => void;
	public onBuildingComplete?: (building: Building) => void;
	public onBossSpawn?: (unit: Unit) => void;
	public onReplayAction?: (action: ReplayAction) => void;
	public onRescueStrikeWarning?: (strike: {
		team: MatchTeam;
		x: number;
		y: number;
		radius: number;
		kind: 'rescue' | 'nuke';
	}) => void;

	// Three Bridges state: 'top' | 'mid' | 'bottom'. One randomly chosen as broken.
	public brokenBridge: 'top' | 'mid' | 'bottom' | null = 'mid';
	public bridgeRepairProgress: number = 0;
	public lastBotBridgeRepairTime: Record<MatchTeam, number> = { west: -180, east: -180 };

	public repairBridge(bridge?: 'top' | 'mid' | 'bottom'): void {
		if (!bridge || this.brokenBridge === bridge) {
			this.brokenBridge = null;
			this.bridgeRepairProgress = 0;
			for (const p of this.allPlayers) {
				if (p.worker?.targetRepairBuildingId?.startsWith('bridge')) {
					p.worker.isRepairing = false;
					p.worker.isBuilding = false;
					p.worker.targetRepairBuildingId = null;
				}
			}
			this.addFloatingText('Міст відремонтовано!', ARENA_WIDTH / 2, MID_LANE_Y, '#22c55e');
			this.notifyStateChanged();
		}
	}

	public orderBridgeRepair(team: MatchTeam, player?: PlayerState): boolean {
		return this.workerSystem.repairBridge(team, player);
	}

	public setPlayerPreferredLane(team: MatchTeam, lane: 'auto' | 'top' | 'mid' | 'bottom'): void {
		if (this.players[team]) {
			this.players[team].preferredLane = lane;
			this.notifyStateChanged();
		}
	}

	public getPlayerPreferredLane(team: MatchTeam): 'auto' | 'top' | 'mid' | 'bottom' {
		return this.players[team]?.preferredLane ?? 'auto';
	}

	public get dayNightCycle(): 'day' | 'night' {
		return Math.floor(this.gameTime / 60) % 2 === 0 ? 'day' : 'night';
	}

	/**
	 * Normalized progress through the 120s Day/Night cycle (0.0 to 1.0).
	 */
	public get dayNightProgress(): number {
		return (((this.gameTime % 120) + 120) % 120) / 120;
	}

	/**
	 * Current discrete atmospheric phase of the 120s Day/Night cycle:
	 * - 0s..45s: 'day' (clear sunny daylight)
	 * - 45s..60s: 'dusk' (smooth sunset transition)
	 * - 60s..105s: 'night' (moonlight night)
	 * - 105s..120s: 'dawn' (smooth sunrise transition)
	 */
	public get dayNightPhase(): 'day' | 'dusk' | 'night' | 'dawn' {
		const cycleTime = ((this.gameTime % 120) + 120) % 120;
		if (cycleTime < 45) return 'day';
		if (cycleTime < 60) return 'dusk';
		if (cycleTime < 105) return 'night';
		return 'dawn';
	}

	/**
	 * Smooth continuous atmospheric darkness alpha (0.0 during daytime,
	 * smoothly transitioning with cosine ease up to 0.28 during dusk/night, and fading back to 0.0 at dawn).
	 */
	public get dayNightAmbientAlpha(): number {
		const cycleTime = ((this.gameTime % 120) + 120) % 120;
		const maxNightAlpha = 0.28;

		if (cycleTime < 45) {
			return 0;
		}
		if (cycleTime < 60) {
			const p = (cycleTime - 45) / 15;
			return maxNightAlpha * (0.5 - 0.5 * Math.cos(p * Math.PI));
		}
		if (cycleTime < 105) {
			return maxNightAlpha;
		}
		const p = (cycleTime - 105) / 15;
		return maxNightAlpha * (0.5 + 0.5 * Math.cos(p * Math.PI));
	}

	public nextUnitId = 1;
	public nextBuildingId = 1;
	public nextProjectileId = 1;
	public nextTextId = 1;
	public nextCoinId = 1;
	public nextCorpseId = 1;
	public nextDebrisId = 1;
	private rngState: number;

	/**
	 * Deterministic Mulberry32 PRNG scoped to this Simulation instance.
	 * Ensures identical combat, economy, boss, bridge, and bot outcomes when seeded.
	 */
	public nextRandom(): number {
		this.rngState = (this.rngState + 0x6d2b79f5) >>> 0;
		let t = this.rngState;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}

	constructor(config: SimulationConfig = { botDifficulty: 0, startGold: 500 }) {
		this.config = config;
		this.rngState = (config.seed ?? createRandomDecorationSeed()) >>> 0 || 1;
		if (config.isRunning !== undefined) {
			this.isRunning = config.isRunning;
		}
		this.teamSize = Math.max(1, Math.min(MAX_PLAYERS_PER_TEAM, Math.round(config.teamSize ?? 1)));
		this.gameModeConfig = {
			...getGameMode(config.modeId || 'standard'),
			...(config.gameModeConfig || {})
		};
		if (config.allRandom !== undefined) {
			this.gameModeConfig.allRandom = config.allRandom;
		}
		if (config.uniqueRaces !== undefined) {
			this.gameModeConfig.uniqueRaces = config.uniqueRaces;
		}
		this.bannedRaces = config.bannedRaces ?? this.gameModeConfig.bannedRaces ?? [];
		this.coinMode = config.coinMode ?? 'normal';
		if (this.coinMode === 'crazy') {
			this.coinSpawnTimer = 20.0;
			this.coinSpawnInterval = 20.0;
		}
		if (config.coinSpawnInterval !== undefined) {
			this.coinSpawnInterval = Math.max(1, config.coinSpawnInterval);
			this.coinSpawnTimer = this.coinSpawnInterval;
		}
		this.targetWins = config.targetWins ?? 2;
		const bridges: ('top' | 'mid' | 'bottom')[] = ['top', 'mid', 'bottom'];
		this.brokenBridge = bridges[Math.floor(this.nextRandom() * 3)];
		this.bridgeRepairProgress = 0;
		this.lastBotBridgeRepairTime = { west: -180, east: -180 };
		const castleHp = Math.round(14000 * (this.gameModeConfig.castleHpMultiplier || 1.0));
		this.castles = {
			west: { team: 'west', x: WEST_CASTLE_X, y: WEST_CASTLE_Y, hp: castleHp, maxHp: castleHp },
			east: { team: 'east', x: EAST_CASTLE_X, y: EAST_CASTLE_Y, hp: castleHp, maxHp: castleHp }
		};
		this.lastCastleHpSnapshot = { west: castleHp, east: castleHp };

		const isRaceAvailable = (r: string): boolean => {
			const canonical = formatRaceName(r);
			return !this.bannedRaces.includes(r) && !this.bannedRaces.includes(canonical);
		};

		const availableRaces = RACES_LIST.filter((r) =>
			(PLAYABLE_RACES as readonly string[]).includes(r.race)
		)
			.map((r) => r.race)
			.filter((r) => isRaceAvailable(r));
		const isAllRandom = !!(config.allRandom || this.gameModeConfig.allRandom);
		const isUniqueRaces = !!(config.uniqueRaces || this.gameModeConfig.uniqueRaces);
		const isBotVsBot = !!(config.botVsBot || config.modeId === 'botVsBot');
		const avoidDuplicateRaces = isUniqueRaces || isBotVsBot;

		const totalActivePlayers = config.customSlots?.length
			? config.customSlots.length
			: Math.max(1, Math.round(config.teamSizeWest ?? this.teamSize)) +
				Math.max(1, Math.round(config.teamSizeEast ?? this.teamSize));
		const teamScopedUniqueRaces = avoidDuplicateRaces && totalActivePlayers > availableRaces.length;

		const remainingRacesGlobal = [...availableRaces];
		const remainingRacesByTeam: Record<MatchTeam, string[]> = {
			west: [...availableRaces],
			east: [...availableRaces]
		};
		const takeRace = (
			requested?: string,
			isRand = false,
			team?: MatchTeam
		): { race: string; isRandom: boolean } => {
			const pool =
				teamScopedUniqueRaces && team ? remainingRacesByTeam[team] : remainingRacesGlobal;
			if (isAllRandom || requested === 'random' || isRand) {
				const idx = Math.floor(this.nextRandom() * pool.length);
				const picked = pool[idx] || availableRaces[0];
				if (avoidDuplicateRaces && pool.length > 1) {
					pool.splice(idx, 1);
				}
				return { race: picked, isRandom: true };
			}
			if (requested && requested !== 'in_game' && isRaceAvailable(requested)) {
				const canonical = formatRaceName(requested);
				if (avoidDuplicateRaces) {
					const remIdx = pool.findIndex((r) => r === requested || formatRaceName(r) === canonical);
					if (remIdx !== -1 && pool.length > 1) {
						pool.splice(remIdx, 1);
					}
				}
				return { race: requested, isRandom: false };
			}
			const idx = Math.floor(this.nextRandom() * pool.length);
			const picked = pool[idx] || availableRaces[0];
			if (avoidDuplicateRaces && pool.length > 1) {
				pool.splice(idx, 1);
			}
			return { race: picked, isRandom: false };
		};

		const initialWestReq =
			config.westRace && config.westRace !== 'in_game' && isRaceAvailable(config.westRace)
				? config.westRace
				: undefined;
		const defaultRace =
			availableRaces.find((r) => r === 'Альянс' || r === 'Люди') || availableRaces[0];
		const westChoice = takeRace(
			initialWestReq || (isAllRandom || config.westRace === 'random' ? undefined : defaultRace),
			isAllRandom || config.westRace === 'random',
			'west'
		);
		const eastIsRandomReq =
			isAllRandom || config.eastRace === 'random' || (!config.eastRace && config.botDifficulty > 0);
		const initialEastReq =
			config.eastRace && config.eastRace !== 'in_game' && isRaceAvailable(config.eastRace)
				? config.eastRace
				: undefined;
		const eastChoice = takeRace(initialEastReq || undefined, eastIsRandomReq, 'east');

		const westRace = westChoice.race;
		const westIsRandom = westChoice.isRandom;
		const eastRace = eastChoice.race;
		const eastIsRandom = eastChoice.isRandom;

		const startingMaxFood =
			this.gameModeConfig?.noSpecialBuildings || this.gameModeConfig?.noLegendaries ? 0 : 1;

		const buildPlayer = (opts: {
			id: string;
			slot: number;
			team: MatchTeam;
			indexOnTeam: number;
			teamCount: number;
			isBot: boolean;
			botDifficulty: number;
			name: string;
			race: string;
			pendingRacePick?: boolean;
			isRandomRace: boolean;
			randomGoldGranted: boolean;
			gold: number;
			colorId?: number;
		}): PlayerState => {
			const spawnPt = computeWorkerSpawnPoint(opts.team, opts.indexOnTeam, opts.teamCount);
			const explicitColor =
				typeof opts.colorId === 'number'
					? ALL_PLAYER_COLORS.find((c) => c.id === opts.colorId)
					: undefined;
			const colorDef =
				explicitColor ??
				ALL_PLAYER_COLORS[(Math.max(1, opts.slot) - 1) % ALL_PLAYER_COLORS.length] ??
				ALL_PLAYER_COLORS[0];
			return {
				id: opts.id,
				slot: opts.slot,
				team: opts.team,
				isBot: opts.isBot,
				botDifficulty: opts.isBot ? opts.botDifficulty : 0,
				name: opts.name,
				color: colorDef,
				race: opts.race,
				...(opts.pendingRacePick ? { pendingRacePick: true } : {}),
				isRandomRace: opts.isRandomRace,
				randomGoldGranted: opts.randomGoldGranted,
				gold: opts.gold,
				lumber: 125,
				food: 0,
				maxFood: startingMaxFood,
				commander: 0, // Must build "Дім командира" to choose
				isRandomCommander: false,
				commanderCooldown: 0,
				forge: { attack: 0, armor: 0, econ: 0 },
				preferredLane: 'auto',
				rescueStrikeCooldown: 0,
				worker: {
					name: getBuilderNameForRace(opts.race),
					x: spawnPt.x,
					y: spawnPt.y,
					targetX: spawnPt.x,
					targetY: spawnPt.y,
					hp: 220,
					maxHp: 220,
					armor: 'Неуразливий',
					speed: WORKER_MOVE_SPEED,
					isBuilding: false,
					buildTimer: 0
				},
				stats: {
					unitsSpawned: 0,
					unitsKilled: 0,
					goldSpent: 0,
					totalDamageDealt: 0,
					damageToCastle: 0,
					coinsCollected: 0,
					itemsPurchased: 0
				}
			};
		};

		this.teamMembers = { west: [], east: [] };

		if (config.customSlots && config.customSlots.length > 0) {
			const westSpecs = config.customSlots
				.filter((s) => s.team === 'west')
				.slice(0, MAX_PLAYERS_PER_TEAM);
			const eastSpecs = config.customSlots
				.filter((s) => s.team === 'east')
				.slice(0, MAX_PLAYERS_PER_TEAM);

			const hydrateTeam = (team: MatchTeam, specs: SimCustomSlot[]) => {
				specs.forEach((spec, idx) => {
					const fallbackRace = team === 'west' ? config.westRace : config.eastRace;
					const pendingPick = !isAllRandom && !spec.isBot && spec.race === 'in_game';
					const requestedRace =
						spec.race && spec.race !== 'in_game'
							? spec.race
							: idx === 0 && fallbackRace && fallbackRace !== 'in_game'
								? fallbackRace
								: undefined;
					const shouldRollRandom =
						!pendingPick &&
						(isAllRandom ||
							spec.race === 'random' ||
							(!requestedRace && (spec.isBot || idx > 0 || fallbackRace === 'random')));
					const choice = pendingPick
						? { race: defaultRace, isRandom: false }
						: takeRace(
								requestedRace || (shouldRollRandom ? undefined : defaultRace),
								shouldRollRandom,
								team
							);
					const grantBonus =
						choice.isRandom && (!spec.isBot || (idx === 0 && team === 'east')) && !spec.isBot;
					const gold = grantBonus ? Math.round(config.startGold * 1.3) : config.startGold;
					this.teamMembers[team].push(
						buildPlayer({
							id: `p${spec.slot}`,
							slot: spec.slot,
							team,
							indexOnTeam: idx,
							teamCount: specs.length,
							isBot: spec.isBot,
							botDifficulty: spec.botDifficulty ?? config.botDifficulty,
							name:
								spec.name ||
								(spec.isBot
									? `${team === 'west' ? 'Бот-союзник' : 'Бот'} #${idx + 1}`
									: `Гравець #${spec.slot}`),
							race: choice.race,
							pendingRacePick: pendingPick,
							isRandomRace: choice.isRandom,
							randomGoldGranted: grantBonus,
							gold,
							colorId: spec.colorId
						})
					);
				});
			};

			hydrateTeam('west', westSpecs);
			hydrateTeam('east', eastSpecs);
			this.teamSize = Math.max(
				1,
				Math.min(MAX_PLAYERS_PER_TEAM, Math.max(westSpecs.length, eastSpecs.length))
			);
		} else {
			const westSize = Math.max(
				1,
				Math.min(MAX_PLAYERS_PER_TEAM, Math.round(config.teamSizeWest ?? this.teamSize))
			);
			const eastSize = Math.max(
				1,
				Math.min(MAX_PLAYERS_PER_TEAM, Math.round(config.teamSizeEast ?? this.teamSize))
			);

			const westGold = westIsRandom ? Math.round(config.startGold * 1.3) : config.startGold;
			const eastGold = eastIsRandom ? Math.round(config.startGold * 1.3) : config.startGold;

			this.teamMembers.west.push(
				buildPlayer({
					id: 'p1',
					slot: 1,
					team: 'west',
					indexOnTeam: 0,
					teamCount: westSize,
					isBot: isBotVsBot,
					botDifficulty: isBotVsBot ? config.botDifficulty : 0,
					name: isBotVsBot ? 'Бот (Захід)' : 'Гравець',
					race: westRace,
					isRandomRace: westIsRandom,
					randomGoldGranted: westIsRandom,
					gold: westGold
				})
			);

			this.teamMembers.east.push(
				buildPlayer({
					id: 'p2',
					slot: 2,
					team: 'east',
					indexOnTeam: 0,
					teamCount: eastSize,
					isBot: true,
					botDifficulty: config.botDifficulty,
					name: 'Бот v37',
					race: eastRace,
					isRandomRace: eastIsRandom,
					randomGoldGranted: eastIsRandom,
					gold: eastGold
				})
			);

			const maxPairSize = Math.max(westSize, eastSize);
			for (let idx = 1; idx < maxPairSize; idx++) {
				if (idx < westSize) {
					const slot = 1 + idx * 2;
					const choice = takeRace(undefined, true);
					const legacyWestNames: Record<number, string> = {
						3: 'Бот-союзник v37',
						5: 'Бот-союзник v38'
					};
					this.teamMembers.west.push(
						buildPlayer({
							id: `p${slot}`,
							slot,
							team: 'west',
							indexOnTeam: idx,
							teamCount: westSize,
							isBot: true,
							botDifficulty: config.botDifficulty,
							name: legacyWestNames[slot] ?? `Бот-союзник #${idx + 1}`,
							race: choice.race,
							isRandomRace: choice.isRandom,
							randomGoldGranted: false,
							gold: config.startGold
						})
					);
				}
				if (idx < eastSize) {
					const slot = 2 + idx * 2;
					const choice = takeRace(undefined, true);
					const legacyEastNames: Record<number, string> = {
						4: 'Бот v38',
						6: 'Бот v39'
					};
					this.teamMembers.east.push(
						buildPlayer({
							id: `p${slot}`,
							slot,
							team: 'east',
							indexOnTeam: idx,
							teamCount: eastSize,
							isBot: true,
							botDifficulty: config.botDifficulty,
							name: legacyEastNames[slot] ?? `Бот #${idx + 1}`,
							race: choice.race,
							isRandomRace: choice.isRandom,
							randomGoldGranted: false,
							gold: config.startGold
						})
					);
				}
			}
		}

		this.players = {
			west: this.teamMembers.west[0],
			east: this.teamMembers.east[0]
		};

		this.allPlayers = [...this.teamMembers.west, ...this.teamMembers.east];
		const hasExplicitSlotColors = Boolean(
			config.customSlots?.some((s) => typeof s.colorId === 'number')
		);
		if (!hasExplicitSlotColors) {
			this.randomizePlayerColors(config.randomColors === false);
		}
		this.assignCastleColors();
		this.bots = [];
		for (const p of this.allPlayers) {
			if (p.isBot) {
				this.bots.push(new BotAI(this, p.team, p));
			}
		}

		// Instantiate domain subsystems
		this.workerSystem = new WorkerSystem(this);
		this.buildingSystem = new BuildingSystem(this);
		this.combatSystem = new CombatSystem(this);
		this.economySystem = new EconomySystem(this);

		// Initialize procedural decorations across both islands (fresh random layout per match unless seed is pinned)
		this.initDecorations(config.seed ?? createRandomDecorationSeed());
	}

	public randomizePlayerColors(fixed = false): void {
		if (fixed) {
			this.allPlayers.forEach((p, index) => {
				const slotIdx = (p.slot !== undefined ? p.slot - 1 : index) % ALL_PLAYER_COLORS.length;
				p.color = ALL_PLAYER_COLORS[slotIdx >= 0 ? slotIdx : 0];
			});
			return;
		}

		// Use 12 classic WC3 colors when <= 12 players, and include extra 13..14 colors for 7v7
		const palette =
			this.allPlayers.length > WC3_PLAYER_COLORS.length ? ALL_PLAYER_COLORS : WC3_PLAYER_COLORS;
		const pool = [...palette];
		for (let i = pool.length - 1; i > 0; i--) {
			const j = Math.floor(this.nextRandom() * (i + 1));
			[pool[i], pool[j]] = [pool[j], pool[i]];
		}

		for (let i = 0; i < this.allPlayers.length; i++) {
			this.allPlayers[i].color = pool[i % pool.length];
		}
	}

	public assignCastleColors(): void {
		const westMembers = this.teamMembers.west;
		if (westMembers.length > 0) {
			const pickedWest = westMembers[Math.floor(this.nextRandom() * westMembers.length)];
			this.castles.west.color = pickedWest.color;
		} else if (this.players.west) {
			this.castles.west.color = this.players.west.color;
		}

		const eastMembers = this.teamMembers.east;
		if (eastMembers.length > 0) {
			const pickedEast = eastMembers[Math.floor(this.nextRandom() * eastMembers.length)];
			this.castles.east.color = pickedEast.color;
		} else if (this.players.east) {
			this.castles.east.color = this.players.east.color;
		}
	}

	public updateBots(dt: number): void {
		if (this.winner) return;
		for (const bot of this.bots) {
			bot.update(dt);
		}
	}

	/**
	 * Sets player race or rolls random race with +30% gold bonus and -ur unique race enforcement.
	 */
	public setPlayerRace(
		team: MatchTeam,
		race: string | 'random',
		playerInput?: PlayerState
	): boolean {
		const player = playerInput || this.players[team];
		if (!player) return false;

		const isRaceAvailable = (r: string): boolean => {
			const canonical = formatRaceName(r);
			return !this.bannedRaces.includes(r) && !this.bannedRaces.includes(canonical);
		};
		const isUniqueRaces = !!(this.gameModeConfig.uniqueRaces || this.config.uniqueRaces);
		const availableRaces = RACES_LIST.filter((r) =>
			(PLAYABLE_RACES as readonly string[]).includes(r.race)
		)
			.map((r) => r.race)
			.filter((r) => isRaceAvailable(r));
		const teamScopedUr = this.allPlayers.length > availableRaces.length;
		const otherPlayers = this.allPlayers.filter(
			(p) => p !== player && !p.pendingRacePick && (!teamScopedUr || p.team === player.team)
		);

		if (race === 'random') {
			let pool = availableRaces;
			if (isUniqueRaces && otherPlayers.length > 0) {
				const taken = new Set(otherPlayers.map((p) => formatRaceName(p.race)));
				pool = pool.filter((r) => !taken.has(formatRaceName(r)));
			}
			if (pool.length === 0) pool = availableRaces;

			const picked = pool[Math.floor(this.nextRandom() * pool.length)];
			player.race = picked;
			player.pendingRacePick = false;
			player.isRandomRace = true;
			if (player.worker) {
				player.worker.name = getBuilderNameForRace(player.race);
			}

			// Grant +30% gold bonus if at start of game and not already granted
			if (this.gameTime <= 15 && !player.randomGoldGranted) {
				const bonus = Math.round(this.config.startGold * 0.3);
				player.gold += bonus;
				player.randomGoldGranted = true;
				this.addFloatingText(
					`+${bonus}g Випадкова раса!`,
					team === 'west' ? 300 : 1600,
					400,
					'#eab308'
				);
			}
			this.notifyStateChanged();
			return true;
		}

		// Direct race selection
		const canonicalRace = formatRaceName(race);
		const isValidRace =
			availableRaces.includes(race) ||
			availableRaces.includes(canonicalRace) ||
			RACES_LIST.some((r) => r.race === race || formatRaceName(r.race) === canonicalRace);

		if (race === 'in_game' || !isValidRace) {
			return false;
		}

		if (!isRaceAvailable(race)) {
			this.addFloatingText(
				'Раса заблокована (-ban)!',
				team === 'west' ? 300 : 1600,
				400,
				'#ef4444'
			);
			return false;
		}

		if (
			isUniqueRaces &&
			otherPlayers.some((p) => p.race === race || formatRaceName(p.race) === canonicalRace)
		) {
			this.addFloatingText('Раса вже зайнята (-ur)!', team === 'west' ? 300 : 1600, 400, '#ef4444');
			return false;
		}

		// If player switches away from random before 15s, remove granted bonus
		if (player.isRandomRace && player.randomGoldGranted && this.gameTime <= 15) {
			const bonus = Math.round(this.config.startGold * 0.3);
			player.gold = Math.max(0, player.gold - bonus);
			player.randomGoldGranted = false;
		}

		player.race = race;
		player.pendingRacePick = false;
		player.isRandomRace = false;
		if (player.worker) {
			player.worker.name = getBuilderNameForRace(player.race);
		}
		this.notifyStateChanged();
		return true;
	}

	public hasCommanderHall(team: MatchTeam, player?: PlayerState): boolean {
		return this.buildings.some(
			(b) =>
				b.team === team &&
				b.specialType === 'commander' &&
				!b.isUnderConstruction &&
				(!player || !b.playerId || b.playerId === player.id)
		);
	}

	public canSelectOrChangeCommander(
		team: MatchTeam,
		playerInput?: PlayerState
	): {
		allowed: boolean;
		hasHall: boolean;
		isFirstPick: boolean;
		isFree: boolean;
		cooldownLeft: number;
		goldCost: number;
		lumberCost: number;
		reason?: 'no_player' | 'no_hall' | 'insufficient_resources';
	} {
		const player = playerInput || this.players[team];
		if (!player) {
			return {
				allowed: false,
				hasHall: false,
				isFirstPick: true,
				isFree: false,
				cooldownLeft: 0,
				goldCost: COMMANDER_CHANGE_GOLD_COST,
				lumberCost: COMMANDER_CHANGE_LUMBER_COST,
				reason: 'no_player'
			};
		}

		const hasHall = this.hasCommanderHall(team, player);
		const isFirstPick = !findCommander(player.commander);
		const cooldownLeft = Math.max(0, player.commanderCooldown ?? 0);
		const isFree = isFirstPick || cooldownLeft <= 0;
		const goldCost = isFree ? 0 : COMMANDER_CHANGE_GOLD_COST;
		const lumberCost = isFree ? 0 : COMMANDER_CHANGE_LUMBER_COST;

		if (!hasHall) {
			return {
				allowed: false,
				hasHall: false,
				isFirstPick,
				isFree,
				cooldownLeft,
				goldCost,
				lumberCost,
				reason: 'no_hall'
			};
		}

		if (!isFree && (player.gold < goldCost || (player.lumber ?? 0) < lumberCost)) {
			return {
				allowed: false,
				hasHall: true,
				isFirstPick,
				isFree: false,
				cooldownLeft,
				goldCost,
				lumberCost,
				reason: 'insufficient_resources'
			};
		}

		return {
			allowed: true,
			hasHall: true,
			isFirstPick,
			isFree,
			cooldownLeft,
			goldCost,
			lumberCost
		};
	}

	/**
	 * Assigns or changes commander inside a built Commander Hall ("Дім командира").
	 * First selection after building is free; subsequent changes within 5 minutes (300s) cost 250g + 250w,
	 * or are free once the 5-minute cooldown expires. Random Commander doubles bonus x2.
	 */
	public selectPlayerCommander(
		team: MatchTeam,
		choice: number | 'random',
		playerInput?: PlayerState
	): { commanderId: number; isRandom: boolean; ok: boolean } {
		const player = playerInput || this.players[team];
		if (!player) return { commanderId: 0, isRandom: false, ok: false };

		const status = this.canSelectOrChangeCommander(team, player);
		const fxX = team === 'west' ? WEST_CASTLE_X + 140 : EAST_CASTLE_X - 140;

		if (!status.allowed) {
			if (!player.isBot) {
				this.onSoundEffect?.('errorResource');
				if (status.reason === 'no_hall') {
					this.addFloatingText(
						'Спочатку збудуйте Дім командира (250g, 250w)!',
						fxX,
						360,
						'#ef4444'
					);
				} else if (status.reason === 'insufficient_resources') {
					this.addFloatingText(
						`Для зміни потрібно ${status.goldCost}g та ${status.lumberCost}w!`,
						fxX,
						360,
						'#ef4444'
					);
				}
			}
			return {
				commanderId: player.commander,
				isRandom: Boolean(player.isRandomCommander),
				ok: false
			};
		}

		if (status.goldCost > 0 || status.lumberCost > 0) {
			player.gold -= status.goldCost;
			player.stats.goldSpent += status.goldCost;
			player.lumber = Math.max(0, (player.lumber ?? 0) - status.lumberCost);
			player.stats.lumberSpent = (player.stats.lumberSpent || 0) + status.lumberCost;
		}

		const isRandom = choice === 'random';
		const commanderId = isRandom
			? pickRandomCommanderId(() => this.nextRandom())
			: getCommander(choice).id;
		player.commander = commanderId;
		player.isRandomCommander = isRandom;
		player.commanderCooldown = COMMANDER_CHANGE_COOLDOWN_SEC;

		const cmd = getCommander(commanderId);
		const pct = getCommanderEffectivePct(commanderId, isRandom);
		this.addFloatingText(
			isRandom
				? `Випадковий командир ×2: ${cmd.name} (${pct}%)!`
				: `Командир: ${cmd.name} (${pct}%)`,
			fxX,
			360,
			isRandom ? '#c084fc' : '#818cf8'
		);

		this.notifyStateChanged();
		return { commanderId, isRandom, ok: true };
	}

	public isRaceBanned(race: string): boolean {
		return this.bannedRaces.includes(race) || this.bannedRaces.includes(formatRaceName(race));
	}

	public getAvailableRaces(): string[] {
		return RACES_LIST.map((r) => r.race).filter((r) => !this.bannedRaces.includes(r));
	}

	public notifyStateChanged(): void {
		this.stateVersion++;
	}

	public startNewMatch(targetWins?: number): void {
		if (targetWins) {
			this.targetWins = targetWins;
		}
		this.score = { west: 0, east: 0 };
		this.round = 1;
		this.matchWinner = null;
		this.roundWinner = null;
		for (const p of this.allPlayers) {
			p.commander = 0;
			p.isRandomCommander = false;
			p.commanderCooldown = 0;
		}
		this.resetRound();
	}

	public recordBuildingDamage(defId: string, name: string, team: MatchTeam, damage: number): void {
		if (!this.buildingStats[defId]) {
			this.buildingStats[defId] = { defId, name, team, kills: 0, damage: 0 };
		}
		this.buildingStats[defId].damage += Math.round(damage);
	}

	public recordBuildingKill(defId: string, name: string, team: MatchTeam): void {
		if (!this.buildingStats[defId]) {
			this.buildingStats[defId] = { defId, name, team, kills: 0, damage: 0 };
		}
		this.buildingStats[defId].kills += 1;
	}

	public getMvpBuilding(team: MatchTeam): BuildingPerformance | null {
		const list = Object.values(this.buildingStats).filter((b) => b.team === team);
		if (list.length === 0) {
			const firstBuilding = this.buildings.find((b) => b.team === team);
			if (firstBuilding) {
				return { defId: firstBuilding.defId, name: firstBuilding.name, team, kills: 0, damage: 0 };
			}
			return null;
		}
		list.sort((a, b) => b.kills * 100 + b.damage - (a.kills * 100 + a.damage));
		return list[0] || null;
	}

	public exportAnalytics(): MatchAnalyticsReport {
		return generateMatchAnalytics(this);
	}

	public exportAnalyticsJSON(): string {
		return exportMatchAnalyticsJSON(this);
	}

	public exportAnalyticsCSV(): string {
		return exportMatchAnalyticsCSV(this);
	}

	public resetRound(
		newRaces?: { west?: string; east?: string },
		newCommanders?: { west?: number; east?: number }
	): void {
		this.units = [];
		this.buildings = [];
		this.projectiles = [];
		this.corpses = [];
		this.floatingTexts = [];
		this.spatialGrid.clear();

		this.castles.west.hp = this.castles.west.maxHp;
		this.castles.east.hp = this.castles.east.maxHp;
		this.lastCastleHpSnapshot = { west: this.castles.west.maxHp, east: this.castles.east.maxHp };
		this.castleHpLossRate = { west: 0, east: 0 };

		this.gameTime = 0;
		this.incomeTimer = 5.0;
		this.incomeInterval = 5.0;
		this.raceSkillCooldown = { west: 0, east: 0 };
		this.castleInvulnerableTimer = { west: 0, east: 0 };
		this.castleOverchargeTimer = { west: 0, east: 0 };
		this.castleCannonUpgraded = { west: false, east: false };
		this.combatSystem.defenseSystem.castleCooldowns = { west: 0, east: 0 };
		this.itemCooldowns = { west: {}, east: {} };
		this.rescueStrikeCooldown = { west: 0, east: 0 };
		this.teamBotRescueCooldown = { west: 0, east: 0 };
		this.rescueStrikeEffects = [];
		this.splashEffects = [];
		this.lightningEffects = [];
		this.bossSpawnTimer = 180.0;
		this.bossIndex = 0;
		this.lastBossLane = 'bottom';
		this.lastBossId = -1;
		this.activeBossInstanceId = null;
		this.goldCoins = [];
		this.debris = [];
		this.coinSpawnTimer = this.coinSpawnInterval;
		const bridges: ('top' | 'mid' | 'bottom')[] = ['top', 'mid', 'bottom'];
		this.brokenBridge = bridges[Math.floor(this.nextRandom() * 3)];
		this.bridgeRepairProgress = 0;
		this.lastBotBridgeRepairTime = { west: -180, east: -180 };
		this.initDecorations(
			this.config.seed !== undefined
				? (this.config.seed + this.round * 31) >>> 0
				: createRandomDecorationSeed()
		);
		this.winner = null;
		this.roundWinner = null;
		this.buildingStats = {};
		this.lastCastleAttackAlert = { west: -99, east: -99 };
		this.lastLowCastleHpAlert = { west: -99, east: -99 };

		if (this.config.randomColors !== false) {
			this.randomizePlayerColors(false);
		}
		this.assignCastleColors();

		for (const p of this.allPlayers) {
			p.forge = { attack: 0, armor: 0, econ: 0 };
			p.rescueStrikeCooldown = 0;
			const baseStartGold = this.config.startGold ?? 500;
			p.gold = !p.isBot && p.isRandomRace ? Math.round(baseStartGold * 1.3) : baseStartGold;
			p.randomGoldGranted = !p.isBot && !!p.isRandomRace;
			p.lumber = 125;
			p.food = 0;
			p.maxFood =
				this.gameModeConfig?.noSpecialBuildings || this.gameModeConfig?.noLegendaries ? 0 : 1;
			p.stats = {
				unitsSpawned: 0,
				unitsKilled: 0,
				goldSpent: 0,
				totalDamageDealt: 0,
				damageToCastle: 0,
				coinsCollected: 0,
				itemsPurchased: 0,
				lumberEarned: 0,
				lumberSpent: 0,
				damageByAttackType: {},
				damageByArmorType: {}
			};
			if (newRaces?.[p.team] && p === this.players[p.team]) {
				const req = newRaces[p.team]!;
				const canReq = formatRaceName(req);
				if (!this.bannedRaces.includes(req) && !this.bannedRaces.includes(canReq)) {
					p.race = req;
				}
			}
			if (newCommanders?.[p.team] && p === this.players[p.team]) {
				p.commander = newCommanders[p.team]!;
				p.isRandomCommander = false;
			}
			if (p.worker) {
				p.worker.name = getBuilderNameForRace(p.race);
				const teamList = this.teamMembers[p.team];
				const idxOnTeam = Math.max(0, teamList.indexOf(p));
				const spawnPt = computeWorkerSpawnPoint(p.team, idxOnTeam, teamList.length);
				p.worker.x = spawnPt.x;
				p.worker.y = spawnPt.y;
				p.worker.targetX = spawnPt.x;
				p.worker.targetY = spawnPt.y;
				p.worker.isBuilding = false;
				p.worker.targetBuildingId = null;
				p.worker.isRepairing = false;
				p.worker.targetRepairBuildingId = null;
				p.worker.path = [];
			}
		}

		this.notifyStateChanged();
		this.onRoundStart?.(this.round);
	}

	/**
	 * Main step function.
	 * dt is in seconds (e.g. 0.05 for 20 FPS simulation).
	 */
	public step(dt: number): void {
		if (this.winner || !this.isRunning) return;

		this.tick++;
		this.gameTime += dt;

		this.raceSkillCooldown.west = Math.max(0, this.raceSkillCooldown.west - dt);
		this.raceSkillCooldown.east = Math.max(0, this.raceSkillCooldown.east - dt);

		this.castleInvulnerableTimer.west = Math.max(0, this.castleInvulnerableTimer.west - dt);
		this.castleInvulnerableTimer.east = Math.max(0, this.castleInvulnerableTimer.east - dt);

		this.castleOverchargeTimer.west = Math.max(0, this.castleOverchargeTimer.west - dt);
		this.castleOverchargeTimer.east = Math.max(0, this.castleOverchargeTimer.east - dt);

		for (const p of this.allPlayers) {
			if (p.rescueStrikeCooldown !== undefined && p.rescueStrikeCooldown > 0) {
				p.rescueStrikeCooldown = Math.max(0, p.rescueStrikeCooldown - dt);
			}
			if (p.commanderCooldown !== undefined && p.commanderCooldown > 0) {
				p.commanderCooldown = Math.max(0, p.commanderCooldown - dt);
			}
		}
		this.rescueStrikeCooldown.west = Math.max(0, this.rescueStrikeCooldown.west - dt);
		this.rescueStrikeCooldown.east = Math.max(0, this.rescueStrikeCooldown.east - dt);
		this.teamBotRescueCooldown.west = Math.max(0, this.teamBotRescueCooldown.west - dt);
		this.teamBotRescueCooldown.east = Math.max(0, this.teamBotRescueCooldown.east - dt);

		const hpRateAlpha = dt > 0 ? Math.min(1, dt / 2.5) : 0;
		for (const team of ['west', 'east'] as MatchTeam[]) {
			const drop = Math.max(0, this.lastCastleHpSnapshot[team] - this.castles[team].hp);
			const instRate = dt > 0 ? drop / dt : 0;
			this.castleHpLossRate[team] =
				this.castleHpLossRate[team] * (1 - hpRateAlpha) + instRate * hpRateAlpha;
			this.lastCastleHpSnapshot[team] = this.castles[team].hp;
		}

		this.greatAssemblyTimer.west = Math.max(0, this.greatAssemblyTimer.west - dt);
		this.greatAssemblyTimer.east = Math.max(0, this.greatAssemblyTimer.east - dt);

		for (const eff of this.rescueStrikeEffects) {
			eff.timer -= dt;
		}
		this.rescueStrikeEffects = this.rescueStrikeEffects.filter((eff) => eff.timer > 0);

		for (const eff of this.splashEffects) {
			eff.timer -= dt;
		}
		this.splashEffects = this.splashEffects.filter((eff) => eff.timer > 0);

		for (const eff of this.lightningEffects) {
			eff.timer -= dt;
		}
		this.lightningEffects = this.lightningEffects.filter((eff) => eff.timer > 0);

		// 1. Update Workers
		this.workerSystem.updateWorkers(dt);

		// 2. Decrement Item Cooldowns
		for (const team of ['west', 'east'] as MatchTeam[]) {
			for (const itemId in this.itemCooldowns[team]) {
				if (this.itemCooldowns[team][itemId] > 0) {
					this.itemCooldowns[team][itemId] = Math.max(0, this.itemCooldowns[team][itemId] - dt);
				}
			}
		}

		// 3. Boss timer countdown
		if (!this.activeBossInstanceId) {
			this.bossSpawnTimer -= dt;
			if (this.bossSpawnTimer <= 0) {
				this.spawnBoss();
			}
		}

		// 4. Update Battlefield Gold Coins (I000) & Scrap Debris
		this.economySystem.updateGoldCoins(dt);
		this.updateDebris(dt);

		// 5. Update Economy
		this.economySystem.updateEconomy(dt);

		// 6. Update Buildings & Spawning
		this.buildingSystem.updateBuildings(dt);

		// 7. Update Spatial Grid
		this.spatialGrid.clear();
		for (const unit of this.units) {
			if (unit.state !== 'DEAD') {
				this.spatialGrid.insert(unit);
			}
		}

		// 8. Update Units
		this.combatSystem.updateUnits(dt);

		// 9. Update Projectiles
		this.combatSystem.updateProjectiles(dt);

		// 10. Update Castles defense & Towers
		this.combatSystem.updateCastles(dt);
		this.combatSystem.updateTowers(dt);

		// Critical Castle HP alarm heartbeat (< 30% HP for player team)
		if (this.castles.west.hp > 0 && this.castles.west.hp < this.castles.west.maxHp * 0.3) {
			if (this.gameTime - this.lastLowCastleHpAlert.west >= 8.0) {
				this.lastLowCastleHpAlert.west = this.gameTime;
				this.onSoundEffect?.('lowCastleHp');
			}
		}

		// 11. Update Floating texts
		this.updateFloatingTexts(dt);

		// Update decaying corpses
		for (let i = this.corpses.length - 1; i >= 0; i--) {
			this.corpses[i].decayTimer -= dt;
			if (this.corpses[i].decayTimer <= 0) {
				this.corpses.splice(i, 1);
			}
		}

		// 12. Cleanup dead entities
		this.units = this.units.filter((u) => u.state !== 'DEAD' || (u.deathTimer ?? 0) > 0);
		this.projectiles = this.projectiles.filter((p) => p.damage > 0);

		if (this.config.autoStepBots && !this.winner) {
			this.updateBots(dt);
		}

		// 13. Check Win Condition
		if (this.castles.west.hp <= 0 && !this.winner) {
			this.winner = 'east';
			this.roundWinner = 'east';
			this.score.east++;
			if (this.score.east >= this.targetWins) {
				this.matchWinner = 'east';
			}
			this.onSoundEffect?.('defeat');
			this.onRoundEnd?.('east');
			this.notifyStateChanged();
		} else if (this.castles.east.hp <= 0 && !this.winner) {
			this.winner = 'west';
			this.roundWinner = 'west';
			this.score.west++;
			if (this.score.west >= this.targetWins) {
				this.matchWinner = 'west';
			}
			this.onSoundEffect?.('victory');
			this.onRoundEnd?.('west');
			this.notifyStateChanged();
		}
	}

	public spawnUnitDirectly(options: {
		team: Team;
		lane: Lane;
		x: number;
		y: number;
		hp?: number;
		maxHp?: number;
		armor?: number;
		range?: number;
		attackCooldown?: number;
		cooldownTimer?: number;
		speed?: number;
		damage?: number;
		splashRadius?: number;
		reflectDamagePct?: number;
		isScavenger?: boolean;
		abilityType?: import('./types').UnitAbilityType;
		abilities?: import('./types').UnitAbilityDef[];
		flying?: boolean;
		canHitAir?: boolean;
		size?: number;
		critChance?: number;
		evadeChance?: number;
		frostOnHit?: boolean;
		pulverizeChance?: number;
		immolationDps?: number;
		hasReincarnated?: boolean;
		mana?: number;
		maxMana?: number;
		manaRegen?: number;
		name?: string;
		armorType?: ArmorType;
		attackType?: AttackType;
		timedLife?: number;
		isSummoned?: boolean;
	}): Unit {
		const targetLane: Lane = this.gameModeConfig?.singleLane ?? options.lane;
		const targetY = this.gameModeConfig?.singleLane
			? this.gameModeConfig.singleLane === 'top'
				? TOP_LANE_Y
				: BOTTOM_LANE_Y
			: options.y;

		const unit: Unit = {
			instanceId: `test_unit_${this.nextUnitId++}`,
			defId: 'test',
			name: options.name ?? 'Тестовий боєць',
			team: options.team,
			lane: targetLane,
			x: options.x,
			y: targetY,
			prevX: options.x,
			prevY: targetY,
			hp: options.hp ?? 500,
			maxHp: options.maxHp ?? options.hp ?? 500,
			armor: options.armor ?? 2,
			armorType: options.armorType ?? 'medium',
			attackType: options.attackType ?? 'normal',
			damageMin: options.damage ?? 50,
			damageMax: options.damage ?? 50,
			damageBonusPct: 0,
			armorBonus: 0,
			attackCooldown: options.attackCooldown ?? 1.0,
			cooldownTimer: options.cooldownTimer ?? 0,
			range: options.range ?? 100,
			speed: options.speed ?? 100,
			flying: !!options.flying,
			canHitAir:
				options.canHitAir ??
				(!!options.flying || (options.range !== undefined && options.range > 120)),
			currentTargetId: null,
			targetX: options.team === 'west' ? ARENA_WIDTH - 200 : 200,
			targetY: options.y,
			state: 'WALKING',
			size: options.size ?? (options.flying ? 22 : 16),
			critChance: options.critChance,
			evadeChance: options.evadeChance,
			splashRadius: options.splashRadius,
			reflectDamagePct: options.reflectDamagePct,
			isScavenger: options.isScavenger,
			abilityType: options.abilityType || 'none',
			abilities:
				options.abilities ||
				(options.abilityType && options.abilityType !== 'none'
					? [
							{
								id: `abil_${options.abilityType}`,
								type: options.abilityType,
								isPassive: false,
								nameUk: options.abilityType,
								nameEn: options.abilityType,
								descriptionUk: '',
								descriptionEn: ''
							}
						]
					: []),
			abilityCooldownTimer: 0,
			frostOnHit: options.frostOnHit,
			pulverizeChance: options.pulverizeChance,
			immolationDps: options.immolationDps,
			hasReincarnated: options.hasReincarnated,
			mana: options.mana ?? (options.maxMana !== undefined ? options.maxMana : undefined),
			maxMana: options.maxMana,
			manaRegen: options.manaRegen,
			timedLife: options.timedLife,
			isSummoned: options.isSummoned
		};
		this.units.push(unit);
		return unit;
	}

	public spawnBoss(): Unit {
		const lane: Lane =
			this.gameModeConfig?.singleLane ?? (this.lastBossLane === 'bottom' ? 'top' : 'bottom');
		this.lastBossLane = lane;
		this.bossIndex++;

		const { boss: bossDef, index } = getRandomBoss(this.lastBossId, () => this.nextRandom());
		this.lastBossId = index;

		const laneY = lane === 'top' ? TOP_LANE_Y : BOTTOM_LANE_Y;
		const centerX = ARENA_WIDTH / 2;

		const unit: Unit = {
			instanceId: `boss_${this.nextUnitId++}`,
			defId: bossDef.id,
			name: bossDef.nameUk,
			team: 'neutral',
			lane,
			x: centerX,
			y: laneY,
			prevX: centerX,
			prevY: laneY,
			hp: bossDef.hp,
			maxHp: bossDef.hp,
			armor: bossDef.armor,
			armorType: bossDef.armorType,
			attackType: bossDef.attackType,
			damageMin: bossDef.damage,
			damageMax: bossDef.damage,
			damageBonusPct: 0,
			armorBonus: 0,
			attackCooldown: bossDef.attackCooldown,
			cooldownTimer: 0.5,
			range: bossDef.range,
			speed: 40,
			flying: false,
			currentTargetId: null,
			targetX: centerX,
			targetY: laneY,
			state: 'WALKING',
			size: bossDef.size,
			isBoss: true
		};

		this.units.push(unit);
		this.activeBossInstanceId = unit.instanceId;
		this.addFloatingText(`БОСС: ${bossDef.nameUk}!`, centerX, laneY - 40, '#f59e0b');
		this.onSoundEffect?.('bossSpawn');
		this.onBossSpawn?.(unit);
		this.notifyStateChanged();
		return unit;
	}

	public addFloatingText(text: string, x: number, y: number, color = '#ffffff'): void {
		const item: FloatingText = {
			id: `ft_${this.nextTextId++}`,
			text,
			x,
			y,
			color,
			life: 1.0,
			maxLife: 1.0
		};
		this.floatingTexts.push(item);
		this.onFloatingText?.(item);
	}

	private updateFloatingTexts(dt: number): void {
		for (const t of this.floatingTexts) {
			t.life -= dt;
			t.y -= 22 * dt;
		}
		this.floatingTexts = this.floatingTexts.filter((t) => t.life > 0);
	}

	private updateDebris(dt: number): void {
		if (this.debris.length === 0) return;
		for (const d of this.debris) {
			d.lifeTime -= dt;
		}

		// 1. Worker salvage: if worker walks near debris, salvage scrap for team gold bonus (+10g)
		for (const team of ['west', 'east'] as MatchTeam[]) {
			const worker = this.players[team]?.worker;
			if (!worker) continue;
			for (const d of this.debris) {
				if (d.lifeTime <= 0) continue;
				if (d.team === team && Math.hypot(worker.x - d.x, worker.y - d.y) <= 64) {
					this.players[team].gold += 10;
					this.addFloatingText('+10g Брухт', worker.x, worker.y - 20, '#eab308');
					d.lifeTime = 0;
				}
			}
		}

		// 2. Unit pickup: walking over scrap debris
		for (const unit of this.units) {
			if (unit.state === 'DEAD' || unit.team === 'neutral') continue;
			for (const d of this.debris) {
				if (d.lifeTime <= 0) continue;
				if (d.team === unit.team && Math.hypot(unit.x - d.x, unit.y - d.y) <= 48) {
					unit.buffs = unit.buffs || [];
					const greatAssembly = (this.greatAssemblyTimer?.[d.team] ?? 0) > 0;
					const hasAssemblyPlant = this.buildings.some(
						(b) =>
							b.team === d.team &&
							(b.defId === 'cg08' || b.defId === 'cg0c') &&
							!b.isUnderConstruction
					);
					const buffDuration = 15.0 + (hasAssemblyPlant ? 5.0 : 0.0);
					const asBonus = greatAssembly ? 0.2 : 0.1;
					unit.buffs.push({ type: 'as', timer: buffDuration, value: asBonus });
					unit.hp = Math.min(unit.maxHp, unit.hp + 35);
					this.addFloatingText(
						greatAssembly ? '+Велика Збірка (+20% AS)' : '+Уламки (+10% AS)',
						unit.x,
						unit.y - 20,
						'#f59e0b'
					);
					d.lifeTime = 0;
				}
			}
		}
		this.debris = this.debris.filter((d) => d.lifeTime > 0);
	}

	// --- SUB-SYSTEM DELEGATION (BACKWARD COMPATIBLE PUBLIC API) ---

	// Worker System
	public resolveGroundObstacles(x: number, y: number, radius: number): { x: number; y: number } {
		return this.workerSystem.resolveGroundObstacles(x, y, radius);
	}

	public isPointBlockedForWorker(team: MatchTeam, x: number, y: number, radius = 16): boolean {
		return this.workerSystem.isPointBlockedForWorker(team, x, y, radius);
	}

	public isWorkerLineClear(
		team: MatchTeam,
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		radius = 16
	): boolean {
		return this.workerSystem.isWorkerLineClear(team, x1, y1, x2, y2, radius);
	}

	public findWorkerPath(
		team: MatchTeam,
		startX: number,
		startY: number,
		targetX: number,
		targetY: number
	): { x: number; y: number }[] {
		return this.workerSystem.findWorkerPath(team, startX, startY, targetX, targetY);
	}

	public moveWorker(team: MatchTeam, targetX: number, targetY: number, player?: PlayerState): void {
		this.workerSystem.moveWorker(team, targetX, targetY, player);
	}

	public orderWorkerMove(
		team: MatchTeam,
		targetX: number,
		targetY: number,
		player?: PlayerState
	): void {
		this.workerSystem.moveWorker(team, targetX, targetY, player);
	}

	public repairBuilding(
		team: MatchTeam,
		buildingInstanceId: string,
		player?: PlayerState
	): boolean {
		const ok = this.workerSystem.repairBuilding(team, buildingInstanceId, player);
		if (ok) {
			this.onReplayAction?.({
				tick: this.tick,
				team,
				actionType: 'REPAIR',
				payload: { targetId: buildingInstanceId }
			});
		}
		return ok;
	}

	public continueConstruction(
		team: MatchTeam,
		buildingInstanceId: string,
		player?: PlayerState
	): boolean {
		return this.workerSystem.continueConstruction(team, buildingInstanceId, player);
	}

	// Building System
	public canBuild(team: MatchTeam, tileX: number, tileY: number): boolean {
		return this.buildingSystem.canBuild(team, tileX, tileY);
	}

	public isBoxOnRoad(rx: number, ry: number, rw: number, rh: number): boolean {
		return this.buildingSystem.isBoxOnRoad(rx, ry, rw, rh);
	}

	public build(
		team: MatchTeam,
		defId: string,
		tileX: number,
		tileY: number,
		lane: Lane = 'top',
		player?: PlayerState,
		shiftKey = false
	): boolean {
		const ok = this.buildingSystem.build(team, defId, tileX, tileY, lane, player, shiftKey);
		if (ok) {
			this.onReplayAction?.({
				tick: this.tick,
				team,
				actionType: 'BUILD',
				payload: { buildingType: defId, x: tileX, y: tileY }
			});
		}
		return ok;
	}

	public upgradeBuilding(
		team: MatchTeam,
		buildingInstanceId: string,
		targetDefId: string,
		player?: PlayerState
	): boolean {
		const ok = this.buildingSystem.upgradeBuilding(team, buildingInstanceId, targetDefId, player);
		if (ok) {
			this.onReplayAction?.({
				tick: this.tick,
				team,
				actionType: 'UPGRADE',
				payload: { targetId: buildingInstanceId, buildingType: targetDefId }
			});
		}
		return ok;
	}

	public sellBuilding(team: MatchTeam, buildingInstanceId: string, player?: PlayerState): boolean {
		const ok = this.buildingSystem.sellBuilding(team, buildingInstanceId, player);
		if (ok) {
			this.onReplayAction?.({
				tick: this.tick,
				team,
				actionType: 'SELL',
				payload: { targetId: buildingInstanceId }
			});
		}
		return ok;
	}

	public spawnUnitFromBuilding(building: Building): Unit | null {
		return this.buildingSystem.spawnUnitFromBuilding(building);
	}

	// Combat System
	public damageBuilding(
		building: Building,
		rawDamage: number,
		attackType: AttackType,
		attackerTeam: MatchTeam
	): void {
		this.combatSystem.damageBuilding(building, rawDamage, attackType, attackerTeam);
	}

	// Economy System
	public calculateIncome(team: MatchTeam, player?: PlayerState): number {
		return this.economySystem.calculateIncome(team, player);
	}

	public collectCoin(coinId: string, team: MatchTeam, player?: PlayerState): boolean {
		return this.economySystem.collectCoin(coinId, team, player);
	}

	public moveWorkerToCoin(team: MatchTeam, coinId: string): boolean {
		const coin = this.goldCoins.find((c) => c.id === coinId);
		if (!coin) return false;
		const worker = this.players[team]?.worker;
		if (!worker) return false;
		this.moveWorker(team, coin.x, coin.y);
		return true;
	}

	public spawnCoinDirectly(lane: Lane, x: number, y: number, value = 50): GoldCoin {
		return this.economySystem.spawnCoinDirectly(lane, x, y, value);
	}

	public hasShop(team: MatchTeam, player?: PlayerState): boolean {
		return this.economySystem.hasShop(team, player);
	}

	public hasForge(team: MatchTeam, player?: PlayerState): boolean {
		return this.economySystem.hasForge(team, player);
	}

	public upgradeForge(
		team: MatchTeam,
		type: 'attack' | 'armor' | 'econ',
		player?: PlayerState
	): boolean {
		return this.economySystem.upgradeForge(team, type, player);
	}

	public getForgePrice(
		team: MatchTeam,
		type: 'attack' | 'armor' | 'econ',
		player?: PlayerState
	): number {
		return this.economySystem.getForgePrice(team, type, player);
	}

	public getForgeLumberPrice(
		team: MatchTeam,
		type: 'attack' | 'armor' | 'econ',
		player?: PlayerState
	): number {
		return this.economySystem.getForgeLumberPrice(team, type, player);
	}

	public canUseRaceSkill(team: MatchTeam): boolean {
		return this.economySystem.canUseRaceSkill(team);
	}

	public useRaceSkill(team: MatchTeam, player?: PlayerState): boolean {
		const ok = this.economySystem.useRaceSkill(team, player);
		if (ok) {
			this.onReplayAction?.({
				tick: this.tick,
				team,
				actionType: 'USE_ABILITY',
				payload: { abilityId: 'race_skill' }
			});
		}
		return ok;
	}

	public getItemCooldown(team: MatchTeam, itemId: string): number {
		return this.economySystem.getItemCooldown(team, itemId);
	}

	public canBuyCastleItem(team: MatchTeam, itemId: string, player?: PlayerState): boolean {
		return this.economySystem.canBuyCastleItem(team, itemId, player);
	}

	public buyCastleItem(team: MatchTeam, itemId: string, player?: PlayerState): boolean {
		return this.economySystem.buyCastleItem(team, itemId, player);
	}

	public getRescueStrikeCooldown(team: MatchTeam, player?: PlayerState): number {
		return this.economySystem.getRescueStrikeCooldown(team, player);
	}

	public canUseRescueStrike(team: MatchTeam, player?: PlayerState): boolean {
		return this.economySystem.canUseRescueStrike(team, player);
	}

	public triggerRescueStrike(
		team: MatchTeam,
		player?: PlayerState,
		worldX?: number,
		worldY?: number
	): {
		hitCount: number;
		damageDealt: number;
		killCount: number;
		bountyEarned: number;
		queued?: boolean;
	} | null {
		return this.economySystem.triggerRescueStrike(team, player, worldX, worldY);
	}

	public getCastleCannonCooldown(team: MatchTeam): number {
		return Math.max(0, this.combatSystem.defenseSystem.castleCooldowns[team] ?? 0);
	}

	public getCastleCannonEffectiveMaxCooldown(team: MatchTeam): number {
		return this.combatSystem.defenseSystem.getCastleCannonEffectiveCooldown(team);
	}

	public getCastleCannonShotCost(team: MatchTeam, mode: 'short' | 'long'): number {
		return this.combatSystem.defenseSystem.getCastleCannonShotCost(team, mode);
	}

	public canFireCastleCannon(
		team: MatchTeam,
		mode: 'short' | 'long',
		player?: PlayerState
	): boolean {
		return this.combatSystem.defenseSystem.canFireCastleCannon(team, mode, player);
	}

	public fireCastleCannon(
		team: MatchTeam,
		mode: 'short' | 'long',
		player?: PlayerState
	): { fired: boolean; hitEnemy: boolean; hitAlly: boolean; targetId: string | null } {
		return this.combatSystem.defenseSystem.fireCastleCannon(team, mode, player);
	}

	public canUpgradeCastleCannon(team: MatchTeam, player?: PlayerState): boolean {
		return this.combatSystem.defenseSystem.canUpgradeCastleCannon(team, player);
	}

	public upgradeCastleCannon(team: MatchTeam, player?: PlayerState): boolean {
		return this.combatSystem.defenseSystem.upgradeCastleCannon(team, player);
	}

	public getCastleCannonEnemyCount(team: MatchTeam, range: number, visibleOnly = false): number {
		return this.combatSystem.defenseSystem.countEnemiesInRange(team, range, visibleOnly);
	}

	public isPointOnIsland(team: MatchTeam, x: number, y: number, margin = 20): boolean {
		return this.buildingSystem.isPointOnIsland(team, x, y, margin);
	}

	public isPointNearRoad(x: number, y: number, clearance = 145): boolean {
		return this.buildingSystem.isPointNearRoad(x, y, clearance);
	}

	/**
	 * Checks if a world position (x, y) is revealed to a team under Fog of War.
	 * Reveals vision around:
	 * - Castle (750px radius)
	 * - Team Worker(s) (520px radius)
	 * - Team Buildings (500px radius)
	 * - Team Living Units / Mobs (480px radius)
	 * - Team Island Decorations (240px radius)
	 */
	public isPointRevealed(team: MatchTeam, x: number, y: number): boolean {
		if (this.config.fogOfWar === false) return true;

		// 1. Team Castle (wide 750px radius)
		const castle = this.castles[team];
		if (castle && Math.hypot(castle.x - x, castle.y - y) <= 750) {
			return true;
		}

		// 2. Team Workers (520px radius)
		const members = this.teamMembers?.[team] || [this.players[team]];
		for (const p of members) {
			if (p?.worker && Math.hypot(p.worker.x - x, p.worker.y - y) <= 520) {
				return true;
			}
		}

		// 3. Team Buildings (500px radius, Towers have extended 750px vision)
		for (const b of this.buildings) {
			const radius = b.specialType === 'tower' ? 750 : 500;
			if (
				b.team === team &&
				Math.hypot(b.x + CELL_SIZE / 2 - x, b.y + CELL_SIZE / 2 - y) <= radius
			) {
				return true;
			}
		}

		// 4. Team Units / Mobs (1100px base ground vision, 1250px flying aerial vision,
		// dynamically extended to range + 100px so ranged/siege units always see their target)
		for (const u of this.units) {
			const baseVision = u.flying ? 1250 : 1100;
			const radius = Math.max(baseVision, (u.range ?? 0) + 100);
			if (u.team === team && u.state !== 'DEAD' && Math.hypot(u.x - x, u.y - y) <= radius) {
				return true;
			}
		}

		// 5. Team Island Decorations (160px radius around natural island fixtures)
		if (this.decorations) {
			for (const d of this.decorations) {
				if (d.team === team && Math.hypot(d.x - x, d.y - y) <= 160) {
					return true;
				}
			}
		}

		return false;
	}

	public initDecorations(seed?: number): void {
		const effectiveSeed = (seed ?? createRandomDecorationSeed()) >>> 0 || 1;
		this.decorationSeed = effectiveSeed;
		this.decorations = generateDecorations(effectiveSeed, {
			isPointOnIsland: (team, x, y, margin) =>
				this.buildingSystem.isPointOnIsland(team, x, y, margin),
			isPointNearRoad: (x, y, clearance) => this.buildingSystem.isPointNearRoad(x, y, clearance)
		});
	}
}
