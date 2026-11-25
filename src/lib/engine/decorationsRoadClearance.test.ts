import { describe, it, expect } from 'vitest';
import { Simulation } from './simulation';
import { distToRoadNetwork, distToSegment } from './buildingSystem';
import {
	CASTLE_CELL_MARGIN,
	CASTLE_FOOTPRINT_HALF,
	CASTLE_PLAZA_MIN_RADIUS,
	MIN_DECORATION_GAP,
	hasCastleAndSpawnClearance,
	isDecorationSafelyOnLand
} from './decorationGenerator';
import {
	ROAD_HALF_WIDTH,
	GRID_STEP,
	TOP_LANE_Y,
	MID_LANE_Y,
	BOTTOM_LANE_Y,
	WEST_CASTLE_X,
	WEST_CASTLE_Y,
	EAST_CASTLE_X,
	EAST_CASTLE_Y
} from './constants';

describe('Decorations and Roads Clearance Invariant', () => {
	it('should calculate distance to segments accurately', () => {
		// Distance to a horizontal segment (100, 100) -> (300, 100)
		expect(distToSegment(200, 100, 100, 100, 300, 100)).toBe(0);
		expect(distToSegment(200, 150, 100, 100, 300, 100)).toBe(50);
		expect(distToSegment(50, 100, 100, 100, 300, 100)).toBe(50);
		expect(distToSegment(350, 100, 100, 100, 300, 100)).toBe(50);
	});

	it('should accurately detect points directly on all highway branches and their 1-tile margins', () => {
		const sim = new Simulation();

		// 1. Point on the West angled top road: from (1600, 1200) to (2300, 660)
		// At x = 1950 (midway), y should be 1200 + 0.5 * (660 - 1200) = 930
		const angledMidX = 1950;
		const angledMidY = 930;
		expect(distToRoadNetwork(angledMidX, angledMidY)).toBeCloseTo(0, 1);
		expect(sim.isPointNearRoad(angledMidX, angledMidY, 145)).toBe(true);

		// Point 20px off road edge (centerline distance = 75 + 20 = 95px < 145px clearance)
		expect(sim.isPointNearRoad(angledMidX, angledMidY + 95, 145)).toBe(true);

		// 2. Point on West horizontal top road: between (2300, 660) and (3060, 660)
		const topHorizX = 2600;
		const topHorizY = TOP_LANE_Y;
		expect(distToRoadNetwork(topHorizX, topHorizY)).toBe(0);
		expect(sim.isPointNearRoad(topHorizX, topHorizY, 145)).toBe(true);

		// 3. Point on Middle Highway: at y = 1200
		const midX = 2100;
		const midY = MID_LANE_Y;
		expect(distToRoadNetwork(midX, midY)).toBe(0);
		expect(sim.isPointNearRoad(midX, midY, 145)).toBe(true);

		// 4. Point on Bottom Angled Road: from (1600, 1200) to (2300, 1740)
		const botAngledX = 1950;
		const botAngledY = 1200 + 0.5 * (BOTTOM_LANE_Y - 1200); // 1470
		expect(distToRoadNetwork(botAngledX, botAngledY)).toBeCloseTo(0, 1);
		expect(sim.isPointNearRoad(botAngledX, botAngledY, 145)).toBe(true);

		// 5. Point in open meadow far from any road (e.g. x = 2000, y = 300)
		const meadowX = 2000;
		const meadowY = 300;
		expect(distToRoadNetwork(meadowX, meadowY)).toBeGreaterThan(200);
		expect(sim.isPointNearRoad(meadowX, meadowY, 145)).toBe(false);
	});

	it('should verify that ALL generated decorations are strictly outside roads with >= 1 tile (32px) clearance', () => {
		const sim = new Simulation();
		expect(sim.decorations.length).toBeGreaterThanOrEqual(60);

		for (const d of sim.decorations) {
			const distToCenter = distToRoadNetwork(d.x, d.y);
			// Decoration center must be at least 145px away from road centerline
			expect(distToCenter).toBeGreaterThanOrEqual(145);

			// Distance from road surface to decoration center
			const distToSurface = distToCenter - ROAD_HALF_WIDTH;
			expect(distToSurface).toBeGreaterThan(0);

			// Physical clearance between road surface and the outer boundary of decoration
			const physicalClearance = distToSurface - d.radius;
			// Must be at least 1 full grid tile (32px) clearance
			expect(physicalClearance).toBeGreaterThanOrEqual(GRID_STEP);

			// isPointNearRoad must confirm it is not near any road
			expect(sim.isPointNearRoad(d.x, d.y, 145)).toBe(false);
		}
	});

	it('should reject building construction on angled and horizontal highway roads', () => {
		const sim = new Simulation();

		// Angled top road at x = 1950, y = 930
		const onAngledRoad = sim.isBoxOnRoad(1950 - 32, 930 - 32, 64, 64);
		expect(onAngledRoad).toBe(true);

		// Horizontal top road at x = 2600, y = TOP_LANE_Y
		const onHorizRoad = sim.isBoxOnRoad(2600 - 32, TOP_LANE_Y - 32, 64, 64);
		expect(onHorizRoad).toBe(true);

		// Mid highway at x = 2100, y = MID_LANE_Y
		const onMidRoad = sim.isBoxOnRoad(2100 - 32, MID_LANE_Y - 32, 64, 64);
		expect(onMidRoad).toBe(true);

		// Valid location in courtyard (x = 864, y = 704)
		const inCourtyard = sim.isBoxOnRoad(864, 704, 64, 64);
		expect(inCourtyard).toBe(false);
	});

	it('generates unique random decorations for each new game unless seed is pinned', () => {
		const simA = new Simulation();
		const simB = new Simulation();

		expect(simA.decorationSeed).not.toBe(simB.decorationSeed);
		const coordsA = simA.decorations.map((d) => `${d.type}:${d.x},${d.y}`);
		const coordsB = simB.decorations.map((d) => `${d.type}:${d.x},${d.y}`);
		expect(coordsA).not.toEqual(coordsB);

		const fixedA = new Simulation({ botDifficulty: 0, startGold: 500, seed: 424242 });
		const fixedB = new Simulation({ botDifficulty: 0, startGold: 500, seed: 424242 });
		expect(fixedA.decorations).toEqual(fixedB.decorations);
	});

	it('enforces land-only, 1-cell island edge margin, 2-cell castle margin, road clearance, and non-overlap across random seeds', () => {
		for (let run = 0; run < 5; run++) {
			const sim = new Simulation();
			const west = sim.decorations.filter((d) => d.team === 'west');
			const east = sim.decorations.filter((d) => d.team === 'east');

			// Balanced presence across both islands and North/South meadows
			expect(west.length).toBeGreaterThanOrEqual(30);
			expect(east.length).toBeGreaterThanOrEqual(30);
			expect(west.some((d) => d.y < MID_LANE_Y)).toBe(true);
			expect(west.some((d) => d.y > MID_LANE_Y)).toBe(true);
			expect(east.some((d) => d.y < MID_LANE_Y)).toBe(true);
			expect(east.some((d) => d.y > MID_LANE_Y)).toBe(true);

			for (const d of sim.decorations) {
				// 1. Strictly on island solid land with >= 1 cell + noise indentation buffer from cliff/water
				expect(
					isDecorationSafelyOnLand(d.team, d.x, d.y, d.radius, (t, px, py, m) =>
						sim.buildingSystem.isPointOnIsland(t, px, py, m)
					)
				).toBe(true);

				// 2. Outside Castle walls + >= 2 cells (64px) + plaza buffer + worker spawn points
				const castleX = d.team === 'west' ? WEST_CASTLE_X : EAST_CASTLE_X;
				const castleY = d.team === 'west' ? WEST_CASTLE_Y : EAST_CASTLE_Y;
				const chebyshevCastleDist = Math.max(Math.abs(d.x - castleX), Math.abs(d.y - castleY));
				expect(chebyshevCastleDist).toBeGreaterThanOrEqual(
					CASTLE_FOOTPRINT_HALF + CASTLE_CELL_MARGIN + d.radius
				);
				expect(Math.hypot(d.x - castleX, d.y - castleY)).toBeGreaterThanOrEqual(
					CASTLE_PLAZA_MIN_RADIUS + d.radius
				);
				expect(hasCastleAndSpawnClearance(d.team, d.x, d.y, d.radius)).toBe(true);

				// 3. Strictly outside roads with >= 1 cell (32px) physical clearance
				expect(distToRoadNetwork(d.x, d.y) - ROAD_HALF_WIDTH - d.radius).toBeGreaterThanOrEqual(
					GRID_STEP
				);
				expect(sim.isPointNearRoad(d.x, d.y, 145)).toBe(false);
			}

			// 4. Inter-decoration non-overlap spacing
			for (const side of [west, east]) {
				for (let i = 0; i < side.length; i++) {
					for (let j = i + 1; j < side.length; j++) {
						const dist = Math.hypot(side[i].x - side[j].x, side[i].y - side[j].y);
						expect(dist).toBeGreaterThanOrEqual(
							side[i].radius + side[j].radius + MIN_DECORATION_GAP
						);
					}
				}
			}
		}
	});

	it('does not retain phantom rear roads behind West or East castles and allows rear decorations', () => {
		const sim = new Simulation();

		// Behind West Castle (x = 900) and East Castle (x = 6300) at all 3 lane heights must NOT be roads
		for (const y of [TOP_LANE_Y, MID_LANE_Y, BOTTOM_LANE_Y]) {
			expect(sim.isPointNearRoad(900, y, 145)).toBe(false);
			expect(sim.isPointNearRoad(6300, y, 145)).toBe(false);
		}

		// Across several seeds, decorations must populate behind both castles (including middle corridor behind castle)
		let foundWestRearMid = false;
		let foundEastRearMid = false;
		let westBehindCount = 0;
		let eastBehindCount = 0;

		for (let seed = 101; seed <= 125; seed++) {
			const seededSim = new Simulation({ botDifficulty: 0, startGold: 500, seed });
			for (const d of seededSim.decorations) {
				if (d.team === 'west' && d.x < WEST_CASTLE_X - 180) {
					westBehindCount++;
					if (Math.abs(d.y - MID_LANE_Y) < 110) foundWestRearMid = true;
				}
				if (d.team === 'east' && d.x > EAST_CASTLE_X + 180) {
					eastBehindCount++;
					if (Math.abs(d.y - MID_LANE_Y) < 110) foundEastRearMid = true;
				}
			}
		}

		expect(westBehindCount).toBeGreaterThan(20);
		expect(eastBehindCount).toBeGreaterThan(20);
		expect(foundWestRearMid).toBe(true);
		expect(foundEastRearMid).toBe(true);
	});
});
