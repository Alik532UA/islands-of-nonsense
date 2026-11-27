import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from './simulation';
import { resolveUnitAbility, getUnit, getUnitAbilities } from './gameData';

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
		const origNextRandom = sim.nextRandom.bind(sim);
		sim.nextRandom = () => 0.05;

		let stunned = false;
		for (let i = 0; i < 50; i++) {
			sim.step(0.05);
			if (enemy.isStunned || enemy.buffs?.some((b) => b.type === 'stun')) {
				stunned = true;
				break;
			}
		}
		sim.nextRandom = origNextRandom;
		expect(stunned).toBe(true);
	});

	it('Bloodlust ability casts on unbuffed allies granting attack and move speed', () => {
		const shaman = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 220,
			abilityType: 'bloodlust'
		});

		const grunt = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 530,
			y: 220,
			hp: 600
		});

		sim.step(0.05);

		const buff = grunt.buffs?.find((b) => b.type === 'bloodlust');
		expect(buff).toBeDefined();
		expect(buff?.value).toBe(0.4);
		expect(shaman.abilityCooldownTimer).toBeGreaterThan(0);
	});

	it('Frost attack applies chill slowing target move and attack speed', () => {
		sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 220,
			range: 100,
			frostOnHit: true
		});

		const enemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 530,
			y: 220,
			hp: 1000
		});

		sim.step(0.05); // Triggers melee attack

		const frostBuff = enemy.buffs?.find((b) => b.type === 'frost');
		expect(frostBuff).toBeDefined();
		expect(frostBuff?.value).toBe(0.35);
	});

	it('Reincarnation revives unit with full HP upon lethal damage once', () => {
		const tauren = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 220,
			hp: 100,
			maxHp: 1000,
			hasReincarnated: false,
			abilities: [
				{
					id: 'abil_reincarnation',
					nameUk: 'Переродження',
					nameEn: 'Reincarnation',
					type: 'reincarnation',
					isPassive: true,
					descriptionUk: '',
					descriptionEn: ''
				}
			]
		});

		// Deal lethal damage to tauren
		sim.combatSystem.applyUnitDamage(tauren, 200, 'chaos', 'east', false);

		// Must have revived back to max HP and marked as reincarnated!
		expect(tauren.state).not.toBe('DEAD');
		expect(tauren.hp).toBe(1000);
		expect(tauren.hasReincarnated).toBe(true);

		// Next lethal damage should now kill it
		sim.combatSystem.applyUnitDamage(tauren, 2000, 'chaos', 'east', false);
		expect(tauren.state).toBe('DEAD');
	});

	it('Thorns reflects melee damage back to the attacker', () => {
		const _turtle = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 220,
			hp: 1000,
			reflectDamagePct: 0.25
		});

		const attacker = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 530,
			y: 220,
			range: 100,
			damage: 100,
			hp: 500
		});

		const initialAttackerHp = attacker.hp;
		sim.step(0.05); // Attacker strikes turtle in melee

		expect(attacker.hp).toBeLessThan(initialAttackerHp);
	});

	it('Thunderbolt damages and stuns target', () => {
		const stormCaller = sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 220,
			abilityType: 'thunderbolt'
		});

		const enemy = sim.spawnUnitDirectly({
			team: 'east',
			lane: 'top',
			x: 650,
			y: 220,
			hp: 500
		});

		sim.step(0.05);

		expect(enemy.hp).toBeLessThan(500);
		expect(enemy.isStunned).toBe(true);
		expect(stormCaller.abilityCooldownTimer).toBeGreaterThan(0);
	});

	it('Chain Lightning strikes multiple enemies in chain', () => {
		sim.spawnUnitDirectly({
			team: 'west',
			lane: 'top',
			x: 500,
			y: 220,
			abilityType: 'chain_lightning'
		});

		const e1 = sim.spawnUnitDirectly({ team: 'east', lane: 'top', x: 600, y: 220, hp: 500 });
		const e2 = sim.spawnUnitDirectly({ team: 'east', lane: 'top', x: 650, y: 220, hp: 500 });
		const e3 = sim.spawnUnitDirectly({ team: 'east', lane: 'top', x: 700, y: 220, hp: 500 });

		sim.step(0.05);

		expect(e1.hp).toBeLessThan(500);
		expect(e2.hp).toBeLessThan(500);
		expect(e3.hp).toBeLessThan(500);
	});

	it('getUnitAbilities returns rich abilities parsed from raw Warcraft III data', () => {
		const paladin = getUnit('h03C'); // Паладин
		const abils = getUnitAbilities(paladin);
		expect(abils.length).toBeGreaterThan(0);
		expect(
			abils.some((a) => a.type === 'heal' || a.type === 'inner_fire' || a.type === 'aura_armor')
		).toBe(true);
	});

	it('maps all WC3 reference unit spell codes (Siren, Banshee, Warlock, Faerie Dragon, Snow Queen, Enchantress, etc.)', () => {
		const expected: Array<[string, string[]]> = [
			['n00S', ['dispel', 'raise_dead']], // Сирена
			['u001', ['curse', 'slow']], // Банші
			['n005', ['thunderbolt']], // Чорнокнижник
			['e000', ['heal', 'mana_burn']], // Чарівний дракончик
			['n014', ['frost', 'slow', 'thunderbolt', 'aura_armor']], // Снігова королева
			['h07B', ['heal', 'chain_lightning']], // Заклинателька
			['h00U', ['curse']], // Грифон-воїн
			['n01Y', ['thunderbolt']], // Яструбиний мисливець
			['o003', ['inner_fire']], // Троль-мисливець
			['n01G', ['aura_speed']], // Лавовий Пес
			['e007', ['ensnare']] // Друїд
		];
		for (const [unitId, types] of expected) {
			const def = getUnit(unitId);
			expect(def, `Missing unit ${unitId}`).toBeDefined();
			const abilTypes = new Set(getUnitAbilities(def).map((a) => a.type));
			for (const t of types) {
				expect(abilTypes.has(t as never), `Unit ${unitId} (${def?.name}) missing ${t}`).toBe(true);
			}
		}
	});
});
