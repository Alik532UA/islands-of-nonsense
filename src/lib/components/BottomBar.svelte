<script lang="ts">
	import type { Simulation } from '../engine/simulation';
	import {
		getBaseBuildingsForRace,
		getUpgradesForBuilding,
		getUnit,
		formatRaceName
	} from '../engine/gameData';
	import { Shield, Swords, Footprints, Hammer, Layers, Users, Castle } from 'lucide-svelte';
	import Minimap from './Minimap.svelte';
	import CommandCard from './CommandCard.svelte';
	import CombatMatrixTooltip, {
		ATTACK_NAMES_UK,
		ARMOR_NAMES_UK,
		normalizeArmorKey,
		normalizeAttackKey
	} from './CombatMatrixTooltip.svelte';
	import type { SelectedEntity } from '../renderer/entityRenderer';

	let {
		sim,
		uiTick = 0,
		cameraX = 450,
		cameraY = 400,
		zoom = 1.0,
		selectedBuildingId = $bindable(null),
		selectedPlacedBuildingId = $bindable(null),
		selectedUnitId = $bindable(null),
		selectedGroup = null,
		selectedEntity = null,
		onSelectBuilding,
		onUpgradeBuilding,
		onSellBuilding,
		onContinueConstruction,
		onMinimapClick,
		onClearSelection
	}: {
		sim: Simulation;
		uiTick?: number;
		cameraX?: number;
		cameraY?: number;
		zoom?: number;
		selectedBuildingId: string | null;
		selectedPlacedBuildingId: string | null;
		selectedUnitId?: string | null;
		selectedGroup?: string[] | null;
		selectedEntity?: SelectedEntity;
		onSelectBuilding: (id: string | null) => void;
		onUpgradeBuilding?: (instanceId: string, targetDefId: string) => void;
		onSellBuilding?: (instanceId: string) => void;
		onContinueConstruction?: (instanceId: string) => void;
		onMinimapClick?: (arenaX: number, arenaY: number) => void;
		onClearSelection?: () => void;
	} = $props();

	let player = $derived(uiTick >= 0 ? sim.players.west : sim.players.west);
	let playerGold = $derived(uiTick >= 0 ? sim.players.west.gold : 0);
	let worker = $derived(uiTick >= 0 ? sim.players.west.worker : sim.players.west.worker);
	let availableBuildings = $derived(uiTick >= 0 ? getBaseBuildingsForRace(player.race) : []);

	// Placed building state
	let placedBuilding = $derived(
		selectedPlacedBuildingId
			? sim.buildings.find((b) => b.instanceId === selectedPlacedBuildingId) || null
			: null
	);
	let placedUnit = $derived(placedBuilding ? getUnit(placedBuilding.spawnUnitId) : null);
	let availableUpgrades = $derived(
		placedBuilding ? getUpgradesForBuilding(placedBuilding.defId) : []
	);

	// Unit state (friendly, enemy or neutral)
	let selectedUnit = $derived(
		selectedUnitId
			? sim.units.find((u) => u.instanceId === selectedUnitId && u.state !== 'DEAD') || null
			: null
	);

	// Castle state
	let selectedCastle = $derived(
		selectedEntity?.type === 'castle' ? sim.castles[selectedEntity.team] : null
	);

	// Group selection state
	let groupUnits = $derived(
		selectedGroup && selectedGroup.length > 0
			? sim.units.filter((u) => selectedGroup.includes(u.instanceId) && u.state !== 'DEAD')
			: []
	);

	let groupBreakdown = $derived.by(() => {
		const map = new Map<string, number>();
		for (const u of groupUnits) {
			map.set(u.name, (map.get(u.name) || 0) + 1);
		}
		return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
	});

	// Determine active entity: Castle > Group > Building > Unit > Worker (default)
	let activeEntityType = $derived<'castle' | 'group' | 'building' | 'unit' | 'worker' | 'none'>(
		selectedCastle
			? 'castle'
			: groupUnits.length > 1
				? 'group'
				: placedBuilding
					? 'building'
					: selectedUnit
						? 'unit'
						: selectedEntity?.type === 'worker'
							? 'worker'
							: 'none'
	);

	// Combat Damage Matrix Tooltip State
	let hoveredMatrix = $state<{
		kind: 'attack' | 'armor';
		key: string;
		label: string;
	} | null>(null);

	const HOTKEYS = ['Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F', 'Z', 'X', 'C', 'V'];

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClearSelection?.();
			return;
		}

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

		// Hotkeys Q..V for command card in worker or unselected mode
		const idx = HOTKEYS.indexOf(key);
		if (
			idx !== -1 &&
			idx < availableBuildings.length &&
			(activeEntityType === 'worker' || activeEntityType === 'none')
		) {
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
		<Minimap {sim} {uiTick} {cameraX} {cameraY} {zoom} {onMinimapClick} />
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
			{#if activeEntityType === 'castle' && selectedCastle}
				<!-- Castle Keep Portrait -->
				{@const isFriendly = selectedCastle.team === 'west'}
				<div
					class="flex flex-col items-center justify-center {isFriendly
						? 'text-amber-300'
						: 'text-rose-400'}"
				>
					<Castle class="w-9 h-9 {isFriendly ? 'text-amber-400' : 'text-rose-400'}" />
					<span class="text-[9px] font-bold uppercase truncate max-w-[70px]">
						{isFriendly ? 'Ваш Замок' : 'Замок Ворога'}
					</span>
				</div>
			{:else if activeEntityType === 'group'}
				<!-- Group / Squad Portrait -->
				<div class="flex flex-col items-center justify-center text-amber-300">
					<Users class="w-9 h-9 text-amber-400" />
					<span class="text-[9px] font-bold uppercase truncate max-w-[70px]"> Загін </span>
				</div>
			{:else if activeEntityType === 'building' && placedBuilding}
				<!-- Building Icon Portrait -->
				{@const isEnemyBld = placedBuilding.team === 'east'}
				<div
					class="flex flex-col items-center justify-center {isEnemyBld
						? 'text-rose-400'
						: 'text-amber-300'}"
				>
					<Hammer class="w-9 h-9 {isEnemyBld ? 'text-rose-400' : 'text-amber-400'}" />
					<span class="text-[9px] font-bold uppercase truncate max-w-[70px]">
						{placedBuilding.race}
					</span>
				</div>
			{:else if activeEntityType === 'unit' && selectedUnit}
				<!-- Soldier / Combatant Portrait -->
				{@const isEnemy = selectedUnit.team === 'east'}
				<div
					class="flex flex-col items-center justify-center {isEnemy
						? 'text-rose-400'
						: selectedUnit.team === 'neutral'
							? 'text-purple-300'
							: 'text-blue-300'}"
				>
					<Swords
						class="w-9 h-9 {isEnemy
							? 'text-rose-400'
							: selectedUnit.team === 'neutral'
								? 'text-purple-400'
								: 'text-blue-400'}"
					/>
					<span class="text-[9px] font-bold uppercase truncate max-w-[70px]">
						{isEnemy ? 'Ворог' : selectedUnit.attackType}
					</span>
				</div>
			{:else if activeEntityType === 'none'}
				<!-- Neutral Unselected Portrait -->
				<div class="flex flex-col items-center justify-center text-slate-500 py-1">
					<Shield class="w-8 h-8 opacity-40 text-amber-500" />
					<span class="text-[9px] uppercase tracking-wide opacity-60">Вибір</span>
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
				{activeEntityType === 'group' ? groupUnits.length : 1}
			</div>
		</div>

		<!-- Vital Bars -->
		<div class="w-full mt-2 flex flex-col gap-1">
			<!-- Health Bar -->
			<div
				class="relative w-full h-4 bg-[#0c1017] rounded border border-[#3b3226] overflow-hidden flex items-center justify-center shadow-inner"
			>
				{#if activeEntityType === 'castle' && selectedCastle}
					{@const cHp = selectedCastle.hp}
					{@const cMaxHp = selectedCastle.maxHp}
					{@const cPct = Math.max(0, Math.min(100, (cHp / cMaxHp) * 100))}
					{@const isFriendly = selectedCastle.team === 'west'}
					<div
						class="absolute left-0 top-0 bottom-0 {isFriendly
							? 'bg-[#22c55e]'
							: 'bg-[#ef4444]'} transition-all"
						style="width: {cPct}%"
					></div>
					<span class="relative z-10 text-[9px] font-mono font-bold text-white drop-shadow">
						{Math.ceil(cHp)} / {cMaxHp}
					</span>
				{:else if activeEntityType === 'group'}
					{@const totalHp = groupUnits.reduce((acc, u) => acc + u.hp, 0)}
					{@const totalMaxHp = groupUnits.reduce((acc, u) => acc + u.maxHp, 0)}
					{@const pct = Math.max(0, Math.min(100, (totalHp / (totalMaxHp || 1)) * 100))}
					<div
						class="absolute left-0 top-0 bottom-0 bg-[#22c55e] transition-all"
						style="width: {pct}%"
					></div>
					<span class="relative z-10 text-[9px] font-mono font-bold text-white drop-shadow">
						{Math.ceil(totalHp)} / {totalMaxHp}
					</span>
				{:else if activeEntityType === 'building' && placedBuilding}
					{@const bHp = placedBuilding.hp ?? placedBuilding.goldCost * 4}
					{@const bMaxHp = placedBuilding.maxHp ?? placedBuilding.goldCost * 4}
					{@const bPct = Math.max(0, Math.min(100, (bHp / bMaxHp) * 100))}
					{@const isEnemyBld = placedBuilding.team === 'east'}
					<div
						class="absolute left-0 top-0 bottom-0 {isEnemyBld
							? 'bg-[#ef4444]'
							: 'bg-[#22c55e]'} transition-all"
						style="width: {bPct}%"
					></div>
					<span class="relative z-10 text-[9px] font-mono font-bold text-white drop-shadow">
						{Math.ceil(bHp)} / {bMaxHp}
					</span>
				{:else if activeEntityType === 'unit' && selectedUnit}
					{@const isEnemy = selectedUnit.team === 'east'}
					{@const hpPct = Math.max(0, Math.min(100, (selectedUnit.hp / selectedUnit.maxHp) * 100))}
					<div
						class="absolute left-0 top-0 bottom-0 {isEnemy
							? 'bg-[#ef4444]'
							: selectedUnit.team === 'neutral'
								? 'bg-[#a855f7]'
								: 'bg-[#22c55e]'} transition-all"
						style="width: {hpPct}%"
					></div>
					<span class="relative z-10 text-[9px] font-mono font-bold text-white drop-shadow">
						{Math.ceil(selectedUnit.hp)} / {selectedUnit.maxHp}
					</span>
				{:else if activeEntityType === 'none'}
					<span class="relative z-10 text-[9px] font-mono text-slate-500">—</span>
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
		class="relative flex-1 flex flex-col justify-between px-4 py-2 mx-2 bg-[#131722] rounded-lg border-2 border-[#544738] shadow-inner h-[142px] overflow-hidden"
		style="box-shadow: inset 0 0 10px rgba(0,0,0,0.8);"
	>
		<!-- Header: Entity Name -->
		<div class="flex items-center justify-between border-b border-[#3b3226] pb-1">
			<div class="flex items-center gap-2">
				<span
					class="w-2.5 h-2.5 rounded-full {activeEntityType === 'castle'
						? selectedCastle?.team === 'west'
							? 'bg-amber-400'
							: 'bg-rose-500'
						: activeEntityType === 'building' && placedBuilding?.team === 'east'
							? 'bg-rose-500'
							: activeEntityType === 'unit' && selectedUnit?.team === 'east'
								? 'bg-rose-500'
								: 'bg-emerald-400'} animate-pulse"
				></span>
				<span class="text-sm font-bold text-[#fef08a] truncate max-w-[220px]">
					{#if activeEntityType === 'none'}
						Виділення відсутнє
					{:else if activeEntityType === 'castle' && selectedCastle}
						{selectedCastle.team === 'west'
							? 'Західна Цитадель (Ваш замок)'
							: 'Східна Фортеця (Замок ворога)'}
					{:else if activeEntityType === 'group'}
						Загін військ ({groupUnits.length} бійців)
					{:else if activeEntityType === 'building' && placedBuilding}
						{placedBuilding.name}
					{:else if activeEntityType === 'unit' && selectedUnit}
						{selectedUnit.name}
					{:else}
						{worker?.name || 'Північний будівельник'}
					{/if}
				</span>
			</div>

			{#if activeEntityType === 'none' || activeEntityType === 'worker'}
				<div
					class="flex items-center gap-1.5 bg-[#0c1017] px-2.5 py-0.5 rounded border border-[#78654c]/60"
				>
					<span class="text-[11px] text-[#9ca3af]">Раса:</span>
					<span class="text-xs font-bold text-amber-300">{formatRaceName(player.race)}</span>
				</div>
			{:else if activeEntityType === 'building' && placedBuilding}
				<div
					class="flex items-center gap-1.5 bg-[#0c1017] px-2.5 py-0.5 rounded border {placedBuilding.team ===
					'west'
						? 'border-blue-500/60 text-blue-300'
						: 'border-rose-500/60 text-rose-300'}"
				>
					<span class="text-xs font-bold">
						{placedBuilding.team === 'west' ? 'Союзна споруда' : 'Ворожа споруда'}
					</span>
				</div>
			{:else if activeEntityType === 'castle' && selectedCastle}
				<div
					class="flex items-center gap-1.5 bg-[#0c1017] px-2.5 py-0.5 rounded border {selectedCastle.team ===
					'west'
						? 'border-blue-500/60 text-blue-300'
						: 'border-rose-500/60 text-rose-300'}"
				>
					<span class="text-xs font-bold">
						{selectedCastle.team === 'west' ? 'Союзний замок' : 'Ціль: Ворог'}
					</span>
				</div>
			{:else if activeEntityType === 'unit' && selectedUnit}
				<div
					class="flex items-center gap-1.5 bg-[#0c1017] px-2.5 py-0.5 rounded border {selectedUnit.team ===
					'west'
						? 'border-blue-500/60 text-blue-300'
						: selectedUnit.team === 'neutral'
							? 'border-purple-500/60 text-purple-300'
							: 'border-rose-500/60 text-rose-300'}"
				>
					<span class="text-xs font-bold">
						{selectedUnit.team === 'west'
							? 'Союзник'
							: selectedUnit.team === 'neutral'
								? 'Нейтральний'
								: 'Ворог'}
					</span>
				</div>
			{/if}
		</div>

		{#if activeEntityType === 'none'}
			<div class="flex items-center justify-center text-xs text-slate-400 py-4 gap-2">
				<Shield class="w-4 h-4 text-amber-500/60" />
				<span>Клікніть на воїна, будівлю або свого робітника для огляду</span>
			</div>
		{:else if activeEntityType === 'group'}
			<!-- Group composition chips -->
			<div class="flex flex-wrap gap-1.5 py-1 text-xs max-h-[75px] overflow-y-auto">
				{#each groupBreakdown as item}
					<div
						class="flex items-center gap-1 bg-[#0c1017] border border-[#544738] px-2 py-0.5 rounded text-[10px]"
					>
						<span class="font-bold text-amber-300 font-mono">{item.count}×</span>
						<span class="text-slate-200">{item.name}</span>
					</div>
				{/each}
			</div>
		{:else}
			<!-- Attributes Rows with Damage Matrix Hover Trigger -->
			<div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs py-1">
				<!-- Defense Row -->
				<div
					role="button"
					tabindex="0"
					class="flex items-center gap-1.5 text-slate-300 cursor-help"
					onmouseenter={() => {
						const rawArmor =
							activeEntityType === 'castle' || activeEntityType === 'building'
								? 'fort'
								: selectedUnit?.armorType || 'none';
						const norm = normalizeArmorKey(rawArmor);
						hoveredMatrix = { kind: 'armor', key: norm, label: ARMOR_NAMES_UK[norm] || rawArmor };
					}}
					onmouseleave={() => (hoveredMatrix = null)}
				>
					<Shield class="w-3.5 h-3.5 text-blue-400 shrink-0" />
					<span class="text-[#9ca3af]">Захист:</span>
					<span
						class="font-bold text-emerald-300 underline decoration-dotted decoration-emerald-500/50"
					>
						{#if activeEntityType === 'worker'}
							Неуразливий
						{:else if activeEntityType === 'castle'}
							Укріплена (15)
						{:else if activeEntityType === 'building'}
							Укріплена (5)
						{:else if selectedUnit}
							{selectedUnit.armorType} ({selectedUnit.armor})
						{/if}
					</span>
				</div>

				<!-- Attack Row -->
				<div
					role="button"
					tabindex="0"
					class="flex items-center gap-1.5 text-slate-300 cursor-help"
					onmouseenter={() => {
						const rawAttack =
							activeEntityType === 'castle'
								? 'siege'
								: activeEntityType === 'building'
									? placedBuilding?.specialType === 'tower'
										? 'pierce'
										: ''
									: selectedUnit?.attackType || '';
						if (rawAttack) {
							const norm = normalizeAttackKey(rawAttack);
							hoveredMatrix = {
								kind: 'attack',
								key: norm,
								label: ATTACK_NAMES_UK[norm] || rawAttack
							};
						}
					}}
					onmouseleave={() => (hoveredMatrix = null)}
				>
					<Swords class="w-3.5 h-3.5 text-rose-400 shrink-0" />
					<span class="text-[#9ca3af]">Атака:</span>
					<span
						class="font-bold text-amber-200 underline decoration-dotted decoration-amber-500/50"
					>
						{#if activeEntityType === 'worker'}
							Немає
						{:else if activeEntityType === 'castle'}
							120-150 (Облога)
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
						{activeEntityType === 'worker'
							? '260'
							: activeEntityType === 'castle'
								? 'Нерухомо'
								: (selectedUnit?.speed ?? 'Нерухомо')}
					</span>
				</div>

				<!-- Secondary Ability / Spawn Status -->
				<div class="flex items-center gap-1.5 text-slate-300">
					<Layers class="w-3.5 h-3.5 text-purple-400 shrink-0" />
					<span class="text-[#9ca3af]">Статус:</span>
					<span class="text-[11px] text-purple-200 truncate max-w-[130px]">
						{#if activeEntityType === 'castle'}
							Головна Цитадель
						{:else if activeEntityType === 'building'}
							{#if placedBuilding?.isUnderConstruction}
								Будівництво...
							{:else}
								{placedUnit ? `Спавнить ${placedUnit.name}` : 'Спеціальна'}
							{/if}
						{:else if activeEntityType === 'unit'}
							{selectedUnit?.flying ? 'Літаючий' : 'Наземний'}
						{:else}
							Готовий до праці
						{/if}
					</span>
				</div>
			</div>
		{/if}

		<!-- Floating Damage Matrix Tooltip Card -->
		{#if hoveredMatrix}
			<CombatMatrixTooltip matrix={hoveredMatrix} />
		{/if}

		<!-- Footer Info: Lane Preference for Worker OR Progress bar for Building -->
		<div class="border-t border-[#3b3226] pt-1 flex items-center justify-between text-[11px]">
			{#if activeEntityType === 'worker' || activeEntityType === 'none'}
				<div class="flex items-center justify-between w-full">
					<div class="flex items-center gap-1.5">
						<span class="text-[10px] text-amber-300 font-bold">Лінія:</span>
						{#each ['auto', 'top', 'bottom'] as const as lane}
							{@const isActive = sim.getPlayerPreferredLane('west') === lane}
							<button
								onclick={() => sim.setPlayerPreferredLane('west', lane)}
								class="px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer {isActive
									? 'bg-blue-600 text-white border border-blue-400'
									: 'bg-[#181d28] text-slate-400 hover:text-slate-200 border border-slate-700'}"
								title={lane === 'auto'
									? 'Автоматичний вибір лінії'
									: lane === 'top'
										? 'Направляти бійців на верхню лінію'
										: 'Направляти бійців на нижню лінію'}
							>
								{lane === 'auto' ? 'Авто' : lane === 'top' ? 'Верх' : 'Низ'}
							</button>
						{/each}
					</div>
					<span class="text-[10px] text-slate-400 font-mono">
						{activeEntityType === 'worker' ? 'Робітник' : 'Очікування'}
					</span>
				</div>
			{:else if activeEntityType === 'castle' && selectedCastle}
				<span class="text-[#9ca3af] text-[10px]">
					{selectedCastle.team === 'west' ? 'Головна Цитадель (Союзник)' : 'Ворожа Цитадель (Ціль)'}
				</span>
				<button
					onclick={() => onClearSelection?.()}
					class="px-1.5 py-0.5 bg-[#2a241b] hover:bg-[#3d3427] border border-[#78654c] rounded text-[9px] text-[#fef08a] cursor-pointer"
				>
					Закрити (Esc)
				</button>
			{:else if activeEntityType === 'group'}
				<span class="text-[#9ca3af] text-[10px]">Виділено загін бійців</span>
				<button
					onclick={() => onClearSelection?.()}
					class="px-1.5 py-0.5 bg-[#2a241b] hover:bg-[#3d3427] border border-[#78654c] rounded text-[9px] text-[#fef08a] cursor-pointer"
				>
					Зняти вибір (Esc)
				</button>
			{:else if activeEntityType === 'building' && placedBuilding}
				<div class="flex items-center gap-2 w-full justify-between">
					{#if placedBuilding.isUnderConstruction}
						{@const pct = Math.round(
							((placedBuilding.buildProgress || 0) / (placedBuilding.maxBuildProgress || 3.5)) * 100
						)}
						<span class="text-amber-300 text-[10px] font-bold">Триває будівництво ({pct}%)</span>
						<div class="w-32 h-2 bg-[#0c1017] rounded-full overflow-hidden border border-[#3b3226]">
							<div
								class="h-full bg-amber-400 transition-all"
								style="width: {Math.max(0, Math.min(100, pct))}%"
							></div>
						</div>
					{:else}
						{@const remPct = Math.max(
							0,
							Math.min(100, (1 - placedBuilding.spawnTimer / placedBuilding.spawnCooldown) * 100)
						)}
						<span class="text-[#9ca3af] text-[10px]">
							КД: {placedBuilding.spawnCooldown}с ({placedBuilding.spawnTimer.toFixed(1)}с)
						</span>
						<div class="w-32 h-2 bg-[#0c1017] rounded-full overflow-hidden border border-[#3b3226]">
							<div
								class="h-full {placedBuilding.team === 'west'
									? 'bg-cyan-400'
									: 'bg-rose-400'} transition-all"
								style="width: {remPct}%"
							></div>
						</div>
					{/if}
					<button
						onclick={() => (selectedPlacedBuildingId = null)}
						class="px-1.5 py-0.5 bg-[#2a241b] hover:bg-[#3d3427] border border-[#78654c] rounded text-[9px] text-[#fef08a] cursor-pointer"
					>
						Закрити (Esc)
					</button>
				</div>
			{:else}
				<span class="text-[#9ca3af] text-[10px]">
					{selectedUnit?.team === 'west'
						? 'Союзний боєць'
						: selectedUnit?.team === 'neutral'
							? 'Нейтральний бос'
							: 'Ворожий боєць'}
				</span>
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
			{#each [0, 1, 2, 3, 4, 5] as slotIdx}
				<div
					class="w-9 h-9 rounded bg-[#0c1017] border border-[#544738] flex items-center justify-center text-xs shadow-inner cursor-pointer"
					title={slotIdx === 0 && player.maxFood > 0
						? 'Золотий Сир (+1 Ліміт їжі)'
						: 'Порожній слот'}
				>
					{#if slotIdx === 0 && player.maxFood > 0}
						<span class="text-base">🧀</span>
					{:else}
						<div class="w-3 h-3 rounded-full bg-[#1e2433] opacity-40"></div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- 5. RIGHT: Command Card 4x3 Grid (Меню моба / робітника) -->
	<CommandCard
		{sim}
		{placedBuilding}
		{placedUnit}
		{availableUpgrades}
		{selectedCastle}
		{selectedUnit}
		{groupUnits}
		{availableBuildings}
		{selectedBuildingId}
		{activeEntityType}
		{player}
		{playerGold}
		{onSelectBuilding}
		{onUpgradeBuilding}
		{onSellBuilding}
		{onContinueConstruction}
		{onClearSelection}
		onCloseBuilding={() => (selectedPlacedBuildingId = null)}
		onCloseUnit={() => (selectedUnitId = null)}
	/>
</div>
