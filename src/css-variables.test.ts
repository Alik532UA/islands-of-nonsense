// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Перевірка оголошення CSS-змінних (UI-UX-v10, гейт GATE-CSS-VARS).
 *
 * Створено за каноном `Slovko/src/css-variables.test.ts`.
 *
 * Клас дефекту тихий:
 *   - якщо var(--x, fallback) не оголошена в темі, вона мовчки використовує
 *     fallback і перестає реагувати на зміну теми (саме так --color-surface
 *     падала до темного слейту у світлій темі);
 *   - якщо var(--x) без fallback не оголошена, властивість зникає взагалі.
 */

const SKIP = new Set(['node_modules', '.svelte-kit', 'build', 'dist', '.temp', 'static']);

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		if (SKIP.has(name)) return [];
		const full = join(dir, name);
		return statSync(full).isDirectory() ? walk(full) : [full];
	});
}

const FILES = walk('src').filter(
	(f) =>
		(f.endsWith('.svelte') || f.endsWith('.css')) &&
		!f.endsWith('.test.ts') &&
		!f.endsWith('.spec.ts')
);

// Змінні, які оголошуються або ставляться в рантаймі (через JS/компоненти)
const RUNTIME_DECLARED = new Set([
	'--ui-scale',
	'--fill-u',
	'--badge-error-bg',
	'--badge-success-bg',
	'--badge-on-color',
	'--badge-chip-bg',
	'--modal-bg',
	'--modal-border',
	'--pill-bg',
	'--pill-border',
	'--text-primary',
	'--text-secondary',
	'--accent',
	'--theme-heading'
]);

function getDeclaredTokens(): Set<string> {
	const declared = new Set<string>(RUNTIME_DECLARED);
	const layoutCss = readFileSync(join(process.cwd(), 'src/routes/layout.css'), 'utf8');

	for (const m of layoutCss.matchAll(/(?<![\w-])(--[A-Za-z0-9_-]+)\s*:/g)) {
		declared.add(m[1]);
	}

	// Також скануємо оголошення всередині стилів самих файлів
	for (const file of FILES) {
		const text = readFileSync(file, 'utf8');
		for (const m of text.matchAll(/(?<![\w-])(--[A-Za-z0-9_-]+)\s*:/g)) {
			declared.add(m[1]);
		}
		for (const m of text.matchAll(/style:(--[A-Za-z0-9_-]+)\s*=/g)) {
			declared.add(m[1]);
		}
	}

	return declared;
}

describe('CSS-змінні та теми (UI-UX-v10)', () => {
	const declared = getDeclaredTokens();

	it('знайдено файли стилів та компонентів для аудиту', () => {
		expect(FILES.length).toBeGreaterThan(10);
	});

	it('кожна змінна кольору var(--color-*) оголошена у файлі тем', () => {
		const colorVarsUsed = new Map<string, Set<string>>();

		for (const file of FILES) {
			const text = readFileSync(file, 'utf8');
			for (const m of text.matchAll(/var\(\s*(--color-[A-Za-z0-9_-]+)/g)) {
				const at = colorVarsUsed.get(m[1]) ?? new Set<string>();
				at.add(file.replace(process.cwd() + '\\', '').replace(process.cwd() + '/', ''));
				colorVarsUsed.set(m[1], at);
			}
		}

		const orphans = [...colorVarsUsed.entries()]
			.filter(([name]) => !declared.has(name))
			.map(([name, files]) => `${name} — у ${[...files].sort().join(', ')}`)
			.sort();

		expect(
			orphans,
			`Неоголошені змінні --color-* ігнорують перемикання тем:\n  ${orphans.join('\n  ')}`
		).toEqual([]);
	});
});
