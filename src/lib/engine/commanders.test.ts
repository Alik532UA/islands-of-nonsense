import { describe, it, expect } from 'vitest';
import { COMMANDERS, getCommander } from './commanders';

describe('Commanders System ([AC-CMD-1])', () => {
	it('містить рівно 6 канонічних командирів', () => {
		expect(COMMANDERS.length).toBe(6);
		const names = COMMANDERS.map((c) => c.name);
		expect(names).toContain('Саша');
		expect(names).toContain('Алик');
		expect(names).toContain('Дима');
		expect(names).toContain('Дэн');
		expect(names).toContain('Юра');
		expect(names).toContain('Леша');
	});

	it('getCommander повертає правильного командира за ID', () => {
		const alik = getCommander(2);
		expect(alik.name).toBe('Алик');
		expect(alik.description).toContain('50%');

		const fallback = getCommander(999);
		expect(fallback.id).toBe(1);
	});
});
