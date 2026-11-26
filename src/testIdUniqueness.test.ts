import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

function collectSvelteFiles(dir: string): string[] {
	const results: string[] = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...collectSvelteFiles(fullPath));
		} else if (entry.isFile() && entry.name.endsWith('.svelte')) {
			results.push(fullPath);
		}
	}
	return results;
}

describe('DATA-TESTID-UNIQUENESS: All data-testid attributes across Svelte templates must be unique', () => {
	it('has zero duplicate data-testid attributes across all src/**/*.svelte files', () => {
		const srcRoot = path.resolve('src');
		const svelteFiles = collectSvelteFiles(srcRoot);
		expect(svelteFiles.length).toBeGreaterThan(0);

		const seen = new Map<string, string[]>();
		const testIdRegex = /data-testid="([^"]+)"/g;

		for (const filePath of svelteFiles) {
			const relPath = path.relative(srcRoot, filePath).replace(/\\/g, '/');
			const content = fs.readFileSync(filePath, 'utf8');
			const lines = content.split(/\r?\n/);

			for (let idx = 0; idx < lines.length; idx++) {
				const line = lines[idx];
				testIdRegex.lastIndex = 0;
				let match: RegExpExecArray | null;
				while ((match = testIdRegex.exec(line)) !== null) {
					const id = match[1];
					const loc = `${relPath}:${idx + 1}`;
					const list = seen.get(id) ?? [];
					list.push(loc);
					seen.set(id, list);
				}
			}
		}

		const duplicates = [...seen.entries()]
			.filter(([, locs]) => locs.length > 1)
			.map(([id, locs]) => `${id} -> [${locs.join(', ')}]`);

		expect(duplicates).toEqual([]);
	});
});
