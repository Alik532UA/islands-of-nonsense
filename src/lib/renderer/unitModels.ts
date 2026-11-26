import type { Graphics } from 'pixi.js';
import unitsJson from '../data/units.json';
import type { Unit } from '../engine/types';
import { rc, rr, ci, el, pg, ln } from './gfx';

export type UnitArchetype =
	'flyer' | 'siege' | 'caster' | 'ranger' | 'colossus' | 'beast' | 'warrior';

export type HeadgearKind =
	| 'knight'
	| 'horned'
	| 'hood'
	| 'crown'
	| 'halo'
	| 'skull'
	| 'visor'
	| 'crest'
	| 'goggles'
	| 'antlers'
	| 'bandana'
	| 'none';

export type BackgearKind =
	'cloak' | 'banner' | 'quiver' | 'spikes' | 'pack' | 'halo_ring' | 'wings_mini' | 'none';

export type ShieldKind = 'kite' | 'round' | 'tower' | 'buckler' | 'energy' | 'none';

export interface UnitVisualSpec {
	defId: string;
	archetype: UnitArchetype;
	weapon: string;
	headgear: HeadgearKind;
	backgear: BackgearKind;
	shield: ShieldKind;
	accentHex: number;
	trimHex: number;
	bodyScale: number;
	signature: string;
}

interface RawUnitEntry {
	id?: string;
	name?: string;
	attack_type?: string;
	armor_type?: string;
	hp?: number;
	range?: number;
	flying?: boolean;
	ability_type?: string;
}

const ACCENT_PALETTE = [
	0xfbbf24, // Gold
	0x38bdf8, // Sky Cyan
	0xf43f5e, // Crimson
	0x34d399, // Emerald
	0xa855f7, // Violet
	0xf97316, // Ember Orange
	0x2dd4bf, // Teal
	0xe879f9, // Magenta
	0x94a3b8, // Steel
	0xfacc15, // Sun Yellow
	0x60a5fa, // Royal Blue
	0x4ade80 // Jade
] as const;

const TRIM_PALETTE = [0xfef08a, 0xe2e8f0, 0xfdba74, 0x67e8f9, 0xd8b4fe, 0x86efac] as const;

const ARCHETYPE_WEAPONS: Record<UnitArchetype, readonly string[]> = {
	flyer: ['dragon_fire', 'bat_fang', 'gyro_blades', 'hawk_beak', 'phoenix_crest', 'wisp_orbit'],
	siege: ['cannon', 'catapult', 'ballista', 'mortar', 'steam_tank', 'rocket_rack'],
	caster: ['orb_staff', 'flame_rod', 'skull_wand', 'moon_crescent', 'sun_scepter', 'crystal_spire'],
	ranger: ['longbow', 'crossbow', 'rifle', 'javelin', 'blowpipe', 'twin_daggers', 'arcane_bow'],
	colossus: ['warhammer', 'greatsword', 'halberd', 'twin_axe', 'tower_mace', 'runeblade'],
	beast: ['wolf', 'bear', 'panther', 'boar', 'scorpion', 'hydra'],
	warrior: ['broadsword', 'battleaxe', 'spear', 'morningstar', 'dual_swords', 'katana']
};

const HEADGEARS: readonly HeadgearKind[] = [
	'knight',
	'horned',
	'hood',
	'crown',
	'halo',
	'skull',
	'visor',
	'crest',
	'goggles',
	'antlers',
	'bandana'
];

const BACKGEARS: readonly BackgearKind[] = [
	'cloak',
	'banner',
	'quiver',
	'spikes',
	'pack',
	'halo_ring',
	'wings_mini',
	'none'
];

const SHIELDS: readonly ShieldKind[] = ['kite', 'round', 'tower', 'buckler', 'energy', 'none'];

function resolveBaseArchetype(raw: RawUnitEntry): UnitArchetype {
	const ab = String(raw.ability_type ?? '');
	const range = Number(raw.range ?? 0);
	const hp = Number(raw.hp ?? 0);
	const name = String(raw.name ?? '');
	if (raw.flying) return 'flyer';
	if (/машина|танк|катапульт|гармат|баліст|мортир|паров|віз|каменекидач|зорекидач/i.test(name)) {
		return 'siege';
	}
	if (/голем|магнатор|аватар|броненосець|панцерник|^інфернал$/i.test(name)) {
		return 'colossus';
	}
	if (raw.attack_type === 'siege') return 'siege';
	if (
		raw.attack_type === 'magic' ||
		ab.includes('heal') ||
		ab.includes('slow') ||
		/друїд|шаман|заклинач|маг|жрец|чарод|некромант|чорнокниж|оракул|архімаг|королев|відьм|сирен|банші|елементаль|хвиль/i.test(
			name
		)
	) {
		return 'caster';
	}
	if (
		/вовк|лев|гонча|ведм|пантер|тигр|вандіго|вендіго|кодо|павук|скорпіон|звір|гідр|черепах|пес|дракон/i.test(
			name
		)
	) {
		return 'beast';
	}
	if (/вогнеметник|стрілець|лучник|рейнджер|зенітник|далекомір|навідник|мисливиця/i.test(name)) {
		return 'ranger';
	}
	if (range > 180 || (raw.attack_type === 'pierce' && range > 120)) return 'ranger';
	if (raw.armor_type === 'fort' || raw.armor_type === 'large' || hp >= 800) return 'colossus';
	return 'warrior';
}

function pickPreferredWeapon(
	name: string,
	archetype: UnitArchetype,
	weapons: readonly string[],
	idx: number
): string {
	const n = name.toLowerCase();
	if (archetype === 'flyer') {
		if (/гірокоптер|ротор|планер|штурмовик/i.test(n)) return 'gyro_blades';
		if (/дракон/i.test(n)) return idx % 2 === 0 ? 'dragon_fire' : 'phoenix_crest';
		if (/лучник|яструб/i.test(n)) return 'hawk_beak';
		if (/дух|вісп|фея/i.test(n)) return 'wisp_orbit';
	}
	if (archetype === 'ranger') {
		if (/вогнеметник|стрілець|навідник|далекомір|зенітник/i.test(n)) {
			return idx % 2 === 0 ? 'rifle' : 'crossbow';
		}
		if (/лучник|рейнджер|амазонка/i.test(n)) {
			return idx % 2 === 0 ? 'longbow' : 'arcane_bow';
		}
		if (/мисливиця|убивц|капкан/i.test(n)) return 'twin_daggers';
	}
	if (archetype === 'siege') {
		if (/мортир/i.test(n)) return 'mortar';
		if (/танк|машина/i.test(n)) return idx % 2 === 0 ? 'steam_tank' : 'cannon';
		if (/каменекидач|катапульт/i.test(n)) return 'catapult';
		if (/баліст|зорекидач|лучниця/i.test(n)) return 'ballista';
	}
	if (archetype === 'caster') {
		if (/водн|хвиль|криж|сніг|льод|сирен/i.test(n)) return 'crystal_spire';
		if (/некромант|лич|банші|чум/i.test(n)) return 'skull_wand';
		if (/друїд|місяц/i.test(n)) return 'moon_crescent';
	}
	if (archetype === 'beast') {
		if (/вовк|пес|гонч/i.test(n)) return 'wolf';
		if (/ведм|вандіго/i.test(n)) return 'bear';
		if (/гідр/i.test(n)) return 'hydra';
		if (/кодо|магнатор|черепах/i.test(n)) return 'boar';
	}
	return weapons[idx % weapons.length];
}

function pickPreferredHeadgear(name: string, idx: number, weaponsLen: number): HeadgearKind {
	const n = name.toLowerCase();
	if (/голем/i.test(n)) {
		const golemHats: readonly HeadgearKind[] = ['visor', 'crest', 'knight', 'horned'];
		return golemHats[idx % golemHats.length];
	}
	if (/водн|хвиль|сирен|морськ/i.test(n)) {
		const waterHats: readonly HeadgearKind[] = ['crown', 'crest', 'hood', 'visor'];
		return waterHats[idx % waterHats.length];
	}
	if (/лиц|паладин|світл|ангел/i.test(n)) {
		const holyHats: readonly HeadgearKind[] = ['halo', 'crown', 'knight', 'crest'];
		return holyHats[idx % holyHats.length];
	}
	if (/королев|король/i.test(n)) return 'crown';
	return HEADGEARS[(idx + Math.floor(idx / weaponsLen)) % HEADGEARS.length];
}

function buildAllUnitVisualSpecs(): Record<string, UnitVisualSpec> {
	const rawList = Array.isArray(unitsJson)
		? (unitsJson as unknown as RawUnitEntry[])
		: Object.values(unitsJson as unknown as Record<string, RawUnitEntry>);
	const rawMap: Record<string, RawUnitEntry> = {};
	for (const entry of rawList) {
		if (entry?.id) rawMap[entry.id] = entry;
	}
	const sortedIds = Object.keys(rawMap).sort();
	const usedSignatures = new Set<string>();
	const specs: Record<string, UnitVisualSpec> = {};

	for (let i = 0; i < sortedIds.length; i++) {
		const defId = sortedIds[i];
		const raw = rawMap[defId] ?? {};
		const name = String(raw.name ?? '');
		const archetype = resolveBaseArchetype(raw);
		const weapons = ARCHETYPE_WEAPONS[archetype];

		let offset = 0;
		let spec: UnitVisualSpec | null = null;
		while (!spec) {
			const idx = i + offset;
			const isHumanoid = archetype !== 'flyer' && archetype !== 'siege' && archetype !== 'beast';
			const weapon =
				offset < 3
					? pickPreferredWeapon(name, archetype, weapons, idx)
					: weapons[idx % weapons.length];
			const headgear = isHumanoid ? pickPreferredHeadgear(name, idx, weapons.length) : 'none';
			const backgear = isHumanoid ? BACKGEARS[(idx * 3 + offset) % BACKGEARS.length] : 'none';
			const shield = isHumanoid ? SHIELDS[(idx * 5 + offset) % SHIELDS.length] : 'none';
			const accentHex = ACCENT_PALETTE[(idx * 7 + offset) % ACCENT_PALETTE.length];
			const trimHex = TRIM_PALETTE[(idx * 3 + offset) % TRIM_PALETTE.length];
			const bodyScale = +(0.94 + ((idx + offset) % 5) * 0.045).toFixed(3);
			const signature = `${archetype}:${weapon}:${headgear}:${backgear}:${shield}:0x${accentHex.toString(16)}:0x${trimHex.toString(16)}:${bodyScale}`;
			if (!usedSignatures.has(signature)) {
				usedSignatures.add(signature);
				spec = {
					defId,
					archetype,
					weapon,
					headgear,
					backgear,
					shield,
					accentHex,
					trimHex,
					bodyScale,
					signature
				};
			}
			offset++;
		}
		specs[defId] = spec;
	}

	return specs;
}

/**
 * Unique visual descriptors for every single unit in units.json (zero repetitions).
 */
export const UNIT_VISUAL_SPECS: Record<string, UnitVisualSpec> = buildAllUnitVisualSpecs();

export function getUnitVisualSpec(
	u: Pick<
		Unit,
		'defId' | 'name' | 'flying' | 'attackType' | 'armorType' | 'maxHp' | 'range' | 'abilityType'
	>
): UnitVisualSpec {
	const found = UNIT_VISUAL_SPECS[u.defId];
	if (found) return found;
	const archetype = resolveBaseArchetype({
		name: u.name,
		flying: u.flying,
		attack_type: u.attackType,
		armor_type: u.armorType,
		hp: u.maxHp,
		range: u.range,
		ability_type: u.abilityType
	});
	return {
		defId: u.defId,
		archetype,
		weapon: ARCHETYPE_WEAPONS[archetype][0],
		headgear: 'knight',
		backgear: 'cloak',
		shield: 'kite',
		accentHex: 0xfbbf24,
		trimHex: 0xe2e8f0,
		bodyScale: 1,
		signature: `fallback:${u.defId}:${archetype}`
	};
}

function drawHeadgear(
	g: Graphics,
	x: number,
	headY: number,
	hr: number,
	dir: number,
	spec: UnitVisualSpec,
	unitColor: number
): void {
	switch (spec.headgear) {
		case 'horned':
		case 'antlers': {
			el(g, x, headY - hr * 0.2, hr, hr * 0.78, 0x94a3b8, { color: 0x1e293b, width: 1.4 });
			const hornColor = spec.headgear === 'antlers' ? 0xd97706 : 0xfef3c7;
			for (const hs of [-1, 1]) {
				pg(
					g,
					[
						x + hs * hr * 0.65,
						headY - hr * 0.4,
						x + hs * hr * 1.5,
						headY - hr * 1.2,
						x + hs * hr * 0.9,
						headY - hr * 0.1
					],
					hornColor
				);
			}
			break;
		}
		case 'hood':
			pg(
				g,
				[
					x - hr * 1.05,
					headY + 2,
					x - dir * hr * 0.25,
					headY - hr * 1.35,
					x + hr * 0.95,
					headY + 1
				],
				spec.accentHex,
				{ color: 0x0f172a, width: 1.2 }
			);
			break;
		case 'crown':
			pg(
				g,
				[
					x - hr * 0.9,
					headY - hr * 0.35,
					x - hr * 0.95,
					headY - hr * 1.25,
					x - hr * 0.3,
					headY - hr * 0.75,
					x,
					headY - hr * 1.4,
					x + hr * 0.3,
					headY - hr * 0.75,
					x + hr * 0.95,
					headY - hr * 1.25,
					x + hr * 0.9,
					headY - hr * 0.35
				],
				spec.accentHex,
				{ color: 0x78350f, width: 1.1 }
			);
			break;
		case 'halo':
			el(g, x, headY - hr * 1.25, hr * 0.95, hr * 0.32, undefined, {
				color: spec.accentHex,
				width: 2
			});
			break;
		case 'skull':
			ci(g, x, headY - hr * 0.1, hr * 0.95, 0xe2e8f0, { color: 0x0f172a, width: 1.3 });
			ci(g, x + dir * hr * 0.35, headY - hr * 0.1, 1.8, spec.accentHex);
			break;
		case 'goggles':
			el(g, x, headY - hr * 0.2, hr, hr * 0.78, 0x64748b, { color: 0x1e293b, width: 1.3 });
			ci(g, x + dir * hr * 0.45, headY - 1, 2.6, spec.accentHex, { color: 0x0f172a, width: 1 });
			break;
		case 'crest':
			el(g, x, headY - hr * 0.2, hr, hr * 0.78, 0x94a3b8, { color: 0x1e293b, width: 1.3 });
			pg(g, [x - dir * 3, headY - hr, x, headY - hr - 7, x + dir * 4, headY - hr], spec.accentHex);
			break;
		case 'visor':
			rr(g, x - hr * 0.85, headY - hr * 0.95, hr * 1.7, hr * 1.1, 3, 0x475569, {
				color: spec.accentHex,
				width: 1.3
			});
			ln(
				g,
				[x - hr * 0.4, headY - hr * 0.35, x + dir * hr * 0.7, headY - hr * 0.35],
				spec.trimHex,
				1.8
			);
			break;
		case 'bandana':
			rc(g, x - hr * 0.9, headY - hr * 0.7, hr * 1.8, 3.5, spec.accentHex);
			pg(
				g,
				[
					x - dir * hr * 0.8,
					headY - hr * 0.5,
					x - dir * hr * 1.6,
					headY - hr * 0.9,
					x - dir * hr * 1.4,
					headY - hr * 0.2
				],
				spec.accentHex
			);
			break;
		default:
			el(g, x, headY - hr * 0.2, hr, hr * 0.78, 0x94a3b8, { color: 0x1e293b, width: 1.4 });
			pg(g, [x - dir * 3, headY - hr, x, headY - hr - 5, x + dir * 3, headY - hr], unitColor);
			break;
	}
}

function drawBackgear(
	g: Graphics,
	x: number,
	y: number,
	r: number,
	dir: number,
	spec: UnitVisualSpec,
	sway: number,
	colorDark: number
): void {
	switch (spec.backgear) {
		case 'banner': {
			const bx = x - dir * r * 0.55;
			ln(g, [bx, y + r * 0.4, bx, y - r * 1.45], 0x78350f, 2.2);
			pg(
				g,
				[bx, y - r * 1.45, bx - dir * r * 0.85, y - r * 1.2, bx, y - r * 0.85],
				spec.accentHex,
				{ color: spec.trimHex, width: 1.1 }
			);
			break;
		}
		case 'quiver':
			pg(
				g,
				[
					x - dir * r * 0.52,
					y - r * 0.65,
					x - dir * r * 0.32,
					y - r * 0.65,
					x - dir * r * 0.42,
					y + r * 0.15
				],
				0x78350f
			);
			ci(g, x - dir * r * 0.42, y - r * 0.7, 2.2, spec.trimHex);
			break;
		case 'spikes':
			for (const sy of [-0.45, -0.1, 0.25]) {
				pg(
					g,
					[
						x - dir * r * 0.4,
						y + r * sy,
						x - dir * r * 0.95,
						y + r * (sy - 0.2),
						x - dir * r * 0.45,
						y + r * (sy + 0.15)
					],
					spec.trimHex
				);
			}
			break;
		case 'pack':
			rr(g, x - dir * r * 0.78 - 3, y - r * 0.4, 7, r * 0.75, 2, 0x475569, {
				color: spec.accentHex,
				width: 1.2
			});
			break;
		case 'halo_ring':
			ci(g, x, y - r * 0.2, r * 0.95, undefined, {
				color: spec.accentHex,
				width: 1.8,
				alpha: 0.75
			});
			break;
		case 'wings_mini':
			pg(
				g,
				[
					x - dir * r * 0.2,
					y - r * 0.2,
					x - dir * r * 1.1,
					y - r * 0.85,
					x - dir * r * 0.7,
					y + r * 0.15
				],
				spec.trimHex,
				{ color: spec.accentHex, width: 1.1 }
			);
			break;
		case 'none':
			break;
		default:
			pg(
				g,
				[
					x - dir * r * 0.3,
					y - r * 0.25,
					x - dir * (r + 4),
					y + r * 0.55 + sway,
					x - dir * r * 0.15,
					y + r * 0.65
				],
				{ color: colorDark, alpha: 0.92 },
				{ color: 0x0f172a, width: 1.2 }
			);
			break;
	}
}

function drawShield(
	g: Graphics,
	sx: number,
	sy: number,
	r: number,
	spec: UnitVisualSpec,
	unitColor: number
): void {
	if (spec.shield === 'none') return;
	if (spec.shield === 'round' || spec.shield === 'buckler') {
		const sr = spec.shield === 'buckler' ? r * 0.34 : r * 0.46;
		ci(g, sx, sy, sr, unitColor, { color: spec.accentHex, width: 1.6 });
		ci(g, sx, sy, sr * 0.35, spec.trimHex);
	} else if (spec.shield === 'energy') {
		el(
			g,
			sx,
			sy,
			r * 0.34,
			r * 0.56,
			{ color: spec.accentHex, alpha: 0.35 },
			{
				color: spec.trimHex,
				width: 1.8
			}
		);
	} else {
		const w = spec.shield === 'tower' ? 8 : 6.5;
		const h = spec.shield === 'tower' ? r * 1.05 : r * 0.85;
		rr(g, sx - w / 2, sy - h / 2, w, h, 2, unitColor, { color: spec.accentHex, width: 1.5 });
	}
}

function drawHumanoidBase(
	g: Graphics,
	x: number,
	y: number,
	r: number,
	dir: number,
	unitColor: number,
	isSelected: boolean,
	walkPhase: number,
	isWalking: boolean,
	spec: UnitVisualSpec,
	shadeHexColor: (hex: number, factor: number) => number,
	robeHem = false,
	scaleW = 1.0
): void {
	const colorDark = shadeHexColor(unitColor, 0.56);
	const colorLight = shadeHexColor(unitColor, 1.24);
	const torsoW = r * 1.18 * scaleW;
	const torsoH = r * 0.98;
	const stride = isWalking ? Math.sin(walkPhase) * (r * 0.24) : 0;
	const sway = isWalking ? Math.sin(walkPhase * 1.2) * 2.5 : 0;

	drawBackgear(g, x, y, r, dir, spec, sway, colorDark);

	if (robeHem) {
		pg(
			g,
			[
				x - torsoW * 0.55,
				y + r * 0.1,
				x + torsoW * 0.55,
				y + r * 0.1,
				x + torsoW * 0.72,
				y + r * 0.82,
				x - torsoW * 0.72,
				y + r * 0.82
			],
			colorDark,
			{ color: 0x0f172a, width: 1.5 }
		);
		ln(g, [x - torsoW * 0.7, y + r * 0.76, x + torsoW * 0.7, y + r * 0.76], spec.accentHex, 1.6);
	} else {
		g.beginPath();
		g.roundRect(x - torsoW * 0.42 + stride, y + r * 0.44, r * 0.36, r * 0.42, 2);
		g.roundRect(x + torsoW * 0.08 - stride, y + r * 0.44, r * 0.36, r * 0.42, 2);
		g.fill({ color: 0x1e293b });
		g.stroke({ color: 0x090d16, width: 1.1 });
	}

	rr(g, x - torsoW / 2, y - torsoH * 0.35, torsoW, torsoH, 4, unitColor, {
		color: isSelected ? 0xfbbf24 : 0x0f172a,
		width: isSelected ? 2.4 : 1.6
	});
	rr(g, x - torsoW * 0.32, y - torsoH * 0.25, torsoW * 0.64, torsoH * 0.45, 2, {
		color: colorLight,
		alpha: 0.45
	});
	rc(g, x - torsoW * 0.48, y + torsoH * 0.22, torsoW * 0.96, 3, 0x78350f);
	rc(g, x - 2, y + torsoH * 0.2, 4, 3.5, spec.accentHex);

	for (const side of [-1, 1]) {
		ci(g, x + side * torsoW * 0.48, y - torsoH * 0.18, r * 0.28, colorLight, {
			color: 0x0f172a,
			width: 1.3
		});
	}

	const headY = y - torsoH * 0.62;
	const headR = r * 0.44;
	ci(g, x, headY, headR, 0xe2b887, { color: 0x0f172a, width: 1.4 });
	drawHeadgear(g, x, headY, headR, dir, spec, unitColor);
	const eyeX = x + dir * headR * 0.45;
	el(g, eyeX, headY + 0.5, 2.2, 1.5, 0x0f172a);
	ci(g, eyeX + dir * 0.5, headY + 0.2, 0.8, spec.trimHex);
}

export function renderUniqueUnitModel(
	g: Graphics,
	u: Unit,
	unitColor: number,
	isSelected: boolean,
	renderY: number,
	dir: number,
	walkPhase: number,
	time: number,
	shadeHexColor: (hex: number, factor: number) => number
): void {
	const spec = getUnitVisualSpec(u);
	const r = u.size * spec.bodyScale;
	const colorDark = shadeHexColor(unitColor, 0.55);
	const colorLight = shadeHexColor(unitColor, 1.25);
	const atkLunge = u.attackAnimTimer && u.attackAnimTimer > 0 ? dir * (u.attackAnimTimer * 18) : 0;
	const ux = u.x + atkLunge * 0.45;
	const isWalking = u.state === 'WALKING';

	if (spec.archetype === 'flyer') {
		const flap = Math.sin(time * 14 + u.x * 0.05) * (r * 0.55);
		if (spec.weapon === 'wisp_orbit') {
			ci(g, ux, renderY, r * 0.62, spec.accentHex, { color: 0xffffff, width: 1.8 });
			ci(g, ux, renderY, r * 0.34, spec.trimHex);
			for (let wi = 0; wi < 3; wi++) {
				const wa = time * 4 + (wi * Math.PI * 2) / 3;
				ci(g, ux + Math.cos(wa) * r * 1.05, renderY + Math.sin(wa) * r * 0.85, 3.2, colorLight, {
					color: spec.trimHex,
					width: 1
				});
			}
		} else {
			pg(
				g,
				[
					ux - dir * r * 0.35,
					renderY + r * 0.15,
					ux - dir * r * 1.35,
					renderY + r * 0.45 + flap * 0.25,
					ux - dir * r * 1.05,
					renderY - r * 0.05
				],
				spec.weapon === 'phoenix_crest' ? spec.accentHex : colorDark,
				{ color: 0x0f172a, width: 1.4 }
			);
			for (const ws of [-1, 1]) {
				pg(
					g,
					[
						ux + ws * 2,
						renderY - r * 0.15,
						ux + ws * r * 1.55,
						renderY - r * 0.95 + flap,
						ux + ws * r * 1.2,
						renderY + r * 0.25 + flap * 0.35,
						ux + ws * 2,
						renderY + r * 0.3
					],
					{ color: spec.weapon === 'gyro_blades' ? 0x94a3b8 : colorLight, alpha: 0.9 },
					{ color: spec.accentHex, width: 1.6 }
				);
			}
			el(g, ux, renderY, r * 0.72, r * 0.55, unitColor, {
				color: isSelected ? 0xfbbf24 : 0x0f172a,
				width: isSelected ? 2.4 : 1.6
			});
			el(g, ux, renderY + r * 0.15, r * 0.48, r * 0.28, spec.trimHex, undefined, 0.45);
			const hx = ux + dir * r * 0.62;
			const hy = renderY - r * 0.25;
			ci(g, hx, hy, r * 0.34, colorDark, { color: 0x0f172a, width: 1.4 });
			ci(g, hx + dir * r * 0.14, hy - r * 0.04, 2.2, spec.accentHex);
			if (spec.weapon === 'dragon_fire' || spec.weapon === 'phoenix_crest') {
				pg(
					g,
					[hx, hy - r * 0.2, hx - dir * 5, hy - r * 0.75, hx + dir * 2, hy - r * 0.3],
					spec.accentHex
				);
				ci(g, hx + dir * r * 0.52, hy + r * 0.06, 3.4, spec.accentHex, undefined, 0.9);
			} else if (spec.weapon === 'bat_fang') {
				pg(g, [hx - 3, hy - 2, hx - 6, hy - 9, hx, hy - 4], colorDark);
				pg(g, [hx + 3, hy - 2, hx + 6, hy - 9, hx, hy - 4], colorDark);
				ci(g, hx + dir * 4, hy + 3, 1.5, 0xffffff);
			} else if (spec.weapon === 'hawk_beak') {
				pg(g, [hx + dir * 3, hy - 1, hx + dir * 10, hy + 1, hx + dir * 3, hy + 3], 0xfbbf24);
				ci(g, ux - dir * 1, renderY - r * 0.42, r * 0.28, colorDark, {
					color: 0x0f172a,
					width: 1.2
				});
				ln(g, [ux + dir * 3, renderY - r * 0.65, ux + dir * 7, renderY - r * 0.15], 0xfef08a, 1.8);
			} else if (spec.weapon === 'gyro_blades') {
				ln(g, [ux - r, renderY - r * 0.75, ux + r, renderY - r * 0.75], 0xe2e8f0, 2.6);
				ci(g, ux, renderY - r * 0.75, 2.5, spec.accentHex);
			}
		}
	} else if (spec.archetype === 'siege') {
		const recoil = u.attackAnimTimer && u.attackAnimTimer > 0 ? -dir * 4 : 0;
		for (const wx of [ux - r * 0.55, ux + r * 0.55]) {
			for (const wy of [renderY - r * 0.58, renderY + r * 0.58]) {
				ci(g, wx, wy, r * 0.28, 0x334155, { color: 0x0f172a, width: 1.6 });
				ci(g, wx, wy, r * 0.14, spec.accentHex);
			}
		}
		rr(g, ux - r * 0.78, renderY - r * 0.52, r * 1.56, r * 1.04, 4, 0x78350f, {
			color: isSelected ? 0xfbbf24 : 0x292524,
			width: isSelected ? 2.4 : 1.8
		});
		rr(g, ux - r * 0.52, renderY - r * 0.34, r * 1.04, r * 0.68, 3, unitColor, {
			color: spec.accentHex,
			width: 1.4
		});
		const bStart = ux - dir * r * 0.15 + recoil;
		const bEnd = ux + dir * r * 1.08 + recoil;
		if (spec.weapon === 'ballista') {
			ln(g, [ux + dir * 2, renderY - r * 0.65, ux + dir * r * 0.7, renderY], spec.accentHex, 2.5);
			ln(g, [ux + dir * 2, renderY + r * 0.65, ux + dir * r * 0.7, renderY], spec.accentHex, 2.5);
			ln(g, [bStart, renderY, bEnd + dir * 3, renderY], spec.trimHex, 2.4);
		} else if (spec.weapon === 'catapult') {
			ln(g, [ux - dir * r * 0.4, renderY + 2, ux + dir * r * 0.5, renderY - r * 0.65], 0x92400e, 4);
			ci(g, ux + dir * r * 0.55, renderY - r * 0.68, 4.2, spec.accentHex, {
				color: 0x0f172a,
				width: 1.2
			});
		} else if (spec.weapon === 'rocket_rack') {
			for (const ry of [-4, 0, 4]) {
				ln(g, [bStart, renderY + ry, bEnd - dir * 2, renderY + ry - 1], 0x475569, 3);
				ci(g, bEnd - dir * 2, renderY + ry - 1, 1.8, spec.accentHex);
			}
		} else if (spec.weapon === 'steam_tank') {
			rr(g, ux - r * 0.6, renderY - r * 0.45, r * 1.2, r * 0.9, 3, 0x475569, {
				color: spec.trimHex,
				width: 1.4
			});
			ln(g, [bStart, renderY, bEnd, renderY], 0x1e293b, 7);
			ci(g, ux - dir * r * 0.35, renderY - r * 0.25, 3.2, 0x94a3b8);
		} else {
			ln(g, [bStart, renderY, bEnd, renderY - 2], 0x0f172a, spec.weapon === 'mortar' ? 13 : 10);
			ln(g, [bStart, renderY, bEnd, renderY - 2], 0x475569, spec.weapon === 'mortar' ? 9 : 6.5);
			ci(g, bEnd, renderY - 2, 4.5, spec.accentHex, { color: 0x0f172a, width: 1.2 });
		}
	} else if (spec.archetype === 'caster') {
		drawHumanoidBase(
			g,
			ux,
			renderY,
			r,
			dir,
			unitColor,
			isSelected,
			walkPhase,
			isWalking,
			spec,
			shadeHexColor,
			true,
			0.95
		);
		const sx = ux + dir * r * 0.72 + atkLunge * 0.5;
		const sy = renderY - r * 0.95;
		ln(g, [sx - dir * 2, renderY + r * 0.72, sx, sy], 0x92400e, 2.6);
		if (spec.weapon === 'moon_crescent') {
			ci(g, sx, sy - 4, 5.5, spec.accentHex);
			ci(g, sx + dir * 2.5, sy - 5, 4, 0x0f172a);
		} else if (spec.weapon === 'crystal_spire') {
			pg(g, [sx, sy - 11, sx + 4.5, sy - 3, sx, sy + 3, sx - 4.5, sy - 3], spec.accentHex, {
				color: 0xffffff,
				width: 1
			});
		} else if (spec.weapon === 'skull_wand') {
			ci(g, sx, sy - 4, 4.8, 0xe2e8f0, { color: 0x0f172a, width: 1.2 });
			ci(g, sx + dir * 1.5, sy - 4, 1.5, spec.accentHex);
		} else {
			ci(g, sx, sy - 4, 5, spec.accentHex);
			ci(g, sx, sy - 4, 2.5, spec.trimHex);
			const orbA = time * 4.5;
			ci(g, sx + Math.cos(orbA) * 6.5, sy - 4 + Math.sin(orbA) * 6.5, 2, spec.trimHex);
		}
	} else if (spec.archetype === 'ranger') {
		drawHumanoidBase(
			g,
			ux,
			renderY,
			r,
			dir,
			unitColor,
			isSelected,
			walkPhase,
			isWalking,
			spec,
			shadeHexColor,
			false,
			0.92
		);
		drawShield(g, ux - dir * r * 0.4, renderY + 2, r, spec, unitColor);
		if (spec.weapon === 'rifle' || spec.weapon === 'crossbow') {
			const gx = ux + dir * r * 0.25 + atkLunge;
			ln(g, [gx, renderY + 1, gx + dir * r * 0.95, renderY - 1], 0x475569, 3.2);
			ci(g, gx + dir * r * 0.95, renderY - 1, 2.2, spec.accentHex);
		} else if (spec.weapon === 'javelin' || spec.weapon === 'blowpipe') {
			const sx = ux + dir * r * 0.2 + atkLunge;
			ln(g, [sx - dir * 5, renderY + 5, sx + dir * (r + 7), renderY - 7], 0x78350f, 2.4);
			ci(g, sx + dir * (r + 7), renderY - 7, 2.3, spec.trimHex);
		} else if (spec.weapon === 'twin_daggers') {
			const dx = ux + dir * r * 0.45 + atkLunge;
			ln(g, [dx, renderY - 4, dx + dir * 9, renderY - 9], spec.trimHex, 2.2);
			ln(g, [dx, renderY + 4, dx + dir * 9, renderY + 8], spec.accentHex, 2.2);
		} else {
			g.beginPath();
			const bowR = r * 0.85;
			const bowCx = ux + dir * r * 0.35;
			const spread = Math.PI / 2.3;
			const bowStart = dir > 0 ? -spread : Math.PI - spread;
			const bowEnd = dir > 0 ? spread : Math.PI + spread;
			g.moveTo(bowCx + Math.cos(bowStart) * bowR, renderY + Math.sin(bowStart) * bowR);
			g.arc(bowCx, renderY, bowR, bowStart, bowEnd, false);
			g.stroke({ color: spec.accentHex, width: 2.3 });
			ln(g, [ux - dir * r * 0.2, renderY, ux + dir * (r + 8), renderY], spec.trimHex, 1.8);
			if (spec.weapon === 'arcane_bow') {
				ci(g, bowCx + dir * bowR, renderY, 2.8, spec.trimHex, { color: 0x0f172a, width: 1 });
			}
		}
	} else if (spec.archetype === 'beast') {
		const furColor = shadeHexColor(unitColor, 0.72);
		const stride = isWalking ? Math.sin(walkPhase) * (r * 0.28) : 0;
		g.beginPath();
		g.roundRect(ux - r * 0.58 - stride, renderY + r * 0.25, r * 0.26, r * 0.52, 2);
		g.roundRect(ux + r * 0.32 + stride, renderY + r * 0.25, r * 0.26, r * 0.52, 2);
		g.fill({ color: 0x1e293b });
		const bodyRx = spec.weapon === 'bear' ? r * 1.02 : r * 0.9;
		const bodyRy = spec.weapon === 'bear' ? r * 0.65 : r * 0.5;
		el(g, ux, renderY + r * 0.05, bodyRx, bodyRy, furColor, {
			color: isSelected ? 0xfbbf24 : 0x0f172a,
			width: isSelected ? 2.4 : 1.6
		});
		rc(g, ux + dir * r * 0.35 - 2.5, renderY - r * 0.42, 5, r * 0.88, spec.accentHex);
		const hx = ux + dir * r * 0.76;
		const hy = renderY - r * 0.16;
		ci(g, hx, hy, r * 0.42, shadeHexColor(unitColor, 1.12), { color: 0x0f172a, width: 1.4 });
		ci(g, hx + dir * r * 0.2, hy - r * 0.08, 2, spec.trimHex);
		if (spec.weapon === 'wolf' || spec.weapon === 'panther') {
			pg(g, [hx - 3, hy - r * 0.3, hx - 6, hy - r * 0.85, hx + 1, hy - r * 0.35], colorDark);
			ln(
				g,
				[ux - dir * r * 0.75, renderY, ux - dir * r * 1.3, renderY - r * 0.4],
				spec.accentHex,
				3
			);
		} else if (spec.weapon === 'boar') {
			pg(g, [hx + dir * 4, hy + 2, hx + dir * 11, hy - 3, hx + dir * 6, hy + 4], 0xfef3c7);
		} else if (spec.weapon === 'scorpion') {
			ln(
				g,
				[ux - dir * r * 0.7, renderY - 2, ux - dir * r * 1.1, renderY - r * 0.95],
				spec.accentHex,
				3
			);
			ci(g, ux - dir * r * 1.1, renderY - r * 0.95, 3, spec.trimHex);
		} else if (spec.weapon === 'hydra') {
			ci(g, hx - dir * 3, hy - r * 0.55, r * 0.3, colorLight, { color: 0x0f172a, width: 1.2 });
			ci(g, hx - dir * 3, hy + r * 0.45, r * 0.3, colorLight, { color: 0x0f172a, width: 1.2 });
		} else if (spec.weapon === 'bear') {
			ci(g, hx - 3, hy - r * 0.38, 3.2, colorDark);
			ci(g, hx + 3, hy - r * 0.38, 3.2, colorDark);
		}
	} else {
		// colossus & warrior
		const isCol = spec.archetype === 'colossus';
		drawHumanoidBase(
			g,
			ux,
			renderY,
			r,
			dir,
			unitColor,
			isSelected,
			walkPhase,
			isWalking,
			spec,
			shadeHexColor,
			false,
			isCol ? 1.14 : 1.0
		);
		drawShield(g, ux + dir * (isCol ? r * 0.64 : -r * 0.45), renderY, r, spec, unitColor);
		const hx = ux + dir * r * 0.42 + atkLunge;
		const hy = renderY - r * 0.45;
		if (
			spec.weapon === 'warhammer' ||
			spec.weapon === 'tower_mace' ||
			spec.weapon === 'morningstar'
		) {
			ln(g, [ux + dir * 2, renderY + 2, hx + dir * 7, hy - 5], 0x78350f, 3.2);
			rr(g, dir > 0 ? hx + 2 : hx - 13, hy - 10, 11, 8, 2, 0x94a3b8, {
				color: spec.accentHex,
				width: 1.5
			});
		} else if (spec.weapon === 'battleaxe' || spec.weapon === 'twin_axe') {
			ln(g, [ux + dir * 2, renderY + 2, hx + dir * 7, hy - 5], 0x78350f, 3);
			pg(g, [hx + dir * 2, hy - 9, hx + dir * 12, hy - 5, hx + dir * 6, hy + 2], spec.trimHex, {
				color: spec.accentHex,
				width: 1.2
			});
		} else if (spec.weapon === 'spear' || spec.weapon === 'halberd') {
			ln(g, [ux - dir * 3, renderY + 5, hx + dir * 12, hy - 8], 0x78350f, 2.5);
			pg(g, [hx + dir * 10, hy - 10, hx + dir * 17, hy - 11, hx + dir * 13, hy - 4], spec.trimHex);
		} else {
			ln(g, [ux + dir * 2, renderY + 2, hx + dir * r * 0.65, hy - r * 0.55], spec.trimHex, 3.2);
			ln(g, [ux + dir * 2 - 2, renderY + 2, ux + dir * 2 + 4, renderY - 3], spec.accentHex, 3.4);
		}
	}

	if (u.team === 'neutral') {
		const cy = renderY - r - 5;
		pg(
			g,
			[
				ux - 8,
				cy + 4,
				ux - 9,
				cy - 4,
				ux - 3,
				cy,
				ux,
				cy - 6,
				ux + 3,
				cy,
				ux + 9,
				cy - 4,
				ux + 8,
				cy + 4
			],
			0xfbbf24,
			{ color: 0x78350f, width: 1.2 }
		);
	}

	if (u.attackAnimTimer && u.attackAnimTimer > 0) {
		g.beginPath();
		g.arc(
			ux + dir * r * 0.55,
			renderY,
			r * 0.85,
			dir > 0 ? -Math.PI / 3 : (2 * Math.PI) / 3,
			dir > 0 ? Math.PI / 3 : (4 * Math.PI) / 3,
			false
		);
		g.stroke({ color: spec.trimHex, width: 3, alpha: (u.attackAnimTimer / 0.25) * 0.85 });
	}
}
