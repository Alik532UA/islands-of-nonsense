import { WC3_PLAYER_COLORS } from './types';
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
	BuildingPerformance,
	LightningEffect,
	SoundEffectType
} from './types';
import { SpatialHashGrid } from './spatialGrid';
import { getBuilderNameForRace, RACES_LIST } from './gameData';
import { getRandomBoss } from './bosses';
import { WorkerSystem } from './workerSystem';
import { BuildingSystem } from './buildingSystem';
import { CombatSystem } from './combatSystem';
import { EconomySystem } from './economySystem';
import { BotAI } from './botAI';
import { getGameMode, type GameModeConfig } from './gameModes';

import {
	ARENA_WIDTH,
	ARENA_HEIGHT,
	TOP_LANE_Y,
	MID_LANE_Y,
	BOTTOM_LANE_Y,
	type CoinMode
} from './constants';
export * from './constants';

export interface SimulationConfig {
	botDifficulty: number; // 0, 15, 30, 80
	startGold: number;
	modeId?: string;
	uniqueRaces?: boolean;
	allRandom?: boolean;
	westRace?: string;
	eastRace?: string;
	targetWins?: number;
	fogOfWar?: boolean;
	coinMode?: CoinMode;
	teamSize?: 1 | 2 | 3;
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

	public castles: Record<MatchTeam, Castle>;
	public players: Record<MatchTeam, PlayerState>;
	public teamSize: 1 | 2 | 3 = 1;
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

	// Economy state
	public incomeTimer = 3.0; // Current countdown
	public incomeInterval = 3.0;

	// Race skills cooldown (unlocked at 300s, cooldown 150s)
	public raceSkillCooldown = { west: 0, east: 0 };

	// Castle Shop & Consumables
	public castleInvulnerableTimer: Record<MatchTeam, number> = { west: 0, east: 0 };
	public castleOverchargeTimer: Record<MatchTeam, number> = { west: 0, east: 0 };
	public itemCooldowns: Record<MatchTeam, Record<string, number>> = { west: {}, east: {} };

	// Rescue Strike (Emergency Castle Defense, 180s CD)
	public rescueStrikeCooldown: Record<MatchTeam, number> = { west: 0, east: 0 };
	public rescueStrikeEffects: {
		team: MatchTeam;
		x: number;
		y: number;
		radius: number;
		timer: number;
		maxTimer: number;
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
	public onSoundEffect?: (sound: SoundEffectType) => void;
	public onCastleUnderAttack?: (team: MatchTeam, hpPercent: number) => void;
	public onBuildingComplete?: (building: Building) => void;
	public onBossSpawn?: (unit: Unit) => void;

	// Three Bridges state: 'top' | 'mid' | 'bottom'. One randomly chosen as broken.
	public brokenBridge: 'top' | 'mid' | 'bottom' | null = 'mid';

	public repairBridge(bridge?: 'top' | 'mid' | 'bottom'): void {
		if (!bridge || this.brokenBridge === bridge) {
			this.brokenBridge = null;
			this.addFloatingText('Міст відремонтовано!', ARENA_WIDTH / 2, MID_LANE_Y, '#22c55e');
			this.notifyStateChanged();
		}
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

	public nextUnitId = 1;
	public nextBuildingId = 1;
	public nextProjectileId = 1;
	public nextTextId = 1;
	public nextCoinId = 1;

	constructor(config: SimulationConfig = { botDifficulty: 0, startGold: 500 }) {
		this.config = config;
		this.teamSize = config.teamSize ?? 1;
		this.gameModeConfig = getGameMode(config.modeId || 'standard');
		if (config.allRandom !== undefined) {
			this.gameModeConfig.allRandom = config.allRandom;
		}
		if (config.uniqueRaces !== undefined) {
			this.gameModeConfig.uniqueRaces = config.uniqueRaces;
		}
		this.coinMode = config.coinMode ?? 'normal';
		if (this.coinMode === 'crazy') {
			this.coinSpawnTimer = 20.0;
			this.coinSpawnInterval = 20.0;
		}
		this.targetWins = config.targetWins ?? 2;
		const bridges: ('top' | 'mid' | 'bottom')[] = ['top', 'mid', 'bottom'];
		this.brokenBridge = bridges[Math.floor(Math.random() * 3)];
		const castleHp = Math.round(14000 * (this.gameModeConfig.castleHpMultiplier || 1.0));
		this.castles = {
			west: { team: 'west', x: 200, y: 1200, hp: castleHp, maxHp: castleHp },
			east: { team: 'east', x: ARENA_WIDTH - 200, y: 1200, hp: castleHp, maxHp: castleHp }
		};

		const availableRaces = RACES_LIST.map((r) => r.race);
		const isAllRandom = !!config.allRandom;
		const isUniqueRaces = !!config.uniqueRaces;

		const remainingRaces = [...availableRaces];
		const takeRace = (requested?: string, isRand = false): { race: string; isRandom: boolean } => {
			if (isAllRandom || requested === 'random' || isRand) {
				const idx = Math.floor(Math.random() * remainingRaces.length);
				const picked = remainingRaces[idx] || availableRaces[0];
				if (isUniqueRaces && remainingRaces.length > 1) {
					remainingRaces.splice(idx, 1);
				}
				return { race: picked, isRandom: true };
			}
			if (requested && remainingRaces.includes(requested)) {
				if (isUniqueRaces) {
					remainingRaces.splice(remainingRaces.indexOf(requested), 1);
				}
				return { race: requested, isRandom: false };
			}
			if (requested) {
				return { race: requested, isRandom: false };
			}
			const idx = Math.floor(Math.random() * remainingRaces.length);
			const picked = remainingRaces[idx] || availableRaces[0];
			if (isUniqueRaces && remainingRaces.length > 1) {
				remainingRaces.splice(idx, 1);
			}
			return { race: picked, isRandom: false };
		};

		const westChoice = takeRace(
			config.westRace || 'Люди',
			isAllRandom || config.westRace === 'random'
		);
		const eastIsRandomReq =
			isAllRandom || config.eastRace === 'random' || (!config.eastRace && config.botDifficulty > 0);
		const eastChoice = takeRace(
			config.eastRace || (!config.eastRace && config.botDifficulty > 0 ? undefined : 'Орки'),
			eastIsRandomReq
		);

		const westRace = westChoice.race;
		const westIsRandom = westChoice.isRandom;
		const eastRace = eastChoice.race;
		const eastIsRandom = eastChoice.isRandom;

		const westGold = westIsRandom ? Math.round(config.startGold * 1.3) : config.startGold;
		const eastGold = eastIsRandom ? Math.round(config.startGold * 1.3) : config.startGold;

		const p1: PlayerState = {
			id: 'p1',
			slot: 1,
			team: 'west',
			isBot: false,
			name: 'Гравець',
			color: WC3_PLAYER_COLORS[0],
			race: westRace,
			isRandomRace: westIsRandom,
			randomGoldGranted: westIsRandom,
			gold: westGold,
			lumber: 125,
			food: 0,
			maxFood: 0,
			commander: 2, // Alik
			forge: { attack: 0, armor: 0, econ: 0 },
			preferredLane: 'auto',
			worker: {
				name: getBuilderNameForRace(westRace),
				x: 450,
				y: 1200,
				targetX: 450,
				targetY: 1200,
				hp: 220,
				maxHp: 220,
				armor: 'Неуразливий',
				speed: 360,
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

		const p2: PlayerState = {
			id: 'p2',
			slot: 2,
			team: 'east',
			isBot: true,
			name: 'Бот v37',
			color: WC3_PLAYER_COLORS[1],
			race: eastRace,
			isRandomRace: eastIsRandom,
			randomGoldGranted: eastIsRandom,
			gold: eastGold,
			lumber: 125,
			food: 0,
			maxFood: 0,
			commander: 3, // Dima
			forge: { attack: 0, armor: 0, econ: 0 },
			preferredLane: 'auto',
			worker: {
				name: getBuilderNameForRace(eastRace),
				x: ARENA_WIDTH - 450,
				y: 1200,
				targetX: ARENA_WIDTH - 450,
				targetY: 1200,
				hp: 220,
				maxHp: 220,
				armor: 'Неуразливий',
				speed: 360,
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

		this.players = {
			west: p1,
			east: p2
		};

		this.teamMembers = {
			west: [p1],
			east: [p2]
		};

		if (this.teamSize >= 2) {
			const p3Choice = takeRace(undefined, true);
			const p4Choice = takeRace(undefined, true);

			const p3Gold = p3Choice.isRandom ? Math.round(config.startGold * 1.3) : config.startGold;
			const p4Gold = p4Choice.isRandom ? Math.round(config.startGold * 1.3) : config.startGold;

			const p3: PlayerState = {
				id: 'p3',
				slot: 3,
				team: 'west',
				isBot: true,
				name: 'Бот-союзник v37',
				color: WC3_PLAYER_COLORS[2],
				race: p3Choice.race,
				isRandomRace: p3Choice.isRandom,
				randomGoldGranted: p3Choice.isRandom,
				gold: p3Gold,
				lumber: 125,
				food: 0,
				maxFood: 0,
				commander: 1, // Sasha
				forge: { attack: 0, armor: 0, econ: 0 },
				preferredLane: 'auto',
				worker: {
					name: getBuilderNameForRace(p3Choice.race),
					x: 450,
					y: 700,
					targetX: 450,
					targetY: 700,
					hp: 220,
					maxHp: 220,
					armor: 'Неуразливий',
					speed: 360,
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

			const p4: PlayerState = {
				id: 'p4',
				slot: 4,
				team: 'east',
				isBot: true,
				name: 'Бот v38',
				color: WC3_PLAYER_COLORS[3],
				race: p4Choice.race,
				isRandomRace: p4Choice.isRandom,
				randomGoldGranted: p4Choice.isRandom,
				gold: p4Gold,
				lumber: 125,
				food: 0,
				maxFood: 0,
				commander: 4, // Dan
				forge: { attack: 0, armor: 0, econ: 0 },
				preferredLane: 'auto',
				worker: {
					name: getBuilderNameForRace(p4Choice.race),
					x: ARENA_WIDTH - 450,
					y: 700,
					targetX: ARENA_WIDTH - 450,
					targetY: 700,
					hp: 220,
					maxHp: 220,
					armor: 'Неуразливий',
					speed: 360,
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

			this.teamMembers.west.push(p3);
			this.teamMembers.east.push(p4);
		}

		if (this.teamSize === 3) {
			const p5Choice = takeRace(undefined, true);
			const p6Choice = takeRace(undefined, true);

			const p5Gold = p5Choice.isRandom ? Math.round(config.startGold * 1.3) : config.startGold;
			const p6Gold = p6Choice.isRandom ? Math.round(config.startGold * 1.3) : config.startGold;

			const p5: PlayerState = {
				id: 'p5',
				slot: 5,
				team: 'west',
				isBot: true,
				name: 'Бот-союзник v38',
				color: WC3_PLAYER_COLORS[4],
				race: p5Choice.race,
				isRandomRace: p5Choice.isRandom,
				randomGoldGranted: p5Choice.isRandom,
				gold: p5Gold,
				lumber: 125,
				food: 0,
				maxFood: 0,
				commander: 5, // Yura
				forge: { attack: 0, armor: 0, econ: 0 },
				preferredLane: 'auto',
				worker: {
					name: getBuilderNameForRace(p5Choice.race),
					x: 450,
					y: 1700,
					targetX: 450,
					targetY: 1700,
					hp: 220,
					maxHp: 220,
					armor: 'Неуразливий',
					speed: 360,
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

			const p6: PlayerState = {
				id: 'p6',
				slot: 6,
				team: 'east',
				isBot: true,
				name: 'Бот v39',
				color: WC3_PLAYER_COLORS[5],
				race: p6Choice.race,
				isRandomRace: p6Choice.isRandom,
				randomGoldGranted: p6Choice.isRandom,
				gold: p6Gold,
				lumber: 125,
				food: 0,
				maxFood: 0,
				commander: 6, // Valera
				forge: { attack: 0, armor: 0, econ: 0 },
				preferredLane: 'auto',
				worker: {
					name: getBuilderNameForRace(p6Choice.race),
					x: ARENA_WIDTH - 450,
					y: 1700,
					targetX: ARENA_WIDTH - 450,
					targetY: 1700,
					hp: 220,
					maxHp: 220,
					armor: 'Неуразливий',
					speed: 360,
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

			this.teamMembers.west.push(p5);
			this.teamMembers.east.push(p6);
		}

		this.allPlayers = [...this.teamMembers.west, ...this.teamMembers.east];
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
	}

	public updateBots(dt: number): void {
		for (const bot of this.bots) {
			bot.update(dt);
		}
	}

	/**
	 * Sets player race or rolls random race with +30% gold bonus and -ur unique race enforcement.
	 */
	public setPlayerRace(team: MatchTeam, race: string | 'random'): boolean {
		const player = this.players[team];
		if (!player) return false;

		const otherTeam = team === 'west' ? 'east' : 'west';
		const otherPlayer = this.players[otherTeam];
		const availableRaces = RACES_LIST.map((r) => r.race);

		if (race === 'random') {
			let pool = availableRaces;
			if (this.config.uniqueRaces && otherPlayer) {
				pool = pool.filter((r) => r !== otherPlayer.race);
			}
			if (pool.length === 0) pool = availableRaces;

			const picked = pool[Math.floor(Math.random() * pool.length)];
			player.race = picked;
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
		if (this.config.uniqueRaces && otherPlayer && otherPlayer.race === race) {
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
		player.isRandomRace = false;
		if (player.worker) {
			player.worker.name = getBuilderNameForRace(player.race);
		}
		this.notifyStateChanged();
		return true;
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

	public resetRound(newRaces?: { west?: string; east?: string }): void {
		this.units = [];
		this.buildings = [];
		this.projectiles = [];
		this.floatingTexts = [];
		this.spatialGrid.clear();

		this.castles.west.hp = this.castles.west.maxHp;
		this.castles.east.hp = this.castles.east.maxHp;

		this.gameTime = 0;
		this.incomeTimer = 3.0;
		this.incomeInterval = 3.0;
		this.raceSkillCooldown = { west: 0, east: 0 };
		this.castleInvulnerableTimer = { west: 0, east: 0 };
		this.castleOverchargeTimer = { west: 0, east: 0 };
		this.itemCooldowns = { west: {}, east: {} };
		this.rescueStrikeCooldown = { west: 0, east: 0 };
		this.rescueStrikeEffects = [];
		this.splashEffects = [];
		this.lightningEffects = [];
		this.bossSpawnTimer = 180.0;
		this.bossIndex = 0;
		this.lastBossLane = 'bottom';
		this.lastBossId = -1;
		this.activeBossInstanceId = null;
		this.goldCoins = [];
		this.coinSpawnTimer = this.coinSpawnInterval;
		const bridges: ('top' | 'mid' | 'bottom')[] = ['top', 'mid', 'bottom'];
		this.brokenBridge = bridges[Math.floor(Math.random() * 3)];
		this.winner = null;
		this.roundWinner = null;
		this.buildingStats = {};
		this.lastCastleAttackAlert = { west: -99, east: -99 };
		this.lastLowCastleHpAlert = { west: -99, east: -99 };

		for (const p of this.allPlayers) {
			p.forge = { attack: 0, armor: 0, econ: 0 };
			p.gold = 500;
			p.lumber = 125;
			p.food = 0;
			p.maxFood = 0;
			p.stats = {
				unitsSpawned: 0,
				unitsKilled: 0,
				goldSpent: 0,
				totalDamageDealt: 0,
				damageToCastle: 0,
				coinsCollected: 0,
				itemsPurchased: 0
			};
			if (newRaces?.[p.team] && p === this.players[p.team]) {
				p.race = newRaces[p.team]!;
			}
			if (p.worker) {
				p.worker.name = getBuilderNameForRace(p.race);
				const isWest = p.team === 'west';
				let defaultY = 1200;
				if (p.slot === 3 || p.slot === 4) defaultY = 700;
				else if (p.slot === 5 || p.slot === 6) defaultY = 1700;
				const defaultX = isWest ? 450 : ARENA_WIDTH - 450;
				p.worker.x = defaultX;
				p.worker.y = defaultY;
				p.worker.targetX = defaultX;
				p.worker.targetY = defaultY;
				p.worker.isBuilding = false;
				p.worker.targetBuildingId = null;
				p.worker.isRepairing = false;
				p.worker.targetRepairBuildingId = null;
				p.worker.path = [];
			}
		}

		this.notifyStateChanged();
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

		this.rescueStrikeCooldown.west = Math.max(0, this.rescueStrikeCooldown.west - dt);
		this.rescueStrikeCooldown.east = Math.max(0, this.rescueStrikeCooldown.east - dt);

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

		// 4. Update Battlefield Gold Coins (I000)
		this.economySystem.updateGoldCoins(dt);

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

		// 12. Cleanup dead entities
		this.units = this.units.filter((u) => u.state !== 'DEAD' || (u.deathTimer ?? 0) > 0);
		this.projectiles = this.projectiles.filter((p) => p.damage > 0);

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
		size?: number;
		critChance?: number;
		evadeChance?: number;
		frostOnHit?: boolean;
		pulverizeChance?: number;
		immolationDps?: number;
		hasReincarnated?: boolean;
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
			name: 'Тестовий боєць',
			team: options.team,
			lane: targetLane,
			x: options.x,
			y: targetY,
			prevX: options.x,
			prevY: targetY,
			hp: options.hp ?? 500,
			maxHp: options.maxHp ?? options.hp ?? 500,
			armor: options.armor ?? 2,
			armorType: 'medium',
			attackType: 'normal',
			damageMin: options.damage ?? 50,
			damageMax: options.damage ?? 50,
			damageBonusPct: 0,
			armorBonus: 0,
			attackCooldown: options.attackCooldown ?? 1.0,
			cooldownTimer: options.cooldownTimer ?? 0,
			range: options.range ?? 100,
			speed: options.speed ?? 100,
			flying: !!options.flying,
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
			hasReincarnated: options.hasReincarnated
		};
		this.units.push(unit);
		return unit;
	}

	public spawnBoss(): Unit {
		const lane: Lane = this.lastBossLane === 'bottom' ? 'top' : 'bottom';
		this.lastBossLane = lane;
		this.bossIndex++;

		const { boss: bossDef, index } = getRandomBoss(this.lastBossId);
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
		return this.workerSystem.repairBuilding(team, buildingInstanceId, player);
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
		player?: PlayerState
	): boolean {
		return this.buildingSystem.build(team, defId, tileX, tileY, lane, player);
	}

	public upgradeBuilding(
		team: MatchTeam,
		buildingInstanceId: string,
		targetDefId: string,
		player?: PlayerState
	): boolean {
		return this.buildingSystem.upgradeBuilding(team, buildingInstanceId, targetDefId, player);
	}

	public sellBuilding(team: MatchTeam, buildingInstanceId: string, player?: PlayerState): boolean {
		return this.buildingSystem.sellBuilding(team, buildingInstanceId, player);
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

	public spawnCoinDirectly(lane: Lane, x: number, y: number, value = 50): GoldCoin {
		return this.economySystem.spawnCoinDirectly(lane, x, y, value);
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

	public useRaceSkill(team: MatchTeam): boolean {
		return this.economySystem.useRaceSkill(team);
	}

	public getItemCooldown(team: MatchTeam, itemId: string): number {
		return this.economySystem.getItemCooldown(team, itemId);
	}

	public canBuyCastleItem(team: MatchTeam, itemId: string): boolean {
		return this.economySystem.canBuyCastleItem(team, itemId);
	}

	public buyCastleItem(team: MatchTeam, itemId: string): boolean {
		return this.economySystem.buyCastleItem(team, itemId);
	}

	public canUseRescueStrike(team: MatchTeam): boolean {
		return this.economySystem.canUseRescueStrike(team);
	}

	public triggerRescueStrike(team: MatchTeam): { hitCount: number; damageDealt: number } | null {
		return this.economySystem.triggerRescueStrike(team);
	}
}
