import type { Graphics } from 'pixi.js';
import {
	ARENA_WIDTH,
	ARENA_HEIGHT,
	TOP_LANE_Y,
	MID_LANE_Y,
	BOTTOM_LANE_Y,
	BRIDGE_SPAN_MIN_X,
	BRIDGE_SPAN_MAX_X
} from '../engine/constants';

export class TerrainRenderer {
	public drawStaticTerrain(
		g: Graphics,
		brokenBridge: 'top' | 'mid' | 'bottom' | null = 'mid'
	): void {
		g.clear();

		// =========================================================================
		// 1. EXPANSIVE AZURE & TURQUOISE OCEAN (Fairytale Water in Spyro Aesthetic)
		// =========================================================================
		// Deep ocean base
		g.rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
		g.fill({ color: 0x014f86 });

		// Flowing vibrant azure & turquoise ocean currents
		for (let y = 0; y < ARENA_HEIGHT; y += 80) {
			const isBright = (y / 80) % 2 === 0;
			g.rect(0, y, ARENA_WIDTH, 80);
			g.fill({ color: isBright ? 0x0284c7 : 0x0369a1, alpha: 0.85 });
		}

		// Organic soft water wave ripples and gentle caustics
		for (let x = 60; x < ARENA_WIDTH; x += 240) {
			for (let y = 40; y < ARENA_HEIGHT; y += 120) {
				const waveW = 140 + ((x * 11 + y * 17) % 80);
				const waveOff = Math.sin(x * 0.03 + y * 0.05) * 16;
				g.ellipse(x + waveOff, y, waveW / 2, 8);
				g.fill({ color: 0x38bdf8, alpha: 0.28 });

				// Light white foam crest
				g.ellipse(x + waveOff - 12, y - 2, waveW / 4, 3);
				g.fill({ color: 0xe0f2fe, alpha: 0.45 });
			}
		}

		// =========================================================================
		// 2. THE TWO ISLANDS (West Island & East Island)
		// =========================================================================
		const westIsland = {
			x: 60,
			y: 60,
			w: BRIDGE_SPAN_MIN_X - 60, // 60 to 3240
			h: ARENA_HEIGHT - 120,
			radius: 48
		};

		const eastIsland = {
			x: BRIDGE_SPAN_MAX_X, // 3960 to 7140
			y: 60,
			w: ARENA_WIDTH - BRIDGE_SPAN_MAX_X - 60,
			h: ARENA_HEIGHT - 120,
			radius: 48
		};

		this.drawFantasyIsland(
			g,
			westIsland.x,
			westIsland.y,
			westIsland.w,
			westIsland.h,
			westIsland.radius,
			true
		);
		this.drawFantasyIsland(
			g,
			eastIsland.x,
			eastIsland.y,
			eastIsland.w,
			eastIsland.h,
			eastIsland.radius,
			false
		);

		// =========================================================================
		// 3. ANCIENT STONE RUINS & MONOLITHS ALONG THE SHORES
		// =========================================================================
		this.drawAncientRuins(g, westIsland.x, westIsland.y, westIsland.w, westIsland.h);
		this.drawAncientRuins(g, eastIsland.x, eastIsland.y, eastIsland.w, eastIsland.h);

		// =========================================================================
		// 4. NATURAL EARTH & COBBLESTONE ROADWAY NETWORK
		// =========================================================================
		this.drawNaturalRoadNetwork(g);

		// =========================================================================
		// 5. BASE COURTYARD RAMPARTS & WATCHTOWER GATES
		// =========================================================================
		this.drawCourtyardRamparts(g);

		// =========================================================================
		// 6. THREE 2.5D BRIDGES OVER CENTRAL STRAIT
		// =========================================================================
		const bridgeMinX = BRIDGE_SPAN_MIN_X - 60; // 3180
		const bridgeMaxX = BRIDGE_SPAN_MAX_X + 60; // 4020
		const bridgeW = bridgeMaxX - bridgeMinX; // 840
		const centerX = (bridgeMinX + bridgeMaxX) / 2; // 3600

		// Top Bridge
		this.drawFantasyBridge(g, centerX, TOP_LANE_Y, bridgeW, brokenBridge === 'top', 'top');

		// Middle Bridge
		this.drawFantasyBridge(g, centerX, MID_LANE_Y, bridgeW, brokenBridge === 'mid', 'mid');

		// Bottom Bridge
		this.drawFantasyBridge(g, centerX, BOTTOM_LANE_Y, bridgeW, brokenBridge === 'bottom', 'bottom');

		// Outer dark framing border
		g.rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
		g.stroke({ color: 0x090d16, width: 8 });
	}

	/**
	 * Draws a lush, organically painted fantasy island matching the reference art:
	 * - Multi-tiered craggy cliffs with warm granite & sandstone facets
	 * - Translucent shoreline shallows with gentle foam
	 * - Smooth, continuous fairytale meadow (no geometric polka-dot blobs!)
	 */
	private drawFantasyIsland(
		g: Graphics,
		x: number,
		y: number,
		w: number,
		h: number,
		r: number,
		isWest: boolean
	): void {
		// 1. Deep 2.5D Drop Shadow cast into water
		g.roundRect(x + 22, y + 36, w, h, r);
		g.fill({ color: 0x000000, alpha: 0.5 });

		// 2. Shoreline turquoise shallows & foam border
		g.roundRect(x - 24, y - 16, w + 48, h + 46, r + 16);
		g.fill({ color: 0x06b6d4, alpha: 0.35 });
		g.roundRect(x - 12, y - 8, w + 24, h + 30, r + 8);
		g.stroke({ color: 0xe0f2fe, width: 4.5, alpha: 0.8 });

		// 3. Lower Cliff Layer (Deep terracotta & weathered granite rock strata)
		g.roundRect(x, y + 24, w, h, r);
		g.fill({ color: 0x5c4033 });
		g.stroke({ color: 0x3e2723, width: 3.5 });

		// Craggy rock facets & horizontal strata along the cliff face
		for (let cy = y + h - 18; cy <= y + h + 22; cy += 9) {
			g.moveTo(x + r, cy);
			g.lineTo(x + w - r, cy);
			g.stroke({ color: 0x785138, width: 3, alpha: 0.7 });
		}

		// Vertical cliff fissures
		const stepFissure = 160;
		for (let fx = x + r + 40; fx < x + w - r - 40; fx += stepFissure) {
			g.moveTo(fx, y + h - 6);
			g.lineTo(fx + (fx % 30) - 15, y + h + 24);
			g.stroke({ color: 0x2a1810, width: 2, alpha: 0.65 });
		}

		// 4. Upper Cliff Bevel (Warm golden sandstone rim)
		g.roundRect(x, y + 10, w, h - 10, r);
		g.fill({ color: 0x8d5b4c });

		// 5. Lush Fairytale Meadow Surface (Continuous smooth organic landscape)
		g.roundRect(x, y, w, h - 16, r);
		g.fill({ color: 0x36761f }); // Rich fairway green base
		g.stroke({ color: 0x285916, width: 3 });

		// Broad organic rolling meadow hillocks (painted in flowing, wide horizontal waves)
		// Wave 1: Upper sunny meadow
		g.ellipse(x + w * 0.45, y + h * 0.28, w * 0.42, h * 0.22);
		g.fill({ color: 0x479427, alpha: 0.55 });
		g.ellipse(x + w * 0.5, y + h * 0.25, w * 0.32, h * 0.15);
		g.fill({ color: 0x58a832, alpha: 0.45 });

		// Wave 2: Lower sunny meadow
		g.ellipse(x + w * 0.52, y + h * 0.72, w * 0.44, h * 0.22);
		g.fill({ color: 0x479427, alpha: 0.55 });
		g.ellipse(x + w * 0.48, y + h * 0.75, w * 0.34, h * 0.15);
		g.fill({ color: 0x58a832, alpha: 0.45 });

		// Wave 3: Central meadow ridge
		g.ellipse(x + w * 0.5, y + h * 0.5, w * 0.38, h * 0.14);
		g.fill({ color: 0x3e8423, alpha: 0.4 });

		// Valley shade along the borders
		g.roundRect(x + 12, y + 12, w - 24, h - 38, r - 6);
		g.stroke({ color: 0x224813, width: 3, alpha: 0.35 });

		// Scattered subtle fairytale clover and wildflower patches (irregular natural distribution)
		const flowerColors = [0xfde047, 0xf472b6, 0xc084fc, 0x38bdf8];
		const seed = isWest ? 1337 : 7331;
		for (let i = 0; i < 45; i++) {
			const fx = x + 120 + ((i * 197 + seed) % (w - 240));
			const fy = y + 80 + ((i * 283 + seed) % (h - 160));
			const col = flowerColors[i % flowerColors.length];

			// Tiny natural blossom cluster
			g.circle(fx, fy, 3.5);
			g.fill({ color: col, alpha: 0.85 });
			g.circle(fx + 3, fy - 2, 2.5);
			g.fill({ color: 0xfef08a, alpha: 0.9 });
		}
	}

	/**
	 * Draws ancient stone ruins, monoliths, and mossy stone pillars matching the reference art
	 * (e.g. the carved stone arch on the right of Create_new_mobs_and_background_aafaa330_2K.jpg).
	 */
	private drawAncientRuins(g: Graphics, x: number, y: number, w: number, h: number): void {
		// Place a grand ancient stone ruin portal on the outer perimeter of each island
		const archX = x + w * 0.85;
		const archY = y + 120;

		// 1. Ruined Stone Archway
		// Arch shadow
		g.rect(archX - 35, archY + 80, 80, 16);
		g.fill({ color: 0x000000, alpha: 0.35 });

		// Left Column
		g.roundRect(archX - 30, archY, 20, 80, 3);
		g.fill({ color: 0x94a3b8 });
		g.stroke({ color: 0x334155, width: 2 });
		// Left column capital & base
		g.rect(archX - 34, archY - 6, 28, 8);
		g.fill({ color: 0x64748b });
		g.rect(archX - 34, archY + 76, 28, 8);
		g.fill({ color: 0x64748b });

		// Right Column
		g.roundRect(archX + 20, archY, 20, 80, 3);
		g.fill({ color: 0x94a3b8 });
		g.stroke({ color: 0x334155, width: 2 });
		// Right column capital & base
		g.rect(archX + 16, archY - 6, 28, 8);
		g.fill({ color: 0x64748b });
		g.rect(archX + 16, archY + 76, 28, 8);
		g.fill({ color: 0x64748b });

		// Arch Lintel beam spanning across
		g.roundRect(archX - 38, archY - 22, 86, 18, 4);
		g.fill({ color: 0xa8a29e });
		g.stroke({ color: 0x44403c, width: 2 });

		// Creeping green moss on stone arch
		g.circle(archX - 30, archY - 14, 6);
		g.fill({ color: 0x36761f, alpha: 0.8 });
		g.circle(archX + 28, archY - 16, 8);
		g.fill({ color: 0x36761f, alpha: 0.8 });

		// Second ruin: Lower mossy stone monoliths
		const monoX = x + w * 0.88;
		const monoY = y + h - 180;
		g.roundRect(monoX, monoY, 32, 65, 5);
		g.fill({ color: 0x78716c });
		g.stroke({ color: 0x292524, width: 2 });
		g.circle(monoX + 16, monoY + 8, 10);
		g.fill({ color: 0x479427, alpha: 0.75 });
	}

	/**
	 * Draws authentic warm earth & cobblestone roadways matching the reference:
	 * Warm sandstone/dirt path base with natural feathered margins, embedded rounded stones,
	 * and grand paved castle plazas with decorative heraldic inlays.
	 */
	public drawNaturalRoadNetwork(g: Graphics): void {
		const roadHeight = 150;
		const wCastX = 200;
		const wCastY = 1200;
		const eCastX = ARENA_WIDTH - 200;
		const eCastY = 1200;

		// 1. West Castle Grand Stone Plaza
		this.drawCastlePlaza(g, wCastX, wCastY);

		// 2. East Castle Grand Stone Plaza
		this.drawCastlePlaza(g, eCastX, eCastY);

		// 3. Highways running across West & East Islands
		const westRoadLen = BRIDGE_SPAN_MIN_X - 1500;
		this.drawFantasyHighway(g, 1500, TOP_LANE_Y, westRoadLen, roadHeight);
		this.drawFantasyHighway(g, 1500, MID_LANE_Y, westRoadLen, roadHeight);
		this.drawFantasyHighway(g, 1500, BOTTOM_LANE_Y, westRoadLen, roadHeight);

		const eastRoadLen = ARENA_WIDTH - 1500 - BRIDGE_SPAN_MAX_X;
		this.drawFantasyHighway(g, BRIDGE_SPAN_MAX_X, TOP_LANE_Y, eastRoadLen, roadHeight);
		this.drawFantasyHighway(g, BRIDGE_SPAN_MAX_X, MID_LANE_Y, eastRoadLen, roadHeight);
		this.drawFantasyHighway(g, BRIDGE_SPAN_MAX_X, BOTTOM_LANE_Y, eastRoadLen, roadHeight);

		// 4. Smooth Courtyard Road Fan-outs from Castle Plazas
		this.drawCourtyardFanOut(g, wCastX, wCastY, 1500, roadHeight, true);
		this.drawCourtyardFanOut(g, eCastX, eCastY, ARENA_WIDTH - 1500, roadHeight, false);
	}

	private drawCastlePlaza(g: Graphics, cx: number, cy: number): void {
		// Plaza drop shadow
		g.circle(cx + 8, cy + 14, 230);
		g.fill({ color: 0x000000, alpha: 0.4 });

		// Outer carved sandstone rim
		g.circle(cx, cy, 226);
		g.fill({ color: 0x8a7153 });
		g.stroke({ color: 0x4a3b2c, width: 3.5 });

		// Inner warm stone pavement
		g.circle(cx, cy, 210);
		g.fill({ color: 0xa69076 });

		// Decorative inlaid starburst compass rose
		for (let ang = 0; ang < Math.PI * 2; ang += Math.PI / 4) {
			const rx = cx + Math.cos(ang) * 195;
			const ry = cy + Math.sin(ang) * 195;
			g.moveTo(cx, cy);
			g.lineTo(rx, ry);
			g.stroke({ color: 0xd6c4b2, width: 2.5, alpha: 0.75 });
		}

		// Center heraldic ring
		g.circle(cx, cy, 60);
		g.fill({ color: 0x6e5538 });
		g.stroke({ color: 0xfbbf24, width: 2, alpha: 0.8 });
	}

	private drawFantasyHighway(g: Graphics, x: number, laneY: number, w: number, h: number): void {
		const topY = laneY - h / 2;

		// 1. Road drop shadow
		g.roundRect(x, topY + 6, w, h, 6);
		g.fill({ color: 0x000000, alpha: 0.3 });

		// 2. Warm Earth & Sandstone Roadway Base
		g.roundRect(x, topY, w, h, 6);
		g.fill({ color: 0x8a7153 });
		g.stroke({ color: 0x4a3b2c, width: 2.5 });

		// 3. Worn Cobblestone Inlays (Individual rounded stones embedded in dirt)
		g.rect(x + 4, topY + 4, w - 8, h - 8);
		g.fill({ color: 0x9e8568, alpha: 0.5 });

		// Beveled stone curb edges (Top & Bottom)
		g.rect(x, topY - 4, w, 7);
		g.fill({ color: 0xd6c4b2 });
		g.rect(x, topY + h - 3, w, 7);
		g.fill({ color: 0x4a3b2c });

		// Transverse paver joints
		for (let px = x + 35; px < x + w; px += 45) {
			g.moveTo(px, topY + 4);
			g.lineTo(px, topY + h - 4);
			g.stroke({ color: 0x5a4835, width: 1.8, alpha: 0.45 });
		}
	}

	private drawCourtyardFanOut(
		g: Graphics,
		castX: number,
		castY: number,
		gateX: number,
		roadH: number,
		isWest: boolean
	): void {
		const dir = isWest ? 1 : -1;
		const roadColor = 0x8a7153;
		const strokeColor = 0x4a3b2c;

		// Top Fan
		g.poly([
			castX + dir * 60,
			castY - 90,
			gateX,
			TOP_LANE_Y - roadH / 2,
			gateX,
			TOP_LANE_Y + roadH / 2,
			castX + dir * 140,
			castY - 20
		]);
		g.fill({ color: roadColor });
		g.stroke({ color: strokeColor, width: 2 });

		// Middle Connector
		g.rect(
			isWest ? castX + 160 : gateX,
			MID_LANE_Y - roadH / 2,
			Math.abs(gateX - (castX + dir * 160)),
			roadH
		);
		g.fill({ color: roadColor });
		g.stroke({ color: strokeColor, width: 2 });

		// Bottom Fan
		g.poly([
			castX + dir * 140,
			castY + 20,
			gateX,
			BOTTOM_LANE_Y - roadH / 2,
			gateX,
			BOTTOM_LANE_Y + roadH / 2,
			castX + dir * 60,
			castY + 90
		]);
		g.fill({ color: roadColor });
		g.stroke({ color: strokeColor, width: 2 });
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
			// =====================================================================
			// INTACT FANTASY BRIDGE
			// =====================================================================
			// 1. Heavy stone foundation pier in riverbed
			g.roundRect(centerX - 190, topY + 16, 380, bridgeH + 36, 24);
			g.fill({ color: 0x1e293b, alpha: 0.9 });

			// 2. 2.5D Drop Shadow on turquoise water
			g.roundRect(leftX + 16, topY + 24, bridgeW, bridgeH, 14);
			g.fill({ color: 0x000000, alpha: 0.48 });

			// 3. Arched Heavy Timber Decking
			g.roundRect(leftX, topY, bridgeW, bridgeH, 12);
			g.fill({ color: 0x78350f }); // Rich warm chestnut wood
			g.stroke({ color: 0x451a03, width: 3.5 });

			// Wood deck planks
			for (let bx = leftX + 18; bx < leftX + bridgeW - 10; bx += 24) {
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

			g.roundRect(leftX - 12, topY + bridgeH - 4, bridgeW + 24, 18, 6);
			g.fill({ color: 0x64748b });
			g.stroke({ color: 0x334155, width: 2 });

			// 5. Glowing Magical Stone Lanterns
			const lanternXCoords = [leftX + 24, centerX - 140, centerX + 140, leftX + bridgeW - 24];
			for (const lx of lanternXCoords) {
				// Upper lantern
				g.circle(lx, topY - 16, 9);
				g.fill({ color: 0xfbbf24 });
				g.circle(lx, topY - 16, 5);
				g.fill({ color: 0xffffff });

				// Lower lantern
				g.circle(lx, topY + bridgeH + 16, 9);
				g.fill({ color: 0xfbbf24 });
				g.circle(lx, topY + bridgeH + 16, 5);
				g.fill({ color: 0xffffff });
			}
		} else {
			// =====================================================================
			// BROKEN / COLLAPSED FANTASY BRIDGE
			// =====================================================================
			const stubW = bridgeW * 0.32;
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
				g.circle(r.x, r.y, r.r);
				g.fill({ color: 0x475569 });
				g.stroke({ color: 0x1e293b, width: 2.5 });
				g.circle(r.x, r.y - 4, r.r + 4);
				g.stroke({ color: 0xa5f3fc, width: 2, alpha: 0.75 });
			}

			// Danger Hazard Markers
			g.rect(leftBreakX - 30, laneY - 25, 20, 50);
			g.fill({ color: 0xef4444 });
			g.stroke({ color: 0xfee2e2, width: 2 });
			g.moveTo(leftBreakX - 28, laneY - 20);
			g.lineTo(leftBreakX - 12, laneY + 20);
			g.stroke({ color: 0xffffff, width: 2.5 });
			g.moveTo(leftBreakX - 12, laneY - 20);
			g.lineTo(leftBreakX - 28, laneY + 20);
			g.stroke({ color: 0xffffff, width: 2.5 });

			g.rect(rightStartX + 10, laneY - 25, 20, 50);
			g.fill({ color: 0xef4444 });
			g.stroke({ color: 0xfee2e2, width: 2 });
			g.moveTo(rightStartX + 12, laneY - 20);
			g.lineTo(rightStartX + 28, laneY + 20);
			g.stroke({ color: 0xffffff, width: 2.5 });
			g.moveTo(rightStartX + 28, laneY - 20);
			g.lineTo(rightStartX + 12, laneY + 20);
			g.stroke({ color: 0xffffff, width: 2.5 });
		}
	}

	public drawCourtyardRamparts(g: Graphics): void {
		// West ramparts (X = 1440, W = 50)
		this.drawVerticalWall(g, 1440, 60, 50, 500);
		this.drawVerticalWall(g, 1440, 760, 50, 340);
		this.drawVerticalWall(g, 1440, 1300, 50, 340);
		this.drawVerticalWall(g, 1440, 1840, 50, ARENA_HEIGHT - 1900);

		// East ramparts (X = ARENA_WIDTH - 1490)
		const eastWallX = ARENA_WIDTH - 1490;
		this.drawVerticalWall(g, eastWallX, 60, 50, 500);
		this.drawVerticalWall(g, eastWallX, 760, 50, 340);
		this.drawVerticalWall(g, eastWallX, 1300, 50, 340);
		this.drawVerticalWall(g, eastWallX, 1840, 50, ARENA_HEIGHT - 1900);
	}

	public drawVerticalWall(g: Graphics, x: number, y: number, w: number, h: number): void {
		// Shadow
		g.rect(x + w, y - 2, 10, h + 4);
		g.fill({ color: 0x000000, alpha: 0.35 });

		// Stone wall block
		g.rect(x, y, w, h);
		g.fill({ color: 0x64748b });
		g.stroke({ color: 0x334155, width: 2 });

		// Mortar courses
		for (let rowY = y + 20; rowY < y + h; rowY += 24) {
			g.moveTo(x + 2, rowY);
			g.lineTo(x + w - 2, rowY);
			g.stroke({ color: 0x475569, width: 1.5 });
		}

		// Crenellated battlements
		const toothH = 26;
		const gapH = 18;
		const step = toothH + gapH;
		const count = Math.floor(h / step);

		for (let i = 0; i < count; i++) {
			const ty = y + 4 + i * step;
			g.rect(x + w - 10, ty, 10, toothH);
			g.fill({ color: 0x94a3b8 });
			g.stroke({ color: 0x334155, width: 1.5 });
		}
	}
}
