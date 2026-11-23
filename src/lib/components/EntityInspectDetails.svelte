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
	import { formatRaceName } from '../engine/gameData';
	import { Shield, Swords, Footprints, Layers } from 'lucide-svelte';
	import CombatMatrixTooltip, {
		ATTACK_NAMES_UK,
		ARMOR_NAMES_UK,
		normalizeArmorKey,
		normalizeAttackKey
	} from './CombatMatrixTooltip.svelte';

	let {
		sim,
		activeEntityType,
		selectedCastle = null,
		placedBuilding = null,
		placedUnit = null,
		selectedUnit = null,
		worker = null,
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
			<span class="font-bold text-amber-200 underline decoration-dotted decoration-amber-500/50">
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
			class="px-1.5 py-0.5 bg-[#2a241b] hover:bg-[#3d3427] border border-[#78654c] rounded text-[9px] text-[#fef08a] cursor-pointer"
		>
			Закрити (Esc)
		</button>
	{/if}
</div>
