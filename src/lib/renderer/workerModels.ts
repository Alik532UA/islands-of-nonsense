import type { Graphics } from 'pixi.js';
import { formatRaceName, PLAYABLE_RACES, type PlayableRace } from '../engine/gameData';
import { rc, rr, ci, el, pg, ln } from './gfx';

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
	return (PLAYABLE_RACES as readonly string[]).includes(formatted)
		? (formatted as PlayableRace)
		: (LEGACY_ALIAS[formatted] ?? 'Альянс');
}

const sp = (
	skin: number,
	armor: number,
	trim: number,
	eyeGlow: number,
	sparkColor: number,
	legStyle: WorkerVisualSpec['legStyle'],
	backFeature: WorkerVisualSpec['backFeature'],
	headFeature: WorkerVisualSpec['headFeature'],
	toolStyle: WorkerVisualSpec['toolStyle']
): WorkerVisualSpec => ({
	skin,
	armor,
	trim,
	eyeGlow,
	sparkColor,
	legStyle,
	backFeature,
	headFeature,
	toolStyle
});

export const WORKER_RACE_SPECS: Record<PlayableRace, WorkerVisualSpec> = {
	Альянс: sp(0xfcd34d, 0x64748b, 0xfbbf24, 0x0f172a, 0xfef08a, 'boots', 'cape', 'helm', 'hammer'),
	Нежить: sp(0x64748b, 0x3b0764, 0x22c55e, 0x4ade80, 0x4ade80, 'robe', 'cape', 'hood', 'wand'),
	Орки: sp(
		0x16a34a,
		0x78350f,
		0xd97706,
		0xf97316,
		0xfef08a,
		'boots',
		'none',
		'tusks_topknot',
		'warpick'
	),
	Демони: sp(
		0xdc2626,
		0x27272a,
		0xf97316,
		0xfacc15,
		0xf97316,
		'boots',
		'wings_demon',
		'horns',
		'trident_fire'
	),
	Техніки: sp(
		0x84cc16,
		0x78350f,
		0x38bdf8,
		0x0f172a,
		0x38bdf8,
		'boots',
		'jetpack',
		'goggles',
		'wrench'
	),
	Північ: sp(0xfde68a, 0x0284c7, 0xe0f2fe, 0x0f172a, 0xbae6fd, 'boots', 'cape', 'parka', 'icepick'),
	Ельфи: sp(
		0xfef08a,
		0xf5f5f4,
		0xf59e0b,
		0x38bdf8,
		0x67e8f9,
		'robe',
		'cape',
		'elf_circlet',
		'staff'
	),
	Небожителі: sp(
		0xfef9c3,
		0xfafaf9,
		0xfbbf24,
		0x38bdf8,
		0xfef08a,
		'robe',
		'wings_angel',
		'halo',
		'scepter'
	),
	Тролі: sp(0x14b8a6, 0x854d0e, 0x2dd4bf, 0xfef08a, 0x5eead4, 'boots', 'none', 'mohawk', 'voodoo'),
	Елементалі: sp(
		0x38bdf8,
		0x4f46e5,
		0xe879f9,
		0xffffff,
		0xa855f7,
		'wisp',
		'none',
		'crystal_head',
		'conduit'
	),
	Тварини: sp(
		0xb45309,
		0x3f6212,
		0xf59e0b,
		0xfacc15,
		0xfde047,
		'boots',
		'animal_tail',
		'wolf_ears',
		'mallet'
	),
	Наги: sp(
		0x0d9488,
		0x0f766e,
		0xfbbf24,
		0xfde047,
		0x5eead4,
		'tail',
		'none',
		'naga_fins',
		'trident_sea'
	)
};

function shadeColor(hex: number, factor: number): number {
	const mix = (c: number) =>
		factor >= 1
			? Math.min(255, Math.round(c + (255 - c) * Math.min(1, factor - 1)))
			: Math.max(0, Math.round(c * Math.max(0, factor)));
	return (mix((hex >> 16) & 0xff) << 16) | (mix((hex >> 8) & 0xff) << 8) | mix(hex & 0xff);
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

export function drawRaceWorkerModel(p: DrawWorkerModelParams): void {
	const { g, wx, wy, bob, facing, isMoving, isSwinging, slot, time, playerColor, race } = p;
	const spec = WORKER_RACE_SPECS[resolveCanonicalWorkerRace(race)];
	const darkTeam = shadeColor(playerColor, 0.58);
	const lightTeam = shadeColor(playerColor, 1.25);

	drawBackFeature(g, wx, wy, bob, facing, time, darkTeam, spec);
	if (spec.legStyle === 'wisp') {
		drawElementalWispBody(g, wx, wy, bob, facing, time, playerColor, spec);
		drawWorkerTool(g, wx, wy, bob, facing, isSwinging, slot, time, playerColor, spec);
		return;
	}

	drawLowerBody(g, wx, wy, bob, facing, isMoving, slot, time, darkTeam, spec);
	rr(g, wx - 9.5, wy - 5 + bob, 19, 16, 5, playerColor, { color: 0x0f172a, width: 1.5 });
	rr(g, wx - 6.5, wy - 3.5 + bob, 13, 6.5, 3, lightTeam, undefined, 0.35);
	rc(g, wx - 8.5, wy + 5 + bob, 17, 3, spec.armor);
	rc(g, wx - 2, wy + 4.5 + bob, 4, 4, spec.trim);

	for (const s of [-1, 1]) {
		ci(g, wx + s * 9.5, wy - 2 + bob, 3.6, shadeColor(spec.armor, 1.15), {
			color: 0x0f172a,
			width: 1.1
		});
	}

	const headY = wy - 11.5 + bob;
	ci(g, wx, headY, 8, spec.headFeature === 'hood' ? 0x1e1b4b : spec.skin, {
		color: 0x0f172a,
		width: 1.3
	});
	drawHeadFeature(g, wx, headY, facing, time, darkTeam, spec);
	ci(g, wx + facing * 3.2, headY + 0.3, spec.headFeature === 'hood' ? 2.5 : 2.1, spec.eyeGlow);
	ci(g, wx + facing * 3.7, headY - 0.3, 0.85, 0xffffff);
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
		pg(
			g,
			[
				wx - facing * 4,
				wy - 3 + bob,
				wx - facing * 14,
				wy + 11 + bob,
				wx - facing * 3,
				wy + 12 + bob
			],
			{ color: darkTeam, alpha: 0.92 },
			{ color: 0x0f172a, width: 1.1 }
		);
	} else if (spec.backFeature === 'wings_demon' || spec.backFeature === 'wings_angel') {
		const isAngel = spec.backFeature === 'wings_angel';
		const flap = Math.sin(time * 9) * 3;
		for (const s of [-1, 1]) {
			pg(
				g,
				[
					wx + s * 3,
					wy - 2 + bob,
					wx + s * 17,
					wy - 12 + bob + flap,
					wx + s * 14,
					wy + 4 + bob - flap * 0.4
				],
				isAngel ? 0xfafaf9 : 0x7f1d1d,
				{ color: isAngel ? 0xfbbf24 : 0x1c1917, width: 1.3 }
			);
		}
	} else if (spec.backFeature === 'jetpack') {
		const jx = wx - facing * 9;
		rr(g, jx - 4, wy - 6 + bob, 8, 14, 3, 0xd97706, { color: 0x1e293b, width: 1.3 });
		ci(g, jx, wy - 8 + bob - ((time * 16) % 8) * 0.6, 2.6, 0xe2e8f0, undefined, 0.55);
	} else if (spec.backFeature === 'animal_tail') {
		const sway = Math.sin(time * 7) * 2.5;
		pg(
			g,
			[
				wx - facing * 5,
				wy + 7 + bob,
				wx - facing * 17,
				wy + 2 + bob + sway,
				wx - facing * 14,
				wy + 10 + bob + sway
			],
			0x92400e,
			{ color: 0x451a03, width: 1.2 }
		);
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
		const sl = isMoving ? Math.sin(time * 10 + slot) * 3 : 0;
		pg(
			g,
			[
				wx - 6,
				wy + 9 + bob * 0.4,
				wx + 6,
				wy + 9 + bob * 0.4,
				wx - facing * 12,
				wy + 17 + sl,
				wx - facing * 18,
				wy + 14 + sl
			],
			0x0f766e,
			{ color: 0x0f172a, width: 1.3 }
		);
	} else if (spec.legStyle === 'robe') {
		pg(
			g,
			[
				wx - 8,
				wy + 6 + bob * 0.5,
				wx + 8,
				wy + 6 + bob * 0.5,
				wx + 11,
				wy + 16 + bob * 0.3,
				wx - 11,
				wy + 16 + bob * 0.3
			],
			darkTeam,
			{ color: 0x0f172a, width: 1.3 }
		);
		ln(g, [wx - 10, wy + 14.5 + bob * 0.3, wx + 10, wy + 14.5 + bob * 0.3], spec.trim, 1.6);
	} else {
		const step = isMoving ? Math.sin(time * 14 + slot) * 3.5 : 0;
		g.beginPath();
		g.roundRect(wx - 7 + step, wy + 10 + bob * 0.4, 5, 6, 2);
		g.roundRect(wx + 2 - step, wy + 10 + bob * 0.4, 5, 6, 2);
		g.fill({ color: 0x292524 });
		g.stroke({ color: 0x090d16, width: 1 });
	}
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
	const f = spec.headFeature;
	if (f === 'helm') {
		pg(g, [wx - 9, headY - 2, wx + 9, headY - 2, wx + 6, headY - 9, wx - 6, headY - 9], darkTeam, {
			color: 0x0f172a,
			width: 1.2
		});
	} else if (f === 'hood') {
		pg(g, [wx - 9, headY + 1, wx + 9, headY + 1, wx - facing * 2, headY - 12], 0x4c1d95, {
			color: 0x22c55e,
			width: 1.2
		});
	} else if (f === 'tusks_topknot') {
		pg(g, [wx - 3, headY - 7, wx + 3, headY - 7, wx - facing * 2, headY - 14], 0x18181b);
		for (const tx of [wx + facing * 2, wx + facing * 6]) {
			pg(g, [tx - 1.5, headY + 4, tx + 1.5, headY + 4, tx, headY + 0.5], 0xfef3c7);
		}
	} else if (f === 'horns') {
		for (const s of [-1, 1]) {
			pg(g, [wx + s * 4, headY - 5, wx + s * 10, headY - 13, wx + s * 7, headY - 3], 0x18181b, {
				color: 0xf97316,
				width: 0.9
			});
		}
	} else if (f === 'goggles') {
		rr(g, wx - 8, headY - 6, 16, 4.5, 2, 0x78350f);
		g.beginPath();
		g.circle(wx + facing * 2.5, headY - 4, 2.7);
		g.circle(wx - facing * 2.5, headY - 4, 2.5);
		g.fill({ color: 0x38bdf8 });
		g.stroke({ color: 0xd97706, width: 1 });
	} else if (f === 'parka') {
		ci(g, wx, headY - 1, 9.5, undefined, { color: 0xf1f5f9, width: 3.2 });
	} else if (f === 'elf_circlet') {
		g.beginPath();
		g.poly([wx - 7, headY - 1, wx - 13, headY - 5, wx - 7, headY - 4]);
		g.poly([wx + 7, headY - 1, wx + 13, headY - 5, wx + 7, headY - 4]);
		g.fill({ color: spec.skin });
		rc(g, wx - 7, headY - 6.5, 14, 2.5, 0xfbbf24);
	} else if (f === 'halo') {
		el(g, wx, headY - 11 + Math.sin(time * 4) * 1.2, 7.5, 2.8, undefined, {
			color: 0xfef08a,
			width: 2
		});
	} else if (f === 'mohawk') {
		pg(g, [wx - 3, headY - 6, wx + 3, headY - 6, wx - facing * 2, headY - 15], 0xef4444);
	} else if (f === 'wolf_ears') {
		g.beginPath();
		g.poly([wx - 7, headY - 4, wx - 9, headY - 12, wx - 2, headY - 7]);
		g.poly([wx + 7, headY - 4, wx + 9, headY - 12, wx + 2, headY - 7]);
		g.fill({ color: 0x92400e });
		g.stroke({ color: 0x1c1917, width: 1 });
	} else if (f === 'naga_fins') {
		pg(g, [wx, headY - 6, wx - facing * 8, headY - 13, wx - facing * 2, headY - 3], 0xfbbf24);
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
	ci(
		g,
		wx,
		coreY,
		13,
		{ color: playerColor, alpha: 0.25 },
		{ color: spec.skin, width: 1.6, alpha: 0.8 }
	);
	pg(g, [wx, coreY - 10, wx + 8.5, coreY, wx, coreY + 10, wx - 8.5, coreY], spec.armor, {
		color: 0xe0f2fe,
		width: 1.5
	});
	ci(g, wx + facing * 2, coreY - 1, 3.8, 0xffffff);
	for (let i = 0; i < 2; i++) {
		const a = time * 3.5 + i * Math.PI;
		ci(g, wx + Math.cos(a) * 14, coreY + Math.sin(a) * 6, 3, spec.trim);
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
	const ts = spec.toolStyle;
	const isStaff =
		ts === 'wand' || ts === 'staff' || ts === 'scepter' || ts === 'voodoo' || ts === 'conduit';

	ln(
		g,
		[hx - facing * 3, hy + 10, hx + facing * 4, hy - (isStaff ? 9 : 5)],
		ts === 'conduit' ? 0x38bdf8 : 0x92400e,
		2.6
	);

	if (isStaff) {
		ci(g, hx + facing * 4, hy - 10, 4, spec.sparkColor, { color: playerColor, width: 1.2 });
	} else if (ts === 'trident_fire' || ts === 'trident_sea') {
		pg(
			g,
			[hx + facing, hy - 6, hx + facing * 8, hy - 11, hx + facing * 5, hy - 3],
			ts === 'trident_fire' ? 0xf97316 : 0xfbbf24
		);
	} else if (ts === 'icepick') {
		pg(g, [hx + facing, hy - 4, hx + facing * 10, hy - 7, hx + facing * 3, hy - 9], 0x7dd3fc, {
			color: 0xe0f2fe,
			width: 1
		});
	} else {
		rc(
			g,
			facing === 1 ? hx + 1 : hx - 9,
			hy - 8,
			8,
			6,
			ts === 'wrench' ? 0xd97706 : ts === 'mallet' ? 0x78350f : 0x94a3b8,
			{ color: 0x334155, width: 1 }
		);
	}

	if (isSwinging) {
		ci(
			g,
			hx + facing * 6 + Math.sin(time * 30) * 6,
			hy - 3 + Math.cos(time * 30) * 6,
			3.2,
			spec.sparkColor
		);
	}
}
