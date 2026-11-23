import type { Graphics } from 'pixi.js';
import type { Simulation } from '../engine/simulation';
import type { Castle } from '../engine/types';
import { CELL_SIZE } from '../engine/constants';
import { getBuildingVisualRank } from '../engine/gameData';
import type { SelectedEntity } from './entityRenderer';

/**
 * BuildingRenderer handles rendering of placed buildings, construction scaffolding,
 * health bars, upgrade rank gems, and multi-stage authentic castle fortresses.
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
	// 1. 2.5D SPYRO-STYLED BUILDINGS LAYER
	// =========================================================================
	public drawBuildingsLayer(
		g: Graphics,
		selectedPlacedId: string | null,
		enableFog = false,
		bounds?: { minX: number; minY: number; maxX: number; maxY: number }
	): void {
		g.clear();

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
			const isWest = b.team === 'west';
			const isSelected = selectedPlacedId === b.instanceId;

			// 1. 2.5D Drop Shadow on grass
			g.roundRect(px + 4, py + 8, CELL_SIZE, CELL_SIZE, 8);
			g.fill({ color: 0x000000, alpha: 0.35 });

			// Selection halo
			if (isSelected) {
				g.beginPath();
				g.roundRect(px - 3, py - 3, CELL_SIZE + 6, CELL_SIZE + 6, 10);
				g.stroke({ color: 0xf59e0b, width: 3.5 });
			}

			// 2. Volumetric Stone Foundation Slab (2x2 footprint)
			g.beginPath();
			g.roundRect(px, py + 4, CELL_SIZE, CELL_SIZE - 4, 6);
			g.fill({ color: 0x475569 });
			g.beginPath();
			g.roundRect(px, py, CELL_SIZE, CELL_SIZE - 4, 6);
			g.fill({ color: 0x64748b });
			g.stroke({ color: isSelected ? 0xfbbf24 : 0x334155, width: 2 });

			// Mortar cross-lines dividing the 2x2 quadrants
			const half = CELL_SIZE / 2;
			g.beginPath();
			g.moveTo(px + half, py + 2);
			g.lineTo(px + half, py + CELL_SIZE - 6);
			g.stroke({ color: 0x334155, width: 1.5, alpha: 0.6 });
			g.beginPath();
			g.moveTo(px + 2, py + half - 2);
			g.lineTo(px + CELL_SIZE - 2, py + half - 2);
			g.stroke({ color: 0x334155, width: 1.5, alpha: 0.6 });

			// 3. Steep-Pitched 2.5D Shingled Roof with Real Player/Bot Color
			const player = b.playerSlot
				? this.sim.allPlayers.find((p) => p.slot === b.playerSlot)
				: this.sim.players[b.team];
			const playerColor = player?.color?.num ?? (isWest ? 0x0042ff : 0xff0303);

			g.roundRect(px + 6, py + 5, CELL_SIZE - 12, CELL_SIZE - 14, 5);
			g.fill({ color: playerColor });
			// Roof top highlight
			g.roundRect(px + 8, py + 6, CELL_SIZE - 16, (CELL_SIZE - 14) / 2, 4);
			g.fill({ color: 0xffffff, alpha: 0.22 });

			// 4 Corner Stone Bastions with Verdigris Caps
			const cornerPositions = [
				{ x: px + 2, y: py + 2 },
				{ x: px + CELL_SIZE - 14, y: py + 2 },
				{ x: px + 2, y: py + CELL_SIZE - 16 },
				{ x: px + CELL_SIZE - 14, y: py + CELL_SIZE - 16 }
			];
			for (const cp of cornerPositions) {
				g.beginPath();
				g.roundRect(cp.x, cp.y, 12, 12, 3);
				g.fill({ color: 0x94a3b8 });
				g.stroke({ color: 0x334155, width: 1 });
				g.beginPath();
				g.circle(cp.x + 6, cp.y + 6, 4);
				g.fill({ color: 0x0f766e });
			}

			// 4. Central Tactical Dice Pip Face / Special Emblem
			// Clearly conveys building strength/tier (1..6 dice pips) and building role
			const cx = px + half;
			const cy = py + half;
			const rankInfo = getBuildingVisualRank(b.defId, b.race);
			const isUpgraded = rankInfo.isUpgrade;

			// Inset emblem panel
			g.beginPath();
			g.roundRect(cx - 13, cy - 13, 26, 26, 4);
			g.fill({ color: 0x090d16, alpha: 0.85 });
			g.stroke({
				color: isUpgraded ? 0xf59e0b : 0x475569,
				width: isUpgraded ? 2 : 1
			});

			// If upgraded building: golden chevron rank indicator above dice
			if (isUpgraded) {
				g.beginPath();
				g.moveTo(cx - 6, cy - 14);
				g.lineTo(cx, cy - 19);
				g.lineTo(cx + 6, cy - 14);
				g.stroke({ color: 0xfbbf24, width: 2 });
			}

			if (rankInfo.specialType) {
				switch (rankInfo.specialType) {
					case 'tower':
						// Stone battlements and glowing arrow slit
						g.beginPath();
						g.roundRect(cx - 6, cy - 1, 12, 8, 1);
						g.fill({ color: 0x94a3b8 });
						g.beginPath();
						g.rect(cx - 7, cy - 6, 4, 5);
						g.rect(cx + 3, cy - 6, 4, 5);
						g.fill({ color: 0x94a3b8 });
						g.beginPath();
						g.rect(cx - 1, cy + 1, 2, 4);
						g.fill({ color: 0xfef08a });
						break;
					case 'treasure':
						// Golden embossed treasure coin
						g.beginPath();
						g.circle(cx, cy, 7);
						g.fill({ color: 0xf59e0b });
						g.stroke({ color: 0xfde047, width: 1.5 });
						g.beginPath();
						g.circle(cx, cy, 3);
						g.fill({ color: 0xffffff });
						break;
					case 'repair':
						// Emerald restorative cross
						g.beginPath();
						g.roundRect(cx - 2.5, cy - 7, 5, 14, 1);
						g.roundRect(cx - 7, cy - 2.5, 14, 5, 1);
						g.fill({ color: 0x10b981 });
						break;
					case 'recycler':
					default:
						// Salvage recycling triangular nodes
						for (let a = 0; a < 3; a++) {
							const ang = a * ((Math.PI * 2) / 3) - Math.PI / 2;
							g.beginPath();
							g.circle(cx + Math.cos(ang) * 6, cy + Math.sin(ang) * 6, 2.5);
							g.fill({ color: 0x38bdf8 });
						}
						break;
				}
			} else {
				// Dice pips 1..6 representing building tier
				const pipColor = isUpgraded ? 0xfbbf24 : 0xf8fafc;
				const pipGlow = isUpgraded ? 0xfef08a : 0xffffff;
				const d = 6;
				const pipR = 2.4;

				const drawPip = (x: number, y: number) => {
					g.beginPath();
					g.circle(x, y, pipR);
					g.fill({ color: pipColor });
					g.beginPath();
					g.circle(x - 0.5, y - 0.5, 1);
					g.fill({ color: pipGlow });
				};

				switch (rankInfo.rank) {
					case 1:
						drawPip(cx, cy);
						break;
					case 2:
						drawPip(cx - d, cy - d);
						drawPip(cx + d, cy + d);
						break;
					case 3:
						drawPip(cx - d, cy - d);
						drawPip(cx, cy);
						drawPip(cx + d, cy + d);
						break;
					case 4:
						drawPip(cx - d, cy - d);
						drawPip(cx + d, cy - d);
						drawPip(cx - d, cy + d);
						drawPip(cx + d, cy + d);
						break;
					case 5:
						drawPip(cx - d, cy - d);
						drawPip(cx + d, cy - d);
						drawPip(cx, cy);
						drawPip(cx - d, cy + d);
						drawPip(cx + d, cy + d);
						break;
					case 6:
					default:
						drawPip(cx - d, cy - d);
						drawPip(cx + d, cy - d);
						drawPip(cx - d, cy);
						drawPip(cx + d, cy);
						drawPip(cx - d, cy + d);
						drawPip(cx + d, cy + d);
						break;
				}
			}

			// Arched doorway facing movement direction
			const doorX = isWest ? px + CELL_SIZE - 5 : px + 1;
			const doorY = py + half - 6;
			g.beginPath();
			g.roundRect(doorX, doorY, 4, 12, 2);
			g.fill({ color: 0x0f172a });

			// Under construction visual overlay & scaffolding
			if (b.isUnderConstruction) {
				const isGhost = (b.buildProgress || 0) === 0;
				if (isGhost) {
					g.beginPath();
					g.roundRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4, 6);
					g.fill({ color: 0x0284c7, alpha: 0.45 });
					g.stroke({ color: 0x38bdf8, width: 2, alpha: 0.85 });

					// Shift-Queue Indicator badge for queued foundations
					const worker = this.sim.players[b.team]?.worker;
					const queueIdx = worker?.buildQueue?.indexOf(b.instanceId) ?? -1;
					if (queueIdx >= 0) {
						g.beginPath();
						g.circle(px + CELL_SIZE - 12, py + 12, 7);
						g.fill({ color: 0xf59e0b });
						g.stroke({ color: 0xfef08a, width: 1.5 });
					}
				} else {
					g.beginPath();
					g.roundRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4, 6);
					g.fill({ color: 0x78350f, alpha: 0.65 });
					g.stroke({ color: 0xd97706, width: 2 });

					for (let sx = 0; sx < 2; sx++) {
						for (let sy = 0; sy < 2; sy++) {
							const qx = px + sx * half;
							const qy = py + sy * half;
							g.beginPath();
							g.moveTo(qx + 4, qy + 4);
							g.lineTo(qx + half - 4, qy + half - 4);
							g.stroke({ color: 0xfbbf24, width: 2, alpha: 0.85 });
							g.beginPath();
							g.moveTo(qx + half - 4, qy + 4);
							g.lineTo(qx + 4, qy + half - 4);
							g.stroke({ color: 0xfbbf24, width: 2, alpha: 0.85 });
						}
					}
				}

				const bProg = b.buildProgress || 0;
				const bMax = b.maxBuildProgress || 3.5;
				const progPct = Math.max(0, Math.min(1, bProg / bMax));

				const barX = px + 4;
				const barY = py - 8;
				const barW = CELL_SIZE - 8;
				const barH = 4;

				g.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 2);
				g.fill({ color: 0x090d16 });
				g.roundRect(barX, barY, barW * progPct, barH, 1.5);
				g.fill({ color: 0xf59e0b });
			} else {
				// Horizontal HP status bar across top of building
				const hpPct = Math.max(0, Math.min(1, b.hp / b.maxHp));
				const barX = px + 4;
				const barY = py - 8;
				const barW = CELL_SIZE - 8;
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
				const vBarY = py + 4;
				const vBarW = 4;
				const vBarH = CELL_SIZE - 8;

				g.roundRect(vBarX - 1, vBarY - 1, vBarW + 2, vBarH + 2, 2);
				g.fill({ color: 0x090d16 });
				if (pct > 0) {
					const fillH = Math.max(2, Math.round(vBarH * pct));
					const fillY = vBarY + vBarH - fillH; // Fills vertically upwards from bottom to top
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

	public renderAuthenticCastle(
		g: Graphics,
		castle: Castle,
		isWest: boolean,
		isSelected = false
	): void {
		const cx = castle.x;
		const cy = castle.y;
		const teamColor =
			castle.color?.num ||
			this.sim.players[castle.team]?.color?.num ||
			(isWest ? 0x0042ff : 0xff0303);

		// 1. 2.5D Drop Shadow on stone plaza
		g.beginPath();
		g.roundRect(cx - 95, cy - 118, 206, 266, 20);
		g.fill({ color: 0x000000, alpha: 0.4 });

		if (isSelected) {
			g.beginPath();
			g.roundRect(cx - 108, cy - 138, 216, 276, 22);
			g.stroke({ color: 0xfbbf24, width: 3.5, alpha: 0.9 });
		}

		// 2. Stone Foundation Courtyard
		g.beginPath();
		g.roundRect(cx - 100, cy - 130, 200, 260, 18);
		g.fill({ color: 0x57534e });
		g.stroke({ color: isSelected ? 0xf59e0b : 0x292524, width: 3 });

		// 3. Central Fortress Keep with Rounded Bastions
		const keepW = 130;
		const keepH = 170;
		g.beginPath();
		g.roundRect(cx - keepW / 2, cy - keepH / 2 + 6, keepW, keepH, 16);
		g.fill({ color: 0x44403c });
		g.beginPath();
		g.roundRect(cx - keepW / 2, cy - keepH / 2, keepW, keepH - 4, 16);
		g.fill({ color: 0x78716c });
		g.stroke({ color: 0x292524, width: 3 });

		// 4. Four Round Watchtowers with Conical Roofs & Golden Lion Spires
		const towerOffsets = [
			{ x: cx - keepW / 2 - 8, y: cy - keepH / 2 - 8 },
			{ x: cx + keepW / 2 - 24, y: cy - keepH / 2 - 8 },
			{ x: cx - keepW / 2 - 8, y: cy + keepH / 2 - 24 },
			{ x: cx + keepW / 2 - 24, y: cy + keepH / 2 - 24 }
		];

		for (const t of towerOffsets) {
			g.beginPath();
			g.circle(t.x + 18, t.y + 22, 18);
			g.fill({ color: 0x000000, alpha: 0.35 });

			g.beginPath();
			g.circle(t.x + 16, t.y + 16, 18);
			g.fill({ color: 0xa8a29e });
			g.stroke({ color: 0x292524, width: 2 });

			// Conical Roof in Royal Blue / Verdigris
			g.beginPath();
			g.circle(t.x + 16, t.y + 14, 15);
			g.fill({ color: isWest ? 0x1e3a8a : 0x991b1b });
			g.beginPath();
			g.circle(t.x + 16, t.y + 12, 10);
			g.fill({ color: isWest ? 0x2563eb : 0xdc2626 });

			// Golden spire finial
			g.beginPath();
			g.circle(t.x + 16, t.y + 8, 4);
			g.fill({ color: 0xfbbf24 });
			g.beginPath();
			g.circle(t.x + 16, t.y + 8, 2);
			g.fill({ color: 0xfef08a });
		}

		// 5. Central Grand Spire / Domed Turret
		g.beginPath();
		g.circle(cx, cy - 10, 26);
		g.fill({ color: isWest ? 0x1d4ed8 : 0xb91c1c });
		g.stroke({ color: 0x1e293b, width: 2.5 });
		g.beginPath();
		g.circle(cx, cy - 14, 16);
		g.fill({ color: isWest ? 0x3b82f6 : 0xef4444 });

		g.beginPath();
		g.circle(cx, cy - 20, 6);
		g.fill({ color: 0xfbbf24 });

		// 6. Arched Portcullis Castle Gate
		const gateDir = isWest ? 1 : -1;
		const gateX = cx + gateDir * (keepW / 2 - 14);
		g.beginPath();
		g.roundRect(gateX - 12, cy - 24, 24, 48, 8);
		g.fill({ color: 0x1c1917 });

		for (let gy = cy - 18; gy <= cy + 18; gy += 8) {
			g.beginPath();
			g.moveTo(gateX - 10, gy);
			g.lineTo(gateX + 10, gy);
			g.stroke({ color: 0x94a3b8, width: 2.5 });
		}

		// 7. Grand Heraldic Lion Banner Hanging Down
		const flagPoleX = cx;
		const flagPoleY = cy - keepH / 2 - 36;
		g.beginPath();
		g.moveTo(flagPoleX, cy - keepH / 2 + 10);
		g.lineTo(flagPoleX, flagPoleY);
		g.stroke({ color: 0xd97706, width: 3 });

		g.beginPath();
		g.poly([flagPoleX, flagPoleY, flagPoleX + 36, flagPoleY + 12, flagPoleX, flagPoleY + 24]);
		g.fill({ color: teamColor });
		g.stroke({ color: 0xfef08a, width: 1.5 });

		// Castle Health Bar
		const hpPct = Math.max(0, castle.hp / castle.maxHp);
		const barWidth = 160;
		const barHeight = 10;
		const barX = cx - barWidth / 2;
		const barY = cy - keepH / 2 - 48;

		g.beginPath();
		g.roundRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4, 3);
		g.fill({ color: 0x090d16 });
		g.beginPath();
		g.roundRect(barX, barY, barWidth * hpPct, barHeight, 2);
		g.fill({ color: hpPct > 0.5 ? 0x22c55e : hpPct > 0.25 ? 0xeab308 : 0xef4444 });

		if (hpPct < 0.6) {
			const time = this.sim.gameTime;
			for (let i = 0; i < 4; i++) {
				const smokeX = cx - 45 + i * 30 + Math.sin(time * 3 + i) * 6;
				const smokeY = cy - keepH / 2 - 8 - ((time * 25 + i * 14) % 36);
				const radius = 5 + ((time * 6 + i * 3) % 8);
				g.beginPath();
				g.circle(smokeX, smokeY, radius);
				g.fill({ color: 0x334155, alpha: 0.35 });

				if (hpPct < 0.35) {
					const fireX = cx - 35 + i * 24 + Math.cos(time * 10 + i) * 4;
					const fireY = cy - keepH / 2 + 8 - ((time * 35 + i * 8) % 18);
					g.beginPath();
					g.circle(fireX, fireY, 4.5);
					g.fill({ color: 0xf97316, alpha: 0.75 });
				}
			}
		}

		if (this.sim.castleInvulnerableTimer[castle.team] > 0) {
			g.beginPath();
			g.circle(cx, cy, 145);
			g.fill({ color: 0x06b6d4, alpha: 0.25 });
			g.stroke({ color: 0x38bdf8, width: 4, alpha: 0.85 });
		}
	}
}
