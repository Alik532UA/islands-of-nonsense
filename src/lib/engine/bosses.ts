import type { ArmorType, AttackType } from './types';

export interface BossDefinition {
	id: string;
	nameUk: string;
	nameEn: string;
	hp: number;
	damage: number;
	armor: number;
	armorType: ArmorType;
	attackType: AttackType;
	attackCooldown: number;
	range: number;
	size: number;
}

export const BOSS_DEFINITIONS: BossDefinition[] = [
	{
		id: 'boss_uther',
		nameUk: 'Утер Світлоносний',
		nameEn: 'Uther the Lightbringer',
		hp: 2800,
		damage: 65,
		armor: 6,
		armorType: 'large',
		attackType: 'normal',
		attackCooldown: 1.2,
		range: 120,
		size: 24
	},
	{
		id: 'boss_jaina',
		nameUk: 'Джайна Праудмур',
		nameEn: 'Jaina Proudmoore',
		hp: 2000,
		damage: 90,
		armor: 2,
		armorType: 'small',
		attackType: 'magic',
		attackCooldown: 1.3,
		range: 420,
		size: 22
	},
	{
		id: 'boss_muradin',
		nameUk: 'Мурадін Бронзобород',
		nameEn: 'Muradin Bronzebeard',
		hp: 3000,
		damage: 60,
		armor: 8,
		armorType: 'large',
		attackType: 'normal',
		attackCooldown: 1.3,
		range: 120,
		size: 25
	},
	{
		id: 'boss_kael',
		nameUk: "Кель'Тас Сонячний Мандрівник",
		nameEn: "Kael'thas Sunstrider",
		hp: 2200,
		damage: 85,
		armor: 3,
		armorType: 'medium',
		attackType: 'magic',
		attackCooldown: 1.3,
		range: 400,
		size: 23
	},
	{
		id: 'boss_thrall',
		nameUk: 'Тралл',
		nameEn: 'Thrall',
		hp: 2400,
		damage: 75,
		armor: 4,
		armorType: 'medium',
		attackType: 'chaos',
		attackCooldown: 1.2,
		range: 350,
		size: 24
	},
	{
		id: 'boss_cairne',
		nameUk: 'Керн Криваве Копито',
		nameEn: 'Cairne Bloodhoof',
		hp: 3000,
		damage: 70,
		armor: 6,
		armorType: 'large',
		attackType: 'normal',
		attackCooldown: 1.4,
		range: 120,
		size: 26
	},
	{
		id: 'boss_arthas',
		nameUk: 'Артас Менетол',
		nameEn: 'Arthas Menethil',
		hp: 2600,
		damage: 80,
		armor: 6,
		armorType: 'large',
		attackType: 'chaos',
		attackCooldown: 1.2,
		range: 120,
		size: 25
	},
	{
		id: 'boss_kelthuzad',
		nameUk: "Кел'Тузад",
		nameEn: "Kel'Thuzad",
		hp: 2000,
		damage: 95,
		armor: 2,
		armorType: 'small',
		attackType: 'magic',
		attackCooldown: 1.4,
		range: 450,
		size: 23
	},
	{
		id: 'boss_illidan',
		nameUk: 'Іллідан Лютошторм',
		nameEn: 'Illidan Stormrage',
		hp: 2400,
		damage: 85,
		armor: 4,
		armorType: 'medium',
		attackType: 'chaos',
		attackCooldown: 1.0,
		range: 120,
		size: 24
	},
	{
		id: 'boss_mannoroth',
		nameUk: 'Маннорот',
		nameEn: 'Mannoroth',
		hp: 3200,
		damage: 80,
		armor: 7,
		armorType: 'fort',
		attackType: 'chaos',
		attackCooldown: 1.5,
		range: 140,
		size: 28
	}
];

export function getRandomBoss(excludeIndex = -1): { boss: BossDefinition; index: number } {
	let idx = Math.floor(Math.random() * BOSS_DEFINITIONS.length);
	if (idx === excludeIndex && BOSS_DEFINITIONS.length > 1) {
		idx = (idx + 1) % BOSS_DEFINITIONS.length;
	}
	return { boss: BOSS_DEFINITIONS[idx], index: idx };
}
