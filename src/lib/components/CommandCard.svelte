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
		getCommanderEffectivePct
	} from '../engine/commanders';
	import { sound } from '../services/audio';
	import CooldownOverlay from '$lib/components/ui/CooldownOverlay.svelte';
	import { WORKER_BLINK_COOLDOWN } from '../engine/constants';

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

	const HOTKEYS = ['Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F', 'Z', 'X', 'C', 'Esc'];
	const WC3_HOTKEYS = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'Z', 'X', 'C'];
	const ION_HOTKEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'V'];

	function shortenName(name: string): string {
		if (name.includes('Магазин')) return 'Магазин';
		if (name.includes('Скриня')) return 'Скриня';
		if (name.includes('Снігове')) return 'Снігове';
		if (name.includes('Іглу')) return 'Іглу';
		if (name.includes('Хатинка') || name.includes('Хатина')) return 'Хатинка';
		if (name.includes('Шипи')) return 'Шипи';
		if (name.includes('гніздо') || name.includes('Гніздо')) return 'Гніздо';
		if (name.includes('замок') || name.includes('Замок')) return 'Замок';
		if (name.includes('вежа') || name.includes('Вежа')) return 'Вежа';
		if (name.includes('гриб') || name.includes('Гриб')) return 'Гриб';
		if (name.includes('обеліск') || name.includes('Обеліск')) return 'Обеліск';
		if (name.includes('Заморожувач')) return 'Заморож.';
		if (name.includes('Барак')) return 'Барак';
		if (name.includes('Снайпер') || name.includes('Стрільц')) return 'Снайпери';
		if (name.includes('Майстерня') || name.includes('майстерня')) return 'Майстерня';
		if (name.includes('Грифон')) return 'Грифони';
		if (name.includes('Церква')) return 'Церква';
		if (name.includes('бібліотека')) return 'Бібліотека';
		if (name.includes('Артилерія')) return 'Артилерія';
		if (name.includes('Ріг')) return 'Ріг';
		if (name.includes('Храм')) return 'Храм';
		if (name.includes('Тотем')) return 'Тотем';
		if (name.includes('Колодязь')) return 'Колодязь';
		if (name.includes('Вівтар')) return 'Вівтар';
		if (name.includes('Брама')) return 'Брама';
		if (name.includes('Кузня')) return 'Кузня';
		if (name.includes('командира')) return 'Командир';
		if (name.includes('Фабрика')) return 'Фабрика';
		if (name.includes('Звалище')) return 'Звалище';
		if (name.includes('Клепальня')) return 'Клепальня';
		if (name.includes('Дробильня')) return 'Дробильня';
		if (name.includes('Ангар')) return 'Ангар';
		const words = name.split(' ');
		return words[0].length <= 8 ? words[0] : words[0].slice(0, 7) + '.';
	}

	function getHotkeyForBuilding(bld: BuildingDefinition, index: number): string {
		if (bld.id === 'h008') return 'D';
		if (settings.controlPreset === 'islands-of-nonsense') {
			return ION_HOTKEYS[index] || String(index + 1);
		}
		return WC3_HOTKEYS[index] || HOTKEYS[index] || '';
	}
	const tipClass =
		'pointer-events-none absolute bottom-full mb-2 z-50 whitespace-nowrap rounded-md border border-[#544738] bg-[#0f141f]/95 px-2.5 py-1 text-[11px] text-amber-100 shadow-2xl opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150';
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
	class="relative flex items-center justify-center p-1.5 bg-[#11151e] rounded-t-xl rounded-b-none border-t-2 border-x-2 border-b-0 border-[#544738] shadow-inner shrink-0 h-[142px]"
	style="box-shadow: inset 0 0 10px rgba(0,0,0,0.85);"
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
							<span class="text-[11px] font-bold tracking-wide">Добудувати</span>
						</button>
						<div class="{tipClass} left-1/2 -translate-x-1/2">
							Відправити робітника добудувати споруду
						</div>
					</div>
					<div class="relative group/tip w-full">
						<button
							onclick={() => onSellBuilding?.(placedBuilding.instanceId)}
							data-testid="hud-cancel-construction-btn"
							class="w-full h-9 rounded-lg border border-rose-500/60 bg-gradient-to-b from-rose-950/80 to-[#1a0b11] hover:from-rose-900/85 hover:to-rose-950 text-rose-200 flex items-center justify-center gap-1.5 px-3 transition cursor-pointer touch-manipulation shadow"
						>
							<UiIcon name="trash2" class="w-3.5 h-3.5 text-rose-400 shrink-0" />
							<span class="text-[10.5px] font-bold">Скасувати</span>
						</button>
						<div class="{tipClass} left-1/2 -translate-x-1/2">Скасувати будівництво</div>
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
									Товари
								</span>
								<div class="flex items-center gap-1">
									{#if buildingHp < buildingMaxHp}
										<button
											onclick={() => dispatchRepair(placedBuilding.team, placedBuilding.instanceId)}
											data-testid="hud-shop-repair-btn"
											class="px-1.5 py-0.5 rounded text-[8.5px] font-bold border transition bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/70 text-emerald-200 cursor-pointer shadow flex items-center gap-0.5"
										>
											<UiIcon name="wrench" class="w-2.5 h-2.5 text-emerald-400" />
											<span>Ремонт</span>
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
										<span>Знести (+25g)</span>
									</button>
								</div>
							</div>
							<div class="grid grid-cols-4 gap-1 max-h-[105px] overflow-y-auto pr-0.5 pt-0.5">
								{#each shopItems as item}
									{@const cd = sim.getItemCooldown(player.team, item.id)}
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
										aria-label="{item.nameUk} ({item.cost}g) - {item.descriptionUk}"
									>
										<CooldownOverlay remaining={cd} max={item.cooldown} />
										<span class="text-[8px] font-bold text-slate-200 truncate max-w-[55px]">
											{item.nameUk}
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
										<span>{hoveredItem.nameUk}</span>
										<span class="font-mono flex items-center gap-1">
											<UiIcon name="coins" class="w-3 h-3 text-amber-400 shrink-0" />
											<span>{hoveredItem.cost}</span>
											<span class="text-slate-400">|</span>
											<span>КД: {hoveredItem.cooldown}с</span>
										</span>
									</div>
									<p class="text-slate-300 text-[8.5px] mt-0.5">{hoveredItem.descriptionUk}</p>
								</div>
							{/if}
						</div>
					{:else if placedBuilding.specialType === 'forge'}
						{@const atkLvl = player.forge.attack}
						{@const armLvl = player.forge.armor}
						{@const ecoLvl = player.forge.econ}
						{@const atkCost = sim.getForgePrice(player.team, 'attack', player)}
						{@const armCost = sim.getForgePrice(player.team, 'armor', player)}
						{@const ecoCost = sim.getForgePrice(player.team, 'econ', player)}
						{@const atkLum = sim.getForgeLumberPrice(player.team, 'attack', player)}
						{@const armLum = sim.getForgeLumberPrice(player.team, 'armor', player)}
						{@const ecoLum = sim.getForgeLumberPrice(player.team, 'econ', player)}
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
									Покращення
								</span>
								<div class="flex items-center gap-1">
									{#if buildingHp < buildingMaxHp}
										<button
											onclick={() => dispatchRepair(placedBuilding.team, placedBuilding.instanceId)}
											data-testid="hud-forge-repair-btn"
											class="px-1.5 py-0.5 rounded text-[8.5px] font-bold border transition bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/70 text-emerald-200 cursor-pointer shadow flex items-center gap-0.5"
										>
											<UiIcon name="wrench" class="w-2.5 h-2.5 text-emerald-400" />
											<span>Ремонт</span>
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
										<span>Знести (+50g)</span>
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
											<span>Атака {atkLvl}/5</span>
										</span>
										<span class="text-[8px] text-slate-400">+8% шкоди</span>
										<div
											class="text-[8.5px] font-mono font-bold text-amber-300 flex items-center gap-1"
										>
											{#if atkLvl >= 5}
												<span>МАКС</span>
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
									<div class="{tipClass} left-0">Атака: +8% шкоди всім військам</div>
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
											<span>Броня {armLvl}/5</span>
										</span>
										<span class="text-[8px] text-slate-400">+1 броня</span>
										<div
											class="text-[8.5px] font-mono font-bold text-amber-300 flex items-center gap-1"
										>
											{#if armLvl >= 5}
												<span>МАКС</span>
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
										Броня: +1 броні всім військам
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
											<span>Дохід {ecoLvl}/3</span>
										</span>
										<span class="text-[8px] text-slate-400">+10% доходу</span>
										<div
											class="text-[8.5px] font-mono font-bold text-amber-300 flex items-center gap-1"
										>
											{#if ecoLvl >= 3}
												<span>МАКС</span>
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
									<div class="{tipClass} right-0">Економіка: +10% до доходу золота</div>
								</div>
							</div>
						</div>
					{:else if placedBuilding.specialType === 'commander'}
						{@const activeCmd = findCommander(player.commander)}
						{@const cmdStatus = sim.canSelectOrChangeCommander(player.team, player)}
						<!-- Placed Commander Hall: Status & Open Selection -->
						<div class="col-span-4 flex flex-col justify-between w-[280px] h-full py-0.5">
							<div
								class="flex items-center justify-between border-b border-[#3b3226] pb-1 shrink-0"
							>
								<span class="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
									<UiIcon name="crown" class="w-3.5 h-3.5 text-indigo-400" />
									Керування
								</span>
								<div class="flex items-center gap-1">
									{#if buildingHp < buildingMaxHp}
										<button
											onclick={() => dispatchRepair(placedBuilding.team, placedBuilding.instanceId)}
											data-testid="hud-commander-repair-btn"
											class="px-1.5 py-0.5 rounded text-[8.5px] font-bold border transition bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/70 text-emerald-200 cursor-pointer shadow flex items-center gap-0.5"
										>
											<UiIcon name="wrench" class="w-2.5 h-2.5 text-emerald-400" />
											<span>Ремонт</span>
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
										<span>Знести (+{Math.round(placedBuilding.goldCost * 0.5)}g)</span>
									</button>
								</div>
							</div>
							<div class="flex flex-col gap-1.5 pt-1">
								<div
									class="flex items-center justify-between text-[10px] bg-[#0c1017] px-2 py-1 rounded border border-[#2d3748]"
								>
									<span class="text-slate-400">
										Командир:
										<strong class="text-indigo-200 ml-1">
											{#if activeCmd}
												{activeCmd.name}{player.isRandomCommander ? ' ×2' : ''} ({activeCmd.id === 2
													? `-${getCommanderEffectivePct(activeCmd.id, Boolean(player.isRandomCommander))}%`
													: `+${getCommanderEffectivePct(activeCmd.id, Boolean(player.isRandomCommander))}%`})
											{:else}
												Не обрано
											{/if}
										</strong>
									</span>
									<span
										class="text-[9px] font-mono {cmdStatus.isFree
											? 'text-emerald-300'
											: 'text-amber-300'}"
									>
										{cmdStatus.isFree
											? 'Безкошт.'
											: `${Math.ceil(cmdStatus.cooldownLeft)}с / 250g+250w`}
									</span>
								</div>
								<button
									type="button"
									onclick={() => onOpenCommander?.()}
									data-testid="hud-open-commander-btn"
									class="w-full py-1.5 px-3 rounded border border-indigo-400/70 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-100 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow"
								>
									<UiIcon name="crown" class="w-3.5 h-3.5 text-indigo-300" />
									<span>{activeCmd ? 'Змінити командира' : 'Обрати командира'}</span>
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
									<span class="text-[10.5px] font-bold truncate">{up.name}</span>
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
								{up.name} ({upCost}g{upLumber > 0 ? `, ${upLumber}w` : ''}) · Клавіша {uIdx + 1}
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
									<span>Ремонт</span>
								</span>
								<span
									class="px-1 py-0.5 rounded bg-black/50 border border-emerald-500/40 text-[8.5px] font-mono font-bold leading-none text-emerald-300"
								>
									R
								</span>
							</button>
							<div class="{tipClass} left-1/2 -translate-x-1/2">
								Наказати робітникові відремонтувати споруду · Клавіша R
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
								<span>Знести</span>
							</span>
							<span class="text-[10px] text-emerald-300 font-mono font-bold">
								+{Math.floor(placedBuilding.goldCost * 0.5)}g
							</span>
						</button>
						<div class="{tipClass} left-1/2 -translate-x-1/2">
							Знести споруду (+50% повернення золота)
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
							<span class="text-slate-400">Атака / Броня:</span>
							<span class="font-mono text-slate-200">
								{placedUnit.damage_base} ({placedUnit.attack_type}) / {placedUnit.armor} ({placedUnit.armor_type})
							</span>
						</div>
						<div class="flex justify-between">
							<span class="text-slate-400">Здоров'я / КД:</span>
							<span class="font-mono text-emerald-300">
								{Math.round(placedUnit.hp)} HP / {placedBuilding.spawnCooldown}с
							</span>
						</div>
					{:else}
						<div class="text-slate-400 text-center">Спеціальна ворожа споруда</div>
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
							Гармата · {cv.cannonDmg} (Облога){cv.isOvercharged ? ' ×2!' : ''}
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
								? `${cv.cannonCd.toFixed(1)}с`
								: `Готово (${cv.cannonMaxCd.toFixed(1)}с)`}
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
								aria-label="Постріл {btn.range}px ({btn.cost}g) Клавіша {btn.hotkey}: ворог або союзник (50%), ПКМ — автокаст"
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
								Постріл {btn.range}px ({btn.cost}g) · Клавіша {btn.hotkey} · ПКМ: {isAuto
									? 'вимкнути автокаст'
									: 'автокаст'}
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
								aria-label="Покращити гармату: КД 2с → 1с ({CASTLE_CANNON_UPGRADE_GOLD}g+{CASTLE_CANNON_UPGRADE_LUMBER}w) Клавіша 3"
								class="relative {castleBtn} {cv.canUpgradeCannon
									? 'border-cyan-500/80 bg-cyan-950/75 hover:bg-cyan-900/90 text-cyan-100'
									: disabledCastleBtn}"
							>
								<span class="text-[9.5px] font-bold flex items-center gap-0.5 leading-none">
									<UiIcon name="zap" class="w-3 h-3 text-cyan-400" />
									КД 1с
								</span>
								<span class="text-[8px] font-mono text-cyan-300 font-bold mt-0.5">
									{CASTLE_CANNON_UPGRADE_GOLD}g/{CASTLE_CANNON_UPGRADE_LUMBER}w
								</span>
								<span class={hotkeyCornerClass}>3</span>
							</button>
							<div class="{tipClass} right-0">
								Покращити гармату: КД 2с → 1с ({CASTLE_CANNON_UPGRADE_GOLD}g + {CASTLE_CANNON_UPGRADE_LUMBER}w)
								· Клавіша 3
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
									КД 1с
									<UiIcon name="check" class="w-2.5 h-2.5 text-emerald-400" />
								</span>
							</div>
							<div class="{tipClass} right-0">Гармата покращена на раунд (КД 1с)</div>
						</div>
					{/if}
				</div>
				<div class="text-[9.5px] text-slate-400 flex items-center justify-between px-0.5">
					<span>Радіус оборони: 500 / 1500 px</span>
					<span>ПКМ — автокаст</span>
				</div>
			{:else}
				{@const enemyCannonCd =
					uiTick >= 0 ? sim.getCastleCannonEffectiveMaxCooldown(selectedCastle.team) : 2.0}
				<div
					class="flex flex-col gap-1.5 text-[10px] text-slate-300 bg-[#0d1017] p-2.5 rounded border border-[#2d3748] my-auto"
				>
					<div class="flex justify-between">
						<span class="text-slate-400">Потужність гармати:</span>
						<span class="font-mono text-amber-300 font-bold">
							{CASTLE_CANNON_BASE_DAMAGE} (Облога)
						</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Радіус оборони:</span>
						<span class="font-mono text-slate-200">500 / 1500 px</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Кулдаун гармати:</span>
						<span class="font-mono text-slate-200">{enemyCannonCd.toFixed(1)} с</span>
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
						aria-label="Телепорт будівельника до 500px (Клавіша F)"
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
							<span class="text-[7.5px] font-bold leading-none mt-0.5">Телепорт</span>
						</div>
					</button>
					<div class="{tipClass} right-0">
						{blinkCd > 0
							? `Телепорт перезаряджається (${blinkCd.toFixed(1)}с)`
							: 'Телепорт будівельника (до 500px на своєму острові) · Клавіша F'}
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
			class="absolute bottom-full right-0 mb-3 w-80 bg-[#0e121a]/95 border-2 border-[#b89758] rounded-md p-3 text-xs shadow-2xl backdrop-blur-md pointer-events-none z-50 text-slate-200"
			style="box-shadow: 0 10px 30px rgba(0,0,0,0.95);"
		>
			<!-- Gold Title + Hotkey -->
			<div class="text-[#fef08a] font-bold text-sm leading-tight flex items-center justify-between">
				<span>Збудувати {bld.name}</span>
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
					Перша збудована вами Скриня збільшує ваш Дохід на 25%. Інші збудовані Скрині дають на 15%
					менше золота, ніж попередні (наприклад, друга дає 21.25%, третя 18.06% і т.д.).
				</p>
				<p class="text-[11px] leading-relaxed text-amber-300 font-medium mt-1">
					Обережно, вона дуже крихка!
				</p>
			{:else if hoveredUnit}
				<div class="space-y-1 text-[11px] text-slate-300">
					<div class="flex justify-between">
						<span class="text-slate-400">Тренує:</span>
						<strong class="text-amber-300 font-bold">{hoveredUnit.name}</strong>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Атака:</span>
						<span class="text-amber-200 font-mono">
							{hoveredUnit.damage_base ?? 15} ({hoveredUnit.attack_type})
						</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Броня:</span>
						<span class="text-emerald-300 font-mono">
							{hoveredUnit.armor} ({hoveredUnit.armor_type})
						</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Здоров'я:</span>
						<span class="text-green-400 font-mono font-bold">{Math.round(hoveredUnit.hp)} HP</span>
					</div>
				</div>
			{:else if hoveredBuilding.specialType === 'tower'}
				<div class="space-y-1 text-[11px] text-slate-300">
					<div class="text-cyan-300 font-bold">Оборонна сторожова вежа</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Атака:</span>
						<span class="text-amber-200 font-mono">
							{hoveredBuilding.damage_base ?? 50} (Колюча)
						</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Дистанція / КД:</span>
						<span class="text-slate-200 font-mono">
							{hoveredBuilding.range ?? 500} px / {hoveredBuilding.cooldown ?? 1.0} с
						</span>
					</div>
				</div>
			{:else if hoveredBuilding.specialType === 'shop'}
				<div class="space-y-1 text-[11px] text-slate-300">
					<div class="text-amber-300 font-bold">Магазин артефактів</div>
					<p class="text-[11px] leading-relaxed text-slate-300">
						Дозволяє купувати корисні зілля, сувої та предмети в бою (золото / дерево).
					</p>
				</div>
			{:else if hoveredBuilding.specialType === 'forge'}
				<div class="space-y-1 text-[11px] text-slate-300">
					<div class="text-cyan-300 font-bold">Кузня покращень</div>
					<p class="text-[11px] leading-relaxed text-slate-300">
						Дослідження технологій: покращення сили атаки, міцності броні та видобутку золота.
					</p>
				</div>
			{:else if hoveredBuilding.raw_fields?.utub}
				<p class="text-[11px] leading-relaxed text-slate-300 whitespace-pre-line">
					{hoveredBuilding.raw_fields.utub}
				</p>
			{/if}

			{#if isLegendaryBuilding(hoveredBuilding)}
				<div
					class="mt-2 text-[10px] text-amber-300 bg-amber-950/50 p-1.5 rounded border border-amber-500/40 flex items-center gap-1"
				>
					<UiIcon name="crown" class="w-3.5 h-3.5 text-amber-400 shrink-0" />
					<span>Легендарна споруда. Потребує їжу ({player.food}/{player.maxFood}).</span>
				</div>
			{/if}
		</div>
	{/if}
</div>
