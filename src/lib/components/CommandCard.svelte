<script lang="ts">
	import { getContext } from 'svelte';
	import type { Simulation } from '../engine/simulation';
	import { BATTLE_COMMAND_ROUTER_KEY, type BattleCommandRouter } from '$lib/net/onlineMatchSetup';
	import type {
		Building,
		BuildingDefinition,
		Unit,
		UnitDefinition,
		PlayerState
	} from '../engine/types';
	import { getUnit, isLegendaryBuilding } from '../engine/gameData';
	import {
		applyCommanderForgeCostDiscount,
		findCommander,
		getCommanderEffectivePct,
		getCommanderName
	} from '../engine/commanders';
	import { sound } from '../services/audio';
	import CooldownOverlay from '$lib/components/ui/CooldownOverlay.svelte';
	import { WORKER_BLINK_COOLDOWN } from '../engine/constants';
	import { t } from '$lib/i18n';
	import { localizeEntityName, localizeShortBuildingName } from '$lib/i18n/entityNames';
	import { getArmorTypeLabel, getAttackTypeLabel } from './CombatMatrixTooltip.svelte';

	const routeBattleCommand = getContext<BattleCommandRouter | undefined>(BATTLE_COMMAND_ROUTER_KEY);

	function dispatchRepair(team: 'west' | 'east', targetId: string) {
		if (!routeBattleCommand?.('REPAIR', { team, playerSlot: player.slot, targetId })) {
			sim.repairBuilding(team, targetId, player);
		}
	}

	function dispatchBuyItem(itemId: string) {
		if (!sim.canBuyCastleItem(player.team, itemId, player)) {
			sound.playErrorResource();
			return;
		}
		if (!routeBattleCommand?.('BUY_ITEM', { team: player.team, playerSlot: player.slot, itemId })) {
			const success = sim.buyCastleItem(player.team, itemId, player);
			if (success) sound.playCoin();
			else sound.playErrorResource();
			return;
		}
		sound.playCoin();
	}

	function dispatchUpgradeForge(forgeType: 'attack' | 'armor' | 'econ') {
		if (
			!routeBattleCommand?.('UPGRADE_FORGE', {
				team: player.team,
				playerSlot: player.slot,
				forgeType
			})
		) {
			const ok = sim.upgradeForge(player.team, forgeType, player);
			if (ok) sound.playForgeUpgrade();
			else sound.playErrorResource();
			return;
		}
		sound.playForgeUpgrade();
	}

	function dispatchCastleAction(
		type: 'CASTLE_SHOT' | 'UPGRADE_CASTLE_CANNON',
		canRun: boolean,
		fallback: () => boolean,
		targetId?: 'short' | 'long'
	) {
		if (!canRun) {
			sound.playErrorResource();
			return;
		}
		if (
			!routeBattleCommand?.(type, {
				team: player.team,
				playerSlot: player.slot,
				...(targetId ? { targetId } : {})
			}) &&
			!fallback()
		) {
			sound.playErrorResource();
		}
	}

	function toggleCastleCannonAuto(mode: 'short' | 'long') {
		const current = sim.castleCannonAutoMode?.[player.team] ?? null;
		const nextAuto: 'short' | 'long' | null = current === mode ? null : mode;
		const targetId =
			nextAuto === 'short' ? 'auto_short' : nextAuto === 'long' ? 'auto_long' : 'auto_off';
		if (
			!routeBattleCommand?.('CASTLE_SHOT', { team: player.team, playerSlot: player.slot, targetId })
		) {
			sim.setCastleCannonAutoMode(player.team, nextAuto, player);
		}
		sound.playUpgrade();
	}

	function getCastleCannonView(_tick: number) {
		const cannonCd = sim.getCastleCannonCooldown(player.team);
		const cannonMaxCd = sim.getCastleCannonEffectiveMaxCooldown(player.team);
		const isOvercharged = sim.castleOverchargeTimer[player.team] > 0;
		const isCannonUpgraded = sim.castleCannonUpgraded[player.team];
		const autoMode = sim.castleCannonAutoMode?.[player.team] ?? null;
		return {
			cannonCd,
			cannonMaxCd,
			isOvercharged,
			isCannonUpgraded,
			autoMode,
			canUpgradeCannon: sim.canUpgradeCastleCannon(player.team, player),
			cannonDmg: isOvercharged ? CASTLE_CANNON_BASE_DAMAGE * 2 : CASTLE_CANNON_BASE_DAMAGE,
			buttons: [
				{
					mode: 'short' as const,
					range: CASTLE_CANNON_SHORT_RANGE,
					hotkey: '1',
					cost: sim.getCastleCannonShotCost(player.team, 'short'),
					enemies: sim.getCastleCannonEnemyCount(player.team, CASTLE_CANNON_SHORT_RANGE, true),
					canFire: sim.canFireCastleCannon(player.team, 'short', player),
					activeCls: 'border-amber-500/80 bg-amber-950/75 hover:bg-amber-900/90 text-amber-100',
					iconCls: 'text-amber-400',
					costCls: 'text-amber-300'
				},
				{
					mode: 'long' as const,
					range: CASTLE_CANNON_LONG_RANGE,
					hotkey: '2',
					cost: sim.getCastleCannonShotCost(player.team, 'long'),
					enemies: sim.getCastleCannonEnemyCount(player.team, CASTLE_CANNON_LONG_RANGE, true),
					canFire: sim.canFireCastleCannon(player.team, 'long', player),
					activeCls: 'border-sky-500/80 bg-sky-950/75 hover:bg-sky-900/90 text-sky-100',
					iconCls: 'text-sky-400',
					costCls: 'text-sky-300'
				}
			]
		};
	}
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import { CASTLE_ITEMS_LIST, type CastleItem } from '../engine/items';
	import {
		CASTLE_CANNON_BASE_DAMAGE,
		CASTLE_CANNON_SHORT_RANGE,
		CASTLE_CANNON_LONG_RANGE,
		CASTLE_CANNON_UPGRADE_GOLD,
		CASTLE_CANNON_UPGRADE_LUMBER
	} from '../engine/constants';
	import { settings } from '../services/settings.svelte';

	let {
		sim,
		uiTick = 0,
		placedBuilding = null,
		placedUnit = null,
		availableUpgrades = [],
		selectedCastle = null,
		selectedUnit: _selectedUnit = null,
		groupUnits: _groupUnits = [],
		availableBuildings = [],
		selectedBuildingId = null,
		activeEntityType,
		player,
		playerGold,
		onSelectBuilding,
		onUpgradeBuilding,
		onSellBuilding,
		onContinueConstruction,
		onOpenCommander,
		isBlinkTargeting = false,
		onStartBlinkTargeting,
		onClearSelection: _onClearSelection,
		onCloseBuilding: _onCloseBuilding,
		onCloseUnit: _onCloseUnit,
		onHoverCastleRange
	}: {
		sim: Simulation;
		uiTick?: number;
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
		isBlinkTargeting?: boolean;
		onSelectBuilding: (id: string | null) => void;
		onUpgradeBuilding?: (instanceId: string, targetDefId: string) => void;
		onSellBuilding?: (instanceId: string) => void;
		onContinueConstruction?: (instanceId: string) => void;
		onOpenCommander?: () => void;
		onStartBlinkTargeting?: () => void;
		onClearSelection?: () => void;
		onCloseBuilding?: () => void;
		onCloseUnit?: () => void;
		onHoverCastleRange?: (mode: 'short' | 'long' | null) => void;
	} = $props();

	let hoveredBuilding = $state<BuildingDefinition | null>(null);
	let hoveredItem = $state<CastleItem | null>(null);
	let hoveredUnit = $derived(hoveredBuilding ? getUnit(hoveredBuilding.unit) : null);

	function formatBuildingTooltip(raw: unknown): string {
		return String(raw ?? '')
			.replace(/\|n/g, '\n')
			.replace(/\|c[0-9a-fA-F]{8}|\|r/g, '')
			.trim();
	}

	const HOTKEYS = ['Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F', 'Z', 'X', 'C', 'Esc'];
	const WC3_HOTKEYS = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'Z', 'X', 'C'];
	const ION_HOTKEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'V'];

	function shortenName(name: string): string {
		const short = localizeShortBuildingName(name, settings.locale);
		return short.length <= 8 ? short : short.slice(0, 7) + '.';
	}

	function getHotkeyForBuilding(bld: BuildingDefinition, index: number): string {
		if (bld.id === 'h008') return 'D';
		if (settings.controlPreset === 'islands-of-nonsense') {
			return ION_HOTKEYS[index] || String(index + 1);
		}
		return WC3_HOTKEYS[index] || HOTKEYS[index] || '';
	}
	const tipClass =
		'lg-hud-tooltip pointer-events-none absolute bottom-full mb-2 z-50 whitespace-nowrap rounded-md border border-[#544738]/80 px-2.5 py-1 text-[11px] text-amber-100 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150';
	const hotkeyCornerClass =
		'absolute top-0 right-0 px-1 py-0.2 rounded-bl-[3px] text-[7.5px] font-mono font-bold leading-none select-none bg-black/70 text-[#fef08a] border-l border-b border-[#544738]/60';

	const buildingUnderConstruction = $derived(
		uiTick >= 0 ? Boolean(placedBuilding?.isUnderConstruction) : false
	);
	const buildingHp = $derived(uiTick >= 0 ? (placedBuilding?.hp ?? 0) : 0);
	const buildingMaxHp = $derived(uiTick >= 0 ? (placedBuilding?.maxHp ?? 1) : 1);
</script>

<div
	data-testid="hud-command-card"
	class="lg-hud-panel relative flex items-center justify-center p-1.5 rounded-t-xl rounded-b-none border-t-2 border-x-2 border-b-0 border-[#544738]/80 shrink-0 h-[142px]"
>
	{#if placedBuilding}
		{#if placedBuilding.team === player.team}
			{#if buildingUnderConstruction}
				<!-- Under Construction: Compact vertical stack -->
				<div class="flex flex-col justify-center gap-2 min-w-[168px] w-full max-w-[210px] px-1">
					<div class="relative group/tip w-full">
						<button
							onclick={() => onContinueConstruction?.(placedBuilding.instanceId)}
							data-testid="hud-continue-construction-btn"
							class="w-full h-11 rounded-lg border border-amber-400/80 bg-gradient-to-b from-amber-900/75 to-amber-950/90 hover:from-amber-800/85 hover:to-amber-900 text-amber-100 flex items-center justify-center gap-2 px-3 transition cursor-pointer touch-manipulation shadow-md"
							style="box-shadow: inset 0 1px 0 rgba(251,191,36,0.25), 0 4px 10px rgba(0,0,0,0.4);"
						>
							<UiIcon name="hammer" class="w-4 h-4 text-amber-300 shrink-0" />
							<span class="text-[11px] font-bold tracking-wide">{t('cmd.finishBuild')}</span>
						</button>
						<div class="{tipClass} left-1/2 -translate-x-1/2">
							{t('cmd.finishBuildTip')}
						</div>
					</div>
					<div class="relative group/tip w-full">
						<button
							onclick={() => onSellBuilding?.(placedBuilding.instanceId)}
							data-testid="hud-cancel-construction-btn"
							class="w-full h-9 rounded-lg border border-rose-500/60 bg-gradient-to-b from-rose-950/80 to-[#1a0b11] hover:from-rose-900/85 hover:to-rose-950 text-rose-200 flex items-center justify-center gap-1.5 px-3 transition cursor-pointer touch-manipulation shadow"
						>
							<UiIcon name="trash2" class="w-3.5 h-3.5 text-rose-400 shrink-0" />
							<span class="text-[10.5px] font-bold">{t('cmd.cancel')}</span>
						</button>
						<div class="{tipClass} left-1/2 -translate-x-1/2">{t('cmd.cancelTip')}</div>
					</div>
				</div>
			{:else if placedBuilding.specialType === 'shop' || placedBuilding.specialType === 'forge' || placedBuilding.specialType === 'commander'}
				<!-- Special Placed Buildings (Shop, Forge, Commander): 4-col grid -->
				<div class="grid grid-cols-4 gap-1.5 w-[280px]">
					{#if placedBuilding.specialType === 'shop'}
						{@const shopItems = CASTLE_ITEMS_LIST.filter(
							(it) => (it.id !== 'I00B' && it.id !== 'I00N') || sim.gameModeConfig?.nuclearWarheads
						)}
						<!-- Placed Shop Building: Consumables Roster -->
						<div class="col-span-4 flex flex-col justify-between w-[280px] h-full py-0.5">
							<div
								class="flex items-center justify-between border-b border-[#3b3226] pb-1 shrink-0"
							>
								<span class="text-[11px] font-bold text-amber-300 flex items-center gap-1">
									<UiIcon name="shoppingBag" class="w-3.5 h-3.5 text-amber-400" />
									{t('cmd.goods')}
								</span>
								<div class="flex items-center gap-1">
									{#if buildingHp < buildingMaxHp}
										<button
											onclick={() => dispatchRepair(placedBuilding.team, placedBuilding.instanceId)}
											data-testid="hud-shop-repair-btn"
											class="px-1.5 py-0.5 rounded text-[8.5px] font-bold border transition bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/70 text-emerald-200 cursor-pointer shadow flex items-center gap-0.5"
										>
											<UiIcon name="wrench" class="w-2.5 h-2.5 text-emerald-400" />
											<span>{t('cmd.repair')}</span>
											<span
												class="px-1 py-0.2 rounded bg-black/60 border border-emerald-500/40 text-emerald-300 font-mono text-[8px] leading-none"
											>
												R
											</span>
										</button>
									{/if}
									<button
										onclick={() => onSellBuilding?.(placedBuilding.instanceId)}
										data-testid="hud-shop-sell-btn"
										class="px-1.5 py-0.5 rounded text-[8.5px] font-bold border transition bg-rose-950/70 hover:bg-rose-900 border-rose-600/70 text-rose-200 cursor-pointer shadow flex items-center gap-0.5"
									>
										<UiIcon name="trash2" class="w-2.5 h-2.5 text-rose-400" />
										<span>{t('cmd.demolishGold', { gold: 25 })}</span>
									</button>
								</div>
							</div>
							<div class="grid grid-cols-4 gap-1 max-h-[105px] overflow-y-auto pr-0.5 pt-0.5">
								{#each shopItems as item}
									{@const cd = uiTick >= 0 ? sim.getItemCooldown(player.team, item.id) : 0}
									{@const canAfford = playerGold >= item.cost}
									{@const canBuy = canAfford && cd <= 0}
									<button
										onclick={() => dispatchBuyItem(item.id)}
										onmouseenter={() => (hoveredItem = item)}
										onmouseleave={() => (hoveredItem = null)}
										disabled={!canBuy}
										data-testid="hud-shop-item-btn-{item.id}"
										class="relative w-16 h-[32px] rounded border flex flex-col justify-between items-center p-0.5 transition cursor-pointer touch-manipulation {canBuy
											? 'bg-[#1b263b] hover:bg-[#253959] border-amber-500/60 text-white shadow'
											: cd > 0
												? 'bg-[#151a24] border-cyan-800/60 text-cyan-400 cursor-not-allowed'
												: 'bg-[#12161f] border-slate-700 text-slate-500 opacity-60 cursor-not-allowed'}"
										aria-label="{settings.locale === 'en'
											? item.nameEn
											: item.nameUk} ({item.cost}g) - {settings.locale === 'en'
											? item.descriptionEn
											: item.descriptionUk}"
									>
										<CooldownOverlay remaining={cd} max={item.cooldown} />
										<span class="text-[8px] font-bold text-slate-200 truncate max-w-[55px]">
											{settings.locale === 'en' ? item.nameEn : item.nameUk}
										</span>
										<span
											class="text-[8px] text-amber-300 font-mono font-bold flex items-center gap-0.5"
										>
											<UiIcon name="coins" class="w-2.5 h-2.5 text-amber-400 shrink-0" />
											<span>{item.cost}</span>
										</span>
									</button>
								{/each}
							</div>
							{#if hoveredItem}
								<div
									class="absolute -top-14 left-2 right-2 bg-[#0c1017] border border-amber-500/80 rounded p-1.5 z-30 shadow-2xl text-[9px] pointer-events-none"
								>
									<div class="flex items-center justify-between font-bold text-amber-300">
										<span>
											{settings.locale === 'en' ? hoveredItem.nameEn : hoveredItem.nameUk}
										</span>
										<span class="font-mono flex items-center gap-1">
											<UiIcon name="coins" class="w-3 h-3 text-amber-400 shrink-0" />
											<span>{hoveredItem.cost}</span>
											<span class="text-slate-400">|</span>
											<span>{t('cmd.cdShort', { sec: hoveredItem.cooldown })}</span>
										</span>
									</div>
									<p class="text-slate-300 text-[8.5px] mt-0.5">
										{settings.locale === 'en'
											? hoveredItem.descriptionEn
											: hoveredItem.descriptionUk}
									</p>
								</div>
							{/if}
						</div>
					{:else if placedBuilding.specialType === 'forge'}
						{@const atkLvl = uiTick >= 0 ? player.forge.attack : 0}
						{@const armLvl = uiTick >= 0 ? player.forge.armor : 0}
						{@const ecoLvl = uiTick >= 0 ? player.forge.econ : 0}
						{@const atkCost = uiTick >= 0 ? sim.getForgePrice(player.team, 'attack', player) : 0}
						{@const armCost = uiTick >= 0 ? sim.getForgePrice(player.team, 'armor', player) : 0}
						{@const ecoCost = uiTick >= 0 ? sim.getForgePrice(player.team, 'econ', player) : 0}
						{@const atkLum =
							uiTick >= 0 ? sim.getForgeLumberPrice(player.team, 'attack', player) : 0}
						{@const armLum =
							uiTick >= 0 ? sim.getForgeLumberPrice(player.team, 'armor', player) : 0}
						{@const ecoLum = uiTick >= 0 ? sim.getForgeLumberPrice(player.team, 'econ', player) : 0}
						{@const canAtk = atkLvl < 5 && playerGold >= atkCost && (player.lumber ?? 0) >= atkLum}
						{@const canArm = armLvl < 5 && playerGold >= armCost && (player.lumber ?? 0) >= armLum}
						{@const canEco = ecoLvl < 3 && playerGold >= ecoCost && (player.lumber ?? 0) >= ecoLum}
						<!-- Placed Forge Building: Upgrades -->
						<div class="col-span-4 flex flex-col justify-between w-[280px] h-full py-0.5">
							<div
								class="flex items-center justify-between border-b border-[#3b3226] pb-1 shrink-0"
							>
								<span class="text-[11px] font-bold text-amber-300 flex items-center gap-1">
									<UiIcon name="hammer" class="w-3.5 h-3.5 text-amber-400" />
									{t('cmd.upgrades')}
								</span>
								<div class="flex items-center gap-1">
									{#if buildingHp < buildingMaxHp}
										<button
											onclick={() => dispatchRepair(placedBuilding.team, placedBuilding.instanceId)}
											data-testid="hud-forge-repair-btn"
											class="px-1.5 py-0.5 rounded text-[8.5px] font-bold border transition bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/70 text-emerald-200 cursor-pointer shadow flex items-center gap-0.5"
										>
											<UiIcon name="wrench" class="w-2.5 h-2.5 text-emerald-400" />
											<span>{t('cmd.repair')}</span>
											<span
												class="px-1 py-0.2 rounded bg-black/60 border border-emerald-500/40 text-emerald-300 font-mono text-[8px] leading-none"
											>
												R
											</span>
										</button>
									{/if}
									<button
										onclick={() => onSellBuilding?.(placedBuilding.instanceId)}
										data-testid="hud-forge-sell-btn"
										class="px-1.5 py-0.5 rounded text-[8.5px] font-bold border transition bg-rose-950/70 hover:bg-rose-900 border-rose-600/70 text-rose-200 cursor-pointer shadow flex items-center gap-0.5"
									>
										<UiIcon name="trash2" class="w-2.5 h-2.5 text-rose-400" />
										<span>{t('cmd.demolishGold', { gold: 50 })}</span>
									</button>
								</div>
							</div>
							<div class="grid grid-cols-3 gap-1.5 pt-1">
								<div class="relative group/tip">
									<button
										onclick={() => dispatchUpgradeForge('attack')}
										disabled={!canAtk}
										class="w-full h-16 rounded border flex flex-col items-center justify-between p-1 transition cursor-pointer {canAtk
											? 'bg-rose-950/60 hover:bg-rose-900/80 border-rose-500/70 text-white shadow'
											: 'bg-[#181d28] border-slate-700 text-slate-500 opacity-60 cursor-not-allowed'}"
									>
										<span class="text-[9.5px] font-bold text-rose-300 flex items-center gap-1">
											<UiIcon name="swords" class="w-3 h-3 text-rose-400 shrink-0" />
											<span>{t('cmd.atkLv', { lv: atkLvl })}</span>
										</span>
										<span class="text-[8px] text-slate-400">{t('cmd.atkBonus')}</span>
										<div
											class="text-[8.5px] font-mono font-bold text-amber-300 flex items-center gap-1"
										>
											{#if atkLvl >= 5}
												<span>{t('cmd.max')}</span>
											{:else}
												<span class="flex items-center gap-0.5">
													<UiIcon name="coins" class="w-2.5 h-2.5 text-amber-400 shrink-0" />
													<span>{atkCost}</span>
												</span>
												{#if atkLum > 0}
													<span class="flex items-center gap-0.5 text-emerald-400">
														<UiIcon name="treePine" class="w-2.5 h-2.5 text-emerald-400 shrink-0" />
														<span>{atkLum}</span>
													</span>
												{/if}
											{/if}
										</div>
									</button>
									<div class="{tipClass} left-0">{t('cmd.atkTip')}</div>
								</div>

								<div class="relative group/tip">
									<button
										onclick={() => dispatchUpgradeForge('armor')}
										disabled={!canArm}
										class="w-full h-16 rounded border flex flex-col items-center justify-between p-1 transition cursor-pointer {canArm
											? 'bg-blue-950/60 hover:bg-blue-900/80 border-blue-500/70 text-white shadow'
											: 'bg-[#181d28] border-slate-700 text-slate-500 opacity-60 cursor-not-allowed'}"
									>
										<span class="text-[9.5px] font-bold text-blue-300 flex items-center gap-1">
											<UiIcon name="shield" class="w-3 h-3 text-blue-400 shrink-0" />
											<span>{t('cmd.armLv', { lv: armLvl })}</span>
										</span>
										<span class="text-[8px] text-slate-400">{t('cmd.armBonus')}</span>
										<div
											class="text-[8.5px] font-mono font-bold text-amber-300 flex items-center gap-1"
										>
											{#if armLvl >= 5}
												<span>{t('cmd.max')}</span>
											{:else}
												<span class="flex items-center gap-0.5">
													<UiIcon name="coins" class="w-2.5 h-2.5 text-amber-400 shrink-0" />
													<span>{armCost}</span>
												</span>
												{#if armLum > 0}
													<span class="flex items-center gap-0.5 text-emerald-400">
														<UiIcon name="treePine" class="w-2.5 h-2.5 text-emerald-400 shrink-0" />
														<span>{armLum}</span>
													</span>
												{/if}
											{/if}
										</div>
									</button>
									<div class="{tipClass} left-1/2 -translate-x-1/2">
										{t('cmd.armTip')}
									</div>
								</div>

								<div class="relative group/tip">
									<button
										onclick={() => dispatchUpgradeForge('econ')}
										disabled={!canEco}
										class="w-full h-16 rounded border flex flex-col items-center justify-between p-1 transition cursor-pointer {canEco
											? 'bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-500/70 text-white shadow'
											: 'bg-[#181d28] border-slate-700 text-slate-500 opacity-60 cursor-not-allowed'}"
									>
										<span class="text-[9.5px] font-bold text-emerald-300 flex items-center gap-1">
											<UiIcon name="coins" class="w-3 h-3 text-emerald-400 shrink-0" />
											<span>{t('cmd.ecoLv', { lv: ecoLvl })}</span>
										</span>
										<span class="text-[8px] text-slate-400">{t('cmd.ecoBonus')}</span>
										<div
											class="text-[8.5px] font-mono font-bold text-amber-300 flex items-center gap-1"
										>
											{#if ecoLvl >= 3}
												<span>{t('cmd.max')}</span>
											{:else}
												<span class="flex items-center gap-0.5">
													<UiIcon name="coins" class="w-2.5 h-2.5 text-amber-400 shrink-0" />
													<span>{ecoCost}</span>
												</span>
												{#if ecoLum > 0}
													<span class="flex items-center gap-0.5 text-emerald-400">
														<UiIcon name="treePine" class="w-2.5 h-2.5 text-emerald-400 shrink-0" />
														<span>{ecoLum}</span>
													</span>
												{/if}
											{/if}
										</div>
									</button>
									<div class="{tipClass} right-0">{t('cmd.ecoTip')}</div>
								</div>
							</div>
						</div>
					{:else if placedBuilding.specialType === 'commander'}
						{@const activeCmd = uiTick >= 0 ? findCommander(player.commander) : null}
						{@const cmdStatus =
							uiTick >= 0
								? sim.canSelectOrChangeCommander(player.team, player)
								: sim.canSelectOrChangeCommander(player.team, player)}
						<!-- Placed Commander Hall: Status & Open Selection -->
						<div class="col-span-4 flex flex-col justify-between w-[280px] h-full py-0.5">
							<div
								class="flex items-center justify-between border-b border-[#3b3226] pb-1 shrink-0"
							>
								<span class="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
									<UiIcon name="crown" class="w-3.5 h-3.5 text-indigo-400" />
									{t('cmd.management')}
								</span>
								<div class="flex items-center gap-1">
									{#if buildingHp < buildingMaxHp}
										<button
											onclick={() => dispatchRepair(placedBuilding.team, placedBuilding.instanceId)}
											data-testid="hud-commander-repair-btn"
											class="px-1.5 py-0.5 rounded text-[8.5px] font-bold border transition bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/70 text-emerald-200 cursor-pointer shadow flex items-center gap-0.5"
										>
											<UiIcon name="wrench" class="w-2.5 h-2.5 text-emerald-400" />
											<span>{t('cmd.repair')}</span>
											<span
												class="px-1 py-0.2 rounded bg-black/60 border border-emerald-500/40 text-emerald-300 font-mono text-[8px] leading-none"
											>
												R
											</span>
										</button>
									{/if}
									<button
										onclick={() => onSellBuilding?.(placedBuilding.instanceId)}
										data-testid="hud-commander-sell-btn"
										class="px-1.5 py-0.5 rounded text-[8.5px] font-bold border transition bg-rose-950/70 hover:bg-rose-900 border-rose-600/70 text-rose-200 cursor-pointer shadow flex items-center gap-0.5"
									>
										<UiIcon name="trash2" class="w-2.5 h-2.5 text-rose-400" />
										<span>
											{t('cmd.demolishGold', { gold: Math.round(placedBuilding.goldCost * 0.5) })}
										</span>
									</button>
								</div>
							</div>
							<div class="flex flex-col gap-1.5 pt-1">
								<div
									class="flex items-center justify-between text-[10px] bg-[#0c1017] px-2 py-1 rounded border border-[#2d3748]"
								>
									<span class="text-slate-400">
										{t('cmd.commanderLabel')}
										<strong class="text-indigo-200 ml-1">
											{#if activeCmd}
												{getCommanderName(activeCmd, settings.locale)}{player.isRandomCommander
													? ' ×2'
													: ''} ({activeCmd.id === 2
													? `-${getCommanderEffectivePct(activeCmd.id, Boolean(player.isRandomCommander))}%`
													: `+${getCommanderEffectivePct(activeCmd.id, Boolean(player.isRandomCommander))}%`})
											{:else}
												{t('cmd.notSelected')}
											{/if}
										</strong>
									</span>
									<span
										class="text-[9px] font-mono {cmdStatus.isFree
											? 'text-emerald-300'
											: 'text-amber-300'}"
									>
										{cmdStatus.isFree
											? t('cmd.free')
											: t('cmd.freeCd', { sec: Math.ceil(cmdStatus.cooldownLeft) })}
									</span>
								</div>
								<button
									type="button"
									onclick={() => onOpenCommander?.()}
									data-testid="hud-open-commander-btn"
									class="w-full py-1.5 px-3 rounded border border-indigo-400/70 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-100 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow"
								>
									<UiIcon name="crown" class="w-3.5 h-3.5 text-indigo-300" />
									<span>{activeCmd ? t('cmd.changeCommander') : t('cmd.pickCommander')}</span>
								</button>
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<!-- Regular Placed Building: Compact vertical stack (saves width & prevents truncation) -->
				<div
					class="flex flex-col justify-center gap-1.5 min-w-[180px] w-full max-w-[240px] max-h-[128px] overflow-y-auto px-1 py-0.5"
				>
					{#each availableUpgrades as up, uIdx}
						{@const upCost = up.upgrade_from
							? (up.gold_cost ?? 200)
							: Math.max(50, (up.gold_cost || 200) - placedBuilding.goldCost)}
						{@const upLumber = up.lumber_cost || 0}
						{@const canAfford = playerGold >= upCost && (player.lumber ?? 0) >= upLumber}
						<div class="relative group/tip w-full shrink-0">
							<button
								onclick={() => onUpgradeBuilding?.(placedBuilding.instanceId, up.id)}
								disabled={!canAfford}
								data-testid="hud-upgrade-btn-{up.id}"
								class="relative w-full min-h-[34px] rounded-lg border flex items-center justify-between gap-2 px-2.5 py-1.5 transition cursor-pointer touch-manipulation {canAfford
									? 'bg-gradient-to-b from-[#1e3a5f] to-[#132540] hover:from-[#254b7a] hover:to-[#1a3459] border-sky-400/75 text-white shadow-md'
									: 'bg-[#151a24] border-slate-700/80 text-slate-500 opacity-65 cursor-not-allowed'}"
							>
								<span class="flex items-center gap-1.5 min-w-0">
									<span
										class="px-1 py-0.5 rounded bg-black/50 border border-[#544738]/80 text-[8.5px] font-mono font-bold leading-none text-[#fef08a] shrink-0"
									>
										{uIdx + 1}
									</span>
									<span class="text-[10.5px] font-bold truncate">
										{localizeEntityName(up.name, settings.locale)}
									</span>
								</span>
								<span class="flex items-center gap-1.5 text-[9.5px] font-mono font-bold shrink-0">
									<span class="text-amber-300 flex items-center gap-0.5">
										<UiIcon name="coins" class="w-3 h-3 text-amber-400 shrink-0" />
										<span>{upCost}</span>
									</span>
									{#if upLumber > 0}
										<span class="text-emerald-400 flex items-center gap-0.5">
											<UiIcon name="treePine" class="w-3 h-3 text-emerald-400 shrink-0" />
											<span>{upLumber}</span>
										</span>
									{/if}
								</span>
							</button>
							<div class="{tipClass} left-1/2 -translate-x-1/2">
								{t('cmd.upgradeTip', {
									name: localizeEntityName(up.name, settings.locale),
									cost: `${upCost}g${upLumber > 0 ? `, ${upLumber}w` : ''}`,
									key: uIdx + 1
								})}
							</div>
						</div>
					{/each}
					{#if buildingHp < buildingMaxHp}
						<div class="relative group/tip w-full shrink-0">
							<button
								onclick={() => dispatchRepair(placedBuilding.team, placedBuilding.instanceId)}
								data-testid="hud-repair-btn"
								class="relative w-full min-h-[30px] rounded-lg border border-emerald-500/70 bg-gradient-to-b from-emerald-950/85 to-[#0b1f17] hover:from-emerald-900/90 hover:to-emerald-950 text-emerald-200 flex items-center justify-between gap-2 px-2.5 py-1 transition cursor-pointer touch-manipulation shadow"
							>
								<span class="text-[10.5px] font-bold flex items-center gap-1.5">
									<UiIcon name="wrench" class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
									<span>{t('cmd.repair')}</span>
								</span>
								<span
									class="px-1 py-0.5 rounded bg-black/50 border border-emerald-500/40 text-[8.5px] font-mono font-bold leading-none text-emerald-300"
								>
									R
								</span>
							</button>
							<div class="{tipClass} left-1/2 -translate-x-1/2">
								{t('cmd.repairTip')}
							</div>
						</div>
					{/if}
					<div class="relative group/tip w-full shrink-0">
						<button
							onclick={() => onSellBuilding?.(placedBuilding.instanceId)}
							data-testid="hud-sell-btn"
							class="relative w-full min-h-[32px] rounded-lg border border-rose-500/65 bg-gradient-to-b from-rose-950/80 to-[#1a0b11] hover:from-rose-900/85 hover:to-rose-950 text-rose-200 flex items-center justify-between gap-2 px-2.5 py-1 transition cursor-pointer touch-manipulation shadow"
						>
							<span class="text-[10.5px] font-bold flex items-center gap-1.5">
								<UiIcon name="trash2" class="w-3.5 h-3.5 text-rose-400 shrink-0" />
								<span>{t('cmd.demolish')}</span>
							</span>
							<span class="text-[10px] text-emerald-300 font-mono font-bold">
								+{Math.floor(placedBuilding.goldCost * 0.5)}g
							</span>
						</button>
						<div class="{tipClass} left-1/2 -translate-x-1/2">
							{t('cmd.demolishTip')}
						</div>
					</div>
				</div>
			{/if}
		{:else}
			<!-- Enemy building inspection: spawned unit combat stats only -->
			<div class="flex flex-col justify-center w-[280px] h-full py-1">
				<div
					class="flex flex-col gap-1.5 text-[10px] text-slate-300 bg-[#0d1017] p-2.5 rounded border border-[#2d3748]"
				>
					{#if placedUnit}
						<div class="flex justify-between">
							<span class="text-slate-400">{t('cmd.atkArmor')}</span>
							<span class="font-mono text-slate-200">
								{placedUnit.damage_base} ({getAttackTypeLabel(
									placedUnit.attack_type || 'normal',
									settings.locale
								)}) / {placedUnit.armor} ({getArmorTypeLabel(
									placedUnit.armor_type || 'medium',
									settings.locale
								)})
							</span>
						</div>
						<div class="flex justify-between">
							<span class="text-slate-400">{t('cmd.hpCd')}</span>
							<span class="font-mono text-emerald-300">
								{Math.round(placedUnit.hp)} HP / {placedBuilding.spawnCooldown}{t(
									'inspect.secSuffix'
								)}
							</span>
						</div>
					{:else}
						<div class="text-slate-400 text-center">{t('cmd.specialEnemyBld')}</div>
					{/if}
				</div>
			</div>
		{/if}
	{:else if activeEntityType === 'castle' && selectedCastle}
		<!-- Castle Cannon Command Card: Everything related to the Cannon -->
		{@const isAlliedCastle = selectedCastle.team === player.team}
		<div class="flex flex-col justify-between w-[270px] h-full py-0.5">
			{#if isAlliedCastle}
				{@const cv = getCastleCannonView(uiTick)}
				<div
					class="flex items-center justify-between gap-2 text-[10px] text-slate-300 bg-gradient-to-r from-amber-950/60 via-[#171d2b] to-[#111622] px-2.5 py-1.5 rounded-md border border-amber-500/35 shadow-inner"
				>
					<div class="flex items-center gap-1.5">
						<UiIcon name="crosshair" class="w-3.5 h-3.5 text-amber-400 shrink-0" />
						<span class="font-bold text-amber-200 tracking-wide">
							{t('cmd.cannonTitle', {
								dmg: cv.cannonDmg,
								over: cv.isOvercharged ? ' ×2!' : ''
							})}
						</span>
					</div>
					<div class="flex items-center gap-1.5">
						<span
							class="inline-block w-1.5 h-1.5 rounded-full {cv.cannonCd > 0
								? 'bg-rose-400'
								: 'bg-emerald-400 animate-pulse'}"
						></span>
						<span
							class="font-mono font-bold {cv.cannonCd > 0
								? 'text-rose-400'
								: cv.isCannonUpgraded
									? 'text-cyan-300'
									: 'text-emerald-400'}"
						>
							{cv.cannonCd > 0
								? `${cv.cannonCd.toFixed(1)}${t('inspect.secSuffix')}`
								: t('cmd.cannonReady', { sec: cv.cannonMaxCd.toFixed(1) })}
						</span>
					</div>
				</div>
				{@const castleBtn =
					'w-full h-11 rounded-md border flex flex-col items-center justify-center p-0.5 overflow-hidden transition cursor-pointer shadow-md'}
				{@const disabledCastleBtn =
					'border-slate-700/80 bg-[#121722] text-slate-500 opacity-55 cursor-not-allowed'}
				<div class="grid grid-cols-3 gap-1.5 pt-0.5">
					{#each cv.buttons as btn, bIdx (btn.mode)}
						{@const isAuto = cv.autoMode === btn.mode}
						<div class="relative group/tip">
							<button
								type="button"
								onclick={() =>
									dispatchCastleAction(
										'CASTLE_SHOT',
										btn.canFire,
										() => sim.fireCastleCannon(player.team, btn.mode, player).fired,
										btn.mode
									)}
								oncontextmenu={(e) => {
									e.preventDefault();
									toggleCastleCannonAuto(btn.mode);
								}}
								onmouseenter={() => onHoverCastleRange?.(btn.mode)}
								onmouseleave={() => onHoverCastleRange?.(null)}
								disabled={!btn.canFire && !isAuto}
								data-testid="hud-castle-shot-{btn.mode}-btn"
								aria-label={t('cmd.cannonBtnAria', {
									range: btn.range,
									cost: btn.cost,
									key: btn.hotkey
								})}
								class="relative {castleBtn} {btn.canFire
									? btn.activeCls
									: disabledCastleBtn} {isAuto ? 'ring-2 ring-amber-400/85 border-amber-300' : ''}"
							>
								<span class="text-[9.5px] font-bold flex items-center gap-0.5 leading-none">
									<UiIcon name="crosshair" class="w-3 h-3 {btn.iconCls}" />
									{btn.range}px
								</span>
								<span
									class="text-[8.5px] font-mono {btn.costCls} font-bold flex items-center gap-1.5 mt-0.5"
								>
									<span>{btn.cost}g</span>
									<span
										class="inline-flex items-center gap-0.5 {btn.enemies > 0
											? 'text-rose-300'
											: 'text-slate-400'}"
									>
										<UiIcon name="swords" class="w-2.5 h-2.5" />
										{btn.enemies}
									</span>
								</span>
								<span class={hotkeyCornerClass}>
									{btn.hotkey}
								</span>
								{#if isAuto}
									<span
										data-testid="hud-castle-auto-{btn.mode}-badge"
										class="absolute bottom-0 right-0 px-1 py-0.2 rounded-tl-[3px] text-[6.5px] font-mono font-black leading-none bg-amber-400 text-slate-950 animate-pulse"
									>
										AUTO
									</span>
								{/if}
							</button>
							<div class="{tipClass} {bIdx === 0 ? 'left-0' : 'left-1/2 -translate-x-1/2'}">
								{t('cmd.cannonBtnTip', {
									range: btn.range,
									cost: btn.cost,
									key: btn.hotkey,
									auto: isAuto ? t('cmd.autoDisable') : t('cmd.autoEnable')
								})}
							</div>
						</div>
					{/each}

					{#if !cv.isCannonUpgraded}
						<div class="relative group/tip">
							<button
								type="button"
								onclick={() =>
									dispatchCastleAction('UPGRADE_CASTLE_CANNON', cv.canUpgradeCannon, () =>
										sim.upgradeCastleCannon(player.team, player)
									)}
								disabled={!cv.canUpgradeCannon}
								data-testid="hud-castle-cannon-upgrade-btn"
								aria-label={t('cmd.cannonUpgradeAria', {
									gold: CASTLE_CANNON_UPGRADE_GOLD,
									lumber: CASTLE_CANNON_UPGRADE_LUMBER
								})}
								class="relative {castleBtn} {cv.canUpgradeCannon
									? 'border-cyan-500/80 bg-cyan-950/75 hover:bg-cyan-900/90 text-cyan-100'
									: disabledCastleBtn}"
							>
								<span class="text-[9.5px] font-bold flex items-center gap-0.5 leading-none">
									<UiIcon name="zap" class="w-3 h-3 text-cyan-400" />
									{t('cmd.cannonUpgradeShort')}
								</span>
								<span class="text-[8px] font-mono text-cyan-300 font-bold mt-0.5">
									{CASTLE_CANNON_UPGRADE_GOLD}g/{CASTLE_CANNON_UPGRADE_LUMBER}w
								</span>
								<span class={hotkeyCornerClass}>3</span>
							</button>
							<div class="{tipClass} right-0">
								{t('cmd.cannonUpgradeTip', {
									gold: CASTLE_CANNON_UPGRADE_GOLD,
									lumber: CASTLE_CANNON_UPGRADE_LUMBER
								})}
							</div>
						</div>
					{:else}
						<div class="relative group/tip">
							<div
								data-testid="hud-castle-cannon-upgraded-badge"
								class="relative w-full h-11 rounded-md border border-cyan-600/50 bg-cyan-950/40 text-cyan-300 flex flex-col items-center justify-center p-0.5 overflow-hidden"
							>
								<span class={hotkeyCornerClass}>3</span>
								<UiIcon name="zap" class="w-3 h-3 text-cyan-400" />
								<span class="text-[8.5px] font-bold flex items-center gap-0.5">
									{t('cmd.cannonUpgradeShort')}
									<UiIcon name="check" class="w-2.5 h-2.5 text-emerald-400" />
								</span>
							</div>
							<div class="{tipClass} right-0">{t('cmd.cannonUpgradedTip')}</div>
						</div>
					{/if}
				</div>
				<div class="text-[9.5px] text-slate-400 flex items-center justify-between px-0.5">
					<span>{t('cmd.defenseRangeHint')}</span>
					<span>{t('cmd.rmbAutocast')}</span>
				</div>
			{:else}
				{@const enemyCannonCd =
					uiTick >= 0 ? sim.getCastleCannonEffectiveMaxCooldown(selectedCastle.team) : 2.0}
				<div
					class="flex flex-col gap-1.5 text-[10px] text-slate-300 bg-[#0d1017] p-2.5 rounded border border-[#2d3748] my-auto"
				>
					<div class="flex justify-between">
						<span class="text-slate-400">{t('cmd.cannonPower')}</span>
						<span class="font-mono text-amber-300 font-bold">
							{t('cmd.cannonPowerVal', { dmg: CASTLE_CANNON_BASE_DAMAGE })}
						</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">{t('cmd.defenseRangeLabel')}</span>
						<span class="font-mono text-slate-200">500 / 1500 px</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">{t('cmd.cannonCdLabel')}</span>
						<span class="font-mono text-slate-200">
							{enemyCannonCd.toFixed(1)}
							{t('inspect.secSuffix')}
						</span>
					</div>
				</div>
			{/if}
		</div>
	{:else if activeEntityType === 'worker'}
		<!-- 5x3 Grid for Base Buildings + Bridge Repair (15 slots max, Esc/RMB cancels) -->
		<div class="grid grid-cols-5 gap-1.5 w-[325px]">
			{#each availableBuildings as bld, idx}
				{@const isSelected = selectedBuildingId === bld.id}
				{@const bldLumber = bld.lumber_cost || 0}
				{@const effectiveGoldCost = applyCommanderForgeCostDiscount(
					bld.gold_cost || 200,
					bld.specialType === 'forge',
					player
				)}
				{@const isAffordable = playerGold >= effectiveGoldCost && (player.lumber ?? 0) >= bldLumber}
				{@const isLeg = isLegendaryBuilding(bld)}
				{@const lacksFood = isLeg && player.food >= player.maxFood}
				{@const hotkey = getHotkeyForBuilding(bld, idx)}
				{@const bUnit = getUnit(bld.unit)}

				<button
					onclick={() => onSelectBuilding(isSelected ? null : bld.id)}
					onmouseenter={() => (hoveredBuilding = bld)}
					onmouseleave={() => (hoveredBuilding = null)}
					data-testid="hud-build-btn-{bld.id}"
					class="relative w-[61px] h-[39px] rounded-[3px] border p-0.5 transition-all flex items-center justify-center overflow-hidden cursor-pointer touch-manipulation {isSelected
						? 'bg-blue-600/90 border-amber-300 shadow-lg ring-2 ring-amber-400 shadow-blue-500/50'
						: lacksFood
							? 'bg-red-950/40 border-red-800/80 hover:border-red-600'
							: isAffordable
								? 'bg-[#1b2230] hover:bg-[#28354d] border-[#544738] hover:border-[#8c7456]'
								: 'bg-[#12161f] border-[#2d3748] opacity-50 grayscale cursor-not-allowed'}"
					aria-label="{bld.name} ({effectiveGoldCost}g{bldLumber > 0
						? `, ${bldLumber}w`
						: ''}) {hotkey}"
				>
					<!-- Archetype icon in top-left corner -->
					<div
						class="absolute top-0.5 left-0.5 flex items-center justify-center pointer-events-none"
					>
						{#if bld.specialType === 'shop'}
							<UiIcon name="shoppingBag" class="w-3 h-3 text-amber-300 drop-shadow" />
						{:else if bld.specialType === 'forge'}
							<UiIcon name="hammer" class="w-3 h-3 text-cyan-300 drop-shadow" />
						{:else if bld.specialType === 'commander'}
							<UiIcon name="crown" class="w-3 h-3 text-indigo-300 drop-shadow" />
						{:else if bld.id === 'h008'}
							<UiIcon name="package" class="w-3 h-3 text-amber-400 drop-shadow" />
						{:else if isLeg}
							<UiIcon name="crown" class="w-3 h-3 text-amber-300 drop-shadow animate-pulse" />
						{:else if bld.specialType === 'tower'}
							<UiIcon name="shieldAlert" class="w-3 h-3 text-cyan-400 drop-shadow" />
						{:else if bld.specialType === 'special' || bld.specialType === 'repair' || bld.specialType === 'recycler'}
							<UiIcon name="zap" class="w-3 h-3 text-purple-400 drop-shadow" />
						{:else if bUnit?.flying}
							<UiIcon name="feather" class="w-3 h-3 text-sky-300 drop-shadow" />
						{:else if bUnit?.attack_type === 'pierce'}
							<UiIcon name="crosshair" class="w-3 h-3 text-emerald-400 drop-shadow" />
						{:else if bUnit?.attack_type === 'magic'}
							<UiIcon name="sparkles" class="w-3 h-3 text-indigo-300 drop-shadow" />
						{:else}
							<UiIcon name="swords" class="w-3 h-3 text-amber-200 drop-shadow" />
						{/if}
					</div>

					<!-- Hotkey in top-right corner (no square brackets) -->
					<span
						class="absolute top-0 right-0 px-1 py-0.2 rounded-bl-[3px] text-[7.5px] font-mono font-bold leading-none select-none {isSelected
							? 'bg-amber-400 text-black'
							: isAffordable
								? 'bg-black/70 text-[#fef08a] border-l border-b border-[#544738]/60'
								: 'bg-black/50 text-slate-500'}"
					>
						{hotkey}
					</span>

					<!-- Gold cost in bottom-left corner: icon then amount -->
					<div
						class="absolute bottom-0 left-0 flex items-center gap-0.5 px-0.5 py-0.2 rounded-tr-[3px] text-[7.5px] font-mono font-bold leading-none select-none {isSelected
							? 'bg-black/70 text-amber-300'
							: playerGold >= effectiveGoldCost
								? 'bg-black/70 text-amber-300 border-t border-r border-[#544738]/60'
								: 'bg-red-950/90 text-red-400 border-t border-r border-red-800/60'}"
					>
						<UiIcon name="coins" class="w-2.5 h-2.5 text-amber-400 shrink-0" />
						<span>{effectiveGoldCost}</span>
					</div>

					<!-- Lumber cost in bottom-right corner: amount then icon -->
					{#if bldLumber > 0}
						<div
							class="absolute bottom-0 right-0 flex items-center gap-0.5 px-0.5 py-0.2 rounded-tl-[3px] text-[7.5px] font-mono font-bold leading-none select-none {isSelected
								? 'bg-black/70 text-emerald-300'
								: (player.lumber ?? 0) >= bldLumber
									? 'bg-black/70 text-emerald-400 border-t border-l border-[#544738]/60'
									: 'bg-red-950/90 text-red-400 border-t border-l border-red-800/60'}"
						>
							<span>{bldLumber}</span>
							<UiIcon name="treePine" class="w-2.5 h-2.5 text-emerald-400 shrink-0" />
						</div>
					{/if}

					<!-- Centered building name label: unclipped and cleanly positioned in the center -->
					<span
						class="text-[8px] font-bold text-center truncate max-w-[46px] leading-tight select-none pointer-events-none px-0.5 {isSelected
							? 'text-white'
							: isAffordable
								? 'text-slate-200'
								: 'text-slate-500'}"
					>
						{shortenName(bld.name)}
					</span>
				</button>
			{/each}

			<!-- Slot 15: Bridge Repair when a bridge is broken -->
			{#if onStartBlinkTargeting && activeEntityType === 'worker'}
				{@const blinkCd = uiTick >= 0 ? (player.worker?.blinkCooldown ?? 0) : 0}
				{@const canBlink = blinkCd <= 0}
				<div class="relative group/tip">
					<button
						type="button"
						onclick={() => onStartBlinkTargeting?.()}
						disabled={!canBlink}
						data-testid="hud-worker-blink-btn"
						aria-label={t('cmd.blinkAria')}
						class="relative w-[61px] h-[39px] rounded-[3px] border transition flex items-center justify-center overflow-hidden cursor-pointer touch-manipulation {isBlinkTargeting
							? 'bg-cyan-600/80 border-cyan-300 text-white ring-2 ring-cyan-400 shadow-lg'
							: canBlink
								? 'bg-cyan-950/75 hover:bg-cyan-900 border-cyan-500/70 text-cyan-200 shadow'
								: 'bg-slate-900/60 border-slate-700 text-slate-500 opacity-60 cursor-not-allowed'}"
					>
						<span class={hotkeyCornerClass}>F</span>
						<CooldownOverlay remaining={blinkCd} max={WORKER_BLINK_COOLDOWN} />
						<div class="flex flex-col items-center justify-center pointer-events-none">
							<UiIcon name="zap" class="w-3 h-3 text-cyan-300 drop-shadow" />
							<span class="text-[7.5px] font-bold leading-none mt-0.5">{t('cmd.blinkShort')}</span>
						</div>
					</button>
					<div class="{tipClass} right-0">
						{blinkCd > 0 ? t('cmd.blinkCdTip', { sec: blinkCd.toFixed(1) }) : t('cmd.blinkTip')}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Floating Authentic Warcraft III Tooltip on Hover (Matches Reference Image 2) -->
	{#if hoveredBuilding}
		{@const bld = hoveredBuilding}
		{@const bIndex = availableBuildings.findIndex((b) => b.id === bld.id)}
		{@const bHotkey = getHotkeyForBuilding(bld, bIndex >= 0 ? bIndex : 0)}
		<div
			class="lg-hud-tooltip absolute bottom-full right-0 mb-3 w-80 border-2 border-[#b89758]/80 rounded-xl p-3 text-xs pointer-events-none z-50 text-slate-100"
		>
			<!-- Gold Title + Hotkey -->
			<div class="text-[#fef08a] font-bold text-sm leading-tight flex items-center justify-between">
				<span>{t('cmd.buildName', { name: localizeEntityName(bld.name, settings.locale) })}</span>
				{#if bHotkey}
					<span class="text-xs font-mono font-bold text-amber-400">{bHotkey}</span>
				{/if}
			</div>

			<!-- Resource Cost Line -->
			<div class="flex items-center gap-3 font-mono font-bold text-xs mt-1">
				<span class="text-amber-300 flex items-center gap-1">
					<UiIcon name="coins" class="w-3.5 h-3.5 text-amber-400" />
					<span>
						{applyCommanderForgeCostDiscount(
							hoveredBuilding.gold_cost || 200,
							hoveredBuilding.specialType === 'forge',
							player
						)}
					</span>
				</span>
				{#if hoveredBuilding.lumber_cost}
					<span class="text-emerald-400 flex items-center gap-1">
						<UiIcon name="treePine" class="w-3.5 h-3.5 text-emerald-400" />
						<span>{hoveredBuilding.lumber_cost}</span>
					</span>
				{/if}
			</div>

			<!-- Separator line -->
			<div class="border-b border-[#4d3d29] my-2"></div>

			<!-- Content: Treasure Chest Canon Text OR Spawner Stats OR Special / Lore description -->
			{#if hoveredBuilding.id === 'h008'}
				<p class="text-[11px] leading-relaxed text-slate-200">
					{t('cmd.chestDesc1')}
				</p>
				<p class="text-[11px] leading-relaxed text-amber-300 font-medium mt-1">
					{t('cmd.chestWarn')}
				</p>
			{:else if hoveredUnit}
				<div class="space-y-1 text-[11px] text-slate-300">
					<div class="flex justify-between">
						<span class="text-slate-400">{t('cmd.trains')}</span>
						<strong class="text-amber-300 font-bold">
							{localizeEntityName(hoveredUnit.name, settings.locale)}
						</strong>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">{t('inspect.attack')}</span>
						<span class="text-amber-200 font-mono">
							{hoveredUnit.damage_base ?? 15} ({getAttackTypeLabel(
								hoveredUnit.attack_type || 'normal',
								settings.locale
							)})
						</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">{t('inspect.defense')}</span>
						<span class="text-emerald-300 font-mono">
							{hoveredUnit.armor} ({getArmorTypeLabel(
								hoveredUnit.armor_type || 'medium',
								settings.locale
							)})
						</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">{t('cmd.healthLabel')}</span>
						<span class="text-green-400 font-mono font-bold">{Math.round(hoveredUnit.hp)} HP</span>
					</div>
				</div>
			{:else if hoveredBuilding.specialType === 'tower'}
				<div class="space-y-1 text-[11px] text-slate-300">
					<div class="text-cyan-300 font-bold">{t('cmd.towerTitle')}</div>
					<div class="flex justify-between">
						<span class="text-slate-400">{t('inspect.attack')}</span>
						<span class="text-amber-200 font-mono">
							{t('cmd.towerDmg', { dmg: hoveredBuilding.damage_base ?? 50 })}
						</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">{t('cmd.rangeCdLabel')}</span>
						<span class="text-slate-200 font-mono">
							{hoveredBuilding.range ?? 500} px / {hoveredBuilding.cooldown ?? 1.0}
							{t('inspect.secSuffix')}
						</span>
					</div>
				</div>
			{:else if hoveredBuilding.specialType === 'shop'}
				<div class="space-y-1 text-[11px] text-slate-300">
					<div class="text-amber-300 font-bold">{t('cmd.shopTitle')}</div>
					<p class="text-[11px] leading-relaxed text-slate-300">
						{t('cmd.shopDesc')}
					</p>
				</div>
			{:else if hoveredBuilding.specialType === 'forge'}
				<div class="space-y-1 text-[11px] text-slate-300">
					<div class="text-cyan-300 font-bold">{t('cmd.forgeTitle')}</div>
					<p class="text-[11px] leading-relaxed text-slate-300">
						{t('cmd.forgeDesc')}
					</p>
				</div>
			{:else if hoveredBuilding.raw_fields?.utub}
				<p class="text-[11px] leading-relaxed text-slate-300 whitespace-pre-line">
					{formatBuildingTooltip(hoveredBuilding.raw_fields.utub)}
				</p>
			{:else if hoveredBuilding.specialType === 'commander'}
				<div class="space-y-1 text-[11px] text-slate-300">
					<div class="text-indigo-300 font-bold">{t('cmd.commanderHallTitle')}</div>
					<p class="text-[11px] leading-relaxed text-slate-300">
						{t('cmd.commanderHallDesc')}
					</p>
				</div>
			{:else}
				<p class="text-[11px] leading-relaxed text-slate-400">
					{t('cmd.specialDesc', {
						name: localizeEntityName(hoveredBuilding.name, settings.locale)
					})}
				</p>
			{/if}

			{#if isLegendaryBuilding(hoveredBuilding)}
				<div
					class="mt-2 text-[10px] text-amber-300 bg-amber-950/50 p-1.5 rounded border border-amber-500/40 flex items-center gap-1"
				>
					<UiIcon name="crown" class="w-3.5 h-3.5 text-amber-400 shrink-0" />
					<span>
						{t('cmd.legendaryFood', {
							food: player.food,
							maxFood: player.maxFood
						})}
					</span>
				</div>
			{/if}
		</div>
	{/if}
</div>
