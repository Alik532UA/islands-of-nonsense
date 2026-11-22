import type { Simulation } from './simulation';
import { ARENA_WIDTH, ARENA_HEIGHT, TOP_LANE_Y, BOTTOM_LANE_Y } from './constants';

/**
 * Applies hard non-penetration and soft Boids-style separation repulsion between ground units
 * to prevent stacking and create authentic frontline spread across the lane corridor width.
 */
export function applyCrowdSeparation(sim: Simulation, dt: number): void {
	const collisionRadius = 36;

	for (let i = 0; i < sim.units.length; i++) {
		const u = sim.units[i];
		if (u.state === 'DEAD' || u.flying) continue;

		for (let j = i + 1; j < sim.units.length; j++) {
			const other = sim.units[j];
			if (other.state === 'DEAD' || other.flying || other.lane !== u.lane) continue;

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

			// Hard non-penetration threshold
			const minPhysicalDist = (u.size + other.size) * 0.95;

			if (dist < minPhysicalDist) {
				// Instant positional overlap resolution (mobs cannot occupy the exact same spot!)
				const overlap = minPhysicalDist - dist;
				const nx = dx / dist;
				const ny = dy / dist;

				let uWeight = 0.5;
				let otherWeight = 0.5;
				if (u.state === 'ATTACKING' && other.state === 'WALKING') {
					uWeight = 0.2;
					otherWeight = 0.8;
				} else if (u.state === 'WALKING' && other.state === 'ATTACKING') {
					uWeight = 0.8;
					otherWeight = 0.2;
				}

				u.x += nx * overlap * uWeight;
				u.y += ny * overlap * uWeight;
				other.x -= nx * overlap * otherWeight;
				other.y -= ny * overlap * otherWeight;
			} else if (dist < collisionRadius) {
				// Soft Boids-style separation to spread the formation across the lane corridor
				const overlap = (collisionRadius - dist) / collisionRadius;
				const push = overlap * 60 * dt;
				const nx = dx / dist;
				const ny = dy / dist;

				u.x += nx * push * 0.5;
				u.y += ny * push * 0.5;
				other.x -= nx * push * 0.5;
				other.y -= ny * push * 0.5;
			}
		}

		// Enforce solid obstacle collision for ground units AFTER all movement and crowd pushes!
		if (!u.flying) {
			const resolved = sim.workerSystem.resolveGroundObstacles(u.x, u.y, u.size);
			u.x = resolved.x;
			u.y = resolved.y;
		}

		// Keep unit bounded within its lane corridor when between castles
		if (u.x >= 1480 && u.x <= ARENA_WIDTH - 1480) {
			const laneCenterY = u.lane === 'top' ? TOP_LANE_Y : BOTTOM_LANE_Y;
			u.y = Math.max(laneCenterY - 80, Math.min(laneCenterY + 80, u.y));
		} else {
			// In castle siege zone, allow units to spread around castle
			u.y = Math.max(100, Math.min(ARENA_HEIGHT - 100, u.y));
		}
		u.x = Math.max(100, Math.min(ARENA_WIDTH - 100, u.x));
	}
}
