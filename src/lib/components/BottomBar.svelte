<script lang="ts">
	import type { Simulation } from '../engine/simulation';
	import type { BuildingDefinition } from '../engine/types';
	import { getBaseBuildingsForRace, getUnit, RACES_LIST } from '../engine/gameData';
	import { Coins } from 'lucide-svelte';

	let {
		sim,
		uiTick = 0,
		selectedBuildingId = $bindable(null),
		onSelectBuilding
	}: {
		sim: Simulation;
		uiTick?: number;
		selectedBuildingId: string | null;
		onSelectBuilding: (id: string | null) => void;
	} = $props();

	let player = $derived(uiTick >= 0 ? sim.players.west : sim.players.west);
	let playerGold = $derived(uiTick >= 0 ? sim.players.west.gold : 0);
	let availableBuildings = $derived(uiTick >= 0 ? getBaseBuildingsForRace(player.race) : []);

	let hoveredBuilding = $state<BuildingDefinition | null>(null);
	let hoveredUnit = $derived(hoveredBuilding ? getUnit(hoveredBuilding.unit) : null);

	const HOTKEYS = ['Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F', 'Z', 'X', 'C', 'V'];

	function handleKeydown(e: KeyboardEvent) {
		const key = e.key.toUpperCase();
		const idx = HOTKEYS.indexOf(key);
		if (idx !== -1 && idx < availableBuildings.length) {
			const bld = availableBuildings[idx];
			onSelectBuilding(selectedBuildingId === bld.id ? null : bld.id);
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="relative bg-slate-900/95 border-t border-slate-700/80 px-6 py-3 shadow-2xl flex items-center justify-between text-white select-none backdrop-blur z-20"
>
	<!-- Left: Race Selector & Lane Preference -->
	<div class="flex flex-col gap-2 min-w-[200px]">
		<!-- Race Select -->
		<div class="flex items-center gap-2">
			<span class="text-xs font-semibold text-slate-400">Раса:</span>
			<select
				value={player.race}
				onchange={(e) => {
					player.race = (e.target as HTMLSelectElement).value;
					sim.notifyStateChanged();
					onSelectBuilding(null);
				}}
				class="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-500 cursor-pointer"
			>
				{#each RACES_LIST as r}
					<option value={r.race}>{r.race}</option>
				{/each}
			</select>
		</div>

		<!-- Lane Selector -->
		<div class="flex items-center gap-1.5 text-xs">
			<span class="text-slate-400 text-[11px]">Лінія:</span>
			<button
				onclick={() => {
					player.preferredLane = 'auto';
					sim.notifyStateChanged();
				}}
				class="px-2 py-0.5 rounded text-[11px] font-bold transition {player.preferredLane === 'auto'
					? 'bg-blue-600 text-white'
					: 'bg-slate-800 text-slate-400 hover:bg-slate-700'}"
			>
				Авто
			</button>
			<button
				onclick={() => {
					player.preferredLane = 'top';
					sim.notifyStateChanged();
				}}
				class="px-2 py-0.5 rounded text-[11px] font-bold transition {player.preferredLane === 'top'
					? 'bg-blue-600 text-white'
					: 'bg-slate-800 text-slate-400 hover:bg-slate-700'}"
			>
				Верх
			</button>
			<button
				onclick={() => {
					player.preferredLane = 'bottom';
					sim.notifyStateChanged();
				}}
				class="px-2 py-0.5 rounded text-[11px] font-bold transition {player.preferredLane ===
				'bottom'
					? 'bg-blue-600 text-white'
					: 'bg-slate-800 text-slate-400 hover:bg-slate-700'}"
			>
				Низ
			</button>
		</div>
	</div>

	<!-- Center: 4x3 Grid of Buildings -->
	<div class="grid grid-cols-4 gap-2">
		{#each availableBuildings as bld, idx}
			{@const isSelected = selectedBuildingId === bld.id}
			{@const isAffordable = playerGold >= (bld.gold_cost || 200)}
			{@const unit = getUnit(bld.unit)}

			<button
				onclick={() => onSelectBuilding(isSelected ? null : bld.id)}
				onmouseenter={() => (hoveredBuilding = bld)}
				onmouseleave={() => (hoveredBuilding = null)}
				class="relative w-28 h-14 rounded-lg border text-left p-1.5 transition-all flex flex-col justify-between cursor-pointer {isSelected
					? 'bg-blue-900/80 border-blue-400 shadow-lg shadow-blue-500/20 ring-2 ring-blue-400'
					: isAffordable
						? 'bg-slate-800/90 hover:bg-slate-750 border-slate-600/80 hover:border-slate-500'
						: 'bg-slate-900/60 border-slate-800/80 opacity-60'}"
			>
				<!-- Hotkey badge -->
				<span
					class="absolute top-1 right-1 bg-slate-950/80 border border-slate-700 text-[10px] font-mono font-bold px-1 rounded text-amber-300"
				>
					{HOTKEYS[idx] || ''}
				</span>

				<!-- Building Name -->
				<div class="text-[11px] font-bold text-slate-100 truncate pr-4">
					{bld.name}
				</div>

				<!-- Unit & Cost -->
				<div class="flex items-center justify-between text-[11px]">
					<span class="text-slate-400 text-[10px] truncate max-w-[55px]">
						{unit?.name || 'Боєць'}
					</span>
					<span class="font-bold font-mono text-amber-400 flex items-center gap-0.5">
						<Coins class="w-3 h-3 text-amber-400" />
						{bld.gold_cost}
					</span>
				</div>
			</button>
		{/each}
	</div>

	<!-- Right: Hover Inspector / Tooltip Card -->
	<div
		class="w-72 min-h-[90px] bg-slate-950/90 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 flex flex-col justify-between"
	>
		{#if hoveredBuilding && hoveredUnit}
			<div>
				<div class="flex justify-between items-center mb-1">
					<span class="font-bold text-sm text-amber-300">{hoveredBuilding.name}</span>
					<span class="text-[11px] font-mono text-amber-400 font-bold">
						{hoveredBuilding.gold_cost} зол.
					</span>
				</div>
				<div class="text-[11px] text-slate-400 mb-1.5">
					Тренує: <span class="text-white font-semibold">{hoveredUnit.name}</span>
					{#if hoveredUnit.flying}
						<span
							class="bg-cyan-950 text-cyan-300 border border-cyan-800 px-1 py-0.2 text-[9px] rounded ml-1 font-bold"
						>
							ЛІТАЮЧИЙ
						</span>
					{/if}
				</div>

				<div class="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-slate-300">
					<div>❤️ HP: <span class="font-bold text-white">{hoveredUnit.hp}</span></div>
					<div>
						🛡️ Броня: <span class="font-bold text-white">
							{hoveredUnit.armor} ({hoveredUnit.armor_type})
						</span>
					</div>
					<div>⚔️ Атака: <span class="font-bold text-white">{hoveredUnit.attack_type}</span></div>
					<div>
						🏹 Дальність: <span class="font-bold text-white">
							{hoveredUnit.range && hoveredUnit.range > 120 ? hoveredUnit.range : 'Ближній'}
						</span>
					</div>
				</div>
			</div>
		{:else if selectedBuildingId}
			{@const selBld = availableBuildings.find((b) => b.id === selectedBuildingId)}
			<div class="flex flex-col items-center justify-center h-full text-center py-2">
				<span class="text-emerald-400 font-bold text-xs">Обрано для побудови:</span>
				<span class="text-white font-semibold text-sm">{selBld?.name}</span>
				<span class="text-slate-400 text-[10px] mt-1">Клікніть на вільну клітинку вашої бази!</span>
			</div>
		{:else}
			<div
				class="flex flex-col items-center justify-center h-full text-center text-slate-500 text-[11px]"
			>
				<span>
					Наведіть на будівлю для перегляду характеристик або натисніть клавішу для вибору
				</span>
			</div>
		{/if}
	</div>
</div>
