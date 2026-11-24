import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('LeaveGameModal & Custom Exit Warning Flow', () => {
	const modalPath = path.resolve(process.cwd(), 'src/lib/components/LeaveGameModal.svelte');
	const arenaPath = path.resolve(process.cwd(), 'src/lib/components/BattleArena.svelte');
	const pausePath = path.resolve(process.cwd(), 'src/lib/components/PauseMenuModal.svelte');

	const modalContent = fs.readFileSync(modalPath, 'utf-8');
	const arenaContent = fs.readFileSync(arenaPath, 'utf-8');
	const pauseContent = fs.readFileSync(pausePath, 'utf-8');

	it('LeaveGameModal implements accessible dialog standards (WCAG 2.2 AA)', () => {
		expect(modalContent).toContain('role="dialog"');
		expect(modalContent).toContain('aria-modal="true"');
		expect(modalContent).toContain("aria-label={t('battle.leaveTitle')}");
		expect(modalContent).toContain("if (e.key === 'Escape')");
	});

	it('LeaveGameModal contains required action controls and test IDs', () => {
		expect(modalContent).toContain('data-testid="leave-game-modal"');
		expect(modalContent).toContain('data-testid="leave-cancel-x"');
		expect(modalContent).toContain('data-testid="leave-cancel-btn"');
		expect(modalContent).toContain('data-testid="leave-confirm-btn"');
	});

	it('LeaveGameModal uses i18n keys for localization', () => {
		expect(modalContent).toContain("t('battle.leaveTitle')");
		expect(modalContent).toContain("t('battle.leavePrompt')");
		expect(modalContent).toContain("t('battle.stayInBattle')");
		expect(modalContent).toContain("t('battle.confirmLeave')");
	});

	it('BattleArena does not use native browser confirm() and mounts LeaveGameModal', () => {
		expect(arenaContent).not.toContain("confirm('");
		expect(arenaContent).toContain('LeaveGameModal');
		expect(arenaContent).toContain('handleRequestLeave');
		expect(arenaContent).toContain('handleConfirmLeave');
		expect(arenaContent).toContain('handleCancelLeave');
		expect(arenaContent).toContain('beforeNavigate');
	});

	it('PauseMenuModal supports onRequestExit hook before exiting to modes or home', () => {
		expect(pauseContent).toContain('onRequestExit?: (targetUrl: string) => boolean');
		expect(pauseContent).toContain('if (onRequestExit && !onRequestExit(');
	});
});
