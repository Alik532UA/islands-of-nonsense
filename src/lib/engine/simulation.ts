import type {
	Unit,
	Building,
	Projectile,
	Castle,
	PlayerState,
	Team,
	Lane,
	FloatingText,
	ArmorType,
	AttackType
} from './types';
import { SpatialHashGrid } from './spatialGrid';
import { calculateDamage } from './damageMatrix';
import { getBuilding, getUnit, getSpawnCooldown } from './gameData';

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

	public castles: Record<Team, Castle>;
	public players: Record<Team, PlayerState>;

	public spatialGrid = new SpatialHashGrid(80);

	public winner: Team | null = null;
	public round = 1;
	public score = { west: 0, east: 0 };

	// Economy state
	public incomeTimer = 3.0; // Current countdown
	public incomeInterval = 3.0;

	// Callbacks
	public onFloatingText?: (text: FloatingText) => void;
	public onRoundEnd?: (winner: Team) => void;

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
		this.winner = null;

		for (const team of ['west', 'east'] as Team[]) {
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

			for (const team of ['west', 'east'] as Team[]) {
				const player = this.players[team];
				const enemyTeam: Team = team === 'west' ? 'east' : 'west';

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
		let lane = building.lane;
		if (player.preferredLane !== 'auto') {
			lane = player.preferredLane;
		} else {
			lane = building.y < ARENA_HEIGHT / 2 ? 'top' : 'bottom';
		}

		const laneY = lane === 'top' ? TOP_LANE_Y : BOTTOM_LANE_Y;
		const startX = building.team === 'west' ? building.x + 35 : building.x - 35;

		// Calculate commander & forge bonuses
		let damageBonusPct = player.forge.attack * 0.08;
		let armorBonus = player.forge.armor * 1.0;
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
			speed: (unitDef.raw_fields?.umvs ?? 270) * 0.36,
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

	// --- UNITS ---
	private updateUnits(dt: number): void {
		for (const u of this.units) {
			if (u.state === 'DEAD') continue;

			u.prevX = u.x;
			u.prevY = u.y;
			u.cooldownTimer -= dt;

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
						u.cooldownTimer = u.attackCooldown;
						this.performAttack(u, enemyTarget);
					}
				} else {
					// Move towards enemy on the lane
					u.state = 'WALKING';
					const dirX = dx / dist;
					const dirY = dy / dist;
					u.x += dirX * u.speed * dt;
					u.y += dirY * u.speed * dt;
				}
			} else {
				// No enemy nearby on this lane -> March towards enemy Castle
				u.currentTargetId = null;
				const targetCastle = u.team === 'west' ? this.castles.east : this.castles.west;
				const distToCastle = Math.hypot(targetCastle.x - u.x, targetCastle.y - u.y);

				if (distToCastle <= u.range + 50) {
					u.state = 'ATTACKING';
					if (u.cooldownTimer <= 0) {
						u.cooldownTimer = u.attackCooldown;
						this.attackCastle(u, targetCastle);
					}
				} else {
					u.state = 'WALKING';
					// Lane corridor guidance: steer smoothly back to lane center Y
					const dyToLane = targetLaneY - u.y;
					let stepY = 0;
					if (Math.abs(dyToLane) > 4) {
						stepY = Math.sign(dyToLane) * Math.min(Math.abs(dyToLane), u.speed * dt * 0.8);
					}
					const stepX = (u.team === 'west' ? 1 : -1) * u.speed * dt;
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
		if (target.evadeChance && Math.random() < target.evadeChance) {
			this.addFloatingText('Ухилення!', target.x, target.y - 20, '#60a5fa');
			return;
		}

		// Roll raw damage
		let rawDmg =
			attacker.damageMin + Math.floor(Math.random() * (attacker.damageMax - attacker.damageMin + 1));

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
		const finalDamage = calculateDamage(attackType, target.armorType, rawDmg, target.armor);
		target.hp -= finalDamage;

		this.addFloatingText(
			isCrit ? `!${finalDamage}!` : `-${finalDamage}`,
			target.x + (Math.random() * 20 - 10),
			target.y - 15,
			isCrit ? '#f59e0b' : target.team === 'west' ? '#ef4444' : '#38bdf8'
		);

		if (target.hp <= 0) {
			target.state = 'DEAD';
			this.players[attackerTeam].stats.unitsKilled++;
		}
	}

	private attackCastle(attacker: Unit, castle: Castle): void {
		let rawDmg =
			attacker.damageMin + Math.floor(Math.random() * (attacker.damageMax - attacker.damageMin + 1));
		const finalDamage = calculateDamage(attacker.attackType, 'fort', rawDmg, 5);
		castle.hp = Math.max(0, castle.hp - finalDamage);

		this.addFloatingText(`-${finalDamage}`, castle.x, castle.y - 30, '#ef4444');
		this.notifyStateChanged();
	}

	// --- CASTLE DEFENSE ---
	private castleCooldowns = { west: 0, east: 0 };
	private updateCastles(dt: number): void {
		for (const team of ['west', 'east'] as Team[]) {
			const castle = this.castles[team];
			this.castleCooldowns[team] -= dt;

			if (this.castleCooldowns[team] <= 0) {
				const enemy = this.spatialGrid.findClosestEnemy(castle.x, castle.y, 450, team, undefined, true);
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
	public build(team: Team, defId: string, tileX: number, tileY: number, lane: Lane = 'top'): boolean {
		const bDef = getBuilding(defId);
		if (!bDef) return false;

		const player = this.players[team];
		const cost = bDef.gold_cost || 200;

		if (player.gold < cost) return false;

		// Check overlap
		const occupied = this.buildings.some((b) => b.team === team && b.tileX === tileX && b.tileY === tileY);
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

	public upgradeForge(team: Team, type: 'attack' | 'armor' | 'econ'): boolean {
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

	public getForgePrice(team: Team, type: 'attack' | 'armor' | 'econ'): number {
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
}
