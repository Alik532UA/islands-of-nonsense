import type { Graphics } from 'pixi.js';
import type { Building } from '../engine/types';
import { CELL_SIZE } from '../engine/constants';
import { formatRaceName, UNITS_MAP, type PlayableRace } from '../engine/gameData';

export type RaceStyle = PlayableRace;

export interface RacePalette {
	style: RaceStyle;
	wall: number;
	wallDark: number;
	wallTrim: number;
	wood: number;
	woodDark: number;
	accent: number;
	glow: number;
	ground: number;
}

export interface BuildingModelContext {
	g: Graphics;
	b: Building;
	px: number;
	py: number;
	cx: number;
	cy: number;
	isWest: boolean;
	playerColor: number;
	roofDark: number;
	roofMid: number;
	roofLight: number;
	rank: number;
	isUpgraded: boolean;
	isLegendary: boolean;
	isSelected: boolean;
	time: number;
	pal: RacePalette;
	seed: number;
	sunShadow: SunShadowOffset;
}

export interface SunShadowOffset {
	dx: number;
	dy: number;
	alpha: number;
}

const DEFAULT_SUN_SHADOW: SunShadowOffset = { dx: 3, dy: 7, alpha: 0.42 };

const SUN_KEYFRAMES: ReadonlyArray<{ p: number; dx: number; dy: number; alpha: number }> = [
	{ p: 0.0, dx: -11, dy: 9, alpha: 0.44 },
	{ p: 0.1875, dx: 0, dy: 5, alpha: 0.38 },
	{ p: 0.44, dx: 13, dy: 10, alpha: 0.46 },
	{ p: 0.72, dx: 2, dy: 7, alpha: 0.22 },
	{ p: 1.0, dx: -11, dy: 9, alpha: 0.44 }
];

export function computeSunShadow(dayNightProgress: number): SunShadowOffset {
	const p = ((dayNightProgress % 1) + 1) % 1;
	for (let i = 0; i < SUN_KEYFRAMES.length - 1; i++) {
		const a = SUN_KEYFRAMES[i];
		const b = SUN_KEYFRAMES[i + 1];
		if (p >= a.p && p <= b.p) {
			const span = b.p - a.p || 1;
			const t = (p - a.p) / span;
			const ease = 0.5 - 0.5 * Math.cos(Math.PI * t);
			return {
				dx: a.dx + (b.dx - a.dx) * ease,
				dy: a.dy + (b.dy - a.dy) * ease,
				alpha: a.alpha + (b.alpha - a.alpha) * ease
			};
		}
	}
	return DEFAULT_SUN_SHADOW;
}

export function shadeHexColor(hex: number, factor: number): number {
	const r0 = (hex >> 16) & 0xff;
	const g0 = (hex >> 8) & 0xff;
	const b0 = hex & 0xff;
	const mix = (c: number) =>
		factor >= 1
			? Math.min(255, Math.round(c + (255 - c) * Math.min(1, factor - 1)))
			: Math.max(0, Math.round(c * Math.max(0, factor)));
	return (mix(r0) << 16) | (mix(g0) << 8) | mix(b0);
}

function hashId(id: string): number {
	let h = 2166136261;
	for (let i = 0; i < id.length; i++) {
		h ^= id.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

const mkPal = (
	style: PlayableRace,
	wall: number,
	wallDark: number,
	wallTrim: number,
	wood: number,
	woodDark: number,
	accent: number,
	glow: number,
	ground: number
): RacePalette => ({ style, wall, wallDark, wallTrim, wood, woodDark, accent, glow, ground });

const PALETTES: Record<PlayableRace, RacePalette> = {
	Нежить: mkPal(
		'Нежить',
		0x475569,
		0x1e293b,
		0xcbd5e1,
		0x4c1d95,
		0x2e1065,
		0x22c55e,
		0xa3e635,
		0x1e1b4b
	),
	Орки: mkPal(
		'Орки',
		0x92400e,
		0x451a03,
		0xfef3c7,
		0x78350f,
		0x3b1804,
		0xf97316,
		0xfbbf24,
		0x5c4033
	),
	Демони: mkPal(
		'Демони',
		0x3f3f46,
		0x18181b,
		0x991b1b,
		0x7f1d1d,
		0x450a0a,
		0xf97316,
		0xfef08a,
		0x271313
	),
	Техніки: mkPal(
		'Техніки',
		0x64748b,
		0x334155,
		0xd97706,
		0x92400e,
		0x451a03,
		0xfacc15,
		0x38bdf8,
		0x1e293b
	),
	Північ: mkPal(
		'Північ',
		0xe0f2fe,
		0x64748b,
		0x7dd3fc,
		0x475569,
		0x1e293b,
		0x38bdf8,
		0xbae6fd,
		0x334155
	),
	Ельфи: mkPal(
		'Ельфи',
		0xf5f5f4,
		0xa8a29e,
		0xfde047,
		0xb45309,
		0x78350f,
		0xf59e0b,
		0x38bdf8,
		0x365314
	),
	Небожителі: mkPal(
		'Небожителі',
		0xfafaf9,
		0x94a3b8,
		0xfef08a,
		0xeab308,
		0x854d0e,
		0x38bdf8,
		0xfef9c3,
		0x1e3a8a
	),
	Тролі: mkPal(
		'Тролі',
		0x78716c,
		0x3f6212,
		0x2dd4bf,
		0x854d0e,
		0x422006,
		0x22c55e,
		0x5eead4,
		0x14532d
	),
	Елементалі: mkPal(
		'Елементалі',
		0x4c1d95,
		0x1e1b4b,
		0x38bdf8,
		0x3730a3,
		0x1e1b4b,
		0x22d3ee,
		0xe879f9,
		0x2e1065
	),
	Тварини: mkPal(
		'Тварини',
		0xa8a29e,
		0x57534e,
		0x84cc16,
		0x3f6212,
		0x14532d,
		0xf59e0b,
		0x4ade80,
		0x14532d
	),
	Наги: mkPal(
		'Наги',
		0x78716c,
		0x44403c,
		0x2dd4bf,
		0x0f766e,
		0x134e4a,
		0xfbbf24,
		0x5eead4,
		0x0c4a6e
	),
	Альянс: mkPal(
		'Альянс',
		0x9ca3af,
		0x57534e,
		0xd6d3d1,
		0x92400e,
		0x451a03,
		0xfbbf24,
		0xfef08a,
		0x44403c
	)
};

const LEGACY_RACE_PALETTE_MAP: Record<string, PlayableRace> = {
	Порча: 'Елементалі',
	'Нічні ельфи': 'Тварини',
	Збирачі: 'Техніки'
};

export function getRacePalette(race?: string | null): RacePalette {
	const normalized = formatRaceName(race || '');
	if (normalized in PALETTES) return PALETTES[normalized as PlayableRace];
	return PALETTES[LEGACY_RACE_PALETTE_MAP[normalized] ?? 'Альянс'];
}

function rr(
	g: Graphics,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number,
	fill?: number,
	stroke?: number,
	sw = 1.5,
	alpha = 1
): void {
	if (r > 0) g.roundRect(x, y, w, h, r);
	else g.rect(x, y, w, h);
	if (fill !== undefined) g.fill({ color: fill, alpha });
	if (stroke !== undefined) g.stroke({ color: stroke, width: sw });
}

function cc(
	g: Graphics,
	x: number,
	y: number,
	r: number,
	fill?: number,
	stroke?: number,
	sw = 1.4,
	alpha = 1
): void {
	g.circle(x, y, r);
	if (fill !== undefined) g.fill({ color: fill, alpha });
	if (stroke !== undefined) g.stroke({ color: stroke, width: sw });
}

function ee(
	g: Graphics,
	x: number,
	y: number,
	rx: number,
	ry: number,
	fill?: number,
	stroke?: number,
	sw = 1.4,
	alpha = 1
): void {
	g.ellipse(x, y, rx, ry);
	if (fill !== undefined) g.fill({ color: fill, alpha });
	if (stroke !== undefined) g.stroke({ color: stroke, width: sw });
}

function pp(g: Graphics, pts: number[], fill?: number, stroke?: number, sw = 1.4, alpha = 1): void {
	g.poly(pts);
	if (fill !== undefined) g.fill({ color: fill, alpha });
	if (stroke !== undefined) g.stroke({ color: stroke, width: sw });
}

function ln(
	g: Graphics,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	color: number,
	width = 1.6,
	alpha = 1
): void {
	g.beginPath();
	g.moveTo(x1, y1);
	g.lineTo(x2, y2);
	g.stroke({ color, width, alpha });
}

function hasAny(s: string, terms: readonly string[]): boolean {
	for (const t of terms) if (s.includes(t)) return true;
	return false;
}

export function drawIndividualBuildingModel(
	g: Graphics,
	b: Building,
	playerColor: number,
	rank: number,
	isUpgraded: boolean,
	isLegendary: boolean,
	isSelected: boolean,
	time: number,
	sunShadow: SunShadowOffset = DEFAULT_SUN_SHADOW
): void {
	const px = b.x;
	const py = b.y;
	const half = CELL_SIZE / 2;
	const cx = px + half;
	const cy = py + half;
	const ctx: BuildingModelContext = {
		g,
		b,
		px,
		py,
		cx,
		cy,
		isWest: b.team === 'west',
		playerColor,
		roofDark: shadeHexColor(playerColor, 0.52),
		roofMid: playerColor,
		roofLight: shadeHexColor(playerColor, 1.28),
		rank,
		isUpgraded,
		isLegendary,
		isSelected,
		time,
		pal: getRacePalette(b.race),
		seed: hashId(b.defId || b.name),
		sunShadow
	};

	drawSelectionAndShadow(ctx);

	if (b.specialType === 'forge') return drawForgeModel(ctx);
	if (b.specialType === 'shop') return drawShopModel(ctx);
	if (b.specialType === 'commander') return drawCommanderHallModel(ctx);
	if (b.specialType === 'treasure') return drawTreasureVaultModel(ctx);
	if (b.specialType === 'repair') return drawRepairStationModel(ctx);
	if (b.specialType === 'recycler') return drawRecyclerMillModel(ctx);

	const name = (b.name || '').toLowerCase();
	const unitDef = b.spawnUnitId ? UNITS_MAP.get(b.spawnUnitId) : null;

	if (hasAny(name, ['вулкан', 'магмовий розлом']) && !name.includes('гніздо'))
		drawVolcanoModel(ctx);
	else if (hasAny(name, ['око скверни', 'око бурі'])) drawCorruptEyeModel(ctx);
	else if (hasAny(name, ['забутий', 'серце стихій'])) drawEldritchHorrorModel(ctx);
	else if (name.includes('морозний гриб')) drawFrostMushroomsModel(ctx);
	else if (name.includes('іглу')) drawIglooModel(ctx);
	else if (
		hasAny(name, [
			'крижані шипи',
			'крижані піки',
			'айсберг',
			'кришталевий замок',
			'снігове каміння'
		])
	)
		drawIceOrCrystalSpireModel(ctx, name);
	else if (hasAny(name, ['фонтан', 'колодязь', 'нерестилище', 'басейн', 'джерело', 'вир']))
		drawBasinPoolModel(ctx, name);
	else if (hasAny(name, ['брама', 'портал']))
		drawMagicPortalModel(ctx, name, unitDef?.flying ?? false);
	else if (name.includes('драконячий цвинтар')) drawDragonGraveyardModel(ctx);
	else if (name.includes('чумний віз')) drawPlagueWagonModel(ctx);
	else if (name.includes('проклята шахта')) drawCursedMineModel(ctx);
	else if (hasAny(name, ['купа черепів', 'жертовна яма']))
		drawSkullOrPitModel(ctx, name.includes('купа'));
	else if (hasAny(name, ["м'ясорубка", 'заражена комора']))
		drawSlaughterOrBarnModel(ctx, name.includes('комора'));
	else if (hasAny(name, ['склеп', 'могильник'])) drawCryptMausoleumModel(ctx);
	else if (name.includes('кодо')) drawKodoCorralModel(ctx, name);
	else if (hasAny(name, ['хатинка крижаного троля', 'шатро троля-знахаря']))
		drawMurlocOrStiltHutModel(ctx, name);
	else if (hasAny(name, ['шатро', 'намет'])) drawWarTentModel(ctx, name);
	else if (hasAny(name, ['хатина', 'мурлоків'])) drawMurlocOrStiltHutModel(ctx, name);
	else if (hasAny(name, ['давній', 'древній', 'срібна галявина'])) drawAncientGroveModel(ctx, name);
	else if (hasAny(name, ['тотем', 'ріг героїв', 'статуя'])) drawRelicOrStatueModel(ctx, name);
	else if (hasAny(name, ['обез', 'обеліск', 'заморожувач', 'моноліт', 'кристальний бастіон']))
		drawObeliskMonolithModel(ctx, name);
	else if (hasAny(name, ['електростанція', 'генератор', 'склад запчастин', 'ка-бум', 'лісопилка']))
		drawTechSpecialtyModel(ctx, name);
	else if (
		hasAny(name, [
			'танкова',
			'танків',
			'мінерів',
			'големів',
			'звалище',
			'дробильня',
			'клепальня',
			'броньова кузня',
			'громильня'
		])
	)
		drawFoundryOrTankBayModel(ctx, name);
	else if (hasAny(name, ['ангар', 'повітряна фабрика', 'бомбардувальник']))
		drawAirfieldHangarModel(ctx, name);
	else if (hasAny(name, ['мортирня', 'камнеметня', 'артилерія']))
		drawArtilleryEmplacementModel(ctx, name);
	else if (
		(b.specialType === 'tower' ||
			hasAny(name, ['вежа', 'ліхтар', 'вартовий', 'захисник', 'стирач', 'руїни', 'знищений'])) &&
		!name.includes('лучників')
	)
		drawTowerOrRuinsModel(ctx, name);
	else if (hasAny(name, ['гніздо', 'зміїна скеля', 'вогняний шпиль']) || unitDef?.flying)
		drawRoostOrCliffModel(ctx, name);
	else if (hasAny(name, ['церква', 'собор', 'піраміда', 'храм', 'вівтар', 'правосуддя']))
		drawTempleOrCathedralModel(ctx, name);
	else if (
		hasAny(name, ['бібліотека', 'університет', 'школа', 'академія', 'тіней', 'магічне місто']) ||
		unitDef?.attack_type === 'magic'
	)
		drawArcaneAcademyModel(ctx, name);
	else if (
		hasAny(name, ['стрільців', 'лучників', 'зеніток', 'мисливців', 'рейнджер']) ||
		unitDef?.attack_type === 'pierce'
	)
		drawArcheryCampModel(ctx, name);
	else if (name.includes('облогов') || unitDef?.attack_type === 'siege' || unitDef?.isArtillery)
		drawSiegeWorkshopModel(ctx);
	else if (name.includes('клітка')) drawDemonCageModel(ctx);
	else drawWingedHallOrBarracksModel(ctx, name, unitDef?.hp ?? 0, unitDef?.armor_type ?? '');

	if (b.spawnUnitId) drawTierAccents(ctx);
}

function drawSelectionAndShadow(ctx: BuildingModelContext): void {
	const { g, px, py, cx, cy, isSelected, isLegendary, time, sunShadow } = ctx;
	const rx = 28 + Math.abs(sunShadow.dx) * 0.35;
	const ry = 22 + Math.max(0, sunShadow.dy - 5) * 0.25;
	ee(g, cx + sunShadow.dx, cy + sunShadow.dy, rx, ry, 0x000000, undefined, 0, sunShadow.alpha);

	if (isSelected) {
		g.ellipse(cx, cy + 2, 33, 29);
		g.fill({ color: 0xfbbf24, alpha: 0.14 });
		g.stroke({ color: 0xfbbf24, width: 2.5, alpha: 0.72 + Math.sin(time * 5.5) * 0.22 });
		const pad = 2;
		const len = 9;
		for (const [bx, by, dx, dy] of [
			[px - pad, py - pad, 1, 1],
			[px + CELL_SIZE + pad, py - pad, -1, 1],
			[px - pad, py + CELL_SIZE + pad, 1, -1],
			[px + CELL_SIZE + pad, py + CELL_SIZE + pad, -1, -1]
		]) {
			g.beginPath();
			g.moveTo(bx + dx * len, by);
			g.lineTo(bx, by);
			g.lineTo(bx, by + dy * len);
			g.stroke({ color: 0xfef08a, width: 2.2 });
		}
	} else if (isLegendary) {
		g.ellipse(cx, cy + 3, 31, 26);
		g.stroke({ color: 0xf59e0b, width: 1.8, alpha: 0.48 + Math.sin(time * 3 + px) * 0.18 });
	}
}

function drawTierAccents(ctx: BuildingModelContext): void {
	const { g, px, py, cx, rank, isUpgraded, isLegendary, playerColor, time } = ctx;
	const pipCount = Math.max(1, Math.min(6, rank || 1));
	const startX = cx - ((pipCount - 1) * 5.5) / 2;
	for (let i = 0; i < pipCount; i++) {
		cc(
			g,
			startX + i * 5.5,
			py + CELL_SIZE - 4,
			1.8,
			isUpgraded || isLegendary ? 0xfbbf24 : 0xe2e8f0,
			0x090d16,
			0.8
		);
	}
	if (isUpgraded || isLegendary || rank >= 4) {
		const mx = cx + 19;
		const mt = py + 1;
		ln(g, mx, py + 24, mx, mt, isLegendary ? 0xfbbf24 : 0x78350f, 1.8);
		pp(
			g,
			[mx, mt + 1, mx + 11, mt + 4 + Math.sin(time * 4.5 + px * 0.05) * 1.8, mx, mt + 8],
			isLegendary ? 0xfbbf24 : playerColor,
			0x0f172a,
			0.8
		);
	}
}

function apron(
	g: Graphics,
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	color: number,
	border = 0x1c1917
): void {
	g.ellipse(cx, cy + 4, rx, ry);
	g.fill({ color });
	g.stroke({ color: border, width: 1.4, alpha: 0.8 });
}

function doorway(g: Graphics, x: number, y: number, w: number, h: number, trim: number): void {
	rr(g, x, y, w, h, 2, 0x181310, trim, 1.2);
}

function drawForgeModel(ctx: BuildingModelContext): void {
	const { g, px, py, cx, cy, roofDark, roofLight, pal, time } = ctx;
	apron(g, cx, cy + 2, 28, 23, 0x3f3a36);
	rr(g, px + 7, py + 7, CELL_SIZE - 14, 24, 4, roofDark, 0x0f172a, 1.6);
	rr(g, px + 9, py + 8, CELL_SIZE - 22, 11, 3, roofLight, undefined, 0, 0.9);
	rr(g, px + 10, py + 4, 11, 14, 2, 0x57534e, 0x1c1917, 1.4);
	cc(
		g,
		px + 15 + Math.sin(time * 4) * 2,
		py + 2 - ((time * 18) % 14) * 0.5,
		3.2,
		0x94a3b8,
		undefined,
		0,
		0.45
	);
	cc(g, cx - 10, cy + 9, 8.5, 0x292524, 0x57534e, 1.5);
	cc(g, cx - 10, cy + 9, 5.2, 0xf97316, undefined, 0, 0.78 + Math.sin(time * 15 + px) * 0.22);
	cc(g, cx - 10, cy + 9, 2.5, 0xfef08a);
	pp(
		g,
		[cx + 2, cy + 5, cx + 19, cy + 5, cx + 15, cy + 14, cx + 5, cy + 14],
		0x94a3b8,
		0x1e293b,
		1.4
	);
	cc(g, cx + 20, cy + 15, 4, pal.wood);
	cc(g, cx + 20, cy + 15, 2.2, 0x0284c7);
}

function drawCommanderHallModel(ctx: BuildingModelContext): void {
	const { g, px, py, cx, cy, roofDark, roofMid, roofLight, pal, time } = ctx;
	apron(g, cx, cy + 3, 29, 23, pal.ground);
	rr(g, px + 8, py + 12, CELL_SIZE - 16, CELL_SIZE - 22, 5, pal.wallDark, 0x0f172a, 1.6);
	rr(g, px + 12, py + 16, CELL_SIZE - 24, CELL_SIZE - 28, 4, pal.wall, pal.wallTrim, 1.2);
	pp(g, [cx, py + 4, px + CELL_SIZE - 10, cy - 2, px + 10, cy - 2], roofDark, 0xf59e0b, 1.5);
	pp(g, [cx, py + 6, px + CELL_SIZE - 14, cy - 4, cx, cy - 4], roofLight, undefined, 0, 0.78);
	cc(g, cx, cy + 6, 8, 0x1e1b4b, 0xfbbf24, 1.6);
	cc(g, cx, cy + 6, 4.2, 0x818cf8, undefined, 0, 0.75 + Math.sin(time * 4 + px) * 0.25);
	for (const bx of [px + 12, px + CELL_SIZE - 12]) {
		rr(g, bx - 1, py + 18, 2, 16, 0, 0xfbbf24);
		pp(g, [bx, py + 18, bx + (bx < cx ? -6 : 6), py + 21, bx, py + 25], roofMid);
	}
}

function drawShopModel(ctx: BuildingModelContext): void {
	const { g, px, py, cx, cy, playerColor } = ctx;
	apron(g, cx, cy + 3, 28, 22, 0x5c4033);
	rr(g, px + 9, py + 9, CELL_SIZE - 18, 28, 4, 0x78350f, 0x451a03, 1.5);
	rr(g, px + 7, py + 7, CELL_SIZE - 14, 24, 5, playerColor, 0x451a03, 1.6);
	for (let sx = px + 13; sx < px + CELL_SIZE - 13; sx += 11) {
		rr(g, sx, py + 8, 5, 22, 0, 0xfef3c7, undefined, 0, 0.92);
	}
	rr(g, px + 11, py + 37, 12, 12, 2, 0x92400e, 0x451a03, 1.3);
	cc(g, cx, py + 43, 6.2, 0xb45309, 0xfbbf24, 1.2);
	rr(g, px + 41, py + 37, 11, 12, 2, 0x78350f, 0x451a03, 1.3);
}

function drawTreasureVaultModel(ctx: BuildingModelContext): void {
	const { g, px, py, cx, cy, time } = ctx;
	apron(g, cx, cy + 3, 28, 22, 0x334155);
	rr(g, px + 10, py + 7, CELL_SIZE - 20, 22, 5, 0x475569, 0x0f172a, 1.6);
	rr(g, cx - 17, cy - 3, 34, 22, 4, 0x78350f, 0xfbbf24, 2);
	rr(g, cx - 16, cy - 1, 32, 5, 0, 0xf59e0b);
	const sparkle = 0.75 + Math.sin(time * 5) * 0.25;
	for (const [gx, gy, r] of [
		[cx - 6, cy - 4, 4.2],
		[cx + 6, cy - 4, 4.2],
		[cx, cy - 6, 4.8],
		[cx - 11, cy + 16, 3],
		[cx + 12, cy + 15, 3]
	]) {
		cc(g, gx, gy, r, 0xfef08a, undefined, 0, sparkle);
	}
	cc(g, cx, cy + 8, 3.5, 0xef4444);
}

function drawRepairStationModel(ctx: BuildingModelContext): void {
	const { g, px, py, cx, cy } = ctx;
	apron(g, cx, cy + 3, 28, 22, 0x44403c);
	rr(g, px + 10, py + 32, 16, 15, 2, 0x9ca3af, 0x334155, 1.4);
	rr(g, px + 14, py + 24, 12, 10, 2, 0xd6d3d1, 0x334155, 1.2);
	cc(g, cx + 9, cy + 4, 10, 0x064e3b, 0x10b981, 1.8);
	g.rect(cx + 6.5, cy - 2, 5, 12);
	g.rect(cx + 3, cy + 1.5, 12, 5);
	g.fill({ color: 0x34d399 });
	ln(g, px + 13, py + 12, px + CELL_SIZE - 13, py + 23, 0x92400e, 4);
	cc(g, px + 13, py + 12, 5.5, 0x78350f, 0xf59e0b, 1.2);
}

function drawRecyclerMillModel(ctx: BuildingModelContext): void {
	const { g, cx, cy, time } = ctx;
	apron(g, cx, cy + 3, 26, 21, 0x1e293b);
	cc(g, cx, cy + 1, 18, 0x334155, 0x38bdf8, 1.8);
	for (let i = 0; i < 6; i++) {
		const a = time * 1.9 + (i * Math.PI) / 3;
		cc(g, cx + Math.cos(a) * 12, cy + 1 + Math.sin(a) * 12, 3.2, 0xf59e0b);
	}
	cc(g, cx, cy + 1, 10, 0xd97706, 0x451a03, 1.4);
	cc(g, cx, cy + 1, 4, 0x0f172a);
}

function drawVolcanoModel(ctx: BuildingModelContext): void {
	const { g, cx, cy, time } = ctx;
	apron(g, cx, cy + 3, 30, 24, 0x1c1917, 0x7f1d1d);
	pp(
		g,
		[
			cx - 27,
			cy + 14,
			cx - 18,
			cy - 12,
			cx - 8,
			cy - 20,
			cx + 9,
			cy - 20,
			cx + 20,
			cy - 10,
			cx + 27,
			cy + 15,
			cx + 8,
			cy + 22,
			cx - 12,
			cy + 21
		],
		0x292524,
		0x0f172a,
		2
	);
	ln(g, cx - 2, cy - 4, cx - 9, cy + 16, 0xea580c, 2.5);
	ln(g, cx + 4, cy - 3, cx + 12, cy + 13, 0xea580c, 2.5);
	ee(g, cx, cy - 11, 10, 6, 0xef4444);
	ee(g, cx, cy - 11, 6.5, 3.8, 0xfacc15, undefined, 0, 0.8 + Math.sin(time * 8) * 0.2);
}

function drawCorruptEyeModel(ctx: BuildingModelContext): void {
	const { g, cx, cy, time } = ctx;
	apron(g, cx, cy + 4, 24, 18, 0x2e1065, 0x701a75);
	for (const s of [-1, 1]) {
		pp(
			g,
			[
				cx + s * 6,
				cy + 14,
				cx + s * 18,
				cy + 2,
				cx + s * 13,
				cy - 20,
				cx + s * 8,
				cy - 8,
				cx + s * 10,
				cy + 8
			],
			0x1e1b4b,
			0xc026d3,
			1.4
		);
	}
	cc(g, cx, cy - 6, 10.5, 0xd946ef, 0xfef08a, 1.5);
	cc(g, cx, cy - 6, 7.5, 0xf97316);
	ee(g, cx + Math.sin(time * 2.2) * 2.5, cy - 6, 2.2, 6, 0x090d16);
}

function drawEldritchHorrorModel(ctx: BuildingModelContext): void {
	const { g, cx, cy, time } = ctx;
	apron(g, cx, cy + 3, 27, 22, 0x2e1065, 0xc026d3);
	for (let i = 0; i < 6; i++) {
		const a = (i / 6) * Math.PI * 2 + Math.sin(time * 2.5 + i) * 0.25;
		const tx = cx + Math.cos(a) * 24;
		const ty = cy + Math.sin(a) * 19;
		ln(g, cx, cy, tx, ty, 0x7e22ce, 4.5);
		cc(g, tx, ty, 2.6, 0xf0abfc);
	}
	cc(g, cx, cy - 2, 13, 0x4c1d95, 0x090d16, 1.8);
	for (const [ex, ey, r] of [
		[cx - 4, cy - 5, 2.8],
		[cx + 5, cy - 3, 2.3],
		[cx, cy + 3, 3.2]
	]) {
		cc(g, ex, ey, r, 0xfacc15);
	}
}

function drawFrostMushroomsModel(ctx: BuildingModelContext): void {
	const { g, cx, cy, time } = ctx;
	apron(g, cx, cy + 5, 26, 20, 0x164e63, 0x7dd3fc);
	for (const m of [
		{ x: cx - 10, y: cy + 2, r: 9, h: 10 },
		{ x: cx + 11, y: cy + 4, r: 8, h: 9 },
		{ x: cx, y: cy - 8, r: 13, h: 15 }
	]) {
		rr(g, m.x - 3.5, m.y, 7, m.h, 2, 0xe0f2fe, 0x334155, 1.2);
		ee(g, m.x, m.y - 1, m.r, m.r * 0.68, 0x0284c7, 0xbae6fd, 1.5);
		const a = 0.85 + Math.sin(time * 4 + m.x) * 0.15;
		cc(g, m.x - m.r * 0.3, m.y - 2, 2, 0xe0f2fe, undefined, 0, a);
		cc(g, m.x + m.r * 0.25, m.y - 1, 1.8, 0xe0f2fe, undefined, 0, a);
	}
}

function drawIglooModel(ctx: BuildingModelContext): void {
	const { g, cx, cy, roofLight } = ctx;
	apron(g, cx, cy + 5, 28, 22, 0xcbd5e1, 0x94a3b8);
	rr(g, cx - 8, cy + 7, 16, 15, 5, 0xe0f2fe, 0x475569, 1.5);
	rr(g, cx - 4.5, cy + 12, 9, 9, 3, 0xf97316, undefined, 0, 0.85);
	cc(g, cx, cy - 2, 20, 0xf1f5f9, 0x38bdf8, 1.8);
	cc(g, cx - 4, cy - 6, 12, 0xffffff, undefined, 0, 0.75);
	for (const ry of [cy - 10, cy - 2, cy + 5]) ln(g, cx - 16, ry, cx + 16, ry, 0x93c5fd, 1);
	ln(g, cx, cy - 21, cx, cy - 31, 0x334155, 1.6);
	pp(g, [cx, cy - 31, cx + 9, cy - 28, cx, cy - 25], roofLight);
}

function drawIceOrCrystalSpireModel(ctx: BuildingModelContext, name: string): void {
	const { g, cx, cy, isUpgraded, playerColor } = ctx;
	apron(g, cx, cy + 5, 27, 20, 0x334155, 0x7dd3fc);
	if (name.includes('снігове каміння')) {
		for (const [rx, ry, r] of [
			[cx - 10, cy + 4, 10],
			[cx + 11, cy + 3, 9],
			[cx, cy - 6, 12]
		]) {
			cc(g, rx, ry, r, 0x64748b, 0x1e293b, 1.5);
			ee(g, rx - 2, ry - r * 0.4, r * 0.72, r * 0.38, 0xf1f5f9);
		}
		return;
	}
	if (name.includes('кришталевий замок')) {
		for (const sx of [cx - 15, cx + 15]) {
			rr(g, sx - 5, cy - 12, 10, 26, 2, 0x0284c7, 0xe0f2fe, 1.3);
			pp(g, [sx, cy - 22, sx + 6, cy - 12, sx - 6, cy - 12], 0x38bdf8, 0xe0f2fe, 1.2);
		}
		rr(g, cx - 10, cy - 16, 20, 32, 3, isUpgraded ? playerColor : 0x0ea5e9, 0xe0f2fe, 1.5);
		pp(g, [cx, cy - 28, cx + 9, cy - 16, cx - 9, cy - 16], 0x7dd3fc, 0xe0f2fe, 1.3);
		doorway(g, cx - 4, cy + 4, 8, 12, 0x0c4a6e);
		return;
	}
	const spikes =
		name.includes('піки') || isUpgraded
			? [
					{ x: cx - 18, y: cy + 8, w: 6, h: 16, col: 0x0369a1 },
					{ x: cx + 18, y: cy + 8, w: 6, h: 16, col: 0x0369a1 },
					{ x: cx - 10, y: cy + 5, w: 8, h: 24, col: 0x0284c7 },
					{ x: cx + 10, y: cy + 4, w: 8, h: 25, col: 0x0ea5e9 },
					{ x: cx, y: cy + 8, w: 12, h: 34, col: 0x38bdf8 }
				]
			: [
					{ x: cx - 12, y: cy + 5, w: 8, h: 19, col: 0x0284c7 },
					{ x: cx + 12, y: cy + 4, w: 8, h: 20, col: 0x0ea5e9 },
					{ x: cx, y: cy + 7, w: 11, h: 28, col: isUpgraded ? playerColor : 0x38bdf8 }
				];
	if (name.includes('піки') || isUpgraded) {
		g.ellipse(cx, cy + 5, 29, 22);
		g.stroke({ color: 0xbae6fd, width: 1.5, alpha: 0.65 });
	}
	for (const s of spikes) {
		pp(
			g,
			[s.x, s.y - s.h, s.x + s.w, s.y - 5, s.x, s.y + 5, s.x - s.w, s.y - 5],
			s.col,
			0xe0f2fe,
			1.4
		);
		pp(g, [s.x, s.y - s.h, s.x, s.y + 5, s.x - s.w, s.y - 5], 0xbae6fd, undefined, 0, 0.45);
	}
}

function drawBasinPoolModel(ctx: BuildingModelContext, name: string): void {
	const { g, cx, cy, pal, time } = ctx;
	const isBlood = name.includes('кров');
	const isPain = name.includes('болю');
	const isNaga = pal.style === 'Наги';
	const isSpawning = name.includes('нерестилище');
	const isReptilePool = name.includes('басейн рептил');
	const isSwamp = name.includes('заболоч');

	if (isSpawning) {
		apron(g, cx, cy + 2, 27, 22, 0x0f3d3e, 0x14b8a6);
		cc(g, cx, cy + 1, 21, 0x115e59, 0x042f2e, 2);
		cc(g, cx, cy + 1, 15, 0x0d9488);
		for (const [ex, ey, er] of [
			[cx - 6, cy + 2, 4.2],
			[cx + 6, cy + 1, 4.2],
			[cx, cy - 5, 4.8],
			[cx - 1, cy + 6, 3.6]
		]) {
			cc(g, ex, ey, er, 0xf59e0b, 0x78350f, 1.2);
			cc(g, ex - 1, ey - 1, er * 0.4, 0xfef08a);
		}
		return;
	}
	if (isReptilePool) {
		rr(g, cx - 23, cy - 18, 46, 38, 10, 0x0f766e, 0x134e4a, 2);
		rr(g, cx - 18, cy - 13, 36, 28, 7, 0x06b6d4);
		pp(
			g,
			[cx + 4, cy - 10, cx + 16, cy - 6, cx + 14, cy + 8, cx + 2, cy + 5],
			0x64748b,
			0x1e293b,
			1.4
		);
		cc(g, cx - 8, cy + 3, 5 + Math.sin(time * 4) * 1.2, undefined, 0xa5f3fc, 1.4);
		return;
	}
	if (isSwamp) {
		cc(g, cx, cy + 2, 23, 0x365314, 0x1a2e05, 2);
		cc(g, cx, cy + 2, 17, 0x4d7c0f);
		for (const [lx, ly] of [
			[cx - 10, cy + 7],
			[cx + 10, cy - 4],
			[cx + 6, cy + 9]
		])
			cc(g, lx, ly, 3.6, 0x84cc16, 0x365314, 1);
		ln(g, cx - 14, cy - 16, cx + 14, cy - 16, 0x78350f, 3.5);
		ln(g, cx - 12, cy - 16, cx - 12, cy + 2, 0x451a03, 2.5);
		ln(g, cx + 12, cy - 16, cx + 12, cy + 2, 0x451a03, 2.5);
		cc(g, cx, cy - 10, 4, 0x92400e, 0x451a03, 1.2);
		return;
	}

	if (name.includes('джерело') || name.includes('вир')) {
		const isWhirl = name.includes('вир');
		cc(g, cx, cy + 1, 23, 0x0c4a6e, 0x38bdf8, 1.8);
		cc(g, cx, cy + 1, 17, 0x0284c7);
		cc(g, cx, cy + 1, 11, 0x22d3ee, 0xe0f2fe, 1.2);
		cc(g, cx, cy, 5, 0xe0f2fe);
		if (isWhirl) {
			for (const [wx, wy] of [
				[cx - 12, cy - 8],
				[cx + 12, cy + 9],
				[cx + 11, cy - 9]
			]) {
				cc(g, wx, wy, 3, 0x67e8f9);
			}
		}
		return;
	}

	if (isNaga && name.includes('фонтан')) {
		cc(g, cx, cy + 1, 24, 0x0f766e, 0xfbbf24, 2);
		cc(g, cx, cy + 1, 17, 0x0d9488);
		pp(g, [cx, cy - 12, cx + 6, cy + 2, cx - 6, cy + 2], 0xfbbf24, 0x78350f, 1.3);
		cc(g, cx, cy - 13, 3.5, 0x22d3ee);
		return;
	}

	const rim = isBlood ? 0x450a0a : isPain ? 0x4c1d95 : isNaga ? 0xd97706 : 0x94a3b8;
	const water = isBlood ? 0xb91c1c : isPain ? 0x7e22ce : isNaga ? 0x06b6d4 : 0x0284c7;
	const ripple = isBlood ? 0xfca5a5 : isPain ? 0xe879f9 : 0xbae6fd;
	cc(g, cx, cy + 1, 24, rim, 0x0f172a, 2);
	cc(g, cx, cy + 1, 18.5, water);
	g.circle(cx, cy + 1, 6 + ((time * 8) % 10));
	g.stroke({ color: ripple, width: 1.4, alpha: 0.7 });
	g.circle(cx, cy + 1, 6 + ((time * 8 + 5) % 10));
	g.stroke({ color: ripple, width: 1, alpha: 0.4 });
	cc(g, cx, cy, 5.5, isNaga ? 0xfbbf24 : 0xe2e8f0);
	cc(g, cx, cy - 1, 2.5, ripple);
	if (isNaga) {
		for (const sx of [cx - 18, cx + 18]) {
			rr(g, sx - 3.5, cy - 14, 7, 22, 2, 0xfbbf24, 0x78350f, 1.3);
			cc(g, sx, cy - 15, 3, 0x22d3ee);
		}
	}
}

function drawMagicPortalModel(ctx: BuildingModelContext, name: string, isFlyer: boolean): void {
	const { g, cx, cy, pal, playerColor, time } = ctx;
	const isDemon = name.includes('пекл') || name.includes('демон') || pal.style === 'Демони';
	const portalCol = isDemon ? 0xf97316 : isFlyer ? 0xfbbf24 : 0xa855f7;
	apron(g, cx, cy + 7, 27, 16, pal.ground, portalCol);
	g.roundRect(cx - 21, cy - 16, 9, 34, 3);
	g.roundRect(cx + 12, cy - 16, 9, 34, 3);
	g.roundRect(cx - 23, cy - 20, 46, 9, 4);
	g.fill({ color: pal.wallDark });
	g.stroke({ color: pal.wallTrim, width: 1.6 });
	const pulse = 1 + Math.sin(time * 5) * 0.12;
	ee(g, cx, cy + 2, 11 * pulse, 15 * pulse, portalCol, undefined, 0, 0.85);
	ee(g, cx, cy + 2, 6, 9, isDemon ? 0xfef08a : 0xe0f2fe, undefined, 0, 0.9);
	cc(g, cx + Math.cos(time * 4) * 5, cy + Math.sin(time * 4) * 6, 2.2, playerColor);
}

function drawDragonGraveyardModel(ctx: BuildingModelContext): void {
	const { g, cx, cy, time } = ctx;
	apron(g, cx, cy + 3, 29, 23, 0x1e1b4b, 0x22c55e);
	for (const s of [-1, 1]) {
		for (const ry of [cy - 10, cy - 2, cy + 6])
			ln(g, cx, ry - 4, cx + s * 17, ry + 5, 0xe2e8f0, 3.2);
	}
	rr(g, cx - 3, cy - 16, 6, 26, 2, 0xcbd5e1);
	pp(
		g,
		[cx - 8, cy + 6, cx + 8, cy + 6, cx + 5, cy + 18, cx - 5, cy + 18],
		0xf1f5f9,
		0x0f172a,
		1.4
	);
	const glow = 0.75 + Math.sin(time * 4) * 0.25;
	cc(g, cx - 3, cy + 11, 2, 0x4ade80, undefined, 0, glow);
	cc(g, cx + 3, cy + 11, 2, 0x4ade80, undefined, 0, glow);
}

function drawPlagueWagonModel(ctx: BuildingModelContext): void {
	const { g, cx, cy, isWest, time } = ctx;
	const dir = isWest ? 1 : -1;
	apron(g, cx, cy + 6, 27, 17, 0x2e1065, 0x4d7c0f);
	rr(g, cx - 18, cy - 8, 36, 22, 4, 0x5c4033, 0x1c1917, 1.6);
	for (const [wx, wy] of [
		[cx - 12, cy - 10],
		[cx + 12, cy - 10],
		[cx - 12, cy + 15],
		[cx + 12, cy + 15]
	]) {
		ee(g, wx, wy, 6, 3.2, 0x292524, 0x94a3b8, 1.2);
	}
	cc(g, cx - dir * 2, cy + 2, 8.5, 0x1e293b);
	cc(g, cx - dir * 2, cy + 2, 6, 0x22c55e, undefined, 0, 0.88 + Math.sin(time * 7) * 0.12);
	cc(g, cx + Math.sin(time * 5) * 3, cy - 6, 2.5, 0xa3e635);
}

function drawCursedMineModel(ctx: BuildingModelContext): void {
	const { g, cx, cy, time } = ctx;
	apron(g, cx, cy + 4, 29, 22, 0x1e293b);
	pp(
		g,
		[cx - 24, cy + 16, cx - 19, cy - 15, cx, cy - 22, cx + 21, cy - 13, cx + 24, cy + 16],
		0x475569,
		0x0f172a,
		1.8
	);
	rr(g, cx - 11, cy - 4, 22, 20, 4, 0x090d16, 0x78350f, 3);
	for (const ry of [cy + 14, cy + 19, cy + 23]) ln(g, cx - 7, ry, cx + 7, ry, 0x94a3b8, 1.5);
	pp(
		g,
		[cx - 17, cy + 6, cx - 13, cy - 3, cx - 10, cy + 6],
		0xa3e635,
		undefined,
		0,
		0.8 + Math.sin(time * 4) * 0.2
	);
}

function drawSkullOrPitModel(ctx: BuildingModelContext, isSkullPile: boolean): void {
	const { g, cx, cy, time } = ctx;
	apron(g, cx, cy + 3, 27, 22, 0x1e1b4b, 0x22c55e);
	if (isSkullPile) {
		for (const [sx, sy] of [
			[cx - 10, cy + 8],
			[cx, cy + 9],
			[cx + 10, cy + 8],
			[cx - 5, cy + 1],
			[cx + 6, cy + 1],
			[cx, cy - 7]
		]) {
			cc(g, sx, sy, 6.2, 0xe2e8f0, 0x1e293b, 1.2);
			cc(g, sx - 2, sy, 1.3, 0x22c55e);
			cc(g, sx + 2, sy, 1.3, 0x22c55e);
		}
		return;
	}
	cc(g, cx, cy + 2, 21, 0x334155, 0x0f172a, 2);
	cc(g, cx, cy + 2, 14, 0x052e16);
	cc(g, cx, cy + 2, 7 + Math.sin(time * 5) * 2, 0x22c55e, undefined, 0, 0.65);
}

function drawSlaughterOrBarnModel(ctx: BuildingModelContext, isBarn: boolean): void {
	const { g, px, py, cx, cy, roofDark, roofLight } = ctx;
	apron(g, cx, cy + 4, 27, 21, isBarn ? 0x365314 : 0x450a0a);
	rr(
		g,
		px + 9,
		py + 11,
		CELL_SIZE - 18,
		CELL_SIZE - 22,
		5,
		isBarn ? 0x3f6212 : 0x7f1d1d,
		0x1c1917,
		1.8
	);
	rr(
		g,
		px + 11,
		py + 12,
		(CELL_SIZE - 22) * 0.5,
		CELL_SIZE - 26,
		4,
		isBarn ? 0x65a30d : roofLight,
		undefined,
		0,
		0.78
	);
	if (isBarn) cc(g, cx + 10, cy + 4, 7.5, 0x22c55e, 0x14532d, 1.4);
	else {
		pp(
			g,
			[cx - 6, cy - 6, cx + 8, cy - 6, cx + 6, cy + 8, cx - 2, cy + 6],
			0xe2e8f0,
			roofDark,
			1.4
		);
		cc(g, cx - 8, cy + 12, 3.5, 0xef4444);
	}
}

function drawCryptMausoleumModel(ctx: BuildingModelContext): void {
	const { g, px, py, cx, cy, roofDark, pal, time } = ctx;
	apron(g, cx, cy + 4, 28, 22, 0x1e293b, 0x22c55e);
	rr(g, px + 11, py + 10, CELL_SIZE - 22, CELL_SIZE - 24, 3, pal.wall, 0x0f172a, 1.8);
	pp(g, [cx, py + 6, px + CELL_SIZE - 10, py + 22, px + 10, py + 22], roofDark, pal.wallTrim, 1.5);
	doorway(g, cx - 6, cy + 4, 12, 16, 0x94a3b8);
	for (const hx of [px + 10, px + CELL_SIZE - 10])
		rr(g, hx - 3, cy + 10, 6, 10, 2, 0xcbd5e1, 0x0f172a, 1);
	cc(g, cx, py + 16, 3, 0x22c55e, undefined, 0, 0.7 + Math.sin(time * 4) * 0.25);
}

function drawKodoCorralModel(ctx: BuildingModelContext, name: string): void {
	const { g, px, py, cx, cy, pal, playerColor } = ctx;
	const isAggressive = name.includes('агрес');
	const isDefensive = name.includes('захис');
	apron(g, cx, cy + 3, 29, 23, isDefensive ? 0x334155 : 0x5c4033, pal.woodDark);
	rr(
		g,
		px + 8,
		py + 12,
		CELL_SIZE - 16,
		CELL_SIZE - 22,
		4,
		undefined,
		isDefensive ? 0x64748b : 0x92400e,
		isDefensive ? 3.8 : 3.2
	);
	for (const [fx, fy] of [
		[px + 8, py + 12],
		[px + CELL_SIZE - 8, py + 12],
		[px + 8, py + CELL_SIZE - 10],
		[px + CELL_SIZE - 8, py + CELL_SIZE - 10]
	]) {
		cc(g, fx, fy, isDefensive ? 4.2 : 3.2, isDefensive ? 0x94a3b8 : 0x451a03, 0x0f172a, 1);
	}
	if (isAggressive) {
		for (const sx of [cx - 12, cx - 2]) {
			cc(g, sx, cy - 5, 5.5, 0xdc2626, 0x450a0a, 1.4);
			cc(g, sx, cy - 5, 2.2, 0xfbbf24);
		}
		pp(g, [cx + 12, cy - 16, cx + 22, cy - 10, cx + 12, cy - 4], 0xef4444, 0x450a0a, 1.2);
	} else if (isDefensive) {
		rr(g, cx - 14, cy - 8, 12, 16, 3, 0x38bdf8, 0x0f172a, 1.4);
		cc(g, cx - 8, cy, 3, 0xfef08a);
		rr(g, cx + 2, cy + 4, 16, 8, 2, 0x475569, 0x0f172a, 1.2);
	} else {
		rr(g, px + 13, py + 17, 12, 9, 2, 0xfacc15);
		ee(g, cx + 3, cy + 3, 13, 9, 0x78716c, 0x1c1917, 1.5);
		rr(g, cx - 2, cy - 3, 10, 11, 2, playerColor);
	}
}

function drawWarTentModel(ctx: BuildingModelContext, name: string): void {
	const { g, cx, cy, roofDark, roofMid, roofLight, pal, time } = ctx;
	const isShaman = name.includes('шаман') || name.includes('знахар');
	const isTrapper = name.includes('капкан');

	if (isShaman) {
		apron(g, cx, cy + 4, 28, 22, 0x2e1065, 0x38bdf8);
		cc(g, cx, cy - 1, 20, 0x4c1d95, 0x1e1b4b, 1.8);
		cc(g, cx, cy - 3, 14, roofMid, 0x0f172a, 1.4);
		cc(g, cx, cy - 6, 6.5, 0x38bdf8, 0xe0f2fe, 1.2);
		const pulse = 0.7 + Math.sin(time * 5) * 0.3;
		cc(g, cx - 14, cy + 12, 4, 0xf97316, 0x7c2d12, 1.2);
		cc(g, cx - 14, cy + 11, 2.2, 0xfef08a, undefined, 0, pulse);
		cc(g, cx + 14, cy + 12, 3.5, 0xa855f7, undefined, 0, pulse);
		doorway(g, cx - 4, cy + 6, 8, 11, 0x0f172a);
		return;
	}

	apron(g, cx, cy + 4, 27, 21, pal.ground, pal.woodDark);
	ln(g, cx - 8, cy - 26, cx + 7, cy - 10, 0xfef3c7, 2.2);
	ln(g, cx + 8, cy - 26, cx - 7, cy - 10, 0xfef3c7, 2.2);
	pp(
		g,
		[cx, cy - 22, cx + 22, cy - 2, cx + 18, cy + 17, cx - 18, cy + 17, cx - 22, cy - 2],
		roofDark,
		0x1c1917,
		1.8
	);
	pp(
		g,
		[cx, cy - 22, cx, cy + 17, cx - 18, cy + 17, cx - 22, cy - 2],
		roofLight,
		undefined,
		0,
		0.85
	);
	pp(g, [cx, cy - 22, cx + 10, cy + 17, cx - 10, cy + 17], roofMid, undefined, 0, 0.78);
	doorway(g, cx - 5, cy + 4, 10, 13, 0x451a03);
	if (isTrapper) {
		cc(g, cx + 12, cy + 9, 5, undefined, 0xe2e8f0, 2);
		ln(g, cx - 16, cy + 6, cx - 12, cy + 15, 0xfef3c7, 2);
	} else {
		cc(g, cx - 13, cy + 10, 4.5, 0xd97706, 0x451a03, 1.4);
		cc(g, cx - 13, cy + 10, 2, 0xfef3c7);
	}
}

function drawMurlocOrStiltHutModel(ctx: BuildingModelContext, name: string): void {
	const { g, cx, cy, roofLight, playerColor, pal, isUpgraded, time } = ctx;
	const isFrostTroll = pal.style === 'Північ' || name.includes('крижан') || name.includes('знахар');
	if (isFrostTroll) {
		const isShamanUpgrade = name.includes('шатро') || name.includes('знахар') || isUpgraded;
		apron(g, cx, cy + 4, 28, 22, 0x1e293b, isShamanUpgrade ? 0x38bdf8 : 0x7dd3fc);
		cc(g, cx, cy + 1, 18, 0x334155, 0x0f172a, 1.6);
		cc(g, cx, cy - 1, 14, 0x0284c7, 0xbae6fd, 1.3);
		doorway(g, cx - 4, cy + 4, 8, 12, 0x0f172a);
		if (isShamanUpgrade) {
			for (const sx of [cx - 18, cx + 18]) {
				rr(g, sx - 3, cy - 16, 6, 24, 2, 0x78350f, 0x0f172a, 1.2);
				cc(g, sx, cy - 17, 3.4, 0x38bdf8);
			}
			const pulse = 0.75 + Math.sin(time * 4.5) * 0.25;
			cc(g, cx, cy - 8, 5, 0x22d3ee, 0xffffff, 1.2, pulse);
		} else {
			cc(g, cx, cy - 6, 3.5, 0xbae6fd);
		}
		return;
	}
	apron(g, cx, cy + 4, 28, 22, 0x0c4a6e, 0x2dd4bf);
	const huts =
		name.includes('селище') || name.includes('фортеця')
			? [
					{ x: cx - 11, y: cy - 3, r: 12 },
					{ x: cx + 11, y: cy + 3, r: 12 },
					{ x: cx, y: cy - 11, r: 13 }
				]
			: [{ x: cx, y: cy, r: 19 }];
	if (name.includes('фортеця')) cc(g, cx, cy, 24, undefined, 0x92400e, 3);
	for (const h of huts) {
		cc(g, h.x, h.y + 2, h.r, 0x78350f, 0x451a03, 1.5);
		cc(g, h.x, h.y, h.r - 2, 0xd97706);
		cc(g, h.x - 2, h.y - 2, h.r * 0.55, roofLight, undefined, 0, 0.72);
		cc(g, h.x, h.y - 2, 3.2, playerColor);
	}
}

function drawAncientGroveModel(ctx: BuildingModelContext, name: string): void {
	const { g, cx, cy, pal, time } = ctx;
	const isCorrupt = name.includes('оскверн');
	const isSpectral = name.includes('примарн');
	const leafMain = isCorrupt ? 0x7f1d1d : isSpectral ? 0x3b0764 : 0x15803d;
	const leafLight = isCorrupt ? 0xf97316 : isSpectral ? 0x67e8f9 : 0x4ade80;
	const trunk = isCorrupt ? 0x450a0a : isSpectral ? 0x1e1b4b : 0x78350f;
	apron(g, cx, cy + 5, 27, 21, pal.ground, leafLight);
	for (const [rx, ry] of [
		[cx - 14, cy + 16],
		[cx + 14, cy + 16],
		[cx, cy + 20]
	])
		ln(g, cx, cy + 4, rx, ry, trunk, 5);
	for (const [fx, fy, fr] of [
		[cx - 12, cy - 3, 12],
		[cx + 12, cy - 3, 12],
		[cx, cy - 13, 14],
		[cx, cy + 2, 13]
	]) {
		cc(g, fx, fy, fr, leafMain, 0x0f172a, 1.4, isSpectral ? 0.8 : 1);
	}
	cc(g, cx - 4, cy - 8, 9, leafLight, undefined, 0, isSpectral ? 0.55 : 0.75);
	const pulse = 0.75 + Math.sin(time * 3.5) * 0.25;
	cc(
		g,
		cx - 4,
		cy + 4,
		2.3,
		isCorrupt ? 0xfef08a : isSpectral ? 0xa5f3fc : 0x67e8f9,
		undefined,
		0,
		pulse
	);
	cc(
		g,
		cx + 4,
		cy + 4,
		2.3,
		isCorrupt ? 0xfef08a : isSpectral ? 0xa5f3fc : 0x67e8f9,
		undefined,
		0,
		pulse
	);
	if (isSpectral) cc(g, cx, cy - 2, 16, undefined, 0x67e8f9, 1.3, 0.65);
}

function drawRelicOrStatueModel(ctx: BuildingModelContext, name: string): void {
	const { g, cx, cy, pal, playerColor, time } = ctx;
	apron(g, cx, cy + 4, 25, 20, pal.wallDark, pal.accent);
	if (name.includes('тотем')) {
		rr(g, cx - 6, cy - 20, 12, 38, 3, 0x78350f, 0x451a03, 1.6);
		g.poly([cx - 21, cy - 12, cx - 6, cy - 8, cx - 6, cy - 2, cx - 18, cy - 5]);
		g.poly([cx + 21, cy - 12, cx + 6, cy - 8, cx + 6, cy - 2, cx + 18, cy - 5]);
		g.fill({ color: playerColor });
		cc(g, cx, cy - 12, 3.5, 0x38bdf8, undefined, 0, 0.75 + Math.sin(time * 5) * 0.25);
		return;
	}
	if (name.includes('ріг героїв')) {
		cc(g, cx, cy + 2, 16, 0x9ca3af, 0x1c1917, 1.8);
		pp(
			g,
			[cx - 13, cy + 5, cx - 3, cy - 9, cx + 12, cy - 8, cx + 15, cy + 4, cx + 4, cy + 2],
			0xfbbf24,
			0x78350f,
			1.4
		);
		return;
	}
	rr(g, cx - 14, cy + 2, 28, 16, 3, pal.wall, 0x0f172a, 1.6);
	pp(g, [cx, cy - 21, cx + 10, cy + 2, cx - 10, cy + 2], pal.accent, pal.wallTrim, 1.5);
}

function drawObeliskMonolithModel(ctx: BuildingModelContext, name: string): void {
	const { g, cx, cy, pal, time } = ctx;
	const isPlague = name.includes('чумн');
	const isElemental = name.includes('стихій');
	const glowCol = isPlague
		? 0x4ade80
		: name.includes('світл')
			? 0xfef08a
			: name.includes('заморожувач')
				? 0x7dd3fc
				: 0x38bdf8;
	apron(g, cx, cy + 5, 25, 19, pal.wallDark, glowCol);
	const pulse = Math.sin(time * 3.5 + cx) * 2;
	pp(
		g,
		[cx, cy - 23 + pulse, cx + 11, cy + 4, cx, cy + 16, cx - 11, cy + 4],
		isPlague ? 0x1e293b : pal.wall,
		glowCol,
		1.8
	);
	cc(g, cx, cy - 3 + pulse, 4.5, glowCol);
	if (isPlague) {
		cc(g, cx - 10, cy + 11, 5, 0x22c55e, 0x14532d, 1.2);
		cc(g, cx + 10, cy + 10, 4, 0x84cc16, 0x14532d, 1.2);
	} else if (isElemental) {
		for (const [ox, oy, col] of [
			[cx - 15, cy - 6, 0xf97316],
			[cx + 15, cy - 6, 0x38bdf8],
			[cx, cy + 15, 0xfef08a]
		]) {
			cc(g, ox, oy, 3.6, col, 0x0f172a, 1);
		}
	}
}

function drawTechSpecialtyModel(ctx: BuildingModelContext, name: string): void {
	const { g, px, py, cx, cy, playerColor, time } = ctx;
	apron(g, cx, cy + 4, 28, 22, 0x1e293b, 0x475569);
	if (name.includes('лісопилка')) {
		rr(g, px + 8, py + 10, 30, 26, 3, 0x78350f, 0x451a03, 1.6);
		for (const ly of [cy + 4, cy + 11, cy + 18])
			rr(g, cx + 2, ly - 3, 18, 5, 2, 0xb45309, 0x451a03, 1);
		cc(g, cx - 5, cy + 6, 9, 0xcbd5e1, 0x0f172a, 1.5);
		const sr = time * 10;
		ln(
			g,
			cx - 5 + Math.cos(sr) * 7,
			cy + 6 + Math.sin(sr) * 7,
			cx - 5 - Math.cos(sr) * 7,
			cy + 6 - Math.sin(sr) * 7,
			0x334155,
			2
		);
		return;
	}
	if (name.includes('ка-бум')) {
		rr(g, px + 9, py + 11, CELL_SIZE - 18, CELL_SIZE - 22, 5, 0x991b1b, 0xfacc15, 2);
		cc(g, cx, cy - 2, 11, 0xf97316, 0xfef08a, 1.5);
		cc(g, cx + 14, cy + 12, 5, 0xdc2626, 0x0f172a, 1.2);
		return;
	}
	if (name.includes('склад запчастин')) {
		rr(g, px + 10, py + 12, 22, 20, 2, 0xb45309);
		rr(g, px + 34, py + 14, 18, 18, 2, 0x64748b);
		cc(g, cx - 4, cy + 10, 9, 0xd97706, 0x1e293b, 2);
		return;
	}
	rr(g, px + 11, py + 12, CELL_SIZE - 22, CELL_SIZE - 24, 5, 0x334155, 0x38bdf8, 1.8);
	for (const tx of [cx - 10, cx + 10]) {
		cc(g, tx, cy, 6.5, 0xd97706);
		cc(g, tx, cy, 3, 0x7dd3fc);
	}
	if (Math.sin(time * 22) > -0.2) {
		g.beginPath();
		g.moveTo(cx - 10, cy);
		g.lineTo(cx, cy - 5 + Math.sin(time * 35) * 4);
		g.lineTo(cx + 10, cy);
		g.stroke({ color: 0xe0f2fe, width: 2 });
	}
	if (name.includes('щитів')) {
		g.circle(cx, cy, 22);
		g.fill({ color: playerColor, alpha: 0.22 });
		g.stroke({ color: 0x38bdf8, width: 1.6, alpha: 0.85 });
	}
}

function drawFoundryOrTankBayModel(ctx: BuildingModelContext, name: string): void {
	const { g, px, py, cx, cy, isWest, roofDark, roofLight, isUpgraded, time } = ctx;
	const dir = isWest ? 1 : -1;
	apron(g, cx, cy + 4, 29, 22, 0x1e293b, 0x475569);
	rr(
		g,
		px + 8,
		py + 10,
		CELL_SIZE - 16,
		CELL_SIZE - 20,
		4,
		0x475569,
		isUpgraded ? 0xfbbf24 : 0x0f172a,
		1.8
	);
	rr(g, px + 13, py + 12, CELL_SIZE - 26, 20, 3, roofDark);
	rr(g, px + 14, py + 13, (CELL_SIZE - 28) * 0.52, 16, 2, roofLight, undefined, 0, 0.88);
	for (const sx of [px + 14, px + CELL_SIZE - 16]) cc(g, sx, py + 10, 4, 0x1e293b, 0xd97706, 1.5);
	cc(g, px + 14, py + 6 - ((time * 16) % 12) * 0.4, 3, 0x94a3b8, undefined, 0, 0.45);
	if (name.includes('голем') || name.includes('кузня')) {
		cc(g, cx, cy + 8, 7.5, 0x1c1917);
		cc(g, cx, cy + 8, 4.8, 0xf97316, undefined, 0, 0.8 + Math.sin(time * 8) * 0.2);
	} else if (name.includes('мінер')) {
		rr(g, px + 14, py + 38, CELL_SIZE - 28, 8, 0, 0xfacc15, undefined, 0, 0.85);
		for (const dx of [cx - 8, cx, cx + 8]) {
			rr(g, dx - 3, cy + 4, 6, 9, 1, 0xef4444, 0x450a0a, 1);
		}
	} else if (name.includes('штурм')) {
		rr(g, px + 14, py + 38, CELL_SIZE - 28, 8, 0, 0x38bdf8, undefined, 0, 0.75);
		ln(g, cx - 2, cy + 6, cx + dir * 15, cy + 6, 0xe2e8f0, 2.4);
		ln(g, cx - 2, cy + 10, cx + dir * 15, cy + 10, 0xe2e8f0, 2.4);
	} else {
		rr(g, px + 14, py + 38, CELL_SIZE - 28, 8, 0, 0xfacc15, undefined, 0, 0.8);
		ln(g, cx, cy + 8, cx + dir * 16, cy + 8, 0xe2e8f0, 4.2);
		cc(g, cx - 4, cy + 8, 5, 0x334155, 0x0f172a, 1.3);
	}
}

function drawAirfieldHangarModel(ctx: BuildingModelContext, name: string): void {
	const { g, px, py, cx, cy, isWest, roofDark, roofLight } = ctx;
	const dir = isWest ? 1 : -1;
	apron(g, cx, cy + 4, 29, 22, 0x334155, 0x94a3b8);
	rr(g, px + 9, py + 9, CELL_SIZE - 18, 30, 12, roofDark, 0x0f172a, 1.8);
	for (let hx = px + 14; hx < px + CELL_SIZE - 14; hx += 7)
		ln(g, hx, py + 11, hx, py + 37, 0x0f172a, 1, 0.45);
	rr(g, px + 12, py + 11, CELL_SIZE - 24, 10, 4, roofLight, undefined, 0, 0.72);
	rr(g, px + 15, py + 41, CELL_SIZE - 30, 10, 2, 0x1e293b);
	pp(
		g,
		[cx - dir * 6, cy + 14, cx + dir * 9, cy + 14, cx, cy + 8],
		name.includes('бомбардув') ? 0xef4444 : 0xe2e8f0
	);
}

function drawArtilleryEmplacementModel(ctx: BuildingModelContext, name: string): void {
	const { g, cx, cy, isWest, roofMid } = ctx;
	const dir = isWest ? 1 : -1;
	apron(g, cx, cy + 4, 26, 21, 0x44403c);
	cc(g, cx, cy + 1, 19, 0x78716c, 0x1c1917, 2);
	cc(g, cx, cy + 1, 12, roofMid);
	ln(
		g,
		cx - dir * 3,
		cy + 1,
		cx + dir * 21,
		cy - 3,
		name.includes('мортир') ? 0xd97706 : 0x1e293b,
		6
	);
	cc(g, cx - dir * 10, cy + 7, 2.5, 0x0f172a);
	cc(g, cx - dir * 6, cy + 10, 2.5, 0x0f172a);
}

function drawTowerOrRuinsModel(ctx: BuildingModelContext, name: string): void {
	const { g, px, py, cx, cy, pal, roofDark, roofLight, time } = ctx;
	if (name.includes('руїн') || name.includes('знищений')) {
		apron(g, cx, cy + 4, 27, 21, pal.ground);
		pp(
			g,
			[px + 10, py + 14, px + 36, py + 12, px + 30, py + 44, px + 11, py + 48],
			pal.wallDark,
			0x1c1917,
			1.5
		);
		pp(g, [px + 34, py + 24, px + 52, py + 28, px + 49, py + 48, px + 36, py + 44], pal.wall);
		ln(g, px + 14, py + 18, px + 48, py + 42, 0x78350f, 3.5);
		return;
	}
	apron(g, cx, cy + 6, 22, 16, pal.ground);
	cc(g, cx, cy + 2, 19, pal.wallDark, 0x0f172a, 1.8);
	cc(g, cx, cy - 2, 17, pal.wall, 0x1c1917, 1.5);
	for (let i = 0; i < 6; i++) {
		const a = (i / 6) * Math.PI * 2;
		cc(g, cx + Math.cos(a) * 15, cy - 2 + Math.sin(a) * 15, 2.8, pal.wallTrim);
	}
	cc(g, cx, cy - 4, 11, roofDark);
	cc(g, cx - 2, cy - 6, 7, roofLight, undefined, 0, 0.85);
	const beacon =
		pal.style === 'Північ'
			? 0x7dd3fc
			: pal.style === 'Нежить'
				? 0x22c55e
				: pal.style === 'Техніки' || pal.style === 'Елементалі'
					? 0x38bdf8
					: pal.style === 'Тварини'
						? 0x4ade80
						: pal.style === 'Небожителі'
							? 0xfef9c3
							: 0xfef08a;
	const isAbyssEye = name.includes('око');
	const isEraser = name.includes('стирач');
	const isGryphon = name.includes('грифон');
	if (isGryphon) {
		for (const s of [-1, 1]) {
			pp(
				g,
				[cx + s * 10, cy - 6, cx + s * 25, cy - 16, cx + s * 21, cy + 4, cx + s * 11, cy + 4],
				0xfef3c7,
				0x78350f,
				1.3
			);
		}
		cc(g, cx, cy - 6, 6.5, 0xfbbf24, 0x78350f, 1.4);
		cc(g, cx, cy - 6, 2.8, 0x38bdf8);
		return;
	}
	if (isAbyssEye) {
		cc(g, cx, cy - 6, 8, 0xf97316, 0x450a0a, 1.5);
		ln(g, cx, cy - 11, cx, cy - 1, 0x090d16, 2.4);
		return;
	}
	if (isEraser) {
		cc(g, cx, cy - 6, 10, undefined, 0xd946ef, 1.6, 0.85);
		pp(g, [cx, cy - 14, cx + 6, cy - 6, cx, cy + 2, cx - 6, cy - 6], 0xa855f7, 0xf5d0fe, 1.2);
		return;
	}
	cc(g, cx, cy - 6, 4 + Math.sin(time * 6) * 0.7, beacon);
}

function drawRoostOrCliffModel(ctx: BuildingModelContext, name: string): void {
	const { g, cx, cy, pal, roofLight } = ctx;
	const isIce = pal.style === 'Північ';
	const isNaga = pal.style === 'Наги' || name.includes('зміїна');
	const isDragonNest = name.includes('дракон') && !isIce;
	const isWyvernCamp = name.includes('гострокрил') || name.includes('табір');

	if (isDragonNest) {
		pp(
			g,
			[
				cx - 24,
				cy + 14,
				cx - 21,
				cy - 10,
				cx - 4,
				cy - 22,
				cx + 19,
				cy - 15,
				cx + 25,
				cy + 9,
				cx + 7,
				cy + 22
			],
			0x450a0a,
			0x0f172a,
			1.8
		);
		cc(g, cx, cy - 1, 13, 0x7c2d12, 0xf97316, 1.6);
		cc(g, cx - 4, cy - 2, 4.2, 0xef4444, 0x450a0a, 1.1);
		cc(g, cx + 4, cy, 3.8, 0xfbbf24, 0x78350f, 1.1);
		return;
	}

	if (isWyvernCamp) {
		apron(g, cx, cy + 4, 27, 21, 0x44403c, 0x78350f);
		for (const tx of [cx - 17, cx + 17]) {
			rr(g, tx - 3, cy - 18, 6, 30, 2, 0x78350f, 0x1c1917, 1.3);
			cc(g, tx, cy - 19, 3.2, 0x38bdf8);
		}
		pp(
			g,
			[cx - 14, cy + 4, cx - 10, cy - 14, cx + 10, cy - 14, cx + 14, cy + 4],
			0xb45309,
			0x451a03,
			1.6
		);
		cc(g, cx, cy - 5, 4.5, 0x2563eb, 0xfef3c7, 1.2);
		return;
	}

	pp(
		g,
		[
			cx - 24,
			cy + 14,
			cx - 21,
			cy - 10,
			cx - 4,
			cy - 22,
			cx + 19,
			cy - 15,
			cx + 25,
			cy + 9,
			cx + 7,
			cy + 22
		],
		isIce ? 0x64748b : isNaga ? 0x0f766e : 0x57534e,
		0x0f172a,
		1.8
	);
	cc(g, cx, cy - 2, 12, isIce ? 0xe0f2fe : 0x78350f, pal.accent, 1.5);
	for (const s of [-1, 1])
		pp(
			g,
			[cx + s * 4, cy - 3, cx + s * 18, cy - 12, cx + s * 13, cy + 3],
			roofLight,
			0x0f172a,
			1.1
		);
	cc(g, cx, cy - 3, 3.8, isIce ? 0x38bdf8 : 0xf97316);
}

function drawTempleOrCathedralModel(ctx: BuildingModelContext, name: string): void {
	const { g, px, py, cx, cy, pal, roofDark, roofLight, isUpgraded, time } = ctx;
	apron(g, cx, cy + 5, 29, 22, pal.ground);
	if (name.includes('піраміда') || name.includes('зміїний')) {
		rr(g, px + 7, py + 9, CELL_SIZE - 14, CELL_SIZE - 18, 3, pal.wallDark, 0x0f172a, 1.6);
		rr(g, px + 13, py + 15, CELL_SIZE - 26, CELL_SIZE - 30, 2, pal.wall, pal.wallTrim, 1.4);
		rr(g, px + 20, py + 21, CELL_SIZE - 40, CELL_SIZE - 42, 2, 0xfbbf24);
		cc(g, cx, cy - 2, 4, pal.glow);
		return;
	}
	if (name.includes('вівтар')) {
		rr(g, px + 10, py + 12, CELL_SIZE - 20, CELL_SIZE - 24, 6, pal.wallDark, pal.accent, 1.8);
		for (const [fx, fy] of [
			[px + 13, py + 15],
			[px + CELL_SIZE - 13, py + 15],
			[px + 13, py + CELL_SIZE - 15],
			[px + CELL_SIZE - 13, py + CELL_SIZE - 15]
		]) {
			cc(g, fx, fy, 3.5, pal.accent);
		}
		cc(g, cx, cy, 8, roofLight, undefined, 0, 0.8 + Math.sin(time * 4) * 0.2);
		return;
	}
	g.roundRect(px + 8, py + 19, CELL_SIZE - 16, 24, 4);
	g.roundRect(px + 17, py + 9, CELL_SIZE - 34, CELL_SIZE - 18, 4);
	g.fill({ color: pal.wall });
	g.stroke({ color: 0x0f172a, width: 1.8 });
	g.roundRect(px + 10, py + 21, CELL_SIZE - 20, 18, 3);
	g.roundRect(px + 19, py + 11, CELL_SIZE - 38, CELL_SIZE - 24, 3);
	g.fill({ color: roofDark });
	rr(
		g,
		px + 20,
		py + 12,
		(CELL_SIZE - 40) * 0.55,
		CELL_SIZE - 28,
		2,
		roofLight,
		undefined,
		0,
		0.88
	);
	if (isUpgraded || name.includes('собор') || name.includes('правосуддя')) {
		for (const sx of [px + 13, px + CELL_SIZE - 13])
			cc(g, sx, py + 14, 5.5, 0xfbbf24, 0x451a03, 1.2);
	}
	cc(g, cx, cy - 1, 5.5, pal.glow, pal.accent, 1.4);
}

function drawArcaneAcademyModel(ctx: BuildingModelContext, name: string): void {
	const { g, px, py, cx, cy, pal, roofDark, roofLight, isUpgraded, time } = ctx;
	apron(g, cx, cy + 5, 29, 22, pal.ground);
	rr(g, px + 8, py + 18, CELL_SIZE - 16, 28, 4, pal.wall, 0x0f172a, 1.6);
	rr(g, px + 10, py + 18, CELL_SIZE - 20, 22, 4, roofDark);
	rr(g, px + 11, py + 19, (CELL_SIZE - 22) * 0.5, 16, 3, roofLight, undefined, 0, 0.8);
	rr(g, px + 18, py + 9, CELL_SIZE - 36, 16, 4, pal.wallTrim, 0x0f172a, 1.3);
	cc(g, cx, cy - 2, 11.5, pal.wood, pal.accent, 1.8);
	const bob = Math.sin(time * 4 + px) * 1.8;
	if (name.includes('тіней')) {
		cc(g, cx, cy - 2, 6, 0xa855f7);
		cc(g, cx + 2, cy - 3, 4.5, 0x0f172a);
	} else if (name.includes('кривавих')) {
		cc(g, cx, cy - 2, 5.5, 0xef4444, 0xfbbf24, 1.4);
		pp(g, [cx - 14, cy - 6, cx - 5, cy - 2, cx - 12, cy + 4], 0xfbbf24);
		pp(g, [cx + 14, cy - 6, cx + 5, cy - 2, cx + 12, cy + 4], 0xfbbf24);
	} else if (name.includes('чарівництв')) {
		cc(g, cx, cy - 2, 8.5, undefined, 0x38bdf8, 1.4);
		cc(g, cx, cy - 2 + bob * 0.5, 4.5, 0x22d3ee, 0xffffff, 1);
	} else {
		pp(
			g,
			[cx, cy - 11 + bob, cx + 5.5, cy - 3 + bob, cx, cy + 5 + bob, cx - 5.5, cy - 3 + bob],
			pal.glow,
			0xffffff,
			1
		);
	}
	if (isUpgraded) {
		cc(g, px + 13, py + 20, 4.5, 0xfbbf24);
		cc(g, px + CELL_SIZE - 13, py + 20, 4.5, 0xfbbf24);
	}
	if (isUpgraded) {
		for (const [bx, by] of [
			[px + 9, py + 10],
			[px + CELL_SIZE - 9, py + 10],
			[px + 9, py + CELL_SIZE - 12],
			[px + CELL_SIZE - 9, py + CELL_SIZE - 12]
		]) {
			cc(g, bx, by, 4.5, pal.wallDark, 0xfbbf24, 1.3);
		}
		cc(g, cx, cy - 2, 7, 0xfbbf24, 0x451a03, 1.4);
		cc(g, cx, cy - 2, 3.5, pal.glow);
	}
	drawRacialCrestAccent(ctx);
}

function drawArcheryCampModel(ctx: BuildingModelContext, name: string): void {
	const { g, px, py, cx, cy, isWest, pal, roofDark, roofLight, isUpgraded } = ctx;
	const dir = isWest ? 1 : -1;
	apron(g, cx, cy + 4, 29, 22, pal.ground);

	if (name.includes('зала')) {
		rr(g, px + 10, py + 14, CELL_SIZE - 20, CELL_SIZE - 24, 4, pal.wall, 0x1c1917, 1.7);
		pp(g, [cx, py + 5, px + CELL_SIZE - 7, py + 20, px + 7, py + 20], roofDark, 0x0f172a, 1.5);
		doorway(g, cx - 5, cy + 6, 10, 14, 0x451a03);
		if (name.includes('зброяр')) {
			rr(g, cx - 7, cy - 7, 14, 9, 2, 0x94a3b8, 0x0f172a, 1.2);
		} else {
			ln(g, cx - 7, cy - 8, cx - 2, cy - 3, 0xfbbf24, 2);
			ln(g, cx + 7, cy - 8, cx + 2, cy - 3, 0xfbbf24, 2);
		}
		return;
	}

	const hx = isWest ? px + 8 : px + 26;
	rr(g, hx, py + 11, 28, CELL_SIZE - 22, 4, pal.wood, 0x1c1917, 1.6);
	rr(g, hx + 1, py + 10, 26, CELL_SIZE - 26, 4, roofDark);
	rr(g, hx + 2, py + 11, 14, CELL_SIZE - 28, 3, roofLight, undefined, 0, 0.9);
	if (name.includes('зеніт')) {
		cc(g, cx + dir * 13, cy + 2, 8, 0x475569, 0x0f172a, 1.5);
		ln(g, cx + dir * 11, cy, cx + dir * 21, cy - 9, 0xe2e8f0, 2.5);
		ln(g, cx + dir * 15, cy + 3, cx + dir * 24, cy - 5, 0xe2e8f0, 2.5);
		return;
	}
	if (isUpgraded || name.includes('вежа')) {
		rr(g, hx - 2, py + 4, 32, 14, 3, pal.wall, 0xfbbf24, 1.5);
		cc(g, hx + 14, py + 11, 6, roofDark, 0xfbbf24, 1.4);
	}
	const tx = cx + dir * 15;
	cc(g, tx, cy + 2, 8.5, 0xfef3c7, 0x78350f, 1.5);
	cc(g, tx, cy + 2, 5, 0xef4444);
	cc(g, tx, cy + 2, 2.2, 0xfef08a);
	if (isUpgraded || name.includes('вежа')) {
		cc(g, tx - dir * 2, cy - 12, 5.5, 0xfef3c7, 0x78350f, 1.2);
		cc(g, tx - dir * 2, cy - 12, 2.5, 0xef4444);
	}
}

function drawSiegeWorkshopModel(ctx: BuildingModelContext): void {
	const { g, px, py, cx, cy, isWest, pal, roofDark, roofLight } = ctx;
	const dir = isWest ? 1 : -1;
	apron(g, cx, cy + 4, 29, 22, pal.ground);
	rr(g, px + 9, py + 9, CELL_SIZE - 18, 25, 4, roofDark, 0x1c1917, 1.7);
	rr(g, px + 11, py + 10, (CELL_SIZE - 22) * 0.55, 20, 3, roofLight, undefined, 0, 0.85);
	rr(g, cx - 13, cy + 5, 26, 13, 2, pal.wood, 0x1c1917, 1.4);
	ln(g, cx - dir * 8, cy + 12, cx + dir * 12, cy + 4, 0xfef3c7, 2.5);
	cc(g, cx + dir * 13, cy + 4, 3, 0x64748b);
}

function drawDemonCageModel(ctx: BuildingModelContext): void {
	const { g, px, py, cx, cy, time } = ctx;
	apron(g, cx, cy + 4, 27, 21, 0x271313, 0x991b1b);
	rr(g, px + 11, py + 11, CELL_SIZE - 22, CELL_SIZE - 22, 4, 0x090d16, 0xef4444, 2);
	for (let bx = px + 17; bx < px + CELL_SIZE - 14; bx += 7)
		ln(g, bx, py + 11, bx, py + CELL_SIZE - 11, 0x71717a, 2);
	const pulse = 0.75 + Math.sin(time * 6) * 0.25;
	cc(g, cx - 4, cy, 2.2, 0xf97316, undefined, 0, pulse);
	cc(g, cx + 4, cy, 2.2, 0xf97316, undefined, 0, pulse);
}

function drawWingedHallOrBarracksModel(
	ctx: BuildingModelContext,
	name: string,
	unitHp: number,
	armorType: string
): void {
	const { g, px, py, cx, cy, isWest, pal, roofDark, roofLight, isUpgraded, seed } = ctx;
	const dir = isWest ? 1 : -1;
	const isHeavy = armorType === 'fort' || armorType === 'large' || unitHp >= 800;
	const wingY = seed % 2 === 0 ? py + 24 : py + 12;
	apron(g, cx, cy + 5, 29, 22, pal.ground);
	rr(g, px + 8, wingY, CELL_SIZE - 16, 26, 4, pal.wallDark, 0x0f172a, 1.6);
	rr(
		g,
		px + 13,
		py + 9,
		CELL_SIZE - 26,
		CELL_SIZE - 18,
		4,
		pal.wall,
		isUpgraded ? 0xfbbf24 : 0x1c1917,
		isUpgraded ? 2 : 1.6
	);
	rr(g, px + 9, wingY - 2, CELL_SIZE - 18, 20, 4, roofDark, 0x0f172a, 1.3);
	rr(
		g,
		px + 15,
		py + 8,
		CELL_SIZE - 30,
		CELL_SIZE - 23,
		4,
		roofDark,
		isUpgraded ? 0xf59e0b : 0x0f172a,
		1.4
	);
	rr(g, px + 16, py + 9, (CELL_SIZE - 32) * 0.52, CELL_SIZE - 26, 3, roofLight, undefined, 0, 0.9);
	ln(g, cx, py + 10, cx, py + CELL_SIZE - 17, isUpgraded ? 0xfbbf24 : pal.woodDark, 2.2);
	doorway(g, isWest ? px + CELL_SIZE - 15 : px + 9, cy - 4, 6, 11, pal.wood);
	if (isHeavy) {
		for (const [tx, ty] of [
			[px + 11, py + 11],
			[px + CELL_SIZE - 11, py + 11],
			[px + 11, py + CELL_SIZE - 13],
			[px + CELL_SIZE - 11, py + CELL_SIZE - 13]
		]) {
			cc(g, tx, ty, 5.2, pal.wall, 0x0f172a, 1.2);
		}
		cc(g, cx, cy - 2, 5.5, pal.accent);
	} else if (name.includes('цитадел')) {
		cc(g, cx, cy - 4, 7.5, pal.woodDark, 0xf97316, 1.6);
	} else {
		ln(g, cx - 5, cy - 7, cx + 5, cy + 2, 0xe2e8f0, 1.8);
		ln(g, cx + 5, cy - 7, cx - 5, cy + 2, 0xe2e8f0, 1.8);
		cc(g, cx + dir * 13, cy + 12, 3.2, pal.wood);
	}
	if (isUpgraded) {
		for (const [bx, by] of [
			[px + 9, py + 10],
			[px + CELL_SIZE - 9, py + 10],
			[px + 9, py + CELL_SIZE - 12],
			[px + CELL_SIZE - 9, py + CELL_SIZE - 12]
		]) {
			cc(g, bx, by, 4.5, pal.wallDark, 0xfbbf24, 1.3);
		}
		cc(g, cx, cy - 2, 7, 0xfbbf24, 0x451a03, 1.4);
		cc(g, cx, cy - 2, 3.5, pal.glow);
	}
	drawRacialCrestAccent(ctx);
}

function drawRacialCrestAccent(ctx: BuildingModelContext): void {
	const { g, px, py, cx, pal } = ctx;
	switch (pal.style) {
		case 'Ельфи':
			pp(g, [cx - 3, py + 8, cx, py + 1, cx + 3, py + 8], 0xfbbf24);
			break;
		case 'Небожителі':
			cc(g, cx, py + 6, 4.5, undefined, 0xfef08a, 1.8);
			break;
		case 'Тварини':
			cc(g, px + 11, py + 14, 5.5, 0x16a34a, undefined, 0, 0.9);
			cc(g, px + CELL_SIZE - 11, py + 14, 5.5, 0x16a34a, undefined, 0, 0.9);
			break;
		case 'Орки':
			pp(g, [px + 11, py + 16, px + 6, py + 7, px + 14, py + 12], 0xfef3c7);
			pp(
				g,
				[px + CELL_SIZE - 11, py + 16, px + CELL_SIZE - 6, py + 7, px + CELL_SIZE - 14, py + 12],
				0xfef3c7
			);
			break;
		case 'Тролі':
			cc(g, cx - 3, py + 9, 3.2, 0x2dd4bf);
			cc(g, cx + 3, py + 9, 3.2, 0x2dd4bf);
			break;
		case 'Демони':
			pp(g, [px + 14, py + 13, px + 8, py + 4, px + 18, py + 10], 0x991b1b);
			pp(
				g,
				[px + CELL_SIZE - 14, py + 13, px + CELL_SIZE - 8, py + 4, px + CELL_SIZE - 18, py + 10],
				0x991b1b
			);
			break;
		case 'Елементалі':
			cc(g, cx, py + 9, 3.6, 0x38bdf8);
			break;
		case 'Нежить':
			cc(g, cx, py + 10, 3.5, 0x22c55e);
			break;
	}
}

export function drawRaceCastleModel(
	g: Graphics,
	cx: number,
	cy: number,
	race: string,
	playerColor: number,
	isSelected: boolean,
	time: number
): void {
	const pal = getRacePalette(race);
	const roofMid = playerColor;
	const roofDark = shadeHexColor(playerColor, 0.52);
	const roofLight = shadeHexColor(playerColor, 1.28);

	apron(g, cx, cy + 4, 34, 27, pal.ground, pal.accent);
	if (isSelected) {
		g.ellipse(cx, cy + 2, 37, 31);
		g.stroke({ color: 0xfbbf24, width: 2.2, alpha: 0.8 + Math.sin(time * 5) * 0.2 });
	}

	// Main keep walls
	rr(g, cx - 22, cy - 20, 44, 42, 6, pal.wallDark, 0x0f172a, 1.8);
	rr(g, cx - 18, cy - 16, 36, 34, 4, pal.wall, pal.wallTrim, 1.3);

	// Four corner towers
	const corners: Array<[number, number]> = [
		[cx - 21, cy - 19],
		[cx + 21, cy - 19],
		[cx - 21, cy + 19],
		[cx + 21, cy + 19]
	];

	if (pal.style === 'Нежить') {
		for (const [tx, ty] of corners) {
			pp(g, [tx, ty - 9, tx + 6, ty + 3, tx - 6, ty + 3], 0x1e1b4b, 0x22c55e, 1.3);
		}
		rr(g, cx - 10, cy - 10, 20, 20, 3, 0x0f172a, 0x22c55e, 1.4);
		cc(g, cx, cy, 5.5, 0x22c55e);
	} else if (pal.style === 'Орки') {
		for (const [tx, ty] of corners) {
			cc(g, tx, ty, 6, 0x78350f, 0x1c1917, 1.4);
			pp(g, [tx - 3, ty - 2, tx, ty - 10, tx + 3, ty - 2], 0xfef3c7);
		}
		rr(g, cx - 11, cy - 9, 22, 18, 3, roofDark, 0xfef3c7, 1.4);
		cc(g, cx, cy, 4.5, 0xef4444);
	} else if (pal.style === 'Демони') {
		for (const [tx, ty] of corners) {
			pp(g, [tx, ty - 10, tx + 6, ty + 4, tx - 6, ty + 4], 0x450a0a, 0xf97316, 1.3);
		}
		cc(g, cx, cy, 9.5, 0x7c2d12, 0xf97316, 1.6);
		cc(g, cx, cy, 5, 0xfef08a);
	} else if (pal.style === 'Техніки') {
		for (const [tx, ty] of corners) {
			rr(g, tx - 5, ty - 5, 10, 10, 2, 0x475569, 0xd97706, 1.3);
		}
		cc(g, cx - 8, cy - 12, 3.5, 0x94a3b8);
		cc(g, cx + 8, cy - 12, 3.5, 0x94a3b8);
		cc(g, cx, cy, 8, 0x1e293b, 0x38bdf8, 1.6);
		cc(g, cx, cy, 3.5, 0x38bdf8);
	} else if (pal.style === 'Північ') {
		for (const [tx, ty] of corners) {
			pp(g, [tx, ty - 10, tx + 6, ty, tx, ty + 6, tx - 6, ty], 0x38bdf8, 0xe0f2fe, 1.2);
		}
		pp(g, [cx, cy - 13, cx + 11, cy + 2, cx, cy + 12, cx - 11, cy + 2], 0x0ea5e9, 0xe0f2fe, 1.5);
	} else if (pal.style === 'Ельфи') {
		for (const [tx, ty] of corners) {
			cc(g, tx, ty, 6, 0x15803d, 0xfbbf24, 1.3);
		}
		cc(g, cx, cy, 9, 0x166534, 0xfbbf24, 1.5);
		cc(g, cx, cy - 1, 4.5, 0x67e8f9);
	} else if (pal.style === 'Небожителі') {
		for (const [tx, ty] of corners) {
			cc(g, tx, ty, 6, 0xfef3c7, 0xd97706, 1.3);
		}
		cc(g, cx, cy, 9, undefined, 0xfbbf24, 2);
		cc(g, cx, cy, 5, 0xfef08a);
	} else if (pal.style === 'Тролі') {
		for (const [tx, ty] of corners) {
			rr(g, tx - 4, ty - 7, 8, 14, 2, 0x78350f, 0x2dd4bf, 1.2);
		}
		pp(g, [cx, cy - 12, cx + 12, cy + 8, cx - 12, cy + 8], 0x0f766e, 0xfbbf24, 1.4);
		cc(g, cx, cy + 1, 4, 0x2dd4bf);
	} else if (pal.style === 'Елементалі') {
		const elCols = [0x4ade80, 0xf97316, 0x38bdf8, 0xa855f7];
		corners.forEach(([tx, ty], i) => {
			cc(g, tx, ty, 5.8, elCols[i], 0x0f172a, 1.3);
		});
		cc(g, cx, cy, 8, 0x1e293b, 0x38bdf8, 1.6);
		cc(g, cx, cy, 4, 0xfef08a);
	} else if (pal.style === 'Тварини') {
		for (const [tx, ty] of corners) {
			cc(g, tx, ty, 6.2, 0x3f6212, 0x84cc16, 1.3);
		}
		ln(g, cx - 9, cy - 11, cx - 3, cy - 3, 0xfef3c7, 2.2);
		ln(g, cx + 9, cy - 11, cx + 3, cy - 3, 0xfef3c7, 2.2);
		cc(g, cx, cy + 2, 6, 0x15803d, 0xfbbf24, 1.3);
	} else if (pal.style === 'Наги') {
		cc(g, cx, cy, 24, undefined, 0x06b6d4, 2.5);
		for (const [tx, ty] of corners) {
			cc(g, tx, ty, 5.5, 0x0d9488, 0xfbbf24, 1.3);
		}
		rr(g, cx - 9, cy - 9, 18, 18, 4, 0x0f766e, 0xfbbf24, 1.5);
		cc(g, cx, cy, 4.5, 0x22d3ee);
	} else {
		// Альянс
		for (const [tx, ty] of corners) {
			cc(g, tx, ty, 6, roofDark, 0x0f172a, 1.3);
			cc(g, tx, ty, 2.5, roofLight);
		}
		rr(g, cx - 10, cy - 10, 20, 20, 3, roofMid, 0xfbbf24, 1.6);
		cc(g, cx, cy, 4, 0xfef08a);
	}
	doorway(g, cx - 4, cy + 10, 8, 11, 0x1c1917);
}
