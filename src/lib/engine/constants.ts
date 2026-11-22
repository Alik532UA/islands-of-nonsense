export const ARENA_WIDTH = 7200;
export const ARENA_HEIGHT = 2400;

export const TOP_LANE_Y = 660;
export const BOTTOM_LANE_Y = 1740;

export const WEST_GRID_START_X = 360;
export const WEST_GRID_START_Y = 240;

export const EAST_GRID_START_X = 6240;
export const EAST_GRID_START_Y = 240;

export const GRID_STEP = 32;
export const CELL_SIZE = 64; // Building footprint: 2x2 grid steps (64x64 px)

export interface MapObstacle {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
}

export const SOLID_MAP_OBSTACLES: MapObstacle[] = [
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
