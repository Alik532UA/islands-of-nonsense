import type { Simulation } from './simulation';
import { ARENA_WIDTH, ARENA_HEIGHT, CELL_SIZE } from './simulation';
import type { MatchTeam, WorkerState } from './types';

export const SOLID_MAP_OBSTACLES = [
	// West Castle (solid stone fortress)
	{ minX: 80, maxX: 320, minY: 1060, maxY: 1340 },
	// East Castle (solid stone fortress)
	{ minX: ARENA_WIDTH - 320, maxX: ARENA_WIDTH - 80, minY: 1060, maxY: 1340 },
	// Central Mountain Ridge (dividing Top and Bottom lanes)
	{ minX: 1460, maxX: ARENA_WIDTH - 1460, minY: 1040, maxY: 1360 },
	// Arena Upper Perimeter Wall
	{ minX: 0, maxX: ARENA_WIDTH, minY: 0, maxY: 60 },
	// Arena Lower Perimeter Wall
	{ minX: 0, maxX: ARENA_WIDTH, minY: ARENA_HEIGHT - 60, maxY: ARENA_HEIGHT },
	// West Base Ramparts with open Road Gates (Top gate at 560..760, Bot gate at 1640..1840)
	{ minX: 1440, maxX: 1500, minY: 60, maxY: 560 },
	{ minX: 1440, maxX: 1500, minY: 760, maxY: 1040 },
	{ minX: 1440, maxX: 1500, minY: 1360, maxY: 1640 },
	{ minX: 1440, maxX: 1500, minY: 1840, maxY: ARENA_HEIGHT - 60 },
	// East Base Ramparts with open Road Gates
	{ minX: ARENA_WIDTH - 1500, maxX: ARENA_WIDTH - 1440, minY: 60, maxY: 560 },
	{ minX: ARENA_WIDTH - 1500, maxX: ARENA_WIDTH - 1440, minY: 760, maxY: 1040 },
	{ minX: ARENA_WIDTH - 1500, maxX: ARENA_WIDTH - 1440, minY: 1360, maxY: 1640 },
	{ minX: ARENA_WIDTH - 1500, maxX: ARENA_WIDTH - 1440, minY: 1840, maxY: ARENA_HEIGHT - 60 }
];

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

		return { x: currX, y: currY };
	}

	/**
	 * Checks if a point is impassable for a worker (colliding with buildings or terrain obstacles).
	 */
	public isPointBlockedForWorker(team: MatchTeam, x: number, y: number, radius = 16): boolean {
		// Base territory boundaries
		if (team === 'west') {
			if (x < 180 || x > 1520 || y < 80 || y > ARENA_HEIGHT - 80) return true;
		} else {
			if (x < ARENA_WIDTH - 1520 || x > ARENA_WIDTH - 180 || y < 80 || y > ARENA_HEIGHT - 80)
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

		return false;
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

		// 2. Setup A* navigation grid across the base courtyard
		const minX = team === 'west' ? 160 : ARENA_WIDTH - 1520;
		const maxX = team === 'west' ? 1520 : ARENA_WIDTH - 160;
		const minY = 80;
		const maxY = ARENA_HEIGHT - 80;
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

	public moveWorker(team: MatchTeam, targetX: number, targetY: number): void {
		const w = this.sim.players[team]?.worker;
		if (w) {
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

	public continueConstruction(team: MatchTeam, buildingInstanceId: string): boolean {
		const targetBld = this.sim.buildings.find(
			(b) => b.instanceId === buildingInstanceId && b.team === team
		);
		if (!targetBld || !targetBld.isUnderConstruction) return false;

		const w = this.sim.players[team]?.worker;
		if (w) {
			const isWest = targetBld.team === 'west';
			const exteriorTargetX = isWest ? targetBld.x - 16 : targetBld.x + CELL_SIZE + 16;
			const exteriorTargetY = targetBld.y + CELL_SIZE / 2;
			w.targetX = exteriorTargetX;
			w.targetY = exteriorTargetY;
			w.isBuilding = false;
			w.targetBuildingId = buildingInstanceId;
			w.isRepairing = false;
			w.targetRepairBuildingId = null;
			w.path = this.findWorkerPath(team, w.x, w.y, exteriorTargetX, exteriorTargetY);
			this.sim.notifyStateChanged();
			return true;
		}
		return false;
	}

	public repairBuilding(team: MatchTeam, buildingInstanceId: string): boolean {
		const targetBld =
			this.sim.buildings.find((b) => b.instanceId === buildingInstanceId && b.team === team) ||
			(buildingInstanceId === `castle_${team}` || buildingInstanceId === 'castle'
				? this.sim.castles[team]
				: null);
		if (!targetBld) return false;

		// If building is still under construction, redirect worker to continue construction!
		if ('isUnderConstruction' in targetBld && targetBld.isUnderConstruction) {
			return this.continueConstruction(team, buildingInstanceId);
		}

		const w = this.sim.players[team]?.worker;
		if (w) {
			const tx = targetBld.x + CELL_SIZE / 2;
			const ty = targetBld.y + CELL_SIZE / 2;
			w.targetX = tx;
			w.targetY = ty;
			w.isBuilding = false;
			w.targetBuildingId = null;
			w.isRepairing = true;
			w.targetRepairBuildingId = buildingInstanceId;
			w.path = this.findWorkerPath(team, w.x, w.y, tx, ty);
			this.sim.notifyStateChanged();
			return true;
		}
		return false;
	}

	/**
	 * Updates workers position, obstacle navigation, construction progress, and repairs.
	 */
	public updateWorkers(dt: number): void {
		for (const team of ['west', 'east'] as MatchTeam[]) {
			const w = this.sim.players[team]?.worker;
			if (!w) continue;

			const targetBld = w.targetBuildingId
				? this.sim.buildings.find((b) => b.instanceId === w.targetBuildingId)
				: null;

			if (targetBld && targetBld.isUnderConstruction) {
				const isWest = targetBld.team === 'west';
				// Stand at exterior scaffolding (outside solid building core)
				const exteriorTargetX = isWest ? targetBld.x - 16 : targetBld.x + CELL_SIZE + 16;
				const exteriorTargetY = targetBld.y + CELL_SIZE / 2;
				w.targetX = exteriorTargetX;
				w.targetY = exteriorTargetY;

				const dist = Math.hypot(exteriorTargetX - w.x, exteriorTargetY - w.y);
				if (dist <= 24) {
					// In building construction range!
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
						w.isBuilding = false;
						w.targetBuildingId = null;
						this.sim.addFloatingText(
							'+Готово!',
							targetBld.x + CELL_SIZE / 2,
							targetBld.y - 15,
							'#22c55e'
						);
						this.sim.onSoundEffect?.('sword');
					}
				} else {
					w.isBuilding = false;
					this.advanceWorkerAlongPath(w, team, exteriorTargetX, exteriorTargetY, dt, 20);
				}
			} else {
				if (w.targetBuildingId) {
					w.targetBuildingId = null;
					w.isBuilding = false;
				}

				if (w.targetRepairBuildingId) {
					const repTarget =
						this.sim.buildings.find((b) => b.instanceId === w.targetRepairBuildingId) ||
						(w.targetRepairBuildingId.startsWith('castle') ? this.sim.castles[team] : null);
					if (repTarget && repTarget.hp < repTarget.maxHp) {
						const tx =
							repTarget === this.sim.castles[team] ? repTarget.x : repTarget.x + CELL_SIZE / 2;
						const ty =
							repTarget === this.sim.castles[team] ? repTarget.y : repTarget.y + CELL_SIZE / 2;
						w.targetX = tx;
						w.targetY = ty;
						const dist = Math.hypot(tx - w.x, ty - w.y);
						if (dist <= 85) {
							w.isBuilding = true;
							w.isRepairing = true;
							w.path = [];
							const healAmount = Math.min(repTarget.maxHp - repTarget.hp, 50 * dt);
							repTarget.hp += healAmount;
							if (this.sim.players[team].gold >= 1) {
								this.sim.players[team].gold = Math.max(
									0,
									this.sim.players[team].gold - Math.round(2 * dt)
								);
							}
							if (repTarget.hp >= repTarget.maxHp) {
								w.isRepairing = false;
								w.isBuilding = false;
								w.targetRepairBuildingId = null;
								this.sim.addFloatingText('Відремонтовано!', w.x, w.y - 20, '#10b981');
							}
						} else {
							w.isBuilding = false;
							this.advanceWorkerAlongPath(w, team, tx, ty, dt, 75);
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
