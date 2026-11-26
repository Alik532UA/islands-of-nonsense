import type { Simulation } from './simulation';
import {
	CELL_SIZE,
	BRIDGE_SPAN_MIN_X,
	BRIDGE_SPAN_MAX_X,
	TOP_LANE_Y,
	MID_LANE_Y,
	BOTTOM_LANE_Y,
	BRIDGE_REPAIR_LUMBER_COST,
	RESCUE_STRIKE_CAST_RANGE,
	WORKER_BLINK_RANGE,
	WORKER_BLINK_COOLDOWN
} from './constants';
import type { MatchTeam, WorkerState, PlayerState, InventoryItem } from './types';
import { GroundNavigation } from './groundNavigation';
import { getBuilding, getUnit, isSpecialBuilding, isTowerBuilding } from './gameData';
import { logService } from '../services/logService.svelte';

export { SOLID_MAP_OBSTACLES } from './constants';

/**
 * WorkerSystem handles worker tasks, building construction orders,
 * shift-queue processing, building repairs, bridge rebuilding, and collecting gold coins.
 * Low-level terrain and A* navigation is delegated to GroundNavigation.
 */
export class WorkerSystem {
	public nav: GroundNavigation;

	constructor(private sim: Simulation) {
		this.nav = new GroundNavigation(sim);
	}

	// Delegated navigation methods for backward compatibility and clean API access
	public resolveGroundObstacles(x: number, y: number, radius: number): { x: number; y: number } {
		return this.nav.resolveGroundObstacles(x, y, radius);
	}

	public isPointWalkableGround(x: number, y: number, radius = 16): boolean {
		return this.nav.isPointWalkableGround(x, y, radius);
	}

	public isPointOnWater(x: number, y: number, radius = 16): boolean {
		return this.nav.isPointOnWater(x, y, radius);
	}

	public isPointBlockedForWorker(team: MatchTeam, x: number, y: number, radius = 16): boolean {
		return this.nav.isPointBlockedForWorker(team, x, y, radius);
	}

	public isPointOnOwnDryIsland(team: MatchTeam, x: number, y: number, radius = 16): boolean {
		return this.nav.isPointOnOwnDryIsland(team, x, y, radius);
	}

	public clampPointToOwnIsland(
		team: MatchTeam,
		targetX: number,
		targetY: number,
		radius = 16,
		fallbackX?: number,
		fallbackY?: number
	): { x: number; y: number } {
		return this.nav.clampPointToOwnIsland(team, targetX, targetY, radius, fallbackX, fallbackY);
	}

	public isPointBlockedForGround(
		x: number,
		y: number,
		radius = 16,
		ignoreBuildingId?: string,
		ignoreCastle?: boolean
	): boolean {
		return this.nav.isPointBlockedForGround(x, y, radius, ignoreBuildingId, ignoreCastle);
	}

	public isGroundLineClear(
		startX: number,
		startY: number,
		targetX: number,
		targetY: number,
		radius: number,
		ignoreBuildingId?: string,
		ignoreCastle?: boolean
	): boolean {
		return this.nav.isGroundLineClear(
			startX,
			startY,
			targetX,
			targetY,
			radius,
			ignoreBuildingId,
			ignoreCastle
		);
	}

	public findGroundPath(
		team: MatchTeam,
		startX: number,
		startY: number,
		targetX: number,
		targetY: number,
		radius = 16,
		ignoreBuildingId?: string,
		ignoreCastle?: boolean
	): { x: number; y: number }[] {
		return this.nav.findGroundPath(
			team,
			startX,
			startY,
			targetX,
			targetY,
			radius,
			ignoreBuildingId,
			ignoreCastle
		);
	}

	public isWorkerLineClear(
		team: MatchTeam,
		startX: number,
		startY: number,
		targetX: number,
		targetY: number,
		radius = 16
	): boolean {
		return this.nav.isWorkerLineClear(team, startX, startY, targetX, targetY, radius);
	}

	public findWorkerPath(
		team: MatchTeam,
		startX: number,
		startY: number,
		targetX: number,
		targetY: number
	): { x: number; y: number }[] {
		return this.nav.findWorkerPath(team, startX, startY, targetX, targetY);
	}

	public advanceWorkerAlongPath(
		w: WorkerState,
		team: MatchTeam,
		destX: number,
		destY: number,
		dt: number,
		stopDist: number
	): void {
		this.nav.advanceWorkerAlongPath(w, team, destX, destY, dt, stopDist);
	}

	/**
	 * Advances worker to the next queued construction order (Warcraft III Shift-Queue system).
	 */
	public processNextQueuedBuilding(team: MatchTeam, w: WorkerState, _p: PlayerState): boolean {
		if (!w.buildQueue || w.buildQueue.length === 0) return false;

		while (w.buildQueue.length > 0) {
			const nextId = w.buildQueue.shift()!;
			const nextBld = this.sim.buildings.find(
				(b) => b.instanceId === nextId && b.team === team && b.isUnderConstruction
			);
			if (nextBld) {
				const spot = this.getBestConstructionSpot(team, w.x, w.y, nextBld.x, nextBld.y);
				w.targetX = spot.x;
				w.targetY = spot.y;
				w.targetBuildingId = nextBld.instanceId;
				w.isBuilding = false;
				w.isRepairing = false;
				w.targetRepairBuildingId = null;
				w.path = this.findWorkerPath(team, w.x, w.y, spot.x, spot.y);
				logService.recordBuildingEvent(
					nextBld.instanceId,
					'info',
					'Worker dequeued building from buildQueue',
					{
						team,
						playerId: _p.id,
						workerPos: { x: Math.round(w.x), y: Math.round(w.y) },
						spot: { x: Math.round(spot.x), y: Math.round(spot.y) }
					}
				);
				this.sim.notifyStateChanged();
				return true;
			}
		}

		return false;
	}

	public moveWorker(
		team: MatchTeam,
		targetX: number,
		targetY: number,
		playerInput?: PlayerState
	): void {
		const player = playerInput || this.sim.players[team];
		const w = player?.worker;
		if (w) {
			if (w.targetBuildingId) {
				logService.recordBuildingEvent(
					w.targetBuildingId,
					'warn',
					'Construction target interrupted by moveWorker',
					{ team, playerId: player?.id, targetX: Math.round(targetX), targetY: Math.round(targetY) }
				);
			}
			for (const qId of w.buildQueue ?? []) {
				logService.recordBuildingEvent(
					qId,
					'warn',
					'Queued building cleared from buildQueue by moveWorker',
					{ team, playerId: player?.id }
				);
			}
			w.buildQueue = []; // Clear queued orders on manual move order
			w.pendingItemOrder = null;
			// If worker was en route to an unstarted building, cancel the ghost foundation (100% refund)
			if (w.targetBuildingId) {
				const unstarted = this.sim.buildings.find(
					(b) =>
						b.instanceId === w.targetBuildingId &&
						b.team === team &&
						b.isUnderConstruction &&
						(b.buildProgress || 0) === 0
				);
				if (unstarted) {
					logService.recordBuildingEvent(
						unstarted.instanceId,
						'warn',
						'Unstarted building (0% progress) cancelled and refunded by moveWorker',
						{ team, playerId: player?.id }
					);
					this.sim.buildingSystem.sellBuilding(team, unstarted.instanceId, player);
				}
			}
			let tx = targetX;
			let ty = targetY;
			if (this.isPointBlockedForWorker(team, tx, ty)) {
				const resolved = this.clampPointToOwnIsland(team, tx, ty, 16, w.x, w.y);
				tx = resolved.x;
				ty = resolved.y;
			}
			w.targetX = tx;
			w.targetY = ty;
			w.isBuilding = false;
			w.targetBuildingId = null;
			w.isRepairing = false;
			w.targetRepairBuildingId = null;
			w.pendingRescueStrike = null;
			w.path = this.findWorkerPath(team, w.x, w.y, tx, ty);
			this.sim.notifyStateChanged();
		}
	}

	/**
	 * Computes Euclidean distance from worker point (wx, wy) to an axis-aligned bounding box.
	 * Returns 0 if worker is inside or touching the box edge.
	 */
	public getDistanceToBox(
		wx: number,
		wy: number,
		bx: number,
		by: number,
		bw: number = CELL_SIZE,
		bh: number = CELL_SIZE
	): number {
		const dx = Math.max(bx - wx, 0, wx - (bx + bw));
		const dy = Math.max(by - wy, 0, wy - (by + bh));
		return Math.hypot(dx, dy);
	}

	/**
	 * Finds the closest unblocked spot around a building perimeter so worker can build/repair
	 * from ANY reachable side (Warcraft III style), even when building is in a tight corner.
	 */
	public getBestConstructionSpot(
		team: MatchTeam,
		workerX: number,
		workerY: number,
		bldX: number,
		bldY: number,
		bldWidth: number = CELL_SIZE,
		bldHeight: number = CELL_SIZE
	): { x: number; y: number } {
		const pads = [16, 26, 36];

		for (const pad of pads) {
			const candidates = [
				// 4 cardinal perimeter sides
				{ x: bldX + bldWidth + pad, y: bldY + bldHeight / 2 },
				{ x: bldX - pad, y: bldY + bldHeight / 2 },
				{ x: bldX + bldWidth / 2, y: bldY - pad },
				{ x: bldX + bldWidth / 2, y: bldY + bldHeight + pad },
				// 4 diagonal corners
				{ x: bldX + bldWidth + pad, y: bldY - pad },
				{ x: bldX + bldWidth + pad, y: bldY + bldHeight + pad },
				{ x: bldX - pad, y: bldY - pad },
				{ x: bldX - pad, y: bldY + bldHeight + pad }
			];

			let bestSpot: { x: number; y: number } | null = null;
			let minDistance = Infinity;

			for (const cand of candidates) {
				if (!this.isPointBlockedForWorker(team, cand.x, cand.y)) {
					const d = Math.hypot(workerX - cand.x, workerY - cand.y);
					if (d < minDistance) {
						minDistance = d;
						bestSpot = cand;
					}
				}
			}

			if (bestSpot) return bestSpot;
		}

		// Fallback: resolve ground obstacles from current worker position towards building
		const cx = bldX + bldWidth / 2;
		const cy = bldY + bldHeight / 2;
		const angle = Math.atan2(workerY - cy, workerX - cx);
		const fallbackX = cx + Math.cos(angle) * (bldWidth / 2 + 20);
		const fallbackY = cy + Math.sin(angle) * (bldHeight / 2 + 20);
		return this.nav.resolveWorkerObstacles(team, fallbackX, fallbackY, 14, workerX, workerY);
	}

	public continueConstruction(
		team: MatchTeam,
		buildingInstanceId: string,
		playerInput?: PlayerState
	): boolean {
		const targetBld = this.sim.buildings.find(
			(b) => b.instanceId === buildingInstanceId && b.team === team
		);
		if (!targetBld || !targetBld.isUnderConstruction) return false;

		const player = playerInput || this.sim.players[team];
		// Security / Ownership invariant: in team games, a worker only completes construction on their own player's building
		if (targetBld.playerId && player?.id && targetBld.playerId !== player.id) {
			return false;
		}

		const w = player?.worker;
		if (w) {
			if (w.targetBuildingId && w.targetBuildingId !== buildingInstanceId) {
				logService.recordBuildingEvent(
					w.targetBuildingId,
					'warn',
					'Construction interrupted by continueConstruction for another building',
					{ team, nextBuildingId: buildingInstanceId }
				);
			}
			const spot = this.getBestConstructionSpot(team, w.x, w.y, targetBld.x, targetBld.y);
			w.targetX = spot.x;
			w.targetY = spot.y;
			w.isBuilding = false;
			w.targetBuildingId = buildingInstanceId;
			w.isRepairing = false;
			w.targetRepairBuildingId = null;
			w.pendingRescueStrike = null;
			w.path = this.findWorkerPath(team, w.x, w.y, spot.x, spot.y);
			logService.recordBuildingEvent(
				buildingInstanceId,
				'info',
				'Worker assigned/resumed construction',
				{
					team,
					playerId: player?.id,
					workerPos: { x: Math.round(w.x), y: Math.round(w.y) },
					spot: { x: Math.round(spot.x), y: Math.round(spot.y) },
					progress: Number((targetBld.buildProgress || 0).toFixed(2))
				}
			);
			this.sim.notifyStateChanged();
			return true;
		}
		return false;
	}

	public repairBuilding(
		team: MatchTeam,
		buildingInstanceId: string,
		playerInput?: PlayerState
	): boolean {
		const isCastle =
			buildingInstanceId === `castle_${team}` ||
			buildingInstanceId === 'castle' ||
			buildingInstanceId.startsWith('castle');
		const targetBld = isCastle
			? this.sim.castles[team]
			: this.sim.buildings.find((b) => b.instanceId === buildingInstanceId && b.team === team);
		if (!targetBld) return false;

		// If building is still under construction, redirect worker to continue construction!
		if ('isUnderConstruction' in targetBld && targetBld.isUnderConstruction) {
			return this.continueConstruction(team, buildingInstanceId, playerInput);
		}

		const w = (playerInput || this.sim.players[team])?.worker;
		if (w) {
			if (w.targetBuildingId) {
				logService.recordBuildingEvent(
					w.targetBuildingId,
					'warn',
					'Construction interrupted by repairBuilding order',
					{ team, repairTargetId: buildingInstanceId }
				);
			}
			const castle = this.sim.castles[team];
			const bx = isCastle ? castle.x - 120 : targetBld.x;
			const by = isCastle ? castle.y - 140 : targetBld.y;
			const bw = isCastle ? 240 : CELL_SIZE;
			const bh = isCastle ? 280 : CELL_SIZE;
			const spot = this.getBestConstructionSpot(team, w.x, w.y, bx, by, bw, bh);
			w.targetX = spot.x;
			w.targetY = spot.y;
			w.isBuilding = false;
			w.targetBuildingId = null;
			w.isRepairing = true;
			w.targetRepairBuildingId = buildingInstanceId;
			w.pendingRescueStrike = null;
			w.path = this.findWorkerPath(team, w.x, w.y, spot.x, spot.y);
			this.sim.notifyStateChanged();
			return true;
		}
		return false;
	}

	public repairBridge(team: MatchTeam, playerInput?: PlayerState): boolean {
		if (!this.sim.brokenBridge) return false;
		const p = playerInput || this.sim.players[team];
		const w = p?.worker;
		if (!w) return false;

		const cost = BRIDGE_REPAIR_LUMBER_COST;
		if ((p.lumber ?? 0) < cost) {
			this.sim.addFloatingText(`Потрібно ${cost} деревини для ремонту!`, w.x, w.y - 20, '#ef4444');
			return false;
		}

		p.lumber = (p.lumber ?? 0) - cost;
		const bridgeLane = this.sim.brokenBridge;
		const bx = team === 'west' ? BRIDGE_SPAN_MIN_X - 40 : BRIDGE_SPAN_MAX_X + 40;
		const by =
			bridgeLane === 'top' ? TOP_LANE_Y : bridgeLane === 'mid' ? MID_LANE_Y : BOTTOM_LANE_Y;

		w.isBuilding = false;
		w.targetBuildingId = null;
		w.isRepairing = true;
		w.targetRepairBuildingId = 'bridge_' + bridgeLane;
		w.pendingRescueStrike = null;
		w.targetX = bx;
		w.targetY = by;
		w.path = this.findWorkerPath(team, w.x, w.y, bx, by);
		this.sim.addFloatingText('Ремонт мосту...', w.x, w.y - 20, '#38bdf8');
		this.sim.notifyStateChanged();
		return true;
	}

	/**
	 * Updates workers position, obstacle navigation, construction progress, and repairs.
	 */
	public canTeleportWorker(team: MatchTeam, player?: PlayerState): boolean {
		const w = (player || this.sim.players[team])?.worker;
		if (!w) return false;
		return (w.blinkCooldown ?? 0) <= 0;
	}

	public teleportWorker(
		team: MatchTeam,
		worldX: number,
		worldY: number,
		player?: PlayerState
	): boolean {
		const w = (player || this.sim.players[team])?.worker;
		if (!w || (w.blinkCooldown ?? 0) > 0) return false;

		const dx = worldX - w.x;
		const dy = worldY - w.y;
		const dist = Math.hypot(dx, dy);
		let tx = worldX;
		let ty = worldY;
		if (dist > WORKER_BLINK_RANGE && dist > 0) {
			tx = w.x + (dx / dist) * WORKER_BLINK_RANGE;
			ty = w.y + (dy / dist) * WORKER_BLINK_RANGE;
		}

		// Keep teleport strictly on the worker's own island (clamp back onto island if aimed outside)
		if (!this.isPointOnOwnDryIsland(team, tx, ty, 16)) {
			const clamped = this.clampPointToOwnIsland(team, tx, ty, 16, w.x, w.y);
			tx = clamped.x;
			ty = clamped.y;
		}
		const resolved = this.resolveGroundObstacles(tx, ty, 16);
		if (!this.isPointOnOwnDryIsland(team, resolved.x, resolved.y, 16)) {
			return false;
		}

		w.x = Math.round(resolved.x);
		w.y = Math.round(resolved.y);
		w.targetX = w.x;
		w.targetY = w.y;
		w.path = [];
		w.stuckTimer = 0;
		w.isBuilding = false;
		w.isRepairing = false;
		w.targetBuildingId = null;
		w.targetRepairBuildingId = null;
		w.pendingRescueStrike = null;
		w.blinkCooldown = WORKER_BLINK_COOLDOWN;

		this.sim.addFloatingText('Телепорт!', w.x, w.y - 36, '#38bdf8');
		this.sim.onSoundEffect?.('upgrade');
		this.sim.notifyStateChanged();
		return true;
	}

	public updateWorkers(dt: number): void {
		for (const p of this.sim.allPlayers) {
			const w = p.worker;
			if (!w) continue;
			if (w.blinkCooldown && w.blinkCooldown > 0) {
				w.blinkCooldown = Math.max(0, w.blinkCooldown - dt);
			}
			const team = p.team;

			// Tick worker inventory cooldowns & passive auto-attack wands (e.g. I001/I002, range 300)
			if (w.inventory) {
				for (const item of w.inventory) {
					if (!item) continue;
					if (item.cooldownRemaining && item.cooldownRemaining > 0) {
						item.cooldownRemaining = Math.max(0, item.cooldownRemaining - dt);
					}
					if (item.autoAttack) {
						item.autoAttack.timer = Math.max(0, item.autoAttack.timer - dt);
						if (item.autoAttack.timer <= 0) {
							const rangeSq = item.autoAttack.range * item.autoAttack.range;
							let nearestEnemy = null;
							let bestDistSq = Infinity;
							for (const u of this.sim.units) {
								if (u.team === team || u.state === 'DEAD') continue;
								const dx = u.x - w.x;
								const dy = u.y - w.y;
								const dSq = dx * dx + dy * dy;
								if (dSq <= rangeSq && dSq < bestDistSq) {
									bestDistSq = dSq;
									nearestEnemy = u;
								}
							}
							if (nearestEnemy) {
								item.autoAttack.timer = item.autoAttack.interval;
								this.sim.combatSystem.applyUnitDamage(
									nearestEnemy,
									item.autoAttack.damage,
									'magic',
									team,
									false
								);
								this.sim.addFloatingText(
									`-${item.autoAttack.damage}`,
									nearestEnemy.x,
									nearestEnemy.y - 18,
									'#c084fc'
								);
							}
						}
					}
				}
			}

			if (w.pendingRescueStrike) {
				if (!this.sim.canUseRescueStrike(team, p)) {
					w.pendingRescueStrike = null;
				} else {
					const target = w.pendingRescueStrike;
					const dist = Math.hypot(w.x - target.x, w.y - target.y);
					if (dist <= RESCUE_STRIKE_CAST_RANGE) {
						w.pendingRescueStrike = null;
						w.targetX = w.x;
						w.targetY = w.y;
						w.path = [];
						this.sim.economySystem.executeRescueStrikeAt(team, target.x, target.y, p);
					} else {
						this.advanceWorkerAlongPath(w, team, w.targetX, w.targetY, dt, 10);
						const afterDist = Math.hypot(w.x - target.x, w.y - target.y);
						if (afterDist <= RESCUE_STRIKE_CAST_RANGE) {
							w.pendingRescueStrike = null;
							w.targetX = w.x;
							w.targetY = w.y;
							w.path = [];
							this.sim.economySystem.executeRescueStrikeAt(team, target.x, target.y, p);
						}
					}
					continue;
				}
			}

			if (w.pendingItemOrder) {
				if (this.processPendingItemOrder(p, w, dt)) {
					continue;
				}
			}

			const targetBld = w.targetBuildingId
				? this.sim.buildings.find((b) => b.instanceId === w.targetBuildingId)
				: null;

			if (targetBld && targetBld.isUnderConstruction) {
				const distToBld = this.getDistanceToBox(
					w.x,
					w.y,
					targetBld.x,
					targetBld.y,
					CELL_SIZE,
					CELL_SIZE
				);

				const spotDistFromBox = this.getDistanceToBox(
					w.targetX,
					w.targetY,
					targetBld.x,
					targetBld.y,
					CELL_SIZE,
					CELL_SIZE
				);
				const effectiveReach = Math.max(42, Math.min(64, spotDistFromBox + 14));

				if (distToBld <= effectiveReach) {
					const wasFirstTick = !w.isBuilding && (targetBld.buildProgress || 0) === 0;
					// In building construction range from ANY reachable side (Warcraft III style)!
					w.isBuilding = true;
					w.path = [];
					targetBld.buildProgress = (targetBld.buildProgress || 0) + dt;
					if (wasFirstTick) {
						logService.recordBuildingEvent(
							targetBld.instanceId,
							'info',
							'Worker reached site and started construction',
							{
								team,
								playerId: p.id,
								workerPos: { x: Math.round(w.x), y: Math.round(w.y) },
								distToBld: Number(distToBld.toFixed(1))
							}
						);
					}
					const maxProg = targetBld.maxBuildProgress || 3.5;
					targetBld.hp = Math.min(
						targetBld.maxHp,
						Math.round(targetBld.maxHp * (0.15 + 0.85 * (targetBld.buildProgress / maxProg)))
					);

					if (targetBld.buildProgress >= maxProg) {
						logService.recordBuildingEvent(targetBld.instanceId, 'info', 'Building completed', {
							team,
							playerId: p.id,
							defId: targetBld.defId,
							name: targetBld.name
						});
						targetBld.isUnderConstruction = false;
						targetBld.hp = targetBld.maxHp;
						const initialDelay = targetBld.initialSpawnDelay ?? targetBld.spawnCooldown;
						targetBld.spawnTimer = targetBld.specialType === 'repair' ? 0 : initialDelay;
						w.isBuilding = false;
						w.targetBuildingId = null;

						const bDef = getBuilding(targetBld.defId);
						const spawnedUnit = targetBld.spawnUnitId ? getUnit(targetBld.spawnUnitId) : null;
						const isSpecial =
							targetBld.specialType || isSpecialBuilding(bDef) || isTowerBuilding(bDef);
						const isSiege =
							targetBld.isArtillery ||
							targetBld.attackType === 'siege' ||
							spawnedUnit?.attack_type === 'siege';

						const lumberReward = isSpecial
							? 0
							: isSiege
								? Math.floor(targetBld.goldCost * 0.75)
								: targetBld.goldCost;

						if (lumberReward > 0) {
							p.lumber = (p.lumber ?? 0) + lumberReward;
							p.stats.lumberEarned = (p.stats.lumberEarned || 0) + lumberReward;
							this.sim.addFloatingText(
								`+${lumberReward} Деревини`,
								targetBld.x + CELL_SIZE / 2,
								targetBld.y - 15,
								'#22c55e'
							);
						} else {
							this.sim.addFloatingText(
								'+Готово!',
								targetBld.x + CELL_SIZE / 2,
								targetBld.y - 15,
								'#22c55e'
							);
						}
						this.sim.onSoundEffect?.('buildingComplete');
						this.sim.onBuildingComplete?.(targetBld);
						this.processNextQueuedBuilding(team, w, p);
					}
				} else {
					w.isBuilding = false;
					const spot = this.getBestConstructionSpot(team, w.x, w.y, targetBld.x, targetBld.y);
					w.targetX = spot.x;
					w.targetY = spot.y;
					this.advanceWorkerAlongPath(w, team, spot.x, spot.y, dt, 6);
				}
			} else {
				if (w.targetBuildingId) {
					w.targetBuildingId = null;
					w.isBuilding = false;
				}

				if (this.processNextQueuedBuilding(team, w, p)) {
					continue;
				}

				// Auto-resume any abandoned uncompleted construction on player's own buildings
				const unfinished = this.sim.buildings.find(
					(b) =>
						b.team === team &&
						(!b.playerId || b.playerId === p.id) &&
						b.isUnderConstruction &&
						b.instanceId !== w.targetBuildingId
				);
				if (unfinished && !w.targetRepairBuildingId) {
					if (this.continueConstruction(team, unfinished.instanceId, p)) {
						continue;
					}
				}

				if (w.targetRepairBuildingId) {
					if (w.targetRepairBuildingId.startsWith('bridge')) {
						if (!this.sim.brokenBridge) {
							w.isRepairing = false;
							w.isBuilding = false;
							w.targetRepairBuildingId = null;
							continue;
						}
						const bridgeLane = this.sim.brokenBridge;
						const bx = team === 'west' ? BRIDGE_SPAN_MIN_X - 40 : BRIDGE_SPAN_MAX_X + 40;
						const by =
							bridgeLane === 'top' ? TOP_LANE_Y : bridgeLane === 'mid' ? MID_LANE_Y : BOTTOM_LANE_Y;
						const dist = Math.hypot(bx - w.x, by - w.y);
						if (dist <= 50) {
							w.isBuilding = true;
							w.isRepairing = true;
							w.path = [];
							this.sim.bridgeRepairProgress += 25 * dt;
							if (this.sim.bridgeRepairProgress >= 100) {
								this.sim.repairBridge(bridgeLane);
								w.isRepairing = false;
								w.isBuilding = false;
								w.targetRepairBuildingId = null;
								this.sim.addFloatingText('Міст відбудовано!', bx, by - 25, '#10b981');
								this.sim.onSoundEffect?.('buildingComplete');
							}
						} else {
							w.isBuilding = false;
							w.isRepairing = true;
							w.targetX = bx;
							w.targetY = by;
							this.advanceWorkerAlongPath(w, team, bx, by, dt, 20);
						}
						continue;
					}

					const repTarget =
						this.sim.buildings.find((b) => b.instanceId === w.targetRepairBuildingId) ||
						(w.targetRepairBuildingId.startsWith('castle') ? this.sim.castles[team] : null);
					if (repTarget && repTarget.hp < repTarget.maxHp) {
						const isCastle = repTarget === this.sim.castles[team];
						const castle = this.sim.castles[team];
						const bx = isCastle ? castle.x - 120 : repTarget.x;
						const by = isCastle ? castle.y - 140 : repTarget.y;
						const bw = isCastle ? 240 : CELL_SIZE;
						const bh = isCastle ? 280 : CELL_SIZE;
						const distToRep = this.getDistanceToBox(w.x, w.y, bx, by, bw, bh);
						if (distToRep <= 48) {
							const REPAIR_HP_PER_SEC = 50;
							// 0.012 gold per HP = 0.6g/sec at 50 HP/sec (100x cheaper than the old 1g/tick = 60g/sec bug)
							const REPAIR_GOLD_PER_HP = 0.012;
							const healAmount = Math.min(repTarget.maxHp - repTarget.hp, REPAIR_HP_PER_SEC * dt);
							const nextCostAcc = (w.repairGoldAccumulator ?? 0) + healAmount * REPAIR_GOLD_PER_HP;
							const goldCost = Math.floor(nextCostAcc + 1e-9);

							// If out of gold, worker cannot continue repairing
							if (p.gold < Math.max(1, goldCost)) {
								w.isRepairing = false;
								w.isBuilding = false;
								w.targetRepairBuildingId = null;
								this.sim.addFloatingText('Немає золота!', w.x, w.y - 20, '#ef4444');
								this.sim.notifyStateChanged();
								continue;
							}

							w.isBuilding = true;
							w.isRepairing = true;
							w.path = [];
							repTarget.hp += healAmount;
							w.repairGoldAccumulator = Math.max(0, nextCostAcc - goldCost);
							if (goldCost > 0) {
								p.gold = Math.max(0, p.gold - goldCost);
							}
							if (repTarget.hp >= repTarget.maxHp) {
								w.isRepairing = false;
								w.isBuilding = false;
								w.targetRepairBuildingId = null;
								this.sim.addFloatingText('Відремонтовано!', w.x, w.y - 20, '#10b981');
							}
						} else {
							w.isBuilding = false;
							const spot = this.getBestConstructionSpot(team, w.x, w.y, bx, by, bw, bh);
							w.targetX = spot.x;
							w.targetY = spot.y;
							this.advanceWorkerAlongPath(w, team, spot.x, spot.y, dt, 20);
						}
					} else {
						w.isRepairing = false;
						w.isBuilding = false;
						w.targetRepairBuildingId = null;
					}
				} else {
					const dist = Math.hypot(w.targetX - w.x, w.y - w.targetY ? w.targetY - w.y : 0);
					if (dist > 3) {
						this.advanceWorkerAlongPath(w, team, w.targetX, w.targetY, dt, 3);
					}
				}
			}
		}
	}

	private ensureInventory(w: WorkerState): (InventoryItem | null)[] {
		if (!w.inventory || w.inventory.length !== 6) {
			const next: (InventoryItem | null)[] = [null, null, null, null, null, null];
			if (w.inventory) {
				for (let i = 0; i < Math.min(6, w.inventory.length); i++) {
					next[i] = w.inventory[i] ?? null;
				}
			}
			w.inventory = next;
		}
		return w.inventory;
	}

	private executeDropNow(
		player: PlayerState,
		w: WorkerState,
		slotIdx: number,
		dropX: number,
		dropY: number
	): boolean {
		const inv = this.ensureInventory(w);
		const item = inv[slotIdx];
		if (!item) return false;
		inv[slotIdx] = null;
		if (item.foodBonus) {
			player.maxFood = Math.max(0, player.maxFood - item.foodBonus);
		}
		this.sim.groundItems.push({
			instanceId: this.sim.nextGroundItemId(),
			item,
			x: Math.round(dropX),
			y: Math.round(dropY),
			droppedBySlot: player.slot
		});
		this.sim.addFloatingText(`${item.name} викладено`, dropX, dropY - 24, '#fbbf24');
		this.sim.notifyStateChanged();
		return true;
	}

	private executePickupNow(player: PlayerState, w: WorkerState, groundItemId: string): boolean {
		const idx = this.sim.groundItems.findIndex((g) => g.instanceId === groundItemId);
		if (idx === -1) return false;
		const inv = this.ensureInventory(w);
		const emptySlot = inv.findIndex((s) => s === null);
		if (emptySlot === -1) {
			this.sim.addFloatingText('Торба заповнена!', w.x, w.y - 24, '#ef4444');
			return false;
		}
		const [ground] = this.sim.groundItems.splice(idx, 1);
		inv[emptySlot] = ground.item;
		if (ground.item.foodBonus) {
			player.maxFood += ground.item.foodBonus;
		}
		this.sim.addFloatingText(`Підібрано: ${ground.item.name}`, w.x, w.y - 24, '#fbbf24');
		this.sim.onSoundEffect?.('coin');
		this.sim.notifyStateChanged();
		return true;
	}

	private executeTransferNow(
		sourcePlayer: PlayerState,
		sourceWorker: WorkerState,
		slotIdx: number,
		targetPlayer: PlayerState
	): boolean {
		const targetWorker = targetPlayer.worker;
		if (!targetWorker) return false;
		const sourceInv = this.ensureInventory(sourceWorker);
		const item = sourceInv[slotIdx];
		if (!item) return false;
		const targetInv = this.ensureInventory(targetWorker);
		const emptySlot = targetInv.findIndex((s) => s === null);
		if (emptySlot === -1) {
			this.sim.addFloatingText(
				'Інвентар союзника заповнений!',
				targetWorker.x,
				targetWorker.y - 24,
				'#ef4444'
			);
			return false;
		}
		sourceInv[slotIdx] = null;
		targetInv[emptySlot] = item;
		if (item.foodBonus) {
			sourcePlayer.maxFood = Math.max(0, sourcePlayer.maxFood - item.foodBonus);
			targetPlayer.maxFood += item.foodBonus;
		}
		this.sim.addFloatingText(
			`Передано: ${item.name}`,
			targetWorker.x,
			targetWorker.y - 24,
			'#34d399'
		);
		this.sim.onSoundEffect?.('coin');
		this.sim.notifyStateChanged();
		return true;
	}

	private processPendingItemOrder(p: PlayerState, w: WorkerState, dt: number): boolean {
		const order = w.pendingItemOrder;
		if (!order) return false;
		const REACH = 95;

		if (order.kind === 'drop') {
			const dist = Math.hypot(w.x - order.targetX, w.y - order.targetY);
			if (dist <= REACH) {
				w.pendingItemOrder = null;
				w.targetX = w.x;
				w.targetY = w.y;
				w.path = [];
				this.executeDropNow(p, w, order.slotIdx, order.targetX, order.targetY);
				return false;
			}
			this.advanceWorkerAlongPath(w, p.team, order.targetX, order.targetY, dt, 10);
			if (Math.hypot(w.x - order.targetX, w.y - order.targetY) <= REACH) {
				w.pendingItemOrder = null;
				w.targetX = w.x;
				w.targetY = w.y;
				w.path = [];
				this.executeDropNow(p, w, order.slotIdx, order.targetX, order.targetY);
			}
			return true;
		}

		if (order.kind === 'pickup') {
			const ground = this.sim.groundItems.find((g) => g.instanceId === order.groundItemId);
			if (!ground) {
				w.pendingItemOrder = null;
				return false;
			}
			if (Math.hypot(w.x - ground.x, w.y - ground.y) <= REACH) {
				w.pendingItemOrder = null;
				w.targetX = w.x;
				w.targetY = w.y;
				w.path = [];
				this.executePickupNow(p, w, ground.instanceId);
				return false;
			}
			this.advanceWorkerAlongPath(w, p.team, ground.x, ground.y, dt, 10);
			if (Math.hypot(w.x - ground.x, w.y - ground.y) <= REACH) {
				w.pendingItemOrder = null;
				w.targetX = w.x;
				w.targetY = w.y;
				w.path = [];
				this.executePickupNow(p, w, ground.instanceId);
			}
			return true;
		}

		if (order.kind === 'transfer') {
			const targetPlayer = this.sim.allPlayers.find(
				(pl) => pl.team === p.team && pl.slot === order.targetPlayerSlot && pl !== p
			);
			const tw = targetPlayer?.worker;
			if (!targetPlayer || !tw) {
				w.pendingItemOrder = null;
				return false;
			}
			if (Math.hypot(w.x - tw.x, w.y - tw.y) <= REACH + 15) {
				w.pendingItemOrder = null;
				w.targetX = w.x;
				w.targetY = w.y;
				w.path = [];
				this.executeTransferNow(p, w, order.slotIdx, targetPlayer);
				return false;
			}
			this.advanceWorkerAlongPath(w, p.team, tw.x, tw.y, dt, 10);
			if (Math.hypot(w.x - tw.x, w.y - tw.y) <= REACH + 15) {
				w.pendingItemOrder = null;
				w.targetX = w.x;
				w.targetY = w.y;
				w.path = [];
				this.executeTransferNow(p, w, order.slotIdx, targetPlayer);
			}
			return true;
		}

		return false;
	}

	public dropItem(
		team: MatchTeam,
		slotIdx: number,
		worldX: number,
		worldY: number,
		playerInput?: PlayerState
	): boolean {
		const player = playerInput || this.sim.players[team];
		const w = player?.worker;
		if (!w || slotIdx < 0 || slotIdx >= 6) return false;
		const inv = this.ensureInventory(w);
		if (!inv[slotIdx]) return false;

		const clamped = this.clampPointToOwnIsland(team, worldX, worldY, 12, w.x, w.y);
		if (Math.hypot(w.x - clamped.x, w.y - clamped.y) <= 95) {
			w.pendingItemOrder = null;
			return this.executeDropNow(player, w, slotIdx, clamped.x, clamped.y);
		}
		w.isBuilding = false;
		w.isRepairing = false;
		w.targetBuildingId = null;
		w.targetRepairBuildingId = null;
		w.pendingRescueStrike = null;
		w.buildQueue = [];
		w.pendingItemOrder = { kind: 'drop', slotIdx, targetX: clamped.x, targetY: clamped.y };
		w.targetX = clamped.x;
		w.targetY = clamped.y;
		w.path = this.findGroundPath(team, w.x, w.y, clamped.x, clamped.y);
		return true;
	}

	public pickupGroundItem(
		team: MatchTeam,
		groundItemId: string,
		playerInput?: PlayerState
	): boolean {
		const player = playerInput || this.sim.players[team];
		const w = player?.worker;
		if (!w) return false;
		const ground = this.sim.groundItems.find((g) => g.instanceId === groundItemId);
		if (!ground) return false;
		const inv = this.ensureInventory(w);
		if (inv.every((s) => s !== null)) {
			this.sim.addFloatingText('Торба заповнена!', w.x, w.y - 24, '#ef4444');
			return false;
		}
		if (Math.hypot(w.x - ground.x, w.y - ground.y) <= 95) {
			w.pendingItemOrder = null;
			return this.executePickupNow(player, w, groundItemId);
		}
		w.isBuilding = false;
		w.isRepairing = false;
		w.targetBuildingId = null;
		w.targetRepairBuildingId = null;
		w.pendingRescueStrike = null;
		w.buildQueue = [];
		w.pendingItemOrder = { kind: 'pickup', groundItemId };
		w.targetX = ground.x;
		w.targetY = ground.y;
		w.path = this.findGroundPath(team, w.x, w.y, ground.x, ground.y);
		return true;
	}

	public transferItem(
		team: MatchTeam,
		slotIdx: number,
		targetPlayerSlot: number,
		playerInput?: PlayerState
	): boolean {
		const player = playerInput || this.sim.players[team];
		const w = player?.worker;
		if (!w || slotIdx < 0 || slotIdx >= 6) return false;
		const inv = this.ensureInventory(w);
		if (!inv[slotIdx]) return false;

		const targetPlayer = this.sim.allPlayers.find(
			(pl) => pl.team === player.team && pl.slot === targetPlayerSlot && pl !== player
		);
		const tw = targetPlayer?.worker;
		if (!targetPlayer || !tw) return false;

		if (Math.hypot(w.x - tw.x, w.y - tw.y) <= 110) {
			w.pendingItemOrder = null;
			return this.executeTransferNow(player, w, slotIdx, targetPlayer);
		}
		w.isBuilding = false;
		w.isRepairing = false;
		w.targetBuildingId = null;
		w.targetRepairBuildingId = null;
		w.pendingRescueStrike = null;
		w.buildQueue = [];
		w.pendingItemOrder = { kind: 'transfer', slotIdx, targetPlayerSlot };
		w.targetX = tw.x;
		w.targetY = tw.y;
		w.path = this.findGroundPath(team, w.x, w.y, tw.x, tw.y);
		return true;
	}

	public swapInventorySlots(
		team: MatchTeam,
		fromSlot: number,
		toSlot: number,
		playerInput?: PlayerState
	): boolean {
		const player = playerInput || this.sim.players[team];
		const w = player?.worker;
		if (!w || fromSlot < 0 || fromSlot >= 6 || toSlot < 0 || toSlot >= 6 || fromSlot === toSlot) {
			return false;
		}
		const inv = this.ensureInventory(w);
		if (!inv[fromSlot] && !inv[toSlot]) return false;
		const tmp = inv[fromSlot];
		inv[fromSlot] = inv[toSlot];
		inv[toSlot] = tmp;
		this.sim.notifyStateChanged();
		return true;
	}

	public useItem(team: MatchTeam, slotIdx: number, playerInput?: PlayerState): boolean {
		const player = playerInput || this.sim.players[team];
		const w = player?.worker;
		if (!w || slotIdx < 0 || slotIdx >= 6) return false;
		const inv = this.ensureInventory(w);
		const item = inv[slotIdx];
		if (!item || !item.activeAbility) return false;

		if ((item.cooldownRemaining ?? 0) > 0) {
			if (!player.isBot) this.sim.onSoundEffect?.('errorResource');
			this.sim.addFloatingText(
				`Перезарядка: ${Math.ceil(item.cooldownRemaining ?? 0)}с`,
				w.x,
				w.y - 30,
				'#94a3b8'
			);
			return false;
		}

		if (item.activeAbility === 'chain_lightning') {
			const castRangeSq = 1200 * 1200;
			const bounceRangeSq = 600 * 600;
			const enemies = this.sim.units.filter((u) => u.team !== team && u.state !== 'DEAD');
			let primary = null;
			let bestDistSq = Infinity;
			for (const u of enemies) {
				const dx = u.x - w.x;
				const dy = u.y - w.y;
				const dSq = dx * dx + dy * dy;
				if (dSq <= castRangeSq && dSq < bestDistSq) {
					bestDistSq = dSq;
					primary = u;
				}
			}

			if (!primary) {
				if (!player.isBot) this.sim.onSoundEffect?.('errorResource');
				this.sim.addFloatingText('Немає ворогів поруч!', w.x, w.y - 30, '#ef4444');
				return false;
			}

			const hitIds = new Set<string>();
			let current = primary;
			let damage = 1000;
			for (let bounce = 0; bounce < 10; bounce++) {
				hitIds.add(current.instanceId);
				this.sim.combatSystem.applyUnitDamage(current, Math.round(damage), 'magic', team, false);
				damage *= 0.85;

				let nextTarget = null;
				let nextBestSq = Infinity;
				for (const u of enemies) {
					if (u.state === 'DEAD' || hitIds.has(u.instanceId)) continue;
					const dx = u.x - current.x;
					const dy = u.y - current.y;
					const dSq = dx * dx + dy * dy;
					if (dSq <= bounceRangeSq && dSq < nextBestSq) {
						nextBestSq = dSq;
						nextTarget = u;
					}
				}
				if (!nextTarget) break;
				current = nextTarget;
			}

			item.cooldownRemaining = item.cooldown ?? 60;
			this.sim.addFloatingText(
				`Куля блискавок! (${hitIds.size} цілей)`,
				primary.x,
				primary.y - 30,
				'#38bdf8'
			);
			this.sim.onSoundEffect?.('magic');
			this.sim.notifyStateChanged();
			return true;
		}

		return false;
	}
}
