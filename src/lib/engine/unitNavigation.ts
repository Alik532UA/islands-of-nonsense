import type { Simulation } from './simulation';
import {
	TOP_LANE_Y,
	MID_LANE_Y,
	BOTTOM_LANE_Y,
	BRIDGE_SPAN_MIN_X,
	BRIDGE_SPAN_MAX_X,
	WEST_ROAD_MERGE_X,
	EAST_ROAD_MERGE_X
} from './constants';
import type { Unit, MatchTeam } from './types';
import { logService } from '../services/logService.svelte';

/**
 * UnitNavigation handles strategic waypoint planning for units approaching/crossing bridges,
 * highway alignment, lane switching around broken bridges, and ground obstacle avoidance.
 */
export class UnitNavigation {
	constructor(private sim: Simulation) {}

	public getEffectiveCrossingLane(u: Unit): 'top' | 'mid' | 'bottom' {
		if (!u.flying && this.sim.brokenBridge && u.lane === this.sim.brokenBridge) {
			return this.sim.brokenBridge === 'mid' ? 'top' : 'mid';
		}
		return u.lane;
	}

	/**
	 * Computes intelligent advance strategic waypoints for units approaching and crossing bridges.
	 * Units merge onto the highway and align to lane center well before reaching the bridge,
	 * ensuring perfectly smooth transitions without any abrupt snapping or teleportation.
	 */
	public getStrategicNavTarget(
		u: Unit,
		finalTargetX: number,
		finalTargetY: number,
		crossingLaneY: number
	): { x: number; y: number } {
		if (u.flying) {
			const laneY = u.lane === 'top' ? TOP_LANE_Y : u.lane === 'mid' ? MID_LANE_Y : BOTTOM_LANE_Y;
			if (u.team === 'west') {
				if (u.x < BRIDGE_SPAN_MAX_X + 20) {
					return { x: BRIDGE_SPAN_MAX_X + 40, y: laneY };
				}
			} else {
				if (u.x > BRIDGE_SPAN_MIN_X - 20) {
					return { x: BRIDGE_SPAN_MIN_X - 40, y: laneY };
				}
			}
			return { x: finalTargetX, y: finalTargetY };
		}

		const isWest = u.team === 'west';
		if (isWest) {
			// 0. Courtyard bypass for units behind friendly West Castle (footprint 1480..1720, 1080..1320)
			if (u.x < 1740) {
				const northSide = (u.y ?? MID_LANE_Y) < 1200;
				if (crossingLaneY === TOP_LANE_Y) {
					if (u.x < 1560) return { x: 1600, y: 920 };
					return { x: 1800, y: TOP_LANE_Y };
				} else if (crossingLaneY === BOTTOM_LANE_Y) {
					if (u.x < 1560) return { x: 1600, y: 1480 };
					return { x: 1800, y: BOTTOM_LANE_Y };
				} else {
					if (u.x < 1560) return { x: 1600, y: northSide ? 920 : 1480 };
					if (u.x < 1760) return { x: 1800, y: northSide ? 960 : 1440 };
					return { x: 1950, y: MID_LANE_Y };
				}
			}

			// 1. Stage A: Castle courtyard to Highway merge zone
			if (u.x < WEST_ROAD_MERGE_X + 50) {
				return { x: WEST_ROAD_MERGE_X + 100, y: crossingLaneY };
			}
			// 2. Stage B: Pre-bridge approach highway (straight run into bridge mouth)
			if (u.x < BRIDGE_SPAN_MIN_X - 10) {
				return { x: BRIDGE_SPAN_MIN_X - 5, y: crossingLaneY };
			}
			// 3. Stage C: On the bridge spanning the central ocean channel
			if (u.x <= BRIDGE_SPAN_MAX_X + 25) {
				return { x: BRIDGE_SPAN_MAX_X + 45, y: crossingLaneY };
			}
			// 4. Stage D: Post-bridge East highway run towards merge point
			const eastMergeThreshold = Math.min(finalTargetX - 40, EAST_ROAD_MERGE_X);
			if (u.x < eastMergeThreshold - 20) {
				return { x: eastMergeThreshold, y: crossingLaneY };
			}
			// 5. Stage E: Beyond merge point or abreast of target - march towards final objective
			return { x: finalTargetX, y: finalTargetY };
		} else {
			// East team unit moving west towards West island
			// 0. Courtyard bypass for units behind friendly East Castle (footprint 5480..5720, 1080..1320)
			if (u.x > 5460) {
				const northSide = (u.y ?? MID_LANE_Y) < 1200;
				if (crossingLaneY === TOP_LANE_Y) {
					if (u.x > 5640) return { x: 5600, y: 920 };
					return { x: 5400, y: TOP_LANE_Y };
				} else if (crossingLaneY === BOTTOM_LANE_Y) {
					if (u.x > 5640) return { x: 5600, y: 1480 };
					return { x: 5400, y: BOTTOM_LANE_Y };
				} else {
					if (u.x > 5640) return { x: 5600, y: northSide ? 920 : 1480 };
					if (u.x > 5440) return { x: 5400, y: northSide ? 960 : 1440 };
					return { x: 5250, y: MID_LANE_Y };
				}
			}

			// 1. Stage A: East courtyard to Highway merge zone
			if (u.x > EAST_ROAD_MERGE_X - 50) {
				return { x: EAST_ROAD_MERGE_X - 100, y: crossingLaneY };
			}
			// 2. Stage B: Pre-bridge approach highway
			if (u.x > BRIDGE_SPAN_MAX_X + 10) {
				return { x: BRIDGE_SPAN_MAX_X + 5, y: crossingLaneY };
			}
			// 3. Stage C: On the bridge
			if (u.x >= BRIDGE_SPAN_MIN_X - 25) {
				return { x: BRIDGE_SPAN_MIN_X - 45, y: crossingLaneY };
			}
			// 4. Stage D: Post-bridge West highway run towards merge point
			const westMergeThreshold = Math.max(finalTargetX + 40, WEST_ROAD_MERGE_X);
			if (u.x > westMergeThreshold + 20) {
				return { x: westMergeThreshold, y: crossingLaneY };
			}
			// 5. Stage E: Beyond merge point or abreast of target - march towards final objective
			return { x: finalTargetX, y: finalTargetY };
		}
	}

	/**
	 * Moves a unit towards a target coordinate with intelligent waypoint pathfinding & obstacle avoidance
	 * for ground units, smoothly navigating around buildings, castles, walls, and decorations without teleporting.
	 */
	public moveUnitTowards(
		u: Unit,
		targetX: number,
		targetY: number,
		speed: number,
		dt: number,
		ignoreBuildingId?: string,
		ignoreCastle?: boolean
	): void {
		const dx = targetX - u.x;
		const dy = targetY - u.y;
		const dist = Math.hypot(dx, dy);
		if (dist < 1) return;

		// Flying units soar unimpeded over ground obstacles
		if (u.flying) {
			const moveDist = Math.min(dist, speed * dt);
			u.x += (dx / dist) * moveDist;
			u.y += (dy / dist) * moveDist;
			return;
		}

		// Track movement progress for ground unit stuck detection
		const lastX = u.lastMoveX ?? u.x;
		const lastY = u.lastMoveY ?? u.y;
		const stepMoved = Math.hypot(u.x - lastX, u.y - lastY);
		u.lastMoveX = u.x;
		u.lastMoveY = u.y;

		if (stepMoved < speed * dt * 0.15) {
			const prevStuck = u.stuckTimer || 0;
			u.stuckTimer = prevStuck + dt;
			if (prevStuck <= 0.6 && u.stuckTimer > 0.6) {
				const nearFriendlyCastle =
					(u.team === 'west' && Math.hypot(1600 - u.x, 1200 - u.y) < 220) ||
					(u.team === 'east' && Math.hypot(5600 - u.x, 1200 - u.y) < 220);
				const reason = nearFriendlyCastle ? 'behind_friendly_castle' : 'obstacle_collision';
				logService.collision('Unit stuck against obstacle', {
					unit: u.name,
					unitId: u.instanceId,
					pos: { x: Math.round(u.x), y: Math.round(u.y) },
					target: { x: Math.round(targetX), y: Math.round(targetY) },
					state: u.state,
					reason
				});
			}
		} else {
			u.stuckTimer = 0;
		}

		// Invalidate stale waypoint path if navigation target changed significantly
		if (
			u.path &&
			u.pathTargetX !== undefined &&
			u.pathTargetY !== undefined &&
			Math.hypot(u.pathTargetX - targetX, u.pathTargetY - targetY) > 60
		) {
			u.path = undefined;
		}

		// 1. Follow active waypoint path if unit already has one
		if (u.path && u.path.length > 0) {
			let curWp = u.path[0];
			let wpDist = Math.hypot(curWp.x - u.x, curWp.y - u.y);

			while (wpDist < 14 && u.path.length > 0) {
				u.path.shift();
				if (u.path.length === 0) break;
				curWp = u.path[0];
				wpDist = Math.hypot(curWp.x - u.x, curWp.y - u.y);
			}

			if (u.path.length > 0 && wpDist > 0.001) {
				const step = Math.min(wpDist, speed * dt);
				u.x += ((curWp.x - u.x) / wpDist) * step;
				u.y += ((curWp.y - u.y) / wpDist) * step;
				return;
			}
			u.path = undefined;
		}

		// 2. Direct line check: if unobstructed, move straight towards target
		const lineClear = this.sim.workerSystem.isGroundLineClear(
			u.x,
			u.y,
			targetX,
			targetY,
			u.size,
			ignoreBuildingId,
			ignoreCastle
		);

		if (lineClear) {
			u.path = undefined;
			const step = Math.min(dist, speed * dt);
			u.x += (dx / dist) * step;
			u.y += (dy / dist) * step;
			return;
		}

		// 3. Obstacle ahead: utilize A* waypoint pathfinding with cooldown throttling
		const targetMoved =
			u.pathTargetX === undefined ||
			Math.hypot(u.pathTargetX - targetX, (u.pathTargetY ?? 0) - targetY) > 50;
		const now = this.sim.gameTime;
		const canRecalcPath = now - (u.lastPathTime ?? -10) >= 1.2;

		if (
			(!u.path || u.path.length === 0 || targetMoved || (u.stuckTimer && u.stuckTimer > 0.6)) &&
			canRecalcPath
		) {
			u.lastPathTime = now;
			u.path = this.sim.workerSystem.findGroundPath(
				u.team as MatchTeam,
				u.x,
				u.y,
				targetX,
				targetY,
				u.size,
				ignoreBuildingId,
				ignoreCastle
			);
			u.pathTargetX = targetX;
			u.pathTargetY = targetY;
			u.stuckTimer = 0;
		}

		if (u.path && u.path.length > 0) {
			let curWp = u.path[0];
			let wpDist = Math.hypot(curWp.x - u.x, curWp.y - u.y);

			while (wpDist < 14 && u.path.length > 0) {
				u.path.shift();
				if (u.path.length === 0) break;
				curWp = u.path[0];
				wpDist = Math.hypot(curWp.x - u.x, curWp.y - u.y);
			}

			if (u.path.length > 0 && wpDist > 0.001) {
				const step = Math.min(wpDist, speed * dt);
				u.x += ((curWp.x - u.x) / wpDist) * step;
				u.y += ((curWp.y - u.y) / wpDist) * step;
				return;
			}
		}

		// 3. Fallback smooth raycast avoidance
		const baseAngle = Math.atan2(dy, dx);
		const lookAhead = Math.min(dist, Math.max(28, u.size + speed * dt * 6));
		let moveAngle = baseAngle;

		const testOffsets = [0.45, -0.45, 0.85, -0.85, 1.3, -1.3, 1.75, -1.75];
		for (const offset of testOffsets) {
			const candAngle = baseAngle + offset;
			const cx = u.x + Math.cos(candAngle) * lookAhead;
			const cy = u.y + Math.sin(candAngle) * lookAhead;
			if (
				!this.sim.workerSystem.isPointBlockedForGround(
					cx,
					cy,
					u.size,
					ignoreBuildingId,
					ignoreCastle
				)
			) {
				moveAngle = candAngle;
				break;
			}
		}

		const step = Math.min(dist, speed * dt);
		u.x += Math.cos(moveAngle) * step;
		u.y += Math.sin(moveAngle) * step;
	}
}
