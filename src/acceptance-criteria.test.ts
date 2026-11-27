import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

describe('ACCEPTANCE-CRITERIA.md integrity, path validity & test traceability', () => {
	const acPath = path.resolve(process.cwd(), 'ACCEPTANCE-CRITERIA.md');
	const content = readFileSync(acPath, 'utf-8');

	it('all file paths referenced in ACCEPTANCE-CRITERIA.md exist on disk', () => {
		const refs = new Set<string>();
		for (const m of content.matchAll(/`((?:src|scripts)\/[A-Za-z0-9_/+.-]+\.[A-Za-z0-9]+)`/g)) {
			refs.add(m[1]);
		}
		expect(refs.size).toBeGreaterThanOrEqual(60);
		for (const relPath of refs) {
			expect(
				existsSync(path.resolve(process.cwd(), relPath)),
				`Stale or missing path in ACCEPTANCE-CRITERIA.md: ${relPath}`
			).toBe(true);
		}
	});

	it('domain summary matrix counts match actual [AC-<DOMAIN>-N] items and every item has test verification', () => {
		const matrixRows = [
			...content.matchAll(
				/\|\s*\*\*\d+\.\s*\[(AC-[A-Z]+)\]\*\*\s*\|[^|]+\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/g
			)
		];
		expect(matrixRows.length).toBeGreaterThanOrEqual(13);

		const sections = content.split(/^### \[/gm).slice(1);
		expect(sections.length).toBeGreaterThanOrEqual(70);

		const counts = new Map<string, { total: number; done: number; pending: number }>();
		for (const sec of sections) {
			const idMatch = sec.match(/^(AC-[A-Z]+)-\d+\]/);
			expect(idMatch, `Invalid AC section header: ${sec.slice(0, 60)}`).toBeTruthy();
			const domain = idMatch![1];
			const cur = counts.get(domain) ?? { total: 0, done: 0, pending: 0 };
			cur.total++;
			if (/^- \[x\]/m.test(sec)) cur.done++;
			else if (/^- \[ \]/m.test(sec)) cur.pending++;
			else throw new Error(`Missing [x] or [ ] status checkbox in [${idMatch![0]}`);
			counts.set(domain, cur);

			expect(sec, `[${idMatch![0]} must include Given/When/Then criteria`).toContain('**Критерій');
			expect(sec, `[${idMatch![0]} must cite at least one *.test.ts suite`).toMatch(/\.test\.ts`/);
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
});
