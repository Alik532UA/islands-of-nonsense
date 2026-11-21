import rawBuildings from '../data/buildings.json';
import rawUnits from '../data/units.json';
import rawRaces from '../data/races.json';
import type { BuildingDefinition, UnitDefinition, RaceDefinition } from './types';

export const BUILDINGS_MAP = new Map<string, BuildingDefinition>();
export const UNITS_MAP = new Map<string, UnitDefinition>();
export const RACES_LIST: RaceDefinition[] = rawRaces as RaceDefinition[];

for (const b of rawBuildings as BuildingDefinition[]) {
	BUILDINGS_MAP.set(b.id, b);
}

for (const u of rawUnits as UnitDefinition[]) {
	UNITS_MAP.set(u.id, u);
}

export function getBuilding(id: string): BuildingDefinition | undefined {
	return BUILDINGS_MAP.get(id);
}

export function getUnit(id: string): UnitDefinition | undefined {
	return UNITS_MAP.get(id);
}

export function getBuildingsForRace(raceName: string): BuildingDefinition[] {
	const buildings: BuildingDefinition[] = [];
	for (const b of BUILDINGS_MAP.values()) {
		if (b.race === raceName) {
			buildings.push(b);
		}
	}
	return buildings;
}

export function getBaseBuildingsForRace(raceName: string): BuildingDefinition[] {
	return getBuildingsForRace(raceName).filter((b) => !b.upgrade_from);
}

export function getUpgradesForBuilding(buildingId: string): BuildingDefinition[] {
	const upgrades: BuildingDefinition[] = [];
	for (const b of BUILDINGS_MAP.values()) {
		if (b.upgrade_from === buildingId) {
			upgrades.push(b);
		}
	}
	return upgrades;
}

/**
 * Calculates train/spawn time for a building.
 * Defaults to 14-22s depending on cost if not specified in raw_fields.ubld.
 */
export function getSpawnCooldown(building: BuildingDefinition, unit?: UnitDefinition): number {
	if (unit?.raw_fields?.ubld) {
		const val = Number(unit.raw_fields.ubld);
		if (val > 0) return Math.min(30, Math.max(8, val));
	}
	// Fallback dynamic calculation based on building cost
	const cost = building.gold_cost || 200;
	return Math.round(10 + (cost / 400) * 8);
}
