import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Match Setup Lobby (/play/setup) & MatchConfigModal Invariants', () => {
	const setupPagePath = path.resolve(process.cwd(), 'src/routes/play/setup/+page.svelte');
	const configModalPath = path.resolve(process.cwd(), 'src/lib/components/MatchConfigModal.svelte');

	const setupContent = fs.readFileSync(setupPagePath, 'utf-8');
	const modalContent = fs.readFileSync(configModalPath, 'utf-8');

	it('contains a single canonical back navigation to play modes without bottom duplicates', () => {
		expect(setupContent).toContain('data-testid="setup-back-btn"');
		expect(setupContent).toContain("href={resolve('/play')}");
		expect(setupContent).not.toContain('Скасувати і вийти');
	});

	it('provides Progressive Disclosure summary card with interactive pills and configuration button', () => {
		expect(setupContent).toContain('data-testid="match-lobby-card"');
		expect(setupContent).toContain('data-testid="setup-config-btn"');
		expect(setupContent).toContain('data-testid="setup-start-match-btn"');
		expect(setupContent).toContain('data-testid="summary-pill-difficulty"');
		expect(setupContent).toContain('data-testid="summary-pill-gold"');
		expect(setupContent).toContain('data-testid="summary-pill-team"');
		expect(setupContent).toContain('data-testid="summary-pill-wins"');
		expect(setupContent).toContain('data-testid="summary-pill-fog"');
		expect(setupContent).toContain('data-testid="summary-pill-coins"');
	});

	it('MatchConfigModal provides in-game choice as default alongside full race selection without redundant kingdom titles', () => {
		expect(modalContent).toContain('data-testid="race-option-in_game"');
		expect(modalContent).toContain('data-testid="race-option-random"');
		expect(modalContent).toContain('data-testid="race-option-');
		expect(modalContent).toContain('data-testid="bot-race-random"');
		expect(modalContent).toContain('data-testid="bot-race-');
		expect(modalContent).not.toContain('Королівство');
	});

	it('MatchConfigModal uses interactive button-pill controls instead of dropdown selects', () => {
		expect(modalContent).not.toContain('<select');
		expect(modalContent).not.toContain('<option');
		expect(modalContent).toContain('data-testid="setup-bot-difficulty"');
		expect(modalContent).toContain('data-testid="setup-start-gold"');
		expect(modalContent).toContain('data-testid="setup-team-size"');
		expect(modalContent).toContain('data-testid="setup-target-wins"');
		expect(modalContent).toContain('data-testid="difficulty-btn-');
		expect(modalContent).toContain('data-testid="gold-btn-');
		expect(modalContent).toContain('data-testid="teamsize-btn-');
		expect(modalContent).toContain('data-testid="targetwins-btn-');
	});

	it('stores match settings and navigates cleanly to battle', () => {
		expect(setupContent).toContain('data-testid="setup-start-match-btn"');
		expect(setupContent).toContain("storage.setJSON('match_settings', config)");
		expect(setupContent).toContain('goto(targetUrl)');
	});
});
