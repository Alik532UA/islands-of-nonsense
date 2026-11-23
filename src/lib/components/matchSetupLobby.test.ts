import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Match Setup Lobby (/play/setup) Invariants', () => {
	const setupPagePath = path.resolve(process.cwd(), 'src/routes/play/setup/+page.svelte');
	const content = fs.readFileSync(setupPagePath, 'utf-8');

	it('contains a single canonical back navigation to play modes without bottom duplicates', () => {
		expect(content).toContain('data-testid="setup-back-btn"');
		expect(content).toContain("href={resolve('/play')}");
		// No redundant cancel button at the bottom
		expect(content).not.toContain('Скасувати і вийти');
	});

	it('provides race selection without redundant kingdom titles', () => {
		expect(content).toContain('data-testid="race-option-');
		expect(content).toContain('selectedWestRace');
		expect(content).toContain('selectedEastRace');
		// Clean names: no "Королівство <Раса>" duplication
		expect(content).not.toContain('Королівство');
	});

	it('provides the full list of races for the bot opponent without truncating', () => {
		expect(content).not.toContain('.slice(0, 7)');
		expect(content).toContain('data-testid="bot-race-random"');
		expect(content).toContain('data-testid="bot-race-');
	});

	it('uses interactive button-pill controls instead of dropdown selects', () => {
		expect(content).not.toContain('<select');
		expect(content).not.toContain('<option');
		expect(content).toContain('data-testid="setup-bot-difficulty"');
		expect(content).toContain('data-testid="setup-start-gold"');
		expect(content).toContain('data-testid="setup-team-size"');
		expect(content).toContain('data-testid="setup-target-wins"');
		expect(content).toContain('data-testid="difficulty-btn-');
		expect(content).toContain('data-testid="gold-btn-');
		expect(content).toContain('data-testid="teamsize-btn-');
		expect(content).toContain('data-testid="targetwins-btn-');
	});

	it('stores match settings and navigates cleanly to battle', () => {
		expect(content).toContain('data-testid="setup-start-match-btn"');
		expect(content).toContain("storage.setJSON('match_settings', config)");
		expect(content).toContain("storage.setJSON('skip_start_modal', true)");
		expect(content).toContain('goto(targetUrl)');
	});
});
