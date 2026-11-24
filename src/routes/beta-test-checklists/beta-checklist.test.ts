import { describe, it, expect } from 'vitest';
import { BETA_TABS, BETA_ROUTE } from '$lib/beta/checklist';

describe('Beta Diagnostics & Checklist (BETA-CHECKLIST-v10)', () => {
	it('має валідний маршрут beta-test-checklists', () => {
		expect(BETA_ROUTE).toBe('beta-test-checklists');
	});

	it('має непорожні вкладки із локалізованими назвами uk та en', () => {
		expect(BETA_TABS.length).toBeGreaterThan(0);
		for (const tab of BETA_TABS) {
			expect(tab.id).toBeTruthy();
			expect(tab.title.uk).toBeTruthy();
			expect(tab.title.en).toBeTruthy();
			expect(tab.routes.length).toBeGreaterThan(0);
			expect(tab.checks.length).toBeGreaterThan(0);
		}
	});

	it('кожен пункт чеклиста містить повний текст обома мовами та коректну категорію', () => {
		for (const tab of BETA_TABS) {
			for (const check of tab.checks) {
				expect(check.id).toBeTruthy();
				expect(check.category.uk).toBeTruthy();
				expect(check.category.en).toBeTruthy();
				expect(check.text.uk).toBeTruthy();
				expect(check.text.en).toBeTruthy();
				expect(['manual', 'automated', 'covered']).toContain(check.coverage);
			}
		}
	});
});
