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
	I001: {
		id: 'I001',
		nameUk: 'Бойові Барабани',
		nameEn: 'Battle Drums',
		cost: 150,
		descriptionUk: 'Надихає союзне військо: +25% до швидкості атаки всім дружнім бійцям на 15 с.',
		descriptionEn: 'Inspires allies: +25% attack speed to all friendly troops for 15s.',
		icon: 'Drums',
		cooldown: 30
	},
	I005: {
		id: 'I005',
		nameUk: 'Руна Могутності',
		nameEn: 'Rune of Power',
		cost: 150,
		descriptionUk:
			'Перевантаження захисних гармат замку: подвійна швидкість атаки та х2 шкоди на 20 с.',
		descriptionEn: 'Castle cannons overcharge: 2x attack rate and double damage for 20s.',
		icon: 'Zap',
		cooldown: 35
	},
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
	I000: {
		id: 'I000',
		nameUk: 'Дисперсійний Жезл',
		nameEn: 'Wand of Negation',
		cost: 350,
		descriptionUk:
			'Розсіює всі чари (Dispel): миттєво знімає позитивні та негативні магічні ефекти з усіх бійців на полі бою.',
		descriptionEn:
			'Dispel magic: instantly removes all positive and negative magical effects from all units on the battlefield.',
		icon: 'Wand2',
		cooldown: 35
	},
	I009: {
		id: 'I009',
		nameUk: 'Руна Ремонту',
		nameEn: 'Rune of Repair',
		cost: 500,
		descriptionUk: 'Екстрена реставрація: миттєво відновлює 1200 HP замку вашої команди.',
		descriptionEn: 'Emergency repair: instantly restores 1200 HP to your castle.',
		icon: 'Wrench',
		cooldown: 40
	},
	I00A: {
		id: 'I00A',
		nameUk: 'Куля Блискавок',
		nameEn: 'Lightning Orb',
		cost: 575,
		descriptionUk:
			'Ланцюгова блискавка вражає до 6 ворогів біля замку, завдаючи по 350 магічної шкоди.',
		descriptionEn: 'Chain lightning strikes up to 6 enemies near castle for 350 magic damage each.',
		icon: 'Sparkles',
		cooldown: 45
	},
	I008: {
		id: 'I008',
		nameUk: 'Сувій Каменю',
		nameEn: 'Scroll of Stone',
		cost: 600,
		descriptionUk:
			'Викликає могутнього Кам’яного Голема (1800 HP, 12 броні, 65 шкоди) на захист замку.',
		descriptionEn: 'Summons a Stone Golem (1800 HP, 12 armor, 65 dmg) to defend the castle lane.',
		icon: 'ShieldAlert',
		cooldown: 60
	},
	I003: {
		id: 'I003',
		nameUk: 'Бойовий Ріг',
		nameEn: 'Battle Horn',
		cost: 650,
		descriptionUk:
			'Залізний гарт: додає +4 до броні всім дружнім бійцям на полі бою протягом 20 с.',
		descriptionEn: 'Iron resolve: grants +4 armor bonus to all friendly units for 20s.',
		icon: 'Volume2',
		cooldown: 50
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
	I007: {
		id: 'I007',
		nameUk: 'Чарівний Жезл',
		nameEn: 'Magic Wand',
		cost: 1400,
		descriptionUk:
			'Розсіює негативні ефекти з союзників і проклинає всіх ворогів на лініях (-30% шкоди на 12 с).',
		descriptionEn: 'Dispels debuffs on allies and curses all enemies on lanes (-30% dmg for 12s).',
		icon: 'Wand2',
		cooldown: 75
	},
	I004: {
		id: 'I004',
		nameUk: 'Золотий сир',
		nameEn: 'Golden Cheese',
		cost: 1500,
		descriptionUk: 'Легендарний припас: лагодить замок на +2500 HP та виплачує +100 золота.',
		descriptionEn: 'Legendary snack: repairs castle for +2500 HP and grants +100 gold bonus.',
		icon: 'Crown',
		cooldown: 120
	},
	I00N: {
		id: 'I00N',
		nameUk: 'Ядерна Боєголовка',
		nameEn: 'Nuclear Warhead',
		cost: 650,
		descriptionUk:
			'Спустошливий тактичний ядерний удар по ворожих позиціях (900 шкоди в радіусі 900 px).',
		descriptionEn:
			'Devastating tactical nuclear strike on enemy positions (900 damage in 900 px radius).',
		icon: 'Radiation',
		cooldown: 60
	}
};

export const CASTLE_ITEMS_LIST: CastleItem[] = Object.values(CASTLE_ITEMS);
