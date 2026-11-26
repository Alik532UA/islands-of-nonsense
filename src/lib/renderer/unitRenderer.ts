import type { Graphics } from 'pixi.js';
import type { Simulation } from '../engine/simulation';
import type { MatchTeam, Unit } from '../engine/types';
import { CELL_SIZE } from '../engine/constants';
import type { SelectedEntity } from './entityRenderer';
import { drawRaceWorkerModel } from './workerModels';
import { renderUniqueUnitModel } from './unitModels';
import { rc, rr, ci, el } from './gfx';

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

	private renderUnitArchetype(
		g: Graphics,
		u: Unit,
		unitColor: number,
		isSelected: boolean,
		renderY: number,
		dir: number,
		walkPhase: number
	): void {
		renderUniqueUnitModel(
			g,
			u,
			unitColor,
			isSelected,
			renderY,
			dir,
			walkPhase,
			this.sim.gameTime,
			(hex, factor) => this.shadeHexColor(hex, factor)
		);
	}
}
