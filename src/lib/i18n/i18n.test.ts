import { describe, it, expect } from 'vitest';
import { translations, t, setLocale, getLocale, type Locale } from './index';
import { localizeEntityName, localizeRaceName, localizeShortBuildingName } from './entityNames';
import { BUILDINGS_MAP, PLAYABLE_RACES, UNITS_MAP } from '../engine/gameData';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('i18n parity and translation coverage (I18N-v10)', () => {
	const locales = Object.keys(translations) as Locale[];
	const ukKeys = Object.keys(translations.uk).sort();
	const enKeys = Object.keys(translations.en).sort();

	it('має повний паритет ключів між українською та англійською мовами', () => {
		expect(ukKeys).toEqual(enKeys);
		expect(ukKeys.length).toBeGreaterThan(50);
	});

	it('жоден переклад не містить порожнього рядка чи лише пробілів', () => {
		for (const loc of locales) {
			const dict = translations[loc];
			for (const [key, val] of Object.entries(dict)) {
				expect(
					val.trim().length,
					`Key "${key}" in locale "${loc}" should not be empty`
				).toBeGreaterThan(0);
			}
		}
	});

	it('плейсхолдери {param} у повідомленнях повністю збігаються між мовами', () => {
		for (const key of ukKeys) {
			const ukVal = (translations.uk as Record<string, string>)[key] ?? '';
			const enVal = (translations.en as Record<string, string>)[key] ?? '';

			const ukPlaceholders = (ukVal.match(/\{[a-zA-Z0-9_-]+\}/g) ?? []).sort();
			const enPlaceholders = (enVal.match(/\{[a-zA-Z0-9_-]+\}/g) ?? []).sort();

			expect(enPlaceholders, `Placeholders for key "${key}" must match between uk and en`).toEqual(
				ukPlaceholders
			);
		}
	});

	it('повертає коректний переклад для поточної мови та підставляє параметри', () => {
		setLocale('uk');
		expect(getLocale()).toBe('uk');
		expect(t('gold')).toBe('Золото');

		setLocale('en');
		expect(getLocale()).toBe('en');
		expect(t('gold')).toBe('Gold');

		// Explicit locale override
		expect(t('gold', 'uk')).toBe('Золото');
		expect(t('gold', 'en')).toBe('Gold');
	});

	it('коректно підставляє плейсхолдери {param} у функції t()', () => {
		// Mock testing interpolation
		const template = 'Привіт, {name}! У вас {count} золота.';
		const dict = translations.uk as Record<string, string>;
		dict['test.greeting'] = template;

		expect(t('test.greeting', { name: 'Командир', count: 100 }, 'uk')).toBe(
			'Привіт, Командир! У вас 100 золота.'
		);

		delete dict['test.greeting'];
	});

	it('перекладає всі грабельні раси, юніти та будівлі англійською без залишку кирилиці', () => {
		for (const race of PLAYABLE_RACES) {
			const enRace = localizeRaceName(race, 'en');
			expect(enRace, `Race "${race}" must translate to English`).not.toMatch(/[а-яА-ЯіІїЇєЄґҐ]/);
		}
		for (const u of UNITS_MAP.values()) {
			const enName = localizeEntityName(u.name, 'en');
			expect(enName, `Unit "${u.name}" must translate to English`).not.toMatch(/[а-яА-ЯіІїЇєЄґҐ]/);
		}
		for (const b of BUILDINGS_MAP.values()) {
			const enName = localizeEntityName(b.name, 'en');
			expect(enName, `Building "${b.name}" must translate to English`).not.toMatch(
				/[а-яА-ЯіІїЇєЄґҐ]/
			);
			const enShort = localizeShortBuildingName(b.name, 'en');
			expect(enShort, `Short building "${b.name}" must translate to English`).not.toMatch(
				/[а-яА-ЯіІїЇєЄґҐ]/
			);
		}
	});

	it('EntityInspectDetails та CommandCard не рендерять сирі типи атаки/броні (medium/normal)', () => {
		const inspectSrc = fs.readFileSync(
			path.resolve(process.cwd(), 'src/lib/components/EntityInspectDetails.svelte'),
			'utf-8'
		);
		const cmdSrc = fs.readFileSync(
			path.resolve(process.cwd(), 'src/lib/components/CommandCard.svelte'),
			'utf-8'
		);
		expect(inspectSrc).not.toContain('{selectedUnit.armorType}');
		expect(inspectSrc).not.toContain('{selectedUnit.attackType}');
		expect(inspectSrc).toContain('getArmorTypeLabel');
		expect(inspectSrc).toContain('getAttackTypeLabel');
		expect(cmdSrc).not.toContain('({hoveredUnit.attack_type})');
		expect(cmdSrc).not.toContain('({hoveredUnit.armor_type})');
		expect(cmdSrc).not.toContain('({placedUnit.attack_type})');
		expect(cmdSrc).not.toContain('({placedUnit.armor_type})');
	});
});
