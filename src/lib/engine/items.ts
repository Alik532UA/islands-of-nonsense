export interface CastleItem {
	id: string;
	nameUk: string;
	nameEn: string;
	cost: number;
	descriptionUk: string;
	descriptionEn: string;
	icon: string;
	cooldown: number; // seconds between purchases
}

export const CASTLE_ITEMS: Record<string, CastleItem> = {
	I00E: {
		id: 'I00E',
		nameUk: 'Сувій Слабкості',
		nameEn: 'Scroll of Weakness',
		cost: 300,
		descriptionUk:
			'Всі ворожі війська в радіусі 1400 навколо замку на 15 с: швидкість атаки -40%, біг -25%.',
		descriptionEn: 'All enemy troops in 1400 radius for 15s: -40% attack speed, -25% move speed.',
		icon: 'Scroll',
		cooldown: 45
	},
	I00F: {
		id: 'I00F',
		nameUk: 'Лазурний купол',
		nameEn: 'Azure Dome',
		cost: 900,
		descriptionUk:
			'Всі споруди команди та замок стають повністю невразливими до будь-якої шкоди на 6 с.',
		descriptionEn: 'All team buildings and castle become completely invulnerable for 6s.',
		icon: 'Shield',
		cooldown: 90
	},
	I004: {
		id: 'I004',
		nameUk: 'Золотий сир',
		nameEn: 'Golden Cheese',
		cost: 1500,
		descriptionUk:
			'Легендарний припас: миттєво лагодить замок на +2500 HP та виплачує +100 золота.',
		descriptionEn: 'Legendary snack: instantly repairs castle for +2500 HP and grants +100 gold.',
		icon: 'Crown',
		cooldown: 120
	}
};

export const CASTLE_ITEMS_LIST: CastleItem[] = Object.values(CASTLE_ITEMS);
