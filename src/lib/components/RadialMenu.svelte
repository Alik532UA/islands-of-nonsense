<script lang="ts">
	import type { Simulation } from '../engine/simulation';
	import type { BuildingDefinition, PlayerState } from '../engine/types';
	import {
		Swords,
		Hammer,
		Zap,
		ShieldAlert,
		Wrench,
		Sparkles,
		ShoppingBag,
		Anvil
	} from 'lucide-svelte';
	import { sound } from '../services/audio';

	export type RadialCategory = 'army' | 'special' | 'abilities';

	export interface RadialAbilityItem {
		id: string;
		name: string;
		costText?: string;
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

	let abilities = $derived<RadialAbilityItem[]>([
		{
			id: 'rescue_strike',
			name: 'Рятівний удар',
			costText: 'Готовий',
			hotkey: '1',
			icon: 'rescue',
			enabled: sim.canUseRescueStrike(activeTeam),
			action: () => {
				if (sim.canUseRescueStrike(activeTeam)) {
					sim.triggerRescueStrike(activeTeam);
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
			hotkey: '2',
			icon: 'repair',
			enabled: sim.castles[activeTeam].hp < sim.castles[activeTeam].maxHp,
			action: () => {
				if (sim.castles[activeTeam].hp < sim.castles[activeTeam].maxHp) {
					sim.repairBuilding(activeTeam, `castle_${activeTeam}`, player);
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
			hotkey: '3',
			icon: 'bridge',
			enabled: Boolean(sim.brokenBridge) && lumber >= 50,
			action: () => {
				if (sim.brokenBridge && lumber >= 50) {
					sim.orderBridgeRepair(activeTeam, player);
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
			costText: 'Товари',
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
			hotkey: '6',
			icon: 'skill',
			enabled: sim.canUseRaceSkill(activeTeam),
			action: () => {
				if (sim.canUseRaceSkill(activeTeam)) {
					sim.useRaceSkill(activeTeam, player);
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
		hotkey: string;
		enabled: boolean;
		action: () => void;
		type: 'building' | 'ability';
		buildingDef?: BuildingDefinition;
		iconType?: string;
	}

	let items = $derived<DisplayItem[]>(
		category === 'army'
			? armyBuildings.slice(0, 8).map((b, idx) => {
					const gCost = b.gold_cost || 0;
					const lCost = b.lumber_cost || 0;
					const canAfford = gold >= gCost && lumber >= lCost;
					return {
						id: b.id,
						name: b.name,
						subtitle: `${gCost}g${lCost > 0 ? ` ${lCost}w` : ''}`,
						hotkey: String(idx + 1),
						enabled: canAfford,
						action: () => {
							onSelectBuilding(b.id);
							onClose();
						},
						type: 'building',
						buildingDef: b
					};
				})
			: category === 'special'
				? specialBuildings.slice(0, 8).map((b, idx) => {
						const gCost = b.gold_cost || 0;
						const lCost = b.lumber_cost || 0;
						const canAfford = gold >= gCost && lumber >= lCost;
						return {
							id: b.id,
							name: b.name,
							subtitle: `${gCost}g${lCost > 0 ? ` ${lCost}w` : ''}`,
							hotkey: String(idx + 1),
							enabled: canAfford,
							action: () => {
								onSelectBuilding(b.id);
								onClose();
							},
							type: 'building',
							buildingDef: b
						};
					})
				: abilities.map((a) => ({
						id: a.id,
						name: a.name,
						subtitle: a.costText || '',
						hotkey: a.hotkey,
						enabled: a.enabled,
						action: a.action,
						type: 'ability',
						iconType: a.icon
					}))
	);

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

	const RADIUS = 155;
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-xs select-none animate-in fade-in duration-150"
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
		<!-- Central Wheel Container -->
		<div
			class="relative w-[380px] h-[380px] flex items-center justify-center pointer-events-auto"
			data-testid="radial-menu"
		>
			<!-- Radial Decorative Ring -->
			<div
				class="absolute inset-0 rounded-full border-2 border-amber-500/20 bg-[#0d1017]/80 shadow-[0_0_50px_rgba(0,0,0,0.9)] pointer-events-none"
			></div>
			<div
				class="absolute inset-6 rounded-full border border-[#8c7456]/30 pointer-events-none"
			></div>

			<!-- Center Hub Button -->
			<button
				type="button"
				onclick={onClose}
				class="relative z-10 w-24 h-24 rounded-full bg-gradient-to-b from-[#241d14] to-[#120f0a] border-2 border-amber-500/60 shadow-xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-amber-400 hover:scale-105 active:scale-95 transition-all text-amber-200"
				title="Закрити (Esc)"
				data-testid="radial-menu-center-hub"
			>
				{#if category === 'army'}
					<Swords class="w-7 h-7 text-amber-400 drop-shadow" />
					<span class="text-[10px] font-black uppercase tracking-wider text-amber-300">
						Війська
					</span>
					<span class="text-[8px] font-mono text-slate-400">[E]</span>
				{:else if category === 'special'}
					<Hammer class="w-7 h-7 text-amber-400 drop-shadow" />
					<span class="text-[10px] font-black uppercase tracking-wider text-amber-300">
						Споруди
					</span>
					<span class="text-[8px] font-mono text-slate-400">[R]</span>
				{:else}
					<Zap class="w-7 h-7 text-amber-400 drop-shadow" />
					<span class="text-[10px] font-black uppercase tracking-wider text-amber-300">Дії</span>
					<span class="text-[8px] font-mono text-slate-400">[Q]</span>
				{/if}
			</button>

			<!-- Radial Items placed in circle -->
			{#each items as item, idx}
				{@const count = items.length}
				{@const angle = (idx / count) * 2 * Math.PI - Math.PI / 2}
				{@const x = Math.round(Math.cos(angle) * RADIUS)}
				{@const y = Math.round(Math.sin(angle) * RADIUS)}

				<button
					type="button"
					onclick={() => {
						if (item.enabled) {
							item.action();
						} else {
							sound.playErrorResource();
						}
					}}
					style="transform: translate({x}px, {y}px);"
					class="absolute w-28 h-14 -ml-14 -mt-7 rounded-xl border p-1.5 flex flex-col items-center justify-between transition-all duration-150 shadow-lg cursor-pointer {item.enabled
						? 'bg-[#181e2b]/95 hover:bg-[#253046] border-amber-500/40 hover:border-amber-300 hover:scale-110 active:scale-95 text-white'
						: 'bg-[#0e121a]/80 border-slate-800 text-slate-500 opacity-50 grayscale cursor-not-allowed'}"
					data-testid={`radial-item-${item.id}`}
					title="{item.name} [{item.hotkey}]"
				>
					<div class="flex items-center justify-between w-full px-1">
						<span
							class="text-[9px] font-mono font-bold px-1 py-0.2 rounded {item.enabled
								? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
								: 'bg-slate-800 text-slate-500'}"
						>
							[{item.hotkey}]
						</span>
						{#if item.type === 'ability'}
							{#if item.iconType === 'rescue'}
								<ShieldAlert class="w-3.5 h-3.5 text-amber-400" />
							{:else if item.iconType === 'repair' || item.iconType === 'bridge'}
								<Wrench class="w-3.5 h-3.5 text-emerald-400" />
							{:else if item.iconType === 'shop'}
								<ShoppingBag class="w-3.5 h-3.5 text-blue-400" />
							{:else if item.iconType === 'forge'}
								<Anvil class="w-3.5 h-3.5 text-amber-400" />
							{:else}
								<Sparkles class="w-3.5 h-3.5 text-purple-400" />
							{/if}
						{:else}
							<Hammer class="w-3.5 h-3.5 text-amber-400/80" />
						{/if}
					</div>

					<div class="text-[9.5px] font-bold truncate max-w-[100px] text-center leading-tight">
						{item.name}
					</div>

					<div class="text-[8.5px] font-mono text-amber-300 font-semibold leading-none">
						{item.subtitle}
					</div>
				</button>
			{/each}
		</div>
	</div>
{/if}
