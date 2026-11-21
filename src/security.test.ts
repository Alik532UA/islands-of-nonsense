import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function getSvelteFiles(dir: string, out: string[] = []): string[] {
	const entries = readdirSync(dir);
	for (const entry of entries) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			getSvelteFiles(full, out);
		} else if (entry.endsWith('.svelte')) {
			out.push(full);
		}
	}
	return out;
}

describe('Security Invariants (SECURITY-v10)', () => {
	it('svelte файли не містять несанітизованого {@html}', () => {
		const svelteFiles = getSvelteFiles('src');
		for (const file of svelteFiles) {
			const content = readFileSync(file, 'utf-8');
			expect(content).not.toMatch(/{@html\s+(?!vetted|sanitized)[a-zA-Z0-9_.]*}/);
		}
	});

	it('заборонено пряме використання window.localStorage або sessionStorage поза фасадом storage.ts', () => {
		const tsFiles: string[] = [];
		function getTsFiles(dir: string) {
			for (const entry of readdirSync(dir)) {
				const full = join(dir, entry);
				if (statSync(full).isDirectory()) {
					getTsFiles(full);
				} else if (
					entry.endsWith('.ts') &&
					!entry.endsWith('storage.ts') &&
					!entry.endsWith('.test.ts')
				) {
					tsFiles.push(full);
				}
			}
		}
		getTsFiles('src/lib');
		for (const file of tsFiles) {
			const content = readFileSync(file, 'utf-8');
			expect(content).not.toMatch(/\b(?:window\.)?(?:localStorage|sessionStorage)\./);
		}
	});

	it('заборонено використання небезпечного document.write', () => {
		const allCodeFiles: string[] = [];
		function scan(dir: string) {
			for (const entry of readdirSync(dir)) {
				const full = join(dir, entry);
				if (statSync(full).isDirectory()) {
					scan(full);
				} else if (
					(entry.endsWith('.ts') || entry.endsWith('.svelte')) &&
					!entry.endsWith('.test.ts')
				) {
					allCodeFiles.push(full);
				}
			}
		}
		scan('src');
		for (const file of allCodeFiles) {
			const content = readFileSync(file, 'utf-8');
			expect(content).not.toMatch(/\bdocument\.write\b/);
		}
	});
});
