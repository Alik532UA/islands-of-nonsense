import type { Simulation } from './simulation';
import {
	ARENA_WIDTH,
	ARENA_HEIGHT,
	TOP_LANE_Y,
	MID_LANE_Y,
	BOTTOM_LANE_Y,
	BRIDGE_SPAN_MIN_X,
	BRIDGE_SPAN_MAX_X,
	WEST_ISLAND_CENTER_X,
	WEST_ISLAND_CENTER_Y,
	EAST_ISLAND_CENTER_X,
	EAST_ISLAND_CENTER_Y,
	ISLAND_RADIUS_X,
	ISLAND_RADIUS_Y,
	WEST_GRID_START_X,
	WEST_GRID_START_Y,
	EAST_GRID_START_X,
	EAST_GRID_START_Y,
	GRID_STEP,
	CELL_SIZE,
	ROAD_WIDTH,
	ROAD_HALF_WIDTH,
	HIGHWAY_SEGMENTS
} from './constants';
import type { MatchTeam, Lane, Building, Unit, ArmorType, AttackType, PlayerState } from './types';
import {
	getBuilding,
	getUnit,
	getSpawnCooldown,
	resolveUnitAbility,
	getUnitAbilities,
	isLegendaryBuilding
} from './gameData';

/**
 * Calculates Euclidean distance from a point (px, py) to a 2D line segment (x1, y1)-(x2, y2).
 */
export function distToSegment(
	px: number,
	py: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number
): number {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const lenSq = dx * dx + dy * dy;
	if (lenSq === 0) return Math.hypot(px - x1, py - y1);
	const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
	return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/**
 * Calculates the minimum distance from a point (px, py) to the centerline of the entire road network.
 */
export function distToRoadNetwork(px: number, py: number): number {
	let minDist = Infinity;
	for (let i = 0; i < HIGHWAY_SEGMENTS.length; i++) {
		const seg = HIGHWAY_SEGMENTS[i];
		const d = distToSegment(px, py, seg.x1, seg.y1, seg.x2, seg.y2);
		if (d < minDist) {
			minDist = d;
		}
	}
	return minDist;
}

/**
 * BuildingSystem handles building placement validation, construction,
 * upgrades, deconstruction (selling), passive spawn ticking, and unit spawning.
 */
export class BuildingSystem {
	constructor(private sim: Simulation) {}

	/**
	 * Determines whether a world coordinate is on solid island landmass (and not in the ocean).
	 */
	public isPointOnIsland(team: MatchTeam, x: number, y: number, margin = 20): boolean {
		if (team === 'west') {
			const cx = WEST_ISLAND_CENTER_X;
			const cy = WEST_ISLAND_CENTER_Y;
			const rx = ISLAND_RADIUS_X - margin;
			const ry = ISLAND_RADIUS_Y - margin;

			if (x < 160 + margin || x > BRIDGE_SPAN_MIN_X - margin) return false;
			if (y < 160 + margin || y > ARENA_HEIGHT - 160 - margin) return false;

			const dx = x - cx;
			const dy = y - cy;

			if (dx <= 0) {
				return (dx / (rx - 40)) ** 2 + (dy / ry) ** 2 <= 1.0;
			}
			// East half towards bridges
			const ellipseVal = (dx / (rx + 150)) ** 2 + (dy / ry) ** 2;
			if (ellipseVal <= 1.0) return true;
			// Bridgehead approaches
			if (
				x <= BRIDGE_SPAN_MIN_X - margin &&
				(Math.abs(y - TOP_LANE_Y) < 180 ||
					Math.abs(y - MID_LANE_Y) < 180 ||
					Math.abs(y - BOTTOM_LANE_Y) < 180)
			) {
				return true;
			}
			return false;
		} else {
			const cx = EAST_ISLAND_CENTER_X;
			const cy = EAST_ISLAND_CENTER_Y;
			const rx = ISLAND_RADIUS_X - margin;
			const ry = ISLAND_RADIUS_Y - margin;

			if (x < BRIDGE_SPAN_MAX_X + margin || x > ARENA_WIDTH - 160 - margin) return false;
			if (y < 160 + margin || y > ARENA_HEIGHT - 160 - margin) return false;

			const dx = x - cx;
			const dy = y - cy;

			if (dx >= 0) {
				return (dx / (rx - 40)) ** 2 + (dy / ry) ** 2 <= 1.0;
			}
			const ellipseVal = (dx / (rx + 150)) ** 2 + (dy / ry) ** 2;
			if (ellipseVal <= 1.0) return true;
			if (
				x >= BRIDGE_SPAN_MAX_X + margin &&
				(Math.abs(y - TOP_LANE_Y) < 180 ||
					Math.abs(y - MID_LANE_Y) < 180 ||
					Math.abs(y - BOTTOM_LANE_Y) < 180)
			) {
				return true;
			}
			return false;
		}
	}

	/**
	 * Checks if a point is on a road or within a given clearance from roads.
	 * Default clearance is 145px: 75px (road half-width) + 32px (1 grid cell clearance) + 38px buffer.
	 */
	public isPointNearRoad(x: number, y: number, clearance = 145): boolean {
		// Central strait / river / bridges
		if (x > BRIDGE_SPAN_MIN_X - 100 && x < BRIDGE_SPAN_MAX_X + 100) {
			return true;
		}

		// Distance to all active highway segments (angled ramps and horizontal pre-bridge highways)
		if (distToRoadNetwork(x, y) < clearance) {
			return true;
		}

		// West Courtyard & Rear Lanes (x < 1500): keep lane corridors clear for army march
		if (x < 1500) {
			if (Math.abs(y - TOP_LANE_Y) < clearance) return true;
			if (Math.abs(y - MID_LANE_Y) < clearance) return true;
			if (Math.abs(y - BOTTOM_LANE_Y) < clearance) return true;
		}

		// East Courtyard & Rear Lanes (x > 5700): keep lane corridors clear for army march
		if (x > 5700) {
			if (Math.abs(y - TOP_LANE_Y) < clearance) return true;
			if (Math.abs(y - MID_LANE_Y) < clearance) return true;
			if (Math.abs(y - BOTTOM_LANE_Y) < clearance) return true;
		}

		return false;
	}

	/**
	 * Checks whether a given plot is valid for building.
	 * Disallows water, road surfaces, dividing walls, existing buildings, decorative obstacles, and castle footprints.
	 */
	public canBuild(team: MatchTeam, tileX: number, tileY: number): boolean {
		const startX = team === 'west' ? WEST_GRID_START_X : EAST_GRID_START_X;
		const startY = team === 'west' ? WEST_GRID_START_Y : EAST_GRID_START_Y;
		const worldX = startX + tileX * GRID_STEP;
		const worldY = startY + tileY * GRID_STEP;
		const bWidth = CELL_SIZE;
		const bHeight = CELL_SIZE;

		// 1. Water check: All four corners of building footprint must be on solid island landmass
		if (
			!this.isPointOnIsland(team, worldX, worldY, 15) ||
			!this.isPointOnIsland(team, worldX + bWidth, worldY, 15) ||
			!this.isPointOnIsland(team, worldX, worldY + bHeight, 15) ||
			!this.isPointOnIsland(team, worldX + bWidth, worldY + bHeight, 15)
		) {
			return false;
		}

		// 2. Castle footprint clearance
		const castleX = team === 'west' ? WEST_ISLAND_CENTER_X : EAST_ISLAND_CENTER_X;
		const castleY = team === 'west' ? WEST_ISLAND_CENTER_Y : EAST_ISLAND_CENTER_Y;
		const dx = worldX + bWidth / 2 - castleX;
		const dy = worldY + bHeight / 2 - castleY;
		if (Math.abs(dx) < 140 && Math.abs(dy) < 140) {
			return false;
		}

		// 3. Overlap with Existing Buildings
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

		// 4. Overlap with Natural Decorations (monoliths, crystals, mushrooms, braziers, bushes)
		for (const d of this.sim.decorations) {
			if (d.team !== team) continue;
			const cX = Math.max(worldX, Math.min(worldX + bWidth, d.x));
			const cY = Math.max(worldY, Math.min(worldY + bHeight, d.y));
			if (Math.hypot(d.x - cX, d.y - cY) < d.radius + 6) {
				return false;
			}
		}

		// 5. Overlap with Cobblestone Road Network
		if (this.isBoxOnRoad(worldX, worldY, bWidth, bHeight)) {
			return false;
		}

		return true;
	}

	public isBoxOnRoad(rx: number, ry: number, rw: number, rh: number): boolean {
		const rMaxX = rx + rw;
		const rMidX = rx + rw / 2;
		const rMidY = ry + rh / 2;

		// Bridges strait area is always road / water
		if (rMaxX > BRIDGE_SPAN_MIN_X - 60 && rx < BRIDGE_SPAN_MAX_X + 60) {
			return true;
		}

		// Check overlap with the highway network
		// Road half-width is ROAD_HALF_WIDTH (75px).
		// Box radius is Math.min(rw, rh) / 2 (e.g. 32px for 64x64 building).
		const boxRadius = Math.min(rw, rh) / 2;
		if (distToRoadNetwork(rMidX, rMidY) < ROAD_HALF_WIDTH + boxRadius - 2) {
			return true;
		}

		return false;
	}

	public build(
		team: MatchTeam,
		defId: string,
		tileX: number,
		tileY: number,
		_lane: Lane = 'top',
		playerInput?: PlayerState,
		shiftKey = false
	): boolean {
		const bDef = getBuilding(defId);
		if (!bDef) return false;

		const player = playerInput || this.sim.players[team];
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

		const startX = team === 'west' ? WEST_GRID_START_X : EAST_GRID_START_X;
		const startY = team === 'west' ? WEST_GRID_START_Y : EAST_GRID_START_Y;
		const worldX = startX + tileX * GRID_STEP;
		const worldY = startY + tileY * GRID_STEP;

		// Check game mode building restrictions (-nu, -na, -nl)
		if (this.sim.gameModeConfig?.noSpecialBuildings) {
			if (bDef.specialType && bDef.specialType !== 'tower' && bDef.specialType !== 'treasure') {
				this.sim.addFloatingText(
					'Режим -nu: особливі споруди заборонені!',
					worldX,
					worldY - 20,
					'#ef4444'
				);
				return false;
			}
		}

		if (this.sim.gameModeConfig?.noArtillery) {
			const spawnedUnit = getUnit(bDef.unit);
			const isArtillery =
				bDef.attack_type === 'siege' ||
				spawnedUnit?.attack_type === 'siege' ||
				['h001', 'h048', 'h01E', 'u008', 'cg0a', 'h04P'].includes(bDef.id);
			if (isArtillery) {
				this.sim.addFloatingText(
					'Режим -na: артилерія заборонена!',
					worldX,
					worldY - 20,
					'#ef4444'
				);
				return false;
			}
		}

		if (this.sim.gameModeConfig?.noLegendaries && isLegendaryBuilding(bDef)) {
			this.sim.addFloatingText(
				'Режим -nl: легендарні споруди заборонені!',
				worldX,
				worldY - 20,
				'#ef4444'
			);
			return false;
		}

		// Check lumber requirements
		const lumberCost = bDef.lumber_cost || 0;
		if (lumberCost > 0 && player.lumber < lumberCost) {
			this.sim.addFloatingText(
				`Потрібна Деревина! (${lumberCost}🪵)`,
				worldX,
				worldY - 20,
				'#10b981'
			);
			return false;
		}

		// Validate build plot
		if (!this.canBuild(team, tileX, tileY)) return false;

		// Deduct gold and lumber
		player.gold -= cost;
		player.stats.goldSpent += cost;
		if (lumberCost > 0) {
			player.lumber -= lumberCost;
		}

		const spawnCd = getSpawnCooldown(bDef, getUnit(bDef.unit));

		const isBot = player.isBot;
		const buildTime = isBot ? 2.5 : 3.5;

		// Natural automated lane determination based on physical courtyard placement (or single lane mode)
		const resolvedLane: Lane =
			this.sim.gameModeConfig?.singleLane ?? (worldY < ARENA_HEIGHT / 2 ? 'top' : 'bottom');

		const building: Building = {
			instanceId: `bld_${this.sim.nextBuildingId++}`,
			defId: bDef.id,
			name: bDef.name,
			team,
			playerId: player.id,
			playerSlot: player.slot,
			tileX,
			tileY,
			x: worldX,
			y: worldY,
			hp: Math.round((bDef.hp || 1200) * 0.15),
			maxHp: bDef.hp || 1200,
			armor: bDef.armor ?? 5,
			armorType: (bDef.armor_type as ArmorType) || 'fort',
			goldCost: cost,
			lumberCost,
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
			const isBusy =
				player.worker.isBuilding ||
				(player.worker.targetBuildingId &&
					this.sim.buildings.some(
						(b) => b.instanceId === player.worker!.targetBuildingId && b.isUnderConstruction
					)) ||
				player.worker.isRepairing;

			if (shiftKey && isBusy) {
				// Warcraft 3 Shift-Queue: Keep worker working on current task, queue this new building!
				player.worker.buildQueue = player.worker.buildQueue || [];
				player.worker.buildQueue.push(building.instanceId);
				this.sim.addFloatingText('У черзі', worldX + CELL_SIZE / 2, worldY - 20, '#38bdf8');
			} else {
				// Normal build: leave current building and immediately proceed to build new one
				player.worker.buildQueue = [];
				player.worker.isBuilding = false;
				player.worker.isRepairing = false;
				player.worker.targetRepairBuildingId = null;

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
				player.worker.path = this.sim.workerSystem.findWorkerPath(
					team,
					player.worker.x,
					player.worker.y,
					spot.x,
					spot.y
				);
			}
		}
		this.sim.addFloatingText(`-${cost}g`, worldX, worldY - 20, '#fbbf24');

		this.sim.notifyStateChanged();
		return true;
	}

	public upgradeBuilding(
		team: MatchTeam,
		buildingInstanceId: string,
		targetDefId: string,
		playerInput?: PlayerState
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
		const player = playerInput || this.sim.players[team];

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

		if (this.sim.gameModeConfig?.noSpecialBuildings) {
			if (
				targetDef.specialType &&
				targetDef.specialType !== 'tower' &&
				targetDef.specialType !== 'treasure'
			) {
				this.sim.addFloatingText(
					'Режим -nu: особливі споруди заборонені!',
					building.x,
					building.y - 20,
					'#ef4444'
				);
				return false;
			}
		}

		if (this.sim.gameModeConfig?.noArtillery) {
			const spawnedUnit = getUnit(targetDef.unit);
			const isArtillery =
				targetDef.attack_type === 'siege' ||
				spawnedUnit?.attack_type === 'siege' ||
				['h001', 'h048', 'h01E', 'u008', 'cg0a', 'h04P'].includes(targetDef.id);
			if (isArtillery) {
				this.sim.addFloatingText(
					'Режим -na: артилерія заборонена!',
					building.x,
					building.y - 20,
					'#ef4444'
				);
				return false;
			}
		}

		if (this.sim.gameModeConfig?.noLegendaries && isLegendaryBuilding(targetDef)) {
			this.sim.addFloatingText(
				'Режим -nl: легендарні споруди заборонені!',
				building.x,
				building.y - 20,
				'#ef4444'
			);
			return false;
		}

		const upgradeLumber = targetDef.lumber_cost || 0;
		if (upgradeLumber > 0 && player.lumber < upgradeLumber) {
			this.sim.addFloatingText(
				`Потрібна Деревина! (${upgradeLumber}🪵)`,
				building.x,
				building.y - 20,
				'#10b981'
			);
			return false;
		}

		const upgradeCost =
			targetDef.upgrade_extra_cost > 0
				? targetDef.upgrade_extra_cost
				: Math.max(50, (targetDef.gold_cost || 200) - building.goldCost);

		if (player.gold < upgradeCost) return false;

		player.gold -= upgradeCost;
		player.stats.goldSpent += upgradeCost;
		if (upgradeLumber > 0) {
			player.lumber -= upgradeLumber;
		}
		building.lumberCost = (building.lumberCost || 0) + upgradeLumber;
		if (targetIsLeg && !currentIsLeg) {
			player.food++;
		}

		building.defId = targetDef.id;
		building.name = targetDef.name;
		building.goldCost += upgradeCost;
		building.playerId = player.id;
		building.playerSlot = player.slot;
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

	public sellBuilding(
		team: MatchTeam,
		buildingInstanceId: string,
		playerInput?: PlayerState
	): boolean {
		const idx = this.sim.buildings.findIndex(
			(b) => b.instanceId === buildingInstanceId && b.team === team
		);
		if (idx === -1) return false;

		const building = this.sim.buildings[idx];
		const player =
			playerInput ||
			(building.playerId ? this.sim.allPlayers.find((p) => p.id === building.playerId) : null) ||
			this.sim.players[team];
		const currentDef = getBuilding(building.defId);
		if (isLegendaryBuilding(currentDef)) {
			player.food = Math.max(0, player.food - 1);
		}
		// Cancelled construction refunds 75%; fully built refunds 50%
		const refundRate = building.isUnderConstruction ? 0.75 : 0.5;
		const refund = Math.floor(building.goldCost * refundRate);
		const lumberRefund = Math.floor((building.lumberCost || 0) * refundRate);

		player.gold += refund;
		if (lumberRefund > 0) {
			player.lumber += lumberRefund;
		}

		// Cancel active worker construction/repair
		const worker = player.worker;
		if (worker?.buildQueue) {
			worker.buildQueue = worker.buildQueue.filter((id) => id !== buildingInstanceId);
		}
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
			this.sim.workerSystem.processNextQueuedBuilding(team, worker, player);
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

		const player =
			(building.playerId ? this.sim.allPlayers.find((p) => p.id === building.playerId) : null) ||
			this.sim.players[building.team];
		player.stats.unitsSpawned++;

		// Determine lane
		let lane: Lane;
		if (player.preferredLane !== 'auto') {
			lane = player.preferredLane;
		} else {
			lane = building.y < ARENA_HEIGHT / 2 ? 'top' : 'bottom';
		}

		const laneY = lane === 'top' ? TOP_LANE_Y : lane === 'mid' ? MID_LANE_Y : BOTTOM_LANE_Y;
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
		let armorBonus = player.forge.armor * 1.0;

		// Authentic WC3 Castle Fight Forge Team Bonus:
		// Allied forge upgrades at Level 3+ grant 50% bonus to teammates!
		for (const ally of this.sim.allPlayers) {
			if (ally.team === player.team && ally.id !== player.id) {
				if (ally.forge.attack >= 3) {
					damageBonusPct += (ally.forge.attack - 2) * 0.5 * 0.08;
				}
				if (ally.forge.armor >= 3) {
					armorBonus += (ally.forge.armor - 2) * 0.5 * 1.0;
				}
			}
		}
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

		const abilities = unitDef.abilities || getUnitAbilities(unitDef);
		const hasCrit = abilities.some((a) => a.type === 'crit');
		const hasEvasion = abilities.some((a) => a.type === 'evasion');
		const hasThorns = abilities.some((a) => a.type === 'thorns');
		const hasCleave = abilities.some((a) => a.type === 'cleave');
		const hasFrost = abilities.some((a) => a.type === 'frost');
		const hasReincarnation = abilities.some((a) => a.type === 'reincarnation');
		const hasPulverize = abilities.some((a) => a.type === 'pulverize');
		const hasImmolation = abilities.some((a) => a.type === 'immolation');

		let unitCritChance = player.commander === 5 ? 0.25 : 0;
		if (hasCrit) unitCritChance = Math.min(0.75, unitCritChance + 0.22);

		let unitEvadeChance = player.commander === 6 ? 0.2 : 0;
		if (hasEvasion) unitEvadeChance = Math.min(0.75, unitEvadeChance + 0.2);

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
			critChance: unitCritChance,
			evadeChance: unitEvadeChance,
			splashRadius: hasCleave ? 120 : unitDef.splashRadius,
			reflectDamagePct: hasThorns ? 0.25 : unitDef.reflectDamagePct,
			isScavenger: !!(
				unitDef.isScavenger ||
				unitDef.id?.startsWith('cg1') ||
				building.race === 'Збирачі'
			),
			abilityType: resolveUnitAbility(unitDef),
			abilities,
			abilityCooldownTimer: 0,
			frostOnHit: hasFrost,
			hasReincarnated: !hasReincarnation,
			pulverizeChance: hasPulverize ? 0.2 : 0,
			immolationDps: hasImmolation ? 18 : 0,
			buildingDefId: building.defId,
			buildingName: building.name,
			playerId: player.id,
			playerSlot: player.slot
		};

		this.sim.units.push(unit);
		const bDef = getBuilding(building.defId);
		if (bDef && isLegendaryBuilding(bDef)) {
			this.sim.onSoundEffect?.('bossSpawn');
			this.sim.onBossSpawn?.(unit);
		}
		this.sim.notifyStateChanged();
		return unit;
	}
}
