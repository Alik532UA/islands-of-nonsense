import type { Simulation } from './simulation';
import {
	ARENA_WIDTH,
	ARENA_HEIGHT,
	CELL_SIZE,
	SOLID_MAP_OBSTACLES,
	BRIDGE_SPAN_MIN_X,
	BRIDGE_SPAN_MAX_X,
	TOP_LANE_Y,
	MID_LANE_Y,
	BOTTOM_LANE_Y
} from './constants';
import type { MatchTeam, WorkerState, PlayerState } from './types';
import { logService } from '../services/logService.svelte';

export { SOLID_MAP_OBSTACLES } from './constants';

/**
 * WorkerSystem handles worker navigation, A* pathfinding,
 * dynamic obstacle collision resolution, and building construction/repairs.
 */
export class WorkerSystem {
	constructor(private sim: Simulation) {}

	/**
	 * Resolves solid obstacles (2x2 buildings, stone walls, castles, terrain perimeter) for ground entities.
	 * Pushes the entity out of the solid box along the shortest normal to allow smooth sliding around corners.
	 */
	public resolveGroundObstacles(x: number, y: number, radius: number): { x: number; y: number } {
		let currX = x;
		let currY = y;

		// 1. Solid Buildings (2x2 footprint)
		for (const b of this.sim.buildings) {
			const minX = b.x;
			const maxX = b.x + CELL_SIZE;
			const minY = b.y;
			const maxY = b.y + CELL_SIZE;

			const closestX = Math.max(minX, Math.min(maxX, currX));
			const closestY = Math.max(minY, Math.min(maxY, currY));
			const diffX = currX - closestX;
			const diffY = currY - closestY;
			const dist = Math.hypot(diffX, diffY);

			if (dist < radius) {
				if (dist > 0.001) {
					// Outside or touching: push out along normal
					currX = closestX + (diffX / dist) * radius;
					currY = closestY + (diffY / dist) * radius;
				} else {
					// Inside the building box: find closest face to push out
					const dLeft = currX - minX;
					const dRight = maxX - currX;
					const dTop = currY - minY;
					const dBottom = maxY - currY;
					const minD = Math.min(dLeft, dRight, dTop, dBottom);
					if (minD === dLeft) currX = minX - radius;
					else if (minD === dRight) currX = maxX + radius;
					else if (minD === dTop) currY = minY - radius;
					else currY = maxY + radius;
				}
			}
		}

		// 2. Solid Map Walls & Terrain Obstacles (including Castles)
		for (const wall of SOLID_MAP_OBSTACLES) {
			if (
				currX >= wall.minX - radius &&
				currX <= wall.maxX + radius &&
				currY >= wall.minY - radius &&
				currY <= wall.maxY + radius
			) {
				const cX = Math.max(wall.minX, Math.min(wall.maxX, currX));
				const cY = Math.max(wall.minY, Math.min(wall.maxY, currY));
				const dX = currX - cX;
				const dY = currY - cY;
				const d = Math.hypot(dX, dY);
				if (d < radius) {
					if (d > 0.001) {
						currX = cX + (dX / d) * radius;
						currY = cY + (dY / d) * radius;
					} else {
						const dLeft = currX - wall.minX;
						const dRight = wall.maxX - currX;
						const dTop = currY - wall.minY;
						const dBottom = wall.maxY - currY;
						const minD = Math.min(dLeft, dRight, dTop, dBottom);
						if (minD === dLeft) currX = wall.minX - radius;
						else if (minD === dRight) currX = wall.maxX + radius;
						else if (minD === dTop) currY = wall.minY - radius;
						else currY = wall.maxY + radius;
					}
				}
			}
		}

		// 3. Natural Decorations (Trees, Rocks, Ruins)
		if (this.sim.decorations) {
			for (const d of this.sim.decorations) {
				const dX = currX - d.x;
				const dY = currY - d.y;
				const dist = Math.hypot(dX, dY);
				const minDist = d.radius + radius;
				if (dist < minDist) {
					if (dist > 0.001) {
						currX = d.x + (dX / dist) * minDist;
						currY = d.y + (dY / dist) * minDist;
					} else {
						currX = d.x + minDist;
					}
				}
			}
		}

		// 4. Broken Bridge Water Gap (impassable water chasm when bridge is broken)
		if (this.sim.brokenBridge) {
			const brokenLaneY =
				this.sim.brokenBridge === 'top'
					? TOP_LANE_Y
					: this.sim.brokenBridge === 'mid'
						? MID_LANE_Y
						: BOTTOM_LANE_Y;
			const chasmMinX = 3420;
			const chasmMaxX = 3780;
			const chasmMinY = brokenLaneY - 85;
			const chasmMaxY = brokenLaneY + 85;

			if (
				currX >= chasmMinX - radius &&
				currX <= chasmMaxX + radius &&
				currY >= chasmMinY - radius &&
				currY <= chasmMaxY + radius
			) {
				const dLeft = currX - chasmMinX;
				const dRight = chasmMaxX - currX;
				const dTop = currY - chasmMinY;
				const dBottom = chasmMaxY - currY;
				const minD = Math.min(dLeft, dRight, dTop, dBottom);
				if (minD === dLeft) currX = chasmMinX - radius - 1;
				else if (minD === dRight) currX = chasmMaxX + radius + 1;
				else if (minD === dTop) currY = chasmMinY - radius - 1;
				else currY = chasmMaxY + radius + 1;
			}
		}

		return { x: currX, y: currY };
	}

	/**
	 * Checks if a point is impassable for a worker (colliding with buildings or terrain obstacles).
	 */
	public isPointBlockedForWorker(team: MatchTeam, x: number, y: number, radius = 16): boolean {
		// Base territory boundaries: worker must remain on solid island landmass
		if (!this.sim.buildingSystem.isPointOnIsland(team, x, y, 10)) {
			return true;
		}

		// Perimeter walls and solid terrain obstacles
		for (const wall of SOLID_MAP_OBSTACLES) {
			if (
				x >= wall.minX - radius &&
				x <= wall.maxX + radius &&
				y >= wall.minY - radius &&
				y <= wall.maxY + radius
			) {
				return true;
			}
		}

		// Solid buildings (CELL_SIZE footprint)
		for (const b of this.sim.buildings) {
			if (
				x >= b.x - radius &&
				x <= b.x + CELL_SIZE + radius &&
				y >= b.y - radius &&
				y <= b.y + CELL_SIZE + radius
			) {
				return true;
			}
		}

		// Natural Decorations
		if (this.sim.decorations) {
			for (const d of this.sim.decorations) {
				if (Math.hypot(x - d.x, y - d.y) < radius + d.radius) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * Checks if a point is impassable for ground units (colliding with buildings, castles, walls, or decorations).
	 */
	public isPointBlockedForGround(
		x: number,
		y: number,
		radius = 16,
		ignoreBuildingId?: string,
		ignoreCastle?: boolean
	): boolean {
		// 1. Solid buildings (CELL_SIZE footprint)
		for (const b of this.sim.buildings) {
			if (ignoreBuildingId && b.instanceId === ignoreBuildingId) continue;
			if (
				x >= b.x - radius &&
				x <= b.x + CELL_SIZE + radius &&
				y >= b.y - radius &&
				y <= b.y + CELL_SIZE + radius
			) {
				return true;
			}
		}

		// 2. Perimeter walls and solid terrain obstacles (castles, keep walls)
		for (const wall of SOLID_MAP_OBSTACLES) {
			if (ignoreCastle && (wall.minX === 1480 || wall.minX === 5480)) {
				// Castle fortress is the target: do not treat as impassable obstacle
				continue;
			}
			if (
				x >= wall.minX - radius &&
				x <= wall.maxX + radius &&
				y >= wall.minY - radius &&
				y <= wall.maxY + radius
			) {
				return true;
			}
		}

		// 3. Natural Decorations collision
		if (this.sim.decorations) {
			for (const d of this.sim.decorations) {
				if (Math.hypot(x - d.x, y - d.y) < radius + d.radius) {
					return true;
				}
			}
		}

		// 4. Broken Bridge Water Chasm (impassable water gap for ground units)
		if (this.sim.brokenBridge) {
			const brokenLaneY =
				this.sim.brokenBridge === 'top'
					? TOP_LANE_Y
					: this.sim.brokenBridge === 'mid'
						? MID_LANE_Y
						: BOTTOM_LANE_Y;
			const chasmMinX = 3380;
			const chasmMaxX = 3820;
			const chasmMinY = brokenLaneY - 95;
			const chasmMaxY = brokenLaneY + 95;

			if (
				x >= chasmMinX - radius &&
				x <= chasmMaxX + radius &&
				y >= chasmMinY - radius &&
				y <= chasmMaxY + radius
			) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Checks if direct straight line between (x1, y1) and (x2, y2) is free of obstacles for ground units.
	 */
	public isGroundLineClear(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		radius = 16,
		ignoreBuildingId?: string,
		ignoreCastle?: boolean
	): boolean {
		const dist = Math.hypot(x2 - x1, y2 - y1);
		if (dist < 2) return true;
		const steps = Math.ceil(dist / 20);
		for (let s = 1; s <= steps; s++) {
			const t = s / steps;
			const px = x1 + (x2 - x1) * t;
			const py = y1 + (y2 - y1) * t;
			if (this.isPointBlockedForGround(px, py, radius, ignoreBuildingId, ignoreCastle)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Computes an obstacle-avoiding waypoint path for ground units using A* on the island grid.
	 */
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
		// 1. Direct line check: if unobstructed, move straight to target
		if (
			this.isGroundLineClear(
				startX,
				startY,
				targetX,
				targetY,
				radius,
				ignoreBuildingId,
				ignoreCastle
			)
		) {
			return [{ x: targetX, y: targetY }];
		}

		// 2. Setup A* navigation grid on the island where unit is located
		const onEastIsland = startX >= 3600;
		const minX = onEastIsland ? BRIDGE_SPAN_MAX_X + 40 : 160;
		const maxX = onEastIsland ? ARENA_WIDTH - 160 : BRIDGE_SPAN_MIN_X - 40;
		const minY = 100;
		const maxY = ARENA_HEIGHT - 100;
		const step = 45;

		const cols = Math.floor((maxX - minX) / step) + 1;
		const rows = Math.floor((maxY - minY) / step) + 1;

		const getNodeX = (c: number) => minX + c * step;
		const getNodeY = (r: number) => minY + r * step;

		const clampCol = (c: number) => Math.max(0, Math.min(cols - 1, c));
		const clampRow = (r: number) => Math.max(0, Math.min(rows - 1, r));

		const startCol = clampCol(Math.round((startX - minX) / step));
		const startRow = clampRow(Math.round((startY - minY) / step));
		let endCol = clampCol(Math.round((targetX - minX) / step));
		let endRow = clampRow(Math.round((targetY - minY) / step));

		if (
			this.isPointBlockedForGround(
				getNodeX(endCol),
				getNodeY(endRow),
				radius,
				ignoreBuildingId,
				ignoreCastle
			)
		) {
			let bestDist = Infinity;
			let bestC = endCol;
			let bestR = endRow;
			for (let dc = -4; dc <= 4; dc++) {
				for (let dr = -4; dr <= 4; dr++) {
					const nc = clampCol(endCol + dc);
					const nr = clampRow(endRow + dr);
					const nx = getNodeX(nc);
					const ny = getNodeY(nr);
					if (!this.isPointBlockedForGround(nx, ny, radius, ignoreBuildingId, ignoreCastle)) {
						const d = Math.hypot(targetX - nx, targetY - ny);
						if (d < bestDist) {
							bestDist = d;
							bestC = nc;
							bestR = nr;
						}
					}
				}
			}
			endCol = bestC;
			endRow = bestR;
		}

		const startIndex = startRow * cols + startCol;
		let endIndex = endRow * cols + endCol;

		if (startIndex === endIndex) {
			return [{ x: targetX, y: targetY }];
		}

		const openSet: number[] = [startIndex];
		const cameFrom = new Map<number, number>();
		const gScore = new Map<number, number>();
		const fScore = new Map<number, number>();

		gScore.set(startIndex, 0);
		fScore.set(
			startIndex,
			Math.hypot(getNodeX(endCol) - getNodeX(startCol), getNodeY(endRow) - getNodeY(startRow))
		);

		const DIRS = [
			{ dc: 1, dr: 0, cost: 1.0 },
			{ dc: -1, dr: 0, cost: 1.0 },
			{ dc: 0, dr: 1, cost: 1.0 },
			{ dc: 0, dr: -1, cost: 1.0 },
			{ dc: 1, dr: 1, cost: 1.414 },
			{ dc: -1, dr: 1, cost: 1.414 },
			{ dc: 1, dr: -1, cost: 1.414 },
			{ dc: -1, dr: -1, cost: 1.414 }
		];

		let iterations = 0;
		let foundEnd = false;

		while (openSet.length > 0 && iterations < 500) {
			iterations++;
			let bestIdx = 0;
			let lowestF = fScore.get(openSet[0]) ?? Infinity;
			for (let i = 1; i < openSet.length; i++) {
				const f = fScore.get(openSet[i]) ?? Infinity;
				if (f < lowestF) {
					lowestF = f;
					bestIdx = i;
				}
			}

			const current = openSet.splice(bestIdx, 1)[0];
			if (current === endIndex) {
				foundEnd = true;
				break;
			}

			const currC = current % cols;
			const currR = Math.floor(current / cols);
			const currG = gScore.get(current) ?? Infinity;

			for (const dir of DIRS) {
				const nc = currC + dir.dc;
				const nr = currR + dir.dr;
				if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;

				const nx = getNodeX(nc);
				const ny = getNodeY(nr);
				if (this.isPointBlockedForGround(nx, ny, radius, ignoreBuildingId, ignoreCastle)) continue;

				const neighborIdx = nr * cols + nc;
				const tentG = currG + dir.cost * step;

				if (tentG < (gScore.get(neighborIdx) ?? Infinity)) {
					cameFrom.set(neighborIdx, current);
					gScore.set(neighborIdx, tentG);
					const h = Math.hypot(getNodeX(endCol) - nx, getNodeY(endRow) - ny);
					fScore.set(neighborIdx, tentG + h);
					if (!openSet.includes(neighborIdx)) {
						openSet.push(neighborIdx);
					}
				}
			}
		}

		if (!foundEnd) {
			let closestNode = startIndex;
			let closestDist = Infinity;
			for (const node of cameFrom.keys()) {
				const c = node % cols;
				const r = Math.floor(node / cols);
				const d = Math.hypot(getNodeX(c) - targetX, getNodeY(r) - targetY);
				if (d < closestDist) {
					closestDist = d;
					closestNode = node;
				}
			}
			if (closestNode !== startIndex) {
				endIndex = closestNode;
			} else {
				return [{ x: targetX, y: targetY }];
			}
		}

		const rawPath: { x: number; y: number }[] = [];
		let currNode = endIndex;
		while (currNode !== startIndex) {
			const c = currNode % cols;
			const r = Math.floor(currNode / cols);
			rawPath.push({ x: getNodeX(c), y: getNodeY(r) });
			const prev = cameFrom.get(currNode);
			if (prev === undefined) break;
			currNode = prev;
		}
		rawPath.reverse();

		// Smooth path via raycasting string-pulling
		const smoothed: { x: number; y: number }[] = [];
		let fromX = startX;
		let fromY = startY;
		let i = 0;
		while (i < rawPath.length) {
			let furthest = i;
			for (let j = rawPath.length - 1; j > i; j--) {
				if (
					this.isGroundLineClear(
						fromX,
						fromY,
						rawPath[j].x,
						rawPath[j].y,
						radius,
						ignoreBuildingId,
						ignoreCastle
					)
				) {
					furthest = j;
					break;
				}
			}
			smoothed.push(rawPath[furthest]);
			fromX = rawPath[furthest].x;
			fromY = rawPath[furthest].y;
			i = furthest + 1;
		}

		return smoothed;
	}

	/**
	 * Checks if direct straight line between (x1, y1) and (x2, y2) is free of obstacles for worker.
	 */
	public isWorkerLineClear(
		team: MatchTeam,
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		radius = 16
	): boolean {
		const dist = Math.hypot(x2 - x1, y2 - y1);
		if (dist < 2) return true;
		const steps = Math.ceil(dist / 16);
		for (let s = 1; s <= steps; s++) {
			const t = s / steps;
			const px = x1 + (x2 - x1) * t;
			const py = y1 + (y2 - y1) * t;
			if (this.isPointBlockedForWorker(team, px, py, radius)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Computes an obstacle-avoiding waypoint path for the worker using A* on the base grid.
	 */
	public findWorkerPath(
		team: MatchTeam,
		startX: number,
		startY: number,
		targetX: number,
		targetY: number
	): { x: number; y: number }[] {
		// 1. Direct line check: if straight path is unobstructed, no waypoints needed!
		if (this.isWorkerLineClear(team, startX, startY, targetX, targetY)) {
			return [{ x: targetX, y: targetY }];
		}

		// 2. Setup A* navigation grid across the entire island
		const minX = team === 'west' ? 160 : BRIDGE_SPAN_MAX_X + 40;
		const maxX = team === 'west' ? BRIDGE_SPAN_MIN_X - 40 : ARENA_WIDTH - 160;
		const minY = 100;
		const maxY = ARENA_HEIGHT - 100;
		const step = 40;

		const cols = Math.floor((maxX - minX) / step) + 1;
		const rows = Math.floor((maxY - minY) / step) + 1;

		const getNodeX = (c: number) => minX + c * step;
		const getNodeY = (r: number) => minY + r * step;

		const clampCol = (c: number) => Math.max(0, Math.min(cols - 1, c));
		const clampRow = (r: number) => Math.max(0, Math.min(rows - 1, r));

		const startCol = clampCol(Math.round((startX - minX) / step));
		const startRow = clampRow(Math.round((startY - minY) / step));
		let endCol = clampCol(Math.round((targetX - minX) / step));
		let endRow = clampRow(Math.round((targetY - minY) / step));

		// If end node itself is blocked, find closest walkable node to end
		if (this.isPointBlockedForWorker(team, getNodeX(endCol), getNodeY(endRow))) {
			let bestDist = Infinity;
			let bestC = endCol;
			let bestR = endRow;
			for (let dc = -4; dc <= 4; dc++) {
				for (let dr = -4; dr <= 4; dr++) {
					const nc = clampCol(endCol + dc);
					const nr = clampRow(endRow + dr);
					const nx = getNodeX(nc);
					const ny = getNodeY(nr);
					if (!this.isPointBlockedForWorker(team, nx, ny)) {
						const d = Math.hypot(targetX - nx, targetY - ny);
						if (d < bestDist) {
							bestDist = d;
							bestC = nc;
							bestR = nr;
						}
					}
				}
			}
			endCol = bestC;
			endRow = bestR;
		}

		const startIndex = startRow * cols + startCol;
		let endIndex = endRow * cols + endCol;

		if (startIndex === endIndex) {
			return [{ x: targetX, y: targetY }];
		}

		const openSet: number[] = [startIndex];
		const cameFrom = new Map<number, number>();
		const gScore = new Map<number, number>();
		const fScore = new Map<number, number>();

		gScore.set(startIndex, 0);
		fScore.set(
			startIndex,
			Math.hypot(getNodeX(endCol) - getNodeX(startCol), getNodeY(endRow) - getNodeY(startRow))
		);

		const DIRS = [
			{ dc: 1, dr: 0, cost: 1.0 },
			{ dc: -1, dr: 0, cost: 1.0 },
			{ dc: 0, dr: 1, cost: 1.0 },
			{ dc: 0, dr: -1, cost: 1.0 },
			{ dc: 1, dr: 1, cost: 1.414 },
			{ dc: -1, dr: 1, cost: 1.414 },
			{ dc: 1, dr: -1, cost: 1.414 },
			{ dc: -1, dr: -1, cost: 1.414 }
		];

		let iterations = 0;
		let foundEnd = false;

		while (openSet.length > 0 && iterations < 700) {
			iterations++;
			let bestIdx = 0;
			let lowestF = fScore.get(openSet[0]) ?? Infinity;
			for (let i = 1; i < openSet.length; i++) {
				const f = fScore.get(openSet[i]) ?? Infinity;
				if (f < lowestF) {
					lowestF = f;
					bestIdx = i;
				}
			}

			const current = openSet.splice(bestIdx, 1)[0];
			if (current === endIndex) {
				foundEnd = true;
				break;
			}

			const currC = current % cols;
			const currR = Math.floor(current / cols);
			const currG = gScore.get(current) ?? Infinity;

			for (const dir of DIRS) {
				const nc = currC + dir.dc;
				const nr = currR + dir.dr;
				if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;

				const nx = getNodeX(nc);
				const ny = getNodeY(nr);
				if (this.isPointBlockedForWorker(team, nx, ny)) continue;

				const neighborIdx = nr * cols + nc;
				const tentG = currG + dir.cost * step;

				if (tentG < (gScore.get(neighborIdx) ?? Infinity)) {
					cameFrom.set(neighborIdx, current);
					gScore.set(neighborIdx, tentG);
					const h = Math.hypot(getNodeX(endCol) - nx, getNodeY(endRow) - ny);
					fScore.set(neighborIdx, tentG + h);
					if (!openSet.includes(neighborIdx)) {
						openSet.push(neighborIdx);
					}
				}
			}
		}

		if (!foundEnd) {
			// If destination cannot be reached directly, path to the closest explored node
			let closestNode = startIndex;
			let closestDist = Infinity;
			for (const node of cameFrom.keys()) {
				const c = node % cols;
				const r = Math.floor(node / cols);
				const d = Math.hypot(getNodeX(c) - targetX, getNodeY(r) - targetY);
				if (d < closestDist) {
					closestDist = d;
					closestNode = node;
				}
			}
			if (closestNode !== startIndex) {
				endIndex = closestNode;
			} else {
				return [{ x: targetX, y: targetY }];
			}
		}

		// Reconstruct raw waypoints
		const rawPath: { x: number; y: number }[] = [];
		let currNode = endIndex;
		while (currNode !== startIndex) {
			const c = currNode % cols;
			const r = Math.floor(currNode / cols);
			rawPath.push({ x: getNodeX(c), y: getNodeY(r) });
			const prev = cameFrom.get(currNode);
			if (prev === undefined) break;
			currNode = prev;
		}
		rawPath.reverse();

		// Smooth path via raycasting string-pulling
		const smoothed: { x: number; y: number }[] = [];
		let fromX = startX;
		let fromY = startY;
		let i = 0;
		while (i < rawPath.length) {
			let furthest = i;
			for (let j = rawPath.length - 1; j > i; j--) {
				if (this.isWorkerLineClear(team, fromX, fromY, rawPath[j].x, rawPath[j].y)) {
					furthest = j;
					break;
				}
			}
			smoothed.push(rawPath[furthest]);
			fromX = rawPath[furthest].x;
			fromY = rawPath[furthest].y;
			i = furthest + 1;
		}

		// Append final destination
		smoothed.push({ x: targetX, y: targetY });
		logService.navigation('Worker path calculated', {
			team,
			start: { x: Math.round(startX), y: Math.round(startY) },
			target: { x: Math.round(targetX), y: Math.round(targetY) },
			waypointsCount: smoothed.length
		});
		return smoothed;
	}

	/**
	 * Advances worker position along its waypoint path with dynamic obstacle sliding.
	 */
	public advanceWorkerAlongPath(
		w: WorkerState,
		team: MatchTeam,
		destX: number,
		destY: number,
		dt: number,
		stopDist: number
	): void {
		const totalDist = Math.hypot(destX - w.x, destY - w.y);
		if (totalDist <= stopDist) {
			w.path = [];
			w.stuckTimer = 0;
			return;
		}

		if (!w.path || w.path.length === 0) {
			w.path = this.findWorkerPath(team, w.x, w.y, destX, destY);
		}

		let curTarget = w.path.length > 0 ? w.path[0] : { x: destX, y: destY };
		let dx = curTarget.x - w.x;
		let dy = curTarget.y - w.y;
		let dist = Math.hypot(dx, dy);

		if (dist < 14 && w.path.length > 1) {
			w.path.shift();
			curTarget = w.path[0];
			dx = curTarget.x - w.x;
			dy = curTarget.y - w.y;
			dist = Math.hypot(dx, dy);
		}

		// Track progress and detect if worker is stuck
		const lastX = w.lastMoveX ?? w.x;
		const lastY = w.lastMoveY ?? w.y;
		const stepMoved = Math.hypot(w.x - lastX, w.y - lastY);
		w.lastMoveX = w.x;
		w.lastMoveY = w.y;

		if (stepMoved < 0.5) {
			w.stuckTimer = (w.stuckTimer || 0) + dt;
		} else {
			w.stuckTimer = 0;
		}

		if (w.stuckTimer > 0.8) {
			// Worker hasn't moved for 0.8s despite trying to reach (destX, destY)
			logService.warn('navigation', 'Worker stuck detected, recalculating path', {
				team,
				pos: { x: Math.round(w.x), y: Math.round(w.y) },
				dest: { x: Math.round(destX), y: Math.round(destY) }
			});
			w.path = this.findWorkerPath(team, w.x, w.y, destX, destY);
			if (dist > 0.001) {
				const nudge = this.resolveGroundObstacles(
					w.x + (dx / dist) * 10,
					w.y + (dy / dist) * 10,
					14
				);
				w.x = nudge.x;
				w.y = nudge.y;
			}
			w.stuckTimer = 0;
			return;
		}

		if (dist > 0.5) {
			const moveDist = Math.min(dist, w.speed * dt);
			const nx = w.x + (dx / dist) * moveDist;
			const ny = w.y + (dy / dist) * moveDist;
			const res = this.resolveGroundObstacles(nx, ny, 14);

			// Obstacle avoidance: check if forward progress was blocked by obstacle
			const movedDist = Math.hypot(res.x - w.x, res.y - w.y);
			if (movedDist < moveDist * 0.25) {
				// Sliding along tangent
				const perpX = -dy / dist;
				const perpY = dx / dist;
				const s1 = this.resolveGroundObstacles(w.x + perpX * moveDist, w.y + perpY * moveDist, 14);
				const s2 = this.resolveGroundObstacles(w.x - perpX * moveDist, w.y - perpY * moveDist, 14);
				const d1 = Math.hypot(destX - s1.x, destY - s1.y);
				const d2 = Math.hypot(destX - s2.x, destY - s2.y);

				if (d1 < totalDist && Math.hypot(s1.x - w.x, s1.y - w.y) > moveDist * 0.3) {
					w.x = s1.x;
					w.y = s1.y;
				} else if (d2 < totalDist && Math.hypot(s2.x - w.x, s2.y - w.y) > moveDist * 0.3) {
					w.x = s2.x;
					w.y = s2.y;
				} else {
					// Path is obstructed by newly placed building or terrain, recompute A*
					w.path = this.findWorkerPath(team, w.x, w.y, destX, destY);
				}
			} else {
				w.x = res.x;
				w.y = res.y;
			}
		}
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
			w.buildQueue = []; // Clear queued orders on manual move order
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
					this.sim.buildingSystem.sellBuilding(team, unstarted.instanceId, player);
				}
			}
			let tx = targetX;
			let ty = targetY;
			if (this.isPointBlockedForWorker(team, tx, ty)) {
				const resolved = this.resolveGroundObstacles(tx, ty, 20);
				tx = resolved.x;
				ty = resolved.y;
			}
			w.targetX = tx;
			w.targetY = ty;
			w.isBuilding = false;
			w.targetBuildingId = null;
			w.isRepairing = false;
			w.targetRepairBuildingId = null;
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
		const pad = 16;
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

		// Fallback: resolve ground obstacles from current worker position towards building
		const cx = bldX + bldWidth / 2;
		const cy = bldY + bldHeight / 2;
		const angle = Math.atan2(workerY - cy, workerX - cx);
		const fallbackX = cx + Math.cos(angle) * (bldWidth / 2 + pad);
		const fallbackY = cy + Math.sin(angle) * (bldHeight / 2 + pad);
		return this.resolveGroundObstacles(fallbackX, fallbackY, 14);
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

		const w = (playerInput || this.sim.players[team])?.worker;
		if (w) {
			const spot = this.getBestConstructionSpot(team, w.x, w.y, targetBld.x, targetBld.y);
			w.targetX = spot.x;
			w.targetY = spot.y;
			w.isBuilding = false;
			w.targetBuildingId = buildingInstanceId;
			w.isRepairing = false;
			w.targetRepairBuildingId = null;
			w.path = this.findWorkerPath(team, w.x, w.y, spot.x, spot.y);
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
			w.path = this.findWorkerPath(team, w.x, w.y, spot.x, spot.y);
			this.sim.notifyStateChanged();
			return true;
		}
		return false;
	}

	/**
	 * Updates workers position, obstacle navigation, construction progress, and repairs.
	 */
	public updateWorkers(dt: number): void {
		for (const p of this.sim.allPlayers) {
			const w = p.worker;
			if (!w) continue;
			const team = p.team;

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

				if (distToBld <= 42) {
					// In building construction range from ANY reachable side (Warcraft III style)!
					w.isBuilding = true;
					w.path = [];
					targetBld.buildProgress = (targetBld.buildProgress || 0) + dt;
					const maxProg = targetBld.maxBuildProgress || 3.5;
					targetBld.hp = Math.min(
						targetBld.maxHp,
						Math.round(targetBld.maxHp * (0.15 + 0.85 * (targetBld.buildProgress / maxProg)))
					);

					if (targetBld.buildProgress >= maxProg) {
						targetBld.isUnderConstruction = false;
						targetBld.hp = targetBld.maxHp;
						targetBld.spawnTimer = targetBld.specialType === 'repair' ? 0 : targetBld.spawnCooldown;
						w.isBuilding = false;
						w.targetBuildingId = null;
						p.lumber += 25;
						this.sim.addFloatingText(
							'+Готово! (+25🪵)',
							targetBld.x + CELL_SIZE / 2,
							targetBld.y - 15,
							'#22c55e'
						);
						this.sim.onSoundEffect?.('buildingComplete');
						this.sim.onBuildingComplete?.(targetBld);
						this.processNextQueuedBuilding(team, w, p);
					}
				} else {
					w.isBuilding = false;
					const spot = this.getBestConstructionSpot(team, w.x, w.y, targetBld.x, targetBld.y);
					w.targetX = spot.x;
					w.targetY = spot.y;
					this.advanceWorkerAlongPath(w, team, spot.x, spot.y, dt, 20);
				}
			} else {
				if (w.targetBuildingId) {
					w.targetBuildingId = null;
					w.isBuilding = false;
				}

				if (this.processNextQueuedBuilding(team, w, p)) {
					continue;
				}

				if (w.targetRepairBuildingId) {
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
							// If out of gold, worker cannot continue repairing
							if (p.gold < 1) {
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
							const healAmount = Math.min(repTarget.maxHp - repTarget.hp, 50 * dt);
							repTarget.hp += healAmount;
							p.gold = Math.max(0, p.gold - Math.max(1, Math.round(2 * dt)));
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
					const dist = Math.hypot(w.targetX - w.x, w.targetY - w.y);
					if (dist > 3) {
						this.advanceWorkerAlongPath(w, team, w.targetX, w.targetY, dt, 3);
					}
				}
			}
		}
	}
}
