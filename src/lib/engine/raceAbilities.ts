export interface RaceAbility {
	race: string;
	nameUk: string;
	nameEn: string;
	kind: string;
	duration: number;
	descriptionUk: string;
	descriptionEn: string;
	icon: string;
}

export const RACE_ABILITIES: Record<string, RaceAbility> = {
	Альянс: {
		race: 'Альянс',
		nameUk: 'Знамено',
		nameEn: 'Banner of War',
		kind: 'dmg',
		duration: 15,
		descriptionUk: '+25% до шкоди всім союзним бійцям на 15 с.',
		descriptionEn: '+25% damage to all friendly units for 15s.',
		icon: 'Flag'
	},
	Нежить: {
		race: 'Нежить',
		nameUk: 'Чума',
		nameEn: 'Plague Outbreak',
		kind: 'plague',
		duration: 0,
		descriptionUk: 'Усі ворожі бійці миттєво втрачають 10% здоров’я.',
		descriptionEn: 'All enemy units instantly lose 10% HP.',
		icon: 'Skull'
	},
	Орки: {
		race: 'Орки',
		nameUk: 'Бойовий клич',
		nameEn: 'Battle Cry',
		kind: 'as',
		duration: 12,
		descriptionUk: '+30% до швидкості атаки всім союзним бійцям на 12 с.',
		descriptionEn: '+30% attack speed to all friendly units for 12s.',
		icon: 'Axe'
	},
	Демони: {
		race: 'Демони',
		nameUk: 'Вогняний дощ',
		nameEn: 'Rain of Fire',
		kind: 'nuke_chaos',
		duration: 0,
		descriptionUk: '200 шкоди всім ворожим бійцям на лінії.',
		descriptionEn: '200 damage to all enemy units on the lane.',
		icon: 'Flame'
	},
	Техніки: {
		race: 'Техніки',
		nameUk: 'Міна',
		nameEn: 'Center Landmine',
		kind: 'mine',
		duration: 0,
		descriptionUk: 'Потужний вибух у центрі: 300 шкоди всім ворогам у радіусі 1400.',
		descriptionEn: 'Center detonation: 300 damage to all enemies in 1400 range.',
		icon: 'Bomb'
	},
	Північ: {
		race: 'Північ',
		nameUk: 'Крижаний щит',
		nameEn: 'Frost Armor',
		kind: 'shield',
		duration: 10,
		descriptionUk: '+5 до броні всім союзним бійцям на 10 с.',
		descriptionEn: '+5 armor to all friendly units for 10s.',
		icon: 'ShieldAlert'
	},
	Ельфи: {
		race: 'Ельфи',
		nameUk: 'Град стріл',
		nameEn: 'Starfall',
		kind: 'nuke_elf',
		duration: 0,
		descriptionUk: '150 шкоди всім ворожим бійцям на лінії.',
		descriptionEn: '150 damage to all enemy units on the lane.',
		icon: 'Crosshair'
	},
	Наги: {
		race: 'Наги',
		nameUk: 'Приплив',
		nameEn: 'Tidal Wave',
		kind: 'slow',
		duration: 8,
		descriptionUk: 'Усі ворожі бійці сповільнюються на 50% на 8 с.',
		descriptionEn: 'All enemy units slowed by 50% for 8s.',
		icon: 'Waves'
	},
	Тролі: {
		race: 'Тролі',
		nameUk: 'Шаленство вуду',
		nameEn: 'Voodoo Frenzy',
		kind: 'as_regen',
		duration: 10,
		descriptionUk: '+25% швидкості атаки та прискорена регенерація на 10 с.',
		descriptionEn: '+25% attack speed and accelerated regeneration for 10s.',
		icon: 'Zap'
	},
	Тварини: {
		race: 'Тварини',
		nameUk: 'Дикий рев',
		nameEn: 'Roar of the Wild',
		kind: 'hp_speed',
		duration: 12,
		descriptionUk: '+20% до максимального HP та +15% швидкості бігу на 12 с.',
		descriptionEn: '+20% max HP and +15% move speed for 12s.',
		icon: 'Sparkles'
	},
	Елементалі: {
		race: 'Елементалі',
		nameUk: 'Буря стихій',
		nameEn: 'Elemental Storm',
		kind: 'nuke_elemental',
		duration: 0,
		descriptionUk: '100 шкоди та шок/замороження ворогів на лінії на 3 с.',
		descriptionEn: '100 damage and shock/slow to enemy units on lane for 3s.',
		icon: 'CloudLightning'
	},
	Небожителі: {
		race: 'Небожителі',
		nameUk: 'Небесне сяйво',
		nameEn: 'Celestial Radiance',
		kind: 'heal_cleanse',
		duration: 0,
		descriptionUk: 'Зцілює 200 HP всім союзникам та знімає ворожі дебафи.',
		descriptionEn: 'Heals 200 HP to all allies and cleanses negative effects.',
		icon: 'Sun'
	},
	// Legacy aliases
	Люди: {
		race: 'Люди',
		nameUk: 'Знамено',
		nameEn: 'Banner of War',
		kind: 'dmg',
		duration: 15,
		descriptionUk: '+25% до шкоди всім союзним бійцям на 15 с.',
		descriptionEn: '+25% damage to all friendly units for 15s.',
		icon: 'Flag'
	},
	Окри: {
		race: 'Окри',
		nameUk: 'Бойовий клич',
		nameEn: 'Battle Cry',
		kind: 'as',
		duration: 12,
		descriptionUk: '+30% до швидкості атаки всім союзним бійцям на 12 с.',
		descriptionEn: '+30% attack speed to all friendly units for 12s.',
		icon: 'Axe'
	},
	Хаос: {
		race: 'Хаос',
		nameUk: 'Вогняний дощ',
		nameEn: 'Rain of Fire',
		kind: 'nuke_chaos',
		duration: 0,
		descriptionUk: '200 шкоди всім ворожим бійцям на лінії.',
		descriptionEn: '200 damage to all enemy units on the lane.',
		icon: 'Flame'
	},
	'Нічні ельфи': {
		race: 'Нічні ельфи',
		nameUk: 'Танець тіней',
		nameEn: 'Shadow Dance',
		kind: 'evade',
		duration: 8,
		descriptionUk: 'Союзні бійці ухиляються від 40% ворожих атак на 8 с.',
		descriptionEn: 'Friendly units gain 40% evasion for 8s.',
		icon: 'Sparkles'
	},
	Порча: {
		race: 'Порча',
		nameUk: 'Зараження',
		nameEn: 'Corrupted Blight',
		kind: 'infect',
		duration: 8,
		descriptionUk: '30 шкоди/с усім ворожим військам протягом 8 с.',
		descriptionEn: '30 damage/s to enemy troops for 8s.',
		icon: 'Biohazard'
	},
	Збирачі: {
		race: 'Збирачі',
		nameUk: 'Велика збірка',
		nameEn: 'Great Assembly',
		kind: 'sbor',
		duration: 15,
		descriptionUk: 'Потужне підсилення: +20% швидкості атаки всім союзникам на 15 с.',
		descriptionEn: '+20% attack speed to all friendly units for 15s.',
		icon: 'Wrench'
	},
	Сборщики: {
		race: 'Сборщики',
		nameUk: 'Велика збірка',
		nameEn: 'Great Assembly',
		kind: 'sbor',
		duration: 15,
		descriptionUk: 'Потужне підсилення: +20% швидкості атаки всім союзникам на 15 с.',
		descriptionEn: '+20% attack speed to all friendly units for 15s.',
		icon: 'Wrench'
	}
};

export function getRaceAbility(race: string): RaceAbility {
	return RACE_ABILITIES[race] || RACE_ABILITIES['Альянс'] || RACE_ABILITIES['Люди'];
}
