import type { Graphics } from 'pixi.js';
import type { Simulation } from '../engine/simulation';
import type { Castle, MatchTeam } from '../engine/types';
import { computeSpawnProgressRatio } from '../engine/buildingSystem';
import { CELL_SIZE } from '../engine/constants';
import {
	BUILDINGS_MAP,
	getBuildingVisualRank,
	isLegendaryBuilding,
	resolveBuildingDisplayRace
} from '../engine/gameData';
import type { SelectedEntity } from './entityRenderer';
import {
	computeSunShadow,
	drawIndividualBuildingModel,
	getRacePalette,
	shadeHexColor,
	type SunShadowOffset
} from './buildingModels';
import { rc, rr, ci, pg, ln } from './gfx';

/**
 * BuildingRenderer handles rendering of placed buildings, construction scaffolding,
 * status bars, and fallback 2.5D castle fortresses.
 */
export class BuildingRenderer {
	private sim: Simulation;

	constructor(sim: Simulation) {
		this.sim = sim;
	}

	public setSimulation(newSim: Simulation): void {
		this.sim = newSim;
	}

	public drawBuildingsLayer(
		g: Graphics,
		selectedPlacedId: string | null,
		enableFog = false,
		bounds?: { minX: number; minY: number; maxX: number; maxY: number },
		viewerTeam: MatchTeam = 'west'
	): void {
		g.clear();
		const time = this.sim.gameTime;
		const sunShadow = computeSunShadow(this.sim.dayNightProgress);

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
				b.team !== viewerTeam &&
				!this.sim.isPointRevealed(viewerTeam, b.x + CELL_SIZE / 2, b.y + CELL_SIZE / 2)
			) {
				continue;
			}

			const px = b.x;
			const py = b.y;
			const half = CELL_SIZE / 2;
			const isWest = b.team === 'west';
			const isSelected = selectedPlacedId === b.instanceId;

			const player =
				(b.playerId && this.sim.allPlayers.find((p) => p.id === b.playerId)) ||
				(b.playerSlot ? this.sim.allPlayers.find((p) => p.slot === b.playerSlot) : undefined) ||
				this.sim.players[b.team];
			const playerColor = player?.color?.num ?? (isWest ? 0x0042ff : 0xff0303);
			const resolvedRace = resolveBuildingDisplayRace(b, this.sim.allPlayers, this.sim.players);
			const renderBuilding = b.race === resolvedRace ? b : { ...b, race: resolvedRace };
			const rankInfo = getBuildingVisualRank(b.defId, resolvedRace);

			drawIndividualBuildingModel(
				g,
				renderBuilding,
				playerColor,
				rankInfo.rank,
				rankInfo.isUpgrade,
				isLegendaryBuilding(BUILDINGS_MAP.get(b.defId)),
				isSelected,
				time,
				sunShadow
			);

			const barX = px + 6;
			const barY = py - 9;
			const barW = CELL_SIZE - 12;
			const barH = 4;

			if (b.isUnderConstruction) {
				if ((b.buildProgress || 0) === 0) {
					rr(
						g,
						px + 4,
						py + 4,
						CELL_SIZE - 8,
						CELL_SIZE - 8,
						10,
						{ color: 0x0284c7, alpha: 0.42 },
						{ color: 0x38bdf8, width: 2, alpha: 0.9 }
					);
					const worker = this.sim.players[b.team]?.worker;
					if ((worker?.buildQueue?.indexOf(b.instanceId) ?? -1) >= 0) {
						ci(g, px + CELL_SIZE - 12, py + 12, 6.5, 0xf59e0b, { color: 0xfef08a, width: 1.5 });
					}
				} else {
					rr(
						g,
						px + 5,
						py + 5,
						CELL_SIZE - 10,
						CELL_SIZE - 10,
						8,
						{ color: 0x78350f, alpha: 0.52 },
						{ color: 0xd97706, width: 2 }
					);
					for (let sx = 0; sx < 2; sx++) {
						for (let sy = 0; sy < 2; sy++) {
							const qx = px + sx * half;
							const qy = py + sy * half;
							ln(g, [qx + 6, qy + 6, qx + half - 6, qy + half - 6], 0xfbbf24, 1.8, 0.85);
							ln(g, [qx + half - 6, qy + 6, qx + 6, qy + half - 6], 0xfbbf24, 1.8, 0.85);
						}
					}
				}
				const progPct = Math.max(
					0,
					Math.min(1, (b.buildProgress || 0) / (b.maxBuildProgress || 3.5))
				);
				rr(g, barX - 1, barY - 1, barW + 2, barH + 2, 2, 0x090d16);
				rr(g, barX, barY, barW * progPct, barH, 1.5, 0xf59e0b);
			} else {
				const hpPct = Math.max(0, Math.min(1, b.hp / b.maxHp));
				rr(g, barX - 1, barY - 1, barW + 2, barH + 2, 2, 0x090d16);
				if (hpPct > 0) {
					rr(
						g,
						barX,
						barY,
						barW * hpPct,
						barH,
						1.5,
						hpPct > 0.5 ? 0x22c55e : hpPct > 0.25 ? 0xeab308 : 0xef4444
					);
				}
			}

			if (!b.isUnderConstruction && b.spawnCooldown > 0) {
				const pct = computeSpawnProgressRatio(b.spawnTimer, b.spawnCooldown);
				const vX = px + CELL_SIZE + 2;
				const vY = py + 6;
				const vH = CELL_SIZE - 12;
				rr(g, vX - 1, vY - 1, 6, vH + 2, 2, 0x090d16);
				if (pct > 0) {
					const fillH = Math.max(2, Math.round(vH * pct));
					rr(g, vX, vY + vH - fillH, 4, fillH, 1.5, 0x38bdf8);
				}
			}
		}
	}

	public drawCastles(_g: Graphics, _selectedEntity?: SelectedEntity, _enableFog = false): void {}

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
		roofLight: number,
		sunShadow: SunShadowOffset
	): void {
		ci(
			g,
			tx + sunShadow.dx * 0.7,
			ty + sunShadow.dy * 0.85,
			radius + 2,
			0x000000,
			undefined,
			sunShadow.alpha
		);
		ci(g, tx, ty + 4, radius + 2, 0x44403c, { color: 0x1c1917, width: 2 });
		ci(g, tx, ty, radius + 2, 0x9ca3af, { color: 0x292524, width: 2 });

		for (let i = 0; i < 8; i++) {
			const a = (i / 8) * Math.PI * 2;
			ci(g, tx + Math.cos(a) * (radius - 1), ty + Math.sin(a) * (radius - 1), 3.2, 0xd6d3d1, {
				color: 0x292524,
				width: 1
			});
		}

		const peakX = tx - 2;
		const peakY = ty - 6;
		const roofR = radius - 3;
		ci(g, tx, ty - 1, roofR, roofDark, { color: 0x0f172a, width: 2 });
		pg(
			g,
			[
				peakX,
				peakY,
				tx - roofR * 0.92,
				ty - 1,
				tx - roofR * 0.5,
				ty - roofR * 0.85,
				tx + roofR * 0.6,
				ty - roofR * 0.72
			],
			roofLight,
			undefined,
			0.9
		);
		pg(
			g,
			[peakX, peakY, tx - roofR * 0.92, ty - 1, tx - 2, ty + roofR * 0.85, tx + 6, ty],
			roofMid,
			undefined,
			0.85
		);

		for (let i = 0; i < 6; i++) {
			const a = (i / 6) * Math.PI * 2 + 0.3;
			ln(
				g,
				[peakX, peakY, tx + Math.cos(a) * (roofR - 1), ty - 1 + Math.sin(a) * (roofR - 1)],
				0x0f172a,
				1.2,
				0.55
			);
		}
		ci(g, peakX, peakY, 4.5, 0xd97706);
		ci(g, peakX - 0.5, peakY - 0.5, 2.5, 0xfef08a);
	}

	public renderAuthenticCastle(
		g: Graphics,
		castle: Castle,
		isWest: boolean,
		isSelected = false,
		drawHealthBar = false,
		race?: string
	): void {
		const cx = castle.x;
		const cy = castle.y;
		const time = this.sim.gameTime;
		const sunShadow = computeSunShadow(this.sim.dayNightProgress);
		const pal = race ? getRacePalette(race) : null;
		const teamColor =
			castle.color?.num ||
			this.sim.players[castle.team]?.color?.num ||
			(isWest ? 0x0042ff : 0xff0303);

		const roofMid = pal ? pal.accent : teamColor;
		const roofDark = this.shadeHexColor(roofMid, 0.52);
		const roofLight = this.shadeHexColor(roofMid, 1.32);

		const style = pal?.style ?? 'Альянс';
		const wallW = 204;
		const wallH = 260;
		const left = cx - wallW / 2;
		const top = cy - wallH / 2;
		const gateDir = isWest ? 1 : -1;

		// Зовнішній рів / аура раси
		if (style === 'Наги') {
			rr(g, left - 12, top - 12, wallW + 24, wallH + 24, 24, 0x0c4a6e, {
				color: 0x22d3ee,
				width: 2.5
			});
		} else if (style === 'Демони') {
			rr(g, left - 10, top - 10, wallW + 20, wallH + 20, 20, 0x7c2d12, {
				color: 0xf97316,
				width: 2.2
			});
		} else if (style === 'Нежить') {
			rr(g, left - 9, top - 9, wallW + 18, wallH + 18, 18, 0x052e16, {
				color: 0x22c55e,
				width: 1.8
			});
		} else if (style === 'Елементалі') {
			ci(g, cx, cy, 134, 0x0f172a, { color: 0x38bdf8, width: 2 }, 0.65);
		}
		if (isSelected) {
			const col = isWest ? 0xfbbf24 : 0xf43f5e;
			rr(
				g,
				left - 10,
				top - 10,
				wallW + 20,
				wallH + 20,
				22,
				{ color: col, alpha: 0.14 },
				{ color: col, width: 3.5, alpha: 0.72 + Math.sin(time * 5) * 0.2 }
			);
		}

		rr(
			g,
			left + sunShadow.dx * 1.65,
			top + sunShadow.dy * 1.75,
			wallW,
			wallH,
			16,
			0x000000,
			undefined,
			Math.min(0.52, sunShadow.alpha + 0.05)
		);

		const wallRadius =
			style === 'Ельфи' || style === 'Наги'
				? 28
				: style === 'Орки' || style === 'Тварини'
					? 22
					: 14;
		rr(g, left - 4, top + 6, wallW + 8, wallH + 4, wallRadius + 2, 0x292524);
		rr(g, left, top, wallW, wallH, wallRadius, pal ? pal.wallDark : 0x6b6661, {
			color: pal ? pal.wallTrim : 0x1c1917,
			width: 3
		});
		rr(
			g,
			left + 4,
			top + 4,
			wallW - 8,
			wallH - 12,
			Math.max(8, wallRadius - 3),
			pal ? pal.wall : 0x857f79
		);

		// Характерні деталі стін
		if (style === 'Орки' || style === 'Тварини') {
			// Частокіл / гострі кілки по периметру
			for (let sx = left + 18; sx < left + wallW - 14; sx += 16) {
				pg(g, [sx - 4, top + 2, sx, top - 9, sx + 4, top + 2], 0x92400e, {
					color: 0x451a03,
					width: 1.2
				});
				pg(g, [sx - 4, top + wallH - 2, sx, top + wallH + 8, sx + 4, top + wallH - 2], 0x78350f, {
					color: 0x451a03,
					width: 1.2
				});
			}
		} else if (style === 'Техніки') {
			// Заклепки та мідні труби
			for (let sy = top + 28; sy < top + wallH - 22; sy += 28) {
				ln(g, [left + 5, sy, left + 16, sy], 0xd97706, 2.2, 0.85);
				ln(g, [left + wallW - 16, sy, left + wallW - 5, sy], 0xd97706, 2.2, 0.85);
			}
		} else {
			for (let sy = top + 28; sy < top + wallH - 22; sy += 28) {
				ln(g, [left + 3, sy, left + 18, sy], 0x44403c, 1.5, 0.7);
				ln(g, [left + wallW - 18, sy, left + wallW - 3, sy], 0x44403c, 1.5, 0.7);
			}
			for (let sx = left + 28; sx < left + wallW - 22; sx += 28) {
				ln(g, [sx, top + 3, sx, top + 18], 0x44403c, 1.5, 0.7);
				ln(g, [sx, top + wallH - 20, sx, top + wallH - 4], 0x44403c, 1.5, 0.7);
			}
		}

		// Двір фортеці (унікальна підлога для рас)
		const baileyW = wallW - 36;
		const baileyH = wallH - 40;
		const baileyFill =
			style === 'Ельфи'
				? 0x14532d
				: style === 'Північ'
					? 0x1e3a5f
					: style === 'Нежить'
						? 0x1e1b2e
						: style === 'Демони'
							? 0x2b1212
							: style === 'Небожителі'
								? 0x475569
								: style === 'Наги'
									? 0x0f3d4c
									: 0x3f3a36;
		rr(g, cx - baileyW / 2, cy - baileyH / 2, baileyW, baileyH, 10, baileyFill, {
			color: 0x1c1917,
			width: 2.5
		});
		if (style === 'Елементалі') {
			// Енергетичні лінії від центру до 4 кутів стихій
			const elCols = [0x4ade80, 0xf97316, 0x38bdf8, 0xa855f7];
			const corners: Array<[number, number]> = [
				[left + 12, top + 12],
				[left + wallW - 12, top + 12],
				[left + 12, top + wallH - 12],
				[left + wallW - 12, top + wallH - 12]
			];
			corners.forEach(([tx, ty], i) => ln(g, [cx, cy, tx, ty], elCols[i], 2.2, 0.6));
		} else {
			for (let bx = cx - baileyW / 2 + 16; bx < cx + baileyW / 2 - 8; bx += 22) {
				ln(g, [bx, cy - baileyH / 2 + 2, bx, cy + baileyH / 2 - 2], 0x1c1917, 1, 0.45);
			}
			for (let by = cy - baileyH / 2 + 16; by < cy + baileyH / 2 - 8; by += 22) {
				ln(g, [cx - baileyW / 2 + 2, by, cx + baileyW / 2 - 2, by], 0x1c1917, 1, 0.45);
			}
		}

		// Зубці стін (для кам'яних/класичних фортець)
		if (style !== 'Орки' && style !== 'Тварини' && style !== 'Ельфи') {
			const merlonCol = pal ? pal.wallTrim : 0xa8a29e;
			for (let mx = left + 26; mx <= left + wallW - 36; mx += 22) {
				rc(g, mx, top - 2, 11, 7, merlonCol, { color: 0x1c1917, width: 1.2 });
				rc(g, mx, top + wallH - 7, 11, 7, merlonCol, { color: 0x1c1917, width: 1.2 });
			}
			for (let my = top + 30; my <= top + wallH - 40; my += 24) {
				if (isWest || Math.abs(my - cy) >= 34)
					rc(g, left - 2, my, 7, 12, merlonCol, { color: 0x1c1917, width: 1.2 });
				if (!isWest || Math.abs(my - cy) >= 34)
					rc(g, left + wallW - 5, my, 7, 12, merlonCol, { color: 0x1c1917, width: 1.2 });
			}
		}

		// Ворота та міст
		const gateCx = cx + gateDir * (wallW / 2 - 2);
		const bridgeOutX = gateDir > 0 ? gateCx - 10 : gateCx - 38;
		const bridgeCol = style === 'Техніки' ? 0x475569 : style === 'Небожителі' ? 0xe2e8f0 : 0x78350f;
		rr(g, bridgeOutX, cy - 26, 48, 52, 4, bridgeCol, { color: 0x1c1917, width: 2.5 });
		for (let px = bridgeOutX + 8; px < bridgeOutX + 44; px += 8)
			ln(g, [px, cy - 24, px, cy + 24], 0x1c1917, 1.5, 0.7);
		rr(g, gateCx - 11, cy - 24, 22, 48, 6, 0x181310, { color: 0x44403c, width: 2 });
		for (let gy = cy - 18; gy <= cy + 18; gy += 9)
			ln(g, [gateCx - 9, gy, gateCx + 9, gy], 0x94a3b8, 2);

		const torchCol =
			style === 'Нежить'
				? 0x22c55e
				: style === 'Північ'
					? 0x38bdf8
					: style === 'Наги'
						? 0x2dd4bf
						: 0xf97316;
		for (const gy of [cy - 34, cy + 34]) {
			rr(g, gateCx - 14, gy - 11, 28, 22, 6, 0x9ca3af, { color: 0x292524, width: 2 });
			ci(g, gateCx + gateDir * 4, gy, 5.5, torchCol);
			ci(g, gateCx + gateDir * 4, gy, 2.8, 0xfef08a);
		}

		// Унікальна центральна цитадель раси
		const keepW = 114;
		const keepH = 152;
		const keepLeft = cx - keepW / 2;
		const keepTop = cy - keepH / 2;
		this.drawRaceCastleKeep(
			g,
			cx,
			cy,
			keepLeft,
			keepTop,
			keepW,
			keepH,
			style,
			roofDark,
			roofMid,
			roofLight,
			sunShadow,
			time
		);

		// 4 унікальні кутові вежі раси
		const cornerCoords: Array<[number, number]> = [
			[left + 12, top + 12],
			[left + wallW - 12, top + 12],
			[left + 12, top + wallH - 12],
			[left + wallW - 12, top + wallH - 12]
		];
		cornerCoords.forEach(([tx, ty], idx) => {
			this.drawRaceCornerTower(g, tx, ty, idx, style, roofDark, roofMid, roofLight, sunShadow);
		});

		const poleTopY = keepTop - 36;
		const wave = Math.sin(time * 3.8 + (isWest ? 0 : 1.7)) * 3.5;
		ln(g, [cx, cy - 10, cx, poleTopY], 0xd97706, 3);
		ci(g, cx, poleTopY - 2, 3.5, 0xfef08a);
		pg(
			g,
			[
				cx,
				poleTopY,
				cx + 42,
				poleTopY + 5 + wave,
				cx + 32,
				poleTopY + 13 + wave * 0.6,
				cx + 42,
				poleTopY + 21 + wave,
				cx,
				poleTopY + 24
			],
			teamColor,
			{ color: 0xfde047, width: 1.5 }
		);
		pg(
			g,
			[
				cx + 10,
				poleTopY + 12 + wave * 0.25,
				cx + 16,
				poleTopY + 8 + wave * 0.25,
				cx + 22,
				poleTopY + 12 + wave * 0.25,
				cx + 16,
				poleTopY + 16 + wave * 0.25
			],
			0xfef08a
		);

		const hpPct = Math.max(0, castle.hp / castle.maxHp);
		if (drawHealthBar) {
			const bX = cx - 80;
			const bY = top - 32;
			rr(g, bX - 2, bY - 2, 164, 14, 3, 0x090d16);
			rr(
				g,
				bX,
				bY,
				160 * hpPct,
				10,
				2,
				hpPct > 0.5 ? 0x22c55e : hpPct > 0.25 ? 0xeab308 : 0xef4444
			);
		}
		if (hpPct < 0.75) {
			ln(
				g,
				[cx - 58, keepTop + 26, cx - 42, keepTop + 42, cx - 52, keepTop + 58],
				0x1c1917,
				2.5,
				0.85
			);
			ln(g, [cx + 46, cy + 16, cx + 32, cy + 34, cx + 44, cy + 52], 0x1c1917, 2.5, 0.85);
		}
		if (hpPct < 0.6) {
			for (let i = 0; i < 4; i++) {
				ci(
					g,
					cx - 45 + i * 30 + Math.sin(time * 3 + i) * 6,
					keepTop - 8 - ((time * 25 + i * 14) % 36),
					5 + ((time * 6 + i * 3) % 8),
					0x334155,
					undefined,
					0.35
				);
				if (hpPct < 0.35) {
					ci(
						g,
						cx - 35 + i * 24 + Math.cos(time * 10 + i) * 4,
						keepTop + 8 - ((time * 35 + i * 8) % 18),
						4.5,
						0xf97316,
						undefined,
						0.75
					);
				}
			}
		}
		if (this.sim.castleInvulnerableTimer[castle.team] > 0) {
			ci(
				g,
				cx,
				cy,
				152,
				{ color: 0x06b6d4, alpha: 0.25 },
				{ color: 0x38bdf8, width: 4, alpha: 0.85 }
			);
		}
	}

	private drawRaceCastleKeep(
		g: Graphics,
		cx: number,
		cy: number,
		keepLeft: number,
		keepTop: number,
		keepW: number,
		keepH: number,
		style: string,
		roofDark: number,
		roofMid: number,
		roofLight: number,
		sunShadow: { dx: number; dy: number; alpha: number },
		time: number
	): void {
		rr(g, keepLeft + 7, keepTop + 10, keepW, keepH, 10, 0x000000, undefined, 0.45);

		if (style === 'Нежить') {
			// Готичний Зікурат + Храм Кісток з некро-кристалом
			rr(g, keepLeft, keepTop + 4, keepW, keepH, 8, 0x1e1b2e, { color: 0x22c55e, width: 2 });
			rr(g, keepLeft + 10, keepTop + 12, keepW - 20, keepH - 22, 6, 0x312e81, {
				color: 0x0f172a,
				width: 2
			});
			rr(g, keepLeft + 22, keepTop + 26, keepW - 44, keepH - 50, 4, 0x1f2937, {
				color: 0x4ade80,
				width: 1.5
			});
			// Кістяні ребра по боках
			for (let ry = keepTop + 34; ry <= keepTop + keepH - 42; ry += 18) {
				ln(g, [keepLeft + 12, ry, keepLeft + 26, ry - 4], 0xe2e8f0, 2.5);
				ln(g, [keepLeft + keepW - 12, ry, keepLeft + keepW - 26, ry - 4], 0xe2e8f0, 2.5);
			}
			const pulse = 1 + Math.sin(time * 3.5) * 0.08;
			pg(
				g,
				[cx, cy - 22 * pulse, cx + 16 * pulse, cy, cx, cy + 22 * pulse, cx - 16 * pulse, cy],
				0x22c55e,
				{ color: 0xbbf7d0, width: 2 }
			);
			ci(g, cx, cy, 6, 0xfef08a);
			return;
		}

		if (style === 'Орки') {
			// Зала Вождів: масивний купольний шатер із рогами та жаровнею
			rr(g, keepLeft + 4, keepTop + 10, keepW - 8, keepH - 20, 28, 0x451a03, {
				color: 0x1c1917,
				width: 2.5
			});
			ci(g, cx, cy, 52, roofDark, { color: 0x1c1917, width: 2.5 });
			ci(g, cx - 4, cy - 4, 42, roofMid);
			ci(g, cx, cy, 24, roofLight);
			// Бойові роги з боків купола
			pg(g, [cx - 46, cy - 10, cx - 64, cy - 30, cx - 40, cy - 24], 0xfef3c7, {
				color: 0x451a03,
				width: 1.5
			});
			pg(g, [cx + 46, cy - 10, cx + 64, cy - 30, cx + 40, cy - 24], 0xfef3c7, {
				color: 0x451a03,
				width: 1.5
			});
			ci(g, cx, cy, 12, 0xf97316);
			ci(g, cx, cy, 6, 0xfef08a);
			return;
		}

		if (style === 'Демони') {
			// Пекельна Цитадель: обсидіановий ромб із вогняним оком-розломом
			pg(g, [cx, keepTop, keepLeft + keepW, cy, cx, keepTop + keepH, keepLeft, cy], 0x2a1414, {
				color: 0xf97316,
				width: 2.5
			});
			pg(
				g,
				[cx, keepTop + 16, keepLeft + keepW - 14, cy, cx, keepTop + keepH - 16, keepLeft + 14, cy],
				roofDark,
				{ color: 0x1c1917, width: 2 }
			);
			ci(g, cx, cy, 20, 0xea580c, { color: 0xfef08a, width: 2 });
			pg(g, [cx, cy - 14, cx + 8, cy, cx, cy + 14, cx - 8, cy], 0xfef08a);
			return;
		}

		if (style === 'Техніки') {
			// Механічна Кузня-Реактор: сталевий корпус, труби, шестерня і плазмове ядро
			rr(g, keepLeft, keepTop + 6, keepW, keepH - 12, 12, 0x334155, {
				color: 0x0f172a,
				width: 2.5
			});
			rr(g, keepLeft + 8, keepTop + 14, keepW - 16, keepH - 28, 8, 0x475569, {
				color: 0xd97706,
				width: 2
			});
			// Димоходи зверху та знизу
			for (const dy of [keepTop + 26, keepTop + keepH - 38]) {
				ci(g, keepLeft + 24, dy, 10, 0x1e293b, { color: 0xd97706, width: 2 });
				ci(g, keepLeft + keepW - 24, dy, 10, 0x1e293b, { color: 0xd97706, width: 2 });
			}
			// Центральна турбіна-шестерня
			ci(g, cx, cy, 28, 0x1e293b, { color: 0xd97706, width: 3 });
			ci(g, cx, cy, 14, 0x38bdf8, { color: 0xe0f2fe, width: 2 });
			return;
		}

		if (style === 'Північ') {
			// Крижаний Тронний Шпиль: грановані льодові плити
			rr(g, keepLeft + 4, keepTop + 6, keepW - 8, keepH - 12, 14, 0x1e3a5f, {
				color: 0xbae6fd,
				width: 2.5
			});
			pg(
				g,
				[
					cx,
					keepTop + 12,
					keepLeft + keepW - 12,
					cy - 20,
					keepLeft + keepW - 12,
					cy + 20,
					cx,
					keepTop + keepH - 16,
					keepLeft + 12,
					cy + 20,
					keepLeft + 12,
					cy - 20
				],
				0x38bdf8,
				{ color: 0xe0f2fe, width: 2 }
			);
			pg(g, [cx, cy - 28, cx + 18, cy, cx, cy + 28, cx - 18, cy], 0xbae6fd, {
				color: 0xffffff,
				width: 1.5
			});
			return;
		}

		if (style === 'Ельфи') {
			// Світове Дерево-Святилище: мармуровий павільйон у кроні золотого/смарагдового дерева
			rr(g, keepLeft + 8, keepTop + 10, keepW - 16, keepH - 20, 24, 0x334155, {
				color: 0xfde047,
				width: 2
			});
			ci(g, cx - 22, cy - 26, 28, 0x15803d, { color: 0x4ade80, width: 1.5 });
			ci(g, cx + 22, cy - 22, 26, 0x166534, { color: 0x4ade80, width: 1.5 });
			ci(g, cx - 18, cy + 24, 26, 0x166534, { color: 0x4ade80, width: 1.5 });
			ci(g, cx + 20, cy + 22, 28, 0x15803d, { color: 0x4ade80, width: 1.5 });
			ci(g, cx, cy, 30, 0x22c55e, { color: 0xfef08a, width: 2.5 });
			ci(g, cx, cy, 12, 0xfef08a);
			return;
		}

		if (style === 'Небожителі') {
			// Сонячний Собор: білий мармур, золотий купол і крила
			rr(g, keepLeft + 6, keepTop + 8, keepW - 12, keepH - 16, 12, 0xe2e8f0, {
				color: 0xf59e0b,
				width: 2.5
			});
			pg(g, [cx - 48, cy, cx - 16, cy - 18, cx - 16, cy + 18], 0xfef08a, {
				color: 0xd97706,
				width: 1.5
			});
			pg(g, [cx + 48, cy, cx + 16, cy - 18, cx + 16, cy + 18], 0xfef08a, {
				color: 0xd97706,
				width: 1.5
			});
			ci(g, cx, cy, 28, 0xfbbf24, { color: 0xfef08a, width: 2.5 });
			ci(g, cx, cy, 13, 0xffffff, { color: 0xf59e0b, width: 2 });
			return;
		}

		if (style === 'Тролі') {
			// Вуду-Піраміда: східчаста теракотова піраміда з бірюзовим вівтарем
			rr(g, keepLeft, keepTop + 6, keepW, keepH - 12, 6, 0x78350f, { color: 0x292524, width: 2 });
			rr(g, keepLeft + 14, keepTop + 20, keepW - 28, keepH - 40, 5, 0x92400e, {
				color: 0x2dd4bf,
				width: 1.8
			});
			rr(g, keepLeft + 28, keepTop + 36, keepW - 56, keepH - 72, 4, 0xb45309, {
				color: 0x1c1917,
				width: 1.5
			});
			ci(g, cx, cy, 14, 0x14b8a6, { color: 0xfef08a, width: 2 });
			return;
		}

		if (style === 'Елементалі') {
			// Вівтар Чотирьох Стихій: магічне кільце-портал
			ci(g, cx, cy, 48, 0x1e293b, { color: 0x38bdf8, width: 3 });
			ci(g, cx, cy, 34, 0x0f172a, { color: 0xa855f7, width: 2 });
			const glow = 16 + Math.sin(time * 4) * 2.5;
			ci(g, cx, cy, glow, 0x38bdf8, { color: 0xfef08a, width: 2 });
			ci(g, cx, cy, 7, 0xffffff);
			return;
		}

		if (style === 'Тварини') {
			// Скелясте Лігво-Курган з іклами
			ci(g, cx, cy - 12, 46, 0x57534e, { color: 0x1c1917, width: 2.5 });
			ci(g, cx, cy + 16, 42, 0x44403c, { color: 0x1c1917, width: 2.5 });
			ci(g, cx, cy, 28, 0x292524);
			// Ікла над лігвом
			pg(g, [cx - 22, cy + 8, cx - 14, cy + 28, cx - 8, cy + 8], 0xfef3c7);
			pg(g, [cx + 22, cy + 8, cx + 14, cy + 28, cx + 8, cy + 8], 0xfef3c7);
			ci(g, cx, cy - 4, 10, 0xf97316);
			return;
		}

		if (style === 'Наги') {
			// Підводний Храм-Тризуб
			rr(g, keepLeft + 6, keepTop + 8, keepW - 12, keepH - 16, 26, 0x0f766e, {
				color: 0x22d3ee,
				width: 2.5
			});
			ci(g, cx, cy, 32, 0x0891b2, { color: 0xfde047, width: 2.5 });
			// Золотий тризуб на куполі
			ln(g, [cx, cy + 16, cx, cy - 18], 0xfbbf24, 3);
			ln(g, [cx - 12, cy - 6, cx + 12, cy - 6], 0xfbbf24, 2.5);
			ln(g, [cx - 12, cy - 6, cx - 12, cy - 16], 0xfbbf24, 2.5);
			ln(g, [cx + 12, cy - 6, cx + 12, cy - 16], 0xfbbf24, 2.5);
			return;
		}

		// Альянс (класичний лицарський донжон)
		rr(g, keepLeft, keepTop + 4, keepW, keepH, 10, 0x57534e, { color: 0x1c1917, width: 2.5 });
		rr(g, keepLeft, keepTop, keepW, keepH - 6, 10, 0x78716c, { color: 0x292524, width: 2 });
		for (const [bx, by] of [
			[keepLeft - 3, keepTop + 12],
			[keepLeft + keepW - 7, keepTop + 12],
			[keepLeft - 3, keepTop + keepH - 28],
			[keepLeft + keepW - 7, keepTop + keepH - 28]
		]) {
			rr(g, bx, by, 10, 16, 2, 0xa8a29e, { color: 0x292524, width: 1.5 });
		}
		for (const wy of [cy - 42, cy + 32]) {
			for (const wx of [keepLeft + 8, keepLeft + keepW - 14]) {
				rr(g, wx, wy, 6, 12, 2, 0xfbbf24);
				rc(g, wx + 1.5, wy + 2, 3, 7, 0xfef9c3);
			}
		}
		const rLeft = keepLeft + 10;
		const rRight = keepLeft + keepW - 10;
		const rTop = keepTop + 10;
		const rBot = keepTop + keepH - 16;
		rr(g, rLeft, rTop, rRight - rLeft, rBot - rTop, 6, roofDark, { color: 0x0f172a, width: 2 });
		pg(g, [rLeft, rTop, cx, rTop + 12, cx, rBot - 12, rLeft, rBot], roofLight, undefined, 0.9);
		pg(g, [rLeft, rTop, rRight, rTop, cx, rTop + 12], roofMid);
		pg(g, [rLeft, rBot, rRight, rBot, cx, rBot - 12], roofDark);
		for (let ry = rTop + 18; ry < rBot - 14; ry += 14)
			ln(g, [rLeft + 4, ry, rRight - 4, ry], 0x0f172a, 1.2, 0.45);
		ln(g, [cx, rTop + 12, cx, rBot - 12], 0xf59e0b, 3.5);
		this.drawTowerTurret(g, cx, cy - 4, 24, roofDark, roofMid, roofLight, sunShadow);
	}

	private drawRaceCornerTower(
		g: Graphics,
		tx: number,
		ty: number,
		idx: number,
		style: string,
		roofDark: number,
		roofMid: number,
		roofLight: number,
		sunShadow: { dx: number; dy: number; alpha: number }
	): void {
		if (style === 'Нежить') {
			// Гострі пірамідальні некро-обеліски
			pg(g, [tx, ty - 20, tx + 16, ty + 10, tx - 16, ty + 10], 0x1e1b2e, {
				color: 0x22c55e,
				width: 2
			});
			ci(g, tx, ty - 2, 5.5, 0x22c55e);
			return;
		}
		if (style === 'Ельфи') {
			// Живі кутові дерева-вежі
			ci(g, tx, ty, 20, 0x14532d, { color: 0x4ade80, width: 1.8 });
			ci(g, tx - 3, ty - 3, 12, 0x22c55e);
			return;
		}
		if (style === 'Північ') {
			// Крижані ромбовидні шпилі
			pg(g, [tx, ty - 20, tx + 15, ty, tx, ty + 18, tx - 15, ty], 0x38bdf8, {
				color: 0xe0f2fe,
				width: 2
			});
			pg(g, [tx, ty - 11, tx + 7, ty, tx, ty + 9, tx - 7, ty], 0xbae6fd);
			return;
		}
		if (style === 'Елементалі') {
			const elColors = [0x4ade80, 0xf97316, 0x38bdf8, 0xa855f7];
			const tMid = elColors[idx];
			const tDark = this.shadeHexColor(tMid, 0.55);
			const tLight = this.shadeHexColor(tMid, 1.25);
			this.drawTowerTurret(g, tx, ty, 19, tDark, tMid, tLight, sunShadow);
			return;
		}
		if (style === 'Техніки') {
			rr(g, tx - 16, ty - 16, 32, 32, 6, 0x334155, { color: 0xd97706, width: 2.2 });
			ci(g, tx, ty, 9, 0x475569, { color: 0xd97706, width: 2 });
			ci(g, tx, ty, 3.5, 0x38bdf8);
			return;
		}
		if (style === 'Тролі') {
			rr(g, tx - 13, ty - 15, 26, 30, 5, 0x78350f, { color: 0x2dd4bf, width: 2 });
			ci(g, tx, ty - 3, 5, 0x14b8a6);
			return;
		}
		if (style === 'Наги') {
			ci(g, tx, ty, 17, 0x0f766e, { color: 0x22d3ee, width: 2 });
			ci(g, tx, ty, 7, 0xfef3c7, { color: 0x22d3ee, width: 1.5 });
			return;
		}

		// Базова кругла башта + унікальні деталі для Орків, Демонів, Небожителів, Тварин, Альянсу
		this.drawTowerTurret(g, tx, ty, 19, roofDark, roofMid, roofLight, sunShadow);
		if (style === 'Орки') {
			pg(g, [tx - 5, ty - 6, tx, ty - 22, tx + 5, ty - 6], 0xfef3c7);
		} else if (style === 'Демони') {
			ci(g, tx, ty, 7, 0xf97316);
			ci(g, tx, ty, 3.5, 0xfef08a);
		} else if (style === 'Небожителі') {
			ci(g, tx, ty, 12, undefined, { color: 0xfef08a, width: 2 });
		} else if (style === 'Тварини') {
			ci(g, tx, ty - 2, 9, 0x78350f, { color: 0xfef3c7, width: 1.5 });
		}
	}
}
