import type { Graphics } from 'pixi.js';
import type { Simulation } from '../engine/simulation';
import type { Castle, MatchTeam } from '../engine/types';
import { BuildingRenderer } from './buildingRenderer';
import { UnitRenderer } from './unitRenderer';
import { VfxRenderer } from './vfxRenderer';

export type SelectedEntity =
	| { type: 'worker'; playerSlot?: number }
	| { type: 'building'; instanceId: string }
	| { type: 'unit'; instanceId: string }
	| { type: 'group'; unitIds: string[] }
	| { type: 'castle'; team: MatchTeam }
	| null;

/**
 * EntityRenderer serves as the unified facade coordinating the specialized
 * building, unit, and visual effects renderers across the arena layers.
 */
export class EntityRenderer {
	public buildingRenderer: BuildingRenderer;
	public unitRenderer: UnitRenderer;
	public vfxRenderer: VfxRenderer;

	constructor(sim: Simulation) {
		this.buildingRenderer = new BuildingRenderer(sim);
		this.unitRenderer = new UnitRenderer(sim);
		this.vfxRenderer = new VfxRenderer(sim);
	}

	public setSimulation(newSim: Simulation): void {
		this.buildingRenderer.setSimulation(newSim);
		this.unitRenderer.setSimulation(newSim);
		this.vfxRenderer.setSimulation(newSim);
	}

	// =========================================================================
	// Buildings & Castles
	// =========================================================================
	public drawBuildingsLayer(
		g: Graphics,
		selectedPlacedId: string | null,
		enableFog = false,
		bounds?: { minX: number; minY: number; maxX: number; maxY: number },
		viewerTeam: MatchTeam = 'west'
	): void {
		this.buildingRenderer.drawBuildingsLayer(g, selectedPlacedId, enableFog, bounds, viewerTeam);
	}

	public drawCastles(g: Graphics, selectedEntity?: SelectedEntity, enableFog = false): void {
		this.buildingRenderer.drawCastles(g, selectedEntity, enableFog);
	}

	public renderAuthenticCastle(
		g: Graphics,
		castle: Castle,
		isWest: boolean,
		isSelected = false,
		drawHealthBar = false
	): void {
		this.buildingRenderer.renderAuthenticCastle(g, castle, isWest, isSelected, drawHealthBar);
	}

	// =========================================================================
	// Workers & Units
	// =========================================================================
	public drawWorkersLayer(
		g: Graphics,
		selectedWorker: boolean | number | null,
		enableFog = false,
		bounds?: { minX: number; minY: number; maxX: number; maxY: number },
		viewerTeam: MatchTeam = 'west'
	): void {
		this.unitRenderer.drawWorkersLayer(g, selectedWorker, enableFog, bounds, viewerTeam);
	}

	public drawUnitsLayer(
		g: Graphics,
		selectedEntity: SelectedEntity,
		enableFog = false,
		bounds?: { minX: number; minY: number; maxX: number; maxY: number },
		viewerTeam: MatchTeam = 'west'
	): void {
		this.unitRenderer.drawUnitsLayer(g, selectedEntity, enableFog, bounds, viewerTeam);
	}

	// =========================================================================
	// Coins, Projectiles & VFX
	// =========================================================================
	public drawCoinsLayer(
		g: Graphics,
		enableFog = false,
		bounds?: { minX: number; minY: number; maxX: number; maxY: number },
		viewerTeam: MatchTeam = 'west'
	): void {
		this.vfxRenderer.drawCoinsLayer(g, enableFog, bounds, viewerTeam);
	}

	public drawProjectilesLayer(
		g: Graphics,
		enableFog = false,
		bounds?: { minX: number; minY: number; maxX: number; maxY: number },
		viewerTeam: MatchTeam = 'west'
	): void {
		this.vfxRenderer.drawProjectilesLayer(g, enableFog, bounds, viewerTeam);
	}

	public drawLightningEffects(g: Graphics): void {
		this.vfxRenderer.drawLightningEffects(g);
	}

	public drawRescueStrikeEffects(g: Graphics): void {
		this.vfxRenderer.drawRescueStrikeEffects(g);
	}
}
