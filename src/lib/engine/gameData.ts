import rawBuildings from '../data/buildings.json';
import rawUnits from '../data/units.json';
import rawRaces from '../data/races.json';
import { RaceRegistry } from './raceRegistry';
export { RaceRegistry };
import type {
	BuildingDefinition,
	UnitDefinition,
	RaceDefinition,
	Building,
	UnitAbilityType,
	UnitAbilityDef,
	PlayerState,
	MatchTeam
} from './types';
import { UNIT_MIN_SPEED, UNIT_MAX_SPEED } from './constants';

export const BUILDINGS_MAP = new Map<string, BuildingDefinition>();
export const UNITS_MAP = new Map<string, UnitDefinition>();
export const RACES_LIST: RaceDefinition[] = rawRaces as RaceDefinition[];

export const PLAYABLE_RACES = [
	'Нежить',
	'Орки',
	'Демони',
	'Техніки',
	'Північ',
	'Ельфи',
	'Небожителі',
	'Тролі',
	'Елементалі',
	'Тварини',
	'Наги',
	'Альянс'
] as const;

export type PlayableRace = (typeof PLAYABLE_RACES)[number];

/** Returns built-in PLAYABLE_RACES plus any custom races registered in RaceRegistry. */
export function getAllPlayableRaces(): string[] {
	const custom = RaceRegistry.getInstance()
		.list()
		.map((r) => r.name)
		.filter((name) => !(PLAYABLE_RACES as readonly string[]).includes(name));
	return [...PLAYABLE_RACES, ...custom];
}

const mkSpecial = (
	id: string,
	name: string,
	hp: number,
	gold_cost: number,
	lumber_cost: number,
	specialType: BuildingDefinition['specialType'],
	aura?: BuildingDefinition['aura']
): BuildingDefinition => ({
	id,
	name,
	hp,
	armor: 5,
	armor_type: 'fort',
	attack_type: 'normal',
	gold_cost,
	lumber_cost,
	unit: '',
	upgrade_from: null,
	upgrade_extra_cost: 0,
	race: null,
	specialType,
	...(aura ? { aura } : {})
});

const mkTower = (
	id: string,
	name: string,
	hp: number,
	armor: number,
	attack_type: string,
	damage_base: number,
	cooldown: number,
	range: number,
	gold_cost: number,
	race: string
): BuildingDefinition => ({
	id,
	name,
	hp,
	armor,
	armor_type: 'fort',
	attack_type,
	damage_base,
	cooldown,
	range,
	gold_cost,
	unit: '',
	upgrade_from: null,
	upgrade_extra_cost: 0,
	race,
	specialType: 'tower'
});

export const SPECIAL_BUILDINGS: BuildingDefinition[] = [
	mkSpecial('cg10_shop', 'Магазин', 850, 50, 50, 'shop'),
	mkSpecial('cg11_forge', 'Кузня', 950, 100, 100, 'forge'),
	mkSpecial('cg12_commander', 'Дім командира', 1000, 250, 250, 'commander'),
	mkSpecial('h008', 'Скриня зі Скарбами', 650, 160, 400, 'treasure'),
	mkSpecial('cg09_repair', 'Ремонтний пункт', 1200, 180, 300, 'repair'),
	mkSpecial('cg07_recycler', 'Утилізатор', 1100, 210, 300, 'recycler'),
	mkSpecial('h045_altar', 'Вівтар Захисту', 1000, 220, 330, 'special', {
		type: 'armor',
		value: 3,
		radius: 600
	}),
	mkSpecial('h046_fountain', 'Джерело Зцілення', 1000, 240, 480, 'special', {
		type: 'heal',
		value: 25,
		radius: 600
	}),
	mkSpecial('h047_obelisk', 'Обеліск Мани', 900, 200, 350, 'special', {
		type: 'mana',
		value: 10,
		radius: 600
	})
];

export const GUARD_TOWERS: BuildingDefinition[] = [
	mkTower('h006', 'Вартова вежа', 1200, 5, 'pierce', 45, 1.0, 500, 150, 'Люди'),
	mkTower('h00G', 'Приливний захисник', 1300, 5, 'pierce', 52, 1.0, 500, 200, 'Наги'),
	mkTower('h01F', 'Око Безодні', 1350, 5, 'chaos', 62, 1.1, 480, 220, 'Хаос'),
	mkTower('h014', 'Ельфійська лучна вежа', 1100, 4, 'pierce', 65, 0.85, 550, 250, 'Ельфи'),
	mkTower('h01O', 'Некротичний зикурат', 1300, 5, 'magic', 50, 0.9, 520, 200, 'Нежить'),
	mkTower('o000', 'Сторожова вежа орків', 1350, 5, 'pierce', 55, 1.1, 500, 175, 'Орки'),
	mkTower('h03Q', 'Крижана шпиляста вежа', 1400, 5, 'magic', 50, 1.0, 480, 230, 'Північ'),
	mkTower('n01J', 'Грозовий Захисник', 1250, 5, 'chaos', 48, 1.0, 480, 200, 'Порча'),
	mkTower('h073', 'Древо-захисник', 1500, 6, 'siege', 70, 1.4, 520, 210, 'Нічні ельфи'),
	mkTower('h05L', 'Тесла-вежа', 1400, 5, 'magic', 60, 0.95, 460, 240, 'Техніки'),
	mkTower('cg0a', 'Сміттєва баліста', 1200, 5, 'siege', 58, 1.3, 520, 150, 'Збирачі')
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

const ARTILLERY_SPEED_IDS = new Set(['cg1a', 'hmtm', 'e002', 'cg18', 'n01E', 'n01F']);
const SIEGE_SPEED_RE =
	/танк|мортира|катапульт|баліст|гармат|машина|каменекидач|зорекидач|облог|руйнівник|подрібнювач/i;
const HEAVY_SPEED_RE =
	/голем|гігант|колос|титан|мамонт|черепах|ведмід|вандіго|демон безодні|охорон|абомін|мерзот|лорд|велет|енто|древ/i;
const BEAST_SPEED_RE =
	/вовк|пантер|тигр|леопард|павук|змій|змія|собака|гончак|пес|гієн|кабан|вепр|гриф|віверн|дракон|сова|орел|кажан|гарпі|вершник|наїзник|кінь|раптор|скат|краб|омар|лобстер|кентавр|сатир|фенікс|муталіск|яструб|ящір|скорпіон|химер/i;

/**
 * Resolves intentional archetype-based movement speed in [120, 170] px/s:
 * - Siege & artillery (120..132): slowest frontline units
 * - Heavy / large armored units (128..142): moderately slow tanks
 * - Standard infantry, ranged & casters (142..152): baseline pace
 * - Beasts / animals / fast flyers & riders (158..170): fastest skirmishers
 */
export function resolveUnitMoveSpeed(unitDef: UnitDefinition, ownerRace?: string): number {
	const name = unitDef.name || '';
	const armor = (unitDef.armor_type || 'medium').toLowerCase();
	const attack = (unitDef.attack_type || 'normal').toLowerCase();
	const hp = unitDef.hp ?? 300;
	const range = unitDef.range ?? 100;
	const isFlying = Boolean(unitDef.flying);
	const rawUmvs = Number(unitDef.raw_fields?.umvs) || 0;

	const isSiege =
		Boolean(unitDef.isArtillery) ||
		attack === 'siege' ||
		ARTILLERY_SPEED_IDS.has(unitDef.id) ||
		SIEGE_SPEED_RE.test(name);

	const isBeastOrAnimal =
		(ownerRace ? toPlayableRace(ownerRace) === 'Тварини' : false) ||
		BEAST_SPEED_RE.test(name) ||
		(isFlying && armor !== 'large' && hp <= 520);

	const isHeavy =
		armor === 'large' ||
		armor === 'divine' ||
		armor === 'heavy' ||
		hp >= 750 ||
		HEAVY_SPEED_RE.test(name);

	let speed: number;

	if (isSiege) {
		if (isFlying) {
			speed = 132;
		} else {
			speed = hp >= 800 || /танк|мортира/i.test(name) ? 120 : 126;
		}
	} else if (isHeavy) {
		if (isBeastOrAnimal) {
			speed = hp >= 1000 ? 136 : 142;
		} else {
			speed = hp >= 1000 ? 128 : hp >= 750 ? 132 : 136;
		}
	} else if (isBeastOrAnimal) {
		if (isFlying) {
			speed = hp <= 380 ? 170 : 164;
		} else {
			speed = hp <= 380 || armor === 'none' || armor === 'small' ? 166 : 158;
		}
	} else {
		if (range > 180) {
			speed = attack === 'magic' ? 142 : 144;
		} else if (armor === 'none' || armor === 'small' || rawUmvs >= 320) {
			speed = 152;
		} else {
			speed = 146;
		}
	}

	return Math.max(UNIT_MIN_SPEED, Math.min(UNIT_MAX_SPEED, speed));
}

export function getUnit(id: string): UnitDefinition | undefined {
	return UNITS_MAP.get(id);
}

/**
 * Resolves the authentic WC3 gold bounty awarded when an enemy unit is killed.
 * Uses `raw_fields.ubba` when present (100/109 units), or scales consistently
 * from building gold cost / unit maxHp for base units missing `ubba`.
 */
export function resolveUnitKillBounty(
	unitDef?: UnitDefinition,
	buildingGoldCost = 0,
	fallbackMaxHp = 400
): number {
	const rawUbba = Number(unitDef?.bounty ?? unitDef?.raw_fields?.ubba);
	if (Number.isFinite(rawUbba) && rawUbba > 0) {
		return Math.round(rawUbba);
	}
	if (buildingGoldCost > 0) {
		return Math.max(3, Math.round(buildingGoldCost / 30));
	}
	return Math.max(3, Math.min(25, Math.round(fallbackMaxHp / 80)));
}

export function getBuildingsForRace(raceName: string): BuildingDefinition[] {
	const canonical = formatRaceName(raceName);
	const seen = new Set<string>();
	const buildings: BuildingDefinition[] = [];
	const pushUnique = (b: BuildingDefinition) => {
		if (!seen.has(b.id)) {
			seen.add(b.id);
			buildings.push(b);
		}
	};

	const raceEntry =
		RACES_LIST.find((r) => r.race === raceName) ||
		RACES_LIST.find((r) => formatRaceName(r.race) === canonical);
	if (raceEntry?.buildings) {
		const queue = [...raceEntry.buildings];
		while (queue.length > 0) {
			const id = queue.shift()!;
			if (seen.has(id)) continue;
			const def = BUILDINGS_MAP.get(id);
			if (!def) continue;
			pushUnique(def);
			for (const up of getUpgradesForBuilding(id)) {
				if (!seen.has(up.id)) queue.push(up.id);
			}
		}
	}

	for (const b of BUILDINGS_MAP.values()) {
		if (b.race === raceName || (b.race && formatRaceName(b.race) === canonical)) {
			pushUnique(b);
		}
	}
	return buildings;
}

function customUnitToBuilding(
	unit: {
		id: string;
		name: string;
		hp: number;
		cost: number;
		lumberCost?: number;
		armorType: string;
		attackType: string;
	},
	raceName: string,
	extra?: { is_special?: boolean; is_legendary?: boolean }
): BuildingDefinition {
	return {
		id: unit.id,
		name: unit.name,
		hp: unit.hp,
		armor: 0,
		armor_type: unit.armorType,
		attack_type: unit.attackType,
		gold_cost: unit.cost,
		lumber_cost: unit.lumberCost,
		unit: unit.id,
		upgrade_from: null,
		upgrade_extra_cost: 0,
		race: raceName,
		...extra
	};
}

export function getBaseBuildingsForRace(raceName: string): BuildingDefinition[] {
	const registry = RaceRegistry.getInstance();
	const canonical = formatRaceName(raceName);
	const customRace =
		registry.get(raceName) ??
		registry.get(canonical) ??
		registry.list().find((r) => r.name === raceName || r.name === canonical);
	if (customRace) {
		const out = [
			...customRace.buildings.tier1.map((u) => customUnitToBuilding(u, customRace.name)),
			...(customRace.buildings.tier2 ?? []).map((u) => customUnitToBuilding(u, customRace.name))
		];
		if (customRace.buildings.special) {
			out.push(
				customUnitToBuilding(customRace.buildings.special, customRace.name, { is_special: true })
			);
		}
		if (customRace.buildings.legendary) {
			out.push(
				customUnitToBuilding(customRace.buildings.legendary, customRace.name, {
					is_legendary: true
				})
			);
		}
		return out;
	}

	const validRace = raceName === 'in_game' || !raceName ? 'Альянс' : raceName;
	const raceEntry =
		RACES_LIST.find((r) => r.race === validRace) ||
		RACES_LIST.find((r) => r.race === canonical) ||
		RACES_LIST.find((r) => r.race === 'Альянс') ||
		RACES_LIST[0];

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
				sb.id !== 'cg12_commander' &&
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

	// 2. Aux buildings: shop (cg10_shop, 50g/50w), forge (cg11_forge, 100g/100w), and commander hall (cg12_commander, 250g/250w)
	const shop = BUILDINGS_MAP.get('cg10_shop');
	const forge = BUILDINGS_MAP.get('cg11_forge');
	const commanderHall = BUILDINGS_MAP.get('cg12_commander');
	const aux: BuildingDefinition[] = [];
	if (shop && !refSpecials.some((x) => x.id === shop.id)) aux.push(shop);
	if (forge && !refSpecials.some((x) => x.id === forge.id)) aux.push(forge);
	if (commanderHall && !refSpecials.some((x) => x.id === commanderHall.id)) aux.push(commanderHall);

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
	specialType?:
		'tower' | 'treasure' | 'repair' | 'recycler' | 'special' | 'shop' | 'forge' | 'commander';
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

	const candidateRaces = [race, bDef.race].filter((r): r is string => Boolean(r));
	for (const buildingRace of candidateRaces) {
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

const mkAbil = (
	type: UnitAbilityType,
	nameUk: string,
	nameEn: string,
	descriptionUk: string,
	descriptionEn: string,
	icon?: string,
	cooldown?: number,
	manaCost?: number
): Omit<UnitAbilityDef, 'id'> => ({
	nameUk,
	nameEn,
	type,
	isPassive: cooldown === undefined,
	...(cooldown !== undefined ? { cooldown } : {}),
	...(manaCost !== undefined ? { manaCost } : {}),
	descriptionUk,
	descriptionEn,
	...(icon ? { icon } : {})
});

export const UNIT_ABILITY_CATALOG: Record<UnitAbilityType, Omit<UnitAbilityDef, 'id'>> = {
	none: mkAbil(
		'none',
		'Без здібності',
		'None',
		'Звичайний боєць без спеціальних навичок.',
		'Standard unit without special abilities.'
	),
	ensnare: mkAbil(
		'ensnare',
		'Сітка',
		'Ensnare',
		'Приземляє та знерухомлює літаючого або наземного ворога на 6 с.',
		'Brings flying enemies to ground and roots them for 6s.',
		'Net',
		12.0
	),
	poison: mkAbil(
		'poison',
		'Отрута',
		'Poison',
		'Атаки отруюють ворога: 15 шкоди/с та -30% швидкості бігу на 5 с.',
		'Attacks poison enemy: 15 dps and -30% move speed for 5s.',
		'Droplet'
	),
	heal: mkAbil(
		'heal',
		'Лікування',
		'Heal',
		'Відновлює 75 HP найближчому пораненому союзнику.',
		'Restores 75 HP to closest wounded ally.',
		'Heart',
		3.5
	),
	bash: mkAbil(
		'bash',
		'Оглушення',
		'Bash',
		'20% шанс приголомшити ворога на 1.2 с та завдати +25 шкоди.',
		'20% chance to stun enemy for 1.2s and deal +25 bonus damage.',
		'Hammer'
	),
	aura_dmg: mkAbil(
		'aura_dmg',
		'Аура Командира',
		'Command Aura',
		'+15% до атаки всім дружнім бійцям у радіусі 300.',
		'+15% attack damage to nearby allies in 300 radius.',
		'Shield'
	),
	aura_armor: mkAbil(
		'aura_armor',
		'Аура Вірності',
		'Devotion Aura',
		'+3 до броні всім дружнім бійцям у радіусі 300.',
		'+3 armor bonus to nearby allies in 300 radius.',
		'Shield'
	),
	aura_speed: mkAbil(
		'aura_speed',
		'Аура Витривалості',
		'Endurance Aura',
		'+20% до швидкості атаки та бігу всім союзникам у радіусі 300.',
		'+20% attack & move speed to nearby allies in 300 radius.',
		'Zap'
	),
	bloodlust: mkAbil(
		'bloodlust',
		'Кровожерливість',
		'Bloodlust',
		'Дарує союзнику лють: +40% швидкості атаки та +25% швидкості бігу на 10 с.',
		'Grants an ally +40% attack speed and +25% move speed for 10s.',
		'Flame',
		10.0
	),
	slow: mkAbil(
		'slow',
		'Уповільнення',
		'Slow',
		'Знижує швидкість бігу ворога на 40% та атаки на 30% на 6 с.',
		'Reduces enemy move speed by 40% and attack speed by 30% for 6s.',
		'Clock',
		8.0
	),
	crit: mkAbil(
		'crit',
		'Смертельний удар',
		'Critical Strike',
		'22% шанс завдати подвійної (2x) шкоди при кожній атаці.',
		'22% chance to deal double (2x) damage on each attack.',
		'Sword'
	),
	evasion: mkAbil(
		'evasion',
		'Ухилення',
		'Evasion',
		'20% шанс повністю ухилитися від ворожої атаки.',
		'20% chance to completely dodge enemy attacks.',
		'Wind'
	),
	cleave: mkAbil(
		'cleave',
		'Розсікаючий удар',
		'Cleave',
		'40% завданої шкоди ближнього бою передається ворогам поблизу цілі.',
		'40% of melee damage splashes to surrounding enemy units.',
		'Axe'
	),
	frost: mkAbil(
		'frost',
		'Крижана атака',
		'Frost Attack',
		'Удари сковують ворога холодом: -35% швидкості бігу та атаки на 3.5 с.',
		'Chills targets on hit: -35% move and attack speed for 3.5s.',
		'Snowflake'
	),
	thorns: mkAbil(
		'thorns',
		'Панцир із шипами',
		'Thorns Aura',
		'Повертає 25% фізичної шкоди ближнього бою назад нападнику.',
		'Returns 25% of melee attack damage back to the attacker.',
		'ShieldAlert'
	),
	reincarnation: mkAbil(
		'reincarnation',
		'Переродження',
		'Reincarnation',
		'Після смерті миттєво воскресає з повним здоров’ям один раз за раунд.',
		'Upon fatal damage, revives once with 100% HP.',
		'RefreshCw'
	),
	pulverize: mkAbil(
		'pulverize',
		'Розтрощення',
		'Pulverize',
		'20% шанс завдати 50 сплеш-шкоди всім ворогам поряд.',
		'20% chance on hit to deal 50 AoE damage to nearby foes.',
		'Zap'
	),
	immolation: mkAbil(
		'immolation',
		'Полум’яний жар',
		'Immolation',
		'Постійно обпікає ворогів у радіусі 200, завдаючи 18 шкоди щосекунди.',
		'Burns nearby enemies in 200 radius for 18 damage every second.',
		'Flame'
	),
	curse: mkAbil(
		'curse',
		'Прокляття',
		'Curse',
		'Накладає прокляття на 8 с: ціль схибить у 33% своїх атак.',
		'Curses enemy for 8s: target misses 33% of its attacks.',
		'EyeOff',
		9.0
	),
	inner_fire: mkAbil(
		'inner_fire',
		'Вогонь віри',
		'Inner Fire',
		'Підвищує шкоду союзника на 25% та броню на +5 на 12 с.',
		'Grants an ally +25% damage and +5 armor for 12s.',
		'Sparkles',
		12.0
	),
	thunderbolt: mkAbil(
		'thunderbolt',
		'Громовий удар',
		'Storm Bolt',
		'Кидає магічний молот: 100 магічної шкоди та оглушення на 2 с.',
		'Hurls a magic hammer: 100 damage and 2s stun.',
		'Zap',
		12.0
	),
	chain_lightning: mkAbil(
		'chain_lightning',
		'Ланцюгова блискавка',
		'Chain Lightning',
		'Вражає до 4 ворогів магічною блискавкою (120/90/65/45 шкоди).',
		'Strikes up to 4 enemies with chain lightning (120/90/65/45 dmg).',
		'Zap',
		12.0
	),
	stomp: mkAbil(
		'stomp',
		'Громовий тупіт',
		'War Stomp',
		'Струшує землю: 75 шкоди та 1.5 с оглушення ворогам навколо.',
		'Slams ground: 75 damage and 1.5s stun to nearby foes.',
		'Activity',
		10.0
	),
	mana_burn: mkAbil(
		'mana_burn',
		'Спалення мани',
		'Mana Burn',
		'Спалює до 50 мани у ворожого кастера і завдає еквівалентної магічної шкоди.',
		'Burns up to 50 mana from an enemy caster and deals equivalent magic damage.',
		'Flame',
		10.0,
		35
	),
	raise_dead: mkAbil(
		'raise_dead',
		'Підняття мерців',
		'Raise Dead',
		'Піднімає полеглого воїна у вигляді Скелета-воїна (240 HP) на 25 с.',
		'Raises a fallen corpse as a Skeleton Warrior (240 HP) for 25s.',
		'Skull',
		8.0,
		45
	),
	corpse_explosion: mkAbil(
		'corpse_explosion',
		'Вибух трупа',
		'Corpse Explosion',
		'Підриває труп ворога або союзника, завдаючи 100 шкоди всім ворогам навколо.',
		'Detonates a nearby corpse dealing 100 AoE damage to nearby foes.',
		'Bomb',
		9.0,
		35
	),
	cannibalize: mkAbil(
		'cannibalize',
		'Канібалізм',
		'Cannibalize',
		'Пожирає сусідній труп, відновлюючи 35% від максимального здоров’я.',
		'Consumes a nearby corpse to restore 35% of max HP.',
		'Utensils',
		8.0
	),
	polymorph: mkAbil(
		'polymorph',
		'Перетворення',
		'Polymorph',
		'Перетворює ворожого бійця на беззахисну вівцю на 5.5 с (не може битися чи чаклувати).',
		'Transforms target enemy into a harmless sheep for 5.5s (cannot attack or cast).',
		'Sparkles',
		12.0,
		60
	),
	cyclone: mkAbil(
		'cyclone',
		'Смерч',
		'Cyclone',
		'Підкидає ворога у повітря вихором на 4.5 с, повністю виводячи його з бою.',
		'Tosses an enemy into the air for 4.5s, completely incapacitating them.',
		'Wind',
		14.0,
		50
	),
	banish: mkAbil(
		'banish',
		'Вигнання в астрал',
		'Banish',
		'Переносить ворога в астральний вимір на 6 с: імунітет до фізичної шкоди, але +66% шкоди від магії.',
		'Banishes unit to ethereal form for 6s: immune to physical attacks, but +66% magic damage taken.',
		'Ghost',
		11.0,
		40
	),
	mana_shield: mkAbil(
		'mana_shield',
		'Щит мани',
		'Mana Shield',
		'Використовує ману кастера для поглинання 50% отриманої шкоди (1 шкода = 0.5 мани).',
		'Absorbs 50% of incoming damage using caster mana pool (1 dmg = 0.5 mana).',
		'ShieldCheck'
	),
	dispel: mkAbil(
		'dispel',
		'Розвіювання магії',
		'Dispel Magic',
		'Знімає негативні ефекти з союзників або позитивні баффи з ворогів. Завдає 150 магічної шкоди закликаним істотам.',
		'Dispels negative debuffs from allies or positive buffs from enemies. Deals 150 magic damage to summoned units.',
		'Sparkles',
		8.0,
		45
	)
};

const UNIT_ABILITY_RULES: ReadonlyArray<
	readonly [UnitAbilityType, readonly string[], readonly string[], readonly string[]]
> = [
	['reincarnation', ['AOre'], ['таурен', 'фенікс', 'феникс'], ['o009', 'h00D']],
	[
		'crit',
		['AOcr', 'ACct', 'A03P', 'A00U', 'A07M', 'Ocr1'],
		['майстер-меч', 'мастер клинка', 'убивця', 'убийца', 'мортир', 'рейнджер'],
		[]
	],
	[
		'evasion',
		['ACes', 'ACev', 'A03U', 'Eev1'],
		['мисливець', 'мисливиця', 'охотник', 'штурмовик', 'тіней'],
		[]
	],
	['cleave', ['ACce', 'A00D'], ['чемпіон', 'чемпион', 'м’ясник', 'вартовий'], []],
	[
		'bash',
		['ACbh', 'A026', 'A02X', 'A03S'],
		['магнатор', 'вандіго', 'вандиго', 'сокир'],
		['n016', 'n013', 'n00X']
	],
	['poison', ['Aspo', 'ACvs', 'A07J', 'A05T'], ['отрут', 'яд', 'чум'], ['u007', 'n00K']],
	['frost', ['Afra', 'A070', 'A043'], ['крижа', 'ледян', 'мороз', 'лич'], ['u00D']],
	['thorns', ['ANth', 'AEah', 'A00C'], ['черепах', 'панцир', 'шип'], ['n007']],
	['pulverize', ['ACpv', 'A031'], ['голем', 'велетень'], []],
	['immolation', ['ANpi', 'Apxf'], ['інфернал', 'вогнян', 'пламен'], ['n01E', 'n01F']],
	['bloodlust', ['Ablo', 'A08W', 'A016'], ['шаман', 'огр-маг', 'лють'], ['o006']],
	['slow', ['Aslo', 'A06V'], ['чарівниця', 'сповільн'], []],
	['curse', ['Acrs', 'A05O'], ['банші', 'некромант', 'проклят'], ['u009']],
	['heal', ['Ahea', 'A0A8', 'A00Y'], ['паладин', 'жрець', 'друїд'], ['h03C', 'e00J', 'h00W']],
	['inner_fire', ['Ainf', 'A01A'], ['лицар світла', 'священник'], []],
	['ensnare', ['A06H', 'A07A', 'A02I'], ['капкан', 'павук', 'ловець'], ['n01O']],
	['chain_lightning', ['A09T', 'A0AH'], ['блискав', 'громов'], []],
	['thunderbolt', ['A08U', 'A01X', 'A06S', 'A0AK', 'A082', 'A083'], ['молот', 'буревісник'], []],
	['stomp', ['A05D', 'A09E', 'A00B', 'A031'], ['тупіт', 'громовий'], []],
	['aura_dmg', ['ACac', 'A00T'], ['кодо'], ['o008']],
	['aura_armor', ['AHad', 'A01F'], ['обладунок віри'], []],
	['aura_speed', ['A07H'], [], []],
	['raise_dead', ['A05O', 'Acrs', 'A09Y', 'A02N', 'A05R'], ['некромант'], ['u009']],
	['corpse_explosion', ['A00L', 'A073', 'A034'], ['чумна мортира', 'підривник'], []],
	['cannibalize', ['Acan', 'A00K'], ['вурдалак', 'гуль'], ['u005']],
	['polymorph', ['Aply', 'A06V', 'A08L'], ['чарівниця', 'волшебница', 'чародійка'], []],
	['cyclone', ['Acyc', 'A07A', 'A01G'], ['смерч', 'друїд когтя', 'прикликач вітру'], []],
	['banish', ['Aban', 'A016', 'A05J'], ['астрал', 'маг крові', 'вигнан'], []],
	['mana_shield', ['Amsh', 'A03H', 'A09P'], ['щит мани', 'морська відьма', 'архімаг'], []],
	[
		'dispel',
		['Adid', 'Adis', 'Acmg', 'A0A9', 'A07R', 'A049'],
		['диспел', 'розвіюван', 'очищен', 'заклинателька', 'троль-чаклун', 'чарівний дракончик'],
		['h07B', 'n015', 'e000']
	]
];

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

	for (const [type, ruleCodes, nameKeys, ids] of UNIT_ABILITY_RULES) {
		if (
			ruleCodes.some((c) => codes.includes(c)) ||
			nameKeys.some((k) => name.includes(k)) ||
			ids.includes(id)
		) {
			matchedTypes.add(type);
		}
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

const PRIMARY_ABILITY_RULES: ReadonlyArray<
	readonly [UnitAbilityType, readonly string[], readonly string[]]
> = [
	['polymorph', ['чарівниця', 'волшебница', 'чародійка'], []],
	['dispel', ['заклинателька', 'троль-чаклун'], ['h07B', 'n015']],
	['cyclone', ['прикликач вітру', 'смерч'], []],
	['banish', ['маг крові', 'астрал'], []],
	['mana_shield', ['морська відьма', 'щит мани'], []],
	['raise_dead', ['некромант'], ['u009']],
	['cannibalize', ['вурдалак', 'гуль'], ['u005']],
	['ensnare', ['капкан', 'павук', 'ловець', 'паук', 'ловец'], ['n01O']],
	['poison', ['чум', 'отрут', 'вбивця', 'яд', 'убийца'], ['u007', 'n00K']],
	[
		'heal',
		['паладин', 'друїд', 'жрець', 'чарівник', 'друид', 'волшебник'],
		['h03C', 'e00J', 'h00W']
	],
	[
		'bash',
		['магнатор', 'вандіго', 'вандиго', 'вартовий', 'страж', 'сокир', 'топор'],
		['n016', 'n013', 'n00X']
	],
	[
		'aura_dmg',
		['кодо', 'чемпіон', 'чемпион', 'майстер-меч', 'мастер-меч'],
		['o008', 'o006', 'n00Z']
	]
];

/**
 * Resolves the primary tactical WC3 unit ability archetype for a given unit.
 * Retains strict backward compatibility for single-archetype selectors (Ensnare, Poison, Heal, Bash, Aura).
 */
export function resolveUnitAbility(def?: UnitDefinition): UnitAbilityType {
	if (!def) return 'none';
	const name = (def.name || '').toLowerCase();

	for (const [type, nameKeys, ids] of PRIMARY_ABILITY_RULES) {
		if (nameKeys.some((k) => name.includes(k)) || ids.includes(def.id)) {
			return type;
		}
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
const LEGENDARY_NAME_KEYS = [
	'давній фонтан',
	'стародавній фонтан',
	'древний фонтан',
	'університет',
	'университет',
	'цитадель некромантії',
	'цитадель некромантии',
	'руйнівник',
	'знищувач',
	'уничтожитель',
	'амазонок',
	'елітних големів',
	'элитных големов',
	'драконячий цвинтар',
	'драконяче кладовище',
	'драконье кладбище',
	'брама демонів',
	'врата демонов'
];

export function isLegendaryBuilding(def?: BuildingDefinition): boolean {
	if (!def) return false;
	if (def.is_legendary) return true;
	if (Number(def.raw_fields?.ufoo) > 0) return true;
	if (def.gold_cost >= 450) return true;
	const name = (def.name || '').toLowerCase();
	return LEGENDARY_NAME_KEYS.some((k) => name.includes(k));
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
 * Returns the canonical Defensive Guard Tower for a playable race (or legacy alias),
 * preferring the race's own roster in races.json before falling back to GUARD_TOWERS.
 */
export function getGuardTowerForRace(raceName: string): BuildingDefinition | undefined {
	const fromRoster = getBaseBuildingsForRace(raceName).find((b) => b.specialType === 'tower');
	if (fromRoster) return fromRoster;

	const canonical = toPlayableRace(raceName);
	return (
		GUARD_TOWERS.find(
			(t) => t.race === raceName || (t.race !== null && toPlayableRace(t.race) === canonical)
		) || GUARD_TOWERS.find((t) => t.id === 'h006')
	);
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
	if (!race || race.toLowerCase() === 'in_game') return 'Альянс';
	const map: Record<string, string> = {
		Север: 'Північ',
		Північ: 'Північ',
		Люди: 'Альянс',
		Альянс: 'Альянс',
		Окри: 'Орки',
		Орки: 'Орки',
		Нежить: 'Нежить',
		Эльфы: 'Ельфи',
		Ельфи: 'Ельфи',
		Хаос: 'Демони',
		Демони: 'Демони',
		Наги: 'Наги',
		Тролі: 'Тролі',
		Тварини: 'Тварини',
		Елементалі: 'Елементалі',
		Небожителі: 'Небожителі',
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

const LEGACY_TO_PLAYABLE_RACE: Record<string, PlayableRace> = {
	Люди: 'Альянс',
	Хаос: 'Демони',
	Порча: 'Елементалі',
	'Нічні ельфи': 'Ельфи',
	Збирачі: 'Техніки'
};

/**
 * Converts any race string (including legacy WC3 reference tags like "Нічні ельфи",
 * "Порча", "Люди", "Хаос", "Збирачі") into one of the 12 canonical PLAYABLE_RACES.
 */
export function toPlayableRace(race?: string | null): PlayableRace {
	const formatted = formatRaceName(race || '');
	if ((PLAYABLE_RACES as readonly string[]).includes(formatted)) {
		return formatted as PlayableRace;
	}
	return LEGACY_TO_PLAYABLE_RACE[formatted] ?? 'Альянс';
}

/**
 * Resolves the true canonical race of a placed building in a match by preferring its owning
 * player's canonical race (since races.json composes new races from shared legacy building defs),
 * falling back to mapping legacy building.race into PLAYABLE_RACES.
 */
export function resolveBuildingDisplayRace(
	building: Pick<Building, 'race' | 'playerId' | 'playerSlot' | 'team'>,
	allPlayers?: readonly PlayerState[],
	fallbackPlayers?: Partial<Record<MatchTeam, PlayerState>>
): PlayableRace {
	const owner =
		(building.playerId && allPlayers?.find((p) => p.id === building.playerId)) ||
		(building.playerSlot != null && allPlayers?.find((p) => p.slot === building.playerSlot)) ||
		fallbackPlayers?.[building.team];
	if (owner?.race) {
		return toPlayableRace(owner.race);
	}
	return toPlayableRace(building.race);
}

const BUILDER_NAME_MAP: Record<string, string> = {
	Альянс: 'Будівельник Альянсу',
	Люди: 'Будівельник Людей',
	Північ: 'Північний будівельник',
	Орки: 'Будівельник Орків',
	Нежить: 'Будівельник Нежиті',
	Ельфи: 'Будівельник Ельфів',
	Демони: 'Будівельник Демонів',
	Хаос: 'Будівельник Демонів',
	Наги: 'Будівельник Наг',
	Тролі: 'Будівельник Тролів',
	Тварини: 'Будівельник Тварин',
	Елементалі: 'Будівельник Елементалів',
	Небожителі: 'Будівельник Небожителів',
	Порча: 'Будівельник Скверни',
	'Нічні ельфи': 'Будівельник Нічних Ельфів',
	Техніки: 'Будівельник Техніків',
	Збирачі: 'Будівельник Збирачів'
};

/**
 * Formats faction name into canonical Ukrainian display (e.g., Люди -> Альянс, Орки -> Орда).
 */
export function formatFactionName(race: string): string {
	const canonical = formatRaceName(race);
	return canonical === 'Орки' ? 'Орда' : canonical;
}

/**
 * Returns canonical Ukrainian builder unit name for a given race.
 */
export function getBuilderNameForRace(race: string): string {
	if (race === 'Люди') return BUILDER_NAME_MAP.Люди;
	const canonical = formatRaceName(race);
	return BUILDER_NAME_MAP[canonical] ?? `Будівельник (${canonical})`;
}
