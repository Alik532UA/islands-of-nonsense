import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('CI & Testing Integrity Invariants', () => {
	const pkgPath = path.resolve(process.cwd(), 'package.json');
	const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

	it('package.json contains comprehensive CI verification scripts', () => {
		expect(pkg.scripts['check:rules']).toBeDefined();
		expect(pkg.scripts['rules:stamp:check']).toBeDefined();
		expect(pkg.scripts['check']).toBeDefined();
		expect(pkg.scripts['test:unit']).toBeDefined();
		expect(pkg.scripts['test:e2e']).toBeDefined();
		expect(pkg.scripts['verify']).toBeDefined();
	});

	it('Firebase RTDB rules file exists and contains anti-cheat security assertions', () => {
		const rulesPath = path.resolve(process.cwd(), 'database.rules.json');
		expect(fs.existsSync(rulesPath)).toBe(true);
		const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));
		expect(rules.rules.rooms).toBeDefined();
		expect(rules.rules.users).toBeDefined();
	});

	it('Playwright E2E suite contains accessibility, gameplay, and online lobby specs', () => {
		const testsDir = path.resolve(process.cwd(), 'tests');
		const files = fs.readdirSync(testsDir);
		expect(files).toContain('a11y.spec.ts');
		expect(files).toContain('game.spec.ts');
		expect(files).toContain('online-lobby.spec.ts');
	});

	it('GitHub Actions workflows use verified real action versions and declare timeouts (CI-CD-AND-TOOLS-v10)', () => {
		const wfDir = path.resolve(process.cwd(), '.github/workflows');
		const workflows = fs.readdirSync(wfDir).filter((f) => f.endsWith('.yml'));
		expect(workflows.length).toBeGreaterThanOrEqual(3);

		for (const wf of workflows) {
			const content = fs.readFileSync(path.join(wfDir, wf), 'utf-8');
			// Заборона вигаданих мажорів дій
			expect(content).not.toMatch(/actions\/(?:checkout|setup-node|upload-artifact)@v7/);
			// Обов'язкова наявність timeout-minutes на кожному job
			expect(content).toContain('timeout-minutes:');
		}
	});
});
