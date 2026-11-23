import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('VictoryModal Invariants & Post-Match Actions', () => {
	const victoryPath = path.resolve(process.cwd(), 'src/lib/components/VictoryModal.svelte');
	const content = fs.readFileSync(victoryPath, 'utf-8');

	it('contains next round and play again buttons', () => {
		expect(content).toContain('data-testid="victory-next-round-btn"');
		expect(content).toContain('Зіграти ще раз');
	});

	it('provides clean exit routes after match end to play modes and main menu', () => {
		expect(content).toContain('data-testid="victory-exit-modes-btn"');
		expect(content).toContain('data-testid="victory-exit-home-btn"');
		expect(content).toContain("goto(resolve('/play'))");
		expect(content).toContain("goto(resolve('/'))");
	});
});
