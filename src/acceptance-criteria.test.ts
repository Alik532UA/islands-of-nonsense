import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

function collectTestFiles(dir: string, pattern: RegExp, out: string[] = []): string[] {
	if (!existsSync(dir)) return out;
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			collectTestFiles(full, pattern, out);
		} else if (pattern.test(entry.name)) {
			out.push(path.relative(process.cwd(), full).split('\\').join('/'));
		}
	}
	return out;
}

describe('ACCEPTANCE-CRITERIA.md integrity, GWT quality, path validity & 100% test traceability', () => {
	const root = process.cwd();
	const acPath = path.resolve(root, 'ACCEPTANCE-CRITERIA.md');
	const content = readFileSync(acPath, 'utf-8');

	it('all file paths referenced in ACCEPTANCE-CRITERIA.md exist on disk', () => {
		const refs = new Set<string>();
		for (const m of content.matchAll(
			/`((?:src|scripts|tests)\/[A-Za-z0-9_/+.-]+\.[A-Za-z0-9]+)`/g
		)) {
			refs.add(m[1]);
		}
		expect(refs.size).toBeGreaterThanOrEqual(90);
		for (const relPath of refs) {
			expect(
				existsSync(path.resolve(root, relPath)),
				`Stale or missing path in ACCEPTANCE-CRITERIA.md: ${relPath}`
			).toBe(true);
		}
	});

	it('every [AC-<DOMAIN>-N] item has unique ID/title, behavioral Given/When/Then, implementation & verification suites, and matches summary matrix', () => {
		const matrixRows = [
			...content.matchAll(
				/\|\s*\*\*\d+\.\s*\[(AC-[A-Z]+)\]\*\*\s*\|[^|]+\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/g
			)
		];
		expect(matrixRows.length).toBe(13);

		const sections = content.split(/^### \[/gm).slice(1);
		expect(sections.length).toBeGreaterThanOrEqual(94);

		const seenIds = new Set<string>();
		const seenTitles = new Set<string>();
		const counts = new Map<string, { total: number; done: number; pending: number }>();

		for (const sec of sections) {
			const headerMatch = sec.match(/^((AC-[A-Z]+)-\d+)\]\s+(.+)/);
			expect(headerMatch, `Invalid AC section header: ${sec.slice(0, 60)}`).toBeTruthy();

			const fullId = headerMatch![1];
			const domain = headerMatch![2];
			const title = headerMatch![3].trim();

			expect(seenIds.has(fullId), `Duplicate AC ID found: [${fullId}]`).toBe(false);
			seenIds.add(fullId);

			expect(seenTitles.has(title), `Duplicate AC title found: ${title}`).toBe(false);
			seenTitles.add(title);

			const cur = counts.get(domain) ?? { total: 0, done: 0, pending: 0 };
			cur.total++;
			if (/^- \[x\]/m.test(sec)) cur.done++;
			else if (/^- \[ \]/m.test(sec)) cur.pending++;
			else throw new Error(`Missing [x] or [ ] status checkbox in [${fullId}]`);
			counts.set(domain, cur);

			expect(sec, `[${fullId}] must include **Статус**`).toContain('**Статус**:');
			expect(sec, `[${fullId}] must include **Пріоритет**: P0|P1|P2`).toMatch(
				/\*\*Пріоритет\*\*:\s*P[012]/
			);
			expect(sec, `[${fullId}] must include **Джерело**`).toContain('**Джерело**:');
			expect(sec, `[${fullId}] must include **Опис**`).toContain('**Опис**:');
			expect(sec, `[${fullId}] must include **Дано (Given)**`).toContain('**Дано (Given)**:');
			expect(sec, `[${fullId}] must include **Коли (When)**`).toContain('**Коли (When)**:');
			expect(sec, `[${fullId}] must include **Тоді (Then)**`).toContain('**Тоді (Then)**:');
			expect(sec, `[${fullId}] must include **Реалізація**`).toContain('**Реалізація**:');
			expect(sec, `[${fullId}] must include **Верифікація**`).toContain('**Верифікація**:');

			// Ensure behavioral Given/When/Then does not describe "running tests -> test passes"
			const whenLine = sec.match(/\*\*Коли \(When\)\*\*:\s*(.+)/)?.[1] ?? '';
			expect(
				whenLine,
				`[${fullId}] When clause must describe system/user action, not running tests`
			).not.toMatch(/запускаються\s+(?:статичні\s+)?тести/i);

			// Ensure **Верифікація** line itself cites at least one *.test.ts or *.spec.ts suite
			const verifLine = sec.match(/\*\*Верифікація\*\*:\s*(.+)/)?.[1] ?? '';
			expect(verifLine, `[${fullId}] **Верифікація** must cite *.test.ts or *.spec.ts`).toMatch(
				/\.(?:test|spec)\.ts`/
			);

			// Disallow unfinished placeholders
			expect(sec, `[${fullId}] contains unfinished placeholder`).not.toMatch(
				/\b(?:TODO|TBD|FIXME)\b/
			);
		}

		for (const row of matrixRows) {
			const domain = row[1];
			const total = Number(row[2]);
			const done = Number(row[3]);
			const pending = Number(row[4]);
			const actual = counts.get(domain);
			expect(actual, `Missing sections for matrix domain ${domain}`).toBeDefined();
			expect(actual!.total, `${domain} total mismatch`).toBe(total);
			expect(actual!.done, `${domain} done mismatch`).toBe(done);
			expect(actual!.pending, `${domain} pending mismatch`).toBe(pending);
		}
	});

	it('maintains 100% traceability: every unit test in src/ and E2E spec in tests/ is referenced in ACCEPTANCE-CRITERIA.md', () => {
		const citedTests = new Set<string>();
		for (const m of content.matchAll(/`((?:src|tests)\/[A-Za-z0-9_/+.-]+\.(?:test|spec)\.ts)`/g)) {
			citedTests.add(m[1]);
		}

		const unitTests = collectTestFiles(path.resolve(root, 'src'), /\.test\.ts$/);
		const e2eSpecs = collectTestFiles(path.resolve(root, 'tests'), /\.spec\.ts$/);

		const unlinkedUnit = unitTests.filter((f) => !citedTests.has(f));
		const unlinkedE2E = e2eSpecs.filter((f) => !citedTests.has(f));

		expect(unlinkedUnit, `Unlinked unit test files: ${unlinkedUnit.join(', ')}`).toEqual([]);
		expect(unlinkedE2E, `Unlinked E2E spec files: ${unlinkedE2E.join(', ')}`).toEqual([]);
	});
});
