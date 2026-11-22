export const ARENA_WIDTH = 7200;
export const ARENA_HEIGHT = 2400;

export const TOP_LANE_Y = 660;
export const MID_LANE_Y = 1200;
export const BOTTOM_LANE_Y = 1740;

export const RIVER_CENTER_X = ARENA_WIDTH / 2; // 3600
export const BRIDGE_SPAN_MIN_X = 3240;
export const BRIDGE_SPAN_MAX_X = 3960;
export const BRIDGE_WIDTH = BRIDGE_SPAN_MAX_X - BRIDGE_SPAN_MIN_X; // 720

export const WEST_GRID_START_X = 64;
export const WEST_GRID_START_Y = 64;

export const EAST_GRID_START_X = ARENA_WIDTH - 1440;
export const EAST_GRID_START_Y = 64;

export type CoinMode = 'none' | 'normal' | 'crazy';

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
	// Top Cliffs between Top and Mid lanes
	{ minX: 2000, maxX: ARENA_WIDTH - 2000, minY: 800, maxY: 1060 },
	// Bottom Cliffs between Mid and Bottom lanes
	{ minX: 2000, maxX: ARENA_WIDTH - 2000, minY: 1340, maxY: 1600 },
	// Arena Upper Perimeter Sea boundary
	{ minX: 0, maxX: ARENA_WIDTH, minY: 0, maxY: 60 },
	// Arena Lower Perimeter Sea boundary
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
