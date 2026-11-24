<script lang="ts">
	import type { Simulation } from '../engine/simulation';
	import type {
		Building,
		Unit,
		Castle,
		PlayerState,
		WorkerState,
		UnitDefinition
	} from '../engine/types';
	import { formatRaceName, formatFactionName } from '../engine/gameData';
	import { Shield, Swords, Footprints, Layers, Crosshair, Zap, Feather } from 'lucide-svelte';
	import CombatMatrixTooltip, {
		ATTACK_NAMES_UK,
		ARMOR_NAMES_UK,
		normalizeArmorKey,
		normalizeAttackKey
	} from './CombatMatrixTooltip.svelte';

	let {
		sim: _sim,
		activeEntityType,
		selectedCastle = null,
		placedBuilding = null,
		placedUnit = null,
		selectedUnit = null,
		worker: _worker = null,
		player,
		groupUnits = [],
		groupBreakdown = [],
		onClearSelection,
		onCloseBuilding,
		onCloseUnit
	}: {
		sim: Simulation;
		activeEntityType: 'castle' | 'group' | 'building' | 'unit' | 'worker' | 'none';
		selectedCastle?: Castle | null;
		placedBuilding?: Building | null;
		placedUnit?: UnitDefinition | null;
		selectedUnit?: Unit | null;
		worker?: WorkerState | null;
		player: PlayerState;
		groupUnits?: Unit[];
		groupBreakdown?: { name: string; count: number }[];
		onClearSelection?: () => void;
		onCloseBuilding?: () => void;
		onCloseUnit?: () => void;
	} = $props();

	let hoveredMatrix = $state<{
		kind: 'attack' | 'armor';
		key: string;
		label: string;
	} | null>(null);
</script>

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
			{:else if activeEntityType === 'worker'}
				Будівельник
			{:else}
				Вибір
			{/if}
		</span>
	</div>

	{#if activeEntityType === 'worker'}
		<div
			class="flex items-center gap-1.5 bg-[#0c1017] px-2.5 py-0.5 rounded border border-[#78654c]/60"
		>
			<span class="text-xs font-bold text-amber-300">[{formatFactionName(player.race)}]</span>
		</div>
	{:else if activeEntityType === 'none'}
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
{:else if activeEntityType === 'unit' && selectedUnit}
	<!-- Unified 6-Attribute Grid for Autonomous Combat Unit (Zero duplication) -->
	<div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs py-1">
		<!-- 1. Defense Row (Захист) with Damage Matrix Hover -->
		<div
			role="button"
			tabindex="0"
			class="flex items-center gap-1.5 text-slate-300 cursor-help"
			onmouseenter={() => {
				const norm = normalizeArmorKey(selectedUnit.armorType || 'none');
				hoveredMatrix = {
					kind: 'armor',
					key: norm,
					label: ARMOR_NAMES_UK[norm] || selectedUnit.armorType
				};
			}}
			onmouseleave={() => (hoveredMatrix = null)}
		>
			<Shield class="w-3.5 h-3.5 text-blue-400 shrink-0" />
			<span class="text-[#9ca3af]">Захист:</span>
			<span
				class="font-bold text-emerald-300 underline decoration-dotted decoration-emerald-500/50"
			>
				{selectedUnit.armorType} ({selectedUnit.armor})
			</span>
		</div>

		<!-- 2. Attack Row (Атака) with Damage Matrix Hover -->
		<div
			role="button"
			tabindex="0"
			class="flex items-center gap-1.5 text-slate-300 cursor-help"
			onmouseenter={() => {
				if (selectedUnit.attackType) {
					const norm = normalizeAttackKey(selectedUnit.attackType);
					hoveredMatrix = {
						kind: 'attack',
						key: norm,
						label: ATTACK_NAMES_UK[norm] || selectedUnit.attackType
					};
				}
			}}
			onmouseleave={() => (hoveredMatrix = null)}
		>
			<Swords class="w-3.5 h-3.5 text-rose-400 shrink-0" />
			<span class="text-[#9ca3af]">Атака:</span>
			<span class="font-bold text-amber-200 underline decoration-dotted decoration-amber-500/50">
				{selectedUnit.damageMin}-{selectedUnit.damageMax} ({selectedUnit.attackType})
			</span>
		</div>

		<!-- 3. Attack Range Row (Дистанція атаки) -->
		<div class="flex items-center gap-1.5 text-slate-300">
			<Crosshair class="w-3.5 h-3.5 text-cyan-400 shrink-0" />
			<span class="text-[#9ca3af]">Дистанція:</span>
			<span class="font-mono text-amber-300 font-bold">
				{selectedUnit.range} px
			</span>
		</div>

		<!-- 4. Attack Speed / Cooldown Row (Швидкість атаки) -->
		<div class="flex items-center gap-1.5 text-slate-300">
			<Zap class="w-3.5 h-3.5 text-amber-400 shrink-0" />
			<span class="text-[#9ca3af]">Швидкість атаки:</span>
			<span class="font-mono text-slate-200">
				{selectedUnit.attackCooldown.toFixed(1)} с
			</span>
		</div>

		<!-- 5. Movement Speed Row (Швидкість пересування) -->
		<div class="flex items-center gap-1.5 text-slate-300">
			<Footprints class="w-3.5 h-3.5 text-amber-400 shrink-0" />
			<span class="text-[#9ca3af]">Швидкість:</span>
			<span class="font-mono text-slate-200">
				{selectedUnit.speed}
			</span>
		</div>

		<!-- 6. Movement Type Row (Тип пересування) -->
		<div class="flex items-center gap-1.5 text-slate-300">
			<Feather class="w-3.5 h-3.5 text-purple-400 shrink-0" />
			<span class="text-[#9ca3af]">Тип пересування:</span>
			<span class="font-bold {selectedUnit.flying ? 'text-cyan-300' : 'text-emerald-300'}">
				{selectedUnit.flying ? 'Повітряний юніт' : 'Наземний юніт'}
			</span>
		</div>
	</div>
{:else if activeEntityType === 'worker'}
	<!-- Minimalist Clean Worker Attributes: Only Speed -->
	<div class="flex items-center gap-2 py-3 my-auto">
		<Footprints class="w-4 h-4 text-amber-400 shrink-0" />
		<span class="text-xs text-[#9ca3af]">Швидкість:</span>
		<span class="font-mono text-sm text-slate-100 font-bold">260</span>
	</div>
{:else}
	<!-- Generic 2x2 attributes for Castle, Building -->
	<div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs py-1">
		<!-- Defense Row -->
		<div
			role="button"
			tabindex="0"
			class="flex items-center gap-1.5 text-slate-300 cursor-help"
			onmouseenter={() => {
				const rawArmor =
					activeEntityType === 'castle' || activeEntityType === 'building' ? 'fort' : 'none';
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
				{#if activeEntityType === 'castle'}
					Укріплена (15)
				{:else if activeEntityType === 'building'}
					Укріплена (5)
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
							: '';
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
			<span class="font-bold text-amber-200 underline decoration-dotted decoration-amber-500/50">
				{#if activeEntityType === 'castle'}
					120-150 (Облога)
				{:else if activeEntityType === 'building'}
					{#if placedBuilding?.specialType === 'tower'}
						{placedBuilding.damageMin}-{placedBuilding.damageMax} (Колюча)
					{:else}
						Немає
					{/if}
				{/if}
			</span>
		</div>

		<!-- Movement / Range Row -->
		<div class="flex items-center gap-1.5 text-slate-300">
			<Footprints class="w-3.5 h-3.5 text-amber-400 shrink-0" />
			<span class="text-[#9ca3af]">Швидкість:</span>
			<span class="font-mono text-slate-200"> Нерухомо </span>
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
				{/if}
			</span>
		</div>
	</div>
{/if}

<!-- Floating Damage Matrix Tooltip Card -->
{#if hoveredMatrix}
	<CombatMatrixTooltip matrix={hoveredMatrix} />
{/if}

<!-- Footer Info: Progress bar for Building / Controls for Castle / Unit (Worker footer suppressed) -->
{#if activeEntityType !== 'worker' && activeEntityType !== 'none'}
	<div class="border-t border-[#3b3226] pt-1 flex items-center justify-between text-[11px]">
		{#if activeEntityType === 'castle' && selectedCastle}
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
					onclick={() => onCloseBuilding?.()}
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
				onclick={() => onCloseUnit?.()}
				data-testid="hud-close-unit-btn"
				class="px-1.5 py-0.5 bg-[#2a241b] hover:bg-[#3d3427] border border-[#78654c] rounded text-[9px] text-[#fef08a] cursor-pointer"
			>
				Закрити (Esc)
			</button>
		{/if}
	</div>
{/if}
