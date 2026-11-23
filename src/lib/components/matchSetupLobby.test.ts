import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Match Setup Lobby (/play/setup) Invariants', () => {
	const setupPagePath = path.resolve(process.cwd(), 'src/routes/play/setup/+page.svelte');
	const content = fs.readFileSync(setupPagePath, 'utf-8');

	it('contains back navigation to play modes', () => {
		expect(content).toContain('data-testid="setup-back-btn"');
		expect(content).toContain("href={resolve('/play')}");
	});

	it('provides race selection for player and bot', () => {
		expect(content).toContain('data-testid="race-option-');
		expect(content).toContain('selectedWestRace');
		expect(content).toContain('selectedEastRace');
	});

	it('provides bot difficulty and start gold configuration', () => {
		expect(content).toContain('data-testid="setup-bot-difficulty"');
		expect(content).toContain('data-testid="setup-start-gold"');
		expect(content).toContain('data-testid="setup-team-size"');
		expect(content).toContain('data-testid="setup-target-wins"');
	});

	it('stores match settings and navigates cleanly to battle', () => {
		expect(content).toContain('data-testid="setup-start-match-btn"');
		expect(content).toContain("storage.setJSON('match_settings', config)");
		expect(content).toContain("storage.setJSON('skip_start_modal', true)");
		expect(content).toContain("goto(targetUrl)");
	});
});
