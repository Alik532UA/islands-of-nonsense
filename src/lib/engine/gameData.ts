import rawBuildings from '../data/buildings.json';
import rawUnits from '../data/units.json';
import rawRaces from '../data/races.json';
import type { BuildingDefinition, UnitDefinition, RaceDefinition } from './types';

export const BUILDINGS_MAP = new Map<string, BuildingDefinition>();
export const UNITS_MAP = new Map<string, UnitDefinition>();
export const RACES_LIST: RaceDefinition[] = rawRaces as RaceDefinition[];

export const SPECIAL_BUILDINGS: BuildingDefinition[] = [
	{
		id: 'h008',
		name: 'Скриня скарбів',
		hp: 800,
		armor: 5,
		armor_type: 'fort',
		attack_type: 'normal',
		gold_cost: 160,
		unit: '',
		upgrade_from: null,
		upgrade_extra_cost: 0,
		race: null,
		specialType: 'treasure'
	},
	{
		id: 'cg09_repair',
		name: 'Ремонтний пункт',
		hp: 1200,
		armor: 5,
		armor_type: 'fort',
		attack_type: 'normal',
		gold_cost: 180,
		unit: '',
		upgrade_from: null,
		upgrade_extra_cost: 0,
		race: null,
		specialType: 'repair'
	},
	{
		id: 'cg07_recycler',
		name: 'Утилізатор',
		hp: 1100,
		armor: 5,
		armor_type: 'fort',
		attack_type: 'normal',
		gold_cost: 210,
		unit: '',
		upgrade_from: null,
		upgrade_extra_cost: 0,
		race: null,
		specialType: 'recycler'
	}
];

for (const b of rawBuildings as BuildingDefinition[]) {
	BUILDINGS_MAP.set(b.id, b);
}

for (const sb of SPECIAL_BUILDINGS) {
	BUILDINGS_MAP.set(sb.id, sb);
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
	return [...getBuildingsForRace(raceName).filter((b) => !b.upgrade_from), ...SPECIAL_BUILDINGS];
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

/**
 * Resolves tactical WC3 unit ability archetype (Ensnare, Poison, Heal, Bash, Aura).
 */
export function resolveUnitAbility(
	def?: UnitDefinition
): 'ensnare' | 'poison' | 'heal' | 'bash' | 'aura_dmg' | 'none' {
	if (!def) return 'none';
	const name = (def.name || '').toLowerCase();

	if (
		name.includes('капкан') ||
		name.includes('ловец') ||
		name.includes('паук') ||
		def.id === 'n01O'
	) {
		return 'ensnare';
	}
	if (
		name.includes('чум') ||
		name.includes('яд') ||
		name.includes('убийца') ||
		def.id === 'u007' ||
		def.id === 'n00K'
	) {
		return 'poison';
	}
	if (
		name.includes('паладин') ||
		name.includes('друид') ||
		name.includes('жрец') ||
		name.includes('волшебник') ||
		def.id === 'h03C' ||
		def.id === 'e00J' ||
		def.id === 'h00W'
	) {
		return 'heal';
	}
	if (
		name.includes('магнатор') ||
		name.includes('вандиго') ||
		name.includes('страж') ||
		name.includes('топор') ||
		def.id === 'n016' ||
		def.id === 'n013' ||
		def.id === 'n00X'
	) {
		return 'bash';
	}
	if (
		name.includes('кодой') ||
		name.includes('чемпион') ||
		name.includes('мастер-меч') ||
		def.id === 'o008' ||
		def.id === 'o006' ||
		def.id === 'n00Z'
	) {
		return 'aura_dmg';
	}

	return 'none';
}
