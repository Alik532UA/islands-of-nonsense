/**
 * Локалізація Castle Fight Web (LANGUAGE-POLICY-v10 & I18N-v10).
 * Підтримуються українська (uk) та англійська (en).
 */

export type Locale = 'uk' | 'en';

export const translations = {
	uk: {
		app_title: 'Castle Fight Web',
		app_subtitle: 'Військово-тактична стратегія стінка на стінку',
		gold: 'Золото',
		income: 'Дохід',
		income_timer: 'Виплата доходу',
		forge: 'Військова Кузня',
		commander: 'Командир',
		attack_upgrade: 'Атака',
		armor_upgrade: 'Броня',
		economy_upgrade: 'Економіка',
		victory: 'Перемога!',
		defeat: 'Поразка!',
		play_again: 'Грати знову',
		top_lane: 'Верхня лінія',
		bottom_lane: 'Нижня лінія',
		west_castle: 'Західний Замок (Гравець)',
		east_castle: 'Східний Замок (Бот)',
		build_mode: 'Режим будівництва',
		select_building: 'Оберіть будівлю для розміщення',
		insufficient_gold: 'Недостатньо золота!',
		tile_occupied: 'Клітинка вже зайнята!',
		sound: 'Звук',
		volume: 'Гучність'
	},
	en: {
		app_title: 'Castle Fight Web',
		app_subtitle: 'Tactical Auto-Battler Lane Strategy',
		gold: 'Gold',
		income: 'Income',
		income_timer: 'Next Income',
		forge: 'War Forge',
		commander: 'Commander',
		attack_upgrade: 'Attack',
		armor_upgrade: 'Armor',
		economy_upgrade: 'Economy',
		victory: 'Victory!',
		defeat: 'Defeat!',
		play_again: 'Play Again',
		top_lane: 'Top Lane',
		bottom_lane: 'Bottom Lane',
		west_castle: 'West Castle (Player)',
		east_castle: 'East Castle (Bot)',
		build_mode: 'Build Mode',
		select_building: 'Select a building to construct',
		insufficient_gold: 'Not enough gold!',
		tile_occupied: 'Tile is already occupied!',
		sound: 'Sound',
		volume: 'Volume'
	}
} as const;

export type TranslationKey = keyof (typeof translations)['uk'];

let currentLocale: Locale = 'uk';

export function setLocale(loc: Locale): void {
	currentLocale = loc;
}

export function getLocale(): Locale {
	return currentLocale;
}

export function t(key: TranslationKey, locale: Locale = currentLocale): string {
	const dict = translations[locale] || translations.uk;
	return dict[key] || translations.uk[key] || key;
}
