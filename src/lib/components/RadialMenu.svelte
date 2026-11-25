<script lang="ts">
	import { Coins, Crown, TreePine } from 'lucide-svelte';
	import { getContext } from 'svelte';
	import type { Simulation } from '../engine/simulation';
	import type { BuildingDefinition, PlayerState, UnitDefinition } from '../engine/types';
	import { formatRaceName, getUnit, isLegendaryBuilding } from '../engine/gameData';
	import { BATTLE_COMMAND_ROUTER_KEY, type BattleCommandRouter } from '$lib/net/onlineMatchSetup';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import UnitSilhouette from './ui/UnitSilhouette.svelte';
	import { sound } from '../services/audio';

	export type RadialCategory = 'army' | 'special' | 'abilities';

	export interface RadialAbilityItem {
		id: string;
		name: string;
		costText?: string;
		description?: string;
		hotkey: string;
		icon: 'rescue' | 'repair' | 'bridge' | 'shop' | 'forge' | 'skill';
		enabled: boolean;
		action: () => void;
	}

	let {
		isOpen = false,
		category = 'army',
		sim,
		localTeam = 'west',
		activePlayer = null,
		armyBuildings = [],
		specialBuildings = [],
		onSelectBuilding,
		onOpenShop,
		onOpenForge,
		onClose
	}: {
		isOpen: boolean;
		category: RadialCategory;
		sim: Simulation;
		localTeam?: 'west' | 'east';
		activePlayer?: PlayerState | null;
		armyBuildings?: BuildingDefinition[];
		specialBuildings?: BuildingDefinition[];
		onSelectBuilding: (defId: string) => void;
		onOpenShop?: () => void;
		onOpenForge?: () => void;
		onClose: () => void;
	} = $props();

	let player = $derived(
		activePlayer ?? (localTeam === 'east' ? sim.players.east : sim.players.west)
	);
	let activeTeam = $derived(player.team);
	let gold = $derived(player.gold);
	let lumber = $derived(player.lumber ?? 0);
	let playerAccentHex = $derived(player.color?.hex ?? '#f59e0b');

	const routeBattleCommand = getContext<BattleCommandRouter | undefined>(BATTLE_COMMAND_ROUTER_KEY);

	let rescueCd = $derived(sim.getRescueStrikeCooldown(activeTeam, player));

	function execBattleAbility(
		canUse: boolean,
		cmd: 'RESCUE_STRIKE' | 'REPAIR' | 'BRIDGE_REPAIR' | 'USE_ABILITY',
		payload: Record<string, unknown>,
		localFn: () => void,
		playSfx: () => void
	) {
		if (!canUse) {
			sound.playErrorResource();
			return;
		}
		if (!routeBattleCommand?.(cmd, payload)) {
			localFn();
		}
		playSfx();
		onClose();
	}

	let abilities = $derived<RadialAbilityItem[]>([
		{
			id: 'rescue_strike',
			name: 'Рятівний удар',
			costText: rescueCd > 0 ? `КД ${Math.ceil(rescueCd)}с` : '950 AoE (Готовий)',
			description: 'Потужний удар блискавкою по ворогах біля замку (950 AoE).',
			hotkey: '1',
			icon: 'rescue',
			enabled: sim.canUseRescueStrike(activeTeam, player),
			action: () =>
				execBattleAbility(
					sim.canUseRescueStrike(activeTeam, player),
					'RESCUE_STRIKE',
					{ team: activeTeam, playerSlot: player.slot },
					() => sim.triggerRescueStrike(activeTeam, player),
					() => sound.playRescueStrike()
				)
		},
		{
			id: 'repair_castle',
			name: 'Ремонт цитаделі',
			costText: 'Безкоштовно',
			description: 'Відправляє робітника ремонтувати головний замок.',
			hotkey: '2',
			icon: 'repair',
			enabled: sim.castles[activeTeam].hp < sim.castles[activeTeam].maxHp,
			action: () => {
				const targetId = `castle_${activeTeam}`;
				execBattleAbility(
					sim.castles[activeTeam].hp < sim.castles[activeTeam].maxHp,
					'REPAIR',
					{ team: activeTeam, playerSlot: player.slot, targetId },
					() => sim.repairBuilding(activeTeam, targetId, player),
					() => sound.playRepair()
				);
			}
		},
		{
			id: 'repair_bridge',
			name: 'Відбудувати міст',
			costText: '50 деревини',
			description: 'Відновлює зруйнований міст через річку для атаки лінією.',
			hotkey: '3',
			icon: 'bridge',
			enabled: Boolean(sim.brokenBridge) && lumber >= 50,
			action: () =>
				execBattleAbility(
					Boolean(sim.brokenBridge) && lumber >= 50,
					'BRIDGE_REPAIR',
					{ team: activeTeam, playerSlot: player.slot },
					() => sim.orderBridgeRepair(activeTeam, player),
					() => sound.playBuild()
				)
		},
		{
			id: 'open_shop',
			name: 'Магазин замку',
			costText: 'Артефакти',
			description: 'Сувої, зілля й тактичні предмети підтримки замку.',
			hotkey: '4',
			icon: 'shop',
			enabled: true,
			action: () => {
				onOpenShop?.();
				onClose();
			}
		},
		{
			id: 'open_forge',
			name: 'Кузня покращень',
			costText: 'Апгрейди',
			description: 'Покращення атаки, броні військ та економіки.',
			hotkey: '5',
			icon: 'forge',
			enabled: true,
			action: () => {
				onOpenForge?.();
				onClose();
			}
		},
		{
			id: 'race_skill',
			name: 'Здібність раси',
			costText: 'Магія',
			description: 'Унікальна активна здібність вашої обраної раси.',
			hotkey: '6',
			icon: 'skill',
			enabled: sim.canUseRaceSkill(activeTeam),
			action: () =>
				execBattleAbility(
					sim.canUseRaceSkill(activeTeam),
					'USE_ABILITY',
					{ team: activeTeam, playerSlot: player.slot },
					() => sim.useRaceSkill(activeTeam, player),
					() => sound.playUpgrade()
				)
		}
	]);

	interface DisplayItem {
		id: string;
		name: string;
		subtitle: string;
		description?: string;
		goldCost: number;
		lumberCost: number;
		canAffordGold: boolean;
		canAffordLumber: boolean;
		lacksFood?: boolean;
		hotkey: string;
		enabled: boolean;
		action: () => void;
		type: 'building' | 'ability';
		buildingDef?: BuildingDefinition;
		unitDef?: UnitDefinition | null;
		isLegendary?: boolean;
		iconType?: string;
	}

	function mapBuildingToItem(b: BuildingDefinition, idx: number): DisplayItem {
		const gCost = b.gold_cost || 0;
		const lCost = b.lumber_cost || 0;
		const isLeg = isLegendaryBuilding(b);
		const lacksFood = isLeg && player.food >= player.maxFood;
		const canAffordGold = gold >= gCost;
		const canAffordLumber = lumber >= lCost;
		const unitDef = b.unit ? (getUnit(b.unit) ?? null) : null;
		return {
			id: b.id,
			name: b.name,
			subtitle: `${gCost}g${lCost > 0 ? ` ${lCost}w` : ''}`,
			goldCost: gCost,
			lumberCost: lCost,
			canAffordGold,
			canAffordLumber,
			lacksFood,
			hotkey: String(idx + 1),
			enabled: canAffordGold && canAffordLumber && !lacksFood,
			action: () => {
				onSelectBuilding(b.id);
				onClose();
			},
			type: 'building',
			buildingDef: b,
			unitDef,
			isLegendary: isLeg
		};
	}

	let items = $derived<DisplayItem[]>(
		category === 'army'
			? armyBuildings.slice(0, 8).map(mapBuildingToItem)
			: category === 'special'
				? specialBuildings.slice(0, 8).map(mapBuildingToItem)
				: abilities.map((a) => ({
						id: a.id,
						name: a.name,
						subtitle: a.costText || '',
						description: a.description,
						goldCost: 0,
						lumberCost: a.id === 'repair_bridge' ? 50 : 0,
						canAffordGold: true,
						canAffordLumber: a.id !== 'repair_bridge' || lumber >= 50,
						hotkey: a.hotkey,
						enabled: a.enabled,
						action: a.action,
						type: 'ability',
						iconType: a.icon
					}))
	);

	let hoveredItem = $state<DisplayItem | null>(null);

	$effect(() => {
		if (!isOpen) {
			hoveredItem = null;
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (!isOpen) return;

		if (e.key === 'Escape') {
			e.preventDefault();
			e.stopPropagation();
			onClose();
			return;
		}

		// Re-pressing toggle key closes menu
		if (
			(category === 'army' && (e.key === 'e' || e.key === 'E')) ||
			(category === 'special' && (e.key === 'r' || e.key === 'R')) ||
			(category === 'abilities' && (e.key === 'q' || e.key === 'Q'))
		) {
			e.preventDefault();
			e.stopPropagation();
			onClose();
			return;
		}

		// Number keys 1..8 select item
		const digit = parseInt(e.key, 10);
		if (!isNaN(digit) && digit >= 1 && digit <= items.length) {
			e.preventDefault();
			e.stopPropagation();
			const selected = items[digit - 1];
			if (selected && selected.enabled) {
				selected.action();
			} else {
				sound.playErrorResource();
			}
		}
	}

	const WHEEL_SIZE = 640;
	const WHEEL_CENTER = WHEEL_SIZE / 2;
	const RADIUS = 242;
	const COMPASS_TICKS = Array.from({ length: 24 }, (_, i) => i);

	function buildSectorPath(idx: number, count: number): string {
		if (count <= 0) return '';
		const step = (2 * Math.PI) / count;
		const centerAngle = idx * step - Math.PI / 2;
		const halfSpan = Math.min(step * 0.44, 0.52);
		const a1 = centerAngle - halfSpan;
		const a2 = centerAngle + halfSpan;
		const rIn = 88;
		const rOut = RADIUS;
		const x1 = WHEEL_CENTER + Math.cos(a1) * rIn;
		const y1 = WHEEL_CENTER + Math.sin(a1) * rIn;
		const x2 = WHEEL_CENTER + Math.cos(a1) * rOut;
		const y2 = WHEEL_CENTER + Math.sin(a1) * rOut;
		const x3 = WHEEL_CENTER + Math.cos(a2) * rOut;
		const y3 = WHEEL_CENTER + Math.sin(a2) * rOut;
		const x4 = WHEEL_CENTER + Math.cos(a2) * rIn;
		const y4 = WHEEL_CENTER + Math.sin(a2) * rIn;
		return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} A ${rOut} ${rOut} 0 0 1 ${x3.toFixed(1)} ${y3.toFixed(1)} L ${x4.toFixed(1)} ${y4.toFixed(1)} A ${rIn} ${rIn} 0 0 0 ${x1.toFixed(1)} ${y1.toFixed(1)} Z`;
	}

	function getUnitRoleBadge(unit: UnitDefinition): string {
		if (unit.flying) return 'Повітря';
		if (unit.attack_type === 'siege') return 'Облога';
		const hasSpell = unit.abilities?.some(
			(a) => a.type === 'heal' || a.type === 'slow' || a.type === 'frost'
		);
		if (unit.attack_type === 'magic' || hasSpell) return 'Магія';
		if (unit.attack_type === 'pierce' || (unit.range ?? 0) > 200) return 'Дальній';
		if (unit.armor_type === 'fort' || unit.armor_type === 'large' || unit.hp >= 800) return 'Танк';
		return 'Ближній';
	}

	let hoveredIndex = $derived(
		hoveredItem ? items.findIndex((entry) => entry.id === hoveredItem?.id) : -1
	);
	let categoryKey = $derived(category === 'army' ? 'E' : category === 'special' ? 'R' : 'Q');
</script>

<svelte:window onkeydown={handleKeydown} />

{#snippet abilityIcon(iconType: string | undefined, cls: string)}
	{#if iconType === 'rescue'}
		<UiIcon name="shieldAlert" class="{cls} text-amber-400" />
	{:else if iconType === 'repair' || iconType === 'bridge'}
		<UiIcon name="wrench" class="{cls} text-emerald-400" />
	{:else if iconType === 'shop'}
		<UiIcon name="shoppingBag" class="{cls} text-sky-400" />
	{:else if iconType === 'forge'}
		<UiIcon name="anvil" class="{cls} text-amber-400" />
	{:else}
		<UiIcon name="sparkles" class="{cls} text-purple-400" />
	{/if}
{/snippet}

{#if isOpen}
	<div
		class="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#03050a]/72 backdrop-blur-xs select-none animate-in fade-in duration-150 p-3 gap-3"
		role="dialog"
		aria-label="Радіальне меню дій"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) onClose();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') onClose();
		}}
		data-testid="radial-menu-overlay"
	>
		<!-- Scaled Wheel Stage: guarantees dead-center circular balance on all screens -->
		<div
			class="relative w-[640px] h-[640px] pointer-events-auto scale-[0.78] sm:scale-[0.86] md:scale-[0.94] lg:scale-100 origin-center transition-transform"
			data-testid="radial-menu"
		>
			<!-- Outer Sculpted Tactical Disk & Engraved Rings -->
			<div
				class="absolute inset-4 rounded-full border-2 border-[#a88a5c]/65 bg-[radial-gradient(circle_at_center,rgba(24,31,50,0.96)_0%,rgba(13,17,28,0.97)_58%,rgba(7,9,16,0.98)_100%)] shadow-[0_0_95px_rgba(0,0,0,0.95),inset_0_0_45px_rgba(168,138,92,0.16)] pointer-events-none"
			></div>
			<div
				class="absolute inset-[74px] rounded-full border border-[#8c7456]/40 pointer-events-none"
			></div>
			<div
				class="absolute inset-[132px] rounded-full border border-dashed border-amber-500/22 pointer-events-none"
			></div>

			<!-- SVG Compass Ticks, Sector Wedge Highlight, Orbit Ring & Spokes -->
			<svg
				class="absolute inset-0 w-full h-full pointer-events-none"
				viewBox="0 0 {WHEEL_SIZE} {WHEEL_SIZE}"
				aria-hidden="true"
			>
				<!-- Subtle Orbit Circle connecting card centers -->
				<circle
					cx={WHEEL_CENTER}
					cy={WHEEL_CENTER}
					r={RADIUS}
					fill="none"
					stroke="#a88a5c"
					stroke-opacity="0.24"
					stroke-width="1.25"
					stroke-dasharray="5 5"
				/>

				<!-- 24 Engraved Compass Tick Marks -->
				{#each COMPASS_TICKS as tick (tick)}
					{@const a = (tick / 24) * 2 * Math.PI - Math.PI / 2}
					{@const major = tick % 6 === 0}
					{@const r1 = major ? 286 : 292}
					{@const r2 = 300}
					<line
						x1={WHEEL_CENTER + Math.cos(a) * r1}
						y1={WHEEL_CENTER + Math.sin(a) * r1}
						x2={WHEEL_CENTER + Math.cos(a) * r2}
						y2={WHEEL_CENTER + Math.sin(a) * r2}
						stroke={major ? '#fbbf24' : '#8c7456'}
						stroke-opacity={major ? '0.6' : '0.32'}
						stroke-width={major ? '2' : '1'}
					/>
				{/each}

				<!-- Active Sector Highlight Behind Hovered Node -->
				{#if hoveredIndex >= 0}
					<path
						d={buildSectorPath(hoveredIndex, items.length)}
						fill="#f59e0b"
						fill-opacity="0.14"
						stroke="#fbbf24"
						stroke-opacity="0.32"
						stroke-width="1.2"
					/>
				{/if}

				<!-- Radial Spokes & Node Anchor Sockets -->
				{#each items as item, idx (item.id)}
					{@const count = items.length}
					{@const angle = (idx / count) * 2 * Math.PI - Math.PI / 2}
					{@const active = hoveredItem?.id === item.id}
					{@const x1 = WHEEL_CENTER + Math.cos(angle) * 86}
					{@const y1 = WHEEL_CENTER + Math.sin(angle) * 86}
					{@const x2 = WHEEL_CENTER + Math.cos(angle) * RADIUS}
					{@const y2 = WHEEL_CENTER + Math.sin(angle) * RADIUS}
					<line
						{x1}
						{y1}
						{x2}
						{y2}
						stroke={active ? '#fbbf24' : '#8c7456'}
						stroke-opacity={active ? '0.85' : '0.28'}
						stroke-width={active ? '2.4' : '1.4'}
						stroke-dasharray={item.enabled ? undefined : '4 4'}
					/>
					<circle
						cx={x2}
						cy={y2}
						r={active ? 6 : 4}
						fill={active ? '#fbbf24' : '#1e293b'}
						stroke="#8c7456"
						stroke-width="1.2"
					/>
				{/each}
			</svg>

			<!-- Center Hub: Category Emblem OR Large Unit Showcase -->
			<button
				type="button"
				onclick={onClose}
				style="left: 50%; top: 50%;"
				class="absolute -translate-x-1/2 -translate-y-1/2 z-10 w-44 h-44 rounded-full bg-[radial-gradient(circle_at_top,#25304a_0%,#131826_65%,#090c14_100%)] border-2 {hoveredItem
					? 'border-amber-400 shadow-[0_0_38px_rgba(245,158,11,0.42),inset_0_1px_0_rgba(255,235,180,0.3)]'
					: 'border-[#b5935b] shadow-[0_0_35px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,235,180,0.22)]'} flex flex-col items-center justify-center gap-1 p-3 cursor-pointer hover:border-amber-300 active:scale-95 transition-all text-amber-200"
				title="Закрити (Esc)"
				data-testid="radial-menu-center-hub"
			>
				<span class="absolute inset-2 rounded-full border border-[#8c7456]/35 pointer-events-none"
				></span>

				{#if hoveredItem}
					{#if hoveredItem.type === 'building'}
						<div
							class="w-16 h-16 rounded-full flex items-center justify-center relative"
							style="background: radial-gradient(circle, {playerAccentHex}33 0%, transparent 72%);"
						>
							<UnitSilhouette
								unit={hoveredItem.unitDef}
								building={hoveredItem.buildingDef}
								accentColor={playerAccentHex}
								size={54}
							/>
						</div>
						<span
							class="text-[11px] font-black text-amber-200 text-center leading-tight line-clamp-2 max-w-[138px]"
						>
							{hoveredItem.unitDef ? hoveredItem.unitDef.name : hoveredItem.name}
						</span>
						{#if hoveredItem.unitDef}
							<span class="text-[10px] font-mono text-emerald-300 font-bold leading-none">
								{Math.round(hoveredItem.unitDef.hp)} HP · {hoveredItem.unitDef.damage_base ?? 15}
								ATK
							</span>
						{:else}
							<span class="text-[10px] font-mono text-amber-300/90 leading-none">
								{hoveredItem.subtitle}
							</span>
						{/if}
					{:else}
						{@render abilityIcon(hoveredItem.iconType, 'w-10 h-10')}
						<span
							class="text-[11px] font-black text-amber-200 text-center leading-tight max-w-[132px]"
						>
							{hoveredItem.name}
						</span>
						<span class="text-[10px] font-mono text-sky-300 leading-none">
							{hoveredItem.subtitle}
						</span>
					{/if}
				{:else}
					<div class="flex items-center gap-1.5">
						{#if category === 'army'}
							<UiIcon name="swords" class="w-8 h-8 text-amber-400 drop-shadow" />
						{:else if category === 'special'}
							<UiIcon name="hammer" class="w-8 h-8 text-amber-400 drop-shadow" />
						{:else}
							<UiIcon name="zap" class="w-8 h-8 text-amber-400 drop-shadow" />
						{/if}
						<span
							class="px-1.5 py-0.5 rounded-[4px] bg-[#0a0d15] border border-[#8c7456]/80 text-[10px] font-mono font-black text-amber-300"
						>
							{categoryKey}
						</span>
					</div>
					<span class="text-[13px] font-black uppercase tracking-wider text-amber-300 mt-0.5">
						{#if category === 'army'}
							Війська
						{:else if category === 'special'}
							Споруди
						{:else}
							Дії
						{/if}
					</span>
					<span class="text-[10.5px] font-semibold text-slate-300 truncate max-w-[126px]">
						{formatRaceName(player.race)}
					</span>
					<div
						class="flex items-center gap-2.5 px-2.5 py-1 rounded-[6px] bg-[#080b12]/80 border border-[#544738]/70 text-[10.5px] font-mono font-bold mt-1"
					>
						<span class="flex items-center gap-1 text-amber-300">
							<Coins class="w-3 h-3 text-amber-400" />
							{Math.floor(gold)}
						</span>
						<span class="flex items-center gap-1 text-emerald-300">
							<TreePine class="w-3 h-3 text-emerald-400" />
							{Math.floor(lumber)}
						</span>
					</div>
				{/if}
			</button>

			<!-- Radial Node Cards (Exact Polar Center Alignment) -->
			{#each items as item, idx (item.id)}
				{@const count = items.length}
				{@const angle = (idx / count) * 2 * Math.PI - Math.PI / 2}
				{@const x = Math.round(Math.cos(angle) * RADIUS)}
				{@const y = Math.round(Math.sin(angle) * RADIUS)}
				{@const leftPct = 50 + (x / WHEEL_SIZE) * 100}
				{@const topPct = 50 + (y / WHEEL_SIZE) * 100}
				{@const isHovered = hoveredItem?.id === item.id}

				<button
					type="button"
					onclick={() => {
						if (item.enabled) {
							item.action();
						} else {
							sound.playErrorResource();
						}
					}}
					onmouseenter={() => (hoveredItem = item)}
					onmouseleave={() => {
						if (hoveredItem?.id === item.id) hoveredItem = null;
					}}
					onfocus={() => (hoveredItem = item)}
					style="left: {leftPct.toFixed(3)}%; top: {topPct.toFixed(3)}%;"
					class="absolute -translate-x-1/2 -translate-y-1/2 w-[168px] min-h-[78px] rounded-[8px] border px-2.5 py-2 flex items-center gap-2.5 transition-all duration-150 {item.enabled
						? isHovered
							? 'bg-gradient-to-b from-[#26314a] via-[#1b2337] to-[#121827] border-amber-300 ring-2 ring-amber-400/55 scale-[1.06] text-white cursor-pointer z-20 shadow-[0_0_24px_rgba(245,158,11,0.35),inset_0_1px_0_rgba(255,235,180,0.28)]'
							: 'bg-gradient-to-b from-[#1d2538]/98 via-[#141a29]/98 to-[#0e1320]/98 border-[#9c825e]/85 hover:border-amber-300 text-slate-100 cursor-pointer shadow-[0_10px_24px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,225,160,0.18)]'
						: isHovered
							? 'bg-[#101521]/95 border-rose-500/65 text-slate-300 cursor-not-allowed z-20 shadow-[0_10px_24px_rgba(0,0,0,0.8)]'
							: 'bg-[#0b0f18]/94 border-slate-700/85 text-slate-400 cursor-not-allowed shadow-[0_8px_18px_rgba(0,0,0,0.75)]'}"
					data-testid={`radial-item-${item.id}`}
					title="{item.name} [{item.hotkey}]"
				>
					<!-- Subtle Left Faction Accent Strip -->
					<span
						class="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-[2px] transition-opacity {item.enabled
							? 'opacity-90'
							: 'opacity-30'}"
						style="background-color: {item.type === 'building' ? playerAccentHex : '#f59e0b'};"
					></span>

					<!-- Keycap Hotkey Badge (Top-Right, clean WC3 command card style) -->
					<span
						class="absolute -top-2 -right-2 w-5.5 h-5.5 rounded-[5px] border text-[10.5px] font-mono font-black flex items-center justify-center shadow-md {item.enabled
							? isHovered
								? 'bg-amber-400 border-amber-200 text-slate-950'
								: 'bg-[#0b0f18] border-[#a88a5c] text-[#fef08a]'
							: 'bg-[#090c14] border-slate-700 text-slate-500'}"
					>
						{item.hotkey}
					</span>

					<!-- 48x48 Sculpted Unit / Building Medallion -->
					<div
						class="w-12 h-12 rounded-[7px] border flex items-center justify-center shrink-0 relative overflow-hidden {item.enabled
							? 'bg-[#080b13] border-[#6b5a44]'
							: 'bg-[#07090f] border-slate-800 opacity-65'}"
						style={item.enabled && item.type === 'building'
							? `background: radial-gradient(circle at center, ${playerAccentHex}2e 0%, #080b13 78%);`
							: undefined}
					>
						{#if item.type === 'building'}
							<UnitSilhouette
								unit={item.unitDef}
								building={item.buildingDef}
								accentColor={playerAccentHex}
								size={40}
							/>
							{#if item.isLegendary}
								<Crown class="w-3 h-3 text-amber-300 absolute top-0.5 left-0.5 drop-shadow" />
							{/if}
						{:else}
							{@render abilityIcon(item.iconType, 'w-6 h-6')}
						{/if}
					</div>

					<!-- Name & Resource / Combat Strip -->
					<div class="min-w-0 flex-1 text-left flex flex-col justify-between gap-1 pr-1">
						<div class="text-[11.5px] font-bold leading-[1.15] line-clamp-2">
							{item.name}
						</div>

						{#if item.type === 'building'}
							<div
								class="flex items-center justify-between gap-1.5 px-1.5 py-0.5 rounded-[4px] bg-[#070a11]/85 border border-white/5 text-[10px] font-mono font-bold leading-none"
							>
								<div class="flex items-center gap-1.5">
									<span
										class="inline-flex items-center gap-0.5 {item.canAffordGold
											? 'text-amber-300'
											: 'text-rose-400'}"
									>
										<Coins class="w-3 h-3 shrink-0" />
										<span>{item.goldCost}</span>
									</span>
									{#if item.lumberCost > 0}
										<span
											class="inline-flex items-center gap-0.5 {item.canAffordLumber
												? 'text-emerald-300'
												: 'text-rose-400'}"
										>
											<TreePine class="w-3 h-3 shrink-0" />
											<span>{item.lumberCost}</span>
										</span>
									{/if}
								</div>
								{#if item.unitDef && item.lumberCost === 0}
									<span class="text-[9.5px] text-slate-300/90 flex items-center gap-0.5">
										<UiIcon name="swords" class="w-2.5 h-2.5 text-amber-400/80" />
										{item.unitDef.damage_base ?? 15}
									</span>
								{:else if item.lacksFood}
									<span class="text-[9px] text-rose-400 font-sans">Ліміт</span>
								{/if}
							</div>
						{:else}
							<div
								class="px-1.5 py-0.5 rounded-[4px] bg-[#070a11]/80 border border-white/5 text-[10px] font-mono text-amber-300/90 font-semibold truncate"
							>
								{item.subtitle}
							</div>
						{/if}
					</div>
				</button>
			{/each}
		</div>

		<!-- Persistent Bottom Tactical Dossier Strip (Prevents Vertical Jump on Hover) -->
		<div
			data-testid="radial-hover-details"
			class="w-full max-w-lg min-h-[70px] rounded-[10px] bg-[#0c1019]/96 border border-[#9c825e]/85 px-4 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,225,160,0.14)] text-xs text-slate-200 pointer-events-none flex flex-col justify-center"
		>
			{#if hoveredItem}
				<div class="flex items-center justify-between gap-2 pb-1.5 border-b border-[#3b3226]">
					<div class="flex items-center gap-2 min-w-0">
						<span class="font-black text-amber-300 text-[13px] truncate">{hoveredItem.name}</span>
						{#if hoveredItem.unitDef}
							<span
								class="px-1.5 py-0.5 rounded-[4px] bg-amber-500/15 border border-amber-400/30 text-[10px] font-bold text-amber-200 shrink-0"
							>
								{getUnitRoleBadge(hoveredItem.unitDef)}
							</span>
						{/if}
					</div>
					{#if hoveredItem.unitDef}
						<span class="text-[11.5px] text-sky-300 font-semibold shrink-0 flex items-center gap-1">
							<UiIcon name="swords" class="w-3.5 h-3.5 text-amber-300" />
							{hoveredItem.unitDef.name}
						</span>
					{/if}
				</div>
				{#if hoveredItem.unitDef}
					<div class="grid grid-cols-3 gap-2 pt-1.5 text-[11.5px] font-mono">
						<div class="flex items-center gap-1.5 text-emerald-300 font-semibold">
							<UiIcon name="heart" class="w-3.5 h-3.5 text-emerald-400" />
							<span>{Math.round(hoveredItem.unitDef.hp)} HP</span>
						</div>
						<div class="flex items-center gap-1.5 text-amber-200 font-semibold justify-center">
							<UiIcon name="swords" class="w-3.5 h-3.5 text-amber-400" />
							<span>
								{hoveredItem.unitDef.damage_base ?? 15} ({hoveredItem.unitDef.attack_type})
							</span>
						</div>
						<div class="flex items-center gap-1.5 text-slate-300 font-semibold justify-end">
							<UiIcon name="shield" class="w-3.5 h-3.5 text-sky-400" />
							<span>{hoveredItem.unitDef.armor} ({hoveredItem.unitDef.armor_type})</span>
						</div>
					</div>
				{:else if hoveredItem.buildingDef?.specialType === 'tower'}
					<div class="pt-1.5 text-[11.5px] text-cyan-300 font-medium">
						Оборонна вежа · Атака: {hoveredItem.buildingDef.damage_base ?? 50} · Дист.:
						{hoveredItem.buildingDef.range ?? 500}px
					</div>
				{:else if hoveredItem.buildingDef}
					<p class="pt-1.5 text-[11.5px] text-slate-300">
						Тактична споруда бази · Вартість: {hoveredItem.subtitle}
					</p>
				{:else if hoveredItem.description}
					<p class="pt-1.5 text-[11.5px] text-slate-300">{hoveredItem.description}</p>
				{/if}
			{:else}
				<div class="flex items-center justify-between gap-3 text-[11.5px] text-slate-400">
					<span>Наведіть на слот, щоб побачити юніта та його бойові характеристики</span>
					<span class="font-mono text-amber-300/90 shrink-0">[1–{items.length}] · [Esc]</span>
				</div>
			{/if}
		</div>
	</div>
{/if}
