export const ARENA_WIDTH = 7200;
export const ARENA_HEIGHT = 2400;

export const TOP_LANE_Y = 660;
export const MID_LANE_Y = 1200;
export const BOTTOM_LANE_Y = 1740;

export const RIVER_CENTER_X = ARENA_WIDTH / 2; // 3600
export const BRIDGE_SPAN_MIN_X = 3060;
export const BRIDGE_SPAN_MAX_X = 4140;
export const BRIDGE_WIDTH = BRIDGE_SPAN_MAX_X - BRIDGE_SPAN_MIN_X; // 1080

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

export const ROAD_WIDTH = 150;
export const ROAD_HALF_WIDTH = ROAD_WIDTH / 2; // 75
export const WEST_ROAD_MERGE_X = 2300;
export const EAST_ROAD_MERGE_X = 4900;

export interface RoadSegment {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

export const HIGHWAY_SEGMENTS: RoadSegment[] = [
	// Top lane: West angled -> Horizontal bridge spanning -> East angled
	{ x1: WEST_CASTLE_X, y1: WEST_CASTLE_Y, x2: WEST_ROAD_MERGE_X, y2: TOP_LANE_Y },
	{ x1: WEST_ROAD_MERGE_X, y1: TOP_LANE_Y, x2: EAST_ROAD_MERGE_X, y2: TOP_LANE_Y },
	{ x1: EAST_ROAD_MERGE_X, y1: TOP_LANE_Y, x2: EAST_CASTLE_X, y2: EAST_CASTLE_Y },

	// Mid lane: West Castle straight to East Castle across Mid Bridge
	{ x1: WEST_CASTLE_X, y1: MID_LANE_Y, x2: EAST_CASTLE_X, y2: MID_LANE_Y },

	// Bottom lane: West angled -> Horizontal bridge spanning -> East angled
	{ x1: WEST_CASTLE_X, y1: WEST_CASTLE_Y, x2: WEST_ROAD_MERGE_X, y2: BOTTOM_LANE_Y },
	{ x1: WEST_ROAD_MERGE_X, y1: BOTTOM_LANE_Y, x2: EAST_ROAD_MERGE_X, y2: BOTTOM_LANE_Y },
	{ x1: EAST_ROAD_MERGE_X, y1: BOTTOM_LANE_Y, x2: EAST_CASTLE_X, y2: EAST_CASTLE_Y }
];

export const WEST_GRID_START_X = 64;
export const WEST_GRID_START_Y = 64;

export const EAST_GRID_START_X = ARENA_WIDTH - 1440;
export const EAST_GRID_START_Y = 64;

export type CoinMode = 'none' | 'normal' | 'crazy';

export const GRID_STEP = 32;
export const CELL_SIZE = 64; // Building footprint: 2x2 grid steps (64x64 px)

export const WORKER_MOVE_SPEED = 170;
export const UNIT_MIN_SPEED = 120;
export const UNIT_MAX_SPEED = 170;
export const UNIT_SPEED_SCALE = 0.5;

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

export const BRIDGE_REPAIR_LUMBER_COST = 50;
export const BOT_BRIDGE_REPAIR_COOLDOWN = 180; // 3 minutes cooldown for bot bridge repairs

export type CastleCannonMode = 'short' | 'long';
export const CASTLE_CANNON_SHORT_RANGE = 500;
export const CASTLE_CANNON_SHORT_COST = 1;
export const CASTLE_CANNON_LONG_RANGE = 1500;
export const CASTLE_CANNON_LONG_COST = 3;
export const CASTLE_CANNON_BASE_COOLDOWN = 2.0;
export const CASTLE_CANNON_UPGRADED_COOLDOWN = 1.0;
export const CASTLE_CANNON_UPGRADE_GOLD = 100;
export const CASTLE_CANNON_UPGRADE_LUMBER = 100;
export const CASTLE_CANNON_BASE_DAMAGE = 85;
export const CASTLE_CANNON_SPLASH_RADIUS = 90;
export const CASTLE_CANNON_FRIENDLY_FIRE_FACTOR = 0.5;
