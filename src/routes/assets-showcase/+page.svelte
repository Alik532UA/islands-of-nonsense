<script lang="ts">
	import 'pixi.js/unsafe-eval';
	import { onMount, onDestroy } from 'svelte';
	import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
	import { resolve } from '$app/paths';
	import {
		PLAYABLE_RACES,
		BUILDINGS_MAP,
		getBaseBuildingsForRace,
		getUpgradesForBuilding,
		getUnit,
		isLegendaryBuilding,
		type PlayableRace
	} from '$lib/engine/gameData';
	import unitsJson from '$lib/data/units.json';
	import {
		ALL_PLAYER_COLORS,
		type ArmorType,
		type AttackType,
		type Building,
		type Castle,
		type MatchTeam,
		type Unit,
		type UnitAbilityType
	} from '$lib/engine/types';
	import type { DecorationObstacle } from '$lib/engine/constants';
	import { Simulation } from '$lib/engine/simulation';
	import { BuildingRenderer } from '$lib/renderer/buildingRenderer';
	import { TerrainRenderer } from '$lib/renderer/terrainRenderer';
	import { drawRaceWorkerModel } from '$lib/renderer/workerModels';
	import { drawIndividualBuildingModel, shadeHexColor } from '$lib/renderer/buildingModels';
	import {
		renderUniqueUnitModel,
		getUnitVisualSpec,
		type UnitVisualSpec
	} from '$lib/renderer/unitModels';
	import {
		WEST_CASTLE_STAGE_URLS,
		EAST_CASTLE_STAGE_URLS,
		getCastleStageIndex
	} from '$lib/renderer/castleAssets';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import GameSelect, { type GameSelectOption } from '$lib/components/ui/GameSelect.svelte';
	import ShowcaseMinimap from '$lib/components/ShowcaseMinimap.svelte';

	type ShowcaseCategory = 'all' | 'workers' | 'buildings' | 'units';
	type ShowcaseViewMode = 'map' | 'menu';
	type ShowcaseGraphicsTab = '2.5d' | 'hd-webp';

	interface RawUnitData {
		id?: string;
		name?: string;
		hp?: number;
		armor?: number;
		armor_type?: string;
		attack_type?: string;
		damage_base?: number;
		range?: number;
		flying?: boolean;
		ability_type?: string;
		cooldown?: number;
		gold_cost?: number;
	}

	interface ShowcaseItem {
		kind: 'worker' | 'building' | 'unit';
		x: number;
		y: number;
		radius: number;
		title: string;
		subtitle: string;
		race: string;
		defId: string;
		unitSpec?: UnitVisualSpec;
		stats?: string;
	}

	let viewMode = $state<ShowcaseViewMode>('map');
	let graphicsTab = $state<ShowcaseGraphicsTab>('2.5d');
	let selectedRace = $state<PlayableRace | 'all'>('all');
	let category = $state<ShowcaseCategory>('all');
	let previewTeam = $state<MatchTeam>('west');
	let selectedColorId = $state<number>(9); // 9 = Сірий за замовчуванням
	const selectedPlayerColor = $derived(
		ALL_PLAYER_COLORS.find((c) => c.id === selectedColorId) ?? ALL_PLAYER_COLORS[8]
	);
	const raceSelectOptions: GameSelectOption[] = [
		{ value: 'all', label: 'Усі 12 рас' },
		...PLAYABLE_RACES.map((r) => ({ value: r, label: r }))
	];
	const colorSelectOptions: GameSelectOption[] = ALL_PLAYER_COLORS.map((c) => ({
		value: String(c.id),
		label: c.nameUk,
		colorHex: c.hex
	}));
	let animateUnits = $state(true);
	let castleHpPct = $state(100);
	const castleStage = $derived(getCastleStageIndex(castleHpPct, 100));
	let selectedItem = $state<ShowcaseItem | null>(null);
	let copiedLabel = $state<string | null>(null);
	let copyFeedbackTimer: ReturnType<typeof setTimeout> | null = null;
	let searchQuery = $state('');
	let searchInputEl = $state<HTMLInputElement | null>(null);
	let searchPopupOpen = $state(false);
	let searchPopupStyle = $state('');
	let placedItemsSnapshot = $state<ShowcaseItem[]>([]);

	const searchMatches = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		if (viewMode !== 'map' || !q) return [];
		return placedItemsSnapshot.filter(
			(item) =>
				item.title.toLowerCase().includes(q) ||
				item.defId.toLowerCase().includes(q) ||
				item.subtitle.toLowerCase().includes(q) ||
				item.race.toLowerCase().includes(q)
		);
	});

	const searchThumbCache = new Map<string, string>();

	function getSearchItemThumbnail(item: ShowcaseItem): string | null {
		const stageKey = item.defId.startsWith('castle') ? `_${castleStage}` : '';
		const cacheKey = `${item.defId}_${item.race}_${selectedColorId}_${previewTeam}${stageKey}`;
		const cached = searchThumbCache.get(cacheKey);
		if (cached) return cached;

		if (item.defId.startsWith('west_castle_')) {
			const idx = Number(item.defId.replace('west_castle_', ''));
			return WEST_CASTLE_STAGE_URLS[idx] ?? null;
		}
		if (item.defId.startsWith('east_castle_')) {
			const idx = Number(item.defId.replace('east_castle_', ''));
			return EAST_CASTLE_STAGE_URLS[idx] ?? null;
		}
		if (!pixiApp) return null;

		const g = new Graphics();
		try {
			const teamColor = selectedPlayerColor.num;
			const facing = previewTeam === 'west' ? 1 : -1;

			if (item.kind === 'worker') {
				drawRaceWorkerModel({
					g,
					wx: 0,
					wy: 0,
					bob: 0,
					facing,
					isMoving: false,
					isSwinging: false,
					slot: 1,
					time: 0,
					playerColor: teamColor,
					race: item.race
				});
			} else if (item.kind === 'unit') {
				const raw =
					(unitsJson as unknown as RawUnitData[]).find((u) => u.id === item.defId) ??
					({ id: item.defId, name: item.title } as RawUnitData);
				const mockU = buildMockUnit(item.defId, raw, 0, 0);
				renderUniqueUnitModel(g, mockU, teamColor, false, 0, facing, 0, 0, shadeHexColor);
			} else if (item.kind === 'building') {
				if (
					item.defId === 'castle_25d_west' ||
					item.defId === 'castle_25d_east' ||
					item.defId.startsWith('castle_')
				) {
					const isWest = item.defId === 'castle_25d_east' ? false : previewTeam === 'west';
					const race = item.defId.startsWith('castle_25d_') ? undefined : item.race;
					const mockC: Castle = {
						...showcaseSim.castles.west,
						hp: Math.round((castleHpPct / 100) * 5000),
						maxHp: 5000,
						color: selectedPlayerColor,
						x: 0,
						y: 0
					};
					showcaseBuildingRenderer.renderAuthenticCastle(g, mockC, isWest, false, false, race);
				} else {
					const bld = BUILDINGS_MAP.get(item.defId);
					if (!bld) return null;
					const isUpgrade = item.title.includes('(Апгрейд)');
					const mockB = buildMockBuilding(item.race as PlayableRace, bld, -32, -32);
					drawIndividualBuildingModel(
						g,
						mockB,
						teamColor,
						bld?.specialType ? 3 : isUpgrade ? 2 : 1,
						isUpgrade,
						bld ? isLegendaryBuilding(bld) : false,
						false,
						0
					);
				}
			}

			const bounds = g.getBounds();
			if (bounds.width <= 0 || bounds.height <= 0) return null;
			const extracted = pixiApp.renderer.extract.canvas(g) as HTMLCanvasElement;
			const url = extracted.toDataURL('image/png');
			searchThumbCache.set(cacheKey, url);
			return url;
		} finally {
			g.destroy();
		}
	}

	function updateSearchPopupPos() {
		if (!searchInputEl || typeof window === 'undefined') return;
		const rect = searchInputEl.getBoundingClientRect();
		const maxH = Math.max(180, window.innerHeight - rect.bottom - 20);
		const right = Math.max(10, Math.round(window.innerWidth - rect.right));
		searchPopupStyle = `top: ${Math.round(rect.bottom + 8)}px; right: ${right}px; max-height: ${Math.floor(maxH)}px;`;
	}

	function portalToBody(node: HTMLElement) {
		if (typeof document !== 'undefined') {
			document.body.appendChild(node);
		}
		return {
			destroy() {
				if (node.parentNode) {
					node.parentNode.removeChild(node);
				}
			}
		};
	}

	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let canvasWrapEl = $state<HTMLDivElement | null>(null);
	let pixiApp: Application | null = null;
	let worldContainer: Container | null = null;
	let terrainG: Graphics | null = null;
	let labelsLayer: Container | null = null;
	let entitiesG: Graphics | null = null;
	let placedItems: ShowcaseItem[] = [];
	let animTime = 0;
	let renderError = $state<string | null>(null);

	let camX = $state(-20);
	let camY = $state(-10);
	let camZoom = $state(0.85);
	let hostW = $state(1200);
	let hostH = $state(760);
	let isDragging = false;
	let dragMoved = false;
	let dragStartX = 0;
	let dragStartY = 0;
	let camStartX = 0;
	let camStartY = 0;
	const keysPressed = new Set<string>();
	const castleTextureCache = new Map<string, Texture>();
	const showcaseSim = new Simulation();
	const showcaseBuildingRenderer = new BuildingRenderer(showcaseSim);
	const showcaseTerrainRenderer = new TerrainRenderer();

	const SHOWCASE_DECORATIONS: Array<{
		id: string;
		type: DecorationObstacle['type'] | 'waterLily';
		variant: number;
		label: string;
		subtitle: string;
	}> = [
		{
			id: 'dec_mushroom_0',
			type: 'mushroom',
			variant: 1,
			label: 'Гриби (варіант 1)',
			subtitle: 'Декорація: mushroom #1'
		},
		{
			id: 'dec_mushroom_1',
			type: 'mushroom',
			variant: 3,
			label: 'Гриби (варіант 2)',
			subtitle: 'Декорація: mushroom #2'
		},
		{
			id: 'dec_mushroom_2',
			type: 'mushroom',
			variant: 6,
			label: 'Гриби (варіант 3)',
			subtitle: 'Декорація: mushroom #3'
		},
		{
			id: 'dec_mushroom_3',
			type: 'mushroom',
			variant: 9,
			label: 'Гриби (варіант 4)',
			subtitle: 'Декорація: mushroom #4'
		},
		{
			id: 'dec_crystal_0',
			type: 'crystal',
			variant: 1,
			label: 'Кристал (варіант 1)',
			subtitle: 'Декорація: crystal #1'
		},
		{
			id: 'dec_crystal_1',
			type: 'crystal',
			variant: 3,
			label: 'Кристал (варіант 2)',
			subtitle: 'Декорація: crystal #2'
		},
		{
			id: 'dec_crystal_2',
			type: 'crystal',
			variant: 5,
			label: 'Кристал (варіант 3)',
			subtitle: 'Декорація: crystal #3'
		},
		{
			id: 'dec_crystal_3',
			type: 'crystal',
			variant: 7,
			label: 'Кристал (варіант 4)',
			subtitle: 'Декорація: crystal #4'
		},
		{
			id: 'dec_crystal_4',
			type: 'crystal',
			variant: 9,
			label: 'Кристал (варіант 5)',
			subtitle: 'Декорація: crystal #5'
		},
		{
			id: 'dec_monolith_0',
			type: 'monolith',
			variant: 1,
			label: 'Моноліт (Руна)',
			subtitle: 'Декорація: monolith #1'
		},
		{
			id: 'dec_monolith_1',
			type: 'monolith',
			variant: 8,
			label: 'Валуни (Мох)',
			subtitle: 'Декорація: monolith #2'
		},
		{
			id: 'dec_bush_0',
			type: 'bush',
			variant: 1,
			label: 'Кущ (варіант 1)',
			subtitle: 'Декорація: bush #1'
		},
		{
			id: 'dec_bush_1',
			type: 'bush',
			variant: 4,
			label: 'Кущ (варіант 2)',
			subtitle: 'Декорація: bush #2'
		},
		{
			id: 'dec_bush_2',
			type: 'bush',
			variant: 7,
			label: 'Кущ (варіант 3)',
			subtitle: 'Декорація: bush #3'
		},
		{
			id: 'dec_brazier_0',
			type: 'brazier',
			variant: 1,
			label: 'Кам’яна жаровня',
			subtitle: 'Декорація: brazier'
		},
		{
			id: 'dec_lily_0',
			type: 'waterLily',
			variant: 1,
			label: 'Водяна лілія',
			subtitle: 'Декорація: waterLily'
		}
	];

	const rawUnitsList = Object.values(unitsJson as unknown as Record<string, RawUnitData>);
	const rawUnitsMap: Record<string, RawUnitData> = {};
	for (const u of rawUnitsList) {
		if (u.id) rawUnitsMap[u.id] = u;
	}

	const allUnitEntries = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		const raceUnitIds = new Set<string>();
		if (selectedRace !== 'all') {
			for (const b of getBaseBuildingsForRace(selectedRace)) {
				if (b.unit) raceUnitIds.add(b.unit);
				for (const up of getUpgradesForBuilding(b.id)) {
					if (up.unit) raceUnitIds.add(up.unit);
				}
			}
		}
		return Object.entries(rawUnitsMap)
			.filter(([id, raw]) => {
				if (selectedRace !== 'all' && !raceUnitIds.has(id)) return false;
				if (q) {
					const n = String(raw.name ?? '').toLowerCase();
					return n.includes(q) || id.toLowerCase().includes(q);
				}
				return true;
			})
			.sort((a, b) => a[0].localeCompare(b[0]));
	});

	const filteredRaces = $derived(
		selectedRace === 'all' ? [...PLAYABLE_RACES] : ([selectedRace] as PlayableRace[])
	);

	const filteredBuildings = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		const out: Array<{
			race: PlayableRace;
			bld: ReturnType<typeof getBaseBuildingsForRace>[number];
		}> = [];
		for (const race of filteredRaces) {
			for (const bld of getBaseBuildingsForRace(race)) {
				if (q && !bld.name.toLowerCase().includes(q) && !bld.id.toLowerCase().includes(q)) {
					continue;
				}
				out.push({ race, bld });
			}
		}
		return out;
	});

	function buildMockUnit(defId: string, raw: RawUnitData, x: number, y: number): Unit {
		const hp = Number(raw.hp ?? 200);
		return {
			instanceId: `showcase_${defId}`,
			defId,
			name: String(raw.name ?? defId),
			team: previewTeam,
			lane: 'top',
			x,
			y,
			prevX: x,
			prevY: y,
			hp,
			maxHp: hp,
			armor: Number(raw.armor ?? 0),
			armorType: (raw.armor_type as ArmorType) ?? 'medium',
			attackType: (raw.attack_type as AttackType) ?? 'normal',
			damageMin: Number(raw.damage_base ?? 15),
			damageMax: Number(raw.damage_base ?? 15) + 4,
			damageBonusPct: 0,
			armorBonus: 0,
			attackCooldown: Number(raw.cooldown ?? 1.2),
			cooldownTimer: 0,
			range: Number(raw.range ?? 100),
			speed: 220,
			flying: Boolean(raw.flying),
			currentTargetId: null,
			targetX: x,
			targetY: y,
			size: Math.min(26, Math.max(13, 12 + Math.floor(hp / 220))),
			abilityType: raw.ability_type as UnitAbilityType | undefined,
			state: animateUnits ? 'WALKING' : 'ATTACKING',
			buffs: []
		};
	}

	function buildMockBuilding(
		race: PlayableRace,
		bld: ReturnType<typeof getBaseBuildingsForRace>[number],
		x: number,
		y: number
	): Building {
		return {
			instanceId: `showcase_bld_${race}_${bld.id}`,
			defId: bld.id,
			name: bld.name,
			team: previewTeam,
			tileX: 0,
			tileY: 0,
			x,
			y,
			armor: 5,
			armorType: 'fort',
			spawnUnitId: bld.unit ?? '',
			lane: 'top',
			upgradeFrom: null,
			spawnCooldown: bld.cooldown ?? 10,
			spawnTimer: 5,
			hp: 1000,
			maxHp: 1000,
			goldCost: bld.gold_cost ?? 200,
			lumberCost: bld.lumber_cost ?? 0,
			race,
			specialType: bld.specialType,
			isUnderConstruction: false
		};
	}

	const SHARED_BUILDING_IDS = new Set(['cg10_shop', 'cg11_forge', 'h008', 'cg12_commander']);

	const EXTRA_UNIT_RACE_MAP: Record<string, PlayableRace> = {
		n00J: 'Наги',
		n00K: 'Наги',
		u00D: 'Нежить',
		u007: 'Нежить',
		o005: 'Орки',
		n016: 'Північ',
		n027: 'Демони',
		e004: 'Ельфи',
		cg11: 'Техніки',
		cg12: 'Техніки',
		cg13: 'Техніки',
		cg14: 'Техніки',
		cg15: 'Техніки',
		cg16: 'Техніки',
		cg17: 'Техніки',
		cg18: 'Техніки',
		cg19: 'Техніки',
		cg1a: 'Техніки',
		cg1b: 'Техніки'
	};

	function getExtraUnitsForRace(race: PlayableRace, q: string): Array<[string, RawUnitData]> {
		const raceUnitIds = new Set<string>();
		for (const b of getBaseBuildingsForRace(race)) {
			if (b.unit) raceUnitIds.add(b.unit);
			for (const up of getUpgradesForBuilding(b.id)) {
				if (up.unit) raceUnitIds.add(up.unit);
			}
		}
		return allUnitEntries.filter(([id, raw]) => {
			if (raceUnitIds.has(id)) return false;
			if (EXTRA_UNIT_RACE_MAP[id] !== race) return false;
			if (q) {
				const n = String(raw.name ?? '').toLowerCase();
				return n.includes(q) || id.toLowerCase().includes(q);
			}
			return true;
		});
	}

	const BASE_MAP_H = 2600;

	const CARD_W = 196;
	const CARD_H = 156;
	const CARD_STEP_X = 224;
	const SPECIAL_W = 124;
	const SPECIAL_STEP_X = 140;
	const UPGRADE_STEP_Y = 186;
	const CASTLE_BOX_W = 342;
	const SHARED_BOX_W = 288;

	interface RaceRowLayout {
		race: PlayableRace;
		rowY: number;
		rowH: number;
		spawnersX: number;
		spawnersW: number;
		uniqueX: number;
		uniqueW: number;
		sharedX: number;
		sharedW: number;
		extraX: number;
		extraW: number;
		maxUpgrades: number;
	}

	interface BottomIslandLayout {
		x: number;
		y: number;
		w: number;
		h: number;
		topH: number;
	}

	function computeRaceRowsLayout(): {
		rows: RaceRowLayout[];
		mapH: number;
		westIslandW: number;
		eastIslandX: number;
		bottomIsland: BottomIslandLayout;
		mapW: number;
	} {
		const q = viewMode === 'map' ? '' : searchQuery.trim().toLowerCase();
		const rows: RaceRowLayout[] = [];
		let curY = 160;
		let maxRowRight = 1990;
		for (const race of filteredRaces) {
			const baseBlds = getBaseBuildingsForRace(race).filter(
				(b) => !q || b.name.toLowerCase().includes(q) || b.id.toLowerCase().includes(q)
			);
			const spawners = baseBlds.filter((b) => Boolean(b.unit));
			const specials = baseBlds.filter((b) => !b.unit);
			const uniqueSpecials = specials.filter((b) => !SHARED_BUILDING_IDS.has(b.id));
			const extraUnits = getExtraUnitsForRace(race, q);

			let maxUpgrades = 1;
			for (const b of spawners) {
				const ups = getUpgradesForBuilding(b.id);
				if (ups.length > maxUpgrades) maxUpgrades = ups.length;
			}

			const spawnersX = 92 + CASTLE_BOX_W + 16;
			const extraCols = extraUnits.length > 0 ? Math.ceil(extraUnits.length / 2) : 0;
			const spawnersW = Math.max(220, spawners.length * CARD_STEP_X + 12);
			const uniqueX = spawnersX + spawnersW + 16;
			const uniqueCols = Math.max(1, Math.ceil(uniqueSpecials.length / 2));
			const uniqueW = uniqueCols * SPECIAL_STEP_X + 12;
			const sharedX = uniqueX + uniqueW + 16;
			const sharedW = SHARED_BOX_W;
			const extraX = sharedX + sharedW + 16;
			const extraW = extraCols > 0 ? extraCols * 124 + 20 : 0;

			const rowRight = extraW > 0 ? extraX + extraW : sharedX + sharedW;
			if (rowRight > maxRowRight) maxRowRight = rowRight;
			const contentH = CARD_H + 16 + maxUpgrades * UPGRADE_STEP_Y;
			const rowH = Math.max(364, contentH + 34);
			rows.push({
				race,
				rowY: curY,
				rowH,
				spawnersX,
				spawnersW,
				uniqueX,
				uniqueW,
				sharedX,
				sharedW,
				extraX,
				extraW,
				maxUpgrades
			});
			curY += rowH + 64;
		}
		const westIslandW = Math.max(1980, maxRowRight - 60 + 44);
		const topIslandH = Math.max(460, curY - 60 + 20);
		const bottomIsland: BottomIslandLayout = {
			x: 60,
			y: 60 + topIslandH + 160,
			w: 1140,
			h: 880,
			topH: topIslandH
		};
		const eastIslandX = bottomIsland.x;
		const mapW = 60 + westIslandW + 60;
		const mapH = bottomIsland.y + bottomIsland.h + 60;
		return { rows, mapH, westIslandW, eastIslandX, bottomIsland, mapW };
	}

	const showcaseLayout = $derived.by(() => {
		if (graphicsTab === 'hd-webp') {
			return {
				rows: [] as RaceRowLayout[],
				mapH: BASE_MAP_H,
				westIslandW: 1960,
				eastIslandX: 2200,
				bottomIsland: null as BottomIslandLayout | null,
				mapW: 3400
			};
		}
		return computeRaceRowsLayout();
	});

	function getCastleTexture(url: string): Texture | null {
		const cached = castleTextureCache.get(url);
		if (cached) return cached;
		const img = new Image();
		img.onload = () => {
			castleTextureCache.set(url, Texture.from(img));
			rebuildStaticScene();
		};
		img.src = url;
		return null;
	}

	function drawMapDecorations(
		g: Graphics,
		mapH: number,
		westIslandW: number,
		eastIslandX: number,
		mapW: number,
		bottomIsland: BottomIslandLayout | null = null
	) {
		// Ocean background
		g.rect(0, 0, mapW, mapH).fill(0x012e4a);

		const islandH = mapH - 120;

		// West Island & East Island
		const drawIsland = (ix: number, iy: number, iw: number, ih: number) => {
			// Shallow turquoise coastal aura + sandy/rocky cliff rim + fairytale meadow grass
			g.roundRect(ix - 20, iy - 20, iw + 40, ih + 40, 48).fill({ color: 0x0b4f6c, alpha: 0.68 });
			g.roundRect(ix - 10, iy - 10, iw + 20, ih + 20, 38).fill(0x6b4235);
			g.roundRect(ix - 4, iy - 4, iw + 8, ih + 8, 32).fill(0x8d5b4c);
			g.roundRect(ix, iy, iw, ih, 28).fill(0x1b4713);
			g.roundRect(ix + 16, iy + 16, iw - 32, ih - 32, 22).fill({ color: 0x255b16, alpha: 0.65 });
		};

		if (bottomIsland) {
			drawIsland(60, 60, westIslandW, bottomIsland.topH);
			drawIsland(bottomIsland.x, bottomIsland.y, bottomIsland.w, bottomIsland.h);

			// Two wide vertical wooden bridges across the horizontal strait
			const by = 60 + bottomIsland.topH - 40;
			const bh = bottomIsland.y - by + 40;
			const bw = 160;
			for (const bx of [260, 760]) {
				g.rect(bx + bw, by, 14, bh).fill({ color: 0x020617, alpha: 0.4 });
				g.rect(bx, by, bw, bh).fill(0x6b3e1d);
				for (let py = by + 16; py < by + bh; py += 22) {
					g.moveTo(bx, py)
						.lineTo(bx + bw, py)
						.stroke({ color: 0x452611, width: 2 });
				}
				g.rect(bx - 8, by, 10, bh).fill(0x64748b);
				g.rect(bx + bw - 2, by, 10, bh).fill(0x64748b);
				for (let ly = by + 30; ly < by + bh; ly += 80) {
					g.circle(bx - 3, ly, 5).fill(0xfbbf24);
					g.circle(bx + bw + 3, ly, 5).fill(0xfbbf24);
				}
			}
			return;
		}

		drawIsland(60, 60, westIslandW, islandH);
		drawIsland(eastIslandX, 60, 1140, islandH);

		// Two wide wooden bridges across the strait
		for (const by of [320, Math.min(islandH - 360, 1520)]) {
			const bx = 60 + westIslandW - 50;
			const bw = eastIslandX - bx + 50;
			const bh = 180;
			g.rect(bx, by + bh, bw, 16).fill({ color: 0x020617, alpha: 0.4 });
			g.rect(bx, by, bw, bh).fill(0x6b3e1d);
			for (let px = bx + 16; px < bx + bw; px += 22) {
				g.moveTo(px, by)
					.lineTo(px, by + bh)
					.stroke({ color: 0x452611, width: 2 });
			}
			g.rect(bx, by - 8, bw, 10).fill(0x64748b);
			g.rect(bx, by + bh - 2, bw, 10).fill(0x64748b);
			for (let lx = bx + 30; lx < bx + bw; lx += 80) {
				g.circle(lx, by - 3, 5).fill(0xfbbf24);
				g.circle(lx, by + bh + 3, 5).fill(0xfbbf24);
			}
		}
	}

	function getTextResolution(): number {
		if (typeof window === 'undefined') return 2;
		return Math.max(2, Math.min(3, Math.ceil(window.devicePixelRatio || 2)));
	}

	function addMapLabel(text: string, x: number, y: number, color: number, size = 15) {
		if (!labelsLayer) return;
		const t = new Text({
			text,
			style: {
				fontSize: size,
				fontWeight: '700',
				fill: color,
				fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
			}
		});
		t.resolution = getTextResolution();
		t.position.set(x, y);
		labelsLayer.addChild(t);
	}

	function addWrappedLabel(
		text: string,
		x: number,
		y: number,
		color: number,
		wrapWidth = 152,
		fontSize = 11.5
	) {
		if (!labelsLayer) return;
		const t = new Text({
			text,
			style: {
				fontSize,
				fontWeight: '600',
				fill: color,
				fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
				wordWrap: true,
				wordWrapWidth: wrapWidth,
				lineHeight: Math.round(fontSize * 1.18)
			}
		});
		t.resolution = getTextResolution();
		t.position.set(x, y);
		labelsLayer.addChild(t);
	}

	function addCenteredWrappedLabel(
		text: string,
		cx: number,
		y: number,
		color: number,
		wrapWidth = 104,
		fontSize = 11.5
	) {
		if (!labelsLayer) return;
		const t = new Text({
			text,
			style: {
				fontSize,
				fontWeight: '600',
				fill: color,
				fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
				align: 'center',
				wordWrap: true,
				wordWrapWidth: wrapWidth,
				lineHeight: Math.round(fontSize * 1.18)
			}
		});
		t.resolution = getTextResolution();
		t.anchor.set(0.5, 0);
		t.position.set(cx, y);
		labelsLayer.addChild(t);
	}

	function rebuildStaticScene() {
		if (!pixiApp || !terrainG || !labelsLayer || !worldContainer) return;
		terrainG.clear();
		labelsLayer.removeChildren();

		if (viewMode === 'menu') {
			worldContainer.position.set(0, 0);
			worldContainer.scale.set(1);
			return;
		}

		const layoutInfo = graphicsTab === 'hd-webp' ? null : computeRaceRowsLayout();
		const mapH = layoutInfo ? layoutInfo.mapH : BASE_MAP_H;
		const westIslandW = layoutInfo ? layoutInfo.westIslandW : 1960;
		const eastIslandX = layoutInfo ? layoutInfo.eastIslandX : 2200;
		const bottomIsland = layoutInfo ? layoutInfo.bottomIsland : null;
		const mapW = layoutInfo ? layoutInfo.mapW : 3400;
		drawMapDecorations(terrainG, mapH, westIslandW, eastIslandX, mapW, bottomIsland);

		if (graphicsTab === 'hd-webp') {
			addMapLabel('HD ТЕКСТУРИ · ЗАХІДНИЙ ЗАМОК (8 СТАДІЙ)', 110, 96, 0x93c5fd);
			WEST_CASTLE_STAGE_URLS.forEach((url, idx) => {
				const tex = getCastleTexture(url);
				const col = idx % 4;
				const row = Math.floor(idx / 4);
				const cx = 320 + col * 420;
				const cy = 280 + row * 320;
				terrainG?.roundRect(cx - 140, cy - 115, 280, 230, 14).fill({
					color: 0x0f172a,
					alpha: 0.65
				});
				terrainG?.roundRect(cx - 140, cy - 115, 280, 230, 14).stroke({
					color: 0x3b82f6,
					width: 2
				});
				addMapLabel(`West #${idx}`, cx - 32, cy + 92, 0x93c5fd);
				if (tex) {
					const sp = new Sprite(tex);
					sp.anchor.set(0.5);
					sp.width = 220;
					sp.height = 175;
					sp.position.set(cx, cy - 10);
					labelsLayer?.addChild(sp);
				}
			});

			addMapLabel('HD ТЕКСТУРИ · СХІДНИЙ ЗАМОК (8 СТАДІЙ)', eastIslandX + 50, 96, 0xfda4af);
			EAST_CASTLE_STAGE_URLS.forEach((url, idx) => {
				const tex = getCastleTexture(url);
				const col = idx % 4;
				const row = Math.floor(idx / 4);
				const cx = eastIslandX + 160 + col * 245;
				const cy = 280 + row * 320;
				terrainG?.roundRect(cx - 105, cy - 115, 210, 230, 14).fill({
					color: 0x0f172a,
					alpha: 0.65
				});
				terrainG?.roundRect(cx - 105, cy - 115, 210, 230, 14).stroke({
					color: 0xf43f5e,
					width: 2
				});
				addMapLabel(`East #${idx}`, cx - 28, cy + 92, 0xfda4af);
				if (tex) {
					const sp = new Sprite(tex);
					sp.anchor.set(0.5);
					sp.width = 180;
					sp.height = 145;
					sp.position.set(cx, cy - 10);
					labelsLayer?.addChild(sp);
				}
			});
		} else {
			// 2.5D Classic Tab: 4 structured containers per race row
			addMapLabel(
				'2.5D КЛАСИКА · РАСИ: ЗАМОК+РОБІТНИК | БУДІВЛІ+ЮНІТИ | УНІКАЛЬНІ | СПІЛЬНІ',
				92,
				74,
				0xfcd34d
			);
			const secX = bottomIsland ? bottomIsland.x : eastIslandX;
			const secTopY = bottomIsland ? bottomIsland.y : 60;
			addMapLabel('2.5D ЗАМКИ ТА ДЕКОРАЦІЇ (НИЖНІЙ ОСТРІВ)', secX + 50, secTopY + 14, 0x38bdf8);

			const q = searchQuery.trim().toLowerCase();
			const rows = layoutInfo?.rows ?? [];

			for (let rIdx = 0; rIdx < rows.length; rIdx++) {
				const {
					race,
					rowY,
					rowH,
					spawnersX,
					spawnersW,
					uniqueX,
					uniqueW,
					sharedX,
					sharedW,
					extraX,
					extraW
				} = rows[rIdx];
				addMapLabel(race.toUpperCase(), 92, rowY - 52, 0xfcd34d);

				// Container 1: Castle + Worker
				terrainG
					.roundRect(92, rowY - 30, CASTLE_BOX_W, rowH, 12)
					.fill({ color: 0x163812, alpha: 0.92 });
				terrainG
					.roundRect(92, rowY - 30, CASTLE_BOX_W, rowH, 12)
					.stroke({ color: 0x4ade80, width: 1.5, alpha: 0.75 });
				addCenteredWrappedLabel(
					'ЗАМОК · РОБІТНИК',
					92 + CASTLE_BOX_W / 2,
					rowY - 25,
					0x86efac,
					160,
					9.5
				);
				addCenteredWrappedLabel('Робітник', 92 + 50, rowY + 198, 0xe2e8f0, 88, 11);
				addCenteredWrappedLabel(`Замок ${race}`, 92 + 216, rowY + 304, 0xfef08a, 180, 11);

				// Container 2: Spawners + Upgrades + Extra units of this race
				terrainG
					.roundRect(spawnersX, rowY - 30, spawnersW, rowH, 12)
					.fill({ color: 0x163812, alpha: 0.92 });
				terrainG
					.roundRect(spawnersX, rowY - 30, spawnersW, rowH, 12)
					.stroke({ color: 0x38bdf8, width: 1.5, alpha: 0.65 });
				addMapLabel('БУДІВЛІ ТА ЮНІТИ', spawnersX + 12, rowY - 25, 0x7dd3fc, 10);

				// Container 3: Unique special buildings (2 rows)
				terrainG
					.roundRect(uniqueX, rowY - 30, uniqueW, rowH, 12)
					.fill({ color: 0x163812, alpha: 0.92 });
				terrainG
					.roundRect(uniqueX, rowY - 30, uniqueW, rowH, 12)
					.stroke({ color: 0x94a3b8, width: 1.5, alpha: 0.65 });
				addMapLabel('УНІКАЛЬНІ БУДІВЛІ', uniqueX + 12, rowY - 25, 0xcbd5e1, 10);

				// Container 4: Shared special buildings (2x2)
				terrainG
					.roundRect(sharedX, rowY - 30, sharedW, rowH, 12)
					.fill({ color: 0x163812, alpha: 0.92 });
				terrainG
					.roundRect(sharedX, rowY - 30, sharedW, rowH, 12)
					.stroke({ color: 0xfbbf24, width: 1.5, alpha: 0.65 });
				addMapLabel('СПІЛЬНІ БУДІВЛІ', sharedX + 12, rowY - 25, 0xfcd34d, 10);

				// Container 5: Extra / Summoned units of this race (after all buildings)
				if (extraW > 0) {
					terrainG
						.roundRect(extraX, rowY - 30, extraW, rowH, 12)
						.fill({ color: 0x163812, alpha: 0.92 });
					terrainG
						.roundRect(extraX, rowY - 30, extraW, rowH, 12)
						.stroke({ color: 0x22d3ee, width: 1.5, alpha: 0.7 });
					addMapLabel('ПРИЗОВНІ ЮНІТИ', extraX + 12, rowY - 25, 0x67e8f9, 10);
				}

				const filterQ = viewMode === 'map' ? '' : q;
				const baseBlds = getBaseBuildingsForRace(race).filter(
					(b) =>
						!filterQ ||
						b.name.toLowerCase().includes(filterQ) ||
						b.id.toLowerCase().includes(filterQ)
				);
				const spawners = baseBlds.filter((b) => Boolean(b.unit));
				const specials = baseBlds.filter((b) => !b.unit);
				const uniqueSpecials = specials.filter((b) => !SHARED_BUILDING_IDS.has(b.id));
				const sharedSpecials = specials.filter((b) => SHARED_BUILDING_IDS.has(b.id));
				const extraUnits = getExtraUnitsForRace(race, filterQ);

				const drawUpgradesBelow = (baseBldId: string, colX: number) => {
					const ups = getUpgradesForBuilding(baseBldId);
					if (ups.length === 0) return;

					const baseBotY = rowY + CARD_H - 8;
					const firstUpTopY = rowY + UPGRADE_STEP_Y - 8;
					const connX = colX + CARD_W / 2 - 8;

					const strokeStyledPath = (trace: () => void, accent = 0xc084fc) => {
						if (!terrainG) return;
						trace();
						terrainG.stroke({ color: accent, width: 7, alpha: 0.18, cap: 'round', join: 'round' });
						trace();
						terrainG.stroke({
							color: 0x090d16,
							width: 4.4,
							alpha: 0.95,
							cap: 'round',
							join: 'round'
						});
						trace();
						terrainG.stroke({ color: accent, width: 2, alpha: 0.96, cap: 'round', join: 'round' });
					};

					const drawSocketDiamond = (sx: number, sy: number, fill = 0xfbbf24) => {
						terrainG?.poly([sx, sy - 4.5, sx + 4.5, sy, sx, sy + 4.5, sx - 4.5, sy]).fill(fill);
						terrainG
							?.poly([sx, sy - 4.5, sx + 4.5, sy, sx, sy + 4.5, sx - 4.5, sy])
							.stroke({ color: 0x090d16, width: 1.3 });
					};

					const drawDownChevron = (ax: number, ay: number) => {
						terrainG?.poly([ax - 5.5, ay - 7, ax + 5.5, ay - 7, ax, ay]).fill(0xe879f9);
						terrainG
							?.poly([ax - 5.5, ay - 7, ax + 5.5, ay - 7, ax, ay])
							.stroke({ color: 0x090d16, width: 1.1 });
					};

					const drawRightChevron = (ax: number, ay: number) => {
						terrainG?.poly([ax - 7, ay - 5, ax - 7, ay + 5, ax, ay]).fill(0xe879f9);
						terrainG
							?.poly([ax - 7, ay - 5, ax - 7, ay + 5, ax, ay])
							.stroke({ color: 0x090d16, width: 1.1 });
					};

					// Direct vertical rune conduit from base card to 1st upgrade
					strokeStyledPath(() => {
						terrainG?.moveTo(connX, baseBotY).lineTo(connX, firstUpTopY - 4);
					}, 0xc084fc);
					drawSocketDiamond(connX, baseBotY, 0xfbbf24);
					drawDownChevron(connX, firstUpTopY);

					// Smooth curved side rail when there are 2+ upgrades
					const railX = colX - 18;
					if (ups.length > 1) {
						const splitY = Math.round((baseBotY + firstUpTopY) / 2);
						const r = 10;
						const lastUpMidY = rowY + UPGRADE_STEP_Y + (ups.length - 1) * UPGRADE_STEP_Y + 60;
						strokeStyledPath(() => {
							terrainG
								?.moveTo(connX, splitY)
								.lineTo(railX + r, splitY)
								.quadraticCurveTo(railX, splitY, railX, splitY + r)
								.lineTo(railX, lastUpMidY - r);
						}, 0xc084fc);
						drawSocketDiamond(connX, splitY, 0xd8b4fe);
					}

					for (let uIdx = 0; uIdx < ups.length; uIdx++) {
						const up = ups[uIdx];
						const upY = rowY + UPGRADE_STEP_Y + uIdx * UPGRADE_STEP_Y;
						const uName = up.unit ? (rawUnitsMap[up.unit]?.name ?? up.unit) : '';
						const isMatch =
							Boolean(q) &&
							(up.name.toLowerCase().includes(q) ||
								up.id.toLowerCase().includes(q) ||
								uName.toLowerCase().includes(q));

						if (uIdx > 0) {
							const branchY = upY + 60;
							const r = 9;
							strokeStyledPath(() => {
								terrainG
									?.moveTo(railX, branchY - r)
									.quadraticCurveTo(railX, branchY, railX + r, branchY)
									.lineTo(colX - 12, branchY);
							}, 0xc084fc);
							drawSocketDiamond(railX, branchY - r, 0xfbbf24);
							drawRightChevron(colX - 8, branchY);
						}

						terrainG?.roundRect(colX - 8, upY - 8, CARD_W, CARD_H, 10).fill({
							color: 0x2d6a1e,
							alpha: 1
						});
						terrainG?.roundRect(colX - 8, upY - 8, CARD_W, CARD_H, 10).stroke({
							color: isMatch ? 0xfbbf24 : 0xc084fc,
							width: isMatch ? 2.2 : 1.6,
							alpha: isMatch ? 0.98 : 0.85
						});
						terrainG
							?.moveTo(colX, upY + 86)
							.lineTo(colX + CARD_W - 16, upY + 86)
							.stroke({ color: 0xc084fc, width: 1, alpha: 0.35 });
						addCenteredWrappedLabel(up.name, colX + 42, upY + 92, 0xf8fafc, 86, 11);
						if (uName) addCenteredWrappedLabel(uName, colX + 144, upY + 92, 0xf5d0fe, 86, 11);
					}
				};

				let cursorX = spawnersX + 20;
				for (const bld of spawners) {
					const uName = bld.unit ? (rawUnitsMap[bld.unit]?.name ?? bld.unit) : '';
					const isMatch =
						Boolean(q) &&
						(bld.name.toLowerCase().includes(q) ||
							bld.id.toLowerCase().includes(q) ||
							uName.toLowerCase().includes(q));
					terrainG.roundRect(cursorX - 8, rowY - 8, CARD_W, CARD_H, 10).fill({
						color: 0x2d6a1e,
						alpha: 1
					});
					terrainG.roundRect(cursorX - 8, rowY - 8, CARD_W, CARD_H, 10).stroke({
						color: isMatch ? 0xfbbf24 : 0x38bdf8,
						width: isMatch ? 2.2 : 1.3,
						alpha: isMatch ? 0.98 : 0.72
					});
					terrainG
						.moveTo(cursorX, rowY + 86)
						.lineTo(cursorX + CARD_W - 16, rowY + 86)
						.stroke({ color: 0x38bdf8, width: 1, alpha: 0.3 });
					addCenteredWrappedLabel(bld.name, cursorX + 42, rowY + 92, 0xf8fafc, 86, 11);
					if (uName) addCenteredWrappedLabel(uName, cursorX + 144, rowY + 92, 0xbae6fd, 86, 11);
					drawUpgradesBelow(bld.id, cursorX);
					cursorX += CARD_STEP_X;
				}

				// Extra / Summoned units belonging to this race (separate Container 5 after all buildings)
				if (extraUnits.length > 0 && extraW > 0) {
					const extraStartX = extraX + 16;
					for (let i = 0; i < extraUnits.length; i++) {
						const [, raw] = extraUnits[i];
						const col = Math.floor(i / 2);
						const row = i % 2;
						const ex = extraStartX + col * 124 + 54;
						const ey = rowY + 42 + row * UPGRADE_STEP_Y;
						terrainG.roundRect(ex - 54, ey - 46, 108, 128, 10).fill({ color: 0x2d6a1e, alpha: 1 });
						terrainG
							.roundRect(ex - 54, ey - 46, 108, 128, 10)
							.stroke({ color: 0x22d3ee, width: 1.3, alpha: 0.75 });
						addCenteredWrappedLabel(String(raw.name ?? ''), ex, ey + 34, 0xf8fafc, 98, 10.5);
					}
				}

				// Container 3: Unique special buildings (2 rows)
				for (let i = 0; i < uniqueSpecials.length; i++) {
					const bld = uniqueSpecials[i];
					const col = Math.floor(i / 2);
					const row = i % 2;
					const sx = uniqueX + 16 + col * SPECIAL_STEP_X;
					const sy = rowY + 4 + row * UPGRADE_STEP_Y;
					const isMatch =
						Boolean(q) && (bld.name.toLowerCase().includes(q) || bld.id.toLowerCase().includes(q));
					terrainG.roundRect(sx - 8, sy - 8, SPECIAL_W, CARD_H, 10).fill({
						color: 0x2d6a1e,
						alpha: 1
					});
					terrainG.roundRect(sx - 8, sy - 8, SPECIAL_W, CARD_H, 10).stroke({
						color: isMatch ? 0xfbbf24 : 0x94a3b8,
						width: isMatch ? 2.2 : 1.2,
						alpha: isMatch ? 0.98 : 0.7
					});
					terrainG
						.moveTo(sx, sy + 86)
						.lineTo(sx + SPECIAL_W - 16, sy + 86)
						.stroke({ color: 0x94a3b8, width: 1, alpha: 0.3 });
					addCenteredWrappedLabel(
						bld.name,
						sx - 8 + SPECIAL_W / 2,
						sy + 92,
						0xf8fafc,
						SPECIAL_W - 14,
						11
					);
				}

				// Container 4: Shared special buildings (2x2 grid)
				for (let i = 0; i < sharedSpecials.length; i++) {
					const bld = sharedSpecials[i];
					const col = i % 2;
					const row = Math.floor(i / 2);
					const sx = sharedX + 16 + col * SPECIAL_STEP_X;
					const sy = rowY + 4 + row * UPGRADE_STEP_Y;
					const isMatch =
						Boolean(q) && (bld.name.toLowerCase().includes(q) || bld.id.toLowerCase().includes(q));
					terrainG.roundRect(sx - 8, sy - 8, SPECIAL_W, CARD_H, 10).fill({
						color: 0x2d6a1e,
						alpha: 1
					});
					terrainG.roundRect(sx - 8, sy - 8, SPECIAL_W, CARD_H, 10).stroke({
						color: isMatch ? 0xfbbf24 : 0xfbbf24,
						width: isMatch ? 2.4 : 1.2,
						alpha: isMatch ? 0.98 : 0.65
					});
					terrainG
						.moveTo(sx, sy + 86)
						.lineTo(sx + SPECIAL_W - 16, sy + 86)
						.stroke({ color: 0xfbbf24, width: 1, alpha: 0.28 });
					addCenteredWrappedLabel(
						bld.name,
						sx - 8 + SPECIAL_W / 2,
						sy + 92,
						0xf8fafc,
						SPECIAL_W - 14,
						11
					);
				}
			}

			let eastCursorY = secTopY + 60;

			// 2.5D Castles (West & East procedural fortresses) on Bottom Island
			addMapLabel('2.5D ЗАМКИ (ЗАХІД ТА СХІД)', secX + 50, eastCursorY, 0xfbbf24);
			const castleBoxY = eastCursorY + 26;
			terrainG.roundRect(secX + 45, castleBoxY, 1050, 350, 12).fill({
				color: 0x163812,
				alpha: 0.92
			});
			terrainG.roundRect(secX + 45, castleBoxY, 1050, 350, 12).stroke({
				color: 0x365314,
				width: 1.5,
				alpha: 0.85
			});
			terrainG
				.roundRect(secX + 130, castleBoxY + 20, 360, 292, 12)
				.fill({ color: 0x2d6a1e, alpha: 1 });
			terrainG
				.roundRect(secX + 630, castleBoxY + 20, 360, 292, 12)
				.fill({ color: 0x2d6a1e, alpha: 1 });
			addCenteredWrappedLabel(
				'Західний замок (2.5D)',
				secX + 310,
				castleBoxY + 320,
				0x93c5fd,
				180,
				12
			);
			addCenteredWrappedLabel(
				'Східний замок (2.5D)',
				secX + 810,
				castleBoxY + 320,
				0xfda4af,
				180,
				12
			);

			// Procedural Map Decorations on Bottom Island below 2.5D Castles
			const decorTitleY = castleBoxY + 390;
			addMapLabel(
				`ДЕКОРАЦІЇ КАРТИ (ПРОЦЕДУРНІ · ${SHOWCASE_DECORATIONS.length})`,
				secX + 50,
				decorTitleY,
				0x4ade80
			);
			const decorBoxY = decorTitleY + 26;
			const decorRows = Math.ceil(SHOWCASE_DECORATIONS.length / 6);
			const decorPanelH = decorRows * 106 + 24;
			terrainG
				.roundRect(secX + 45, decorBoxY, 1050, decorPanelH, 12)
				.fill({ color: 0x163812, alpha: 0.92 });
			terrainG.roundRect(secX + 45, decorBoxY, 1050, decorPanelH, 12).stroke({
				color: 0x365314,
				width: 1.5,
				alpha: 0.85
			});
			for (let i = 0; i < SHOWCASE_DECORATIONS.length; i++) {
				const dec = SHOWCASE_DECORATIONS[i];
				const dx = secX + 145 + (i % 6) * 168;
				const dy = decorBoxY + 56 + Math.floor(i / 6) * 106;
				terrainG.roundRect(dx - 70, dy - 42, 140, 92, 8).fill({ color: 0x2d6a1e, alpha: 1 });
				addCenteredWrappedLabel(dec.label, dx, dy + 22, 0xf8fafc, 130, 11);
			}
		}
		worldContainer.position.set(camX, camY);
		worldContainer.scale.set(camZoom);
	}

	function redrawShowcase() {
		if (!pixiApp || !entitiesG || !worldContainer) return;
		const g = entitiesG;
		g.clear();
		placedItems = [];

		const teamColor = selectedPlayerColor.num;

		if (viewMode === 'map') {
			worldContainer.position.set(camX, camY);
			worldContainer.scale.set(camZoom);

			const hostW = Math.max(800, canvasWrapEl?.clientWidth ?? 1200);
			const hostH = Math.max(540, canvasWrapEl?.clientHeight ?? 760);
			if (pixiApp.renderer.screen.width !== hostW || pixiApp.renderer.screen.height !== hostH) {
				pixiApp.renderer.resize(hostW, hostH);
			}

			if (graphicsTab === 'hd-webp') {
				const eastIslandX = 2200;
				WEST_CASTLE_STAGE_URLS.forEach((_, idx) => {
					const col = idx % 4;
					const row = Math.floor(idx / 4);
					const cx = 320 + col * 420;
					const cy = 280 + row * 320;
					placedItems.push({
						kind: 'building',
						x: cx,
						y: cy,
						radius: 120,
						title: `Західний замок · Стадія #${idx}`,
						subtitle: `HD WebP спрайт (${idx === 0 ? 'Цілий' : `Пошкодження ${idx}/7`})`,
						race: 'Захід',
						defId: `west_castle_${idx}`
					});
				});
				EAST_CASTLE_STAGE_URLS.forEach((_, idx) => {
					const col = idx % 4;
					const row = Math.floor(idx / 4);
					const cx = eastIslandX + 160 + col * 245;
					const cy = 280 + row * 320;
					placedItems.push({
						kind: 'building',
						x: cx,
						y: cy,
						radius: 95,
						title: `Східний замок · Стадія #${idx}`,
						subtitle: `HD WebP спрайт (${idx === 0 ? 'Цілий' : `Пошкодження ${idx}/7`})`,
						race: 'Схід',
						defId: `east_castle_${idx}`
					});
				});
				return;
			}

			// 12 Race Rows: Castle+Worker | Buildings+Units+Extra | Unique Specials (2 rows) | Shared Specials (2x2)
			const q = searchQuery.trim().toLowerCase();
			const { rows, bottomIsland } = computeRaceRowsLayout();
			const eastIslandX = bottomIsland.x;
			const eastCursorY = bottomIsland.y + 60;

			for (let rIdx = 0; rIdx < rows.length; rIdx++) {
				const { race, rowY, spawnersX, uniqueX, sharedX, extraX, extraW } = rows[rIdx];
				const wx = 92 + 50;
				const wy = rowY + 158;
				const castleX = 92 + 216;
				const castleY = rowY + 158;

				// 1. Unique Full-Size 2.5D Race Castle (204x260) + Worker (left of castle)
				g.roundRect(castleX - 114, castleY - 140, 228, 280, 12).fill({
					color: 0x2d6a1e,
					alpha: 1
				});
				g.roundRect(castleX - 114, castleY - 140, 228, 280, 12).stroke({
					color: 0xfbbf24,
					width: 1.4
				});
				const mockRaceCastle: Castle = {
					...showcaseSim.castles.west,
					hp: Math.round((castleHpPct / 100) * 5000),
					maxHp: 5000,
					color: selectedPlayerColor,
					x: castleX,
					y: castleY
				};
				showcaseBuildingRenderer.renderAuthenticCastle(
					g,
					mockRaceCastle,
					previewTeam === 'west',
					selectedItem?.defId === `castle_${race}`,
					castleHpPct < 100,
					race
				);
				placedItems.push({
					kind: 'building',
					x: castleX,
					y: castleY,
					radius: 115,
					title: `Замок · ${race}`,
					subtitle: 'Повноцінна 2.5D фортеця раси',
					race,
					defId: `castle_${race}`,
					stats: `${Math.round((castleHpPct / 100) * 5000)}/5000 HP (Стадія ${castleStage}/7) · 10 ARM (fort)`
				});

				g.roundRect(wx - 32, wy - 32, 64, 64, 10).fill({ color: 0x2d6a1e, alpha: 1 });
				g.roundRect(wx - 32, wy - 32, 64, 64, 10).stroke({ color: 0x4ade80, width: 1.2 });
				drawRaceWorkerModel({
					g,
					wx,
					wy,
					bob: animateUnits ? Math.sin(animTime * 6 + rIdx) * 2 : 0,
					facing: previewTeam === 'west' ? 1 : -1,
					isMoving: animateUnits,
					isSwinging: animateUnits && rIdx % 2 === 0,
					slot: rIdx + 1,
					time: animTime,
					playerColor: teamColor,
					race
				});
				placedItems.push({
					kind: 'worker',
					x: wx,
					y: wy,
					radius: 32,
					title: `Робітник · ${race}`,
					subtitle: 'Унікальна модель робітника раси',
					race,
					defId: `worker_${race}`
				});

				const filterQ = viewMode === 'map' ? '' : q;
				const baseBlds = getBaseBuildingsForRace(race).filter(
					(b) =>
						!filterQ ||
						b.name.toLowerCase().includes(filterQ) ||
						b.id.toLowerCase().includes(filterQ)
				);
				const spawners = baseBlds.filter((b) => Boolean(b.unit));
				const specials = baseBlds.filter((b) => !b.unit);
				const uniqueSpecials = specials.filter((b) => !SHARED_BUILDING_IDS.has(b.id));
				const sharedSpecials = specials.filter((b) => SHARED_BUILDING_IDS.has(b.id));
				const extraUnits = getExtraUnitsForRace(race, filterQ);

				const drawUnitInPair = (
					unitId: string,
					ux: number,
					uy: number,
					sourceName: string,
					idx: number
				) => {
					const raw = rawUnitsMap[unitId];
					if (!raw) return;
					const mockU = buildMockUnit(unitId, raw, ux, uy);
					const spec = getUnitVisualSpec(mockU);
					const isSel = selectedItem?.kind === 'unit' && selectedItem.defId === unitId;
					renderUniqueUnitModel(
						g,
						mockU,
						teamColor,
						isSel,
						uy,
						previewTeam === 'west' ? 1 : -1,
						animateUnits ? animTime * 10 + idx : 0,
						animTime,
						shadeHexColor
					);
					placedItems.push({
						kind: 'unit',
						x: ux,
						y: uy,
						radius: 32,
						title: mockU.name,
						subtitle: `Будівля: ${sourceName} · ${spec.archetype}`,
						race,
						defId: unitId,
						unitSpec: spec,
						stats: `${mockU.maxHp} HP · ${mockU.damageMin} ATK (${mockU.attackType}) · ${mockU.armor} ARM (${mockU.armorType})`
					});
				};

				const drawUpgradesEntitiesBelow = (
					baseBldId: string,
					baseBldName: string,
					colX: number,
					colSeed: number
				) => {
					const ups = getUpgradesForBuilding(baseBldId);
					for (let uIdx = 0; uIdx < ups.length; uIdx++) {
						const up = ups[uIdx];
						const upY = rowY + UPGRADE_STEP_Y + uIdx * UPGRADE_STEP_Y;
						const bx = colX + 10;
						const by = upY + 6;
						const mockUp = buildMockBuilding(race, up, bx, by);
						drawIndividualBuildingModel(
							g,
							mockUp,
							teamColor,
							2,
							true,
							isLegendaryBuilding(up),
							selectedItem?.defId === up.id && selectedItem?.race === race,
							animTime
						);
						const upUnit = up.unit ? getUnit(up.unit) : null;
						placedItems.push({
							kind: 'building',
							x: bx + 32,
							y: by + 32,
							radius: 34,
							title: `${up.name} (Апгрейд)`,
							subtitle: upUnit
								? `З: ${baseBldName} · Спавнить: ${upUnit.name}`
								: `З: ${baseBldName}`,
							race,
							defId: up.id,
							stats: `${up.gold_cost ?? 200}g${up.lumber_cost ? ` / ${up.lumber_cost}w` : ''}`
						});
						if (up.unit) {
							drawUnitInPair(up.unit, colX + 144, upY + 40, up.name, colSeed + uIdx);
						}
					}
				};

				let cursorX = spawnersX + 20;
				for (let sIdx = 0; sIdx < spawners.length; sIdx++) {
					const bld = spawners[sIdx];
					const bx = cursorX + 10;
					const by = rowY + 6;
					const mockB = buildMockBuilding(race, bld, bx, by);
					drawIndividualBuildingModel(
						g,
						mockB,
						teamColor,
						bld.specialType ? 3 : 1,
						false,
						isLegendaryBuilding(bld),
						selectedItem?.defId === bld.id && selectedItem?.race === race,
						animTime
					);
					const bUnit = bld.unit ? getUnit(bld.unit) : null;
					placedItems.push({
						kind: 'building',
						x: bx + 32,
						y: by + 32,
						radius: 34,
						title: bld.name,
						subtitle: bUnit ? `Спавнить: ${bUnit.name}` : 'Спеціальна споруда',
						race,
						defId: bld.id,
						stats: `${bld.gold_cost ?? 200}g${bld.lumber_cost ? ` / ${bld.lumber_cost}w` : ''}`
					});
					if (bld.unit) {
						drawUnitInPair(bld.unit, cursorX + 144, rowY + 40, bld.name, rIdx * 20 + sIdx);
					}
					drawUpgradesEntitiesBelow(bld.id, bld.name, cursorX, rIdx * 30 + sIdx * 5);
					cursorX += CARD_STEP_X;
				}

				if (extraUnits.length > 0 && extraW > 0) {
					const extraStartX = extraX + 16;
					for (let i = 0; i < extraUnits.length; i++) {
						const [defId, raw] = extraUnits[i];
						const col = Math.floor(i / 2);
						const row = i % 2;
						const ux = extraStartX + col * 124 + 54;
						const uy = rowY + 42 + row * UPGRADE_STEP_Y;
						const mockU = buildMockUnit(defId, raw, ux, uy - 8);
						const spec = getUnitVisualSpec(mockU);
						const isSel = selectedItem?.kind === 'unit' && selectedItem.defId === defId;
						renderUniqueUnitModel(
							g,
							mockU,
							teamColor,
							isSel,
							uy - 8,
							previewTeam === 'west' ? 1 : -1,
							animateUnits ? animTime * 10 + i : 0,
							animTime,
							shadeHexColor
						);
						placedItems.push({
							kind: 'unit',
							x: ux,
							y: uy - 8,
							radius: 32,
							title: mockU.name,
							subtitle: `Призовний / додатковий · ${spec.archetype}`,
							race,
							defId,
							unitSpec: spec,
							stats: `${mockU.maxHp} HP · ${mockU.damageMin} ATK (${mockU.attackType}) · ${mockU.armor} ARM (${mockU.armorType})`
						});
					}
				}

				const drawSpecialPairGrid = (
					list: typeof uniqueSpecials,
					containerX: number,
					twoByTwo: boolean
				) => {
					for (let i = 0; i < list.length; i++) {
						const bld = list[i];
						const col = twoByTwo ? i % 2 : Math.floor(i / 2);
						const row = twoByTwo ? Math.floor(i / 2) : i % 2;
						const sx = containerX + 16 + col * SPECIAL_STEP_X;
						const sy = rowY + 4 + row * UPGRADE_STEP_Y;
						const bx = sx - 8 + SPECIAL_W / 2 - 32;
						const by = sy + 6;
						const mockB = buildMockBuilding(race, bld, bx, by);
						drawIndividualBuildingModel(
							g,
							mockB,
							teamColor,
							bld.specialType ? 3 : 1,
							false,
							isLegendaryBuilding(bld),
							selectedItem?.defId === bld.id && selectedItem?.race === race,
							animTime
						);
						placedItems.push({
							kind: 'building',
							x: bx + 32,
							y: by + 32,
							radius: 36,
							title: bld.name,
							subtitle: twoByTwo ? 'Спільна споруда' : 'Унікальна споруда раси',
							race,
							defId: bld.id,
							stats: `${bld.gold_cost ?? 200}g${bld.lumber_cost ? ` / ${bld.lumber_cost}w` : ''}`
						});
					}
				};

				drawSpecialPairGrid(uniqueSpecials, uniqueX, false);
				drawSpecialPairGrid(sharedSpecials, sharedX, true);
			}

			// 2.5D Castles (West & East)
			showcaseSim.gameTime = animTime;
			const castleBoxY = eastCursorY + 26;
			const westCastleY = castleBoxY + 172;
			const eastCastleY = castleBoxY + 172;
			const mockWestCastle: Castle = {
				...showcaseSim.castles.west,
				hp: Math.round((castleHpPct / 100) * 5000),
				maxHp: 5000,
				x: eastIslandX + 310,
				y: westCastleY
			};
			const mockEastCastle: Castle = {
				...showcaseSim.castles.east,
				hp: Math.round((castleHpPct / 100) * 5000),
				maxHp: 5000,
				x: eastIslandX + 810,
				y: eastCastleY
			};
			showcaseBuildingRenderer.renderAuthenticCastle(
				g,
				mockWestCastle,
				true,
				selectedItem?.defId === 'castle_25d_west',
				castleHpPct < 100
			);
			showcaseBuildingRenderer.renderAuthenticCastle(
				g,
				mockEastCastle,
				false,
				selectedItem?.defId === 'castle_25d_east',
				castleHpPct < 100
			);
			placedItems.push(
				{
					kind: 'building',
					x: eastIslandX + 310,
					y: westCastleY,
					radius: 120,
					title: 'Західний замок (2.5D)',
					subtitle: 'Процедурна 2.5D фортеця Заходу',
					race: 'Захід',
					defId: 'castle_25d_west',
					stats: '5000 HP · 10 ARM (fort)'
				},
				{
					kind: 'building',
					x: eastIslandX + 810,
					y: eastCastleY,
					radius: 120,
					title: 'Східний замок (2.5D)',
					subtitle: 'Процедурна 2.5D фортеця Сходу',
					race: 'Схід',
					defId: 'castle_25d_east',
					stats: '5000 HP · 10 ARM (fort)'
				}
			);

			// Procedural Map Decorations
			const decorBoxY = castleBoxY + 390 + 26;
			const obstacleDecs: DecorationObstacle[] = [];
			for (let i = 0; i < SHOWCASE_DECORATIONS.length; i++) {
				const dec = SHOWCASE_DECORATIONS[i];
				const dx = eastIslandX + 145 + (i % 6) * 168;
				const dy = decorBoxY + 56 + Math.floor(i / 6) * 106;
				if (dec.type === 'waterLily') {
					showcaseTerrainRenderer.drawWaterLily(g, dx, dy);
				} else {
					obstacleDecs.push({
						id: dec.id,
						team: 'east',
						x: dx,
						y: dy,
						radius: 22,
						type: dec.type,
						variant: dec.variant
					});
				}
				placedItems.push({
					kind: 'building',
					x: dx,
					y: dy,
					radius: 38,
					title: dec.label,
					subtitle: dec.subtitle,
					race: 'Декорації карти',
					defId: dec.id
				});
			}
			showcaseTerrainRenderer.drawProceduralDecorations(g, 1, obstacleDecs, false);
			if (
				placedItemsSnapshot.length !== placedItems.length ||
				placedItemsSnapshot[0]?.defId !== placedItems[0]?.defId
			) {
				placedItemsSnapshot = [...placedItems];
			}
			return;
		}

		// Menu / Grid Mode
		worldContainer.position.set(0, 0);
		worldContainer.scale.set(1);
		if (graphicsTab === 'hd-webp') {
			return;
		}
		if (labelsLayer) labelsLayer.removeChildren();
		const cols = 9;
		const cellW = 124;
		let cursorY = 54;

		// 1. Workers
		if (category === 'all' || category === 'workers') {
			addMapLabel('РОБІТНИКИ РАС', 24, cursorY - 36, 0xfcd34d, 13);
			for (let i = 0; i < filteredRaces.length; i++) {
				const race = filteredRaces[i];
				const col = i % cols;
				const row = Math.floor(i / cols);
				const x = 76 + col * cellW;
				const y = cursorY + row * 104;
				g.roundRect(x - 48, y - 36, 96, 92, 10).fill({ color: 0x2d6a1e, alpha: 1 });
				g.roundRect(x - 48, y - 36, 96, 92, 10).stroke({ color: 0x4ade80, width: 1 });
				drawRaceWorkerModel({
					g,
					wx: x,
					wy: y - 4,
					bob: animateUnits ? Math.sin(animTime * 6 + i) * 2 : 0,
					facing: previewTeam === 'west' ? 1 : -1,
					isMoving: animateUnits,
					isSwinging: animateUnits && i % 3 === 0,
					slot: i + 1,
					time: animTime,
					playerColor: teamColor,
					race
				});
				addCenteredWrappedLabel(race, x, y + 28, 0xe2e8f0, 88, 10.5);
				placedItems.push({
					kind: 'worker',
					x,
					y,
					radius: 32,
					title: `Робітник · ${race}`,
					subtitle: 'Унікальна модель робітника раси',
					race,
					defId: `worker_${race}`
				});
			}
			const rows = Math.max(1, Math.ceil(filteredRaces.length / cols));
			cursorY += rows * 104 + 44;
		}

		// 2. Buildings
		if (category === 'all' || category === 'buildings') {
			addMapLabel(`БУДІВЛІ (${filteredBuildings.length})`, 24, cursorY - 36, 0x38bdf8, 13);
			for (let i = 0; i < filteredBuildings.length; i++) {
				const { race, bld } = filteredBuildings[i];
				const col = i % cols;
				const row = Math.floor(i / cols);
				const cx = 76 + col * cellW;
				const cy = cursorY + row * 124;
				g.roundRect(cx - 48, cy - 28, 96, 114, 10).fill({ color: 0x2d6a1e, alpha: 1 });
				g.roundRect(cx - 48, cy - 28, 96, 114, 10).stroke({ color: 0x38bdf8, width: 1 });
				const mockB = buildMockBuilding(race, bld, cx - 32, cy - 22);
				drawIndividualBuildingModel(
					g,
					mockB,
					teamColor,
					bld.specialType ? 3 : 1,
					false,
					isLegendaryBuilding(bld),
					selectedItem?.defId === bld.id && selectedItem?.race === race,
					animTime
				);
				addCenteredWrappedLabel(bld.name, cx, cy + 48, 0xe2e8f0, 88, 10);
				const bUnit = bld.unit ? getUnit(bld.unit) : null;
				placedItems.push({
					kind: 'building',
					x: cx,
					y: cy + 10,
					radius: 36,
					title: bld.name,
					subtitle: bUnit ? `Спавнить: ${bUnit.name}` : 'Спеціальна споруда',
					race,
					defId: bld.id,
					stats: `${bld.gold_cost ?? 200}g${bld.lumber_cost ? ` / ${bld.lumber_cost}w` : ''}`
				});
			}
			const rows = Math.max(1, Math.ceil(filteredBuildings.length / cols));
			cursorY += rows * 124 + 44;
		}

		// 3. Units
		if (category === 'all' || category === 'units') {
			addMapLabel(`ЮНІТИ (${allUnitEntries.length})`, 24, cursorY - 36, 0xf0abfc, 13);
			for (let i = 0; i < allUnitEntries.length; i++) {
				const [defId, raw] = allUnitEntries[i];
				const col = i % cols;
				const row = Math.floor(i / cols);
				const x = 76 + col * cellW;
				const y = cursorY + row * 112;
				g.roundRect(x - 48, y - 36, 96, 100, 10).fill({ color: 0x2d6a1e, alpha: 1 });
				g.roundRect(x - 48, y - 36, 96, 100, 10).stroke({ color: 0x4ade80, width: 1 });
				const mockU = buildMockUnit(defId, raw, x, y - 6);
				const spec = getUnitVisualSpec(mockU);
				const isSel = selectedItem?.kind === 'unit' && selectedItem.defId === defId;
				renderUniqueUnitModel(
					g,
					mockU,
					teamColor,
					isSel,
					y - 6,
					previewTeam === 'west' ? 1 : -1,
					animateUnits ? animTime * 10 + i : 0,
					animTime,
					shadeHexColor
				);
				addCenteredWrappedLabel(mockU.name, x, y + 28, 0xf1f5f9, 88, 10);
				placedItems.push({
					kind: 'unit',
					x,
					y,
					radius: 32,
					title: mockU.name,
					subtitle: `defId: ${defId} · ${spec.archetype}`,
					race: 'База юнітів',
					defId,
					unitSpec: spec,
					stats: `${mockU.maxHp} HP · ${mockU.damageMin} ATK (${mockU.attackType}) · ${mockU.armor} ARM (${mockU.armorType})`
				});
			}
			const rows = Math.max(1, Math.ceil(allUnitEntries.length / cols));
			cursorY += rows * 112 + 44;
		}

		const targetW = Math.max(1160, cols * cellW + 64);
		const targetH = Math.max(540, cursorY + 40);
		if (pixiApp.renderer.width !== targetW || pixiApp.renderer.height !== targetH) {
			pixiApp.renderer.resize(targetW, targetH);
		}
	}

	async function copyAssetInfo(item: ShowcaseItem) {
		const payload = `${item.defId} — ${item.title}`;
		try {
			if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(payload);
				copiedLabel = payload;
				if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer);
				copyFeedbackTimer = setTimeout(() => {
					copiedLabel = null;
				}, 2500);
			}
		} catch {
			// Ignore clipboard permission errors in restricted contexts
		}
	}

	function handleCanvasClick(e: MouseEvent) {
		if (!pixiApp || dragMoved) return;
		const rect = pixiApp.canvas.getBoundingClientRect();
		const scaleX = pixiApp.renderer.screen.width / Math.max(1, rect.width);
		const scaleY = pixiApp.renderer.screen.height / Math.max(1, rect.height);
		const sx = (e.clientX - rect.left) * scaleX;
		const sy = (e.clientY - rect.top) * scaleY;
		const cx = viewMode === 'map' ? (sx - camX) / camZoom : sx;
		const cy = viewMode === 'map' ? (sy - camY) / camZoom : sy;

		let best: ShowcaseItem | null = null;
		let bestDist = Infinity;
		for (const item of placedItems) {
			const d = Math.hypot(item.x - cx, item.y - cy);
			if (d <= item.radius && d < bestDist) {
				best = item;
				bestDist = d;
			}
		}
		if (best) {
			selectedItem = best;
			void copyAssetInfo(best);
		}
	}

	function handlePointerDown(e: PointerEvent) {
		if (viewMode !== 'map') return;
		isDragging = true;
		dragMoved = false;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
		camStartX = camX;
		camStartY = camY;
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isDragging || viewMode !== 'map') return;
		const dx = e.clientX - dragStartX;
		const dy = e.clientY - dragStartY;
		if (Math.hypot(dx, dy) > 5) dragMoved = true;
		camX = camStartX + dx;
		camY = camStartY + dy;
	}

	function handlePointerUp() {
		isDragging = false;
	}

	function handleWheel(e: WheelEvent) {
		if (viewMode !== 'map' || !pixiApp) return;
		e.preventDefault();
		const rect = pixiApp.canvas.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;
		const factor = e.deltaY < 0 ? 1.12 : 0.89;
		const nextZoom = Math.min(2.2, Math.max(0.08, camZoom * factor));
		const worldX = (mx - camX) / camZoom;
		const worldY = (my - camY) / camZoom;
		camZoom = nextZoom;
		camX = mx - worldX * nextZoom;
		camY = my - worldY * nextZoom;
	}

	function fitWholeMap() {
		const hostW = canvasWrapEl?.clientWidth ?? 1200;
		const hostH = canvasWrapEl?.clientHeight ?? 760;
		const layout = graphicsTab === 'hd-webp' ? null : computeRaceRowsLayout();
		const mapW = layout ? layout.mapW : 3400;
		const mapH = layout ? layout.mapH : BASE_MAP_H;
		const fitZoom = Math.min(hostW / mapW, hostH / mapH) * 0.94;
		camZoom = Math.max(0.08, Math.min(1.5, fitZoom));
		camX = (hostW - mapW * camZoom) / 2;
		camY = (hostH - mapH * camZoom) / 2;
	}

	function focusWorldPoint(wx: number, wy: number, targetZoom = 0.88) {
		const hostW = canvasWrapEl?.clientWidth ?? 1200;
		const hostH = canvasWrapEl?.clientHeight ?? 760;
		camZoom = Math.max(0.32, Math.min(2.2, targetZoom));
		camX = hostW / 2 - wx * camZoom;
		camY = hostH / 2 - wy * camZoom;
	}

	function focusFirstSearchResult() {
		if (viewMode !== 'map') return;
		const q = searchQuery.trim().toLowerCase();
		if (!q) {
			fitWholeMap();
			return;
		}
		const match = placedItems.find(
			(item) =>
				item.title.toLowerCase().includes(q) ||
				item.defId.toLowerCase().includes(q) ||
				item.subtitle.toLowerCase().includes(q) ||
				item.race.toLowerCase().includes(q)
		);
		if (match) {
			selectedItem = match;
			focusWorldPoint(match.x, match.y, Math.max(camZoom, 0.92));
		}
	}

	$effect(() => {
		void viewMode;
		void graphicsTab;
		void selectedRace;
		void category;
		void previewTeam;
		void selectedColorId;
		void animateUnits;
		void searchQuery;
		void selectedItem;
		rebuildStaticScene();
		redrawShowcase();
	});

	$effect(() => {
		void castleHpPct;
		redrawShowcase();
	});

	onMount(() => {
		if (!canvasEl) return;
		const onKeyDown = (e: KeyboardEvent) => {
			const tag = document.activeElement?.tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
			keysPressed.add(e.key.toLowerCase());
		};
		const onKeyUp = (e: KeyboardEvent) => keysPressed.delete(e.key.toLowerCase());
		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);

		const updateHostSize = () => {
			if (!canvasWrapEl) return;
			hostW = Math.max(320, canvasWrapEl.clientWidth);
			hostH = Math.max(240, canvasWrapEl.clientHeight);
		};
		updateHostSize();
		const resizeObs =
			typeof ResizeObserver !== 'undefined' && canvasWrapEl
				? new ResizeObserver(() => updateHostSize())
				: null;
		if (resizeObs && canvasWrapEl) resizeObs.observe(canvasWrapEl);
		window.addEventListener('resize', updateHostSize);

		const initPixi = async () => {
			if (!canvasEl) return;
			try {
				const app = new Application();
				await app.init({
					canvas: canvasEl,
					width: 1200,
					height: 800,
					backgroundColor: 0x012e4a,
					antialias: true,
					autoDensity: true,
					resolution: Math.min(2, window.devicePixelRatio || 1)
				});

				const world = new Container();
				const tg = new Graphics();
				const lbls = new Container();
				const eg = new Graphics();
				world.addChild(tg, eg, lbls);
				app.stage.addChild(world);

				pixiApp = app;
				worldContainer = world;
				terrainG = tg;
				labelsLayer = lbls;
				entitiesG = eg;

				app.ticker.add((ticker) => {
					const dt = ticker.deltaMS / 1000;
					if (viewMode === 'map' && keysPressed.size > 0) {
						const panSpeed = 680 * dt;
						if (keysPressed.has('w') || keysPressed.has('arrowup')) camY += panSpeed;
						if (keysPressed.has('s') || keysPressed.has('arrowdown')) camY -= panSpeed;
						if (keysPressed.has('a') || keysPressed.has('arrowleft')) camX += panSpeed;
						if (keysPressed.has('d') || keysPressed.has('arrowright')) camX -= panSpeed;
					}
					if (animateUnits) {
						animTime += dt;
						redrawShowcase();
					} else if (viewMode === 'map' && worldContainer) {
						worldContainer.position.set(camX, camY);
						worldContainer.scale.set(camZoom);
					}
				});

				rebuildStaticScene();
				redrawShowcase();
			} catch (err) {
				renderError = err instanceof Error ? err.message : String(err);
			}
		};

		void initPixi();

		return () => {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
			window.removeEventListener('resize', updateHostSize);
			resizeObs?.disconnect();
		};
	});

	onDestroy(() => {
		if (pixiApp) {
			pixiApp.destroy(false, { children: true });
			pixiApp = null;
			worldContainer = null;
			terrainG = null;
			labelsLayer = null;
			entitiesG = null;
		}
	});
</script>

<svelte:head>
	<title>Тестова карта асетів — Castle Fight Web</title>
</svelte:head>

<div
	class={viewMode === 'map'
		? 'fixed inset-0 z-40 bg-[#012e4a] text-slate-100 overflow-hidden select-none'
		: 'min-h-screen bg-[#080c14] text-slate-100 flex flex-col'}
>
	<!-- Top Bar (Edge-docked game HUD in Map mode, sticky bar in Menu mode) -->
	<header
		class={viewMode === 'map'
			? 'pointer-events-none fixed top-0 left-0 right-0 z-50 flex flex-wrap items-start justify-between gap-2'
			: 'sticky top-0 z-30 bg-[#111622]/95 backdrop-blur-md border-b border-[#544738] px-4 py-3 flex flex-wrap items-center justify-between gap-3'}
		data-testid="assets-showcase-header"
	>
		<div
			class={viewMode === 'map'
				? 'pointer-events-auto flex flex-wrap items-center gap-2 rounded-br-xl border-b border-r border-t-0 border-l-0 border-[#544738] bg-[#131722]/95 backdrop-blur-md px-3 py-1.5 shadow-2xl'
				: 'flex items-center gap-3'}
		>
			<a
				href={resolve('/')}
				class="px-2.5 py-1 rounded-lg border border-[#3b3226] hover:border-amber-500/70 bg-[#181d28] hover:bg-[#242c3d] text-xs font-bold text-amber-200 flex items-center gap-1.5 transition"
				data-testid="assets-showcase-back-link"
			>
				<UiIcon name="arrowLeft" class="w-3.5 h-3.5" />
				<span>На головну</span>
			</a>
			{#if viewMode === 'menu'}
				<div>
					<h1 class="text-sm sm:text-base font-black text-amber-300 uppercase tracking-wide">
						Тестова карта всіх асетів
					</h1>
					<p class="text-[11px] text-slate-400">
						12 рас · {filteredRaces.length} робітників · {filteredBuildings.length} будівель · {allUnitEntries.length}
						унікальних юнітів · 16 спрайтів замків
					</p>
				</div>
			{/if}

			<div
				class="flex rounded-lg border border-cyan-500/60 overflow-hidden text-xs font-bold"
				data-testid="assets-showcase-graphics-tabs"
			>
				<button
					type="button"
					onclick={() => (graphicsTab = '2.5d')}
					class="px-2.5 py-1 cursor-pointer transition {graphicsTab === '2.5d'
						? 'bg-cyan-500 text-slate-950'
						: 'bg-[#121722] text-cyan-200 hover:bg-slate-800'}"
					data-testid="assets-showcase-tab-25d"
				>
					2.5D Класика
				</button>
				<button
					type="button"
					onclick={() => (graphicsTab = 'hd-webp')}
					class="px-2.5 py-1 cursor-pointer transition {graphicsTab === 'hd-webp'
						? 'bg-cyan-500 text-slate-950'
						: 'bg-[#121722] text-cyan-200 hover:bg-slate-800'}"
					data-testid="assets-showcase-tab-hd"
				>
					HD Текстури
				</button>
			</div>

			<div
				class="flex rounded-lg border border-amber-500/60 overflow-hidden text-xs font-bold"
				data-testid="assets-showcase-view-switch"
			>
				<button
					type="button"
					onclick={() => (viewMode = 'map')}
					class="px-2.5 py-1 cursor-pointer transition {viewMode === 'map'
						? 'bg-amber-500 text-slate-950'
						: 'bg-[#121722] text-amber-200 hover:bg-slate-800'}"
					data-testid="assets-showcase-mode-map"
				>
					Велика карта
				</button>
				<button
					type="button"
					onclick={() => (viewMode = 'menu')}
					class="px-2.5 py-1 cursor-pointer transition {viewMode === 'menu'
						? 'bg-amber-500 text-slate-950'
						: 'bg-[#121722] text-amber-200 hover:bg-slate-800'}"
					data-testid="assets-showcase-mode-menu"
				>
					Меню
				</button>
			</div>
		</div>

		<div
			class={viewMode === 'map'
				? 'pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-bl-xl border-b border-l border-t-0 border-r-0 border-[#544738] bg-[#131722]/95 backdrop-blur-md px-3 py-1.5 shadow-2xl'
				: 'flex flex-wrap items-center gap-2'}
		>
			<div class="relative flex items-center gap-1">
				<input
					bind:this={searchInputEl}
					type="text"
					bind:value={searchQuery}
					onfocus={() => {
						if (viewMode === 'map' && searchQuery.trim()) {
							updateSearchPopupPos();
							searchPopupOpen = true;
						}
					}}
					oninput={() => {
						if (viewMode === 'map' && searchQuery.trim()) {
							updateSearchPopupPos();
							searchPopupOpen = true;
						} else {
							searchPopupOpen = false;
						}
					}}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							updateSearchPopupPos();
							searchPopupOpen = true;
							focusFirstSearchResult();
						} else if (e.key === 'Escape') {
							searchPopupOpen = false;
						}
					}}
					placeholder="Пошук за назвою або ID..."
					class="px-2.5 py-1 rounded-lg bg-[#0c1017] border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-400 w-36 sm:w-44"
					data-testid="assets-showcase-search"
				/>
				{#if searchQuery.trim()}
					<button
						type="button"
						onclick={() => {
							searchQuery = '';
							searchPopupOpen = false;
						}}
						class="px-1.5 py-1 rounded-lg bg-[#181d28] hover:bg-[#242c3d] border border-[#3b3226] text-slate-300 hover:text-white text-xs font-bold cursor-pointer transition"
						title="Очистити пошук"
						aria-label="Очистити пошук"
					>
						×
					</button>
				{/if}
				{#if viewMode === 'map' && searchQuery.trim()}
					<button
						type="button"
						onclick={() => {
							updateSearchPopupPos();
							searchPopupOpen = true;
							focusFirstSearchResult();
						}}
						class="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer transition"
						title="Перейти до першого результату (Enter)"
					>
						Знайти ({searchMatches.length})
					</button>
				{/if}

				{#if viewMode === 'map' && searchPopupOpen && searchQuery.trim()}
					<div use:portalToBody class="contents">
						<div
							style={searchPopupStyle}
							class="fixed z-[9995] w-[min(92vw,580px)] rounded-xl border border-[#8c7456]/85 bg-[#131722]/98 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden text-slate-100"
							data-testid="assets-showcase-search-results"
						>
							<div
								class="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-[#0e121b] text-[11px] font-bold uppercase tracking-wider text-amber-300"
							>
								<span>Знайдені поінти ({searchMatches.length})</span>
								<button
									type="button"
									onclick={() => (searchPopupOpen = false)}
									class="text-slate-400 hover:text-white cursor-pointer px-1 text-sm leading-none"
									title="Згорнути сітку"
								>
									×
								</button>
							</div>
							{#if searchMatches.length === 0}
								<div class="px-3 py-4 text-xs text-slate-400 text-center">
									Нічого не знайдено за запитом «{searchQuery.trim()}»
								</div>
							{:else}
								<div class="overflow-y-auto p-2.5 grid grid-cols-2 sm:grid-cols-3 gap-2">
									{#each searchMatches as item (`${item.defId}_${item.x}_${item.y}`)}
										{@const thumbUrl = getSearchItemThumbnail(item)}
										<button
											type="button"
											onclick={() => {
												selectedItem = item;
												focusWorldPoint(item.x, item.y, Math.max(camZoom, 0.92));
											}}
											class="text-left p-2 rounded-xl border transition cursor-pointer flex flex-col gap-1.5 {selectedItem?.defId ===
												item.defId && selectedItem?.x === item.x
												? 'bg-amber-500/20 border-amber-500/70 text-amber-100 shadow-lg'
												: 'bg-[#181d28]/90 border-slate-700/70 hover:bg-[#242c3d] hover:border-[#8c7456] text-slate-200'}"
										>
											<div
												class="relative w-full h-20 rounded-lg bg-[#1d4418]/80 border border-[#4ade80]/30 flex items-center justify-center p-1.5 overflow-hidden"
											>
												{#if thumbUrl}
													<img
														src={thumbUrl}
														alt={item.title}
														class="max-w-full max-h-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)]"
													/>
												{:else}
													<span class="text-[10px] font-mono text-slate-400">{item.defId}</span>
												{/if}
												<span
													class="absolute top-1 right-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-950/85 text-amber-300 border border-slate-700/80"
												>
													{item.kind === 'unit'
														? 'Юніт'
														: item.kind === 'building'
															? 'Будівля'
															: item.kind === 'worker'
																? 'Робітник'
																: 'Декор'}
												</span>
											</div>
											<div class="min-w-0">
												<div class="text-xs font-bold leading-tight line-clamp-2">
													{item.title}
												</div>
												<div class="text-[10px] text-slate-400 truncate mt-0.5">
													{item.race} · <span class="font-mono text-cyan-300">{item.defId}</span>
												</div>
											</div>
										</button>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<GameSelect
				bind:value={selectedRace}
				options={raceSelectOptions}
				ariaLabel="Фільтр за расою"
				testId="assets-showcase-race-select"
				minMenuWidth={168}
			/>

			{#if viewMode === 'menu' && graphicsTab === '2.5d'}
				<div class="flex rounded-lg border border-slate-700 overflow-hidden text-xs font-bold">
					{#each [['all', 'Усі'], ['workers', 'Робітники'], ['buildings', 'Будівлі'], ['units', 'Юніти']] as [catId, catLabel]}
						<button
							type="button"
							onclick={() => (category = catId as ShowcaseCategory)}
							class="px-2.5 py-1 cursor-pointer transition {category === catId
								? 'bg-amber-500 text-slate-950'
								: 'bg-[#121722] text-slate-300 hover:bg-slate-800'}"
						>
							{catLabel}
						</button>
					{/each}
				</div>
			{/if}

			<button
				type="button"
				onclick={() => (previewTeam = previewTeam === 'west' ? 'east' : 'west')}
				class="px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer transition {previewTeam ===
				'west'
					? 'bg-blue-950/80 border-blue-500/70 text-blue-200'
					: 'bg-rose-950/80 border-rose-500/70 text-rose-200'}"
				title="Напрямок погляду юнітів (Захід / Схід)"
				data-testid="assets-showcase-facing-btn"
			>
				{previewTeam === 'west' ? 'Захід' : 'Схід'}
			</button>

			<!-- Окреме меню зміни кольору (за замовчуванням — Сірий) -->
			<GameSelect
				value={String(selectedColorId)}
				options={colorSelectOptions}
				onchange={(val) => (selectedColorId = Number(val))}
				ariaLabel="Колір юнітів та будівель"
				testId="assets-showcase-color-btn"
				align="right"
				minMenuWidth={176}
			/>

			{#if graphicsTab === '2.5d'}
				<label
					class="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-[#544738]/85 bg-[#121722] text-xs font-bold text-slate-200"
					title="Перевірка поступового руйнування 2.5D замків (8 стадій)"
					data-testid="assets-showcase-castle-hp-wrap"
				>
					<span class="text-[11px] text-amber-300 whitespace-nowrap">Замок HP</span>
					<input
						type="range"
						min="0"
						max="100"
						step="1"
						bind:value={castleHpPct}
						aria-label="Рівень HP 2.5D замків"
						data-testid="assets-showcase-castle-hp-slider"
						class="w-20 sm:w-24 accent-amber-400 cursor-pointer"
					/>
					<span
						class="font-mono text-[11px] w-14 text-right whitespace-nowrap {castleHpPct > 50
							? 'text-emerald-300'
							: castleHpPct > 25
								? 'text-amber-300'
								: 'text-rose-400'}"
					>
						{castleHpPct}% · С{castleStage}
					</span>
				</label>
			{/if}

			<button
				type="button"
				onclick={() => (animateUnits = !animateUnits)}
				class="px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer transition {animateUnits
					? 'bg-emerald-950/80 border-emerald-500/70 text-emerald-200'
					: 'bg-slate-900 border-slate-700 text-slate-400'}"
			>
				{animateUnits ? 'Анімація' : 'Пауза'}
			</button>
		</div>
	</header>

	<!-- Castles Showcase Strip (Menu mode, HD Tab only) -->
	{#if viewMode === 'menu' && graphicsTab === 'hd-webp'}
		<section class="p-4 border-b border-slate-800/80 bg-[#0d121d]">
			<h2 class="text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">
				Замки (HD WebP · 8 стадій руйнування для Заходу та Сходу)
			</h2>
			<div class="grid grid-cols-4 sm:grid-cols-8 gap-2">
				{#each WEST_CASTLE_STAGE_URLS as url, idx}
					<div
						class="bg-[#131926] border border-blue-500/30 rounded-lg p-1.5 flex flex-col items-center"
					>
						<img src={url} alt="Захід стадія {idx}" class="w-16 h-14 object-contain" />
						<span class="text-[10px] text-blue-300 font-mono mt-1">West #{idx}</span>
					</div>
				{/each}
				{#each EAST_CASTLE_STAGE_URLS as url, idx}
					<div
						class="bg-[#131926] border border-rose-500/30 rounded-lg p-1.5 flex flex-col items-center"
					>
						<img src={url} alt="Схід стадія {idx}" class="w-16 h-14 object-contain" />
						<span class="text-[10px] text-rose-300 font-mono mt-1">East #{idx}</span>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Main PixiJS Canvas + Inspector -->
	<div
		class={viewMode === 'map'
			? 'w-full h-full relative'
			: graphicsTab === 'hd-webp'
				? 'hidden'
				: 'flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 p-4'}
	>
		<div
			bind:this={canvasWrapEl}
			class={viewMode === 'map'
				? 'w-full h-full bg-[#012e4a] overflow-hidden relative'
				: 'lg:col-span-3 rounded-xl border-2 border-[#544738] bg-[#0b101b] overflow-auto max-h-[78vh] shadow-2xl'}
			data-testid="assets-showcase-canvas-wrap"
		>
			{#if renderError}
				<div
					class="p-4 m-4 rounded-lg bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs"
				>
					Помилка ініціалізації рендерера: {renderError}
				</div>
			{/if}
			<canvas
				bind:this={canvasEl}
				onclick={handleCanvasClick}
				onpointerdown={handlePointerDown}
				onpointermove={handlePointerMove}
				onpointerup={handlePointerUp}
				onpointerleave={handlePointerUp}
				onwheel={handleWheel}
				class={viewMode === 'map'
					? 'w-full h-full block cursor-grab active:cursor-grabbing'
					: 'w-full h-auto block cursor-crosshair'}
			></canvas>

			{#if viewMode === 'map'}
				<!-- Bottom-Left Edge-Docked Camera HUD -->
				<div
					class="fixed bottom-0 left-0 z-50 flex items-center gap-1.5 rounded-tr-xl border-t border-r border-b-0 border-l-0 border-[#544738] bg-[#131722]/95 backdrop-blur-md px-3 py-1.5 text-xs shadow-2xl"
				>
					<button
						type="button"
						onclick={() => {
							const step = camZoom <= 0.3 ? 0.04 : 0.12;
							camZoom = Math.max(0.08, +(camZoom - step).toFixed(2));
						}}
						class="px-2 py-0.5 rounded-md border border-[#3b3226] bg-[#181d28] hover:bg-[#242c3d] hover:border-amber-500/70 text-slate-200 font-bold cursor-pointer transition"
						title="Віддалити"
					>
						-
					</button>
					<button
						type="button"
						onclick={() => (camZoom = 1)}
						class="font-mono text-[11px] text-amber-200 hover:text-amber-100 cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-[#242c3d] transition"
						title="Скинути масштаб до 100% (1:1)"
					>
						{Math.round(camZoom * 100)}%
					</button>
					<button
						type="button"
						onclick={() => {
							const step = camZoom < 0.28 ? 0.04 : 0.12;
							camZoom = Math.min(2.2, +(camZoom + step).toFixed(2));
						}}
						class="px-2 py-0.5 rounded-md border border-[#3b3226] bg-[#181d28] hover:bg-[#242c3d] hover:border-amber-500/70 text-slate-200 font-bold cursor-pointer transition"
						title="Наблизити"
					>
						+
					</button>
					<button
						type="button"
						onclick={fitWholeMap}
						class="px-2.5 py-0.5 rounded-md border border-[#3b3226] bg-[#181d28] hover:bg-[#242c3d] hover:border-amber-500/70 text-amber-300 font-bold cursor-pointer transition"
					>
						Вся карта
					</button>
					<button
						type="button"
						onclick={() => focusWorldPoint(680, 460, 0.9)}
						class="px-2.5 py-0.5 rounded-md border border-[#3b3226] bg-[#181d28] hover:bg-[#242c3d] hover:border-emerald-500/60 text-emerald-300 font-semibold cursor-pointer transition"
						title="Перейти до рас, будівель та їхніх покращень (Основний острів)"
					>
						Раси й апгрейди
					</button>
					<button
						type="button"
						onclick={() => {
							if (graphicsTab === 'hd-webp') {
								focusWorldPoint(2760, 340, 0.9);
							} else {
								const { bottomIsland } = computeRaceRowsLayout();
								focusWorldPoint(bottomIsland.x + 560, bottomIsland.y + 380, 0.9);
							}
						}}
						class="px-2.5 py-0.5 rounded-md border border-[#3b3226] bg-[#181d28] hover:bg-[#242c3d] hover:border-cyan-500/60 text-cyan-300 font-semibold cursor-pointer transition"
						title="Перейти до замків та декорацій (Нижній острів)"
					>
						Замки й декор
					</button>
					<span class="hidden md:inline text-[11px] text-slate-400 border-l border-[#3b3226] pl-2">
						Миша / WASD — рух · Колесо — зум · Клік — деталі
					</span>
				</div>

				<!-- Right-Edge Vertical Minimap -->
				<ShowcaseMinimap
					mapW={showcaseLayout.mapW}
					mapH={showcaseLayout.mapH}
					westIslandW={showcaseLayout.westIslandW}
					eastIslandX={showcaseLayout.eastIslandX}
					bottomIsland={showcaseLayout.bottomIsland}
					rows={showcaseLayout.rows}
					{graphicsTab}
					{camX}
					{camY}
					{camZoom}
					{hostW}
					{hostH}
					selectedPoint={selectedItem ? { x: selectedItem.x, y: selectedItem.y } : null}
					onNavigate={(wx, wy) => focusWorldPoint(wx, wy, camZoom)}
					onFitWholeMap={fitWholeMap}
				/>
			{/if}
		</div>

		{#if viewMode === 'menu' || selectedItem}
			<aside
				class={viewMode === 'map'
					? 'fixed bottom-0 right-0 z-50 w-72 rounded-tl-xl border-t border-l border-b-0 border-r-0 border-[#544738] bg-[#131722]/95 backdrop-blur-md p-3.5 flex flex-col gap-2.5 shadow-2xl'
					: 'rounded-xl border border-[#544738] bg-[#131722] p-4 flex flex-col gap-3 h-fit sticky top-24'}
				data-testid="assets-showcase-inspector"
			>
				<div
					class="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-300 border-b border-slate-800 pb-1.5"
				>
					<span>Інспектор асету</span>
					{#if viewMode === 'map' && selectedItem}
						<button
							type="button"
							onclick={() => (selectedItem = null)}
							class="text-slate-400 hover:text-white cursor-pointer px-1"
							title="Закрити"
						>
							×
						</button>
					{/if}
				</div>
				{#if selectedItem}
					<div>
						<div class="text-base font-black text-amber-200">{selectedItem.title}</div>
						<div class="text-xs text-slate-400">{selectedItem.subtitle}</div>
						<div class="flex items-center justify-between gap-2 mt-1.5">
							<span class="text-[11px] font-mono text-cyan-300 truncate">
								ID: {selectedItem.defId}
							</span>
							<button
								type="button"
								onclick={() => selectedItem && void copyAssetInfo(selectedItem)}
								class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-bold text-slate-200 cursor-pointer shrink-0 transition"
								title="Скопіювати ID та назву в буфер обміну"
							>
								{copiedLabel === `${selectedItem.defId} — ${selectedItem.title}`
									? 'Скопійовано ✓'
									: 'Копіювати'}
							</button>
						</div>
						<div class="text-[11px] text-emerald-300 mt-1">Раса: {selectedItem.race}</div>
						{#if selectedItem.stats}
							<div class="text-[11px] font-mono text-slate-300 mt-1">{selectedItem.stats}</div>
						{/if}
					</div>
					{#if selectedItem.unitSpec}
						<div
							class="bg-[#0c1017] rounded-lg border border-slate-800 p-2.5 text-[11px] space-y-1 font-mono"
						>
							<div>
								Архетип: <span class="text-amber-300">{selectedItem.unitSpec.archetype}</span>
							</div>
							<div>Зброя: <span class="text-cyan-300">{selectedItem.unitSpec.weapon}</span></div>
							<div>
								Шолом: <span class="text-emerald-300">{selectedItem.unitSpec.headgear}</span>
							</div>
							<div>
								Спина: <span class="text-purple-300">{selectedItem.unitSpec.backgear}</span>
							</div>
							<div>Щит: <span class="text-sky-300">{selectedItem.unitSpec.shield}</span></div>
						</div>
					{/if}
				{:else}
					<p class="text-xs text-slate-400 leading-relaxed">
						Натисніть на будь-якого робітника, будівлю чи юніта на карті ліворуч, щоб переглянути
						його унікальні параметри моделі та характеристики.
					</p>
				{/if}
			</aside>
		{/if}
	</div>
</div>
