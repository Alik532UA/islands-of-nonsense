<script lang="ts">
	import type { Simulation } from '../engine/simulation';
	import type { BuildingDefinition } from '../engine/types';
	import {
		getBaseBuildingsForRace,
		getUpgradesForBuilding,
		getUnit,
		isLegendaryBuilding,
		RACES_LIST
	} from '../engine/gameData';
	import { Coins, ArrowUpCircle, Trash2, X, Crown } from 'lucide-svelte';

	let {
		sim,
		uiTick = 0,
		selectedBuildingId = $bindable(null),
		selectedPlacedBuildingId = $bindable(null),
		onSelectBuilding,
		onUpgradeBuilding,
		onSellBuilding
	}: {
		sim: Simulation;
		uiTick?: number;
		selectedBuildingId: string | null;
		selectedPlacedBuildingId: string | null;
		onSelectBuilding: (id: string | null) => void;
		onUpgradeBuilding?: (instanceId: string, targetDefId: string) => void;
		onSellBuilding?: (instanceId: string) => void;
	} = $props();

	let player = $derived(uiTick >= 0 ? sim.players.west : sim.players.west);
	let playerGold = $derived(uiTick >= 0 ? sim.players.west.gold : 0);
	let availableBuildings = $derived(uiTick >= 0 ? getBaseBuildingsForRace(player.race) : []);

	let placedBuilding = $derived(
		selectedPlacedBuildingId
			? sim.buildings.find((b) => b.instanceId === selectedPlacedBuildingId && b.team === 'west') ||
					null
			: null
	);
	let placedUnit = $derived(placedBuilding ? getUnit(placedBuilding.spawnUnitId) : null);
	let availableUpgrades = $derived(
		placedBuilding ? getUpgradesForBuilding(placedBuilding.defId) : []
	);

	let hoveredBuilding = $state<BuildingDefinition | null>(null);
	let hoveredUnit = $derived(hoveredBuilding ? getUnit(hoveredBuilding.unit) : null);

	const HOTKEYS = ['Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F', 'Z', 'X', 'C', 'V'];

	function handleKeydown(e: KeyboardEvent) {
		const key = e.key.toUpperCase();

		// If a placed building is selected and user presses 1..9, trigger upgrade
		if (placedBuilding && availableUpgrades.length > 0) {
			const num = parseInt(key, 10);
			if (num >= 1 && num <= availableUpgrades.length) {
				const up = availableUpgrades[num - 1];
				onUpgradeBuilding?.(placedBuilding.instanceId, up.id);
				return;
			}
		}

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
					sim.setPlayerRace('west', (e.target as HTMLSelectElement).value);
					onSelectBuilding(null);
				}}
				class="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-500 cursor-pointer"
			>
				{#each RACES_LIST as r}
					<option value={r.race}>{r.race}</option>
				{/each}
			</select>

			<button
				onclick={() => {
					sim.setPlayerRace('west', 'random');
					onSelectBuilding(null);
				}}
				title="Випадкова раса: +30% золота на старті"
				class="px-2 py-1 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition flex items-center gap-1 shadow cursor-pointer {player.isRandomRace
					? 'ring-1 ring-amber-400'
					: ''}"
			>
				🎲 +30%g
			</button>
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

	<!-- Center: 4x3 Grid of Buildings OR Upgrade / Inspector Panel -->
	{#if placedBuilding}
		<div
			class="flex items-center gap-4 flex-1 justify-center max-w-2xl px-5 py-2 bg-slate-950/90 border border-amber-500/50 rounded-xl shadow-xl shadow-amber-500/10"
		>
			<!-- Placed Building Info -->
			<div class="flex flex-col min-w-[170px]">
				<div class="flex items-center gap-2">
					<span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
					<span class="text-xs font-bold text-amber-300 truncate max-w-[140px]">
						{placedBuilding.name}
					</span>
				</div>
				<span class="text-[11px] text-slate-300 mt-0.5">
					Спавнить: <strong class="text-white font-semibold">{placedUnit?.name || 'Боєць'}</strong>
				</span>
				<span class="text-[10px] text-slate-400 font-mono">
					Спавн: {placedBuilding.spawnCooldown}с (залишилось {placedBuilding.spawnTimer.toFixed(
						1
					)}с)
				</span>
			</div>

			<div class="h-10 w-[1px] bg-slate-800"></div>

			<!-- Upgrade options -->
			<div class="flex items-center gap-2 flex-wrap">
				{#if availableUpgrades.length > 0}
					{#each availableUpgrades as up, uIdx}
						{@const upUnit = getUnit(up.unit)}
						{@const upCost =
							up.upgrade_extra_cost > 0
								? up.upgrade_extra_cost
								: Math.max(50, (up.gold_cost || 200) - placedBuilding.goldCost)}
						{@const canAfford = playerGold >= upCost}
						<button
							onclick={() => onUpgradeBuilding?.(placedBuilding.instanceId, up.id)}
							disabled={!canAfford}
							class="px-3 py-1.5 rounded-lg border text-left flex flex-col justify-between transition {canAfford
								? 'bg-blue-600/90 hover:bg-blue-500 border-blue-400 text-white cursor-pointer shadow-md shadow-blue-500/20'
								: 'bg-slate-800/60 border-slate-700/60 text-slate-400 opacity-60 cursor-not-allowed'}"
						>
							<div class="flex items-center justify-between gap-2">
								<span class="text-xs font-bold truncate max-w-[110px] flex items-center gap-1">
									<ArrowUpCircle class="w-3.5 h-3.5 text-blue-300" />
									{up.name}
								</span>
								<span class="text-xs font-bold font-mono text-amber-300 flex items-center gap-0.5">
									<Coins class="w-3 h-3 text-amber-300" />
									{upCost}
								</span>
							</div>
							<span class="text-[10px] text-blue-200 truncate max-w-[130px]">
								{upUnit?.name || 'Боєць'} [клавіша {uIdx + 1}]
							</span>
						</button>
					{/each}
				{:else}
					<span class="text-xs text-slate-400 italic py-1 px-2">
						Максимальний рівень покращення
					</span>
				{/if}
			</div>

			<!-- Actions: Sell and Close -->
			<div class="flex items-center gap-1.5 ml-auto">
				<button
					onclick={() => onSellBuilding?.(placedBuilding.instanceId)}
					class="px-2.5 py-1.5 rounded-lg border border-red-500/40 bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-semibold cursor-pointer transition flex items-center gap-1"
					title="Знести споруду та повернути 50% золота"
				>
					<Trash2 class="w-3 h-3 text-red-400" />
					+{Math.floor(placedBuilding.goldCost * 0.5)}g
				</button>
				<button
					onclick={() => (selectedPlacedBuildingId = null)}
					class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition"
					title="Закрити вибір (Esc)"
				>
					<X class="w-3.5 h-3.5" />
				</button>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-4 gap-2">
			{#each availableBuildings as bld, idx}
				{@const isSelected = selectedBuildingId === bld.id}
				{@const isAffordable = playerGold >= (bld.gold_cost || 200)}
				{@const unit = getUnit(bld.unit)}
				{@const isLeg = isLegendaryBuilding(bld)}
				{@const lacksFood = isLeg && player.food >= player.maxFood}

				<button
					onclick={() => onSelectBuilding(isSelected ? null : bld.id)}
					onmouseenter={() => (hoveredBuilding = bld)}
					onmouseleave={() => (hoveredBuilding = null)}
					class="relative w-28 h-14 rounded-lg border text-left p-1.5 transition-all flex flex-col justify-between cursor-pointer {isSelected
						? 'bg-blue-900/80 border-blue-400 shadow-lg shadow-blue-500/20 ring-2 ring-blue-400'
						: lacksFood
							? 'bg-red-950/40 border-red-800/80 hover:border-red-600'
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
					<div class="text-[11px] font-bold text-slate-100 truncate pr-4 flex items-center gap-1">
						{#if isLeg}
							<Crown class="w-3 h-3 text-amber-400 flex-shrink-0" />
						{/if}
						<span class="truncate">{bld.name}</span>
					</div>

					<!-- Unit & Cost -->
					<div class="flex items-center justify-between text-[11px]">
						<span class="text-slate-400 text-[10px] truncate max-w-[55px]">
							{#if bld.specialType === 'treasure'}
								Дохід +20%
							{:else if bld.specialType === 'repair'}
								Ремонт
							{:else if bld.specialType === 'recycler'}
								Утилізація
							{:else if bld.specialType === 'tower'}
								Вежа
							{:else}
								{unit?.name || 'Боєць'}
							{/if}
						</span>
						<span class="font-bold font-mono text-amber-400 flex items-center gap-0.5">
							<Coins class="w-3 h-3 text-amber-400" />
							{bld.gold_cost}
						</span>
					</div>
				</button>
			{/each}
		</div>
	{/if}

	<!-- Right: Hover Inspector / Tooltip Card -->
	<div
		class="w-72 min-h-[90px] bg-slate-950/90 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 flex flex-col justify-between"
	>
		{#if placedBuilding && placedBuilding.specialType}
			<div>
				<div class="flex justify-between items-center mb-1">
					<span class="font-bold text-sm text-amber-300">{placedBuilding.name}</span>
					<span class="text-[11px] font-mono text-amber-400 font-bold">
						{placedBuilding.goldCost} зол.
					</span>
				</div>
				<p class="text-xs text-slate-300 leading-relaxed mb-2">
					{#if placedBuilding.specialType === 'treasure'}
						💰 <strong class="text-amber-300">Скриня скарбів</strong>: збільшує кожен вихідний дохід
						вашої команди на <span class="text-emerald-400 font-bold">+20%</span>.
					{:else if placedBuilding.specialType === 'repair'}
						🛠️ <strong class="text-emerald-300">Ремонтний пункт</strong>: постійно відновлює
						<span class="text-emerald-400 font-bold">+25 HP</span> замку щосекунди.
					{:else if placedBuilding.specialType === 'recycler'}
						⚙️ <strong class="text-slate-300">Утилізатор</strong>: сплачує
						<span class="text-amber-300 font-bold">+4 золота</span> брухту за кожного загиблого бійця
						вашої армії.
					{:else if placedBuilding.specialType === 'tower'}
						🏹 <strong class="text-purple-300">Оборонна вежа</strong>: веде обстріл ворогів типом
						<span class="text-amber-300 font-bold">{placedBuilding.attackType || 'pierce'}</span>
						(шкода: {placedBuilding.damageMin || 50}, дальність: {placedBuilding.attackRange ||
							500}, шв: {placedBuilding.attackCooldown || 1.0}с).
					{/if}
				</p>
			</div>
		{:else if placedBuilding && placedUnit}
			<div>
				<div class="flex justify-between items-center mb-1">
					<span class="font-bold text-sm text-amber-300">{placedBuilding.name}</span>
					<span class="text-[11px] font-mono text-amber-400 font-bold">
						{placedBuilding.goldCost} зол.
					</span>
				</div>
				<div class="text-[11px] text-slate-400 mb-1.5">
					Боєць: <span class="text-white font-semibold">{placedUnit.name}</span>
					{#if placedUnit.flying}
						<span
							class="bg-cyan-950 text-cyan-300 border border-cyan-800 px-1 py-0.2 text-[9px] rounded ml-1 font-bold"
						>
							ЛІТАЮЧИЙ
						</span>
					{/if}
				</div>

				<div class="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-slate-300">
					<div>❤️ HP: <span class="font-bold text-white">{placedUnit.hp}</span></div>
					<div>
						🛡️ Броня: <span class="font-bold text-white">
							{placedUnit.armor} ({placedUnit.armor_type})
						</span>
					</div>
					<div>⚔️ Атака: <span class="font-bold text-white">{placedUnit.attack_type}</span></div>
					<div>
						🏹 Дальність: <span class="font-bold text-white">
							{placedUnit.range && placedUnit.range > 120 ? placedUnit.range : 'Ближній'}
						</span>
					</div>
				</div>
			</div>
		{:else if hoveredBuilding && hoveredBuilding.specialType}
			<div>
				<div class="flex justify-between items-center mb-1">
					<span class="font-bold text-sm text-amber-300">{hoveredBuilding.name}</span>
					<span class="text-[11px] font-mono text-amber-400 font-bold">
						{hoveredBuilding.gold_cost} зол.
					</span>
				</div>
				<p class="text-xs text-slate-300 leading-relaxed mb-2">
					{#if hoveredBuilding.specialType === 'treasure'}
						💰 <strong class="text-amber-300">Скриня скарбів</strong>: збільшує кожен вихідний дохід
						вашої команди на <span class="text-emerald-400 font-bold">+20%</span>.
					{:else if hoveredBuilding.specialType === 'repair'}
						🛠️ <strong class="text-emerald-300">Ремонтний пункт</strong>: постійно відновлює
						<span class="text-emerald-400 font-bold">+25 HP</span> замку щосекунди.
					{:else if hoveredBuilding.specialType === 'recycler'}
						⚙️ <strong class="text-slate-300">Утилізатор</strong>: сплачує
						<span class="text-amber-300 font-bold">+4 золота</span> брухту за кожного загиблого бійця
						вашої армії.
					{:else if hoveredBuilding.specialType === 'tower'}
						🏹 <strong class="text-purple-300">Оборонна вежа</strong>: веде обстріл ворогів типом
						<span class="text-amber-300 font-bold">{hoveredBuilding.attack_type || 'pierce'}</span>
						(шкода: {hoveredBuilding.damage_base || 50}, дальність: {hoveredBuilding.range || 500},
						шв: {hoveredBuilding.cooldown || 1.0}с).
					{/if}
				</p>
			</div>
		{:else if hoveredBuilding && hoveredUnit}
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
					Клікніть на будівлю на базі для її покращення або виберіть нову будівлю зі списку
				</span>
			</div>
		{/if}
	</div>
</div>
