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
	type DecorationObstacle
} from '../engine/constants';

export class TerrainRenderer {
	public drawStaticTerrain(
		g: Graphics,
		brokenBridge: 'top' | 'mid' | 'bottom' | null = 'mid',
		seed = 1337,
		decorations?: DecorationObstacle[]
	): void {
		g.clear();

		// =========================================================================
		// 1. EXPANSIVE AZURE & TURQUOISE OCEAN (Fairytale Water in Spyro Aesthetic)
		// Stretches far beyond arena boundaries to prevent black void on unzoom
		// =========================================================================
		const oceanPadX = 6000;
		const oceanPadY = 4000;
		g.rect(-oceanPadX, -oceanPadY, ARENA_WIDTH + oceanPadX * 2, ARENA_HEIGHT + oceanPadY * 2);
		g.fill({ color: 0x014f86 });

		// Flowing vibrant azure & turquoise ocean currents
		for (let y = -oceanPadY; y < ARENA_HEIGHT + oceanPadY; y += 80) {
			const isBright = Math.floor((y + oceanPadY) / 80) % 2 === 0;
			g.rect(-oceanPadX, y, ARENA_WIDTH + oceanPadX * 2, 80);
			g.fill({ color: isBright ? 0x0284c7 : 0x0369a1, alpha: 0.85 });
		}

		// Organic soft water wave ripples and gentle caustics
		for (let x = -oceanPadX + 60; x < ARENA_WIDTH + oceanPadX; x += 280) {
			for (let y = -oceanPadY + 40; y < ARENA_HEIGHT + oceanPadY; y += 140) {
				const waveW = 140 + (Math.abs(x * 11 + y * 17) % 80);
				const waveOff = Math.sin(x * 0.03 + y * 0.05) * 16;
				g.ellipse(x + waveOff, y, waveW / 2, 8);
				g.fill({ color: 0x38bdf8, alpha: 0.28 });

				// Light white foam crest
				g.ellipse(x + waveOff - 12, y - 2, waveW / 4, 3);
				g.fill({ color: 0xe0f2fe, alpha: 0.45 });
			}
		}

		// =========================================================================
		// 2. TWO PROCEDURAL OVAL-ROUND FANTASY ISLANDS (West & East)
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
	}

	/**
	 * Draws a lush, organically contoured procedural oval island in Spyro fairytale aesthetic:
	 * Multi-tiered craggy cliffs, sandstone rim bevel, translucent turquoise shoreline shallows,
	 * foamy white surf, and rolling fairway green meadow hillocks.
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
		const numPoints = 84;
		const basePoly: { x: number; y: number }[] = [];

		for (let i = 0; i < numPoints; i++) {
			const a = (i / numPoints) * Math.PI * 2;
			const cosA = Math.cos(a);
			const sinA = Math.sin(a);

			// Multi-octave sinusoidal procedural noise for craggy/natural coastlines
			const noise =
				Math.sin(a * 4 + seed) * 38 +
				Math.cos(a * 7 + seed * 1.4) * 22 +
				Math.sin(a * 13 + seed * 0.7) * 12;

			let px = cx + cosA * (radiusX + noise);
			const py = cy + sinA * (radiusY + noise);

			// Bridgehead landing extensions to meet bridges at 3240 (west) or 3960 (east)
			if (isWest && cosA > 0.45) {
				const ext = Math.max(0, cosA - 0.45) * 1.8 * (BRIDGE_SPAN_MIN_X - (cx + radiusX * 0.5));
				px = Math.min(BRIDGE_SPAN_MIN_X + 24, px + ext * 0.65);
			} else if (!isWest && cosA < -0.45) {
				const ext = Math.max(0, -cosA - 0.45) * 1.8 * (cx - radiusX * 0.5 - BRIDGE_SPAN_MAX_X);
				px = Math.max(BRIDGE_SPAN_MAX_X - 24, px - ext * 0.65);
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
		g.poly(flatPoly(basePoly, 0, 10));
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

		// 5. Fairytale Meadow Surface (Continuous rich fairway green landscape)
		g.poly(flatPoly(basePoly, 0, 0));
		g.fill({ color: 0x36761f });
		g.stroke({ color: 0x285916, width: 3.5 });

		// 6. Rolling Fairytale Meadow Hillocks (Organic flowing volume mounds)
		// Upper Sunny Hillock
		g.ellipse(cx, cy - radiusY * 0.45, radiusX * 0.65, radiusY * 0.32);
		g.fill({ color: 0x479427, alpha: 0.5 });
		g.ellipse(cx, cy - radiusY * 0.48, radiusX * 0.45, radiusY * 0.2);
		g.fill({ color: 0x58a832, alpha: 0.45 });

		// Lower Sunny Hillock
		g.ellipse(cx, cy + radiusY * 0.45, radiusX * 0.68, radiusY * 0.32);
		g.fill({ color: 0x479427, alpha: 0.5 });
		g.ellipse(cx, cy + radiusY * 0.48, radiusX * 0.48, radiusY * 0.2);
		g.fill({ color: 0x58a832, alpha: 0.45 });

		// Western / Eastern Perimeter Meadow Ridge
		const ridgeX = isWest ? cx - radiusX * 0.45 : cx + radiusX * 0.45;
		g.ellipse(ridgeX, cy, radiusX * 0.35, radiusY * 0.55);
		g.fill({ color: 0x3e8423, alpha: 0.4 });
	}

	/**
	 * Draws authentic warm earth & cobblestone roadways fanning out from the centered castles
	 * towards the Top, Mid, and Bottom bridges, as well as rear courtyard gardens.
	 */
	public drawNaturalRoadNetwork(g: Graphics): void {
		const roadHeight = 150;

		// 1. West Castle Grand Stone Plaza (at island center)
		this.drawCastlePlaza(g, WEST_CASTLE_X, WEST_CASTLE_Y);

		// 2. East Castle Grand Stone Plaza (at island center)
		this.drawCastlePlaza(g, EAST_CASTLE_X, EAST_CASTLE_Y);

		// 3. West Highways fanning out to the 3 bridges & rear path
		this.drawIslandRoadFanned(g, WEST_CASTLE_X, WEST_CASTLE_Y, BRIDGE_SPAN_MIN_X, roadHeight, true);

		// 4. East Highways fanning out to the 3 bridges & rear path
		this.drawIslandRoadFanned(
			g,
			EAST_CASTLE_X,
			EAST_CASTLE_Y,
			BRIDGE_SPAN_MAX_X,
			roadHeight,
			false
		);
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
		const roadColor = 0x8a7153;
		const strokeColor = 0x4a3b2c;
		const dir = isWest ? 1 : -1;

		// 1. Middle Highway (Direct horizontal connection to Mid Bridge)
		const midStartX = isWest ? cx + 180 : bridgeEdgeX;
		const midW = Math.abs(bridgeEdgeX - (cx + dir * 180));
		g.rect(midStartX, MID_LANE_Y - roadH / 2, midW, roadH);
		g.fill({ color: roadColor });
		g.stroke({ color: strokeColor, width: 2.5 });

		// Inlaid pavers along middle highway
		for (let px = midStartX + 40; px < midStartX + midW; px += 55) {
			g.beginPath();
			g.moveTo(px, MID_LANE_Y - roadH / 2 + 4);
			g.lineTo(px, MID_LANE_Y + roadH / 2 - 4);
			g.stroke({ color: 0x5a4835, width: 2, alpha: 0.45 });
		}

		// 2. Top Highway (Angled fan-out from castle plaza to Top Bridge)
		g.poly([
			cx + dir * 80,
			cy - 160,
			bridgeEdgeX,
			TOP_LANE_Y - roadH / 2,
			bridgeEdgeX,
			TOP_LANE_Y + roadH / 2,
			cx + dir * 170,
			cy - 60
		]);
		g.fill({ color: roadColor });
		g.stroke({ color: strokeColor, width: 2.5 });

		// 3. Bottom Highway (Angled fan-out from castle plaza to Bottom Bridge)
		g.poly([
			cx + dir * 170,
			cy + 60,
			bridgeEdgeX,
			BOTTOM_LANE_Y - roadH / 2,
			bridgeEdgeX,
			BOTTOM_LANE_Y + roadH / 2,
			cx + dir * 80,
			cy + 160
		]);
		g.fill({ color: roadColor });
		g.stroke({ color: strokeColor, width: 2.5 });
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
		// Linear congruential pseudo-random generator
		let s = seed;
		const nextRand = () => {
			s = (s * 1664525 + 1013904223) % 4294967296;
			return s / 4294967296;
		};

		const numDecorations = 120;
		for (let i = 0; i < numDecorations; i++) {
			const angle = nextRand() * Math.PI * 2;
			const distNorm = 0.22 + nextRand() * 0.68; // Inside meadow, away from center plaza
			const rx = (ISLAND_RADIUS_X - 120) * distNorm;
			const ry = (ISLAND_RADIUS_Y - 90) * distNorm;

			const x = cx + Math.cos(angle) * rx;
			const y = cy + Math.sin(angle) * ry;

			// Skip if on roads or castle plaza
			const distToCastle = Math.hypot(x - cx, y - cy);
			if (distToCastle < 240) continue;

			// Skip if too close to highway lines (top 660, mid 1200, bot 1740)
			if ((isWest && x > cx - 60) || (!isWest && x < cx + 60)) {
				if (
					Math.abs(y - TOP_LANE_Y) < 100 ||
					Math.abs(y - MID_LANE_Y) < 100 ||
					Math.abs(y - BOTTOM_LANE_Y) < 100
				) {
					continue;
				}
			}

			// Deterministic category choice
			const typeIndex = Math.floor(nextRand() * 5);

			switch (typeIndex) {
				case 0:
					// 1. Fairytale Spotted Mushroom Clusters (Spyro Aesthetic)
					this.drawMushroomCluster(g, x, y, nextRand);
					break;
				case 1:
					// 2. Spyro Magic Gem Crystals (Ruby, Amethyst, Sapphire, Emerald)
					this.drawCrystalSpire(g, x, y, nextRand);
					break;
				case 2:
					// 3. Ancient Mossy Stone Monoliths & Rune Pillars
					this.drawAncientMonolith(g, x, y, nextRand);
					break;
				case 3:
					// 4. Flowering Shrubbery & Fairy Bushes
					this.drawFloweringBush(g, x, y, nextRand);
					break;
				case 4:
					// 5. Roadside Stone Braziers & Torches
					this.drawStoneBrazier(g, x, y, nextRand);
					break;
			}
		}

		// Coastal shallows water lilies & smooth river stones around the island rim
		for (let i = 0; i < 28; i++) {
			const angle = (i / 28) * Math.PI * 2;
			const lx = cx + Math.cos(angle) * (ISLAND_RADIUS_X + 25 + nextRand() * 40);
			const ly = cy + Math.sin(angle) * (ISLAND_RADIUS_Y + 25 + nextRand() * 30);
			this.drawWaterLily(g, lx, ly);
		}
	}

	private drawMushroomCluster(g: Graphics, x: number, y: number, rand: () => number): void {
		// Shadow
		g.ellipse(x + 4, y + 6, 18, 8);
		g.fill({ color: 0x000000, alpha: 0.3 });

		const colors = [0xef4444, 0xc084fc, 0x06b6d4, 0xf43f5e];
		const capCol = colors[Math.floor(rand() * colors.length)];

		// Main mushroom
		// Stem
		g.roundRect(x - 4, y - 6, 8, 16, 3);
		g.fill({ color: 0xfef08a });
		// Bulbous cap
		g.ellipse(x, y - 8, 14, 11);
		g.fill({ color: capCol });
		g.stroke({ color: 0x334155, width: 1.5 });
		// White polka dots
		g.circle(x - 5, y - 9, 2.5);
		g.fill({ color: 0xffffff });
		g.circle(x + 4, y - 7, 2);
		g.fill({ color: 0xffffff });
		g.circle(x, y - 13, 2);
		g.fill({ color: 0xffffff });

		// Small baby companion mushroom
		g.ellipse(x + 10, y - 2, 7, 6);
		g.fill({ color: capCol });
	}

	private drawCrystalSpire(g: Graphics, x: number, y: number, rand: () => number): void {
		// Crystal base rock
		g.roundRect(x - 12, y + 2, 24, 10, 4);
		g.fill({ color: 0x475569 });

		const gemColors = [0xc084fc, 0xf43f5e, 0x10b981, 0x38bdf8];
		const color = gemColors[Math.floor(rand() * gemColors.length)];

		// Tall central gemstone facet
		g.poly([x - 6, y + 4, x, y - 24, x + 6, y + 4, x, y + 8]);
		g.fill({ color, alpha: 0.9 });
		g.stroke({ color: 0xffffff, width: 1.2, alpha: 0.75 });

		// Smaller side crystals
		g.poly([x - 12, y + 4, x - 7, y - 12, x - 2, y + 4]);
		g.fill({ color, alpha: 0.8 });
		g.poly([x + 2, y + 4, x + 8, y - 15, x + 13, y + 4]);
		g.fill({ color, alpha: 0.8 });

		// Star sparkle glint
		g.circle(x - 1, y - 18, 2);
		g.fill({ color: 0xffffff });
	}

	private drawAncientMonolith(g: Graphics, x: number, y: number, _rand: () => number): void {
		// Drop shadow
		g.ellipse(x + 6, y + 8, 18, 8);
		g.fill({ color: 0x000000, alpha: 0.35 });

		// Carved weathered stone pillar
		g.roundRect(x - 10, y - 32, 20, 40, 4);
		g.fill({ color: 0x64748b });
		g.stroke({ color: 0x1e293b, width: 2 });

		// Creeping green moss
		g.circle(x - 4, y - 10, 5);
		g.fill({ color: 0x36761f, alpha: 0.85 });
		g.circle(x + 5, y - 22, 6);
		g.fill({ color: 0x36761f, alpha: 0.85 });

		// Glowing ancient rune inscription
		g.beginPath();
		g.moveTo(x, y - 26);
		g.lineTo(x, y - 14);
		g.stroke({ color: 0x38bdf8, width: 2, alpha: 0.9 });
		g.circle(x, y - 20, 3);
		g.fill({ color: 0xa5f3fc });
	}

	private drawFloweringBush(g: Graphics, x: number, y: number, rand: () => number): void {
		// Shadow
		g.circle(x + 4, y + 5, 16);
		g.fill({ color: 0x000000, alpha: 0.28 });

		// Fluffy shrub base
		g.circle(x, y, 16);
		g.fill({ color: 0x225419 });
		g.circle(x - 5, y - 4, 12);
		g.fill({ color: 0x3b8226 });
		g.circle(x + 5, y - 3, 11);
		g.fill({ color: 0x4d9e33 });

		// Blossom clusters
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
		// Brazier pedestal
		g.roundRect(x - 6, y - 10, 12, 16, 2);
		g.fill({ color: 0x475569 });
		g.rect(x - 8, y - 14, 16, 5);
		g.fill({ color: 0x334155 });

		// Magical flame
		g.circle(x, y - 18, 6);
		g.fill({ color: 0xf59e0b, alpha: 0.85 });
		g.circle(x, y - 20, 3.5);
		g.fill({ color: 0xfef08a });
	}

	private drawWaterLily(g: Graphics, x: number, y: number): void {
		// Floating lily pad
		g.ellipse(x, y, 9, 6);
		g.fill({ color: 0x15803d, alpha: 0.85 });
		// Lotus flower blossom
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
