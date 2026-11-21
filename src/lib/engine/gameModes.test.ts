import { describe, it, expect } from 'vitest';
import { GAME_MODES, getGameMode } from './gameModes';

describe('Game Modes System (SCALABILITY-v10)', () => {
	it('містить стандартні та розширені режими гри', () => {
		expect(GAME_MODES.standard).toBeDefined();
		expect(GAME_MODES.blitz).toBeDefined();
		expect(GAME_MODES.survival).toBeDefined();
		expect(GAME_MODES.sandbox).toBeDefined();
	});

	it('getGameMode повертає правильні налаштування з фолбеком', () => {
		const blitz = getGameMode('blitz');
		expect(blitz.startGold).toBe(300);
		expect(blitz.incomeMultiplier).toBe(2.0);

		const fallback = getGameMode('unknown_mode');
		expect(fallback.id).toBe('standard');
	});
});
