// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import ts from 'typescript';
import { parse } from 'svelte/compiler';

/**
 * Module Reachability Test Gate (PROJECT-STRUCTURE-v10 § 4.3.1).
 * Verifies that all production modules in src/ are reachable from SvelteKit entry points
 * via the import dependency graph, preventing orphaned / dead code accumulation.
 */

const walk = (dir: string, out: string[] = []): string[] => {
	if (!existsSync(dir)) return out;
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) {
			walk(p, out);
		} else {
			out.push(p.replace(/\\/g, '/'));
		}
	}
	return out;
};

const src = walk('src');
const isCheck = (f: string) => /\.(test|spec)\.[jt]s$/.test(f);
const modules = src.filter(
	(f) => /\.(ts|js|svelte)$/.test(f) && !isCheck(f) && !f.endsWith('.d.ts')
);
const known = new Set(src);

/** SvelteKit entry points: files executed directly by the framework routing / lifecycle. */
const ENTRY_POINTS = [
	/^src\/routes\/(?:.*\/)?\+(?:page|layout|server|error)(?:@[^/]*)?(?:\.server)?\.(?:svelte|[jt]s)$/,
	/^src\/params\/[^/]+\.[jt]s$/,
	/^src\/hooks(\.server|\.client)?\.[jt]s$/,
	/^src\/service-worker(\/index)?\.[jt]s$/,
	/^src\/instrumentation\.server\.[jt]s$/
];

/**
 * Documented exceptions for modules accessed dynamically or via external tools.
 * Any entry in this map that becomes reachable or no longer exists will fail the test (ratchet).
 */
const KNOWN_UNREACHABLE: Record<string, string> = {
	'src/lib/index.ts': 'Library root re-export package entrypoint',
	'src/lib/net/sweepRooms.ts': 'CLI maintenance sweep script entrypoint (npm run rooms:sweep)',
	'src/lib/engine/balanceRunner.ts': 'Balance suite runner executed by npm run test:balance',
	'src/lib/net/localRoom.ts': 'In-memory offline RTDB room simulation mock for unit tests',
	'src/lib/net/localRules.ts':
		'In-memory security rule evaluator mock for offline LocalRoom testing'
};

type Script = { code: string; line: number };

function scriptsOf(file: string): Script[] {
	const text = readFileSync(file, 'utf8');
	if (!file.endsWith('.svelte')) return [{ code: text, line: 0 }];
	try {
		const ast = parse(text, { modern: true });
		return [ast.instance, ast.module].flatMap((s) => {
			if (!s) return [];
			const { start, end } = (s as unknown as { content: { start: number; end: number } }).content;
			return [{ code: text.slice(start, end), line: text.slice(0, start).split('\n').length - 1 }];
		});
	} catch {
		return [];
	}
}

function nodesOf(root: ts.Node): ts.Node[] {
	const out: ts.Node[] = [];
	const visit = (n: ts.Node) => {
		out.push(n);
		n.forEachChild(visit);
	};
	visit(root);
	return out;
}

function globToRegex(glob: string): RegExp {
	let re = '';
	for (let i = 0; i < glob.length; i++) {
		const c = glob.charAt(i);
		if (glob.startsWith('**/', i)) {
			re += '(.*/)?';
			i += 2;
		} else if (c === '*') re += '[^/]*';
		else if (c === '?') re += '[^/]';
		else if (c === '{') {
			const end = glob.indexOf('}', i);
			re += `(${glob
				.slice(i + 1, end)
				.split(',')
				.join('|')})`;
			i = end;
		} else re += /[.+^$()|[\]\\]/.test(c) ? `\\${c}` : c;
	}
	return new RegExp(`^${re}$`);
}

function edgesOf(file: string): string[] {
	const out: string[] = [];
	const resolveSpec = (spec: string) => {
		const base = spec.startsWith('$lib')
			? 'src/lib' + spec.slice(4)
			: spec.startsWith('.')
				? join(dirname(file), spec).replace(/\\/g, '/')
				: null;
		if (!base) return;
		const tries = [
			base,
			base.replace(/\.js$/, '.ts'),
			...['.ts', '.js', '.svelte', '.svelte.ts', '/index.ts', '/index.js', '/index.svelte'].map(
				(e) => base + e
			)
		];
		const hit = tries.find((t) => known.has(t));
		if (hit) out.push(hit);
	};

	for (const s of scriptsOf(file)) {
		const sf = ts.createSourceFile('temp.ts', s.code, ts.ScriptTarget.Latest, true);
		for (const n of nodesOf(sf)) {
			if (
				(ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) &&
				n.moduleSpecifier &&
				ts.isStringLiteral(n.moduleSpecifier)
			) {
				resolveSpec(n.moduleSpecifier.text);
			}
			if (ts.isCallExpression(n) && n.arguments[0]) {
				const arg = n.arguments[0];
				if (n.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteralLike(arg)) {
					resolveSpec(arg.text);
				}
				if (n.expression.getText(sf) === 'import.meta.glob') {
					const patterns = (ts.isArrayLiteralExpression(arg) ? [...arg.elements] : [arg])
						.filter(ts.isStringLiteralLike)
						.map((p) => p.text);

					const fromRoot = (p: string) =>
						p.startsWith('/')
							? p.slice(1)
							: p.startsWith('$lib/')
								? `src/lib/${p.slice(5)}`
								: join(dirname(file), p).replace(/\\/g, '/');

					const include = patterns
						.filter((p) => !p.startsWith('!'))
						.map((p) => globToRegex(fromRoot(p)));
					const exclude = patterns
						.filter((p) => p.startsWith('!'))
						.map((p) => globToRegex(fromRoot(p.slice(1))));

					out.push(
						...src.filter(
							(f) => include.some((re) => re.test(f)) && !exclude.some((re) => re.test(f))
						)
					);
				}
			}
		}
	}
	return out;
}

describe('Module Reachability Gate (PROJECT-STRUCTURE-v10 § 4.3.1)', () => {
	it('finds valid entry points and modules in src/', () => {
		expect(modules.length).toBeGreaterThan(0);
		const entryModules = modules.filter((f) => ENTRY_POINTS.some((re) => re.test(f)));
		expect(entryModules.length).toBeGreaterThanOrEqual(5);
	});

	it('traverses the import graph and proves module reachability from entry points', () => {
		const reached = new Set<string>();
		const stack = modules.filter((f) => ENTRY_POINTS.some((re) => re.test(f)));

		while (stack.length) {
			const f = stack.pop() as string;
			if (reached.has(f)) continue;
			reached.add(f);
			stack.push(...edgesOf(f));
		}

		const orphans = modules.filter((f) => !reached.has(f) && !(f in KNOWN_UNREACHABLE));
		const stale = Object.keys(KNOWN_UNREACHABLE).filter((f) => reached.has(f) || !known.has(f));

		if (orphans.length > 0) {
			console.error('Orphaned modules detected:\n' + orphans.join('\n'));
		}

		expect(orphans, `Недосяжні модулі (мертвий код):\n${orphans.join('\n')}`).toEqual([]);
		expect(stale, `Застарілі записи KNOWN_UNREACHABLE:\n${stale.join('\n')}`).toEqual([]);
	});
});
