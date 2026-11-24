import type { Graphics } from 'pixi.js';
import { formatRaceName, PLAYABLE_RACES, type PlayableRace } from '../engine/gameData';

export interface WorkerVisualSpec {
	skin: number;
	armor: number;
	trim: number;
	eyeGlow: number;
	sparkColor: number;
	legStyle: 'boots' | 'robe' | 'tail' | 'wisp';
	backFeature: 'none' | 'cape' | 'wings_demon' | 'wings_angel' | 'jetpack' | 'animal_tail';
	headFeature:
		| 'helm'
		| 'hood'
		| 'tusks_topknot'
		| 'horns'
		| 'goggles'
		| 'parka'
		| 'elf_circlet'
		| 'halo'
		| 'mohawk'
		| 'crystal_head'
		| 'wolf_ears'
		| 'naga_fins';
	toolStyle:
		| 'hammer'
		| 'wand'
		| 'warpick'
		| 'trident_fire'
		| 'wrench'
		| 'icepick'
		| 'staff'
		| 'scepter'
		| 'voodoo'
		| 'conduit'
		| 'mallet'
		| 'trident_sea';
}

const LEGACY_ALIAS: Record<string, PlayableRace> = {
	Порча: 'Елементалі',
	'Нічні ельфи': 'Тварини',
	Збирачі: 'Техніки'
};

export function resolveCanonicalWorkerRace(race?: string | null): PlayableRace {
	const formatted = formatRaceName(race || '');
	if ((PLAYABLE_RACES as readonly string[]).includes(formatted)) {
		return formatted as PlayableRace;
	}
	return LEGACY_ALIAS[formatted] ?? 'Альянс';
}

export const WORKER_RACE_SPECS: Record<PlayableRace, WorkerVisualSpec> = {
	Альянс: {
		skin: 0xfcd34d,
		armor: 0x64748b,
		trim: 0xfbbf24,
		eyeGlow: 0x0f172a,
		sparkColor: 0xfef08a,
		legStyle: 'boots',
		backFeature: 'cape',
		headFeature: 'helm',
		toolStyle: 'hammer'
	},
	Нежить: {
		skin: 0x64748b,
		armor: 0x3b0764,
		trim: 0x22c55e,
		eyeGlow: 0x4ade80,
		sparkColor: 0x4ade80,
		legStyle: 'robe',
		backFeature: 'cape',
		headFeature: 'hood',
		toolStyle: 'wand'
	},
	Орки: {
		skin: 0x16a34a,
		armor: 0x78350f,
		trim: 0xd97706,
		eyeGlow: 0xf97316,
		sparkColor: 0xfef08a,
		legStyle: 'boots',
		backFeature: 'none',
		headFeature: 'tusks_topknot',
		toolStyle: 'warpick'
	},
	Демони: {
		skin: 0xdc2626,
		armor: 0x27272a,
		trim: 0xf97316,
		eyeGlow: 0xfacc15,
		sparkColor: 0xf97316,
		legStyle: 'boots',
		backFeature: 'wings_demon',
		headFeature: 'horns',
		toolStyle: 'trident_fire'
	},
	Техніки: {
		skin: 0x84cc16,
		armor: 0x78350f,
		trim: 0x38bdf8,
		eyeGlow: 0x0f172a,
		sparkColor: 0x38bdf8,
		legStyle: 'boots',
		backFeature: 'jetpack',
		headFeature: 'goggles',
		toolStyle: 'wrench'
	},
	Північ: {
		skin: 0xfde68a,
		armor: 0x0284c7,
		trim: 0xe0f2fe,
		eyeGlow: 0x0f172a,
		sparkColor: 0xbae6fd,
		legStyle: 'boots',
		backFeature: 'cape',
		headFeature: 'parka',
		toolStyle: 'icepick'
	},
	Ельфи: {
		skin: 0xfef08a,
		armor: 0xf5f5f4,
		trim: 0xf59e0b,
		eyeGlow: 0x38bdf8,
		sparkColor: 0x67e8f9,
		legStyle: 'robe',
		backFeature: 'cape',
		headFeature: 'elf_circlet',
		toolStyle: 'staff'
	},
	Небожителі: {
		skin: 0xfef9c3,
		armor: 0xfafaf9,
		trim: 0xfbbf24,
		eyeGlow: 0x38bdf8,
		sparkColor: 0xfef08a,
		legStyle: 'robe',
		backFeature: 'wings_angel',
		headFeature: 'halo',
		toolStyle: 'scepter'
	},
	Тролі: {
		skin: 0x14b8a6,
		armor: 0x854d0e,
		trim: 0x2dd4bf,
		eyeGlow: 0xfef08a,
		sparkColor: 0x5eead4,
		legStyle: 'boots',
		backFeature: 'none',
		headFeature: 'mohawk',
		toolStyle: 'voodoo'
	},
	Елементалі: {
		skin: 0x38bdf8,
		armor: 0x4f46e5,
		trim: 0xe879f9,
		eyeGlow: 0xffffff,
		sparkColor: 0xa855f7,
		legStyle: 'wisp',
		backFeature: 'none',
		headFeature: 'crystal_head',
		toolStyle: 'conduit'
	},
	Тварини: {
		skin: 0xb45309,
		armor: 0x3f6212,
		trim: 0xf59e0b,
		eyeGlow: 0xfacc15,
		sparkColor: 0xfde047,
		legStyle: 'boots',
		backFeature: 'animal_tail',
		headFeature: 'wolf_ears',
		toolStyle: 'mallet'
	},
	Наги: {
		skin: 0x0d9488,
		armor: 0x0f766e,
		trim: 0xfbbf24,
		eyeGlow: 0xfde047,
		sparkColor: 0x5eead4,
		legStyle: 'tail',
		backFeature: 'none',
		headFeature: 'naga_fins',
		toolStyle: 'trident_sea'
	}
};

function shadeColor(hex: number, factor: number): number {
	const r0 = (hex >> 16) & 0xff;
	const g0 = (hex >> 8) & 0xff;
	const b0 = hex & 0xff;
	const mix = (c: number) =>
		factor >= 1
			? Math.min(255, Math.round(c + (255 - c) * Math.min(1, factor - 1)))
			: Math.max(0, Math.round(c * Math.max(0, factor)));
	return (mix(r0) << 16) | (mix(g0) << 8) | mix(b0);
}

export interface DrawWorkerModelParams {
	g: Graphics;
	wx: number;
	wy: number;
	bob: number;
	facing: number;
	isMoving: boolean;
	isSwinging: boolean;
	slot: number;
	time: number;
	playerColor: number;
	race?: string | null;
}

/**
 * Renders a stylized, race-distinct 2.5D builder character (silhouette, racial back gear,
 * lower body, tunic/pauldrons, sculpted head/headgear, and animated construction tool).
 */
export function drawRaceWorkerModel(p: DrawWorkerModelParams): void {
	const { g, wx, wy, bob, facing, isMoving, isSwinging, slot, time, playerColor, race } = p;
	const canonicalRace = resolveCanonicalWorkerRace(race);
	const spec = WORKER_RACE_SPECS[canonicalRace];
	const darkTeam = shadeColor(playerColor, 0.58);
	const lightTeam = shadeColor(playerColor, 1.25);

	// 1. Back Silhouettes (Capes, Wings, Steam Jetpack, Bushy Beast Tail)
	drawBackFeature(g, wx, wy, bob, facing, time, darkTeam, spec);

	// 2. Elemental Wisp Form replaces standard humanoid body cleanly
	if (spec.legStyle === 'wisp') {
		drawElementalWispBody(g, wx, wy, bob, facing, time, playerColor, spec);
		drawWorkerTool(g, wx, wy, bob, facing, isSwinging, slot, time, playerColor, spec);
		return;
	}

	// 3. Lower Body (Boots / Floating Robes / Serpentine Naga Tail)
	drawLowerBody(g, wx, wy, bob, facing, isMoving, slot, time, darkTeam, spec);

	// 4. Torso, Team Tabard & Shoulder Pauldrons
	g.beginPath();
	g.roundRect(wx - 9.5, wy - 5 + bob, 19, 16, 5);
	g.fill({ color: playerColor });
	g.stroke({ color: 0x0f172a, width: 1.5 });

	// Chest Plate / Apron Highlight + Belt
	g.beginPath();
	g.roundRect(wx - 6.5, wy - 3.5 + bob, 13, 6.5, 3);
	g.fill({ color: lightTeam, alpha: 0.35 });
	g.rect(wx - 8.5, wy + 5 + bob, 17, 3);
	g.fill({ color: spec.armor });
	g.rect(wx - 2, wy + 4.5 + bob, 4, 4);
	g.fill({ color: spec.trim });

	// Racial Shoulder Pauldrons
	for (const s of [-1, 1]) {
		g.circle(wx + s * 9.5, wy - 2 + bob, 3.6);
		g.fill({ color: shadeColor(spec.armor, 1.15) });
		g.stroke({ color: 0x0f172a, width: 1.1 });
	}

	// 5. Head, Racial Face & Headgear
	const headY = wy - 11.5 + bob;
	g.beginPath();
	g.circle(wx, headY, 8);
	g.fill({ color: spec.headFeature === 'hood' ? 0x1e1b4b : spec.skin });
	g.stroke({ color: 0x0f172a, width: 1.3 });

	drawHeadFeature(g, wx, headY, facing, time, darkTeam, spec);

	// 6. Facing Gaze / Glowing Eyes
	g.beginPath();
	g.circle(wx + facing * 3.2, headY + 0.3, spec.headFeature === 'hood' ? 2.5 : 2.1);
	g.fill({ color: spec.eyeGlow });
	g.circle(wx + facing * 3.7, headY - 0.3, 0.85);
	g.fill({ color: 0xffffff });

	// 7. Racial Construction Tool & Action Sparks
	drawWorkerTool(g, wx, wy, bob, facing, isSwinging, slot, time, playerColor, spec);
}

function drawBackFeature(
	g: Graphics,
	wx: number,
	wy: number,
	bob: number,
	facing: number,
	time: number,
	darkTeam: number,
	spec: WorkerVisualSpec
): void {
	if (spec.backFeature === 'cape') {
		g.beginPath();
		g.poly([
			wx - facing * 4,
			wy - 3 + bob,
			wx - facing * 14,
			wy + 11 + bob,
			wx - facing * 3,
			wy + 12 + bob
		]);
		g.fill({ color: darkTeam, alpha: 0.92 });
		g.stroke({ color: 0x0f172a, width: 1.1 });
	} else if (spec.backFeature === 'wings_demon' || spec.backFeature === 'wings_angel') {
		const isAngel = spec.backFeature === 'wings_angel';
		const flap = Math.sin(time * 9) * 3;
		for (const s of [-1, 1]) {
			g.beginPath();
			g.poly([
				wx + s * 3,
				wy - 2 + bob,
				wx + s * 17,
				wy - 12 + bob + flap,
				wx + s * 14,
				wy + 4 + bob - flap * 0.4
			]);
			g.fill({ color: isAngel ? 0xfafaf9 : 0x7f1d1d });
			g.stroke({ color: isAngel ? 0xfbbf24 : 0x1c1917, width: 1.3 });
		}
	} else if (spec.backFeature === 'jetpack') {
		const jx = wx - facing * 9;
		g.roundRect(jx - 4, wy - 6 + bob, 8, 14, 3);
		g.fill({ color: 0xd97706 });
		g.stroke({ color: 0x1e293b, width: 1.3 });
		// Steam Puff from Copper Exhaust Pipe
		const puff = (time * 16) % 8;
		g.circle(jx, wy - 8 + bob - puff * 0.6, 2.6);
		g.fill({ color: 0xe2e8f0, alpha: 0.55 });
	} else if (spec.backFeature === 'animal_tail') {
		const sway = Math.sin(time * 7) * 2.5;
		g.poly([
			wx - facing * 5,
			wy + 7 + bob,
			wx - facing * 17,
			wy + 2 + bob + sway,
			wx - facing * 14,
			wy + 10 + bob + sway
		]);
		g.fill({ color: 0x92400e });
		g.stroke({ color: 0x451a03, width: 1.2 });
	}
}

function drawLowerBody(
	g: Graphics,
	wx: number,
	wy: number,
	bob: number,
	facing: number,
	isMoving: boolean,
	slot: number,
	time: number,
	darkTeam: number,
	spec: WorkerVisualSpec
): void {
	if (spec.legStyle === 'tail') {
		// Curving Naga Serpentine Tail
		const slither = isMoving ? Math.sin(time * 10 + slot) * 3 : 0;
		g.poly([
			wx - 6,
			wy + 9 + bob * 0.4,
			wx + 6,
			wy + 9 + bob * 0.4,
			wx - facing * 12,
			wy + 17 + slither,
			wx - facing * 18,
			wy + 14 + slither
		]);
		g.fill({ color: 0x0f766e });
		g.stroke({ color: 0x0f172a, width: 1.3 });
		return;
	}

	if (spec.legStyle === 'robe') {
		g.beginPath();
		g.poly([
			wx - 8,
			wy + 6 + bob * 0.5,
			wx + 8,
			wy + 6 + bob * 0.5,
			wx + 11,
			wy + 16 + bob * 0.3,
			wx - 11,
			wy + 16 + bob * 0.3
		]);
		g.fill({ color: darkTeam });
		g.stroke({ color: 0x0f172a, width: 1.3 });
		g.beginPath();
		g.moveTo(wx - 10, wy + 14.5 + bob * 0.3);
		g.lineTo(wx + 10, wy + 14.5 + bob * 0.3);
		g.stroke({ color: spec.trim, width: 1.6 });
		return;
	}

	// Striding Boots
	const step = isMoving ? Math.sin(time * 14 + slot) * 3.5 : 0;
	g.roundRect(wx - 7 + step, wy + 10 + bob * 0.4, 5, 6, 2);
	g.roundRect(wx + 2 - step, wy + 10 + bob * 0.4, 5, 6, 2);
	g.fill({ color: 0x292524 });
	g.stroke({ color: 0x090d16, width: 1 });
}

function drawHeadFeature(
	g: Graphics,
	wx: number,
	headY: number,
	facing: number,
	time: number,
	darkTeam: number,
	spec: WorkerVisualSpec
): void {
	switch (spec.headFeature) {
		case 'helm':
			g.poly([wx - 9, headY - 2, wx + 9, headY - 2, wx + 6, headY - 9, wx - 6, headY - 9]);
			g.fill({ color: darkTeam });
			g.stroke({ color: 0x0f172a, width: 1.2 });
			break;
		case 'hood':
			g.poly([wx - 9, headY + 1, wx + 9, headY + 1, wx - facing * 2, headY - 12]);
			g.fill({ color: 0x4c1d95 });
			g.stroke({ color: 0x22c55e, width: 1.2 });
			break;
		case 'tusks_topknot':
			// Black Orc Topknot + Two White Tusks
			g.poly([wx - 3, headY - 7, wx + 3, headY - 7, wx - facing * 2, headY - 14]);
			g.fill({ color: 0x18181b });
			for (const tx of [wx + facing * 2, wx + facing * 6]) {
				g.poly([tx - 1.5, headY + 4, tx + 1.5, headY + 4, tx, headY + 0.5]);
				g.fill({ color: 0xfef3c7 });
			}
			break;
		case 'horns':
			for (const s of [-1, 1]) {
				g.poly([wx + s * 4, headY - 5, wx + s * 10, headY - 13, wx + s * 7, headY - 3]);
				g.fill({ color: 0x18181b });
				g.stroke({ color: 0xf97316, width: 0.9 });
			}
			break;
		case 'goggles':
			g.roundRect(wx - 8, headY - 6, 16, 4.5, 2);
			g.fill({ color: 0x78350f });
			g.circle(wx + facing * 2.5, headY - 4, 2.7);
			g.circle(wx - facing * 2.5, headY - 4, 2.5);
			g.fill({ color: 0x38bdf8 });
			g.stroke({ color: 0xd97706, width: 1 });
			break;
		case 'parka':
			// Fluffy Snow-Fur Hood Ring
			g.circle(wx, headY - 1, 9.5);
			g.stroke({ color: 0xf1f5f9, width: 3.2 });
			break;
		case 'elf_circlet':
			// Pointed Elven Ears + Golden Crown Band
			g.poly([wx - 7, headY - 1, wx - 13, headY - 5, wx - 7, headY - 4]);
			g.poly([wx + 7, headY - 1, wx + 13, headY - 5, wx + 7, headY - 4]);
			g.fill({ color: spec.skin });
			g.rect(wx - 7, headY - 6.5, 14, 2.5);
			g.fill({ color: 0xfbbf24 });
			break;
		case 'halo':
			// Hovering Golden Halo Ring
			g.ellipse(wx, headY - 11 + Math.sin(time * 4) * 1.2, 7.5, 2.8);
			g.stroke({ color: 0xfef08a, width: 2 });
			break;
		case 'mohawk':
			g.poly([wx - 3, headY - 6, wx + 3, headY - 6, wx - facing * 2, headY - 15]);
			g.fill({ color: 0xef4444 });
			break;
		case 'wolf_ears':
			g.poly([wx - 7, headY - 4, wx - 9, headY - 12, wx - 2, headY - 7]);
			g.poly([wx + 7, headY - 4, wx + 9, headY - 12, wx + 2, headY - 7]);
			g.fill({ color: 0x92400e });
			g.stroke({ color: 0x1c1917, width: 1 });
			break;
		case 'naga_fins':
			g.poly([wx, headY - 6, wx - facing * 8, headY - 13, wx - facing * 2, headY - 3]);
			g.fill({ color: 0xfbbf24 });
			break;
		default:
			break;
	}
}

function drawElementalWispBody(
	g: Graphics,
	wx: number,
	wy: number,
	bob: number,
	facing: number,
	time: number,
	playerColor: number,
	spec: WorkerVisualSpec
): void {
	const coreY = wy - 4 + bob * 1.5;
	// Glowing Arcane Outer Aura
	g.circle(wx, coreY, 13);
	g.fill({ color: playerColor, alpha: 0.25 });
	g.stroke({ color: spec.skin, width: 1.6, alpha: 0.8 });

	// Core Diamond Crystal
	g.poly([wx, coreY - 10, wx + 8.5, coreY, wx, coreY + 10, wx - 8.5, coreY]);
	g.fill({ color: spec.armor });
	g.stroke({ color: 0xe0f2fe, width: 1.5 });
	g.circle(wx + facing * 2, coreY - 1, 3.8);
	g.fill({ color: 0xffffff });

	// 2 Orbiting Elemental Rune Stones
	for (let i = 0; i < 2; i++) {
		const a = time * 3.5 + i * Math.PI;
		g.circle(wx + Math.cos(a) * 14, coreY + Math.sin(a) * 6, 3);
		g.fill({ color: spec.trim });
	}
}

function drawWorkerTool(
	g: Graphics,
	wx: number,
	wy: number,
	bob: number,
	facing: number,
	isSwinging: boolean,
	slot: number,
	time: number,
	playerColor: number,
	spec: WorkerVisualSpec
): void {
	const swing = isSwinging ? Math.sin(time * 20 + slot) * 12 : 0;
	const hx = wx + facing * 12;
	const hy = wy + bob - 3 + swing;

	const isStaffLike =
		spec.toolStyle === 'wand' ||
		spec.toolStyle === 'staff' ||
		spec.toolStyle === 'scepter' ||
		spec.toolStyle === 'voodoo' ||
		spec.toolStyle === 'conduit';

	// Tool Shaft
	g.beginPath();
	g.moveTo(hx - facing * 3, hy + 10);
	g.lineTo(hx + facing * 4, hy - (isStaffLike ? 9 : 5));
	g.stroke({ color: spec.toolStyle === 'conduit' ? 0x38bdf8 : 0x92400e, width: 2.6 });

	if (isStaffLike) {
		g.circle(hx + facing * 4, hy - 10, 4);
		g.fill({ color: spec.sparkColor });
		g.stroke({ color: playerColor, width: 1.2 });
	} else if (spec.toolStyle === 'trident_fire' || spec.toolStyle === 'trident_sea') {
		const tipCol = spec.toolStyle === 'trident_fire' ? 0xf97316 : 0xfbbf24;
		g.poly([hx + facing * 1, hy - 6, hx + facing * 8, hy - 11, hx + facing * 5, hy - 3]);
		g.fill({ color: tipCol });
	} else if (spec.toolStyle === 'icepick') {
		g.poly([hx + facing * 1, hy - 4, hx + facing * 10, hy - 7, hx + facing * 3, hy - 9]);
		g.fill({ color: 0x7dd3fc });
		g.stroke({ color: 0xe0f2fe, width: 1 });
	} else {
		// Hammer / War-Pick / Wrench / Mallet Head
		const headCol =
			spec.toolStyle === 'wrench' ? 0xd97706 : spec.toolStyle === 'mallet' ? 0x78350f : 0x94a3b8;
		g.rect(facing === 1 ? hx + 1 : hx - 9, hy - 8, 8, 6);
		g.fill({ color: headCol });
		g.stroke({ color: 0x334155, width: 1 });
	}

	// Construction Build / Channeling Sparks
	if (isSwinging) {
		const spX = hx + facing * 6 + Math.sin(time * 30) * 6;
		const spY = hy - 3 + Math.cos(time * 30) * 6;
		g.beginPath();
		g.circle(spX, spY, 3.2);
		g.fill({ color: spec.sparkColor });
	}
}
