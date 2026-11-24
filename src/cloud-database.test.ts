import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { RULES_STAMP } from './lib/net/rulesVersion';

const ROOT = process.cwd();

function readUtf8(rel: string): string {
	return readFileSync(resolve(ROOT, rel), 'utf8');
}

function walkFiles(dirRel: string): string[] {
	const out: string[] = [];
	const visit = (abs: string) => {
		for (const entry of readdirSync(abs)) {
			const next = join(abs, entry);
			if (statSync(next).isDirectory()) visit(next);
			else out.push(next);
		}
	};
	visit(resolve(ROOT, dirRel));
	return out;
}

describe('Cloud Database & Firebase Architecture Gate', () => {
	it('configures Firebase RTDB & Auth emulators and valid project alias', () => {
		const firebaseJson = JSON.parse(readUtf8('firebase.json'));
		const firebaserc = JSON.parse(readUtf8('.firebaserc'));

		expect(firebaseJson.database?.rules).toBe('database.rules.json');
		expect(firebaseJson.emulators?.auth?.port).toBe(9111);
		expect(firebaseJson.emulators?.database?.port).toBe(9012);
		expect(firebaserc.projects?.default).toBe('islands-of-nonsense');
	});

	it('wires Java emulator runtime + rules gate in deploy.yml and scheduled room sweep workflow', () => {
		const deployYml = readUtf8('.github/workflows/deploy.yml');
		expect(deployYml).toContain('actions/setup-java@v4');
		expect(deployYml).toContain('npm run check:rules');

		const sweepPath = resolve(ROOT, '.github/workflows/sweep-rooms.yml');
		expect(existsSync(sweepPath)).toBe(true);
		const sweepYml = readUtf8('.github/workflows/sweep-rooms.yml');
		expect(sweepYml).toContain('schedule:');
		expect(sweepYml).toContain('scripts/sweep-rooms.mjs');
	});

	it('provides real Firebase Auth + RTDB emulator allow & deny security suite', () => {
		const script = readUtf8('scripts/check-rules-emulator.mjs');
		const allowMatches = [...script.matchAll(/allow:\s*true\b/g)];
		const denyMatches = [...script.matchAll(/allow:\s*false\b/g)];
		expect(allowMatches.length).toBeGreaterThanOrEqual(15);
		expect(denyMatches.length).toBeGreaterThanOrEqual(25);

		expect(script).toContain('database,auth');
		expect(script).toContain('/__rulesVersion/');
		expect(readUtf8('database.rules.json')).toContain(RULES_STAMP);
	});

	it('keeps Firebase SDK dynamically imported outside core app shell', () => {
		const sourceFiles = walkFiles('src').filter((f) => /\.(ts|js|svelte)$/.test(f));
		for (const absPath of sourceFiles) {
			const content = readFileSync(absPath, 'utf8');
			expect(content, `${absPath} must not statically import runtime Firebase SDK`).not.toMatch(
				/^\s*import\s+(?!type\b)[^'"]+\s+from\s+['"]firebase\/(?:app|auth|database)['"]/m
			);
		}
	});
});
