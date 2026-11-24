import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Account Auth Form v10 Standard (AUTH-FORM.md & FORM-INPUTS.md)', () => {
	const source = readFileSync(
		resolve(process.cwd(), 'src/routes/account/+page.svelte'),
		'utf-8'
	);

	it('використовує теги <form method="post"> для відправки авторизаційних дій (§ 1)', () => {
		expect(source).toContain('method="post"');
		expect(source).toContain('data-testid="login-form"');
		expect(source).toContain('data-testid="register-form"');
	});

	it('має окремі кнопки type="submit" замість type="button" для збереження нативної валідації (§ 1)', () => {
		expect(source).toContain('data-testid="login-submit-btn"');
		expect(source).toContain('data-testid="register-submit-btn"');
		expect(source).toMatch(/<button[^>]*type="submit"[^>]*data-testid="login-submit-btn"/);
		expect(source).toMatch(/<button[^>]*type="submit"[^>]*data-testid="register-submit-btn"/);
	});

	it('використовує new-password для реєстрації та current-password для входу (§ 1)', () => {
		expect(source).toContain('autocomplete="new-password"');
		expect(source).toContain('autocomplete="current-password"');
	});

	it('містить постійні доступні регіони для сповіщень status з aria-live="polite" (§ 4)', () => {
		expect(source).toContain('role="status"');
		expect(source).toContain('aria-live="polite"');
		expect(source).toContain('data-testid="login-status"');
		expect(source).toContain('data-testid="register-status"');
	});

	it('підтримує перемикання режимів входу та реєстрації з чіткими локаторами (§ 5)', () => {
		expect(source).toContain('data-testid="login-register-btn"');
		expect(source).toContain('data-testid="register-login-btn"');
	});
});
