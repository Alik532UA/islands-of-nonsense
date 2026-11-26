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
	I001: {
		id: 'I001',
		nameUk: 'Чарівний жезл',
		nameEn: 'Magic Wand',
		cost: 150,
		descriptionUk:
			'Предмет у торбу робітника: раз на 1 с автоматично б’є найближчого ворога у радіусі 300 магічним снарядом (60 шкоди).',
		descriptionEn:
			'Worker inventory item: automatically strikes the nearest enemy within 300 range every 1s for 60 magic damage.',
		icon: 'Wand2',
		cooldown: 30
	},
	I002: {
		id: 'I002',
		nameUk: 'Покращений Магічний жезл',
		nameEn: 'Improved Magic Wand',
		cost: 520,
		descriptionUk:
			'Предмет у торбу робітника: раз на 0.4 с автоматично б’є найближчого ворога у радіусі 300 магічним снарядом (120 шкоди).',
		descriptionEn:
			'Worker inventory item: automatically strikes the nearest enemy within 300 range every 0.4s for 120 magic damage.',
		icon: 'Wand2',
		cooldown: 45
	},
	I005: {
		id: 'I005',
		nameUk: 'Руна Могутності',
		nameEn: 'Rune of Power',
		cost: 150,
		descriptionUk:
			'Перевантаження гармат замку на 20 с: ×2 шкоди, безкоштовні постріли (0 золота) та вдвічі менший КД.',
		descriptionEn:
			'Castle cannons overcharge for 20s: 2x damage, free shots (0 gold), and halved cooldown.',
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
	I006: {
		id: 'I006',
		nameUk: 'Куля блискавок',
		nameEn: 'Lightning Orb',
		cost: 550,
		descriptionUk:
			'Предмет у торбу робітника (КД 60 с): натискайте для Ланцюга блискавок по 10 ворогах (1000 магічної шкоди першій цілі).',
		descriptionEn:
			'Worker inventory item (60s CD): click to cast Chain Lightning hitting up to 10 enemies (1000 magic damage to first target).',
		icon: 'Sparkles',
		cooldown: 45
	},
	I00A: {
		id: 'I00A',
		nameUk: 'Бойовий Ріг',
		nameEn: 'Battle Horn',
		cost: 575,
		descriptionUk:
			'Збільшує швидкість пересування всіх дружніх юнітів на 15% і швидкість їхньої атаки на 30% протягом 20 с.',
		descriptionEn:
			'Increases move speed by 15% and attack speed by 30% for all friendly units for 20s.',
		icon: 'Volume2',
		cooldown: 45
	},
	I008: {
		id: 'I008',
		nameUk: 'Подвійна шкода',
		nameEn: 'Double Damage',
		cost: 600,
		descriptionUk: 'Збільшує шкоду всіх дружніх юнітів на +100% протягом 30 секунд.',
		descriptionEn: 'Increases damage of all friendly units by +100% for 30 seconds.',
		icon: 'Swords',
		cooldown: 60
	},
	I003: {
		id: 'I003',
		nameUk: 'Бойові Барабани',
		nameEn: 'Battle Drums',
		cost: 650,
		descriptionUk: 'Додає всім дружнім юнітам +33% до шкоди протягом 20 с.',
		descriptionEn: 'Grants +33% damage to all friendly units for 20s.',
		icon: 'Drums',
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
		nameUk: 'Почетверена шкода',
		nameEn: 'Quad Damage',
		cost: 1400,
		descriptionUk: 'Збільшує шкоду всіх дружніх юнітів на +300% протягом 30 секунд.',
		descriptionEn: 'Increases damage of all friendly units by +300% for 30 seconds.',
		icon: 'Flame',
		cooldown: 75
	},
	I004: {
		id: 'I004',
		nameUk: 'Золотий сир',
		nameEn: 'Golden Cheese',
		cost: 1500,
		descriptionUk: 'Легендарний припас: збільшує ліміт легендарних споруд на +1 Їжу.',
		descriptionEn: 'Legendary ration: increases Legendary building limit by +1 Food Cap.',
		icon: 'Crown',
		cooldown: 120
	},
	I00N: {
		id: 'I00B',
		nameUk: 'Ядерна Боєголовка',
		nameEn: 'Nuclear Warhead',
		cost: 650,
		descriptionUk:
			'Спеціальний режим (Ядерна битва): тактичний ядерний удар по ворожих позиціях (900 шкоди в радіусі 900 px).',
		descriptionEn:
			'Special mode (Nuclear Battle): tactical nuclear strike on enemy positions (900 damage in 900 px radius).',
		icon: 'Radiation',
		cooldown: 60
	}
};

// Alias I00B as a non-enumerable property for backward/forward compatibility
Object.defineProperty(CASTLE_ITEMS, 'I00B', {
	value: CASTLE_ITEMS.I00N,
	enumerable: false,
	writable: true,
	configurable: true
});

export const CASTLE_ITEMS_LIST: CastleItem[] = [
	CASTLE_ITEMS.I001,
	CASTLE_ITEMS.I002,
	CASTLE_ITEMS.I005,
	CASTLE_ITEMS.I00E,
	CASTLE_ITEMS.I009,
	CASTLE_ITEMS.I006,
	CASTLE_ITEMS.I00A,
	CASTLE_ITEMS.I008,
	CASTLE_ITEMS.I003,
	CASTLE_ITEMS.I00F,
	CASTLE_ITEMS.I007,
	CASTLE_ITEMS.I004
];
