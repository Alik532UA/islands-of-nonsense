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
		g.circle(cx + 10, cy + 16, 230);
		g.fill({ color: 0x000000, alpha: 0.42 });

		// Outer carved sandstone rim
		g.circle(cx, cy, 226);
		g.fill({ color: 0x8a7153 });
		g.stroke({ color: 0x4a3b2c, width: 3.5 });

		// Inner warm stone pavement
		g.circle(cx, cy, 210);
		g.fill({ color: 0xa69076 });

		// Concentric cobblestone paving rings
		for (let r = 85; r <= 185; r += 25) {
			g.circle(cx, cy, r);
			g.stroke({ color: 0x5a4835, width: 1.8, alpha: 0.45 });
		}

		// Decorative inlaid starburst compass rose
		for (let ang = 0; ang < Math.PI * 2; ang += Math.PI / 4) {
			const rx = cx + Math.cos(ang) * 195;
			const ry = cy + Math.sin(ang) * 195;
			g.beginPath();
			g.moveTo(cx, cy);
			g.lineTo(rx, ry);
			g.stroke({ color: 0xd6c4b2, width: 2.5, alpha: 0.75 });
		}

		// Center heraldic ring
		g.circle(cx, cy, 64);
		g.fill({ color: 0x6e5538 });
		g.stroke({ color: 0xfbbf24, width: 2.5, alpha: 0.85 });
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

		if (!isBroken) {
			// 1. Heavy stone foundation pier in riverbed
			g.roundRect(centerX - 280, topY + 16, 560, bridgeH + 36, 24);
			g.fill({ color: 0x1e293b, alpha: 0.9 });

			// 2. 2.5D Drop Shadow on water
			g.roundRect(leftX + 16, topY + 24, bridgeW, bridgeH, 14);
			g.fill({ color: 0x000000, alpha: 0.48 });

			// 3. Arched Heavy Timber Decking
			g.roundRect(leftX, topY, bridgeW, bridgeH, 12);
			g.fill({ color: 0x78350f });
			g.stroke({ color: 0x451a03, width: 3.5 });

			// Wood deck planks
			for (let bx = leftX + 18; bx < leftX + bridgeW - 10; bx += 24) {
				g.beginPath();
				g.moveTo(bx, topY + 8);
				g.lineTo(bx, topY + bridgeH - 8);
				g.stroke({ color: 0x451a03, width: 2.5 });
			}

			// Iron reinforcement strapping along edges
			g.rect(leftX, topY + 10, bridgeW, 4);
			g.fill({ color: 0x334155 });
			g.rect(leftX, topY + bridgeH - 14, bridgeW, 4);
			g.fill({ color: 0x334155 });

			// 4. Carved Stone Parapet Balustrades (Top & Bottom)
			g.roundRect(leftX - 12, topY - 14, bridgeW + 24, 18, 6);
			g.fill({ color: 0x94a3b8 });
			g.stroke({ color: 0x334155, width: 2 });

			// Parapet stone blocks
			for (let px = leftX + 10; px < leftX + bridgeW; px += 45) {
				g.beginPath();
				g.moveTo(px, topY - 14);
				g.lineTo(px, topY + 4);
				g.stroke({ color: 0x475569, width: 1.5 });

				g.beginPath();
				g.moveTo(px, topY + bridgeH - 4);
				g.lineTo(px, topY + bridgeH + 14);
				g.stroke({ color: 0x334155, width: 1.5 });
			}

			g.roundRect(leftX - 12, topY + bridgeH - 4, bridgeW + 24, 18, 6);
			g.fill({ color: 0x64748b });
			g.stroke({ color: 0x334155, width: 2 });

			// 5. Glowing Magical Stone Lanterns
			const lanternXCoords = [
				leftX + 30,
				leftX + 230,
				centerX - 140,
				centerX + 140,
				leftX + bridgeW - 230,
				leftX + bridgeW - 30
			];
			for (const lx of lanternXCoords) {
				g.circle(lx, topY - 16, 9);
				g.fill({ color: 0xfbbf24 });
				g.circle(lx, topY - 16, 5);
				g.fill({ color: 0xffffff });

				g.circle(lx, topY + bridgeH + 16, 9);
				g.fill({ color: 0xfbbf24 });
				g.circle(lx, topY + bridgeH + 16, 5);
				g.fill({ color: 0xffffff });
			}
		} else {
			// BROKEN / COLLAPSED FANTASY BRIDGE
			const stubW = bridgeW * 0.35;
			const gapW = bridgeW - stubW * 2;

			// Left Broken Stub
			g.roundRect(leftX + 12, topY + 20, stubW, bridgeH, 8);
			g.fill({ color: 0x000000, alpha: 0.45 });
			g.roundRect(leftX, topY, stubW, bridgeH, 8);
			g.fill({ color: 0x78350f });
			g.stroke({ color: 0x451a03, width: 3 });

			// Splintered timber beams on left break
			const leftBreakX = leftX + stubW;
			for (let ty = topY + 12; ty < topY + bridgeH - 12; ty += 18) {
				const jaggedLen = 14 + ((ty * 7) % 28);
				g.poly([leftBreakX - 6, ty, leftBreakX + jaggedLen, ty + 6, leftBreakX - 6, ty + 12]);
				g.fill({ color: 0x92400e });
				g.stroke({ color: 0x451a03, width: 1.5 });
			}

			// Right Broken Stub
			const rightStartX = leftX + stubW + gapW;
			g.roundRect(rightStartX + 12, topY + 20, stubW, bridgeH, 8);
			g.fill({ color: 0x000000, alpha: 0.45 });
			g.roundRect(rightStartX, topY, stubW, bridgeH, 8);
			g.fill({ color: 0x78350f });
			g.stroke({ color: 0x451a03, width: 3 });

			// Splintered timber beams on right break
			for (let ty = topY + 12; ty < topY + bridgeH - 12; ty += 18) {
				const jaggedLen = 14 + ((ty * 11) % 28);
				g.poly([rightStartX + 6, ty, rightStartX - jaggedLen, ty + 6, rightStartX + 6, ty + 12]);
				g.fill({ color: 0x92400e });
				g.stroke({ color: 0x451a03, width: 1.5 });
			}

			// Center Chasm with turbulent foaming rapids
			g.ellipse(centerX, laneY, gapW / 2 + 12, bridgeH / 2 + 16);
			g.fill({ color: 0x0284c7, alpha: 0.95 });

			for (let fy = topY - 15; fy <= topY + bridgeH + 15; fy += 25) {
				g.ellipse(centerX + Math.sin(fy * 0.1) * 20, fy, gapW / 2 - 10, 8);
				g.stroke({ color: 0xe0f2fe, width: 3, alpha: 0.85 });
			}

			// Submerged stone boulders
			const rocks = [
				{ x: centerX - 35, y: laneY - 25, r: 20 },
				{ x: centerX + 40, y: laneY + 20, r: 24 },
				{ x: centerX, y: laneY + 45, r: 18 }
			];
			for (const r of rocks) {
				g.beginPath();
				g.circle(r.x, r.y, r.r);
				g.fill({ color: 0x475569 });
				g.stroke({ color: 0x1e293b, width: 2.5 });
				g.beginPath();
				g.circle(r.x, r.y - 4, r.r + 4);
				g.stroke({ color: 0xa5f3fc, width: 2, alpha: 0.75 });
			}

			// Danger Hazard Markers
			g.beginPath();
			g.rect(leftBreakX - 30, laneY - 25, 20, 50);
			g.fill({ color: 0xef4444 });
			g.stroke({ color: 0xfee2e2, width: 2 });
			g.beginPath();
			g.moveTo(leftBreakX - 28, laneY - 20);
			g.lineTo(leftBreakX - 12, laneY + 20);
			g.stroke({ color: 0xffffff, width: 2.5 });
			g.beginPath();
			g.moveTo(leftBreakX - 12, laneY - 20);
			g.lineTo(leftBreakX - 28, laneY + 20);
			g.stroke({ color: 0xffffff, width: 2.5 });

			g.beginPath();
			g.rect(rightStartX + 10, laneY - 25, 20, 50);
			g.fill({ color: 0xef4444 });
			g.stroke({ color: 0xfee2e2, width: 2 });
			g.beginPath();
			g.moveTo(rightStartX + 12, laneY - 20);
			g.lineTo(rightStartX + 28, laneY + 20);
			g.stroke({ color: 0xffffff, width: 2.5 });
			g.beginPath();
			g.moveTo(rightStartX + 28, laneY - 20);
			g.lineTo(rightStartX + 12, laneY + 20);
			g.stroke({ color: 0xffffff, width: 2.5 });
		}
	}
}
