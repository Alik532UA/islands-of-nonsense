/**
 * Режими гри Castle Fight Web (SCALABILITY-v10).
 * Забезпечує легку розширюваність новими типами матчів та кастомними правилами.
 */

export interface GameModeConfig {
	id: string;
	nameUk: string;
	nameEn: string;
	descriptionUk: string;
	descriptionEn: string;
	startGold: number;
	incomeMultiplier: number;
	botDifficulty: number; // 0 (Easy), 15 (Medium), 30 (Hard), 80 (Insane)
	allowForge: boolean;
	castleHpMultiplier: number;
	uniqueRaces?: boolean;
	allRandom?: boolean;
	bannedRaces?: string[];
	banDraft?: boolean;
	banCount?: number;
	noSpecialBuildings?: boolean;
	noArtillery?: boolean;
	noRescueStrike?: boolean;
	domination?: boolean;
	singleLane?: 'top' | 'bottom';
	nuclearWarheads?: boolean;
	noLegendaries?: boolean;
	noItems?: boolean;
}

export const GAME_MODES: Record<string, GameModeConfig> = {
	standard: {
		id: 'standard',
		nameUk: 'Стандартний бій',
		nameEn: 'Standard Match',
		descriptionUk: 'Класичні правила WC3 Castle Fight v37 (стартове золото: 150)',
		descriptionEn: 'Classic WC3 Castle Fight v37 rules (start gold: 150)',
		startGold: 150,
		incomeMultiplier: 1.0,
		botDifficulty: 15,
		allowForge: true,
		castleHpMultiplier: 1.0
	},
	allRandom: {
		id: 'allRandom',
		nameUk: 'All Random (-ar)',
		nameEn: 'All Random (-ar)',
		descriptionUk: 'Всі команди отримують випадкові раси та бонус +30% до стартового золота',
		descriptionEn: 'All teams receive random races and +30% starting gold bonus',
		startGold: 150,
		incomeMultiplier: 1.0,
		botDifficulty: 15,
		allowForge: true,
		castleHpMultiplier: 1.0,
		allRandom: true
	},
	uniqueRaces: {
		id: 'uniqueRaces',
		nameUk: 'Unique Races (-ur)',
		nameEn: 'Unique Races (-ur)',
		descriptionUk: 'Унікальні раси: протиборчі команди не можуть обрати однакову расу',
		descriptionEn: 'Unique races: opposing teams cannot choose the same race',
		startGold: 150,
		incomeMultiplier: 1.0,
		botDifficulty: 15,
		allowForge: true,
		castleHpMultiplier: 1.0,
		uniqueRaces: true
	},
	banDraft: {
		id: 'banDraft',
		nameUk: 'Бан-драфт (-ban)',
		nameEn: 'Banned Races Draft (-ban)',
		descriptionUk: 'Вибір заблокованих рас перед початком матчу, заборонених для обох команд',
		descriptionEn: 'Prohibit drafting designated banned races for all teams in the match',
		startGold: 150,
		incomeMultiplier: 1.0,
		botDifficulty: 15,
		allowForge: true,
		castleHpMultiplier: 1.0,
		banDraft: true,
		banCount: 2
	},
	noSpecial: {
		id: 'noSpecial',
		nameUk: 'Без особливих споруд (-nu)',
		nameEn: 'No Unique / Special (-nu)',
		descriptionUk: 'Заборонено будівництво особливих споруд (крім захисних веж та скарбниць)',
		descriptionEn:
			'Prohibits building special structures (except defensive towers and treasure chests)',
		startGold: 150,
		incomeMultiplier: 1.0,
		botDifficulty: 15,
		allowForge: true,
		castleHpMultiplier: 1.0,
		noSpecialBuildings: true
	},
	noArtillery: {
		id: 'noArtillery',
		nameUk: 'Без артилерії (-na)',
		nameEn: 'No Artillery (-na)',
		descriptionUk:
			'Заборонено споруди далекобійної артилерії, що атакують ворожий замок через мапу',
		descriptionEn: 'Prohibits artillery and siege structures targeting enemy citadel across map',
		startGold: 150,
		incomeMultiplier: 1.0,
		botDifficulty: 15,
		allowForge: true,
		castleHpMultiplier: 1.0,
		noArtillery: true
	},
	noRescueStrike: {
		id: 'noRescueStrike',
		nameUk: 'Без Рятівного Удару (-nw)',
		nameEn: 'No Rescue Strike (-nw)',
		descriptionUk: 'Робітники позбавлені виклику Рятівного Удару захисту цитаделі',
		descriptionEn: 'Workers cannot call down citadel Rescue Strike emergency defenses',
		startGold: 150,
		incomeMultiplier: 1.0,
		botDifficulty: 15,
		allowForge: true,
		castleHpMultiplier: 1.0,
		noRescueStrike: true
	},
	domination: {
		id: 'domination',
		nameUk: 'Домінування (-dm)',
		nameEn: 'Domination (-dm)',
		descriptionUk: 'Бонусний дохід золота за утримання більшості військ у центрі ліній',
		descriptionEn: 'Bonus gold income for maintaining troop superiority in center of lanes',
		startGold: 150,
		incomeMultiplier: 1.0,
		botDifficulty: 15,
		allowForge: true,
		castleHpMultiplier: 1.0,
		domination: true
	},
	singleLane: {
		id: 'singleLane',
		nameUk: 'Одна лінія (-sl)',
		nameEn: 'Single Lane (-sl)',
		descriptionUk:
			'Всі сили обох армій спрямовано в один спільний смертельний коридор (верхня лінія)',
		descriptionEn: 'All forces funneled into a single shared battle corridor (top lane)',
		startGold: 150,
		incomeMultiplier: 1.0,
		botDifficulty: 15,
		allowForge: true,
		castleHpMultiplier: 1.0,
		singleLane: 'top'
	},
	nuclearWarheads: {
		id: 'nuclearWarheads',
		nameUk: 'Ядерна битва (-nuke)',
		nameEn: 'Nuclear Warheads (-nuke)',
		descriptionUk: 'Магазин замку продає спустошливі тактичні ядерні удари по позиціях ворога',
		descriptionEn: 'Castle shop sells devastating tactical nuclear warhead strikes',
		startGold: 200,
		incomeMultiplier: 1.2,
		botDifficulty: 20,
		allowForge: true,
		castleHpMultiplier: 1.2,
		nuclearWarheads: true
	},
	blitz: {
		id: 'blitz',
		nameUk: 'Бліц (Швидка економіка)',
		nameEn: 'Blitz (Fast Economy)',
		descriptionUk: 'Подвійний дохід та прискорений розвиток (стартове золото: 300)',
		descriptionEn: 'Double income and accelerated tech (start gold: 300)',
		startGold: 300,
		incomeMultiplier: 2.0,
		botDifficulty: 30,
		allowForge: true,
		castleHpMultiplier: 1.0
	},
	survival: {
		id: 'survival',
		nameUk: 'Виживання (Hardcore)',
		nameEn: 'Survival (Hardcore)',
		descriptionUk: 'Агресивний бот найвищої складності, посилені ворожі замки',
		descriptionEn: 'Aggressive Insane bot and fortified enemy castle',
		startGold: 120,
		incomeMultiplier: 0.9,
		botDifficulty: 80,
		allowForge: true,
		castleHpMultiplier: 1.5
	},
	sandbox: {
		id: 'sandbox',
		nameUk: 'Пісочниця / Тест-арена',
		nameEn: 'Sandbox Arena',
		descriptionUk: 'Безкінечне золото та деревина для тестування будівель та юнітів',
		descriptionEn: 'Infinite gold and lumber for testing units and build synergies',
		startGold: 999999,
		incomeMultiplier: 5.0,
		botDifficulty: 0,
		allowForge: true,
		castleHpMultiplier: 2.0
	}
};

export function getGameMode(id: string): GameModeConfig {
	return GAME_MODES[id] || GAME_MODES.standard;
}
