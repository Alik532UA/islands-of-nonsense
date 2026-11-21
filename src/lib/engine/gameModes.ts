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
		descriptionUk: 'Необмежені ресурси для тестування будівель та юнітів',
		descriptionEn: 'Unlimited gold for testing units and build synergies',
		startGold: 9999,
		incomeMultiplier: 5.0,
		botDifficulty: 0,
		allowForge: true,
		castleHpMultiplier: 2.0
	}
};

export function getGameMode(id: string): GameModeConfig {
	return GAME_MODES[id] || GAME_MODES.standard;
}
