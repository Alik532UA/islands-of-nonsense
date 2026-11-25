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
	ROAD_HALF_WIDTH,
	HIGHWAY_SEGMENTS
} from './constants';
import {
	getCommanderDamageBonus,
	getCommanderAttackSpeedBonus,
	getCommanderCritChance,
	getCommanderEvadeChance,
	applyCommanderForgeCostDiscount
} from './commanders';
import type { MatchTeam, Lane, Building, Unit, ArmorType, AttackType, PlayerState } from './types';
import {
	BUILDINGS_MAP,
	getBuilding,
	getUnit,
	getSpawnCooldown,
	getInitialSpawnDelay,
	resolveUnitAbility,
	getUnitAbilities,
	isLegendaryBuilding,
	isSpecialBuilding,
	isTowerBuilding,
	resolveUnitMoveSpeed,
	resolveUnitKillBounty,
	toPlayableRace
} from './gameData';
import { logService } from '../services/logService.svelte';

/**
 * UI progress ratio [0..1] for unit production: fills from 0 (start of cooldown)
 * to 1 (full bar right as the unit spawns when spawnTimer reaches 0).
 */
export function computeSpawnProgressRatio(spawnTimer: number, spawnCooldown: number): number {
	if (spawnCooldown <= 0) return 0;
	return Math.max(0, Math.min(1, 1 - (spawnTimer || 0) / spawnCooldown));
}

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
		const cost = applyCommanderForgeCostDiscount(
			bDef.gold_cost || 200,
			bDef.specialType === 'forge',
			player
		);

		if (player.gold < cost) {
			if (!player.isBot) this.sim.onSoundEffect?.('errorResource');
			return false;
		}

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
				if (!player.isBot) this.sim.onSoundEffect?.('errorResource');
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

		// Check 1-shop and 1-forge per player limit
		if (bDef.specialType === 'shop') {
			const existingShop = this.sim.buildings.some(
				(b) =>
					b.team === team &&
					b.specialType === 'shop' &&
					(!player || !b.playerId || b.playerId === player.id)
			);
			if (existingShop) {
				this.sim.addFloatingText('Магазин вже збудовано!', worldX, worldY - 20, '#ef4444');
				return false;
			}
		}

		// Soft building limit for large team sizes (4..7 per island) to preserve space and 60 FPS
		const teamMemberCount = Math.max(1, this.sim.teamMembers?.[team]?.length ?? 1);
		if (teamMemberCount >= 4) {
			const maxPerPlayer = Math.max(10, Math.floor(84 / teamMemberCount));
			const ownedCount = this.sim.buildings.filter(
				(b) => b.team === team && (!player || !b.playerId || b.playerId === player.id)
			).length;
			if (ownedCount >= maxPerPlayer) {
				if (!player.isBot) {
					this.sim.addFloatingText(
						`Ліміт споруд (${ownedCount}/${maxPerPlayer})!`,
						worldX,
						worldY - 20,
						'#ef4444'
					);
					this.sim.onSoundEffect?.('errorResource');
				}
				return false;
			}
		}

		if (bDef.specialType === 'forge') {
			const existingForge = this.sim.buildings.some(
				(b) =>
					b.team === team &&
					b.specialType === 'forge' &&
					(!player || !b.playerId || b.playerId === player.id)
			);
			if (existingForge) {
				this.sim.addFloatingText('Кузня вже збудована!', worldX, worldY - 20, '#ef4444');
				return false;
			}
		}

		if (bDef.specialType === 'commander') {
			const existingCommanderHall = this.sim.buildings.some(
				(b) =>
					b.team === team &&
					b.specialType === 'commander' &&
					(!player || !b.playerId || b.playerId === player.id)
			);
			if (existingCommanderHall) {
				this.sim.addFloatingText('Дім командира вже збудовано!', worldX, worldY - 20, '#ef4444');
				return false;
			}
		}

		// Check lumber requirements
		const lumberCost = bDef.lumber_cost || 0;
		if (lumberCost > 0 && player.lumber < lumberCost) {
			this.sim.addFloatingText(
				`Потрібна Деревина! (${lumberCost})`,
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
			player.stats.lumberSpent = (player.stats.lumberSpent || 0) + lumberCost;
		}

		const spawnCd = getSpawnCooldown(bDef, getUnit(bDef.unit));
		const initialDelay = getInitialSpawnDelay(bDef, getUnit(bDef.unit));

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
			spawnUnitId: bDef.unit || '',
			spawnCooldown: spawnCd,
			initialSpawnDelay: initialDelay,
			spawnTimer: bDef.specialType === 'repair' ? 0 : initialDelay,
			lane: resolvedLane,
			upgradeFrom: bDef.upgrade_from ?? null,
			race: toPlayableRace(player.race || bDef.race),
			width: 2,
			height: 2,
			specialType: bDef.specialType,
			aura: bDef.aura ? { ...bDef.aura } : undefined,
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
			building.isArtillery = !!(
				bDef.isArtillery ||
				bDef.attack_type === 'siege' ||
				['h001', 'h073', 'cg0a', 'h048', 'h01E', 'u008', 'h04P'].includes(bDef.id)
			);
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
				logService.recordBuildingEvent(
					building.instanceId,
					'info',
					'Building placed and queued (shift)',
					{
						team,
						playerId: player.id,
						slot: player.slot,
						defId: bDef.id,
						name: bDef.name,
						tileX,
						tileY,
						worldX,
						worldY,
						activeTargetBuildingId: player.worker.targetBuildingId ?? null,
						queueLen: player.worker.buildQueue.length
					}
				);
			} else {
				const prevTargetId = player.worker.targetBuildingId;
				if (prevTargetId && prevTargetId !== building.instanceId) {
					logService.recordBuildingEvent(
						prevTargetId,
						'warn',
						'Construction interrupted by new non-shift build order',
						{ team, playerId: player.id, newBuildingId: building.instanceId }
					);
				}
				for (const qId of player.worker.buildQueue ?? []) {
					logService.recordBuildingEvent(
						qId,
						'warn',
						'Queued building cleared by non-shift build order',
						{ team, playerId: player.id, newBuildingId: building.instanceId }
					);
				}
				// Normal build: leave current building and immediately proceed to build new one
				player.worker.buildQueue = [];
				player.worker.pendingRescueStrike = null;
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
				logService.recordBuildingEvent(
					building.instanceId,
					'info',
					'Building placed and assigned to worker',
					{
						team,
						playerId: player.id,
						slot: player.slot,
						defId: bDef.id,
						name: bDef.name,
						tileX,
						tileY,
						worldX,
						worldY,
						workerPos: { x: Math.round(player.worker.x), y: Math.round(player.worker.y) },
						spot: { x: Math.round(spot.x), y: Math.round(spot.y) },
						waypoints: player.worker.path?.length ?? 0
					}
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
				if (!player.isBot) this.sim.onSoundEffect?.('errorResource');
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
				if (!player.isBot) this.sim.onSoundEffect?.('errorResource');
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
				if (!player.isBot) this.sim.onSoundEffect?.('errorResource');
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
			if (!player.isBot) this.sim.onSoundEffect?.('errorResource');
			return false;
		}

		const upgradeLumber = targetDef.lumber_cost || 0;
		if (upgradeLumber > 0 && player.lumber < upgradeLumber) {
			this.sim.addFloatingText(
				`Потрібна Деревина! (${upgradeLumber})`,
				building.x,
				building.y - 20,
				'#10b981'
			);
			if (!player.isBot) this.sim.onSoundEffect?.('errorResource');
			return false;
		}

		const upgradeCost = targetDef.upgrade_from
			? (targetDef.gold_cost ?? 200)
			: Math.max(50, (targetDef.gold_cost || 200) - building.goldCost);

		if (player.gold < upgradeCost) {
			if (!player.isBot) this.sim.onSoundEffect?.('errorResource');
			return false;
		}

		player.gold -= upgradeCost;
		player.stats.goldSpent += upgradeCost;
		if (upgradeLumber > 0) {
			player.lumber -= upgradeLumber;
			player.stats.lumberSpent = (player.stats.lumberSpent || 0) + upgradeLumber;
		}
		building.lumberCost = (building.lumberCost || 0) + upgradeLumber;
		if (targetIsLeg && !currentIsLeg) {
			player.food++;
		}
		this.sim.onSoundEffect?.('upgrade');

		const targetUnit = getUnit(targetDef.unit);
		const isTargetSpecial =
			targetDef.specialType || isSpecialBuilding(targetDef) || isTowerBuilding(targetDef);
		const isTargetSiege =
			targetDef.isArtillery ||
			targetDef.attack_type === 'siege' ||
			targetUnit?.attack_type === 'siege';

		const upgradeLumberReward = isTargetSpecial
			? 0
			: isTargetSiege
				? Math.floor(upgradeCost * 0.75)
				: upgradeCost;

		if (upgradeLumberReward > 0) {
			player.lumber = (player.lumber ?? 0) + upgradeLumberReward;
			player.stats.lumberEarned = (player.stats.lumberEarned || 0) + upgradeLumberReward;
			this.sim.addFloatingText(
				`+${upgradeLumberReward} Деревини`,
				building.x,
				building.y - 35,
				'#22c55e'
			);
		}

		building.defId = targetDef.id;
		building.name = targetDef.name;
		building.goldCost += upgradeCost;
		building.playerId = player.id;
		building.playerSlot = player.slot;
		building.spawnUnitId = targetDef.unit || '';
		const newSpawnCd = getSpawnCooldown(targetDef, targetUnit);
		const newInitialDelay = getInitialSpawnDelay(targetDef, targetUnit);
		building.spawnCooldown = newSpawnCd;
		building.initialSpawnDelay = newInitialDelay;
		building.spawnTimer = Math.min(building.spawnTimer, newInitialDelay);
		building.upgradeFrom = targetDef.upgrade_from ?? null;
		building.specialType = targetDef.specialType;
		building.aura = targetDef.aura ? { ...targetDef.aura } : undefined;
		building.race = toPlayableRace(player.race || targetDef.race || building.race);

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
			if (b.aura) {
				const auraRadiusSq = b.aura.radius * b.aura.radius;
				for (const u of this.sim.units) {
					if (u.team === b.team && u.state !== 'DEAD') {
						const dx = u.x - b.x;
						const dy = u.y - b.y;
						if (dx * dx + dy * dy <= auraRadiusSq) {
							switch (b.aura.type) {
								case 'armor': {
									u.buffs = u.buffs || [];
									const existing = u.buffs.find(
										(buf) => buf.type === 'shield' && buf.value === b.aura!.value
									);
									if (existing) {
										existing.timer = 1.5;
									} else {
										u.buffs.push({ type: 'shield', timer: 1.5, value: b.aura.value });
									}
									break;
								}
								case 'heal':
									if (!u.buffs?.some((buf) => buf.type === 'heal_block')) {
										u.hp = Math.min(u.maxHp, u.hp + b.aura.value * dt);
									}
									break;
								case 'mana':
									if (u.maxMana && u.mana !== undefined) {
										u.mana = Math.min(u.maxMana, u.mana + b.aura.value * dt);
									}
									break;
								case 'speed': {
									u.buffs = u.buffs || [];
									const existing = u.buffs.find(
										(buf) => buf.type === 'as' && buf.value === b.aura!.value
									);
									if (existing) {
										existing.timer = 1.5;
									} else {
										u.buffs.push({ type: 'as', timer: 1.5, value: b.aura.value });
									}
									break;
								}
							}
						}
					}
				}
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

		const teamMemberCount = Math.max(1, this.sim.teamMembers?.[building.team]?.length ?? 1);
		if (teamMemberCount >= 4) {
			let activeTeamUnits = 0;
			for (const u of this.sim.units) {
				if (u.team === building.team && !u.isBoss && u.state !== 'DEAD') {
					activeTeamUnits++;
				}
			}
			if (activeTeamUnits >= 140) {
				return null;
			}
		}

		const player =
			(building.playerId ? this.sim.allPlayers.find((p) => p.id === building.playerId) : null) ||
			this.sim.players[building.team];
		player.stats.unitsSpawned++;

		// Determine lane automatically: route to nearest of 3 bridges (400, 1200, 2000)
		const dTop = Math.abs(building.y - TOP_LANE_Y);
		const dMid = Math.abs(building.y - MID_LANE_Y);
		const dBottom = Math.abs(building.y - BOTTOM_LANE_Y);
		const lane: Lane = dTop <= dMid && dTop <= dBottom ? 'top' : dMid <= dBottom ? 'mid' : 'bottom';

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

		// Commander 3 (Dima): +5% damage (+10% Random x2)
		damageBonusPct += getCommanderDamageBonus(player);
		// Commander 4 (Dan): +5% attack speed (+10% Random x2)
		attackSpeedMult *= 1 + getCommanderAttackSpeedBonus(player);

		// Bot difficulty damage bonus: docs/04 § 5 & docs/05 § 3.B
		const cfBd = player.botDifficulty ?? (player.isBot ? this.sim.config.botDifficulty : 0);
		if (player.isBot && cfBd > 0) {
			const steps = Math.floor((cfBd + 2) / 4);
			damageBonusPct += steps * 0.04;
		}

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

		let unitCritChance = getCommanderCritChance(player);
		if (hasCrit) unitCritChance = Math.min(0.75, unitCritChance + 0.22);

		let unitEvadeChance = getCommanderEvadeChance(player);
		if (hasEvasion) unitEvadeChance = Math.min(0.75, unitEvadeChance + 0.2);

		const maxMana = unitDef.maxMana ?? Number(unitDef.raw_fields?.umpm || 0);
		const initialMana =
			unitDef.mana ??
			(unitDef.raw_fields?.umpi !== undefined ? Number(unitDef.raw_fields.umpi) : maxMana);
		const manaRegen = unitDef.manaRegen ?? Number(unitDef.raw_fields?.umpr || 0);

		const unitSpeed = resolveUnitMoveSpeed(unitDef, player.race);
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
			cooldownTimer: this.sim.nextRandom() * 0.3,
			range: Math.max(90, unitDef.range ?? 100),
			speed: unitSpeed,
			flying: !!unitDef.flying,
			canHitAir:
				unitDef.canHitAir ??
				(unitDef.raw_fields?.ua1g
					? String(unitDef.raw_fields.ua1g).toLowerCase().includes('air')
					: !!unitDef.flying || (unitDef.range !== null && unitDef.range > 120)),
			currentTargetId: null,
			targetX: building.team === 'west' ? ARENA_WIDTH - 200 : 200,
			targetY: laneY,
			state: 'WALKING',
			size: unitDef.flying ? 22 : 16,
			critChance: unitCritChance,
			evadeChance: unitEvadeChance,
			splashRadius: hasCleave ? 120 : unitDef.splashRadius,
			reflectDamagePct: hasThorns ? 0.25 : unitDef.reflectDamagePct,
			isArtillery: !!(
				unitDef.isArtillery ||
				unitDef.attack_type === 'siege' ||
				['cg1a', 'hmtm', 'e002', 'cg18', 'n01E', 'n01F'].includes(unitDef.id)
			),
			isScavenger: !!(
				unitDef.isScavenger ||
				unitDef.id?.startsWith('cg1') ||
				building.race === 'Збирачі' ||
				BUILDINGS_MAP.get(building.defId)?.race === 'Збирачі'
			),
			abilityType: resolveUnitAbility(unitDef),
			abilities,
			abilityCooldownTimer: 0,
			frostOnHit: hasFrost,
			hasReincarnated: !hasReincarnation,
			pulverizeChance: hasPulverize ? 0.2 : 0,
			immolationDps: hasImmolation ? 18 : 0,
			mana: maxMana > 0 ? initialMana : undefined,
			maxMana: maxMana > 0 ? maxMana : undefined,
			manaRegen: maxMana > 0 ? manaRegen : undefined,
			buildingDefId: building.defId,
			buildingName: building.name,
			playerId: player.id,
			playerSlot: player.slot,
			bounty: resolveUnitKillBounty(unitDef, building.goldCost, unitDef.hp ?? 300)
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
