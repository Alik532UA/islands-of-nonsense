import type { Graphics } from 'pixi.js';
import type { Simulation } from '../engine/simulation';
import type { Castle } from '../engine/types';
import { CELL_SIZE } from '../engine/constants';
import { BUILDINGS_MAP, getBuildingVisualRank, isLegendaryBuilding } from '../engine/gameData';
import type { SelectedEntity } from './entityRenderer';
import { drawIndividualBuildingModel, shadeHexColor } from './buildingModels';

/**
 * BuildingRenderer handles rendering of placed buildings via individual 2.5D Warcraft III-style
 * architectural silhouettes (delegated to buildingModels), construction scaffolding overlays,
 * status bars, and multi-stage castle fortresses.
 */
export class BuildingRenderer {
	private sim: Simulation;

	constructor(sim: Simulation) {
		this.sim = sim;
	}

	public setSimulation(newSim: Simulation): void {
		this.sim = newSim;
	}

	// =========================================================================
	// 1. 2.5D STYLIZED RTS BUILDINGS LAYER
	// =========================================================================
	public drawBuildingsLayer(
		g: Graphics,
		selectedPlacedId: string | null,
		enableFog = false,
		bounds?: { minX: number; minY: number; maxX: number; maxY: number }
	): void {
		g.clear();
		const time = this.sim.gameTime;

		for (const b of this.sim.buildings) {
			if (
				bounds &&
				(b.x + CELL_SIZE < bounds.minX - 30 ||
					b.x > bounds.maxX + 30 ||
					b.y + CELL_SIZE < bounds.minY - 30 ||
					b.y > bounds.maxY + 30)
			) {
				continue;
			}
			if (
				enableFog &&
				b.team !== 'west' &&
				!this.sim.isPointRevealed('west', b.x + CELL_SIZE / 2, b.y + CELL_SIZE / 2)
			) {
				continue;
			}

			const px = b.x;
			const py = b.y;
			const half = CELL_SIZE / 2;
			const isWest = b.team === 'west';
			const isSelected = selectedPlacedId === b.instanceId;

			const player = b.playerSlot
				? this.sim.allPlayers.find((p) => p.slot === b.playerSlot)
				: this.sim.players[b.team];
			const playerColor = player?.color?.num ?? (isWest ? 0x0042ff : 0xff0303);

			const rankInfo = getBuildingVisualRank(b.defId, b.race);
			const isUpgraded = rankInfo.isUpgrade;
			const isLegendary = isLegendaryBuilding(BUILDINGS_MAP.get(b.defId));

			// Individual 2.5D Building Silhouette (no uniform square box slab)
			drawIndividualBuildingModel(
				g,
				b,
				playerColor,
				rankInfo.rank,
				isUpgraded,
				isLegendary,
				isSelected,
				time
			);

			// Under-Construction Blueprint / Scaffolding Overlay
			if (b.isUnderConstruction) {
				const isGhost = (b.buildProgress || 0) === 0;
				if (isGhost) {
					g.beginPath();
					g.roundRect(px + 4, py + 4, CELL_SIZE - 8, CELL_SIZE - 8, 10);
					g.fill({ color: 0x0284c7, alpha: 0.42 });
					g.stroke({ color: 0x38bdf8, width: 2, alpha: 0.9 });

					const worker = this.sim.players[b.team]?.worker;
					const queueIdx = worker?.buildQueue?.indexOf(b.instanceId) ?? -1;
					if (queueIdx >= 0) {
						g.beginPath();
						g.circle(px + CELL_SIZE - 12, py + 12, 6.5);
						g.fill({ color: 0xf59e0b });
						g.stroke({ color: 0xfef08a, width: 1.5 });
					}
				} else {
					g.beginPath();
					g.roundRect(px + 5, py + 5, CELL_SIZE - 10, CELL_SIZE - 10, 8);
					g.fill({ color: 0x78350f, alpha: 0.52 });
					g.stroke({ color: 0xd97706, width: 2 });

					for (let sx = 0; sx < 2; sx++) {
						for (let sy = 0; sy < 2; sy++) {
							const qx = px + sx * half;
							const qy = py + sy * half;
							g.beginPath();
							g.moveTo(qx + 6, qy + 6);
							g.lineTo(qx + half - 6, qy + half - 6);
							g.moveTo(qx + half - 6, qy + 6);
							g.lineTo(qx + 6, qy + half - 6);
							g.stroke({ color: 0xfbbf24, width: 1.8, alpha: 0.85 });
						}
					}
				}

				const bProg = b.buildProgress || 0;
				const bMax = b.maxBuildProgress || 3.5;
				const progPct = Math.max(0, Math.min(1, bProg / bMax));

				const barX = px + 6;
				const barY = py - 9;
				const barW = CELL_SIZE - 12;
				const barH = 4;

				g.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 2);
				g.fill({ color: 0x090d16 });
				g.roundRect(barX, barY, barW * progPct, barH, 1.5);
				g.fill({ color: 0xf59e0b });
			} else {
				const hpPct = Math.max(0, Math.min(1, b.hp / b.maxHp));
				const barX = px + 6;
				const barY = py - 9;
				const barW = CELL_SIZE - 12;
				const barH = 4;

				g.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 2);
				g.fill({ color: 0x090d16 });
				if (hpPct > 0) {
					const hpColor = hpPct > 0.5 ? 0x22c55e : hpPct > 0.25 ? 0xeab308 : 0xef4444;
					g.roundRect(barX, barY, barW * hpPct, barH, 1.5);
					g.fill({ color: hpColor });
				}
			}

			// Unit spawn timer status bar: VERTICAL along right edge of building
			if (!b.isUnderConstruction && b.spawnCooldown > 0) {
				const pct = Math.max(0, Math.min(1, (b.spawnTimer || 0) / b.spawnCooldown));
				const vBarX = px + CELL_SIZE + 2;
				const vBarY = py + 6;
				const vBarW = 4;
				const vBarH = CELL_SIZE - 12;

				g.roundRect(vBarX - 1, vBarY - 1, vBarW + 2, vBarH + 2, 2);
				g.fill({ color: 0x090d16 });
				if (pct > 0) {
					const fillH = Math.max(2, Math.round(vBarH * pct));
					const fillY = vBarY + vBarH - fillH;
					g.roundRect(vBarX, fillY, vBarW, fillH, 1.5);
					g.fill({ color: 0x38bdf8 });
				}
			}
		}
	}

	// =========================================================================
	// 2. 2.5D GRAND ALLIANCE / FANTASY CASTLE (Matching reference art)
	// =========================================================================
	public drawCastles(_g: Graphics, _selectedEntity?: SelectedEntity, _enableFog = false): void {
		// Castle visuals with 8-stage progressive destruction are rendered in castlesLayer using high-res WebP sprites
	}

	private shadeHexColor(hex: number, factor: number): number {
		return shadeHexColor(hex, factor);
	}

	private drawTowerTurret(
		g: Graphics,
		tx: number,
		ty: number,
		radius: number,
		roofDark: number,
		roofMid: number,
		roofLight: number
	): void {
		// 2.5D Cast Shadow
		g.circle(tx + 5, ty + 8, radius + 2);
		g.fill({ color: 0x000000, alpha: 0.42 });

		// Base Stone Turret Drum & Beveled South Face
		g.circle(tx, ty + 4, radius + 2);
		g.fill({ color: 0x44403c });
		g.stroke({ color: 0x1c1917, width: 2 });

		g.circle(tx, ty, radius + 2);
		g.fill({ color: 0x9ca3af });
		g.stroke({ color: 0x292524, width: 2 });

		// Crenellated Stone Merlons around Turret Gallery
		for (let i = 0; i < 8; i++) {
			const a = (i / 8) * Math.PI * 2;
			const mx = tx + Math.cos(a) * (radius - 1);
			const my = ty + Math.sin(a) * (radius - 1);
			g.circle(mx, my, 3.2);
			g.fill({ color: 0xd6d3d1 });
			g.stroke({ color: 0x292524, width: 1 });
		}

		// Conical Faceted Shingled Roof (Peak shifted up-left for 2.5D depth)
		const peakX = tx - 2;
		const peakY = ty - 6;
		const roofR = radius - 3;

		g.circle(tx, ty - 1, roofR);
		g.fill({ color: roofDark });
		g.stroke({ color: 0x0f172a, width: 2 });

		// Sunlit upper-left roof facet
		g.poly([
			peakX,
			peakY,
			tx - roofR * 0.92,
			ty - 1,
			tx - roofR * 0.5,
			ty - roofR * 0.85,
			tx + roofR * 0.6,
			ty - roofR * 0.72
		]);
		g.fill({ color: roofLight, alpha: 0.9 });

		// Mid-tone lower-left facet
		g.poly([peakX, peakY, tx - roofR * 0.92, ty - 1, tx - 2, ty + roofR * 0.85, tx + 6, ty]);
		g.fill({ color: roofMid, alpha: 0.85 });

		// Radial shingle ribs
		for (let i = 0; i < 6; i++) {
			const a = (i / 6) * Math.PI * 2 + 0.3;
			g.beginPath();
			g.moveTo(peakX, peakY);
			g.lineTo(tx + Math.cos(a) * (roofR - 1), ty - 1 + Math.sin(a) * (roofR - 1));
			g.stroke({ color: 0x0f172a, width: 1.2, alpha: 0.55 });
		}

		// Golden Spire Finial
		g.circle(peakX, peakY, 4.5);
		g.fill({ color: 0xd97706 });
		g.circle(peakX - 0.5, peakY - 0.5, 2.5);
		g.fill({ color: 0xfef08a });
	}

	public renderAuthenticCastle(
		g: Graphics,
		castle: Castle,
		isWest: boolean,
		isSelected = false,
		drawHealthBar = false
	): void {
		const cx = castle.x;
		const cy = castle.y;
		const time = this.sim.gameTime;
		const teamColor =
			castle.color?.num ||
			this.sim.players[castle.team]?.color?.num ||
			(isWest ? 0x0042ff : 0xff0303);

		const roofMid = teamColor;
		const roofDark = this.shadeHexColor(teamColor, 0.52);
		const roofLight = this.shadeHexColor(teamColor, 1.32);

		const wallW = 204;
		const wallH = 260;
		const left = cx - wallW / 2;
		const top = cy - wallH / 2;
		const gateDir = isWest ? 1 : -1;

		// 1. Clean Single Ground Selection Aura (no overlapping double boxes/ellipses)
		if (isSelected) {
			const pulseAlpha = 0.72 + Math.sin(time * 5) * 0.2;
			g.roundRect(left - 10, top - 10, wallW + 20, wallH + 20, 22);
			g.fill({ color: isWest ? 0xfbbf24 : 0xf43f5e, alpha: 0.14 });
			g.stroke({ color: isWest ? 0xfbbf24 : 0xf43f5e, width: 3.5, alpha: pulseAlpha });
		}

		// 2. Deep 2.5D Citadel Drop Shadow on Stone Plaza
		g.roundRect(left + 12, top + 16, wallW, wallH, 16);
		g.fill({ color: 0x000000, alpha: 0.48 });

		// 3. Stepped Stone Foundation Skirt & Beveled Outer Curtain Wall
		g.roundRect(left - 4, top + 6, wallW + 8, wallH + 4, 16);
		g.fill({ color: 0x292524 });

		// Outer Wall Battlement Walk
		g.roundRect(left, top, wallW, wallH, 14);
		g.fill({ color: 0x6b6661 });
		g.stroke({ color: 0x1c1917, width: 3 });

		// Wall Top Lit Stone Bevel
		g.roundRect(left + 4, top + 4, wallW - 8, wallH - 12, 11);
		g.fill({ color: 0x857f79 });

		// Wall Ashlar Mortar Seams (outer wall stonework)
		for (let sy = top + 28; sy < top + wallH - 22; sy += 28) {
			g.beginPath();
			g.moveTo(left + 3, sy);
			g.lineTo(left + 18, sy);
			g.moveTo(left + wallW - 18, sy);
			g.lineTo(left + wallW - 3, sy);
			g.stroke({ color: 0x44403c, width: 1.5, alpha: 0.7 });
		}
		for (let sx = left + 28; sx < left + wallW - 22; sx += 28) {
			g.beginPath();
			g.moveTo(sx, top + 3);
			g.lineTo(sx, top + 18);
			g.moveTo(sx, top + wallH - 20);
			g.lineTo(sx, top + wallH - 4);
			g.stroke({ color: 0x44403c, width: 1.5, alpha: 0.7 });
		}

		// 4. Recessed Inner Bailey Courtyard
		const baileyW = wallW - 36;
		const baileyH = wallH - 40;
		g.roundRect(cx - baileyW / 2, cy - baileyH / 2, baileyW, baileyH, 8);
		g.fill({ color: 0x3f3a36 });
		g.stroke({ color: 0x292524, width: 2.5 });

		// Inner Courtyard Stone Paving Grid
		for (let bx = cx - baileyW / 2 + 16; bx < cx + baileyW / 2 - 8; bx += 22) {
			g.beginPath();
			g.moveTo(bx, cy - baileyH / 2 + 2);
			g.lineTo(bx, cy + baileyH / 2 - 2);
			g.stroke({ color: 0x292524, width: 1, alpha: 0.55 });
		}
		for (let by = cy - baileyH / 2 + 16; by < cy + baileyH / 2 - 8; by += 22) {
			g.beginPath();
			g.moveTo(cx - baileyW / 2 + 2, by);
			g.lineTo(cx + baileyW / 2 - 2, by);
			g.stroke({ color: 0x292524, width: 1, alpha: 0.55 });
		}

		// 5. Stone Merlons (Battlements) along Curtain Wall Parapets
		for (let mx = left + 26; mx <= left + wallW - 36; mx += 22) {
			// North & South battlements
			g.rect(mx, top - 2, 11, 7);
			g.fill({ color: 0xa8a29e });
			g.stroke({ color: 0x292524, width: 1.2 });

			g.rect(mx, top + wallH - 7, 11, 7);
			g.fill({ color: 0x78716c });
			g.stroke({ color: 0x1c1917, width: 1.2 });
		}
		for (let my = top + 30; my <= top + wallH - 40; my += 24) {
			// Skip gate opening side near center
			const onGateSideWest = !isWest && Math.abs(my - cy) < 34;
			const onGateSideEast = isWest && Math.abs(my - cy) < 34;
			if (!onGateSideWest) {
				g.rect(left - 2, my, 7, 12);
				g.fill({ color: 0x9ca3af });
				g.stroke({ color: 0x292524, width: 1.2 });
			}
			if (!onGateSideEast) {
				g.rect(left + wallW - 5, my, 7, 12);
				g.fill({ color: 0x78716c });
				g.stroke({ color: 0x1c1917, width: 1.2 });
			}
		}

		// 6. Fortified Twin-Bastion Gatehouse & Lowered Drawbridge Causeway (Facing Lanes)
		const gateCenterX = cx + gateDir * (wallW / 2 - 2);
		const bridgeOutX = gateDir > 0 ? gateCenterX - 10 : gateCenterX - 38;
		// Drawbridge oak deck leading out onto plaza
		g.roundRect(bridgeOutX, cy - 26, 48, 52, 4);
		g.fill({ color: 0x78350f });
		g.stroke({ color: 0x451a03, width: 2.5 });
		for (let px = bridgeOutX + 8; px < bridgeOutX + 44; px += 8) {
			g.beginPath();
			g.moveTo(px, cy - 24);
			g.lineTo(px, cy + 24);
			g.stroke({ color: 0x451a03, width: 1.5 });
		}
		// Iron drawbridge chains & portcullis arch
		g.roundRect(gateCenterX - 11, cy - 24, 22, 48, 6);
		g.fill({ color: 0x181310 });
		g.stroke({ color: 0x44403c, width: 2 });
		for (let gy = cy - 18; gy <= cy + 18; gy += 9) {
			g.beginPath();
			g.moveTo(gateCenterX - 9, gy);
			g.lineTo(gateCenterX + 9, gy);
			g.stroke({ color: 0x94a3b8, width: 2 });
		}
		// Twin stone flanking gate bastions + warm gatehouse torches
		for (const gy of [cy - 34, cy + 34]) {
			g.roundRect(gateCenterX - 14, gy - 11, 28, 22, 6);
			g.fill({ color: 0x9ca3af });
			g.stroke({ color: 0x292524, width: 2 });
			g.circle(gateCenterX + gateDir * 4, gy, 5.5);
			g.fill({ color: 0xf97316 });
			g.circle(gateCenterX + gateDir * 4, gy, 2.8);
			g.fill({ color: 0xfef08a });
		}

		// 7. Central Elevated Royal Great Keep with Pitched Faceted Roof
		const keepW = 114;
		const keepH = 152;
		const keepLeft = cx - keepW / 2;
		const keepTop = cy - keepH / 2;

		// Keep Drop Shadow in Courtyard
		g.roundRect(keepLeft + 7, keepTop + 10, keepW, keepH, 10);
		g.fill({ color: 0x000000, alpha: 0.45 });

		// Keep Stone Walls (Dark South Face + Mid Stone Upper Trim)
		g.roundRect(keepLeft, keepTop + 4, keepW, keepH, 10);
		g.fill({ color: 0x57534e });
		g.stroke({ color: 0x1c1917, width: 2.5 });
		g.roundRect(keepLeft, keepTop, keepW, keepH - 6, 10);
		g.fill({ color: 0x78716c });
		g.stroke({ color: 0x292524, width: 2 });

		// Corner Stone Buttresses on Keep
		for (const [bx, by] of [
			[keepLeft - 3, keepTop + 12],
			[keepLeft + keepW - 7, keepTop + 12],
			[keepLeft - 3, keepTop + keepH - 28],
			[keepLeft + keepW - 7, keepTop + keepH - 28]
		]) {
			g.roundRect(bx, by, 10, 16, 2);
			g.fill({ color: 0xa8a29e });
			g.stroke({ color: 0x292524, width: 1.5 });
		}

		// Warm Lit Gothic Windows along Keep Flanks
		for (const wy of [cy - 42, cy + 32]) {
			for (const wx of [keepLeft + 8, keepLeft + keepW - 14]) {
				g.roundRect(wx, wy, 6, 12, 2);
				g.fill({ color: 0xfbbf24 });
				g.rect(wx + 1.5, wy + 2, 3, 7);
				g.fill({ color: 0xfef9c3 });
			}
		}

		// Pitched 2.5D Citadel Roof inside Keep
		const roofPad = 10;
		const rLeft = keepLeft + roofPad;
		const rRight = keepLeft + keepW - roofPad;
		const rTop = keepTop + roofPad;
		const rBot = keepTop + keepH - roofPad - 6;

		// Shaded right/bottom slope
		g.roundRect(rLeft, rTop, rRight - rLeft, rBot - rTop, 6);
		g.fill({ color: roofDark });
		g.stroke({ color: 0x0f172a, width: 2 });

		// Sunlit left roof facet
		g.poly([rLeft, rTop, cx, rTop + 12, cx, rBot - 12, rLeft, rBot]);
		g.fill({ color: roofLight, alpha: 0.9 });

		// Top/Bottom hip facets
		g.poly([rLeft, rTop, rRight, rTop, cx, rTop + 12]);
		g.fill({ color: roofMid });
		g.poly([rLeft, rBot, rRight, rBot, cx, rBot - 12]);
		g.fill({ color: roofDark });

		// Horizontal tile ribs across pitched roof
		for (let ry = rTop + 18; ry < rBot - 14; ry += 14) {
			g.beginPath();
			g.moveTo(rLeft + 4, ry);
			g.lineTo(rRight - 4, ry);
			g.stroke({ color: 0x0f172a, width: 1.2, alpha: 0.45 });
		}

		// Golden Ridge Beam
		g.beginPath();
		g.moveTo(cx, rTop + 12);
		g.lineTo(cx, rBot - 12);
		g.stroke({ color: 0xf59e0b, width: 3.5 });

		// 8. Central Crown Spire Turret
		this.drawTowerTurret(g, cx, cy - 4, 24, roofDark, roofMid, roofLight);

		// 9. Four Layered Corner Watchtowers
		const towerCoords = [
			{ x: left + 12, y: top + 12 },
			{ x: left + wallW - 12, y: top + 12 },
			{ x: left + 12, y: top + wallH - 12 },
			{ x: left + wallW - 12, y: top + wallH - 12 }
		];
		for (const t of towerCoords) {
			this.drawTowerTurret(g, t.x, t.y, 19, roofDark, roofMid, roofLight);
		}

		// 10. Animated Royal Heraldic War Banner on High Spire
		const poleX = cx;
		const poleBaseY = cy - 10;
		const poleTopY = keepTop - 36;
		const wave = Math.sin(time * 3.8 + (isWest ? 0 : 1.7)) * 3.5;

		g.beginPath();
		g.moveTo(poleX, poleBaseY);
		g.lineTo(poleX, poleTopY);
		g.stroke({ color: 0xd97706, width: 3 });

		g.circle(poleX, poleTopY - 2, 3.5);
		g.fill({ color: 0xfef08a });

		// Swallowtail Heraldic Banner
		g.poly([
			poleX,
			poleTopY,
			poleX + 42,
			poleTopY + 5 + wave,
			poleX + 32,
			poleTopY + 13 + wave * 0.6,
			poleX + 42,
			poleTopY + 21 + wave,
			poleX,
			poleTopY + 24
		]);
		g.fill({ color: teamColor });
		g.stroke({ color: 0xfde047, width: 1.5 });

		// Heraldic diamond crest on banner
		g.poly([
			poleX + 10,
			poleTopY + 12 + wave * 0.25,
			poleX + 16,
			poleTopY + 8 + wave * 0.25,
			poleX + 22,
			poleTopY + 12 + wave * 0.25,
			poleX + 16,
			poleTopY + 16 + wave * 0.25
		]);
		g.fill({ color: 0xfef08a });

		// Castle Health Bar (only when standalone)
		const hpPct = Math.max(0, castle.hp / castle.maxHp);
		if (drawHealthBar) {
			const barWidth = 160;
			const barHeight = 10;
			const barX = cx - barWidth / 2;
			const barY = top - 32;

			g.roundRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4, 3);
			g.fill({ color: 0x090d16 });
			g.roundRect(barX, barY, barWidth * hpPct, barHeight, 2);
			g.fill({ color: hpPct > 0.5 ? 0x22c55e : hpPct > 0.25 ? 0xeab308 : 0xef4444 });
		}

		// Progressive Structural Cracks, Smoke & Embers when Damaged
		if (hpPct < 0.75) {
			// Masonry fracture lines across curtain walls & keep
			g.beginPath();
			g.moveTo(cx - 58, keepTop + 26);
			g.lineTo(cx - 42, keepTop + 42);
			g.lineTo(cx - 52, keepTop + 58);
			g.moveTo(cx + 46, cy + 16);
			g.lineTo(cx + 32, cy + 34);
			g.lineTo(cx + 44, cy + 52);
			g.stroke({ color: 0x1c1917, width: 2.5, alpha: 0.85 });
		}

		if (hpPct < 0.6) {
			for (let i = 0; i < 4; i++) {
				const smokeX = cx - 45 + i * 30 + Math.sin(time * 3 + i) * 6;
				const smokeY = keepTop - 8 - ((time * 25 + i * 14) % 36);
				const radius = 5 + ((time * 6 + i * 3) % 8);
				g.circle(smokeX, smokeY, radius);
				g.fill({ color: 0x334155, alpha: 0.35 });

				if (hpPct < 0.35) {
					const fireX = cx - 35 + i * 24 + Math.cos(time * 10 + i) * 4;
					const fireY = keepTop + 8 - ((time * 35 + i * 8) % 18);
					g.circle(fireX, fireY, 4.5);
					g.fill({ color: 0xf97316, alpha: 0.75 });
				}
			}
		}

		if (this.sim.castleInvulnerableTimer[castle.team] > 0) {
			g.circle(cx, cy, 152);
			g.fill({ color: 0x06b6d4, alpha: 0.25 });
			g.stroke({ color: 0x38bdf8, width: 4, alpha: 0.85 });
		}
	}
}
