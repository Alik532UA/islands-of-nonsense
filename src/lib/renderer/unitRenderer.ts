import type { Graphics } from 'pixi.js';
import type { Simulation } from '../engine/simulation';
import type { MatchTeam, Unit } from '../engine/types';
import { CELL_SIZE } from '../engine/constants';
import type { SelectedEntity } from './entityRenderer';
import { drawRaceWorkerModel } from './workerModels';
import { rc, rr, ci, el, pg, ln } from './gfx';

/**
 * UnitRenderer handles rendering of workers, combat units, stylized 2.5D archetypes,
 * health/mana bars, buff/debuff auras, and dynamic attack facing directions.
 */
export class UnitRenderer {
	private sim: Simulation;

	constructor(sim: Simulation) {
		this.sim = sim;
	}

	public setSimulation(newSim: Simulation): void {
		this.sim = newSim;
	}

	private shadeHexColor(hex: number, factor: number): number {
		const mix = (c: number) =>
			factor >= 1
				? Math.min(255, Math.round(c + (255 - c) * Math.min(1, factor - 1)))
				: Math.max(0, Math.round(c * Math.max(0, factor)));
		return (mix((hex >> 16) & 0xff) << 16) | (mix((hex >> 8) & 0xff) << 8) | mix(hex & 0xff);
	}

	public drawWorkersLayer(
		g: Graphics,
		selectedWorker: boolean | number | null,
		enableFog = false,
		bounds?: { minX: number; minY: number; maxX: number; maxY: number },
		viewerTeam: MatchTeam = 'west'
	): void {
		g.clear();
		const players = this.sim.allPlayers?.length
			? this.sim.allPlayers
			: [this.sim.players.west, this.sim.players.east];

		for (const player of players) {
			const w = player?.worker;
			if (!w) continue;
			if (
				bounds &&
				(w.x + 30 < bounds.minX ||
					w.x - 30 > bounds.maxX ||
					w.y + 30 < bounds.minY ||
					w.y - 30 > bounds.maxY)
			) {
				continue;
			}
			if (
				enableFog &&
				player.team !== viewerTeam &&
				!this.sim.isPointRevealed(viewerTeam, w.x, w.y)
			) {
				continue;
			}

			const isWest = player.team === 'west';
			const slot = player.slot ?? (isWest ? 1 : 2);
			const selected =
				typeof selectedWorker === 'number'
					? slot === selectedWorker
					: Boolean(selectedWorker && player === this.sim.players[viewerTeam]);
			const wx = w.x;
			const wy = w.y;
			const bob = Math.sin(this.sim.gameTime * 7 + slot) * 2;
			const playerColor = player.color?.num ?? (isWest ? 0x0042ff : 0xff0303);
			const pulse = 0.82 + Math.sin(this.sim.gameTime * 6) * 0.14;

			el(g, wx, wy + 16, 21, 10, undefined, {
				color: selected ? 0xfbbf24 : isWest ? 0x38bdf8 : 0xf43f5e,
				width: selected ? 3.2 : 1.8,
				alpha: pulse * 0.8
			});
			el(g, wx + 2, wy + 16, 16, 7.5, 0x000000, undefined, 0.42);

			const dist = Math.hypot(w.targetX - wx, w.targetY - wy);
			if (dist > 6) {
				const dx = (w.targetX - wx) / dist;
				const dy = (w.targetY - wy) / dist;
				const len = Math.min(18, (w.speed || 170) * 0.05);
				rr(
					g,
					wx - dx * len * 0.6 - 8,
					wy - dy * len * 0.6 - 4 + bob,
					16,
					16,
					4,
					playerColor,
					undefined,
					0.2
				);
				rr(
					g,
					wx - dx * len * 1.2 - 6,
					wy - dy * len * 1.2 - 3 + bob,
					12,
					12,
					3,
					playerColor,
					undefined,
					0.09
				);
			}

			let facing = isWest ? 1 : -1;
			if (w.isBuilding && w.targetBuildingId) {
				const bld = this.sim.buildings.find((b) => b.instanceId === w.targetBuildingId);
				if (bld) facing = bld.x + CELL_SIZE / 2 < w.x ? -1 : 1;
			} else if (w.isRepairing && w.targetRepairBuildingId) {
				const bld =
					this.sim.buildings.find((b) => b.instanceId === w.targetRepairBuildingId) ||
					(w.targetRepairBuildingId.startsWith('castle') ? this.sim.castles[player.team] : null);
				if (bld) facing = bld.x < w.x ? -1 : 1;
			} else if (Math.abs(w.targetX - w.x) > 2) {
				facing = w.targetX < w.x ? -1 : 1;
			}

			drawRaceWorkerModel({
				g,
				wx,
				wy,
				bob,
				facing,
				isMoving: dist > 6,
				isSwinging: Boolean(w.isBuilding || w.isRepairing),
				slot,
				time: this.sim.gameTime,
				playerColor,
				race: player.race
			});
		}
	}

	public drawUnitsLayer(
		g: Graphics,
		selectedEntity: SelectedEntity,
		enableFog: boolean,
		bounds?: { minX: number; minY: number; maxX: number; maxY: number },
		viewerTeam: MatchTeam = 'west'
	): void {
		g.clear();
		const westCol = this.sim.players.west.color?.num || 0x0042ff;
		const eastCol = this.sim.players.east.color?.num || 0xff0303;

		for (const u of this.sim.units) {
			const radius = u.size;
			if (
				bounds &&
				(u.x + radius + 30 < bounds.minX ||
					u.x - radius - 30 > bounds.maxX ||
					u.y + radius + 30 < bounds.minY ||
					u.y - radius - 30 > bounds.maxY)
			) {
				continue;
			}

			if (u.state === 'DEAD') {
				if (u.deathTimer !== undefined && u.deathTimer > 0) {
					el(
						g,
						u.x,
						u.y,
						radius * 0.9,
						radius * 0.45,
						0x334155,
						undefined,
						Math.max(0, u.deathTimer / 0.7) * 0.65
					);
				}
				continue;
			}
			if (enableFog && u.team !== viewerTeam && !this.sim.isPointRevealed(viewerTeam, u.x, u.y)) {
				continue;
			}

			const isWest = u.team === 'west';
			const isNeutral = u.team === 'neutral';
			const uPlayer = u.playerSlot
				? this.sim.allPlayers.find((p) => p.slot === u.playerSlot)
				: u.team !== 'neutral'
					? this.sim.players[u.team]
					: null;
			const unitColor = isNeutral
				? 0x7e22ce
				: (uPlayer?.color?.num ?? (isWest ? westCol : eastCol));

			let dir = isNeutral || isWest ? 1 : -1;
			if (u.currentTargetId) {
				const enemy = this.sim.units.find((c) => c.instanceId === u.currentTargetId);
				if (enemy && Math.abs(enemy.x - u.x) > 6) dir = enemy.x > u.x ? 1 : -1;
			} else if (u.targetBuildingId) {
				const targetX =
					u.targetBuildingId === 'castle_west'
						? this.sim.castles.west.x
						: u.targetBuildingId === 'castle_east'
							? this.sim.castles.east.x
							: (this.sim.buildings.find((b) => b.instanceId === u.targetBuildingId)?.x ?? NaN) +
								CELL_SIZE / 2;
				if (Number.isFinite(targetX) && Math.abs(targetX - u.x) > 6) dir = targetX > u.x ? 1 : -1;
			} else if (u.targetX !== undefined && Math.abs(u.targetX - u.x) > 8) {
				dir = u.targetX > u.x ? 1 : -1;
			}

			const isSelected =
				(selectedEntity?.type === 'unit' && selectedEntity.instanceId === u.instanceId) ||
				(selectedEntity?.type === 'group' && selectedEntity.unitIds.includes(u.instanceId));

			const walkPhase = this.sim.gameTime * 11 + u.x * 0.08 + u.y * 0.04;
			const walkBob = u.state === 'WALKING' && !u.flying ? Math.abs(Math.sin(walkPhase)) * 2.2 : 0;
			const flyAlt = u.flying ? 20 + Math.sin(this.sim.gameTime * 4 + u.x * 0.05) * 5 : 0;
			const renderY = u.y - flyAlt - walkBob;
			const ringR = radius * 1.25;
			const ringY = u.y + radius * 0.72;

			if (isSelected) {
				el(g, u.x, ringY, ringR * 1.22, ringR * 0.56, undefined, {
					color: 0xfbbf24,
					width: 3,
					alpha: 0.95
				});
				el(g, u.x, ringY, ringR * 0.92, ringR * 0.42, undefined, {
					color: 0xfef08a,
					width: 1.5,
					alpha: 0.75
				});
			} else {
				el(
					g,
					u.x,
					ringY,
					ringR * (isNeutral ? 1.15 : 1),
					ringR * (isNeutral ? 0.52 : 0.46),
					undefined,
					{
						color: isNeutral ? 0xa855f7 : isWest ? 0x38bdf8 : 0xf43f5e,
						width: isNeutral ? 2.5 : 1.5,
						alpha: isNeutral ? 0.65 : 0.45
					}
				);
			}

			el(
				g,
				u.x + 2,
				ringY,
				radius * (u.flying ? 0.8 : 1.05),
				radius * 0.44,
				0x000000,
				undefined,
				u.flying ? 0.25 : 0.46
			);
			this.renderUnitArchetype(g, u, unitColor, isSelected, renderY, dir, walkPhase);

			if (u.buffs?.length) {
				const buffRing: Record<string, [number, number, number, number]> = {
					dmg: [4, 0xf87171, 2, 0.7],
					shield: [5, 0x60a5fa, 2, 0.75],
					as: [6, 0x4ade80, 2, 0.75],
					bloodlust: [6, 0xef4444, 3, 0.9]
				};
				for (const buff of u.buffs) {
					const cfg = buffRing[buff.type];
					if (cfg) {
						ci(g, u.x, renderY, radius + cfg[0], undefined, {
							color: cfg[1],
							width: cfg[2],
							alpha: cfg[3]
						});
					} else if (buff.type === 'frost' || buff.type === 'slow') {
						for (let i = 0; i < 3; i++) {
							const a = (i * 2 * Math.PI) / 3 + this.sim.gameTime * 3.5;
							rc(
								g,
								u.x + Math.cos(a) * (radius + 6) - 2,
								renderY + Math.sin(a) * (radius + 6) - 2,
								4,
								4,
								{ color: 0x67e8f9, alpha: 0.95 },
								{ color: 0xe0f2fe, width: 1 }
							);
						}
					}
				}
			}

			const hpPct = Math.max(0, u.hp / u.maxHp);
			const showMana = (u.maxMana || 0) > 0;
			if (hpPct < 1 || isSelected || isNeutral) {
				const barW = Math.max(26, radius * 2 + 6);
				const barX = u.x - barW / 2;
				const barY = renderY - radius - 14;
				rr(g, barX - 1, barY - 1, barW + 2, 4.5 + (showMana ? 5.5 : 2), 2, 0x090d16);
				rr(
					g,
					barX,
					barY,
					barW * hpPct,
					4.5,
					1.5,
					hpPct > 0.5 ? 0x22c55e : hpPct > 0.25 ? 0xeab308 : 0xef4444
				);
				if (showMana) {
					const manaPct = Math.max(0, Math.min(1, (u.mana || 0) / (u.maxMana || 1)));
					rr(g, barX, barY + 5.5, barW * manaPct, 2.5, 1, 0x38bdf8);
				}
			}
		}
	}

	private drawHumanoidBody(
		g: Graphics,
		x: number,
		y: number,
		r: number,
		dir: number,
		unitColor: number,
		isSelected: boolean,
		walkPhase: number,
		isWalking: boolean,
		opts: {
			scaleW?: number;
			robeHem?: boolean;
			cloakColor?: number;
			armorColor?: number;
			spikedPauldrons?: boolean;
		} = {}
	): void {
		const colorDark = this.shadeHexColor(unitColor, 0.56);
		const colorLight = this.shadeHexColor(unitColor, 1.24);
		const torsoW = r * 1.18 * (opts.scaleW ?? 1.0);
		const torsoH = r * 0.98;
		const stride = isWalking ? Math.sin(walkPhase) * (r * 0.24) : 0;
		const sway = isWalking ? Math.sin(walkPhase * 1.2) * 2.5 : 0;

		pg(
			g,
			[
				x - dir * torsoW * 0.25,
				y - r * 0.25,
				x - dir * (torsoW * 0.85 + 4),
				y + r * 0.55 + sway,
				x - dir * torsoW * 0.15,
				y + r * 0.65,
				x + dir * torsoW * 0.1,
				y - r * 0.1
			],
			{ color: opts.cloakColor ?? colorDark, alpha: 0.92 },
			{ color: 0x0f172a, width: 1.2 }
		);

		if (opts.robeHem) {
			pg(
				g,
				[
					x - torsoW * 0.55,
					y + r * 0.1,
					x + torsoW * 0.55,
					y + r * 0.1,
					x + torsoW * 0.72,
					y + r * 0.82,
					x - torsoW * 0.72,
					y + r * 0.82
				],
				colorDark,
				{ color: 0x0f172a, width: 1.5 }
			);
			ln(g, [x - torsoW * 0.7, y + r * 0.76, x + torsoW * 0.7, y + r * 0.76], 0xfbbf24, 1.6);
		} else {
			g.beginPath();
			g.roundRect(x - torsoW * 0.42 + stride, y + r * 0.44, r * 0.36, r * 0.42, 2);
			g.roundRect(x + torsoW * 0.08 - stride, y + r * 0.44, r * 0.36, r * 0.42, 2);
			g.fill({ color: 0x1e293b });
			g.stroke({ color: 0x090d16, width: 1.1 });
		}

		rr(g, x - torsoW / 2, y - torsoH * 0.35, torsoW, torsoH, 4, opts.armorColor ?? unitColor, {
			color: isSelected ? 0xfbbf24 : 0x0f172a,
			width: isSelected ? 2.4 : 1.6
		});
		rr(g, x - torsoW * 0.32, y - torsoH * 0.25, torsoW * 0.64, torsoH * 0.45, 2, {
			color: colorLight,
			alpha: 0.45
		});
		rc(g, x - torsoW * 0.48, y + torsoH * 0.22, torsoW * 0.96, 3, 0x78350f);
		rc(g, x - 2, y + torsoH * 0.2, 4, 3.5, 0xfbbf24);

		const pauldronR = r * (opts.spikedPauldrons ? 0.36 : 0.28);
		for (const side of [-1, 1]) {
			const px = x + side * torsoW * 0.48;
			const py = y - torsoH * 0.18;
			ci(g, px, py, pauldronR, opts.spikedPauldrons ? 0x64748b : colorLight, {
				color: 0x0f172a,
				width: 1.4
			});
			if (opts.spikedPauldrons) {
				pg(
					g,
					[
						px,
						py - pauldronR,
						px + side * pauldronR * 1.1,
						py - pauldronR * 1.35,
						px + side * pauldronR * 0.7,
						py - pauldronR * 0.2
					],
					0xe2e8f0
				);
			}
		}

		const headY = y - torsoH * 0.62;
		const headR = r * 0.44;
		ci(g, x, headY, headR, 0xe2b887, { color: 0x0f172a, width: 1.4 });
		const eyeX = x + dir * headR * 0.45;
		el(g, eyeX, headY + 0.5, 2.2, 1.5, 0x0f172a);
		ci(g, eyeX + dir * 0.5, headY + 0.2, 0.8, 0xfef08a);
	}

	private renderUnitArchetype(
		g: Graphics,
		u: Unit,
		unitColor: number,
		isSelected: boolean,
		renderY: number,
		dir: number,
		walkPhase: number
	): void {
		const r = u.size;
		const time = this.sim.gameTime;
		const colorDark = this.shadeHexColor(unitColor, 0.55);
		const colorLight = this.shadeHexColor(unitColor, 1.25);
		const atkLunge =
			u.attackAnimTimer && u.attackAnimTimer > 0 ? dir * (u.attackAnimTimer * 18) : 0;
		const ux = u.x + atkLunge * 0.45;
		const isWalking = u.state === 'WALKING';
		const headY = renderY - r * 0.98 * 0.62;

		if (u.flying) {
			const flap = Math.sin(time * 14 + u.x * 0.05) * (r * 0.55);
			pg(
				g,
				[
					ux - dir * r * 0.35,
					renderY + r * 0.15,
					ux - dir * r * 1.35,
					renderY + r * 0.45 + flap * 0.25,
					ux - dir * r * 1.05,
					renderY - r * 0.05
				],
				colorDark,
				{ color: 0x0f172a, width: 1.4 }
			);
			for (const ws of [-1, 1]) {
				pg(
					g,
					[
						ux + ws * 2,
						renderY - r * 0.15,
						ux + ws * r * 1.55,
						renderY - r * 0.95 + flap,
						ux + ws * r * 1.2,
						renderY + r * 0.25 + flap * 0.35,
						ux + ws * r * 0.55,
						renderY + r * 0.2,
						ux + ws * 2,
						renderY + r * 0.3
					],
					{ color: colorLight, alpha: 0.9 },
					{ color: colorDark, width: 1.6 }
				);
				ln(
					g,
					[ux + ws * 2, renderY - r * 0.15, ux + ws * r * 1.52, renderY - r * 0.92 + flap],
					0x1e293b,
					2
				);
			}
			el(g, ux, renderY, r * 0.72, r * 0.55, unitColor, {
				color: isSelected ? 0xfbbf24 : 0x0f172a,
				width: isSelected ? 2.4 : 1.6
			});
			el(g, ux, renderY + r * 0.15, r * 0.48, r * 0.28, 0xfef08a, undefined, 0.45);
			const hx = ux + dir * r * 0.62;
			const hy = renderY - r * 0.25;
			pg(
				g,
				[
					hx - dir * r * 0.25,
					hy - r * 0.28,
					hx + dir * r * 0.45,
					hy - r * 0.12,
					hx + dir * r * 0.42,
					hy + r * 0.22,
					hx - dir * r * 0.25,
					hy + r * 0.26
				],
				colorDark,
				{ color: 0x0f172a, width: 1.4 }
			);
			pg(
				g,
				[
					hx - dir * r * 0.1,
					hy - r * 0.24,
					hx - dir * r * 0.55,
					hy - r * 0.65,
					hx + dir * r * 0.05,
					hy - r * 0.18
				],
				0xfef3c7
			);
			ci(g, hx + dir * r * 0.14, hy - r * 0.04, 2, 0xfbbf24);
			ci(g, hx + dir * r * 0.52, hy + r * 0.06, 3.2, 0xf97316, undefined, 0.9);
			ci(g, hx + dir * r * 0.55, hy + r * 0.06, 1.6, 0xfef08a);
		} else if (u.attackType === 'siege') {
			const recoil = u.attackAnimTimer && u.attackAnimTimer > 0 ? -dir * 4 : 0;
			for (const wx of [ux - r * 0.55, ux + r * 0.55]) {
				for (const wy of [renderY - r * 0.58, renderY + r * 0.58]) {
					ci(g, wx, wy, r * 0.28, 0x334155, { color: 0x0f172a, width: 1.6 });
					ci(g, wx, wy, r * 0.14, 0x78350f);
				}
			}
			rr(g, ux - r * 0.78, renderY - r * 0.52, r * 1.56, r * 1.04, 4, 0x78350f, {
				color: isSelected ? 0xfbbf24 : 0x292524,
				width: isSelected ? 2.4 : 1.8
			});
			rr(g, ux - r * 0.52, renderY - r * 0.34, r * 1.04, r * 0.68, 3, unitColor, {
				color: 0xd97706,
				width: 1.4
			});
			const bStart = ux - dir * r * 0.15 + recoil;
			const bEnd = ux + dir * r * 1.08 + recoil;
			ln(g, [bStart, renderY, bEnd, renderY - 2], 0x0f172a, 11);
			ln(g, [bStart, renderY, bEnd, renderY - 2], 0x475569, 7.5);
			ci(g, bEnd, renderY - 2, 4.5, 0xd97706, { color: 0x0f172a, width: 1.2 });
		} else if (
			u.attackType === 'magic' ||
			u.abilityType?.includes('heal') ||
			u.abilityType?.includes('slow')
		) {
			this.drawHumanoidBody(g, ux, renderY, r, dir, unitColor, isSelected, walkPhase, isWalking, {
				scaleW: 0.95,
				robeHem: true,
				cloakColor: colorDark
			});
			pg(g, [ux - r * 0.48, headY + 2, ux, headY - r * 0.68, ux + r * 0.48, headY + 2], colorDark, {
				color: 0xfbbf24,
				width: 1.2
			});
			const sx = ux + dir * r * 0.72 + atkLunge * 0.5;
			const sy = renderY - r * 0.95;
			ln(g, [sx - dir * 2, renderY + r * 0.72, sx, sy], 0x92400e, 2.6);
			ci(g, sx, sy - 4, 5, 0x38bdf8);
			ci(g, sx, sy - 4, 2.5, 0xffffff);
			const orbA = time * 4.5;
			ci(g, sx + Math.cos(orbA) * 6.5, sy - 4 + Math.sin(orbA) * 6.5, 2, 0xfbbf24);
		} else if (u.attackType === 'pierce' || u.range > 200) {
			const qx = ux - dir * r * 0.48;
			pg(
				g,
				[
					qx - 3,
					renderY - r * 0.62,
					qx + 3,
					renderY - r * 0.62,
					qx + 1,
					renderY + r * 0.1,
					qx - 4,
					renderY + r * 0.1
				],
				0x78350f
			);
			ci(g, qx, renderY - r * 0.66, 2, 0xfef08a);
			this.drawHumanoidBody(g, ux, renderY, r, dir, unitColor, isSelected, walkPhase, isWalking, {
				scaleW: 0.92,
				cloakColor: 0x065f46
			});
			pg(
				g,
				[
					ux - r * 0.44,
					headY,
					ux - dir * r * 0.18,
					headY - r * 0.56,
					ux + r * 0.38,
					headY - r * 0.08
				],
				0x065f46,
				{ color: 0x0f172a, width: 1.2 }
			);

			g.beginPath();
			const bowR = r * 0.85;
			const bowCx = ux + dir * r * 0.35;
			const spread = Math.PI / 2.3;
			const bowStart = dir > 0 ? -spread : Math.PI - spread;
			const bowEnd = dir > 0 ? spread : Math.PI + spread;
			const topX = bowCx + Math.cos(bowStart) * bowR;
			const topY = renderY + Math.sin(bowStart) * bowR;
			const botX = bowCx + Math.cos(bowEnd) * bowR;
			const botY = renderY + Math.sin(bowEnd) * bowR;
			g.moveTo(topX, topY);
			g.arc(bowCx, renderY, bowR, bowStart, bowEnd, false);
			g.stroke({ color: 0xb45309, width: 2.3 });

			const nockX = ux - dir * r * 0.22;
			ln(g, [topX, topY, nockX, renderY, botX, botY], 0xe4e4e7, 1.1, 0.72);
			const tipX = ux + dir * (r + 8);
			ln(g, [nockX, renderY, tipX, renderY], 0xfef08a, 1.8);
			pg(g, [tipX, renderY, tipX - dir * 5, renderY - 3, tipX - dir * 5, renderY + 3], 0xe2e8f0);
		} else if (u.armorType === 'fort' || u.armorType === 'large' || u.hp >= 800) {
			this.drawHumanoidBody(g, ux, renderY, r, dir, unitColor, isSelected, walkPhase, isWalking, {
				scaleW: 1.14,
				armorColor: 0x475569,
				spikedPauldrons: true
			});
			const hr = r * 0.48;
			g.beginPath();
			g.arc(ux, headY, hr, Math.PI, 0, false);
			g.fill({ color: 0x94a3b8 });
			g.stroke({ color: 0x1e293b, width: 1.5 });
			for (const hs of [-1, 1]) {
				pg(
					g,
					[
						ux + hs * hr * 0.65,
						headY - hr * 0.4,
						ux + hs * hr * 1.45,
						headY - hr * 1.15,
						ux + hs * hr * 0.9,
						headY - hr * 0.1
					],
					0xfef3c7
				);
			}
			const sx = ux + dir * r * 0.66;
			rr(g, sx - 3.5, renderY - r * 0.35, 7, r * 0.95, 2.5, unitColor, {
				color: 0xfbbf24,
				width: 1.6
			});
			const hx = ux + dir * r * 0.42 + atkLunge;
			const hy = renderY - r * 0.45;
			ln(g, [ux + dir * 2, renderY + 2, hx + dir * 7, hy - 5], 0x78350f, 3.2);
			rr(g, dir > 0 ? hx + 2 : hx - 13, hy - 10, 11, 8, 2, 0x94a3b8, {
				color: 0xfbbf24,
				width: 1.5
			});
		} else if (/вовк|лев|гонча|ведм|пантер|тигр/i.test(u.name)) {
			const furColor = this.shadeHexColor(unitColor, 0.72);
			const furMane = this.shadeHexColor(unitColor, 1.12);
			const stride = isWalking ? Math.sin(walkPhase) * (r * 0.28) : 0;
			pg(
				g,
				[
					ux - dir * r * 0.75,
					renderY,
					ux - dir * r * 1.35,
					renderY - r * 0.35 + stride * 0.4,
					ux - dir * r * 0.95,
					renderY + r * 0.2
				],
				furColor,
				{ color: 0x0f172a, width: 1.2 }
			);
			g.beginPath();
			g.roundRect(ux - r * 0.58 - stride, renderY + r * 0.25, r * 0.26, r * 0.52, 2);
			g.roundRect(ux + r * 0.32 + stride, renderY + r * 0.25, r * 0.26, r * 0.52, 2);
			g.fill({ color: 0x1e293b });
			el(g, ux, renderY + r * 0.05, r * 0.92, r * 0.52, furColor, {
				color: isSelected ? 0xfbbf24 : 0x0f172a,
				width: isSelected ? 2.4 : 1.6
			});
			rc(g, ux + dir * r * 0.35 - 2.5, renderY - r * 0.42, 5, r * 0.88, 0xd97706);
			const hx = ux + dir * r * 0.76;
			const hy = renderY - r * 0.16;
			ci(g, hx, hy, r * 0.42, furMane, { color: 0x0f172a, width: 1.4 });
			pg(
				g,
				[hx - dir * 3, hy - r * 0.35, hx - dir * 7, hy - r * 0.78, hx + dir * 2, hy - r * 0.38],
				furColor
			);
			pg(
				g,
				[
					hx + dir * r * 0.25,
					hy - r * 0.12,
					hx + dir * r * 0.68,
					hy + r * 0.04,
					hx + dir * r * 0.25,
					hy + r * 0.24
				],
				furColor
			);
			ci(g, hx + dir * r * 0.2, hy - r * 0.08, 1.9, 0xfef08a);
		} else {
			this.drawHumanoidBody(g, ux, renderY, r, dir, unitColor, isSelected, walkPhase, isWalking);
			const hr = r * 0.46;
			g.beginPath();
			g.arc(ux, headY, hr, Math.PI, 0, false);
			g.fill({ color: 0x94a3b8 });
			g.stroke({ color: 0x1e293b, width: 1.4 });
			pg(g, [ux - dir * 4, headY - hr, ux, headY - hr - 6, ux + dir * 4, headY - hr], unitColor);
			const sx = ux - dir * r * 0.45;
			pg(
				g,
				[
					sx - 4,
					renderY - r * 0.3,
					sx + 4,
					renderY - r * 0.3,
					sx + 4,
					renderY + r * 0.15,
					sx,
					renderY + r * 0.42,
					sx - 4,
					renderY + r * 0.15
				],
				unitColor,
				{ color: 0xfbbf24, width: 1.4 }
			);
			const sb = ux + dir * r * 0.45 + atkLunge;
			ln(g, [sb - dir * 2, renderY + 2, sb + dir * 3, renderY - 3], 0xf59e0b, 3.5);
			ln(g, [sb, renderY, sb + dir * r * 0.68, renderY - r * 0.62], 0xe2e8f0, 3);
		}

		if (u.team === 'neutral') {
			const cy = renderY - r - 5;
			pg(
				g,
				[
					ux - 8,
					cy + 4,
					ux - 9,
					cy - 4,
					ux - 3,
					cy,
					ux,
					cy - 6,
					ux + 3,
					cy,
					ux + 9,
					cy - 4,
					ux + 8,
					cy + 4
				],
				0xfbbf24,
				{ color: 0x78350f, width: 1.2 }
			);
		}

		if (u.attackAnimTimer && u.attackAnimTimer > 0) {
			g.beginPath();
			g.arc(
				ux + dir * r * 0.55,
				renderY,
				r * 0.85,
				dir > 0 ? -Math.PI / 3 : (2 * Math.PI) / 3,
				dir > 0 ? Math.PI / 3 : (4 * Math.PI) / 3,
				false
			);
			g.stroke({ color: 0xfef08a, width: 3, alpha: (u.attackAnimTimer / 0.25) * 0.85 });
		}
	}
}
