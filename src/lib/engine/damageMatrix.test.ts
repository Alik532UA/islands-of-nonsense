import { describe, it, expect } from 'vitest';
import { calculateDamage, DAMAGE_MULTIPLIERS } from './damageMatrix';

describe('Warcraft III Damage Matrix & Armor Reduction ([AC-COMBAT-1])', () => {
	it('застосовує тип шкоди Siege з множником 1.5 проти Fortified', () => {
		expect(DAMAGE_MULTIPLIERS.siege.fort).toBe(1.5);
		const dmg = calculateDamage('siege', 'fort', 100, 0);
		expect(dmg).toBe(150);
	});

	it('застосовує Pierce зі штрафом проти Fortified (множник 0.35)', () => {
		expect(DAMAGE_MULTIPLIERS.pierce.fort).toBe(0.35);
		const dmg = calculateDamage('pierce', 'fort', 100, 0);
		expect(dmg).toBe(35);
	});

	it('Chaos завдає 100% шкоди всім типам броні, включаючи Divine', () => {
		expect(DAMAGE_MULTIPLIERS.chaos.divine).toBe(1.0);
		expect(DAMAGE_MULTIPLIERS.chaos.fort).toBe(1.0);
		const dmg = calculateDamage('chaos', 'divine', 100, 0);
		expect(dmg).toBe(100);
	});

	it('розраховує зменшення від позитивної броні за формулою WC3', () => {
		// 10 броні: reduction = (0.06 * 10) / (1 + 0.6) = 0.6 / 1.6 = 0.375
		// armorFactor = 0.625
		// 100 шкоди * 1.0 * 0.625 = 62.5 -> round = 63
		const dmg = calculateDamage('normal', 'medium', 100, 10);
		expect(dmg).toBe(63);
	});

	it('збільшує шкоду при негативній броні', () => {
		const dmg = calculateDamage('normal', 'medium', 100, -5);
		expect(dmg).toBeGreaterThan(100);
	});
});
