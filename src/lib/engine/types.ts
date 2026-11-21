export type ArmorType =
	'none' | 'small' | 'medium' | 'large' | 'fort' | 'divine' | 'normal' | 'hero';
export type AttackType = 'normal' | 'pierce' | 'siege' | 'magic' | 'chaos' | 'hero';

export type MatchTeam = 'west' | 'east';
export type Team = MatchTeam | 'neutral';
export type Lane = 'top' | 'bottom';
export type UnitState = 'WALKING' | 'ATTACKING' | 'DYING' | 'DEAD';

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
	gold_cost: number;
	raw_fields?: Record<string, unknown>;
}

export interface BuildingDefinition {
	id: string;
	name: string;
	hp: number;
	armor: number;
	armor_type: ArmorType | string;
	attack_type: AttackType | string;
	gold_cost: number;
	unit: string;
	upgrade_from: string | null;
	upgrade_extra_cost: number;
	race?: string | null;
	specialType?: 'treasure' | 'repair' | 'recycler';
	raw_fields?: Record<string, unknown>;
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
		| 'stun';
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
	currentTargetId: string | null;
	targetX: number;
	targetY: number;
	state: UnitState;
	size: number;
	critChance?: number;
	evadeChance?: number;
	buffs?: ActiveBuff[];
	isBoss?: boolean;
	splashRadius?: number;
	reflectDamagePct?: number;
	isScavenger?: boolean;
	abilityType?: 'ensnare' | 'poison' | 'heal' | 'bash' | 'aura_dmg' | 'none';
	abilityCooldownTimer?: number;
	isStunned?: boolean;
	isEnsnared?: boolean;
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
	goldCost: number;
	spawnUnitId: string;
	spawnCooldown: number;
	spawnTimer: number;
	lane: Lane;
	upgradeFrom: string | null;
	race: string;
	specialType?: 'treasure' | 'repair' | 'recycler';
}

export interface Projectile {
	id: string;
	sourceUnitId: string;
	targetUnitId: string;
	x: number;
	y: number;
	targetX: number;
	targetY: number;
	speed: number;
	damage: number;
	attackType: AttackType;
	isCrit: boolean;
	team: Team;
	splashRadius?: number;
}

export interface Castle {
	team: MatchTeam;
	x: number;
	y: number;
	hp: number;
	maxHp: number;
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

export interface PlayerState {
	team: MatchTeam;
	isBot: boolean;
	name: string;
	race: string;
	isRandomRace?: boolean;
	randomGoldGranted?: boolean;
	gold: number;
	lumber: number;
	commander: number; // 1..6
	forge: ForgeLevels;
	preferredLane: 'auto' | 'top' | 'bottom';
	stats: {
		unitsSpawned: number;
		unitsKilled: number;
		goldSpent: number;
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
