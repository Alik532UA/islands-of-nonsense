export type ArmorType = 'none' | 'small' | 'medium' | 'large' | 'fort' | 'divine' | 'normal' | 'hero';
export type AttackType = 'normal' | 'pierce' | 'siege' | 'magic' | 'chaos' | 'hero';

export type Team = 'west' | 'east';
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
	raw_fields?: Record<string, any>;
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
	raw_fields?: Record<string, any>;
}

export interface RaceDefinition {
	race: string;
	builder: string;
	buildings: string[];
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
}

export interface Building {
	instanceId: string;
	defId: string;
	name: string;
	team: Team;
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
}

export interface Castle {
	team: Team;
	x: number;
	y: number;
	hp: number;
	maxHp: number;
}

export interface ForgeLevels {
	attack: number; // 0..5 (+8% damage each)
	armor: number;  // 0..5 (+1 armor each)
	econ: number;   // 0..3 (+10% income each)
}

export interface Commander {
	id: number;
	name: string;
	nickname: string;
	description: string;
	icon: string;
}

export interface PlayerState {
	team: Team;
	isBot: boolean;
	name: string;
	race: string;
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
