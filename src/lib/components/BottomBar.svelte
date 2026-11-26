<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import type { Simulation } from '../engine/simulation';
	import type { PlayerState } from '../engine/types';
	import { BATTLE_COMMAND_ROUTER_KEY, type BattleCommandRouter } from '$lib/net/onlineMatchSetup';
	import { sound } from '../services/audio';
	import {
		formatRaceName,
		getBaseBuildingsForRace,
		getUpgradesForBuilding,
		getUnit,
		resolveBuildingDisplayRace
	} from '../engine/gameData';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import Minimap from './Minimap.svelte';
	import CommandCard from './CommandCard.svelte';
	import EntityInspectDetails from './EntityInspectDetails.svelte';
	import EntityPortrait from './EntityPortrait.svelte';
	import type { SelectedEntity } from '../renderer/entityRenderer';
	import { shortcutLetter, shortcutDigit, isEditableTarget } from '../hotkeys/hotkeys';
	import { settings } from '../services/settings.svelte';

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
		localTeam = 'west',
		activePlayer = null,
		allowAllTeamsControl = false,
		isSpectator = false,
		onSelectBuilding,
		onUpgradeBuilding,
		onSellBuilding,
		onContinueConstruction,
		onOpenCommander,
		isBlinkTargeting = false,
		itemTargetingSlot = $bindable(null),
		onStartBlinkTargeting,
		onQuickDropItem,
		onSwapInventorySlots,
		onUseWorkerItem,
		onMinimapClick,
		onClearSelection,
		onHoverCastleRange,
		touchControls
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
		localTeam?: 'west' | 'east';
		activePlayer?: PlayerState | null;
		allowAllTeamsControl?: boolean;
		isSpectator?: boolean;
		isBlinkTargeting?: boolean;
		itemTargetingSlot?: number | null;
		onSelectBuilding: (id: string | null) => void;
		onUpgradeBuilding?: (instanceId: string, targetDefId: string) => void;
		onSellBuilding?: (instanceId: string) => void;
		onContinueConstruction?: (instanceId: string) => void;
		onOpenCommander?: () => void;
		onStartBlinkTargeting?: () => void;
		onQuickDropItem?: (slotIdx: number) => void;
		onSwapInventorySlots?: (fromSlot: number, toSlot: number) => void;
		onUseWorkerItem?: (slotIdx: number) => void;
		onMinimapClick?: (arenaX: number, arenaY: number) => void;
		onClearSelection?: () => void;
		onHoverCastleRange?: (mode: 'short' | 'long' | null) => void;
		touchControls?: Snippet;
	} = $props();

	const routeBattleCommand = getContext<BattleCommandRouter | undefined>(BATTLE_COMMAND_ROUTER_KEY);

	let localPlayer = $derived(
		activePlayer ?? (localTeam === 'east' ? sim.players.east : sim.players.west)
	);
	let effectiveTeam = $derived(localPlayer.team);
	let player = $derived(uiTick >= 0 ? localPlayer : localPlayer);
	let playerGold = $derived(uiTick >= 0 ? localPlayer.gold : 0);
	let worker = $derived(uiTick >= 0 ? localPlayer.worker : localPlayer.worker);
	let availableBuildings = $derived(uiTick >= 0 ? getBaseBuildingsForRace(player.race) : []);

	// Placed building state
	let placedBuilding = $derived(
		uiTick >= 0 && selectedPlacedBuildingId
			? sim.buildings.find((b) => b.instanceId === selectedPlacedBuildingId) || null
			: null
	);
	let placedUnit = $derived(placedBuilding ? getUnit(placedBuilding.spawnUnitId) : null);
	let availableUpgrades = $derived(
		placedBuilding ? getUpgradesForBuilding(placedBuilding.defId) : []
	);

	// Unit state (friendly, enemy or neutral)
	let selectedUnit = $derived(
		uiTick >= 0 && selectedUnitId
			? sim.units.find((u) => u.instanceId === selectedUnitId && u.state !== 'DEAD') || null
			: null
	);

	// Castle state
	let selectedCastle = $derived(
		uiTick >= 0 && selectedEntity?.type === 'castle' ? sim.castles[selectedEntity.team] : null
	);

	// Group selection state
	let groupUnits = $derived(
		uiTick >= 0 && selectedGroup && selectedGroup.length > 0
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

	let entityTeam = $derived<'west' | 'east' | 'neutral' | 'none'>(
		selectedCastle
			? selectedCastle.team
			: placedBuilding
				? placedBuilding.team
				: selectedUnit
					? selectedUnit.team
					: groupUnits.length > 0
						? (groupUnits[0].team as 'west' | 'east')
						: activeEntityType === 'worker'
							? player.team
							: 'none'
	);

	let isAllied = $derived(
		activeEntityType !== 'none' &&
			entityTeam !== 'none' &&
			(allowAllTeamsControl ? entityTeam !== 'neutral' : entityTeam === effectiveTeam)
	);
	let isOpponent = $derived(
		activeEntityType !== 'none' &&
			entityTeam !== 'none' &&
			(allowAllTeamsControl ? false : entityTeam !== effectiveTeam)
	);

	let showOnLeft = $derived(
		activeEntityType !== 'none' &&
			((effectiveTeam === 'west' && isAllied) || (effectiveTeam === 'east' && isOpponent))
	);
	let showOnRight = $derived(
		activeEntityType !== 'none' &&
			((effectiveTeam === 'west' && isOpponent) || (effectiveTeam === 'east' && isAllied))
	);

	const HOTKEYS = ['Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F', 'Z', 'X', 'C'];
	const WC3_HOTKEYS = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'Z', 'X', 'C'];

	function handleKeydown(e: KeyboardEvent) {
		if (isEditableTarget(e.target)) return;

		const letter = shortcutLetter(e)?.toUpperCase();
		const digit = shortcutDigit(e);

		if (e.key === 'Escape') {
			if (selectedBuildingId) {
				onSelectBuilding(null);
				return;
			}
			onClearSelection?.();
			return;
		}

		if (isSpectator) return;

		// Castle cannon hotkeys 1, 2, 3 when friendly castle is selected
		if (
			activeEntityType === 'castle' &&
			selectedCastle &&
			selectedCastle.team === effectiveTeam &&
			!e.altKey &&
			!e.ctrlKey &&
			digit !== null
		) {
			if (digit === 1 || digit === 2 || digit === 3) {
				const mode = digit === 1 ? 'short' : 'long';
				const canRun =
					digit === 3
						? sim.canUpgradeCastleCannon(player.team, player)
						: sim.canFireCastleCannon(player.team, mode, player);
				if (!canRun) {
					sound.playErrorResource();
					return;
				}
				const type = digit === 3 ? 'UPGRADE_CASTLE_CANNON' : 'CASTLE_SHOT';
				const payload =
					digit === 3
						? { team: player.team, playerSlot: player.slot }
						: { team: player.team, playerSlot: player.slot, targetId: mode };
				if (!routeBattleCommand?.(type, payload)) {
					if (digit === 3) sim.upgradeCastleCannon(player.team, player);
					else sim.fireCastleCannon(player.team, mode, player);
				}
				return;
			}
		}

		// Upgrades 1..9 for selected placed building
		if (placedBuilding && availableUpgrades.length > 0 && digit !== null) {
			if (digit >= 1 && digit <= availableUpgrades.length) {
				const up = availableUpgrades[digit - 1];
				onUpgradeBuilding?.(placedBuilding.instanceId, up.id);
				return;
			}
		}

		if (settings.controlPreset === 'islands-of-nonsense') {
			let targetIdx: number | null = null;
			if (digit !== null) {
				if (digit >= 1 && digit <= 9) targetIdx = digit - 1;
				else if (digit === 0) targetIdx = 9;
			} else if (e.key === '-' || e.key === '_') {
				targetIdx = 10;
			} else if (e.key === '=' || e.key === '+') {
				targetIdx = 11;
			} else if (letter === 'V') {
				targetIdx = 12;
			}

			if (
				targetIdx !== null &&
				targetIdx < availableBuildings.length &&
				(activeEntityType === 'worker' || activeEntityType === 'none')
			) {
				const bld = availableBuildings[targetIdx];
				onSelectBuilding(selectedBuildingId === bld.id ? null : bld.id);
				return;
			}
		} else {
			// Hotkeys Q..C for command card in worker or unselected mode
			if (letter) {
				const idx =
					WC3_HOTKEYS.indexOf(letter) !== -1
						? WC3_HOTKEYS.indexOf(letter)
						: HOTKEYS.indexOf(letter);
				if (
					idx !== -1 &&
					idx < availableBuildings.length &&
					(activeEntityType === 'worker' || activeEntityType === 'none')
				) {
					const bld = availableBuildings[idx];
					onSelectBuilding(selectedBuildingId === bld.id ? null : bld.id);
					return;
				}
			}
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#snippet portraitSnippet()}
	<!-- 2. Entity Portrait & Health / Mana Vital Bars -->
	<div
		data-testid="hud-portrait-panel"
		class="flex flex-col items-center {activeEntityType === 'worker'
			? 'justify-center p-2'
			: 'justify-between px-3 py-2'} bg-[#131722]/95 backdrop-blur-md rounded-t-xl rounded-b-none border-t-2 border-x-2 border-b-0 {entityTeam ===
		'neutral'
			? 'border-purple-600/80 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
			: isOpponent
				? 'border-rose-900/80 shadow-rose-950/50'
				: 'border-[#544738]'} shadow-inner shrink-0 w-36 h-[142px] pointer-events-auto"
		style="box-shadow: inset 0 0 10px rgba(0,0,0,0.8);"
	>
		<!-- Stone Arch Portrait Frame -->
		<div
			class="relative {activeEntityType === 'worker'
				? 'w-full h-full'
				: 'w-full flex-1 min-h-0'} rounded-md border-2 border-[#8c7456] bg-[#0c1017] flex items-center justify-center overflow-hidden shadow-md"
		>
			<EntityPortrait
				entityType={activeEntityType}
				{player}
				{localTeam}
				{selectedUnit}
				{placedBuilding}
				buildingRace={placedBuilding
					? resolveBuildingDisplayRace(placedBuilding, sim.allPlayers, sim.players)
					: player.race}
				{selectedCastle}
			/>

			<!-- Level 1 Badge in corner -->
			<div
				class="absolute bottom-0 right-0 bg-[#2a241b] border-t border-l border-[#8c7456] px-1 text-[8px] text-[#fef08a] font-mono font-bold"
			>
				{activeEntityType === 'group' ? groupUnits.length : 1}
			</div>
		</div>

		<!-- Vital Bars (Hidden for worker and unselected) -->
		{#if activeEntityType !== 'worker' && activeEntityType !== 'none'}
			<div class="w-full mt-2 flex flex-col gap-1">
				<!-- Health Bar -->
				<div
					class="relative w-full h-4 bg-[#0c1017] rounded border border-[#3b3226] overflow-hidden flex items-center justify-center shadow-inner"
				>
					{#if activeEntityType === 'castle' && selectedCastle}
						{@const cHp = selectedCastle.hp}
						{@const cMaxHp = selectedCastle.maxHp}
						{@const cPct = Math.max(0, Math.min(100, (cHp / cMaxHp) * 100))}
						{@const isFriendly = selectedCastle.team === localTeam}
						<div
							class="absolute left-0 top-0 bottom-0 {isFriendly
								? 'bg-[#22c55e]'
								: 'bg-[#ef4444]'} transition-all"
							style="width: {cPct}%"
						></div>
						<span class="relative z-10 text-[9px] font-mono font-bold text-white drop-shadow">
							{Math.ceil(cHp)} / {Math.round(cMaxHp)}
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
							{Math.ceil(totalHp)} / {Math.round(totalMaxHp)}
						</span>
					{:else if activeEntityType === 'building' && placedBuilding}
						{@const bHp = placedBuilding.hp ?? placedBuilding.goldCost * 4}
						{@const bMaxHp = placedBuilding.maxHp ?? placedBuilding.goldCost * 4}
						{@const bPct = Math.max(0, Math.min(100, (bHp / bMaxHp) * 100))}
						{@const isEnemyBld = placedBuilding.team !== localTeam}
						<div
							class="absolute left-0 top-0 bottom-0 {isEnemyBld
								? 'bg-[#ef4444]'
								: 'bg-[#22c55e]'} transition-all"
							style="width: {bPct}%"
						></div>
						<span class="relative z-10 text-[9px] font-mono font-bold text-white drop-shadow">
							{Math.ceil(bHp)} / {Math.round(bMaxHp)}
						</span>
					{:else if activeEntityType === 'unit' && selectedUnit}
						{@const isEnemy = selectedUnit.team !== localTeam && selectedUnit.team !== 'neutral'}
						{@const hpPct = Math.max(
							0,
							Math.min(100, (selectedUnit.hp / selectedUnit.maxHp) * 100)
						)}
						<div
							class="absolute left-0 top-0 bottom-0 {isEnemy
								? 'bg-[#ef4444]'
								: selectedUnit.team === 'neutral'
									? 'bg-[#a855f7]'
									: 'bg-[#22c55e]'} transition-all"
							style="width: {hpPct}%"
						></div>
						<span class="relative z-10 text-[9px] font-mono font-bold text-white drop-shadow">
							{Math.ceil(selectedUnit.hp)} / {Math.round(selectedUnit.maxHp)}
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
		{/if}
	</div>
{/snippet}

{#snippet statsSnippet()}
	<!-- 3. CENTER: Entity Stats & Characteristics Panel -->
	<div
		data-testid="hud-stats-panel"
		class="relative {activeEntityType === 'worker'
			? 'w-40 shrink-0'
			: 'w-fit shrink-0 max-w-[420px]'} flex flex-col justify-between px-4 py-2 bg-[#131722]/95 backdrop-blur-md rounded-t-xl rounded-b-none border-t-2 border-x-2 border-b-0 {entityTeam ===
		'neutral'
			? 'border-purple-600/80 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
			: isOpponent
				? 'border-rose-900/80 shadow-rose-950/50'
				: 'border-[#544738]'} shadow-inner h-[142px] overflow-visible pointer-events-auto"
		style="box-shadow: inset 0 0 10px rgba(0,0,0,0.8);"
	>
		<EntityInspectDetails
			{sim}
			{uiTick}
			{activeEntityType}
			{selectedCastle}
			{placedBuilding}
			{placedUnit}
			{selectedUnit}
			{worker}
			{player}
			{groupUnits}
			{groupBreakdown}
			{onClearSelection}
			onCloseBuilding={() => (selectedPlacedBuildingId = null)}
			onCloseUnit={() => (selectedUnitId = null)}
		/>
	</div>
{/snippet}

{#snippet inventorySnippet()}
	<!-- 4. CENTER-RIGHT: Authentic Warcraft III 6-Slot Inventory -->
	<div
		data-testid="hud-inventory-panel"
		class="flex flex-col items-center justify-center p-1.5 bg-[#131722]/95 backdrop-blur-md rounded-t-xl rounded-b-none border-t-2 border-x-2 border-b-0 border-[#544738] shadow-inner shrink-0 w-28 h-[142px] pointer-events-auto"
		style="box-shadow: inset 0 0 10px rgba(0,0,0,0.85);"
	>
		<!-- 2 columns x 3 rows grid of enlarged authentic Warcraft III leather inventory pouches -->
		<div class="grid grid-cols-2 gap-1.5 my-auto">
			{#each [0, 1, 2, 3, 4, 5] as slotIdx}
				{@const slotItem = uiTick >= 0 ? (worker?.inventory?.[slotIdx] ?? null) : null}
				{@const isTargetingThis = itemTargetingSlot === slotIdx}
				<button
					type="button"
					data-testid="hud-inventory-slot-{slotIdx}"
					onclick={(e) => {
						if (isSpectator) return;
						if (itemTargetingSlot !== null) {
							if (itemTargetingSlot === slotIdx) {
								itemTargetingSlot = null;
							} else {
								onSwapInventorySlots?.(itemTargetingSlot, slotIdx);
								itemTargetingSlot = null;
							}
						} else if (slotItem) {
							if (slotItem.activeAbility && !e.shiftKey) {
								onUseWorkerItem?.(slotIdx);
							} else {
								itemTargetingSlot = slotIdx;
							}
						}
					}}
					oncontextmenu={(e) => {
						e.preventDefault();
						if (isSpectator || !slotItem) return;
						itemTargetingSlot = null;
						onQuickDropItem?.(slotIdx);
					}}
					class="relative group/tip w-[44px] h-[39px] rounded-[3px] bg-gradient-to-b from-[#18130d] to-[#0d0a07] border flex items-center justify-center text-xs shadow-inner cursor-pointer transition touch-manipulation {isTargetingThis
						? 'border-amber-400 ring-2 ring-amber-400/50 bg-amber-950/40'
						: slotItem
							? 'border-[#8c7456] hover:border-amber-400'
							: 'border-[#5c4934] hover:border-[#8c7456]'}"
					aria-label={slotItem
						? `${slotItem.name} (${slotItem.description})`
						: 'Порожній слот торби'}
				>
					<div
						class="pointer-events-none absolute bottom-full mb-2 right-0 z-50 w-max max-w-[min(240px,calc(100vw-24px))] whitespace-normal text-left leading-snug rounded-md border border-[#544738] bg-[#0f141f]/95 px-2.5 py-1.5 text-[11px] text-amber-100 shadow-2xl opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150"
					>
						{#if slotItem}
							<div class="font-bold text-amber-300">{slotItem.name}</div>
							<div class="text-slate-200 mt-0.5">{slotItem.description}</div>
							<div class="text-[10px] text-slate-400 mt-1 border-t border-[#3b3226] pt-1">
								{#if slotItem.activeAbility}
									ЛКМ: активувати · Shift+ЛКМ: передати · ПКМ: скинути
								{:else}
									ЛКМ: передати/викласти · ПКМ: скинути
								{/if}
							</div>
						{:else if itemTargetingSlot !== null}
							Перемістити предмет у слот {slotIdx + 1}
						{:else}
							Порожній слот торби
						{/if}
					</div>
					{#if slotItem}
						{@const itemCd = Math.ceil(slotItem.cooldownRemaining ?? 0)}
						{#if slotItem.id === 'I006'}
							<UiIcon name="sparkles" class="w-5 h-5 text-sky-400 drop-shadow" />
						{:else if slotItem.id === 'I001'}
							<UiIcon name="wand2" class="w-5 h-5 text-violet-400 drop-shadow" />
						{:else if slotItem.id === 'I002'}
							<UiIcon name="wand2" class="w-5 h-5 text-fuchsia-400 drop-shadow" />
						{:else}
							<!-- Golden Cheese SVG Icon (Food Cap Item) -->
							<svg
								class="w-5.5 h-5.5 text-amber-400 drop-shadow"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<path d="M2.5 12.5c4-2 15-4 19-2v6c0 1.1-.9 2-2 2H4.5c-1.1 0-2-.9-2-2v-4z" />
								<path
									d="M11 6c-2 0-3 1.5-3 2.5 0 1 .5 1.5 1.5 2 2.5-1 6.5-1.5 9-1.5C18 7.5 15.5 6 11 6z"
									opacity="0.8"
								/>
								<circle cx="8" cy="15" r="1.2" fill="#18130d" />
								<circle cx="14" cy="14" r="1.5" fill="#18130d" />
								<circle cx="17" cy="16.5" r="1" fill="#18130d" />
							</svg>
						{/if}
						{#if itemCd > 0}
							<div
								class="absolute inset-0 bg-black/75 flex items-center justify-center text-[11px] font-mono font-bold text-sky-300 rounded-[2px]"
							>
								{itemCd}
							</div>
						{/if}
					{:else}
						<UiIcon name="lock" class="w-5 h-5 text-[#5c4934] opacity-80" />
					{/if}
				</button>
			{/each}
		</div>
	</div>
{/snippet}

{#snippet commandCardSnippet()}
	<!-- 5. RIGHT: Command Card Grid (Меню дій / будівництва) -->
	<div class="pointer-events-auto shrink-0">
		<CommandCard
			{sim}
			{uiTick}
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
			{onOpenCommander}
			{isBlinkTargeting}
			{onStartBlinkTargeting}
			{onClearSelection}
			{onHoverCastleRange}
			onCloseBuilding={() => (selectedPlacedBuildingId = null)}
			onCloseUnit={() => (selectedUnitId = null)}
		/>
	</div>
{/snippet}

<!-- Authentic Floating HUD Bottom Console (No solid background shelf) -->
<div
	data-testid="bottom-bar"
	class="absolute bottom-0 left-0 right-0 px-3 flex items-center justify-center gap-2.5 text-white select-none z-20 pointer-events-none transition-all duration-300"
>
	{#if settings.uiLayoutPreset === 'warcraft3'}
		<!-- Authentic Warcraft III HUD: Left Minimap, Center/Right Action Panels -->
		<div class="w-full flex items-end justify-start gap-2.5 pointer-events-none">
			<!-- 1. LEFT: Interactive Real-time Minimap flush to bottom -->
			<div class="flex items-center shrink-0 pointer-events-auto self-end">
				<Minimap {sim} {uiTick} {cameraX} {cameraY} {zoom} {onMinimapClick} {touchControls} />
			</div>

			<!-- Action & Inspect Panels: slide down smoothly when unselected -->
			<div
				class="flex items-end gap-2.5 transition-all duration-300 ease-out {activeEntityType ===
				'none'
					? 'translate-y-[170%] opacity-0 pointer-events-none invisible'
					: 'translate-y-0 opacity-100 pointer-events-auto'}"
			>
				{@render portraitSnippet()}
				{@render statsSnippet()}
				{#if activeEntityType === 'worker'}
					{@render inventorySnippet()}
				{/if}
				{#if activeEntityType !== 'unit' && activeEntityType !== 'group' && !isSpectator}
					{@render commandCardSnippet()}
				{/if}
			</div>
		</div>
	{:else}
		<!-- Islands of Nonsense Modern HUD: Minimap Centered, Left (Player/Allied) vs Right (Enemy/Boss) -->
		<div class="w-full flex items-end justify-between gap-2.5 pointer-events-none">
			<!-- Left Cluster (Player/Allied if localTeam='west', Opponent if localTeam='east') -->
			<div
				class="flex-1 flex items-end justify-end gap-2.5 transition-all duration-300 ease-out {showOnLeft
					? 'translate-y-0 opacity-100 pointer-events-auto'
					: 'translate-y-[170%] opacity-0 pointer-events-none invisible'}"
			>
				{#if showOnLeft}
					{#if activeEntityType === 'worker'}
						{#if !isSpectator}
							{@render commandCardSnippet()}
						{/if}
						{@render inventorySnippet()}
						{@render statsSnippet()}
						{@render portraitSnippet()}
					{:else if activeEntityType === 'unit'}
						{@render statsSnippet()}
						{@render portraitSnippet()}
					{:else}
						{@render statsSnippet()}
						{@render portraitSnippet()}
						{#if !isSpectator}
							{@render commandCardSnippet()}
						{/if}
					{/if}
				{/if}
			</div>

			<!-- Center Minimap: strictly centered and flush to bottom -->
			<div class="flex items-center shrink-0 pointer-events-auto z-30 self-end">
				<Minimap
					{sim}
					{uiTick}
					localTeam={effectiveTeam}
					{cameraX}
					{cameraY}
					{zoom}
					{onMinimapClick}
					{touchControls}
				/>
			</div>

			<!-- Right Cluster (Opponent/Enemy/Boss if localTeam='west', Allied if localTeam='east') -->
			<div
				class="flex-1 flex items-end justify-start gap-2.5 transition-all duration-300 ease-out {showOnRight
					? 'translate-y-0 opacity-100 pointer-events-auto'
					: 'translate-y-[170%] opacity-0 pointer-events-none invisible'}"
			>
				{#if showOnRight}
					{#if activeEntityType === 'worker'}
						{@render portraitSnippet()}
						{@render statsSnippet()}
						{@render inventorySnippet()}
						{#if !isSpectator}
							{@render commandCardSnippet()}
						{/if}
					{:else if activeEntityType === 'unit'}
						{@render portraitSnippet()}
						{@render statsSnippet()}
					{:else}
						{@render portraitSnippet()}
						{@render statsSnippet()}
						{#if !isSpectator}
							{@render commandCardSnippet()}
						{/if}
					{/if}
				{/if}
			</div>
		</div>
	{/if}
</div>
