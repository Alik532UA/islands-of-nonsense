import type { Unit, Team, Lane } from './types';

/**
 * Fast Spatial Hash Grid for 2D entity lookups.
 * Allows O(1) query of nearby enemy units instead of O(N^2) double loop.
 */
export class SpatialHashGrid {
	private cellSize: number;
	private cells = new Map<string, Set<Unit>>();

	constructor(cellSize = 80) {
		this.cellSize = cellSize;
	}

	private getKey(x: number, y: number): string {
		const cx = Math.floor(x / this.cellSize);
		const cy = Math.floor(y / this.cellSize);
		return `${cx}:${cy}`;
	}

	public clear(): void {
		this.cells.clear();
	}

	public insert(unit: Unit): void {
		const key = this.getKey(unit.x, unit.y);
		let cell = this.cells.get(key);
		if (!cell) {
			cell = new Set();
			this.cells.set(key, cell);
		}
		cell.add(unit);
	}

	public queryRadius(x: number, y: number, radius: number, filter?: (u: Unit) => boolean): Unit[] {
		const results: Unit[] = [];
		const r2 = radius * radius;

		const minX = Math.floor((x - radius) / this.cellSize);
		const maxX = Math.floor((x + radius) / this.cellSize);
		const minY = Math.floor((y - radius) / this.cellSize);
		const maxY = Math.floor((y + radius) / this.cellSize);

		for (let cx = minX; cx <= maxX; cx++) {
			for (let cy = minY; cy <= maxY; cy++) {
				const key = `${cx}:${cy}`;
				const cell = this.cells.get(key);
				if (!cell) continue;

				for (const unit of cell) {
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

		for (const u of candidates) {
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
