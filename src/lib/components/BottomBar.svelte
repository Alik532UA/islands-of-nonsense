<script lang="ts">
	import type { Simulation } from '../engine/simulation';
	import type { BuildingDefinition } from '../engine/types';
	import {
		getBaseBuildingsForRace,
		getUpgradesForBuilding,
		getUnit,
		isLegendaryBuilding
	} from '../engine/gameData';
	import {
		Coins,
		Trash2,
		X,
		Crown,
		Shield,
		Swords,
		Footprints,
		Hammer,
		Layers
	} from 'lucide-svelte';
	import Minimap from './Minimap.svelte';

	let {
		sim,
		uiTick = 0,
		selectedBuildingId = $bindable(null),
		selectedPlacedBuildingId = $bindable(null),
		selectedUnitId = $bindable(null),
		onSelectBuilding,
		onUpgradeBuilding,
		onSellBuilding,
		onMinimapClick
	}: {
		sim: Simulation;
		uiTick?: number;
		selectedBuildingId: string | null;
		selectedPlacedBuildingId: string | null;
		selectedUnitId?: string | null;
		onSelectBuilding: (id: string | null) => void;
		onUpgradeBuilding?: (instanceId: string, targetDefId: string) => void;
		onSellBuilding?: (instanceId: string) => void;
		onMinimapClick?: (arenaX: number, arenaY: number) => void;
	} = $props();

	let player = $derived(uiTick >= 0 ? sim.players.west : sim.players.west);
	let playerGold = $derived(uiTick >= 0 ? sim.players.west.gold : 0);
	let worker = $derived(uiTick >= 0 ? sim.players.west.worker : sim.players.west.worker);
	let availableBuildings = $derived(uiTick >= 0 ? getBaseBuildingsForRace(player.race) : []);

	// Placed building state
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

	// Unit state
	let selectedUnit = $derived(
		selectedUnitId
			? sim.units.find((u) => u.instanceId === selectedUnitId && u.state !== 'DEAD') || null
			: null
	);

	// Determine active entity: Building > Unit > Worker (default)
	let activeEntityType = $derived<'building' | 'unit' | 'worker'>(
		placedBuilding ? 'building' : selectedUnit ? 'unit' : 'worker'
	);

	let hoveredBuilding = $state<BuildingDefinition | null>(null);
	let hoveredUnit = $derived(hoveredBuilding ? getUnit(hoveredBuilding.unit) : null);

	const HOTKEYS = ['Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F', 'Z', 'X', 'C', 'V'];

	function handleKeydown(e: KeyboardEvent) {
		const key = e.key.toUpperCase();

		// Upgrades 1..9 for selected placed building
		if (placedBuilding && availableUpgrades.length > 0) {
			const num = parseInt(key, 10);
			if (num >= 1 && num <= availableUpgrades.length) {
				const up = availableUpgrades[num - 1];
				onUpgradeBuilding?.(placedBuilding.instanceId, up.id);
				return;
			}
		}

		// Hotkeys Q..V for command card in worker mode
		const idx = HOTKEYS.indexOf(key);
		if (idx !== -1 && idx < availableBuildings.length && !placedBuilding) {
			const bld = availableBuildings[idx];
			onSelectBuilding(selectedBuildingId === bld.id ? null : bld.id);
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Authentic Warcraft III Bottom Stone Console -->
<div
	class="relative w-full bg-[#11141c] border-t-2 border-[#544738] px-3 py-2 shadow-2xl flex items-center justify-between text-white select-none backdrop-blur z-20 h-44 overflow-visible"
	style="background: linear-gradient(180deg, #181d28 0%, #0d1017 100%); box-shadow: 0 -8px 24px rgba(0,0,0,0.85);"
>
	<!-- 1. LEFT: Interactive Real-time Minimap with authentic WC3 buttons -->
	<div class="flex items-center shrink-0">
		<Minimap {sim} {uiTick} {onMinimapClick} />
	</div>

	<!-- 2. CENTER-LEFT: Entity Portrait & Health / Mana Vital Bars -->
	<div
		class="flex flex-col items-center justify-center px-3 py-1 bg-[#131722] rounded-lg border-2 border-[#544738] shadow-inner shrink-0 w-36 h-[142px]"
		style="box-shadow: inset 0 0 10px rgba(0,0,0,0.8);"
	>
		<!-- Stone Arch Portrait Frame -->
		<div
			class="relative w-20 h-20 rounded-md border-2 border-[#8c7456] bg-[#0c1017] flex items-center justify-center overflow-hidden shadow-md"
		>
			{#if activeEntityType === 'building' && placedBuilding}
				<!-- Building Icon Portrait -->
				<div class="flex flex-col items-center justify-center text-amber-300">
					<Hammer class="w-9 h-9 text-amber-400" />
					<span class="text-[9px] font-bold uppercase truncate max-w-[70px]">
						{placedBuilding.race}
					</span>
				</div>
			{:else if activeEntityType === 'unit' && selectedUnit}
				<!-- Soldier / Combatant Portrait -->
				<div class="flex flex-col items-center justify-center text-blue-300">
					<Swords class="w-9 h-9 text-blue-400" />
					<span class="text-[9px] font-bold uppercase truncate max-w-[70px]">
						{selectedUnit.attackType}
					</span>
				</div>
			{:else}
				<!-- Worker ("Північний будівельник") Portrait -->
				<div class="relative flex flex-col items-center justify-center">
					<!-- Peasant head graphic -->
					<div
						class="w-11 h-11 rounded-full bg-[#fcd34d] border-2 border-[#b45309] relative flex items-center justify-center overflow-hidden shadow-inner"
					>
						<!-- Headband / Hair -->
						<div class="absolute top-0 left-0 right-0 h-4 bg-[#78350f]"></div>
						<!-- Face eyes -->
						<div class="flex gap-2.5 mt-2">
							<div class="w-1.5 h-1.5 rounded-full bg-[#1e293b]"></div>
							<div class="w-1.5 h-1.5 rounded-full bg-[#1e293b]"></div>
						</div>
					</div>
					<!-- Blue tunic collar -->
					<div class="w-14 h-4 bg-[#2563eb] border border-[#60a5fa] rounded-t-md mt-0.5"></div>
				</div>
			{/if}

			<!-- Level 1 Badge in corner -->
			<div
				class="absolute bottom-0 right-0 bg-[#2a241b] border-t border-l border-[#8c7456] px-1 text-[8px] text-[#fef08a] font-mono font-bold"
			>
				1
			</div>
		</div>

		<!-- Vital Bars -->
		<div class="w-full mt-2 flex flex-col gap-1">
			<!-- Green Health Bar -->
			<div
				class="relative w-full h-4 bg-[#0c1017] rounded border border-[#3b3226] overflow-hidden flex items-center justify-center shadow-inner"
			>
				{#if activeEntityType === 'building' && placedBuilding}
					{@const bHp = placedBuilding.hp ?? placedBuilding.goldCost * 4}
					{@const bMaxHp = placedBuilding.maxHp ?? placedBuilding.goldCost * 4}
					{@const bPct = Math.max(0, Math.min(100, (bHp / bMaxHp) * 100))}
					<div
						class="absolute left-0 top-0 bottom-0 bg-[#22c55e] transition-all"
						style="width: {bPct}%"
					></div>
					<span class="relative z-10 text-[9px] font-mono font-bold text-white drop-shadow">
						{Math.ceil(bHp)} / {bMaxHp}
					</span>
				{:else if activeEntityType === 'unit' && selectedUnit}
					{@const hpPct = Math.max(0, Math.min(100, (selectedUnit.hp / selectedUnit.maxHp) * 100))}
					<div
						class="absolute left-0 top-0 bottom-0 bg-[#22c55e] transition-all"
						style="width: {hpPct}%"
					></div>
					<span class="relative z-10 text-[9px] font-mono font-bold text-white drop-shadow">
						{Math.ceil(selectedUnit.hp)} / {selectedUnit.maxHp}
					</span>
				{:else}
					{@const wHp = worker?.hp ?? 220}
					{@const wMaxHp = worker?.maxHp ?? 220}
					{@const wPct = Math.max(0, Math.min(100, (wHp / wMaxHp) * 100))}
					<div
						class="absolute left-0 top-0 bottom-0 bg-[#22c55e] transition-all"
						style="width: {wPct}%"
					></div>
					<span class="relative z-10 text-[9px] font-mono font-bold text-white drop-shadow">
						{Math.ceil(wHp)} / {wMaxHp}
					</span>
				{/if}
			</div>

			<!-- Mana Bar (Blue) - Render only if entity has mana -->
			{#if activeEntityType === 'unit' && selectedUnit && selectedUnit.maxMana && selectedUnit.maxMana > 0}
				{@const manaPct = Math.max(
					0,
					Math.min(100, ((selectedUnit.mana || 0) / selectedUnit.maxMana) * 100)
				)}
				<div
					class="relative w-full h-2.5 bg-[#0c1017] rounded border border-[#3b3226] overflow-hidden flex items-center justify-center shadow-inner"
				>
					<div
						class="absolute left-0 top-0 bottom-0 bg-[#3b82f6] transition-all"
						style="width: {manaPct}%"
					></div>
					<span class="relative z-10 text-[7px] font-mono font-bold text-white drop-shadow">
						{Math.floor(selectedUnit.mana || 0)} / {selectedUnit.maxMana}
					</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- 3. CENTER: Entity Stats & Characteristics Panel -->
	<div
		class="flex-1 flex flex-col justify-between px-4 py-2 mx-2 bg-[#131722] rounded-lg border-2 border-[#544738] shadow-inner h-[142px] overflow-hidden"
		style="box-shadow: inset 0 0 10px rgba(0,0,0,0.8);"
	>
		<!-- Header: Entity Name -->
		<div class="flex items-center justify-between border-b border-[#3b3226] pb-1">
			<div class="flex items-center gap-2">
				<span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
				<span class="text-sm font-bold text-[#fef08a] truncate max-w-[220px]">
					{#if activeEntityType === 'building' && placedBuilding}
						{placedBuilding.name}
					{:else if activeEntityType === 'unit' && selectedUnit}
						{selectedUnit.name}
					{:else}
						{worker?.name || 'Північний будівельник'}
					{/if}
				</span>
			</div>

			{#if activeEntityType === 'worker'}
				<div
					class="flex items-center gap-1.5 bg-[#0c1017] px-2.5 py-0.5 rounded border border-[#78654c]/60"
				>
					<span class="text-[11px] text-[#9ca3af]">Раса:</span>
					<span class="text-xs font-bold text-amber-300">{player.race}</span>
				</div>
			{/if}
		</div>

		<!-- Attributes Rows -->
		<div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs py-1">
			<!-- Defense Row -->
			<div class="flex items-center gap-1.5 text-slate-300">
				<Shield class="w-3.5 h-3.5 text-blue-400 shrink-0" />
				<span class="text-[#9ca3af]">Захист:</span>
				<span class="font-bold text-emerald-300">
					{#if activeEntityType === 'worker'}
						Неуразливий
					{:else if activeEntityType === 'building'}
						Укріплена (5)
					{:else if selectedUnit}
						{selectedUnit.armorType} ({selectedUnit.armor})
					{/if}
				</span>
			</div>

			<!-- Attack Row -->
			<div class="flex items-center gap-1.5 text-slate-300">
				<Swords class="w-3.5 h-3.5 text-rose-400 shrink-0" />
				<span class="text-[#9ca3af]">Атака:</span>
				<span class="font-bold text-amber-200">
					{#if activeEntityType === 'worker'}
						Немає
					{:else if activeEntityType === 'building'}
						{#if placedBuilding?.specialType === 'tower'}
							{placedBuilding.damageMin}-{placedBuilding.damageMax} (Колюча)
						{:else}
							Немає
						{/if}
					{:else if selectedUnit}
						{selectedUnit.damageMin}-{selectedUnit.damageMax} ({selectedUnit.attackType})
					{/if}
				</span>
			</div>

			<!-- Movement / Range Row -->
			<div class="flex items-center gap-1.5 text-slate-300">
				<Footprints class="w-3.5 h-3.5 text-amber-400 shrink-0" />
				<span class="text-[#9ca3af]">Швидкість:</span>
				<span class="font-mono text-slate-200">
					{activeEntityType === 'worker' ? '260' : (selectedUnit?.speed ?? 'Нерухомо')}
				</span>
			</div>

			<!-- Secondary Ability / Spawn Status -->
			<div class="flex items-center gap-1.5 text-slate-300">
				<Layers class="w-3.5 h-3.5 text-purple-400 shrink-0" />
				<span class="text-[#9ca3af]">Статус:</span>
				<span class="text-[11px] text-purple-200 truncate max-w-[130px]">
					{#if activeEntityType === 'building'}
						{placedUnit ? `Спавнить ${placedUnit.name}` : 'Спеціальна'}
					{:else if activeEntityType === 'unit'}
						{selectedUnit?.flying ? 'Літаючий' : 'Наземний'}
					{:else}
						Готовий до праці
					{/if}
				</span>
			</div>
		</div>

		<!-- Footer Info: Lane Preference for Worker OR Progress bar for Building -->
		<div class="border-t border-[#3b3226] pt-1 flex items-center justify-between text-[11px]">
			{#if activeEntityType === 'worker'}
				<div class="flex items-center gap-1 text-[#9ca3af]">
					<span>Лінія атаки:</span>
					<button
						onclick={() => {
							player.preferredLane = 'auto';
							sim.notifyStateChanged();
						}}
						class="px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer {player.preferredLane ===
						'auto'
							? 'bg-blue-600 text-white'
							: 'bg-[#2a241b] text-slate-400 hover:bg-[#3d3427]'}"
					>
						Авто
					</button>
					<button
						onclick={() => {
							player.preferredLane = 'top';
							sim.notifyStateChanged();
						}}
						class="px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer {player.preferredLane ===
						'top'
							? 'bg-blue-600 text-white'
							: 'bg-[#2a241b] text-slate-400 hover:bg-[#3d3427]'}"
					>
						Верх
					</button>
					<button
						onclick={() => {
							player.preferredLane = 'bottom';
							sim.notifyStateChanged();
						}}
						class="px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer {player.preferredLane ===
						'bottom'
							? 'bg-blue-600 text-white'
							: 'bg-[#2a241b] text-slate-400 hover:bg-[#3d3427]'}"
					>
						Низ
					</button>
				</div>
				<span class="text-[10px] text-[#86efac] font-mono">Виділено: Робітник</span>
			{:else if activeEntityType === 'building' && placedBuilding}
				<div class="flex items-center gap-2 w-full justify-between">
					<span class="text-[#9ca3af] text-[10px]">
						КД: {placedBuilding.spawnCooldown}с (залишилось {placedBuilding.spawnTimer.toFixed(1)}с)
					</span>
					<div class="w-32 h-2 bg-[#0c1017] rounded-full overflow-hidden border border-[#3b3226]">
						<div
							class="h-full bg-cyan-400 transition-all"
							style="width: {Math.max(
								0,
								Math.min(100, (1 - placedBuilding.spawnTimer / placedBuilding.spawnCooldown) * 100)
							)}%"
						></div>
					</div>
					<button
						onclick={() => (selectedPlacedBuildingId = null)}
						class="px-1.5 py-0.5 bg-[#2a241b] hover:bg-[#3d3427] border border-[#78654c] rounded text-[9px] text-[#fef08a] cursor-pointer"
					>
						Закрити (Esc)
					</button>
				</div>
			{:else}
				<span class="text-[#9ca3af] text-[10px]">Боєць на полі бою</span>
				<button
					onclick={() => (selectedUnitId = null)}
					class="px-1.5 py-0.5 bg-[#2a241b] hover:bg-[#3d3427] border border-[#78654c] rounded text-[9px] text-[#fef08a] cursor-pointer"
				>
					Закрити (Esc)
				</button>
			{/if}
		</div>
	</div>

	<!-- 4. CENTER-RIGHT: Authentic Warcraft III 6-Slot Inventory ("Предмети") -->
	<div
		class="flex flex-col items-center justify-between px-2 py-1.5 bg-[#131722] rounded-lg border-2 border-[#544738] shadow-inner shrink-0 w-28 h-[142px]"
		style="box-shadow: inset 0 0 10px rgba(0,0,0,0.8);"
	>
		<span class="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">Предмети</span>

		<!-- 2 columns x 3 rows grid of worn leather inventory pouches -->
		<div class="grid grid-cols-2 gap-1.5">
			<!-- Slot 1: Golden Cheese if purchased -->
			<div
				class="w-9 h-9 rounded bg-[#0c1017] border border-[#544738] flex items-center justify-center text-xs shadow-inner cursor-pointer"
				title={player.maxFood > 0 ? 'Золотий Сир (+1 Ліміт їжі)' : 'Порожній слот'}
			>
				{#if player.maxFood > 0}
					<span class="text-base">🧀</span>
				{:else}
					<div class="w-3 h-3 rounded-full bg-[#1e2433] opacity-40"></div>
				{/if}
			</div>

			<!-- Slot 2 -->
			<div
				class="w-9 h-9 rounded bg-[#0c1017] border border-[#544738] flex items-center justify-center text-xs shadow-inner"
			>
				<div class="w-3 h-3 rounded-full bg-[#1e2433] opacity-40"></div>
			</div>

			<!-- Slot 3 -->
			<div
				class="w-9 h-9 rounded bg-[#0c1017] border border-[#544738] flex items-center justify-center text-xs shadow-inner"
			>
				<div class="w-3 h-3 rounded-full bg-[#1e2433] opacity-40"></div>
			</div>

			<!-- Slot 4 -->
			<div
				class="w-9 h-9 rounded bg-[#0c1017] border border-[#544738] flex items-center justify-center text-xs shadow-inner"
			>
				<div class="w-3 h-3 rounded-full bg-[#1e2433] opacity-40"></div>
			</div>

			<!-- Slot 5 -->
			<div
				class="w-9 h-9 rounded bg-[#0c1017] border border-[#544738] flex items-center justify-center text-xs shadow-inner"
			>
				<div class="w-3 h-3 rounded-full bg-[#1e2433] opacity-40"></div>
			</div>

			<!-- Slot 6 -->
			<div
				class="w-9 h-9 rounded bg-[#0c1017] border border-[#544738] flex items-center justify-center text-xs shadow-inner"
			>
				<div class="w-3 h-3 rounded-full bg-[#1e2433] opacity-40"></div>
			</div>
		</div>
	</div>

	<!-- 5. RIGHT: Command Card 4x3 Grid (Меню моба / робітника) -->
	<div
		class="relative flex items-center justify-center p-1.5 bg-[#131722] rounded-lg border-2 border-[#544738] shadow-inner shrink-0 h-[142px]"
		style="box-shadow: inset 0 0 10px rgba(0,0,0,0.8);"
	>
		{#if placedBuilding}
			<!-- Placed Building Commands: Upgrades & Sell -->
			<div class="grid grid-cols-4 gap-1.5 w-[280px]">
				{#each availableUpgrades as up, uIdx}
					{@const upCost =
						up.upgrade_extra_cost > 0
							? up.upgrade_extra_cost
							: Math.max(50, (up.gold_cost || 200) - placedBuilding.goldCost)}
					{@const canAfford = playerGold >= upCost}
					<button
						onclick={() => onUpgradeBuilding?.(placedBuilding.instanceId, up.id)}
						disabled={!canAfford}
						class="relative w-16 h-10 rounded border flex flex-col items-center justify-center p-1 transition cursor-pointer {canAfford
							? 'bg-[#1e3a5f] hover:bg-[#2563eb] border-blue-400 text-white shadow'
							: 'bg-[#181d28] border-slate-700 text-slate-500 opacity-60 cursor-not-allowed'}"
						title="{up.name} ({upCost}g)"
					>
						<span
							class="absolute top-0.5 right-1 text-[8px] font-mono font-bold text-amber-300 drop-shadow"
						>
							[{uIdx + 1}]
						</span>
						<span class="text-[10px] font-bold truncate max-w-[50px]">{up.name}</span>
						<span class="text-[9px] text-amber-300 font-mono font-bold">🪙 {upCost}</span>
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
					onclick={() => (selectedPlacedBuildingId = null)}
					class="relative col-start-4 w-16 h-10 rounded border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 flex flex-col items-center justify-center p-1 transition cursor-pointer"
					title="Закрити вибір (Esc)"
				>
					<X class="w-4 h-4 text-slate-300" />
					<span class="text-[8px] font-mono">Esc</span>
				</button>
			</div>
		{:else}
			<!-- 4x3 Grid of 12 Command Buttons for Worker -->
			<div class="grid grid-cols-4 gap-1.5">
				{#each availableBuildings as bld, idx}
					{@const isSelected = selectedBuildingId === bld.id}
					{@const isAffordable = playerGold >= (bld.gold_cost || 200)}
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
						title="{bld.name} ({bld.gold_cost}g) [Гаряча клавіша: {hotkey}]"
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

						<!-- Gold Cost in bottom-right -->
						<span
							class="text-[8px] font-mono font-bold self-end flex items-center gap-0.5 {isAffordable
								? 'text-amber-300'
								: 'text-red-400'}"
						>
							🪙 {bld.gold_cost}
						</span>
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
					<span class="font-mono font-bold text-amber-300 flex items-center gap-1">
						<Coins class="w-3.5 h-3.5" />
						{hoveredBuilding.gold_cost}g
					</span>
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
</div>
