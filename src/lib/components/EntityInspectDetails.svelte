<script lang="ts">
	import { getContext } from 'svelte';
	import type { Simulation } from '../engine/simulation';
	import { BATTLE_COMMAND_ROUTER_KEY, type BattleCommandRouter } from '$lib/net/onlineMatchSetup';
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
		getCommanderDescription,
		getCommanderName,
		getCommanderNickname
	} from '../engine/commanders';
	import { WORKER_MOVE_SPEED } from '../engine/constants';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import CombatMatrixTooltip, {
		getArmorTypeLabel,
		getAttackTypeLabel,
		normalizeArmorKey,
		normalizeAttackKey
	} from './CombatMatrixTooltip.svelte';
	import { t } from '$lib/i18n';
	import { localizeEntityName, localizeRaceName } from '$lib/i18n/entityNames';
	import { settings } from '$lib/services/settings.svelte';

	let {
		sim: _sim,
		uiTick = 0,
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
		uiTick?: number;
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
	const routeBattleCommand = getContext<BattleCommandRouter | undefined>(BATTLE_COMMAND_ROUTER_KEY);
	const isBridgeBroken = $derived(uiTick >= 0 ? Boolean(_sim.brokenBridge) : false);

	function dispatchWorkerBridgeRepair() {
		if (!routeBattleCommand?.('BRIDGE_REPAIR', { team: player.team, playerSlot: player.slot })) {
			_sim.orderBridgeRepair(player.team, player);
		}
	}

	function dispatchCastleRepair(team: 'west' | 'east', targetId: string) {
		if (!routeBattleCommand?.('REPAIR', { team, playerSlot: player.slot, targetId })) {
			_sim.repairBuilding(team, targetId, player);
		}
	}
</script>

{#if activeEntityType === 'worker'}
	{@const activeCommander = findCommander(player.commander)}
	<!-- Minimalist Clean Worker Stats: Faction -> Name -> Speed -> Active Commander -->
	<div class="flex flex-col justify-center h-full gap-1 py-0.5">
		<span class="text-xs font-bold text-amber-300 tracking-wider uppercase leading-tight">
			{localizeRaceName(formatFactionName(player.race), settings.locale)}
		</span>
		<span class="text-base font-bold text-[#fef08a] leading-tight">
			{player.isBot ? t('inspect.botBuilder', { slot: player.slot ?? '' }) : t('inspect.builder')}
		</span>
		<div class="flex items-center gap-1.5 pt-0.5 text-xs">
			<UiIcon name="footprints" class="w-4 h-4 text-amber-400 shrink-0" />
			<span class="text-[#9ca3af]">{t('inspect.speed')}</span>
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
				class="relative group/tip flex items-center gap-1 text-[11px] leading-tight min-w-0 cursor-default"
				data-testid="worker-commander-info"
			>
				<UiIcon name="crown" class="w-3.5 h-3.5 text-indigo-400 shrink-0" />
				<span class="text-[#9ca3af] shrink-0">{t('inspect.commanderShort')}</span>
				<span class="font-bold text-indigo-200 truncate">
					{getCommanderName(activeCommander, settings.locale)}{player.isRandomCommander
						? ' ×2'
						: ''}
				</span>
				<span class="text-[10px] font-mono text-purple-300 shrink-0">
					({activeCommander.id === 2 ? `-${effectivePct}%` : `+${effectivePct}%`})
				</span>
				<div
					class="pointer-events-none absolute bottom-full mb-2 left-0 z-50 w-56 rounded-md border border-indigo-500/50 bg-[#0f141f]/95 px-2.5 py-1.5 text-[11px] text-indigo-100 shadow-2xl opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150"
				>
					<div class="font-bold text-amber-300">
						{getCommanderName(activeCommander, settings.locale)} ({getCommanderNickname(
							activeCommander,
							settings.locale
						)})
					</div>
					<div class="text-slate-300 text-[10px] mt-0.5 leading-snug">
						{getCommanderDescription(
							activeCommander,
							Boolean(player.isRandomCommander),
							settings.locale
						)}
					</div>
				</div>
			</div>
		{/if}
		{#if isBridgeBroken}
			{@const canBridgeRepair = (player.lumber ?? 0) >= 50}
			<div class="relative group/tip pt-1">
				<button
					type="button"
					onclick={dispatchWorkerBridgeRepair}
					disabled={!canBridgeRepair}
					data-testid="hud-worker-repair-bridge-btn"
					aria-label={t('inspect.bridgeAria')}
					class="w-full py-1 px-2 rounded-md border text-[10px] font-bold flex items-center justify-between gap-1.5 transition cursor-pointer {canBridgeRepair
						? 'bg-amber-950/80 hover:bg-amber-900 border-amber-500/70 text-amber-200 shadow'
						: 'bg-slate-900/60 border-slate-700 text-slate-500 opacity-60 cursor-not-allowed'}"
				>
					<span class="flex items-center gap-1">
						<UiIcon name="wrench" class="w-3 h-3 text-amber-400 shrink-0" />
						<span>{t('inspect.bridgeBtn')}</span>
					</span>
					<span class="flex items-center gap-0.5 font-mono text-amber-300">
						<span>50</span>
						<UiIcon name="treePine" class="w-3 h-3 text-emerald-400 shrink-0" />
					</span>
				</button>
				<div
					class="pointer-events-none absolute bottom-full mb-2 left-0 z-50 whitespace-nowrap rounded-md border border-[#544738] bg-[#0f141f]/95 px-2.5 py-1 text-[11px] text-amber-100 shadow-2xl opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150"
				>
					{t('inspect.bridgeTooltip')}
				</div>
			</div>
		{/if}
	</div>
{:else}
	<!-- Header: Entity Name -->
	<div class="flex items-center justify-between gap-2 border-b border-[#3b3226] pb-1">
		<div class="flex items-center gap-1.5 min-w-0">
			<span class="text-sm font-bold text-[#fef08a] truncate">
				{#if activeEntityType === 'none'}
					{t('inspect.noSelection')}
				{:else if activeEntityType === 'castle' && selectedCastle}
					{selectedCastle.team === 'west' ? t('inspect.westCitadel') : t('inspect.eastFortress')}
				{:else if activeEntityType === 'group'}
					{t('inspect.troopSquad', { count: groupUnits.length })}
				{:else if activeEntityType === 'building' && placedBuilding}
					{localizeEntityName(placedBuilding.name, settings.locale)}
				{:else if activeEntityType === 'unit' && selectedUnit}
					{localizeEntityName(selectedUnit.name, settings.locale)}
				{:else}
					{t('inspect.selection')}
				{/if}
			</span>
		</div>

		{#if activeEntityType === 'none'}
			<div
				class="flex items-center gap-1.5 bg-[#0c1017] px-2.5 py-0.5 rounded border border-[#78654c]/60 shrink-0 whitespace-nowrap"
			>
				<span class="text-[11px] text-[#9ca3af]">{t('inspect.raceLabel')}</span>
				<span class="text-xs font-bold text-amber-300">
					{localizeRaceName(formatRaceName(player.race), settings.locale)}
				</span>
			</div>
		{:else if activeEntityType === 'building' && placedBuilding}
			<div
				class="flex items-center gap-1 bg-[#0c1017] px-2 py-0.5 rounded border shrink-0 whitespace-nowrap {placedBuilding.team ===
				viewerTeam
					? 'border-blue-500/60 text-blue-300'
					: 'border-rose-500/60 text-rose-300'}"
			>
				<span class="text-[11px] font-bold">
					{placedBuilding.team === viewerTeam ? t('inspect.alliedBld') : t('inspect.enemyBld')}
				</span>
			</div>
		{:else if activeEntityType === 'castle' && selectedCastle}
			<div
				class="flex items-center gap-1 bg-[#0c1017] px-2 py-0.5 rounded border shrink-0 whitespace-nowrap {selectedCastle.team ===
				viewerTeam
					? 'border-amber-500/50 text-amber-300'
					: 'border-rose-500/60 text-rose-300'}"
			>
				<span class="text-[11px] font-bold">
					{selectedCastle.team === viewerTeam ? t('inspect.yourCastle') : t('inspect.enemyCastle')}
				</span>
			</div>
		{:else if activeEntityType === 'unit' && selectedUnit}
			<div
				class="flex items-center gap-1 bg-[#0c1017] px-2 py-0.5 rounded border shrink-0 whitespace-nowrap {selectedUnit.team ===
				viewerTeam
					? 'border-blue-500/60 text-blue-300'
					: selectedUnit.team === 'neutral'
						? 'border-purple-500/60 text-purple-300'
						: 'border-rose-500/60 text-rose-300'}"
			>
				<span class="text-[11px] font-bold">
					{selectedUnit.team === viewerTeam
						? t('inspect.ally')
						: selectedUnit.team === 'neutral'
							? t('inspect.neutral')
							: t('inspect.enemy')}
				</span>
			</div>
		{/if}
	</div>

	{#if activeEntityType === 'none'}
		<div class="flex items-center justify-center text-xs text-slate-400 py-4 gap-2">
			<UiIcon name="shield" class="w-4 h-4 text-amber-500/60" />
			<span>{t('inspect.emptyHint')}</span>
		</div>
	{:else if activeEntityType === 'group'}
		<!-- Group composition chips -->
		<div class="flex flex-wrap gap-1.5 py-1 text-xs max-h-[75px] overflow-y-auto">
			{#each groupBreakdown as item}
				<div
					class="flex items-center gap-1 bg-[#0c1017] border border-[#544738] px-2 py-0.5 rounded text-[10px]"
				>
					<span class="font-bold text-amber-300 font-mono">{item.count}×</span>
					<span class="text-slate-200">{localizeEntityName(item.name, settings.locale)}</span>
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
				class="flex items-center gap-1.5 text-slate-300 cursor-default whitespace-nowrap"
				onmouseenter={() => {
					const norm = normalizeArmorKey(selectedUnit.armorType || 'none');
					hoveredMatrix = {
						kind: 'armor',
						key: norm,
						label: getArmorTypeLabel(norm)
					};
				}}
				onmouseleave={() => (hoveredMatrix = null)}
			>
				<UiIcon name="shield" class="w-3.5 h-3.5 text-blue-400 shrink-0" />
				<span class="text-[#9ca3af]">{t('inspect.defense')}</span>
				<span class="font-bold text-emerald-300">
					{getArmorTypeLabel(selectedUnit.armorType || 'none', settings.locale)} ({selectedUnit.armor})
				</span>
			</div>

			<!-- 2. Attack Row (Атака) with Damage Matrix Hover -->
			<div
				role="button"
				tabindex="0"
				class="flex items-center gap-1.5 text-slate-300 cursor-default whitespace-nowrap"
				onmouseenter={() => {
					if (selectedUnit.attackType) {
						const norm = normalizeAttackKey(selectedUnit.attackType);
						hoveredMatrix = {
							kind: 'attack',
							key: norm,
							label: getAttackTypeLabel(norm)
						};
					}
				}}
				onmouseleave={() => (hoveredMatrix = null)}
			>
				<UiIcon name="swords" class="w-3.5 h-3.5 text-rose-400 shrink-0" />
				<span class="text-[#9ca3af]">{t('inspect.attack')}</span>
				<span class="font-bold text-amber-200">
					{selectedUnit.damageMin}-{selectedUnit.damageMax} ({getAttackTypeLabel(
						selectedUnit.attackType || 'normal',
						settings.locale
					)})
				</span>
			</div>

			<!-- 3. Attack Range Row (Дистанція атаки) -->
			<div class="flex items-center gap-1.5 text-slate-300">
				<UiIcon name="crosshair" class="w-3.5 h-3.5 text-cyan-400 shrink-0" />
				<span class="text-[#9ca3af]">{t('inspect.range')}</span>
				<span class="font-mono text-amber-300 font-bold">
					{selectedUnit.range} px
				</span>
			</div>

			<!-- 4. Attack Speed / Cooldown Row (Швидкість атаки) -->
			<div class="flex items-center gap-1.5 text-slate-300">
				<UiIcon name="zap" class="w-3.5 h-3.5 text-amber-400 shrink-0" />
				<span class="text-[#9ca3af]">{t('inspect.attackSpeed')}</span>
				<span class="font-mono text-slate-200">
					{selectedUnit.attackCooldown.toFixed(1)}
					{t('inspect.secSuffix')}
				</span>
			</div>

			<!-- 5. Movement Speed Row (Швидкість пересування) -->
			<div class="flex items-center gap-1.5 text-slate-300">
				<UiIcon name="footprints" class="w-3.5 h-3.5 text-amber-400 shrink-0" />
				<span class="text-[#9ca3af]">{t('inspect.speed')}</span>
				<span class="font-mono text-slate-200">
					{selectedUnit.speed}
				</span>
			</div>

			<!-- 6. Movement Type Row (Тип пересування) -->
			<div class="flex items-center gap-1.5 text-slate-300">
				<UiIcon name="feather" class="w-3.5 h-3.5 text-purple-400 shrink-0" />
				<span class="text-[#9ca3af]">{t('inspect.moveType')}</span>
				<span class="font-bold {selectedUnit.flying ? 'text-cyan-300' : 'text-emerald-300'}">
					{selectedUnit.flying ? t('inspect.airUnit') : t('inspect.groundUnit')}
				</span>
			</div>
		</div>
	{:else if activeEntityType === 'castle' && selectedCastle}
		<!-- Castle Defense Row (Cannon stats & controls live in the Cannon CommandCard) -->
		<div class="flex items-center justify-between gap-3 py-1 text-xs">
			<div
				role="button"
				tabindex="0"
				class="flex items-center gap-1.5 text-slate-300 cursor-default whitespace-nowrap"
				onmouseenter={() => {
					const norm = normalizeArmorKey('fort');
					hoveredMatrix = { kind: 'armor', key: norm, label: getArmorTypeLabel(norm) };
				}}
				onmouseleave={() => (hoveredMatrix = null)}
			>
				<UiIcon name="shield" class="w-3.5 h-3.5 text-blue-400 shrink-0" />
				<span class="text-[#9ca3af]">{t('inspect.defense')}</span>
				<span class="font-bold text-emerald-300">{t('inspect.fort15')}</span>
			</div>
		</div>
	{:else}
		<!-- Generic 2x2 attributes for Building -->
		<div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs py-1">
			<!-- Defense Row -->
			<div
				role="button"
				tabindex="0"
				class="flex items-center gap-1.5 text-slate-300 cursor-default whitespace-nowrap"
				onmouseenter={() => {
					const rawArmor = activeEntityType === 'building' ? 'fort' : 'none';
					const norm = normalizeArmorKey(rawArmor);
					hoveredMatrix = { kind: 'armor', key: norm, label: getArmorTypeLabel(norm) };
				}}
				onmouseleave={() => (hoveredMatrix = null)}
			>
				<UiIcon name="shield" class="w-3.5 h-3.5 text-blue-400 shrink-0" />
				<span class="text-[#9ca3af]">{t('inspect.defense')}</span>
				<span class="font-bold text-emerald-300">
					{#if activeEntityType === 'building'}
						{t('inspect.fort5')}
					{/if}
				</span>
			</div>

			<!-- Attack Row -->
			<div
				role="button"
				tabindex="0"
				class="flex items-center gap-1.5 text-slate-300 cursor-default whitespace-nowrap"
				onmouseenter={() => {
					const rawAttack =
						activeEntityType === 'building' && placedBuilding?.specialType === 'tower'
							? 'pierce'
							: '';
					if (rawAttack) {
						const norm = normalizeAttackKey(rawAttack);
						hoveredMatrix = {
							kind: 'attack',
							key: norm,
							label: getAttackTypeLabel(norm)
						};
					}
				}}
				onmouseleave={() => (hoveredMatrix = null)}
			>
				<UiIcon name="swords" class="w-3.5 h-3.5 text-rose-400 shrink-0" />
				<span class="text-[#9ca3af]">{t('inspect.attack')}</span>
				<span class="font-bold text-amber-200 whitespace-nowrap">
					{#if activeEntityType === 'building'}
						{#if placedBuilding?.specialType === 'tower'}
							{t('inspect.pierceDmg', {
								min: placedBuilding.damageMin ?? 0,
								max: placedBuilding.damageMax ?? 0
							})}
						{:else}
							{t('inspect.none')}
						{/if}
					{/if}
				</span>
			</div>

			<!-- Movement / Range Row -->
			<div class="flex items-center gap-1.5 text-slate-300 whitespace-nowrap">
				<UiIcon name="footprints" class="w-3.5 h-3.5 text-amber-400 shrink-0" />
				<span class="text-[#9ca3af]">{t('inspect.moveLabel')}</span>
				<span class="font-mono text-slate-200">{t('inspect.immobile')}</span>
			</div>

			<!-- Secondary Ability / Spawn Status -->
			<div class="flex items-center gap-1.5 text-slate-300 min-w-0">
				<UiIcon name="layers" class="w-3.5 h-3.5 text-purple-400 shrink-0" />
				<span class="text-[#9ca3af] shrink-0">{t('inspect.statusLabel')}</span>
				<span class="text-[11px] text-purple-200 truncate">
					{#if activeEntityType === 'building'}
						{#if placedBuilding?.isUnderConstruction}
							{t('inspect.constructing')}
						{:else}
							{placedUnit
								? t('inspect.spawnsUnit', {
										name: localizeEntityName(placedUnit.name, settings.locale)
									})
								: t('inspect.specialBld')}
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
		<div class="border-t border-[#3b3226] pt-1 flex items-center justify-between gap-2 text-[11px]">
			{#if activeEntityType === 'castle' && selectedCastle}
				{@const isAlliedCastle = selectedCastle.team === viewerTeam}
				{@const canRepairCastle = isAlliedCastle && selectedCastle.hp < selectedCastle.maxHp}
				{@const canRepairBridge = isAlliedCastle && isBridgeBroken && (player.lumber ?? 0) >= 50}
				<div class="flex items-center gap-1.5">
					{#if isAlliedCastle}
						<div class="relative group/tip">
							<button
								type="button"
								onclick={() =>
									dispatchCastleRepair(selectedCastle.team, `castle_${selectedCastle.team}`)}
								disabled={!canRepairCastle}
								data-testid="hud-castle-repair-btn"
								aria-label={t('inspect.repairAria')}
								class="px-2 py-1 rounded border text-[10px] font-bold flex items-center gap-1 transition cursor-pointer {canRepairCastle
									? 'border-emerald-500/80 bg-emerald-950/75 hover:bg-emerald-900/90 text-emerald-100'
									: 'border-slate-700/80 bg-[#121722] text-slate-500 opacity-55 cursor-not-allowed'}"
							>
								<UiIcon name="wrench" class="w-3 h-3 text-emerald-400 shrink-0" />
								<span>{t('inspect.repairBtn')}</span>
								<span
									class="px-1 py-0.2 rounded bg-black/60 border border-emerald-500/40 text-emerald-300 font-mono text-[8.5px] leading-none"
								>
									R
								</span>
							</button>
							<div
								class="pointer-events-none absolute bottom-full mb-2 left-0 z-50 whitespace-nowrap rounded-md border border-[#544738] bg-[#0f141f]/95 px-2.5 py-1 text-[11px] text-amber-100 shadow-2xl opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150"
							>
								{canRepairCastle ? t('inspect.repairTitle') : t('inspect.citadelIntact')}
							</div>
						</div>

						<div class="relative group/tip">
							<button
								type="button"
								onclick={dispatchWorkerBridgeRepair}
								disabled={!canRepairBridge}
								data-testid="hud-repair-bridge-btn"
								aria-label={t('inspect.bridge2Aria')}
								class="px-2 py-1 rounded border text-[10px] font-bold flex items-center gap-1 transition cursor-pointer {canRepairBridge
									? 'border-amber-500/80 bg-amber-950/75 hover:bg-amber-900/90 text-amber-100'
									: 'border-slate-700/80 bg-[#121722] text-slate-500 opacity-55 cursor-not-allowed'}"
							>
								<UiIcon name="wrench" class="w-3 h-3 text-amber-400 shrink-0" />
								<span>{t('inspect.bridgeBtn')}</span>
								<span class="flex items-center gap-0.5 font-mono text-amber-300">
									<span>50</span>
									<UiIcon name="treePine" class="w-3 h-3 text-emerald-400 shrink-0" />
								</span>
							</button>
							<div
								class="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-md border border-[#544738] bg-[#0f141f]/95 px-2.5 py-1 text-[11px] text-amber-100 shadow-2xl opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150"
							>
								{!isBridgeBroken
									? t('inspect.bridgeIntact')
									: (player.lumber ?? 0) < 50
										? t('inspect.bridgeNeedLumber')
										: t('inspect.bridgeShortTitle')}
							</div>
						</div>
					{/if}
				</div>
				<button
					onclick={() => onClearSelection?.()}
					data-testid="hud-close-castle-btn"
					class="sr-only"
				>
					{t('inspect.closeEsc')}
				</button>
			{:else if activeEntityType === 'group'}
				<span class="text-[#9ca3af] text-[10px]">{t('inspect.squadHint')}</span>
				<button
					onclick={() => onClearSelection?.()}
					data-testid="hud-close-group-btn"
					class="sr-only"
				>
					{t('inspect.clearEsc')}
				</button>
			{:else if activeEntityType === 'building' && placedBuilding}
				<div class="flex items-center gap-2 w-full justify-between">
					{#if placedBuilding.isUnderConstruction}
						{@const pct = Math.round(
							((placedBuilding.buildProgress || 0) / (placedBuilding.maxBuildProgress || 3.5)) * 100
						)}
						<span class="text-amber-300 text-[10px] font-bold">
							{t('inspect.constructingPct', { pct })}
						</span>
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
							{t('inspect.cdStatus', {
								cd: placedBuilding.spawnCooldown,
								timer: placedBuilding.spawnTimer.toFixed(1)
							})}
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
						data-testid="hud-close-building-btn"
						class="sr-only"
					>
						{t('inspect.closeEsc')}
					</button>
				</div>
			{:else}
				<button onclick={() => onCloseUnit?.()} data-testid="hud-close-unit-btn" class="sr-only">
					{t('inspect.closeEsc')}
				</button>
			{/if}
		</div>
	{/if}
{/if}
