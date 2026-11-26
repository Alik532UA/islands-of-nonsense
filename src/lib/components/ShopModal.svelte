<script lang="ts">
	import type { Simulation } from '../engine/simulation';
	import type { PlayerState } from '../engine/types';
	import { BUILDINGS_MAP } from '../engine/gameData';
	import { CASTLE_ITEMS_LIST } from '../engine/items';
	import { sound } from '../services/audio';
	import { shortcutDigit, isEditableTarget } from '../hotkeys/hotkeys';
	import UiIcon, { type UiIconName } from '$lib/components/ui/UiIcon.svelte';
	let {
		sim,
		uiTick = 0,
		localTeam = 'west',
		activePlayer = null,
		isOpen = $bindable(false),
		onBuildShop,
		onBuyItem
	}: {
		sim: Simulation;
		uiTick?: number;
		localTeam?: 'west' | 'east';
		activePlayer?: PlayerState | null;
		isOpen: boolean;
		onBuildShop?: () => void;
		onBuyItem?: (itemId: string) => void;
	} = $props();

	let player = $derived(
		uiTick >= 0
			? (activePlayer ?? (localTeam === 'east' ? sim.players.east : sim.players.west))
			: sim.players.west
	);
	let activeTeam = $derived(uiTick >= 0 ? player.team : player.team);
	let isSandbox = $derived(uiTick >= 0 ? sim.config.modeId === 'sandbox' : false);
	let playerGold = $derived(uiTick >= 0 ? Math.floor(player.gold) : 0);
	let playerLumber = $derived(uiTick >= 0 ? Math.floor(player.lumber ?? 0) : 0);
	let hasShop = $derived(uiTick >= 0 ? sim.hasShop(activeTeam, player) : false);
	let pendingShop = $derived(
		uiTick >= 0
			? sim.buildings.find(
					(b) =>
						b.team === activeTeam &&
						b.specialType === 'shop' &&
						b.isUnderConstruction &&
						(!b.playerId || b.playerId === player.id)
				) || null
			: null
	);

	const shopDef = BUILDINGS_MAP.get('cg10_shop');
	const shopGoldCost = shopDef?.gold_cost ?? 50;
	const shopLumberCost = shopDef?.lumber_cost ?? 50;
	let canAffordBuildShop = $derived(playerGold >= shopGoldCost && playerLumber >= shopLumberCost);

	let visibleItems = $derived(
		CASTLE_ITEMS_LIST.filter(
			(it) => (it.id !== 'I00B' && it.id !== 'I00N') || sim.gameModeConfig?.nuclearWarheads
		)
	);

	const ITEM_THEMES: Record<string, { icon: UiIconName; badgeClass: string }> = {
		I00E: { icon: 'scroll', badgeClass: 'bg-purple-500/15 border-purple-500/40 text-purple-300' },
		I00F: { icon: 'shield', badgeClass: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300' },
		I004: { icon: 'crown', badgeClass: 'bg-amber-500/15 border-amber-500/40 text-amber-300' },
		I001: { icon: 'wand2', badgeClass: 'bg-violet-500/15 border-violet-500/40 text-violet-300' },
		I002: { icon: 'wand2', badgeClass: 'bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-300' },
		I000: { icon: 'wand2', badgeClass: 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300' },
		I005: { icon: 'zap', badgeClass: 'bg-rose-500/15 border-rose-500/40 text-rose-300' },
		I006: { icon: 'sparkles', badgeClass: 'bg-sky-500/15 border-sky-500/40 text-sky-300' },
		I009: {
			icon: 'wrench',
			badgeClass: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
		},
		I00A: { icon: 'volume2', badgeClass: 'bg-blue-500/15 border-blue-500/40 text-blue-300' },
		I008: { icon: 'swords', badgeClass: 'bg-orange-500/15 border-orange-500/40 text-orange-300' },
		I007: { icon: 'flame', badgeClass: 'bg-rose-500/15 border-rose-500/40 text-rose-300' },
		I003: { icon: 'swords', badgeClass: 'bg-amber-500/15 border-amber-500/40 text-amber-300' }
	};

	function getItemTheme(id: string) {
		return (
			ITEM_THEMES[id] ?? {
				icon: 'wand2' as UiIconName,
				badgeClass: 'bg-violet-500/15 border-violet-500/40 text-violet-300'
			}
		);
	}

	function handleBuy(itemId: string) {
		if (onBuyItem) {
			onBuyItem(itemId);
			return;
		}
		const success = sim.buyCastleItem(activeTeam, itemId, player);
		if (success) {
			sound.playCoin();
		} else {
			sound.playErrorResource();
		}
	}

	function handleBuildShop() {
		if (!canAffordBuildShop) {
			sound.playErrorResource();
			return;
		}
		sound.playWorkerSelect();
		onBuildShop?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!isOpen) return;
		if (isEditableTarget(e.target)) return;
		if (e.key === 'Escape') {
			isOpen = false;
			return;
		}
		const num = shortcutDigit(e);
		if (num !== null && num >= 1 && num <= visibleItems.length) {
			const item = visibleItems[num - 1];
			if (item) handleBuy(item.id);
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		role="dialog"
		aria-modal="true"
		aria-label="Магазин"
		class="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 select-none"
		data-testid="shop-modal"
	>
		<div
			class="bg-[#121622] border-2 border-[#8c7456] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl text-white relative overflow-hidden"
			style="box-shadow: 0 16px 48px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,215,140,0.12);"
		>
			<!-- Header -->
			<div
				class="flex items-center justify-between gap-3 px-5 py-3.5 bg-gradient-to-b from-[#1b2130] to-[#121622] border-b border-[#544738]/80 shrink-0"
			>
				<div class="flex items-center gap-3 min-w-0">
					<div
						class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-950/40 border-2 border-emerald-600/60 flex items-center justify-center shadow-inner shrink-0"
					>
						<UiIcon name="shoppingBag" class="w-5 h-5 text-emerald-400" />
					</div>
					<div class="min-w-0">
						<h2
							class="text-base sm:text-lg font-extrabold tracking-wide text-emerald-300 uppercase"
						>
							Магазин
						</h2>
						<p class="text-[11px] text-slate-400 truncate">
							Стратегічні припаси та екстрений захист вашої цитаделі ({visibleItems.length}
							предметів)
						</p>
					</div>
				</div>

				<div class="flex items-center gap-2 shrink-0">
					<!-- Live Resources Pill -->
					<div
						class="hidden sm:flex items-center gap-2.5 bg-[#0a0d14] border border-[#3b3226] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold shadow-inner"
					>
						<span class="flex items-center gap-1 text-amber-400" title="Доступне золото">
							<UiIcon name="coins" class="w-3.5 h-3.5 text-amber-400" />
							{isSandbox ? '∞' : playerGold}
						</span>
						<span class="h-3 w-px bg-[#3b3226]"></span>
						<span
							class="flex items-center gap-1 {isSandbox || playerLumber > 0
								? 'text-emerald-300'
								: 'text-slate-500'}"
							title="Доступна деревина"
						>
							<UiIcon
								name="treePine"
								class="w-3.5 h-3.5 {isSandbox || playerLumber > 0
									? 'text-emerald-400'
									: 'text-slate-500'}"
							/>
							{isSandbox ? '∞' : playerLumber}
						</span>
					</div>

					<button
						type="button"
						onclick={() => (isOpen = false)}
						data-testid="shop-close-btn"
						class="w-9 h-9 rounded-lg bg-[#181d28] hover:bg-[#242c3d] border border-[#3b3226] hover:border-amber-500/70 text-slate-300 hover:text-amber-300 flex items-center justify-center transition cursor-pointer active:scale-95"
						aria-label="Закрити Магазин"
					>
						<UiIcon name="x" class="w-4 h-4" />
					</button>
				</div>
			</div>

			<!-- Body -->
			<div class="p-4 flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto">
				<!-- Shop Construction Status Banner -->
				{#if pendingShop}
					{@const pct = Math.max(
						0,
						Math.min(100, Math.round((pendingShop.hp / (pendingShop.maxHp || 1)) * 100))
					)}
					<div
						class="px-3.5 py-2 bg-[#1b1610] border border-amber-500/60 rounded-xl flex items-center justify-between gap-3 shrink-0 shadow-inner"
						data-testid="shop-building-progress"
					>
						<div class="flex items-center gap-2 min-w-0">
							<UiIcon name="hammer" class="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
							<span class="text-xs font-bold text-amber-200">
								Магазин зводиться робітником ({pct}%)
							</span>
						</div>
						<div class="w-28 h-2 bg-[#0a0d14] rounded-full overflow-hidden border border-[#544738]">
							<div
								class="h-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all duration-150"
								style="width: {pct}%"
							></div>
						</div>
					</div>
				{:else if !hasShop}
					<div
						class="px-3.5 py-2.5 bg-gradient-to-r from-[#211811] via-[#1a1615] to-[#131825] border border-[#8c7456]/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-inner"
						data-testid="shop-not-built-banner"
					>
						<div class="flex items-center gap-2.5 min-w-0">
							<div
								class="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-400 shrink-0"
							>
								<UiIcon name="shoppingBag" class="w-4 h-4" />
							</div>
							<div class="min-w-0">
								<div class="text-xs font-bold text-amber-200">Магазин ще не збудовано</div>
								<div class="text-[11px] text-slate-400">
									Зведіть Магазин на базі, щоб купувати припаси та артефакти
								</div>
							</div>
						</div>

						{#if onBuildShop}
							<button
								type="button"
								onclick={handleBuildShop}
								disabled={!canAffordBuildShop}
								data-testid="shop-build-btn"
								class="px-3.5 py-1.5 rounded-xl border-2 text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95 {canAffordBuildShop
									? 'bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 border-emerald-300 text-slate-950 shadow-lg shadow-emerald-950/60'
									: 'bg-[#181d28] border-[#3b3226] text-slate-400 opacity-75 cursor-not-allowed'}"
								title={canAffordBuildShop
									? 'Вибрати місце на мапі для будівництва Магазину'
									: `Потрібно ${shopGoldCost} золота та ${shopLumberCost} деревини`}
							>
								<UiIcon name="hammer" class="w-3.5 h-3.5 shrink-0" />
								<span>Будувати</span>
								<span
									class="flex items-center gap-1.5 font-mono text-[11px] pl-1.5 border-l {canAffordBuildShop
										? 'border-slate-900/30'
										: 'border-slate-700'}"
								>
									<span
										class="flex items-center gap-0.5 {playerGold >= shopGoldCost
											? ''
											: 'text-rose-400'}"
									>
										<UiIcon name="coins" class="w-3 h-3" />
										{shopGoldCost}
									</span>
									<span
										class="flex items-center gap-0.5 {playerLumber >= shopLumberCost
											? ''
											: 'text-rose-400'}"
									>
										<UiIcon name="treePine" class="w-3 h-3" />
										{shopLumberCost}
									</span>
								</span>
							</button>
						{/if}
					</div>
				{:else}
					<div
						class="px-3 py-1.5 bg-emerald-950/35 border border-emerald-600/40 rounded-lg text-emerald-300 text-[11px] font-semibold flex items-center gap-2 shrink-0"
						data-testid="shop-active-banner"
					>
						<UiIcon name="checkCircle2" class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
						<span>Магазин активний — припаси готові до використання</span>
					</div>
				{/if}

				<!-- Multi-column Item Grid (Fits cleanly without scrolling on desktop) -->
				<div
					class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5"
					data-testid="shop-items-grid"
				>
					{#each visibleItems as item, idx}
						{@const theme = getItemTheme(item.id)}
						{@const cd = sim.getItemCooldown(localTeam, item.id)}
						{@const canAfford = playerGold >= item.cost}
						{@const canBuy = hasShop && canAfford && cd <= 0}

						<div
							class="bg-[#0b0e16] border border-[#3b3226] hover:border-[#544738] rounded-xl p-3 flex flex-col justify-between gap-2.5 transition shadow-inner"
							data-testid="shop-item-card-{item.id}"
						>
							<div class="flex items-start gap-2.5 min-w-0">
								<div
									class="relative w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 {theme.badgeClass}"
								>
									<UiIcon name={theme.icon} class="w-4 h-4" />
									{#if idx < 9}
										<span
											class="absolute -top-1.5 -left-1.5 px-1 rounded bg-[#0a0d14] border border-[#544738] text-[9px] font-mono font-bold text-amber-300 leading-tight"
										>
											{idx + 1}
										</span>
									{/if}
								</div>

								<div class="min-w-0 flex-1">
									<h3 class="font-bold text-xs sm:text-[13px] text-slate-100 leading-tight">
										{item.nameUk}
									</h3>
									<p class="text-[11px] text-slate-400 mt-1 leading-snug line-clamp-2">
										{item.descriptionUk}
									</p>
								</div>
							</div>

							<div class="flex items-center justify-between gap-2 pt-1.5 border-t border-[#1e2433]">
								<span class="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
									<UiIcon name="clock" class="w-3 h-3 text-slate-500" />
									{item.cooldown}с
								</span>

								<button
									type="button"
									onclick={() => handleBuy(item.id)}
									disabled={!canBuy}
									data-testid="shop-buy-btn-{item.id}"
									class="px-3 py-1.5 rounded-lg border text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 {canBuy
										? 'bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 border-emerald-400 text-white shadow'
										: 'bg-[#171c29] border-[#293142] text-slate-500 cursor-not-allowed'}"
								>
									{#if cd > 0}
										<span class="font-mono text-amber-400">{Math.ceil(cd)}с</span>
									{:else}
										<span>Купити</span>
										<span
											class="flex items-center gap-0.5 font-mono pl-1.5 border-l {canBuy
												? 'border-white/25 text-amber-200'
												: canAfford
													? 'border-slate-700 text-amber-400/70'
													: 'border-slate-700 text-rose-400'}"
										>
											<UiIcon name="coins" class="w-3 h-3" />
											{item.cost}
										</span>
									{/if}
								</button>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Footer -->
			<div
				class="px-5 py-2.5 border-t border-[#544738]/60 bg-[#0d1019] flex justify-between items-center text-[11px] text-slate-400 shrink-0"
			>
				<span class="flex items-center gap-1.5">
					Гаряча клавіша:
					<kbd
						class="px-1.5 py-0.5 bg-[#181d28] border border-[#544738] rounded text-amber-300 font-mono"
					>
						B
					</kbd>
					<span class="hidden sm:inline text-slate-500">• 1–9 швидка покупка</span>
				</span>
				<span>ESC щоб закрити</span>
			</div>
		</div>
	</div>
{/if}
