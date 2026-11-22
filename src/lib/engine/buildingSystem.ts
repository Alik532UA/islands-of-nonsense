import type { Simulation } from './simulation';
import {
	ARENA_WIDTH,
	ARENA_HEIGHT,
	TOP_LANE_Y,
	BOTTOM_LANE_Y,
	WEST_GRID_START_X,
	WEST_GRID_START_Y,
	EAST_GRID_START_X,
	EAST_GRID_START_Y,
	GRID_STEP,
	CELL_SIZE
} from './constants';
import type { MatchTeam, Lane, Building, Unit, ArmorType, AttackType } from './types';
import {
	getBuilding,
	getUnit,
	getSpawnCooldown,
	resolveUnitAbility,
	isLegendaryBuilding
} from './gameData';

/**
 * BuildingSystem handles building placement validation, construction,
 * upgrades, deconstruction (selling), passive spawn ticking, and unit spawning.
 */
export class BuildingSystem {
	constructor(private sim: Simulation) {}

	/**
	 * Checks whether a given plot is valid for building.
	 * Disallows road surfaces, dividing walls, existing buildings, and castle footprints.
	 */
	public canBuild(team: MatchTeam, tileX: number, tileY: number): boolean {
		const startX = team === 'west' ? WEST_GRID_START_X : EAST_GRID_START_X;
		const startY = team === 'west' ? WEST_GRID_START_Y : EAST_GRID_START_Y;
		const worldX = startX + tileX * GRID_STEP;
		const worldY = startY + tileY * GRID_STEP;
		const bWidth = CELL_SIZE;
		const bHeight = CELL_SIZE;

		// 1. Boundary & Base territory checks (Full Warcraft III Courtyard coverage)
		if (team === 'west') {
			if (worldX < 64 || worldX + bWidth > 1440) return false;
			if (worldY < 64 || worldY + bHeight > ARENA_HEIGHT - 64) return false;
			// Clear of West Castle footprint [80..320, 1060..1340]
			if (worldX + bWidth > 70 && worldX < 330 && worldY + bHeight > 1050 && worldY < 1350) {
				return false;
			}
		} else {
			if (worldX < ARENA_WIDTH - 1440 || worldX + bWidth > ARENA_WIDTH - 64) return false;
			if (worldY < 64 || worldY + bHeight > ARENA_HEIGHT - 64) return false;
			// Clear of East Castle footprint
			if (
				worldX + bWidth > ARENA_WIDTH - 330 &&
				worldX < ARENA_WIDTH - 70 &&
				worldY + bHeight > 1050 &&
				worldY < 1350
			) {
				return false;
			}
		}

		// 2. Overlap with Existing Buildings (allowing 0 gap, 1 gap, 2 gap...)
		for (const b of this.sim.buildings) {
			if (b.team !== team) continue;
			const overlapX = Math.max(0, Math.min(worldX + bWidth, b.x + bWidth) - Math.max(worldX, b.x));
			const overlapY = Math.max(
				0,
				Math.min(worldY + bHeight, b.y + bHeight) - Math.max(worldY, b.y)
			);
			if (overlapX > 2 && overlapY > 2) {
				return false;
			}
		}

		// 3. Overlap with Base Ramparts with open Road Gates
		if (team === 'west') {
			if (worldX + bWidth > 1440 && worldX < 1500) {
				const isTopGate = worldY >= 560 && worldY + bHeight <= 760;
				const isBotGate = worldY >= 1640 && worldY + bHeight <= 1840;
				if (!isTopGate && !isBotGate) return false;
			}
		} else {
			if (worldX + bWidth > ARENA_WIDTH - 1500 && worldX < ARENA_WIDTH - 1440) {
				const isTopGate = worldY >= 560 && worldY + bHeight <= 760;
				const isBotGate = worldY >= 1640 && worldY + bHeight <= 1840;
				if (!isTopGate && !isBotGate) return false;
			}
		}

		// 4. Overlap with Cobblestone Road Network
		if (this.isBoxOnRoad(worldX, worldY, bWidth, bHeight)) {
			return false;
		}

		return true;
	}

	public isBoxOnRoad(rx: number, ry: number, rw: number, rh: number): boolean {
		const roadHeight = 160;
		const rMaxX = rx + rw;
		const rMaxY = ry + rh;
		const rMidY = ry + rh / 2;

		// Top highway (between base courtyards)
		const topMinY = TOP_LANE_Y - roadHeight / 2;
		const topMaxY = TOP_LANE_Y + roadHeight / 2;
		if (rMaxX > 1440 && rx < ARENA_WIDTH - 1440 && rMaxY > topMinY && ry < topMaxY) {
			return true;
		}

		// Bottom highway (between base courtyards)
		const botMinY = BOTTOM_LANE_Y - roadHeight / 2;
		const botMaxY = BOTTOM_LANE_Y + roadHeight / 2;
		if (rMaxX > 1440 && rx < ARENA_WIDTH - 1440 && rMaxY > botMinY && ry < botMaxY) {
			return true;
		}

		// West road fan-out to castle from x = 200 to x = 1440
		if (rx >= 180 && rx < 1440) {
			const progress = (rx - 180) / (1440 - 180);
			const expectedTopY = 1140 + progress * (TOP_LANE_Y - 1140);
			if (Math.abs(rMidY - expectedTopY) < roadHeight / 2 + 10) return true;

			const expectedBotY = 1260 + progress * (BOTTOM_LANE_Y - 1260);
			if (Math.abs(rMidY - expectedBotY) < roadHeight / 2 + 10) return true;
		}

		// East road fan-out to castle
		const eastStart = ARENA_WIDTH - 1440;
		const eastEnd = ARENA_WIDTH - 180;
		if (rMaxX > eastStart && rx <= eastEnd) {
			const progress = (rx - eastStart) / (eastEnd - eastStart);
			const expectedTopY = TOP_LANE_Y + progress * (1140 - TOP_LANE_Y);
			if (Math.abs(rMidY - expectedTopY) < roadHeight / 2 + 10) return true;

			const expectedBotY = BOTTOM_LANE_Y + progress * (1260 - BOTTOM_LANE_Y);
			if (Math.abs(rMidY - expectedBotY) < roadHeight / 2 + 10) return true;
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

		const player = this.sim.players[team];
		const cost = bDef.gold_cost || 200;

		if (player.gold < cost) return false;

		// Check food requirement for legendary structures
		if (isLegendaryBuilding(bDef)) {
			if (player.food >= player.maxFood) {
				const startX = team === 'west' ? WEST_GRID_START_X : EAST_GRID_START_X;
				const startY = team === 'west' ? WEST_GRID_START_Y : EAST_GRID_START_Y;
				const worldX = startX + tileX * GRID_STEP;
				const worldY = startY + tileY * GRID_STEP;
				this.sim.addFloatingText(
					'Потрібна Їжа! Купіть Сир у замку',
					worldX,
					worldY - 20,
					'#ef4444'
				);
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

		const worldX = startX + tileX * GRID_STEP;
		const worldY = startY + tileY * GRID_STEP;

		const spawnCd = getSpawnCooldown(bDef, getUnit(bDef.unit));

		const isBot = player.isBot;
		const buildTime = isBot ? 2.5 : 3.5;

		// Natural automated lane determination based on physical courtyard placement
		const resolvedLane: Lane = worldY < ARENA_HEIGHT / 2 ? 'top' : 'bottom';

		const building: Building = {
			instanceId: `bld_${this.sim.nextBuildingId++}`,
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
			spawnTimer: bDef.specialType === 'repair' ? 0 : spawnCd,
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

		this.sim.buildings.push(building);
		if (isLegendaryBuilding(bDef)) {
			player.food++;
		}
		if (player.worker) {
			// Push worker out if caught inside footprint
			const resolved = this.sim.workerSystem.resolveGroundObstacles(
				player.worker.x,
				player.worker.y,
				14
			);
			player.worker.x = resolved.x;
			player.worker.y = resolved.y;

			const spot = this.sim.workerSystem.getBestConstructionSpot(
				team,
				player.worker.x,
				player.worker.y,
				worldX,
				worldY
			);
			player.worker.targetX = spot.x;
			player.worker.targetY = spot.y;
			player.worker.targetBuildingId = building.instanceId;
			player.worker.isBuilding = false;
			player.worker.path = this.sim.workerSystem.findWorkerPath(
				team,
				player.worker.x,
				player.worker.y,
				spot.x,
				spot.y
			);
		}
		this.sim.addFloatingText(`-${cost}g`, worldX, worldY - 20, '#fbbf24');

		this.sim.notifyStateChanged();
		return true;
	}

	public upgradeBuilding(
		team: MatchTeam,
		buildingInstanceId: string,
		targetDefId: string
	): boolean {
		const building = this.sim.buildings.find(
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
		const player = this.sim.players[team];

		if (targetIsLeg && !currentIsLeg) {
			if (player.food >= player.maxFood) {
				this.sim.addFloatingText(
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

		this.sim.addFloatingText(`-${upgradeCost}g (Апгрейд)`, building.x, building.y - 20, '#38bdf8');
		this.sim.notifyStateChanged();
		return true;
	}

	public sellBuilding(team: MatchTeam, buildingInstanceId: string): boolean {
		const idx = this.sim.buildings.findIndex(
			(b) => b.instanceId === buildingInstanceId && b.team === team
		);
		if (idx === -1) return false;

		const building = this.sim.buildings[idx];
		const player = this.sim.players[team];
		const currentDef = getBuilding(building.defId);
		if (isLegendaryBuilding(currentDef)) {
			player.food = Math.max(0, player.food - 1);
		}
		// Cancelled construction refunds 75%; fully built refunds 50%
		const refundRate = building.isUnderConstruction ? 0.75 : 0.5;
		const refund = Math.floor(building.goldCost * refundRate);

		player.gold += refund;

		// Cancel active worker construction/repair
		const worker = player.worker;
		if (
			worker &&
			(worker.targetBuildingId === buildingInstanceId ||
				worker.targetRepairBuildingId === buildingInstanceId)
		) {
			worker.isBuilding = false;
			worker.isRepairing = false;
			worker.targetBuildingId = null;
			worker.targetRepairBuildingId = null;
			worker.path = [];
		}

		this.sim.buildings.splice(idx, 1);
		const tag = building.isUnderConstruction ? 'Скасовано' : 'Знесено';
		this.sim.addFloatingText(`+${refund}g (${tag})`, building.x, building.y - 20, '#fbbf24');
		this.sim.notifyStateChanged();
		return true;
	}

	public updateBuildings(dt: number): void {
		const castleHealAmount: Record<MatchTeam, number> = { west: 0, east: 0 };

		for (const b of this.sim.buildings) {
			if (b.isUnderConstruction) {
				continue;
			}
			if (b.specialType === 'repair') {
				b.spawnTimer -= dt;
				if (b.spawnTimer <= 0) {
					b.spawnTimer = 1.0;
					castleHealAmount[b.team] += 25;
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

		for (const team of ['west', 'east'] as MatchTeam[]) {
			const heal = castleHealAmount[team];
			if (heal > 0) {
				const castle = this.sim.castles[team];
				if (castle.hp < castle.maxHp) {
					const actual = Math.min(castle.maxHp - castle.hp, heal);
					castle.hp += actual;
					this.sim.addFloatingText(`+${actual} HP`, castle.x, castle.y - 45, '#10b981');
				}
			}
		}
	}

	public spawnUnitFromBuilding(building: Building): Unit | null {
		const unitDef = getUnit(building.spawnUnitId);
		if (!unitDef) return null;

		const player = this.sim.players[building.team];
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
		// Find unblocked doorway perimeter spot outside solid core
		const frontX = isWest ? building.x + CELL_SIZE + 16 : building.x - 16;
		const frontY = building.y + CELL_SIZE / 2;
		const spawnPos = unitDef.flying
			? { x: frontX, y: frontY }
			: this.sim.workerSystem.getBestConstructionSpot(
					building.team,
					frontX,
					frontY,
					building.x,
					building.y
				);
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
			instanceId: `unit_${this.sim.nextUnitId++}`,
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
			speed: Number(unitDef.raw_fields?.umvs) || 270,
			flying: !!unitDef.flying,
			currentTargetId: null,
			targetX: building.team === 'west' ? ARENA_WIDTH - 200 : 200,
			targetY: laneY,
			state: 'WALKING',
			size: unitDef.flying ? 22 : 16,
			critChance: player.commander === 5 ? 0.25 : 0,
			splashRadius: unitDef.splashRadius,
			reflectDamagePct: unitDef.reflectDamagePct,
			isScavenger: unitDef.isScavenger,
			abilityType: resolveUnitAbility(unitDef),
			abilityCooldownTimer: 0,
			buildingDefId: building.defId,
			buildingName: building.name
		};

		this.sim.units.push(unit);
		this.sim.notifyStateChanged();
		return unit;
	}
}
