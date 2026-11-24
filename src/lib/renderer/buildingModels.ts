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

const PALETTES: Record<PlayableRace, RacePalette> = {
	Нежить: {
		style: 'Нежить',
		wall: 0x475569,
		wallDark: 0x1e293b,
		wallTrim: 0xcbd5e1,
		wood: 0x4c1d95,
		woodDark: 0x2e1065,
		accent: 0x22c55e,
		glow: 0xa3e635,
		ground: 0x1e1b4b
	},
	Орки: {
		style: 'Орки',
		wall: 0x92400e,
		wallDark: 0x451a03,
		wallTrim: 0xfef3c7,
		wood: 0x78350f,
		woodDark: 0x3b1804,
		accent: 0xf97316,
		glow: 0xfbbf24,
		ground: 0x5c4033
	},
	Демони: {
		style: 'Демони',
		wall: 0x3f3f46,
		wallDark: 0x18181b,
		wallTrim: 0x991b1b,
		wood: 0x7f1d1d,
		woodDark: 0x450a0a,
		accent: 0xf97316,
		glow: 0xfef08a,
		ground: 0x271313
	},
	Техніки: {
		style: 'Техніки',
		wall: 0x64748b,
		wallDark: 0x334155,
		wallTrim: 0xd97706,
		wood: 0x92400e,
		woodDark: 0x451a03,
		accent: 0xfacc15,
		glow: 0x38bdf8,
		ground: 0x1e293b
	},
	Північ: {
		style: 'Північ',
		wall: 0xe0f2fe,
		wallDark: 0x64748b,
		wallTrim: 0x7dd3fc,
		wood: 0x475569,
		woodDark: 0x1e293b,
		accent: 0x38bdf8,
		glow: 0xbae6fd,
		ground: 0x334155
	},
	Ельфи: {
		style: 'Ельфи',
		wall: 0xf5f5f4,
		wallDark: 0xa8a29e,
		wallTrim: 0xfde047,
		wood: 0xb45309,
		woodDark: 0x78350f,
		accent: 0xf59e0b,
		glow: 0x38bdf8,
		ground: 0x365314
	},
	Небожителі: {
		style: 'Небожителі',
		wall: 0xfafaf9,
		wallDark: 0x94a3b8,
		wallTrim: 0xfef08a,
		wood: 0xeab308,
		woodDark: 0x854d0e,
		accent: 0x38bdf8,
		glow: 0xfef9c3,
		ground: 0x1e3a8a
	},
	Тролі: {
		style: 'Тролі',
		wall: 0x78716c,
		wallDark: 0x3f6212,
		wallTrim: 0x2dd4bf,
		wood: 0x854d0e,
		woodDark: 0x422006,
		accent: 0x22c55e,
		glow: 0x5eead4,
		ground: 0x14532d
	},
	Елементалі: {
		style: 'Елементалі',
		wall: 0x4c1d95,
		wallDark: 0x1e1b4b,
		wallTrim: 0x38bdf8,
		wood: 0x3730a3,
		woodDark: 0x1e1b4b,
		accent: 0x22d3ee,
		glow: 0xe879f9,
		ground: 0x2e1065
	},
	Тварини: {
		style: 'Тварини',
		wall: 0xa8a29e,
		wallDark: 0x57534e,
		wallTrim: 0x84cc16,
		wood: 0x3f6212,
		woodDark: 0x14532d,
		accent: 0xf59e0b,
		glow: 0x4ade80,
		ground: 0x14532d
	},
	Наги: {
		style: 'Наги',
		wall: 0x78716c,
		wallDark: 0x44403c,
		wallTrim: 0x2dd4bf,
		wood: 0x0f766e,
		woodDark: 0x134e4a,
		accent: 0xfbbf24,
		glow: 0x5eead4,
		ground: 0x0c4a6e
	},
	Альянс: {
		style: 'Альянс',
		wall: 0x9ca3af,
		wallDark: 0x57534e,
		wallTrim: 0xd6d3d1,
		wood: 0x92400e,
		woodDark: 0x451a03,
		accent: 0xfbbf24,
		glow: 0xfef08a,
		ground: 0x44403c
	}
};

const LEGACY_RACE_PALETTE_MAP: Record<string, PlayableRace> = {
	Порча: 'Елементалі',
	'Нічні ельфи': 'Тварини',
	Збирачі: 'Техніки'
};

export function getRacePalette(race?: string | null): RacePalette {
	const normalized = formatRaceName(race || '');
	if (normalized in PALETTES) {
		return PALETTES[normalized as PlayableRace];
	}
	const legacyTarget = LEGACY_RACE_PALETTE_MAP[normalized];
	if (legacyTarget) {
		return PALETTES[legacyTarget];
	}
	return PALETTES['Альянс'];
}

/**
 * Main entry point for rendering a single placed building with individual 2.5D silhouettes,
 * race materials, animated props, tactical selection corner brackets, and tier accents.
 */
export function drawIndividualBuildingModel(
	g: Graphics,
	b: Building,
	playerColor: number,
	rank: number,
	isUpgraded: boolean,
	isLegendary: boolean,
	isSelected: boolean,
	time: number
): void {
	const px = b.x;
	const py = b.y;
	const half = CELL_SIZE / 2;
	const cx = px + half;
	const cy = py + half;
	const pal = getRacePalette(b.race);

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
		pal,
		seed: hashId(b.defId || b.name)
	};

	drawSelectionAndShadow(ctx);

	// 1. Utility / Functional Special Buildings first
	if (b.specialType === 'forge') {
		drawForgeModel(ctx);
		return;
	}
	if (b.specialType === 'shop') {
		drawShopModel(ctx);
		return;
	}
	if (b.specialType === 'commander') {
		drawCommanderHallModel(ctx);
		return;
	}
	if (b.specialType === 'treasure') {
		drawTreasureVaultModel(ctx);
		return;
	}
	if (b.specialType === 'repair') {
		drawRepairStationModel(ctx);
		return;
	}
	if (b.specialType === 'recycler') {
		drawRecyclerMillModel(ctx);
		return;
	}

	const name = (b.name || '').toLowerCase();
	const defId = (b.defId || '').toLowerCase();
	const unitDef = b.spawnUnitId ? UNITS_MAP.get(b.spawnUnitId) : null;

	// 2. Match Iconic Individual Building Archetypes
	if (name.includes('вулкан')) {
		drawVolcanoModel(ctx);
	} else if (name.includes('око скверни')) {
		drawCorruptEyeModel(ctx);
	} else if (name.includes('забутий')) {
		drawEldritchHorrorModel(ctx);
	} else if (name.includes('морозний гриб')) {
		drawFrostMushroomsModel(ctx);
	} else if (name.includes('іглу')) {
		drawIglooModel(ctx);
	} else if (
		name.includes('крижані шипи') ||
		name.includes('крижані піки') ||
		name.includes('айсберг') ||
		name.includes('кришталевий замок') ||
		name.includes('снігове каміння')
	) {
		drawIceOrCrystalSpireModel(ctx, name);
	} else if (
		name.includes('фонтан') ||
		name.includes('колодязь') ||
		name.includes('нерестилище') ||
		name.includes('басейн')
	) {
		drawBasinPoolModel(ctx, name);
	} else if (name.includes('брама') || name.includes('портал')) {
		drawMagicPortalModel(ctx, name, unitDef?.flying ?? false);
	} else if (name.includes('драконячий цвинтар')) {
		drawDragonGraveyardModel(ctx);
	} else if (name.includes('чумний віз')) {
		drawPlagueWagonModel(ctx);
	} else if (name.includes('проклята шахта')) {
		drawCursedMineModel(ctx);
	} else if (name.includes('купа черепів') || name.includes('жертовна яма')) {
		drawSkullOrPitModel(ctx, name.includes('купа'));
	} else if (name.includes("м'ясорубка") || name.includes('заражена комора')) {
		drawSlaughterOrBarnModel(ctx, name.includes('комора'));
	} else if (name.includes('склеп') || name.includes('могильник')) {
		drawCryptMausoleumModel(ctx);
	} else if (name.includes('ферма кодо')) {
		drawKodoCorralModel(ctx, name);
	} else if (name.includes('шатро') || name.includes('намет')) {
		drawWarTentModel(ctx, name);
	} else if (name.includes('хатина') || name.includes('мурлоків')) {
		drawMurlocOrStiltHutModel(ctx, name);
	} else if (name.includes('давній') || name.includes('срібна галявина')) {
		drawAncientGroveModel(ctx, name);
	} else if (name.includes('тотем') || name.includes('ріг героїв') || name.includes('статуя')) {
		drawRelicOrStatueModel(ctx, name);
	} else if (name.includes('обез') || name.includes('обеліск') || name.includes('заморожувач')) {
		drawObeliskMonolithModel(ctx, name);
	} else if (
		name.includes('електростанція') ||
		name.includes('генератор') ||
		name.includes('склад запчастин') ||
		name.includes('ка-бум') ||
		name.includes('лісопилка')
	) {
		drawTechSpecialtyModel(ctx, name);
	} else if (
		name.includes('танкова') ||
		name.includes('танків') ||
		name.includes('мінерів') ||
		name.includes('големів') ||
		name.includes('звалище') ||
		name.includes('дробильня') ||
		name.includes('клепальня') ||
		name.includes('броньова кузня') ||
		name.includes('громильня')
	) {
		drawFoundryOrTankBayModel(ctx, name);
	} else if (
		name.includes('ангар') ||
		name.includes('повітряна фабрика') ||
		name.includes('бомбардувальник')
	) {
		drawAirfieldHangarModel(ctx, name);
	} else if (
		name.includes('мортирня') ||
		name.includes('камнеметня') ||
		name.includes('артилерія')
	) {
		drawArtilleryEmplacementModel(ctx, name);
	} else if (
		b.specialType === 'tower' ||
		name.includes('вежа') ||
		name.includes('ліхтар') ||
		name.includes('вартовий') ||
		name.includes('захисник') ||
		name.includes('стирач') ||
		name.includes('руїни') ||
		name.includes('знищений')
	) {
		drawTowerOrRuinsModel(ctx, name, defId);
	} else if (name.includes('гніздо') || name.includes('зміїна скеля') || unitDef?.flying) {
		drawRoostOrCliffModel(ctx, name);
	} else if (
		name.includes('церква') ||
		name.includes('собор') ||
		name.includes('піраміда') ||
		name.includes('храм') ||
		name.includes('вівтар') ||
		name.includes('правосуддя')
	) {
		drawTempleOrCathedralModel(ctx, name);
	} else if (
		name.includes('бібліотека') ||
		name.includes('університет') ||
		name.includes('школа') ||
		name.includes('академія') ||
		name.includes('тіней') ||
		name.includes('магічне місто') ||
		unitDef?.attack_type === 'magic'
	) {
		drawArcaneAcademyModel(ctx, name);
	} else if (
		name.includes('стрільців') ||
		name.includes('лучників') ||
		name.includes('зеніток') ||
		name.includes('мисливців') ||
		name.includes('рейнджер') ||
		unitDef?.attack_type === 'pierce'
	) {
		drawArcheryCampModel(ctx, name);
	} else if (name.includes('облогов') || unitDef?.attack_type === 'siege' || unitDef?.isArtillery) {
		drawSiegeWorkshopModel(ctx);
	} else if (name.includes('клітка')) {
		drawDemonCageModel(ctx);
	} else {
		drawWingedHallOrBarracksModel(ctx, name, unitDef?.hp ?? 0, unitDef?.armor_type ?? '');
	}

	// Tier pips & banner crest (only for combat spawners / upgradeable buildings)
	if (b.spawnUnitId) {
		drawTierAccents(ctx);
	}
}

// =========================================================================
// GROUND SHADOW, SELECTION BRACKETS & TIER ACCENTS
// =========================================================================

function drawSelectionAndShadow(ctx: BuildingModelContext): void {
	const { g, px, py, cx, cy, isSelected, isLegendary, time } = ctx;

	// Soft 2.5D contact shadow matching typical irregular silhouette
	g.beginPath();
	g.ellipse(cx + 3, cy + 7, 29, 24);
	g.fill({ color: 0x000000, alpha: 0.42 });

	if (isSelected) {
		const pulse = 0.72 + Math.sin(time * 5.5) * 0.22;
		g.beginPath();
		g.ellipse(cx, cy + 2, 33, 29);
		g.fill({ color: 0xfbbf24, alpha: 0.14 });
		g.stroke({ color: 0xfbbf24, width: 2.5, alpha: pulse });

		// Crisp RTS corner brackets
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
		const shimmer = 0.48 + Math.sin(time * 3 + px) * 0.18;
		g.beginPath();
		g.ellipse(cx, cy + 3, 31, 26);
		g.stroke({ color: 0xf59e0b, width: 1.8, alpha: shimmer });
	}
}

function drawTierAccents(ctx: BuildingModelContext): void {
	const { g, px, py, cx, rank, isUpgraded, isLegendary, playerColor, time } = ctx;

	// Subtle Tier Gems along bottom-front stone rim
	const pipCount = Math.max(1, Math.min(6, rank || 1));
	const spacing = 5.5;
	const startX = cx - ((pipCount - 1) * spacing) / 2;
	const pipY = py + CELL_SIZE - 4;
	for (let i = 0; i < pipCount; i++) {
		g.circle(startX + i * spacing, pipY, 1.8);
		g.fill({ color: isUpgraded || isLegendary ? 0xfbbf24 : 0xe2e8f0 });
		g.stroke({ color: 0x090d16, width: 0.8 });
	}

	// Small Animated War Pennant on Upgraded / Tier 3+ / Legendary Buildings
	if (isUpgraded || isLegendary || rank >= 4) {
		const mastX = cx + 19;
		const mastBot = py + 24;
		const mastTop = py + 1;
		const wave = Math.sin(time * 4.5 + px * 0.05) * 1.8;
		g.beginPath();
		g.moveTo(mastX, mastBot);
		g.lineTo(mastX, mastTop);
		g.stroke({ color: isLegendary ? 0xfbbf24 : 0x78350f, width: 1.8 });
		g.poly([mastX, mastTop + 1, mastX + 11, mastTop + 4 + wave, mastX, mastTop + 8]);
		g.fill({ color: isLegendary ? 0xfbbf24 : playerColor });
		g.stroke({ color: 0x0f172a, width: 0.8 });
	}
}

function drawGroundApron(
	g: Graphics,
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	color: number,
	border = 0x1c1917
): void {
	g.beginPath();
	g.ellipse(cx, cy + 4, rx, ry);
	g.fill({ color });
	g.stroke({ color: border, width: 1.4, alpha: 0.8 });
}

function drawDoorway(g: Graphics, x: number, y: number, w: number, h: number, trim: number): void {
	g.beginPath();
	g.roundRect(x, y, w, h, 2);
	g.fill({ color: 0x181310 });
	g.stroke({ color: trim, width: 1.2 });
}

// =========================================================================
// ARCHETYPES: SPECIAL UTILITY BUILDINGS
// =========================================================================

function drawForgeModel(ctx: BuildingModelContext): void {
	const { g, px, py, cx, cy, roofDark, roofLight, pal, time } = ctx;
	drawGroundApron(g, cx, cy + 2, 28, 23, 0x3f3a36);

	// Timber-Framed Smithy Shed at Back
	g.roundRect(px + 7, py + 7, CELL_SIZE - 14, 24, 4);
	g.fill({ color: roofDark });
	g.stroke({ color: 0x0f172a, width: 1.6 });
	g.roundRect(px + 9, py + 8, CELL_SIZE - 22, 11, 3);
	g.fill({ color: roofLight, alpha: 0.9 });

	// Brick Forge Chimney + Smoke
	g.roundRect(px + 10, py + 4, 11, 14, 2);
	g.fill({ color: 0x57534e });
	g.stroke({ color: 0x1c1917, width: 1.4 });
	const smokeShift = (time * 18) % 14;
	g.circle(px + 15 + Math.sin(time * 4) * 2, py + 2 - smokeShift * 0.5, 3.2);
	g.fill({ color: 0x94a3b8, alpha: 0.45 });

	// Glowing Coal Hearth
	const flicker = 0.78 + Math.sin(time * 15 + px) * 0.22;
	g.circle(cx - 10, cy + 9, 8.5);
	g.fill({ color: 0x292524 });
	g.stroke({ color: 0x57534e, width: 1.5 });
	g.circle(cx - 10, cy + 9, 5.2);
	g.fill({ color: 0xf97316, alpha: flicker });
	g.circle(cx - 10, cy + 9, 2.5);
	g.fill({ color: 0xfef08a });

	// Heavy Steel Anvil + Quench Bucket
	g.poly([cx + 2, cy + 5, cx + 19, cy + 5, cx + 15, cy + 14, cx + 5, cy + 14]);
	g.fill({ color: 0x94a3b8 });
	g.stroke({ color: 0x1e293b, width: 1.4 });
	g.circle(cx + 20, cy + 15, 4);
	g.fill({ color: pal.wood });
	g.circle(cx + 20, cy + 15, 2.2);
	g.fill({ color: 0x0284c7 });
}

function drawCommanderHallModel(ctx: BuildingModelContext): void {
	const { g, px, py, cx, cy, roofDark, roofMid, roofLight, pal, time } = ctx;
	drawGroundApron(g, cx, cy + 3, 29, 23, pal.ground);

	// Octagonal marble command plinth & royal steps
	g.roundRect(px + 8, py + 12, CELL_SIZE - 16, CELL_SIZE - 22, 5);
	g.fill({ color: pal.wallDark });
	g.stroke({ color: 0x0f172a, width: 1.6 });

	g.roundRect(px + 12, py + 16, CELL_SIZE - 24, CELL_SIZE - 28, 4);
	g.fill({ color: pal.wall });
	g.stroke({ color: pal.wallTrim, width: 1.2 });

	// Grand pitched command tent / keep roof with gold trim
	g.poly([cx, py + 4, px + CELL_SIZE - 10, cy - 2, px + 10, cy - 2]);
	g.fill({ color: roofDark });
	g.stroke({ color: 0xf59e0b, width: 1.5 });
	g.poly([cx, py + 6, px + CELL_SIZE - 14, cy - 4, cx, cy - 4]);
	g.fill({ color: roofLight, alpha: 0.78 });

	// Golden War Table & glowing tactical orb at center
	g.circle(cx, cy + 6, 8);
	g.fill({ color: 0x1e1b4b });
	g.stroke({ color: 0xfbbf24, width: 1.6 });
	const orbPulse = 0.75 + Math.sin(time * 4 + px) * 0.25;
	g.circle(cx, cy + 6, 4.2);
	g.fill({ color: 0x818cf8, alpha: orbPulse });

	// Dual standard banners flanking entrance
	for (const bx of [px + 12, px + CELL_SIZE - 12]) {
		g.rect(bx - 1, py + 18, 2, 16);
		g.fill({ color: 0xfbbf24 });
		g.poly([bx, py + 18, bx + (bx < cx ? -6 : 6), py + 21, bx, py + 25]);
		g.fill({ color: roofMid });
	}
}

function drawShopModel(ctx: BuildingModelContext): void {
	const { g, px, py, cx, cy, playerColor } = ctx;
	drawGroundApron(g, cx, cy + 3, 28, 22, 0x5c4033);

	// Wooden Market Stall Frame
	g.roundRect(px + 9, py + 9, CELL_SIZE - 18, 28, 4);
	g.fill({ color: 0x78350f });
	g.stroke({ color: 0x451a03, width: 1.5 });

	// Striped Merchant Canopy Awning
	g.roundRect(px + 7, py + 7, CELL_SIZE - 14, 24, 5);
	g.fill({ color: playerColor });
	g.stroke({ color: 0x451a03, width: 1.6 });
	for (let sx = px + 13; sx < px + CELL_SIZE - 13; sx += 11) {
		g.rect(sx, py + 8, 5, 22);
		g.fill({ color: 0xfef3c7, alpha: 0.92 });
	}

	// Crates, Potion Bottles & Banded Barrel in Courtyard
	g.roundRect(px + 11, py + 37, 12, 12, 2);
	g.fill({ color: 0x92400e });
	g.stroke({ color: 0x451a03, width: 1.3 });
	g.circle(cx, py + 43, 6.2);
	g.fill({ color: 0xb45309 });
	g.stroke({ color: 0xfbbf24, width: 1.2 });
	g.roundRect(px + 41, py + 37, 11, 12, 2);
	g.fill({ color: 0x78350f });
	g.stroke({ color: 0x451a03, width: 1.3 });
}

function drawTreasureVaultModel(ctx: BuildingModelContext): void {
	const { g, px, py, cx, cy, time } = ctx;
	drawGroundApron(g, cx, cy + 3, 28, 22, 0x334155);

	// Open Vault Stone Arch Behind
	g.roundRect(px + 10, py + 7, CELL_SIZE - 20, 22, 5);
	g.fill({ color: 0x475569 });
	g.stroke({ color: 0x0f172a, width: 1.6 });

	// Giant Ornate Chest Overflowing with Gold Coins
	g.roundRect(cx - 17, cy - 3, 34, 22, 4);
	g.fill({ color: 0x78350f });
	g.stroke({ color: 0xfbbf24, width: 2 });
	g.rect(cx - 16, cy - 1, 32, 5);
	g.fill({ color: 0xf59e0b });

	const sparkle = 0.75 + Math.sin(time * 5) * 0.25;
	for (const [gx, gy, r] of [
		[cx - 6, cy - 4, 4.2],
		[cx + 6, cy - 4, 4.2],
		[cx, cy - 6, 4.8],
		[cx - 11, cy + 16, 3],
		[cx + 12, cy + 15, 3]
	]) {
		g.circle(gx, gy, r);
		g.fill({ color: 0xfef08a, alpha: sparkle });
	}
	g.circle(cx, cy + 8, 3.5);
	g.fill({ color: 0xef4444 });
}

function drawRepairStationModel(ctx: BuildingModelContext): void {
	const { g, px, py, cx, cy } = ctx;
	drawGroundApron(g, cx, cy + 3, 28, 22, 0x44403c);

	// Cut Ashlar Stone Blocks
	g.roundRect(px + 10, py + 32, 16, 15, 2);
	g.fill({ color: 0x9ca3af });
	g.stroke({ color: 0x334155, width: 1.4 });
	g.roundRect(px + 14, py + 24, 12, 10, 2);
	g.fill({ color: 0xd6d3d1 });
	g.stroke({ color: 0x334155, width: 1.2 });

	// Emerald Mason Restoration Pad
	g.circle(cx + 9, cy + 4, 10);
	g.fill({ color: 0x064e3b });
	g.stroke({ color: 0x10b981, width: 1.8 });
	g.rect(cx + 6.5, cy - 2, 5, 12);
	g.rect(cx + 3, cy + 1.5, 12, 5);
	g.fill({ color: 0x34d399 });

	// Overhanging Timber Crane Boom
	g.beginPath();
	g.moveTo(px + 13, py + 12);
	g.lineTo(px + CELL_SIZE - 13, py + 23);
	g.stroke({ color: 0x92400e, width: 4 });
	g.circle(px + 13, py + 12, 5.5);
	g.fill({ color: 0x78350f });
	g.stroke({ color: 0xf59e0b, width: 1.2 });
}

function drawRecyclerMillModel(ctx: BuildingModelContext): void {
	const { g, cx, cy, time } = ctx;
	drawGroundApron(g, cx, cy + 3, 26, 21, 0x1e293b);

	// Octagonal Iron Hopper Mill
	g.circle(cx, cy + 1, 18);
	g.fill({ color: 0x334155 });
	g.stroke({ color: 0x38bdf8, width: 1.8 });

	const rot = time * 1.9;
	for (let i = 0; i < 6; i++) {
		const a = rot + (i * Math.PI) / 3;
		g.circle(cx + Math.cos(a) * 12, cy + 1 + Math.sin(a) * 12, 3.2);
		g.fill({ color: 0xf59e0b });
	}
	g.circle(cx, cy + 1, 10);
	g.fill({ color: 0xd97706 });
	g.stroke({ color: 0x451a03, width: 1.4 });
	g.circle(cx, cy + 1, 4);
	g.fill({ color: 0x0f172a });
}

// =========================================================================
// ARCHETYPES: ORGANIC, PORTALS, POOLS, VOLCANOES, ICE, TENTS
// =========================================================================

function drawVolcanoModel(ctx: BuildingModelContext): void {
	const { g, cx, cy, time } = ctx;
	drawGroundApron(g, cx, cy + 3, 30, 24, 0x1c1917, 0x7f1d1d);

	// Jagged Volcanic Mountain Slope
	g.poly([
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
	]);
	g.fill({ color: 0x292524 });
	g.stroke({ color: 0x0f172a, width: 2 });

	// Lava Streams down Slopes
	g.beginPath();
	g.moveTo(cx - 2, cy - 4);
	g.lineTo(cx - 9, cy + 16);
	g.moveTo(cx + 4, cy - 3);
	g.lineTo(cx + 12, cy + 13);
	g.stroke({ color: 0xea580c, width: 2.5 });

	// Glowing Bubbling Crater Caldera
	const pulse = 0.8 + Math.sin(time * 8) * 0.2;
	g.ellipse(cx, cy - 11, 10, 6);
	g.fill({ color: 0xef4444 });
	g.ellipse(cx, cy - 11, 6.5, 3.8);
	g.fill({ color: 0xfacc15, alpha: pulse });
}

function drawCorruptEyeModel(ctx: BuildingModelContext): void {
	const { g, cx, cy, time } = ctx;
	drawGroundApron(g, cx, cy + 4, 24, 18, 0x2e1065, 0x701a75);

	// Curved Obsidian Claws Cradle
	for (const s of [-1, 1]) {
		g.poly([
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
		]);
		g.fill({ color: 0x1e1b4b });
		g.stroke({ color: 0xc026d3, width: 1.4 });
	}

	// Fiery All-Seeing Eye Orb
	const look = Math.sin(time * 2.2) * 2.5;
	g.circle(cx, cy - 6, 10.5);
	g.fill({ color: 0xd946ef });
	g.stroke({ color: 0xfef08a, width: 1.5 });
	g.circle(cx, cy - 6, 7.5);
	g.fill({ color: 0xf97316 });
	g.ellipse(cx + look, cy - 6, 2.2, 6);
	g.fill({ color: 0x090d16 });
}

function drawEldritchHorrorModel(ctx: BuildingModelContext): void {
	const { g, cx, cy, time } = ctx;
	drawGroundApron(g, cx, cy + 3, 27, 22, 0x2e1065, 0xc026d3);

	// Waving Purple Void Tentacles
	for (let i = 0; i < 6; i++) {
		const a = (i / 6) * Math.PI * 2 + Math.sin(time * 2.5 + i) * 0.25;
		const tx = cx + Math.cos(a) * 24;
		const ty = cy + Math.sin(a) * 19;
		g.beginPath();
		g.moveTo(cx, cy);
		g.lineTo(tx, ty);
		g.stroke({ color: 0x7e22ce, width: 4.5 });
		g.circle(tx, ty, 2.6);
		g.fill({ color: 0xf0abfc });
	}

	// Central Fleshy Maw Dome + Cyclops Eyes
	g.circle(cx, cy - 2, 13);
	g.fill({ color: 0x4c1d95 });
	g.stroke({ color: 0x090d16, width: 1.8 });
	for (const [ex, ey, r] of [
		[cx - 4, cy - 5, 2.8],
		[cx + 5, cy - 3, 2.3],
		[cx, cy + 3, 3.2]
	]) {
		g.circle(ex, ey, r);
		g.fill({ color: 0xfacc15 });
	}
}

function drawFrostMushroomsModel(ctx: BuildingModelContext): void {
	const { g, cx, cy, time } = ctx;
	drawGroundApron(g, cx, cy + 5, 26, 20, 0x164e63, 0x7dd3fc);

	const caps = [
		{ x: cx - 10, y: cy + 2, r: 9, h: 10 },
		{ x: cx + 11, y: cy + 4, r: 8, h: 9 },
		{ x: cx, y: cy - 8, r: 13, h: 15 }
	];
	for (const m of caps) {
		// Stem
		g.roundRect(m.x - 3.5, m.y, 7, m.h, 2);
		g.fill({ color: 0xe0f2fe });
		g.stroke({ color: 0x334155, width: 1.2 });
		// Glowing Frost Cap
		g.ellipse(m.x, m.y - 1, m.r, m.r * 0.68);
		g.fill({ color: 0x0284c7 });
		g.stroke({ color: 0xbae6fd, width: 1.5 });
		g.circle(m.x - m.r * 0.3, m.y - 2, 2);
		g.circle(m.x + m.r * 0.25, m.y - 1, 1.8);
		g.fill({ color: 0xe0f2fe, alpha: 0.85 + Math.sin(time * 4 + m.x) * 0.15 });
	}
}

function drawIglooModel(ctx: BuildingModelContext): void {
	const { g, cx, cy, roofLight } = ctx;
	drawGroundApron(g, cx, cy + 5, 28, 22, 0xcbd5e1, 0x94a3b8);

	// Entrance Snow Tunnel (south)
	g.roundRect(cx - 8, cy + 7, 16, 15, 5);
	g.fill({ color: 0xe0f2fe });
	g.stroke({ color: 0x475569, width: 1.5 });
	g.roundRect(cx - 4.5, cy + 12, 9, 9, 3);
	g.fill({ color: 0xf97316, alpha: 0.85 });

	// Hemispherical Snow-Brick Dome
	g.circle(cx, cy - 2, 20);
	g.fill({ color: 0xf1f5f9 });
	g.stroke({ color: 0x38bdf8, width: 1.8 });
	// Sunlit crown facet & team flag
	g.circle(cx - 4, cy - 6, 12);
	g.fill({ color: 0xffffff, alpha: 0.75 });
	for (const ry of [cy - 10, cy - 2, cy + 5]) {
		g.beginPath();
		g.moveTo(cx - 16, ry);
		g.lineTo(cx + 16, ry);
		g.stroke({ color: 0x93c5fd, width: 1 });
	}
	g.beginPath();
	g.moveTo(cx, cy - 21);
	g.lineTo(cx, cy - 31);
	g.stroke({ color: 0x334155, width: 1.6 });
	g.poly([cx, cy - 31, cx + 9, cy - 28, cx, cy - 25]);
	g.fill({ color: roofLight });
}

function drawIceOrCrystalSpireModel(ctx: BuildingModelContext, name: string): void {
	const { g, cx, cy, isUpgraded, playerColor } = ctx;
	drawGroundApron(g, cx, cy + 5, 27, 20, 0x334155, 0x7dd3fc);

	if (name.includes('снігове каміння')) {
		for (const [rx, ry, r] of [
			[cx - 10, cy + 4, 10],
			[cx + 11, cy + 3, 9],
			[cx, cy - 6, 12]
		]) {
			g.circle(rx, ry, r);
			g.fill({ color: 0x64748b });
			g.stroke({ color: 0x1e293b, width: 1.5 });
			g.ellipse(rx - 2, ry - r * 0.4, r * 0.72, r * 0.38);
			g.fill({ color: 0xf1f5f9 });
		}
		return;
	}

	// Cluster of Faceted Glacier Crystal Spires
	const shards = [
		{ x: cx - 12, y: cy + 5, w: 8, h: 19, col: 0x0284c7 },
		{ x: cx + 12, y: cy + 4, w: 8, h: 20, col: 0x0ea5e9 },
		{ x: cx, y: cy + 7, w: 11, h: 28, col: isUpgraded ? playerColor : 0x38bdf8 }
	];
	for (const s of shards) {
		g.poly([s.x, s.y - s.h, s.x + s.w, s.y - 5, s.x, s.y + 5, s.x - s.w, s.y - 5]);
		g.fill({ color: s.col });
		g.stroke({ color: 0xe0f2fe, width: 1.4 });
		// Sunlit left facet highlight
		g.poly([s.x, s.y - s.h, s.x, s.y + 5, s.x - s.w, s.y - 5]);
		g.fill({ color: 0xbae6fd, alpha: 0.45 });
	}
}

function drawBasinPoolModel(ctx: BuildingModelContext, name: string): void {
	const { g, cx, cy, pal, time } = ctx;
	const isBlood = name.includes('кров');
	const isPain = name.includes('болю');
	const isNaga = pal.style === 'Наги';

	const rimCol = isBlood ? 0x450a0a : isPain ? 0x4c1d95 : isNaga ? 0x0f766e : 0x94a3b8;
	const waterCol = isBlood ? 0xb91c1c : isPain ? 0x7e22ce : isNaga ? 0x0d9488 : 0x0284c7;
	const rippleCol = isBlood ? 0xfca5a5 : isPain ? 0xe879f9 : 0xbae6fd;

	// Sculpted Stone/Coral Basin Ring
	g.circle(cx, cy + 1, 24);
	g.fill({ color: rimCol });
	g.stroke({ color: 0x0f172a, width: 2 });
	g.circle(cx, cy + 1, 18.5);
	g.fill({ color: waterCol });

	// Animated Ripples
	const r1 = 6 + ((time * 8) % 10);
	const r2 = 6 + ((time * 8 + 5) % 10);
	g.circle(cx, cy + 1, r1);
	g.stroke({ color: rippleCol, width: 1.4, alpha: 0.7 });
	g.circle(cx, cy + 1, r2);
	g.stroke({ color: rippleCol, width: 1, alpha: 0.4 });

	// Center Fountain Pillar or Naga Coral Arch
	g.circle(cx, cy, 5.5);
	g.fill({ color: isNaga ? 0xfbbf24 : 0xe2e8f0 });
	g.circle(cx, cy - 1, 2.5);
	g.fill({ color: rippleCol });

	if (name.includes('заболоч')) {
		for (const [lx, ly] of [
			[cx - 11, cy + 7],
			[cx + 10, cy - 5]
		]) {
			g.circle(lx, ly, 3.2);
			g.fill({ color: 0x4ade80 });
		}
	}
}

function drawMagicPortalModel(ctx: BuildingModelContext, name: string, isFlyer: boolean): void {
	const { g, cx, cy, pal, playerColor, time } = ctx;
	const isDemon = name.includes('пекл') || name.includes('демон') || pal.style === 'Демони';
	const portalCol = isDemon ? 0xf97316 : isFlyer ? 0xfbbf24 : 0xa855f7;
	const coreCol = isDemon ? 0xfef08a : 0xe0f2fe;

	drawGroundApron(g, cx, cy + 7, 27, 16, pal.ground, portalCol);

	// Twin Stone/Obsidian Arch Pillars + Overhead Lintel
	g.roundRect(cx - 21, cy - 16, 9, 34, 3);
	g.roundRect(cx + 12, cy - 16, 9, 34, 3);
	g.roundRect(cx - 23, cy - 20, 46, 9, 4);
	g.fill({ color: pal.wallDark });
	g.stroke({ color: pal.wallTrim, width: 1.6 });

	// Swirling Portal Vortex Inside Arch
	const pulse = 1 + Math.sin(time * 5) * 0.12;
	g.ellipse(cx, cy + 2, 11 * pulse, 15 * pulse);
	g.fill({ color: portalCol, alpha: 0.85 });
	g.ellipse(cx, cy + 2, 6, 9);
	g.fill({ color: coreCol, alpha: 0.9 });
	g.circle(cx + Math.cos(time * 4) * 5, cy + Math.sin(time * 4) * 6, 2.2);
	g.fill({ color: playerColor });
}

function drawDragonGraveyardModel(ctx: BuildingModelContext): void {
	const { g, cx, cy, time } = ctx;
	drawGroundApron(g, cx, cy + 3, 29, 23, 0x1e1b4b, 0x22c55e);

	// Curved Bleached Dragon Ribs Arching Over Grave
	for (const s of [-1, 1]) {
		for (const ry of [cy - 10, cy - 2, cy + 6]) {
			g.beginPath();
			g.moveTo(cx, ry - 4);
			g.lineTo(cx + s * 17, ry + 5);
			g.stroke({ color: 0xe2e8f0, width: 3.2 });
		}
	}
	// Spine & Horned Dragon Skull
	g.roundRect(cx - 3, cy - 16, 6, 26, 2);
	g.fill({ color: 0xcbd5e1 });
	g.poly([cx - 8, cy + 6, cx + 8, cy + 6, cx + 5, cy + 18, cx - 5, cy + 18]);
	g.fill({ color: 0xf1f5f9 });
	g.stroke({ color: 0x0f172a, width: 1.4 });
	// Glowing Necrotic Eye Sockets
	const glow = 0.75 + Math.sin(time * 4) * 0.25;
	g.circle(cx - 3, cy + 11, 2);
	g.circle(cx + 3, cy + 11, 2);
	g.fill({ color: 0x4ade80, alpha: glow });
}

function drawPlagueWagonModel(ctx: BuildingModelContext): void {
	const { g, cx, cy, isWest, time } = ctx;
	const dir = isWest ? 1 : -1;
	drawGroundApron(g, cx, cy + 6, 27, 17, 0x2e1065, 0x4d7c0f);

	// Wooden Plague Cart Body
	g.roundRect(cx - 18, cy - 8, 36, 22, 4);
	g.fill({ color: 0x5c4033 });
	g.stroke({ color: 0x1c1917, width: 1.6 });

	// 4 Spoked Iron-Rimmed Cart Wheels
	for (const [wx, wy] of [
		[cx - 12, cy - 10],
		[cx + 12, cy - 10],
		[cx - 12, cy + 15],
		[cx + 12, cy + 15]
	]) {
		g.ellipse(wx, wy, 6, 3.2);
		g.fill({ color: 0x292524 });
		g.stroke({ color: 0x94a3b8, width: 1.2 });
	}

	// Bubbling Toxic Green Cauldron Vat
	g.circle(cx - dir * 2, cy + 2, 8.5);
	g.fill({ color: 0x1e293b });
	g.circle(cx - dir * 2, cy + 2, 6);
	g.fill({ color: 0x22c55e, alpha: 0.88 + Math.sin(time * 7) * 0.12 });
	g.circle(cx + Math.sin(time * 5) * 3, cy - 6, 2.5);
	g.fill({ color: 0xa3e635 });
}

function drawCursedMineModel(ctx: BuildingModelContext): void {
	const { g, cx, cy, time } = ctx;
	drawGroundApron(g, cx, cy + 4, 29, 22, 0x1e293b);

	// Jagged Dark Rock Mound
	g.poly([cx - 24, cy + 16, cx - 19, cy - 15, cx, cy - 22, cx + 21, cy - 13, cx + 24, cy + 16]);
	g.fill({ color: 0x475569 });
	g.stroke({ color: 0x0f172a, width: 1.8 });

	// Timber-Framed Dark Mine Tunnel Entrance
	g.roundRect(cx - 11, cy - 4, 22, 20, 4);
	g.fill({ color: 0x090d16 });
	g.stroke({ color: 0x78350f, width: 3 });

	// Minecart Rail Ties + Glowing Cursed Ore Crystals
	for (const ry of [cy + 14, cy + 19, cy + 23]) {
		g.beginPath();
		g.moveTo(cx - 7, ry);
		g.lineTo(cx + 7, ry);
		g.stroke({ color: 0x94a3b8, width: 1.5 });
	}
	g.poly([cx - 17, cy + 6, cx - 13, cy - 3, cx - 10, cy + 6]);
	g.fill({ color: 0xa3e635, alpha: 0.8 + Math.sin(time * 4) * 0.2 });
}

function drawSkullOrPitModel(ctx: BuildingModelContext, isSkullPile: boolean): void {
	const { g, cx, cy, time } = ctx;
	drawGroundApron(g, cx, cy + 3, 27, 22, 0x1e1b4b, 0x22c55e);

	if (isSkullPile) {
		const skulls = [
			[cx - 10, cy + 8],
			[cx, cy + 9],
			[cx + 10, cy + 8],
			[cx - 5, cy + 1],
			[cx + 6, cy + 1],
			[cx, cy - 7]
		];
		for (const [sx, sy] of skulls) {
			g.circle(sx, sy, 6.2);
			g.fill({ color: 0xe2e8f0 });
			g.stroke({ color: 0x1e293b, width: 1.2 });
			g.circle(sx - 2, sy, 1.3);
			g.circle(sx + 2, sy, 1.3);
			g.fill({ color: 0x22c55e });
		}
		return;
	}

	// Sacrificial Abyssal Pit
	g.circle(cx, cy + 2, 21);
	g.fill({ color: 0x334155 });
	g.stroke({ color: 0x0f172a, width: 2 });
	g.circle(cx, cy + 2, 14);
	g.fill({ color: 0x052e16 });
	g.circle(cx, cy + 2, 7 + Math.sin(time * 5) * 2);
	g.fill({ color: 0x22c55e, alpha: 0.65 });
}

function drawSlaughterOrBarnModel(ctx: BuildingModelContext, isBarn: boolean): void {
	const { g, px, py, cx, cy, roofDark, roofLight } = ctx;
	drawGroundApron(g, cx, cy + 4, 27, 21, isBarn ? 0x365314 : 0x450a0a);

	// Timber & Slate Roofed Barn / Butcher Hall
	g.roundRect(px + 9, py + 11, CELL_SIZE - 18, CELL_SIZE - 22, 5);
	g.fill({ color: isBarn ? 0x3f6212 : 0x7f1d1d });
	g.stroke({ color: 0x1c1917, width: 1.8 });
	g.roundRect(px + 11, py + 12, (CELL_SIZE - 22) * 0.5, CELL_SIZE - 26, 4);
	g.fill({ color: isBarn ? 0x65a30d : roofLight, alpha: 0.78 });

	if (isBarn) {
		// Blighted Green Slime Vat next to Barn
		g.circle(cx + 10, cy + 4, 7.5);
		g.fill({ color: 0x22c55e });
		g.stroke({ color: 0x14532d, width: 1.4 });
	} else {
		// Hanging Steel Cleaver Blade Sign
		g.poly([cx - 6, cy - 6, cx + 8, cy - 6, cx + 6, cy + 8, cx - 2, cy + 6]);
		g.fill({ color: 0xe2e8f0 });
		g.stroke({ color: roofDark, width: 1.4 });
		g.circle(cx - 8, cy + 12, 3.5);
		g.fill({ color: 0xef4444 });
	}
}

function drawCryptMausoleumModel(ctx: BuildingModelContext): void {
	const { g, px, py, cx, cy, roofDark, pal, time } = ctx;
	drawGroundApron(g, cx, cy + 4, 28, 22, 0x1e293b, 0x22c55e);

	// Granite Gabled Crypt Vault
	g.roundRect(px + 11, py + 10, CELL_SIZE - 22, CELL_SIZE - 24, 3);
	g.fill({ color: pal.wall });
	g.stroke({ color: 0x0f172a, width: 1.8 });
	g.poly([cx, py + 6, px + CELL_SIZE - 10, py + 22, px + 10, py + 22]);
	g.fill({ color: roofDark });
	g.stroke({ color: pal.wallTrim, width: 1.5 });

	// Dark Barred Tomb Gate + Ghostly Headstones
	drawDoorway(g, cx - 6, cy + 4, 12, 16, 0x94a3b8);
	for (const hx of [px + 10, px + CELL_SIZE - 10]) {
		g.roundRect(hx - 3, cy + 10, 6, 10, 2);
		g.fill({ color: 0xcbd5e1 });
		g.stroke({ color: 0x0f172a, width: 1 });
	}
	g.circle(cx, py + 16, 3);
	g.fill({ color: 0x22c55e, alpha: 0.7 + Math.sin(time * 4) * 0.25 });
}

function drawKodoCorralModel(ctx: BuildingModelContext, name: string): void {
	const { g, px, py, cx, cy, pal, playerColor } = ctx;
	drawGroundApron(g, cx, cy + 3, 29, 23, 0x5c4033, pal.woodDark);

	// Wooden Corral Fence Rails
	g.roundRect(px + 8, py + 12, CELL_SIZE - 16, CELL_SIZE - 22, 4);
	g.stroke({ color: 0x92400e, width: 3.2 });
	for (const [fx, fy] of [
		[px + 8, py + 12],
		[px + CELL_SIZE - 8, py + 12],
		[px + 8, py + CELL_SIZE - 10],
		[px + CELL_SIZE - 8, py + CELL_SIZE - 10]
	]) {
		g.circle(fx, fy, 3.2);
		g.fill({ color: 0x451a03 });
	}

	// Golden Hay Bale & Horned Kodo Silhouette Inside Pen
	g.roundRect(px + 13, py + 17, 12, 9, 2);
	g.fill({ color: 0xfacc15 });
	g.ellipse(cx + 3, cy + 3, 13, 9);
	g.fill({ color: 0x78716c });
	g.stroke({ color: 0x1c1917, width: 1.5 });
	// Kodo War Drum Saddle / Variant Emblem
	g.roundRect(cx - 2, cy - 3, 10, 11, 2);
	g.fill({
		color: name.includes('агрес') ? 0xef4444 : name.includes('захис') ? 0x38bdf8 : playerColor
	});
}

function drawWarTentModel(ctx: BuildingModelContext, name: string): void {
	const { g, cx, cy, roofDark, roofMid, roofLight, pal } = ctx;
	drawGroundApron(g, cx, cy + 4, 27, 21, pal.ground, pal.woodDark);

	// Crossed Timber Tent Poles Protruding Above Apex
	g.beginPath();
	g.moveTo(cx - 8, cy - 26);
	g.lineTo(cx + 7, cy - 10);
	g.moveTo(cx + 8, cy - 26);
	g.lineTo(cx - 7, cy - 10);
	g.stroke({ color: 0xfef3c7, width: 2.2 });

	// Octagonal Stitched Hide Tent Cone
	g.poly([cx, cy - 22, cx + 22, cy - 2, cx + 18, cy + 17, cx - 18, cy + 17, cx - 22, cy - 2]);
	g.fill({ color: roofDark });
	g.stroke({ color: 0x1c1917, width: 1.8 });

	// Sunlit Hide Panels & Tribal Stripes
	g.poly([cx, cy - 22, cx, cy + 17, cx - 18, cy + 17, cx - 22, cy - 2]);
	g.fill({ color: roofLight, alpha: 0.85 });
	g.poly([cx, cy - 22, cx + 10, cy + 17, cx - 10, cy + 17]);
	g.fill({ color: roofMid, alpha: 0.78 });

	// Tent Entrance Flap + Variant Sign (Trap / Shaman Orb)
	drawDoorway(g, cx - 5, cy + 4, 10, 13, 0x451a03);
	if (name.includes('шаман') || name.includes('знахар')) {
		g.circle(cx, cy - 9, 4.5);
		g.fill({ color: 0x38bdf8 });
	} else if (name.includes('капкан')) {
		g.circle(cx + 11, cy + 9, 4.5);
		g.stroke({ color: 0xe2e8f0, width: 2 });
	}
}

function drawMurlocOrStiltHutModel(ctx: BuildingModelContext, name: string): void {
	const { g, cx, cy, roofLight, playerColor } = ctx;
	drawGroundApron(g, cx, cy + 4, 28, 22, 0x0c4a6e, 0x2dd4bf);

	const isVillage = name.includes('селище') || name.includes('фортеця');
	const huts = isVillage
		? [
				{ x: cx - 11, y: cy - 3, r: 12 },
				{ x: cx + 11, y: cy + 3, r: 12 },
				{ x: cx, y: cy - 11, r: 13 }
			]
		: [{ x: cx, y: cy, r: 19 }];

	if (name.includes('фортеця')) {
		g.circle(cx, cy, 24);
		g.stroke({ color: 0x92400e, width: 3 });
	}

	for (const h of huts) {
		g.circle(h.x, h.y + 2, h.r);
		g.fill({ color: 0x78350f });
		g.stroke({ color: 0x451a03, width: 1.5 });
		// Thatched Straw Cone Roof with Radial Ribs
		g.circle(h.x, h.y, h.r - 2);
		g.fill({ color: 0xd97706 });
		g.circle(h.x - 2, h.y - 2, h.r * 0.55);
		g.fill({ color: roofLight, alpha: 0.72 });
		g.circle(h.x, h.y - 2, 3.2);
		g.fill({ color: playerColor });
	}
}

function drawAncientGroveModel(ctx: BuildingModelContext, name: string): void {
	const { g, cx, cy, pal, time } = ctx;
	const isCorrupted = name.includes('оскверн') || name.includes('примарн');
	const leafMain = isCorrupted ? 0x581c87 : 0x15803d;
	const leafLight = isCorrupted ? 0xa855f7 : 0x4ade80;
	const trunkCol = isCorrupted ? 0x2e1065 : 0x78350f;

	drawGroundApron(g, cx, cy + 5, 27, 21, pal.ground, leafLight);

	// Gnarled Roots & Trunk
	for (const [rx, ry] of [
		[cx - 14, cy + 16],
		[cx + 14, cy + 16],
		[cx, cy + 20]
	]) {
		g.beginPath();
		g.moveTo(cx, cy + 4);
		g.lineTo(rx, ry);
		g.stroke({ color: trunkCol, width: 5 });
	}

	// Multi-Lobe Ancient Foliage Canopy
	for (const [fx, fy, fr] of [
		[cx - 12, cy - 3, 12],
		[cx + 12, cy - 3, 12],
		[cx, cy - 13, 14],
		[cx, cy + 2, 13]
	]) {
		g.circle(fx, fy, fr);
		g.fill({ color: leafMain });
		g.stroke({ color: 0x0f172a, width: 1.4 });
	}
	g.circle(cx - 4, cy - 8, 9);
	g.fill({ color: leafLight, alpha: 0.75 });

	// Awakening Spirit Eyes
	const pulse = 0.75 + Math.sin(time * 3.5) * 0.25;
	g.circle(cx - 4, cy + 4, 2.1);
	g.circle(cx + 4, cy + 4, 2.1);
	g.fill({ color: isCorrupted ? 0xf97316 : 0x67e8f9, alpha: pulse });
}

function drawRelicOrStatueModel(ctx: BuildingModelContext, name: string): void {
	const { g, cx, cy, pal, playerColor, time } = ctx;
	drawGroundApron(g, cx, cy + 4, 25, 20, pal.wallDark, pal.accent);

	if (name.includes('тотем')) {
		// Carved Wooden Totem Pillar + Outstretched Spirit Wings
		g.roundRect(cx - 6, cy - 20, 12, 38, 3);
		g.fill({ color: 0x78350f });
		g.stroke({ color: 0x451a03, width: 1.6 });
		g.poly([cx - 21, cy - 12, cx - 6, cy - 8, cx - 6, cy - 2, cx - 18, cy - 5]);
		g.poly([cx + 21, cy - 12, cx + 6, cy - 8, cx + 6, cy - 2, cx + 18, cy - 5]);
		g.fill({ color: playerColor });
		g.circle(cx, cy - 12, 3.5);
		g.fill({ color: 0x38bdf8, alpha: 0.75 + Math.sin(time * 5) * 0.25 });
		return;
	}

	if (name.includes('ріг героїв')) {
		// Stone Pedestal + Giant Curved Golden War Horn
		g.circle(cx, cy + 2, 16);
		g.fill({ color: 0x9ca3af });
		g.stroke({ color: 0x1c1917, width: 1.8 });
		g.poly([cx - 13, cy + 5, cx - 3, cy - 9, cx + 12, cy - 8, cx + 15, cy + 4, cx + 4, cy + 2]);
		g.fill({ color: 0xfbbf24 });
		g.stroke({ color: 0x78350f, width: 1.4 });
		return;
	}

	// Coral / Demonic Statue Bust on Stepped Pedestal
	g.roundRect(cx - 14, cy + 2, 28, 16, 3);
	g.fill({ color: pal.wall });
	g.stroke({ color: 0x0f172a, width: 1.6 });
	g.poly([cx, cy - 21, cx + 10, cy + 2, cx - 10, cy + 2]);
	g.fill({ color: pal.accent });
	g.stroke({ color: pal.wallTrim, width: 1.5 });
}

function drawObeliskMonolithModel(ctx: BuildingModelContext, name: string): void {
	const { g, cx, cy, pal, time } = ctx;
	const glowCol = name.includes('світл')
		? 0xfef08a
		: name.includes('заморожувач')
			? 0x7dd3fc
			: 0x38bdf8;
	drawGroundApron(g, cx, cy + 5, 25, 19, pal.wallDark, glowCol);

	const pulse = Math.sin(time * 3.5 + cx) * 2;
	g.poly([cx, cy - 23 + pulse, cx + 11, cy + 4, cx, cy + 16, cx - 11, cy + 4]);
	g.fill({ color: pal.wall });
	g.stroke({ color: glowCol, width: 1.8 });
	g.circle(cx, cy - 3 + pulse, 4.5);
	g.fill({ color: glowCol });
}

// =========================================================================
// ARCHETYPES: TECH, INDUSTRIAL, ARTILLERY & HANGARS
// =========================================================================

function drawTechSpecialtyModel(ctx: BuildingModelContext, name: string): void {
	const { g, px, py, cx, cy, playerColor, time } = ctx;
	drawGroundApron(g, cx, cy + 4, 28, 22, 0x1e293b, 0x475569);

	if (name.includes('лісопилка')) {
		// Timber Shed + Stacked Logs + Buzzing Steel Circular Saw
		g.roundRect(px + 8, py + 10, 30, 26, 3);
		g.fill({ color: 0x78350f });
		g.stroke({ color: 0x451a03, width: 1.6 });
		for (const ly of [cy + 4, cy + 11, cy + 18]) {
			g.roundRect(cx + 2, ly - 3, 18, 5, 2);
			g.fill({ color: 0xb45309 });
			g.stroke({ color: 0x451a03, width: 1 });
		}
		g.circle(cx - 5, cy + 6, 9);
		g.fill({ color: 0xcbd5e1 });
		g.stroke({ color: 0x0f172a, width: 1.5 });
		const sawRot = time * 10;
		g.beginPath();
		g.moveTo(cx - 5 + Math.cos(sawRot) * 7, cy + 6 + Math.sin(sawRot) * 7);
		g.lineTo(cx - 5 - Math.cos(sawRot) * 7, cy + 6 - Math.sin(sawRot) * 7);
		g.stroke({ color: 0x334155, width: 2 });
		return;
	}

	if (name.includes('ка-бум')) {
		// Warning Striped Bomb Lab + Glass Dome + TNT Kegs
		g.roundRect(px + 9, py + 11, CELL_SIZE - 18, CELL_SIZE - 22, 5);
		g.fill({ color: 0x991b1b });
		g.stroke({ color: 0xfacc15, width: 2 });
		g.circle(cx, cy - 2, 11);
		g.fill({ color: 0xf97316 });
		g.stroke({ color: 0xfef08a, width: 1.5 });
		g.circle(cx + 14, cy + 12, 5);
		g.fill({ color: 0xdc2626 });
		g.stroke({ color: 0x0f172a, width: 1.2 });
		return;
	}

	if (name.includes('склад запчастин')) {
		g.roundRect(px + 10, py + 12, 22, 20, 2);
		g.fill({ color: 0xb45309 });
		g.roundRect(px + 34, py + 14, 18, 18, 2);
		g.fill({ color: 0x64748b });
		g.circle(cx - 4, cy + 10, 9);
		g.fill({ color: 0xd97706 });
		g.stroke({ color: 0x1e293b, width: 2 });
		return;
	}

	// Power Plant / Shield Generator (Copper Tesla Coils + Electric Arc)
	g.roundRect(px + 11, py + 12, CELL_SIZE - 22, CELL_SIZE - 24, 5);
	g.fill({ color: 0x334155 });
	g.stroke({ color: 0x38bdf8, width: 1.8 });
	for (const tx of [cx - 10, cx + 10]) {
		g.circle(tx, cy, 6.5);
		g.fill({ color: 0xd97706 });
		g.circle(tx, cy, 3);
		g.fill({ color: 0x7dd3fc });
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
	drawGroundApron(g, cx, cy + 4, 29, 22, 0x1e293b, 0x475569);

	// Stepped Riveted Industrial Steel Hull
	g.roundRect(px + 8, py + 10, CELL_SIZE - 16, CELL_SIZE - 20, 4);
	g.fill({ color: 0x475569 });
	g.stroke({ color: isUpgraded ? 0xfbbf24 : 0x0f172a, width: 1.8 });

	// Pitched Steel Clerestory Roof Monitor
	g.roundRect(px + 13, py + 12, CELL_SIZE - 26, 20, 3);
	g.fill({ color: roofDark });
	g.roundRect(px + 14, py + 13, (CELL_SIZE - 28) * 0.52, 16, 2);
	g.fill({ color: roofLight, alpha: 0.88 });

	// Smoking Twin Brass Exhaust Stacks
	for (const sx of [px + 14, px + CELL_SIZE - 16]) {
		g.circle(sx, py + 10, 4);
		g.fill({ color: 0x1e293b });
		g.stroke({ color: 0xd97706, width: 1.5 });
	}
	const drift = (time * 16) % 12;
	g.circle(px + 14, py + 6 - drift * 0.4, 3);
	g.fill({ color: 0x94a3b8, alpha: 0.45 });

	if (name.includes('голем') || name.includes('кузня')) {
		// Glowing Molten Crucible Vat
		g.circle(cx, cy + 8, 7.5);
		g.fill({ color: 0x1c1917 });
		g.circle(cx, cy + 8, 4.8);
		g.fill({ color: 0xf97316, alpha: 0.8 + Math.sin(time * 8) * 0.2 });
	} else {
		// Tank Bay Rollout Apron + Cannon Barrel / Crusher Gear
		g.rect(px + 14, py + 38, CELL_SIZE - 28, 8);
		g.fill({ color: 0xfacc15, alpha: 0.8 });
		g.beginPath();
		g.moveTo(cx, cy + 8);
		g.lineTo(cx + dir * 16, cy + 8);
		g.stroke({ color: 0xe2e8f0, width: 3.5 });
	}
}

function drawAirfieldHangarModel(ctx: BuildingModelContext, name: string): void {
	const { g, px, py, cx, cy, isWest, roofDark, roofLight } = ctx;
	const dir = isWest ? 1 : -1;
	drawGroundApron(g, cx, cy + 4, 29, 22, 0x334155, 0x94a3b8);

	// Curved Steel Barrel-Vault Hangar Roof
	g.roundRect(px + 9, py + 9, CELL_SIZE - 18, 30, 12);
	g.fill({ color: roofDark });
	g.stroke({ color: 0x0f172a, width: 1.8 });
	for (let hx = px + 14; hx < px + CELL_SIZE - 14; hx += 7) {
		g.beginPath();
		g.moveTo(hx, py + 11);
		g.lineTo(hx, py + 37);
		g.stroke({ color: 0x0f172a, width: 1, alpha: 0.45 });
	}
	g.roundRect(px + 12, py + 11, CELL_SIZE - 24, 10, 4);
	g.fill({ color: roofLight, alpha: 0.72 });

	// Open Hangar Tarmac & Parked Gyrocopter / Bomb Load
	g.roundRect(px + 15, py + 41, CELL_SIZE - 30, 10, 2);
	g.fill({ color: 0x1e293b });
	g.poly([cx - dir * 6, cy + 14, cx + dir * 9, cy + 14, cx, cy + 8]);
	g.fill({ color: name.includes('бомбардув') ? 0xef4444 : 0xe2e8f0 });
}

function drawArtilleryEmplacementModel(ctx: BuildingModelContext, name: string): void {
	const { g, cx, cy, isWest, roofMid } = ctx;
	const dir = isWest ? 1 : -1;
	drawGroundApron(g, cx, cy + 4, 26, 21, 0x44403c);

	// Round Fortified Artillery Turntable Parapet
	g.circle(cx, cy + 1, 19);
	g.fill({ color: 0x78716c });
	g.stroke({ color: 0x1c1917, width: 2 });
	g.circle(cx, cy + 1, 12);
	g.fill({ color: roofMid });

	// Heavy Cannon / Mortar Barrel Facing Enemy Side
	g.beginPath();
	g.moveTo(cx - dir * 3, cy + 1);
	g.lineTo(cx + dir * 21, cy - 3);
	g.stroke({ color: name.includes('мортир') ? 0xd97706 : 0x1e293b, width: 6 });
	g.circle(cx - dir * 10, cy + 7, 2.5);
	g.circle(cx - dir * 6, cy + 10, 2.5);
	g.fill({ color: 0x0f172a });
}

// =========================================================================
// ARCHETYPES: TOWERS, RUINS, ROOSTS, TEMPLES, ACADEMIES, CAMPS, HALLS
// =========================================================================

function drawTowerOrRuinsModel(ctx: BuildingModelContext, name: string, _defId: string): void {
	const { g, px, py, cx, cy, pal, roofDark, roofLight, time } = ctx;

	if (name.includes('руїн') || name.includes('знищений')) {
		drawGroundApron(g, cx, cy + 4, 27, 21, pal.ground);
		// Broken Stone Walls & Collapsed Timber Roof Beams
		g.poly([px + 10, py + 14, px + 36, py + 12, px + 30, py + 44, px + 11, py + 48]);
		g.fill({ color: pal.wallDark });
		g.stroke({ color: 0x1c1917, width: 1.5 });
		g.poly([px + 34, py + 24, px + 52, py + 28, px + 49, py + 48, px + 36, py + 44]);
		g.fill({ color: pal.wall });
		g.beginPath();
		g.moveTo(px + 14, py + 18);
		g.lineTo(px + 48, py + 42);
		g.stroke({ color: 0x78350f, width: 3.5 });
		return;
	}

	// Cylindrical / Octagonal Watchtower (Zero square frame!)
	drawGroundApron(g, cx, cy + 6, 22, 16, pal.ground);
	g.circle(cx, cy + 2, 19);
	g.fill({ color: pal.wallDark });
	g.stroke({ color: 0x0f172a, width: 1.8 });
	g.circle(cx, cy - 2, 17);
	g.fill({ color: pal.wall });
	g.stroke({ color: 0x1c1917, width: 1.5 });

	// Battlement Crenellations
	for (let i = 0; i < 6; i++) {
		const a = (i / 6) * Math.PI * 2;
		g.circle(cx + Math.cos(a) * 15, cy - 2 + Math.sin(a) * 15, 2.8);
		g.fill({ color: pal.wallTrim });
	}

	// Race-Distinct Spire Top & Beacon
	g.circle(cx, cy - 4, 11);
	g.fill({ color: roofDark });
	g.circle(cx - 2, cy - 6, 7);
	g.fill({ color: roofLight, alpha: 0.85 });
	const beaconCol =
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
	g.circle(cx, cy - 6, 4 + Math.sin(time * 6) * 0.7);
	g.fill({ color: beaconCol });
}

function drawRoostOrCliffModel(ctx: BuildingModelContext, name: string): void {
	const { g, cx, cy, pal, roofLight } = ctx;
	const isIce = pal.style === 'Північ';
	const isNaga = pal.style === 'Наги' || name.includes('зміїна');

	// Rocky Crag / Cliff Perch (Irregular Polygon)
	g.poly([
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
	]);
	g.fill({ color: isIce ? 0x64748b : isNaga ? 0x0f766e : 0x57534e });
	g.stroke({ color: 0x0f172a, width: 1.8 });

	// Nest Rim & Spread Wings / Serpent Crest
	g.circle(cx, cy - 2, 12);
	g.fill({ color: isIce ? 0xe0f2fe : 0x78350f });
	g.stroke({ color: pal.accent, width: 1.5 });
	for (const s of [-1, 1]) {
		g.poly([cx + s * 4, cy - 3, cx + s * 18, cy - 12, cx + s * 13, cy + 3]);
		g.fill({ color: roofLight });
		g.stroke({ color: 0x0f172a, width: 1.1 });
	}
	g.circle(cx, cy - 3, 3.8);
	g.fill({ color: isIce ? 0x38bdf8 : 0xf97316 });
}

function drawTempleOrCathedralModel(ctx: BuildingModelContext, name: string): void {
	const { g, px, py, cx, cy, pal, roofDark, roofLight, isUpgraded, time } = ctx;
	drawGroundApron(g, cx, cy + 5, 29, 22, pal.ground);

	if (name.includes('піраміда') || name.includes('зміїний')) {
		// Stepped Stone Ziggurat Pyramid (3 Concentric Tiers)
		g.roundRect(px + 7, py + 9, CELL_SIZE - 14, CELL_SIZE - 18, 3);
		g.fill({ color: pal.wallDark });
		g.stroke({ color: 0x0f172a, width: 1.6 });
		g.roundRect(px + 13, py + 15, CELL_SIZE - 26, CELL_SIZE - 30, 2);
		g.fill({ color: pal.wall });
		g.stroke({ color: pal.wallTrim, width: 1.4 });
		g.roundRect(px + 20, py + 21, CELL_SIZE - 40, CELL_SIZE - 42, 2);
		g.fill({ color: 0xfbbf24 });
		g.circle(cx, cy - 2, 4);
		g.fill({ color: pal.glow });
		return;
	}

	if (name.includes('вівтар')) {
		// Stepped Altar Dais + 4 Burning Corner Braziers + Sacred Chalice
		g.roundRect(px + 10, py + 12, CELL_SIZE - 20, CELL_SIZE - 24, 6);
		g.fill({ color: pal.wallDark });
		g.stroke({ color: pal.accent, width: 1.8 });
		for (const [fx, fy] of [
			[px + 13, py + 15],
			[px + CELL_SIZE - 13, py + 15],
			[px + 13, py + CELL_SIZE - 15],
			[px + CELL_SIZE - 13, py + CELL_SIZE - 15]
		]) {
			g.circle(fx, fy, 3.5);
			g.fill({ color: pal.accent });
		}
		g.circle(cx, cy, 8);
		g.fill({ color: roofLight, alpha: 0.8 + Math.sin(time * 4) * 0.2 });
		return;
	}

	// Cross-Plan Cathedral / Temple (Main Nave + Transept Wings + Spire)
	g.roundRect(px + 8, py + 19, CELL_SIZE - 16, 24, 4);
	g.roundRect(px + 17, py + 9, CELL_SIZE - 34, CELL_SIZE - 18, 4);
	g.fill({ color: pal.wall });
	g.stroke({ color: 0x0f172a, width: 1.8 });

	// Crossed Roof Ridges
	g.roundRect(px + 10, py + 21, CELL_SIZE - 20, 18, 3);
	g.roundRect(px + 19, py + 11, CELL_SIZE - 38, CELL_SIZE - 24, 3);
	g.fill({ color: roofDark });
	g.roundRect(px + 20, py + 12, (CELL_SIZE - 40) * 0.55, CELL_SIZE - 28, 2);
	g.fill({ color: roofLight, alpha: 0.88 });

	// Twin Bell Turrets on Cathedral Upgrades / Bone Spires
	if (isUpgraded || name.includes('собор') || name.includes('правосуддя')) {
		for (const sx of [px + 13, px + CELL_SIZE - 13]) {
			g.circle(sx, py + 14, 5.5);
			g.fill({ color: 0xfbbf24 });
			g.stroke({ color: 0x451a03, width: 1.2 });
		}
	}
	// Stained Rose Window / Skull Medallion
	g.circle(cx, cy - 1, 5.5);
	g.fill({ color: pal.glow });
	g.stroke({ color: pal.accent, width: 1.4 });
}

function drawArcaneAcademyModel(ctx: BuildingModelContext, name: string): void {
	const { g, px, py, cx, cy, pal, roofDark, roofLight, isUpgraded, time } = ctx;
	drawGroundApron(g, cx, cy + 5, 29, 22, pal.ground);

	// T-Shaped Winged Academy Manor + Side Annex
	g.roundRect(px + 8, py + 18, CELL_SIZE - 16, 28, 4);
	g.fill({ color: pal.wall });
	g.stroke({ color: 0x0f172a, width: 1.6 });
	g.roundRect(px + 10, py + 18, CELL_SIZE - 20, 22, 4);
	g.fill({ color: roofDark });
	g.roundRect(px + 11, py + 19, (CELL_SIZE - 22) * 0.5, 16, 3);
	g.fill({ color: roofLight, alpha: 0.8 });

	// Stepped Side Library Gables
	g.roundRect(px + 18, py + 9, CELL_SIZE - 36, 16, 4);
	g.fill({ color: pal.wallTrim });
	g.stroke({ color: 0x0f172a, width: 1.3 });

	// Central Arcane Observatory Dome + Levitating Crystal
	g.circle(cx, cy - 2, 11.5);
	g.fill({ color: pal.wood });
	g.stroke({ color: pal.accent, width: 1.8 });

	const bob = Math.sin(time * 4 + px) * 1.8;
	if (name.includes('тіней')) {
		// Crescent Assassin Glaive Symbol
		g.circle(cx, cy - 2, 6);
		g.fill({ color: 0xa855f7 });
		g.circle(cx + 2, cy - 3, 4.5);
		g.fill({ color: 0x0f172a });
	} else {
		g.poly([cx, cy - 11 + bob, cx + 5.5, cy - 3 + bob, cx, cy + 5 + bob, cx - 5.5, cy - 3 + bob]);
		g.fill({ color: pal.glow });
		g.stroke({ color: 0xffffff, width: 1 });
	}

	if (isUpgraded) {
		g.circle(px + 13, py + 20, 4.5);
		g.circle(px + CELL_SIZE - 13, py + 20, 4.5);
		g.fill({ color: 0xfbbf24 });
	}
	drawRacialCrestAccent(ctx);
}

function drawArcheryCampModel(ctx: BuildingModelContext, name: string): void {
	const { g, px, py, cx, cy, isWest, pal, roofDark, roofLight, isUpgraded } = ctx;
	const dir = isWest ? 1 : -1;
	drawGroundApron(g, cx, cy + 4, 29, 22, pal.ground);

	// Timber Pavilion on Back/West Side + Open Shooting Range Yard on Front
	const houseX = isWest ? px + 8 : px + 26;
	g.roundRect(houseX, py + 11, 28, CELL_SIZE - 22, 4);
	g.fill({ color: pal.wood });
	g.stroke({ color: 0x1c1917, width: 1.6 });

	g.roundRect(houseX + 1, py + 10, 26, CELL_SIZE - 26, 4);
	g.fill({ color: roofDark });
	g.roundRect(houseX + 2, py + 11, 14, CELL_SIZE - 28, 3);
	g.fill({ color: roofLight, alpha: 0.9 });

	// Watch Post Turret for Ranger / AA Tower upgrades
	if (isUpgraded || name.includes('вежа') || name.includes('зеніт')) {
		g.circle(houseX + 14, py + 13, 6.5);
		g.fill({ color: pal.wall });
		g.stroke({ color: pal.accent, width: 1.4 });
	}

	// Open Courtyard Straw Archery Bullseye Target facing Pavilion
	const targetX = cx + dir * 15;
	const targetY = cy + 2;
	g.circle(targetX, targetY, 8.5);
	g.fill({ color: 0xfef3c7 });
	g.stroke({ color: 0x78350f, width: 1.5 });
	g.circle(targetX, targetY, 5);
	g.fill({ color: 0xef4444 });
	g.circle(targetX, targetY, 2.2);
	g.fill({ color: 0xfef08a });
}

function drawSiegeWorkshopModel(ctx: BuildingModelContext): void {
	const { g, px, py, cx, cy, isWest, pal, roofDark, roofLight } = ctx;
	const dir = isWest ? 1 : -1;
	drawGroundApron(g, cx, cy + 4, 29, 22, pal.ground);

	// Open Timber Workshop Shed (Back-Top)
	g.roundRect(px + 9, py + 9, CELL_SIZE - 18, 25, 4);
	g.fill({ color: roofDark });
	g.stroke({ color: 0x1c1917, width: 1.7 });
	g.roundRect(px + 11, py + 10, (CELL_SIZE - 22) * 0.55, 20, 3);
	g.fill({ color: roofLight, alpha: 0.85 });

	// Siege Catapult Frame on Courtyard + Throwing Arm
	g.roundRect(cx - 13, cy + 5, 26, 13, 2);
	g.fill({ color: pal.wood });
	g.stroke({ color: 0x1c1917, width: 1.4 });
	g.beginPath();
	g.moveTo(cx - dir * 8, cy + 12);
	g.lineTo(cx + dir * 12, cy + 4);
	g.stroke({ color: 0xfef3c7, width: 2.5 });
	g.circle(cx + dir * 13, cy + 4, 3);
	g.fill({ color: 0x64748b });
}

function drawDemonCageModel(ctx: BuildingModelContext): void {
	const { g, px, py, cx, cy, time } = ctx;
	drawGroundApron(g, cx, cy + 4, 27, 21, 0x271313, 0x991b1b);

	// Spiked Dark Iron Prison Cage
	g.roundRect(px + 11, py + 11, CELL_SIZE - 22, CELL_SIZE - 22, 4);
	g.fill({ color: 0x090d16 });
	g.stroke({ color: 0xef4444, width: 2 });

	for (let bx = px + 17; bx < px + CELL_SIZE - 14; bx += 7) {
		g.beginPath();
		g.moveTo(bx, py + 11);
		g.lineTo(bx, py + CELL_SIZE - 11);
		g.stroke({ color: 0x71717a, width: 2 });
	}
	// Glowing Demon Eyes inside Bars
	const pulse = 0.75 + Math.sin(time * 6) * 0.25;
	g.circle(cx - 4, cy, 2.2);
	g.circle(cx + 4, cy, 2.2);
	g.fill({ color: 0xf97316, alpha: pulse });
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
	const lShapeFlip = seed % 2 === 0;

	drawGroundApron(g, cx, cy + 5, 29, 22, pal.ground);

	// Stepped Side Courtyard Porch & L-Wing Footprint (breaks up square silhouette!)
	const wingY = lShapeFlip ? py + 24 : py + 12;
	g.roundRect(px + 8, wingY, CELL_SIZE - 16, 26, 4);
	g.fill({ color: pal.wallDark });
	g.stroke({ color: 0x0f172a, width: 1.6 });

	// Main Pitched Keep / Hall Block
	g.roundRect(px + 13, py + 9, CELL_SIZE - 26, CELL_SIZE - 18, 4);
	g.fill({ color: pal.wall });
	g.stroke({ color: isUpgraded ? 0xfbbf24 : 0x1c1917, width: isUpgraded ? 2 : 1.6 });

	// Wing Roof + Main Roof Ridge (Dual Gabled Silhouette)
	g.roundRect(px + 9, wingY - 2, CELL_SIZE - 18, 20, 4);
	g.fill({ color: roofDark });
	g.stroke({ color: 0x0f172a, width: 1.3 });

	g.roundRect(px + 15, py + 8, CELL_SIZE - 30, CELL_SIZE - 23, 4);
	g.fill({ color: roofDark });
	g.stroke({ color: isUpgraded ? 0xf59e0b : 0x0f172a, width: 1.4 });
	// Sunlit upper-left roof facet
	g.roundRect(px + 16, py + 9, (CELL_SIZE - 32) * 0.52, CELL_SIZE - 26, 3);
	g.fill({ color: roofLight, alpha: 0.9 });

	// Golden Ridge Beam
	g.beginPath();
	g.moveTo(cx, py + 10);
	g.lineTo(cx, py + CELL_SIZE - 17);
	g.stroke({ color: isUpgraded ? 0xfbbf24 : pal.woodDark, width: 2.2 });

	// Doorway Facing Lane Direction
	drawDoorway(g, isWest ? px + CELL_SIZE - 15 : px + 9, cy - 4, 6, 11, pal.wood);

	if (isHeavy) {
		// 4 Corner Bastion Turrets for Heavy / Titan Halls
		for (const [tx, ty] of [
			[px + 11, py + 11],
			[px + CELL_SIZE - 11, py + 11],
			[px + 11, py + CELL_SIZE - 13],
			[px + CELL_SIZE - 11, py + CELL_SIZE - 13]
		]) {
			g.circle(tx, ty, 5.2);
			g.fill({ color: pal.wall });
			g.stroke({ color: 0x0f172a, width: 1.2 });
		}
		g.circle(cx, cy - 2, 5.5);
		g.fill({ color: pal.accent });
	} else if (name.includes('цитадел')) {
		g.circle(cx, cy - 4, 7.5);
		g.fill({ color: pal.woodDark });
		g.stroke({ color: 0xf97316, width: 1.6 });
	} else {
		// Heraldic Shield + Crossed Blades on Gable Peak
		g.beginPath();
		g.moveTo(cx - 5, cy - 7);
		g.lineTo(cx + 5, cy + 2);
		g.moveTo(cx + 5, cy - 7);
		g.lineTo(cx - 5, cy + 2);
		g.stroke({ color: 0xe2e8f0, width: 1.8 });
		g.circle(cx + dir * 13, cy + 12, 3.2);
		g.fill({ color: pal.wood });
	}
	drawRacialCrestAccent(ctx);
}

/**
 * Adds unmistakable racial roof finials/spires (elven gilded tips, celestial halos, orc tusks,
 * demon horns, undead blight flame, troll plumes, elemental crystal, animal leaves) to distinguish
 * silhouettes across all 12 canonical playable races.
 */
function drawRacialCrestAccent(ctx: BuildingModelContext): void {
	const { g, px, py, cx, pal } = ctx;
	switch (pal.style) {
		case 'Ельфи':
			g.poly([cx - 3, py + 8, cx, py + 1, cx + 3, py + 8]);
			g.fill({ color: 0xfbbf24 });
			break;
		case 'Небожителі':
			g.circle(cx, py + 6, 4.5);
			g.stroke({ color: 0xfef08a, width: 1.8 });
			break;
		case 'Тварини':
			g.circle(px + 11, py + 14, 5.5);
			g.circle(px + CELL_SIZE - 11, py + 14, 5.5);
			g.fill({ color: 0x16a34a, alpha: 0.9 });
			break;
		case 'Орки':
			g.poly([px + 11, py + 16, px + 6, py + 7, px + 14, py + 12]);
			g.poly([
				px + CELL_SIZE - 11,
				py + 16,
				px + CELL_SIZE - 6,
				py + 7,
				px + CELL_SIZE - 14,
				py + 12
			]);
			g.fill({ color: 0xfef3c7 });
			break;
		case 'Тролі':
			g.circle(cx - 3, py + 9, 3.2);
			g.circle(cx + 3, py + 9, 3.2);
			g.fill({ color: 0x2dd4bf });
			break;
		case 'Демони':
			g.poly([px + 14, py + 13, px + 8, py + 4, px + 18, py + 10]);
			g.poly([
				px + CELL_SIZE - 14,
				py + 13,
				px + CELL_SIZE - 8,
				py + 4,
				px + CELL_SIZE - 18,
				py + 10
			]);
			g.fill({ color: 0x991b1b });
			break;
		case 'Елементалі':
			g.circle(cx, py + 9, 3.6);
			g.fill({ color: 0x38bdf8 });
			break;
		case 'Нежить':
			g.circle(cx, py + 10, 3.5);
			g.fill({ color: 0x22c55e });
			break;
		default:
			break;
	}
}
