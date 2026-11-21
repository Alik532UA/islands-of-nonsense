import { describe, it, expect } from 'vitest';
import { translations, t, setLocale, getLocale } from './index';

describe('i18n parity and translation coverage (I18N-v10)', () => {
	it('має повний паритет ключів між українською та англійською мовами', () => {
		const ukKeys = Object.keys(translations.uk).sort();
		const enKeys = Object.keys(translations.en).sort();
		expect(ukKeys).toEqual(enKeys);
	});

	it('повертає коректний переклад для поточної мови', () => {
		setLocale('uk');
		expect(getLocale()).toBe('uk');
		expect(t('gold')).toBe('Золото');

		setLocale('en');
		expect(getLocale()).toBe('en');
		expect(t('gold')).toBe('Gold');
	});
});
