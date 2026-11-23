import { describe, it, expect } from 'vitest';
import { Simulation } from './simulation';
import { distToRoadNetwork, distToSegment } from './buildingSystem';
import {
	ROAD_HALF_WIDTH,
	GRID_STEP,
	TOP_LANE_Y,
	MID_LANE_Y,
	BOTTOM_LANE_Y,
	WEST_CASTLE_X,
	WEST_CASTLE_Y,
	WEST_ROAD_MERGE_X
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
});
