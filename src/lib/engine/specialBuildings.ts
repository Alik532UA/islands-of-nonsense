import type { Simulation } from './simulation';
import type { ActiveBuff, AttackType, Building, MatchTeam, Unit } from './types';
import { getUnit } from './gameData';

export type SpecialAuraKind =
	| 'armor'
	| 'dmg'
	| 'as'
	| 'ms'
	| 'bloodlust'
	| 'heal'
	| 'mana'
	| 'slow_enemies'
	| 'frost_enemies'
	| 'weakness_enemies'
	| 'burn_enemies';

export interface SpecialAuraRule {
	kind: SpecialAuraKind;
	value: number;
	radius: number;
}

export interface SpecialPeriodicStrike {
	interval: number;
	radius: number;
	maxTargets: number;
	damage: number;
	attackType: AttackType;
	splashRadius?: number;
	chainLightning?: boolean;
	manaBurn?: number;
	stunDuration?: number;
	dispelEnemies?: boolean;
	applyBuff?: {
		type: ActiveBuff['type'];
		timer: number;
		value: number;
	};
	applyBuff2?: {
		type: ActiveBuff['type'];
		timer: number;
		value: number;
	};
	labelUk: string;
}

export interface SpecialPeriodicSupport {
	interval: number;
	radius: number;
	maxTargets: number;
	heal?: number;
	dispelDebuffs?: 'all' | 'chill';
	buff?: {
		type: ActiveBuff['type'];
		timer: number;
		value: number;
	};
	summonUnitId?: string;
	summonCount?: number;
	consumeCorpseForBonus?: boolean;
	bonusGold?: number;
	bonusLumber?: number;
	repairBuildingsHp?: number;
	repairCastleHp?: number;
	labelUk: string;
}

export interface SpecialBuildingSpec {
	id: string;
	descriptionUk: string;
	descriptionEn: string;
	auras?: SpecialAuraRule[];
	periodicStrike?: SpecialPeriodicStrike;
	periodicSupport?: SpecialPeriodicSupport;
	allyDeathResurrectChance?: number;
}

const DISPELLABLE_DEBUFFS: ReadonlySet<ActiveBuff['type']> = new Set([
	'slow',
	'frost',
	'weakness',
	'curse',
	'poison',
	'infect',
	'polymorph',
	'cyclone',
	'banish',
	'heal_block',
	'ensnare'
]);

const CHILL_DEBUFFS: ReadonlySet<ActiveBuff['type']> = new Set(['frost', 'slow']);

const ENEMY_STRIPPABLE_BUFFS: ReadonlySet<ActiveBuff['type']> = new Set([
	'dmg',
	'as',
	'ms',
	'shield',
	'armor_buff',
	'inner_fire',
	'bloodlust',
	'mana_shield'
]);

/** Refreshes an active buff on a unit without creating duplicate entries of the same type. */
export function applyBuffToUnit(
	unit: Unit,
	type: ActiveBuff['type'],
	timer: number,
	value: number
): void {
	unit.buffs = unit.buffs || [];
	const existing = unit.buffs.find((b) => b.type === type && b.value === value);
	if (existing) {
		existing.timer = Math.max(existing.timer, timer);
	} else {
		unit.buffs.push({ type, timer, value });
	}
}

export const SPECIAL_BUILDING_SPECS: Record<string, SpecialBuildingSpec> = {
	// Universal Economy / Utility Buildings
	cg10_shop: {
		id: 'cg10_shop',
		descriptionUk:
			'Відкриває Магазин замку (B): сувої, зілля, Золотий Сир (+ліміт їжі для легендарних споруд) та захисні предмети.',
		descriptionEn:
			'Unlocks the Castle Shop (B): scrolls, potions, Golden Cheese (+food cap for legendary buildings), and citadel items.'
	},
	cg11_forge: {
		id: 'cg11_forge',
		descriptionUk:
			'Відкриває Кузню (K): дослідження атаки (+8% шкоди/рів.), броні (+1/рів.) та економіки (+10% золота/рів.).',
		descriptionEn:
			'Unlocks the War Forge (K): research attack (+8% dmg/lvl), armor (+1/lvl), and economy (+10% gold/lvl).'
	},
	cg12_commander: {
		id: 'cg12_commander',
		descriptionUk:
			'Дім командира (C): дозволяє безкоштовно обрати пасивного командира для армії та економіки (повторна зміна: 250g + 250w, КД 30с).',
		descriptionEn:
			'Command Hall (C): pick a free passive commander for army & economy (re-pick costs 250g + 250w, 30s CD).'
	},
	h008: {
		id: 'h008',
		descriptionUk:
			'Перша Скриня збільшує періодичний дохід золота на +20% (кожна додаткова сумується). Дуже крихка (650 HP).',
		descriptionEn:
			'Each Treasure Box increases periodic gold income by +20% (stackable). Very fragile (650 HP).'
	},
	cg09_repair: {
		id: 'cg09_repair',
		descriptionUk: 'Ремонтний пункт: автоматично відновлює здоров’я вашого замку (+25 HP/с).',
		descriptionEn: 'Repair Station: automatically restores your castle health (+25 HP/s).'
	},
	cg07_recycler: {
		id: 'cg07_recycler',
		descriptionUk:
			'Утилізатор: повертає +4 золота за кожного загиблого союзного бійця (складається до +8g від 2 споруд).',
		descriptionEn:
			'Recycler: refunds +4 gold per fallen friendly unit (stacks up to +8g from 2 Recyclers).'
	},
	h045_altar: {
		id: 'h045_altar',
		descriptionUk: 'Аура захисту: дарує +3 до броні всім дружнім бійцям у радіусі 600 px.',
		descriptionEn: 'Protection aura: grants +3 armor to allied units within 600 px.'
	},
	h046_fountain: {
		id: 'h046_fountain',
		descriptionUk: 'Аура зцілення: відновлює +25 HP/с усім дружнім бійцям у радіусі 600 px.',
		descriptionEn: 'Healing aura: restores +25 HP/s to allied units within 600 px.'
	},
	h047_obelisk: {
		id: 'h047_obelisk',
		descriptionUk: 'Аура мани: відновлює +10 мани/с усім дружнім заклиначам у радіусі 600 px.',
		descriptionEn: 'Mana aura: restores +10 mana/s to allied casters within 600 px.'
	},

	// Alliance
	h001: {
		id: 'h001',
		descriptionUk:
			'Далекобійна облогова гармата: 110 облогової шкоди по площі (радіус 120 px), дальність 950 px, КД 2.2с.',
		descriptionEn:
			'Long-range siege artillery: 110 siege splash damage (120 px radius), 950 px range, 2.2s CD.'
	},
	h010: {
		id: 'h010',
		descriptionUk:
			'Бойова аура на все поле бою: дарує всім союзникам +12% до шкоди та +3 до броні.',
		descriptionEn:
			'Battlefield-wide warhorn aura: grants all allies +12% attack damage and +3 armor.',
		auras: [
			{ kind: 'dmg', value: 0.12, radius: 9999 },
			{ kind: 'armor', value: 3, radius: 9999 }
		]
	},
	h05G: {
		id: 'h05G',
		descriptionUk:
			'Легендарний храм: аура +25% швидкості атаки та +12% шкоди всім союзникам і прикликає Паладина кожні 28с.',
		descriptionEn:
			'Legendary temple: global +25% attack speed & +12% damage aura for allies, and summons a Paladin every 28s.',
		auras: [
			{ kind: 'as', value: 0.25, radius: 9999 },
			{ kind: 'dmg', value: 0.12, radius: 9999 }
		],
		periodicSupport: {
			interval: 28,
			radius: 9999,
			maxTargets: 1,
			summonUnitId: 'h03C',
			summonCount: 1,
			labelUk: '+Паладин!'
		}
	},

	// Naga
	h00N: {
		id: 'h00N',
		descriptionUk:
			'Легендарний Вартовий: кожні 7с б’є Цунамі (125 маг. шкоди по 6 ворогах + холод 35% на 3с) і прискорює союзників.',
		descriptionEn:
			'Legendary Guardian: every 7s unleashes Tsunami (125 magic dmg to 6 enemies + 35% frost slow 3s) & hastes nearby allies.',
		periodicStrike: {
			interval: 7,
			radius: 850,
			maxTargets: 6,
			damage: 125,
			attackType: 'magic',
			applyBuff: { type: 'frost', timer: 3.0, value: 0.35 },
			labelUk: 'Цунамі!'
		},
		periodicSupport: {
			interval: 7,
			radius: 850,
			maxTargets: 6,
			buff: { type: 'as', timer: 4.0, value: 0.25 },
			labelUk: '+Прилив'
		}
	},
	h00M: {
		id: 'h00M',
		descriptionUk:
			'Кожні 5с зцілює до 4 поранених союзників (+75 HP, 1400 px) і проклинає до 3 ворогів (33% промаху, -25% шкоди на 4с).',
		descriptionEn:
			'Every 5s heals up to 4 wounded allies (+75 HP within 1400 px) and curses up to 3 enemies (33% miss, -25% dmg for 4s).',
		periodicSupport: {
			interval: 5,
			radius: 1400,
			maxTargets: 4,
			heal: 75,
			labelUk: '+75 HP'
		},
		periodicStrike: {
			interval: 5,
			radius: 900,
			maxTargets: 3,
			damage: 0,
			attackType: 'magic',
			applyBuff: { type: 'curse', timer: 4.0, value: 0.33 },
			applyBuff2: { type: 'weakness', timer: 4.0, value: 0.25 },
			labelUk: 'Пісня Сирен'
		}
	},
	h00I: {
		id: 'h00I',
		descriptionUk:
			'Аура +8 мани/с союзним магам (900 px) та магічні промені кожні 4с по 2 ворогах (90 маг. шкоди + 20 спалення мани).',
		descriptionEn:
			'Restores +8 mana/s to allied casters (900 px) and fires twin arcane beams every 4s (90 magic dmg + 20 mana burn to 2 enemies).',
		auras: [{ kind: 'mana', value: 8, radius: 900 }],
		periodicStrike: {
			interval: 4,
			radius: 750,
			maxTargets: 2,
			damage: 90,
			attackType: 'magic',
			manaBurn: 20,
			chainLightning: true,
			labelUk: 'Промінь'
		}
	},
	h00G: {
		id: 'h00G',
		descriptionUk:
			'Приливний захисник (вежа): атака 52 (pierce), дальність 500 px, КД 1с; аура відновлення +8 HP/с союзникам поруч.',
		descriptionEn:
			'Tidal Defender (tower): 52 pierce attack, 500 px range, 1s CD; restores +8 HP/s to nearby allies.',
		auras: [{ kind: 'heal', value: 8, radius: 600 }]
	},

	// Demons / Chaos
	h05I: {
		id: 'h05I',
		descriptionUk:
			'Сторожові руїни Хаосу: кожні 2.2с вражають до 2 ворогів у радіусі 680 px по 75 шкоди типу Хаос.',
		descriptionEn:
			'Chaos ruins: every 2.2s blasts up to 2 enemies within 680 px for 75 chaos damage.',
		periodicStrike: {
			interval: 2.2,
			radius: 680,
			maxTargets: 2,
			damage: 75,
			attackType: 'chaos',
			chainLightning: true,
			labelUk: 'Хаос'
		}
	},
	h01M: {
		id: 'h01M',
		descriptionUk:
			'Кожні 6с розсіює негативні чари з 6 союзників і завдає 110 маг. шкоди по площі 5 ворогам (знімає бафи).',
		descriptionEn:
			'Every 6s dispels debuffs from 6 allies and blasts 5 enemies in 220 px AoE for 110 magic dmg while stripping buffs.',
		periodicSupport: {
			interval: 6,
			radius: 900,
			maxTargets: 6,
			dispelDebuffs: 'all',
			labelUk: 'Очищення'
		},
		periodicStrike: {
			interval: 6,
			radius: 850,
			maxTargets: 5,
			damage: 110,
			attackType: 'magic',
			splashRadius: 220,
			dispelEnemies: true,
			labelUk: 'Стирання!'
		}
	},
	h01E: {
		id: 'h01E',
		descriptionUk:
			'Легендарний храм: глобальна аура +15% шкоди союзникам та Метеоритний дощ кожні 8с (140 хаос. шкоди по площі + стан 1.2с).',
		descriptionEn:
			'Legendary temple: global +15% dmg aura and calls Meteor Rain every 8s (140 chaos AoE dmg + 1.2s stun to 4 enemies).',
		auras: [{ kind: 'dmg', value: 0.15, radius: 9999 }],
		periodicStrike: {
			interval: 8,
			radius: 9999,
			maxTargets: 4,
			damage: 140,
			attackType: 'chaos',
			splashRadius: 140,
			stunDuration: 1.2,
			labelUk: 'Метеор!'
		}
	},
	h01F: {
		id: 'h01F',
		descriptionUk: 'Око Безодні (вежа): атака 62 хаос. шкоди, дальність 480 px, КД 1.1с.',
		descriptionEn: 'Eye of the Abyss (tower): 62 chaos attack, 480 px range, 1.1s CD.'
	},
	h006: {
		id: 'h006',
		descriptionUk: 'Вартова вежа: оборонна вежа (45 pierce шкоди, 500 px, КД 1.0с).',
		descriptionEn: 'Guard Tower: defensive watchtower (45 pierce dmg, 500 px, 1.0s CD).'
	},
	h014: {
		id: 'h014',
		descriptionUk:
			'Ельфійська лучна вежа: швидка стрільба по землі й повітрю (65 pierce шкоди, 550 px, КД 0.85с).',
		descriptionEn:
			'Elven Archer Tower: rapid anti-ground & air fire (65 pierce dmg, 550 px, 0.85s CD).'
	},
	h01O: {
		id: 'h01O',
		descriptionUk: 'Некротичний зикурат: магічна атака 50 шкоди, 520 px, КД 0.9с.',
		descriptionEn: 'Necrotic Ziggurat: magic defense tower (50 magic dmg, 520 px, 0.9s CD).'
	},
	o000: {
		id: 'o000',
		descriptionUk: 'Сторожова вежа орків: атака 55 pierce шкоди, 500 px, КД 1.1с.',
		descriptionEn: 'Orc Watch Tower: defensive tower (55 pierce dmg, 500 px, 1.1s CD).'
	},
	h03Q: {
		id: 'h03Q',
		descriptionUk:
			'Крижана шпиляста вежа: 50 маг. шкоди + заморозка ворогів (-35% швидкості), 480 px, КД 1.0с.',
		descriptionEn: 'Frost Spire: 50 magic dmg + chills targets (-35% speed), 480 px, 1.0s CD.'
	},
	n01J: {
		id: 'n01J',
		descriptionUk: 'Грозовий Захисник: атака Хаос 48 шкоди, 480 px, КД 1.0с.',
		descriptionEn: 'Storm Protector: Chaos defense tower (48 chaos dmg, 480 px, 1.0s CD).'
	},
	h073: {
		id: 'h073',
		descriptionUk:
			'Древо-захисник: потужні облогові валуни по площі (70 siege шкоди, 520 px, КД 1.4с).',
		descriptionEn: 'Ancient Protector: splash siege boulders (70 siege dmg, 520 px, 1.4s CD).'
	},
	h05L: {
		id: 'h05L',
		descriptionUk: 'Тесла-вежа: швидкісні електричні розряди (60 magic шкоди, 460 px, КД 0.95с).',
		descriptionEn: 'Tesla Tower: rapid electric discharges (60 magic dmg, 460 px, 0.95s CD).'
	},
	cg0a: {
		id: 'cg0a',
		descriptionUk:
			'Сміттєва баліста: облоговий сплеш-постріл по площі (58 siege шкоди, 520 px, КД 1.3с).',
		descriptionEn: 'Scrap Ballista: splash siege bolts (58 siege dmg, 520 px, 1.3s CD).'
	},

	// Elves & Celestials
	h005: {
		id: 'h005',
		descriptionUk:
			'Кожні 4.5с опромінює до 3 ворогів у радіусі 750 px (85 маг. шкоди + ослаблення: -25% шкоди та швидкості на 4с).',
		descriptionEn:
			'Every 4.5s strikes up to 3 enemies within 750 px for 85 magic dmg and weakens them (-25% dmg & speed for 4s).',
		periodicStrike: {
			interval: 4.5,
			radius: 750,
			maxTargets: 3,
			damage: 85,
			attackType: 'magic',
			applyBuff: { type: 'weakness', timer: 4.0, value: 0.25 },
			labelUk: 'Світло!'
		}
	},
	h00Z: {
		id: 'h00Z',
		descriptionUk:
			'Захисна аура в радіусі 900 px: +3 до броні та +6 мани/с союзникам, а також кожні 6с знімає дебафи з 4 бійців.',
		descriptionEn:
			'Protective aura (900 px): +3 armor & +6 mana/s to allies, and cleanses debuffs from 4 allies every 6s.',
		auras: [
			{ kind: 'armor', value: 3, radius: 900 },
			{ kind: 'mana', value: 6, radius: 900 }
		],
		periodicSupport: {
			interval: 6,
			radius: 900,
			maxTargets: 4,
			dispelDebuffs: 'all',
			labelUk: 'Щит!'
		}
	},
	h059: {
		id: 'h059',
		descriptionUk:
			'Легендарний храм: кожні 26с прикликає Аватара Помсти та дарує глобальний 20% шанс воскресити загиблого союзного бійця.',
		descriptionEn:
			'Legendary temple: summons an Avatar of Vengeance every 26s and grants a global 20% chance to resurrect fallen allies.',
		periodicSupport: {
			interval: 26,
			radius: 9999,
			maxTargets: 1,
			summonUnitId: 'e00A',
			summonCount: 1,
			labelUk: '+Аватар!'
		},
		allyDeathResurrectChance: 0.2
	},
	h08P: {
		id: 'h08P',
		descriptionUk:
			'Срібна Галявина: зцілює союзників (+18 HP/с в радіусі 1100 px) та кожні 7с благословляє 4 бійців (+швидкість атаки і зняття отрути).',
		descriptionEn:
			'Silver Glade: heals allies (+18 HP/s within 1100 px) and every 7s blesses 4 allies (+attack speed & cleanse debuffs).',
		auras: [{ kind: 'heal', value: 18, radius: 1100 }],
		periodicSupport: {
			interval: 7,
			radius: 1100,
			maxTargets: 4,
			dispelDebuffs: 'all',
			buff: { type: 'as', timer: 5.0, value: 0.25 },
			labelUk: 'Благословення'
		}
	},

	// Undead
	h01P: {
		id: 'h01P',
		descriptionUk:
			'Купа Черепів: кожні 10с підіймає Скелета-воїна (якщо поруч є труп, витрачає його та підіймає одразу 2 скелетів!).',
		descriptionEn:
			'Pile of Bones: raises 1 Skeleton Warrior every 10s (consumes a nearby corpse to raise 2 Skeletons at once!).',
		periodicSupport: {
			interval: 10,
			radius: 1400,
			maxTargets: 1,
			summonUnitId: 'n00B',
			summonCount: 1,
			consumeCorpseForBonus: true,
			labelUk: '+Скелети!'
		}
	},
	h00A: {
		id: 'h00A',
		descriptionUk:
			'Жертовна яма: приносить +18 золота та +12 деревини кожні 8с, а аура виснаження завдає 15 маг. шкоди/с ворогам поруч (600 px).',
		descriptionEn:
			'Sacrificial Pit: generates +18 gold & +12 lumber every 8s and drains nearby enemies (15 dmg/s within 600 px).',
		auras: [{ kind: 'burn_enemies', value: 15, radius: 600 }],
		periodicSupport: {
			interval: 8,
			radius: 9999,
			maxTargets: 1,
			bonusGold: 18,
			bonusLumber: 12,
			labelUk: '+18g +12w'
		}
	},
	h01Q: {
		id: 'h01Q',
		descriptionUk:
			'Легендарна вежа: кожні 5с заражає до 8 ворогів чумою (18 шкоди/с + -25% шкоди на 5с) та кожні 14с підіймає 2 Скелетів-вартових.',
		descriptionEn:
			'Legendary tower: every 5s infects up to 8 enemies with plague (18 dmg/s & -25% dmg for 5s) and raises 2 Skeleton Guards every 14s.',
		periodicStrike: {
			interval: 5,
			radius: 1400,
			maxTargets: 8,
			damage: 25,
			attackType: 'magic',
			applyBuff: { type: 'infect', timer: 5.0, value: 18 },
			applyBuff2: { type: 'weakness', timer: 5.0, value: 0.25 },
			labelUk: 'Чума!'
		},
		periodicSupport: {
			interval: 14,
			radius: 9999,
			maxTargets: 2,
			summonUnitId: 'n00B_u2',
			summonCount: 2,
			labelUk: '+2 Вартових!'
		}
	},

	// Orcs & Trolls
	h02R: {
		id: 'h02R',
		descriptionUk:
			'Церемоніальний тотем: у радіусі 1200 px надає союзникам Кровожерливість (+30% швидкості атаки, +25% руху) та +12 HP/с.',
		descriptionEn:
			'Ceremonial Totem: grants nearby allies within 1200 px Bloodlust (+30% attack speed, +25% move speed) and +12 HP/s.',
		auras: [
			{ kind: 'bloodlust', value: 0.3, radius: 1200 },
			{ kind: 'heal', value: 12, radius: 1200 }
		]
	},
	h02N: {
		id: 'h02N',
		descriptionUk:
			'Зміїна скеля: кожні 3.5с вражає до 3 ворогів у радіусі 800 px отрутою (55 маг. шкоди + 18 отрути/с та -40% руху на 4с).',
		descriptionEn:
			'Serpent Rock: every 3.5s hits up to 3 enemies within 800 px with venom (55 magic dmg + 18 poison/s & 40% slow for 4s).',
		periodicStrike: {
			interval: 3.5,
			radius: 800,
			maxTargets: 3,
			damage: 55,
			attackType: 'magic',
			applyBuff: { type: 'poison', timer: 4.0, value: 18 },
			applyBuff2: { type: 'slow', timer: 4.0, value: 0.4 },
			labelUk: 'Отрута!'
		}
	},
	h02O: {
		id: 'h02O',
		descriptionUk:
			'Легендарний Тотем Часу: глобальна аура прискорення всієї армії (+25% швидкості атаки та +20% швидкості руху).',
		descriptionEn:
			'Legendary Time Totem: global haste aura accelerating all allied troops (+25% attack speed & +20% move speed).',
		auras: [
			{ kind: 'as', value: 0.25, radius: 9999 },
			{ kind: 'ms', value: 0.2, radius: 9999 }
		]
	},

	// North
	h047: {
		id: 'h047',
		descriptionUk:
			'Морозний гриб: аура холоду в радіусі 750 px сповільнює ворогів (рух -35%, атака -26%) та завдає 12 маг. шкоди/с.',
		descriptionEn:
			'Frost Shroom: chilling aura within 750 px slows enemies (-35% move, -26% attack speed) and deals 12 magic dmg/s.',
		auras: [
			{ kind: 'frost_enemies', value: 0.35, radius: 750 },
			{ kind: 'burn_enemies', value: 12, radius: 750 }
		]
	},
	h048: {
		id: 'h048',
		descriptionUk:
			'Крижаний обеліск: кожні 4с запускає Кільце льоду по 3 ворогах (75 маг. шкоди по площі 120 px + заморозка 35% на 4с).',
		descriptionEn:
			'Ice Obelisk: every 4s casts Frost Nova on 3 enemies within 800 px (75 magic AoE dmg in 120 px + 35% chill for 4s).',
		periodicStrike: {
			interval: 4,
			radius: 800,
			maxTargets: 3,
			damage: 75,
			attackType: 'magic',
			splashRadius: 120,
			applyBuff: { type: 'frost', timer: 4.0, value: 0.35 },
			labelUk: 'Мороз!'
		}
	},
	h03O: {
		id: 'h03O',
		descriptionUk:
			'Легендарний Заморожувач: кожні 9с накриває до 10 ворогів на полі бою (90 маг. шкоди + холод 5с + 1.2с оглушення).',
		descriptionEn:
			'Legendary World Freezer: every 9s freezes up to 10 enemies globally (90 magic dmg + 5s frost slow + 1.2s stun).',
		periodicStrike: {
			interval: 9,
			radius: 9999,
			maxTargets: 10,
			damage: 90,
			attackType: 'magic',
			stunDuration: 1.2,
			applyBuff: { type: 'frost', timer: 5.0, value: 0.35 },
			labelUk: 'Льодопад!'
		}
	},

	// Elementals & Beasts
	h07H: {
		id: 'h07H',
		descriptionUk:
			'Обеліск стихій: у радіусі 1200 px посилює союзників (+12% базової шкоди та +15% швидкості пересування).',
		descriptionEn:
			'Elemental Obelisk: empowers allies within 1200 px (+12% attack damage and +15% movement speed).',
		auras: [
			{ kind: 'dmg', value: 0.12, radius: 1200 },
			{ kind: 'ms', value: 0.15, radius: 1200 }
		]
	},
	h04R: {
		id: 'h04R',
		descriptionUk:
			'Серце Стихій: кожні 4с висмоктує по 55 маг. шкоди з 4 ворогів (800 px) і зцілює 4 поранених союзників на +45 HP.',
		descriptionEn:
			'Heart of Elements: every 4s drains 55 magic dmg from 4 enemies (800 px) and heals 4 allies for +45 HP each.',
		periodicStrike: {
			interval: 4,
			radius: 800,
			maxTargets: 4,
			damage: 55,
			attackType: 'magic',
			labelUk: 'Витяжка!'
		},
		periodicSupport: {
			interval: 4,
			radius: 1200,
			maxTargets: 4,
			heal: 45,
			labelUk: '+45 HP'
		}
	},
	h04K: {
		id: 'h04K',
		descriptionUk:
			'Колодязь Болю: аура темної магії (750 px) завдає ворогам 22 шкоди/с і накладає слабкість (-25% шкоди та руху).',
		descriptionEn:
			'Well of Pain: dark aura (750 px) inflicts 22 dmg/s and weakens enemies (-25% attack dmg & speed).',
		auras: [
			{ kind: 'burn_enemies', value: 22, radius: 750 },
			{ kind: 'weakness_enemies', value: 0.25, radius: 750 }
		]
	},
	h04T: {
		id: 'h04T',
		descriptionUk:
			'Легендарне Око Бурі: кожні 6с вражає до 6 ворогів по всьому полю блискавками (115 маг. шкоди + 1.0с оглушення).',
		descriptionEn:
			'Legendary Eye of the Storm: every 6s strikes up to 6 enemies globally with lightning (115 magic dmg + 1.0s stun).',
		periodicStrike: {
			interval: 6,
			radius: 9999,
			maxTargets: 6,
			damage: 115,
			attackType: 'magic',
			chainLightning: true,
			stunDuration: 1.0,
			labelUk: 'Буря!'
		}
	},
	h07I: {
		id: 'h07I',
		descriptionUk:
			'Легендарний Обеліск Зорепаду: кожні 7с обрушує Зорепад на 7 ворогів по всьому полю (125 маг. шкоди по площі 110 px).',
		descriptionEn:
			'Legendary Starfall Obelisk: every 7s calls Starfall on 7 enemies globally (125 magic AoE dmg in 110 px).',
		periodicStrike: {
			interval: 7,
			radius: 9999,
			maxTargets: 7,
			damage: 125,
			attackType: 'magic',
			splashRadius: 110,
			labelUk: 'Зорепад!'
		}
	},

	// Technicians
	h069: {
		id: 'h069',
		descriptionUk:
			'Склад Запчастин: кожні 5с ремонтує до 3 пошкоджених союзних споруд (+40 HP кожній та +25 HP замку) й додає +10g та +12w кожні 10с.',
		descriptionEn:
			'Spare Parts Depot: every 5s repairs up to 3 damaged allied buildings (+40 HP each, +25 HP castle) and supplies +10g & +12w every 10s.',
		periodicSupport: {
			interval: 5,
			radius: 9999,
			maxTargets: 3,
			repairBuildingsHp: 40,
			repairCastleHp: 25,
			bonusGold: 5,
			bonusLumber: 6,
			labelUk: '+Ремонт'
		}
	},
	h06J: {
		id: 'h06J',
		descriptionUk:
			'Легендарний Генератор щитів: у радіусі 1100 px дарує +5 до броні та кожні 5с відновлює +35 HP щитом 4 союзникам.',
		descriptionEn:
			'Legendary Shield Generator: grants +5 armor within 1100 px and restores +35 HP barrier to 4 allies every 5s.',
		auras: [{ kind: 'armor', value: 5, radius: 1100 }],
		periodicSupport: {
			interval: 5,
			radius: 1100,
			maxTargets: 4,
			heal: 35,
			buff: { type: 'shield', timer: 5.0, value: 5 },
			labelUk: '+Щит'
		}
	},
	h09T: {
		id: 'h09T',
		descriptionUk:
			'Електростанція: кожні 4с б’є ланцюговою блискавкою по 4 ворогах (85 маг. шкоди, 800 px) і знімає холод/сповільнення з союзників.',
		descriptionEn:
			'Power Plant: every 4s fires Chain Lightning at 4 enemies (85 magic dmg, 800 px) and clears chill/slow from allies.',
		periodicStrike: {
			interval: 4,
			radius: 800,
			maxTargets: 4,
			damage: 85,
			attackType: 'magic',
			chainLightning: true,
			labelUk: 'Розряд!'
		},
		periodicSupport: {
			interval: 4,
			radius: 700,
			maxTargets: 6,
			dispelDebuffs: 'chill',
			labelUk: 'Розморозка'
		}
	}
};

export function getSpecialBuildingSpec(defId: string): SpecialBuildingSpec | undefined {
	return SPECIAL_BUILDING_SPECS[defId];
}

export function getSpecialBuildingDescription(defId: string, locale: 'uk' | 'en'): string | null {
	const spec = SPECIAL_BUILDING_SPECS[defId];
	if (!spec) return null;
	return locale === 'en' ? spec.descriptionEn : spec.descriptionUk;
}

function getBuildingCenter(b: Building): { cx: number; cy: number } {
	return { cx: b.x + 32, cy: b.y + 32 };
}

function applySingleAura(u: Unit, aura: SpecialAuraRule, dt: number): void {
	switch (aura.kind) {
		case 'armor':
			applyBuffToUnit(u, aura.value >= 5 ? 'shield' : 'armor_buff', 1.5, aura.value);
			break;
		case 'dmg':
			applyBuffToUnit(u, 'dmg', 1.5, aura.value);
			break;
		case 'as':
			applyBuffToUnit(u, 'as', 1.5, aura.value);
			break;
		case 'ms':
			applyBuffToUnit(u, 'ms', 1.5, aura.value);
			break;
		case 'bloodlust':
			applyBuffToUnit(u, 'bloodlust', 1.5, aura.value);
			break;
		case 'heal':
			if (!u.buffs?.some((b) => b.type === 'heal_block')) {
				u.hp = Math.min(u.maxHp, u.hp + aura.value * dt);
			}
			break;
		case 'mana':
			if (u.maxMana && u.mana !== undefined) {
				u.mana = Math.min(u.maxMana, u.mana + aura.value * dt);
			}
			break;
		case 'frost_enemies':
			applyBuffToUnit(u, 'frost', 1.5, aura.value);
			break;
		case 'slow_enemies':
			applyBuffToUnit(u, 'slow', 1.5, aura.value);
			break;
		case 'weakness_enemies':
			applyBuffToUnit(u, 'weakness', 1.5, aura.value);
			break;
		case 'burn_enemies':
			u.hp -= aura.value * dt;
			if (u.hp <= 0) {
				u.state = 'DEAD';
			}
			break;
	}
}

function isEnemyAuraKind(kind: SpecialAuraKind): boolean {
	return (
		kind === 'frost_enemies' ||
		kind === 'slow_enemies' ||
		kind === 'weakness_enemies' ||
		kind === 'burn_enemies'
	);
}

function filterActiveUnitsInRadius(
	units: Unit[],
	team: MatchTeam,
	matchAlly: boolean,
	cx: number,
	cy: number,
	radius: number
): Unit[] {
	const global = radius >= 9000;
	const rSq = radius * radius;
	const out: Unit[] = [];
	for (const u of units) {
		if (u.state === 'DEAD') continue;
		const isAlly = u.team === team;
		if (isAlly !== matchAlly) continue;
		if (!global) {
			const dx = u.x - cx;
			const dy = u.y - cy;
			if (dx * dx + dy * dy > rSq) continue;
		}
		out.push(u);
	}
	return out;
}

function executePeriodicStrike(
	sim: Simulation,
	b: Building,
	strike: SpecialPeriodicStrike,
	cx: number,
	cy: number
): void {
	const candidates = filterActiveUnitsInRadius(sim.units, b.team, false, cx, cy, strike.radius);
	if (candidates.length === 0) return;

	candidates.sort(
		(a, c) => (a.x - cx) ** 2 + (a.y - cy) ** 2 - ((c.x - cx) ** 2 + (c.y - cy) ** 2)
	);
	const targets = candidates.slice(0, strike.maxTargets);
	const owner =
		(b.playerId ? sim.allPlayers.find((p) => p.id === b.playerId) : null) || sim.players[b.team];

	let prevX = cx;
	let prevY = cy;
	for (const target of targets) {
		if (strike.dispelEnemies && target.buffs?.length) {
			target.buffs = target.buffs.filter((buf) => !ENEMY_STRIPPABLE_BUFFS.has(buf.type));
		}
		if (strike.manaBurn && target.mana !== undefined) {
			const burned = Math.min(target.mana, strike.manaBurn);
			target.mana -= burned;
		}
		if (strike.stunDuration && strike.stunDuration > 0) {
			applyBuffToUnit(target, 'stun', strike.stunDuration, 1);
			target.isStunned = true;
		}
		if (strike.applyBuff) {
			applyBuffToUnit(
				target,
				strike.applyBuff.type,
				strike.applyBuff.timer,
				strike.applyBuff.value
			);
		}
		if (strike.applyBuff2) {
			applyBuffToUnit(
				target,
				strike.applyBuff2.type,
				strike.applyBuff2.timer,
				strike.applyBuff2.value
			);
		}

		const totalDmg = strike.damage;
		if (totalDmg > 0) {
			if (strike.splashRadius && strike.splashRadius > 0) {
				sim.combatSystem.triggerSplashDamage(
					target.x,
					target.y,
					strike.splashRadius,
					totalDmg,
					strike.attackType,
					b.team,
					undefined,
					undefined,
					owner,
					owner ? { killerPlayer: owner } : undefined
				);
			} else {
				sim.combatSystem.applyUnitDamage(
					target,
					totalDmg,
					strike.attackType,
					b.team,
					false,
					undefined,
					owner ? { killerPlayer: owner } : undefined
				);
			}
			sim.recordBuildingDamage(b.defId, b.name, b.team, totalDmg);
		}

		if (strike.chainLightning) {
			sim.lightningEffects.push({
				sourceX: prevX,
				sourceY: prevY,
				targetX: target.x,
				targetY: target.y,
				timer: 0.25,
				maxTimer: 0.25,
				color: b.defId === 'h05I' ? 0xf43f5e : b.defId === 'h04T' ? 0x38bdf8 : 0x60a5fa
			});
			prevX = target.x;
			prevY = target.y;
		}
	}
	sim.addFloatingText(strike.labelUk, cx, cy - 28, '#38bdf8');
}

function executePeriodicSupport(
	sim: Simulation,
	b: Building,
	sup: SpecialPeriodicSupport,
	cx: number,
	cy: number
): void {
	const owner =
		(b.playerId ? sim.allPlayers.find((p) => p.id === b.playerId) : null) || sim.players[b.team];

	if (sup.bonusGold && owner) {
		owner.gold += sup.bonusGold;
	}
	if (sup.bonusLumber && owner) {
		owner.lumber = (owner.lumber ?? 0) + sup.bonusLumber;
	}

	if (sup.repairBuildingsHp) {
		const damaged = sim.buildings
			.filter(
				(allyBld) =>
					allyBld.team === b.team &&
					!allyBld.isUnderConstruction &&
					allyBld.hp > 0 &&
					allyBld.hp < allyBld.maxHp
			)
			.slice(0, sup.maxTargets);
		for (const allyBld of damaged) {
			allyBld.hp = Math.min(allyBld.maxHp, allyBld.hp + sup.repairBuildingsHp);
			sim.addFloatingText(
				`+${sup.repairBuildingsHp} HP`,
				allyBld.x + 32,
				allyBld.y - 16,
				'#10b981'
			);
		}
	}

	if (sup.repairCastleHp) {
		const castle = sim.castles[b.team];
		if (castle && castle.hp > 0 && castle.hp < castle.maxHp) {
			castle.hp = Math.min(castle.maxHp, castle.hp + sup.repairCastleHp);
		}
	}

	if (sup.summonUnitId) {
		let totalToSummon = sup.summonCount ?? 1;
		if (sup.consumeCorpseForBonus && sim.corpses.length > 0) {
			const cIdx = sim.corpses.findIndex(
				(c) => (c.x - cx) ** 2 + (c.y - cy) ** 2 <= sup.radius * sup.radius
			);
			if (cIdx >= 0) {
				sim.corpses.splice(cIdx, 1);
				totalToSummon = Math.max(totalToSummon, 2);
			}
		}
		for (let i = 0; i < totalToSummon; i++) {
			sim.buildingSystem.spawnUnitFromBuilding(b, sup.summonUnitId);
		}
		sim.addFloatingText(sup.labelUk, cx, cy - 28, '#fbbf24');
		return;
	}

	if (sup.heal || sup.dispelDebuffs || sup.buff) {
		const allies = filterActiveUnitsInRadius(sim.units, b.team, true, cx, cy, sup.radius);
		if (allies.length === 0) return;

		if (sup.heal) {
			allies.sort((a, c) => a.hp / Math.max(1, a.maxHp) - c.hp / Math.max(1, c.maxHp));
		}
		const chosen = allies.slice(0, sup.maxTargets);
		for (const ally of chosen) {
			if (sup.heal && !ally.buffs?.some((buf) => buf.type === 'heal_block')) {
				ally.hp = Math.min(ally.maxHp, ally.hp + sup.heal);
			}
			if (sup.dispelDebuffs && ally.buffs?.length) {
				const set = sup.dispelDebuffs === 'chill' ? CHILL_DEBUFFS : DISPELLABLE_DEBUFFS;
				ally.buffs = ally.buffs.filter((buf) => !set.has(buf.type));
			}
			if (sup.buff) {
				applyBuffToUnit(ally, sup.buff.type, sup.buff.timer, sup.buff.value);
			}
		}
		if (chosen.length > 0) {
			sim.addFloatingText(sup.labelUk, cx, cy - 28, '#34d399');
		}
	}
}

/**
 * Executes passive auras and periodic abilities for constructed special buildings.
 */
export function tickSpecialBuildingEffects(sim: Simulation, b: Building, dt: number): void {
	const spec = SPECIAL_BUILDING_SPECS[b.defId];
	if (!spec) return;

	const { cx, cy } = getBuildingCenter(b);

	if (spec.auras && spec.auras.length > 0) {
		for (const aura of spec.auras) {
			const matchAlly = !isEnemyAuraKind(aura.kind);
			const targets = filterActiveUnitsInRadius(sim.units, b.team, matchAlly, cx, cy, aura.radius);
			for (const u of targets) {
				applySingleAura(u, aura, dt);
			}
		}
	}

	if (spec.periodicStrike) {
		b.specialTimer = (b.specialTimer ?? 0.5) - dt;
		if (b.specialTimer <= 0) {
			b.specialTimer = spec.periodicStrike.interval;
			executePeriodicStrike(sim, b, spec.periodicStrike, cx, cy);
		}
	}

	if (spec.periodicSupport) {
		b.secondaryTimer = (b.secondaryTimer ?? 1.0) - dt;
		if (b.secondaryTimer <= 0) {
			b.secondaryTimer = spec.periodicSupport.interval;
			executePeriodicSupport(sim, b, spec.periodicSupport, cx, cy);
		}
	}
}

/**
 * Handles ally death triggers from special buildings (e.g. h059 Golden Temple resurrection).
 */
export function handleSpecialBuildingAllyDeath(sim: Simulation, deadUnit: Unit): void {
	if (deadUnit.isBoss || (deadUnit.team !== 'west' && deadUnit.team !== 'east')) return;

	const resurrectTemples = sim.buildings.filter(
		(b) =>
			b.team === deadUnit.team &&
			!b.isUnderConstruction &&
			(SPECIAL_BUILDING_SPECS[b.defId]?.allyDeathResurrectChance ?? 0) > 0
	);
	if (resurrectTemples.length === 0) return;

	const checks = Math.min(2, resurrectTemples.length);
	for (let i = 0; i < checks; i++) {
		const chance = SPECIAL_BUILDING_SPECS[resurrectTemples[i].defId]?.allyDeathResurrectChance ?? 0;
		if (sim.nextRandom() < chance) {
			const unitDef = getUnit(deadUnit.defId);
			const revived = sim.spawnUnitDirectly({
				team: deadUnit.team,
				lane: deadUnit.lane,
				x: deadUnit.x,
				y: deadUnit.y,
				hp: Math.max(50, Math.round(deadUnit.maxHp * 0.5)),
				maxHp: deadUnit.maxHp,
				damage: deadUnit.damageMin,
				armor: deadUnit.armor,
				range: deadUnit.range,
				speed: deadUnit.speed,
				attackCooldown: deadUnit.attackCooldown,
				flying: deadUnit.flying,
				name: unitDef?.name ?? deadUnit.name
			});
			revived.defId = deadUnit.defId;
			sim.addFloatingText('Воскресіння!', deadUnit.x, deadUnit.y - 28, '#fde047');
			return;
		}
	}
}
