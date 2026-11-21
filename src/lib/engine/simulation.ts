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
	ArmorType,
	AttackType
} from './types';
import { SpatialHashGrid } from './spatialGrid';
import { calculateDamage } from './damageMatrix';
import { getBuilding, getUnit, getSpawnCooldown, RACES_LIST } from './gameData';
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

	// Callbacks
	public onFloatingText?: (text: FloatingText) => void;
	public onRoundEnd?: (winner: MatchTeam) => void;

	private nextUnitId = 1;
	private nextBuildingId = 1;
	private nextProjectileId = 1;
	private nextTextId = 1;

	constructor(config: SimulationConfig = { botDifficulty: 0, startGold: 500 }) {
		this.config = config;
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

		this.players = {
			west: {
				team: 'west',
				isBot: false,
				name: 'Гравець',
				race: westRace,
				isRandomRace: westIsRandom,
				randomGoldGranted: westIsRandom,
				gold: westGold,
				lumber: 125,
				commander: 2, // Alik
				forge: { attack: 0, armor: 0, econ: 0 },
				preferredLane: 'auto',
				stats: { unitsSpawned: 0, unitsKilled: 0, goldSpent: 0 }
			},
			east: {
				team: 'east',
				isBot: true,
				name: 'Бот v37',
				race: eastRace,
				isRandomRace: eastIsRandom,
				randomGoldGranted: eastIsRandom,
				gold: eastGold,
				lumber: 125,
				commander: 3, // Dima
				forge: { attack: 0, armor: 0, econ: 0 },
				preferredLane: 'auto',
				stats: { unitsSpawned: 0, unitsKilled: 0, goldSpent: 0 }
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
		this.notifyStateChanged();
		return true;
	}

	public notifyStateChanged(): void {
		this.stateVersion++;
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

		for (const team of ['west', 'east'] as MatchTeam[]) {
			const p = this.players[team];
			p.forge = { attack: 0, armor: 0, econ: 0 };
			p.gold = 500;
			p.lumber = 125;
			if (newRaces?.[team]) {
				p.race = newRaces[team]!;
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

		// 7. Update Floating texts
		this.updateFloatingTexts(dt);

		// 8. Cleanup dead entities
		this.units = this.units.filter((u) => u.state !== 'DEAD');
		this.projectiles = this.projectiles.filter((p) => p.damage > 0);

		// 9. Check Win Condition
		if (this.castles.west.hp <= 0 && !this.winner) {
			this.winner = 'east';
			this.score.east++;
			this.onRoundEnd?.('east');
			this.notifyStateChanged();
		} else if (this.castles.east.hp <= 0 && !this.winner) {
			this.winner = 'west';
			this.score.west++;
			this.onRoundEnd?.('west');
			this.notifyStateChanged();
		}
	}

	// --- ECONOMY ---
	private updateEconomy(dt: number): void {
		let interval = 3.0;
		let cfM = 0.65;
		if (this.gameTime >= 1500) {
			interval = 10.0;
			cfM = 1.0;
		} else if (this.gameTime >= 960) {
			interval = 7.0;
			cfM = 0.85;
		} else if (this.gameTime >= 480) {
			interval = 5.0;
			cfM = 0.75;
		}
		this.incomeInterval = interval;
		this.incomeTimer -= dt;

		if (this.incomeTimer <= 0) {
			this.incomeTimer = interval;

			for (const team of ['west', 'east'] as MatchTeam[]) {
				const player = this.players[team];

				// Total building value
				const bldValue = this.buildings
					.filter((b) => b.team === team)
					.reduce((sum, b) => sum + b.goldCost, 0);

				// Base diminishing returns curve
				const baseIncome = 10 * (0.5 + 0.002 * bldValue);

				// Forge econ bonus (+10% per level)
				let multiplier = cfM * (1 + 0.1 * player.forge.econ);

				// Commander Sasha: +12% income
				if (player.commander === 1) {
					multiplier += cfM * 0.12;
				}

				// Catch-up mechanic: if castle HP <= 70%, +15% income
				const myCastle = this.castles[team];
				if (myCastle.hp / myCastle.maxHp <= 0.7) {
					multiplier *= 1.15;
				}

				// Treasure Box: +20% income per chest
				const treasureBoxes = this.buildings.filter(
					(b) => b.team === team && b.specialType === 'treasure'
				).length;
				if (treasureBoxes > 0) {
					multiplier *= 1 + 0.2 * treasureBoxes;
				}

				const payout = Math.max(5, Math.round(baseIncome * multiplier));
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
		const startX = building.team === 'west' ? building.x + 35 : building.x - 35;

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
			x: startX,
			y: laneY + (Math.random() * 20 - 10), // slight corridor spread
			prevX: startX,
			prevY: laneY,
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
				building.race === 'Нічні ельфи' && unitDef.armor_type === 'heavy' ? 0.2 : undefined
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
			flying: false,
			currentTargetId: null,
			targetX: options.team === 'west' ? ARENA_WIDTH - 80 : 80,
			targetY: options.y,
			state: 'WALKING',
			size: 15,
			splashRadius: options.splashRadius,
			reflectDamagePct: options.reflectDamagePct,
			isScavenger: options.isScavenger
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
			if (u.state === 'DEAD') continue;

			// Process active buffs
			if (u.buffs && u.buffs.length > 0) {
				for (const b of u.buffs) {
					b.timer -= dt;
					if (b.type === 'infect') {
						u.hp -= b.value * dt;
					}
				}
				u.buffs = u.buffs.filter((b) => b.timer > 0);
				if (u.hp <= 0) {
					u.state = 'DEAD';
					continue;
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
				// No enemy nearby on this lane -> March towards enemy Castle
				u.currentTargetId = null;
				const targetCastle = u.team === 'west' ? this.castles.east : this.castles.west;
				const distToCastle = Math.hypot(targetCastle.x - u.x, targetCastle.y - u.y);

				if (distToCastle <= u.range + 50) {
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
				} else {
					u.state = 'WALKING';
					// Lane corridor guidance: steer smoothly back to lane center Y
					const dyToLane = targetLaneY - u.y;
					let stepY = 0;
					if (Math.abs(dyToLane) > 4) {
						stepY = Math.sign(dyToLane) * Math.min(Math.abs(dyToLane), currentSpeed * dt * 0.8);
					}
					const stepX = (u.team === 'west' ? 1 : -1) * currentSpeed * dt;
					u.x += stepX;
					u.y += stepY;
				}
			}
		}

		// Apply Crowd Physics & Boids Separation
		this.applyCrowdSeparation(dt);
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

		if (attacker.range > 150) {
			this.projectiles.push({
				id: `proj_${this.nextProjectileId++}`,
				sourceUnitId: attacker.instanceId,
				targetUnitId: target.instanceId,
				x: attacker.x,
				y: attacker.y,
				targetX: target.x,
				targetY: target.y,
				speed: 650,
				damage: rawDmg,
				attackType: attacker.attackType,
				isCrit,
				team: attacker.team,
				splashRadius: attacker.splashRadius
			});
		} else {
			this.applyUnitDamage(target, rawDmg, attacker.attackType, attacker.team, isCrit);

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
		isCrit: boolean
	): void {
		let effectiveArmor = target.armor;
		if (target.buffs?.some((b) => b.type === 'shield')) {
			effectiveArmor += 5;
		}
		const finalDamage = calculateDamage(attackType, target.armorType, rawDmg, effectiveArmor);
		target.hp -= finalDamage;

		this.addFloatingText(
			isCrit ? `!${finalDamage}!` : `-${finalDamage}`,
			target.x + (Math.random() * 20 - 10),
			target.y - 15,
			isCrit ? '#f59e0b' : target.team === 'west' ? '#ef4444' : '#38bdf8'
		);

		if (target.hp <= 0) {
			target.state = 'DEAD';

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

		const rawDmg =
			attacker.damageMin +
			Math.floor(Math.random() * (attacker.damageMax - attacker.damageMin + 1));
		const finalDamage = calculateDamage(attacker.attackType, 'fort', rawDmg, 5);
		castle.hp = Math.max(0, castle.hp - finalDamage);

		this.addFloatingText(`-${finalDamage}`, castle.x, castle.y - 30, '#ef4444');
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
					this.projectiles.push({
						id: `castle_shot_${this.nextProjectileId++}`,
						sourceUnitId: 'castle_' + team,
						targetUnitId: enemy.instanceId,
						x: castle.x,
						y: castle.y,
						targetX: enemy.x,
						targetY: enemy.y,
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

	// --- PROJECTILES ---
	private updateProjectiles(dt: number): void {
		for (const p of this.projectiles) {
			const target = this.units.find((u) => u.instanceId === p.targetUnitId);
			if (target && target.state !== 'DEAD') {
				p.targetX = target.x;
				p.targetY = target.y;
			}

			const dx = p.targetX - p.x;
			const dy = p.targetY - p.y;
			const dist = Math.hypot(dx, dy);

			const step = p.speed * dt;
			if (dist <= step) {
				if (target && target.state !== 'DEAD') {
					this.applyUnitDamage(target, p.damage, p.attackType, p.team, p.isCrit);
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
	public build(
		team: MatchTeam,
		defId: string,
		tileX: number,
		tileY: number,
		lane: Lane = 'top'
	): boolean {
		const bDef = getBuilding(defId);
		if (!bDef) return false;

		const player = this.players[team];
		const cost = bDef.gold_cost || 200;

		if (player.gold < cost) return false;

		// Check overlap
		const occupied = this.buildings.some(
			(b) => b.team === team && b.tileX === tileX && b.tileY === tileY
		);
		if (occupied) return false;

		// Deduct gold
		player.gold -= cost;
		player.stats.goldSpent += cost;

		const startX = team === 'west' ? WEST_GRID_START_X : EAST_GRID_START_X;
		const startY = team === 'west' ? WEST_GRID_START_Y : EAST_GRID_START_Y;

		const worldX = startX + tileX * CELL_SIZE;
		const worldY = startY + tileY * CELL_SIZE;

		const spawnCd = getSpawnCooldown(bDef, getUnit(bDef.unit));

		const building: Building = {
			instanceId: `bld_${this.nextBuildingId++}`,
			defId: bDef.id,
			name: bDef.name,
			team,
			tileX,
			tileY,
			x: worldX,
			y: worldY,
			goldCost: cost,
			spawnUnitId: bDef.unit,
			spawnCooldown: spawnCd,
			spawnTimer: bDef.specialType === 'repair' ? 0 : 4.0, // Repair starts immediately
			lane,
			upgradeFrom: bDef.upgrade_from,
			race: bDef.race || player.race,
			specialType: bDef.specialType
		};

		this.buildings.push(building);
		this.addFloatingText(`-${cost}g`, worldX, worldY - 20, '#fbbf24');

		this.notifyStateChanged();
		return true;
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

		const player = this.players[team];
		const upgradeCost =
			targetDef.upgrade_extra_cost > 0
				? targetDef.upgrade_extra_cost
				: Math.max(50, (targetDef.gold_cost || 200) - building.goldCost);

		if (player.gold < upgradeCost) return false;

		player.gold -= upgradeCost;
		player.stats.goldSpent += upgradeCost;

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
		const refund = Math.floor(building.goldCost * 0.5);

		const player = this.players[team];
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
				this.addFloatingText('+2500 HP Золотий Сир!', myCastle.x, myCastle.y - 60, '#eab308');
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
