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
	ArmorType,
	AttackType
} from './types';
import { SpatialHashGrid } from './spatialGrid';
import { calculateDamage } from './damageMatrix';
import { getBuilding, getUnit, getSpawnCooldown } from './gameData';
import { getRaceAbility } from './raceAbilities';
import { getRandomBoss } from './bosses';

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
}

export class Simulation {
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

	// Neutral Central Bosses (Spawn every 180s, alternating lanes)
	public bossSpawnTimer = 180.0;
	public bossIndex = 0;
	public lastBossLane: Lane = 'bottom';
	public lastBossId = -1;
	public activeBossInstanceId: string | null = null;

	// Callbacks
	public onFloatingText?: (text: FloatingText) => void;
	public onRoundEnd?: (winner: MatchTeam) => void;

	private nextUnitId = 1;
	private nextBuildingId = 1;
	private nextProjectileId = 1;
	private nextTextId = 1;

	constructor(config: SimulationConfig = { botDifficulty: 0, startGold: 500 }) {
		this.castles = {
			west: { team: 'west', x: 60, y: 400, hp: 14000, maxHp: 14000 },
			east: { team: 'east', x: 2340, y: 400, hp: 14000, maxHp: 14000 }
		};

		this.players = {
			west: {
				team: 'west',
				isBot: false,
				name: 'Гравець',
				race: 'Люди',
				gold: config.startGold,
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
				race: 'Орки',
				gold: Math.round(config.startGold * (config.botDifficulty > 0 ? 1.3 : 1.0)),
				lumber: 125,
				commander: 3, // Dima
				forge: { attack: 0, armor: 0, econ: 0 },
				preferredLane: 'auto',
				stats: { unitsSpawned: 0, unitsKilled: 0, goldSpent: 0 }
			}
		};
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
		this.bossSpawnTimer = 180.0;
		this.bossIndex = 0;
		this.lastBossLane = 'bottom';
		this.lastBossId = -1;
		this.activeBossInstanceId = null;
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

		// Boss timer countdown
		if (!this.activeBossInstanceId) {
			this.bossSpawnTimer -= dt;
			if (this.bossSpawnTimer <= 0) {
				this.spawnBoss();
			}
		}

		// 1. Update Economy
		this.updateEconomy(dt);

		// 2. Update Buildings & Spawning
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

				const payout = Math.max(5, Math.round(baseIncome * multiplier));
				player.gold += payout;

				// Spawn income text above castle
				this.addFloatingText(`+${payout}g`, myCastle.x, myCastle.y - 50, '#fbbf24');
			}

			this.notifyStateChanged();
		}
	}

	// --- BUILDINGS ---
	private updateBuildings(dt: number): void {
		for (const b of this.buildings) {
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
			evadeChance: player.commander === 6 ? 0.2 : 0
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
		range?: number;
		attackCooldown?: number;
		damage?: number;
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
			maxHp: options.hp ?? 500,
			armor: 2,
			armorType: 'medium',
			attackType: 'normal',
			damageMin: options.damage ?? 50,
			damageMax: options.damage ?? 50,
			damageBonusPct: 0,
			armorBonus: 0,
			attackCooldown: options.attackCooldown ?? 1.0,
			cooldownTimer: 0,
			range: options.range ?? 100,
			speed: 100,
			flying: false,
			currentTargetId: null,
			targetX: options.team === 'west' ? ARENA_WIDTH - 80 : 80,
			targetY: options.y,
			state: 'WALKING',
			size: 15
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
				team: attacker.team
			});
		} else {
			this.applyUnitDamage(target, rawDmg, attacker.attackType, attacker.team, isCrit);
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
					this.castleCooldowns[team] = 1.0;
					this.projectiles.push({
						id: `castle_shot_${this.nextProjectileId++}`,
						sourceUnitId: 'castle_' + team,
						targetUnitId: enemy.instanceId,
						x: castle.x,
						y: castle.y,
						targetX: enemy.x,
						targetY: enemy.y,
						speed: 700,
						damage: 85,
						attackType: 'siege',
						isCrit: false,
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
			spawnTimer: 4.0, // Initial spawn delay
			lane,
			upgradeFrom: bDef.upgrade_from,
			race: bDef.race || player.race
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
}
