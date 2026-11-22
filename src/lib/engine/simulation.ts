import { WC3_PLAYER_COLORS } from './types';
import type {
	Unit,
	Building,
	Projectile,
	Castle,
	PlayerState,
	WorkerState,
	Team,
	MatchTeam,
	Lane,
	FloatingText,
	GoldCoin,
	ArmorType,
	AttackType,
	BuildingPerformance
} from './types';
import { SpatialHashGrid } from './spatialGrid';
import { calculateDamage } from './damageMatrix';
import {
	getBuilding,
	getUnit,
	getSpawnCooldown,
	resolveUnitAbility,
	isLegendaryBuilding,
	getBuilderNameForRace,
	RACES_LIST
} from './gameData';
import { getRaceAbility } from './raceAbilities';
import { getRandomBoss } from './bosses';
import { CASTLE_ITEMS } from './items';

export const ARENA_WIDTH = 2400;
export const ARENA_HEIGHT = 800;

export const TOP_LANE_Y = 220;
export const BOTTOM_LANE_Y = 580;

export const WEST_GRID_START_X = 120;
export const WEST_GRID_START_Y = 180;

export const EAST_GRID_START_X = 2100;
export const EAST_GRID_START_Y = 180;

export const CELL_SIZE = 55;

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
}

export class Simulation {
	public config: SimulationConfig;
	public tick = 0;
	public gameTime = 0; // seconds
	public isRunning = true;
	public speed = 1.0;
	public stateVersion = 0; // Incremented on any state change for fine-grained Svelte UI reactivity

	public readonly topLaneY = TOP_LANE_Y;
	public readonly bottomLaneY = BOTTOM_LANE_Y;

	public units: Unit[] = [];
	public buildings: Building[] = [];
	public projectiles: Projectile[] = [];
	public floatingTexts: FloatingText[] = [];

	public castles: Record<MatchTeam, Castle>;
	public players: Record<MatchTeam, PlayerState>;

	public spatialGrid = new SpatialHashGrid(80);

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
	private nextCoinId = 1;

	// MVP & Building Performance Breakdown
	public buildingStats: Record<string, BuildingPerformance> = {};

	// Callbacks
	public onFloatingText?: (text: FloatingText) => void;
	public onRoundEnd?: (winner: MatchTeam) => void;
	public onSoundEffect?: (
		sound: 'hit' | 'sword' | 'bow' | 'magic' | 'death' | 'buildingDestroyed'
	) => void;

	private nextUnitId = 1;
	private nextBuildingId = 1;
	private nextProjectileId = 1;
	private nextTextId = 1;

	constructor(config: SimulationConfig = { botDifficulty: 0, startGold: 500 }) {
		this.config = config;
		this.targetWins = config.targetWins ?? 2;
		this.castles = {
			west: { team: 'west', x: 60, y: 400, hp: 14000, maxHp: 14000 },
			east: { team: 'east', x: 2340, y: 400, hp: 14000, maxHp: 14000 }
		};

		const availableRaces = RACES_LIST.map((r) => r.race);
		const isAllRandom = !!config.allRandom;
		const isUniqueRaces = !!config.uniqueRaces;

		let westRace = config.westRace || 'Люди';
		const westIsRandom = isAllRandom || config.westRace === 'random';

		let eastRace = config.eastRace || 'Орки';
		const eastIsRandom = isAllRandom || config.eastRace === 'random' || config.botDifficulty > 0;

		if (isAllRandom) {
			westRace = availableRaces[Math.floor(Math.random() * availableRaces.length)];
			let eastPool = isUniqueRaces ? availableRaces.filter((r) => r !== westRace) : availableRaces;
			if (eastPool.length === 0) eastPool = availableRaces;
			eastRace = eastPool[Math.floor(Math.random() * eastPool.length)];
		} else {
			if (westIsRandom) {
				westRace = availableRaces[Math.floor(Math.random() * availableRaces.length)];
			}
			if (eastIsRandom && !config.eastRace) {
				let eastPool = isUniqueRaces
					? availableRaces.filter((r) => r !== westRace)
					: availableRaces;
				if (eastPool.length === 0) eastPool = availableRaces;
				eastRace = eastPool[Math.floor(Math.random() * eastPool.length)];
			}
		}

		const westGold = westIsRandom ? Math.round(config.startGold * 1.3) : config.startGold;
		const eastGold = eastIsRandom ? Math.round(config.startGold * 1.3) : config.startGold;

		const cWestIdx = Math.floor(Math.random() * WC3_PLAYER_COLORS.length);
		const cEastIdx =
			(cWestIdx + 1 + Math.floor(Math.random() * (WC3_PLAYER_COLORS.length - 1))) %
			WC3_PLAYER_COLORS.length;
		const westColor = WC3_PLAYER_COLORS[cWestIdx];
		const eastColor = WC3_PLAYER_COLORS[cEastIdx];

		this.players = {
			west: {
				team: 'west',
				isBot: false,
				name: 'Гравець',
				color: westColor,
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
					x: WEST_GRID_START_X - 45,
					y: (TOP_LANE_Y + BOTTOM_LANE_Y) / 2,
					targetX: WEST_GRID_START_X - 45,
					targetY: (TOP_LANE_Y + BOTTOM_LANE_Y) / 2,
					hp: 220,
					maxHp: 220,
					armor: 'Неуразливий',
					speed: 260,
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
			},
			east: {
				team: 'east',
				isBot: true,
				name: 'Бот v37',
				color: eastColor,
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
					x: EAST_GRID_START_X + 3 * CELL_SIZE + 45,
					y: (TOP_LANE_Y + BOTTOM_LANE_Y) / 2,
					targetX: EAST_GRID_START_X + 3 * CELL_SIZE + 45,
					targetY: (TOP_LANE_Y + BOTTOM_LANE_Y) / 2,
					hp: 220,
					maxHp: 220,
					armor: 'Неуразливий',
					speed: 260,
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
			}
		};
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
		this.bossSpawnTimer = 180.0;
		this.bossIndex = 0;
		this.lastBossLane = 'bottom';
		this.lastBossId = -1;
		this.activeBossInstanceId = null;
		this.goldCoins = [];
		this.coinSpawnTimer = this.coinSpawnInterval;
		this.winner = null;
		this.roundWinner = null;
		this.buildingStats = {};

		for (const team of ['west', 'east'] as MatchTeam[]) {
			const p = this.players[team];
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
			if (newRaces?.[team]) {
				p.race = newRaces[team]!;
			}
		}

		if (this.players.west.worker) {
			this.players.west.worker.name = getBuilderNameForRace(this.players.west.race);
			this.players.west.worker.x = WEST_GRID_START_X - 45;
			this.players.west.worker.y = (TOP_LANE_Y + BOTTOM_LANE_Y) / 2;
			this.players.west.worker.targetX = WEST_GRID_START_X - 45;
			this.players.west.worker.targetY = (TOP_LANE_Y + BOTTOM_LANE_Y) / 2;
			this.players.west.worker.isBuilding = false;
			this.players.west.worker.targetBuildingId = null;
		}
		if (this.players.east.worker) {
			this.players.east.worker.name = getBuilderNameForRace(this.players.east.race);
			this.players.east.worker.x = EAST_GRID_START_X + 3 * CELL_SIZE + 45;
			this.players.east.worker.y = (TOP_LANE_Y + BOTTOM_LANE_Y) / 2;
			this.players.east.worker.targetX = EAST_GRID_START_X + 3 * CELL_SIZE + 45;
			this.players.east.worker.targetY = (TOP_LANE_Y + BOTTOM_LANE_Y) / 2;
			this.players.east.worker.isBuilding = false;
			this.players.east.worker.targetBuildingId = null;
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

		// Update Workers position, obstacle navigation, and construction
		for (const team of ['west', 'east'] as MatchTeam[]) {
			const w = this.players[team]?.worker;
			if (!w) continue;

			const targetBld = w.targetBuildingId
				? this.buildings.find((b) => b.instanceId === w.targetBuildingId)
				: null;

			if (targetBld && targetBld.isUnderConstruction) {
				const isWest = targetBld.team === 'west';
				// Stand at exterior scaffolding (outside solid building core)
				const exteriorTargetX = isWest ? targetBld.x - 16 : targetBld.x + CELL_SIZE + 16;
				const exteriorTargetY = targetBld.y + CELL_SIZE / 2;
				w.targetX = exteriorTargetX;
				w.targetY = exteriorTargetY;

				const dist = Math.hypot(exteriorTargetX - w.x, exteriorTargetY - w.y);
				if (dist <= 24) {
					// In building construction range!
					w.isBuilding = true;
					w.path = [];
					targetBld.buildProgress = (targetBld.buildProgress || 0) + dt;
					const maxProg = targetBld.maxBuildProgress || 3.5;
					targetBld.hp = Math.min(
						targetBld.maxHp,
						Math.round(targetBld.maxHp * (0.15 + 0.85 * (targetBld.buildProgress / maxProg)))
					);

					if (targetBld.buildProgress >= maxProg) {
						targetBld.isUnderConstruction = false;
						targetBld.hp = targetBld.maxHp;
						w.isBuilding = false;
						w.targetBuildingId = null;
						this.addFloatingText(
							'+Готово!',
							targetBld.x + CELL_SIZE / 2,
							targetBld.y - 15,
							'#22c55e'
						);
						this.onSoundEffect?.('sword');
					}
				} else {
					w.isBuilding = false;
					this.advanceWorkerAlongPath(w, team, exteriorTargetX, exteriorTargetY, dt, 20);
				}
			} else {
				if (w.targetBuildingId) {
					w.targetBuildingId = null;
					w.isBuilding = false;
				}

				if (w.targetRepairBuildingId) {
					const repTarget =
						this.buildings.find((b) => b.instanceId === w.targetRepairBuildingId) ||
						(w.targetRepairBuildingId.startsWith('castle') ? this.castles[team] : null);
					if (repTarget && repTarget.hp < repTarget.maxHp) {
						const tx = repTarget === this.castles[team] ? repTarget.x : repTarget.x + CELL_SIZE / 2;
						const ty = repTarget === this.castles[team] ? repTarget.y : repTarget.y + CELL_SIZE / 2;
						w.targetX = tx;
						w.targetY = ty;
						const dist = Math.hypot(tx - w.x, ty - w.y);
						if (dist <= 85) {
							w.isBuilding = true;
							w.isRepairing = true;
							w.path = [];
							const healAmount = Math.min(repTarget.maxHp - repTarget.hp, 50 * dt);
							repTarget.hp += healAmount;
							if (this.players[team].gold >= 1) {
								this.players[team].gold = Math.max(0, this.players[team].gold - Math.round(2 * dt));
							}
							if (repTarget.hp >= repTarget.maxHp) {
								w.isRepairing = false;
								w.isBuilding = false;
								w.targetRepairBuildingId = null;
								this.addFloatingText('Відремонтовано!', w.x, w.y - 20, '#10b981');
							}
						} else {
							w.isBuilding = false;
							this.advanceWorkerAlongPath(w, team, tx, ty, dt, 75);
						}
					} else {
						w.isRepairing = false;
						w.isBuilding = false;
						w.targetRepairBuildingId = null;
					}
				} else {
					const dist = Math.hypot(w.targetX - w.x, w.targetY - w.y);
					if (dist > 3) {
						this.advanceWorkerAlongPath(w, team, w.targetX, w.targetY, dt, 3);
					}
				}
			}
		}

		for (const team of ['west', 'east'] as MatchTeam[]) {
			for (const itemId in this.itemCooldowns[team]) {
				if (this.itemCooldowns[team][itemId] > 0) {
					this.itemCooldowns[team][itemId] = Math.max(0, this.itemCooldowns[team][itemId] - dt);
				}
			}
		}

		// Boss timer countdown
		if (!this.activeBossInstanceId) {
			this.bossSpawnTimer -= dt;
			if (this.bossSpawnTimer <= 0) {
				this.spawnBoss();
			}
		}

		// 1. Update Battlefield Gold Coins (I000)
		this.updateGoldCoins(dt);

		// 2. Update Economy
		this.updateEconomy(dt);

		// 3. Update Buildings & Spawning
		this.updateBuildings(dt);

		// 3. Update Spatial Grid
		this.spatialGrid.clear();
		for (const unit of this.units) {
			if (unit.state !== 'DEAD') {
				this.spatialGrid.insert(unit);
			}
		}

		// 4. Update Units
		this.updateUnits(dt);

		// 5. Update Projectiles
		this.updateProjectiles(dt);

		// 6. Update Castles defense
		this.updateCastles(dt);
		this.updateTowers(dt);

		// 7. Update Floating texts
		this.updateFloatingTexts(dt);

		// 8. Cleanup dead entities
		this.units = this.units.filter((u) => u.state !== 'DEAD' || (u.deathTimer ?? 0) > 0);
		this.projectiles = this.projectiles.filter((p) => p.damage > 0);

		// 9. Check Win Condition
		if (this.castles.west.hp <= 0 && !this.winner) {
			this.winner = 'east';
			this.roundWinner = 'east';
			this.score.east++;
			if (this.score.east >= this.targetWins) {
				this.matchWinner = 'east';
			}
			this.onRoundEnd?.('east');
			this.notifyStateChanged();
		} else if (this.castles.east.hp <= 0 && !this.winner) {
			this.winner = 'west';
			this.roundWinner = 'west';
			this.score.west++;
			if (this.score.west >= this.targetWins) {
				this.matchWinner = 'west';
			}
			this.onRoundEnd?.('west');
			this.notifyStateChanged();
		}
	}

	// --- ECONOMY ---
	public calculateIncome(team: MatchTeam): number {
		let cfM = 0.65;
		if (this.gameTime >= 1500) {
			cfM = 1.0;
		} else if (this.gameTime >= 960) {
			cfM = 0.85;
		} else if (this.gameTime >= 480) {
			cfM = 0.75;
		}
		const player = this.players[team];
		if (!player) return 15;

		const bldValue = this.buildings
			.filter((b) => b.team === team)
			.reduce((sum, b) => sum + b.goldCost, 0);

		const baseIncome = 10 * (0.5 + 0.002 * bldValue);
		let multiplier = cfM * (1 + 0.1 * player.forge.econ);

		if (player.commander === 1) {
			multiplier += cfM * 0.12;
		}

		const myCastle = this.castles[team];
		if (myCastle && myCastle.hp / myCastle.maxHp <= 0.7) {
			multiplier *= 1.15;
		}

		const treasureBoxes = this.buildings.filter(
			(b) => b.team === team && b.specialType === 'treasure'
		).length;
		if (treasureBoxes > 0) {
			multiplier *= 1 + 0.2 * treasureBoxes;
		}

		return Math.max(5, Math.round(baseIncome * multiplier));
	}

	private updateEconomy(dt: number): void {
		let interval = 3.0;
		if (this.gameTime >= 1500) {
			interval = 10.0;
		} else if (this.gameTime >= 960) {
			interval = 7.0;
		} else if (this.gameTime >= 480) {
			interval = 5.0;
		}
		this.incomeInterval = interval;
		this.incomeTimer -= dt;

		if (this.incomeTimer <= 0) {
			this.incomeTimer = interval;

			for (const team of ['west', 'east'] as MatchTeam[]) {
				const player = this.players[team];
				const myCastle = this.castles[team];
				const payout = this.calculateIncome(team);
				player.gold += payout;

				// Spawn income text above castle
				this.addFloatingText(`+${payout}g`, myCastle.x, myCastle.y - 50, '#fbbf24');
			}

			this.notifyStateChanged();
		}
	}

	// --- BATTLEFIELD GOLD COINS (I000) ---
	private updateGoldCoins(dt: number): void {
		this.coinSpawnTimer -= dt;
		if (this.coinSpawnTimer <= 0.001) {
			this.coinSpawnTimer = this.coinSpawnInterval;
			const lane: Lane = Math.random() < 0.5 ? 'top' : 'bottom';
			const laneY = lane === 'top' ? TOP_LANE_Y : BOTTOM_LANE_Y;
			const coin: GoldCoin = {
				id: `coin_${this.nextCoinId++}`,
				lane,
				x: 850 + Math.random() * 700,
				y: laneY + (Math.random() * 30 - 15),
				value: 50,
				lifeTime: 35.0,
				maxLifeTime: 35.0
			};
			this.goldCoins.push(coin);
			this.notifyStateChanged();
		}

		for (let i = this.goldCoins.length - 1; i >= 0; i--) {
			const coin = this.goldCoins[i];
			coin.lifeTime -= dt;
			if (coin.lifeTime <= 0) {
				this.goldCoins.splice(i, 1);
				this.notifyStateChanged();
				continue;
			}

			// Check pickup by living units on the same lane
			for (const u of this.units) {
				if (u.state === 'DEAD' || u.lane !== coin.lane) continue;
				const dx = u.x - coin.x;
				const dy = u.y - coin.y;
				if (dx * dx + dy * dy <= 45 * 45) {
					if (u.team === 'west' || u.team === 'east') {
						this.collectCoin(coin.id, u.team);
						break;
					}
				}
			}
		}
	}

	public collectCoin(coinId: string, team: MatchTeam): boolean {
		const idx = this.goldCoins.findIndex((c) => c.id === coinId);
		if (idx === -1) return false;
		const coin = this.goldCoins[idx];
		this.goldCoins.splice(idx, 1);
		this.players[team].gold += coin.value;
		this.players[team].stats.coinsCollected++;
		this.addFloatingText(`+${coin.value}g Монета!`, coin.x, coin.y - 20, '#fbbf24');
		this.notifyStateChanged();
		return true;
	}

	public spawnCoinDirectly(lane: Lane, x: number, y: number, value = 50): GoldCoin {
		const coin: GoldCoin = {
			id: `coin_${this.nextCoinId++}`,
			lane,
			x,
			y,
			value,
			lifeTime: 35.0,
			maxLifeTime: 35.0
		};
		this.goldCoins.push(coin);
		this.notifyStateChanged();
		return coin;
	}

	// --- BUILDINGS ---
	private updateBuildings(dt: number): void {
		for (const b of this.buildings) {
			if (b.isUnderConstruction) {
				continue;
			}
			if (b.specialType === 'repair') {
				b.spawnTimer -= dt;
				if (b.spawnTimer <= 0) {
					b.spawnTimer = 1.0;
					const castle = this.castles[b.team];
					if (castle.hp < castle.maxHp) {
						castle.hp = Math.min(castle.maxHp, castle.hp + 25);
						this.addFloatingText('+25 HP', castle.x, castle.y - 45, '#10b981');
					}
				}
				continue;
			}
			if (b.specialType) {
				continue;
			}

			b.spawnTimer -= dt;
			if (b.spawnTimer <= 0) {
				b.spawnTimer = b.spawnCooldown;
				this.spawnUnitFromBuilding(b);
			}
		}
	}

	public spawnUnitFromBuilding(building: Building): Unit | null {
		const unitDef = getUnit(building.spawnUnitId);
		if (!unitDef) return null;

		const player = this.players[building.team];
		player.stats.unitsSpawned++;

		// Determine lane
		let lane: Lane;
		if (player.preferredLane !== 'auto') {
			lane = player.preferredLane;
		} else {
			lane = building.y < ARENA_HEIGHT / 2 ? 'top' : 'bottom';
		}

		const laneY = lane === 'top' ? TOP_LANE_Y : BOTTOM_LANE_Y;
		const isWest = building.team === 'west';
		// Spawn at the front doorway facing the road (outside solid building core)
		const rawSpawnX = isWest ? building.x + CELL_SIZE + 16 : building.x - 16;
		const rawSpawnY = building.y + CELL_SIZE / 2;
		const spawnPos = unitDef.flying
			? { x: rawSpawnX, y: rawSpawnY }
			: this.resolveGroundObstacles(rawSpawnX, rawSpawnY, 12);
		const spawnX = spawnPos.x;
		const spawnY = spawnPos.y;

		// Calculate commander & forge bonuses
		let damageBonusPct = player.forge.attack * 0.08;
		const armorBonus = player.forge.armor * 1.0;
		let attackSpeedMult = 1.0;

		// Commander 3 (Dima): +24% damage
		if (player.commander === 3) damageBonusPct += 0.24;
		// Commander 4 (Dan): +24% attack speed
		if (player.commander === 4) attackSpeedMult *= 1.24;

		const baseMin = unitDef.damage_base ?? 10;
		const dice = unitDef.damage_dice ?? 1;
		const sides = unitDef.damage_sides ?? 6;
		const baseMax = baseMin + dice * sides;

		const cooldown = Math.max(0.4, (unitDef.cooldown ?? 1.5) / attackSpeedMult);

		const unit: Unit = {
			instanceId: `unit_${this.nextUnitId++}`,
			defId: unitDef.id,
			name: unitDef.name || 'Боєць',
			team: building.team,
			lane,
			x: spawnX,
			y: spawnY,
			prevX: spawnX,
			prevY: spawnY,
			hp: unitDef.hp ?? 300,
			maxHp: unitDef.hp ?? 300,
			armor: (unitDef.armor ?? 2) + armorBonus,
			armorType: (unitDef.armor_type as ArmorType) || 'medium',
			attackType: (unitDef.attack_type as AttackType) || 'normal',
			damageMin: Math.round(baseMin * (1 + damageBonusPct)),
			damageMax: Math.round(baseMax * (1 + damageBonusPct)),
			damageBonusPct,
			armorBonus,
			attackCooldown: cooldown,
			cooldownTimer: Math.random() * 0.3,
			range: Math.max(90, unitDef.range ?? 100),
			speed: (Number(unitDef.raw_fields?.umvs) || 270) * 0.36,
			flying: !!unitDef.flying,
			currentTargetId: null,
			targetX: building.team === 'west' ? ARENA_WIDTH - 80 : 80,
			targetY: laneY,
			state: 'WALKING',
			size: unitDef.flying ? 20 : 15,
			critChance: player.commander === 5 ? 0.25 : 0,
			evadeChance: player.commander === 6 ? 0.2 : 0,
			splashRadius:
				unitDef.attack_type === 'siege' || unitDef.raw_fields?.ua1w === 'msplash' ? 110 : undefined,
			isScavenger: building.race === 'Сборщики',
			reflectDamagePct:
				building.race === 'Нічні ельфи' && unitDef.armor_type === 'heavy' ? 0.2 : undefined,
			buildingDefId: building.defId,
			buildingName: building.name,
			abilityType: resolveUnitAbility(unitDef),
			abilityCooldownTimer: 0
		};

		this.units.push(unit);
		this.notifyStateChanged();
		return unit;
	}

	/**
	 * Helper for automated testing & debug spawning
	 */
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
		abilityType?: 'ensnare' | 'poison' | 'heal' | 'bash' | 'aura_dmg' | 'none';
		flying?: boolean;
	}): Unit {
		const unit: Unit = {
			instanceId: `test_unit_${this.nextUnitId++}`,
			defId: 'test',
			name: 'Тестовий боєць',
			team: options.team,
			lane: options.lane,
			x: options.x,
			y: options.y,
			prevX: options.x,
			prevY: options.y,
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
			targetX: options.team === 'west' ? ARENA_WIDTH - 80 : 80,
			targetY: options.y,
			state: 'WALKING',
			size: options.flying ? 20 : 15,
			splashRadius: options.splashRadius,
			reflectDamagePct: options.reflectDamagePct,
			isScavenger: options.isScavenger,
			abilityType: options.abilityType || 'none',
			abilityCooldownTimer: 0
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
		this.notifyStateChanged();
		return unit;
	}

	// --- UNITS ---
	private updateUnits(dt: number): void {
		for (const u of this.units) {
			if (u.state === 'DEAD') {
				u.deathTimer = (u.deathTimer ?? 0.7) - dt;
				continue;
			}

			// Process active buffs
			if (u.buffs && u.buffs.length > 0) {
				for (const b of u.buffs) {
					b.timer -= dt;
					if (b.type === 'infect' || b.type === 'poison') {
						u.hp -= b.value * dt;
					}
				}
				u.buffs = u.buffs.filter((b) => b.timer > 0);
				if (u.hp <= 0) {
					u.state = 'DEAD';
					continue;
				}
			}

			// Stun check: stunned units cannot move or attack
			const isStunned = u.buffs?.some((b) => b.type === 'stun');
			u.isStunned = !!isStunned;
			if (isStunned) {
				continue;
			}

			// Ensnare check: grounded while ensnared
			const isEnsnared = u.buffs?.some((b) => b.type === 'ensnare');
			u.isEnsnared = !!isEnsnared;
			if (isEnsnared) {
				u.flying = false;
			}

			// Tactical abilities cooldown tick
			if (u.abilityCooldownTimer && u.abilityCooldownTimer > 0) {
				u.abilityCooldownTimer = Math.max(0, u.abilityCooldownTimer - dt);
			}

			// 1. Ensnare ability (Web down flying enemies)
			if (u.abilityType === 'ensnare' && (!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0)) {
				const enemyFlying = this.units.find(
					(other) =>
						other.team !== u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						other.flying &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 450
				);
				if (enemyFlying) {
					enemyFlying.buffs = enemyFlying.buffs || [];
					enemyFlying.buffs.push({ type: 'ensnare', timer: 6.0, value: 0 });
					enemyFlying.flying = false;
					enemyFlying.isEnsnared = true;
					u.abilityCooldownTimer = 12.0;
					this.addFloatingText('Сітка!', enemyFlying.x, enemyFlying.y - 20, '#a3e635');
				}
			}

			// 2. Heal ability (Support wounded allies)
			if (u.abilityType === 'heal' && (!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0)) {
				const injuredAlly = this.units.find(
					(other) =>
						other.team === u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						other.hp < other.maxHp &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 350
				);
				if (injuredAlly) {
					injuredAlly.hp = Math.min(injuredAlly.maxHp, injuredAlly.hp + 65);
					u.abilityCooldownTimer = 3.5;
					this.addFloatingText('+65 HP', injuredAlly.x, injuredAlly.y - 20, '#10b981');
				}
			}

			// 3. Command Aura (Buff nearby allies damage)
			if (u.abilityType === 'aura_dmg') {
				for (const ally of this.units) {
					if (
						ally.team === u.team &&
						ally.lane === u.lane &&
						ally.state !== 'DEAD' &&
						ally.instanceId !== u.instanceId &&
						Math.hypot(ally.x - u.x, ally.y - u.y) <= 300
					) {
						ally.buffs = ally.buffs || [];
						if (!ally.buffs.some((b) => b.type === 'dmg' && b.value === 0.15)) {
							ally.buffs.push({ type: 'dmg', timer: 1.5, value: 0.15 });
						}
					}
				}
			}

			u.prevX = u.x;
			u.prevY = u.y;
			u.cooldownTimer -= dt;

			let currentSpeed = u.speed;
			if (u.buffs?.some((b) => b.type === 'slow')) {
				currentSpeed *= 0.5;
			}
			if (u.buffs?.some((b) => b.type === 'weakness')) {
				currentSpeed *= 0.75;
			}

			const targetLaneY = u.lane === 'top' ? TOP_LANE_Y : BOTTOM_LANE_Y;

			// Target Acquisition:
			// STRICT LANE SEPARATION: only find enemy on the same lane!
			const enemyTarget = this.spatialGrid.findClosestEnemy(
				u.x,
				u.y,
				Math.max(u.range, 350),
				u.team,
				u.lane, // Filters strictly to u.lane!
				u.range > 120 // ranged units can hit air
			);

			if (enemyTarget && enemyTarget.hp > 0 && enemyTarget.lane === u.lane) {
				const dx = enemyTarget.x - u.x;
				const dy = enemyTarget.y - u.y;
				const dist = Math.hypot(dx, dy);

				if (dist <= u.range) {
					// In range -> ATTACK
					u.state = 'ATTACKING';
					u.currentTargetId = enemyTarget.instanceId;

					if (u.cooldownTimer <= 0) {
						let cd = u.attackCooldown;
						if (u.buffs?.some((b) => b.type === 'as')) {
							cd *= 0.75;
						}
						if (u.buffs?.some((b) => b.type === 'weakness')) {
							cd *= 1.4;
						}
						u.cooldownTimer = cd;
						this.performAttack(u, enemyTarget);
					}
				} else {
					// Move towards enemy on the lane
					u.state = 'WALKING';
					const dirX = dx / dist;
					const dirY = dy / dist;
					u.x += dirX * currentSpeed * dt;
					u.y += dirY * currentSpeed * dt;
				}
			} else if (u.team === 'neutral') {
				// Boss Leash & Patrol: Stay near center of the lane (leash radius 400)
				u.currentTargetId = null;
				const centerX = ARENA_WIDTH / 2;
				const dx = centerX - u.x;
				const dy = targetLaneY - u.y;
				const dist = Math.hypot(dx, dy);
				if (dist > 15) {
					u.state = 'WALKING';
					u.x += (dx / dist) * currentSpeed * dt;
					u.y += (dy / dist) * currentSpeed * dt;
				} else {
					u.state = 'WALKING';
				}
			} else {
				// No enemy units on this lane -> Check for enemy buildings in the base
				const enemyTeam: MatchTeam = u.team === 'west' ? 'east' : 'west';
				let targetBuilding: Building | null = null;
				const isNearEnemyBase = u.team === 'west' ? u.x >= ARENA_WIDTH - 550 : u.x <= 550;

				if (isNearEnemyBase) {
					let closestBldDist = Infinity;
					for (const b of this.buildings) {
						if (b.team !== enemyTeam || b.hp <= 0) continue;
						const bx = b.x + CELL_SIZE / 2;
						const by = b.y + CELL_SIZE / 2;
						const d = Math.hypot(bx - u.x, by - u.y);
						if (d < closestBldDist && d <= Math.max(u.range + 80, 500)) {
							closestBldDist = d;
							targetBuilding = b;
						}
					}
				}

				if (targetBuilding) {
					const bDist = Math.hypot(
						targetBuilding.x + CELL_SIZE / 2 - u.x,
						targetBuilding.y + CELL_SIZE / 2 - u.y
					);
					if (bDist <= u.range + 30) {
						u.state = 'ATTACKING';
						u.currentTargetId = null;
						u.targetBuildingId = targetBuilding.instanceId;
						if (u.cooldownTimer <= 0) {
							let cd = u.attackCooldown;
							if (u.buffs?.some((b) => b.type === 'as')) cd *= 0.75;
							if (u.buffs?.some((b) => b.type === 'weakness')) cd *= 1.4;
							u.cooldownTimer = cd;
							this.performAttackBuilding(u, targetBuilding);
						}
					} else {
						u.state = 'WALKING';
						u.currentTargetId = null;
						u.targetBuildingId = targetBuilding.instanceId;
						const dirX = (targetBuilding.x + CELL_SIZE / 2 - u.x) / bDist;
						const dirY = (targetBuilding.y + CELL_SIZE / 2 - u.y) / bDist;
						u.x += dirX * currentSpeed * dt;
						u.y += dirY * currentSpeed * dt;
					}
				} else {
					// No enemy nearby and no buildings -> March towards Castle
					u.currentTargetId = null;
					u.targetBuildingId = null;
					const targetCastle = u.team === 'west' ? this.castles.east : this.castles.west;
					const distToCastle = Math.hypot(targetCastle.x - u.x, targetCastle.y - u.y);

					if (distToCastle <= u.range + 65) {
						u.state = 'ATTACKING';
						if (u.cooldownTimer <= 0) {
							let cd = u.attackCooldown;
							if (u.buffs?.some((b) => b.type === 'as')) {
								cd *= 0.75;
							}
							if (u.buffs?.some((b) => b.type === 'weakness')) {
								cd *= 1.4;
							}
							u.cooldownTimer = cd;
							this.attackCastle(u, targetCastle);
						}
					} else if (isNearEnemyBase) {
						// Converge onto Castle gate at (targetCastle.x, targetCastle.y)
						u.state = 'WALKING';
						const dirX = (targetCastle.x - u.x) / distToCastle;
						const dirY = (targetCastle.y - u.y) / distToCastle;
						u.x += dirX * currentSpeed * dt;
						u.y += dirY * currentSpeed * dt;
					} else {
						u.state = 'WALKING';
						// Natural march toward enemy base!
						// On home base: march straight ahead; natural walls and buildings channel units to the courtyard exit.
						// On the highway corridor: smooth centering along the lane road.
						const isHomeBase = u.team === 'west' ? u.x < 450 : u.x > 1950;
						let stepY = 0;
						if (!isHomeBase) {
							const dyToLane = targetLaneY - u.y;
							if (Math.abs(dyToLane) > 4) {
								stepY = Math.sign(dyToLane) * Math.min(Math.abs(dyToLane), currentSpeed * dt * 0.5);
							}
						}
						const stepX = (u.team === 'west' ? 1 : -1) * currentSpeed * dt;
						u.x += stepX;
						u.y += stepY;
					}
				}
			}

			// Enforce solid obstacle collision for ground units (flying units glide freely over buildings)
			if (!u.flying) {
				const resolved = this.resolveGroundObstacles(u.x, u.y, u.size);
				u.x = resolved.x;
				u.y = resolved.y;
			}
		}

		// Apply Crowd Physics & Boids Separation
		this.applyCrowdSeparation(dt);
	}

	/**
	 * Resolves solid obstacles (2x2 buildings and dividing stone walls) for ground entities.
	 * Pushes the entity out of the solid box along the shortest normal to allow smooth sliding around corners.
	 */
	public resolveGroundObstacles(x: number, y: number, radius: number): { x: number; y: number } {
		let currX = x;
		let currY = y;

		// 1. Solid Buildings (2x2 footprint)
		for (const b of this.buildings) {
			const minX = b.x;
			const maxX = b.x + CELL_SIZE;
			const minY = b.y;
			const maxY = b.y + CELL_SIZE;

			const closestX = Math.max(minX, Math.min(maxX, currX));
			const closestY = Math.max(minY, Math.min(maxY, currY));
			const diffX = currX - closestX;
			const diffY = currY - closestY;
			const dist = Math.hypot(diffX, diffY);

			if (dist < radius) {
				if (dist > 0.001) {
					// Outside or touching: push out along normal
					currX = closestX + (diffX / dist) * radius;
					currY = closestY + (diffY / dist) * radius;
				} else {
					// Inside the building box: find closest face to push out
					const dLeft = currX - minX;
					const dRight = maxX - currX;
					const dTop = currY - minY;
					const dBottom = maxY - currY;
					const minD = Math.min(dLeft, dRight, dTop, dBottom);
					if (minD === dLeft) currX = minX - radius;
					else if (minD === dRight) currX = maxX + radius;
					else if (minD === dTop) currY = minY - radius;
					else currY = maxY + radius;
				}
			}
		}

		// 2. Solid Map Walls & Terrain Obstacles
		const solidWalls = [
			// West dividing stone wall (between top and bottom base courtyard)
			{ minX: 70, maxX: 460, minY: 370, maxY: 430 },
			// East dividing stone wall (between top and bottom base courtyard)
			{ minX: 1940, maxX: 2330, minY: 370, maxY: 430 },
			// Central Mountain Ridge (dividing Top and Bottom lanes)
			{ minX: 450, maxX: 1950, minY: 340, maxY: 460 },
			// Arena Upper Perimeter Wall
			{ minX: 0, maxX: ARENA_WIDTH, minY: 0, maxY: 50 },
			// Arena Lower Perimeter Wall
			{ minX: 0, maxX: ARENA_WIDTH, minY: 750, maxY: ARENA_HEIGHT }
		];

		for (const wall of solidWalls) {
			if (
				currX >= wall.minX - radius &&
				currX <= wall.maxX + radius &&
				currY >= wall.minY - radius &&
				currY <= wall.maxY + radius
			) {
				const cX = Math.max(wall.minX, Math.min(wall.maxX, currX));
				const cY = Math.max(wall.minY, Math.min(wall.maxY, currY));
				const dX = currX - cX;
				const dY = currY - cY;
				const d = Math.hypot(dX, dY);
				if (d < radius) {
					if (d > 0.001) {
						currX = cX + (dX / d) * radius;
						currY = cY + (dY / d) * radius;
					} else {
						const dLeft = currX - wall.minX;
						const dRight = wall.maxX - currX;
						const dTop = currY - wall.minY;
						const dBottom = wall.maxY - currY;
						const minD = Math.min(dLeft, dRight, dTop, dBottom);
						if (minD === dLeft) currX = wall.minX - radius;
						else if (minD === dRight) currX = wall.maxX + radius;
						else if (minD === dTop) currY = wall.minY - radius;
						else currY = wall.maxY + radius;
					}
				}
			}
		}

		return { x: currX, y: currY };
	}

	/**
	 * Checks if a point is impassable for a worker (colliding with buildings or terrain obstacles).
	 */
	public isPointBlockedForWorker(team: MatchTeam, x: number, y: number, radius = 14): boolean {
		// Base territory boundaries
		if (team === 'west') {
			if (x < 60 || x > 660 || y < 55 || y > ARENA_HEIGHT - 55) return true;
			// West Castle
			if (x >= 20 - radius && x <= 130 + radius && y >= 320 - radius && y <= 480 + radius)
				return true;
			// West dividing stone wall
			if (x >= 70 - radius && x <= 460 + radius && y >= 370 - radius && y <= 430 + radius)
				return true;
		} else {
			if (x < ARENA_WIDTH - 660 || x > ARENA_WIDTH - 60 || y < 55 || y > ARENA_HEIGHT - 55)
				return true;
			// East Castle
			if (x >= 2270 - radius && x <= 2380 + radius && y >= 320 - radius && y <= 480 + radius)
				return true;
			// East dividing stone wall
			if (x >= 1940 - radius && x <= 2330 + radius && y >= 370 - radius && y <= 430 + radius)
				return true;
		}

		// Perimeter walls
		if (y < 50 + radius || y > ARENA_HEIGHT - 50 - radius) return true;

		// Solid buildings (2x2 footprint)
		for (const b of this.buildings) {
			if (
				x >= b.x - radius &&
				x <= b.x + CELL_SIZE + radius &&
				y >= b.y - radius &&
				y <= b.y + CELL_SIZE + radius
			) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Checks if direct straight line between (x1, y1) and (x2, y2) is free of obstacles for worker.
	 */
	public isWorkerLineClear(
		team: MatchTeam,
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		radius = 14
	): boolean {
		const dist = Math.hypot(x2 - x1, y2 - y1);
		if (dist < 2) return true;
		const steps = Math.ceil(dist / 14);
		for (let s = 1; s <= steps; s++) {
			const t = s / steps;
			const px = x1 + (x2 - x1) * t;
			const py = y1 + (y2 - y1) * t;
			if (this.isPointBlockedForWorker(team, px, py, radius)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Computes an obstacle-avoiding waypoint path for the worker using A* on the base grid.
	 */
	public findWorkerPath(
		team: MatchTeam,
		startX: number,
		startY: number,
		targetX: number,
		targetY: number
	): { x: number; y: number }[] {
		// 1. Direct line check: if straight path is unobstructed, no waypoints needed!
		if (this.isWorkerLineClear(team, startX, startY, targetX, targetY)) {
			return [{ x: targetX, y: targetY }];
		}

		// 2. Setup A* navigation grid across the base courtyard
		const minX = team === 'west' ? 80 : 1760;
		const maxX = team === 'west' ? 620 : 2300;
		const minY = 65;
		const maxY = ARENA_HEIGHT - 65;
		const step = 25;

		const cols = Math.floor((maxX - minX) / step) + 1;
		const rows = Math.floor((maxY - minY) / step) + 1;

		const getNodeX = (c: number) => minX + c * step;
		const getNodeY = (r: number) => minY + r * step;

		const clampCol = (c: number) => Math.max(0, Math.min(cols - 1, c));
		const clampRow = (r: number) => Math.max(0, Math.min(rows - 1, r));

		const startCol = clampCol(Math.round((startX - minX) / step));
		const startRow = clampRow(Math.round((startY - minY) / step));
		let endCol = clampCol(Math.round((targetX - minX) / step));
		let endRow = clampRow(Math.round((targetY - minY) / step));

		// If end node itself is blocked, find closest walkable node to end
		if (this.isPointBlockedForWorker(team, getNodeX(endCol), getNodeY(endRow))) {
			let bestDist = Infinity;
			let bestC = endCol;
			let bestR = endRow;
			for (let dc = -2; dc <= 2; dc++) {
				for (let dr = -2; dr <= 2; dr++) {
					const nc = clampCol(endCol + dc);
					const nr = clampRow(endRow + dr);
					const nx = getNodeX(nc);
					const ny = getNodeY(nr);
					if (!this.isPointBlockedForWorker(team, nx, ny)) {
						const d = Math.hypot(targetX - nx, targetY - ny);
						if (d < bestDist) {
							bestDist = d;
							bestC = nc;
							bestR = nr;
						}
					}
				}
			}
			endCol = bestC;
			endRow = bestR;
		}

		const startIndex = startRow * cols + startCol;
		const endIndex = endRow * cols + endCol;

		if (startIndex === endIndex) {
			return [{ x: targetX, y: targetY }];
		}

		const openSet: number[] = [startIndex];
		const cameFrom = new Map<number, number>();
		const gScore = new Map<number, number>();
		const fScore = new Map<number, number>();

		gScore.set(startIndex, 0);
		fScore.set(
			startIndex,
			Math.hypot(getNodeX(endCol) - getNodeX(startCol), getNodeY(endRow) - getNodeY(startRow))
		);

		const DIRS = [
			{ dc: 1, dr: 0, cost: 1.0 },
			{ dc: -1, dr: 0, cost: 1.0 },
			{ dc: 0, dr: 1, cost: 1.0 },
			{ dc: 0, dr: -1, cost: 1.0 },
			{ dc: 1, dr: 1, cost: 1.414 },
			{ dc: -1, dr: 1, cost: 1.414 },
			{ dc: 1, dr: -1, cost: 1.414 },
			{ dc: -1, dr: -1, cost: 1.414 }
		];

		let iterations = 0;
		let foundEnd = false;

		while (openSet.length > 0 && iterations < 700) {
			iterations++;
			let bestIdx = 0;
			let lowestF = fScore.get(openSet[0]) ?? Infinity;
			for (let i = 1; i < openSet.length; i++) {
				const f = fScore.get(openSet[i]) ?? Infinity;
				if (f < lowestF) {
					lowestF = f;
					bestIdx = i;
				}
			}

			const current = openSet.splice(bestIdx, 1)[0];
			if (current === endIndex) {
				foundEnd = true;
				break;
			}

			const currC = current % cols;
			const currR = Math.floor(current / cols);
			const currG = gScore.get(current) ?? Infinity;

			for (const dir of DIRS) {
				const nc = currC + dir.dc;
				const nr = currR + dir.dr;
				if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;

				const nx = getNodeX(nc);
				const ny = getNodeY(nr);
				if (this.isPointBlockedForWorker(team, nx, ny)) continue;

				const neighborIdx = nr * cols + nc;
				const tentG = currG + dir.cost * step;

				if (tentG < (gScore.get(neighborIdx) ?? Infinity)) {
					cameFrom.set(neighborIdx, current);
					gScore.set(neighborIdx, tentG);
					const h = Math.hypot(getNodeX(endCol) - nx, getNodeY(endRow) - ny);
					fScore.set(neighborIdx, tentG + h);
					if (!openSet.includes(neighborIdx)) {
						openSet.push(neighborIdx);
					}
				}
			}
		}

		if (!foundEnd) {
			return [{ x: targetX, y: targetY }];
		}

		// Reconstruct raw waypoints
		const rawPath: { x: number; y: number }[] = [];
		let currNode = endIndex;
		while (currNode !== startIndex) {
			const c = currNode % cols;
			const r = Math.floor(currNode / cols);
			rawPath.push({ x: getNodeX(c), y: getNodeY(r) });
			const prev = cameFrom.get(currNode);
			if (prev === undefined) break;
			currNode = prev;
		}
		rawPath.reverse();

		// Smooth path via raycasting string-pulling
		const smoothed: { x: number; y: number }[] = [];
		let fromX = startX;
		let fromY = startY;
		let i = 0;
		while (i < rawPath.length) {
			let furthest = i;
			for (let j = rawPath.length - 1; j > i; j--) {
				if (this.isWorkerLineClear(team, fromX, fromY, rawPath[j].x, rawPath[j].y)) {
					furthest = j;
					break;
				}
			}
			smoothed.push(rawPath[furthest]);
			fromX = rawPath[furthest].x;
			fromY = rawPath[furthest].y;
			i = furthest + 1;
		}

		// Append final destination
		smoothed.push({ x: targetX, y: targetY });
		return smoothed;
	}

	/**
	 * Advances worker position along its waypoint path with dynamic obstacle sliding.
	 */
	private advanceWorkerAlongPath(
		w: WorkerState,
		team: MatchTeam,
		destX: number,
		destY: number,
		dt: number,
		stopDist: number
	): void {
		const totalDist = Math.hypot(destX - w.x, destY - w.y);
		if (totalDist <= stopDist) {
			w.path = [];
			return;
		}

		if (!w.path || w.path.length === 0) {
			w.path = this.findWorkerPath(team, w.x, w.y, destX, destY);
		}

		let curTarget = w.path.length > 0 ? w.path[0] : { x: destX, y: destY };
		let dx = curTarget.x - w.x;
		let dy = curTarget.y - w.y;
		let dist = Math.hypot(dx, dy);

		if (dist < 14 && w.path.length > 1) {
			w.path.shift();
			curTarget = w.path[0];
			dx = curTarget.x - w.x;
			dy = curTarget.y - w.y;
			dist = Math.hypot(dx, dy);
		}

		if (dist > 0.5) {
			const moveDist = Math.min(dist, w.speed * dt);
			const nx = w.x + (dx / dist) * moveDist;
			const ny = w.y + (dy / dist) * moveDist;
			const res = this.resolveGroundObstacles(nx, ny, 14);

			// Obstacle avoidance: check if forward progress was blocked by obstacle
			const movedDist = Math.hypot(res.x - w.x, res.y - w.y);
			if (movedDist < moveDist * 0.25) {
				// Sliding along tangent
				const perpX = -dy / dist;
				const perpY = dx / dist;
				const s1 = this.resolveGroundObstacles(w.x + perpX * moveDist, w.y + perpY * moveDist, 14);
				const s2 = this.resolveGroundObstacles(w.x - perpX * moveDist, w.y - perpY * moveDist, 14);
				const d1 = Math.hypot(destX - s1.x, destY - s1.y);
				const d2 = Math.hypot(destX - s2.x, destY - s2.y);

				if (d1 < totalDist && Math.hypot(s1.x - w.x, s1.y - w.y) > moveDist * 0.3) {
					w.x = s1.x;
					w.y = s1.y;
				} else if (d2 < totalDist && Math.hypot(s2.x - w.x, s2.y - w.y) > moveDist * 0.3) {
					w.x = s2.x;
					w.y = s2.y;
				} else {
					// Path is obstructed by newly placed building or terrain, recompute A*
					w.path = this.findWorkerPath(team, w.x, w.y, destX, destY);
				}
			} else {
				w.x = res.x;
				w.y = res.y;
			}
		}
	}

	/**
	 * Applies soft Boids-style separation repulsion between ground units to prevent single-point stacking
	 * and create authentic frontline spread across the lane corridor width.
	 */
	private applyCrowdSeparation(dt: number): void {
		const collisionRadius = 26;
		const maxPushPerSec = 75;

		for (let i = 0; i < this.units.length; i++) {
			const u = this.units[i];
			if (u.state === 'DEAD' || u.flying) continue;

			let pushX = 0;
			let pushY = 0;

			// Check against other ground units on the same lane
			for (let j = 0; j < this.units.length; j++) {
				if (i === j) continue;
				const other = this.units[j];
				if (other.state === 'DEAD' || other.flying || other.lane !== u.lane) continue;

				let dx = u.x - other.x;
				let dy = u.y - other.y;
				let dist = Math.hypot(dx, dy);

				// If exactly overlapping, give a deterministic non-zero perpendicular nudge
				if (dist < 0.1) {
					const seed = (u.instanceId.charCodeAt(u.instanceId.length - 1) || 1) % 2 === 0 ? 1 : -1;
					dx = seed * 0.5;
					dy = (seed === 1 ? -1 : 1) * 2;
					dist = Math.hypot(dx, dy);
				}

				if (dist < collisionRadius) {
					const overlap = (collisionRadius - dist) / collisionRadius;
					const weight = u.team === other.team ? 1.0 : 0.6;
					pushX += (dx / dist) * overlap * weight;
					pushY += (dy / dist) * overlap * weight;
				}
			}

			if (pushX !== 0 || pushY !== 0) {
				const pushMag = Math.hypot(pushX, pushY);
				const clampedMag = Math.min(pushMag, 1.5) * maxPushPerSec * dt;
				u.x += (pushX / pushMag) * clampedMag;
				u.y += (pushY / pushMag) * clampedMag;
			}

			// Enforce solid obstacle collision for ground units AFTER all movement and crowd pushes!
			if (!u.flying) {
				const resolved = this.resolveGroundObstacles(u.x, u.y, u.size);
				u.x = resolved.x;
				u.y = resolved.y;
			}

			// Keep unit bounded within its lane corridor when between castles
			if (u.x >= 200 && u.x <= ARENA_WIDTH - 200) {
				const laneCenterY = u.lane === 'top' ? TOP_LANE_Y : BOTTOM_LANE_Y;
				u.y = Math.max(laneCenterY - 45, Math.min(laneCenterY + 45, u.y));
			} else {
				// In castle siege zone (x < 200 or x > 2200), allow units to converge on castle
				u.y = Math.max(100, Math.min(ARENA_HEIGHT - 100, u.y));
			}
			u.x = Math.max(80, Math.min(ARENA_WIDTH - 80, u.x));
		}
	}

	private performAttack(attacker: Unit, target: Unit): void {
		// Double check lane separation
		if (attacker.lane !== target.lane) return;

		// Evade check
		let effectiveEvade = target.evadeChance || 0;
		if (target.buffs?.some((b) => b.type === 'evade')) {
			effectiveEvade = Math.min(0.85, effectiveEvade + 0.4);
		}
		if (effectiveEvade > 0 && Math.random() < effectiveEvade) {
			this.addFloatingText('Ухилення!', target.x, target.y - 20, '#60a5fa');
			return;
		}

		// Roll raw damage
		let rawDmg =
			attacker.damageMin +
			Math.floor(Math.random() * (attacker.damageMax - attacker.damageMin + 1));

		if (attacker.buffs?.some((b) => b.type === 'dmg')) {
			rawDmg = Math.round(rawDmg * 1.25);
		}

		let isCrit = false;
		if (attacker.critChance && Math.random() < attacker.critChance) {
			rawDmg *= 2;
			isCrit = true;
		}

		// Tactical on-attack procs: Bash & Poison
		if (attacker.abilityType === 'bash' && Math.random() < 0.2) {
			target.buffs = target.buffs || [];
			target.buffs.push({ type: 'stun', timer: 1.2, value: 0 });
			target.isStunned = true;
			this.addFloatingText('*Оглушення!*', target.x, target.y - 25, '#f59e0b');
		}
		if (attacker.abilityType === 'poison') {
			target.buffs = target.buffs || [];
			target.buffs.push({ type: 'poison', timer: 5.0, value: 15 });
			target.buffs.push({ type: 'slow', timer: 5.0, value: 0.3 });
			this.addFloatingText('Отрута', target.x, target.y - 20, '#10b981');
		}

		if (attacker.range > 150) {
			const dist = Math.hypot(target.x - attacker.x, target.y - attacker.y);
			this.projectiles.push({
				id: `proj_${this.nextProjectileId++}`,
				sourceUnitId: attacker.instanceId,
				targetUnitId: target.instanceId,
				x: attacker.x,
				y: attacker.y,
				targetX: target.x,
				targetY: target.y,
				originX: attacker.x,
				originY: attacker.y,
				totalDist: dist,
				arcHeight: attacker.attackType === 'pierce' ? 35 : attacker.attackType === 'siege' ? 65 : 0,
				speed: 650,
				damage: rawDmg,
				attackType: attacker.attackType,
				isCrit,
				team: attacker.team,
				splashRadius: attacker.splashRadius
			});
		} else {
			this.applyUnitDamage(target, rawDmg, attacker.attackType, attacker.team, isCrit, attacker);

			// Melee AoE Splash
			if (attacker.splashRadius) {
				this.triggerSplashDamage(
					target.x,
					target.y,
					attacker.splashRadius,
					rawDmg * 0.5,
					attacker.attackType,
					attacker.team,
					target.instanceId,
					attacker.lane
				);
			}

			// Thorns / Spiked Carapace Reflection
			if (target.reflectDamagePct && target.reflectDamagePct > 0) {
				const reflected = Math.max(1, Math.round(rawDmg * target.reflectDamagePct));
				attacker.hp -= reflected;
				this.addFloatingText(`!${reflected}! Відбиття`, attacker.x, attacker.y - 15, '#a855f7');
				if (attacker.hp <= 0) {
					attacker.state = 'DEAD';
				}
			}
		}
	}

	private triggerSplashDamage(
		x: number,
		y: number,
		radius: number,
		damage: number,
		attackType: AttackType,
		attackerTeam: Team,
		primaryTargetId?: string,
		lane?: Lane
	): void {
		this.splashEffects.push({
			x,
			y,
			radius,
			timer: 0.35,
			maxTimer: 0.35
		});

		const radiusSq = radius * radius;
		for (const u of this.units) {
			if (u.instanceId === primaryTargetId || u.state === 'DEAD' || u.team === attackerTeam)
				continue;
			if (lane && u.lane !== lane) continue;
			const dx = u.x - x;
			const dy = u.y - y;
			if (dx * dx + dy * dy <= radiusSq) {
				this.applyUnitDamage(u, Math.round(damage), attackType, attackerTeam, false);
			}
		}
	}

	private applyUnitDamage(
		target: Unit,
		rawDmg: number,
		attackType: AttackType,
		attackerTeam: Team,
		isCrit: boolean,
		attackerUnit?: Unit
	): void {
		let effectiveArmor = target.armor;
		if (target.buffs?.some((b) => b.type === 'shield')) {
			effectiveArmor += 5;
		}
		const finalDamage = calculateDamage(attackType, target.armorType, rawDmg, effectiveArmor);
		target.hp -= finalDamage;

		if (attackerTeam === 'west' || attackerTeam === 'east') {
			this.players[attackerTeam].stats.totalDamageDealt += finalDamage;
		}

		if (attackerUnit?.buildingDefId && (attackerTeam === 'west' || attackerTeam === 'east')) {
			this.recordBuildingDamage(
				attackerUnit.buildingDefId,
				attackerUnit.buildingName || attackerUnit.name,
				attackerTeam,
				finalDamage
			);
		}

		this.addFloatingText(
			isCrit ? `!${finalDamage}!` : `-${finalDamage}`,
			target.x + (Math.random() * 20 - 10),
			target.y - 15,
			isCrit ? '#f59e0b' : target.team === 'west' ? '#ef4444' : '#38bdf8'
		);

		if (target.hp <= 0) {
			target.state = 'DEAD';

			if (attackerUnit?.buildingDefId && (attackerTeam === 'west' || attackerTeam === 'east')) {
				this.recordBuildingKill(
					attackerUnit.buildingDefId,
					attackerUnit.buildingName || attackerUnit.name,
					attackerTeam
				);
			}

			// Recycler scrap salvage on unit death
			if (target.team === 'west' || target.team === 'east') {
				const recyclers = this.buildings.filter(
					(b) => b.team === target.team && b.specialType === 'recycler'
				);
				if (recyclers.length > 0) {
					const scrapBonus = recyclers.length * 4;
					this.players[target.team].gold += scrapBonus;
					this.addFloatingText(`+${scrapBonus}g Брухт`, target.x, target.y - 20, '#eab308');
				}
			}

			// Scavenger Great Assembly (Великая сборка): empower closest friendly unit
			if (target.isScavenger && (target.team === 'west' || target.team === 'east')) {
				const allies = this.units.filter(
					(u) =>
						u.team === target.team &&
						u.state !== 'DEAD' &&
						u.instanceId !== target.instanceId &&
						u.lane === target.lane
				);
				if (allies.length > 0) {
					allies.sort(
						(a, b) =>
							Math.hypot(a.x - target.x, a.y - target.y) -
							Math.hypot(b.x - target.x, b.y - target.y)
					);
					const closest = allies[0];
					closest.hp = Math.min(closest.maxHp, closest.hp + 75);
					closest.buffs = closest.buffs || [];
					closest.buffs.push({ type: 'dmg', timer: 10, value: 0.15 });
					this.addFloatingText('+Уламки (+15% шкоди)', closest.x, closest.y - 25, '#f59e0b');
				}
			}

			if (target.team === 'neutral') {
				this.activeBossInstanceId = null;
				this.bossSpawnTimer = 180.0;
				if (attackerTeam === 'west' || attackerTeam === 'east') {
					const bounty = Math.min(110, 10 + 20 * (this.bossIndex - 1));
					this.players[attackerTeam].gold += bounty;
					this.addFloatingText(`+${bounty}g за Боса!`, target.x, target.y - 30, '#fbbf24');
				}
			} else if (attackerTeam === 'west' || attackerTeam === 'east') {
				this.players[attackerTeam].stats.unitsKilled++;
			}
		}
	}

	private attackCastle(attacker: Unit, castle: Castle): void {
		if (this.castleInvulnerableTimer[castle.team] > 0) {
			this.addFloatingText('Невразливий!', castle.x, castle.y - 30, '#38bdf8');
			return;
		}

		attacker.attackAnimTimer = 0.25;
		const rawDmg =
			attacker.damageMin +
			Math.floor(Math.random() * (attacker.damageMax - attacker.damageMin + 1));
		const finalDamage = calculateDamage(attacker.attackType, 'fort', rawDmg, 5);
		castle.hp = Math.max(0, castle.hp - finalDamage);
		this.onSoundEffect?.('hit');

		if (attacker.team === 'west' || attacker.team === 'east') {
			this.players[attacker.team].stats.damageToCastle += finalDamage;
			this.players[attacker.team].stats.totalDamageDealt += finalDamage;
			if (attacker.buildingDefId) {
				this.recordBuildingDamage(
					attacker.buildingDefId,
					attacker.buildingName || attacker.name,
					attacker.team,
					finalDamage
				);
			}
		}

		this.addFloatingText(`-${finalDamage}`, castle.x, castle.y - 30, '#ef4444');
		this.notifyStateChanged();
	}

	private performAttackBuilding(attacker: Unit, target: Building): void {
		attacker.attackAnimTimer = 0.25;
		let rawDmg =
			attacker.damageMin +
			Math.floor(Math.random() * (attacker.damageMax - attacker.damageMin + 1));
		if (attacker.buffs?.some((b) => b.type === 'dmg')) {
			rawDmg = Math.round(rawDmg * 1.25);
		}

		if (attacker.range > 150) {
			const dist = Math.hypot(
				target.x + CELL_SIZE / 2 - attacker.x,
				target.y + CELL_SIZE / 2 - attacker.y
			);
			this.projectiles.push({
				id: `proj_${this.nextProjectileId++}`,
				sourceUnitId: attacker.instanceId,
				targetUnitId: target.instanceId,
				x: attacker.x,
				y: attacker.y,
				targetX: target.x + CELL_SIZE / 2,
				targetY: target.y + CELL_SIZE / 2,
				originX: attacker.x,
				originY: attacker.y,
				totalDist: dist,
				arcHeight: attacker.attackType === 'pierce' ? 35 : attacker.attackType === 'siege' ? 65 : 0,
				speed: 650,
				damage: rawDmg,
				attackType: attacker.attackType,
				isCrit: false,
				team: attacker.team,
				splashRadius: attacker.splashRadius
			});
			if (attacker.attackType === 'magic') {
				this.onSoundEffect?.('magic');
			} else {
				this.onSoundEffect?.('bow');
			}
		} else {
			const mTeam: MatchTeam = attacker.team === 'east' ? 'east' : 'west';
			this.damageBuilding(target, rawDmg, attacker.attackType, mTeam);
			this.onSoundEffect?.('sword');
		}
	}

	public damageBuilding(
		building: Building,
		rawDamage: number,
		attackType: AttackType,
		attackerTeam: MatchTeam
	): void {
		if (building.hp <= 0) return;
		const damage = calculateDamage(attackType, building.armorType, rawDamage, building.armor);
		building.hp -= damage;
		this.addFloatingText(`-${damage}`, building.x + CELL_SIZE / 2, building.y - 15, '#f87171');

		const player = this.players[attackerTeam];
		if (player) {
			player.stats.totalDamageDealt += damage;
		}

		if (building.hp <= 0) {
			building.hp = 0;
			this.buildings = this.buildings.filter((b) => b.instanceId !== building.instanceId);
			const bDef = getBuilding(building.defId);
			if (bDef && isLegendaryBuilding(bDef)) {
				const owner = this.players[building.team];
				if (owner && owner.food > 0) owner.food--;
			}
			this.addFloatingText(
				`Зруйновано: ${building.name}`,
				building.x + CELL_SIZE / 2,
				building.y - 25,
				'#ef4444'
			);
			this.onSoundEffect?.('buildingDestroyed');
		}
		this.notifyStateChanged();
	}

	// --- CASTLE DEFENSE ---
	private castleCooldowns = { west: 0, east: 0 };
	private updateCastles(dt: number): void {
		for (const team of ['west', 'east'] as MatchTeam[]) {
			const castle = this.castles[team];
			this.castleCooldowns[team] -= dt;

			if (this.castleCooldowns[team] <= 0) {
				const enemy = this.spatialGrid.findClosestEnemy(
					castle.x,
					castle.y,
					450,
					team,
					undefined,
					true
				);
				if (enemy) {
					const isOvercharged = this.castleOverchargeTimer[team] > 0;
					this.castleCooldowns[team] = isOvercharged ? 0.5 : 1.0;
					const dist = Math.hypot(enemy.x - castle.x, enemy.y - castle.y);
					this.projectiles.push({
						id: `castle_shot_${this.nextProjectileId++}`,
						sourceUnitId: 'castle_' + team,
						targetUnitId: enemy.instanceId,
						x: castle.x,
						y: castle.y,
						targetX: enemy.x,
						targetY: enemy.y,
						originX: castle.x,
						originY: castle.y,
						totalDist: dist,
						arcHeight: 50,
						speed: 700,
						damage: isOvercharged ? 170 : 85,
						attackType: 'siege',
						isCrit: isOvercharged,
						team
					});
				}
			}
		}
	}

	private updateTowers(dt: number): void {
		for (const b of this.buildings) {
			if (b.specialType !== 'tower') continue;

			if (b.attackTimer === undefined) {
				b.attackTimer = 0;
			}
			b.attackTimer -= dt;

			if (b.attackTimer <= 0) {
				const range = b.attackRange || 500;
				const enemy = this.spatialGrid.findClosestEnemy(b.x, b.y, range, b.team, undefined, true);
				if (enemy) {
					b.attackTimer = b.attackCooldown || 1.0;
					const dmg = b.damageMin || 50;
					const isSplash = b.defId === 'h073' || b.defId === 'cg0a';
					const tDist = Math.hypot(enemy.x - b.x, enemy.y - b.y);
					this.projectiles.push({
						id: `tower_shot_${this.nextProjectileId++}`,
						sourceUnitId: b.instanceId,
						targetUnitId: enemy.instanceId,
						x: b.x,
						y: b.y,
						targetX: enemy.x,
						targetY: enemy.y,
						originX: b.x,
						originY: b.y,
						totalDist: tDist,
						arcHeight: 30,
						speed: 650,
						damage: dmg,
						attackType: b.attackType || 'pierce',
						isCrit: false,
						team: b.team,
						splashRadius: isSplash ? 65 : undefined
					});
				}
			}
		}
	}

	// --- PROJECTILES ---
	private updateProjectiles(dt: number): void {
		for (const p of this.projectiles) {
			const target = this.units.find((u) => u.instanceId === p.targetUnitId);
			const targetBuilding = !target
				? this.buildings.find((b) => b.instanceId === p.targetUnitId)
				: null;

			if (target && target.state !== 'DEAD') {
				p.targetX = target.x;
				p.targetY = target.y;
			} else if (targetBuilding) {
				p.targetX = targetBuilding.x + CELL_SIZE / 2;
				p.targetY = targetBuilding.y + CELL_SIZE / 2;
			}

			const dx = p.targetX - p.x;
			const dy = p.targetY - p.y;
			const dist = Math.hypot(dx, dy);

			const step = p.speed * dt;
			if (dist <= step) {
				if (target && target.state !== 'DEAD') {
					const attackerUnit = this.units.find((u) => u.instanceId === p.sourceUnitId);
					this.applyUnitDamage(target, p.damage, p.attackType, p.team, p.isCrit, attackerUnit);

					// Tower special on-hit effects & stats
					if (p.sourceUnitId.startsWith('bld_')) {
						if (!target.buffs) target.buffs = [];
						const tower = this.buildings.find((b) => b.instanceId === p.sourceUnitId);
						if (tower) {
							this.recordBuildingDamage(tower.defId, tower.name, tower.team, p.damage);
							if (target.hp <= 0) {
								this.recordBuildingKill(tower.defId, tower.name, tower.team);
							}
						}
						if (tower?.defId === 'h03Q') {
							// Frost tower chill slow
							const slowBuff = target.buffs.find((b) => b.type === 'slow');
							if (slowBuff) {
								slowBuff.timer = Math.max(slowBuff.timer, 2.0);
							} else {
								target.buffs.push({ type: 'slow', timer: 2.0, value: 0.3 });
							}
						} else if (tower?.defId === 'n01J') {
							// Plague tower poison
							const poisonBuff = target.buffs.find((b) => b.type === 'poison');
							if (poisonBuff) {
								poisonBuff.timer = Math.max(poisonBuff.timer, 3.0);
							} else {
								target.buffs.push({ type: 'poison', timer: 3.0, value: 12 });
							}
						}
					}
				} else if (targetBuilding && targetBuilding.hp > 0) {
					this.damageBuilding(targetBuilding, p.damage, p.attackType, p.team as MatchTeam);
				}
				if (p.splashRadius) {
					this.triggerSplashDamage(
						p.targetX,
						p.targetY,
						p.splashRadius,
						p.damage * 0.5,
						p.attackType,
						p.team,
						p.targetUnitId
					);
				}
				p.damage = 0;
			} else {
				p.x += (dx / dist) * step;
				p.y += (dy / dist) * step;
			}
		}
	}

	// --- FLOATING TEXT ---
	private updateFloatingTexts(dt: number): void {
		for (const t of this.floatingTexts) {
			t.life -= dt;
			t.y -= 22 * dt;
		}
		this.floatingTexts = this.floatingTexts.filter((t) => t.life > 0);
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

	// --- PLAYER ACTIONS ---
	/**
	 * Checks whether a given plot is valid for building.
	 * Disallows road surfaces, dividing walls, existing buildings, and castle footprints.
	 */
	public canBuild(team: MatchTeam, tileX: number, tileY: number): boolean {
		const startX = team === 'west' ? WEST_GRID_START_X : EAST_GRID_START_X;
		const startY = team === 'west' ? WEST_GRID_START_Y : EAST_GRID_START_Y;
		const worldX = startX + tileX * CELL_SIZE;
		const worldY = startY + tileY * CELL_SIZE;

		// 1. Boundary & Castle checks
		if (team === 'west') {
			if (worldX < 110 || worldX + CELL_SIZE > 650) return false;
			if (worldY < 55 || worldY + CELL_SIZE > ARENA_HEIGHT - 55) return false;
			if (worldX < 140 && worldY >= 310 && worldY <= 490) return false;
		} else {
			if (worldX < ARENA_WIDTH - 650 || worldX + CELL_SIZE > ARENA_WIDTH - 110) return false;
			if (worldY < 55 || worldY + CELL_SIZE > ARENA_HEIGHT - 55) return false;
			if (worldX + CELL_SIZE > ARENA_WIDTH - 140 && worldY >= 310 && worldY <= 490) return false;
		}

		// 2. Overlap with Existing Buildings
		for (const b of this.buildings) {
			if (b.team === team && b.tileX === tileX && b.tileY === tileY) return false;
			if (Math.abs(b.x - worldX) < CELL_SIZE - 2 && Math.abs(b.y - worldY) < CELL_SIZE - 2) {
				return false;
			}
		}

		// 3. Overlap with Dividing Stone Walls
		if (team === 'west') {
			if (worldX < 460 && worldX + CELL_SIZE > 70 && worldY < 420 && worldY + CELL_SIZE > 380) {
				return false;
			}
		} else {
			if (worldX < 2330 && worldX + CELL_SIZE > 1940 && worldY < 420 && worldY + CELL_SIZE > 380) {
				return false;
			}
		}

		// 4. Overlap with Cobblestone Road Network
		if (this.isBoxOnRoad(worldX, worldY, CELL_SIZE, CELL_SIZE)) {
			return false;
		}

		return true;
	}

	public isBoxOnRoad(rx: number, ry: number, rw: number, rh: number): boolean {
		const roadHeight = 72;
		const rMaxX = rx + rw;
		const rMaxY = ry + rh;

		// Top highway (between base courtyards)
		const topMinY = TOP_LANE_Y - roadHeight / 2;
		const topMaxY = TOP_LANE_Y + roadHeight / 2;
		if (rMaxX > 340 && rx < ARENA_WIDTH - 340 && rMaxY > topMinY && ry < topMaxY) {
			return true;
		}

		// Bottom highway (between base courtyards)
		const botMinY = BOTTOM_LANE_Y - roadHeight / 2;
		const botMaxY = BOTTOM_LANE_Y + roadHeight / 2;
		if (rMaxX > 340 && rx < ARENA_WIDTH - 340 && rMaxY > botMinY && ry < botMaxY) {
			return true;
		}

		return false;
	}

	public build(
		team: MatchTeam,
		defId: string,
		tileX: number,
		tileY: number,
		_lane: Lane = 'top'
	): boolean {
		const bDef = getBuilding(defId);
		if (!bDef) return false;

		const player = this.players[team];
		const cost = bDef.gold_cost || 200;

		if (player.gold < cost) return false;

		// Check food requirement for legendary structures
		if (isLegendaryBuilding(bDef)) {
			if (player.food >= player.maxFood) {
				const startX = team === 'west' ? WEST_GRID_START_X : EAST_GRID_START_X;
				const startY = team === 'west' ? WEST_GRID_START_Y : EAST_GRID_START_Y;
				const worldX = startX + tileX * CELL_SIZE;
				const worldY = startY + tileY * CELL_SIZE;
				this.addFloatingText('Потрібна Їжа! Купіть Сир у замку', worldX, worldY - 20, '#ef4444');
				return false;
			}
		}

		// Validate build plot
		if (!this.canBuild(team, tileX, tileY)) return false;

		// Deduct gold
		player.gold -= cost;
		player.stats.goldSpent += cost;

		const startX = team === 'west' ? WEST_GRID_START_X : EAST_GRID_START_X;
		const startY = team === 'west' ? WEST_GRID_START_Y : EAST_GRID_START_Y;

		const worldX = startX + tileX * CELL_SIZE;
		const worldY = startY + tileY * CELL_SIZE;

		const spawnCd = getSpawnCooldown(bDef, getUnit(bDef.unit));

		const isBot = player.isBot;
		const buildTime = isBot ? 2.5 : 3.5;

		// Natural automated lane determination based on physical courtyard placement
		const resolvedLane: Lane = worldY < 400 ? 'top' : 'bottom';

		const building: Building = {
			instanceId: `bld_${this.nextBuildingId++}`,
			defId: bDef.id,
			name: bDef.name,
			team,
			tileX,
			tileY,
			x: worldX,
			y: worldY,
			hp: Math.round((bDef.hp || 1200) * 0.15),
			maxHp: bDef.hp || 1200,
			armor: bDef.armor ?? 5,
			armorType: (bDef.armor_type as ArmorType) || 'fort',
			goldCost: cost,
			spawnUnitId: bDef.unit,
			spawnCooldown: spawnCd,
			spawnTimer: bDef.specialType === 'repair' ? 0 : 4.0,
			lane: resolvedLane,
			upgradeFrom: bDef.upgrade_from,
			race: bDef.race || player.race,
			width: 2,
			height: 2,
			specialType: bDef.specialType,
			isUnderConstruction: true,
			buildProgress: 0,
			maxBuildProgress: buildTime
		};

		if (bDef.specialType === 'tower') {
			building.attackCooldown = bDef.cooldown ?? 1.0;
			building.attackTimer = 0;
			building.attackRange = bDef.range ?? 500;
			building.damageMin = bDef.damage_base ?? 50;
			building.damageMax = (bDef.damage_base ?? 50) + 10;
			building.attackType = (bDef.attack_type as AttackType) || 'pierce';
		}

		this.buildings.push(building);
		if (isLegendaryBuilding(bDef)) {
			player.food++;
		}
		if (player.worker) {
			const exteriorX = team === 'west' ? worldX - 16 : worldX + CELL_SIZE + 16;
			const exteriorY = worldY + CELL_SIZE / 2;
			player.worker.targetX = exteriorX;
			player.worker.targetY = exteriorY;
			player.worker.targetBuildingId = building.instanceId;
			player.worker.isBuilding = false;
			// Push worker out if caught inside footprint
			const resolved = this.resolveGroundObstacles(player.worker.x, player.worker.y, 14);
			player.worker.x = resolved.x;
			player.worker.y = resolved.y;
			player.worker.path = this.findWorkerPath(
				team,
				player.worker.x,
				player.worker.y,
				exteriorX,
				exteriorY
			);
		}
		this.addFloatingText(`-${cost}g`, worldX, worldY - 20, '#fbbf24');

		this.notifyStateChanged();
		return true;
	}

	public moveWorker(team: MatchTeam, targetX: number, targetY: number): void {
		const w = this.players[team]?.worker;
		if (w) {
			w.targetX = targetX;
			w.targetY = targetY;
			w.isBuilding = false;
			w.targetBuildingId = null;
			w.isRepairing = false;
			w.targetRepairBuildingId = null;
			w.path = this.findWorkerPath(team, w.x, w.y, targetX, targetY);
			this.notifyStateChanged();
		}
	}

	public repairBuilding(team: MatchTeam, buildingInstanceId: string): boolean {
		const targetBld =
			this.buildings.find((b) => b.instanceId === buildingInstanceId && b.team === team) ||
			(buildingInstanceId === `castle_${team}` || buildingInstanceId === 'castle'
				? this.castles[team]
				: null);
		if (!targetBld) return false;

		const w = this.players[team]?.worker;
		if (w) {
			const tx = targetBld.x + CELL_SIZE / 2;
			const ty = targetBld.y + CELL_SIZE / 2;
			w.targetX = tx;
			w.targetY = ty;
			w.isBuilding = false;
			w.targetBuildingId = null;
			w.isRepairing = true;
			w.targetRepairBuildingId = buildingInstanceId;
			w.path = this.findWorkerPath(team, w.x, w.y, tx, ty);
			this.notifyStateChanged();
			return true;
		}
		return false;
	}

	public upgradeBuilding(
		team: MatchTeam,
		buildingInstanceId: string,
		targetDefId: string
	): boolean {
		const building = this.buildings.find(
			(b) => b.instanceId === buildingInstanceId && b.team === team
		);
		if (!building) return false;

		const targetDef = getBuilding(targetDefId);
		if (!targetDef) return false;

		// Ensure targetDef is a valid upgrade of current building
		if (targetDef.upgrade_from !== building.defId) return false;

		const currentDef = getBuilding(building.defId);
		const currentIsLeg = isLegendaryBuilding(currentDef);
		const targetIsLeg = isLegendaryBuilding(targetDef);
		const player = this.players[team];

		if (targetIsLeg && !currentIsLeg) {
			if (player.food >= player.maxFood) {
				this.addFloatingText(
					'Потрібна Їжа! Купіть Сир у замку',
					building.x,
					building.y - 20,
					'#ef4444'
				);
				return false;
			}
		}

		const upgradeCost =
			targetDef.upgrade_extra_cost > 0
				? targetDef.upgrade_extra_cost
				: Math.max(50, (targetDef.gold_cost || 200) - building.goldCost);

		if (player.gold < upgradeCost) return false;

		player.gold -= upgradeCost;
		player.stats.goldSpent += upgradeCost;
		if (targetIsLeg && !currentIsLeg) {
			player.food++;
		}

		building.defId = targetDef.id;
		building.name = targetDef.name;
		building.goldCost += upgradeCost;
		building.spawnUnitId = targetDef.unit;
		const newSpawnCd = getSpawnCooldown(targetDef, getUnit(targetDef.unit));
		building.spawnCooldown = newSpawnCd;
		building.spawnTimer = Math.min(building.spawnTimer, newSpawnCd);
		building.upgradeFrom = targetDef.upgrade_from;
		if (targetDef.race) {
			building.race = targetDef.race;
		}

		this.addFloatingText(`-${upgradeCost}g (Апгрейд)`, building.x, building.y - 20, '#38bdf8');
		this.notifyStateChanged();
		return true;
	}

	public sellBuilding(team: MatchTeam, buildingInstanceId: string): boolean {
		const idx = this.buildings.findIndex(
			(b) => b.instanceId === buildingInstanceId && b.team === team
		);
		if (idx === -1) return false;

		const building = this.buildings[idx];
		const player = this.players[team];
		const currentDef = getBuilding(building.defId);
		if (isLegendaryBuilding(currentDef)) {
			player.food = Math.max(0, player.food - 1);
		}
		const refund = Math.floor(building.goldCost * 0.5);

		player.gold += refund;

		this.buildings.splice(idx, 1);
		this.addFloatingText(`+${refund}g (Знесено)`, building.x, building.y - 20, '#fbbf24');
		this.notifyStateChanged();
		return true;
	}

	public upgradeForge(team: MatchTeam, type: 'attack' | 'armor' | 'econ'): boolean {
		const player = this.players[team];
		const currentLevel = player.forge[type];
		const isAlik = player.commander === 2;

		let maxLevel = 5;
		let baseCost = 200;
		let costStep = 100;

		if (type === 'armor') {
			baseCost = 150;
			costStep = 75;
		} else if (type === 'econ') {
			maxLevel = 3;
			baseCost = 150;
			costStep = 100;
		}

		if (currentLevel >= maxLevel) return false;

		let price = baseCost + currentLevel * costStep;
		if (isAlik) price = Math.round(price * 0.5);

		if (player.gold < price) return false;

		player.gold -= price;
		player.forge[type]++;
		player.stats.goldSpent += price;

		this.addFloatingText(`Кузня +1`, this.castles[team].x, this.castles[team].y - 50, '#10b981');
		this.notifyStateChanged();
		return true;
	}

	public getForgePrice(team: MatchTeam, type: 'attack' | 'armor' | 'econ'): number {
		const player = this.players[team];
		const currentLevel = player.forge[type];
		const isAlik = player.commander === 2;

		let baseCost = 200;
		let costStep = 100;

		if (type === 'armor') {
			baseCost = 150;
			costStep = 75;
		} else if (type === 'econ') {
			baseCost = 150;
			costStep = 100;
		}

		let price = baseCost + currentLevel * costStep;
		if (isAlik) price = Math.round(price * 0.5);
		return price;
	}

	// --- RACE ACTIVE ABILITIES (Unlocked at 300s, cooldown 150s) ---
	public canUseRaceSkill(team: MatchTeam): boolean {
		return this.gameTime >= 300 && this.raceSkillCooldown[team] <= 0 && !this.winner;
	}

	public useRaceSkill(team: MatchTeam): boolean {
		if (!this.canUseRaceSkill(team)) return false;

		const player = this.players[team];
		const ability = getRaceAbility(player.race);
		this.raceSkillCooldown[team] = 150;

		const enemyTeam: MatchTeam = team === 'west' ? 'east' : 'west';

		switch (ability.kind) {
			case 'dmg':
				for (const u of this.units) {
					if (u.team === team && u.state !== 'DEAD') {
						u.buffs = u.buffs || [];
						u.buffs.push({ type: 'dmg', timer: 15, value: 0.25 });
					}
				}
				this.addFloatingText(
					`${ability.nameUk}! (+25% шкоди)`,
					this.castles[team].x,
					this.castles[team].y - 60,
					'#f59e0b'
				);
				break;
			case 'as':
			case 'sbor':
				for (const u of this.units) {
					if (u.team === team && u.state !== 'DEAD') {
						u.buffs = u.buffs || [];
						u.buffs.push({ type: 'as', timer: ability.duration, value: 0.3 });
					}
				}
				this.addFloatingText(
					`${ability.nameUk}! (+Швидкість атаки)`,
					this.castles[team].x,
					this.castles[team].y - 60,
					'#10b981'
				);
				break;
			case 'shield':
				for (const u of this.units) {
					if (u.team === team && u.state !== 'DEAD') {
						u.buffs = u.buffs || [];
						u.buffs.push({ type: 'shield', timer: 10, value: 5 });
					}
				}
				this.addFloatingText(
					`${ability.nameUk}! (+5 броні)`,
					this.castles[team].x,
					this.castles[team].y - 60,
					'#60a5fa'
				);
				break;
			case 'evade':
				for (const u of this.units) {
					if (u.team === team && u.state !== 'DEAD') {
						u.buffs = u.buffs || [];
						u.buffs.push({ type: 'evade', timer: 8, value: 0.4 });
					}
				}
				this.addFloatingText(
					`${ability.nameUk}! (+40% ухилення)`,
					this.castles[team].x,
					this.castles[team].y - 60,
					'#a855f7'
				);
				break;
			case 'slow':
				for (const u of this.units) {
					if (u.team === enemyTeam && u.state !== 'DEAD') {
						u.buffs = u.buffs || [];
						u.buffs.push({ type: 'slow', timer: 8, value: 0.5 });
					}
				}
				this.addFloatingText(
					`${ability.nameUk}! (-50% швидкості ворога)`,
					this.castles[enemyTeam].x,
					this.castles[enemyTeam].y - 60,
					'#06b6d4'
				);
				break;
			case 'plague':
				for (const u of this.units) {
					if (u.team === enemyTeam && u.state !== 'DEAD') {
						const dmg = Math.max(15, Math.round(u.hp * 0.1));
						u.hp = Math.max(1, u.hp - dmg);
						this.addFloatingText(`-${dmg}`, u.x, u.y - 15, '#22c55e');
					}
				}
				this.addFloatingText(
					`${ability.nameUk}! (-10% HP ворогам)`,
					this.castles[enemyTeam].x,
					this.castles[enemyTeam].y - 60,
					'#22c55e'
				);
				break;
			case 'mine':
				for (const u of this.units) {
					if (u.team === enemyTeam && u.state !== 'DEAD') {
						const distFromCenter = Math.abs(u.x - ARENA_WIDTH / 2);
						if (distFromCenter <= 700) {
							u.hp -= 300;
							this.addFloatingText('-300', u.x, u.y - 20, '#ef4444');
							if (u.hp <= 0) u.state = 'DEAD';
						}
					}
				}
				this.addFloatingText('МІНА! (300 шкоди)', ARENA_WIDTH / 2, TOP_LANE_Y, '#ef4444');
				break;
			case 'nuke_chaos':
			case 'nuke_elf': {
				const nukeDmg = ability.kind === 'nuke_chaos' ? 200 : 150;
				for (const u of this.units) {
					if (u.team === enemyTeam && u.state !== 'DEAD') {
						u.hp -= nukeDmg;
						this.addFloatingText(`-${nukeDmg}`, u.x, u.y - 15, '#f97316');
						if (u.hp <= 0) u.state = 'DEAD';
					}
				}
				this.addFloatingText(
					`${ability.nameUk}!`,
					this.castles[enemyTeam].x,
					this.castles[enemyTeam].y - 60,
					'#f97316'
				);
				break;
			}
			case 'infect':
				for (const u of this.units) {
					if (u.team === enemyTeam && u.state !== 'DEAD') {
						u.buffs = u.buffs || [];
						u.buffs.push({ type: 'infect', timer: 8, value: 30 });
					}
				}
				this.addFloatingText(
					`${ability.nameUk}! (Зараження)`,
					this.castles[enemyTeam].x,
					this.castles[enemyTeam].y - 60,
					'#84cc16'
				);
				break;
		}

		this.notifyStateChanged();
		return true;
	}

	// --- CASTLE SHOP & CONSUMABLES ---
	public getItemCooldown(team: MatchTeam, itemId: string): number {
		const cd = this.itemCooldowns[team]?.[itemId] || 0;
		return cd <= 0.001 ? 0 : cd;
	}

	public canBuyCastleItem(team: MatchTeam, itemId: string): boolean {
		const item = CASTLE_ITEMS[itemId];
		if (!item) return false;
		const player = this.players[team];
		if (player.gold < item.cost) return false;
		if (this.getItemCooldown(team, itemId) > 0) return false;
		return true;
	}

	public buyCastleItem(team: MatchTeam, itemId: string): boolean {
		if (!this.canBuyCastleItem(team, itemId)) return false;
		const item = CASTLE_ITEMS[itemId];
		const player = this.players[team];
		const myCastle = this.castles[team];
		const enemyTeam: MatchTeam = team === 'west' ? 'east' : 'west';

		player.gold -= item.cost;
		player.stats.goldSpent += item.cost;
		player.stats.itemsPurchased++;
		this.itemCooldowns[team][itemId] = item.cooldown;

		switch (itemId) {
			case 'I001': {
				// Battle Drums: +25% attack speed to all friendly troops for 15s
				for (const u of this.units) {
					if (u.team === team && u.state !== 'DEAD') {
						u.buffs = u.buffs || [];
						u.buffs.push({ type: 'as', timer: 15, value: 0.25 });
					}
				}
				this.addFloatingText(
					'Бойові Барабани! (+25% Шв. атаки)',
					myCastle.x,
					myCastle.y - 60,
					'#f97316'
				);
				break;
			}
			case 'I003': {
				// Battle Horn: +4 armor to all friendly troops for 20s
				for (const u of this.units) {
					if (u.team === team && u.state !== 'DEAD') {
						u.buffs = u.buffs || [];
						u.buffs.push({ type: 'shield', timer: 20, value: 4 });
					}
				}
				this.addFloatingText('Бойовий Ріг! (+4 Броні)', myCastle.x, myCastle.y - 60, '#38bdf8');
				break;
			}
			case 'I005': {
				// Rune of Power: overcharge castle cannons for 20s
				this.castleOverchargeTimer[team] = 20.0;
				this.addFloatingText(
					'Руна Могутності! (х2 Шкоди гармат)',
					myCastle.x,
					myCastle.y - 60,
					'#ef4444'
				);
				break;
			}
			case 'I007': {
				// Magic Wand: cleanses friendly debuffs and curses enemies (-30% dmg for 12s)
				for (const u of this.units) {
					if (u.state === 'DEAD') continue;
					if (u.team === team) {
						if (u.buffs) {
							u.buffs = u.buffs.filter(
								(b) => b.type !== 'weakness' && b.type !== 'slow' && b.type !== 'infect'
							);
						}
					} else if (u.team === enemyTeam) {
						u.buffs = u.buffs || [];
						u.buffs.push({ type: 'dmg', timer: 12, value: -0.3 });
					}
				}
				this.addFloatingText(
					'Чарівний Жезл! (Очищення та Прокляття)',
					myCastle.x,
					myCastle.y - 60,
					'#a855f7'
				);
				break;
			}
			case 'I008': {
				// Scroll of Stone: summons Stone Golem at castle gate
				const lane: Lane =
					this.spatialGrid.queryRadius(myCastle.x, 220, 400).length >=
					this.spatialGrid.queryRadius(myCastle.x, 580, 400).length
						? 'top'
						: 'bottom';
				const golem = this.spawnUnitDirectly({
					team,
					lane,
					x: team === 'west' ? 300 : ARENA_WIDTH - 300,
					y: lane === 'top' ? 220 : 580,
					hp: 1800,
					maxHp: 1800,
					armor: 12,
					damage: 65,
					range: 110,
					attackCooldown: 1.1,
					speed: 80
				});
				golem.name = 'Кам’яний Голем';
				golem.armorType = 'large';
				golem.attackType = 'normal';
				this.addFloatingText('Кам’яний Голем покликаний!', myCastle.x, myCastle.y - 60, '#78716c');
				break;
			}
			case 'I009': {
				// Rune of Repair: restore 1200 HP to castle
				myCastle.hp = Math.min(myCastle.maxHp, myCastle.hp + 1200);
				this.addFloatingText('+1200 HP Ремонт!', myCastle.x, myCastle.y - 60, '#10b981');
				break;
			}
			case 'I00A': {
				// Lightning Orb: strikes up to 6 enemies within 1000 range of castle for 350 magic damage each
				const rangeSq = 1000 * 1000;
				const candidates = this.units.filter((u) => u.team === enemyTeam && u.state !== 'DEAD');
				candidates.sort((a, b) => {
					const distA = Math.hypot(a.x - myCastle.x, a.y - myCastle.y);
					const distB = Math.hypot(b.x - myCastle.x, b.y - myCastle.y);
					return distA - distB;
				});
				let struck = 0;
				for (const u of candidates) {
					const dx = u.x - myCastle.x;
					const dy = u.y - myCastle.y;
					if (dx * dx + dy * dy <= rangeSq) {
						this.applyUnitDamage(u, 350, 'magic', team, false);
						struck++;
						if (struck >= 6) break;
					}
				}
				this.addFloatingText(
					`Куля Блискавок! (${struck} цілей)`,
					myCastle.x,
					myCastle.y - 60,
					'#38bdf8'
				);
				break;
			}
			case 'I00E': {
				const rangeSq = 1400 * 1400;
				let debuffedCount = 0;
				for (const u of this.units) {
					if (u.team === enemyTeam && u.state !== 'DEAD') {
						const dx = u.x - myCastle.x;
						const dy = u.y - myCastle.y;
						if (dx * dx + dy * dy <= rangeSq) {
							u.buffs = u.buffs || [];
							u.buffs.push({ type: 'weakness', timer: 15, value: 0.4 });
							debuffedCount++;
						}
					}
				}
				this.addFloatingText(
					`Сувій Слабкості! (${debuffedCount} ворогів)`,
					myCastle.x,
					myCastle.y - 60,
					'#a855f7'
				);
				break;
			}
			case 'I00F': {
				this.castleInvulnerableTimer[team] = 6.0;
				this.addFloatingText(
					'Лазурний купол! (Невразливість)',
					myCastle.x,
					myCastle.y - 60,
					'#06b6d4'
				);
				break;
			}
			case 'I004': {
				myCastle.hp = Math.min(myCastle.maxHp, myCastle.hp + 2500);
				player.gold += 100;
				player.maxFood += 1;
				this.addFloatingText(
					'+2500 HP Золотий Сир! (+1 Їжа)',
					myCastle.x,
					myCastle.y - 60,
					'#eab308'
				);
				break;
			}
		}

		this.notifyStateChanged();
		return true;
	}

	// --- RESCUE STRIKE (EMERGENCY CASTLE DEFENSE) ---
	public canUseRescueStrike(team: MatchTeam): boolean {
		return this.rescueStrikeCooldown[team] <= 0;
	}

	public triggerRescueStrike(team: MatchTeam): { hitCount: number; damageDealt: number } | null {
		if (!this.canUseRescueStrike(team)) return null;

		this.rescueStrikeCooldown[team] = 180.0;
		const castle = this.castles[team];
		const enemyTeam: MatchTeam = team === 'west' ? 'east' : 'west';
		const radius = 750;
		const radiusSq = radius * radius;

		this.rescueStrikeEffects.push({
			team,
			x: castle.x,
			y: castle.y,
			radius,
			timer: 1.2,
			maxTimer: 1.2
		});

		let hitCount = 0;
		let damageDealt = 0;
		const strikeDamage = 950;

		for (const u of this.units) {
			if (u.team === enemyTeam && u.state !== 'DEAD') {
				const dx = u.x - castle.x;
				const dy = u.y - castle.y;
				if (dx * dx + dy * dy <= radiusSq) {
					this.applyUnitDamage(u, strikeDamage, 'siege', team, true);
					hitCount++;
					damageDealt += strikeDamage;
				}
			}
		}

		this.addFloatingText(`РЯТІВНИЙ УДАР! (-${strikeDamage})`, castle.x, castle.y - 75, '#f97316');

		this.notifyStateChanged();
		return { hitCount, damageDealt };
	}
}
