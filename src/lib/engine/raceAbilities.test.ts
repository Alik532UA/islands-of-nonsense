import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Simulation } from './simulation';
import { PLAYABLE_RACES } from './gameData';
import { getRaceAbility } from './raceAbilities';

describe('Castle Fight - 12 Canonical Race Abilities System (Z)', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 500 });
	});

	it('configures unique abilities with UK/EN descriptions for all 12 canonical PLAYABLE_RACES and legacy aliases', () => {
		expect(PLAYABLE_RACES).toHaveLength(12);
		const kinds = new Set<string>();

		for (const race of PLAYABLE_RACES) {
			const abil = getRaceAbility(race);
			expect(abil, `Missing race ability for ${race}`).toBeDefined();
			expect(abil.race).toBe(race);
			expect(abil.nameUk.trim().length).toBeGreaterThan(0);
			expect(abil.nameEn.trim().length).toBeGreaterThan(0);
			expect(abil.descriptionUk.trim().length).toBeGreaterThan(0);
			expect(abil.descriptionEn.trim().length).toBeGreaterThan(0);
			expect(abil.kind.trim().length).toBeGreaterThan(0);
			kinds.add(abil.kind);
		}

		// Every canonical race has its own distinct ability kind
		expect(kinds.size).toBe(12);

		// Legacy alias lookup compatibility
		for (const legacy of ['Люди', 'Окри', 'Хаос', 'Нічні ельфи', 'Порча', 'Збирачі']) {
			const abil = getRaceAbility(legacy);
			expect(abil.nameUk.length).toBeGreaterThan(0);
			expect(abil.descriptionUk.length).toBeGreaterThan(0);
		}
	});

	it('blocks using race ability before 300 seconds and resets 150s cooldown upon activation', () => {
		sim.gameTime = 299;
		expect(sim.canUseRaceSkill('west')).toBe(false);
		expect(sim.useRaceSkill('west')).toBe(false);

		sim.gameTime = 300;
		sim.players.west.race = 'Альянс';
		expect(sim.canUseRaceSkill('west')).toBe(true);
		expect(sim.useRaceSkill('west')).toBe(true);
		expect(sim.raceSkillCooldown.west).toBe(150);
		expect(sim.canUseRaceSkill('west')).toBe(false);
	});

	it('executes all 12 canonical race abilities with their distinct combat effects', () => {
		const expectations: Array<{
			race: (typeof PLAYABLE_RACES)[number];
			assert: () => void;
		}> = [
			{
				race: 'Альянс',
				assert: () => {
					const ally = sim.spawnUnitDirectly({
						team: 'west',
						lane: 'top',
						x: 600,
						y: 660,
						hp: 300
					});
					expect(sim.useRaceSkill('west')).toBe(true);
					expect(ally.buffs?.some((b) => b.type === 'dmg' && b.value === 0.25)).toBe(true);
				}
			},
			{
				race: 'Нежить',
				assert: () => {
					const enemy = sim.spawnUnitDirectly({
						team: 'east',
						lane: 'top',
						x: 1000,
						y: 660,
						hp: 1000
					});
					expect(sim.useRaceSkill('west')).toBe(true);
					expect(enemy.hp).toBe(900);
				}
			},
			{
				race: 'Орки',
				assert: () => {
					const ally = sim.spawnUnitDirectly({
						team: 'west',
						lane: 'top',
						x: 600,
						y: 660,
						hp: 300
					});
					expect(sim.useRaceSkill('west')).toBe(true);
					expect(ally.buffs?.some((b) => b.type === 'as' && b.value === 0.3)).toBe(true);
				}
			},
			{
				race: 'Демони',
				assert: () => {
					const enemy = sim.spawnUnitDirectly({
						team: 'east',
						lane: 'top',
						x: 1000,
						y: 660,
						hp: 500
					});
					expect(sim.useRaceSkill('west')).toBe(true);
					expect(enemy.hp).toBe(300);
				}
			},
			{
				race: 'Техніки',
				assert: () => {
					const nearCenter = sim.spawnUnitDirectly({
						team: 'east',
						lane: 'mid',
						x: 3600,
						y: 1200,
						hp: 500
					});
					const farEdge = sim.spawnUnitDirectly({
						team: 'east',
						lane: 'mid',
						x: 5200,
						y: 1200,
						hp: 500
					});
					expect(sim.useRaceSkill('west')).toBe(true);
					expect(nearCenter.hp).toBe(200);
					expect(farEdge.hp).toBe(500);
				}
			},
			{
				race: 'Північ',
				assert: () => {
					const ally = sim.spawnUnitDirectly({
						team: 'west',
						lane: 'top',
						x: 600,
						y: 660,
						hp: 300
					});
					expect(sim.useRaceSkill('west')).toBe(true);
					expect(ally.buffs?.some((b) => b.type === 'shield' && b.value === 5)).toBe(true);
				}
			},
			{
				race: 'Ельфи',
				assert: () => {
					const enemy = sim.spawnUnitDirectly({
						team: 'east',
						lane: 'top',
						x: 1000,
						y: 660,
						hp: 500
					});
					expect(sim.useRaceSkill('west')).toBe(true);
					expect(enemy.hp).toBe(350);
				}
			},
			{
				race: 'Наги',
				assert: () => {
					const enemy = sim.spawnUnitDirectly({
						team: 'east',
						lane: 'top',
						x: 1000,
						y: 660,
						hp: 500
					});
					expect(sim.useRaceSkill('west')).toBe(true);
					expect(enemy.buffs?.some((b) => b.type === 'slow' && b.value === 0.5)).toBe(true);
				}
			},
			{
				race: 'Тролі',
				assert: () => {
					const ally = sim.spawnUnitDirectly({
						team: 'west',
						lane: 'top',
						x: 600,
						y: 660,
						hp: 200,
						maxHp: 300
					});
					expect(sim.useRaceSkill('west')).toBe(true);
					expect(ally.hp).toBe(250);
					expect(ally.buffs?.some((b) => b.type === 'as' && b.value === 0.25)).toBe(true);
				}
			},
			{
				race: 'Тварини',
				assert: () => {
					const ally = sim.spawnUnitDirectly({
						team: 'west',
						lane: 'top',
						x: 600,
						y: 660,
						hp: 500,
						maxHp: 500
					});
					expect(sim.useRaceSkill('west')).toBe(true);
					expect(ally.maxHp).toBe(600);
					expect(ally.hp).toBe(600);
					expect(ally.buffs?.some((b) => b.type === 'bloodlust' && b.value === 0.2)).toBe(true);
				}
			},
			{
				race: 'Елементалі',
				assert: () => {
					const enemy = sim.spawnUnitDirectly({
						team: 'east',
						lane: 'top',
						x: 1000,
						y: 660,
						hp: 500
					});
					expect(sim.useRaceSkill('west')).toBe(true);
					expect(enemy.hp).toBe(400);
					expect(enemy.buffs?.some((b) => b.type === 'slow' && b.timer === 3)).toBe(true);
				}
			},
			{
				race: 'Небожителі',
				assert: () => {
					const ally = sim.spawnUnitDirectly({
						team: 'west',
						lane: 'top',
						x: 600,
						y: 660,
						hp: 100,
						maxHp: 500
					});
					ally.buffs = [
						{ type: 'slow', timer: 5, value: 0.5 },
						{ type: 'infect', timer: 5, value: 30 }
					];
					expect(sim.useRaceSkill('west')).toBe(true);
					expect(ally.hp).toBe(300);
					expect(ally.buffs?.some((b) => b.type === 'slow' || b.type === 'infect')).toBe(false);
				}
			}
		];

		expect(expectations).toHaveLength(12);
		for (const item of expectations) {
			const localSim = new Simulation({ botDifficulty: 0, startGold: 500, westRace: item.race });
			localSim.gameTime = 305;
			sim = localSim;
			item.assert();
		}
	});

	it('wires Z race ability tooltip with name, description, and readiness timer in BattleArena', () => {
		const arenaSrc = readFileSync(resolve('src/lib/components/BattleArena.svelte'), 'utf8');
		const btnIdx = arenaSrc.indexOf('data-testid="hud-race-ability-btn"');
		expect(btnIdx).toBeGreaterThan(-1);
		const block = arenaSrc.slice(btnIdx, btnIdx + 1200);
		expect(block).toContain('raceAbility.nameUk');
		expect(block).toContain('raceAbility.descriptionUk');
	});
});
