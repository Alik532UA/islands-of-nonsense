import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('PauseMenuModal Invariants & Action Buttons', () => {
	const pauseMenuPath = path.resolve(process.cwd(), 'src/lib/components/PauseMenuModal.svelte');
	const content = fs.readFileSync(pauseMenuPath, 'utf-8');

	it('contains resume button with Escape shortcut title', () => {
		expect(content).toContain('data-testid="pause-resume-btn"');
		expect(content).toContain("t('pause.resumeBtn')");
	});

	it('contains restart match and surrender buttons', () => {
		expect(content).toContain('data-testid="pause-restart-btn"');
		expect(content).toContain('data-testid="pause-surrender-btn"');
	});

	it('contains quick sound, fullscreen and language controls', () => {
		expect(content).toContain('data-testid="pause-sound-toggle"');
		expect(content).toContain('data-testid="pause-fullscreen-toggle"');
		expect(content).toContain('data-testid="pause-locale-toggle"');
	});

	it('provides clean exit routes to play modes and main menu', () => {
		expect(content).toContain('data-testid="pause-exit-modes-btn"');
		expect(content).toContain('data-testid="pause-exit-home-btn"');
		expect(content).toContain("goto(resolve('/play'))");
		expect(content).toContain("goto(resolve('/'))");
	});
});
