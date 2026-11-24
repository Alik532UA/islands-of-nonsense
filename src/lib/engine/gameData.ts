import rawBuildings from '../data/buildings.json';
import rawUnits from '../data/units.json';
import rawRaces from '../data/races.json';
export { RaceRegistry } from './raceRegistry';
import type {
	BuildingDefinition,
	UnitDefinition,
	RaceDefinition,
	Building,
	UnitAbilityType,
	UnitAbilityDef
} from './types';

export const BUILDINGS_MAP = new Map<string, BuildingDefinition>();
export const UNITS_MAP = new Map<string, UnitDefinition>();
export const RACES_LIST: RaceDefinition[] = rawRaces as RaceDefinition[];

export const SPECIAL_BUILDINGS: BuildingDefinition[] = [
	{
		id: 'cg10_shop',
		name: 'Магазин',
		hp: 850,
		armor: 5,
		armor_type: 'fort',
		attack_type: 'normal',
		gold_cost: 50,
		lumber_cost: 50,
		unit: '',
		upgrade_from: null,
		upgrade_extra_cost: 0,
		race: null,
		specialType: 'shop'
	},
	{
		id: 'cg11_forge',
		name: 'Кузня',
		hp: 950,
		armor: 5,
		armor_type: 'fort',
		attack_type: 'normal',
		gold_cost: 100,
		lumber_cost: 100,
		unit: '',
		upgrade_from: null,
		upgrade_extra_cost: 0,
		race: null,
		specialType: 'forge'
	},
	{
		id: 'h008',
		name: 'Скриня зі Скарбами',
		hp: 650,
		armor: 5,
		armor_type: 'fort',
		attack_type: 'normal',
		gold_cost: 160,
		lumber_cost: 400,
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
		lumber_cost: 300,
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
		lumber_cost: 300,
		unit: '',
		upgrade_from: null,
		upgrade_extra_cost: 0,
		race: null,
		specialType: 'recycler'
	},
	{
		id: 'h045_altar',
		name: 'Вівтар Захисту',
		hp: 1000,
		armor: 5,
		armor_type: 'fort',
		attack_type: 'normal',
		gold_cost: 220,
		lumber_cost: 330,
		unit: '',
		upgrade_from: null,
		upgrade_extra_cost: 0,
		race: null,
		specialType: 'special',
		aura: {
			type: 'armor',
			value: 3,
			radius: 600
		}
	},
	{
		id: 'h046_fountain',
		name: 'Джерело Зцілення',
		hp: 1000,
		armor: 5,
		armor_type: 'fort',
		attack_type: 'normal',
		gold_cost: 240,
		lumber_cost: 480,
		unit: '',
		upgrade_from: null,
		upgrade_extra_cost: 0,
		race: null,
		specialType: 'special',
		aura: {
			type: 'heal',
			value: 25,
			radius: 600
		}
	},
	{
		id: 'h047_obelisk',
		name: 'Обеліск Мани',
		hp: 900,
		armor: 5,
		armor_type: 'fort',
		attack_type: 'normal',
		gold_cost: 200,
		lumber_cost: 350,
		unit: '',
		upgrade_from: null,
		upgrade_extra_cost: 0,
		race: null,
		specialType: 'special',
		aura: {
			type: 'mana',
			value: 10,
			radius: 600
		}
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
		race: 'Ельфи',
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
		race: 'Північ',
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
		race: 'Нічні ельфи',
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
		race: 'Техніки',
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
		race: 'Збирачі',
		specialType: 'tower'
	}
];

for (const b of rawBuildings as BuildingDefinition[]) {
	if (b.raw_fields && typeof b.raw_fields.ulum === 'number' && b.raw_fields.ulum > 0) {
		b.lumber_cost = b.raw_fields.ulum;
	}
	BUILDINGS_MAP.set(b.id, b);
}

for (const sb of SPECIAL_BUILDINGS) {
	BUILDINGS_MAP.set(sb.id, sb);
}

for (const t of GUARD_TOWERS) {
	if (!t.lumber_cost) {
		t.lumber_cost = 300;
	}
	BUILDINGS_MAP.set(t.id, t);
}

for (const u of rawUnits as UnitDefinition[]) {
	if (u.raw_fields) {
		const maxM = Number(u.raw_fields.umpm || 0);
		if (maxM > 0) {
			u.maxMana = maxM;
			u.mana = u.raw_fields.umpi !== undefined ? Number(u.raw_fields.umpi) : maxM;
			u.manaRegen = Number(u.raw_fields.umpr || 0);
		}
	}
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
	const validRace = raceName === 'in_game' || !raceName ? 'Люди' : raceName;
	const raceEntry = RACES_LIST.find((r) => r.race === validRace) || RACES_LIST[0];

	// 1. Reference buildings for this race (11 buildings from races.json)
	const refBuildings: BuildingDefinition[] = [];
	const refIds = raceEntry.buildings || [];
	for (const id of refIds) {
		const b = BUILDINGS_MAP.get(id);
		if (b && !b.upgrade_from && !refBuildings.some((x) => x.id === b.id)) {
			refBuildings.push(b);
		}
		if (refBuildings.length >= 11) break;
	}

	// Fallback if custom race has fewer than 11 non-upgrade buildings in races.json
	if (refBuildings.length < 11) {
		const raceBuildings = getBuildingsForRace(raceEntry.race).filter(
			(b) => !b.upgrade_from && !refBuildings.some((r) => r.id === b.id)
		);
		for (const b of raceBuildings) {
			refBuildings.push(b);
			if (refBuildings.length >= 11) break;
		}
	}

	// If still fewer than 11 (e.g. Збирачі), fill from SPECIAL_BUILDINGS (treasure, repair, recycler, etc.)
	if (refBuildings.length < 11) {
		for (const sb of SPECIAL_BUILDINGS) {
			if (
				sb.id !== 'cg10_shop' &&
				sb.id !== 'cg11_forge' &&
				!refBuildings.some((x) => x.id === sb.id)
			) {
				refBuildings.push(sb);
			}
			if (refBuildings.length >= 11) break;
		}
	}

	// Separate into army spawners (without specialType) and specials (with specialType)
	const armySpawners = refBuildings.filter((b) => !b.specialType);
	armySpawners.sort((a, b) => (a.gold_cost || 0) - (b.gold_cost || 0));

	const refSpecials = refBuildings.filter((b) => Boolean(b.specialType));

	// 2. Aux buildings: shop (cg10_shop, 50g/50w) and forge (cg11_forge, 100g/100w)
	const shop = BUILDINGS_MAP.get('cg10_shop');
	const forge = BUILDINGS_MAP.get('cg11_forge');
	const aux: BuildingDefinition[] = [];
	if (shop && !refSpecials.some((x) => x.id === shop.id)) aux.push(shop);
	if (forge && !refSpecials.some((x) => x.id === forge.id)) aux.push(forge);

	// Sort specials by gold cost ascending
	const allSpecials = [...refSpecials, ...aux];
	allSpecials.sort((a, b) => (a.gold_cost || 0) - (b.gold_cost || 0));

	return [...armySpawners, ...allSpecials];
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

export interface BuildingVisualRank {
	rank: number; // 1 to 6 (dice pips), or 0 for specials
	isUpgrade: boolean;
	specialType?: 'tower' | 'treasure' | 'repair' | 'recycler' | 'special' | 'shop' | 'forge';
}

/**
 * Computes visual rank (1..6 dice pips) and special type for a building so players
 * can immediately identify its power level and spawner tier on the map.
 */
export function getBuildingVisualRank(defId: string, race?: string): BuildingVisualRank {
	const bDef = BUILDINGS_MAP.get(defId);
	if (!bDef) {
		return { rank: 1, isUpgrade: false };
	}

	if (bDef.specialType) {
		return {
			rank: 0,
			isUpgrade: false,
			specialType: bDef.specialType
		};
	}

	// Trace root base building if this is an upgraded tier
	let rootDef = bDef;
	let isUpgrade = false;
	const visited = new Set<string>();
	while (rootDef.upgrade_from && !visited.has(rootDef.upgrade_from)) {
		visited.add(rootDef.id);
		const parent = BUILDINGS_MAP.get(rootDef.upgrade_from);
		if (!parent) break;
		rootDef = parent;
		isUpgrade = true;
	}

	const buildingRace = bDef.race || race;
	if (buildingRace) {
		const armySpawners = getBuildingsForRace(buildingRace).filter(
			(b) => !b.upgrade_from && !b.specialType
		);
		armySpawners.sort((a, b) => (a.gold_cost || 0) - (b.gold_cost || 0));
		const idx = armySpawners.findIndex((b) => b.id === rootDef.id);
		if (idx >= 0) {
			return {
				rank: Math.min(6, idx + 1),
				isUpgrade
			};
		}
	}

	// Fallback based on gold cost
	const cost = rootDef.gold_cost || bDef.gold_cost || 150;
	let rank = 1;
	if (cost >= 500) rank = 6;
	else if (cost >= 400) rank = 5;
	else if (cost >= 320) rank = 4;
	else if (cost >= 250) rank = 3;
	else if (cost >= 180) rank = 2;

	return {
		rank,
		isUpgrade
	};
}

/**
 * Calculates train/spawn time for a building.
 * Authentic WC3 Castle Fight values from unit raw_fields.ubld (12s to 65s).
 */
export function getSpawnCooldown(building: BuildingDefinition, unit?: UnitDefinition): number {
	const ubldVal = unit?.raw_fields?.ubld ?? unit?.ubld;
	if (ubldVal !== undefined) {
		const val = Number(ubldVal);
		if (val > 0) return Math.min(65, Math.max(8, val));
	}
	// Fallback dynamic calculation based on building cost
	const cost = building.gold_cost || 200;
	return Math.round(10 + (cost / 400) * 8);
}

/**
 * Calculates authentic initial spawn delay upon building construction completion.
 * In WC3, newly constructed spawners take their authentic ubld training time before first spawn.
 */
export function getInitialSpawnDelay(building: BuildingDefinition, unit?: UnitDefinition): number {
	if (building.initialSpawnDelay !== undefined) {
		return building.initialSpawnDelay;
	}
	const ubldVal = unit?.raw_fields?.ubld ?? unit?.ubld;
	if (ubldVal !== undefined) {
		const val = Number(ubldVal);
		if (val > 0) return Math.min(65, Math.max(8, val));
	}
	return getSpawnCooldown(building, unit);
}

export const UNIT_ABILITY_CATALOG: Record<UnitAbilityType, Omit<UnitAbilityDef, 'id'>> = {
	none: {
		nameUk: 'Без здібності',
		nameEn: 'None',
		type: 'none',
		isPassive: true,
		descriptionUk: 'Звичайний боєць без спеціальних навичок.',
		descriptionEn: 'Standard unit without special abilities.'
	},
	ensnare: {
		nameUk: 'Сітка',
		nameEn: 'Ensnare',
		type: 'ensnare',
		isPassive: false,
		cooldown: 12.0,
		descriptionUk: 'Приземляє та знерухомлює літаючого або наземного ворога на 6 с.',
		descriptionEn: 'Brings flying enemies to ground and roots them for 6s.',
		icon: 'Net'
	},
	poison: {
		nameUk: 'Отрута',
		nameEn: 'Poison',
		type: 'poison',
		isPassive: true,
		descriptionUk: 'Атаки отруюють ворога: 15 шкоди/с та -30% швидкості бігу на 5 с.',
		descriptionEn: 'Attacks poison enemy: 15 dps and -30% move speed for 5s.',
		icon: 'Droplet'
	},
	heal: {
		nameUk: 'Лікування',
		nameEn: 'Heal',
		type: 'heal',
		isPassive: false,
		cooldown: 3.5,
		descriptionUk: 'Відновлює 75 HP найближчому пораненому союзнику.',
		descriptionEn: 'Restores 75 HP to closest wounded ally.',
		icon: 'Heart'
	},
	bash: {
		nameUk: 'Оглушення',
		nameEn: 'Bash',
		type: 'bash',
		isPassive: true,
		descriptionUk: '20% шанс приголомшити ворога на 1.2 с та завдати +25 шкоди.',
		descriptionEn: '20% chance to stun enemy for 1.2s and deal +25 bonus damage.',
		icon: 'Hammer'
	},
	aura_dmg: {
		nameUk: 'Аура Командира',
		nameEn: 'Command Aura',
		type: 'aura_dmg',
		isPassive: true,
		descriptionUk: '+15% до атаки всім дружнім бійцям у радіусі 300.',
		descriptionEn: '+15% attack damage to nearby allies in 300 radius.',
		icon: 'Shield'
	},
	aura_armor: {
		nameUk: 'Аура Вірності',
		nameEn: 'Devotion Aura',
		type: 'aura_armor',
		isPassive: true,
		descriptionUk: '+3 до броні всім дружнім бійцям у радіусі 300.',
		descriptionEn: '+3 armor bonus to nearby allies in 300 radius.',
		icon: 'Shield'
	},
	aura_speed: {
		nameUk: 'Аура Витривалості',
		nameEn: 'Endurance Aura',
		type: 'aura_speed',
		isPassive: true,
		descriptionUk: '+20% до швидкості атаки та бігу всім союзникам у радіусі 300.',
		descriptionEn: '+20% attack & move speed to nearby allies in 300 radius.',
		icon: 'Zap'
	},
	bloodlust: {
		nameUk: 'Кровожерливість',
		nameEn: 'Bloodlust',
		type: 'bloodlust',
		isPassive: false,
		cooldown: 10.0,
		descriptionUk: 'Дарує союзнику лють: +40% швидкості атаки та +25% швидкості бігу на 10 с.',
		descriptionEn: 'Grants an ally +40% attack speed and +25% move speed for 10s.',
		icon: 'Flame'
	},
	slow: {
		nameUk: 'Уповільнення',
		nameEn: 'Slow',
		type: 'slow',
		isPassive: false,
		cooldown: 8.0,
		descriptionUk: 'Знижує швидкість бігу ворога на 40% та атаки на 30% на 6 с.',
		descriptionEn: 'Reduces enemy move speed by 40% and attack speed by 30% for 6s.',
		icon: 'Clock'
	},
	crit: {
		nameUk: 'Смертельний удар',
		nameEn: 'Critical Strike',
		type: 'crit',
		isPassive: true,
		descriptionUk: '22% шанс завдати подвійної (2x) шкоди при кожній атаці.',
		descriptionEn: '22% chance to deal double (2x) damage on each attack.',
		icon: 'Sword'
	},
	evasion: {
		nameUk: 'Ухилення',
		nameEn: 'Evasion',
		type: 'evasion',
		isPassive: true,
		descriptionUk: '20% шанс повністю ухилитися від ворожої атаки.',
		descriptionEn: '20% chance to completely dodge enemy attacks.',
		icon: 'Wind'
	},
	cleave: {
		nameUk: 'Розсікаючий удар',
		nameEn: 'Cleave',
		type: 'cleave',
		isPassive: true,
		descriptionUk: '40% завданої шкоди ближнього бою передається ворогам поблизу цілі.',
		descriptionEn: '40% of melee damage splashes to surrounding enemy units.',
		icon: 'Axe'
	},
	frost: {
		nameUk: 'Крижана атака',
		nameEn: 'Frost Attack',
		type: 'frost',
		isPassive: true,
		descriptionUk: 'Удари сковують ворога холодом: -35% швидкості бігу та атаки на 3.5 с.',
		descriptionEn: 'Chills targets on hit: -35% move and attack speed for 3.5s.',
		icon: 'Snowflake'
	},
	thorns: {
		nameUk: 'Панцир із шипами',
		nameEn: 'Thorns Aura',
		type: 'thorns',
		isPassive: true,
		descriptionUk: 'Повертає 25% фізичної шкоди ближнього бою назад нападнику.',
		descriptionEn: 'Returns 25% of melee attack damage back to the attacker.',
		icon: 'ShieldAlert'
	},
	reincarnation: {
		nameUk: 'Переродження',
		nameEn: 'Reincarnation',
		type: 'reincarnation',
		isPassive: true,
		descriptionUk: 'Після смерті миттєво воскресає з повним здоров’ям один раз за раунд.',
		descriptionEn: 'Upon fatal damage, revives once with 100% HP.',
		icon: 'RefreshCw'
	},
	pulverize: {
		nameUk: 'Розтрощення',
		nameEn: 'Pulverize',
		type: 'pulverize',
		isPassive: true,
		descriptionUk: '20% шанс завдати 50 сплеш-шкоди всім ворогам поряд.',
		descriptionEn: '20% chance on hit to deal 50 AoE damage to nearby foes.',
		icon: 'Zap'
	},
	immolation: {
		nameUk: 'Полум’яний жар',
		nameEn: 'Immolation',
		type: 'immolation',
		isPassive: true,
		descriptionUk: 'Постійно обпікає ворогів у радіусі 200, завдаючи 18 шкоди щосекунди.',
		descriptionEn: 'Burns nearby enemies in 200 radius for 18 damage every second.',
		icon: 'Flame'
	},
	curse: {
		nameUk: 'Прокляття',
		nameEn: 'Curse',
		type: 'curse',
		isPassive: false,
		cooldown: 9.0,
		descriptionUk: 'Накладає прокляття на 8 с: ціль схибить у 33% своїх атак.',
		descriptionEn: 'Curses enemy for 8s: target misses 33% of its attacks.',
		icon: 'EyeOff'
	},
	inner_fire: {
		nameUk: 'Вогонь віри',
		nameEn: 'Inner Fire',
		type: 'inner_fire',
		isPassive: false,
		cooldown: 12.0,
		descriptionUk: 'Підвищує шкоду союзника на 25% та броню на +5 на 12 с.',
		descriptionEn: 'Grants an ally +25% damage and +5 armor for 12s.',
		icon: 'Sparkles'
	},
	thunderbolt: {
		nameUk: 'Громовий удар',
		nameEn: 'Storm Bolt',
		type: 'thunderbolt',
		isPassive: false,
		cooldown: 12.0,
		descriptionUk: 'Кидає магічний молот: 100 магічної шкоди та оглушення на 2 с.',
		descriptionEn: 'Hurls a magic hammer: 100 damage and 2s stun.',
		icon: 'Zap'
	},
	chain_lightning: {
		nameUk: 'Ланцюгова блискавка',
		nameEn: 'Chain Lightning',
		type: 'chain_lightning',
		isPassive: false,
		cooldown: 12.0,
		descriptionUk: 'Вражає до 4 ворогів магічною блискавкою (120/90/65/45 шкоди).',
		descriptionEn: 'Strikes up to 4 enemies with chain lightning (120/90/65/45 dmg).',
		icon: 'Zap'
	},
	stomp: {
		nameUk: 'Громовий тупіт',
		nameEn: 'War Stomp',
		type: 'stomp',
		isPassive: false,
		cooldown: 10.0,
		descriptionUk: 'Струшує землю: 75 шкоди та 1.5 с оглушення ворогам навколо.',
		descriptionEn: 'Slams ground: 75 damage and 1.5s stun to nearby foes.',
		icon: 'Activity'
	},
	mana_burn: {
		nameUk: 'Спалення мани',
		nameEn: 'Mana Burn',
		type: 'mana_burn',
		isPassive: false,
		cooldown: 10.0,
		manaCost: 35,
		descriptionUk: 'Спалює до 50 мани у ворожого кастера і завдає еквівалентної магічної шкоди.',
		descriptionEn: 'Burns up to 50 mana from an enemy caster and deals equivalent magic damage.',
		icon: 'Flame'
	},
	raise_dead: {
		nameUk: 'Підняття мерців',
		nameEn: 'Raise Dead',
		type: 'raise_dead',
		isPassive: false,
		cooldown: 8.0,
		manaCost: 45,
		descriptionUk: 'Піднімає полеглого воїна у вигляді Скелета-воїна (240 HP) на 25 с.',
		descriptionEn: 'Raises a fallen corpse as a Skeleton Warrior (240 HP) for 25s.',
		icon: 'Skull'
	},
	corpse_explosion: {
		nameUk: 'Вибух трупа',
		nameEn: 'Corpse Explosion',
		type: 'corpse_explosion',
		isPassive: false,
		cooldown: 9.0,
		manaCost: 35,
		descriptionUk: 'Підриває труп ворога або союзника, завдаючи 100 шкоди всім ворогам навколо.',
		descriptionEn: 'Detonates a nearby corpse dealing 100 AoE damage to nearby foes.',
		icon: 'Bomb'
	},
	cannibalize: {
		nameUk: 'Канібалізм',
		nameEn: 'Cannibalize',
		type: 'cannibalize',
		isPassive: false,
		cooldown: 8.0,
		descriptionUk: 'Пожирає сусідній труп, відновлюючи 35% від максимального здоров’я.',
		descriptionEn: 'Consumes a nearby corpse to restore 35% of max HP.',
		icon: 'Utensils'
	},
	polymorph: {
		nameUk: 'Перетворення',
		nameEn: 'Polymorph',
		type: 'polymorph',
		isPassive: false,
		cooldown: 12.0,
		manaCost: 60,
		descriptionUk:
			'Перетворює ворожого бійця на беззахисну вівцю на 5.5 с (не може битися чи чаклувати).',
		descriptionEn:
			'Transforms target enemy into a harmless sheep for 5.5s (cannot attack or cast).',
		icon: 'Sparkles'
	},
	cyclone: {
		nameUk: 'Смерч',
		nameEn: 'Cyclone',
		type: 'cyclone',
		isPassive: false,
		cooldown: 14.0,
		manaCost: 50,
		descriptionUk: 'Підкидає ворога у повітря вихором на 4.5 с, повністю виводячи його з бою.',
		descriptionEn: 'Tosses an enemy into the air for 4.5s, completely incapacitating them.',
		icon: 'Wind'
	},
	banish: {
		nameUk: 'Вигнання в астрал',
		nameEn: 'Banish',
		type: 'banish',
		isPassive: false,
		cooldown: 11.0,
		manaCost: 40,
		descriptionUk:
			'Переносить ворога в астральний вимір на 6 с: імунітет до фізичної шкоди, але +66% шкоди від магії.',
		descriptionEn:
			'Banishes unit to ethereal form for 6s: immune to physical attacks, but +66% magic damage taken.',
		icon: 'Ghost'
	},
	mana_shield: {
		nameUk: 'Щит мани',
		nameEn: 'Mana Shield',
		type: 'mana_shield',
		isPassive: true,
		descriptionUk:
			'Використовує ману кастера для поглинання 50% отриманої шкоди (1 шкода = 0.5 мани).',
		descriptionEn: 'Absorbs 50% of incoming damage using caster mana pool (1 dmg = 0.5 mana).',
		icon: 'ShieldCheck'
	},
	dispel: {
		nameUk: 'Розвіювання магії',
		nameEn: 'Dispel Magic',
		type: 'dispel',
		isPassive: false,
		cooldown: 8.0,
		manaCost: 45,
		descriptionUk:
			'Знімає негативні ефекти з союзників або позитивні баффи з ворогів. Завдає 150 магічної шкоди закликаним істотам.',
		descriptionEn:
			'Dispels negative debuffs from allies or positive buffs from enemies. Deals 150 magic damage to summoned units.',
		icon: 'Sparkles'
	}
};

/**
 * Returns all rich abilities associated with a unit definition.
 * Extracts abilities from raw Warcraft III ability strings (uabi/uabs) and canonical unit archetype data.
 */
export function getUnitAbilities(def?: UnitDefinition): UnitAbilityDef[] {
	if (!def) return [];
	const raw = `${def.raw_fields?.uabi || ''},${def.raw_fields?.uabs || ''}`;
	const codes = raw
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	const name = (def.name || '').toLowerCase();
	const id = def.id;
	const matchedTypes = new Set<UnitAbilityType>();

	// 1. Reincarnation
	if (
		codes.includes('AOre') ||
		name.includes('таурен') ||
		name.includes('фенікс') ||
		name.includes('феникс') ||
		id === 'o009' ||
		id === 'h00D'
	) {
		matchedTypes.add('reincarnation');
	}

	// 2. Critical strike
	if (
		codes.some((c) => ['AOcr', 'ACct', 'A03P', 'A00U', 'A07M', 'Ocr1'].includes(c)) ||
		name.includes('майстер-меч') ||
		name.includes('мастер клинка') ||
		name.includes('убивця') ||
		name.includes('убийца') ||
		name.includes('мортир') ||
		name.includes('рейнджер')
	) {
		matchedTypes.add('crit');
	}

	// 3. Evasion
	if (
		codes.some((c) => ['ACes', 'ACev', 'A03U', 'Eev1'].includes(c)) ||
		name.includes('мисливець') ||
		name.includes('мисливиця') ||
		name.includes('охотник') ||
		name.includes('штурмовик') ||
		name.includes('тіней')
	) {
		matchedTypes.add('evasion');
	}

	// 4. Cleave / Splash
	if (
		codes.some((c) => ['ACce', 'A00D'].includes(c)) ||
		name.includes('чемпіон') ||
		name.includes('чемпион') ||
		name.includes('м’ясник') ||
		name.includes('вартовий')
	) {
		matchedTypes.add('cleave');
	}

	// 5. Bash / Stun
	if (
		codes.some((c) => ['ACbh', 'A026', 'A02X', 'A03S'].includes(c)) ||
		name.includes('магнатор') ||
		name.includes('вандіго') ||
		name.includes('вандиго') ||
		name.includes('сокир') ||
		id === 'n016' ||
		id === 'n013' ||
		id === 'n00X'
	) {
		matchedTypes.add('bash');
	}

	// 6. Poison
	if (
		codes.some((c) => ['Aspo', 'ACvs', 'A07J', 'A05T'].includes(c)) ||
		name.includes('отрут') ||
		name.includes('яд') ||
		name.includes('чум') ||
		id === 'u007' ||
		id === 'n00K'
	) {
		matchedTypes.add('poison');
	}

	// 7. Frost
	if (
		codes.some((c) => ['Afra', 'A070', 'A043'].includes(c)) ||
		name.includes('крижа') ||
		name.includes('ледян') ||
		name.includes('мороз') ||
		name.includes('лич') ||
		id === 'u00D'
	) {
		matchedTypes.add('frost');
	}

	// 8. Thorns / Spikes
	if (
		codes.some((c) => ['ANth', 'AEah', 'A00C'].includes(c)) ||
		name.includes('черепах') ||
		name.includes('панцир') ||
		name.includes('шип') ||
		id === 'n007'
	) {
		matchedTypes.add('thorns');
	}

	// 9. Pulverize
	if (
		codes.some((c) => ['ACpv', 'A031'].includes(c)) ||
		name.includes('голем') ||
		name.includes('велетень')
	) {
		matchedTypes.add('pulverize');
	}

	// 10. Immolation
	if (
		codes.some((c) => ['ANpi', 'Apxf'].includes(c)) ||
		name.includes('інфернал') ||
		name.includes('вогнян') ||
		name.includes('пламен') ||
		id === 'n01E' ||
		id === 'n01F'
	) {
		matchedTypes.add('immolation');
	}

	// 11. Bloodlust
	if (
		codes.some((c) => ['Ablo', 'A08W', 'A016'].includes(c)) ||
		name.includes('шаман') ||
		name.includes('огр-маг') ||
		name.includes('лють') ||
		id === 'o006'
	) {
		matchedTypes.add('bloodlust');
	}

	// 12. Slow
	if (
		codes.some((c) => ['Aslo', 'A06V'].includes(c)) ||
		name.includes('чарівниця') ||
		name.includes('сповільн')
	) {
		matchedTypes.add('slow');
	}

	// 13. Curse
	if (
		codes.some((c) => ['Acrs', 'A05O'].includes(c)) ||
		name.includes('банші') ||
		name.includes('некромант') ||
		name.includes('проклят') ||
		id === 'u009'
	) {
		matchedTypes.add('curse');
	}

	// 14. Heal
	if (
		codes.some((c) => ['Ahea', 'A0A8', 'A00Y'].includes(c)) ||
		name.includes('паладин') ||
		name.includes('жрець') ||
		name.includes('друїд') ||
		id === 'h03C' ||
		id === 'e00J' ||
		id === 'h00W'
	) {
		matchedTypes.add('heal');
	}

	// 15. Inner Fire
	if (
		codes.some((c) => ['Ainf', 'A01A'].includes(c)) ||
		name.includes('лицар світла') ||
		name.includes('священник')
	) {
		matchedTypes.add('inner_fire');
	}

	// 16. Ensnare
	if (
		codes.some((c) => ['A06H', 'A07A', 'A02I'].includes(c)) ||
		name.includes('капкан') ||
		name.includes('павук') ||
		name.includes('ловець') ||
		id === 'n01O'
	) {
		matchedTypes.add('ensnare');
	}

	// 17. Chain lightning
	if (
		codes.some((c) => ['A09T', 'A0AH'].includes(c)) ||
		name.includes('блискав') ||
		name.includes('громов')
	) {
		matchedTypes.add('chain_lightning');
	}

	// 18. Storm bolt
	if (
		codes.some((c) => ['A08U', 'A01X', 'A06S', 'A0AK', 'A082', 'A083'].includes(c)) ||
		name.includes('молот') ||
		name.includes('буревісник')
	) {
		matchedTypes.add('thunderbolt');
	}

	// 19. Stomp
	if (
		codes.some((c) => ['A05D', 'A09E', 'A00B', 'A031'].includes(c)) ||
		name.includes('тупіт') ||
		name.includes('громовий')
	) {
		matchedTypes.add('stomp');
	}

	// 20. Command Aura
	if (codes.some((c) => ['ACac', 'A00T'].includes(c)) || name.includes('кодо') || id === 'o008') {
		matchedTypes.add('aura_dmg');
	}

	// 21. Devotion Aura
	if (codes.some((c) => ['AHad', 'A01F'].includes(c)) || name.includes('обладунок віри')) {
		matchedTypes.add('aura_armor');
	}

	// 22. Endurance Aura
	if (codes.some((c) => ['A07H'].includes(c))) {
		matchedTypes.add('aura_speed');
	}

	// 23. Raise Dead
	if (
		codes.some((c) => ['A05O', 'Acrs', 'A09Y', 'A02N', 'A05R'].includes(c)) ||
		name.includes('некромант') ||
		id === 'u009'
	) {
		matchedTypes.add('raise_dead');
	}

	// 24. Corpse Explosion
	if (
		codes.some((c) => ['A00L', 'A073', 'A034'].includes(c)) ||
		name.includes('чумна мортира') ||
		name.includes('підривник')
	) {
		matchedTypes.add('corpse_explosion');
	}

	// 25. Cannibalize
	if (
		codes.some((c) => ['Acan', 'A00K'].includes(c)) ||
		name.includes('вурдалак') ||
		name.includes('гуль') ||
		id === 'u005'
	) {
		matchedTypes.add('cannibalize');
	}

	// 26. Polymorph
	if (
		codes.some((c) => ['Aply', 'A06V', 'A08L'].includes(c)) ||
		name.includes('чарівниця') ||
		name.includes('волшебница') ||
		name.includes('чародійка')
	) {
		matchedTypes.add('polymorph');
	}

	// 27. Cyclone
	if (
		codes.some((c) => ['Acyc', 'A07A', 'A01G'].includes(c)) ||
		name.includes('смерч') ||
		name.includes('друїд когтя') ||
		name.includes('прикликач вітру')
	) {
		matchedTypes.add('cyclone');
	}

	// 28. Banish
	if (
		codes.some((c) => ['Aban', 'A016', 'A05J'].includes(c)) ||
		name.includes('астрал') ||
		name.includes('маг крові') ||
		name.includes('вигнан')
	) {
		matchedTypes.add('banish');
	}

	// 29. Mana Shield
	if (
		codes.some((c) => ['Amsh', 'A03H', 'A09P'].includes(c)) ||
		name.includes('щит мани') ||
		name.includes('морська відьма') ||
		name.includes('архімаг')
	) {
		matchedTypes.add('mana_shield');
	}

	// 30. Dispel Magic / Purge
	if (
		codes.some((c) => ['Adid', 'Adis', 'Acmg', 'A0A9', 'A07R', 'A049'].includes(c)) ||
		name.includes('диспел') ||
		name.includes('розвіюван') ||
		name.includes('очищен') ||
		name.includes('заклинателька') ||
		name.includes('троль-чаклун') ||
		name.includes('чарівний дракончик') ||
		id === 'h07B' ||
		id === 'n015' ||
		id === 'e000'
	) {
		matchedTypes.add('dispel');
	}

	return Array.from(matchedTypes).map((type) => ({
		id: `abil_${type}`,
		...UNIT_ABILITY_CATALOG[type]
	}));
}

// Populate unit abilities now that UNIT_ABILITY_CATALOG and getUnitAbilities are fully defined
for (const u of UNITS_MAP.values()) {
	u.abilities = getUnitAbilities(u);
}

/**
 * Resolves the primary tactical WC3 unit ability archetype for a given unit.
 * Retains strict backward compatibility for single-archetype selectors (Ensnare, Poison, Heal, Bash, Aura).
 */
export function resolveUnitAbility(def?: UnitDefinition): UnitAbilityType {
	if (!def) return 'none';
	const name = (def.name || '').toLowerCase();

	if (name.includes('чарівниця') || name.includes('волшебница') || name.includes('чародійка')) {
		return 'polymorph';
	}
	if (
		name.includes('заклинателька') ||
		name.includes('троль-чаклун') ||
		def.id === 'h07B' ||
		def.id === 'n015'
	) {
		return 'dispel';
	}
	if (name.includes('прикликач вітру') || name.includes('смерч')) {
		return 'cyclone';
	}
	if (name.includes('маг крові') || name.includes('астрал')) {
		return 'banish';
	}
	if (name.includes('морська відьма') || name.includes('щит мани')) {
		return 'mana_shield';
	}
	if (name.includes('некромант') || def.id === 'u009') {
		return 'raise_dead';
	}
	if (name.includes('вурдалак') || name.includes('гуль') || def.id === 'u005') {
		return 'cannibalize';
	}
	if (
		name.includes('капкан') ||
		name.includes('павук') ||
		name.includes('ловець') ||
		name.includes('паук') ||
		name.includes('ловец') ||
		def.id === 'n01O'
	) {
		return 'ensnare';
	}
	if (
		name.includes('чум') ||
		name.includes('отрут') ||
		name.includes('вбивця') ||
		name.includes('яд') ||
		name.includes('убийца') ||
		def.id === 'u007' ||
		def.id === 'n00K'
	) {
		return 'poison';
	}
	if (
		name.includes('паладин') ||
		name.includes('друїд') ||
		name.includes('жрець') ||
		name.includes('чарівник') ||
		name.includes('друид') ||
		name.includes('волшебник') ||
		def.id === 'h03C' ||
		def.id === 'e00J' ||
		def.id === 'h00W'
	) {
		return 'heal';
	}
	if (
		name.includes('магнатор') ||
		name.includes('вандіго') ||
		name.includes('вандиго') ||
		name.includes('вартовий') ||
		name.includes('страж') ||
		name.includes('сокир') ||
		name.includes('топор') ||
		def.id === 'n016' ||
		def.id === 'n013' ||
		def.id === 'n00X'
	) {
		return 'bash';
	}
	if (
		name.includes('кодо') ||
		name.includes('чемпіон') ||
		name.includes('чемпион') ||
		name.includes('майстер-меч') ||
		name.includes('мастер-меч') ||
		def.id === 'o008' ||
		def.id === 'o006' ||
		def.id === 'n00Z'
	) {
		return 'aura_dmg';
	}

	const all = getUnitAbilities(def);
	if (all.length > 0) {
		// Prioritize active castable abilities over passive
		const active = all.find((a) => !a.isPassive);
		return active ? active.type : all[0].type;
	}

	return 'none';
}

/**
 * Checks if a building is a Legendary structure requiring Food Cap.
 * Follows WC3 reference: ufoo > 0, cost >= 450, or legendary apex spawners.
 */
export function isLegendaryBuilding(def?: BuildingDefinition): boolean {
	if (!def) return false;
	if (def.is_legendary) return true;
	if (Number(def.raw_fields?.ufoo) > 0) return true;
	if (def.gold_cost >= 450) return true;
	const name = (def.name || '').toLowerCase();
	return (
		name.includes('давній фонтан') ||
		name.includes('стародавній фонтан') ||
		name.includes('древний фонтан') ||
		name.includes('університет') ||
		name.includes('университет') ||
		name.includes('цитадель некромантії') ||
		name.includes('цитадель некромантии') ||
		name.includes('руйнівник') ||
		name.includes('знищувач') ||
		name.includes('уничтожитель') ||
		name.includes('амазонок') ||
		name.includes('елітних големів') ||
		name.includes('элитных големов') ||
		name.includes('драконячий цвинтар') ||
		name.includes('драконяче кладовище') ||
		name.includes('драконье кладбище') ||
		name.includes('брама демонів') ||
		name.includes('врата демонов')
	);
}

/**
 * Checks if a building is a Special non-unit auxiliary structure.
 */
export function isSpecialBuilding(def?: BuildingDefinition | Building): boolean {
	if (!def) return false;
	if ('is_special' in def && def.is_special) return true;
	if (
		def.specialType === 'special' ||
		def.specialType === 'treasure' ||
		def.specialType === 'repair' ||
		def.specialType === 'recycler' ||
		def.specialType === 'shop' ||
		def.specialType === 'forge'
	) {
		return true;
	}
	return false;
}

/**
 * Checks if a building is a Defensive Guard Tower.
 */
export function isTowerBuilding(def?: BuildingDefinition | Building): boolean {
	if (!def) return false;
	return def.specialType === 'tower';
}

/**
 * Localizes and formats race names into standard Ukrainian canon.
 */
export function formatRaceName(race: string): string {
	if (!race || race.toLowerCase() === 'in_game') return 'Люди';
	const map: Record<string, string> = {
		Север: 'Північ',
		Північ: 'Північ',
		Люди: 'Люди',
		Орки: 'Орки',
		Нежить: 'Нежить',
		Эльфы: 'Ельфи',
		Ельфи: 'Ельфи',
		Хаос: 'Хаос',
		Наги: 'Наги',
		Порча: 'Порча',
		'Ночные эльфы': 'Нічні ельфи',
		'Ночні ельфи': 'Нічні ельфи',
		'Нічні ельфи': 'Нічні ельфи',
		Техники: 'Техніки',
		Техніки: 'Техніки',
		Сборщики: 'Збирачі',
		Складальники: 'Збирачі',
		Збирачі: 'Збирачі'
	};
	return map[race] || race;
}

/**
 * Returns canonical Ukrainian builder unit name for a given race.
 */
export function getBuilderNameForRace(race: string): string {
	const canonical = formatRaceName(race);
	switch (canonical) {
		case 'Північ':
			return 'Північний будівельник';
		case 'Люди':
			return 'Будівельник Людей';
		case 'Орки':
			return 'Будівельник Орків';
		case 'Нежить':
			return 'Будівельник Нежиті';
		case 'Ельфи':
			return 'Будівельник Ельфів';
		case 'Хаос':
			return 'Будівельник Хаосу';
		case 'Наги':
			return 'Будівельник Наг';
		case 'Порча':
			return 'Будівельник Скверни';
		case 'Нічні ельфи':
			return 'Будівельник Нічних Ельфів';
		case 'Техніки':
			return 'Будівельник Техніків';
		case 'Збирачі':
			return 'Будівельник Збирачів';
		default:
			return 'Північний будівельник';
	}
}
