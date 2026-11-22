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
		// Deep sea base
		g.rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
		g.fill({ color: 0x0284c7 });

		// Deeper ocean abyss bands
		for (let y = 0; y < ARENA_HEIGHT; y += 120) {
			const isDeep = (y / 120) % 2 === 0;
			g.rect(0, y, ARENA_WIDTH, 120);
			g.fill({ color: isDeep ? 0x0369a1 : 0x0284c7, alpha: 0.7 });
		}

		// Floating water shimmer waves & caustics
		for (let x = 40; x < ARENA_WIDTH; x += 180) {
			for (let y = 30; y < ARENA_HEIGHT; y += 90) {
				const waveW = 90 + ((x * 7 + y * 13) % 60);
				const waveOff = Math.sin((x + y) * 0.05) * 8;
				g.ellipse(x + waveOff, y, waveW / 2, 7);
				g.fill({ color: 0x38bdf8, alpha: 0.35 });

				// White foam crest
				g.ellipse(x + waveOff - 10, y - 2, waveW / 4, 3);
				g.fill({ color: 0xe0f2fe, alpha: 0.5 });
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
			radius: 40
		};

		const eastIsland = {
			x: BRIDGE_SPAN_MAX_X, // 3960 to 7140
			y: 60,
			w: ARENA_WIDTH - BRIDGE_SPAN_MAX_X - 60,
			h: ARENA_HEIGHT - 120,
			radius: 40
		};

		// Draw West and East Islands with 2.5D Terraced Cliffs
		this.drawSpyroIsland(
			g,
			westIsland.x,
			westIsland.y,
			westIsland.w,
			westIsland.h,
			westIsland.radius
		);
		this.drawSpyroIsland(
			g,
			eastIsland.x,
			eastIsland.y,
			eastIsland.w,
			eastIsland.h,
			eastIsland.radius
		);

		// =========================================================================
		// 3. 2.5D COBBLESTONE ROAD NETWORK & CASTLE PLAZAS
		// =========================================================================
		this.drawRoadNetwork(g);

		// =========================================================================
		// 4. BASE COURTYARD RAMPARTS & BASTIONS
		// =========================================================================
		this.drawBaseRamparts(g);

		// =========================================================================
		// 5. THREE 2.5D BRIDGES OVER CENTRAL STRAIT (Top, Mid, Bottom)
		// =========================================================================
		const bridgeMinX = BRIDGE_SPAN_MIN_X - 60; // 3180
		const bridgeMaxX = BRIDGE_SPAN_MAX_X + 60; // 4020
		const bridgeW = bridgeMaxX - bridgeMinX; // 840
		const centerX = (bridgeMinX + bridgeMaxX) / 2; // 3600

		// Top Bridge
		this.drawSpyroBridge(g, centerX, TOP_LANE_Y, bridgeW, brokenBridge === 'top', 'top');

		// Mid Bridge
		this.drawSpyroBridge(g, centerX, MID_LANE_Y, bridgeW, brokenBridge === 'mid', 'mid');

		// Bottom Bridge
		this.drawSpyroBridge(g, centerX, BOTTOM_LANE_Y, bridgeW, brokenBridge === 'bottom', 'bottom');

		// Outer dark framing border
		g.rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
		g.stroke({ color: 0x090d16, width: 8 });
	}

	/**
	 * Draws a vibrant 2.5D island with terraced stone cliffs, shoreline foam,
	 * multi-tone Spyro grass, and scattered whimsical wildflowers.
	 */
	private drawSpyroIsland(
		g: Graphics,
		x: number,
		y: number,
		w: number,
		h: number,
		r: number
	): void {
		// 1. Deep 2.5D Drop Shadow cast into water
		g.roundRect(x + 18, y + 32, w, h, r);
		g.fill({ color: 0x000000, alpha: 0.45 });

		// 2. Shoreline turquoise shallows & foam halo
		g.roundRect(x - 14, y - 10, w + 28, h + 36, r + 10);
		g.fill({ color: 0x06b6d4, alpha: 0.4 });
		g.roundRect(x - 8, y - 6, w + 16, h + 24, r + 6);
		g.stroke({ color: 0xe0f2fe, width: 3.5, alpha: 0.75 });

		// 3. Lower Cliff Layer (Deep terracotta sandstone strata)
		g.roundRect(x, y + 20, w, h, r);
		g.fill({ color: 0x78350f });
		g.stroke({ color: 0x451a03, width: 3 });

		// Cliff horizontal rock courses & strata bevels
		for (let cy = y + h - 16; cy <= y + h + 18; cy += 8) {
			g.moveTo(x + r, cy);
			g.lineTo(x + w - r, cy);
			g.stroke({ color: 0x9a3412, width: 2.5, alpha: 0.65 });
		}

		// 4. Upper Cliff Bevel (Warm golden sandstone)
		g.roundRect(x, y + 8, w, h - 8, r);
		g.fill({ color: 0xb45309 });

		// 5. Top Island Surface (Lush Fairway Spyro Grass)
		g.roundRect(x, y, w, h - 14, r);
		g.fill({ color: 0x16a34a });
		g.stroke({ color: 0x15803d, width: 2.5 });

		// Rolling hill contours in vibrant lime & sun-kissed green
		const seed = Math.floor(x);
		for (let px = x + 100; px < x + w - 100; px += 260) {
			for (let py = y + 80; py < y + h - 100; py += 220) {
				const isSunny = (px * 3 + py * 7 + seed) % 4 === 0;
				const isDeep = (px * 5 + py * 11 + seed) % 3 === 0;
				const patchColor = isSunny ? 0x65a30d : isDeep ? 0x14532d : 0x22c55e;
				const rx = 100 + ((px * 11) % 45);
				const ry = 65 + ((py * 13) % 35);
				g.ellipse(px, py, rx, ry);
				g.fill({ color: patchColor, alpha: 0.55 });
			}
		}

		// Whimsical Spyro Wildflowers & Clover Patches
		const flowerColors = [0xfde047, 0xf472b6, 0xc084fc, 0x38bdf8, 0xf97316];
		for (let fx = x + 80; fx < x + w - 80; fx += 140) {
			for (let fy = y + 70; fy < y + h - 80; fy += 120) {
				const flowerIdx = Math.floor((fx * 17 + fy * 31) % flowerColors.length);
				const fColor = flowerColors[flowerIdx];
				// Flower center & petals
				g.circle(fx, fy, 4);
				g.fill({ color: fColor });
				g.circle(fx + 3, fy - 2, 2.5);
				g.fill({ color: 0xfef08a });
			}
		}
	}

	/**
	 * Draws 2.5D stone cobblestone roads connecting the Castles to the Top, Middle, and Bottom bridges.
	 */
	public drawRoadNetwork(g: Graphics): void {
		const roadHeight = 150;
		const wCastX = 200;
		const wCastY = 1200;
		const eCastX = ARENA_WIDTH - 200;
		const eCastY = 1200;

		// 1. West Castle Stone Plaza
		this.drawCastlePlaza(g, wCastX, wCastY);

		// 2. East Castle Stone Plaza
		this.drawCastlePlaza(g, eCastX, eCastY);

		// 3. Highways running horizontally across West & East Islands
		// West Island Highways (from Ramparts X = 1500 to Island Edge X = BRIDGE_SPAN_MIN_X)
		const westRoadLen = BRIDGE_SPAN_MIN_X - 1500;
		this.drawHighwaySegment(g, 1500, TOP_LANE_Y, westRoadLen, roadHeight);
		this.drawHighwaySegment(g, 1500, MID_LANE_Y, westRoadLen, roadHeight);
		this.drawHighwaySegment(g, 1500, BOTTOM_LANE_Y, westRoadLen, roadHeight);

		// East Island Highways (from Island Edge X = BRIDGE_SPAN_MAX_X to Ramparts X = ARENA_WIDTH - 1500)
		const eastRoadLen = ARENA_WIDTH - 1500 - BRIDGE_SPAN_MAX_X;
		this.drawHighwaySegment(g, BRIDGE_SPAN_MAX_X, TOP_LANE_Y, eastRoadLen, roadHeight);
		this.drawHighwaySegment(g, BRIDGE_SPAN_MAX_X, MID_LANE_Y, eastRoadLen, roadHeight);
		this.drawHighwaySegment(g, BRIDGE_SPAN_MAX_X, BOTTOM_LANE_Y, eastRoadLen, roadHeight);

		// 4. Smooth Courtyard Road Fan-outs from Castle Plazas to Gates
		// West fan-out
		this.drawCourtyardFanOut(g, wCastX, wCastY, 1500, roadHeight, true);

		// East fan-out
		this.drawCourtyardFanOut(g, eCastX, eCastY, ARENA_WIDTH - 1500, roadHeight, false);
	}

	private drawCastlePlaza(g: Graphics, cx: number, cy: number): void {
		// Drop shadow
		g.circle(cx + 6, cy + 12, 230);
		g.fill({ color: 0x000000, alpha: 0.35 });

		// Outer beveled stone curb ring
		g.circle(cx, cy, 226);
		g.fill({ color: 0x78716c });
		g.stroke({ color: 0x44403c, width: 3 });

		// Inner cobblestone courtyard
		g.circle(cx, cy, 210);
		g.fill({ color: 0xa8a29e });

		// Decorative inlaid starburst / compass rose
		for (let ang = 0; ang < Math.PI * 2; ang += Math.PI / 4) {
			const rx = cx + Math.cos(ang) * 190;
			const ry = cy + Math.sin(ang) * 190;
			g.moveTo(cx, cy);
			g.lineTo(rx, ry);
			g.stroke({ color: 0xd6d3d1, width: 2, alpha: 0.7 });
		}
	}

	private drawHighwaySegment(g: Graphics, x: number, laneY: number, w: number, h: number): void {
		const topY = laneY - h / 2;

		// Road drop shadow
		g.rect(x, topY + 6, w, h);
		g.fill({ color: 0x000000, alpha: 0.25 });

		// Warm cobblestone surface
		g.rect(x, topY, w, h);
		g.fill({ color: 0x78716c });
		g.stroke({ color: 0x44403c, width: 2.5 });

		// Beveled stone curb edges (Top & Bottom)
		g.rect(x, topY - 4, w, 7);
		g.fill({ color: 0xd6d3d1 });
		g.rect(x, topY + h - 3, w, 7);
		g.fill({ color: 0x57534e });

		// Transverse paver lines
		for (let px = x + 35; px < x + w; px += 45) {
			g.moveTo(px, topY + 4);
			g.lineTo(px, topY + h - 4);
			g.stroke({ color: 0x57534e, width: 1.5, alpha: 0.5 });
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
		const roadColor = 0x78716c;
		const strokeColor = 0x44403c;

		// Fan to Top Lane
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

		// Straight connector to Mid Lane
		g.rect(
			isWest ? castX + 160 : gateX,
			MID_LANE_Y - roadH / 2,
			Math.abs(gateX - (castX + dir * 160)),
			roadH
		);
		g.fill({ color: roadColor });
		g.stroke({ color: strokeColor, width: 2 });

		// Fan to Bottom Lane
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
	 * Draws a 2.5D Spyro-styled bridge connecting the two islands across the strait.
	 * If isBroken is true, the center span is collapsed with shattered piers,
	 * rushing water, floating debris, and glowing hazard signs.
	 */
	public drawSpyroBridge(
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
			// INTACT 2.5D BRIDGE
			// =====================================================================
			// 1. Heavy underwater stone pier foundation
			g.roundRect(centerX - 180, topY + 20, 360, bridgeH + 30, 20);
			g.fill({ color: 0x1e293b, alpha: 0.85 });

			// 2. Bridge 2.5D drop shadow on turquoise water below
			g.roundRect(leftX + 14, topY + 24, bridgeW, bridgeH, 12);
			g.fill({ color: 0x000000, alpha: 0.45 });

			// 3. Arched stone roadway structure
			g.roundRect(leftX, topY, bridgeW, bridgeH, 10);
			g.fill({ color: 0x78350f }); // Warm wooden deck base
			g.stroke({ color: 0x451a03, width: 3 });

			// Wooden deck horizontal cross-planks
			for (let bx = leftX + 18; bx < leftX + bridgeW - 10; bx += 24) {
				g.moveTo(bx, topY + 8);
				g.lineTo(bx, topY + bridgeH - 8);
				g.stroke({ color: 0x451a03, width: 2.5 });
			}

			// 4. Ornate Stone Parapet Balustrades (Top & Bottom)
			// Upper balustrade
			g.roundRect(leftX - 10, topY - 14, bridgeW + 20, 18, 6);
			g.fill({ color: 0x94a3b8 });
			g.stroke({ color: 0x334155, width: 2 });
			// Lower balustrade
			g.roundRect(leftX - 10, topY + bridgeH - 4, bridgeW + 20, 18, 6);
			g.fill({ color: 0x64748b });
			g.stroke({ color: 0x334155, width: 2 });

			// 5. Ornate Stone Lantern Spire Pillars at Bridge Entrances
			const lanternXCoords = [leftX + 20, centerX - 140, centerX + 140, leftX + bridgeW - 20];
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
			// BROKEN / COLLAPSED 2.5D BRIDGE
			// =====================================================================
			const stubW = bridgeW * 0.32; // Solid bridge stub on each side
			const gapW = bridgeW - stubW * 2; // Center collapsed chasm

			// A. Left Broken Stub (from leftX to leftX + stubW)
			g.roundRect(leftX + 12, topY + 20, stubW, bridgeH, 8);
			g.fill({ color: 0x000000, alpha: 0.4 });
			g.roundRect(leftX, topY, stubW, bridgeH, 8);
			g.fill({ color: 0x78350f });
			g.stroke({ color: 0x451a03, width: 3 });

			// Jagged splintered timber ends on left stub
			const leftBreakX = leftX + stubW;
			for (let ty = topY + 12; ty < topY + bridgeH - 12; ty += 18) {
				const jaggedLen = 12 + ((ty * 7) % 28);
				g.poly([leftBreakX - 6, ty, leftBreakX + jaggedLen, ty + 6, leftBreakX - 6, ty + 12]);
				g.fill({ color: 0x92400e });
				g.stroke({ color: 0x451a03, width: 1.5 });
			}

			// B. Right Broken Stub (from leftX + stubW + gapW to leftX + bridgeW)
			const rightStartX = leftX + stubW + gapW;
			g.roundRect(rightStartX + 12, topY + 20, stubW, bridgeH, 8);
			g.fill({ color: 0x000000, alpha: 0.4 });
			g.roundRect(rightStartX, topY, stubW, bridgeH, 8);
			g.fill({ color: 0x78350f });
			g.stroke({ color: 0x451a03, width: 3 });

			// Jagged splintered timber ends on right stub
			for (let ty = topY + 12; ty < topY + bridgeH - 12; ty += 18) {
				const jaggedLen = 12 + ((ty * 11) % 28);
				g.poly([rightStartX + 6, ty, rightStartX - jaggedLen, ty + 6, rightStartX + 6, ty + 12]);
				g.fill({ color: 0x92400e });
				g.stroke({ color: 0x451a03, width: 1.5 });
			}

			// C. Center Chasm: Shattered stone ruins & rushing whitewater foam
			g.ellipse(centerX, laneY, gapW / 2 + 10, bridgeH / 2 + 15);
			g.fill({ color: 0x0284c7, alpha: 0.95 });

			// Foaming rapids rushing through the broken gap
			for (let fy = topY - 15; fy <= topY + bridgeH + 15; fy += 25) {
				g.ellipse(centerX + Math.sin(fy * 0.1) * 20, fy, gapW / 2 - 10, 8);
				g.stroke({ color: 0xe0f2fe, width: 3, alpha: 0.85 });
			}

			// Submerged stone wreckage boulders in the water
			const rocks = [
				{ x: centerX - 35, y: laneY - 25, r: 20 },
				{ x: centerX + 40, y: laneY + 20, r: 24 },
				{ x: centerX, y: laneY + 45, r: 18 }
			];
			for (const r of rocks) {
				g.circle(r.x, r.y, r.r);
				g.fill({ color: 0x475569 });
				g.stroke({ color: 0x1e293b, width: 2.5 });
				// Splashing water rim
				g.circle(r.x, r.y - 4, r.r + 4);
				g.stroke({ color: 0xa5f3fc, width: 2, alpha: 0.75 });
			}

			// D. Glowing Danger Hazard Markers & Warning Runes
			// Left warning sign
			g.rect(leftBreakX - 30, laneY - 25, 20, 50);
			g.fill({ color: 0xef4444 });
			g.stroke({ color: 0xfee2e2, width: 2 });
			g.moveTo(leftBreakX - 28, laneY - 20);
			g.lineTo(leftBreakX - 12, laneY + 20);
			g.stroke({ color: 0xffffff, width: 2.5 });
			g.moveTo(leftBreakX - 12, laneY - 20);
			g.lineTo(leftBreakX - 28, laneY + 20);
			g.stroke({ color: 0xffffff, width: 2.5 });

			// Right warning sign
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

	/**
	 * Draws 2.5D courtyard ramparts with crenellations and open road portals.
	 */
	public drawBaseRamparts(g: Graphics): void {
		// West ramparts (X = 1440, W = 50, road gates at Top, Mid, Bottom)
		// Gate 1: 560..760 (Top)
		// Gate 2: 1100..1300 (Mid)
		// Gate 3: 1640..1840 (Bottom)
		this.drawVerticalWall(g, 1440, 60, 50, 500); // Top wall segment
		this.drawVerticalWall(g, 1440, 760, 50, 340); // Between Top and Mid
		this.drawVerticalWall(g, 1440, 1300, 50, 340); // Between Mid and Bottom
		this.drawVerticalWall(g, 1440, 1840, 50, ARENA_HEIGHT - 1900); // Bottom wall segment

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
