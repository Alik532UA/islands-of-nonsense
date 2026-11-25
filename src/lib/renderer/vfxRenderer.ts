import type { Graphics } from 'pixi.js';
import type { Simulation } from '../engine/simulation';
import type { MatchTeam } from '../engine/types';

/**
 * VfxRenderer handles rendering of bouncing gold coins, ballistic projectiles,
 * chain lightning arcs, and artillery rescue strike bombardments.
 */
export class VfxRenderer {
	private sim: Simulation;

	constructor(sim: Simulation) {
		this.sim = sim;
	}

	public setSimulation(newSim: Simulation): void {
		this.sim = newSim;
	}

	// =========================================================================
	// 5. COINS & EFFECTS
	// =========================================================================
	public drawCoinsLayer(
		g: Graphics,
		enableFog = false,
		bounds?: { minX: number; minY: number; maxX: number; maxY: number },
		viewerTeam: MatchTeam = 'west'
	): void {
		g.clear();

		// 1. Battlefield scrap debris (metallic gears, bolts, scrap metal from Scavengers & fallen units)
		if (this.sim.debris) {
			for (const deb of this.sim.debris) {
				if (
					bounds &&
					(deb.x + 20 < bounds.minX ||
						deb.x - 20 > bounds.maxX ||
						deb.y + 20 < bounds.minY ||
						deb.y - 20 > bounds.maxY)
				)
					continue;
				if (enableFog && !this.sim.isPointRevealed(viewerTeam, deb.x, deb.y)) continue;
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
			if (enableFog && !this.sim.isPointRevealed(viewerTeam, coin.x, coin.y)) continue;
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

		// 3. Battlefield corpses (skeletons / decaying remains for Necromancy)
		if (this.sim.corpses) {
			for (const corpse of this.sim.corpses) {
				if (enableFog && !this.sim.isPointRevealed(viewerTeam, corpse.x, corpse.y)) continue;
				const decayRatio = Math.max(0, Math.min(1, corpse.decayTimer / 20.0));
				const alpha = 0.2 + 0.6 * decayRatio;
				// Skeleton bones cross
				g.beginPath();
				g.rect(corpse.x - 5, corpse.y - 1.5, 10, 3);
				g.fill({ color: 0x94a3b8, alpha });
				g.beginPath();
				g.rect(corpse.x - 1.5, corpse.y - 5, 3, 10);
				g.fill({ color: 0x94a3b8, alpha });
				// Skull indicator
				g.beginPath();
				g.circle(corpse.x, corpse.y - 2, 2.5);
				g.fill({ color: 0xe2e8f0, alpha });
			}
		}
	}

	public drawProjectilesLayer(
		g: Graphics,
		enableFog = false,
		bounds?: { minX: number; minY: number; maxX: number; maxY: number },
		viewerTeam: MatchTeam = 'west'
	): void {
		g.clear();

		for (const p of this.sim.projectiles) {
			if (p.damage <= 0) continue;
			if (
				bounds &&
				(p.x + 20 < bounds.minX ||
					p.x - 20 > bounds.maxX ||
					p.y + 20 < bounds.minY ||
					p.y - 20 > bounds.maxY)
			) {
				continue;
			}
			if (enableFog && !this.sim.isPointRevealed(viewerTeam, p.x, p.y)) continue;

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
			const isNuke = eff.kind === 'nuke';

			// 1. Concentric shockwave explosion ring
			g.beginPath();
			g.circle(eff.x, eff.y, currentRadius);
			g.fill({ color: isNuke ? 0xef4444 : 0xf97316, alpha: alpha * 0.25 });
			g.stroke({
				color: isNuke ? 0xff2222 : 0xf59e0b,
				width: 5 * (1 - progress) + 1.5,
				alpha
			});

			// 2. Tactical targeting reticle & crosshair perimeter
			const reticleColor = isNuke ? 0xff4444 : 0xfbbf24;
			g.beginPath();
			g.circle(eff.x, eff.y, eff.radius);
			g.stroke({ color: reticleColor, width: 2, alpha: alpha * 0.8 });

			// Inner secondary reticle ring
			g.beginPath();
			g.circle(eff.x, eff.y, eff.radius * 0.5);
			g.stroke({ color: reticleColor, width: 1.5, alpha: alpha * 0.5 });

			// Crosshair ticks at cardinal compass points
			const tickLen = 25;
			g.beginPath();
			// Top tick
			g.moveTo(eff.x, eff.y - eff.radius - tickLen);
			g.lineTo(eff.x, eff.y - eff.radius + tickLen);
			// Bottom tick
			g.moveTo(eff.x, eff.y + eff.radius - tickLen);
			g.lineTo(eff.x, eff.y + eff.radius + tickLen);
			// Left tick
			g.moveTo(eff.x - eff.radius - tickLen, eff.y);
			g.lineTo(eff.x - eff.radius + tickLen, eff.y);
			// Right tick
			g.moveTo(eff.x + eff.radius - tickLen, eff.y);
			g.lineTo(eff.x + eff.radius + tickLen, eff.y);
			g.stroke({ color: reticleColor, width: 2.5, alpha: alpha * 0.9 });

			// 3. Epicenter flash
			if (progress < 0.4) {
				const flashAlpha = (1 - progress / 0.4) * 0.75;
				g.beginPath();
				g.circle(eff.x, eff.y, eff.radius * 0.25);
				g.fill({ color: 0xffffff, alpha: flashAlpha });
			}
		}
	}
}
