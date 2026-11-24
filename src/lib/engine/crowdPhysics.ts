import type { Simulation } from './simulation';
import {
	ARENA_WIDTH,
	ARENA_HEIGHT,
	TOP_LANE_Y,
	MID_LANE_Y,
	BOTTOM_LANE_Y,
	BRIDGE_SPAN_MIN_X,
	BRIDGE_SPAN_MAX_X,
	WEST_ROAD_MERGE_X,
	EAST_ROAD_MERGE_X
} from './constants';

/**
 * Applies hard non-penetration and soft Boids-style separation repulsion between ground units
 * to prevent stacking and create authentic frontline spread across the lane corridor width.
 * Uses SpatialHashGrid for O(N) performance and single-file corridor flow to prevent bottlenecks.
 */
export function applyCrowdSeparation(sim: Simulation, dt: number): void {
	const collisionRadius = 36;

	// Ensure spatial grid has entries (handles direct test calls)
	if (sim.units.length > 0) {
		const sampleUnit = sim.units[0];
		if (sim.spatialGrid.queryRadius(sampleUnit.x, sampleUnit.y, 50).length === 0) {
			sim.spatialGrid.clear();
			for (let i = 0; i < sim.units.length; i++) {
				if (sim.units[i].state !== 'DEAD') sim.spatialGrid.insert(sim.units[i]);
			}
		}
	}

	for (let i = 0; i < sim.units.length; i++) {
		const u = sim.units[i];
		if (u.state === 'DEAD' || u.flying) continue;

		// Spatial grid lookup: only inspect nearby physical candidates (cross-lane included when converged)
		const neighbors = sim.spatialGrid.queryRadius(u.x, u.y, collisionRadius, (other) => {
			return other.instanceId > u.instanceId && !other.flying && other.state !== 'DEAD';
		});

		for (let n = 0; n < neighbors.length; n++) {
			const other = neighbors[n];

			let dx = u.x - other.x;
			let dy = u.y - other.y;
			let dist = Math.hypot(dx, dy);

			// If exactly overlapping, give deterministic separation nudge
			if (dist < 0.1) {
				const seed = (u.instanceId.charCodeAt(u.instanceId.length - 1) || 1) % 2 === 0 ? 1 : -1;
				dx = seed * 0.5;
				dy = (seed === 1 ? -1 : 1) * 2;
				dist = Math.hypot(dx, dy);
			}

			// In narrow corridors or during transit, prevent lateral jamming
			const isWest = u.team === 'west';
			const moveDx = (u.targetX ?? (isWest ? 2500 : 4700)) - u.x;
			const moveDy = (u.targetY ?? TOP_LANE_Y) - u.y;
			const isMovingVertical = Math.abs(moveDy) > Math.abs(moveDx) * 1.5;

			const isHostile = u.team !== other.team;
			const isBothWalking = u.state === 'WALKING' && other.state === 'WALKING';
			const isAlliedStream = isBothWalking && !isHostile;

			const isStuck =
				!isHostile &&
				((u.stuckTimer !== undefined && u.stuckTimer > 0.3) ||
					(other.stuckTimer !== undefined && other.stuckTimer > 0.3));

			// Hard non-penetration threshold:
			// Opposing units always keep full solid collision body (>= 26px) so they never slip through each other.
			// Allied walking streams use compact clearance (12px) or soft 6px when unstucking bottlenecks.
			const minPhysicalDist = isHostile
				? Math.max((u.size + other.size) * 0.9, 26)
				: isStuck
					? 6
					: isAlliedStream
						? 12
						: (u.size + other.size) * 0.85;

			if (dist < minPhysicalDist) {
				// Smooth positional overlap resolution; hostile fronts enforce full solid blocking
				const overlap = isHostile
					? Math.min(minPhysicalDist - dist, 32)
					: Math.min(minPhysicalDist - dist, isStuck ? 2 : isAlliedStream ? 4 : 8);
				let nx = dx / dist;
				let ny = dy / dist;

				// In tight allied flow between buildings, suppress perpendicular push along the walls
				// so allied units don't shove each other into building walls; never weaken hostile blocking!
				if (isAlliedStream) {
					if (isMovingVertical && Math.abs(dx) < 16) {
						nx *= 0.15;
					} else if (!isMovingVertical && Math.abs(dy) < 16) {
						ny *= 0.15;
					}
				}

				let uWeight = 0.5;
				let otherWeight = 0.5;
				if (u.state === 'ATTACKING' && other.state === 'WALKING') {
					uWeight = 0.15;
					otherWeight = 0.85;
				} else if (u.state === 'WALKING' && other.state === 'ATTACKING') {
					uWeight = 0.85;
					otherWeight = 0.15;
				}

				u.x += nx * overlap * uWeight;
				u.y += ny * overlap * uWeight;
				other.x -= nx * overlap * otherWeight;
				other.y -= ny * overlap * otherWeight;
			} else if (dist < (isAlliedStream ? 18 : collisionRadius)) {
				// Soft Boids-style separation to spread the formation across the lane corridor
				const effRadius = isAlliedStream ? 18 : collisionRadius;
				const overlap = (effRadius - dist) / effRadius;
				const push = Math.min(overlap * 25 * dt, isAlliedStream ? 1.5 : 4);
				const nx = dx / dist;
				const ny = dy / dist;

				// In allied walking single-file transit, only spread laterally across the corridor width,
				// never push trailing allies backwards; hostile units always push back radially.
				if (isAlliedStream) {
					if (isMovingVertical) {
						u.x += nx * push * 0.5;
						other.x -= nx * push * 0.5;
					} else {
						u.y += ny * push * 0.5;
						other.y -= ny * push * 0.5;
					}
				} else {
					u.x += nx * push * 0.5;
					u.y += ny * push * 0.5;
					other.x -= nx * push * 0.5;
					other.y -= ny * push * 0.5;
				}
			}
		}

		// Enforce solid obstacle collision for ground units AFTER all movement and crowd pushes!
		if (!u.flying) {
			const resolved = sim.workerSystem.resolveGroundObstacles(u.x, u.y, u.size);
			u.x = resolved.x;
			u.y = resolved.y;
		}

		// Keep ground units on their respective bridge railing boundary ONLY when crossing the central ocean channel or aligned on highway
		if (!u.flying && u.team !== 'neutral') {
			const effectiveCrossingLane: 'top' | 'mid' | 'bottom' =
				sim.brokenBridge && u.lane === sim.brokenBridge
					? sim.brokenBridge === 'mid'
						? 'top'
						: 'mid'
					: u.lane;
			const laneCenterY =
				effectiveCrossingLane === 'top'
					? TOP_LANE_Y
					: effectiveCrossingLane === 'mid'
						? MID_LANE_Y
						: BOTTOM_LANE_Y;

			if (u.x >= BRIDGE_SPAN_MIN_X && u.x <= BRIDGE_SPAN_MAX_X) {
				const maxBridgeOffset = 56;
				if (Math.abs(u.y - laneCenterY) <= 100) {
					if (u.y > laneCenterY + maxBridgeOffset) {
						u.y = laneCenterY + maxBridgeOffset;
					} else if (u.y < laneCenterY - maxBridgeOffset) {
						u.y = laneCenterY - maxBridgeOffset;
					}
				}
			} else if (u.x >= WEST_ROAD_MERGE_X + 50 && u.x <= EAST_ROAD_MERGE_X - 50) {
				// On highway approach: only constrain if marching along the corridor (not fighting off-lane targets)
				const isFightingOffLane =
					u.currentTargetId !== null ||
					Boolean(u.targetBuildingId && !u.targetBuildingId.startsWith('castle'));
				if (!isFightingOffLane) {
					const maxCorridorOffset = 72;
					if (Math.abs(u.y - laneCenterY) <= maxCorridorOffset + 20) {
						if (u.y > laneCenterY + maxCorridorOffset) {
							u.y = laneCenterY + maxCorridorOffset;
						} else if (u.y < laneCenterY - maxCorridorOffset) {
							u.y = laneCenterY - maxCorridorOffset;
						}
					}
				}
			} else {
				// On the islands & courtyard, units spread out and navigate towards targets & castle
				u.y = Math.max(80, Math.min(ARENA_HEIGHT - 80, u.y));
			}
		} else {
			u.y = Math.max(80, Math.min(ARENA_HEIGHT - 80, u.y));
		}
		u.x = Math.max(80, Math.min(ARENA_WIDTH - 80, u.x));
	}
}
