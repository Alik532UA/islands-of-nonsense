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
	import { computeSpawnProgressRatio } from '../engine/buildingSystem';
	import {
		findCommander,
		getCommanderEffectivePct,
		getCommanderDescription
	} from '../engine/commanders';
	import { WORKER_MOVE_SPEED } from '../engine/constants';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
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
	let viewerTeam = $derived(player.team);
</script>

{#if activeEntityType === 'worker'}
	{@const activeCommander = findCommander(player.commander)}
	<!-- Minimalist Clean Worker Stats: Faction -> Name -> Speed -> Active Commander -->
	<div class="flex flex-col justify-center h-full gap-1 py-0.5">
		<span class="text-xs font-bold text-amber-300 tracking-wider uppercase leading-tight">
			{formatFactionName(player.race)}
		</span>
		<span class="text-base font-bold text-[#fef08a] leading-tight">
			{player.isBot ? `Бот-будівельник #${player.slot}` : 'Будівельник'}
		</span>
		<div class="flex items-center gap-1.5 pt-0.5 text-xs">
			<UiIcon name="footprints" class="w-4 h-4 text-amber-400 shrink-0" />
			<span class="text-[#9ca3af]">Швидкість:</span>
			<span class="font-mono text-slate-100 font-bold text-sm">
				{Math.round(player.worker?.speed ?? WORKER_MOVE_SPEED)}
			</span>
		</div>
		{#if activeCommander}
			{@const effectivePct = getCommanderEffectivePct(
				activeCommander.id,
				Boolean(player.isRandomCommander)
			)}
			<div
				class="flex items-center gap-1 text-[11px] leading-tight min-w-0"
				data-testid="worker-commander-info"
				title="{activeCommander.name} ({activeCommander.nickname}): {getCommanderDescription(
					activeCommander,
					Boolean(player.isRandomCommander)
				)}"
			>
				<UiIcon name="crown" class="w-3.5 h-3.5 text-indigo-400 shrink-0" />
				<span class="text-[#9ca3af] shrink-0">Ком.:</span>
				<span class="font-bold text-indigo-200 truncate">
					{activeCommander.name}{player.isRandomCommander ? ' ×2' : ''}
				</span>
				<span class="text-[10px] font-mono text-purple-300 shrink-0">
					({activeCommander.id === 2 ? `-${effectivePct}%` : `+${effectivePct}%`})
				</span>
			</div>
		{/if}
	</div>
{:else}
	<!-- Header: Entity Name -->
	<div class="flex items-center justify-between border-b border-[#3b3226] pb-1">
		<div class="flex items-center gap-2">
			<span class="text-sm font-bold text-[#fef08a] truncate max-w-[220px]">
				{#if activeEntityType === 'none'}
					Виділення відсутнє
				{:else if activeEntityType === 'castle' && selectedCastle}
					{#if selectedCastle.team === viewerTeam}
						{selectedCastle.team === 'west'
							? 'Західна Цитадель (Ваш замок)'
							: 'Східна Фортеця (Ваш замок)'}
					{:else}
						{selectedCastle.team === 'west'
							? 'Західна Цитадель (Замок ворога)'
							: 'Східна Фортеця (Замок ворога)'}
					{/if}
				{:else if activeEntityType === 'group'}
					Загін військ ({groupUnits.length} бійців)
				{:else if activeEntityType === 'building' && placedBuilding}
					{placedBuilding.name}
				{:else if activeEntityType === 'unit' && selectedUnit}
					{selectedUnit.name}
				{:else}
					Вибір
				{/if}
			</span>
		</div>

		{#if activeEntityType === 'none'}
			<div
				class="flex items-center gap-1.5 bg-[#0c1017] px-2.5 py-0.5 rounded border border-[#78654c]/60"
			>
				<span class="text-[11px] text-[#9ca3af]">Раса:</span>
				<span class="text-xs font-bold text-amber-300">{formatRaceName(player.race)}</span>
			</div>
		{:else if activeEntityType === 'building' && placedBuilding}
			<div
				class="flex items-center gap-1.5 bg-[#0c1017] px-2.5 py-0.5 rounded border {placedBuilding.team ===
				viewerTeam
					? 'border-blue-500/60 text-blue-300'
					: 'border-rose-500/60 text-rose-300'}"
			>
				<span class="text-xs font-bold">
					{placedBuilding.team === viewerTeam ? 'Союзна споруда' : 'Ворожа споруда'}
				</span>
			</div>
		{:else if activeEntityType === 'castle' && selectedCastle}
			<div
				class="flex items-center gap-1.5 bg-[#0c1017] px-2.5 py-0.5 rounded border {selectedCastle.team ===
				viewerTeam
					? 'border-blue-500/60 text-blue-300'
					: 'border-rose-500/60 text-rose-300'}"
			>
				<span class="text-xs font-bold">
					{selectedCastle.team === viewerTeam ? 'Союзний замок' : 'Ціль: Ворог'}
				</span>
			</div>
		{:else if activeEntityType === 'unit' && selectedUnit}
			<div
				class="flex items-center gap-1.5 bg-[#0c1017] px-2.5 py-0.5 rounded border {selectedUnit.team ===
				viewerTeam
					? 'border-blue-500/60 text-blue-300'
					: selectedUnit.team === 'neutral'
						? 'border-purple-500/60 text-purple-300'
						: 'border-rose-500/60 text-rose-300'}"
			>
				<span class="text-xs font-bold">
					{selectedUnit.team === viewerTeam
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
			<UiIcon name="shield" class="w-4 h-4 text-amber-500/60" />
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
				<UiIcon name="shield" class="w-3.5 h-3.5 text-blue-400 shrink-0" />
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
				<UiIcon name="swords" class="w-3.5 h-3.5 text-rose-400 shrink-0" />
				<span class="text-[#9ca3af]">Атака:</span>
				<span class="font-bold text-amber-200 underline decoration-dotted decoration-amber-500/50">
					{selectedUnit.damageMin}-{selectedUnit.damageMax} ({selectedUnit.attackType})
				</span>
			</div>

			<!-- 3. Attack Range Row (Дистанція атаки) -->
			<div class="flex items-center gap-1.5 text-slate-300">
				<UiIcon name="crosshair" class="w-3.5 h-3.5 text-cyan-400 shrink-0" />
				<span class="text-[#9ca3af]">Дистанція:</span>
				<span class="font-mono text-amber-300 font-bold">
					{selectedUnit.range} px
				</span>
			</div>

			<!-- 4. Attack Speed / Cooldown Row (Швидкість атаки) -->
			<div class="flex items-center gap-1.5 text-slate-300">
				<UiIcon name="zap" class="w-3.5 h-3.5 text-amber-400 shrink-0" />
				<span class="text-[#9ca3af]">Швидкість атаки:</span>
				<span class="font-mono text-slate-200">
					{selectedUnit.attackCooldown.toFixed(1)} с
				</span>
			</div>

			<!-- 5. Movement Speed Row (Швидкість пересування) -->
			<div class="flex items-center gap-1.5 text-slate-300">
				<UiIcon name="footprints" class="w-3.5 h-3.5 text-amber-400 shrink-0" />
				<span class="text-[#9ca3af]">Швидкість:</span>
				<span class="font-mono text-slate-200">
					{selectedUnit.speed}
				</span>
			</div>

			<!-- 6. Movement Type Row (Тип пересування) -->
			<div class="flex items-center gap-1.5 text-slate-300">
				<UiIcon name="feather" class="w-3.5 h-3.5 text-purple-400 shrink-0" />
				<span class="text-[#9ca3af]">Тип пересування:</span>
				<span class="font-bold {selectedUnit.flying ? 'text-cyan-300' : 'text-emerald-300'}">
					{selectedUnit.flying ? 'Повітряний юніт' : 'Наземний юніт'}
				</span>
			</div>
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
				<UiIcon name="shield" class="w-3.5 h-3.5 text-blue-400 shrink-0" />
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
				<UiIcon name="swords" class="w-3.5 h-3.5 text-rose-400 shrink-0" />
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
				<UiIcon name="footprints" class="w-3.5 h-3.5 text-amber-400 shrink-0" />
				<span class="text-[#9ca3af]">Швидкість:</span>
				<span class="font-mono text-slate-200"> Нерухомо </span>
			</div>

			<!-- Secondary Ability / Spawn Status -->
			<div class="flex items-center gap-1.5 text-slate-300">
				<UiIcon name="layers" class="w-3.5 h-3.5 text-purple-400 shrink-0" />
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
	{#if activeEntityType !== 'none'}
		<div class="border-t border-[#3b3226] pt-1 flex items-center justify-between text-[11px]">
			{#if activeEntityType === 'castle' && selectedCastle}
				<span class="text-[#9ca3af] text-[10px]">
					{selectedCastle.team === viewerTeam
						? 'Головна Цитадель (Союзник)'
						: 'Ворожа Цитадель (Ціль)'}
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
						{@const remPct =
							computeSpawnProgressRatio(placedBuilding.spawnTimer, placedBuilding.spawnCooldown) *
							100}
						<span class="text-[#9ca3af] text-[10px]">
							КД: {placedBuilding.spawnCooldown}с ({placedBuilding.spawnTimer.toFixed(1)}с)
						</span>
						<div class="w-32 h-2 bg-[#0c1017] rounded-full overflow-hidden border border-[#3b3226]">
							<div
								class="h-full {placedBuilding.team === viewerTeam
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
					{selectedUnit?.team === viewerTeam
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
{/if}
