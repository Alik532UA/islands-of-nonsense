export const ARENA_WIDTH = 7200;
export const ARENA_HEIGHT = 2400;

export const TOP_LANE_Y = 660;
export const MID_LANE_Y = 1200;
export const BOTTOM_LANE_Y = 1740;

export const RIVER_CENTER_X = ARENA_WIDTH / 2; // 3600
export const BRIDGE_SPAN_MIN_X = 3240;
export const BRIDGE_SPAN_MAX_X = 3960;
export const BRIDGE_WIDTH = BRIDGE_SPAN_MAX_X - BRIDGE_SPAN_MIN_X; // 720

// Islands centers & radii (oval-round procedural islands)
export const WEST_ISLAND_CENTER_X = 1600;
export const WEST_ISLAND_CENTER_Y = 1200;
export const EAST_ISLAND_CENTER_X = 5600;
export const EAST_ISLAND_CENTER_Y = 1200;
export const ISLAND_RADIUS_X = 1450;
export const ISLAND_RADIUS_Y = 1050;

// Castles centered in each island
export const WEST_CASTLE_X = 1600;
export const WEST_CASTLE_Y = 1200;
export const EAST_CASTLE_X = 5600;
export const EAST_CASTLE_Y = 1200;

export const WEST_GRID_START_X = 64;
export const WEST_GRID_START_Y = 64;

export const EAST_GRID_START_X = ARENA_WIDTH - 1440;
export const EAST_GRID_START_Y = 64;

export type CoinMode = 'none' | 'normal' | 'crazy';

export const GRID_STEP = 32;
export const CELL_SIZE = 64; // Building footprint: 2x2 grid steps (64x64 px)

export type DecorationType = 'mushroom' | 'crystal' | 'monolith' | 'bush' | 'brazier';

export interface DecorationObstacle {
	id: string;
	x: number;
	y: number;
	radius: number;
	type: DecorationType;
	team: 'west' | 'east';
	variant: number;
}

export interface MapObstacle {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
}

export const SOLID_MAP_OBSTACLES: MapObstacle[] = [
	// West Castle (solid stone fortress centered at 1600, 1200)
	{ minX: 1480, maxX: 1720, minY: 1080, maxY: 1320 },
	// East Castle (solid stone fortress centered at 5600, 1200)
	{ minX: 5480, maxX: 5720, minY: 1080, maxY: 1320 },
	// Arena Upper Perimeter Sea boundary
	{ minX: 0, maxX: ARENA_WIDTH, minY: 0, maxY: 60 },
	// Arena Lower Perimeter Sea boundary
	{ minX: 0, maxX: ARENA_WIDTH, minY: ARENA_HEIGHT - 60, maxY: ARENA_HEIGHT }
];
