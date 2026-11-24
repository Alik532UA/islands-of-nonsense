import {
	ARENA_HEIGHT,
	ARENA_WIDTH,
	BRIDGE_SPAN_MAX_X,
	BRIDGE_SPAN_MIN_X,
	EAST_CASTLE_X,
	EAST_CASTLE_Y,
	EAST_ISLAND_CENTER_X,
	EAST_ISLAND_CENTER_Y,
	GRID_STEP,
	ISLAND_RADIUS_X,
	ISLAND_RADIUS_Y,
	MID_LANE_Y,
	ROAD_HALF_WIDTH,
	WEST_CASTLE_X,
	WEST_CASTLE_Y,
	WEST_ISLAND_CENTER_X,
	WEST_ISLAND_CENTER_Y,
	type DecorationObstacle,
	type DecorationType
} from './constants';
import type { MatchTeam } from './types';
import { distToRoadNetwork } from './buildingSystem';

/** Maximum inward coastal noise amplitude in TerrainRenderer (44 + 26 + 14 + 8 px) */
export const ISLAND_COAST_NOISE_MARGIN = 92;

/** Castle solid half-extent from SOLID_MAP_OBSTACLES (120px) */
export const CASTLE_FOOTPRINT_HALF = 120;

/** Castle clearance: 2 grid cells (64px) outside castle fortress walls + circular courtyard apron */
export const CASTLE_CELL_MARGIN = 2 * GRID_STEP; // 64px
export const CASTLE_PLAZA_MIN_RADIUS = 280;

/** Minimum center-to-center spacing between adjacent decorations to prevent pathing deadlocks */
export const MIN_DECORATION_GAP = GRID_STEP + 18; // 50px physical gap between outer rims

/** Road physical edge clearance: at least 1 grid cell (32px) + 16px visual curb buffer */
export const ROAD_EDGE_CLEARANCE = GRID_STEP + 16; // 48px outer rim -> road edge (145px min center-to-center for r=22)

export const DECORATION_RADII: Record<DecorationType, number> = {
	mushroom: 16,
	crystal: 18,
	monolith: 22,
	bush: 18,
	brazier: 18
};

export interface DecorationPlacementContext {
	isPointOnIsland: (team: MatchTeam, x: number, y: number, margin?: number) => boolean;
	isPointNearRoad: (x: number, y: number, clearance?: number) => boolean;
}

let seedNonce = 1;

/**
 * Creates a fresh non-deterministic 32-bit seed for per-match randomized decorations.
 */
export function createRandomDecorationSeed(): number {
	seedNonce = (seedNonce + 1) | 0;
	const raw =
		(Date.now() ^ Math.floor(Math.random() * 0xffffffff) ^ Math.imul(seedNonce, 2654435761)) >>> 0;
	return raw === 0 ? 1 : raw;
}

/**
 * Checks if a coordinate stays strictly inside solid green island terrain with at least
 * `1 grid cell (32px) + decoration radius + coastline noise indent (92px)` buffer
 * from every cliff edge, bay, ocean rim, and bridgehead strait.
 */
export function isDecorationSafelyOnLand(
	team: MatchTeam,
	x: number,
	y: number,
	radius: number,
	isPointOnIsland: DecorationPlacementContext['isPointOnIsland']
): boolean {
	const edgeBuffer = ISLAND_COAST_NOISE_MARGIN + GRID_STEP + radius;

	// Outer arena top/bottom/side boundaries
	if (y < 160 + GRID_STEP + radius || y > ARENA_HEIGHT - 160 - GRID_STEP - radius) {
		return false;
	}
	if (
		team === 'west' &&
		(x < 160 + GRID_STEP + radius || x > BRIDGE_SPAN_MIN_X - GRID_STEP - radius)
	) {
		return false;
	}
	if (
		team === 'east' &&
		(x > ARENA_WIDTH - 160 - GRID_STEP - radius || x < BRIDGE_SPAN_MAX_X + GRID_STEP + radius)
	) {
		return false;
	}

	// Engine island polygon check (with 1-cell + radius margin)
	if (!isPointOnIsland(team, x, y, GRID_STEP + radius)) {
		return false;
	}

	// Symmetric inner ellipse check accounting for max procedural shoreline indentation (92px)
	// so decorations never fall into bays between bridges or overhang coastal cliffs.
	const cx = team === 'west' ? WEST_ISLAND_CENTER_X : EAST_ISLAND_CENTER_X;
	const cy = team === 'west' ? WEST_ISLAND_CENTER_Y : EAST_ISLAND_CENTER_Y;
	const safeRx = ISLAND_RADIUS_X - edgeBuffer;
	const safeRy = ISLAND_RADIUS_Y - edgeBuffer;

	return ((x - cx) / safeRx) ** 2 + ((y - cy) / safeRy) ** 2 <= 1.0;
}

/**
 * Checks whether a candidate decoration obeys castle clearance (>= 2 cells from fortress + courtyard apron)
 * and keeps initial worker spawn anchors clear.
 */
export function hasCastleAndSpawnClearance(
	team: MatchTeam,
	x: number,
	y: number,
	radius: number
): boolean {
	const castleX = team === 'west' ? WEST_CASTLE_X : EAST_CASTLE_X;
	const castleY = team === 'west' ? WEST_CASTLE_Y : EAST_CASTLE_Y;

	// 1. Box clearance >= 2 cells (64px) + radius outside 240x240 castle walls
	const minAxisDist = CASTLE_FOOTPRINT_HALF + CASTLE_CELL_MARGIN + radius;
	if (Math.abs(x - castleX) < minAxisDist && Math.abs(y - castleY) < minAxisDist) {
		return false;
	}

	// 2. Circular castle courtyard clearance
	if (Math.hypot(x - castleX, y - castleY) < CASTLE_PLAZA_MIN_RADIUS + radius) {
		return false;
	}

	// 3. Explicit worker spawn points (1v1/2v2/3v3) remain unobstructed
	const workerSpawnX = team === 'west' ? WEST_CASTLE_X + 160 : EAST_CASTLE_X - 160;
	const workerSpawnYs = [castleY, castleY - 80, castleY + 80];
	for (const sy of workerSpawnYs) {
		if (Math.hypot(x - workerSpawnX, y - sy) < GRID_STEP * 2 + radius) {
			return false;
		}
	}

	return true;
}

/**
 * Checks road clearance: must be strictly off all roads/bridges/rear lane corridors
 * with at least 1 grid cell (32px) + curb buffer from road edge to outer decoration radius.
 */
export function hasRoadClearance(
	x: number,
	y: number,
	radius: number,
	isPointNearRoad: DecorationPlacementContext['isPointNearRoad']
): boolean {
	const requiredCenterClearance = Math.max(145, ROAD_HALF_WIDTH + ROAD_EDGE_CLEARANCE + radius);
	if (isPointNearRoad(x, y, requiredCenterClearance)) {
		return false;
	}
	return distToRoadNetwork(x, y) - ROAD_HALF_WIDTH - radius >= GRID_STEP;
}

/**
 * Validates all spatial rules for placing a decoration at (x, y).
 */
export function isValidDecorationPosition(
	team: MatchTeam,
	x: number,
	y: number,
	radius: number,
	existing: readonly DecorationObstacle[],
	ctx: DecorationPlacementContext
): boolean {
	if (!isDecorationSafelyOnLand(team, x, y, radius, ctx.isPointOnIsland)) {
		return false;
	}
	if (!hasCastleAndSpawnClearance(team, x, y, radius)) {
		return false;
	}
	if (!hasRoadClearance(x, y, radius, ctx.isPointNearRoad)) {
		return false;
	}

	for (const d of existing) {
		if (d.team !== team) continue;
		const minDist = d.radius + radius + MIN_DECORATION_GAP;
		if (Math.hypot(d.x - x, d.y - y) < minDist) {
			return false;
		}
	}

	return true;
}

/**
 * Chooses a natural decoration type weighted by local terrain context:
 * - Stone braziers illuminate approaches near roads & plazas
 * - Ancient monoliths stand in wide, quiet meadow clearings
 * - Crystals gravitate toward outer glades & rocky rises
 * - Mushrooms & bushes carpet all fertile meadow areas
 */
function pickEcologicalDecorationType(
	team: MatchTeam,
	x: number,
	y: number,
	existingOnTeam: readonly DecorationObstacle[],
	nextRand: () => number
): DecorationType {
	const cx = team === 'west' ? WEST_ISLAND_CENTER_X : EAST_ISLAND_CENTER_X;
	const cy = team === 'west' ? WEST_ISLAND_CENTER_Y : EAST_ISLAND_CENTER_Y;
	const roadDist = distToRoadNetwork(x, y);
	const radialRatio = Math.hypot((x - cx) / ISLAND_RADIUS_X, (y - cy) / ISLAND_RADIUS_Y);

	let nearestDecor = Infinity;
	let nearestMonolith = Infinity;
	for (const d of existingOnTeam) {
		const dist = Math.hypot(d.x - x, d.y - y);
		if (dist < nearestDecor) nearestDecor = dist;
		if (d.type === 'monolith' && dist < nearestMonolith) nearestMonolith = dist;
	}

	const weights: Array<{ type: DecorationType; w: number }> = [
		{ type: 'bush', w: 32 },
		{ type: 'mushroom', w: 28 },
		{ type: 'crystal', w: radialRatio > 0.55 ? 24 : 14 },
		{
			type: 'brazier',
			w: roadDist <= 260 ? 22 : radialRatio < 0.48 ? 14 : 6
		},
		{
			type: 'monolith',
			w: roadDist >= 210 && nearestDecor >= 120 && nearestMonolith >= 220 ? 15 : 4
		}
	];

	const totalWeight = weights.reduce((sum, item) => sum + item.w, 0);
	let roll = nextRand() * totalWeight;
	for (const item of weights) {
		roll -= item.w;
		if (roll <= 0) return item.type;
	}
	return 'bush';
}

/**
 * Generates randomized, sector-balanced natural decorations for both West and East islands
 * obeying shoreline, castle, road, and inter-obstacle spacing rules.
 */
export function generateDecorations(
	seed: number,
	ctx: DecorationPlacementContext
): DecorationObstacle[] {
	const result: DecorationObstacle[] = [];

	let s = seed >>> 0 || 1;
	const nextRand = () => {
		s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
		return s / 4294967296;
	};

	const teams: MatchTeam[] = ['west', 'east'];
	let decorId = 1;

	// Quadrant angle bands (4 balanced sectors per island) for natural spread
	const sectorBands: ReadonlyArray<readonly [number, number]> = [
		[0, Math.PI * 0.5],
		[Math.PI * 0.5, Math.PI],
		[Math.PI, Math.PI * 1.5],
		[Math.PI * 1.5, Math.PI * 2]
	];

	for (const team of teams) {
		const cx = team === 'west' ? WEST_ISLAND_CENTER_X : EAST_ISLAND_CENTER_X;
		const cy = team === 'west' ? WEST_ISLAND_CENTER_Y : EAST_ISLAND_CENTER_Y;
		const teamDecorations: DecorationObstacle[] = [];

		// Vary target count slightly per game (34..38 per island -> 68..76 total >= 60)
		const targetPerIsland = 34 + Math.floor(nextRand() * 5);
		const perSectorTarget = Math.floor(targetPerIsland / sectorBands.length);

		const tryPlaceCandidate = (angleMin: number, angleMax: number): boolean => {
			const angle = angleMin + nextRand() * (angleMax - angleMin);
			// Area-uniform radial sampling so outer glades get balanced organic density
			const minNorm = 0.24;
			const maxNorm = 0.94;
			const u = nextRand();
			const distNorm = Math.sqrt(minNorm * minNorm + u * (maxNorm * maxNorm - minNorm * minNorm));

			const maxRx = ISLAND_RADIUS_X - (ISLAND_COAST_NOISE_MARGIN + GRID_STEP + 20);
			const maxRy = ISLAND_RADIUS_Y - (ISLAND_COAST_NOISE_MARGIN + GRID_STEP + 20);
			const x = Math.round(cx + Math.cos(angle) * maxRx * distNorm);
			const y = Math.round(cy + Math.sin(angle) * maxRy * distNorm);

			// Also avoid rear lane straight-paths directly behind the castle entrance
			if (
				(team === 'west' && x < WEST_CASTLE_X && Math.abs(y - MID_LANE_Y) < 110) ||
				(team === 'east' && x > EAST_CASTLE_X && Math.abs(y - MID_LANE_Y) < 110)
			) {
				return false;
			}

			const type = pickEcologicalDecorationType(team, x, y, teamDecorations, nextRand);
			const radius = DECORATION_RADII[type];

			if (!isValidDecorationPosition(team, x, y, radius, teamDecorations, ctx)) {
				return false;
			}

			// Extra landmark separation: keep monoliths apart from other monoliths & tight clusters
			if (type === 'monolith') {
				const nearby = teamDecorations.some((d) => Math.hypot(d.x - x, d.y - y) < 105);
				if (nearby) return false;
			}

			const decor: DecorationObstacle = {
				id: `decor_${team}_${decorId++}`,
				x,
				y,
				radius,
				type,
				team,
				variant: Math.floor(nextRand() * 4)
			};
			teamDecorations.push(decor);
			result.push(decor);
			return true;
		};

		// Pass 1: stratified sector fill for balanced N/S & W/E island distribution
		for (const [aMin, aMax] of sectorBands) {
			let sectorPlaced = 0;
			let sectorAttempts = 0;
			while (sectorPlaced < perSectorTarget && sectorAttempts < 140) {
				sectorAttempts++;
				if (tryPlaceCandidate(aMin, aMax)) {
					sectorPlaced++;
				}
			}
		}

		// Pass 2: remainder across any valid glade on the island
		let fallbackAttempts = 0;
		while (teamDecorations.length < targetPerIsland && fallbackAttempts < 400) {
			fallbackAttempts++;
			tryPlaceCandidate(0, Math.PI * 2);
		}
	}

	return result;
}
