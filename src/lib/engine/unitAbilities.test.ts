import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { resolveUnitAbility, getUnit } from './gameData';

describe('Point 3: Unit Abilities & Passives (Ensnare, Poison, Heal, Bash, Aura)', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = new Simulation({ botDifficulty: 0, startGold: 1000 });
	});

	it('resolves correct ability archetype based on unit definition', () => {
		expect(resolveUnitAbility(getUnit('n01O'))).toBe('ensnare'); // Тролль-Капканщик
		expect(resolveUnitAbility(getUnit('u007'))).toBe('poison'); // Переносщик чумы
		expect(resolveUnitAbility(getUnit('h03C'))).toBe('heal'); // Паладин
		expect(resolveUnitAbility(getUnit('n016'))).toBe('bash'); // Магнатор
		expect(resolveUnitAbility(getUnit('o008'))).toBe('aura_dmg'); // Агрессивный Кодой
	});

	it('Ensnare ability pulls flying units to the ground', () => {
		const trapper = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 220,
			abilityType: 'ensnare'
		});

		const flyingDragon = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 600,
			y: 220,
			hp: 1000,
			flying: true
		});
		expect(flyingDragon.flying).toBe(true);

		// Step simulation to trigger trapper ensnare
		sim.step(0.05);

		expect(flyingDragon.flying).toBe(false);
		expect(flyingDragon.isEnsnared).toBe(true);
		expect(trapper.abilityCooldownTimer).toBeGreaterThan(0);
	});

	it('Heal ability restores HP to injured allies nearby', () => {
		const healer = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 220,
			abilityType: 'heal'
		});

		const injuredAlly = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 550,
			y: 220,
			hp: 100,
			maxHp: 500
		});

		sim.step(0.05);

		expect(injuredAlly.hp).toBe(165); // 100 + 65
		expect(healer.abilityCooldownTimer).toBeGreaterThan(0);
	});

	it('Poison ability applies damage-over-time and slow', () => {
		const _poisoner = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'bottom',
			x: 500,
			y: 580,
			range: 100,
			abilityType: 'poison'
		});

		const target = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'bottom',
			x: 530,
			y: 580,
			hp: 1000
		});

		sim.step(0.05); // Triggers attack

		const poisonBuff = target.buffs?.find((b) => b.type === 'poison');
		expect(poisonBuff).toBeDefined();
		expect(poisonBuff?.value).toBe(15);

		const initialHp = target.hp;
		// Step 1 second
		for (let i = 0; i < 20; i++) {
			sim.step(0.05);
		}
		expect(target.hp).toBeLessThan(initialHp);
	});

	it('Command Aura grants +15% damage bonus to nearby allies on the same lane', () => {
		sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 220,
			abilityType: 'aura_dmg'
		});

		const ally = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 550,
			y: 220,
			hp: 500
		});

		sim.step(0.05);

		const auraBuff = ally.buffs?.find((b) => b.type === 'dmg');
		expect(auraBuff).toBeDefined();
		expect(auraBuff?.value).toBe(0.15);
	});

	it('Bash ability stuns enemies and halts their actions', () => {
		const _basher = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 220,
			range: 100,
			abilityType: 'bash'
		});

		const enemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 530,
			y: 220,
			hp: 1000
		});

		// Guarantee bash proc deterministically
		const origRandom = Math.random;
		Math.random = () => 0.05;

		let stunned = false;
		for (let i = 0; i < 50; i++) {
			sim.step(0.05);
			if (enemy.isStunned || enemy.buffs?.some((b) => b.type === 'stun')) {
				stunned = true;
				break;
			}
		}
		Math.random = origRandom;
		expect(stunned).toBe(true);
	});
});
