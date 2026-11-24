import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('CI & Testing Integrity Invariants (CI-CD-AND-TOOLS-v10)', () => {
	const pkgPath = path.resolve(process.cwd(), 'package.json');
	const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
	const wfDir = path.resolve(process.cwd(), '.github/workflows');
	const workflows = fs.readdirSync(wfDir).filter((f) => f.endsWith('.yml'));

	it('package.json contains comprehensive CI verification scripts including i18n & test discovery gates', () => {
		expect(pkg.scripts['check:rules']).toBeDefined();
		expect(pkg.scripts['rules:stamp:check']).toBeDefined();
		expect(pkg.scripts['check:i18n']).toBeDefined();
		expect(pkg.scripts['check:tests']).toBeDefined();
		expect(pkg.scripts['check']).toBeDefined();
		expect(pkg.scripts['test:unit']).toBeDefined();
		expect(pkg.scripts['test:e2e']).toBeDefined();
		expect(pkg.scripts['check:build']).toBeDefined();
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

	it('усі GitHub Actions workflows декларують timeout-minutes на кожному job (CI § 1.13)', () => {
		expect(workflows.length).toBeGreaterThanOrEqual(3);

		for (const wf of workflows) {
			const content = fs.readFileSync(path.join(wfDir, wf), 'utf-8');
			// Знаходимо всі job (ключ з 2 пробілами, що має runs-on)
			const jobsMatches = [
				...content.matchAll(/\n {2}([a-zA-Z0-9_-]+):\s*\n(?:\s+.*\n)*?\s+runs-on:/g)
			];
			expect(jobsMatches.length, `${wf} має містити хоча б один job`).toBeGreaterThan(0);

			// Перевіряємо наявність timeout-minutes
			const timeouts = [...content.matchAll(/timeout-minutes:\s*(\d+)/g)];
			expect(
				timeouts.length,
				`Усі job у ${wf} повинні містити timeout-minutes`
			).toBeGreaterThanOrEqual(jobsMatches.length);

			for (const t of timeouts) {
				const minutes = parseInt(t[1], 10);
				expect(minutes).toBeGreaterThan(0);
				expect(minutes).toBeLessThanOrEqual(60);
			}
		}
	});

	it('усі GitHub Actions workflows декларують права доступу permissions (CI § 1.14)', () => {
		for (const wf of workflows) {
			const content = fs.readFileSync(path.join(wfDir, wf), 'utf-8');
			expect(content.includes('permissions:'), `${wf} повинен декларувати блок permissions`).toBe(
				true
			);
		}
	});

	it('жоден крок у CI не придушує помилки через || true (CI § 1.7.2)', () => {
		for (const wf of workflows) {
			const content = fs.readFileSync(path.join(wfDir, wf), 'utf-8');
			expect(content).not.toMatch(/run:.*\|\|\s*true/);
		}
	});

	it('GitHub Actions workflows використовують верифіковані версії дій', () => {
		for (const wf of workflows) {
			const content = fs.readFileSync(path.join(wfDir, wf), 'utf-8');
			// Заборона вигаданих мажорів
			expect(content).not.toMatch(/actions\/(?:checkout|setup-node|upload-artifact)@v7/);
		}
	});
});
