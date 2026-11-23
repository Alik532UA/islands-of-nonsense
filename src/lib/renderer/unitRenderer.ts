import type { Graphics } from 'pixi.js';
import type { Simulation } from '../engine/simulation';
import type { Unit } from '../engine/types';
import { CELL_SIZE } from '../engine/constants';
import type { SelectedEntity } from './entityRenderer';

/**
 * UnitRenderer handles rendering of workers, combat units, 15+ archetype weapon visualizations,
 * health bars, mana bars, buff/debuff halos, and attack facing directions.
 */
export class UnitRenderer {
	private sim: Simulation;

	constructor(sim: Simulation) {
		this.sim = sim;
	}

	public setSimulation(newSim: Simulation): void {
		this.sim = newSim;
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

			// Motion Blur Trail for Moving Worker (Fluid Cinematic Motion)
			const distToTarget = Math.hypot(w.targetX - wx, w.targetY - wy);
			if (distToTarget > 6) {
				const dirX = (w.targetX - wx) / distToTarget;
				const dirY = (w.targetY - wy) / distToTarget;
				const trailLen = Math.min(18, (w.speed || 260) * 0.05);

				// Trailing ghost silhouette 1
				g.beginPath();
				g.roundRect(
					wx - dirX * trailLen * 0.6 - 8,
					wy - dirY * trailLen * 0.6 - 4 + bob,
					16,
					16,
					4
				);
				g.fill({ color: playerColor, alpha: 0.22 });

				// Trailing ghost silhouette 2
				g.beginPath();
				g.roundRect(
					wx - dirX * trailLen * 1.2 - 6,
					wy - dirY * trailLen * 1.2 - 3 + bob,
					12,
					12,
					3
				);
				g.fill({ color: playerColor, alpha: 0.1 });
			}

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
			// B. 2.5D CONTACT DROP SHADOW & MOTION BLUR
			// =====================================================================
			const shadowY = u.y + radius * 0.65;
			const shadowAlpha = u.flying ? 0.22 : 0.45;
			g.beginPath();
			g.ellipse(u.x + 3, shadowY, radius * (u.flying ? 0.75 : 1.1), radius * 0.45);
			g.fill({ color: 0x000000, alpha: shadowAlpha });

			// Motion Blur Trail for Moving Units (Fluid RTS Motion)
			if (u.state === 'WALKING' && u.prevX !== undefined && u.prevY !== undefined) {
				const dx = u.x - u.prevX;
				const dy = u.y - u.prevY;
				const moveDist = Math.hypot(dx, dy);
				if (moveDist > 0.2) {
					const normX = dx / moveDist;
					const normY = dy / moveDist;
					const trailLen = Math.min(radius * 0.9, moveDist * 2.5);

					g.beginPath();
					g.ellipse(
						u.x - normX * trailLen * 0.6,
						renderY - normY * trailLen * 0.6,
						radius * 0.85,
						radius * 0.85
					);
					g.fill({ color: unitColor, alpha: 0.2 });

					g.beginPath();
					g.ellipse(
						u.x - normX * trailLen * 1.2,
						renderY - normY * trailLen * 1.2,
						radius * 0.6,
						radius * 0.6
					);
					g.fill({ color: unitColor, alpha: 0.08 });
				}
			}

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
			const barrelW = 14;
			const barrelX = dir > 0 ? u.x + radius * 0.2 : u.x - radius * 0.2 - barrelW;
			g.beginPath();
			g.rect(barrelX, renderY - 4, barrelW, 8);
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

			// Drawn recurve bow facing target/movement direction
			g.beginPath();
			const bowRadius = radius * 0.85;
			const bowCenterX = u.x + dir * (radius * 0.35);
			const bowAngleSpread = Math.PI / 2.3;
			const bowStartAngle = dir > 0 ? -bowAngleSpread : Math.PI - bowAngleSpread;
			const bowEndAngle = dir > 0 ? bowAngleSpread : Math.PI + bowAngleSpread;

			const bowTopX = bowCenterX + Math.cos(bowStartAngle) * bowRadius;
			const bowTopY = renderY + Math.sin(bowStartAngle) * bowRadius;
			const bowBotX = bowCenterX + Math.cos(bowEndAngle) * bowRadius;
			const bowBotY = renderY + Math.sin(bowEndAngle) * bowRadius;

			g.moveTo(bowTopX, bowTopY);
			g.arc(bowCenterX, renderY, bowRadius, bowStartAngle, bowEndAngle, false);
			g.stroke({ color: 0xb45309, width: 2.2 });

			// Bowstring drawn taut from bow tips to arrow nock
			const nockX = u.x - dir * (radius * 0.25);
			g.beginPath();
			g.moveTo(bowTopX, bowTopY);
			g.lineTo(nockX, renderY);
			g.lineTo(bowBotX, bowBotY);
			g.stroke({ color: 0xd4d4d8, width: 1, alpha: 0.65 });

			// Arrow shaft & silver arrowhead pointing towards enemy/target
			const tipX = u.x + dir * (radius + 8);
			g.beginPath();
			g.moveTo(nockX, renderY);
			g.lineTo(tipX, renderY);
			g.stroke({ color: 0xfef08a, width: 1.8 });

			// Distinct arrowhead triangle pointing in dir
			g.beginPath();
			g.poly([tipX, renderY, tipX - dir * 5, renderY - 3, tipX - dir * 5, renderY + 3]);
			g.fill({ color: 0xe2e8f0 });
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

			// Colossal war hammer facing target/movement direction
			const hx = u.x + dir * (radius * 0.7);
			const hy = renderY - radius * 0.7;
			g.beginPath();
			g.moveTo(u.x + dir * 2, renderY);
			g.lineTo(hx + dir * 6, hy - 4);
			g.stroke({ color: 0x78350f, width: 3 });
			const hammerHeadW = 10;
			const hammerHeadX = dir > 0 ? hx + 2 : hx - 2 - hammerHeadW;
			g.beginPath();
			g.roundRect(hammerHeadX, hy - 10, hammerHeadW, 8, 2);
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
}
