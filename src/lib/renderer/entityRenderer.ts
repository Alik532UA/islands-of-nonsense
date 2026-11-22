import type { Graphics } from 'pixi.js';
import type { Simulation } from '../engine/simulation';
import { WC3_PLAYER_COLORS, type Castle, type MatchTeam, type Unit } from '../engine/types';
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

	// =========================================================================
	// 1. 2.5D SPYRO-STYLED BUILDINGS LAYER
	// =========================================================================
	public drawBuildingsLayer(g: Graphics, selectedPlacedId: string | null, enableFog = false): void {
		g.clear();

		for (const b of this.sim.buildings) {
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
			const teamColor = this.sim.players[b.team]?.color?.num || (isWest ? 0x0042ff : 0xff0303);

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

			// 3. Steep-Pitched 2.5D Shingled Roof with Race Color
			const raceColors: Record<string, number> = {
				Люди: 0x1e40af,
				Орки: 0x991b1b,
				Нежить: 0x065f46,
				Ельфи: 0x047857,
				Эльфы: 0x047857,
				Хаос: 0x831843,
				Наги: 0x0e7490,
				Північ: 0x0284c7,
				Север: 0x0284c7,
				Порча: 0x6b21a8,
				'Нічні ельфи': 0x3f6212,
				'Ночні ельфи': 0x3f6212,
				'Ночные эльфы': 0x3f6212,
				Техніки: 0x92400e,
				Техники: 0x92400e,
				Збирачі: 0x475569,
				Сборщики: 0x475569
			};
			const roofColor = raceColors[b.race] || 0x1e3a8a;

			g.roundRect(px + 6, py + 5, CELL_SIZE - 12, CELL_SIZE - 14, 5);
			g.fill({ color: roofColor });
			g.roundRect(px + 8, py + 6, CELL_SIZE - 16, (CELL_SIZE - 14) / 2, 4);
			g.fill({ color: 0xffffff, alpha: 0.2 });

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

			// Team colored crest / pennant stripe
			g.beginPath();
			g.rect(px + half - 4, py + 6, 8, CELL_SIZE - 16);
			g.fill({ color: teamColor });
			g.stroke({ color: 0xfef08a, width: 1, alpha: 0.8 });

			// 4. Cozy Spyro Lantern Window (Warm glowing yellow light)
			g.beginPath();
			g.circle(px + half, py + half - 2, 6);
			g.fill({ color: 0xfbbf24 });
			g.beginPath();
			g.circle(px + half, py + half - 2, 3);
			g.fill({ color: 0xfef08a });

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
				const barY = py - 9;
				const barW = CELL_SIZE - 8;
				const barH = 5;

				g.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 2);
				g.fill({ color: 0x090d16 });
				g.roundRect(barX, barY, barW * progPct, barH, 1.5);
				g.fill({ color: 0xf59e0b });
			}

			// Spawn progress timer bar
			if (!b.isUnderConstruction && b.spawnCooldown > 0) {
				const pct = Math.max(0, Math.min(1, (b.spawnTimer || 0) / b.spawnCooldown));
				const barX = px + 4;
				const barY = py - 8;
				const barW = CELL_SIZE - 8;
				const barH = 4;

				g.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 2);
				g.fill({ color: 0x090d16 });
				if (pct > 0) {
					g.roundRect(barX, barY, barW * pct, barH, 1);
					g.fill({ color: 0x38bdf8 });
				}
			}
		}
	}

	// =========================================================================
	// 2. 2.5D GRAND ALLIANCE / FANTASY CASTLE (Matching reference art)
	// =========================================================================
	public drawCastles(g: Graphics, selectedEntity?: SelectedEntity, _enableFog = false): void {
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

	// =========================================================================
	// 3. 2.5D WORKERS LAYER
	// =========================================================================
	public drawWorkersLayer(g: Graphics, isWorkerSelected: boolean, enableFog = false): void {
		g.clear();

		const playersToRender = this.sim.allPlayers?.length
			? this.sim.allPlayers
			: [this.sim.players.west, this.sim.players.east];

		for (const player of playersToRender) {
			const w = player?.worker;
			if (!w) continue;
			if (enableFog && player.team !== 'west' && !this.sim.isPointRevealed('west', w.x, w.y)) {
				continue;
			}

			const isWest = player.team === 'west';
			const isHumanWorker = player === this.sim.players.west;
			const wx = w.x;
			const wy = w.y;
			const slot = player.slot ?? (isWest ? 1 : 2);
			const bob = Math.sin(this.sim.gameTime * 7 + slot) * 2;
			const playerColor = player.color?.num ?? (isWest ? 0x0042ff : 0xff0303);

			// Radiant Cyan / Golden Glow Ring at Feet
			const ringPulse = 0.85 + Math.sin(this.sim.gameTime * 6) * 0.15;
			g.beginPath();
			g.ellipse(wx, wy + 16, 22, 11);
			g.stroke({
				color: isHumanWorker && isWorkerSelected ? 0xfbbf24 : 0x00f5ff,
				width: isHumanWorker && isWorkerSelected ? 3.5 : 2,
				alpha: ringPulse
			});

			// 2.5D Drop Shadow
			g.beginPath();
			g.ellipse(wx + 3, wy + 16, 18, 8);
			g.fill({ color: 0x000000, alpha: 0.4 });

			// Worker Body & Tunic
			g.beginPath();
			g.roundRect(wx - 9, wy - 5 + bob, 18, 18, 5);
			g.fill({ color: playerColor });
			g.stroke({ color: 0x1e293b, width: 1.5 });
			g.beginPath();
			g.roundRect(wx - 7, wy - 4 + bob, 14, 7, 3);
			g.fill({ color: 0xffffff, alpha: 0.25 });

			// Leather toolbelt
			g.beginPath();
			g.rect(wx - 8, wy + 5 + bob, 16, 3);
			g.fill({ color: 0x78350f });

			// Head & Skin Color
			const race = player.race?.toLowerCase() || '';
			const skinColor = race.includes('орк')
				? 0x16a34a
				: race.includes('нежить')
					? 0x94a3b8
					: race.includes('ельф')
						? 0xfef08a
						: 0xfcd34d;
			g.beginPath();
			g.circle(wx, wy - 11 + bob, 8);
			g.fill({ color: skinColor });
			g.stroke({ color: 0x78350f, width: 1.2 });

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

			// Eyes
			g.beginPath();
			g.circle(wx + facing * 3, wy - 12 + bob, 2.5);
			g.fill({ color: 0x0f172a });
			g.beginPath();
			g.circle(wx + facing * 3.5, wy - 13 + bob, 1);
			g.fill({ color: 0xffffff });

			// Hammer
			const isSwinging = w.isBuilding || w.isRepairing;
			const hammerSwing = isSwinging ? Math.sin(this.sim.gameTime * 20 + slot) * 14 : 0;
			const hx = wx + facing * 12;
			const hy = wy + bob - 3 + hammerSwing;

			g.beginPath();
			g.moveTo(hx - facing * 3, hy + 9);
			g.lineTo(hx + facing * 4, hy - 5);
			g.stroke({ color: 0x92400e, width: 3 });
			g.beginPath();
			g.rect(facing === 1 ? hx + 1 : hx - 9, hy - 8, 8, 6);
			g.fill({ color: 0x94a3b8 });
			g.stroke({ color: 0x334155, width: 1 });

			if (isSwinging) {
				const spX = hx + facing * 6 + Math.sin(this.sim.gameTime * 30) * 6;
				const spY = hy + Math.cos(this.sim.gameTime * 30) * 6;
				g.beginPath();
				g.circle(spX, spY, 3);
				g.fill({ color: 0xfef08a });
			}
		}
	}

	// =========================================================================
	// 4. 2.5D RICH MOBS LAYER (Styling directly from C:\...\раси)
	// =========================================================================
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

			// Fog of War check: hide unrevealed enemy and neutral units
			if (enableFog && u.team !== 'west' && !this.sim.isPointRevealed('west', u.x, u.y)) {
				continue;
			}

			const isWest = u.team === 'west';
			const isNeutral = u.team === 'neutral';
			const playerSlotColor = u.playerSlot ? WC3_PLAYER_COLORS[u.playerSlot - 1]?.num : null;
			const unitColor = isNeutral
				? 0x7e22ce
				: (playerSlotColor ?? (isWest ? westPlayerColor : eastPlayerColor));
			const dir = isNeutral ? 1 : isWest ? 1 : -1;

			const isSelected =
				(selectedEntity?.type === 'unit' && selectedEntity.instanceId === u.instanceId) ||
				(selectedEntity?.type === 'group' && selectedEntity.unitIds.includes(u.instanceId));

			// Bobbing & Elevation
			const walkBob =
				u.state === 'WALKING' ? Math.sin(this.sim.gameTime * 10 + u.x * 0.08) * 2.5 : 0;
			const flyAltitude = u.flying ? 22 + Math.sin(this.sim.gameTime * 4) * 6 : 0;
			const renderY = u.y - flyAltitude + walkBob;

			// =====================================================================
			// A. LUMINOUS GLOW RING AT FEET (Matching Reference Concept Art!)
			// =====================================================================
			const ringR = radius * 1.35;
			const ringY = u.y + radius * 0.65;

			if (isSelected) {
				// MAGNIFICENT DOUBLE GOLDEN RUNE RING WITH GLOWING RUNES
				g.beginPath();
				g.ellipse(u.x, ringY, ringR * 1.25, ringR * 0.6);
				g.stroke({ color: 0xfbbf24, width: 3.5, alpha: 0.95 });
				g.beginPath();
				g.ellipse(u.x, ringY, ringR * 0.9, ringR * 0.45);
				g.stroke({ color: 0xfef08a, width: 2, alpha: 0.85 });

				// Ancient glowing magical runes around perimeter
				for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
					const rx = u.x + Math.cos(a) * (ringR * 1.05);
					const ry = ringY + Math.sin(a) * (ringR * 0.52);
					g.beginPath();
					g.circle(rx, ry, 2.2);
					g.fill({ color: 0xfef08a });
				}
			} else {
				// Radiant neon ground glow (Cyan for West, Fiery Orange for East, Violet for Neutral)
				const baseRingColor = isNeutral ? 0xa855f7 : isWest ? 0x00f5ff : 0xff4500;
				// Soft outer aura
				g.beginPath();
				g.ellipse(u.x, ringY, ringR * 1.2, ringR * 0.55);
				g.stroke({ color: baseRingColor, width: 3.5, alpha: 0.35 });
				// Sharp inner core ring
				g.beginPath();
				g.ellipse(u.x, ringY, ringR, ringR * 0.5);
				g.stroke({ color: baseRingColor, width: 2, alpha: 0.9 });
			}

			// =====================================================================
			// B. 2.5D CONTACT DROP SHADOW
			// =====================================================================
			const shadowY = u.y + radius * 0.65;
			const shadowAlpha = u.flying ? 0.22 : 0.45;
			g.beginPath();
			g.ellipse(u.x + 3, shadowY, radius * (u.flying ? 0.75 : 1.1), radius * 0.45);
			g.fill({ color: 0x000000, alpha: shadowAlpha });

			// =====================================================================
			// C. VOLUMETRIC 2.5D CHARACTER TOKEN (Specific Archetype from \раси)
			// =====================================================================
			this.renderUnitArchetype(g, u, isWest, unitColor, isSelected, renderY, dir);

			// =====================================================================
			// D. ACTIVE SPELL BUFF AURAS
			// =====================================================================
			if (u.buffs && u.buffs.length > 0) {
				for (const buff of u.buffs) {
					if (buff.type === 'dmg') {
						g.beginPath();
						g.circle(u.x, renderY, radius + 4);
						g.stroke({ color: 0xf87171, width: 2, alpha: 0.7 });
					} else if (buff.type === 'shield') {
						g.beginPath();
						g.circle(u.x, renderY, radius + 5);
						g.stroke({ color: 0x60a5fa, width: 2, alpha: 0.75 });
					} else if (buff.type === 'as') {
						g.beginPath();
						g.circle(u.x, renderY, radius + 6);
						g.stroke({ color: 0x4ade80, width: 2, alpha: 0.75 });
					} else if (buff.type === 'bloodlust') {
						g.beginPath();
						g.circle(u.x, renderY, radius + 6);
						g.stroke({ color: 0xef4444, width: 3, alpha: 0.9 });
					} else if (buff.type === 'frost' || buff.type === 'slow') {
						for (let i = 0; i < 3; i++) {
							const iceAngle = (i * 2 * Math.PI) / 3 + this.sim.gameTime * 3.5;
							const ix = u.x + Math.cos(iceAngle) * (radius + 6);
							const iy = renderY + Math.sin(iceAngle) * (radius + 6);
							g.beginPath();
							g.rect(ix - 2, iy - 2, 4, 4);
							g.fill({ color: 0x67e8f9, alpha: 0.95 });
							g.stroke({ color: 0xe0f2fe, width: 1 });
						}
					}
				}
			}

			// =====================================================================
			// E. SLEEK DARK BEVELED HEALTH BAR
			// =====================================================================
			const hpPct = Math.max(0, u.hp / u.maxHp);
			if (hpPct < 1 || isSelected) {
				const barW = Math.max(26, radius * 2 + 6);
				const barH = 5;
				const barX = u.x - barW / 2;
				const barY = renderY - radius - 10;

				g.beginPath();
				g.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 2);
				g.fill({ color: 0x090d16 });
				g.beginPath();
				g.roundRect(barX, barY, barW * hpPct, barH, 1.5);
				g.fill({ color: hpPct > 0.5 ? 0x22c55e : hpPct > 0.25 ? 0xeab308 : 0xef4444 });
			}
		}
	}

	/**
	 * Renders one of the 8 iconic unit archetypes from the C:\...\раси concept art:
	 * 1. Dragon / Aerial Flyer
	 * 2. Colossus / Tank (with heavy war hammer)
	 * 3. Ranger / Archer (with drawn bow)
	 * 4. Archmage / Wizard (with staff & swirling runes)
	 * 5. Warrior / Champion (with battle axes & horn helm)
	 * 6. Beast / War Hound (crouching beast)
	 * 7. Scout / Fairy (dual daggers & wings)
	 * 8. Siege Engine (brass cannon)
	 */
	private renderUnitArchetype(
		g: Graphics,
		u: Unit,
		isWest: boolean,
		unitColor: number,
		isSelected: boolean,
		renderY: number,
		dir: number
	): void {
		const radius = u.size;

		// 1. Base 3D Shaded Body Token
		g.beginPath();
		g.circle(u.x, renderY + 2, radius);
		g.fill({ color: 0x000000, alpha: 0.35 });
		g.beginPath();
		g.circle(u.x, renderY, radius);
		g.fill({ color: unitColor });
		g.stroke({ color: isSelected ? 0xfbbf24 : 0x0f172a, width: isSelected ? 3 : 1.8 });
		// Crescent light highlight
		g.beginPath();
		g.ellipse(u.x - 2, renderY - radius * 0.35, radius * 0.65, radius * 0.35);
		g.fill({ color: 0xffffff, alpha: 0.35 });

		// 2. Archetype Detailing
		if (u.flying) {
			// AERIAL FLYER / DRAGON (Spread wings & flame snout)
			const flap = Math.sin(this.sim.gameTime * 14) * 8;
			// Left wing
			g.beginPath();
			g.poly([
				u.x - 4,
				renderY - 2,
				u.x - radius - 14,
				renderY - 14 + flap,
				u.x - radius - 6,
				renderY + 2,
				u.x - 2,
				renderY + 4
			]);
			g.fill({ color: 0x06b6d4, alpha: 0.9 });
			g.stroke({ color: 0x0891b2, width: 1.5 });
			// Right wing
			g.beginPath();
			g.poly([
				u.x + 4,
				renderY - 2,
				u.x + radius + 14,
				renderY - 14 + flap,
				u.x + radius + 6,
				renderY + 2,
				u.x + 2,
				renderY + 4
			]);
			g.fill({ color: 0x06b6d4, alpha: 0.9 });
			g.stroke({ color: 0x0891b2, width: 1.5 });

			// Dragon snout fire flare
			g.beginPath();
			g.circle(u.x + dir * (radius + 6), renderY - 2, 4);
			g.fill({ color: 0xf97316 });
			g.beginPath();
			g.circle(u.x + dir * (radius + 8), renderY - 2, 2.5);
			g.fill({ color: 0xfef08a });
		} else if (u.attackType === 'siege') {
			// SIEGE / MACHINE (Brass gears & cannon barrel)
			g.beginPath();
			g.circle(u.x, renderY, radius * 0.55);
			g.fill({ color: 0x78716c });
			g.stroke({ color: 0xd97706, width: 2 });
			g.beginPath();
			g.rect(u.x + dir * (radius * 0.2), renderY - 4, dir * 13, 8);
			g.fill({ color: 0x1e293b });
		} else if (
			u.attackType === 'magic' ||
			u.abilityType?.includes('heal') ||
			u.abilityType?.includes('slow')
		) {
			// ARCHMAGE / WIZARD (Carved Staff with glowing crystal orb & swirling halo)
			const staffX = u.x + dir * (radius * 0.8);
			const staffY = renderY - radius * 0.9;
			g.beginPath();
			g.moveTo(staffX, renderY + radius * 0.8);
			g.lineTo(staffX, staffY);
			g.stroke({ color: 0xd97706, width: 2.5 });

			// Crystal orb at top of staff
			g.beginPath();
			g.circle(staffX, staffY - 4, 5.5);
			g.fill({ color: 0x38bdf8 });
			g.beginPath();
			g.circle(staffX, staffY - 4, 3);
			g.fill({ color: 0xffffff });

			// Swirling magical halo
			const orbAngle = this.sim.gameTime * 4;
			g.beginPath();
			g.circle(staffX + Math.cos(orbAngle) * 7, staffY - 4 + Math.sin(orbAngle) * 7, 2.5);
			g.fill({ color: 0xfbbf24 });
		} else if (u.attackType === 'pierce' || u.range > 200) {
			// RANGER / ARCHER (Hooded archer with drawn recurve bow & feathered quiver)
			g.beginPath();
			g.poly([
				u.x - radius * 0.5,
				renderY - radius * 0.2,
				u.x,
				renderY - radius * 1.1,
				u.x + radius * 0.5,
				renderY - radius * 0.2
			]);
			g.fill({ color: 0x065f46 }); // Deep forest green hood

			// Drawn bow facing movement (ensure clean path without lingering (0,0) from previous fill)
			g.beginPath();
			const bowStartAngle = -Math.PI / 2.5;
			const bowEndAngle = Math.PI / 2.5;
			const bowRadius = radius * 0.8;
			const bowX = u.x + dir * (radius * 0.6);
			const bowStartX = bowX + Math.cos(bowStartAngle) * bowRadius;
			const bowStartY = renderY + Math.sin(bowStartAngle) * bowRadius;
			g.moveTo(bowStartX, bowStartY);
			g.arc(bowX, renderY, bowRadius, bowStartAngle, bowEndAngle, false);
			g.stroke({ color: 0xb45309, width: 2.2 });

			// Arrow shaft
			g.beginPath();
			g.moveTo(u.x - dir * 2, renderY);
			g.lineTo(u.x + dir * (radius + 6), renderY);
			g.stroke({ color: 0xfef08a, width: 1.8 });
		} else if (u.armorType === 'fort' || u.armorType === 'large' || u.hp >= 800) {
			// COLOSSUS / TANK (Heavy horned battle helm & colossal war hammer)
			g.beginPath();
			g.poly([
				u.x - radius * 0.7,
				renderY - radius * 0.3,
				u.x,
				renderY - radius * 1.2,
				u.x + radius * 0.7,
				renderY - radius * 0.3
			]);
			g.fill({ color: 0x64748b });
			g.stroke({ color: 0x334155, width: 2 });

			// Colossal war hammer
			const hx = u.x + dir * (radius * 0.7);
			const hy = renderY - radius * 0.7;
			g.beginPath();
			g.moveTo(u.x + dir * 2, renderY);
			g.lineTo(hx + dir * 6, hy - 4);
			g.stroke({ color: 0x78350f, width: 3 });
			g.beginPath();
			g.roundRect(hx + (dir > 0 ? 2 : -12), hy - 10, 10, 8, 2);
			g.fill({ color: 0x94a3b8 });
			g.stroke({ color: 0xfbbf24, width: 1.5 });
		} else if (
			u.name.toLowerCase().includes('вовк') ||
			u.name.toLowerCase().includes('лев') ||
			u.name.toLowerCase().includes('гонча')
		) {
			// BEAST / WAR HOUND (Mane, fangs, armored collar)
			g.beginPath();
			g.ellipse(u.x + dir * (radius * 0.3), renderY, radius * 0.8, radius * 0.5);
			g.fill({ color: 0x92400e });
			// Armored collar
			g.beginPath();
			g.rect(u.x - 2, renderY - radius * 0.5, 4, radius);
			g.fill({ color: 0xfbbf24 });
		} else {
			// WARRIOR / CHAMPION (Battle axes & shield)
			g.beginPath();
			g.poly([
				u.x - radius * 0.6,
				renderY - radius * 0.3,
				u.x,
				renderY - radius * 1.05,
				u.x + radius * 0.6,
				renderY - radius * 0.3
			]);
			g.fill({ color: 0x94a3b8 });
			g.stroke({ color: 0x334155, width: 1.8 });

			// Gleaming axe blade facing forward
			const ax = u.x + dir * (radius * 0.7);
			const ay = renderY - 4;
			g.beginPath();
			g.poly([ax, ay - 6, ax + dir * 7, ay, ax, ay + 6]);
			g.fill({ color: 0xe2e8f0 });
			g.stroke({ color: 0x475569, width: 1.5 });
		}

		// 3. GLOWING SPYRO EYES
		const eyeX = u.x + dir * (radius * 0.4);
		const eyeY = renderY - radius * 0.2;
		g.beginPath();
		g.ellipse(eyeX, eyeY, 3.5, 2.5);
		g.fill({ color: u.team === 'neutral' ? 0xf87171 : 0x00f5ff });
		g.beginPath();
		g.circle(eyeX + dir * 1, eyeY - 0.5, 1);
		g.fill({ color: 0xffffff });

		// Attack flash swing
		if (u.attackAnimTimer && u.attackAnimTimer > 0) {
			const flashAlpha = u.attackAnimTimer / 0.25;
			g.beginPath();
			g.circle(u.x + dir * (radius + 8), renderY, 7);
			g.fill({ color: 0xfef08a, alpha: flashAlpha * 0.75 });
		}
	}

	// =========================================================================
	// 5. COINS & EFFECTS
	// =========================================================================
	public drawCoinsLayer(g: Graphics, enableFog = false): void {
		g.clear();

		// 1. Battlefield scrap debris (metallic gears, bolts, scrap metal from Scavengers & fallen units)
		if (this.sim.debris) {
			for (const deb of this.sim.debris) {
				if (enableFog && !this.sim.isPointRevealed('west', deb.x, deb.y)) continue;
				const alpha = Math.min(1.0, deb.lifeTime / 4.0);
				// Cogwheel scrap
				g.beginPath();
				g.circle(deb.x, deb.y, 7);
				g.fill({ color: 0x64748b, alpha });
				g.stroke({ color: 0x334155, width: 1.5, alpha });
				// Center bolt
				g.beginPath();
				g.circle(deb.x, deb.y, 2.5);
				g.fill({ color: 0xf59e0b, alpha });
				// Metallic shine
				g.beginPath();
				g.circle(deb.x - 2, deb.y - 2, 1.5);
				g.fill({ color: 0xffffff, alpha: alpha * 0.8 });
			}
		}

		// 2. Gold Coins
		for (const coin of this.sim.goldCoins) {
			if (enableFog && !this.sim.isPointRevealed('west', coin.x, coin.y)) continue;
			const pulse = 1.0 + Math.sin(this.sim.gameTime * 6 + coin.x * 0.05) * 0.15;
			const radius = 9 * pulse;

			g.beginPath();
			g.circle(coin.x, coin.y, radius + 4);
			g.fill({ color: 0xfbbf24, alpha: 0.25 });

			g.beginPath();
			g.circle(coin.x, coin.y, radius);
			g.fill({ color: 0xf59e0b });
			g.stroke({ color: 0xfef08a, width: 2 });

			g.beginPath();
			g.circle(coin.x, coin.y, radius * 0.4);
			g.fill({ color: 0xfef08a });
		}
	}

	public drawProjectilesLayer(g: Graphics): void {
		g.clear();

		for (const p of this.sim.projectiles) {
			if (p.damage <= 0) continue;

			let z = 0;
			if (p.originX !== undefined && p.originY !== undefined && p.totalDist && p.arcHeight) {
				const currentDist = Math.hypot(p.x - p.originX, p.y - p.originY);
				const norm = Math.max(0, Math.min(1, currentDist / p.totalDist));
				z = 4 * p.arcHeight * norm * (1 - norm);
			}

			g.beginPath();
			g.ellipse(p.x, p.y + 4, 4 + z * 0.05, 2);
			g.fill({ color: 0x000000, alpha: 0.35 });

			const projY = p.y - z;

			if (p.attackType === 'magic') {
				const isFrost = p.hasFrost;
				const coreColor = isFrost ? 0x38bdf8 : 0xc084fc;
				const haloColor = isFrost ? 0x0284c7 : 0xa855f7;

				g.beginPath();
				g.circle(p.x, projY, 5);
				g.fill({ color: coreColor });
				g.beginPath();
				g.circle(p.x, projY, 10);
				g.fill({ color: haloColor, alpha: 0.35 });

				const sparkleAngle = this.sim.gameTime * 20;
				g.beginPath();
				g.circle(p.x + Math.cos(sparkleAngle) * 5, projY + Math.sin(sparkleAngle) * 5, 2);
				g.fill({ color: 0xffffff, alpha: 0.85 });
			} else if (p.attackType === 'siege') {
				const dirNormX = (p.targetX - (p.originX ?? p.x)) / (p.totalDist || 1);
				const dirNormY = (p.targetY - (p.originY ?? p.y)) / (p.totalDist || 1);
				for (let s = 1; s <= 3; s++) {
					const puffX = p.x - dirNormX * s * 8;
					const puffY = projY - dirNormY * s * 8 + s * 1.5;
					g.beginPath();
					g.circle(puffX, puffY, Math.max(1, 4 - s));
					g.fill({ color: 0x64748b, alpha: 0.35 / s });
				}

				g.beginPath();
				g.circle(p.x, projY, 7);
				g.fill({ color: 0x334155 });
				g.stroke({ color: 0x1e293b, width: 2 });
				g.beginPath();
				g.circle(p.x, projY, 3);
				g.fill({ color: 0xf97316 });
			} else {
				const angle = Math.atan2(p.targetY - p.y, p.targetX - p.x);
				const len = 12;
				const headX = p.x + Math.cos(angle) * (len / 2);
				const headY = projY + Math.sin(angle) * (len / 2);
				const tailX = p.x - Math.cos(angle) * (len / 2);
				const tailY = projY - Math.sin(angle) * (len / 2);

				g.beginPath();
				g.moveTo(tailX, tailY);
				g.lineTo(headX, headY);
				g.stroke({ color: 0xd97706, width: 2 });

				g.beginPath();
				g.circle(headX, headY, 2);
				g.fill({ color: 0xe2e8f0 });
			}
		}

		for (const s of this.sim.splashEffects) {
			const progress = 1 - s.timer / s.maxTimer;
			const radius = s.radius * Math.min(1, progress * 1.2);
			const alpha = Math.max(0, 1 - progress);
			g.beginPath();
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

			g.beginPath();
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

			g.beginPath();
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

			g.beginPath();
			g.circle(eff.x, eff.y, currentRadius);
			g.fill({ color: 0xf97316, alpha: alpha * 0.2 });
			g.stroke({ color: 0xef4444, width: 4 * (1 - progress) + 1, alpha });
		}
	}
}
