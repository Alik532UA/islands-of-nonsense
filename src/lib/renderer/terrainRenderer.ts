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

export class TerrainRenderer {
	/**
	 * Renders dynamic, living ocean water with slow-drifting swells, shimmering sun caustics,
	 * central strait river flow, and animated shoreline surf.
	 * Highly optimized for 60+ FPS performance without massive offscreen loops.
	 */
	public drawDynamicWater(g: Graphics, time: number): void {
		g.clear();

		// 1. Slow-drifting ambient ocean swells across visible water
		const padX = 3000;
		const padY = 600;
		const swellDrift = (time * 14) % 200;
		for (let y = -padY + swellDrift; y < ARENA_HEIGHT + padY; y += 200) {
			const isBright = Math.floor((y - swellDrift) / 200) % 2 === 0;
			g.rect(-padX, y, ARENA_WIDTH + padX * 2, 100);
			g.fill({ color: isBright ? 0x013858 : 0x012e4a, alpha: 0.5 });
		}

		// 2. Flowing Central Strait River Churn (Southward current between the two islands)
		const riverLeft = 3120;
		const riverRight = 4080;
		const riverW = riverRight - riverLeft;
		const riverDrift = (time * 50) % 120;

		for (let ry = -80 + riverDrift; ry < ARENA_HEIGHT + 80; ry += 65) {
			const streamOffX = Math.sin(ry * 0.015 + time * 1.2) * 26;
			g.ellipse(riverLeft + riverW / 2 + streamOffX, ry, riverW * 0.38, 7);
			g.fill({ color: 0x06b6d4, alpha: 0.3 });

			g.ellipse(riverLeft + riverW / 2 + streamOffX - 10, ry + 2, riverW * 0.22, 3);
			g.fill({ color: 0xe0f2fe, alpha: 0.45 });
		}

		// 3. Shimmering Water Caustics in North and South water channels (lightweight)
		const t1 = time * 0.4;
		const causticsCols = [1000, 2000, 3600, 5200, 6200];
		const causticsRows = [-200, -80, 2480, 2600];
		for (const cx of causticsCols) {
			for (const cy of causticsRows) {
				const waveOffX = Math.sin(cx * 0.005 + cy * 0.007 + t1) * 20;
				const waveOffY = Math.cos(cx * 0.006 - cy * 0.005 + time * 0.6) * 10;
				const alpha = 0.22 + Math.sin(cx * 0.01 + cy * 0.012 + time * 0.8) * 0.08;

				g.ellipse(cx + waveOffX, cy + waveOffY, 65, 6);
				g.fill({ color: 0x38bdf8, alpha });

				g.ellipse(cx + waveOffX - 6, cy + waveOffY - 1, 30, 2.5);
				g.fill({ color: 0xe0f2fe, alpha: alpha * 1.4 });
			}
		}

		// 4. Breathing Shoreline Surf (gentle pulse against West and East islands)
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
		const numPoints = 84;
		const surfPoly: number[] = [];

		for (let i = 0; i < numPoints; i++) {
			const a = (i / numPoints) * Math.PI * 2;
			const cosA = Math.cos(a);
			const sinA = Math.sin(a);

			const noise =
				Math.sin(a * 4 + seed) * 42 +
				Math.cos(a * 7 + seed * 1.4) * 25 +
				Math.sin(a * 13 + seed * 0.7) * 12;

			const px = cx + cosA * (ISLAND_RADIUS_X + noise + 18 + pulse);
			const py = cy + sinA * (ISLAND_RADIUS_Y + noise + 18 + pulse);
			surfPoly.push(px, py);
		}

		g.poly(surfPoly);
		g.stroke({ color: 0xe0f2fe, width: 4.5, alpha: 0.45 });
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

		// =========================================================================
		// 0. ABYSSAL DEEP OCEAN BASE (Static background canvas)
		// =========================================================================
		const oceanPadX = 3000;
		const oceanPadY = 2000;
		g.rect(-oceanPadX, -oceanPadY, ARENA_WIDTH + oceanPadX * 2, ARENA_HEIGHT + oceanPadY * 2);
		g.fill({ color: 0x012e4a });

		// =========================================================================
		// 1. FORTIFIED STONE BRIDGEHEAD PIERS (Anchor bridges to natural coastlines)
		// =========================================================================
		this.drawBridgeheadPiers(g);

		// =========================================================================
		// 2. TWO ORGANIC PROCEDURAL OVAL FANTASY ISLANDS (West & East)
		// =========================================================================
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

		// =========================================================================
		// 3. NATURAL COBBLESTONE ROADWAYS FANNING OUT FROM CASTLE CENTERS
		// =========================================================================
		this.drawNaturalRoadNetwork(g);

		// =========================================================================
		// 4. RICH PROCEDURALLY GENERATED DECORATIVE OBJECTS (Spyro Aesthetic)
		// =========================================================================
		this.drawProceduralDecorations(g, seed, decorations);

		// =========================================================================
		// 5. THREE 2.5D BRIDGES OVER CENTRAL STRAIT (One Broken)
		// =========================================================================
		const bridgeMinX = BRIDGE_SPAN_MIN_X - 20; // 3040
		const bridgeMaxX = BRIDGE_SPAN_MAX_X + 20; // 4160
		const bridgeW = bridgeMaxX - bridgeMinX; // 1120
		const centerX = (bridgeMinX + bridgeMaxX) / 2; // 3600

		// Top Bridge
		this.drawFantasyBridge(g, centerX, TOP_LANE_Y, bridgeW, brokenBridge === 'top', 'top');

		// Middle Bridge
		this.drawFantasyBridge(g, centerX, MID_LANE_Y, bridgeW, brokenBridge === 'mid', 'mid');

		// Bottom Bridge
		this.drawFantasyBridge(g, centerX, BOTTOM_LANE_Y, bridgeW, brokenBridge === 'bottom', 'bottom');
	}

	/**
	 * Draws heavy stone bridgehead abutments that anchor each bridge into the natural rocky shoreline.
	 */
	private drawBridgeheadPiers(g: Graphics): void {
		const lanes = [TOP_LANE_Y, MID_LANE_Y, BOTTOM_LANE_Y];
		for (const ly of lanes) {
			// West landing pier (firmly anchoring west bridgehead at 3060 into green island cape)
			g.beginPath();
			g.roundRect(2970, ly - 88, 150, 176, 12);
			g.fill({ color: 0x334155 });
			g.stroke({ color: 0x1e293b, width: 3 });

			// Balustrade parapets
			g.rect(2970, ly - 92, 150, 14);
			g.fill({ color: 0x64748b });
			g.rect(2970, ly + 78, 150, 14);
			g.fill({ color: 0x64748b });

			// East landing pier (firmly anchoring east bridgehead at 4140 into green island cape)
			g.beginPath();
			g.roundRect(4080, ly - 88, 150, 176, 12);
			g.fill({ color: 0x334155 });
			g.stroke({ color: 0x1e293b, width: 3 });

			// Balustrade parapets
			g.rect(4080, ly - 92, 150, 14);
			g.fill({ color: 0x64748b });
			g.rect(4080, ly + 78, 150, 14);
			g.fill({ color: 0x64748b });
		}
	}

	/**
	 * Draws a lush, organically contoured procedural oval island in Spyro fairytale aesthetic.
	 * The coastline is 100% procedural with multi-octave organic noise all around (including bridge-facing coast).
	 * Surface features high-density procedural meadow grass, rolling volumetric mounds, and clovers.
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
		const basePoly: { x: number; y: number }[] = [];

		for (let i = 0; i < numPoints; i++) {
			const a = (i / numPoints) * Math.PI * 2;
			const cosA = Math.cos(a);
			const sinA = Math.sin(a);

			// Multi-octave sinusoidal procedural noise for craggy/natural coastlines
			const noise =
				Math.sin(a * 4 + seed) * 44 +
				Math.cos(a * 7 + seed * 1.4) * 26 +
				Math.sin(a * 13 + seed * 0.7) * 14 +
				Math.cos(a * 23 + seed * 2.1) * 8;

			let px = cx + cosA * (radiusX + noise);
			const py = cy + sinA * (radiusY + noise);

			// Procedurally extend broad, solid land promontories (capes) at Top, Mid, and Bottom bridgeheads
			// so that dry green land extends solidly 80px under each bridge and piers with zero water gaps!
			const lanes = [TOP_LANE_Y, MID_LANE_Y, BOTTOM_LANE_Y];
			if (isWest && cosA > 0) {
				let maxCapeReach = 0;
				for (const ly of lanes) {
					const distY = Math.abs(py - ly);
					if (distY <= 135) {
						maxCapeReach = Math.max(maxCapeReach, 3130);
					} else if (distY < 230) {
						const t = (distY - 135) / 95;
						const blend = 1 - t * t * (3 - 2 * t);
						maxCapeReach = Math.max(maxCapeReach, px + Math.max(0, 3130 - px) * blend);
					}
				}
				if (maxCapeReach > 0) {
					px = Math.max(px, maxCapeReach);
				}
			} else if (!isWest && cosA < 0) {
				let minCapeReach = Infinity;
				for (const ly of lanes) {
					const distY = Math.abs(py - ly);
					if (distY <= 135) {
						minCapeReach = Math.min(minCapeReach, 4070);
					} else if (distY < 230) {
						const t = (distY - 135) / 95;
						const blend = 1 - t * t * (3 - 2 * t);
						minCapeReach = Math.min(minCapeReach, px - Math.max(0, px - 4070) * blend);
					}
				}
				if (minCapeReach < Infinity) {
					px = Math.min(px, minCapeReach);
				}
			}

			basePoly.push({ x: px, y: py });
		}

		const flatPoly = (poly: { x: number; y: number }[], offX = 0, offY = 0) => {
			const arr: number[] = [];
			for (const p of poly) {
				arr.push(p.x + offX, p.y + offY);
			}
			return arr;
		};

		// 1. 2.5D Drop Shadow cast into ocean
		g.poly(flatPoly(basePoly, 26, 38));
		g.fill({ color: 0x000000, alpha: 0.45 });

		// 2. Shoreline turquoise shallows & foamy white surf
		g.poly(flatPoly(basePoly, 0, 12));
		g.fill({ color: 0x06b6d4, alpha: 0.35 });
		g.poly(flatPoly(basePoly, 0, 4));
		g.stroke({ color: 0xe0f2fe, width: 6, alpha: 0.85 });

		// 3. Lower Cliff Layer (Stratified terracotta & weathered granite rock face)
		g.poly(flatPoly(basePoly, 0, 24));
		g.fill({ color: 0x5c4033 });
		g.stroke({ color: 0x3e2723, width: 3.5 });

		// Rock strata horizontal lines on lower cliff
		for (let s = -0.4; s <= 0.4; s += 0.18) {
			const sy = cy + radiusY * 0.85 + s * 80;
			const sx1 = cx - radiusX * 0.6;
			const sx2 = cx + radiusX * 0.6;
			g.beginPath();
			g.moveTo(sx1, sy);
			g.lineTo(sx2, sy);
			g.stroke({ color: 0x785138, width: 3, alpha: 0.6 });
		}

		// 4. Upper Cliff Bevel (Warm golden sandstone rim)
		g.poly(flatPoly(basePoly, 0, 10));
		g.fill({ color: 0x8d5b4c });

		// 5. Fairytale Meadow Surface (Rich green base landscape)
		g.poly(flatPoly(basePoly, 0, 0));
		g.fill({ color: 0x275d16 });
		g.stroke({ color: 0x1e4a11, width: 3.5 });

		// 6. Rolling Fairytale Meadow Hillocks (Volumetric mounds)
		// Upper Sunny Hillock
		g.ellipse(cx, cy - radiusY * 0.45, radiusX * 0.65, radiusY * 0.32);
		g.fill({ color: 0x3a8222, alpha: 0.55 });
		g.ellipse(cx, cy - radiusY * 0.48, radiusX * 0.45, radiusY * 0.2);
		g.fill({ color: 0x4da32f, alpha: 0.45 });

		// Lower Sunny Hillock
		g.ellipse(cx, cy + radiusY * 0.45, radiusX * 0.68, radiusY * 0.32);
		g.fill({ color: 0x3a8222, alpha: 0.55 });
		g.ellipse(cx, cy + radiusY * 0.48, radiusX * 0.48, radiusY * 0.2);
		g.fill({ color: 0x4da32f, alpha: 0.45 });

		// Perimeter Meadow Ridge
		const ridgeX = isWest ? cx - radiusX * 0.45 : cx + radiusX * 0.45;
		g.ellipse(ridgeX, cy, radiusX * 0.35, radiusY * 0.55);
		g.fill({ color: 0x33741d, alpha: 0.42 });

		// 7. High-Density Procedural Meadow Grass & Clover Texture
		this.drawProceduralGrassField(g, cx, cy, radiusX, radiusY, seed);
	}

	/**
	 * Draws a dense, natural procedural field of grass tufts, clovers, wildflower flecks, and light shading.
	 */
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

		const pseudo = (x: number, y: number, s: number) => {
			const v = Math.sin(x * 12.9898 + y * 78.233 + s * 137.5) * 43758.5453;
			return v - Math.floor(v);
		};

		for (let gx = cx - innerRx; gx <= cx + innerRx; gx += step) {
			for (let gy = cy - innerRy; gy <= cy + innerRy; gy += step) {
				const nx = (gx - cx) / innerRx;
				const ny = (gy - cy) / innerRy;
				if (nx * nx + ny * ny > 0.95) continue;

				// Skip castle plaza center
				if (Math.hypot(gx - cx, gy - cy) < 220) continue;

				const r1 = pseudo(gx, gy, seed);
				const r2 = pseudo(gx, gy, seed + 11);
				const r3 = pseudo(gx, gy, seed + 29);

				const ox = gx + (r1 - 0.5) * (step * 0.85);
				const oy = gy + (r2 - 0.5) * (step * 0.85);

				// 1. Procedural grass tuft blades
				const bladeH = 5 + r3 * 6;
				const bladeColor = r1 > 0.6 ? 0x5ebd37 : r1 > 0.3 ? 0x469c28 : 0x35771e;

				g.beginPath();
				g.moveTo(ox, oy);
				g.lineTo(ox - 3 + r2 * 2, oy - bladeH);
				g.stroke({ color: bladeColor, width: 1.5, alpha: 0.72 });

				g.beginPath();
				g.moveTo(ox + 2, oy);
				g.lineTo(ox + 4 - r1 * 2, oy - bladeH * 0.85);
				g.stroke({ color: bladeColor, width: 1.4, alpha: 0.65 });

				// 2. Occasional 3-leaf clover cluster
				if (r3 > 0.75) {
					g.beginPath();
					g.circle(ox - 2, oy - 2, 2.2);
					g.circle(ox + 2, oy - 2, 2.2);
					g.circle(ox, oy - 4.5, 2.2);
					g.fill({ color: 0x2a6b18, alpha: 0.8 });
				}

				// 3. Occasional wildflower flecks
				if (r2 > 0.88) {
					const flowerColor = r1 > 0.5 ? 0xfef08a : 0xf8fafc;
					g.beginPath();
					g.circle(ox + 1, oy - bladeH - 1, 1.8);
					g.fill({ color: flowerColor, alpha: 0.85 });
				}
			}
		}
	}

	/**
	 * Draws authentic cobblestone roadways fanning out from the centered castles
	 * towards the Top, Mid, and Bottom bridges, with procedural pavers, gravel edges, and worn ruts.
	 */
	public drawNaturalRoadNetwork(g: Graphics): void {
		const roadHeight = ROAD_WIDTH;

		// 1. West Cobblestone Highways (drawn underneath the castle plaza rim)
		this.drawIslandRoadFanned(g, WEST_CASTLE_X, WEST_CASTLE_Y, BRIDGE_SPAN_MIN_X, roadHeight, true);

		// 2. East Cobblestone Highways (drawn underneath the castle plaza rim)
		this.drawIslandRoadFanned(
			g,
			EAST_CASTLE_X,
			EAST_CASTLE_Y,
			BRIDGE_SPAN_MAX_X,
			roadHeight,
			false
		);

		// 3. West Castle Grand Stone Plaza (drawn cleanly on top of road origins)
		this.drawCastlePlaza(g, WEST_CASTLE_X, WEST_CASTLE_Y);

		// 4. East Castle Grand Stone Plaza (drawn cleanly on top of road origins)
		this.drawCastlePlaza(g, EAST_CASTLE_X, EAST_CASTLE_Y);
	}

	private drawCastlePlaza(g: Graphics, cx: number, cy: number): void {
		// Plaza drop shadow
		g.circle(cx + 10, cy + 16, 234);
		g.fill({ color: 0x000000, alpha: 0.44 });

		// Outer carved sandstone curb blocks
		g.circle(cx, cy, 230);
		g.fill({ color: 0x7a6348 });
		g.stroke({ color: 0x3f3224, width: 3.5 });

		// Ashlar radial curb joint lines around outer rim
		for (let i = 0; i < 24; i++) {
			const ang = (i / 24) * Math.PI * 2;
			g.beginPath();
			g.moveTo(cx + Math.cos(ang) * 212, cy + Math.sin(ang) * 212);
			g.lineTo(cx + Math.cos(ang) * 230, cy + Math.sin(ang) * 230);
			g.stroke({ color: 0x4a3b2c, width: 2, alpha: 0.7 });
		}

		// Inner warm stone flagstone pavement
		g.circle(cx, cy, 212);
		g.fill({ color: 0x9c866d });
		g.stroke({ color: 0x52402e, width: 2 });

		// Concentric cobblestone ashlar rings with staggered radial stone joints
		const ringRadii = [88, 118, 148, 178, 212];
		for (let ri = 0; ri < ringRadii.length - 1; ri++) {
			const rInner = ringRadii[ri];
			const rOuter = ringRadii[ri + 1];
			const segments = 16 + ri * 4;
			const offset = (ri % 2) * (Math.PI / segments);

			for (let si = 0; si < segments; si++) {
				const a1 = (si / segments) * Math.PI * 2 + offset;
				const a2 = ((si + 1) / segments) * Math.PI * 2 + offset;
				// Alternate subtle stone tint per flagstone
				if ((si + ri) % 3 === 0) {
					const midR = (rInner + rOuter) / 2;
					const midA = (a1 + a2) / 2;
					g.poly([
						cx + Math.cos(a1) * (rInner + 2),
						cy + Math.sin(a1) * (rInner + 2),
						cx + Math.cos(a2) * (rInner + 2),
						cy + Math.sin(a2) * (rInner + 2),
						cx + Math.cos(a2) * (rOuter - 2),
						cy + Math.sin(a2) * (rOuter - 2),
						cx + Math.cos(a1) * (rOuter - 2),
						cy + Math.sin(a1) * (rOuter - 2)
					]);
					g.fill({
						color: (si + ri) % 2 === 0 ? 0x8d775e : 0xab967c,
						alpha: 0.55
					});
					// Subtle stone highlight center
					g.circle(cx + Math.cos(midA) * midR, cy + Math.sin(midA) * midR, 2);
					g.fill({ color: 0xb8a38a, alpha: 0.25 });
				}

				g.beginPath();
				g.moveTo(cx + Math.cos(a1) * rInner, cy + Math.sin(a1) * rInner);
				g.lineTo(cx + Math.cos(a1) * rOuter, cy + Math.sin(a1) * rOuter);
				g.stroke({ color: 0x544332, width: 1.5, alpha: 0.55 });
			}

			g.circle(cx, cy, rInner);
			g.stroke({ color: 0x4d3d2d, width: 2, alpha: 0.6 });
		}

		// Corner inlaid brass & granite compass points (45°, 135°, 225°, 315°)
		for (let i = 0; i < 4; i++) {
			const ang = (i * Math.PI) / 2 + Math.PI / 4;
			const bx = cx + Math.cos(ang) * 194;
			const by = cy + Math.sin(ang) * 194;
			g.circle(bx, by, 10);
			g.fill({ color: 0x475569 });
			g.stroke({ color: 0x1e293b, width: 2 });
			g.circle(bx, by, 4.5);
			g.fill({ color: 0xf59e0b });
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
		const plazaStartDist = 160; // Start inside plaza circle so edges hide smoothly under rim
		const mergeX = isWest ? WEST_ROAD_MERGE_X : EAST_ROAD_MERGE_X;

		// 1. Middle Highway (Direct horizontal connection to Mid Bridge)
		const midStartX = cx + dir * plazaStartDist;
		if (isWest) {
			this.drawOrientedHighwaySegment(
				g,
				midStartX,
				MID_LANE_Y,
				bridgeEdgeX,
				MID_LANE_Y,
				roadH,
				101
			);
		} else {
			this.drawOrientedHighwaySegment(
				g,
				bridgeEdgeX,
				MID_LANE_Y,
				midStartX,
				MID_LANE_Y,
				roadH,
				101
			);
		}

		// 2. Top Highway (Angled fan-out from castle plaza + horizontal pre-bridge highway)
		const topAngle = Math.atan2(TOP_LANE_Y - cy, mergeX - cx);
		const topStartX = cx + Math.cos(topAngle) * plazaStartDist;
		const topStartY = cy + Math.sin(topAngle) * plazaStartDist;

		// Road elbow junction base
		g.beginPath();
		g.circle(mergeX, TOP_LANE_Y, roadH / 2);
		g.fill({ color: 0x54402d });
		g.beginPath();
		g.circle(mergeX, TOP_LANE_Y, roadH / 2 - 3);
		g.fill({ color: 0x8a7153 });

		if (isWest) {
			this.drawOrientedHighwaySegment(g, topStartX, topStartY, mergeX, TOP_LANE_Y, roadH, 201);
			this.drawOrientedHighwaySegment(g, mergeX, TOP_LANE_Y, bridgeEdgeX, TOP_LANE_Y, roadH, 202);
		} else {
			this.drawOrientedHighwaySegment(g, bridgeEdgeX, TOP_LANE_Y, mergeX, TOP_LANE_Y, roadH, 202);
			this.drawOrientedHighwaySegment(g, mergeX, TOP_LANE_Y, topStartX, topStartY, roadH, 201);
		}

		// 3. Bottom Highway (Angled fan-out from castle plaza + horizontal pre-bridge highway)
		const botAngle = Math.atan2(BOTTOM_LANE_Y - cy, mergeX - cx);
		const botStartX = cx + Math.cos(botAngle) * plazaStartDist;
		const botStartY = cy + Math.sin(botAngle) * plazaStartDist;

		// Road elbow junction base
		g.beginPath();
		g.circle(mergeX, BOTTOM_LANE_Y, roadH / 2);
		g.fill({ color: 0x54402d });
		g.beginPath();
		g.circle(mergeX, BOTTOM_LANE_Y, roadH / 2 - 3);
		g.fill({ color: 0x8a7153 });

		if (isWest) {
			this.drawOrientedHighwaySegment(g, botStartX, botStartY, mergeX, BOTTOM_LANE_Y, roadH, 301);
			this.drawOrientedHighwaySegment(
				g,
				mergeX,
				BOTTOM_LANE_Y,
				bridgeEdgeX,
				BOTTOM_LANE_Y,
				roadH,
				302
			);
		} else {
			this.drawOrientedHighwaySegment(
				g,
				bridgeEdgeX,
				BOTTOM_LANE_Y,
				mergeX,
				BOTTOM_LANE_Y,
				roadH,
				302
			);
			this.drawOrientedHighwaySegment(g, mergeX, BOTTOM_LANE_Y, botStartX, botStartY, roadH, 301);
		}
	}

	/**
	 * Draws a highway segment between two points with authentic interlocking cobblestone pavers,
	 * realistic color variation, top highlights, and worn cart rut tracks.
	 * Used identically for Top, Mid, and Bottom highways so all roadways have 100% unified texture and appearance.
	 */
	private drawOrientedHighwaySegment(
		g: Graphics,
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		roadH: number,
		seed: number
	): void {
		const dx = x2 - x1;
		const dy = y2 - y1;
		const len = Math.hypot(dx, dy);
		if (len < 1) return;

		const ux = dx / len;
		const uy = dy / len;
		const nx = -uy;
		const ny = ux;
		const halfH = roadH / 2;

		// 1. Earth roadbed foundation polygon
		const c1x = x1 + nx * halfH;
		const c1y = y1 + ny * halfH;
		const c2x = x2 + nx * halfH;
		const c2y = y2 + ny * halfH;
		const c3x = x2 - nx * halfH;
		const c3y = y2 - ny * halfH;
		const c4x = x1 - nx * halfH;
		const c4y = y1 - ny * halfH;

		g.beginPath();
		g.poly([c1x, c1y, c2x, c2y, c3x, c3y, c4x, c4y]);
		g.fill({ color: 0x54402d });
		g.stroke({ color: 0x3b2f21, width: 2.5 });

		// 2. Inner warm road surface base
		const inset = 3;
		const iHalfH = halfH - inset;
		const ic1x = x1 + ux * inset + nx * iHalfH;
		const ic1y = y1 + uy * inset + ny * iHalfH;
		const ic2x = x2 - ux * inset + nx * iHalfH;
		const ic2y = y2 - uy * inset + ny * iHalfH;
		const ic3x = x2 - ux * inset - nx * iHalfH;
		const ic3y = y2 - uy * inset - ny * iHalfH;
		const ic4x = x1 + ux * inset - nx * iHalfH;
		const ic4y = y1 + uy * inset - ny * iHalfH;

		g.beginPath();
		g.poly([ic1x, ic1y, ic2x, ic2y, ic3x, ic3y, ic4x, ic4y]);
		g.fill({ color: 0x8a7153 });

		// 3. Interlocking procedural cobblestone pavers
		const stoneL = 28; // along road length
		const stoneW = 18; // across road width
		const stoneColors = [0x92785c, 0x806950, 0x9c8366, 0x765f47, 0xa48d70];

		const numRows = Math.floor((roadH - 12) / stoneW);
		const startV = -halfH + 6;

		const halfStoneL = (stoneL - 4) / 2;
		const halfStoneW = (stoneW - 3) / 2;

		for (let r = 0; r < numRows; r++) {
			const vOffset = startV + r * stoneW + stoneW / 2;
			const rowStagger = (r % 2) * (stoneL / 2);

			for (let s = 4 + rowStagger; s + stoneL <= len - 4; s += stoneL) {
				const uCenter = s + stoneL / 2;
				const pcx = x1 + ux * uCenter + nx * vOffset;
				const pcy = y1 + uy * uCenter + ny * vOffset;

				const pseudo = Math.sin(pcx * 11.23 + pcy * 19.45 + seed) * 1000;
				const colIdx = Math.floor(Math.abs(pseudo)) % stoneColors.length;

				// Paver 4 corners oriented along road
				const p1x = pcx + ux * halfStoneL + nx * halfStoneW;
				const p1y = pcy + uy * halfStoneL + ny * halfStoneW;
				const p2x = pcx - ux * halfStoneL + nx * halfStoneW;
				const p2y = pcy - uy * halfStoneL + ny * halfStoneW;
				const p3x = pcx - ux * halfStoneL - nx * halfStoneW;
				const p3y = pcy - uy * halfStoneL - ny * halfStoneW;
				const p4x = pcx + ux * halfStoneL - nx * halfStoneW;
				const p4y = pcy + uy * halfStoneL - ny * halfStoneW;

				g.beginPath();
				g.poly([p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y]);
				g.fill({ color: stoneColors[colIdx] });

				// Paver top edge highlight
				g.beginPath();
				g.moveTo(p2x, p2y);
				g.lineTo(p1x, p1y);
				g.stroke({ color: 0xc4ab91, width: 1, alpha: 0.5 });
			}
		}

		// 4. Two worn wheel rut lines (cart tracks) along the road
		for (const rutFrac of [-0.34, 0.34]) {
			const rutV = halfH * rutFrac;
			const rutW = 3;
			const r1x = x1 + ux * 8 + nx * (rutV + rutW);
			const r1y = y1 + uy * 8 + ny * (rutV + rutW);
			const r2x = x2 - ux * 8 + nx * (rutV + rutW);
			const r2y = y2 - uy * 8 + ny * (rutV + rutW);
			const r3x = x2 - ux * 8 + nx * (rutV - rutW);
			const r3y = y2 - uy * 8 + ny * (rutV - rutW);
			const r4x = x1 + ux * 8 + nx * (rutV - rutW);
			const r4y = y1 + uy * 8 + ny * (rutV - rutW);

			g.beginPath();
			g.poly([r1x, r1y, r2x, r2y, r3x, r3y, r4x, r4y]);
			g.fill({ color: 0x6e563d, alpha: 0.45 });
		}
	}

	/**
	 * Draws rich, procedurally generated decorative objects matching Spyro fairytale aesthetic:
	 * Ancient mossy stone monoliths, magical gem crystal clusters, fairytale spotted mushroom patches,
	 * flowering bushes, roadside torch posts, and coastal shallows water lilies.
	 */
	public drawProceduralDecorations(
		g: Graphics,
		baseSeed: number,
		decorations?: DecorationObstacle[]
	): void {
		if (decorations && decorations.length > 0) {
			for (const d of decorations) {
				const pseudoRand = () => {
					const val = Math.sin(d.x * 12.9898 + d.y * 78.233 + (d.variant || 0) * 19.3) * 43758.5453;
					return val - Math.floor(val);
				};
				switch (d.type) {
					case 'mushroom':
						this.drawMushroomCluster(g, d.x, d.y, pseudoRand);
						break;
					case 'crystal':
						this.drawCrystalSpire(g, d.x, d.y, pseudoRand);
						break;
					case 'monolith':
						this.drawAncientMonolith(g, d.x, d.y, pseudoRand);
						break;
					case 'bush':
						this.drawFloweringBush(g, d.x, d.y, pseudoRand);
						break;
					case 'brazier':
						this.drawStoneBrazier(g, d.x, d.y, pseudoRand);
						break;
				}
			}
			this.drawRimWaterLilies(g, WEST_ISLAND_CENTER_X, WEST_ISLAND_CENTER_Y, baseSeed);
			this.drawRimWaterLilies(g, EAST_ISLAND_CENTER_X, EAST_ISLAND_CENTER_Y, baseSeed + 8191);
			return;
		}

		// Fallback deterministic generation
		this.generateIslandDecor(g, WEST_ISLAND_CENTER_X, WEST_ISLAND_CENTER_Y, true, baseSeed);
		this.generateIslandDecor(g, EAST_ISLAND_CENTER_X, EAST_ISLAND_CENTER_Y, false, baseSeed + 8191);
	}

	private drawRimWaterLilies(g: Graphics, cx: number, cy: number, seed: number): void {
		let s = seed;
		const nextRand = () => {
			s = (s * 1664525 + 1013904223) % 4294967296;
			return s / 4294967296;
		};
		for (let i = 0; i < 28; i++) {
			const angle = (i / 28) * Math.PI * 2;
			const lx = cx + Math.cos(angle) * (ISLAND_RADIUS_X + 25 + nextRand() * 40);
			const ly = cy + Math.sin(angle) * (ISLAND_RADIUS_Y + 25 + nextRand() * 30);
			this.drawWaterLily(g, lx, ly);
		}
	}

	private generateIslandDecor(
		g: Graphics,
		cx: number,
		cy: number,
		isWest: boolean,
		seed: number
	): void {
		let s = seed;
		const nextRand = () => {
			s = (s * 1664525 + 1013904223) % 4294967296;
			return s / 4294967296;
		};

		const numDecorations = 120;
		for (let i = 0; i < numDecorations; i++) {
			const angle = nextRand() * Math.PI * 2;
			const distNorm = 0.22 + nextRand() * 0.68;
			const rx = (ISLAND_RADIUS_X - 120) * distNorm;
			const ry = (ISLAND_RADIUS_Y - 90) * distNorm;

			const x = cx + Math.cos(angle) * rx;
			const y = cy + Math.sin(angle) * ry;

			// Skip if on roads or castle plaza
			const distToCastle = Math.hypot(x - cx, y - cy);
			if (distToCastle < 240) continue;

			// Skip if too close to highway lines
			if ((isWest && x > cx - 60) || (!isWest && x < cx + 60)) {
				if (
					Math.abs(y - TOP_LANE_Y) < 100 ||
					Math.abs(y - MID_LANE_Y) < 100 ||
					Math.abs(y - BOTTOM_LANE_Y) < 100
				) {
					continue;
				}
			}

			const typeIndex = Math.floor(nextRand() * 5);

			switch (typeIndex) {
				case 0:
					this.drawMushroomCluster(g, x, y, nextRand);
					break;
				case 1:
					this.drawCrystalSpire(g, x, y, nextRand);
					break;
				case 2:
					this.drawAncientMonolith(g, x, y, nextRand);
					break;
				case 3:
					this.drawFloweringBush(g, x, y, nextRand);
					break;
				case 4:
					this.drawStoneBrazier(g, x, y, nextRand);
					break;
			}
		}
		this.drawRimWaterLilies(g, cx, cy, seed);
	}

	private drawMushroomCluster(g: Graphics, x: number, y: number, rand: () => number): void {
		g.ellipse(x + 4, y + 6, 14, 6);
		g.fill({ color: 0x000000, alpha: 0.35 });

		const capColors = [0xef4444, 0xf97316, 0x8b5cf6, 0x06b6d4];
		const capColor = capColors[Math.floor(rand() * capColors.length)];

		g.roundRect(x - 3, y - 8, 6, 12, 2);
		g.fill({ color: 0xfef08a });

		g.beginPath();
		g.arc(x, y - 6, 11, Math.PI, 0, false);
		g.fill({ color: capColor });
		g.stroke({ color: 0x450a0a, width: 1.5 });

		g.circle(x - 4, y - 10, 2);
		g.fill({ color: 0xffffff });
		g.circle(x + 3, y - 11, 2.5);
		g.fill({ color: 0xffffff });
		g.circle(x, y - 7, 1.8);
		g.fill({ color: 0xffffff });
	}

	private drawCrystalSpire(g: Graphics, x: number, y: number, rand: () => number): void {
		g.ellipse(x + 3, y + 5, 12, 5);
		g.fill({ color: 0x000000, alpha: 0.35 });

		const crystalColors = [0x00f5ff, 0xec4899, 0xa855f7, 0x22c55e];
		const color = crystalColors[Math.floor(rand() * crystalColors.length)];

		g.poly([x - 6, y + 4, x, y - 24, x + 6, y + 4, x, y + 8]);
		g.fill({ color, alpha: 0.9 });
		g.stroke({ color: 0xffffff, width: 1.2, alpha: 0.75 });

		g.poly([x - 12, y + 4, x - 7, y - 12, x - 2, y + 4]);
		g.fill({ color, alpha: 0.8 });
		g.poly([x + 2, y + 4, x + 8, y - 15, x + 13, y + 4]);
		g.fill({ color, alpha: 0.8 });

		g.circle(x - 1, y - 18, 2);
		g.fill({ color: 0xffffff });
	}

	private drawAncientMonolith(g: Graphics, x: number, y: number, _rand: () => number): void {
		g.ellipse(x + 6, y + 8, 18, 8);
		g.fill({ color: 0x000000, alpha: 0.35 });

		g.roundRect(x - 10, y - 32, 20, 40, 4);
		g.fill({ color: 0x64748b });
		g.stroke({ color: 0x1e293b, width: 2 });

		g.circle(x - 4, y - 10, 5);
		g.fill({ color: 0x36761f, alpha: 0.85 });
		g.circle(x + 5, y - 22, 6);
		g.fill({ color: 0x36761f, alpha: 0.85 });

		g.beginPath();
		g.moveTo(x, y - 26);
		g.lineTo(x, y - 14);
		g.stroke({ color: 0x38bdf8, width: 2, alpha: 0.9 });
		g.circle(x, y - 20, 3);
		g.fill({ color: 0xa5f3fc });
	}

	private drawFloweringBush(g: Graphics, x: number, y: number, rand: () => number): void {
		g.circle(x + 4, y + 5, 16);
		g.fill({ color: 0x000000, alpha: 0.28 });

		g.circle(x, y, 16);
		g.fill({ color: 0x225419 });
		g.circle(x - 5, y - 4, 12);
		g.fill({ color: 0x3b8226 });
		g.circle(x + 5, y - 3, 11);
		g.fill({ color: 0x4d9e33 });

		const bCols = [0xf472b6, 0xfde047, 0xe879f9];
		const bCol = bCols[Math.floor(rand() * bCols.length)];
		g.circle(x - 4, y - 6, 3);
		g.fill({ color: bCol });
		g.circle(x + 4, y - 4, 2.5);
		g.fill({ color: bCol });
		g.circle(x, y + 2, 2.5);
		g.fill({ color: 0xfef08a });
	}

	private drawStoneBrazier(g: Graphics, x: number, y: number, _rand: () => number): void {
		g.roundRect(x - 6, y - 10, 12, 16, 2);
		g.fill({ color: 0x475569 });
		g.rect(x - 8, y - 14, 16, 5);
		g.fill({ color: 0x334155 });

		g.circle(x, y - 18, 6);
		g.fill({ color: 0xf59e0b, alpha: 0.85 });
		g.circle(x, y - 20, 3.5);
		g.fill({ color: 0xfef08a });
	}

	private drawWaterLily(g: Graphics, x: number, y: number): void {
		g.ellipse(x, y, 9, 6);
		g.fill({ color: 0x15803d, alpha: 0.85 });
		g.circle(x, y - 2, 3);
		g.fill({ color: 0xf472b6 });
		g.circle(x, y - 2, 1.5);
		g.fill({ color: 0xfef08a });
	}

	/**
	 * Renders a continuous bridge deck section (weathered planks, iron strapping,
	 * stone parapet balustrades) cleanly shared between intact and broken stubs.
	 */
	private drawBridgeSpan(
		g: Graphics,
		startX: number,
		spanW: number,
		topY: number,
		bridgeH: number,
		breakSide: 'none' | 'right' | 'left'
	): void {
		// 1. 2.5D Drop Shadow on water
		g.roundRect(startX + 14, topY + 22, spanW, bridgeH, breakSide === 'none' ? 14 : 8);
		g.fill({ color: 0x000000, alpha: 0.46 });

		// 2. Heavy Timber Decking
		g.roundRect(startX, topY, spanW, bridgeH, breakSide === 'none' ? 12 : 6);
		g.fill({ color: 0x78350f });
		g.stroke({ color: 0x451a03, width: 3 });

		// Wood deck planks with alternating weathered grain
		let plankIndex = 0;
		for (let bx = startX + 18; bx < startX + spanW - 8; bx += 24) {
			if (plankIndex % 3 === 0) {
				g.rect(bx - 16, topY + 6, 16, bridgeH - 12);
				g.fill({ color: 0x6b2e0d, alpha: 0.45 });
			}
			g.beginPath();
			g.moveTo(bx, topY + 8);
			g.lineTo(bx, topY + bridgeH - 8);
			g.stroke({ color: 0x451a03, width: 2.5 });
			plankIndex++;
		}

		// Iron reinforcement strapping along edges
		g.rect(startX, topY + 10, spanW, 4);
		g.fill({ color: 0x334155 });
		g.rect(startX, topY + bridgeH - 14, spanW, 4);
		g.fill({ color: 0x334155 });

		// 3. Carved Stone Parapet Balustrades (shortened slightly before a collapse fracture)
		const paraLeft = breakSide === 'left' ? startX + 18 : startX - 12;
		const paraRight = breakSide === 'right' ? startX + spanW - 18 : startX + spanW + 12;
		const paraW = Math.max(40, paraRight - paraLeft);

		g.roundRect(paraLeft, topY - 14, paraW, 18, 5);
		g.fill({ color: 0x94a3b8 });
		g.stroke({ color: 0x334155, width: 2 });

		g.roundRect(paraLeft, topY + bridgeH - 4, paraW, 18, 5);
		g.fill({ color: 0x64748b });
		g.stroke({ color: 0x334155, width: 2 });

		for (let px = paraLeft + 24; px < paraRight - 10; px += 45) {
			g.beginPath();
			g.moveTo(px, topY - 14);
			g.lineTo(px, topY + 4);
			g.stroke({ color: 0x475569, width: 1.5 });

			g.beginPath();
			g.moveTo(px, topY + bridgeH - 4);
			g.lineTo(px, topY + bridgeH + 14);
			g.stroke({ color: 0x334155, width: 1.5 });
		}
	}

	/**
	 * Draws ragged splintered timber beams, chipped stone parapet ends, and a medieval
	 * wooden barrier at one side of a collapsed bridge span.
	 */
	private drawCollapsedBridgeEdge(
		g: Graphics,
		breakX: number,
		topY: number,
		bridgeH: number,
		dir: 1 | -1
	): void {
		const laneY = topY + bridgeH / 2;

		// Exposed splintered longitudinal stringers & snapped deck planks jutting over the chasm
		const plankOffsets = [14, 32, 52, 74, 96, 118, 138, 154];
		for (let i = 0; i < plankOffsets.length; i++) {
			const py = topY + plankOffsets[i];
			const jutLen = 14 + ((i * 19 + 7) % 34);
			const plankThickness = i % 2 === 0 ? 11 : 8;
			const startEdge = breakX - dir * 10;
			const tipX = breakX + dir * jutLen;
			const minX = Math.min(startEdge, tipX);
			const w = Math.abs(tipX - startEdge);

			// Beam drop shadow in water
			g.rect(minX + 6, py + 12, w, plankThickness);
			g.fill({ color: 0x000000, alpha: 0.35 });

			// Darkened weathered plank body
			g.poly([
				startEdge,
				py - plankThickness / 2,
				tipX,
				py - plankThickness / 2 + (i % 2 === 0 ? 2 : -1),
				tipX - dir * 5,
				py + plankThickness / 2,
				startEdge,
				py + plankThickness / 2
			]);
			g.fill({ color: i % 2 === 0 ? 0x6b2e0d : 0x78350f });
			g.stroke({ color: 0x451a03, width: 1.5 });

			// Freshly snapped lighter inner wood grain at broken tip
			g.rect(tipX - dir * 5, py - plankThickness / 2 + 2, 4, Math.max(3, plankThickness - 4));
			g.fill({ color: 0xd97706, alpha: 0.75 });
		}

		// Shattered stone parapet end caps (cracked masonry beside the break)
		for (const py of [topY - 14, topY + bridgeH - 4]) {
			const capX = breakX - dir * 20;
			g.poly([capX, py, capX + dir * 14, py + 3, capX + dir * 6, py + 14, capX, py + 18]);
			g.fill({ color: 0x64748b });
			g.stroke({ color: 0x334155, width: 1.5 });
		}

		// Medieval wooden sawhorse barricades across the deck warning troops of the collapse
		const barX = breakX - dir * 40;
		for (const by of [laneY - 46, laneY + 46]) {
			// Shadow under barricade
			g.ellipse(barX + 4, by + 6, 14, 18);
			g.fill({ color: 0x000000, alpha: 0.32 });

			// Crossed X timber beams
			g.beginPath();
			g.moveTo(barX - 10, by - 16);
			g.lineTo(barX + 10, by + 16);
			g.stroke({ color: 0x451a03, width: 7 });
			g.beginPath();
			g.moveTo(barX - 10, by - 16);
			g.lineTo(barX + 10, by + 16);
			g.stroke({ color: 0x92400e, width: 4 });

			g.beginPath();
			g.moveTo(barX + 10, by - 16);
			g.lineTo(barX - 10, by + 16);
			g.stroke({ color: 0x451a03, width: 7 });
			g.beginPath();
			g.moveTo(barX + 10, by - 16);
			g.lineTo(barX - 10, by + 16);
			g.stroke({ color: 0x92400e, width: 4 });

			// Iron center bolt
			g.circle(barX, by, 3.5);
			g.fill({ color: 0x94a3b8 });
		}

		// Taut warning rope & horizontal crossbar linking the two sawhorses
		g.beginPath();
		g.moveTo(barX, laneY - 58);
		g.lineTo(barX, laneY + 58);
		g.stroke({ color: 0x451a03, width: 6 });
		g.beginPath();
		g.moveTo(barX, laneY - 58);
		g.lineTo(barX, laneY + 58);
		g.stroke({ color: 0xb45309, width: 3.5 });

		// Small red-amber warning lantern hanging on the center of the barrier
		g.circle(barX, laneY, 7);
		g.fill({ color: 0x7f1d1d });
		g.stroke({ color: 0x451a03, width: 1.5 });
		g.circle(barX, laneY, 4);
		g.fill({ color: 0xf97316 });
	}

	/**
	 * Draws sunken masonry, half-submerged boulders, water ripples, and drifting timber
	 * wreckage in the collapsed center chasm of a broken bridge.
	 */
	private drawCollapsedChasmDebris(
		g: Graphics,
		centerX: number,
		laneY: number,
		gapW: number,
		bridgeH: number
	): void {
		// 1. Sunken central stone pier foundation silhouette beneath the strait water
		g.roundRect(centerX - gapW * 0.42, laneY - bridgeH * 0.45, gapW * 0.84, bridgeH * 0.9, 18);
		g.fill({ color: 0x091e32, alpha: 0.55 });

		// 2. Half-submerged broken masonry & stone boulders with upstream whitewater foam
		const masonryRocks = [
			{ x: centerX - 58, y: laneY - 38, w: 38, h: 28 },
			{ x: centerX + 52, y: laneY - 26, w: 42, h: 30 },
			{ x: centerX - 18, y: laneY + 34, w: 46, h: 32 },
			{ x: centerX + 68, y: laneY + 42, w: 32, h: 24 },
			{ x: centerX - 78, y: laneY + 26, w: 28, h: 22 }
		];
		for (const rock of masonryRocks) {
			// Water foam wake upstream (north rim)
			g.ellipse(rock.x, rock.y - rock.h * 0.3, rock.w * 0.65, rock.h * 0.45);
			g.stroke({ color: 0x7dd3fc, width: 2.5, alpha: 0.4 });

			// Submerged base shadow
			g.ellipse(rock.x + 2, rock.y + 4, rock.w * 0.56, rock.h * 0.5);
			g.fill({ color: 0x0f172a, alpha: 0.6 });

			// Angular rock / broken bridge stone block
			g.poly([
				rock.x - rock.w * 0.48,
				rock.y,
				rock.x - rock.w * 0.2,
				rock.y - rock.h * 0.46,
				rock.x + rock.w * 0.38,
				rock.y - rock.h * 0.36,
				rock.x + rock.w * 0.5,
				rock.y + rock.h * 0.14,
				rock.x + rock.w * 0.12,
				rock.y + rock.h * 0.46,
				rock.x - rock.w * 0.36,
				rock.y + rock.h * 0.36
			]);
			g.fill({ color: 0x475569 });
			g.stroke({ color: 0x1e293b, width: 2 });

			// Top weathered highlight facet
			g.poly([
				rock.x - rock.w * 0.2,
				rock.y - rock.h * 0.4,
				rock.x + rock.w * 0.32,
				rock.y - rock.h * 0.3,
				rock.x + rock.w * 0.14,
				rock.y,
				rock.x - rock.w * 0.3,
				rock.y - rock.h * 0.05
			]);
			g.fill({ color: 0x64748b, alpha: 0.85 });
		}

		// 3. Floating broken planks & driftwood beams bobbing in the gap
		const floatingPlanks = [
			{ x: centerX - 10, y: laneY - 52, len: 52, thick: 11, tilt: 7 },
			{ x: centerX + 26, y: laneY - 6, len: 46, thick: 10, tilt: -6 },
			{ x: centerX - 48, y: laneY + 8, len: 40, thick: 9, tilt: 5 },
			{ x: centerX + 12, y: laneY + 58, len: 48, thick: 10, tilt: -8 }
		];
		for (const p of floatingPlanks) {
			// Water ripple around drifting wood
			g.ellipse(p.x, p.y, p.len * 0.56, p.thick * 1.15);
			g.stroke({ color: 0xbae6fd, width: 1.5, alpha: 0.35 });

			// Skewed plank polygon
			const hx = p.len / 2;
			const hy = p.thick / 2;
			g.poly([
				p.x - hx,
				p.y - hy - p.tilt,
				p.x + hx,
				p.y - hy + p.tilt,
				p.x + hx,
				p.y + hy + p.tilt,
				p.x - hx,
				p.y + hy - p.tilt
			]);
			g.fill({ color: 0x78350f });
			g.stroke({ color: 0x451a03, width: 1.8 });
		}
	}

	/**
	 * Draws 2.5D fairytale bridge with heavy stone piers, weathered timber decking,
	 * carved stone balustrades, and glowing magical lanterns.
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
		const halfW = bridgeW / 2;
		const leftX = centerX - halfW;
		const topY = laneY - bridgeH / 2;

		const drawLanternPair = (lx: number, lit: boolean) => {
			for (const ly of [topY - 16, topY + bridgeH + 16]) {
				g.circle(lx, ly, 9);
				g.fill({ color: lit ? 0xfbbf24 : 0x334155 });
				if (lit) {
					g.circle(lx, ly, 5);
					g.fill({ color: 0xffffff });
				} else {
					g.stroke({ color: 0x1e293b, width: 1.5 });
				}
			}
		};

		if (!isBroken) {
			// 1. Heavy stone foundation pier in riverbed
			g.roundRect(centerX - 280, topY + 16, 560, bridgeH + 36, 24);
			g.fill({ color: 0x1e293b, alpha: 0.9 });

			// 2. Deck, planks, iron strapping & stone balustrades
			this.drawBridgeSpan(g, leftX, bridgeW, topY, bridgeH, 'none');

			// 3. Glowing Magical Stone Lanterns
			const lanternXCoords = [
				leftX + 30,
				leftX + 230,
				centerX - 140,
				centerX + 140,
				leftX + bridgeW - 230,
				leftX + bridgeW - 30
			];
			for (const lx of lanternXCoords) {
				drawLanternPair(lx, true);
			}
		} else {
			// BROKEN / COLLAPSED FANTASY BRIDGE
			const stubW = bridgeW * 0.34;
			const gapW = bridgeW - stubW * 2;
			const leftBreakX = leftX + stubW;
			const rightStartX = leftX + stubW + gapW;

			// 1. Submerged ruined central pier & drifting wreckage in river gap
			this.drawCollapsedChasmDebris(g, centerX, laneY, gapW, bridgeH);

			// 2. Left & Right surviving bridge stubs with authentic planks & stone balustrades
			this.drawBridgeSpan(g, leftX, stubW, topY, bridgeH, 'right');
			this.drawBridgeSpan(g, rightStartX, stubW, topY, bridgeH, 'left');

			// 3. Splintered timber beams, shattered parapet ends & medieval barricades
			this.drawCollapsedBridgeEdge(g, leftBreakX, topY, bridgeH, 1);
			this.drawCollapsedBridgeEdge(g, rightStartX, topY, bridgeH, -1);

			// 4. Surviving bridgehead lanterns (outer pairs stay lit; edge pair near collapse flickers/dim)
			drawLanternPair(leftX + 30, true);
			drawLanternPair(leftX + 230, true);
			drawLanternPair(leftX + bridgeW - 230, true);
			drawLanternPair(leftX + bridgeW - 30, true);
		}
	}
}
