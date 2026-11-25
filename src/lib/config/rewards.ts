export type RewardCategory = 'combat' | 'online' | 'economy' | 'mastery';
export type RewardRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface UnlockableGrant {
	kind: 'frame' | 'title';
	id: string;
	labelUk: string;
	labelEn: string;
}

export interface AchievementDef {
	id: string;
	category: RewardCategory;
	rarity: RewardRarity;
	xp: number;
	target: number;
	icon: string;
	titleUk: string;
	titleEn: string;
	descUk: string;
	descEn: string;
	grant?: UnlockableGrant;
	metric:
		| 'wins'
		| 'onlineWins'
		| 'plays'
		| 'bestWinStreak'
		| 'kills'
		| 'castleDamage'
		| 'racesWon'
		| 'dailyStreak'
		| 'score'
		| 'bestMatchKills';
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
	{
		id: 'first_win',
		category: 'combat',
		rarity: 'common',
		xp: 60,
		target: 1,
		icon: 'swords',
		titleUk: 'Перша кров',
		titleEn: 'First Blood',
		descUk: 'Здобудьте першу перемогу у будь-якому матчі',
		descEn: 'Win your very first match',
		metric: 'wins'
	},
	{
		id: 'tactician_10',
		category: 'mastery',
		rarity: 'common',
		xp: 100,
		target: 10,
		icon: 'shield',
		titleUk: 'Гартований тактик',
		titleEn: 'Seasoned Tactician',
		descUk: 'Зіграйте 10 матчів',
		descEn: 'Play 10 matches',
		metric: 'plays'
	},
	{
		id: 'veteran_10',
		category: 'combat',
		rarity: 'rare',
		xp: 180,
		target: 10,
		icon: 'medal',
		titleUk: 'Ветеран облоги',
		titleEn: 'Siege Veteran',
		descUk: 'Здобудьте 10 перемог',
		descEn: 'Achieve 10 victories',
		grant: { kind: 'frame', id: 'bronze', labelUk: 'Бронзова рамка', labelEn: 'Bronze Frame' },
		metric: 'wins'
	},
	{
		id: 'champion_25',
		category: 'combat',
		rarity: 'epic',
		xp: 350,
		target: 25,
		icon: 'crown',
		titleUk: 'Чемпіон островів',
		titleEn: 'Island Champion',
		descUk: 'Здобудьте 25 перемог',
		descEn: 'Achieve 25 victories',
		grant: { kind: 'frame', id: 'gold', labelUk: 'Золота рамка', labelEn: 'Gold Frame' },
		metric: 'wins'
	},
	{
		id: 'general_50',
		category: 'mastery',
		rarity: 'epic',
		xp: 300,
		target: 50,
		icon: 'star',
		titleUk: 'Полководець',
		titleEn: 'War Commander',
		descUk: 'Зіграйте 50 матчів',
		descEn: 'Play 50 matches',
		grant: {
			kind: 'title',
			id: 'commander',
			labelUk: 'Титул: Командир',
			labelEn: 'Title: Commander'
		},
		metric: 'plays'
	},
	{
		id: 'online_duelist',
		category: 'online',
		rarity: 'common',
		xp: 110,
		target: 1,
		icon: 'globe',
		titleUk: 'Онлайн-дуелянт',
		titleEn: 'Online Duelist',
		descUk: 'Переможіть у першому онлайн-матчі',
		descEn: 'Win your first online match',
		metric: 'onlineWins'
	},
	{
		id: 'online_conqueror',
		category: 'online',
		rarity: 'epic',
		xp: 400,
		target: 10,
		icon: 'zap',
		titleUk: 'Підкорювач мережі',
		titleEn: 'Network Conqueror',
		descUk: 'Здобудьте 10 онлайн-перемог',
		descEn: 'Win 10 online matches',
		grant: { kind: 'frame', id: 'neon', labelUk: 'Неонова рамка', labelEn: 'Neon Frame' },
		metric: 'onlineWins'
	},
	{
		id: 'streak_3',
		category: 'online',
		rarity: 'rare',
		xp: 140,
		target: 3,
		icon: 'flame',
		titleUk: 'Гаряча серія',
		titleEn: 'Hot Streak',
		descUk: 'Виграйте 3 матчі поспіль',
		descEn: 'Win 3 matches in a row',
		metric: 'bestWinStreak'
	},
	{
		id: 'streak_7',
		category: 'online',
		rarity: 'legendary',
		xp: 420,
		target: 7,
		icon: 'flame',
		titleUk: 'Нестримний вихор',
		titleEn: 'Unstoppable Force',
		descUk: 'Виграйте 7 матчів поспіль',
		descEn: 'Win 7 matches in a row',
		grant: { kind: 'frame', id: 'flame', labelUk: 'Вогняна рамка', labelEn: 'Flame Frame' },
		metric: 'bestWinStreak'
	},
	{
		id: 'slayer_100',
		category: 'combat',
		rarity: 'common',
		xp: 90,
		target: 100,
		icon: 'skull',
		titleUk: 'Мисливець',
		titleEn: 'Slayer',
		descUk: 'Знищіть 100 ворожих юнітів за карʼєру',
		descEn: 'Defeat 100 enemy units across all matches',
		metric: 'kills'
	},
	{
		id: 'exterminator_1000',
		category: 'combat',
		rarity: 'epic',
		xp: 360,
		target: 1000,
		icon: 'skull',
		titleUk: 'Воєначальник',
		titleEn: 'Warlord',
		descUk: 'Знищіть 1000 ворожих юнітів за карʼєру',
		descEn: 'Defeat 1000 enemy units across all matches',
		grant: {
			kind: 'title',
			id: 'warlord',
			labelUk: 'Титул: Воєначальник',
			labelEn: 'Title: Warlord'
		},
		metric: 'kills'
	},
	{
		id: 'siege_10k',
		category: 'economy',
		rarity: 'rare',
		xp: 150,
		target: 10000,
		icon: 'castle',
		titleUk: 'Облоговий інженер',
		titleEn: 'Siege Engineer',
		descUk: 'Завдайте 10 000 шкоди ворожим замкам',
		descEn: 'Deal 10,000 damage to enemy castles',
		metric: 'castleDamage'
	},
	{
		id: 'siege_50k',
		category: 'economy',
		rarity: 'epic',
		xp: 350,
		target: 50000,
		icon: 'castle',
		titleUk: 'Руйнівник фортець',
		titleEn: 'Fortress Crusher',
		descUk: 'Завдайте 50 000 шкоди ворожим замкам',
		descEn: 'Deal 50,000 damage to enemy castles',
		grant: { kind: 'frame', id: 'silver', labelUk: 'Срібна рамка', labelEn: 'Silver Frame' },
		metric: 'castleDamage'
	},
	{
		id: 'races_5',
		category: 'mastery',
		rarity: 'rare',
		xp: 220,
		target: 5,
		icon: 'sparkles',
		titleUk: 'Мультифракційний стратег',
		titleEn: 'Multi-Faction Strategist',
		descUk: 'Переможіть за 5 різних рас',
		descEn: 'Win with 5 different races',
		metric: 'racesWon'
	},
	{
		id: 'races_10',
		category: 'mastery',
		rarity: 'legendary',
		xp: 550,
		target: 10,
		icon: 'gem',
		titleUk: 'Володар усіх рас',
		titleEn: 'Master of Realms',
		descUk: 'Переможіть за 10 різних рас',
		descEn: 'Win with 10 different races',
		grant: { kind: 'frame', id: 'royal', labelUk: 'Королівська рамка', labelEn: 'Royal Frame' },
		metric: 'racesWon'
	},
	{
		id: 'daily_3',
		category: 'mastery',
		rarity: 'rare',
		xp: 160,
		target: 3,
		icon: 'calendar',
		titleUk: 'Бойовий ритм',
		titleEn: 'Battle Rhythm',
		descUk: 'Грайте 3 дні поспіль',
		descEn: 'Play 3 days in a row',
		metric: 'dailyStreak'
	},
	{
		id: 'daily_7',
		category: 'mastery',
		rarity: 'legendary',
		xp: 450,
		target: 7,
		icon: 'calendar',
		titleUk: 'Залізна дисципліна',
		titleEn: 'Iron Discipline',
		descUk: 'Грайте 7 днів поспіль',
		descEn: 'Play 7 days in a row',
		grant: { kind: 'title', id: 'legend', labelUk: 'Титул: Легенда', labelEn: 'Title: Legend' },
		metric: 'dailyStreak'
	},
	{
		id: 'score_1000',
		category: 'economy',
		rarity: 'common',
		xp: 120,
		target: 1000,
		icon: 'trophy',
		titleUk: 'Тисячник',
		titleEn: 'Rising Contender',
		descUk: 'Наберіть 1 000 рейтингових очок',
		descEn: 'Reach 1,000 rating score',
		metric: 'score'
	},
	{
		id: 'score_5000',
		category: 'economy',
		rarity: 'epic',
		xp: 320,
		target: 5000,
		icon: 'trophy',
		titleUk: 'Еліта рейтингу',
		titleEn: 'Rating Elite',
		descUk: 'Наберіть 5 000 рейтингових очок',
		descEn: 'Reach 5,000 rating score',
		metric: 'score'
	},
	{
		id: 'match_kills_50',
		category: 'combat',
		rarity: 'rare',
		xp: 190,
		target: 50,
		icon: 'crosshair',
		titleUk: 'Шквал клинків',
		titleEn: 'Blade Storm',
		descUk: 'Знищіть 50+ ворожих юнітів за один матч',
		descEn: 'Defeat 50+ enemy units in a single match',
		grant: {
			kind: 'title',
			id: 'architect',
			labelUk: 'Титул: Архітектор',
			labelEn: 'Title: Architect'
		},
		metric: 'bestMatchKills'
	}
];

export const PLAYER_TITLES: ReadonlyArray<{ id: string; uk: string; en: string }> = [
	{ id: 'recruit', uk: 'Рекрут', en: 'Recruit' },
	{ id: 'commander', uk: 'Командир', en: 'Commander' },
	{ id: 'architect', uk: 'Архітектор', en: 'Architect' },
	{ id: 'warlord', uk: 'Воєначальник', en: 'Warlord' },
	{ id: 'legend', uk: 'Легенда', en: 'Legend' }
];

export interface LevelProgress {
	level: number;
	xp: number;
	levelMinXp: number;
	nextLevelXp: number;
	progressPct: number;
}

export function xpRequiredForLevel(level: number): number {
	const safe = Math.max(1, Math.floor(level));
	return 100 * (safe - 1) * (safe - 1);
}

export function computeLevelProgress(rawXp: number): LevelProgress {
	const xp = Math.max(0, Math.floor(rawXp));
	const level = Math.min(999, 1 + Math.floor(Math.sqrt(xp / 100)));
	const levelMinXp = xpRequiredForLevel(level);
	const nextLevelXp = xpRequiredForLevel(level + 1);
	const span = Math.max(1, nextLevelXp - levelMinXp);
	const progressPct = Math.min(100, Math.max(0, Math.round(((xp - levelMinXp) / span) * 100)));
	return { level, xp, levelMinXp, nextLevelXp, progressPct };
}

export function titleLabel(id: string | undefined, locale: 'uk' | 'en'): string {
	const found = PLAYER_TITLES.find((t) => t.id === id) ?? PLAYER_TITLES[0];
	return locale === 'en' ? found.en : found.uk;
}
