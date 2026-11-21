import type { ArmorType, AttackType } from './types';

// Warcraft III standard Attack vs Armor Table (Multipliers)
export const DAMAGE_MULTIPLIERS: Record<AttackType, Record<ArmorType, number>> = {
	normal: {
		none: 1.0,
		small: 1.5,
		medium: 1.0,
		large: 1.0,
		fort: 0.7,
		hero: 1.0,
		divine: 0.05,
		normal: 1.0
	},
	pierce: {
		none: 1.5,
		small: 2.0,
		medium: 0.75,
		large: 1.0,
		fort: 0.35,
		hero: 0.5,
		divine: 0.05,
		normal: 1.0
	},
	siege: {
		none: 1.5,
		small: 1.0,
		medium: 0.5,
		large: 1.0,
		fort: 1.5,
		hero: 0.5,
		divine: 0.05,
		normal: 1.0
	},
	magic: {
		none: 1.0,
		small: 1.25,
		medium: 0.75,
		large: 2.0,
		fort: 0.35,
		hero: 0.5,
		divine: 0.05,
		normal: 1.0
	},
	chaos: {
		none: 1.0,
		small: 1.0,
		medium: 1.0,
		large: 1.0,
		fort: 1.0,
		hero: 1.0,
		divine: 1.0,
		normal: 1.0
	},
	hero: {
		none: 1.0,
		small: 1.0,
		medium: 1.0,
		large: 1.0,
		fort: 0.5,
		hero: 1.0,
		divine: 0.05,
		normal: 1.0
	}
};

/**
 * Calculates effective damage after applying attack-armor matrix and armor rating reduction.
 */
export function calculateDamage(
	attackType: AttackType | string,
	armorType: ArmorType | string,
	rawDamage: number,
	targetArmor: number
): number {
	const aType = (attackType?.toLowerCase() || 'normal') as AttackType;

	let normalizedArmor = armorType?.toLowerCase() || 'medium';
	if (normalizedArmor === 'heavy') normalizedArmor = 'large';
	if (normalizedArmor === 'light') normalizedArmor = 'small';
	if (normalizedArmor === 'unarmored') normalizedArmor = 'none';
	if (normalizedArmor === 'fortified') normalizedArmor = 'fort';

	const defType = normalizedArmor as ArmorType;
	const typeMultiplier = DAMAGE_MULTIPLIERS[aType]?.[defType] ?? 1.0;

	let armorFactor: number;
	if (targetArmor >= 0) {
		const reduction = (0.06 * targetArmor) / (1 + 0.06 * targetArmor);
		armorFactor = Math.max(0.01, 1 - reduction);
	} else {
		// Negative armor increases damage
		armorFactor = 2 - Math.pow(0.94, -targetArmor);
	}

	return Math.max(1, Math.round(rawDamage * typeMultiplier * armorFactor));
}
