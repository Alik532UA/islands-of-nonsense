import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Stale Build & Versioning Protection (VERSIONING-v10 § 6)', () => {
	const root = process.cwd();

	it('vite.config.ts налаштовує опитування нової версії (pollInterval: 60000)', () => {
		const viteConfig = readFileSync(resolve(root, 'vite.config.ts'), 'utf-8');
		expect(viteConfig).toContain('pollInterval: 60000');
	});

	it('+layout.svelte перехоплює навігацію при наявності нової версії (updated.current)', () => {
		const layout = readFileSync(resolve(root, 'src/routes/+layout.svelte'), 'utf-8');
		expect(layout).toContain('beforeNavigate');
		expect(layout).toContain('updated');
		expect(layout).toContain('location.href = to.url.href');
	});

	it('hooks.client.ts обробляє збої динамічних імпортів із захистом від циклу релоаду', () => {
		const hooksPath = resolve(root, 'src/hooks.client.ts');
		expect(existsSync(hooksPath)).toBe(true);
		const hooks = readFileSync(hooksPath, 'utf-8');
		expect(hooks).toContain('handleError');
		expect(hooks).toContain('Failed to fetch dynamically imported module');
		expect(hooks).toContain('stale_reload');
		expect(hooks).toContain('storage.get');
		expect(hooks).toContain('storage.set');
	});
});
