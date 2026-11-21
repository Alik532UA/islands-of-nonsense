import rawBuildings from '../data/buildings.json';
import rawUnits from '../data/units.json';
import rawRaces from '../data/races.json';
import type { BuildingDefinition, UnitDefinition, RaceDefinition, Building } from './types';

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

export const GUARD_TOWERS: BuildingDefinition[] = [
	{
		id: 'h006',
		name: 'Вартова вежа',
		hp: 1200,
		armor: 5,
		armor_type: 'fort',
		attack_type: 'pierce',
		damage_base: 45,
		cooldown: 1.0,
		range: 500,
		gold_cost: 150,
		unit: '',
		upgrade_from: null,
		upgrade_extra_cost: 0,
		race: 'Люди',
		specialType: 'tower'
	},
	{
		id: 'h00G',
		name: 'Приливний захисник',
		hp: 1300,
		armor: 5,
		armor_type: 'fort',
		attack_type: 'pierce',
		damage_base: 52,
		cooldown: 1.0,
		range: 500,
		gold_cost: 200,
		unit: '',
		upgrade_from: null,
		upgrade_extra_cost: 0,
		race: 'Наги',
		specialType: 'tower'
	},
	{
		id: 'h01F',
		name: 'Око Безодні',
		hp: 1350,
		armor: 5,
		armor_type: 'fort',
		attack_type: 'chaos',
		damage_base: 62,
		cooldown: 1.1,
		range: 480,
		gold_cost: 220,
		unit: '',
		upgrade_from: null,
		upgrade_extra_cost: 0,
		race: 'Хаос',
		specialType: 'tower'
	},
	{
		id: 'h014',
		name: 'Ельфійська лучна вежа',
		hp: 1100,
		armor: 4,
		armor_type: 'fort',
		attack_type: 'pierce',
		damage_base: 65,
		cooldown: 0.85,
		range: 550,
		gold_cost: 250,
		unit: '',
		upgrade_from: null,
		upgrade_extra_cost: 0,
		race: 'Эльфы',
		specialType: 'tower'
	},
	{
		id: 'h01O',
		name: 'Некротичний зикурат',
		hp: 1300,
		armor: 5,
		armor_type: 'fort',
		attack_type: 'magic',
		damage_base: 50,
		cooldown: 0.9,
		range: 520,
		gold_cost: 200,
		unit: '',
		upgrade_from: null,
		upgrade_extra_cost: 0,
		race: 'Нежить',
		specialType: 'tower'
	},
	{
		id: 'o000',
		name: 'Сторожова вежа орків',
		hp: 1350,
		armor: 5,
		armor_type: 'fort',
		attack_type: 'pierce',
		damage_base: 55,
		cooldown: 1.1,
		range: 500,
		gold_cost: 175,
		unit: '',
		upgrade_from: null,
		upgrade_extra_cost: 0,
		race: 'Орки',
		specialType: 'tower'
	},
	{
		id: 'h03Q',
		name: 'Крижана шпиляста вежа',
		hp: 1400,
		armor: 5,
		armor_type: 'fort',
		attack_type: 'magic',
		damage_base: 50,
		cooldown: 1.0,
		range: 480,
		gold_cost: 230,
		unit: '',
		upgrade_from: null,
		upgrade_extra_cost: 0,
		race: 'Север',
		specialType: 'tower'
	},
	{
		id: 'n01J',
		name: 'Чумна обеліск-вежа',
		hp: 1250,
		armor: 5,
		armor_type: 'fort',
		attack_type: 'chaos',
		damage_base: 48,
		cooldown: 1.0,
		range: 480,
		gold_cost: 200,
		unit: '',
		upgrade_from: null,
		upgrade_extra_cost: 0,
		race: 'Порча',
		specialType: 'tower'
	},
	{
		id: 'h073',
		name: 'Древо-захисник',
		hp: 1500,
		armor: 6,
		armor_type: 'fort',
		attack_type: 'siege',
		damage_base: 70,
		cooldown: 1.4,
		range: 520,
		gold_cost: 210,
		unit: '',
		upgrade_from: null,
		upgrade_extra_cost: 0,
		race: 'Ночные эльфы',
		specialType: 'tower'
	},
	{
		id: 'h05L',
		name: 'Тесла-вежа',
		hp: 1400,
		armor: 5,
		armor_type: 'fort',
		attack_type: 'magic',
		damage_base: 60,
		cooldown: 0.95,
		range: 460,
		gold_cost: 240,
		unit: '',
		upgrade_from: null,
		upgrade_extra_cost: 0,
		race: 'Техники',
		specialType: 'tower'
	},
	{
		id: 'cg0a',
		name: 'Сміттєва баліста',
		hp: 1200,
		armor: 5,
		armor_type: 'fort',
		attack_type: 'siege',
		damage_base: 58,
		cooldown: 1.3,
		range: 520,
		gold_cost: 150,
		unit: '',
		upgrade_from: null,
		upgrade_extra_cost: 0,
		race: 'Сборщики',
		specialType: 'tower'
	}
];

for (const b of rawBuildings as BuildingDefinition[]) {
	BUILDINGS_MAP.set(b.id, b);
}

for (const sb of SPECIAL_BUILDINGS) {
	BUILDINGS_MAP.set(sb.id, sb);
}

for (const t of GUARD_TOWERS) {
	BUILDINGS_MAP.set(t.id, t);
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

/**
 * Checks if a building is a Legendary structure requiring Food Cap.
 * Follows WC3 reference: ufoo > 0, cost >= 450, or legendary apex spawners.
 */
export function isLegendaryBuilding(def?: BuildingDefinition): boolean {
	if (!def) return false;
	if (Number(def.raw_fields?.ufoo) > 0) return true;
	if (def.gold_cost >= 450) return true;
	const name = (def.name || '').toLowerCase();
	return (
		name.includes('древний фонтан') ||
		name.includes('университет') ||
		name.includes('цитадель некромантии') ||
		name.includes('уничтожитель') ||
		name.includes('амазонок') ||
		name.includes('элитных големов') ||
		name.includes('драконье кладбище') ||
		name.includes('врата демонов')
	);
}

/**
 * Checks if a building is a Defensive Guard Tower.
 */
export function isTowerBuilding(def?: BuildingDefinition | Building): boolean {
	if (!def) return false;
	return def.specialType === 'tower';
}
