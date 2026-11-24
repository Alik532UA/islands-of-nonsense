import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Race Selection Countdown Overlay Invariants', () => {
	const arenaPath = path.resolve(process.cwd(), 'src/lib/components/BattleArena.svelte');
	const arenaContent = fs.readFileSync(arenaPath, 'utf-8');

	it('does NOT spoiler the opponent bot race in countdown overlay', () => {
		expect(arenaContent).not.toContain('Суперник (Бот)');
		expect(arenaContent).not.toContain('{sim.players.east.race}');
	});

	it('does NOT have redundant title or explanation text', () => {
		expect(arenaContent).not.toContain('Вибір раси королівства');
		expect(arenaContent).not.toContain('Оберіть расу або випадковий вибір');
	});

	it('does NOT have misleading separate start battle button', () => {
		expect(arenaContent).not.toContain('РОЗПОЧАТИ БІЙ ЗАРАЗ');
		expect(arenaContent).not.toContain('Розпочати бій зараз');
	});

	it('features separate top button for random race with countdown timer and +30% gold bonus', () => {
		expect(arenaContent).toContain('Dices');
		expect(arenaContent).toContain('Випадкова раса');
		expect(arenaContent).toContain('+30% золота');
		expect(arenaContent).toContain('{countdownSeconds}');
		expect(arenaContent).toContain("selectRaceAndStart('random')");
	});

	it('provides 1-click start on selecting any race', () => {
		expect(arenaContent).toContain('selectRaceAndStart(raceDef.race)');
		expect(arenaContent).toContain('finishCountdownAndStartBattle()');
	});
});
