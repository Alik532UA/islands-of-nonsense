// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Перевірка чисел і фактів у документації (AI-AGENT-PITFALLS-v10 § 5.5).
 * Запобігає розсинхронізації документації з реальними гейтами та скриптами.
 */
describe('Docs Numbers & Facts Consistency (AI-AGENT-PITFALLS-v10)', () => {
	const root = process.cwd();

	it('PROJECT-CONTEXT.md точно відображає кількість перевірок check-rules (41)', () => {
		const context = readFileSync(resolve(root, 'PROJECT-CONTEXT.md'), 'utf-8');
		expect(context).toContain('41 інваріантів у гейті `check:rules`');
	});

	it('PROJECT-CONTEXT.md фіксує 11 вузлів зі строгою схемою $other: false', () => {
		const context = readFileSync(resolve(root, 'PROJECT-CONTEXT.md'), 'utf-8');
		expect(context).toContain('$other: false` на 11 критичних вузлах');
	});

	it('PROJECT-CONTEXT.md описує ліміт бандлу 180 KB entry / 960 KB total gzip, що відповідає scripts/check-bundle.mjs', () => {
		const context = readFileSync(resolve(root, 'PROJECT-CONTEXT.md'), 'utf-8');
		const bundleScript = readFileSync(resolve(root, 'scripts/check-bundle.mjs'), 'utf-8');
		expect(context).toContain('960 KB gzip');
		expect(context).toContain('180 KB');
		expect(bundleScript).toContain('960');
		expect(bundleScript).toContain('180');
	});

	it('PROJECT-CONTEXT.md відповідає дійсній наявності svelte:boundary та ErrorFallback', () => {
		const layout = readFileSync(resolve(root, 'src/routes/+layout.svelte'), 'utf-8');
		expect(layout).toContain('<svelte:boundary');
		expect(layout).toContain('ErrorFallback');
		expect(existsSync(resolve(root, 'src/lib/components/ErrorFallback.svelte'))).toBe(true);
	});
});
