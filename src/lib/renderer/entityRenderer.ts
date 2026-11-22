import type { Graphics } from 'pixi.js';
import type { Simulation } from '../engine/simulation';
import { WC3_PLAYER_COLORS, type Castle, type MatchTeam } from '../engine/types';
import { CELL_SIZE } from '../engine/constants';

export type SelectedEntity =
	| { type: 'worker' }
	| { type: 'building'; instanceId: string }
	| { type: 'unit'; instanceId: string }
	| { type: 'group'; unitIds: string[] }
	| { type: 'castle'; team: MatchTeam }
	| null;

export class EntityRenderer {
	private sim: Simulation;

	constructor(sim: Simulation) {
		this.sim = sim;
	}

	public setSimulation(newSim: Simulation): void {
		this.sim = newSim;
	}

	public drawBuildingsLayer(g: Graphics, selectedPlacedId: string | null): void {
		g.clear();

		for (const b of this.sim.buildings) {
			const px = b.x;
			const py = b.y;
			const isWest = b.team === 'west';
			const isSelected = selectedPlacedId === b.instanceId;
			const teamColor = this.sim.players[b.team]?.color?.num || (isWest ? 0x0042ff : 0xff0303);

			// Selection halo
			if (isSelected) {
				g.roundRect(px - 2, py - 2, CELL_SIZE + 4, CELL_SIZE + 4, 8);
				g.stroke({ color: 0xf59e0b, width: 3 });
			}

			// Building base stone slab (2x2 footprint)
			g.roundRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4, 6);
			g.fill({ color: 0x334155 });
			g.stroke({ color: isSelected ? 0xfbbf24 : teamColor, width: 2 });

			// 2x2 Quadrant subdivision mortar lines on foundation
			const half = CELL_SIZE / 2;
			g.moveTo(px + half, py + 3);
			g.lineTo(px + half, py + CELL_SIZE - 3);
			g.stroke({ color: 0x1e293b, width: 1.5, alpha: 0.6 });
			g.moveTo(px + 3, py + half);
			g.lineTo(px + CELL_SIZE - 3, py + half);
			g.stroke({ color: 0x1e293b, width: 1.5, alpha: 0.6 });

			// Inner roof tiles with race color tinting (spanning 2x2 quadrants)
			const raceColors: Record<string, number> = {
				Люди: 0x1e3a8a,
				Орки: 0x831843,
				Нежить: 0x14532d,
				Ельфи: 0x065f46,
				Эльфы: 0x065f46,
				Хаос: 0x7f1d1d,
				Наги: 0x0e7490,
				Північ: 0x0369a1,
				Север: 0x0369a1,
				Порча: 0x581c87,
				'Нічні ельфи': 0x365314,
				'Ночні ельфи': 0x365314,
				'Ночные эльфы': 0x365314,
				Техніки: 0x78350f,
				Техники: 0x78350f,
				Збирачі: 0x334155,
				Сборщики: 0x334155
			};
			const roofColor = raceColors[b.race] || 0x1e293b;
			g.roundRect(px + 7, py + 7, CELL_SIZE - 14, CELL_SIZE - 14, 4);
			g.fill({ color: roofColor });

			// 4 Corner stone turrets / bastions (one in each 1x1 sub-quadrant)
			const cornerPositions = [
				{ x: px + 3, y: py + 3 },
				{ x: px + CELL_SIZE - 15, y: py + 3 },
				{ x: px + 3, y: py + CELL_SIZE - 15 },
				{ x: px + CELL_SIZE - 15, y: py + CELL_SIZE - 15 }
			];
			for (const cp of cornerPositions) {
				g.roundRect(cp.x, cp.y, 12, 12, 2);
				g.fill({ color: 0x475569 });
				g.stroke({ color: 0x1e293b, width: 1 });
			}

			// Team colored banner/crest strip on roof
			g.rect(px + half - 4, py + 8, 8, CELL_SIZE - 16);
			g.fill({ color: teamColor });
			g.stroke({ color: 0xfef08a, width: 1, alpha: 0.8 });

			// Central structure icon or emblem
			g.circle(px + half, py + half, 9);
			g.fill({ color: 0x0f172a, alpha: 0.5 });
			g.circle(px + half, py + half, 6);
			g.fill({ color: 0xfbbf24, alpha: 0.75 });

			// Entrance arch / door facing the lane direction
			const doorX = isWest ? px + CELL_SIZE - 4 : px;
			const doorY = py + CELL_SIZE / 2 - 7;
			g.roundRect(doorX, doorY, 4, 14, 1.5);
			g.fill({ color: 0x0f172a });

			// Under construction visual overlay & scaffolding
			if (b.isUnderConstruction) {
				g.roundRect(px + 3, py + 3, CELL_SIZE - 6, CELL_SIZE - 6, 4);
				g.fill({ color: 0x78350f, alpha: 0.65 });
				g.stroke({ color: 0xd97706, width: 2 });

				// 2x2 scaffolding diagonal cross-beams over each quadrant
				for (let sx = 0; sx < 2; sx++) {
					for (let sy = 0; sy < 2; sy++) {
						const qx = px + sx * half;
						const qy = py + sy * half;
						g.moveTo(qx + 3, qy + 3);
						g.lineTo(qx + half - 3, qy + half - 3);
						g.stroke({ color: 0xfbbf24, width: 1.5, alpha: 0.8 });
						g.moveTo(qx + half - 3, qy + 3);
						g.lineTo(qx + 3, qy + half - 3);
						g.stroke({ color: 0xfbbf24, width: 1.5, alpha: 0.8 });
					}
				}

				// Progress bar
				const bProg = b.buildProgress || 0;
				const bMax = b.maxBuildProgress || 3.5;
				const progPct = Math.max(0, Math.min(1, bProg / bMax));

				const barX = px + 4;
				const barY = py - 8;
				const barW = CELL_SIZE - 8;
				const barH = 5;

				g.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 2);
				g.fill({ color: 0x090d16 });
				g.roundRect(barX, barY, barW * progPct, barH, 1.5);
				g.fill({ color: 0xf59e0b });
				continue;
			}

			// Damaged HP Bar
			if (b.hp !== undefined && b.maxHp !== undefined && b.hp < b.maxHp) {
				const hpPct = Math.max(0, Math.min(1, b.hp / b.maxHp));
				const barX = px + 4;
				const barY = py + CELL_SIZE + 2;
				const barW = CELL_SIZE - 8;
				const barH = 4;

				g.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 1);
				g.fill({ color: 0x090d16 });
				g.roundRect(barX, barY, barW * hpPct, barH, 1);
				g.fill({ color: hpPct > 0.5 ? 0x22c55e : hpPct > 0.25 ? 0xeab308 : 0xef4444 });
			}

			// Spawn / Attack Cooldown timer bar
			if (!b.specialType || b.specialType === 'repair' || b.specialType === 'tower') {
				const maxCd =
					b.specialType === 'repair'
						? 1.0
						: b.specialType === 'tower'
							? b.attackCooldown || 1.0
							: b.spawnCooldown;
				const currentTimer = b.specialType === 'tower' ? b.attackTimer || 0 : b.spawnTimer;
				const pct = Math.max(0, Math.min(1, 1 - currentTimer / maxCd));

				const barX = px + 4;
				const barY = py - 7;
				const barW = CELL_SIZE - 8;
				const barH = 4;

				g.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 1);
				g.fill({ color: 0x090d16 });
				if (pct > 0) {
					g.roundRect(barX, barY, barW * pct, barH, 1);
					g.fill({ color: 0x38bdf8 });
				}
			}
		}
	}

	public drawCastles(g: Graphics, selectedEntity?: SelectedEntity): void {
		const westSelected = selectedEntity?.type === 'castle' && selectedEntity.team === 'west';
		const eastSelected = selectedEntity?.type === 'castle' && selectedEntity.team === 'east';
		this.renderAuthenticCastle(g, this.sim.castles.west, true, westSelected);
		this.renderAuthenticCastle(g, this.sim.castles.east, false, eastSelected);
	}

	public renderAuthenticCastle(
		g: Graphics,
		castle: Castle,
		isWest: boolean,
		isSelected = false
	): void {
		const cx = castle.x;
		const cy = castle.y;
		const teamColor = this.sim.players[castle.team]?.color?.num || (isWest ? 0x0042ff : 0xff0303);

		// Stone Courtyard Foundation Slab (200x260)
		g.roundRect(cx - 100, cy - 130, 200, 260, 16);
		g.fill({ color: 0x334155 });
		g.stroke({ color: isSelected ? 0xf59e0b : 0x1e293b, width: isSelected ? 4 : 3 });

		// Selection Halo for Castle
		if (isSelected) {
			g.roundRect(cx - 106, cy - 136, 212, 272, 18);
			g.stroke({ color: 0xfbbf24, width: 2, alpha: 0.85 });
		}

		// Central Keep (120x160)
		const keepW = 120;
		const keepH = 160;
		g.roundRect(cx - keepW / 2, cy - keepH / 2, keepW, keepH, 12);
		g.fill({ color: 0x475569 });
		g.stroke({ color: 0x1e293b, width: 3 });

		// 4 Massive Corner Watchtowers
		const towers = [
			{ x: cx - keepW / 2 - 10, y: cy - keepH / 2 - 10 },
			{ x: cx + keepW / 2 - 20, y: cy - keepH / 2 - 10 },
			{ x: cx - keepW / 2 - 10, y: cy + keepH / 2 - 20 },
			{ x: cx + keepW / 2 - 20, y: cy + keepH / 2 - 20 }
		];
		for (const t of towers) {
			// Tower Base
			g.rect(t.x, t.y, 30, 30);
			g.fill({ color: 0x64748b });
			g.stroke({ color: 0x1e293b, width: 2 });

			// Conical Roof in Player Color
			g.poly([t.x + 15, t.y - 18, t.x + 30, t.y, t.x, t.y]);
			g.fill({ color: teamColor });
			g.stroke({ color: 0x0f172a, width: 1.5 });
		}

		// Arched Castle Gate with Iron Portcullis Grille
		const gateDir = isWest ? 1 : -1;
		const gateX = cx + gateDir * (keepW / 2 - 16);
		g.roundRect(gateX - 12, cy - 24, 24, 48, 6);
		g.fill({ color: 0x0f172a });
		// Iron Portcullis Grate
		for (let gy = cy - 18; gy <= cy + 18; gy += 8) {
			g.moveTo(gateX - 10, gy);
			g.lineTo(gateX + 10, gy);
			g.stroke({ color: 0x94a3b8, width: 2 });
		}

		// Heraldic Flag / Banner Flapping Above Central Keep
		const flagPoleX = cx;
		const flagPoleY = cy - keepH / 2 - 32;
		g.moveTo(flagPoleX, cy - keepH / 2 + 15);
		g.lineTo(flagPoleX, flagPoleY);
		g.stroke({ color: 0xd97706, width: 3 });

		// Pennant in team color
		g.poly([flagPoleX, flagPoleY, flagPoleX + 32, flagPoleY + 10, flagPoleX, flagPoleY + 20]);
		g.fill({ color: teamColor });
		g.stroke({ color: 0xfef08a, width: 1 });

		// Castle Health Bar
		const hpPct = Math.max(0, castle.hp / castle.maxHp);
		const barWidth = 160;
		const barHeight = 10;
		const barX = cx - barWidth / 2;
		const barY = cy - keepH / 2 - 46;

		g.rect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
		g.fill({ color: 0x0f172a });
		g.rect(barX, barY, barWidth * hpPct, barHeight);
		g.fill({ color: hpPct > 0.5 ? 0x22c55e : hpPct > 0.25 ? 0xeab308 : 0xef4444 });

		// Damaged Castle: Smoke & Fire particles rising from battlements
		if (hpPct < 0.6) {
			const time = this.sim.gameTime;
			for (let i = 0; i < 4; i++) {
				const smokeX = cx - 45 + i * 30 + Math.sin(time * 3 + i) * 6;
				const smokeY = cy - keepH / 2 - 8 - ((time * 25 + i * 14) % 36);
				const radius = 5 + ((time * 6 + i * 3) % 8);
				g.circle(smokeX, smokeY, radius);
				g.fill({ color: 0x334155, alpha: 0.35 });

				if (hpPct < 0.35) {
					const fireX = cx - 35 + i * 24 + Math.cos(time * 10 + i) * 4;
					const fireY = cy - keepH / 2 + 8 - ((time * 35 + i * 8) % 18);
					g.circle(fireX, fireY, 4.5);
					g.fill({ color: 0xf97316, alpha: 0.75 });
				}
			}
		}

		// Azure Dome Invulnerability Shield
		if (this.sim.castleInvulnerableTimer[castle.team] > 0) {
			g.circle(cx, cy, 140);
			g.fill({ color: 0x06b6d4, alpha: 0.25 });
			g.stroke({ color: 0x38bdf8, width: 4, alpha: 0.85 });
		}
	}

	public drawWorkersLayer(g: Graphics, isWorkerSelected: boolean): void {
		g.clear();

		const playersToRender = this.sim.allPlayers?.length
			? this.sim.allPlayers
			: [this.sim.players.west, this.sim.players.east];

		for (const player of playersToRender) {
			const w = player?.worker;
			if (!w) continue;

			const isWest = player.team === 'west';
			const isHumanWorker = player === this.sim.players.west;
			const wx = w.x;
			const wy = w.y;
			const slot = player.slot ?? (isWest ? 1 : 2);
			const bob = Math.sin(this.sim.gameTime * 6 + slot) * 1.5;
			const playerColor = player.color?.num ?? (isWest ? 0x0042ff : 0xff0303);

			// Selection Ring at Worker's feet
			if (isHumanWorker && isWorkerSelected) {
				const pulse = 0.8 + Math.sin(this.sim.gameTime * 7) * 0.2;
				g.ellipse(wx, wy + 14, 20, 10);
				g.stroke({ color: 0x22c55e, width: 2.5, alpha: pulse });
			}

			// Shadow
			g.ellipse(wx, wy + 14, 16, 7);
			g.fill({ color: 0x000000, alpha: 0.35 });

			// Worker Body & Tunic in Player Color
			g.roundRect(wx - 8, wy - 4 + bob, 16, 16, 4);
			g.fill({ color: playerColor });
			g.stroke({ color: 0xe2e8f0, width: 1.5 });

			// Head & Skin Color based on Race
			const race = player.race?.toLowerCase() || '';
			const skinColor = race.includes('орк')
				? 0x15803d
				: race.includes('нежить')
					? 0x94a3b8
					: race.includes('ельф')
						? 0xfef08a
						: 0xfcd34d;
			g.circle(wx, wy - 10 + bob, 7);
			g.fill({ color: skinColor });
			g.stroke({ color: 0xd97706, width: 1 });

			// Calculate facing direction
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

			// Construction Hammer / Mallet
			const isSwinging = w.isBuilding || w.isRepairing;
			const hammerSwing = isSwinging ? Math.sin(this.sim.gameTime * 18 + slot) * 12 : 0;
			const hx = wx + facing * 10;
			const hy = wy + bob - 2 + hammerSwing;

			g.moveTo(hx - facing * 2, hy + 8);
			g.lineTo(hx + facing * 4, hy - 4);
			g.stroke({ color: 0x92400e, width: 2.5 });
			g.rect(facing === 1 ? hx + 1 : hx - 8, hy - 7, 7, 5);
			g.fill({ color: 0x94a3b8 });

			// Sparks if building or repairing
			if (isSwinging) {
				const spX = hx + facing * 5 + Math.sin(this.sim.gameTime * 30 + slot) * 6;
				const spY = hy + Math.cos(this.sim.gameTime * 30 + slot) * 6;
				g.circle(spX, spY, 2.5);
				g.fill({ color: 0xfef08a });
			}
		}
	}

	public drawUnitsLayer(g: Graphics, selectedEntity: SelectedEntity, enableFog: boolean): void {
		g.clear();

		const westPlayerColor = this.sim.players.west.color?.num || 0x0042ff;
		const eastPlayerColor = this.sim.players.east.color?.num || 0xff0303;

		for (const u of this.sim.units) {
			const radius = u.size;

			if (u.state === 'DEAD') {
				if (u.deathTimer !== undefined && u.deathTimer > 0) {
					const fade = Math.max(0, u.deathTimer / 0.7);
					g.ellipse(u.x, u.y, radius * 0.9, radius * 0.45);
					g.fill({ color: 0x334155, alpha: fade * 0.65 });
				}
				continue;
			}

			// Fog of War check: hide unrevealed enemy units
			if (enableFog && u.team === 'east') {
				const isRevealed =
					u.x <= 1500 ||
					this.sim.units.some(
						(ally) =>
							ally.team === 'west' &&
							ally.state !== 'DEAD' &&
							Math.hypot(ally.x - u.x, ally.y - u.y) <= 450
					) ||
					(this.sim.allPlayers || [this.sim.players.west]).some(
						(p) =>
							p.team === 'west' && p.worker && Math.hypot(p.worker.x - u.x, p.worker.y - u.y) <= 480
					) ||
					this.sim.buildings.some(
						(b) =>
							b.team === 'west' &&
							Math.hypot(b.x + CELL_SIZE / 2 - u.x, b.y + CELL_SIZE / 2 - u.y) <= 450
					);
				if (!isRevealed) continue;
			}

			const isWest = u.team === 'west';
			const isNeutral = u.team === 'neutral';
			const playerSlotColor = u.playerSlot ? WC3_PLAYER_COLORS[u.playerSlot - 1]?.num : null;
			const unitColor = isNeutral
				? 0x7e22ce
				: (playerSlotColor ?? (isWest ? westPlayerColor : eastPlayerColor));
			const dir = isNeutral ? 1 : isWest ? 1 : -1;

			// Selection indicator ring (Green for friendly, Red for enemy, Purple for neutral)
			const isSelected =
				(selectedEntity?.type === 'unit' && selectedEntity.instanceId === u.instanceId) ||
				(selectedEntity?.type === 'group' && selectedEntity.unitIds.includes(u.instanceId));

			if (isSelected) {
				const ringColor = isNeutral ? 0xa855f7 : isWest ? 0x22c55e : 0xef4444;
				g.ellipse(u.x, u.y + radius * 0.7, radius * 1.35, radius * 0.7);
				g.stroke({ color: ringColor, width: 2.5 });
			}

			// Shadow
			const shadowY = u.flying ? u.y + 24 : u.y + radius * 0.6;
			g.ellipse(u.x, shadowY, radius * 0.9, radius * 0.45);
			g.fill({ color: 0x000000, alpha: u.flying ? 0.25 : 0.35 });

			// Flying bobbing
			const renderY = u.flying ? u.y + Math.sin(this.sim.gameTime * 4) * 4 : u.y;

			// Unit circle
			g.circle(u.x, renderY, radius);
			g.fill({ color: unitColor });
			g.stroke({ color: isSelected ? 0x4ade80 : 0x0f172a, width: isSelected ? 2.5 : 1.5 });

			// Facing direction indicator
			g.moveTo(u.x + dir * (radius - 2), renderY);
			g.lineTo(u.x + dir * (radius + 5), renderY);
			g.stroke({ color: 0xfef08a, width: 2 });

			// Attack animation swing
			if (u.attackAnimTimer && u.attackAnimTimer > 0) {
				const flashAlpha = u.attackAnimTimer / 0.25;
				g.circle(u.x + dir * (radius + 6), renderY, 6);
				g.fill({ color: 0xfef08a, alpha: flashAlpha * 0.7 });
			}

			// Wings for flying units
			if (u.flying) {
				const flap = Math.sin(this.sim.gameTime * 12) * 5;
				g.poly([u.x - 4, renderY - 2, u.x - radius - 6, renderY - 10 + flap, u.x - 2, renderY - 4]);
				g.fill({ color: 0xe2e8f0, alpha: 0.85 });
				g.poly([u.x + 4, renderY - 2, u.x + radius + 6, renderY - 10 + flap, u.x + 2, renderY - 4]);
				g.fill({ color: 0xe2e8f0, alpha: 0.85 });
			}

			// Active Buff Auras & Spell Effects
			if (u.buffs && u.buffs.length > 0) {
				for (const buff of u.buffs) {
					if (buff.type === 'dmg') {
						g.circle(u.x, renderY, radius + 4);
						g.stroke({ color: 0xf87171, width: 1.5, alpha: 0.65 });
					} else if (buff.type === 'shield') {
						g.circle(u.x, renderY, radius + 5);
						g.stroke({ color: 0x60a5fa, width: 1.5, alpha: 0.65 });
					} else if (buff.type === 'as') {
						g.circle(u.x, renderY, radius + 6);
						g.stroke({ color: 0x4ade80, width: 1.5, alpha: 0.65 });
					} else if (buff.type === 'bloodlust') {
						g.circle(u.x, renderY, radius + 5);
						g.stroke({ color: 0xef4444, width: 2.5, alpha: 0.85 });
					} else if (buff.type === 'inner_fire') {
						g.circle(u.x, renderY, radius + 6);
						g.stroke({ color: 0xfbbf24, width: 2, alpha: 0.75 });
					} else if (buff.type === 'armor_buff') {
						g.circle(u.x, renderY, radius + 4);
						g.stroke({ color: 0xa3e635, width: 1.5, alpha: 0.7 });
					} else if (buff.type === 'frost' || buff.type === 'slow') {
						// Swirling ice crystals
						for (let i = 0; i < 3; i++) {
							const iceAngle = (i * 2 * Math.PI) / 3 + this.sim.gameTime * 3.5;
							const ix = u.x + Math.cos(iceAngle) * (radius + 5);
							const iy = renderY + Math.sin(iceAngle) * (radius + 5);
							g.rect(ix - 2, iy - 2, 4, 4);
							g.fill({ color: 0x67e8f9, alpha: 0.9 });
							g.stroke({ color: 0xe0f2fe, width: 1 });
						}
					} else if (buff.type === 'curse') {
						const curseAngle = this.sim.gameTime * 3;
						g.circle(u.x + Math.cos(curseAngle) * 7, renderY - radius - 8, 3.5);
						g.fill({ color: 0x6b21a8, alpha: 0.75 });
					} else if (buff.type === 'poison' || buff.type === 'infect') {
						const pAngle = this.sim.gameTime * 4;
						g.circle(u.x + Math.sin(pAngle) * 6, renderY + Math.cos(pAngle) * 6, 2.5);
						g.fill({ color: 0x22c55e, alpha: 0.8 });
					}
				}
			}

			// Stun dizzy stars overhead
			if (u.isStunned) {
				const starRadius = radius * 0.75;
				for (let i = 0; i < 3; i++) {
					const sAngle = (i * 2 * Math.PI) / 3 + this.sim.gameTime * 6;
					const sx = u.x + Math.cos(sAngle) * starRadius;
					const sy = renderY - radius - 12 + Math.sin(sAngle) * 2;
					g.circle(sx, sy, 2.5);
					g.fill({ color: 0xfacc15 });
				}
			}

			// Ensnare web on ground
			if (u.isEnsnared) {
				g.ellipse(u.x, renderY + radius * 0.4, radius * 1.3, radius * 0.6);
				g.stroke({ color: 0xe2e8f0, width: 1.5, alpha: 0.8 });
				g.moveTo(u.x - radius, renderY + radius * 0.4);
				g.lineTo(u.x + radius, renderY + radius * 0.4);
				g.stroke({ color: 0xe2e8f0, width: 1, alpha: 0.6 });
			}

			// Immolation flickering fire aura
			if (u.immolationDps && u.immolationDps > 0) {
				const flameR = radius + 6;
				const flicker = Math.sin(this.sim.gameTime * 18 + u.x) * 2;
				g.circle(u.x, renderY, flameR + flicker);
				g.stroke({ color: 0xf97316, width: 2, alpha: 0.65 });
				for (let i = 0; i < 4; i++) {
					const flameAngle = (i * Math.PI) / 2 + this.sim.gameTime * 4;
					const fx = u.x + Math.cos(flameAngle) * (flameR - 1);
					const fy = renderY + Math.sin(flameAngle) * (flameR - 1);
					g.circle(fx, fy, 3);
					g.fill({ color: 0xfacc15, alpha: 0.85 });
				}
			}

			if (u.isScavenger) {
				g.circle(u.x, renderY, radius + 3);
				g.stroke({ color: 0xfacc15, width: 2, alpha: 0.85 });
			}

			// Health bar above head
			const hpPct = Math.max(0, Math.min(1, u.hp / u.maxHp));
			const barWidth = Math.max(20, radius * 2);
			const barHeight = 3.5;
			const barX = u.x - barWidth / 2;
			const barY = renderY - radius - 7;

			g.rect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
			g.fill({ color: 0x0f172a });
			g.rect(barX, barY, barWidth * hpPct, barHeight);
			g.fill({ color: hpPct > 0.5 ? 0x4ade80 : hpPct > 0.25 ? 0xfacc15 : 0xf87171 });
		}
	}

	public drawCoinsLayer(g: Graphics): void {
		g.clear();
		for (const coin of this.sim.goldCoins) {
			const pulse = 1 + Math.sin(this.sim.gameTime * 7) * 0.15;
			const radius = 9 * pulse;

			g.circle(coin.x, coin.y, radius + 4);
			g.fill({ color: 0xfbbf24, alpha: 0.25 });

			g.circle(coin.x, coin.y, radius);
			g.fill({ color: 0xf59e0b });
			g.stroke({ color: 0xfef08a, width: 2 });

			g.circle(coin.x, coin.y, radius * 0.4);
			g.fill({ color: 0xfef08a });
		}
	}

	public drawProjectilesLayer(g: Graphics): void {
		g.clear();

		for (const p of this.sim.projectiles) {
			if (p.damage <= 0) continue;

			// Parabolic Arc height calculation: z = 4 * H * (d/D) * (1 - d/D)
			let z = 0;
			if (p.originX !== undefined && p.originY !== undefined && p.totalDist && p.arcHeight) {
				const currentDist = Math.hypot(p.x - p.originX, p.y - p.originY);
				const norm = Math.max(0, Math.min(1, currentDist / p.totalDist));
				z = 4 * p.arcHeight * norm * (1 - norm);
			}

			// 1. Ground Shadow underneath
			g.ellipse(p.x, p.y + 4, 4 + z * 0.05, 2);
			g.fill({ color: 0x000000, alpha: 0.35 });

			// 2. Projectile elevated in the air by z
			const projY = p.y - z;

			if (p.attackType === 'magic') {
				const isFrost = p.hasFrost;
				const coreColor = isFrost ? 0x38bdf8 : 0xc084fc;
				const haloColor = isFrost ? 0x0284c7 : 0xa855f7;

				g.circle(p.x, projY, 5);
				g.fill({ color: coreColor });
				g.circle(p.x, projY, 10);
				g.fill({ color: haloColor, alpha: 0.35 });

				// Orbiting magical sparkle
				const sparkleAngle = this.sim.gameTime * 20;
				g.circle(p.x + Math.cos(sparkleAngle) * 5, projY + Math.sin(sparkleAngle) * 5, 2);
				g.fill({ color: 0xffffff, alpha: 0.85 });
			} else if (p.attackType === 'siege') {
				// Ballistic artillery smoke puffs
				const dirNormX = (p.targetX - (p.originX ?? p.x)) / (p.totalDist || 1);
				const dirNormY = (p.targetY - (p.originY ?? p.y)) / (p.totalDist || 1);
				for (let s = 1; s <= 3; s++) {
					const puffX = p.x - dirNormX * s * 8;
					const puffY = projY - dirNormY * s * 8 + s * 1.5;
					g.circle(puffX, puffY, Math.max(1, 4 - s));
					g.fill({ color: 0x64748b, alpha: 0.35 / s });
				}

				// Molten burning boulder / mortar shell
				g.circle(p.x, projY, 7);
				g.fill({ color: 0x334155 });
				g.stroke({ color: 0x1e293b, width: 2 });
				g.circle(p.x, projY, 3);
				g.fill({ color: 0xf97316 });
			} else {
				// Pierce / Arrow facing direction
				const angle = Math.atan2(p.targetY - p.y, p.targetX - p.x);
				const len = 12;
				const headX = p.x + Math.cos(angle) * (len / 2);
				const headY = projY + Math.sin(angle) * (len / 2);
				const tailX = p.x - Math.cos(angle) * (len / 2);
				const tailY = projY - Math.sin(angle) * (len / 2);

				g.moveTo(tailX, tailY);
				g.lineTo(headX, headY);
				g.stroke({ color: 0xd97706, width: 2 });

				// Arrow tip
				g.circle(headX, headY, 2);
				g.fill({ color: 0xe2e8f0 });
			}
		}

		// AoE Splash Circles
		for (const s of this.sim.splashEffects) {
			const progress = 1 - s.timer / s.maxTimer;
			const radius = s.radius * Math.min(1, progress * 1.2);
			const alpha = Math.max(0, 1 - progress);
			g.circle(s.x, s.y, radius);
			g.fill({ color: 0xf97316, alpha: alpha * 0.25 });
			g.stroke({ color: 0xfbbf24, width: 2, alpha });
		}
	}

	public drawLightningEffects(g: Graphics): void {
		for (const eff of this.sim.lightningEffects) {
			const alpha = Math.max(0, eff.timer / eff.maxTimer);
			const color = eff.color ?? 0x67e8f9;

			const dx = eff.targetX - eff.sourceX;
			const dy = eff.targetY - eff.sourceY;
			const dist = Math.hypot(dx, dy);
			const segments = Math.max(3, Math.floor(dist / 35));

			const perpX = -dy / (dist || 1);
			const perpY = dx / (dist || 1);

			// Outer electric bolt
			g.moveTo(eff.sourceX, eff.sourceY);
			for (let i = 1; i < segments; i++) {
				const t = i / segments;
				const jitter = Math.sin(i * 13.7 + this.sim.gameTime * 25) * 12;
				const px = eff.sourceX + dx * t + perpX * jitter;
				const py = eff.sourceY + dy * t + perpY * jitter;
				g.lineTo(px, py);
			}
			g.lineTo(eff.targetX, eff.targetY);
			g.stroke({ color, width: 3, alpha });

			// Inner electric core
			g.moveTo(eff.sourceX, eff.sourceY);
			for (let i = 1; i < segments; i++) {
				const t = i / segments;
				const jitter = Math.sin(i * 13.7 + this.sim.gameTime * 25) * 12;
				const px = eff.sourceX + dx * t + perpX * jitter;
				const py = eff.sourceY + dy * t + perpY * jitter;
				g.lineTo(px, py);
			}
			g.lineTo(eff.targetX, eff.targetY);
			g.stroke({ color: 0xffffff, width: 1.2, alpha: alpha * 0.9 });
		}
	}

	public drawRescueStrikeEffects(g: Graphics): void {
		for (const eff of this.sim.rescueStrikeEffects) {
			const progress = 1 - eff.timer / eff.maxTimer;
			const currentRadius = eff.radius * Math.min(1, progress * 1.3);
			const alpha = Math.max(0, 1 - progress);

			g.circle(eff.x, eff.y, currentRadius);
			g.fill({ color: 0xf97316, alpha: alpha * 0.2 });
			g.stroke({ color: 0xef4444, width: 4 * (1 - progress) + 1, alpha });
		}
	}
}
