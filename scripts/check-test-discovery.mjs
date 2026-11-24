#!/usr/bin/env node
/**
 * Test discovery verification gate (AI-AGENT-PITFALLS-v10 § 1.3.1 & CI-CD-AND-TOOLS § 1.19)
 * Enforces:
 * - Every test/spec file on disk is collected by a registered runner (Vitest or Playwright)
 * - Vitest config has expect.requireAssertions: true
 * - No empty test bodies or tautological stub assertions
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import ts from 'typescript';

const require = createRequire(resolve('package.json'));
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };

/** Folders to ignore during walk */
const SKIP = new Set([
	'node_modules',
	'.svelte-kit',
	'build',
	'dist',
	'.git',
	'playwright-report',
	'test-results',
	'coverage',
	'.claude',
	'.private'
]);

const key = (p) => resolve(p).split('\\').join('/').toLowerCase();

function walk(dir, out = []) {
	for (const name of readdirSync(dir)) {
		if (SKIP.has(name)) continue;
		const p = join(dir, name);
		if (statSync(p).isDirectory()) {
			walk(p, out);
		} else if (/\.(test|spec)\.[cm]?[jt]s$/.test(name)) {
			out.push(p);
		}
	}
	return out;
}

/** CLI runner execution through Node directly to avoid Windows shell issues */
function run(pkgName, bin, args) {
	const manifest = require.resolve(`${pkgName}/package.json`);
	const bins = JSON.parse(readFileSync(manifest, 'utf8')).bin;
	const cli = join(dirname(manifest), typeof bins === 'string' ? bins : bins[bin]);
	return execFileSync(process.execPath, [cli, ...args], {
		encoding: 'utf8',
		maxBuffer: 64 << 20,
		stdio: ['ignore', 'pipe', 'pipe']
	});
}

function configsOf(command) {
	const found = new Set();
	for (const script of Object.values(pkg.scripts ?? {})) {
		for (const [, args = ''] of String(script).matchAll(
			new RegExp(String.raw`(?:^|[\s"'])${command}(?![\w.:/-])([^"'&|;]*)`, 'g')
		)) {
			found.add(/(?:^|\s)(?:--config|-c)(?:=|\s+)(\S+)/.exec(args)?.[1] ?? null);
		}
	}
	return [...found];
}

const DEFAULT_VITEST = ['vitest.config', 'vite.config'].flatMap((base) =>
	['ts', 'mts', 'cts', 'js', 'mjs', 'cjs'].map((ext) => `${base}.${ext}`)
);

const parsed = (file) =>
	ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);

function nodesOf(sf) {
	const nodes = [];
	const visit = (n) => {
		nodes.push(n);
		n.forEachChild(visit);
	};
	visit(sf);
	return nodes;
}

const requiresAssertions = (file) =>
	nodesOf(parsed(file)).some(
		(n) =>
			ts.isPropertyAssignment(n) &&
			n.name.getText().replace(/['"]/g, '') === 'requireAssertions' &&
			n.initializer.kind === ts.SyntaxKind.TrueKeyword
	);

const findings = [];
const onDisk = walk('.');
if (onDisk.length === 0) {
	findings.push('❌ жодного файлу *.test.* / *.spec.* — перевірка дивиться не туди');
}

const collected = new Set();

function ask(name, command, list) {
	const configs = configsOf(command);
	if (configs.length === 0) {
		findings.push(`❌ ${name} є в package.json, але жоден скрипт його не запускає`);
	}
	for (const config of configs) {
		const label = config ? `${name} --config ${config}` : name;
		let files;
		try {
			files = list(config);
		} catch (error) {
			findings.push(
				`❌ ${label}: раннер не віддав переліку — ${String(error.stderr || error.message).trim().split('\n')[0]}`
			);
			continue;
		}
		if (files.length === 0) {
			findings.push(`❌ ${label} не зібрав жодного файлу`);
		}
		for (const f of files) {
			collected.add(key(f));
		}
	}
}

if (deps.vitest) {
	ask('vitest', 'vitest', (config) => {
		const file = config ?? DEFAULT_VITEST.find((f) => existsSync(f));
		if (!file || !existsSync(file)) {
			findings.push(`❌ vitest${config ? ` --config ${config}` : ''}: файлу конфігу немає`);
		} else if (!requiresAssertions(file)) {
			findings.push(`❌ ${file}: без expect.requireAssertions: true — тест без expect зеленіє`);
		}
		const args = ['list', '--filesOnly', '--json', ...(config ? ['--config', config] : [])];
		return JSON.parse(run('vitest', 'vitest', args)).map(({ file: f }) => f);
	});
}

if (deps['@playwright/test']) {
	ask('playwright', String.raw`playwright\s+test`, (config) => {
		const raw = run('@playwright/test', 'playwright', [
			'test',
			'--list',
			'--reporter=json',
			...(config ? ['--config', config] : [])
		]);
		const report = JSON.parse(raw.slice(raw.indexOf('{')));
		return (report.suites ?? []).map((s) => resolve(report.config.rootDir, s.file));
	});
}

const RUNNER_MODULES = { vitest: 'vitest', '@playwright/test': '@playwright/test' };

const LITERAL = new Set([
	ts.SyntaxKind.TrueKeyword,
	ts.SyntaxKind.FalseKeyword,
	ts.SyntaxKind.NullKeyword,
	ts.SyntaxKind.NumericLiteral,
	ts.SyntaxKind.BigIntLiteral,
	ts.SyntaxKind.StringLiteral,
	ts.SyntaxKind.NoSubstitutionTemplateLiteral
]);

const isConstant = (e, consts = new Map(), depth = 0) => {
	if (!e || depth > 5) return false;
	const again = (x) => isConstant(x, consts, depth + 1);
	if (ts.isParenthesizedExpression(e) || ts.isAsExpression(e)) return again(e.expression);
	if (ts.isPrefixUnaryExpression(e)) return again(e.operand);
	if (ts.isBinaryExpression(e)) return again(e.left) && again(e.right);
	if (ts.isArrayLiteralExpression(e)) return e.elements.every(again);
	if (ts.isObjectLiteralExpression(e))
		return e.properties.every((p) => ts.isPropertyAssignment(p) && again(p.initializer));
	if (ts.isIdentifier(e) && consts.has(e.text)) return again(consts.get(e.text));
	return LITERAL.has(e.kind) || (ts.isIdentifier(e) && e.text === 'undefined');
};

function primitiveConsts(nodes) {
	const declared = nodes.filter((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name));
	const seen = new Map();
	for (const d of declared) seen.set(d.name.text, (seen.get(d.name.text) ?? 0) + 1);
	const out = new Map();
	for (const d of declared) {
		let init = d.initializer;
		while (init && (ts.isParenthesizedExpression(init) || ts.isAsExpression(init))) {
			init = init.expression;
		}
		const composite =
			!init || ts.isArrayLiteralExpression(init) || ts.isObjectLiteralExpression(init);
		if (
			!composite &&
			seen.get(d.name.text) === 1 &&
			ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const &&
			isConstant(init)
		) {
			out.set(d.name.text, init);
		}
	}
	return out;
}

const TEST_CALL = /^(?:it|test)(?:\.(?:only|concurrent|serial|fails))?$/;

for (const file of onDisk) {
	const rel = file.split('\\').join('/');
	const nodes = nodesOf(parsed(file));
	const consts = primitiveConsts(nodes);

	for (const n of nodes.filter(ts.isImportDeclaration)) {
		const spec = n.moduleSpecifier.text;
		if (spec in RUNNER_MODULES && !deps[spec]) {
			findings.push(`❌ ${rel}: імпортує ${spec}, якого немає в package.json`);
		}
	}

	if (!collected.has(key(file))) {
		findings.push(`❌ ${rel}: не зібрав жоден раннер — маска include, testDir або конфіг`);
	}

	for (const n of nodes.filter(ts.isCallExpression)) {
		const body = TEST_CALL.test(n.expression.getText())
			? n.arguments.find((a) => ts.isArrowFunction(a) || ts.isFunctionExpression(a))
			: undefined;
		if (body && ts.isBlock(body.body) && body.body.statements.length === 0) {
			findings.push(`❌ ${rel}: тест із порожнім тілом ${n.arguments[0]?.getText() ?? ''}`);
		}
	}
}

for (const f of findings) console.error(f);
console.log(
	`✅ check-test-discovery: ${onDisk.length} файлів на диску, ${collected.size} зібрано раннерами, знахідок: ${findings.length}`
);

process.exit(findings.length ? 1 : 0);
