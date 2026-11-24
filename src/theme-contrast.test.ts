// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AA_LARGE, AA_NORMAL, contrast, parseColor } from '$lib/utils/contrast';

/**
 * Тести контрасту кольорів для ВСІХ 4 тем оформлення (UI-UX-v10, WCAG 2.x).
 *
 * Створено за каноном `teatralo4ka.odesa.ua` (vitest/support/tokens.test.ts)
 * та `Slovko` (css-variables.test.ts).
 *
 * Перевіряє, що в жодній із тем (`dark-gray`, `light-gray`, `orange`, `green`)
 * текст чи елементи інтерфейсу не стають невидимими або з низьким контрастом.
 */

export const THEMES = ['dark-gray', 'light-gray', 'orange', 'green'] as const;
export type Theme = (typeof THEMES)[number];

const THEME_SELECTORS: Record<Theme, RegExp> = {
	'dark-gray': /:root,\s*\[data-theme='dark-gray'\]\s*\{([\s\S]*?)\}/,
	'light-gray': /html\[data-theme='light-gray'\],\s*\[data-theme='light-gray'\]\s*\{([\s\S]*?)\}/,
	orange: /html\[data-theme='orange'\],\s*\[data-theme='orange'\]\s*\{([\s\S]*?)\}/,
	green: /html\[data-theme='green'\],\s*\[data-theme='green'\]\s*\{([\s\S]*?)\}/
};

function readCssTokens(): Record<Theme, Record<string, string>> {
	const cssPath = join(process.cwd(), 'src/routes/layout.css');
	const css = readFileSync(cssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
	const result = {} as Record<Theme, Record<string, string>>;

	for (const theme of THEMES) {
		const match = THEME_SELECTORS[theme].exec(css);
		if (!match) {
			throw new Error(`Не знайдено блок стилів для теми ${theme} у src/routes/layout.css`);
		}
		const tokens: Record<string, string> = {};
		for (const d of match[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
			tokens[d[1]] = d[2].trim();
		}
		result[theme] = tokens;
	}

	return result;
}

describe('Theme Contrast & Tokens Audit (WCAG AA)', () => {
	const perTheme = readCssTokens();

	it('усі 4 теми мають повний набір критичних дизайн-токенів', () => {
		const REQUIRED_TOKENS = [
			'--color-bg-menu',
			'--color-bg-card',
			'--color-bg-card-hover',
			'--color-surface',
			'--color-surface-hover',
			'--color-border-card',
			'--color-border',
			'--color-text',
			'--color-text-muted',
			'--color-heading',
			'--color-danger',
			'--color-success',
			'--color-warning',
			'--color-info',
			'--color-pill-bg',
			'--color-pill-border'
		];

		for (const theme of THEMES) {
			const tokens = perTheme[theme];
			const missing = REQUIRED_TOKENS.filter((tok) => !tokens[tok]);
			expect(missing, `У темі ${theme} відсутні обов'язкові токени: ${missing.join(', ')}`).toEqual(
				[]
			);
		}
	});

	describe('Контраст тексту та заголовків на карточках (WCAG AA Normal >= 4.5:1)', () => {
		for (const theme of THEMES) {
			it(`Тема [${theme}]: основний текст читабельний на карточці`, () => {
				const tokens = perTheme[theme];
				const fg = parseColor(tokens['--color-text']);
				const bg = parseColor(tokens['--color-bg-card']);

				expect(fg, `Не вдалося розібрати --color-text у темі ${theme}`).not.toBeNull();
				expect(bg, `Не вдалося розібрати --color-bg-card у темі ${theme}`).not.toBeNull();

				const ratio = contrast(fg!, bg!);
				expect(
					ratio,
					`Контраст --color-text на --color-bg-card у темі ${theme} дорівнює ${ratio.toFixed(2)}, що нижче за ${AA_NORMAL}:1`
				).toBeGreaterThanOrEqual(AA_NORMAL);
			});

			it(`Тема [${theme}]: заголовки читабельні на карточці`, () => {
				const tokens = perTheme[theme];
				const fg = parseColor(tokens['--color-heading']);
				const bg = parseColor(tokens['--color-bg-card']);

				expect(fg, `Не вдалося розібрати --color-heading у темі ${theme}`).not.toBeNull();
				expect(bg, `Не вдалося розібрати --color-bg-card у темі ${theme}`).not.toBeNull();

				const ratio = contrast(fg!, bg!);
				expect(
					ratio,
					`Контраст --color-heading на --color-bg-card у темі ${theme} дорівнює ${ratio.toFixed(2)}, що нижче за ${AA_NORMAL}:1`
				).toBeGreaterThanOrEqual(AA_NORMAL);
			});

			it(`Тема [${theme}]: другорядний текст читабельний на карточці (>= 3.0:1)`, () => {
				const tokens = perTheme[theme];
				const fg = parseColor(tokens['--color-text-muted']);
				const bg = parseColor(tokens['--color-bg-card']);

				expect(fg, `Не вдалося розібрати --color-text-muted у темі ${theme}`).not.toBeNull();
				expect(bg, `Не вдалося розібрати --color-bg-card у темі ${theme}`).not.toBeNull();

				const ratio = contrast(fg!, bg!);
				expect(
					ratio,
					`Контраст --color-text-muted на --color-bg-card у темі ${theme} дорівнює ${ratio.toFixed(2)}, що нижче за ${AA_LARGE}:1`
				).toBeGreaterThanOrEqual(AA_LARGE);
			});
		}
	});

	describe('Контраст панелей та ServiceBadge (WCAG AA >= 4.5:1)', () => {
		for (const theme of THEMES) {
			it(`Тема [${theme}]: текст ServiceBadge та меню читабельний на поверхні (--color-surface)`, () => {
				const tokens = perTheme[theme];
				const fg = parseColor(tokens['--color-text']);
				const bg = parseColor(tokens['--color-surface']);

				expect(fg).not.toBeNull();
				expect(bg).not.toBeNull();

				const ratio = contrast(fg!, bg!);
				expect(
					ratio,
					`Контраст тексту ServiceBadge на поверхні у темі ${theme} занизький (${ratio.toFixed(2)}:1)`
				).toBeGreaterThanOrEqual(AA_NORMAL);
			});

			it(`Тема [${theme}]: лічильник бейджа (--badge-chip-bg / --badge-on-color) має високий контраст`, () => {
				const tokens = perTheme[theme];
				// У ServiceBadge: chip-bg = --color-text, on-color = --color-surface
				const chipBg = parseColor(tokens['--color-text']);
				const chipText = parseColor(tokens['--color-surface']);

				expect(chipBg).not.toBeNull();
				expect(chipText).not.toBeNull();

				const ratio = contrast(chipText!, chipBg!);
				expect(
					ratio,
					`Контраст лічильника ServiceBadge у темі ${theme} дорівнює ${ratio.toFixed(2)}, що нижче за ${AA_NORMAL}:1`
				).toBeGreaterThanOrEqual(AA_NORMAL);
			});

			it(`Тема [${theme}]: значення у пігулках швидких налаштувань читабельні`, () => {
				const tokens = perTheme[theme];
				const fg = parseColor(tokens['--color-text']);
				const bg = parseColor(tokens['--color-pill-bg']);

				expect(fg).not.toBeNull();
				expect(bg).not.toBeNull();

				const ratio = contrast(fg!, bg!);
				expect(
					ratio,
					`Контраст значень у пігулках налаштувань у темі ${theme} (${ratio.toFixed(2)}:1) нижче за ${AA_NORMAL}:1`
				).toBeGreaterThanOrEqual(AA_NORMAL);
			});
		}
	});

	describe('Статусні кольори (помилка, успіх)', () => {
		for (const theme of THEMES) {
			it(`Тема [${theme}]: білий текст на кнопці помилки має контраст >= 3.0:1`, () => {
				const tokens = perTheme[theme];
				const white = parseColor('white')!;
				const danger = parseColor(tokens['--color-danger']);

				expect(danger).not.toBeNull();
				const ratio = contrast(white, danger!);
				expect(
					ratio,
					`Білий на --color-danger у темі ${theme} має контраст ${ratio.toFixed(2)}:1`
				).toBeGreaterThanOrEqual(AA_LARGE);
			});

			it(`Тема [${theme}]: білий текст на кнопці успіху має контраст >= 3.0:1`, () => {
				const tokens = perTheme[theme];
				const white = parseColor('white')!;
				const success = parseColor(tokens['--color-success']);

				expect(success).not.toBeNull();
				const ratio = contrast(white, success!);
				expect(
					ratio,
					`Білий на --color-success у темі ${theme} має контраст ${ratio.toFixed(2)}:1`
				).toBeGreaterThanOrEqual(AA_LARGE);
			});
		}
	});
});
