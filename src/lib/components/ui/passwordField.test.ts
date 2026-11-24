import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('PasswordField (FORM-INPUTS.md & AUTH-FORM.md)', () => {
	const componentSource = readFileSync(
		resolve(process.cwd(), 'src/lib/components/ui/PasswordField.svelte'),
		'utf-8'
	);

	it('містить індикацію та відстеження CapsLock (getModifierState)', () => {
		expect(componentSource).toContain("event.getModifierState('CapsLock')");
		expect(componentSource).toContain('showCapsWarning');
		expect(componentSource).toContain('CapsLock увімкнено');
	});

	it('містить кнопку показу/приховування пароля з іконками Eye/EyeOff', () => {
		expect(componentSource).toContain('EyeOff');
		expect(componentSource).toContain('Eye');
		expect(componentSource).toContain('-reveal-btn');
		expect(componentSource).toContain("type={visible ? 'text' : 'password'}");
	});

	it('має обовʼязкові атрибути безпеки вводу пароля (FORM-INPUTS § 3)', () => {
		expect(componentSource).toContain('autocapitalize="none"');
		expect(componentSource).toContain('autocorrect="off"');
		expect(componentSource).toContain('spellcheck="false"');
	});
});
