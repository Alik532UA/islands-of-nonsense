<script lang="ts">
	import { getContext } from 'svelte';
	import type { Simulation } from '../engine/simulation';
	import type { BuildingDefinition, PlayerState, UnitDefinition } from '../engine/types';
	import { formatRaceName, getUnit, isLegendaryBuilding } from '../engine/gameData';
	import { BATTLE_COMMAND_ROUTER_KEY, type BattleCommandRouter } from '$lib/net/onlineMatchSetup';
	import {
		Swords,
		Hammer,
		Zap,
		ShieldAlert,
		Wrench,
		Sparkles,
		ShoppingBag,
		Anvil,
		Coins,
		TreePine,
		Crown,
		Shield,
		Heart,
		Crosshair,
		Feather
	} from 'lucide-svelte';
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

	let abilities = $derived<RadialAbilityItem[]>([
		{
			id: 'rescue_strike',
			name: 'Рятівний удар',
			costText: rescueCd > 0 ? `КД ${Math.ceil(rescueCd)}с` : '950 AoE (Готовий)',
			description: 'Потужний удар блискавкою по ворогах біля замку (950 AoE).',
			hotkey: '1',
			icon: 'rescue',
			enabled: sim.canUseRescueStrike(activeTeam, player),
			action: () => {
				if (sim.canUseRescueStrike(activeTeam, player)) {
					if (
						!routeBattleCommand?.('RESCUE_STRIKE', {
							team: activeTeam,
							playerSlot: player.slot
						})
					) {
						sim.triggerRescueStrike(activeTeam, player);
					}
					sound.playRescueStrike();
					onClose();
				} else {
					sound.playErrorResource();
				}
			}
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
				if (sim.castles[activeTeam].hp < sim.castles[activeTeam].maxHp) {
					const targetId = `castle_${activeTeam}`;
					if (
						!routeBattleCommand?.('REPAIR', {
							team: activeTeam,
							playerSlot: player.slot,
							targetId
						})
					) {
						sim.repairBuilding(activeTeam, targetId, player);
					}
					sound.playRepair();
					onClose();
				} else {
					sound.playErrorResource();
				}
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
			action: () => {
				if (sim.brokenBridge && lumber >= 50) {
					if (
						!routeBattleCommand?.('BRIDGE_REPAIR', {
							team: activeTeam,
							playerSlot: player.slot
						})
					) {
						sim.orderBridgeRepair(activeTeam, player);
					}
					sound.playBuild();
					onClose();
				} else {
					sound.playErrorResource();
				}
			}
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
			action: () => {
				if (sim.canUseRaceSkill(activeTeam)) {
					if (
						!routeBattleCommand?.('USE_ABILITY', {
							team: activeTeam,
							playerSlot: player.slot
						})
					) {
						sim.useRaceSkill(activeTeam, player);
					}
					sound.playUpgrade();
					onClose();
				} else {
					sound.playErrorResource();
				}
			}
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

	const RADIUS = 186;
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#04060b]/65 backdrop-blur-xs select-none animate-in fade-in duration-150 p-4"
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
		<!-- Central Tactical Wheel Container -->
		<div
			class="relative w-[490px] h-[490px] max-w-[94vw] max-h-[82vh] flex items-center justify-center pointer-events-auto"
			data-testid="radial-menu"
		>
			<!-- Radial Compass Backdrop, Rings & SVG Spokes -->
			<div
				class="absolute inset-5 rounded-full border-2 border-[#8c7456]/45 bg-gradient-to-b from-[#141925]/92 via-[#0d111a]/95 to-[#080b11]/95 shadow-[0_0_70px_rgba(0,0,0,0.92),inset_0_0_32px_rgba(140,116,86,0.12)] pointer-events-none"
			></div>
			<div
				class="absolute inset-12 rounded-full border border-amber-500/20 pointer-events-none"
			></div>

			<svg
				class="absolute inset-0 w-full h-full pointer-events-none"
				viewBox="0 0 490 490"
				aria-hidden="true"
			>
				{#each items as item, idx (item.id)}
					{@const count = items.length}
					{@const angle = (idx / count) * 2 * Math.PI - Math.PI / 2}
					{@const x1 = 245 + Math.cos(angle) * 66}
					{@const y1 = 245 + Math.sin(angle) * 66}
					{@const x2 = 245 + Math.cos(angle) * (RADIUS - 20)}
					{@const y2 = 245 + Math.sin(angle) * (RADIUS - 20)}
					<line
						{x1}
						{y1}
						{x2}
						{y2}
						stroke={hoveredItem?.id === item.id ? '#fbbf24' : '#8c7456'}
						stroke-opacity={hoveredItem?.id === item.id ? '0.65' : '0.22'}
						stroke-width={hoveredItem?.id === item.id ? '2' : '1.2'}
						stroke-dasharray={item.enabled ? undefined : '4 4'}
					/>
				{/each}
			</svg>

			<!-- Center Hub: Category Emblem OR Live Unit / Building Inspector -->
			<button
				type="button"
				onclick={onClose}
				class="relative z-10 w-36 h-36 rounded-full bg-gradient-to-b from-[#1b2232] via-[#121622] to-[#0a0d14] border-2 {hoveredItem
					? 'border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.35)]'
					: 'border-[#8c7456] shadow-[0_0_25px_rgba(0,0,0,0.85)]'} flex flex-col items-center justify-center gap-1 p-2 cursor-pointer hover:border-amber-300 active:scale-95 transition-all text-amber-200"
				title="Закрити (Esc)"
				data-testid="radial-menu-center-hub"
			>
				{#if hoveredItem}
					{#if hoveredItem.type === 'building'}
						<UnitSilhouette
							unit={hoveredItem.unitDef}
							building={hoveredItem.buildingDef}
							accentColor={playerAccentHex}
							size={44}
						/>
						<span
							class="text-[10px] font-black text-amber-200 text-center leading-tight line-clamp-2 max-w-[116px]"
						>
							{hoveredItem.unitDef ? hoveredItem.unitDef.name : hoveredItem.name}
						</span>
						{#if hoveredItem.unitDef}
							<span class="text-[9px] font-mono text-emerald-300 font-bold leading-none">
								{Math.round(hoveredItem.unitDef.hp)} HP · {hoveredItem.unitDef.damage_base ?? 15} ATK
							</span>
						{:else}
							<span class="text-[9px] font-mono text-amber-300/90 leading-none">
								{hoveredItem.subtitle}
							</span>
						{/if}
					{:else}
						{#if hoveredItem.iconType === 'rescue'}
							<ShieldAlert class="w-8 h-8 text-amber-400" />
						{:else if hoveredItem.iconType === 'repair' || hoveredItem.iconType === 'bridge'}
							<Wrench class="w-8 h-8 text-emerald-400" />
						{:else if hoveredItem.iconType === 'shop'}
							<ShoppingBag class="w-8 h-8 text-sky-400" />
						{:else if hoveredItem.iconType === 'forge'}
							<Anvil class="w-8 h-8 text-amber-400" />
						{:else}
							<Sparkles class="w-8 h-8 text-purple-400" />
						{/if}
						<span
							class="text-[10px] font-black text-amber-200 text-center leading-tight max-w-[110px]"
						>
							{hoveredItem.name}
						</span>
						<span class="text-[9px] font-mono text-sky-300 leading-none">
							{hoveredItem.subtitle}
						</span>
					{/if}
				{:else}
					{#if category === 'army'}
						<Swords class="w-7 h-7 text-amber-400 drop-shadow" />
						<span class="text-[11px] font-black uppercase tracking-wider text-amber-300">
							Війська
						</span>
					{:else if category === 'special'}
						<Hammer class="w-7 h-7 text-amber-400 drop-shadow" />
						<span class="text-[11px] font-black uppercase tracking-wider text-amber-300">
							Споруди
						</span>
					{:else}
						<Zap class="w-7 h-7 text-amber-400 drop-shadow" />
						<span class="text-[11px] font-black uppercase tracking-wider text-amber-300">
							Дії
						</span>
					{/if}
					<span class="text-[9px] font-semibold text-slate-300 truncate max-w-[100px]">
						{formatRaceName(player.race)}
					</span>
					<div class="flex items-center gap-2 text-[9px] font-mono font-bold mt-0.5">
						<span class="flex items-center gap-0.5 text-amber-300">
							<Coins class="w-2.5 h-2.5 text-amber-400" />
							{Math.floor(gold)}
						</span>
						<span class="flex items-center gap-0.5 text-emerald-300">
							<TreePine class="w-2.5 h-2.5 text-emerald-400" />
							{Math.floor(lumber)}
						</span>
					</div>
				{/if}
			</button>

			<!-- Radial Node Cards -->
			{#each items as item, idx (item.id)}
				{@const count = items.length}
				{@const angle = (idx / count) * 2 * Math.PI - Math.PI / 2}
				{@const x = Math.round(Math.cos(angle) * RADIUS)}
				{@const y = Math.round(Math.sin(angle) * RADIUS)}
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
					style="transform: translate({x}px, {y}px);"
					class="absolute w-[132px] min-h-[62px] -ml-[66px] -mt-[31px] rounded-[8px] border px-2 py-1.5 flex items-center gap-2 transition-all duration-150 shadow-xl {item.enabled
						? isHovered
							? 'bg-gradient-to-b from-[#232c42] to-[#161d2e] border-amber-300 ring-1 ring-amber-400/50 scale-105 text-white cursor-pointer z-20'
							: 'bg-gradient-to-b from-[#1a2133]/96 to-[#111622]/96 border-[#8c7456]/70 hover:border-amber-300 text-slate-100 cursor-pointer'
						: 'bg-[#0c1018]/92 border-slate-700/80 text-slate-400 cursor-not-allowed'}"
					data-testid={`radial-item-${item.id}`}
					title="{item.name} [{item.hotkey}]"
				>
					<!-- Keycap Hotkey Badge (Top-Right, clean WC3 command card style) -->
					<span
						class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-[5px] border text-[10px] font-mono font-black flex items-center justify-center shadow {item.enabled
							? isHovered
								? 'bg-amber-400 border-amber-200 text-slate-950'
								: 'bg-[#0b0f18] border-[#8c7456] text-[#fef08a]'
							: 'bg-[#090c14] border-slate-700 text-slate-500'}"
					>
						{item.hotkey}
					</span>

					<!-- Unit / Building / Ability Visual Preview Thumbnail -->
					<div
						class="w-9 h-9 rounded-[6px] border flex items-center justify-center shrink-0 relative overflow-hidden {item.enabled
							? 'bg-[#090c14] border-[#544738]'
							: 'bg-[#07090f] border-slate-800 opacity-65'}"
					>
						{#if item.type === 'building'}
							<UnitSilhouette
								unit={item.unitDef}
								building={item.buildingDef}
								accentColor={playerAccentHex}
								size={30}
							/>
							{#if item.isLegendary}
								<Crown class="w-2.5 h-2.5 text-amber-300 absolute top-0.5 left-0.5" />
							{/if}
						{:else if item.iconType === 'rescue'}
							<ShieldAlert class="w-5 h-5 text-amber-400" />
						{:else if item.iconType === 'repair' || item.iconType === 'bridge'}
							<Wrench class="w-5 h-5 text-emerald-400" />
						{:else if item.iconType === 'shop'}
							<ShoppingBag class="w-5 h-5 text-sky-400" />
						{:else if item.iconType === 'forge'}
							<Anvil class="w-5 h-5 text-amber-400" />
						{:else}
							<Sparkles class="w-5 h-5 text-purple-400" />
						{/if}
					</div>

					<!-- Text & Cost Strip -->
					<div class="min-w-0 flex-1 text-left flex flex-col justify-between gap-0.5">
						<div class="text-[10.5px] font-bold leading-tight line-clamp-2 pr-1">
							{item.name}
						</div>

						{#if item.type === 'building'}
							<div class="flex items-center gap-1.5 text-[9.5px] font-mono font-bold leading-none">
								<span
									class="inline-flex items-center gap-0.5 {item.canAffordGold
										? 'text-amber-300'
										: 'text-rose-400'}"
								>
									<Coins class="w-2.5 h-2.5 shrink-0" />
									<span>{item.goldCost}</span>
								</span>
								{#if item.lumberCost > 0}
									<span
										class="inline-flex items-center gap-0.5 {item.canAffordLumber
											? 'text-emerald-300'
											: 'text-rose-400'}"
									>
										<TreePine class="w-2.5 h-2.5 shrink-0" />
										<span>{item.lumberCost}</span>
									</span>
								{/if}
							</div>
						{:else}
							<div class="text-[9.5px] font-mono text-amber-300/90 font-semibold truncate">
								{item.subtitle}
							</div>
						{/if}
					</div>
				</button>
			{/each}
		</div>

		<!-- Tactile Bottom Unit/Building Detail Strip (Shows Full Unit Specs & Role on Hover) -->
		{#if hoveredItem}
			<div
				data-testid="radial-hover-details"
				class="mt-3 w-full max-w-md rounded-[10px] bg-[#0d111a]/95 border border-[#8c7456] px-3.5 py-2.5 shadow-2xl text-xs text-slate-200 pointer-events-none"
			>
				<div class="flex items-center justify-between gap-2 pb-1.5 border-b border-[#3b3226]">
					<span class="font-black text-amber-300 truncate">{hoveredItem.name}</span>
					{#if hoveredItem.unitDef}
						<span class="text-[11px] text-sky-300 font-semibold shrink-0 flex items-center gap-1">
							{#if hoveredItem.unitDef.flying}
								<Feather class="w-3 h-3 text-sky-400" />
							{:else if hoveredItem.unitDef.attack_type === 'pierce'}
								<Crosshair class="w-3 h-3 text-emerald-400" />
							{:else}
								<Swords class="w-3 h-3 text-amber-300" />
							{/if}
							{hoveredItem.unitDef.name}
						</span>
					{/if}
				</div>
				{#if hoveredItem.unitDef}
					<div class="grid grid-cols-3 gap-2 pt-1.5 text-[11px] font-mono">
						<div class="flex items-center gap-1 text-emerald-300">
							<Heart class="w-3 h-3 text-emerald-400" />
							<span>{Math.round(hoveredItem.unitDef.hp)} HP</span>
						</div>
						<div class="flex items-center gap-1 text-amber-200">
							<Swords class="w-3 h-3 text-amber-400" />
							<span>
								{hoveredItem.unitDef.damage_base ?? 15} ({hoveredItem.unitDef.attack_type})
							</span>
						</div>
						<div class="flex items-center gap-1 text-slate-300 justify-end">
							<Shield class="w-3 h-3 text-sky-400" />
							<span>{hoveredItem.unitDef.armor} ({hoveredItem.unitDef.armor_type})</span>
						</div>
					</div>
				{:else if hoveredItem.buildingDef?.specialType === 'tower'}
					<div class="pt-1.5 text-[11px] text-cyan-300">
						Оборонна вежа · Атака: {hoveredItem.buildingDef.damage_base ?? 50} · Дист.:
						{hoveredItem.buildingDef.range ?? 500}px
					</div>
				{:else if hoveredItem.buildingDef?.raw_fields?.utub}
					<p class="pt-1.5 text-[11px] text-slate-300 line-clamp-2">
						{hoveredItem.buildingDef.raw_fields.utub}
					</p>
				{:else if hoveredItem.description}
					<p class="pt-1.5 text-[11px] text-slate-300">{hoveredItem.description}</p>
				{/if}
			</div>
		{/if}
	</div>
{/if}
