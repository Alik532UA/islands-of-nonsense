export type ArmorType =
	'none' | 'small' | 'medium' | 'large' | 'fort' | 'divine' | 'normal' | 'hero';
export type AttackType = 'normal' | 'pierce' | 'siege' | 'magic' | 'chaos' | 'hero';

export type MatchTeam = 'west' | 'east';
export type Team = MatchTeam | 'neutral';
export type Lane = 'top' | 'mid' | 'bottom';
export type UnitState = 'WALKING' | 'ATTACKING' | 'DYING' | 'DEAD';

export interface PlayerColorDef {
	id: number;
	nameUk: string;
	nameEn: string;
	hex: string;
	num: number;
	darkHex: string;
	lightHex: string;
}

export const WC3_PLAYER_COLORS: PlayerColorDef[] = [
	{
		id: 1,
		nameUk: 'Червоний',
		nameEn: 'Red',
		hex: '#ff0303',
		num: 0xff0303,
		darkHex: '#7f1d1d',
		lightHex: '#fca5a5'
	},
	{
		id: 2,
		nameUk: 'Синій',
		nameEn: 'Blue',
		hex: '#0042ff',
		num: 0x0042ff,
		darkHex: '#1e3a8a',
		lightHex: '#93c5fd'
	},
	{
		id: 3,
		nameUk: 'Бірюзовий',
		nameEn: 'Teal',
		hex: '#1ce6b9',
		num: 0x1ce6b9,
		darkHex: '#115e59',
		lightHex: '#5eead4'
	},
	{
		id: 4,
		nameUk: 'Фіолетовий',
		nameEn: 'Purple',
		hex: '#540081',
		num: 0x540081,
		darkHex: '#3b0764',
		lightHex: '#d8b4fe'
	},
	{
		id: 5,
		nameUk: 'Жовтий',
		nameEn: 'Yellow',
		hex: '#fffc01',
		num: 0xfffc01,
		darkHex: '#713f12',
		lightHex: '#fef08a'
	},
	{
		id: 6,
		nameUk: 'Помаранчевий',
		nameEn: 'Orange',
		hex: '#fe8a0e',
		num: 0xfe8a0e,
		darkHex: '#7c2d12',
		lightHex: '#fdba74'
	},
	{
		id: 7,
		nameUk: 'Зелений',
		nameEn: 'Green',
		hex: '#20c000',
		num: 0x20c000,
		darkHex: '#14532d',
		lightHex: '#86efac'
	},
	{
		id: 8,
		nameUk: 'Рожевий',
		nameEn: 'Pink',
		hex: '#e55bb0',
		num: 0xe55bb0,
		darkHex: '#831843',
		lightHex: '#f472b6'
	},
	{
		id: 9,
		nameUk: 'Сірий',
		nameEn: 'Gray',
		hex: '#959697',
		num: 0x959697,
		darkHex: '#334155',
		lightHex: '#cbd5e1'
	},
	{
		id: 10,
		nameUk: 'Світло-синій',
		nameEn: 'Light Blue',
		hex: '#7ebff1',
		num: 0x7ebff1,
		darkHex: '#0369a1',
		lightHex: '#bae6fd'
	},
	{
		id: 11,
		nameUk: 'Темно-зелений',
		nameEn: 'Dark Green',
		hex: '#106246',
		num: 0x106246,
		darkHex: '#064e3b',
		lightHex: '#6ee7b7'
	},
	{
		id: 12,
		nameUk: 'Коричневий',
		nameEn: 'Brown',
		hex: '#4e2a04',
		num: 0x4e2a04,
		darkHex: '#382006',
		lightHex: '#d97706'
	}
];

export interface Vector2D {
	x: number;
	y: number;
}

export interface UnitDefinition {
	id: string;
	name: string;
	hp: number;
	armor: number;
	armor_type: ArmorType | string;
	attack_type: AttackType | string;
	damage_base: number | null;
	damage_dice: number | null;
	damage_sides: number | null;
	cooldown: number | null;
	range: number | null;
	move_type: string | null;
	flying: boolean;
	canHitAir?: boolean;
	ubld?: number;
	mana?: number;
	maxMana?: number;
	manaRegen?: number;
	gold_cost: number;
	raw_fields?: Record<string, unknown>;
	splashRadius?: number;
	reflectDamagePct?: number;
	isScavenger?: boolean;
	isArtillery?: boolean;
	abilities?: UnitAbilityDef[];
}

export interface BuildingAuraDef {
	type: 'armor' | 'heal' | 'mana' | 'speed';
	value: number;
	radius: number;
}

export interface BuildingDefinition {
	id: string;
	name: string;
	hp: number;
	armor: number;
	armor_type: ArmorType | string;
	attack_type: AttackType | string;
	gold_cost: number;
	lumber_cost?: number;
	unit: string;
	upgrade_from: string | null;
	upgrade_extra_cost: number;
	race?: string | null;
	specialType?: 'treasure' | 'repair' | 'recycler' | 'tower' | 'special';
	aura?: BuildingAuraDef;
	initialSpawnDelay?: number;
	isArtillery?: boolean;
	cooldown?: number | null;
	range?: number | null;
	damage_base?: number | null;
	raw_fields?: Record<string, unknown>;
	abilities?: UnitAbilityDef[];
}

export interface Corpse {
	id: string;
	x: number;
	y: number;
	lane: Lane;
	team: MatchTeam;
	decayTimer: number; // in seconds, default 20.0
	unitDefId: string;
	name: string;
	isFlyer: boolean;
}

export type UnitAbilityType =
	| 'none'
	| 'ensnare'
	| 'poison'
	| 'heal'
	| 'bash'
	| 'aura_dmg'
	| 'aura_armor'
	| 'aura_speed'
	| 'bloodlust'
	| 'slow'
	| 'crit'
	| 'evasion'
	| 'cleave'
	| 'frost'
	| 'thorns'
	| 'reincarnation'
	| 'pulverize'
	| 'immolation'
	| 'curse'
	| 'inner_fire'
	| 'thunderbolt'
	| 'chain_lightning'
	| 'stomp'
	| 'mana_burn'
	| 'raise_dead'
	| 'corpse_explosion'
	| 'cannibalize'
	| 'polymorph'
	| 'cyclone'
	| 'banish'
	| 'mana_shield'
	| 'dispel';

export interface UnitAbilityDef {
	id: string;
	nameUk: string;
	nameEn: string;
	type: UnitAbilityType;
	isPassive: boolean;
	cooldown?: number;
	manaCost?: number;
	descriptionUk: string;
	descriptionEn: string;
	icon?: string;
}

export interface RaceDefinition {
	race: string;
	builder: string;
	buildings: string[];
}

export interface ActiveBuff {
	type:
		| 'dmg'
		| 'as'
		| 'shield'
		| 'evade'
		| 'slow'
		| 'infect'
		| 'weakness'
		| 'ensnare'
		| 'poison'
		| 'stun'
		| 'bloodlust'
		| 'frost'
		| 'curse'
		| 'inner_fire'
		| 'armor_buff'
		| 'polymorph'
		| 'cyclone'
		| 'banish'
		| 'mana_shield';
	timer: number;
	value: number;
}

export interface Unit {
	instanceId: string;
	defId: string;
	name: string;
	team: Team;
	lane: Lane;
	x: number;
	y: number;
	prevX: number;
	prevY: number;
	hp: number;
	maxHp: number;
	armor: number;
	armorType: ArmorType;
	attackType: AttackType;
	damageMin: number;
	damageMax: number;
	damageBonusPct: number;
	armorBonus: number;
	attackCooldown: number;
	cooldownTimer: number;
	range: number;
	speed: number;
	flying: boolean;
	canHitAir?: boolean;
	currentTargetId: string | null;
	targetX: number;
	targetY: number;
	state: UnitState;
	size: number;
	path?: { x: number; y: number }[];
	pathTargetX?: number;
	pathTargetY?: number;
	lastPathTime?: number;
	stuckTimer?: number;
	lastMoveX?: number;
	lastMoveY?: number;
	critChance?: number;
	evadeChance?: number;
	buffs?: ActiveBuff[];
	isBoss?: boolean;
	splashRadius?: number;
	reflectDamagePct?: number;
	isScavenger?: boolean;
	isArtillery?: boolean;
	abilityType?: UnitAbilityType;
	abilities?: UnitAbilityDef[];
	abilityCooldownTimer?: number;
	hasReincarnated?: boolean;
	reincarnationTimer?: number;
	frostOnHit?: boolean;
	thornsPercent?: number;
	cleavePercent?: number;
	pulverizeChance?: number;
	immolationDps?: number;
	isStunned?: boolean;
	isEnsnared?: boolean;
	isPolymorphed?: boolean;
	isCycloned?: boolean;
	isBanished?: boolean;
	hasManaShield?: boolean;
	buildingDefId?: string;
	buildingName?: string;
	targetBuildingId?: string | null;
	avoidanceBias?: 1 | -1;
	deathTimer?: number;
	attackAnimTimer?: number;
	mana?: number;
	maxMana?: number;
	manaRegen?: number;
	lastAttackerId?: string | null;
	lastAttackedTime?: number;
	playerId?: string;
	playerSlot?: number;
	timedLife?: number;
	isSummoned?: boolean;
}

export interface BuildingPerformance {
	defId: string;
	name: string;
	team: MatchTeam;
	kills: number;
	damage: number;
}

export interface Building {
	instanceId: string;
	defId: string;
	name: string;
	team: MatchTeam;
	tileX: number;
	tileY: number;
	x: number;
	y: number;
	hp: number;
	maxHp: number;
	armor: number;
	armorType: ArmorType;
	goldCost: number;
	lumberCost?: number;
	spawnUnitId: string;
	spawnCooldown: number;
	spawnTimer: number;
	initialSpawnDelay?: number;
	lane: Lane;
	upgradeFrom: string | null;
	race: string;
	isUnderConstruction?: boolean;
	buildProgress?: number;
	maxBuildProgress?: number;
	specialType?: 'treasure' | 'repair' | 'recycler' | 'tower' | 'special';
	aura?: BuildingAuraDef;
	attackCooldown?: number;
	attackTimer?: number;
	attackRange?: number;
	damageMin?: number;
	damageMax?: number;
	attackType?: AttackType;
	isArtillery?: boolean;
	width?: number;
	height?: number;
	playerId?: string;
	playerSlot?: number;
}

export interface Projectile {
	id: string;
	sourceUnitId: string;
	targetUnitId: string;
	x: number;
	y: number;
	targetX: number;
	targetY: number;
	originX?: number;
	originY?: number;
	totalDist?: number;
	arcHeight?: number;
	speed: number;
	damage: number;
	attackType: AttackType;
	isCrit: boolean;
	team: Team;
	splashRadius?: number;
	hasFrost?: boolean;
	isArtillery?: boolean;
}

export interface LightningEffect {
	id?: string;
	sourceX: number;
	sourceY: number;
	targetX: number;
	targetY: number;
	timer: number;
	maxTimer: number;
	color?: number;
}

export interface Castle {
	team: MatchTeam;
	x: number;
	y: number;
	hp: number;
	maxHp: number;
	color?: PlayerColorDef;
}

export interface ForgeLevels {
	attack: number; // 0..5 (+8% damage each)
	armor: number; // 0..5 (+1 armor each)
	econ: number; // 0..3 (+10% income each)
}

export interface Commander {
	id: number;
	name: string;
	nickname: string;
	description: string;
	icon: string;
}

export interface WorkerState {
	name: string;
	x: number;
	y: number;
	targetX: number;
	targetY: number;
	hp: number;
	maxHp: number;
	armor: string;
	speed: number;
	isBuilding?: boolean;
	buildTimer?: number;
	targetBuildingId?: string | null;
	avoidanceBias?: 1 | -1;
	isRepairing?: boolean;
	targetRepairBuildingId?: string | null;
	path?: { x: number; y: number }[];
	stuckTimer?: number;
	lastMoveX?: number;
	lastMoveY?: number;
	buildQueue?: string[];
}

export interface PlayerState {
	id?: string;
	slot?: number;
	team: MatchTeam;
	isBot: boolean;
	botDifficulty?: number;
	name: string;
	race: string;
	color: PlayerColorDef;
	isRandomRace?: boolean;
	randomGoldGranted?: boolean;
	gold: number;
	lumber: number;
	food: number;
	maxFood: number;
	commander: number; // 1..6
	forge: ForgeLevels;
	preferredLane: 'auto' | 'top' | 'mid' | 'bottom';
	worker?: WorkerState;
	stats: {
		unitsSpawned: number;
		unitsKilled: number;
		goldSpent: number;
		totalDamageDealt: number;
		damageToCastle: number;
		coinsCollected: number;
		itemsPurchased: number;
	};
}

export interface FloatingText {
	id: string;
	text: string;
	x: number;
	y: number;
	color: string;
	life: number;
	maxLife: number;
}

export interface GoldCoin {
	id: string;
	lane: Lane;
	x: number;
	y: number;
	value: number;
	lifeTime: number;
	maxLifeTime: number;
}

export type SoundEffectType =
	| 'hit'
	| 'sword'
	| 'bow'
	| 'magic'
	| 'death'
	| 'unit_death'
	| 'attack_normal'
	| 'attack_pierce'
	| 'attack_magic'
	| 'attack_siege'
	| 'buildingDestroyed'
	| 'building_destroyed'
	| 'building_repair'
	| 'upgrade'
	| 'coin'
	| 'buildingComplete'
	| 'castleUnderAttack'
	| 'bossSpawn'
	| 'victory'
	| 'defeat'
	| 'errorResource'
	| 'lowCastleHp'
	| 'horn'
	| 'rescueStrike';
