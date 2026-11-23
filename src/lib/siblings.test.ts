import { describe, expect, it } from 'vitest';
import { resolveSiblingLocale, SIBLINGS, siblingUrl } from './siblings';

const ROW = SIBLINGS.islandsofnonsense;

describe('рядок цього сайту (islandsofnonsense) в таблиці сусідів', () => {
	it('перелічує ті самі мови, що сайт справді віддає (uk, en)', () => {
		expect([...ROW.locales].sort()).toEqual(['en', 'uk']);
	});

	it('називає українську мовою за замовчуванням', () => {
		expect(ROW.defaultLocale).toBe('uk');
	});

	it('несе правильний origin і базу для GitHub Pages', () => {
		expect(ROW.origin).toBe('https://alik532ua.github.io');
		expect(ROW.base).toBe('/islands-of-nonsense');
	});

	it('каже query, бо мова тут читається зі сховища та query', () => {
		expect(ROW.transport).toBe('query');
	});

	it('не вимагає кінцевого слеша для query transport', () => {
		expect(ROW.trailingSlash).toBe(false);
	});
});

describe('«замовити сайт / гру» веде в DigitalWorkshop мовою, якою грають тут', () => {
	it('кладе мову в шлях, коли в сусіда вона не типова (en, de)', () => {
		expect(siblingUrl('digitalworkshop', 'en')).toBe(
			'https://alik532ua.github.io/DigitalWorkshop/en/'
		);
		expect(siblingUrl('digitalworkshop', 'de')).toBe(
			'https://alik532ua.github.io/DigitalWorkshop/de/'
		);
	});

	it('називає українську параметром, бо в сусіда вона на голій адресі', () => {
		expect(siblingUrl('digitalworkshop', 'uk')).toBe(
			'https://alik532ua.github.io/DigitalWorkshop/?lang=uk'
		);
	});

	it('зводить en-US до en, а не вважає невідомим', () => {
		expect(resolveSiblingLocale('digitalworkshop', 'en-US')).toBe('en');
	});

	it('передає довільні додаткові query параметри', () => {
		const url = siblingUrl('digitalworkshop', 'uk', { ref: 'islands-of-nonsense' });
		expect(url).toContain('ref=islands-of-nonsense');
		expect(url).toContain('lang=uk');
	});
});

describe('посилання на VetCrewGames', () => {
	it('будує правильні адреси для VetCrewGames', () => {
		expect(siblingUrl('vetcrewgames', 'uk')).toBe('https://alik532ua.github.io/VetCrewGames/?lang=uk');
		expect(siblingUrl('vetcrewgames', 'en')).toBe('https://alik532ua.github.io/VetCrewGames/en/');
	});
});
