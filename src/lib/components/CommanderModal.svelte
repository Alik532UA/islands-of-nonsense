<script lang="ts">
	import type { Simulation } from '../engine/simulation';
	import type { PlayerState } from '../engine/types';
	import {
		COMMANDER_CHANGE_GOLD_COST,
		COMMANDER_CHANGE_LUMBER_COST,
		findCommander
	} from '../engine/commanders';
	import { BUILDINGS_MAP } from '../engine/gameData';
	import CommanderPickerGrid from './CommanderPickerGrid.svelte';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	let {
		sim,
		uiTick = 0,
		activePlayer = null,
		isOpen = $bindable(false),
		onBuildCommanderHall,
		onSelectCommander
	}: {
		sim: Simulation;
		uiTick?: number;
		activePlayer?: PlayerState | null;
		isOpen: boolean;
		onBuildCommanderHall?: () => void;
		onSelectCommander?: (choice: number | 'random') => boolean | void;
	} = $props();

	let player = $derived(activePlayer ?? sim.players.west);
	let playerGold = $derived(uiTick >= 0 ? Math.floor(player.gold) : 0);
	let playerLumber = $derived(uiTick >= 0 ? Math.floor(player.lumber ?? 0) : 0);
	let hallStatus = $derived(
		uiTick >= 0
			? sim.canSelectOrChangeCommander(player.team, player)
			: sim.canSelectOrChangeCommander(player.team, player)
	);
	let pendingHall = $derived(
		uiTick >= 0
			? sim.buildings.find(
					(b) =>
						b.team === player.team &&
						b.specialType === 'commander' &&
						b.isUnderConstruction &&
						(!b.playerId || b.playerId === player.id)
				) || null
			: null
	);

	const hallDef = BUILDINGS_MAP.get('cg12_commander');
	const hallGoldCost = hallDef?.gold_cost ?? COMMANDER_CHANGE_GOLD_COST;
	const hallLumberCost = hallDef?.lumber_cost ?? COMMANDER_CHANGE_LUMBER_COST;
	let canAffordBuildHall = $derived(playerGold >= hallGoldCost && playerLumber >= hallLumberCost);
	let activeCommander = $derived(uiTick >= 0 ? findCommander(player.commander) : null);

	function formatCooldown(sec: number): string {
		const s = Math.max(0, Math.ceil(sec));
		const m = Math.floor(s / 60);
		const rem = s % 60;
		return `${m}:${rem < 10 ? '0' : ''}${rem}`;
	}
</script>

{#if isOpen}
	<div
		role="dialog"
		aria-modal="true"
		aria-label="Командири"
		data-testid="commander-modal"
		class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
	>
		<div
			class="bg-[#121622] border-2 border-[#544738] rounded-2xl w-full max-w-3xl shadow-2xl p-6 text-white relative flex flex-col max-h-[85vh] overflow-hidden"
			style="box-shadow: 0 10px 40px rgba(0,0,0,0.95);"
		>
			<!-- Close button -->
			<button
				type="button"
				onclick={() => (isOpen = false)}
				data-testid="commander-close-btn"
				class="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
				aria-label="Закрити"
			>
				<UiIcon name="x" class="w-5 h-5" />
			</button>

			<!-- Header -->
			<div class="flex items-center gap-3 border-b border-[#3b3226] pb-3.5 mb-4 shrink-0">
				<div class="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/40 text-indigo-300">
					<UiIcon name="crown" class="w-5 h-5" />
				</div>
				<div>
					<h2 class="text-base font-bold text-indigo-200 flex items-center gap-2">
						<span>Командири</span>
						<span
							class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/50 border border-indigo-500/40 text-indigo-300"
						>
							C
						</span>
					</h2>
					<p class="text-xs text-slate-400">
						Оберіть стратегічного командира для бонусу команді (Випадковий = ×2)
					</p>
				</div>
			</div>

			<!-- Commanders Grid -->
			<div class="overflow-y-auto pr-1 flex-1 space-y-3">
				{#if pendingHall}
					{@const pct = Math.max(
						0,
						Math.min(100, Math.round((pendingHall.hp / (pendingHall.maxHp || 1)) * 100))
					)}
					<div
						class="px-3.5 py-2.5 bg-[#161524] border border-indigo-500/60 rounded-xl flex items-center justify-between gap-3"
						data-testid="commander-hall-building-progress"
					>
						<div class="flex items-center gap-2.5 min-w-0">
							<UiIcon name="crown" class="w-4 h-4 text-indigo-400 animate-pulse shrink-0" />
							<div class="text-xs font-bold text-indigo-200">
								Дім командира зводиться робітником ({pct}%)
							</div>
						</div>
						<div class="w-28 h-2 bg-[#0a0d14] rounded-full overflow-hidden border border-[#544738]">
							<div
								class="h-full bg-gradient-to-r from-indigo-500 to-purple-400 transition-all duration-150"
								style="width: {pct}%"
							></div>
						</div>
					</div>
				{:else if !hallStatus.hasHall}
					<div
						class="p-3.5 bg-gradient-to-r from-[#1a182b] via-[#171625] to-[#131825] border border-indigo-500/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
						data-testid="commander-hall-not-built-banner"
					>
						<div class="flex items-start gap-2.5 min-w-0">
							<div
								class="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 shrink-0"
							>
								<UiIcon name="crown" class="w-4 h-4" />
							</div>
							<div class="min-w-0">
								<div class="text-xs font-bold text-indigo-200">Дім командира ще не збудовано</div>
								<div class="text-[11px] text-slate-400 mt-0.5">
									Збудуйте Дім командира (250 золота та 250 деревини), щоб вибрати або змінювати
									командира
								</div>
							</div>
						</div>

						{#if onBuildCommanderHall}
							<button
								type="button"
								onclick={onBuildCommanderHall}
								disabled={!canAffordBuildHall}
								data-testid="commander-hall-build-btn"
								class="px-3.5 py-2 rounded-xl border-2 text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95 {canAffordBuildHall
									? 'bg-gradient-to-b from-indigo-500 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 border-indigo-300 text-white shadow-lg'
									: 'bg-[#181d28] border-[#3b3226] text-slate-400 opacity-75 cursor-not-allowed'}"
							>
								<UiIcon name="crown" class="w-3.5 h-3.5 shrink-0" />
								<span>Будувати</span>
								<span
									class="flex items-center gap-1.5 font-mono text-[11px] pl-1.5 border-l border-white/20"
								>
									<span
										class="flex items-center gap-0.5 {playerGold >= hallGoldCost
											? ''
											: 'text-rose-400'}"
									>
										<UiIcon name="coins" class="w-3 h-3" />
										{hallGoldCost}
									</span>
									<span
										class="flex items-center gap-0.5 {playerLumber >= hallLumberCost
											? 'text-emerald-300'
											: 'text-rose-400'}"
									>
										<UiIcon name="treePine" class="w-3 h-3" />
										{hallLumberCost}
									</span>
								</span>
							</button>
						{/if}
					</div>
				{:else}
					<div
						class="px-3.5 py-2 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs {hallStatus.isFree
							? 'bg-emerald-950/35 border-emerald-500/40 text-emerald-200'
							: hallStatus.allowed
								? 'bg-amber-950/35 border-amber-500/40 text-amber-200'
								: 'bg-rose-950/35 border-rose-500/40 text-rose-200'}"
						data-testid="commander-change-status"
					>
						<div class="flex items-center gap-2">
							{#if hallStatus.isFirstPick}
								<span class="font-bold">Перший вибір командира — безкоштовно</span>
							{:else if hallStatus.isFree}
								<span class="font-bold">Кулдаун завершено — зміна командира безкоштовна</span>
							{:else}
								<UiIcon name="clock" class="w-3.5 h-3.5 text-amber-300 shrink-0" />
								<span>
									Безкоштовна зміна через
									<strong class="font-mono">{formatCooldown(hallStatus.cooldownLeft)}</strong>
									· зараз: <strong>{hallStatus.goldCost}g + {hallStatus.lumberCost}w</strong>
								</span>
							{/if}
						</div>
						{#if activeCommander}
							<span class="text-[11px] text-indigo-300 font-bold">
								Поточний: {activeCommander.name}{player.isRandomCommander ? ' (×2)' : ''}
							</span>
						{/if}
					</div>
				{/if}

				<CommanderPickerGrid
					selectedCommanderId={activeCommander?.id ?? null}
					isRandomBoostActive={Boolean(player.isRandomCommander)}
					disabled={!hallStatus.allowed}
					onSelect={(choice) => {
						if (onSelectCommander) {
							const handled = onSelectCommander(choice);
							if (handled !== false) {
								isOpen = false;
							}
							return;
						}
						const res = sim.selectPlayerCommander(player.team, choice, player);
						if (res.ok) {
							isOpen = false;
						}
					}}
				/>
			</div>
		</div>
	</div>
{/if}
