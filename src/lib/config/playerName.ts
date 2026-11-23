export const NAME_KEY = 'player.name';

const TACTICAL_NAMES_UK = [
	'Паладин',
	'Архімаг',
	'Лицар Смерті',
	'Шаман',
	'Вождь',
	'Вартовий',
	'Слідопит',
	'Друїд',
	'Чаклун',
	'Повелитель Склепу',
	'Некромант',
	'Мисливець',
	'Командир',
	'Капітан',
	'Гладіатор'
] as const;

const TACTICAL_NAMES_EN = [
	'Paladin',
	'Archmage',
	'Death Knight',
	'Shaman',
	'Chieftain',
	'Warden',
	'Ranger',
	'Druid',
	'Sorcerer',
	'Crypt Lord',
	'Necromancer',
	'Hunter',
	'Commander',
	'Captain',
	'Gladiator'
] as const;

export interface ChosenName {
	name: string;
	assigned: string;
}

export function randomPlayerName(
	locale: string = 'uk',
	random: () => number = Math.random,
	taken: readonly string[] = []
): string {
	const pool = locale === 'uk' ? TACTICAL_NAMES_UK : TACTICAL_NAMES_EN;
	const available = pool.filter((cand) => !taken.includes(cand));
	const candidates = available.length > 0 ? available : pool;
	const picked = candidates[Math.floor(random() * candidates.length)];

	if (taken.includes(picked)) {
		const suffix = Math.floor(random() * 899 + 100);
		return `${picked}#${suffix}`;
	}
	return picked;
}

export function initialName(
	saved: string | null,
	locale: string = 'uk',
	random: () => number = Math.random,
	taken: readonly string[] = []
): ChosenName {
	if (saved !== null && saved.trim() !== '') {
		return { name: saved.trim(), assigned: '' };
	}
	const generated = randomPlayerName(locale, random, taken);
	return { name: generated, assigned: generated };
}

export function rerollIfTaken(
	current: string,
	assigned: string,
	locale: string = 'uk',
	random: () => number = Math.random,
	taken: readonly string[] = []
): string | null {
	if (assigned === '' || current !== assigned) return null;
	if (!taken.includes(current)) return null;
	return randomPlayerName(locale, random, taken);
}
