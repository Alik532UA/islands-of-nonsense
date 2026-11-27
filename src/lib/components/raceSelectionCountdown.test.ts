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
		expect(arenaContent).toContain('name="dices"');
		expect(arenaContent).toContain("t('arena.randomRace')");
		expect(arenaContent).toContain("t('arena.bonusGold30')");
		expect(arenaContent).toContain('{countdownSeconds}');
		expect(arenaContent).toContain("selectRaceAndStart('random')");
	});

	it('does NOT display misleading pre-selected "Обрано" label before user makes a choice', () => {
		expect(arenaContent).not.toContain('<span>Обрано</span>');
		expect(arenaContent).not.toContain('Обрано');
	});

	it('provides 1-click start on selecting any race without pre-match commander gating', () => {
		expect(arenaContent).toContain('selectRaceAndStart(raceDef.race)');
		expect(arenaContent).toContain('finishCountdownAndStartBattle()');
		expect(arenaContent).not.toContain('data-testid="countdown-commander-step"');
	});
});
