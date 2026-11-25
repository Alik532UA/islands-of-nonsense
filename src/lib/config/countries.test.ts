import { describe, it, expect } from 'vitest';
import { FLAG_COUNTRIES, countryName, isCountry } from './countries';

describe('countries', () => {
	it('recognises supported 2-letter codes case-insensitively', () => {
		expect(FLAG_COUNTRIES.length).toBeGreaterThanOrEqual(40);
		for (const code of FLAG_COUNTRIES) {
			expect(isCountry(code)).toBe(true);
			expect(isCountry(code.toUpperCase())).toBe(true);
			expect(countryName(code, 'en').length).toBeGreaterThan(0);
		}
		expect(isCountry('xx')).toBe(false);
		expect(isCountry(null)).toBe(false);
	});
});
