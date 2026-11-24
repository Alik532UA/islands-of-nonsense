<script lang="ts">
	import type { Simulation } from '../engine/simulation';
	import type { PlayerState } from '../engine/types';
	import { BUILDINGS_MAP } from '../engine/gameData';
	import { sound } from '../services/audio';
	import {
		Hammer,
		Sword,
		Shield,
		TrendingUp,
		X,
		Coins,
		TreePine,
		CheckCircle2,
		Check
	} from 'lucide-svelte';

	type ForgeUpgradeType = 'attack' | 'armor' | 'econ';

	let {
		sim,
		uiTick = 0,
		localTeam = 'west',
		activePlayer = null,
		isOpen = $bindable(false),
		onBuildForge,
		onUpgradeForge
	}: {
		sim: Simulation;
		uiTick?: number;
		localTeam?: 'west' | 'east';
		activePlayer?: PlayerState | null;
		isOpen: boolean;
		onBuildForge?: () => void;
		onUpgradeForge?: (type: ForgeUpgradeType) => void;
	} = $props();

	let player = $derived(
		uiTick >= 0
			? (activePlayer ?? (localTeam === 'east' ? sim.players.east : sim.players.west))
			: sim.players.west
	);
	let activeTeam = $derived(player.team);
	let playerGold = $derived(Math.floor(player.gold));
	let playerLumber = $derived(Math.floor(player.lumber ?? 0));
	let isAlik = $derived(player.commander === 2);
	let hasForge = $derived(uiTick >= 0 ? sim.hasForge(activeTeam, player) : false);
	let pendingForge = $derived(
		uiTick >= 0
			? sim.buildings.find(
					(b) =>
						b.team === activeTeam &&
						b.specialType === 'forge' &&
						b.isUnderConstruction &&
						(!b.playerId || b.playerId === player.id)
				) || null
			: null
	);

	const forgeDef = BUILDINGS_MAP.get('cg11_forge');
	const forgeGoldCost = forgeDef?.gold_cost ?? 100;
	const forgeLumberCost = forgeDef?.lumber_cost ?? 100;
	let canAffordBuildForge = $derived(
		playerGold >= forgeGoldCost && playerLumber >= forgeLumberCost
	);

	let upgrades = $derived.by(() => {
		const atkLvl = player.forge.attack;
		const armLvl = player.forge.armor;
		const ecoLvl = player.forge.econ;

		return [
			{
				type: 'attack' as const,
				title: 'Гострота Зброї',
				icon: Sword,
				level: atkLvl,
				maxLevel: 5,
				currentText: `+${atkLvl * 8}% до шкоди`,
				nextText: atkLvl < 5 ? `+${(atkLvl + 1) * 8}%` : null,
				goldPrice: sim.getForgePrice(localTeam, 'attack', player),
				lumberPrice: sim.getForgeLumberPrice(localTeam, 'attack', player),
				accent: 'red' as const
			},
			{
				type: 'armor' as const,
				title: 'Ковані Лати',
				icon: Shield,
				level: armLvl,
				maxLevel: 5,
				currentText: `+${armLvl} до броні`,
				nextText: armLvl < 5 ? `+${armLvl + 1}` : null,
				goldPrice: sim.getForgePrice(localTeam, 'armor', player),
				lumberPrice: sim.getForgeLumberPrice(localTeam, 'armor', player),
				accent: 'blue' as const
			},
			{
				type: 'econ' as const,
				title: 'Гільдія Торговців',
				icon: TrendingUp,
				level: ecoLvl,
				maxLevel: 3,
				currentText: `+${ecoLvl * 10}% до доходу`,
				nextText: ecoLvl < 3 ? `+${(ecoLvl + 1) * 10}%` : null,
				goldPrice: sim.getForgePrice(localTeam, 'econ', player),
				lumberPrice: sim.getForgeLumberPrice(localTeam, 'econ', player),
				accent: 'amber' as const
			}
		];
	});

	const accentStyles = {
		red: {
			iconBox: 'bg-rose-950/70 border-rose-500/50 text-rose-400',
			levelText: 'text-rose-400',
			pipFilled:
				'bg-gradient-to-t from-rose-600 to-rose-400 border-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.5)]',
			pipNext: 'bg-rose-950/50 border-rose-500/50',
			btnActive:
				'bg-gradient-to-b from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 border-rose-400 text-white shadow-lg shadow-rose-950/60'
		},
		blue: {
			iconBox: 'bg-sky-950/70 border-sky-500/50 text-sky-400',
			levelText: 'text-sky-400',
			pipFilled:
				'bg-gradient-to-t from-sky-600 to-cyan-400 border-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.5)]',
			pipNext: 'bg-sky-950/50 border-sky-500/50',
			btnActive:
				'bg-gradient-to-b from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 border-sky-400 text-white shadow-lg shadow-sky-950/60'
		},
		amber: {
			iconBox: 'bg-amber-950/70 border-amber-500/50 text-amber-400',
			levelText: 'text-amber-400',
			pipFilled:
				'bg-gradient-to-t from-amber-600 to-yellow-400 border-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.5)]',
			pipNext: 'bg-amber-950/50 border-amber-500/50',
			btnActive:
				'bg-gradient-to-b from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 border-amber-400 text-white shadow-lg shadow-amber-950/60'
		}
	};

	function handleUpgrade(type: ForgeUpgradeType) {
		if (onUpgradeForge) {
			onUpgradeForge(type);
			return;
		}
		const ok = sim.upgradeForge(activeTeam, type, player);
		if (ok) sound.playForgeUpgrade();
		else sound.playErrorResource();
	}

	function handleBuildForge() {
		if (!canAffordBuildForge) {
			sound.playErrorResource();
			return;
		}
		sound.playWorkerSelect();
		onBuildForge?.();
	}
</script>

{#if isOpen}
	<div
		role="dialog"
		aria-modal="true"
		aria-label="Військова Кузня"
		class="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none"
		data-testid="forge-modal"
	>
		<div
			class="bg-[#121622] border-2 border-[#8c7456] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl text-white relative overflow-hidden"
			style="box-shadow: 0 16px 48px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,215,140,0.12);"
		>
			<!-- Header -->
			<div
				class="flex items-center justify-between gap-3 px-5 py-4 bg-gradient-to-b from-[#1b2130] to-[#121622] border-b border-[#544738]/80 shrink-0"
			>
				<div class="flex items-center gap-3 min-w-0">
					<div
						class="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-950/40 border-2 border-[#8c7456] flex items-center justify-center shadow-inner shrink-0"
					>
						<Hammer class="w-5 h-5 text-amber-400" />
					</div>
					<div class="min-w-0">
						<div class="flex items-center gap-2 flex-wrap">
							<h2
								class="text-base sm:text-lg font-extrabold tracking-wide text-amber-300 uppercase"
							>
								Військова Кузня
							</h2>
							{#if isAlik}
								<span
									class="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/50 text-[10px] font-bold text-emerald-300"
								>
									Знижка Алика -50%
								</span>
							{/if}
						</div>
						<p class="text-[11px] text-slate-400 truncate">
							Ковальські покращення армії та економіки на поточний раунд
						</p>
					</div>
				</div>

				<div class="flex items-center gap-2 shrink-0">
					<!-- Live Resources Pill -->
					<div
						class="hidden sm:flex items-center gap-2.5 bg-[#0a0d14] border border-[#3b3226] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold shadow-inner"
					>
						<span class="flex items-center gap-1 text-amber-400" title="Доступне золото">
							<Coins class="w-3.5 h-3.5 text-amber-400" />
							{playerGold}
						</span>
						<span class="h-3 w-px bg-[#3b3226]"></span>
						<span
							class="flex items-center gap-1 {playerLumber > 0
								? 'text-emerald-300'
								: 'text-slate-500'}"
							title="Доступна деревина"
						>
							<TreePine
								class="w-3.5 h-3.5 {playerLumber > 0 ? 'text-emerald-400' : 'text-slate-500'}"
							/>
							{playerLumber}
						</span>
					</div>

					<button
						type="button"
						onclick={() => (isOpen = false)}
						data-testid="forge-close-btn"
						class="w-9 h-9 rounded-lg bg-[#181d28] hover:bg-[#242c3d] border border-[#3b3226] hover:border-amber-500/70 text-slate-300 hover:text-amber-300 flex items-center justify-center transition cursor-pointer active:scale-95"
						aria-label="Закрити Кузню"
					>
						<X class="w-4 h-4" />
					</button>
				</div>
			</div>

			<!-- Body -->
			<div class="p-4 sm:p-5 flex flex-col gap-3 flex-1 overflow-y-auto">
				<!-- Forge Construction Status Banner -->
				{#if pendingForge}
					{@const pct = Math.max(
						0,
						Math.min(100, Math.round((pendingForge.hp / (pendingForge.maxHp || 1)) * 100))
					)}
					<div
						class="px-3.5 py-2.5 bg-[#1b1610] border border-amber-500/60 rounded-xl flex items-center justify-between gap-3 shrink-0 shadow-inner"
						data-testid="forge-building-progress"
					>
						<div class="flex items-center gap-2.5 min-w-0">
							<Hammer class="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
							<div class="text-xs font-bold text-amber-200">
								Кузня зводиться робітником ({pct}%)
							</div>
						</div>
						<div class="w-28 h-2 bg-[#0a0d14] rounded-full overflow-hidden border border-[#544738]">
							<div
								class="h-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all duration-150"
								style="width: {pct}%"
							></div>
						</div>
					</div>
				{:else if !hasForge}
					<div
						class="p-3.5 bg-gradient-to-r from-[#211811] via-[#1a1615] to-[#131825] border border-[#8c7456]/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-inner"
						data-testid="forge-not-built-banner"
					>
						<div class="flex items-start gap-2.5 min-w-0">
							<div
								class="p-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-400 shrink-0"
							>
								<Hammer class="w-4 h-4" />
							</div>
							<div class="min-w-0">
								<div class="text-xs font-bold text-amber-200">Кузня ще не збудована</div>
								<div class="text-[11px] text-slate-400 mt-0.5">
									Зведіть споруду на базі, щоб розблокувати ковальські покращення
								</div>
							</div>
						</div>

						{#if onBuildForge}
							<button
								type="button"
								onclick={handleBuildForge}
								disabled={!canAffordBuildForge}
								data-testid="forge-build-btn"
								class="px-3.5 py-2 rounded-xl border-2 text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95 {canAffordBuildForge
									? 'bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 border-amber-300 text-slate-950 shadow-lg shadow-amber-950/60'
									: 'bg-[#181d28] border-[#3b3226] text-slate-400 opacity-75 cursor-not-allowed'}"
								title={canAffordBuildForge
									? 'Вибрати місце на мапі для будівництва Кузні'
									: `Потрібно ${forgeGoldCost} золота та ${forgeLumberCost} деревини`}
							>
								<Hammer class="w-3.5 h-3.5 shrink-0" />
								<span>Будувати</span>
								<span
									class="flex items-center gap-1.5 font-mono text-[11px] pl-1.5 border-l {canAffordBuildForge
										? 'border-slate-900/30'
										: 'border-slate-700'}"
								>
									<span
										class="flex items-center gap-0.5 {playerGold >= forgeGoldCost
											? ''
											: 'text-rose-400'}"
									>
										<Coins class="w-3 h-3" />
										{forgeGoldCost}
									</span>
									<span
										class="flex items-center gap-0.5 {playerLumber >= forgeLumberCost
											? ''
											: 'text-rose-400'}"
									>
										<TreePine class="w-3 h-3" />
										{forgeLumberCost}
									</span>
								</span>
							</button>
						{/if}
					</div>
				{:else}
					<div
						class="px-3 py-1.5 bg-emerald-950/35 border border-emerald-600/40 rounded-lg text-emerald-300 text-[11px] font-semibold flex items-center gap-2 shrink-0"
						data-testid="forge-active-banner"
					>
						<CheckCircle2 class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
						<span>Кузня активна — покращення застосовуються миттєво до всієї армії</span>
					</div>
				{/if}

				<!-- Upgrade Slots -->
				<div class="flex flex-col gap-2.5">
					{#each upgrades as up}
						{@const Icon = up.icon}
						{@const style = accentStyles[up.accent]}
						{@const isMax = up.level >= up.maxLevel}
						{@const canAfford = playerGold >= up.goldPrice && playerLumber >= up.lumberPrice}
						{@const canUpgrade = hasForge && !isMax && canAfford}

						<div
							class="bg-[#0b0e16] border border-[#3b3226] hover:border-[#544738] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition shadow-inner"
							data-testid="forge-upgrade-card-{up.type}"
						>
							<div class="flex items-center gap-3.5 min-w-0">
								<!-- Emblem with Level Counter -->
								<div
									class="relative w-12 h-12 rounded-xl border-2 flex items-center justify-center shrink-0 shadow-inner {style.iconBox}"
								>
									<Icon class="w-5 h-5" />
									<span
										class="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 rounded-md bg-[#0a0d14] border border-[#544738] text-[9px] font-mono font-black {style.levelText} leading-none shadow"
									>
										{up.level}/{up.maxLevel}
									</span>
								</div>

								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<span class="font-bold text-sm text-slate-100">{up.title}</span>
									</div>

									<div class="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
										<span class="text-slate-200 font-semibold">{up.currentText}</span>
										{#if up.nextText}
											<span class="text-slate-500">→</span>
											<span class="{style.levelText} font-mono font-bold">{up.nextText}</span>
										{/if}
									</div>

									<!-- Segmented RPG Level Pips -->
									<div class="flex items-center gap-1 mt-2">
										{#each Array.from({ length: up.maxLevel }) as _, idx}
											<div
												class="h-1.5 flex-1 max-w-[28px] rounded-sm border transition-all {idx <
												up.level
													? style.pipFilled
													: idx === up.level && canUpgrade
														? `${style.pipNext} animate-pulse`
														: 'bg-[#171c29] border-[#293142]'}"
											></div>
										{/each}
									</div>
								</div>
							</div>

							<!-- Action Button or Max Badge -->
							{#if !isMax}
								<button
									type="button"
									onclick={() => handleUpgrade(up.type)}
									disabled={!canUpgrade}
									data-testid="forge-upgrade-btn-{up.type}"
									class="px-3.5 py-2 rounded-xl border-2 text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 min-w-[144px] cursor-pointer active:scale-95 {canUpgrade
										? style.btnActive
										: 'bg-[#171c29] border-[#293142] text-slate-500 cursor-not-allowed'}"
								>
									<span>Покращити</span>
									<span
										class="flex items-center gap-1.5 font-mono text-[11px] pl-1.5 border-l {canUpgrade
											? 'border-white/25'
											: 'border-slate-700'}"
									>
										<span
											class="flex items-center gap-0.5 {playerGold >= up.goldPrice
												? canUpgrade
													? 'text-amber-200'
													: 'text-amber-400/70'
												: 'text-rose-400'}"
										>
											<Coins class="w-3 h-3" />
											{up.goldPrice}
										</span>
										{#if up.lumberPrice > 0}
											<span
												class="flex items-center gap-0.5 {playerLumber >= up.lumberPrice
													? canUpgrade
														? 'text-emerald-200'
														: 'text-emerald-400/70'
													: 'text-rose-400'}"
											>
												<TreePine class="w-3 h-3" />
												{up.lumberPrice}
											</span>
										{/if}
									</span>
								</button>
							{:else}
								<span
									class="px-3.5 py-2 rounded-xl border border-emerald-500/60 bg-emerald-950/60 text-emerald-300 text-xs font-extrabold tracking-wider flex items-center justify-center gap-1.5 shrink-0 min-w-[144px]"
								>
									<Check class="w-3.5 h-3.5 text-emerald-400" />
									МАКСИМУМ
								</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}
