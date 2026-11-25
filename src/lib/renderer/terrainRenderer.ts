import type { Graphics } from 'pixi.js';
import {
	ARENA_WIDTH,
	ARENA_HEIGHT,
	TOP_LANE_Y,
	MID_LANE_Y,
	BOTTOM_LANE_Y,
	BRIDGE_SPAN_MIN_X,
	BRIDGE_SPAN_MAX_X,
	WEST_ISLAND_CENTER_X,
	WEST_ISLAND_CENTER_Y,
	EAST_ISLAND_CENTER_X,
	EAST_ISLAND_CENTER_Y,
	ISLAND_RADIUS_X,
	ISLAND_RADIUS_Y,
	WEST_CASTLE_X,
	WEST_CASTLE_Y,
	EAST_CASTLE_X,
	EAST_CASTLE_Y,
	ROAD_WIDTH,
	WEST_ROAD_MERGE_X,
	EAST_ROAD_MERGE_X,
	type DecorationObstacle
} from '../engine/constants';
import { rc as gfxRc, rr, ci, el, pg, ln } from './gfx';

type Pt = { x: number; y: number };

const ROAD_STONE_COLORS = [0x92785c, 0x806950, 0x9c8366, 0x765f47, 0xa48d70];
const rc = (g: Graphics, x: number, y: number, w: number, h: number, fill: number, alpha = 1) =>
	gfxRc(g, x, y, w, h, fill, undefined, alpha);

const hash = (x: number, y: number, s: number) => {
	const v = Math.sin(x * 12.9898 + y * 78.233 + s * 137.5) * 43758.5453;
	return v - Math.floor(v);
};

export class TerrainRenderer {
	/**
	 * Renders dynamic, living ocean water with slow-drifting swells, shimmering sun caustics,
	 * central strait river flow, and animated shoreline surf.
	 */
	public drawDynamicWater(g: Graphics, time: number): void {
		g.clear();
		const padX = 3000;
		const padY = 600;
		const swellDrift = (time * 14) % 200;
		for (let y = -padY + swellDrift; y < ARENA_HEIGHT + padY; y += 200) {
			const bright = Math.floor((y - swellDrift) / 200) % 2 === 0;
			rc(g, -padX, y, ARENA_WIDTH + padX * 2, 100, bright ? 0x013858 : 0x012e4a, 0.5);
		}

		const riverMid = (3120 + 4080) / 2;
		const riverW = 4080 - 3120;
		const riverDrift = (time * 50) % 120;
		for (let ry = -80 + riverDrift; ry < ARENA_HEIGHT + 80; ry += 65) {
			const off = Math.sin(ry * 0.015 + time * 1.2) * 26;
			el(g, riverMid + off, ry, riverW * 0.38, 7, 0x06b6d4, undefined, 0.3);
			el(g, riverMid + off - 10, ry + 2, riverW * 0.22, 3, 0xe0f2fe, undefined, 0.45);
		}

		const t1 = time * 0.4;
		for (const cx of [1000, 2000, 3600, 5200, 6200]) {
			for (const cy of [-200, -80, 2480, 2600]) {
				const wx = Math.sin(cx * 0.005 + cy * 0.007 + t1) * 20;
				const wy = Math.cos(cx * 0.006 - cy * 0.005 + time * 0.6) * 10;
				const alpha = 0.22 + Math.sin(cx * 0.01 + cy * 0.012 + time * 0.8) * 0.08;
				el(g, cx + wx, cy + wy, 65, 6, 0x38bdf8, undefined, alpha);
				el(g, cx + wx - 6, cy + wy - 1, 30, 2.5, 0xe0f2fe, undefined, alpha * 1.4);
			}
		}

		const surfPulse = Math.sin(time * 1.8) * 6;
		this.drawAnimatedShorelineSurf(g, WEST_ISLAND_CENTER_X, WEST_ISLAND_CENTER_Y, 1337, surfPulse);
		this.drawAnimatedShorelineSurf(g, EAST_ISLAND_CENTER_X, EAST_ISLAND_CENTER_Y, 7260, surfPulse);
	}

	private drawAnimatedShorelineSurf(
		g: Graphics,
		cx: number,
		cy: number,
		seed: number,
		pulse: number
	): void {
		const pts: number[] = [];
		for (let i = 0; i < 84; i++) {
			const a = (i / 84) * Math.PI * 2;
			const noise =
				Math.sin(a * 4 + seed) * 42 +
				Math.cos(a * 7 + seed * 1.4) * 25 +
				Math.sin(a * 13 + seed * 0.7) * 12;
			pts.push(
				cx + Math.cos(a) * (ISLAND_RADIUS_X + noise + 18 + pulse),
				cy + Math.sin(a) * (ISLAND_RADIUS_Y + noise + 18 + pulse)
			);
		}
		pg(g, pts, undefined, { color: 0xe0f2fe, width: 4.5, alpha: 0.45 });
	}

	/**
	 * Draws static terrain elements (Islands, Cobblestone Highways, Bridgehead Piers, Bridges, and Decorations).
	 */
	public drawStaticTerrain(
		g: Graphics,
		brokenBridge: 'top' | 'mid' | 'bottom' | null = 'mid',
		seed = 1337,
		decorations?: DecorationObstacle[]
	): void {
		g.clear();
		rc(g, -3000, -2000, ARENA_WIDTH + 6000, ARENA_HEIGHT + 4000, 0x012e4a);
		this.drawBridgeheadPiers(g);
		this.drawProceduralOvalIsland(
			g,
			WEST_ISLAND_CENTER_X,
			WEST_ISLAND_CENTER_Y,
			ISLAND_RADIUS_X,
			ISLAND_RADIUS_Y,
			true,
			seed
		);
		this.drawProceduralOvalIsland(
			g,
			EAST_ISLAND_CENTER_X,
			EAST_ISLAND_CENTER_Y,
			ISLAND_RADIUS_X,
			ISLAND_RADIUS_Y,
			false,
			seed + 5923
		);
		this.drawNaturalRoadNetwork(g);
		this.drawProceduralDecorations(g, seed, decorations);

		const bridgeMinX = BRIDGE_SPAN_MIN_X - 20;
		const bridgeW = BRIDGE_SPAN_MAX_X + 20 - bridgeMinX;
		const centerX = bridgeMinX + bridgeW / 2;
		for (const [lane, ly] of [
			['top', TOP_LANE_Y],
			['mid', MID_LANE_Y],
			['bottom', BOTTOM_LANE_Y]
		] as const) {
			this.drawFantasyBridge(g, centerX, ly, bridgeW, brokenBridge === lane, lane);
		}
	}

	private drawBridgeheadPiers(g: Graphics): void {
		for (const ly of [TOP_LANE_Y, MID_LANE_Y, BOTTOM_LANE_Y]) {
			for (const px of [2970, 4080]) {
				g.beginPath();
				rr(g, px, ly - 88, 150, 176, 12, 0x334155, { color: 0x1e293b, width: 3 });
				rc(g, px, ly - 92, 150, 14, 0x64748b);
				rc(g, px, ly + 78, 150, 14, 0x64748b);
			}
		}
	}

	/**
	 * Draws a lush, organically contoured procedural oval island in Spyro fairytale aesthetic.
	 */
	public drawProceduralOvalIsland(
		g: Graphics,
		cx: number,
		cy: number,
		radiusX: number,
		radiusY: number,
		isWest: boolean,
		seed: number
	): void {
		const numPoints = 200;
		const basePoly: Pt[] = [];
		const lanes = [TOP_LANE_Y, MID_LANE_Y, BOTTOM_LANE_Y];

		for (let i = 0; i < numPoints; i++) {
			const a = (i / numPoints) * Math.PI * 2;
			const cosA = Math.cos(a);
			const sinA = Math.sin(a);
			const noise =
				Math.sin(a * 4 + seed) * 44 +
				Math.cos(a * 7 + seed * 1.4) * 26 +
				Math.sin(a * 13 + seed * 0.7) * 14 +
				Math.cos(a * 23 + seed * 2.1) * 8;
			let px = cx + cosA * (radiusX + noise);
			const py = cy + sinA * (radiusY + noise);

			if ((isWest && cosA > 0) || (!isWest && cosA < 0)) {
				const target = isWest ? 3130 : 4070;
				let reach = isWest ? 0 : Infinity;
				for (const ly of lanes) {
					const distY = Math.abs(py - ly);
					if (distY <= 135) {
						reach = isWest ? Math.max(reach, target) : Math.min(reach, target);
					} else if (distY < 230) {
						const t = (distY - 135) / 95;
						const blend = 1 - t * t * (3 - 2 * t);
						const cand = isWest
							? px + Math.max(0, target - px) * blend
							: px - Math.max(0, px - target) * blend;
						reach = isWest ? Math.max(reach, cand) : Math.min(reach, cand);
					}
				}
				if (isWest ? reach > 0 : reach < Infinity) {
					px = isWest ? Math.max(px, reach) : Math.min(px, reach);
				}
			}
			basePoly.push({ x: px, y: py });
		}

		const flat = (ox = 0, oy = 0) => basePoly.flatMap((p) => [p.x + ox, p.y + oy]);

		pg(g, flat(26, 38), 0x000000, undefined, 0.45);
		pg(g, flat(0, 12), 0x06b6d4, undefined, 0.35);
		pg(g, flat(0, 4), undefined, { color: 0xe0f2fe, width: 6, alpha: 0.85 });
		pg(g, flat(0, 24), 0x5c4033, { color: 0x3e2723, width: 3.5 });

		for (let s = -0.4; s <= 0.4; s += 0.18) {
			const sy = cy + radiusY * 0.85 + s * 80;
			ln(g, [cx - radiusX * 0.6, sy, cx + radiusX * 0.6, sy], 0x785138, 3, 0.6);
		}

		pg(g, flat(0, 10), 0x8d5b4c);
		pg(g, flat(0, 0), 0x275d16, { color: 0x1a420e, width: 5 });

		const inset = basePoly.flatMap((p) => [cx + (p.x - cx) * 0.96, cy + (p.y - cy) * 0.95]);
		pg(g, inset, 0x2d6a1a, undefined, 0.45);

		this.drawOrganicMeadowClearings(g, cx, cy, radiusX, radiusY, isWest, seed);
		this.drawProceduralGrassField(g, cx, cy, radiusX, radiusY, seed);
	}

	private drawOrganicMeadowClearings(
		g: Graphics,
		cx: number,
		cy: number,
		rx: number,
		ry: number,
		isWest: boolean,
		seed: number
	): void {
		const dir = isWest ? 1 : -1;
		const patches = [
			{
				ox: -120 * dir,
				oy: -ry * 0.42,
				px: rx * 0.48,
				py: ry * 0.25,
				color: 0x3b8622,
				pSeed: seed + 1.3
			},
			{
				ox: -100 * dir,
				oy: ry * 0.42,
				px: rx * 0.5,
				py: ry * 0.26,
				color: 0x3b8622,
				pSeed: seed + 4.7
			},
			{
				ox: -rx * 0.42 * dir,
				oy: 0,
				px: rx * 0.3,
				py: ry * 0.44,
				color: 0x34771e,
				pSeed: seed + 8.1
			},
			{
				ox: rx * 0.2 * dir,
				oy: -ry * 0.22,
				px: rx * 0.28,
				py: ry * 0.18,
				color: 0x4ca12d,
				pSeed: seed + 12.4
			},
			{
				ox: rx * 0.22 * dir,
				oy: ry * 0.24,
				px: rx * 0.26,
				py: ry * 0.17,
				color: 0x4ca12d,
				pSeed: seed + 15.9
			}
		];

		for (const p of patches) {
			const pcx = cx + p.ox;
			const pcy = cy + p.oy;
			for (const [scale, alpha] of [
				[1.0, 0.14],
				[0.68, 0.12]
			] as const) {
				const pts: number[] = [];
				for (let i = 0; i < 36; i++) {
					const a = (i / 36) * Math.PI * 2;
					const w =
						1 +
						Math.sin(a * 3 + p.pSeed) * 0.14 +
						Math.cos(a * 5 - p.pSeed * 1.7) * 0.09 +
						Math.sin(a * 8 + p.pSeed * 2.3) * 0.05;
					pts.push(pcx + Math.cos(a) * p.px * scale * w, pcy + Math.sin(a) * p.py * scale * w);
				}
				pg(g, pts, p.color, undefined, alpha);
			}
		}
	}

	private drawProceduralGrassField(
		g: Graphics,
		cx: number,
		cy: number,
		rx: number,
		ry: number,
		seed: number
	): void {
		const step = 28;
		const innerRx = rx - 55;
		const innerRy = ry - 45;

		for (let gx = cx - innerRx; gx <= cx + innerRx; gx += step) {
			for (let gy = cy - innerRy; gy <= cy + innerRy; gy += step) {
				const nx = (gx - cx) / innerRx;
				const ny = (gy - cy) / innerRy;
				if (nx * nx + ny * ny > 0.95 || Math.hypot(gx - cx, gy - cy) < 220) continue;

				const r1 = hash(gx, gy, seed);
				const r2 = hash(gx, gy, seed + 11);
				const r3 = hash(gx, gy, seed + 29);
				const ox = gx + (r1 - 0.5) * (step * 0.85);
				const oy = gy + (r2 - 0.5) * (step * 0.85);
				const bladeH = 5 + r3 * 6;
				const bladeColor = r1 > 0.6 ? 0x5ebd37 : r1 > 0.3 ? 0x469c28 : 0x35771e;

				ln(g, [ox, oy, ox - 3 + r2 * 2, oy - bladeH], bladeColor, 1.5, 0.72);
				ln(g, [ox + 2, oy, ox + 4 - r1 * 2, oy - bladeH * 0.85], bladeColor, 1.4, 0.65);

				if (r3 > 0.75) {
					g.beginPath();
					g.circle(ox - 2, oy - 2, 2.2);
					g.circle(ox + 2, oy - 2, 2.2);
					g.circle(ox, oy - 4.5, 2.2);
					g.fill({ color: 0x2a6b18, alpha: 0.8 });
				}
				if (r2 > 0.87) {
					const col = r1 > 0.72 ? 0xfef08a : r1 > 0.45 ? 0xf8fafc : r1 > 0.22 ? 0x93c5fd : 0xf9a8d4;
					g.beginPath();
					ci(g, ox + 1, oy - bladeH - 1, 1.8, col, undefined, 0.85);
				} else if (r1 > 0.94) {
					el(g, ox + 4, oy + 2, 2.4, 1.5, 0x64748b, undefined, 0.45);
				}
			}
		}
	}

	/**
	 * Draws authentic cobblestone roadways fanning out from the centered castles.
	 */
	public drawNaturalRoadNetwork(g: Graphics): void {
		this.drawIslandRoadFanned(g, WEST_CASTLE_X, WEST_CASTLE_Y, BRIDGE_SPAN_MIN_X, ROAD_WIDTH, true);
		this.drawIslandRoadFanned(
			g,
			EAST_CASTLE_X,
			EAST_CASTLE_Y,
			BRIDGE_SPAN_MAX_X,
			ROAD_WIDTH,
			false
		);
		this.drawCastlePlaza(g, WEST_CASTLE_X, WEST_CASTLE_Y);
		this.drawCastlePlaza(g, EAST_CASTLE_X, EAST_CASTLE_Y);
	}

	private drawCastlePlaza(g: Graphics, cx: number, cy: number): void {
		ci(g, cx, cy, 230, 0x7a6348, { color: 0x3f3224, width: 3.5 });
		for (let i = 0; i < 24; i++) {
			const ang = (i / 24) * Math.PI * 2;
			ln(
				g,
				[
					cx + Math.cos(ang) * 212,
					cy + Math.sin(ang) * 212,
					cx + Math.cos(ang) * 230,
					cy + Math.sin(ang) * 230
				],
				0x4a3b2c,
				2,
				0.7
			);
		}
		ci(g, cx, cy, 212, 0x9c866d, { color: 0x52402e, width: 2 });

		const ringRadii = [88, 118, 148, 178, 212];
		for (let ri = 0; ri < ringRadii.length - 1; ri++) {
			const rInner = ringRadii[ri];
			const rOuter = ringRadii[ri + 1];
			const segments = 16 + ri * 4;
			const offset = (ri % 2) * (Math.PI / segments);

			for (let si = 0; si < segments; si++) {
				const a1 = (si / segments) * Math.PI * 2 + offset;
				const a2 = ((si + 1) / segments) * Math.PI * 2 + offset;
				if ((si + ri) % 3 === 0) {
					const midR = (rInner + rOuter) / 2;
					const midA = (a1 + a2) / 2;
					pg(
						g,
						[
							cx + Math.cos(a1) * (rInner + 2),
							cy + Math.sin(a1) * (rInner + 2),
							cx + Math.cos(a2) * (rInner + 2),
							cy + Math.sin(a2) * (rInner + 2),
							cx + Math.cos(a2) * (rOuter - 2),
							cy + Math.sin(a2) * (rOuter - 2),
							cx + Math.cos(a1) * (rOuter - 2),
							cy + Math.sin(a1) * (rOuter - 2)
						],
						(si + ri) % 2 === 0 ? 0x8d775e : 0xab967c,
						undefined,
						0.55
					);
					ci(
						g,
						cx + Math.cos(midA) * midR,
						cy + Math.sin(midA) * midR,
						2,
						0xb8a38a,
						undefined,
						0.25
					);
				}
				ln(
					g,
					[
						cx + Math.cos(a1) * rInner,
						cy + Math.sin(a1) * rInner,
						cx + Math.cos(a1) * rOuter,
						cy + Math.sin(a1) * rOuter
					],
					0x544332,
					1.5,
					0.55
				);
			}
			ci(g, cx, cy, rInner, undefined, { color: 0x4d3d2d, width: 2, alpha: 0.6 });
		}

		for (let i = 0; i < 4; i++) {
			const ang = (i * Math.PI) / 2 + Math.PI / 4;
			const bx = cx + Math.cos(ang) * 194;
			const by = cy + Math.sin(ang) * 194;
			ci(g, bx, by, 10, 0x475569, { color: 0x1e293b, width: 2 });
			ci(g, bx, by, 4.5, 0xf59e0b);
		}
	}

	private drawIslandRoadFanned(
		g: Graphics,
		cx: number,
		cy: number,
		bridgeEdgeX: number,
		roadH: number,
		isWest: boolean
	): void {
		const dir = isWest ? 1 : -1;
		const plazaStartDist = 160;
		const mergeX = isWest ? WEST_ROAD_MERGE_X : EAST_ROAD_MERGE_X;
		const ordered = (pts: Pt[]) => (isWest ? pts : [...pts].reverse());

		this.drawRoadBranch(
			g,
			ordered([
				{ x: cx + dir * plazaStartDist, y: MID_LANE_Y },
				{ x: bridgeEdgeX, y: MID_LANE_Y }
			]),
			roadH,
			101
		);

		for (const [laneY, seed] of [
			[TOP_LANE_Y, 201],
			[BOTTOM_LANE_Y, 301]
		] as const) {
			const ang = Math.atan2(laneY - cy, mergeX - cx);
			this.drawRoadBranch(
				g,
				ordered([
					{ x: cx + Math.cos(ang) * plazaStartDist, y: cy + Math.sin(ang) * plazaStartDist },
					{ x: mergeX, y: laneY },
					{ x: bridgeEdgeX, y: laneY }
				]),
				roadH,
				seed
			);
		}
	}

	private drawRoadBranch(
		g: Graphics,
		points: ReadonlyArray<Pt>,
		roadH: number,
		seed: number
	): void {
		if (points.length < 2) return;
		const halfH = roadH / 2;

		for (const [rad, col] of [
			[halfH + 2.5, 0x3b2f21],
			[halfH, 0x54402d],
			[halfH - 3, 0x8a7153]
		] as const) {
			for (let i = 0; i < points.length - 1; i++) {
				this.drawRoadRibbonQuad(g, points[i], points[i + 1], rad, col);
			}
			for (let i = 1; i < points.length - 1; i++) {
				ci(g, points[i].x, points[i].y, rad, col);
			}
		}

		for (let i = 0; i < points.length - 1; i++) {
			this.drawSegmentPavers(
				g,
				points[i].x,
				points[i].y,
				points[i + 1].x,
				points[i + 1].y,
				roadH,
				seed + i,
				i > 0 ? 22 : 4,
				i < points.length - 2 ? 22 : 4
			);
		}
		for (let i = 1; i < points.length - 1; i++) {
			this.drawElbowJunctionPavers(
				g,
				points[i - 1],
				points[i],
				points[i + 1],
				roadH,
				seed + 50 + i
			);
		}
		this.drawContinuousWheelRuts(g, points, halfH);
	}

	private drawRoadRibbonQuad(g: Graphics, a: Pt, b: Pt, halfW: number, color: number): void {
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const len = Math.hypot(dx, dy);
		if (len < 1) return;
		const nx = (-dy / len) * halfW;
		const ny = (dx / len) * halfW;
		g.beginPath();
		pg(g, [a.x + nx, a.y + ny, b.x + nx, b.y + ny, b.x - nx, b.y - ny, a.x - nx, a.y - ny], color);
	}

	private drawPaverQuad(
		g: Graphics,
		pcx: number,
		pcy: number,
		ux: number,
		uy: number,
		nx: number,
		ny: number,
		hl: number,
		hw: number,
		seed: number
	): void {
		const colIdx =
			Math.floor(Math.abs(Math.sin(pcx * 11.23 + pcy * 19.45 + seed) * 1000)) %
			ROAD_STONE_COLORS.length;
		const p1x = pcx + ux * hl + nx * hw;
		const p1y = pcy + uy * hl + ny * hw;
		const p2x = pcx - ux * hl + nx * hw;
		const p2y = pcy - uy * hl + ny * hw;
		g.beginPath();
		pg(
			g,
			[
				p1x,
				p1y,
				p2x,
				p2y,
				pcx - ux * hl - nx * hw,
				pcy - uy * hl - ny * hw,
				pcx + ux * hl - nx * hw,
				pcy + uy * hl - ny * hw
			],
			ROAD_STONE_COLORS[colIdx]
		);
		ln(g, [p2x, p2y, p1x, p1y], 0xc4ab91, 1, 0.5);
	}

	private drawSegmentPavers(
		g: Graphics,
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		roadH: number,
		seed: number,
		trimStart = 4,
		trimEnd = 4
	): void {
		const dx = x2 - x1;
		const dy = y2 - y1;
		const len = Math.hypot(dx, dy);
		if (len < trimStart + trimEnd + 10) return;
		const ux = dx / len;
		const uy = dy / len;
		const nx = -uy;
		const ny = ux;
		const stoneL = 28;
		const stoneW = 18;
		const numRows = Math.floor((roadH - 12) / stoneW);
		const startV = -roadH / 2 + 6;
		for (let r = 0; r < numRows; r++) {
			const vOff = startV + r * stoneW + stoneW / 2;
			for (let s = trimStart + (r % 2) * 14; s + stoneL <= len - trimEnd; s += stoneL) {
				const uCenter = s + 14;
				this.drawPaverQuad(
					g,
					x1 + ux * uCenter + nx * vOff,
					y1 + uy * uCenter + ny * vOff,
					ux,
					uy,
					nx,
					ny,
					12,
					7.5,
					seed
				);
			}
		}
	}

	private drawElbowJunctionPavers(
		g: Graphics,
		prev: Pt,
		corner: Pt,
		next: Pt,
		roadH: number,
		seed: number
	): void {
		const l1 = Math.hypot(corner.x - prev.x, corner.y - prev.y);
		const l2 = Math.hypot(next.x - corner.x, next.y - corner.y);
		if (l1 < 1 || l2 < 1) return;
		let bx = (corner.x - prev.x) / l1 + (next.x - corner.x) / l2;
		let by = (corner.y - prev.y) / l1 + (next.y - corner.y) / l2;
		const bLen = Math.hypot(bx, by) || 1;
		bx /= bLen;
		by /= bLen;
		const bnx = -by;
		const bny = bx;
		const stoneW = 18;
		const numRows = Math.floor((roadH - 14) / stoneW);
		const startV = -roadH / 2 + 7;
		for (let r = 0; r < numRows; r++) {
			const vOff = startV + r * stoneW + stoneW / 2;
			const stagger = (r % 2) * 10 - 5;
			for (const uOff of [-14 + stagger, 10 + stagger]) {
				this.drawPaverQuad(
					g,
					corner.x + bx * uOff + bnx * vOff,
					corner.y + by * uOff + bny * vOff,
					bx,
					by,
					bnx,
					bny,
					10,
					7.5,
					seed
				);
			}
		}
	}

	private miterOffsetPoint(
		pt: Pt,
		n1: { nx: number; ny: number },
		n2: { nx: number; ny: number },
		dist: number
	): Pt {
		const mx = n1.nx + n2.nx;
		const my = n1.ny + n2.ny;
		const mLen = Math.hypot(mx, my) || 1;
		const uxM = mx / mLen;
		const uyM = my / mLen;
		const scale = Math.min(1.5, 1 / Math.max(0.5, uxM * n2.nx + uyM * n2.ny));
		return { x: pt.x + uxM * dist * scale, y: pt.y + uyM * dist * scale };
	}

	private drawContinuousWheelRuts(g: Graphics, points: ReadonlyArray<Pt>, halfH: number): void {
		const segNormals = [];
		for (let i = 0; i < points.length - 1; i++) {
			const dx = points[i + 1].x - points[i].x;
			const dy = points[i + 1].y - points[i].y;
			const len = Math.hypot(dx, dy) || 1;
			const ux = dx / len;
			const uy = dy / len;
			segNormals.push({ ux, uy, nx: -uy, ny: ux });
		}

		for (const rutFrac of [-0.34, 0.34]) {
			const rutV = halfH * rutFrac;
			const rutW = 3;
			for (let i = 0; i < points.length - 1; i++) {
				const a = points[i];
				const b = points[i + 1];
				const nc = segNormals[i];
				const pA =
					i > 0
						? this.miterOffsetPoint(a, segNormals[i - 1], nc, rutV)
						: { x: a.x + nc.ux * 8 + nc.nx * rutV, y: a.y + nc.uy * 8 + nc.ny * rutV };
				const pB =
					i < points.length - 2
						? this.miterOffsetPoint(b, nc, segNormals[i + 1], rutV)
						: { x: b.x - nc.ux * 8 + nc.nx * rutV, y: b.y - nc.uy * 8 + nc.ny * rutV };
				g.beginPath();
				pg(
					g,
					[
						pA.x + nc.nx * rutW,
						pA.y + nc.ny * rutW,
						pB.x + nc.nx * rutW,
						pB.y + nc.ny * rutW,
						pB.x - nc.nx * rutW,
						pB.y - nc.ny * rutW,
						pA.x - nc.nx * rutW,
						pA.y - nc.ny * rutW
					],
					0x6e563d,
					undefined,
					0.45
				);
			}
		}
	}

	/**
	 * Draws rich, procedurally generated decorative objects matching Spyro fairytale aesthetic.
	 */
	public drawProceduralDecorations(
		g: Graphics,
		baseSeed: number,
		decorations?: DecorationObstacle[]
	): void {
		if (decorations && decorations.length > 0) {
			for (const d of decorations) {
				const rand = () => hash(d.x, d.y, (d.variant || 0) * 0.14036);
				if (d.type === 'mushroom') this.drawMushroomCluster(g, d.x, d.y, rand);
				else if (d.type === 'crystal') this.drawCrystalSpire(g, d.x, d.y, rand);
				else if (d.type === 'monolith') this.drawAncientMonolith(g, d.x, d.y, rand);
				else if (d.type === 'bush') this.drawFloweringBush(g, d.x, d.y, rand);
				else if (d.type === 'brazier') this.drawStoneBrazier(g, d.x, d.y);
			}
		}
		this.drawRimWaterLilies(g, WEST_ISLAND_CENTER_X, WEST_ISLAND_CENTER_Y, baseSeed);
		this.drawRimWaterLilies(g, EAST_ISLAND_CENTER_X, EAST_ISLAND_CENTER_Y, baseSeed + 8191);
	}

	private drawRimWaterLilies(g: Graphics, cx: number, cy: number, seed: number): void {
		let s = seed;
		const nextRand = () => {
			s = (s * 1664525 + 1013904223) % 4294967296;
			return s / 4294967296;
		};
		for (let i = 0; i < 28; i++) {
			const a = (i / 28) * Math.PI * 2;
			this.drawWaterLily(
				g,
				cx + Math.cos(a) * (ISLAND_RADIUS_X + 25 + nextRand() * 40),
				cy + Math.sin(a) * (ISLAND_RADIUS_Y + 25 + nextRand() * 30)
			);
		}
	}

	private drawMushroomCluster(g: Graphics, x: number, y: number, rand: () => number): void {
		el(g, x + 4, y + 6, 17, 7, 0x000000, undefined, 0.32);
		el(g, x - 1, y + 4, 14, 5.5, 0x225419, undefined, 0.9);
		ci(g, x - 8, y + 3, 4, 0x3b8226, undefined, 0.85);
		ci(g, x + 9, y + 3, 3.5, 0x3b8226, undefined, 0.85);

		const palettes = [
			[0xdc2626, 0xf87171, 0x7f1d1d, 0xfef9c3],
			[0xea580c, 0xfb923c, 0x7c2d12, 0xfef08a],
			[0x7c3aed, 0xa78bfa, 0x3b0764, 0xe9d5ff],
			[0x0891b2, 0x22d3ee, 0x164e63, 0xcffafe]
		] as const;
		const [cap, light, rim, spots] = palettes[Math.floor(rand() * palettes.length)];

		const toadstool = (mx: number, my: number, sc: number, lean: number) => {
			const sw = 6 * sc;
			const sh = 12 * sc;
			const cr = 12 * sc;
			rr(g, mx - sw * 0.5 + lean, my - sh, sw, sh + 2, 2.5 * sc, 0xfef3c7, {
				color: 0x78350f,
				width: 1.2 * sc
			});
			rc(g, mx + lean, my - sh, sw * 0.45, sh + 1, 0xd6b98c, 0.7);
			el(g, mx + lean, my - sh + 2 * sc, cr * 0.88, 3.4 * sc, 0x451a03);
			const cx = mx + lean;
			const cy = my - sh + 1.5 * sc;
			g.beginPath();
			g.arc(cx, cy, cr, Math.PI, 0, false);
			g.closePath();
			g.fill({ color: cap });
			g.stroke({ color: rim, width: 1.5 * sc });
			el(g, cx - cr * 0.24, cy - cr * 0.48, cr * 0.44, cr * 0.24, light, undefined, 0.65);
			ci(g, cx - cr * 0.36, cy - cr * 0.42, 2.1 * sc, spots);
			ci(g, cx + cr * 0.28, cy - cr * 0.52, 2.3 * sc, spots);
			ci(g, cx + cr * 0.04, cy - cr * 0.22, 1.5 * sc, spots);
		};
		toadstool(x - 10, y + 3, 0.62, -1.5);
		toadstool(x + 10, y + 4, 0.52, 1.2);
		toadstool(x, y + 2, 1.0, 0);
	}

	private drawCrystalSpire(g: Graphics, x: number, y: number, rand: () => number): void {
		const palettes = [
			[0x38bdf8, 0x06b6d4, 0x155e75, 0xe0f2fe],
			[0xf43f5e, 0xe11d48, 0x881337, 0xffe4e6],
			[0xc084fc, 0x9333ea, 0x581c87, 0xf3e8ff],
			[0x34d399, 0x10b981, 0x064e3b, 0xd1fae5],
			[0xf472b6, 0xdb2777, 0x831843, 0xfce7f3]
		] as const;
		const [lit, mid, dark, glint] = palettes[Math.floor(rand() * palettes.length)];

		el(g, x, y + 3, 22, 11, mid, undefined, 0.16);
		el(g, x + 4, y + 6, 16, 7, 0x000000, undefined, 0.35);
		pg(
			g,
			[x - 15, y + 5, x - 9, y - 3, x + 2, y - 4, x + 14, y + 2, x + 11, y + 9, x - 11, y + 9],
			0x334155,
			{
				color: 0x0f172a,
				width: 1.5
			}
		);

		const shard = (bx: number, by: number, tx: number, ty: number, hw: number) => {
			pg(g, [bx - hw, by, tx, ty, bx, by + 3], lit);
			pg(g, [bx, by + 3, tx, ty, bx + hw, by], dark);
			pg(g, [bx - hw, by, tx, ty, bx + hw, by, bx, by + 4], undefined, {
				color: glint,
				width: 1.1,
				alpha: 0.8
			});
			ln(g, [bx, by + 3, tx, ty], glint, 1.3, 0.9);
		};
		shard(x - 8, y + 3, x - 13, y - 14, 4.5);
		shard(x + 8, y + 3, x + 13, y - 16, 4.5);
		shard(x + 4, y + 5, x + 6, y - 20, 4.2);
		shard(x - 1, y + 5, x - 1, y - 27, 6.2);
		ci(g, x - 1, y - 23, 2, 0xffffff, undefined, 0.95);
	}

	private drawAncientMonolith(g: Graphics, x: number, y: number, rand: () => number): void {
		el(g, x + 6, y + 8, 20, 9, 0x000000, undefined, 0.36);
		if (rand() > 0.55) {
			pg(g, [x - 17, y + 6, x - 14, y - 9, x - 3, y - 13, x + 4, y - 6, x + 2, y + 7], 0x64748b, {
				color: 0x1e293b,
				width: 1.8
			});
			pg(g, [x - 14, y - 9, x - 3, y - 13, x + 3, y - 7, x - 8, y - 5], 0x94a3b8);
			pg(g, [x + 1, y + 7, x + 3, y - 6, x + 13, y - 4, x + 17, y + 6], 0x475569, {
				color: 0x1e293b,
				width: 1.6
			});
			el(g, x - 6, y - 7, 6, 3.2, 0x3b8226, undefined, 0.92);
			el(g, x + 7, y + 2, 5, 2.8, 0x2d6a1a, undefined, 0.9);
			ci(g, x - 16, y + 7, 3, 0x64748b, { color: 0x1e293b, width: 1.2 });
			return;
		}
		el(g, x, y + 5, 16, 6, 0x334155, { color: 0x0f172a, width: 1.5 });
		pg(g, [x - 10, y + 5, x - 8, y - 26, x + 2, y - 31, x + 6, y + 5], 0x64748b, {
			color: 0x1e293b,
			width: 1.8
		});
		pg(g, [x + 2, y - 31, x + 10, y - 24, x + 11, y + 4, x + 6, y + 5], 0x475569, {
			color: 0x1e293b,
			width: 1.6
		});
		pg(g, [x - 8, y - 26, x + 2, y - 31, x + 10, y - 24, x, y - 23], 0x94a3b8);
		ci(g, x - 5, y + 1, 4.5, 0x2f6e1b, undefined, 0.9);
		ci(g, x + 6, y - 6, 3.5, 0x3b8226, undefined, 0.85);
		ci(g, x - 2, y - 15, 6, 0x38bdf8, undefined, 0.22);
		ln(g, [x - 2, y - 21, x - 2, y - 9], 0x38bdf8, 2.2, 0.95);
		ln(g, [x - 6, y - 16, x - 2, y - 20, x + 2, y - 15], 0x38bdf8, 2.2, 0.95);
		ci(g, x - 2, y - 15, 2.2, 0xe0f2fe);
	}

	private drawFloweringBush(g: Graphics, x: number, y: number, rand: () => number): void {
		el(g, x + 4, y + 7, 19, 9, 0x000000, undefined, 0.3);
		rc(g, x - 4, y + 2, 8, 6, 0x5c3a21);
		g.circle(x - 7, y + 2, 11);
		g.circle(x + 8, y + 2, 10.5);
		g.circle(x, y + 4, 12);
		g.fill({ color: 0x164212 });
		g.circle(x - 8, y - 2, 10);
		g.circle(x + 7, y - 2, 9.5);
		g.circle(x, y - 6, 11.5);
		g.fill({ color: 0x2a6e1d });
		g.stroke({ color: 0x14380e, width: 1.5 });
		g.circle(x - 5, y - 6, 8);
		g.circle(x + 4, y - 5, 7.2);
		g.fill({ color: 0x429b29 });
		ci(g, x - 3, y - 9, 5.2, 0x62c23c, undefined, 0.85);

		const bCol = [0xf472b6, 0xfde047, 0x93c5fd, 0xfb7185][Math.floor(rand() * 4)];
		for (const [fx, fy] of [
			[x - 7, y - 5],
			[x + 5, y - 4],
			[x - 1, y + 1]
		]) {
			g.circle(fx - 1.5, fy, 2.2);
			g.circle(fx + 1.5, fy, 2.2);
			g.circle(fx, fy - 1.8, 2.2);
			g.fill({ color: bCol });
			ci(g, fx, fy - 0.3, 1.3, 0xfef08a);
		}
	}

	private drawStoneBrazier(g: Graphics, x: number, y: number): void {
		el(g, x, y - 2, 22, 11, 0xf59e0b, undefined, 0.16);
		el(g, x + 4, y + 6, 13, 5.5, 0x000000, undefined, 0.35);
		rr(g, x - 10, y + 1, 20, 6, 2, 0x334155, { color: 0x0f172a, width: 1.5 });
		rr(g, x - 6, y - 11, 12, 14, 2, 0x64748b, { color: 0x1e293b, width: 1.5 });
		pg(g, [x - 11, y - 16, x + 11, y - 16, x + 7, y - 9, x - 7, y - 9], 0x475569, {
			color: 0x1e293b,
			width: 1.5
		});
		rc(g, x - 12, y - 17, 24, 3, 0x94a3b8);
		el(g, x, y - 17, 7, 2.5, 0xb91c1c);
		pg(g, [x - 6, y - 17, x - 2, y - 28, x + 1, y - 23, x + 4, y - 30, x + 6, y - 17], 0xf97316);
		pg(g, [x - 3.5, y - 17, x, y - 26, x + 3.5, y - 17], 0xfacc15);
		ci(g, x, y - 19, 2.2, 0xfef9c3);
	}

	private drawWaterLily(g: Graphics, x: number, y: number): void {
		el(g, x + 2, y + 2, 12, 7.5, 0x38bdf8, undefined, 0.18);
		pg(
			g,
			[
				x,
				y,
				x + 10,
				y - 2,
				x + 8,
				y - 6,
				x,
				y - 7.5,
				x - 9,
				y - 4,
				x - 10,
				y + 2,
				x - 4,
				y + 6,
				x + 7,
				y + 5,
				x + 10,
				y + 2
			],
			{ color: 0x15803d, alpha: 0.92 },
			{ color: 0x14532d, width: 1.2 }
		);
		g.circle(x - 2, y - 2, 3);
		g.circle(x + 2, y - 2, 3);
		g.circle(x, y - 4.5, 3);
		g.fill({ color: 0xf472b6 });
		ci(g, x, y - 2.5, 1.8, 0xfef08a);
	}

	private drawBridgeSpan(
		g: Graphics,
		startX: number,
		spanW: number,
		topY: number,
		bridgeH: number,
		breakSide: 'none' | 'right' | 'left'
	): void {
		rr(g, startX + 14, topY + 22, spanW, bridgeH, breakSide === 'none' ? 14 : 8, {
			color: 0x000000,
			alpha: 0.46
		});
		rr(g, startX, topY, spanW, bridgeH, breakSide === 'none' ? 12 : 6, 0x78350f, {
			color: 0x451a03,
			width: 3
		});

		for (let bx = startX + 18, i = 0; bx < startX + spanW - 8; bx += 24, i++) {
			if (i % 3 === 0) rc(g, bx - 16, topY + 6, 16, bridgeH - 12, 0x6b2e0d, 0.45);
			ln(g, [bx, topY + 8, bx, topY + bridgeH - 8], 0x451a03, 2.5);
		}
		rc(g, startX, topY + 10, spanW, 4, 0x334155);
		rc(g, startX, topY + bridgeH - 14, spanW, 4, 0x334155);

		const pLeft = breakSide === 'left' ? startX + 18 : startX - 12;
		const pRight = breakSide === 'right' ? startX + spanW - 18 : startX + spanW + 12;
		const pW = Math.max(40, pRight - pLeft);
		rr(g, pLeft, topY - 14, pW, 18, 5, 0x94a3b8, { color: 0x334155, width: 2 });
		rr(g, pLeft, topY + bridgeH - 4, pW, 18, 5, 0x64748b, { color: 0x334155, width: 2 });
		for (let px = pLeft + 24; px < pRight - 10; px += 45) {
			ln(g, [px, topY - 14, px, topY + 4], 0x475569, 1.5);
			ln(g, [px, topY + bridgeH - 4, px, topY + bridgeH + 14], 0x334155, 1.5);
		}
	}

	private drawCollapsedBridgeEdge(
		g: Graphics,
		breakX: number,
		topY: number,
		bridgeH: number,
		dir: 1 | -1
	): void {
		const laneY = topY + bridgeH / 2;
		const plankOffsets = [14, 32, 52, 74, 96, 118, 138, 154];
		for (let i = 0; i < plankOffsets.length; i++) {
			const py = topY + plankOffsets[i];
			const jut = 14 + ((i * 19 + 7) % 34);
			const pt = i % 2 === 0 ? 11 : 8;
			const startEdge = breakX - dir * 10;
			const tipX = breakX + dir * jut;
			rc(g, Math.min(startEdge, tipX) + 6, py + 12, Math.abs(tipX - startEdge), pt, 0x000000, 0.35);
			pg(
				g,
				[
					startEdge,
					py - pt / 2,
					tipX,
					py - pt / 2 + (i % 2 === 0 ? 2 : -1),
					tipX - dir * 5,
					py + pt / 2,
					startEdge,
					py + pt / 2
				],
				i % 2 === 0 ? 0x6b2e0d : 0x78350f,
				{ color: 0x451a03, width: 1.5 }
			);
			rc(g, tipX - dir * 5, py - pt / 2 + 2, 4, Math.max(3, pt - 4), 0xd97706, 0.75);
		}

		for (const py of [topY - 14, topY + bridgeH - 4]) {
			const cx = breakX - dir * 20;
			pg(g, [cx, py, cx + dir * 14, py + 3, cx + dir * 6, py + 14, cx, py + 18], 0x64748b, {
				color: 0x334155,
				width: 1.5
			});
		}

		const barX = breakX - dir * 40;
		for (const by of [laneY - 46, laneY + 46]) {
			el(g, barX + 4, by + 6, 14, 18, 0x000000, undefined, 0.32);
			for (const d of [-16, 16]) {
				ln(g, [barX - 10, by + d, barX + 10, by - d], 0x451a03, 7);
				ln(g, [barX - 10, by + d, barX + 10, by - d], 0x92400e, 4);
			}
			ci(g, barX, by, 3.5, 0x94a3b8);
		}
		ln(g, [barX, laneY - 58, barX, laneY + 58], 0x451a03, 6);
		ln(g, [barX, laneY - 58, barX, laneY + 58], 0xb45309, 3.5);
		ci(g, barX, laneY, 7, 0x7f1d1d, { color: 0x451a03, width: 1.5 });
		ci(g, barX, laneY, 4, 0xf97316);
	}

	private drawCollapsedChasmDebris(
		g: Graphics,
		centerX: number,
		laneY: number,
		gapW: number,
		bridgeH: number
	): void {
		rr(g, centerX - gapW * 0.42, laneY - bridgeH * 0.45, gapW * 0.84, bridgeH * 0.9, 18, {
			color: 0x091e32,
			alpha: 0.55
		});
		for (const [rx, ry, rw, rh] of [
			[centerX - 58, laneY - 38, 38, 28],
			[centerX + 52, laneY - 26, 42, 30],
			[centerX - 18, laneY + 34, 46, 32],
			[centerX + 68, laneY + 42, 32, 24],
			[centerX - 78, laneY + 26, 28, 22]
		]) {
			el(g, rx, ry - rh * 0.3, rw * 0.65, rh * 0.45, undefined, {
				color: 0x7dd3fc,
				width: 2.5,
				alpha: 0.4
			});
			el(g, rx + 2, ry + 4, rw * 0.56, rh * 0.5, 0x0f172a, undefined, 0.6);
			pg(
				g,
				[
					rx - rw * 0.48,
					ry,
					rx - rw * 0.2,
					ry - rh * 0.46,
					rx + rw * 0.38,
					ry - rh * 0.36,
					rx + rw * 0.5,
					ry + rh * 0.14,
					rx + rw * 0.12,
					ry + rh * 0.46,
					rx - rw * 0.36,
					ry + rh * 0.36
				],
				0x475569,
				{ color: 0x1e293b, width: 2 }
			);
			pg(
				g,
				[
					rx - rw * 0.2,
					ry - rh * 0.4,
					rx + rw * 0.32,
					ry - rh * 0.3,
					rx + rw * 0.14,
					ry,
					rx - rw * 0.3,
					ry - rh * 0.05
				],
				0x64748b,
				undefined,
				0.85
			);
		}

		for (const [px, py, len, thick, tilt] of [
			[centerX - 10, laneY - 52, 52, 11, 7],
			[centerX + 26, laneY - 6, 46, 10, -6],
			[centerX - 48, laneY + 8, 40, 9, 5],
			[centerX + 12, laneY + 58, 48, 10, -8]
		]) {
			el(g, px, py, len * 0.56, thick * 1.15, undefined, {
				color: 0xbae6fd,
				width: 1.5,
				alpha: 0.35
			});
			const hx = len / 2;
			const hy = thick / 2;
			pg(
				g,
				[
					px - hx,
					py - hy - tilt,
					px + hx,
					py - hy + tilt,
					px + hx,
					py + hy + tilt,
					px - hx,
					py + hy - tilt
				],
				0x78350f,
				{
					color: 0x451a03,
					width: 1.8
				}
			);
		}
	}

	/**
	 * Draws 2.5D fairytale bridge with heavy stone piers, weathered timber decking, and lanterns.
	 */
	public drawFantasyBridge(
		g: Graphics,
		centerX: number,
		laneY: number,
		bridgeW: number,
		isBroken: boolean,
		_bridgeLane: 'top' | 'mid' | 'bottom'
	): void {
		const bridgeH = 170;
		const leftX = centerX - bridgeW / 2;
		const topY = laneY - bridgeH / 2;

		const lanternPair = (lx: number) => {
			for (const ly of [topY - 16, topY + bridgeH + 16]) {
				ci(g, lx, ly, 9, 0xfbbf24);
				ci(g, lx, ly, 5, 0xffffff);
			}
		};

		if (!isBroken) {
			rr(g, centerX - 280, topY + 16, 560, bridgeH + 36, 24, { color: 0x1e293b, alpha: 0.9 });
			this.drawBridgeSpan(g, leftX, bridgeW, topY, bridgeH, 'none');
			for (const lx of [
				leftX + 30,
				leftX + 230,
				centerX - 140,
				centerX + 140,
				leftX + bridgeW - 230,
				leftX + bridgeW - 30
			]) {
				lanternPair(lx);
			}
		} else {
			const stubW = bridgeW * 0.34;
			const gapW = bridgeW - stubW * 2;
			this.drawCollapsedChasmDebris(g, centerX, laneY, gapW, bridgeH);
			this.drawBridgeSpan(g, leftX, stubW, topY, bridgeH, 'right');
			this.drawBridgeSpan(g, leftX + stubW + gapW, stubW, topY, bridgeH, 'left');
			this.drawCollapsedBridgeEdge(g, leftX + stubW, topY, bridgeH, 1);
			this.drawCollapsedBridgeEdge(g, leftX + stubW + gapW, topY, bridgeH, -1);
			for (const lx of [leftX + 30, leftX + 230, leftX + bridgeW - 230, leftX + bridgeW - 30]) {
				lanternPair(lx);
			}
		}
	}
}
