import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('VictoryModal Invariants & Post-Match Actions', () => {
	const victoryPath = path.resolve(process.cwd(), 'src/lib/components/VictoryModal.svelte');
	const content = fs.readFileSync(victoryPath, 'utf-8');

	it('contains next round and play again buttons', () => {
		expect(content).toContain('data-testid="victory-next-round-btn"');
		expect(content).toContain("t('victory.playAgain')");
	});

	it('provides clean exit routes after match end to play modes and main menu', () => {
		expect(content).toContain('data-testid="victory-exit-modes-btn"');
		expect(content).toContain('data-testid="victory-exit-home-btn"');
		expect(content).toContain("goto(resolve('/play'))");
		expect(content).toContain("goto(resolve('/'))");
	});

	it('determines victory/defeat, MVP, and team labels relative to localTeam (not hardcoded west)', () => {
		expect(content).toContain("localTeam = 'west'");
		expect(content).toContain('let isLocalWin = $derived(winner === localTeam);');
		expect(content).toContain('sim.getMvpBuilding(localTeam)');
		expect(content).not.toContain('isWestWin');
		expect(content).toContain("localTeam === 'east'");
		expect(content).toContain("t('victory.yourTeam')");
	});
});
