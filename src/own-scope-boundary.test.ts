// src/own-scope-boundary.test.ts — лише коли збір логів із пристроїв (DEBUGGING § 3): API всього origin лише в модулі межі (DEBUGGING § 3.5)
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'svelte/compiler';
import ts from 'typescript';

const BOUNDARY = 'src/lib/debug/ownScope.ts';
/** Воркер чистить свої старі кеші при activate (STORAGE-NAMESPACE § 6.1) — йому caches.keys() дозволено. */
const SERVICE_WORKER = /^src\/service-worker(\/index)?\.(ts|js)$/;
/** API всього origin: [назва, глобальний власник (порожній — будь-який), член, де дозволено]. */
const ORIGIN_WIDE: [string, string, string, (file: string) => boolean][] = [
	['getRegistrations()', '', 'getRegistrations', (file) => file === BOUNDARY],
	['caches.keys()', 'caches', 'keys', (file) => file === BOUNDARY || SERVICE_WORKER.test(file)],
	['indexedDB.databases()', 'indexedDB', 'databases', (file) => file === BOUNDARY]
];

const walk = (dir: string): string[] =>
	readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return walk(path);
		return /\.(ts|js|svelte)$/.test(name) && !/\.(test|spec)\.ts$/.test(name)
			? [path.split('\\').join('/')]
			: [];
	});

/** Код файлу для TypeScript: модуль цілком; у `.svelte` — обидва скрипти й вирази розмітки. */
function units(file: string): string[] {
	const text = readFileSync(file, 'utf8');
	if (!file.endsWith('.svelte')) return [text];
	const ast = parse(text, { modern: true });
	const out: string[] = [];
	for (const script of [ast.instance, ast.module]) {
		const range = script?.content as unknown as { start: number; end: number } | undefined;
		if (range) out.push(text.slice(range.start, range.end));
	}
	const visit = (node: unknown): void => {
		if (Array.isArray(node)) return node.forEach(visit);
		if (!node || typeof node !== 'object') return;
		const n = node as {
			type?: unknown;
			expression?: { start?: number; end?: number };
			[key: string]: unknown;
		};
		if (
			typeof n.type === 'string' &&
			n.expression?.start !== undefined &&
			n.expression.end !== undefined &&
			!('content' in n)
		)
			out.push(`(${text.slice(n.expression.start, n.expression.end)});`);
		for (const [key, value] of Object.entries(n))
			if (key !== 'parent' && key !== 'metadata') visit(value);
	};
	visit(ast.fragment);
	return out;
}

const unwrap = (e: ts.Expression): ts.Expression =>
	ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isAsExpression(e)
		? unwrap(e.expression)
		: e;
const memberName = (e: ts.Expression): string | undefined =>
	ts.isPropertyAccessExpression(e)
		? e.name.text
		: ts.isElementAccessExpression(e) && ts.isStringLiteralLike(e.argumentExpression)
			? e.argumentExpression.text
			: undefined;
const memberOwner = (e: ts.PropertyAccessExpression | ts.ElementAccessExpression): ts.Expression =>
	unwrap(e.expression);

/**
 * Які API всього origin чіпає код — за AST, у будь-якій формі звернення: `caches.keys()`,
 * `window['caches'].keys()`, `const store = caches; store.keys()`, `const { databases } = indexedDB`.
 * Коментар не є вузлом, тож пояснення правила порушенням не стає (AI-AGENT-PITFALLS § 1.6).
 */
function touches(code: string): Set<string> {
	const sf = ts.createSourceFile('unit.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	const found = new Set<string>();
	for (const [name, owner, member] of ORIGIN_WIDE) {
		const aliases = new Set(owner ? [owner] : []);
		/** Звернення до глобального власника: ім'я, `window.`/`globalThis.`/`self.` перед ним, або псевдонім. */
		const isOwner = (node: ts.Expression): boolean => {
			const e = unwrap(node);
			if (ts.isIdentifier(e)) return aliases.has(e.text);
			const inner =
				ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)
					? memberOwner(e)
					: undefined;
			return (
				!!owner &&
				memberName(e) === owner &&
				!!inner &&
				/^(?:window|globalThis|self)$/.test(inner.getText(sf))
			);
		};
		const collect = (node: ts.Node): void => {
			if (
				owner &&
				ts.isVariableDeclaration(node) &&
				ts.isIdentifier(node.name) &&
				node.initializer &&
				isOwner(node.initializer)
			)
				aliases.add(node.name.text);
			ts.forEachChild(node, collect);
		};
		collect(sf);
		const visit = (node: ts.Node): void => {
			if (
				(ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) &&
				memberName(node) === member &&
				(!owner || isOwner(memberOwner(node)))
			)
				found.add(name);
			if (ts.isBindingElement(node) && (node.propertyName ?? node.name).getText(sf) === member) {
				const declaration = node.parent.parent;
				if (
					!owner ||
					(ts.isVariableDeclaration(declaration) &&
						declaration.initializer &&
						isOwner(declaration.initializer))
				)
					found.add(name);
			}
			ts.forEachChild(node, visit);
		};
		visit(sf);
	}
	return found;
}

describe('API всього origin — лише в модулі межі', () => {
	const calls = new Map(
		walk('src').map((file) => [file, units(file).flatMap((code) => [...touches(code)])])
	);

	it('перевірка жива: модуль межі знайдено, і кожне звернення в ньому є', () => {
		const boundary = calls.get(BOUNDARY) ?? [];
		expect(ORIGIN_WIDE.filter(([name]) => !boundary.includes(name)).map(([name]) => name)).toEqual(
			[]
		);
	});

	it('поза модулем межі звернень немає', () => {
		const offenders = [...calls].flatMap(([file, names]) =>
			ORIGIN_WIDE.filter(([name, , , allowed]) => names.includes(name) && !allowed(file)).map(
				([name]) => `${file}: ${name}`
			)
		);
		expect(
			offenders,
			'«взяти всі → відфільтрувати» на місці виклику: наступна копія буде без фільтра — ' +
				'назовні модуль межі віддає готові дії'
		).toEqual([]);
	});
});
