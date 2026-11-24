import type { Graphics } from 'pixi.js';
import type { Simulation } from '../engine/simulation';
import type { Unit } from '../engine/types';
import { CELL_SIZE } from '../engine/constants';
import type { SelectedEntity } from './entityRenderer';

/**
 * UnitRenderer handles rendering of workers, combat units, stylized 2.5D archetypes
 * (aerial flyers, siege engines, casters, rangers, colossi, war beasts, and melee champions),
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
		const r0 = (hex >> 16) & 0xff;
		const g0 = (hex >> 8) & 0xff;
		const b0 = hex & 0xff;
		const mix = (c: number) =>
			factor >= 1
				? Math.min(255, Math.round(c + (255 - c) * Math.min(1, factor - 1)))
				: Math.max(0, Math.round(c * Math.max(0, factor)));
		return (mix(r0) << 16) | (mix(g0) << 8) | mix(b0);
	}

	// =========================================================================
	// 3. 2.5D WORKERS LAYER
	// =========================================================================
	public drawWorkersLayer(
		g: Graphics,
		isWorkerSelected: boolean,
		enableFog = false,
		bounds?: { minX: number; minY: number; maxX: number; maxY: number }
	): void {
		g.clear();

		const playersToRender = this.sim.allPlayers?.length
			? this.sim.allPlayers
			: [this.sim.players.west, this.sim.players.east];

		for (const player of playersToRender) {
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

			// Selection / Identity Ring at Feet
			const ringPulse = 0.82 + Math.sin(this.sim.gameTime * 6) * 0.14;
			g.beginPath();
			g.ellipse(wx, wy + 16, 21, 10);
			g.stroke({
				color: isHumanWorker && isWorkerSelected ? 0xfbbf24 : 0x38bdf8,
				width: isHumanWorker && isWorkerSelected ? 3.2 : 1.8,
				alpha: ringPulse * 0.8
			});

			// 2.5D Drop Shadow
			g.beginPath();
			g.ellipse(wx + 2, wy + 16, 16, 7.5);
			g.fill({ color: 0x000000, alpha: 0.42 });

			// Motion Blur Trail for Moving Worker
			const distToTarget = Math.hypot(w.targetX - wx, w.targetY - wy);
			if (distToTarget > 6) {
				const dirX = (w.targetX - wx) / distToTarget;
				const dirY = (w.targetY - wy) / distToTarget;
				const trailLen = Math.min(18, (w.speed || 260) * 0.05);

				g.beginPath();
				g.roundRect(
					wx - dirX * trailLen * 0.6 - 8,
					wy - dirY * trailLen * 0.6 - 4 + bob,
					16,
					16,
					4
				);
				g.fill({ color: playerColor, alpha: 0.2 });

				g.beginPath();
				g.roundRect(
					wx - dirX * trailLen * 1.2 - 6,
					wy - dirY * trailLen * 1.2 - 3 + bob,
					12,
					12,
					3
				);
				g.fill({ color: playerColor, alpha: 0.09 });
			}

			// Striding Boots
			const stepShift = distToTarget > 6 ? Math.sin(this.sim.gameTime * 14 + slot) * 3.5 : 0;
			g.roundRect(wx - 7 + stepShift, wy + 10 + bob * 0.4, 5, 6, 2);
			g.roundRect(wx + 2 - stepShift, wy + 10 + bob * 0.4, 5, 6, 2);
			g.fill({ color: 0x292524 });

			// Worker Body & Tunic
			g.beginPath();
			g.roundRect(wx - 9, wy - 5 + bob, 18, 17, 5);
			g.fill({ color: playerColor });
			g.stroke({ color: 0x0f172a, width: 1.5 });
			g.beginPath();
			g.roundRect(wx - 7, wy - 4 + bob, 14, 6, 3);
			g.fill({ color: 0xffffff, alpha: 0.22 });

			// Leather toolbelt & brass buckle
			g.beginPath();
			g.rect(wx - 8, wy + 5 + bob, 16, 3);
			g.fill({ color: 0x78350f });
			g.rect(wx - 2, wy + 4.5 + bob, 4, 4);
			g.fill({ color: 0xfbbf24 });

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

			// Builder cap
			g.poly([
				wx - 8,
				wy - 13 + bob,
				wx + 8,
				wy - 13 + bob,
				wx + 5,
				wy - 19 + bob,
				wx - 5,
				wy - 19 + bob
			]);
			g.fill({ color: this.shadeHexColor(playerColor, 0.72) });
			g.stroke({ color: 0x0f172a, width: 1.2 });

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
			g.circle(wx + facing * 3, wy - 11 + bob, 2.2);
			g.fill({ color: 0x0f172a });
			g.beginPath();
			g.circle(wx + facing * 3.4, wy - 11.6 + bob, 0.9);
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
	// 4. 2.5D STYLIZED RTS COMBAT UNITS LAYER
	// =========================================================================
	public drawUnitsLayer(
		g: Graphics,
		selectedEntity: SelectedEntity,
		enableFog: boolean,
		bounds?: { minX: number; minY: number; maxX: number; maxY: number }
	): void {
		g.clear();

		const westPlayerColor = this.sim.players.west.color?.num || 0x0042ff;
		const eastPlayerColor = this.sim.players.east.color?.num || 0xff0303;

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
			const unitPlayer = u.playerSlot
				? this.sim.allPlayers.find((p) => p.slot === u.playerSlot)
				: u.team !== 'neutral'
					? this.sim.players[u.team]
					: null;
			const unitColor = isNeutral
				? 0x7e22ce
				: (unitPlayer?.color?.num ?? (isWest ? westPlayerColor : eastPlayerColor));

			let dir = isNeutral ? 1 : isWest ? 1 : -1;
			if (u.currentTargetId) {
				const enemy = this.sim.units.find(
					(candidate) => candidate.instanceId === u.currentTargetId
				);
				if (enemy && Math.abs(enemy.x - u.x) > 6) {
					dir = enemy.x > u.x ? 1 : -1;
				}
			} else if (u.targetBuildingId) {
				let targetX: number | null = null;
				if (u.targetBuildingId === 'castle_west') targetX = this.sim.castles.west.x;
				else if (u.targetBuildingId === 'castle_east') targetX = this.sim.castles.east.x;
				else {
					const b = this.sim.buildings.find((bld) => bld.instanceId === u.targetBuildingId);
					if (b) targetX = b.x + CELL_SIZE / 2;
				}
				if (targetX !== null && Math.abs(targetX - u.x) > 6) {
					dir = targetX > u.x ? 1 : -1;
				}
			} else if (u.targetX !== undefined && Math.abs(u.targetX - u.x) > 8) {
				dir = u.targetX > u.x ? 1 : -1;
			}

			const isSelected =
				(selectedEntity?.type === 'unit' && selectedEntity.instanceId === u.instanceId) ||
				(selectedEntity?.type === 'group' && selectedEntity.unitIds.includes(u.instanceId));

			// Bobbing, Walk Cycle & Elevation
			const walkPhase = this.sim.gameTime * 11 + u.x * 0.08 + u.y * 0.04;
			const walkBob = u.state === 'WALKING' && !u.flying ? Math.abs(Math.sin(walkPhase)) * 2.2 : 0;
			const flyAltitude = u.flying ? 20 + Math.sin(this.sim.gameTime * 4 + u.x * 0.05) * 5 : 0;
			const renderY = u.y - flyAltitude - walkBob;

			// =====================================================================
			// A. SUBTLE GROUND RING & SELECTION HALO
			// =====================================================================
			const ringR = radius * 1.25;
			const ringY = u.y + radius * 0.72;

			if (isSelected) {
				g.beginPath();
				g.ellipse(u.x, ringY, ringR * 1.22, ringR * 0.56);
				g.stroke({ color: 0xfbbf24, width: 3, alpha: 0.95 });
				g.beginPath();
				g.ellipse(u.x, ringY, ringR * 0.92, ringR * 0.42);
				g.stroke({ color: 0xfef08a, width: 1.5, alpha: 0.75 });
			} else if (isNeutral) {
				// Boss dark violet ground sigil
				g.beginPath();
				g.ellipse(u.x, ringY, ringR * 1.15, ringR * 0.52);
				g.stroke({ color: 0xa855f7, width: 2.5, alpha: 0.65 });
			} else {
				// Grounded subtle team indicator ring beneath boots
				const baseRingColor = isWest ? 0x38bdf8 : 0xf43f5e;
				g.beginPath();
				g.ellipse(u.x, ringY, ringR, ringR * 0.46);
				g.stroke({ color: baseRingColor, width: 1.5, alpha: 0.45 });
			}

			// =====================================================================
			// B. 2.5D CONTACT DROP SHADOW
			// =====================================================================
			const shadowY = u.y + radius * 0.72;
			const shadowAlpha = u.flying ? 0.25 : 0.46;
			g.beginPath();
			g.ellipse(u.x + 2, shadowY, radius * (u.flying ? 0.8 : 1.05), radius * 0.44);
			g.fill({ color: 0x000000, alpha: shadowAlpha });

			// =====================================================================
			// C. STYLIZED 2.5D CHARACTER MINIATURE ARCHETYPE
			// =====================================================================
			this.renderUnitArchetype(g, u, isWest, unitColor, isSelected, renderY, dir, walkPhase);

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
			// E. SLEEK BEVELED HEALTH & MANA BARS
			// =====================================================================
			const hpPct = Math.max(0, u.hp / u.maxHp);
			const showMana = (u.maxMana || 0) > 0;
			if (hpPct < 1 || isSelected || isNeutral) {
				const barW = Math.max(26, radius * 2 + 6);
				const barH = 4.5;
				const barX = u.x - barW / 2;
				const barY = renderY - radius - 14;

				g.beginPath();
				g.roundRect(barX - 1, barY - 1, barW + 2, barH + (showMana ? 5.5 : 2), 2);
				g.fill({ color: 0x090d16 });
				g.beginPath();
				g.roundRect(barX, barY, barW * hpPct, barH, 1.5);
				g.fill({ color: hpPct > 0.5 ? 0x22c55e : hpPct > 0.25 ? 0xeab308 : 0xef4444 });

				if (showMana) {
					const manaPct = Math.max(0, Math.min(1, (u.mana || 0) / (u.maxMana || 1)));
					g.beginPath();
					g.roundRect(barX, barY + barH + 1, barW * manaPct, 2.5, 1);
					g.fill({ color: 0x38bdf8 });
				}
			}
		}
	}

	/**
	 * Draws articulated humanoid anatomy (flowing cloak, striding boots, armored tunic,
	 * pauldrons, head, and visor/eyes) so units read as miniature warriors rather than plain orbs.
	 */
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
			skinColor?: number;
			spikedPauldrons?: boolean;
		} = {}
	): void {
		const colorDark = this.shadeHexColor(unitColor, 0.56);
		const colorLight = this.shadeHexColor(unitColor, 1.24);
		const wScale = opts.scaleW ?? 1.0;
		const torsoW = r * 1.18 * wScale;
		const torsoH = r * 0.98;
		const stride = isWalking ? Math.sin(walkPhase) * (r * 0.24) : 0;

		// 1. Trailing Heroic Cape / Cloak behind (-dir)
		const capeSway = isWalking ? Math.sin(walkPhase * 1.2) * 2.5 : 0;
		const capeCol = opts.cloakColor ?? colorDark;
		g.beginPath();
		g.poly([
			x - dir * (torsoW * 0.25),
			y - r * 0.25,
			x - dir * (torsoW * 0.85 + 4),
			y + r * 0.55 + capeSway,
			x - dir * (torsoW * 0.15),
			y + r * 0.65,
			x + dir * (torsoW * 0.1),
			y - r * 0.1
		]);
		g.fill({ color: capeCol, alpha: 0.92 });
		g.stroke({ color: 0x0f172a, width: 1.2 });

		// 2. Striding Armored Boots or Flowing Lower Robe
		if (opts.robeHem) {
			g.beginPath();
			g.poly([
				x - torsoW * 0.55,
				y + r * 0.1,
				x + torsoW * 0.55,
				y + r * 0.1,
				x + torsoW * 0.72,
				y + r * 0.82,
				x - torsoW * 0.72,
				y + r * 0.82
			]);
			g.fill({ color: colorDark });
			g.stroke({ color: 0x0f172a, width: 1.5 });
			// Golden hem trim
			g.beginPath();
			g.moveTo(x - torsoW * 0.7, y + r * 0.76);
			g.lineTo(x + torsoW * 0.7, y + r * 0.76);
			g.stroke({ color: 0xfbbf24, width: 1.6 });
		} else {
			g.beginPath();
			g.roundRect(x - torsoW * 0.42 + stride, y + r * 0.44, r * 0.36, r * 0.42, 2);
			g.roundRect(x + torsoW * 0.08 - stride, y + r * 0.44, r * 0.36, r * 0.42, 2);
			g.fill({ color: 0x1e293b });
			g.stroke({ color: 0x090d16, width: 1.1 });
		}

		// 3. Armored Torso & Team Tabard
		g.beginPath();
		g.roundRect(x - torsoW / 2, y - torsoH * 0.35, torsoW, torsoH, 4);
		g.fill({ color: opts.armorColor ?? unitColor });
		g.stroke({ color: isSelected ? 0xfbbf24 : 0x0f172a, width: isSelected ? 2.4 : 1.6 });

		// Chest Tabard Highlight + Belt
		g.beginPath();
		g.roundRect(x - torsoW * 0.32, y - torsoH * 0.25, torsoW * 0.64, torsoH * 0.45, 2);
		g.fill({ color: colorLight, alpha: 0.45 });
		g.beginPath();
		g.rect(x - torsoW * 0.48, y + torsoH * 0.22, torsoW * 0.96, 3);
		g.fill({ color: 0x78350f });
		g.rect(x - 2, y + torsoH * 0.2, 4, 3.5);
		g.fill({ color: 0xfbbf24 });

		// 4. Layered Shoulder Pauldrons
		const pauldronR = r * (opts.spikedPauldrons ? 0.36 : 0.28);
		for (const side of [-1, 1]) {
			const px = x + side * (torsoW * 0.48);
			const py = y - torsoH * 0.18;
			g.beginPath();
			g.circle(px, py, pauldronR);
			g.fill({ color: opts.spikedPauldrons ? 0x64748b : colorLight });
			g.stroke({ color: 0x0f172a, width: 1.4 });
			if (opts.spikedPauldrons) {
				g.beginPath();
				g.poly([
					px,
					py - pauldronR,
					px + side * (pauldronR * 1.1),
					py - pauldronR * 1.35,
					px + side * pauldronR * 0.7,
					py - pauldronR * 0.2
				]);
				g.fill({ color: 0xe2e8f0 });
			}
		}

		// 5. Sculpted Head & Facing Gaze
		const headY = y - torsoH * 0.62;
		const headR = r * 0.44;
		g.beginPath();
		g.circle(x, headY, headR);
		g.fill({ color: opts.skinColor ?? 0xe2b887 });
		g.stroke({ color: 0x0f172a, width: 1.4 });

		// Crisp eyes facing combat/movement direction
		const eyeX = x + dir * (headR * 0.45);
		const eyeY = headY + 0.5;
		g.beginPath();
		g.ellipse(eyeX, eyeY, 2.2, 1.5);
		g.fill({ color: 0x0f172a });
		g.beginPath();
		g.circle(eyeX + dir * 0.5, eyeY - 0.3, 0.8);
		g.fill({ color: 0xfef08a });
	}

	/**
	 * Renders distinct 2.5D character silhouettes across 7 archetypes:
	 * 1. Aerial Flyer (Winged Dragon / Wyvern)
	 * 2. Siege Engine (4-Wheeled Artillery Carriage)
	 * 3. Archmage / Healer (Robed Caster + Crystal Staff)
	 * 4. Ranger / Archer (Cloaked Archer + Quiver + Recurve Bow)
	 * 5. Colossus / Tank (Horned Plate Warlord + Tower Shield + Greathammer)
	 * 6. War Beast (Quadruped Wolf / Lion / Hound)
	 * 7. Melee Champion (Crested Helm + Shield + Broadsword/Axe)
	 */
	private renderUnitArchetype(
		g: Graphics,
		u: Unit,
		_isWest: boolean,
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

		if (u.flying) {
			// 1. AERIAL FLYER / DRAGON (Swept Articulated Wings, Serpent Tail, Horned Snout)
			const flap = Math.sin(time * 14 + u.x * 0.05) * (r * 0.55);

			// Trailing serpent tail behind (-dir)
			g.beginPath();
			g.poly([
				ux - dir * (r * 0.35),
				renderY + r * 0.15,
				ux - dir * (r * 1.35),
				renderY + r * 0.45 + flap * 0.25,
				ux - dir * (r * 1.05),
				renderY - r * 0.05
			]);
			g.fill({ color: colorDark });
			g.stroke({ color: 0x0f172a, width: 1.4 });

			// Spread Wing Membranes (Left & Right)
			for (const wingSide of [-1, 1]) {
				g.beginPath();
				g.poly([
					ux + wingSide * 2,
					renderY - r * 0.15,
					ux + wingSide * (r * 1.55),
					renderY - r * 0.95 + flap,
					ux + wingSide * (r * 1.2),
					renderY + r * 0.25 + flap * 0.35,
					ux + wingSide * (r * 0.55),
					renderY + r * 0.2,
					ux + wingSide * 2,
					renderY + r * 0.3
				]);
				g.fill({ color: colorLight, alpha: 0.9 });
				g.stroke({ color: colorDark, width: 1.6 });

				// Wing spar bone
				g.beginPath();
				g.moveTo(ux + wingSide * 2, renderY - r * 0.15);
				g.lineTo(ux + wingSide * (r * 1.52), renderY - r * 0.92 + flap);
				g.stroke({ color: 0x1e293b, width: 2 });
			}

			// Scaled Dragon Body
			g.beginPath();
			g.ellipse(ux, renderY, r * 0.72, r * 0.55);
			g.fill({ color: unitColor });
			g.stroke({ color: isSelected ? 0xfbbf24 : 0x0f172a, width: isSelected ? 2.4 : 1.6 });

			// Belly armor ridges
			g.beginPath();
			g.ellipse(ux, renderY + r * 0.15, r * 0.48, r * 0.28);
			g.fill({ color: 0xfef08a, alpha: 0.45 });

			// Horned Dragon Head & Flame Breath Snout
			const headX = ux + dir * (r * 0.62);
			const headY = renderY - r * 0.25;
			g.beginPath();
			g.poly([
				headX - dir * (r * 0.25),
				headY - r * 0.28,
				headX + dir * (r * 0.45),
				headY - r * 0.12,
				headX + dir * (r * 0.42),
				headY + r * 0.22,
				headX - dir * (r * 0.25),
				headY + r * 0.26
			]);
			g.fill({ color: colorDark });
			g.stroke({ color: 0x0f172a, width: 1.4 });

			// Swept Horns
			g.beginPath();
			g.poly([
				headX - dir * (r * 0.1),
				headY - r * 0.24,
				headX - dir * (r * 0.55),
				headY - r * 0.65,
				headX + dir * (r * 0.05),
				headY - r * 0.18
			]);
			g.fill({ color: 0xfef3c7 });

			// Glowing Dragon Eye + Snout Flame
			g.beginPath();
			g.circle(headX + dir * (r * 0.14), headY - r * 0.04, 2);
			g.fill({ color: 0xfbbf24 });
			g.beginPath();
			g.circle(headX + dir * (r * 0.52), headY + r * 0.06, 3.2);
			g.fill({ color: 0xf97316, alpha: 0.9 });
			g.circle(headX + dir * (r * 0.55), headY + r * 0.06, 1.6);
			g.fill({ color: 0xfef08a });
		} else if (u.attackType === 'siege') {
			// 2. SIEGE ENGINE (Wheeled Timber Carriage, Iron Armor Plates & Brass Cannon)
			const recoil = u.attackAnimTimer && u.attackAnimTimer > 0 ? -dir * 4 : 0;

			// 4 Wooden/Iron-Rimmed Carriage Wheels
			for (const wx of [ux - r * 0.55, ux + r * 0.55]) {
				for (const wy of [renderY - r * 0.58, renderY + r * 0.58]) {
					g.beginPath();
					g.circle(wx, wy, r * 0.28);
					g.fill({ color: 0x334155 });
					g.stroke({ color: 0x0f172a, width: 1.6 });
					g.circle(wx, wy, r * 0.14);
					g.fill({ color: 0x78350f });
				}
			}

			// Reinforced Timber Chassis
			g.beginPath();
			g.roundRect(ux - r * 0.78, renderY - r * 0.52, r * 1.56, r * 1.04, 4);
			g.fill({ color: 0x78350f });
			g.stroke({ color: isSelected ? 0xfbbf24 : 0x292524, width: isSelected ? 2.4 : 1.8 });

			// Heraldic Team Plate on Carriage
			g.beginPath();
			g.roundRect(ux - r * 0.52, renderY - r * 0.34, r * 1.04, r * 0.68, 3);
			g.fill({ color: unitColor });
			g.stroke({ color: 0xd97706, width: 1.4 });

			// Heavy Iron Cannon Barrel with Brass Muzzle Ring
			const barrelStart = ux - dir * (r * 0.15) + recoil;
			const barrelEnd = ux + dir * (r * 1.08) + recoil;
			g.beginPath();
			g.moveTo(barrelStart, renderY);
			g.lineTo(barrelEnd, renderY - 2);
			g.stroke({ color: 0x0f172a, width: 11 });
			g.beginPath();
			g.moveTo(barrelStart, renderY);
			g.lineTo(barrelEnd, renderY - 2);
			g.stroke({ color: 0x475569, width: 7.5 });

			// Brass muzzle band
			g.beginPath();
			g.circle(barrelEnd, renderY - 2, 4.5);
			g.fill({ color: 0xd97706 });
			g.stroke({ color: 0x0f172a, width: 1.2 });
		} else if (
			u.attackType === 'magic' ||
			u.abilityType?.includes('heal') ||
			u.abilityType?.includes('slow')
		) {
			// 3. ARCHMAGE / WIZARD / PRIEST (Robed Humanoid + Hood + Arcane Staff)
			this.drawHumanoidBody(g, ux, renderY, r, dir, unitColor, isSelected, walkPhase, isWalking, {
				scaleW: 0.95,
				robeHem: true,
				cloakColor: colorDark
			});

			// Pointed Hood / Circlet above Head
			const headY = renderY - r * 0.98 * 0.62;
			g.beginPath();
			g.poly([ux - r * 0.48, headY + 2, ux, headY - r * 0.68, ux + r * 0.48, headY + 2]);
			g.fill({ color: colorDark });
			g.stroke({ color: 0xfbbf24, width: 1.2 });

			// Carved Oak & Gold Staff
			const staffX = ux + dir * (r * 0.72) + atkLunge * 0.5;
			const staffTopY = renderY - r * 0.95;
			g.beginPath();
			g.moveTo(staffX - dir * 2, renderY + r * 0.72);
			g.lineTo(staffX, staffTopY);
			g.stroke({ color: 0x92400e, width: 2.6 });

			// Glowing Arcane Crystal + Orbiting Rune Spark
			g.beginPath();
			g.circle(staffX, staffTopY - 4, 5);
			g.fill({ color: 0x38bdf8 });
			g.circle(staffX, staffTopY - 4, 2.5);
			g.fill({ color: 0xffffff });

			const orbAngle = time * 4.5;
			g.beginPath();
			g.circle(staffX + Math.cos(orbAngle) * 6.5, staffTopY - 4 + Math.sin(orbAngle) * 6.5, 2);
			g.fill({ color: 0xfbbf24 });
		} else if (u.attackType === 'pierce' || u.range > 200) {
			// 4. RANGER / ARCHER (Quiver, Forest/Team Hood & Drawn Recurve Bow)
			// Quiver & Feathered Arrows strapped behind shoulder
			const qx = ux - dir * (r * 0.48);
			g.beginPath();
			g.poly([
				qx - 3,
				renderY - r * 0.62,
				qx + 3,
				renderY - r * 0.62,
				qx + 1,
				renderY + r * 0.1,
				qx - 4,
				renderY + r * 0.1
			]);
			g.fill({ color: 0x78350f });
			g.circle(qx, renderY - r * 0.66, 2);
			g.fill({ color: 0xfef08a });

			this.drawHumanoidBody(g, ux, renderY, r, dir, unitColor, isSelected, walkPhase, isWalking, {
				scaleW: 0.92,
				cloakColor: 0x065f46
			});

			// Ranger Hood
			const headY = renderY - r * 0.98 * 0.62;
			g.beginPath();
			g.poly([
				ux - r * 0.44,
				headY,
				ux - dir * (r * 0.18),
				headY - r * 0.56,
				ux + r * 0.38,
				headY - r * 0.08
			]);
			g.fill({ color: 0x065f46 });
			g.stroke({ color: 0x0f172a, width: 1.2 });

			// Drawn Recurve Bow facing target/movement direction (Preserves unitFacing.test.ts!)
			g.beginPath();
			const bowRadius = r * 0.85;
			const bowCenterX = ux + dir * (r * 0.35);
			const bowAngleSpread = Math.PI / 2.3;
			const bowStartAngle = dir > 0 ? -bowAngleSpread : Math.PI - bowAngleSpread;
			const bowEndAngle = dir > 0 ? bowAngleSpread : Math.PI + bowAngleSpread;

			const bowTopX = bowCenterX + Math.cos(bowStartAngle) * bowRadius;
			const bowTopY = renderY + Math.sin(bowStartAngle) * bowRadius;
			const bowBotX = bowCenterX + Math.cos(bowEndAngle) * bowRadius;
			const bowBotY = renderY + Math.sin(bowEndAngle) * bowRadius;

			g.moveTo(bowTopX, bowTopY);
			g.arc(bowCenterX, renderY, bowRadius, bowStartAngle, bowEndAngle, false);
			g.stroke({ color: 0xb45309, width: 2.3 });

			// Taut Bowstring
			const nockX = ux - dir * (r * 0.22);
			g.beginPath();
			g.moveTo(bowTopX, bowTopY);
			g.lineTo(nockX, renderY);
			g.lineTo(bowBotX, bowBotY);
			g.stroke({ color: 0xe4e4e7, width: 1.1, alpha: 0.72 });

			// Arrow Shaft & Silver Broadhead pointing in dir
			const tipX = ux + dir * (r + 8);
			g.beginPath();
			g.moveTo(nockX, renderY);
			g.lineTo(tipX, renderY);
			g.stroke({ color: 0xfef08a, width: 1.8 });

			g.beginPath();
			g.poly([tipX, renderY, tipX - dir * 5, renderY - 3, tipX - dir * 5, renderY + 3]);
			g.fill({ color: 0xe2e8f0 });
		} else if (u.armorType === 'fort' || u.armorType === 'large' || u.hp >= 800) {
			// 5. COLOSSUS / TANK (Spiked Pauldrons, Horned Greathelm, Tower Shield & Warhammer)
			this.drawHumanoidBody(g, ux, renderY, r, dir, unitColor, isSelected, walkPhase, isWalking, {
				scaleW: 1.14,
				armorColor: 0x475569,
				spikedPauldrons: true
			});

			// Horned Plate Battle Helm
			const headY = renderY - r * 0.98 * 0.62;
			const hr = r * 0.48;
			g.beginPath();
			g.arc(ux, headY, hr, Math.PI, 0, false);
			g.fill({ color: 0x94a3b8 });
			g.stroke({ color: 0x1e293b, width: 1.5 });
			for (const hSide of [-1, 1]) {
				g.beginPath();
				g.poly([
					ux + hSide * (hr * 0.65),
					headY - hr * 0.4,
					ux + hSide * (hr * 1.45),
					headY - hr * 1.15,
					ux + hSide * (hr * 0.9),
					headY - hr * 0.1
				]);
				g.fill({ color: 0xfef3c7 });
			}

			// Tower Shield facing forward + Heavy War Hammer
			const sx = ux + dir * (r * 0.66);
			g.beginPath();
			g.roundRect(sx - 3.5, renderY - r * 0.35, 7, r * 0.95, 2.5);
			g.fill({ color: unitColor });
			g.stroke({ color: 0xfbbf24, width: 1.6 });

			const hx = ux + dir * (r * 0.42) + atkLunge;
			const hy = renderY - r * 0.45;
			g.beginPath();
			g.moveTo(ux + dir * 2, renderY + 2);
			g.lineTo(hx + dir * 7, hy - 5);
			g.stroke({ color: 0x78350f, width: 3.2 });
			const headW = 11;
			const headX = dir > 0 ? hx + 2 : hx - 2 - headW;
			g.beginPath();
			g.roundRect(headX, hy - 10, headW, 8, 2);
			g.fill({ color: 0x94a3b8 });
			g.stroke({ color: 0xfbbf24, width: 1.5 });
		} else if (
			u.name.toLowerCase().includes('вовк') ||
			u.name.toLowerCase().includes('лев') ||
			u.name.toLowerCase().includes('гонча') ||
			u.name.toLowerCase().includes('ведм') ||
			u.name.toLowerCase().includes('пантер') ||
			u.name.toLowerCase().includes('тигр')
		) {
			// 6. WAR BEAST (True Quadruped Body, Animated Striding Legs, Snout, Ears & Tail)
			const furColor = this.shadeHexColor(unitColor, 0.72);
			const furMane = this.shadeHexColor(unitColor, 1.12);
			const stride = isWalking ? Math.sin(walkPhase) * (r * 0.28) : 0;

			// Bushy / Spiked Tail behind (-dir)
			g.beginPath();
			g.poly([
				ux - dir * (r * 0.75),
				renderY,
				ux - dir * (r * 1.35),
				renderY - r * 0.35 + stride * 0.4,
				ux - dir * (r * 0.95),
				renderY + r * 0.2
			]);
			g.fill({ color: furColor });
			g.stroke({ color: 0x0f172a, width: 1.2 });

			// 4 Quadruped Legs
			g.beginPath();
			g.roundRect(ux - r * 0.58 - stride, renderY + r * 0.25, r * 0.26, r * 0.52, 2);
			g.roundRect(ux + r * 0.32 + stride, renderY + r * 0.25, r * 0.26, r * 0.52, 2);
			g.fill({ color: 0x1e293b });

			// Prowling Beast Torso
			g.beginPath();
			g.ellipse(ux, renderY + r * 0.05, r * 0.92, r * 0.52);
			g.fill({ color: furColor });
			g.stroke({ color: isSelected ? 0xfbbf24 : 0x0f172a, width: isSelected ? 2.4 : 1.6 });

			// Armored War Collar
			g.beginPath();
			g.rect(ux + dir * (r * 0.35) - 2.5, renderY - r * 0.42, 5, r * 0.88);
			g.fill({ color: 0xd97706 });

			// Wolf/Beast Head, Pointed Ears & Jaw Snout
			const hx = ux + dir * (r * 0.76);
			const hy = renderY - r * 0.16;
			g.beginPath();
			g.circle(hx, hy, r * 0.42);
			g.fill({ color: furMane });
			g.stroke({ color: 0x0f172a, width: 1.4 });
			// Pointed Ears
			g.beginPath();
			g.poly([
				hx - dir * 3,
				hy - r * 0.35,
				hx - dir * 7,
				hy - r * 0.78,
				hx + dir * 2,
				hy - r * 0.38
			]);
			g.fill({ color: furColor });
			// Snout & Glowing Fang Eye
			g.beginPath();
			g.poly([
				hx + dir * (r * 0.25),
				hy - r * 0.12,
				hx + dir * (r * 0.68),
				hy + r * 0.04,
				hx + dir * (r * 0.25),
				hy + r * 0.24
			]);
			g.fill({ color: furColor });
			g.beginPath();
			g.circle(hx + dir * (r * 0.2), hy - r * 0.08, 1.9);
			g.fill({ color: 0xfef08a });
		} else {
			// 7. WARRIOR / CHAMPION (Crested Knight Helm, Kite Shield & Broadsword/Axe)
			this.drawHumanoidBody(g, ux, renderY, r, dir, unitColor, isSelected, walkPhase, isWalking);

			// Steel War Helm + Team Plume Crest
			const headY = renderY - r * 0.98 * 0.62;
			const hr = r * 0.46;
			g.beginPath();
			g.arc(ux, headY, hr, Math.PI, 0, false);
			g.fill({ color: 0x94a3b8 });
			g.stroke({ color: 0x1e293b, width: 1.4 });
			g.beginPath();
			g.poly([ux - dir * 4, headY - hr, ux, headY - hr - 6, ux + dir * 4, headY - hr]);
			g.fill({ color: unitColor });

			// Kite Shield held off-hand + Gleaming Steel Broadsword/Axe
			const shieldX = ux - dir * (r * 0.45);
			g.beginPath();
			g.poly([
				shieldX - 4,
				renderY - r * 0.3,
				shieldX + 4,
				renderY - r * 0.3,
				shieldX + 4,
				renderY + r * 0.15,
				shieldX,
				renderY + r * 0.42,
				shieldX - 4,
				renderY + r * 0.15
			]);
			g.fill({ color: unitColor });
			g.stroke({ color: 0xfbbf24, width: 1.4 });

			const swordBaseX = ux + dir * (r * 0.45) + atkLunge;
			const swordTipX = swordBaseX + dir * (r * 0.68);
			const swordTipY = renderY - r * 0.62;
			// Crossguard
			g.beginPath();
			g.moveTo(swordBaseX - dir * 2, renderY + 2);
			g.lineTo(swordBaseX + dir * 3, renderY - 3);
			g.stroke({ color: 0xf59e0b, width: 3.5 });
			// Steel Blade
			g.beginPath();
			g.moveTo(swordBaseX, renderY);
			g.lineTo(swordTipX, swordTipY);
			g.stroke({ color: 0xe2e8f0, width: 3 });
		}

		// Neutral Boss Crown Badge
		if (u.team === 'neutral') {
			const crownY = renderY - r - 5;
			g.beginPath();
			g.poly([
				ux - 8,
				crownY + 4,
				ux - 9,
				crownY - 4,
				ux - 3,
				crownY,
				ux,
				crownY - 6,
				ux + 3,
				crownY,
				ux + 9,
				crownY - 4,
				ux + 8,
				crownY + 4
			]);
			g.fill({ color: 0xfbbf24 });
			g.stroke({ color: 0x78350f, width: 1.2 });
		}

		// Attack Strike Flash Arc
		if (u.attackAnimTimer && u.attackAnimTimer > 0) {
			const flashAlpha = u.attackAnimTimer / 0.25;
			g.beginPath();
			g.arc(
				ux + dir * (r * 0.55),
				renderY,
				r * 0.85,
				dir > 0 ? -Math.PI / 3 : (2 * Math.PI) / 3,
				dir > 0 ? Math.PI / 3 : (4 * Math.PI) / 3,
				false
			);
			g.stroke({ color: 0xfef08a, width: 3, alpha: flashAlpha * 0.85 });
		}
	}
}
