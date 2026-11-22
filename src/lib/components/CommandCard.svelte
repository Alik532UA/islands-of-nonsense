<script lang="ts">
	import type { Simulation } from '../engine/simulation';
	import type {
		Building,
		BuildingDefinition,
		Unit,
		UnitDefinition,
		PlayerState
	} from '../engine/types';
	import { getUnit, isLegendaryBuilding } from '../engine/gameData';
	import { Coins, Trash2, X, Crown, Hammer, Castle, Swords, Users } from 'lucide-svelte';
	import { CASTLE_ITEMS } from '../engine/items';

	let {
		sim,
		placedBuilding = null,
		placedUnit = null,
		availableUpgrades = [],
		selectedCastle = null,
		selectedUnit = null,
		groupUnits = [],
		availableBuildings = [],
		selectedBuildingId = null,
		activeEntityType,
		player,
		playerGold,
		onSelectBuilding,
		onUpgradeBuilding,
		onSellBuilding,
		onContinueConstruction,
		onClearSelection,
		onCloseBuilding,
		onCloseUnit
	}: {
		sim: Simulation;
		placedBuilding?: Building | null;
		placedUnit?: UnitDefinition | null;
		availableUpgrades?: BuildingDefinition[];
		selectedCastle?: { team: 'west' | 'east'; hp: number; maxHp: number } | null;
		selectedUnit?: Unit | null;
		groupUnits?: Unit[];
		availableBuildings?: BuildingDefinition[];
		selectedBuildingId?: string | null;
		activeEntityType: 'castle' | 'group' | 'building' | 'unit' | 'worker' | 'none';
		player: PlayerState;
		playerGold: number;
		onSelectBuilding: (id: string | null) => void;
		onUpgradeBuilding?: (instanceId: string, targetDefId: string) => void;
		onSellBuilding?: (instanceId: string) => void;
		onContinueConstruction?: (instanceId: string) => void;
		onClearSelection?: () => void;
		onCloseBuilding?: () => void;
		onCloseUnit?: () => void;
	} = $props();

	let hoveredBuilding = $state<BuildingDefinition | null>(null);
	let hoveredUnit = $derived(hoveredBuilding ? getUnit(hoveredBuilding.unit) : null);

	const HOTKEYS = ['Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F', 'Z', 'X', 'C', 'V'];
</script>

<div
	class="relative flex items-center justify-center p-1.5 bg-[#131722] rounded-lg border-2 border-[#544738] shadow-inner shrink-0 h-[142px]"
	style="box-shadow: inset 0 0 10px rgba(0,0,0,0.8);"
>
	{#if placedBuilding}
		{#if placedBuilding.team === 'west'}
			<!-- Placed Building Commands: Upgrades, Continue Construction, Sell -->
			<div class="grid grid-cols-4 gap-1.5 w-[280px]">
				{#if placedBuilding.isUnderConstruction}
					<button
						onclick={() => onContinueConstruction?.(placedBuilding.instanceId)}
						class="col-span-2 h-10 rounded border border-amber-500 bg-amber-950/70 hover:bg-amber-900/90 text-amber-200 flex items-center justify-center gap-1.5 px-2 transition cursor-pointer shadow"
						title="Відправити робітника добудувати споруду"
					>
						<Hammer class="w-4 h-4 text-amber-400" />
						<span class="text-[10px] font-bold">Добудувати</span>
					</button>
					<button
						onclick={() => onSellBuilding?.(placedBuilding.instanceId)}
						class="h-10 rounded border border-rose-600/70 bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 flex items-center justify-center gap-1 px-1 transition cursor-pointer"
						title="Скасувати будівництво (+75% повернення)"
					>
						<Trash2 class="w-3.5 h-3.5 text-rose-400" />
						<span class="text-[9px] font-bold">Скасувати (+75%)</span>
					</button>
					<button
						onclick={() => onCloseBuilding?.()}
						class="h-10 rounded border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 flex flex-col items-center justify-center p-1 transition cursor-pointer"
						title="Закрити вибір (Esc)"
					>
						<X class="w-4 h-4 text-slate-300" />
						<span class="text-[8px] font-mono">Esc</span>
					</button>
				{:else}
					{#each availableUpgrades as up, uIdx}
						{@const upCost =
							up.upgrade_extra_cost > 0
								? up.upgrade_extra_cost
								: Math.max(50, (up.gold_cost || 200) - placedBuilding.goldCost)}
						{@const upLumber = up.lumber_cost || 0}
						{@const canAfford = playerGold >= upCost && (player.lumber ?? 0) >= upLumber}
						<button
							onclick={() => onUpgradeBuilding?.(placedBuilding.instanceId, up.id)}
							disabled={!canAfford}
							class="relative w-16 h-10 rounded border flex flex-col items-center justify-center p-1 transition cursor-pointer {canAfford
								? 'bg-[#1e3a5f] hover:bg-[#2563eb] border-blue-400 text-white shadow'
								: 'bg-[#181d28] border-slate-700 text-slate-500 opacity-60 cursor-not-allowed'}"
							title="{up.name} ({upCost}g{upLumber > 0 ? `, ${upLumber}w` : ''})"
						>
							<span
								class="absolute top-0.5 right-1 text-[8px] font-mono font-bold text-amber-300 drop-shadow"
							>
								[{uIdx + 1}]
							</span>
							<span class="text-[10px] font-bold truncate max-w-[50px]">{up.name}</span>
							<div class="flex items-center gap-1 text-[8px] font-mono font-bold">
								<span class="text-amber-300">🪙{upCost}</span>
								{#if upLumber > 0}
									<span class="text-emerald-400">🪵{upLumber}</span>
								{/if}
							</div>
						</button>
					{/each}
					<!-- Sell button in slot 11 -->
					<button
						onclick={() => onSellBuilding?.(placedBuilding.instanceId)}
						class="relative col-start-3 w-16 h-10 rounded border border-rose-600/70 bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 flex flex-col items-center justify-center p-1 transition cursor-pointer"
						title="Знести споруду (+50% повернення золота)"
					>
						<span class="text-[10px] font-bold flex items-center gap-0.5">
							<Trash2 class="w-3 h-3 text-rose-400" />
							Знести
						</span>
						<span class="text-[9px] text-emerald-300 font-mono font-bold">
							+{Math.floor(placedBuilding.goldCost * 0.5)}g
						</span>
					</button>

					<!-- Deselect button in slot 12 -->
					<button
						onclick={() => onCloseBuilding?.()}
						class="relative col-start-4 w-16 h-10 rounded border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 flex flex-col items-center justify-center p-1 transition cursor-pointer"
						title="Закрити вибір (Esc)"
					>
						<X class="w-4 h-4 text-slate-300" />
						<span class="text-[8px] font-mono">Esc</span>
					</button>
				{/if}
			</div>
		{:else}
			<!-- Enemy building inspection: stats only + dismiss -->
			<div class="flex flex-col justify-between w-[280px] h-full py-1">
				<div class="flex items-center justify-between border-b border-[#3b3226] pb-1">
					<span class="text-[11px] font-bold text-rose-400 flex items-center gap-1">
						<Hammer class="w-3.5 h-3.5 text-rose-400" />
						{placedBuilding.name} (Ворог)
					</span>
					<button
						onclick={() => onCloseBuilding?.()}
						class="text-[9px] text-slate-400 hover:text-white px-1.5 py-0.5 bg-[#1e2433] rounded border border-slate-700 cursor-pointer"
					>
						Закрити (Esc)
					</button>
				</div>
				<div
					class="flex flex-col gap-1 text-[10px] text-slate-300 bg-[#0d1017] p-2 rounded border border-[#2d3748]"
				>
					<div class="flex justify-between">
						<span class="text-slate-400">Спавнить бійця:</span>
						<span class="font-bold text-amber-300">{placedUnit?.name || 'Спеціальна'}</span>
					</div>
					{#if placedUnit}
						<div class="flex justify-between">
							<span class="text-slate-400">Атака / Броня:</span>
							<span class="font-mono text-slate-200">
								{placedUnit.damage_base} ({placedUnit.attack_type}) / {placedUnit.armor} ({placedUnit.armor_type})
							</span>
						</div>
						<div class="flex justify-between">
							<span class="text-slate-400">Здоров'я / КД:</span>
							<span class="font-mono text-emerald-300">
								{placedUnit.hp} HP / {placedBuilding.spawnCooldown}с
							</span>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	{:else if activeEntityType === 'castle' && selectedCastle}
		<!-- Castle Command Card: Shop & Defense Items -->
		<div class="flex flex-col justify-between w-[280px] h-full py-1">
			<div class="flex items-center justify-between border-b border-[#3b3226] pb-1">
				<span class="text-[11px] font-bold text-amber-300 flex items-center gap-1">
					<Castle class="w-3.5 h-3.5 text-amber-400" />
					{selectedCastle.team === 'west' ? 'Магазин Замку' : 'Ворожа База'}
				</span>
				<button
					onclick={() => onClearSelection?.()}
					class="text-[9px] text-slate-400 hover:text-white px-1.5 py-0.5 bg-[#1e2433] rounded border border-slate-700 cursor-pointer"
				>
					Закрити (Esc)
				</button>
			</div>
			{#if selectedCastle.team === 'west'}
				<div class="grid grid-cols-4 gap-1.5">
					{#each Object.values(CASTLE_ITEMS).slice(0, 4) as item}
						{@const canAfford = playerGold >= item.cost}
						<button
							onclick={() => {
								if (sim.canBuyCastleItem('west', item.id)) {
									sim.buyCastleItem('west', item.id);
								}
							}}
							disabled={!canAfford}
							class="w-16 h-11 rounded border flex flex-col items-center justify-center p-0.5 transition cursor-pointer {canAfford
								? 'bg-[#1b263b] hover:bg-[#253959] border-amber-500/60 text-white shadow'
								: 'bg-[#12161f] border-slate-700 text-slate-500 opacity-60 cursor-not-allowed'}"
							title="{item.nameUk} ({item.cost}g) - {item.descriptionUk}"
						>
							<span class="text-xs font-bold text-slate-200 truncate max-w-[55px]">
								{item.nameUk}
							</span>
							<span class="text-[8px] text-amber-300 font-mono font-bold">🪙{item.cost}</span>
						</button>
					{/each}
				</div>
			{:else}
				<div
					class="flex flex-col gap-1 text-[10px] text-slate-300 bg-[#0d1017] p-2 rounded border border-[#2d3748]"
				>
					<div class="flex justify-between">
						<span class="text-slate-400">Гармата цитаделі:</span>
						<span class="font-mono text-amber-300 font-bold">120-150 (Облога)</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Дальність гармати:</span>
						<span class="font-mono text-slate-200">800 px</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Броня замку:</span>
						<span class="font-bold text-emerald-300">15 (Укріплена)</span>
					</div>
				</div>
			{/if}
		</div>
	{:else if activeEntityType === 'unit' && selectedUnit}
		<!-- Unit Profile Card (No worker buttons!) -->
		<div class="flex flex-col justify-between w-[280px] h-full py-1">
			<div class="flex items-center justify-between border-b border-[#3b3226] pb-1">
				<span
					class="text-[11px] font-bold {selectedUnit.team === 'west'
						? 'text-blue-300'
						: selectedUnit.team === 'neutral'
							? 'text-purple-300'
							: 'text-rose-400'} flex items-center gap-1"
				>
					<Swords class="w-3.5 h-3.5" />
					{selectedUnit.name}
				</span>
				<button
					onclick={() => onCloseUnit?.()}
					class="text-[9px] text-slate-400 hover:text-white px-1.5 py-0.5 bg-[#1e2433] rounded border border-slate-700 cursor-pointer"
				>
					Закрити (Esc)
				</button>
			</div>
			<div
				class="flex flex-col gap-1 text-[10px] text-slate-300 bg-[#0d1017] p-2 rounded border border-[#2d3748]"
			>
				<div class="flex justify-between">
					<span class="text-slate-400">Дистанція атаки:</span>
					<span class="font-mono text-amber-300 font-bold">{selectedUnit.range} px</span>
				</div>
				<div class="flex justify-between">
					<span class="text-slate-400">Швидкість атаки:</span>
					<span class="font-mono text-slate-200">{selectedUnit.attackCooldown.toFixed(1)} с</span>
				</div>
				<div class="flex justify-between">
					<span class="text-slate-400">Тип пересування:</span>
					<span class="font-bold {selectedUnit.flying ? 'text-cyan-300' : 'text-emerald-300'}">
						{selectedUnit.flying ? 'Повітряний юніт' : 'Наземний юніт'}
					</span>
				</div>
			</div>
		</div>
	{:else if activeEntityType === 'group'}
		<!-- Group Profile Card -->
		<div class="flex flex-col justify-between w-[280px] h-full py-1">
			<div class="flex items-center justify-between border-b border-[#3b3226] pb-1">
				<span class="text-[11px] font-bold text-amber-300 flex items-center gap-1">
					<Users class="w-3.5 h-3.5" />
					Загін бійців ({groupUnits.length})
				</span>
				<button
					onclick={() => onClearSelection?.()}
					class="text-[9px] text-slate-400 hover:text-white px-1.5 py-0.5 bg-[#1e2433] rounded border border-slate-700 cursor-pointer"
				>
					Закрити (Esc)
				</button>
			</div>
			<div class="text-[10px] text-slate-400 text-center p-2">
				Виділено загін бійців на полі бою. Відображаються сумарні показники здоров'я.
			</div>
		</div>
	{:else}
		<!-- 4x3 Grid of 12 Command Buttons for Worker -->
		<div class="grid grid-cols-4 gap-1.5">
			{#each availableBuildings as bld, idx}
				{@const isSelected = selectedBuildingId === bld.id}
				{@const bldLumber = bld.lumber_cost || 0}
				{@const isAffordable =
					playerGold >= (bld.gold_cost || 200) && (player.lumber ?? 0) >= bldLumber}
				{@const isLeg = isLegendaryBuilding(bld)}
				{@const lacksFood = isLeg && player.food >= player.maxFood}
				{@const hotkey = HOTKEYS[idx] || ''}

				<button
					onclick={() => onSelectBuilding(isSelected ? null : bld.id)}
					onmouseenter={() => (hoveredBuilding = bld)}
					onmouseleave={() => (hoveredBuilding = null)}
					class="relative w-16 h-10 rounded border text-left p-1 transition-all flex flex-col justify-between cursor-pointer {isSelected
						? 'bg-blue-600 border-amber-300 shadow-lg ring-2 ring-amber-400 shadow-blue-500/50'
						: lacksFood
							? 'bg-red-950/40 border-red-800/80 hover:border-red-600'
							: isAffordable
								? 'bg-[#1b2230] hover:bg-[#28354d] border-[#544738] hover:border-[#8c7456]'
								: 'bg-[#12161f] border-[#2d3748] opacity-60 cursor-not-allowed'}"
					title="{bld.name} ({bld.gold_cost}g{bldLumber > 0
						? `, ${bldLumber}w`
						: ''}) [Гаряча клавіша: {hotkey}]"
				>
					<!-- Hotkey in top-right corner -->
					<span
						class="absolute top-0.5 right-1 text-[8px] font-mono font-bold {isSelected
							? 'text-white'
							: isAffordable
								? 'text-amber-300'
								: 'text-slate-500'}"
					>
						[{hotkey}]
					</span>

					<!-- Building name -->
					<div class="flex items-center gap-1">
						{#if isLeg}
							<Crown class="w-2.5 h-2.5 text-amber-400 shrink-0" />
						{/if}
						<span
							class="text-[9px] font-bold truncate max-w-[45px] {isSelected
								? 'text-white'
								: isAffordable
									? 'text-[#fef08a]'
									: 'text-slate-400'}"
						>
							{bld.name}
						</span>
					</div>

					<!-- Cost in bottom-right -->
					<div class="flex items-center gap-0.5 self-end text-[8px] font-mono font-bold">
						<span class={playerGold >= (bld.gold_cost || 200) ? 'text-amber-300' : 'text-red-400'}>
							🪙{bld.gold_cost}
						</span>
						{#if bldLumber > 0}
							<span class={(player.lumber ?? 0) >= bldLumber ? 'text-emerald-400' : 'text-red-400'}>
								🪵{bldLumber}
							</span>
						{/if}
					</div>
				</button>
			{/each}
		</div>
	{/if}

	<!-- Floating Authentic Warcraft III Tooltip on Hover -->
	{#if hoveredBuilding}
		<div
			class="absolute bottom-full right-0 mb-3 w-72 bg-[#131722]/95 border-2 border-[#8c7456] rounded-lg p-2.5 text-xs shadow-2xl backdrop-blur pointer-events-none z-50"
			style="box-shadow: 0 10px 25px rgba(0,0,0,0.9);"
		>
			<div class="flex items-center justify-between border-b border-[#3b3226] pb-1.5 mb-1.5">
				<span class="font-bold text-[#fef08a] text-sm">{hoveredBuilding.name}</span>
				<div class="flex items-center gap-2 font-mono font-bold">
					<span class="text-amber-300 flex items-center gap-1">
						<Coins class="w-3.5 h-3.5" />
						{hoveredBuilding.gold_cost}g
					</span>
					{#if hoveredBuilding.lumber_cost}
						<span class="text-emerald-400 flex items-center gap-1">
							🪵 {hoveredBuilding.lumber_cost}
						</span>
					{/if}
				</div>
			</div>

			{#if hoveredUnit}
				<div class="space-y-1 text-[11px] text-slate-300">
					<div class="flex justify-between">
						<span class="text-slate-400">Боєць:</span>
						<strong class="text-white">{hoveredUnit.name}</strong>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Атака:</span>
						<span class="text-amber-200">
							{hoveredUnit.damage_base ?? 15} ({hoveredUnit.attack_type})
						</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Броня:</span>
						<span class="text-emerald-300">
							{hoveredUnit.armor} ({hoveredUnit.armor_type})
						</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">HP:</span>
						<span class="text-green-400 font-mono">{hoveredUnit.hp}</span>
					</div>
				</div>
			{/if}

			{#if isLegendaryBuilding(hoveredBuilding)}
				<div
					class="mt-2 text-[10px] text-amber-300 bg-amber-950/40 p-1 rounded border border-amber-500/30"
				>
					👑 Легендарна споруда. Потребує їжу ({player.food}/{player.maxFood}).
				</div>
			{/if}
		</div>
	{/if}
</div>
