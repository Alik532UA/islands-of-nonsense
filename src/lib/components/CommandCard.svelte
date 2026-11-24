<script lang="ts">
	import type { Simulation } from '../engine/simulation';
	import type {
		Building,
		BuildingDefinition,
		Unit,
		UnitDefinition,
		PlayerState
	} from '../engine/types';
	import { getUnit, isLegendaryBuilding } from '../engine/gameData';
	import { sound } from '../services/audio';
	import {
		Trash2,
		X,
		Crown,
		Hammer,
		Castle,
		Swords,
		Users,
		Wrench,
		ShieldAlert,
		Sparkles,
		Crosshair,
		Feather,
		Zap,
		ShoppingBag,
		Package
	} from 'lucide-svelte';
	import { CASTLE_ITEMS_LIST, type CastleItem } from '../engine/items';
	import { settings } from '../services/settings.svelte';

	let {
		sim,
		placedBuilding = null,
		placedUnit = null,
		availableUpgrades = [],
		selectedCastle = null,
		selectedUnit = null,
		groupUnits = [],
		availableBuildings = [],
		selectedBuildingId = null,
		activeEntityType,
		player,
		playerGold,
		onSelectBuilding,
		onUpgradeBuilding,
		onSellBuilding,
		onContinueConstruction,
		onClearSelection,
		onCloseBuilding,
		onCloseUnit
	}: {
		sim: Simulation;
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
		onSelectBuilding: (id: string | null) => void;
		onUpgradeBuilding?: (instanceId: string, targetDefId: string) => void;
		onSellBuilding?: (instanceId: string) => void;
		onContinueConstruction?: (instanceId: string) => void;
		onClearSelection?: () => void;
		onCloseBuilding?: () => void;
		onCloseUnit?: () => void;
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
</script>

<div
	data-testid="hud-command-card"
	class="relative flex items-center justify-center p-1.5 bg-[#11151e] rounded-lg border-2 border-[#544738] shadow-inner shrink-0 h-[142px]"
	style="box-shadow: inset 0 0 10px rgba(0,0,0,0.85);"
>
	{#if placedBuilding}
		{#if placedBuilding.team === player.team}
			<!-- Placed Building Commands: Upgrades, Continue Construction, Sell -->
			<div class="grid grid-cols-4 gap-1.5 w-[280px]">
				{#if placedBuilding.isUnderConstruction}
					<button
						onclick={() => onContinueConstruction?.(placedBuilding.instanceId)}
						data-testid="hud-continue-construction-btn"
						class="col-span-2 h-10 rounded border border-amber-500 bg-amber-950/70 hover:bg-amber-900/90 text-amber-200 flex items-center justify-center gap-1.5 px-2 transition cursor-pointer shadow"
						title="Відправити робітника добудувати споруду"
					>
						<Hammer class="w-4 h-4 text-amber-400" />
						<span class="text-[10px] font-bold">Добудувати</span>
					</button>
					<button
						onclick={() => onSellBuilding?.(placedBuilding.instanceId)}
						data-testid="hud-cancel-construction-btn"
						class="h-10 rounded border border-rose-600/70 bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 flex items-center justify-center gap-1 px-1 transition cursor-pointer"
						title="Скасувати будівництво"
					>
						<Trash2 class="w-3.5 h-3.5 text-rose-400" />
						<span class="text-[9px] font-bold">Скасувати</span>
					</button>
					<button
						onclick={() => onCloseBuilding?.()}
						data-testid="hud-close-building-btn"
						class="h-10 rounded border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 flex flex-col items-center justify-center p-1 transition cursor-pointer"
						title="Закрити вибір (Esc)"
					>
						<X class="w-4 h-4 text-slate-300" />
						<span class="text-[8px] font-mono">Esc</span>
					</button>
				{:else if placedBuilding.specialType === 'shop'}
					{@const shopItems = CASTLE_ITEMS_LIST.filter(
						(it) => (it.id !== 'I00B' && it.id !== 'I00N') || sim.gameModeConfig?.nuclearWarheads
					)}
					<!-- Placed Shop Building: Consumables Roster -->
					<div class="col-span-4 flex flex-col justify-between w-[280px] h-full py-0.5">
						<div class="flex items-center justify-between border-b border-[#3b3226] pb-1 shrink-0">
							<span class="text-[11px] font-bold text-amber-300 flex items-center gap-1">
								<ShoppingBag class="w-3.5 h-3.5 text-amber-400" />
								Магазин
							</span>
							<div class="flex items-center gap-1">
								{#if placedBuilding.hp < placedBuilding.maxHp}
									<button
										onclick={() => sim.repairBuilding(player.team, placedBuilding.instanceId)}
										data-testid="hud-repair-btn"
										class="px-1.5 py-0.5 rounded text-[8.5px] font-bold border transition bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/70 text-emerald-200 cursor-pointer shadow flex items-center gap-0.5"
									>
										<Wrench class="w-2.5 h-2.5 text-emerald-400" />
										<span>Ремонт [R]</span>
									</button>
								{/if}
								<button
									onclick={() => onSellBuilding?.(placedBuilding.instanceId)}
									data-testid="hud-sell-btn"
									class="px-1.5 py-0.5 rounded text-[8.5px] font-bold border transition bg-rose-950/70 hover:bg-rose-900 border-rose-600/70 text-rose-200 cursor-pointer shadow flex items-center gap-0.5"
								>
									<Trash2 class="w-2.5 h-2.5 text-rose-400" />
									<span>Знести (+25g)</span>
								</button>
								<button
									onclick={() => onCloseBuilding?.()}
									data-testid="hud-close-building-btn"
									class="text-[9px] text-slate-400 hover:text-white px-1.5 py-0.5 bg-[#1e2433] rounded border border-slate-700 cursor-pointer"
								>
									Esc
								</button>
							</div>
						</div>
						<div class="grid grid-cols-4 gap-1 max-h-[105px] overflow-y-auto pr-0.5 pt-0.5">
							{#each shopItems as item}
								{@const cd = sim.getItemCooldown(player.team, item.id)}
								{@const canAfford = playerGold >= item.cost}
								{@const canBuy = canAfford && cd <= 0}
								<button
									onclick={() => {
										if (sim.canBuyCastleItem(player.team, item.id)) {
											const success = sim.buyCastleItem(player.team, item.id);
											if (success) sound.playCoin();
										}
									}}
									onmouseenter={() => (hoveredItem = item)}
									onmouseleave={() => (hoveredItem = null)}
									disabled={!canBuy}
									data-testid="hud-shop-item-btn-{item.id}"
									class="relative w-16 h-[32px] rounded border flex flex-col justify-between items-center p-0.5 transition cursor-pointer touch-manipulation {canBuy
										? 'bg-[#1b263b] hover:bg-[#253959] border-amber-500/60 text-white shadow'
										: cd > 0
											? 'bg-[#151a24] border-cyan-800/60 text-cyan-400 cursor-not-allowed'
											: 'bg-[#12161f] border-slate-700 text-slate-500 opacity-60 cursor-not-allowed'}"
									title="{item.nameUk} ({item.cost}g) - {item.descriptionUk}"
								>
									{#if cd > 0}
										<div
											class="absolute inset-0 bg-black/75 rounded flex items-center justify-center z-10"
										>
											<span class="text-[9px] font-mono font-bold text-cyan-300">
												{Math.ceil(cd)}с
											</span>
										</div>
									{/if}
									<span class="text-[8px] font-bold text-slate-200 truncate max-w-[55px]">
										{item.nameUk}
									</span>
									<span class="text-[8px] text-amber-300 font-mono font-bold">🪙{item.cost}</span>
								</button>
							{/each}
						</div>
						{#if hoveredItem}
							<div
								class="absolute -top-14 left-2 right-2 bg-[#0c1017] border border-amber-500/80 rounded p-1.5 z-30 shadow-2xl text-[9px] pointer-events-none"
							>
								<div class="flex items-center justify-between font-bold text-amber-300">
									<span>{hoveredItem.nameUk}</span>
									<span class="font-mono">🪙{hoveredItem.cost} | КД: {hoveredItem.cooldown}с</span>
								</div>
								<p class="text-slate-300 text-[8.5px] mt-0.5">{hoveredItem.descriptionUk}</p>
							</div>
						{/if}
					</div>
				{:else if placedBuilding.specialType === 'forge'}
					{@const atkLvl = player.forge.attack}
					{@const armLvl = player.forge.armor}
					{@const ecoLvl = player.forge.econ}
					{@const atkCost = sim.getForgePrice(player.team, 'attack')}
					{@const armCost = sim.getForgePrice(player.team, 'armor')}
					{@const ecoCost = sim.getForgePrice(player.team, 'econ')}
					{@const atkLum = sim.getForgeLumberPrice(player.team, 'attack')}
					{@const armLum = sim.getForgeLumberPrice(player.team, 'armor')}
					{@const ecoLum = sim.getForgeLumberPrice(player.team, 'econ')}
					{@const canAtk = atkLvl < 5 && playerGold >= atkCost && (player.lumber ?? 0) >= atkLum}
					{@const canArm = armLvl < 5 && playerGold >= armCost && (player.lumber ?? 0) >= armLum}
					{@const canEco = ecoLvl < 3 && playerGold >= ecoCost && (player.lumber ?? 0) >= ecoLum}
					<!-- Placed Forge Building: Upgrades -->
					<div class="col-span-4 flex flex-col justify-between w-[280px] h-full py-0.5">
						<div class="flex items-center justify-between border-b border-[#3b3226] pb-1 shrink-0">
							<span class="text-[11px] font-bold text-amber-300 flex items-center gap-1">
								<Hammer class="w-3.5 h-3.5 text-amber-400" />
								Військова Кузня
							</span>
							<div class="flex items-center gap-1">
								{#if placedBuilding.hp < placedBuilding.maxHp}
									<button
										onclick={() => sim.repairBuilding(player.team, placedBuilding.instanceId)}
										data-testid="hud-repair-btn"
										class="px-1.5 py-0.5 rounded text-[8.5px] font-bold border transition bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/70 text-emerald-200 cursor-pointer shadow flex items-center gap-0.5"
									>
										<Wrench class="w-2.5 h-2.5 text-emerald-400" />
										<span>Ремонт [R]</span>
									</button>
								{/if}
								<button
									onclick={() => onSellBuilding?.(placedBuilding.instanceId)}
									data-testid="hud-sell-btn"
									class="px-1.5 py-0.5 rounded text-[8.5px] font-bold border transition bg-rose-950/70 hover:bg-rose-900 border-rose-600/70 text-rose-200 cursor-pointer shadow flex items-center gap-0.5"
								>
									<Trash2 class="w-2.5 h-2.5 text-rose-400" />
									<span>Знести (+50g)</span>
								</button>
								<button
									onclick={() => onCloseBuilding?.()}
									data-testid="hud-close-building-btn"
									class="text-[9px] text-slate-400 hover:text-white px-1.5 py-0.5 bg-[#1e2433] rounded border border-slate-700 cursor-pointer"
								>
									Esc
								</button>
							</div>
						</div>
						<div class="grid grid-cols-3 gap-1.5 pt-1">
							<button
								onclick={() => sim.upgradeForge(player.team, 'attack')}
								disabled={!canAtk}
								class="h-16 rounded border flex flex-col items-center justify-between p-1 transition cursor-pointer {canAtk
									? 'bg-rose-950/60 hover:bg-rose-900/80 border-rose-500/70 text-white shadow'
									: 'bg-[#181d28] border-slate-700 text-slate-500 opacity-60 cursor-not-allowed'}"
								title="Атака: +8% шкоди всім військам"
							>
								<span class="text-[9.5px] font-bold text-rose-300">⚔️ Атака {atkLvl}/5</span>
								<span class="text-[8px] text-slate-400">+8% шкоди</span>
								<span class="text-[8.5px] font-mono font-bold text-amber-300">
									{atkLvl >= 5 ? 'МАКС' : `🪙${atkCost}${atkLum > 0 ? ` 🪵${atkLum}` : ''}`}
								</span>
							</button>

							<button
								onclick={() => sim.upgradeForge(player.team, 'armor')}
								disabled={!canArm}
								class="h-16 rounded border flex flex-col items-center justify-between p-1 transition cursor-pointer {canArm
									? 'bg-blue-950/60 hover:bg-blue-900/80 border-blue-500/70 text-white shadow'
									: 'bg-[#181d28] border-slate-700 text-slate-500 opacity-60 cursor-not-allowed'}"
								title="Броня: +1 броні всім військам"
							>
								<span class="text-[9.5px] font-bold text-blue-300">🛡️ Броня {armLvl}/5</span>
								<span class="text-[8px] text-slate-400">+1 броня</span>
								<span class="text-[8.5px] font-mono font-bold text-amber-300">
									{armLvl >= 5 ? 'МАКС' : `🪙${armCost}${armLum > 0 ? ` 🪵${armLum}` : ''}`}
								</span>
							</button>

							<button
								onclick={() => sim.upgradeForge(player.team, 'econ')}
								disabled={!canEco}
								class="h-16 rounded border flex flex-col items-center justify-between p-1 transition cursor-pointer {canEco
									? 'bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-500/70 text-white shadow'
									: 'bg-[#181d28] border-slate-700 text-slate-500 opacity-60 cursor-not-allowed'}"
								title="Економіка: +10% до доходу золота"
							>
								<span class="text-[9.5px] font-bold text-emerald-300">💰 Дохід {ecoLvl}/3</span>
								<span class="text-[8px] text-slate-400">+10% доходу</span>
								<span class="text-[8.5px] font-mono font-bold text-amber-300">
									{ecoLvl >= 3 ? 'МАКС' : `🪙${ecoCost}${ecoLum > 0 ? ` 🪵${ecoLum}` : ''}`}
								</span>
							</button>
						</div>
					</div>
				{:else}
					{#each availableUpgrades as up, uIdx}
						{@const upCost = up.upgrade_from
							? (up.gold_cost ?? 200)
							: Math.max(50, (up.gold_cost || 200) - placedBuilding.goldCost)}
						{@const upLumber = up.lumber_cost || 0}
						{@const canAfford = playerGold >= upCost && (player.lumber ?? 0) >= upLumber}
						<button
							onclick={() => onUpgradeBuilding?.(placedBuilding.instanceId, up.id)}
							disabled={!canAfford}
							data-testid="hud-upgrade-btn-{up.id}"
							class="relative w-16 h-10 rounded border flex flex-col items-center justify-center p-1 transition cursor-pointer {canAfford
								? 'bg-[#1e3a5f] hover:bg-[#2563eb] border-blue-400 text-white shadow'
								: 'bg-[#181d28] border-slate-700 text-slate-500 opacity-60 cursor-not-allowed'}"
							title="{up.name} ({upCost}g{upLumber > 0 ? `, ${upLumber}w` : ''})"
						>
							<span
								class="absolute top-0.5 right-1 text-[8px] font-mono font-bold text-amber-300 drop-shadow"
							>
								[{uIdx + 1}]
							</span>
							<span class="text-[10px] font-bold truncate max-w-[50px]">{up.name}</span>
							<div class="flex items-center gap-1 text-[8px] font-mono font-bold">
								<span class="text-amber-300">🪙{upCost}</span>
								{#if upLumber > 0}
									<span class="text-emerald-400">🪵{upLumber}</span>
								{/if}
							</div>
						</button>
					{/each}
					{#if placedBuilding.hp < placedBuilding.maxHp}
						<button
							onclick={() => sim.repairBuilding('west', placedBuilding.instanceId)}
							data-testid="hud-repair-btn"
							class="w-16 h-10 rounded border border-emerald-500/70 bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-200 flex flex-col items-center justify-center p-0.5 transition cursor-pointer shadow"
							title="Наказати робітникові відремонтувати споруду (R)"
						>
							<span class="text-[10px] font-bold flex items-center gap-0.5">
								<Wrench class="w-3 h-3 text-emerald-400" />
								Ремонт
							</span>
							<span class="text-[8px] font-mono text-emerald-300 font-bold">[R]</span>
						</button>
					{/if}
					<!-- Sell button in slot 11 -->
					<button
						onclick={() => onSellBuilding?.(placedBuilding.instanceId)}
						data-testid="hud-sell-btn"
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
						onclick={() => onCloseBuilding?.()}
						data-testid="hud-close-building-btn"
						class="relative col-start-4 w-16 h-10 rounded border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 flex flex-col items-center justify-center p-1 transition cursor-pointer"
						title="Закрити вибір (Esc)"
					>
						<X class="w-4 h-4 text-slate-300" />
						<span class="text-[8px] font-mono">Esc</span>
					</button>
				{/if}
			</div>
		{:else}
			<!-- Enemy building inspection: stats only + dismiss -->
			<div class="flex flex-col justify-between w-[280px] h-full py-1">
				<div class="flex items-center justify-between border-b border-[#3b3226] pb-1">
					<span class="text-[11px] font-bold text-rose-400 flex items-center gap-1">
						<Hammer class="w-3.5 h-3.5 text-rose-400" />
						{placedBuilding.name} (Ворог)
					</span>
					<button
						onclick={() => onCloseBuilding?.()}
						data-testid="hud-close-enemy-building-btn"
						class="text-[9px] text-slate-400 hover:text-white px-1.5 py-0.5 bg-[#1e2433] rounded border border-slate-700 cursor-pointer"
					>
						Закрити (Esc)
					</button>
				</div>
				<div
					class="flex flex-col gap-1 text-[10px] text-slate-300 bg-[#0d1017] p-2 rounded border border-[#2d3748]"
				>
					<div class="flex justify-between">
						<span class="text-slate-400">Спавнить бійця:</span>
						<span class="font-bold text-amber-300">{placedUnit?.name || 'Спеціальна'}</span>
					</div>
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
					{/if}
				</div>
			</div>
		{/if}
	{:else if activeEntityType === 'castle' && selectedCastle}
		<!-- Castle Command Card: Status & Defense Repair (Consumable shop items moved to built Shop building) -->
		<div class="flex flex-col justify-between w-[280px] h-full py-1">
			<div class="flex items-center justify-between border-b border-[#3b3226] pb-1">
				<span class="text-[11px] font-bold text-amber-300 flex items-center gap-1">
					<Castle class="w-3.5 h-3.5 text-amber-400" />
					{selectedCastle.team === player.team ? 'Головна Цитадель' : 'Ворожа База'}
				</span>
				<button
					onclick={() => onClearSelection?.()}
					data-testid="hud-close-castle-btn"
					class="text-[9px] text-slate-400 hover:text-white px-1.5 py-0.5 bg-[#1e2433] rounded border border-slate-700 cursor-pointer"
				>
					Закрити (Esc)
				</button>
			</div>
			{#if selectedCastle.team === player.team}
				<div
					class="flex flex-col gap-1 text-[10px] text-slate-300 bg-[#0d1017] p-2 rounded border border-[#2d3748]"
				>
					<div class="flex justify-between">
						<span class="text-slate-400">Статус:</span>
						<span class="font-bold text-emerald-400">Цитадель захищена</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Гармата цитаделі:</span>
						<span class="font-mono text-amber-300 font-bold">120-150 (Облога)</span>
					</div>
					<div class="text-[9px] text-slate-400 border-t border-slate-800 pt-1">
						💡 Припаси доступні в окремій будівлі <span class="text-amber-300 font-bold">
							Магазин
						</span>.
					</div>
				</div>
				<div class="grid grid-cols-4 gap-1.5 pt-1">
					{#if selectedCastle.hp < selectedCastle.maxHp}
						<button
							onclick={() => sim.repairBuilding(player.team, `castle_${player.team}`)}
							data-testid="hud-castle-repair-btn"
							class="w-16 h-10 rounded border border-emerald-500/70 bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-200 flex flex-col items-center justify-center p-0.5 transition cursor-pointer shadow"
							title="Наказати робітникові ремонтувати цитадель (R)"
						>
							<span class="text-[9.5px] font-bold flex items-center gap-0.5">
								<Wrench class="w-3 h-3 text-emerald-400" />
								Ремонт
							</span>
							<span class="text-[8px] font-mono text-emerald-300 font-bold">[R]</span>
						</button>
					{/if}
					{#if sim.brokenBridge}
						<button
							type="button"
							onclick={() => sim.orderBridgeRepair(player.team)}
							disabled={(player.lumber ?? 0) < 50}
							data-testid="hud-repair-bridge-btn"
							class="w-16 h-10 rounded border border-amber-500/70 bg-amber-950/70 hover:bg-amber-900/90 disabled:opacity-40 text-amber-200 flex flex-col items-center justify-center p-0.5 transition cursor-pointer shadow"
							title="Наказати робітникові відбудувати зламаний міст (50 деревини)"
						>
							<span class="text-[9.5px] font-bold flex items-center gap-0.5">
								<Wrench class="w-3 h-3 text-amber-400" />
								Міст
							</span>
							<span class="text-[8px] font-mono text-amber-300 font-bold">50🪵</span>
						</button>
					{/if}
				</div>
			{:else}
				<div
					class="flex flex-col gap-1 text-[10px] text-slate-300 bg-[#0d1017] p-2 rounded border border-[#2d3748]"
				>
					<div class="flex justify-between">
						<span class="text-slate-400">Гармата цитаделі:</span>
						<span class="font-mono text-amber-300 font-bold">120-150 (Облога)</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Дальність гармати:</span>
						<span class="font-mono text-slate-200">800 px</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Броня замку:</span>
						<span class="font-bold text-emerald-300">15 (Укріплена)</span>
					</div>
				</div>
			{/if}
		</div>
	{:else if activeEntityType === 'unit' && selectedUnit}
		<!-- Unit Profile Card -->
		<div class="flex flex-col justify-between w-[280px] h-full py-1">
			<div class="flex items-center justify-between border-b border-[#3b3226] pb-1">
				<span
					class="text-[11px] font-bold {selectedUnit.team === player.team
						? 'text-blue-300'
						: selectedUnit.team === 'neutral'
							? 'text-purple-300'
							: 'text-rose-400'} flex items-center gap-1"
				>
					<Swords class="w-3.5 h-3.5" />
					{selectedUnit.name}
				</span>
				<button
					onclick={() => onCloseUnit?.()}
					data-testid="hud-close-unit-btn"
					class="text-[9px] text-slate-400 hover:text-white px-1.5 py-0.5 bg-[#1e2433] rounded border border-slate-700 cursor-pointer"
				>
					Закрити (Esc)
				</button>
			</div>
			<div
				class="flex flex-col gap-1 text-[10px] text-slate-300 bg-[#0d1017] p-2 rounded border border-[#2d3748]"
			>
				<div class="flex justify-between">
					<span class="text-slate-400">Дистанція атаки:</span>
					<span class="font-mono text-amber-300 font-bold">{selectedUnit.range} px</span>
				</div>
				<div class="flex justify-between">
					<span class="text-slate-400">Швидкість атаки:</span>
					<span class="font-mono text-slate-200">{selectedUnit.attackCooldown.toFixed(1)} с</span>
				</div>
				<div class="flex justify-between">
					<span class="text-slate-400">Тип пересування:</span>
					<span class="font-bold {selectedUnit.flying ? 'text-cyan-300' : 'text-emerald-300'}">
						{selectedUnit.flying ? 'Повітряний юніт' : 'Наземний юніт'}
					</span>
				</div>
			</div>
		</div>
	{:else if activeEntityType === 'group'}
		<!-- Group Profile Card -->
		<div class="flex flex-col justify-between w-[280px] h-full py-1">
			<div class="flex items-center justify-between border-b border-[#3b3226] pb-1">
				<span class="text-[11px] font-bold text-amber-300 flex items-center gap-1">
					<Users class="w-3.5 h-3.5" />
					Загін бійців ({groupUnits.length})
				</span>
				<button
					onclick={() => onClearSelection?.()}
					data-testid="hud-close-group-btn"
					class="text-[9px] text-slate-400 hover:text-white px-1.5 py-0.5 bg-[#1e2433] rounded border border-slate-700 cursor-pointer"
				>
					Закрити (Esc)
				</button>
			</div>
			<div class="text-[10px] text-slate-400 text-center p-2">
				Виділено загін бійців на полі бою. Відображаються сумарні показники здоров'я.
			</div>
		</div>
	{:else if activeEntityType === 'worker'}
		<!-- 5x3 Grid for 13 Base Buildings + Bridge Repair / Spacer + Cancel Button (15 slots) -->
		<div class="grid grid-cols-5 gap-1 w-[310px]">
			{#each availableBuildings as bld, idx}
				{@const isSelected = selectedBuildingId === bld.id}
				{@const bldLumber = bld.lumber_cost || 0}
				{@const isAffordable =
					playerGold >= (bld.gold_cost || 200) && (player.lumber ?? 0) >= bldLumber}
				{@const isLeg = isLegendaryBuilding(bld)}
				{@const lacksFood = isLeg && player.food >= player.maxFood}
				{@const hotkey = getHotkeyForBuilding(bld, idx)}
				{@const bUnit = getUnit(bld.unit)}

				<button
					onclick={() => onSelectBuilding(isSelected ? null : bld.id)}
					onmouseenter={() => (hoveredBuilding = bld)}
					onmouseleave={() => (hoveredBuilding = null)}
					data-testid="hud-build-btn-{bld.id}"
					class="relative w-[58px] h-[38px] rounded border p-0.5 transition-all flex flex-col justify-between items-center cursor-pointer touch-manipulation {isSelected
						? 'bg-blue-600/90 border-amber-300 shadow-lg ring-2 ring-amber-400 shadow-blue-500/50'
						: lacksFood
							? 'bg-red-950/40 border-red-800/80 hover:border-red-600'
							: isAffordable
								? 'bg-[#1b2230] hover:bg-[#28354d] border-[#544738] hover:border-[#8c7456]'
								: 'bg-[#12161f] border-[#2d3748] opacity-50 grayscale cursor-not-allowed'}"
					aria-label="{bld.name} ({bld.gold_cost}g{bldLumber > 0
						? `, ${bldLumber}w`
						: ''}) [{hotkey}]"
				>
					<!-- Hotkey in top-right corner -->
					<span
						class="absolute top-0.5 right-1 text-[7.5px] font-mono font-bold {isSelected
							? 'text-white'
							: isAffordable
								? 'text-[#fef08a]'
								: 'text-slate-500'}"
					>
						[{hotkey}]
					</span>

					<!-- Visual archetype icon / glyph -->
					<div class="mt-0.5 flex items-center justify-center">
						{#if bld.specialType === 'shop'}
							<ShoppingBag class="w-3.5 h-3.5 text-amber-300 drop-shadow" />
						{:else if bld.specialType === 'forge'}
							<Hammer class="w-3.5 h-3.5 text-cyan-300 drop-shadow" />
						{:else if bld.id === 'h008'}
							<Package class="w-3.5 h-3.5 text-amber-400 drop-shadow" />
						{:else if isLeg}
							<Crown class="w-3.5 h-3.5 text-amber-300 drop-shadow animate-pulse" />
						{:else if bld.specialType === 'tower'}
							<ShieldAlert class="w-3.5 h-3.5 text-cyan-400 drop-shadow" />
						{:else if bld.specialType === 'special' || bld.specialType === 'repair' || bld.specialType === 'recycler'}
							<Zap class="w-3.5 h-3.5 text-purple-400 drop-shadow" />
						{:else if bUnit?.flying}
							<Feather class="w-3.5 h-3.5 text-sky-300 drop-shadow" />
						{:else if bUnit?.attack_type === 'pierce'}
							<Crosshair class="w-3.5 h-3.5 text-emerald-400 drop-shadow" />
						{:else if bUnit?.attack_type === 'magic'}
							<Sparkles class="w-3.5 h-3.5 text-indigo-300 drop-shadow" />
						{:else}
							<Swords class="w-3.5 h-3.5 text-amber-200 drop-shadow" />
						{/if}
					</div>

					<!-- Short building name label -->
					<span
						class="text-[7.5px] font-bold truncate max-w-[48px] leading-tight {isSelected
							? 'text-white'
							: isAffordable
								? 'text-slate-200'
								: 'text-slate-500'}"
					>
						{shortenName(bld.name)}
					</span>

					<!-- Cost badges at bottom -->
					<div class="flex items-center gap-1 text-[7px] font-mono font-bold leading-none mb-0.5">
						<span class={playerGold >= (bld.gold_cost || 200) ? 'text-amber-300' : 'text-red-400'}>
							🪙{bld.gold_cost}
						</span>
						{#if bldLumber > 0}
							<span class={(player.lumber ?? 0) >= bldLumber ? 'text-emerald-400' : 'text-red-400'}>
								🪵{bldLumber}
							</span>
						{/if}
					</div>
				</button>
			{/each}

			<!-- Slot 14: Bridge Repair or Spacer -->
			{#if sim.brokenBridge}
				<button
					type="button"
					onclick={() => sim.orderBridgeRepair(player.team)}
					disabled={(player.lumber ?? 0) < 50}
					data-testid="hud-worker-repair-bridge-btn"
					class="relative w-[58px] h-[38px] rounded border transition flex flex-col justify-between items-center p-0.5 cursor-pointer {(player.lumber ??
						0) >= 50
						? 'bg-amber-950/80 hover:bg-amber-900 border-amber-500/70 text-amber-200 cursor-pointer shadow'
						: 'bg-slate-900/60 border-slate-700 text-slate-500 opacity-60 cursor-not-allowed'}"
					title="Наказати робітникові відбудувати зламаний міст (50 деревини)"
				>
					<span class="text-[7.5px] font-mono text-amber-300 font-bold">50🪵</span>
					<Wrench class="w-3 h-3 text-amber-400" />
					<span class="text-[7.5px] font-bold text-amber-200">Міст</span>
				</button>
			{:else}
				<div class="w-[58px] h-[38px]"></div>
			{/if}

			<!-- Slot 15: Authentic Warcraft III Cancel Button (🚫 Red crossed circle, [Esc]) -->
			<button
				onclick={() => {
					onSelectBuilding(null);
					onClearSelection?.();
				}}
				data-testid="hud-clear-selection-btn"
				class="relative w-[58px] h-[38px] rounded border border-rose-800/80 bg-gradient-to-b from-rose-950/80 to-[#180a0a] hover:from-rose-900 hover:to-rose-950 text-rose-300 flex flex-col items-center justify-center p-0.5 transition cursor-pointer shadow group touch-manipulation"
				title="Скасувати / Очистити вибір (Esc / B)"
			>
				<div class="relative w-4 h-4 flex items-center justify-center">
					<svg
						class="w-4 h-4 text-rose-500 drop-shadow-[0_0_4px_rgba(244,63,94,0.6)] group-hover:scale-110 transition-transform"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
					>
						<circle cx="12" cy="12" r="9" />
						<line x1="5.7" y1="5.7" x2="18.3" y2="18.3" />
					</svg>
				</div>
				<span class="text-[7.5px] font-mono font-bold text-rose-400 group-hover:text-rose-200">
					Esc
				</span>
			</button>
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
			<div class="text-[#fef08a] font-bold text-sm leading-tight">
				Збудувати {bld.name}
				{bHotkey ? `[${bHotkey}]` : ''}
			</div>

			<!-- Resource Cost Line -->
			<div class="flex items-center gap-3 font-mono font-bold text-xs mt-1">
				<span class="text-amber-300 flex items-center gap-1">
					🪙 {hoveredBuilding.gold_cost}
				</span>
				{#if hoveredBuilding.lumber_cost}
					<span class="text-emerald-400 flex items-center gap-1">
						🪵 {hoveredBuilding.lumber_cost}
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
					<Crown class="w-3.5 h-3.5 text-amber-400 shrink-0" />
					<span>Легендарна споруда. Потребує їжу ({player.food}/{player.maxFood}).</span>
				</div>
			{/if}
		</div>
	{/if}
</div>
