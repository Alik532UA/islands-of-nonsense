import type { Graphics } from 'pixi.js';
import { ARENA_WIDTH, ARENA_HEIGHT, TOP_LANE_Y, BOTTOM_LANE_Y } from '../engine/constants';

export class TerrainRenderer {
	public drawStaticTerrain(g: Graphics): void {
		g.clear();

		// 1. Lush Summer Grass (Authentic Lordaeron Summer Palette)
		g.rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
		g.fill({ color: 0x275a1d });

		// Subtle textured grass patches
		for (let x = 60; x < ARENA_WIDTH; x += 220) {
			for (let y = 60; y < ARENA_HEIGHT; y += 180) {
				const isSunny = (x * 3 + y * 7) % 5 === 0;
				g.ellipse(x + 50, y + 30, 95, 60);
				g.fill({ color: isSunny ? 0x367627 : 0x1f4c17, alpha: 0.65 });
			}
		}

		// 2. Continuous Cobblestone Highway Network from West Castle (200, 1200) to East Castle (7000, 1200)
		this.drawContinuousRoadNetwork(g);

		// 3. Central River (X = 3600) with Sandy Banks & Ripples
		const riverX = ARENA_WIDTH / 2;
		const riverW = 280;
		// Sandy riverbank
		g.rect(riverX - riverW / 2 - 20, 0, riverW + 40, ARENA_HEIGHT);
		g.fill({ color: 0x473c2b });

		// Flowing Water
		g.rect(riverX - riverW / 2, 0, riverW, ARENA_HEIGHT);
		g.fill({ color: 0x0284c7 });

		// Deep Channel Center
		g.rect(riverX - 60, 0, 120, ARENA_HEIGHT);
		g.fill({ color: 0x0369a1 });

		// Riverbank foam ripples
		for (let y = 20; y < ARENA_HEIGHT; y += 50) {
			g.moveTo(riverX - riverW / 2 + 6, y);
			g.lineTo(riverX - riverW / 2 + 20, y + 20);
			g.stroke({ color: 0x93c5fd, width: 2.5, alpha: 0.8 });

			g.moveTo(riverX + riverW / 2 - 6, y + 25);
			g.lineTo(riverX + riverW / 2 - 20, y + 45);
			g.stroke({ color: 0x93c5fd, width: 2.5, alpha: 0.8 });
		}

		// 4. Arched Bridges over River
		this.drawBridge(g, riverX, TOP_LANE_Y);
		this.drawBridge(g, riverX, BOTTOM_LANE_Y);

		// 5. Authentic Warcraft III Central Mountain dividing the Lanes
		this.drawMountainRidge(g, 1460, 1040, ARENA_WIDTH - 2920, 320);

		// 6. Perimeter Arena Walls (Upper & Lower)
		this.drawBattlementWall(g, 20, 15, ARENA_WIDTH - 40, 45);
		this.drawBattlementWall(g, 20, ARENA_HEIGHT - 60, ARENA_WIDTH - 40, 45);

		// 7. Base Courtyard Ramparts with open Road Gates
		// West ramparts (X = 1440, W = 50, gates at 560..760 and 1640..1840)
		this.drawVerticalBattlementWall(g, 1440, 60, 50, 500);
		this.drawVerticalBattlementWall(g, 1440, 760, 50, 280);
		this.drawVerticalBattlementWall(g, 1440, 1360, 50, 280);
		this.drawVerticalBattlementWall(g, 1440, 1840, 50, 500);

		// East ramparts (X = ARENA_WIDTH - 1490, W = 50)
		this.drawVerticalBattlementWall(g, ARENA_WIDTH - 1490, 60, 50, 500);
		this.drawVerticalBattlementWall(g, ARENA_WIDTH - 1490, 760, 50, 280);
		this.drawVerticalBattlementWall(g, ARENA_WIDTH - 1490, 1360, 50, 280);
		this.drawVerticalBattlementWall(g, ARENA_WIDTH - 1490, 1840, 50, 500);

		// Outer Dark Border
		g.rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
		g.stroke({ color: 0x0f172a, width: 8 });
	}

	public drawContinuousRoadNetwork(g: Graphics): void {
		const roadHeight = 160;
		const wCastX = 200;
		const wCastY = 1200;
		const eCastX = ARENA_WIDTH - 200;
		const eCastY = 1200;

		// A. Top Lane straight highway
		g.rect(1440, TOP_LANE_Y - roadHeight / 2, ARENA_WIDTH - 2880, roadHeight);
		g.fill({ color: 0x67543d });
		g.stroke({ color: 0x453523, width: 3 });

		// B. Bottom Lane straight highway
		g.rect(1440, BOTTOM_LANE_Y - roadHeight / 2, ARENA_WIDTH - 2880, roadHeight);
		g.fill({ color: 0x67543d });
		g.stroke({ color: 0x453523, width: 3 });

		// C. West Castle Stone Plaza
		g.circle(wCastX, wCastY, 220);
		g.fill({ color: 0x5a4a35 });
		g.stroke({ color: 0x453523, width: 3 });

		// West Road Branches: Connecting West Castle (200, 1200) smoothly to Top and Bottom gates
		g.poly([
			wCastX,
			wCastY - 140,
			1440,
			TOP_LANE_Y - roadHeight / 2,
			1440,
			TOP_LANE_Y + roadHeight / 2,
			wCastX + 80,
			wCastY
		]);
		g.fill({ color: 0x67543d });
		g.stroke({ color: 0x453523, width: 2 });

		g.poly([
			wCastX + 80,
			wCastY,
			1440,
			BOTTOM_LANE_Y - roadHeight / 2,
			1440,
			BOTTOM_LANE_Y + roadHeight / 2,
			wCastX,
			wCastY + 140
		]);
		g.fill({ color: 0x67543d });
		g.stroke({ color: 0x453523, width: 2 });

		// D. East Castle Stone Plaza
		g.circle(eCastX, eCastY, 220);
		g.fill({ color: 0x5a4a35 });
		g.stroke({ color: 0x453523, width: 3 });

		// East Road Branches: Connecting East Castle (7000, 1200)
		g.poly([
			eCastX,
			eCastY - 140,
			ARENA_WIDTH - 1440,
			TOP_LANE_Y - roadHeight / 2,
			ARENA_WIDTH - 1440,
			TOP_LANE_Y + roadHeight / 2,
			eCastX - 80,
			eCastY
		]);
		g.fill({ color: 0x67543d });
		g.stroke({ color: 0x453523, width: 2 });

		g.poly([
			eCastX - 80,
			eCastY,
			ARENA_WIDTH - 1440,
			BOTTOM_LANE_Y - roadHeight / 2,
			ARENA_WIDTH - 1440,
			BOTTOM_LANE_Y + roadHeight / 2,
			eCastX,
			eCastY + 140
		]);
		g.fill({ color: 0x67543d });
		g.stroke({ color: 0x453523, width: 2 });

		// Stone curb slabs along the lanes
		g.rect(1440, TOP_LANE_Y - roadHeight / 2 - 4, ARENA_WIDTH - 2880, 5);
		g.fill({ color: 0x94a3b8 });
		g.rect(1440, TOP_LANE_Y + roadHeight / 2 - 1, ARENA_WIDTH - 2880, 5);
		g.fill({ color: 0x94a3b8 });

		g.rect(1440, BOTTOM_LANE_Y - roadHeight / 2 - 4, ARENA_WIDTH - 2880, 5);
		g.fill({ color: 0x94a3b8 });
		g.rect(1440, BOTTOM_LANE_Y + roadHeight / 2 - 1, ARENA_WIDTH - 2880, 5);
		g.fill({ color: 0x94a3b8 });

		// Cobblestone paver joints
		for (let px = 1460; px < ARENA_WIDTH - 1460; px += 55) {
			g.moveTo(px, TOP_LANE_Y - roadHeight / 2 + 5);
			g.lineTo(px, TOP_LANE_Y + roadHeight / 2 - 5);
			g.stroke({ color: 0x453523, width: 1.5, alpha: 0.5 });

			g.moveTo(px, BOTTOM_LANE_Y - roadHeight / 2 + 5);
			g.lineTo(px, BOTTOM_LANE_Y + roadHeight / 2 - 5);
			g.stroke({ color: 0x453523, width: 1.5, alpha: 0.5 });
		}
	}

	public drawMountainRidge(g: Graphics, x: number, y: number, w: number, h: number): void {
		// Shadow
		g.ellipse(x + w / 2, y + h, w / 2, 35);
		g.fill({ color: 0x000000, alpha: 0.35 });

		// Rocky base
		g.roundRect(x, y, w, h, 28);
		g.fill({ color: 0x475569 });
		g.stroke({ color: 0x1e293b, width: 4 });

		// Inner darker strata
		g.roundRect(x + 12, y + 12, w - 24, h - 24, 20);
		g.fill({ color: 0x334155 });

		// Pine Trees along the dividing mountain ridge
		for (let tx = x + 40; tx < x + w - 30; tx += 75) {
			const py = y + h / 2 + Math.sin(tx * 0.04) * 25;
			// Trunk
			g.rect(tx - 3, py + 12, 6, 16);
			g.fill({ color: 0x451a03 });
			// Foliage tiers
			g.poly([tx, py - 28, tx + 20, py + 12, tx - 20, py + 12]);
			g.fill({ color: 0x14532d });
			g.poly([tx, py - 38, tx + 15, py - 4, tx - 15, py - 4]);
			g.fill({ color: 0x166534 });
		}
	}

	public drawVerticalBattlementWall(g: Graphics, x: number, y: number, w: number, h: number): void {
		g.rect(x + w, y - 2, 8, h + 4);
		g.fill({ color: 0x000000, alpha: 0.35 });

		g.rect(x, y, w, h);
		g.fill({ color: 0x64748b });
		g.stroke({ color: 0x334155, width: 2 });

		for (let rowY = y + 20; rowY < y + h; rowY += 24) {
			g.moveTo(x + 2, rowY);
			g.lineTo(x + w - 2, rowY);
			g.stroke({ color: 0x475569, width: 1.5 });
		}

		const toothH = 26;
		const gapH = 18;
		const step = toothH + gapH;
		const count = Math.floor(h / step);

		for (let i = 0; i < count; i++) {
			const ty = y + 4 + i * step;
			g.rect(x + w - 10, ty, 10, toothH);
			g.fill({ color: 0x94a3b8 });
			g.stroke({ color: 0x334155, width: 1.5 });
		}
	}

	public drawBattlementWall(g: Graphics, x: number, y: number, w: number, h: number): void {
		g.rect(x - 2, y + h, w + 4, 6);
		g.fill({ color: 0x000000, alpha: 0.35 });

		g.rect(x, y + 10, w, h - 10);
		g.fill({ color: 0x64748b });
		g.stroke({ color: 0x334155, width: 1.5 });

		for (let rowY = y + 20; rowY < y + h; rowY += 14) {
			g.moveTo(x, rowY);
			g.lineTo(x + w, rowY);
			g.stroke({ color: 0x475569, width: 1 });
		}

		g.rect(x - 4, y + 8, w + 8, 5);
		g.fill({ color: 0x94a3b8 });
		g.stroke({ color: 0x334155, width: 1 });

		const toothW = 24;
		const gapW = 16;
		const step = toothW + gapW;
		const count = Math.floor(w / step);

		for (let i = 0; i < count; i++) {
			const tx = x + 4 + i * step;
			g.rect(tx, y, toothW, 10);
			g.fill({ color: 0x94a3b8 });
			g.stroke({ color: 0x334155, width: 1.5 });
		}
	}

	public drawBridge(g: Graphics, centerX: number, laneY: number): void {
		const bridgeW = 280;
		const bridgeH = 180;

		g.rect(centerX - bridgeW / 2, laneY - bridgeH / 2 + 6, bridgeW, bridgeH);
		g.fill({ color: 0x000000, alpha: 0.35 });

		g.rect(centerX - bridgeW / 2, laneY - bridgeH / 2, bridgeW, bridgeH);
		g.fill({ color: 0x78350f });
		g.stroke({ color: 0x451a03, width: 3 });

		for (let bx = centerX - bridgeW / 2 + 15; bx < centerX + bridgeW / 2; bx += 22) {
			g.moveTo(bx, laneY - bridgeH / 2);
			g.lineTo(bx, laneY + bridgeH / 2);
			g.stroke({ color: 0x451a03, width: 2 });
		}

		g.rect(centerX - bridgeW / 2, laneY - bridgeH / 2 - 6, bridgeW, 10);
		g.fill({ color: 0x64748b });
		g.stroke({ color: 0x94a3b8, width: 2 });

		g.rect(centerX - bridgeW / 2, laneY + bridgeH / 2 - 4, bridgeW, 10);
		g.fill({ color: 0x64748b });
		g.stroke({ color: 0x94a3b8, width: 2 });
	}
}
