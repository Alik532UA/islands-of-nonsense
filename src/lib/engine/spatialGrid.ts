import type { Unit, Team, Lane } from './types';

/**
 * High-performance Spatial Hash Grid for 2D entity lookups.
 * Uses integer keys and flat array buckets to eliminate GC churn and string allocations.
 * Allows O(1) query of nearby enemy and ally units instead of O(N^2) loops.
 */
export class SpatialHashGrid {
	private cellSize: number;
	private cells = new Map<number, Unit[]>();

	constructor(cellSize = 80) {
		this.cellSize = cellSize;
	}

	private getKey(x: number, y: number): number {
		const cx = Math.floor(x / this.cellSize) + 1000;
		const cy = Math.floor(y / this.cellSize) + 1000;
		return (cy << 14) | (cx & 0x3fff);
	}

	public clear(): void {
		this.cells.clear();
	}

	public insert(unit: Unit): void {
		const key = this.getKey(unit.x, unit.y);
		let cell = this.cells.get(key);
		if (!cell) {
			cell = [];
			this.cells.set(key, cell);
		}
		cell.push(unit);
	}

	public queryRadius(x: number, y: number, radius: number, filter?: (u: Unit) => boolean): Unit[] {
		const results: Unit[] = [];
		const r2 = radius * radius;

		const minX = Math.floor((x - radius) / this.cellSize) + 1000;
		const maxX = Math.floor((x + radius) / this.cellSize) + 1000;
		const minY = Math.floor((y - radius) / this.cellSize) + 1000;
		const maxY = Math.floor((y + radius) / this.cellSize) + 1000;

		for (let cx = minX; cx <= maxX; cx++) {
			for (let cy = minY; cy <= maxY; cy++) {
				const key = (cy << 14) | (cx & 0x3fff);
				const cell = this.cells.get(key);
				if (!cell) continue;

				for (let i = 0; i < cell.length; i++) {
					const unit = cell[i];
					if (unit.state === 'DYING' || unit.state === 'DEAD') continue;
					const dx = unit.x - x;
					const dy = unit.y - y;
					if (dx * dx + dy * dy <= r2) {
						if (!filter || filter(unit)) {
							results.push(unit);
						}
					}
				}
			}
		}

		return results;
	}

	/**
	 * Finds closest enemy unit in radius.
	 * IMPORTANT: If myLane is provided, units on other lanes are STRICTLY IGNORED!
	 */
	public findClosestEnemy(
		x: number,
		y: number,
		radius: number,
		myTeam: Team,
		myLane?: Lane,
		canHitAir = false
	): Unit | null {
		const candidates = this.queryRadius(x, y, radius, (u) => {
			if (u.team === myTeam) return false;
			if (myLane && u.lane !== myLane) return false; // Strictly separate lanes
			if (u.flying && !canHitAir) return false;
			return true;
		});

		if (candidates.length === 0) return null;

		let closest: Unit | null = null;
		let closestDistSq = Infinity;

		for (let i = 0; i < candidates.length; i++) {
			const u = candidates[i];
			const dx = u.x - x;
			const dy = u.y - y;
			const distSq = dx * dx + dy * dy;
			if (distSq < closestDistSq) {
				closestDistSq = distSq;
				closest = u;
			}
		}

		return closest;
	}
}
