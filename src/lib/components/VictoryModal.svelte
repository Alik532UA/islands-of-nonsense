<script lang="ts">
	import type { Simulation } from '../engine/simulation';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	let {
		sim,
		uiTick = 0,
		localTeam = 'west',
		isOnline = false,
		isOnlineHost = true,
		earnedScore = null,
		earnedXp = null,
		serializedReplay = null,
		onNextRound,
		onWatchReplay
	}: {
		sim: Simulation;
		uiTick?: number;
		localTeam?: 'west' | 'east';
		isOnline?: boolean;
		isOnlineHost?: boolean;
		earnedScore?: number | null;
		earnedXp?: number | null;
		serializedReplay?: string | null;
		onNextRound: () => void;
		onWatchReplay?: () => void;
	} = $props();

	let replayCopied = $state(false);
	async function copyReplayJson() {
		if (!serializedReplay || typeof navigator === 'undefined') return;
		try {
			await navigator.clipboard.writeText(serializedReplay);
			replayCopied = true;
			setTimeout(() => (replayCopied = false), 2000);
		} catch {
			// ignore clipboard errors
		}
	}

	function sumTeamStats(team: 'west' | 'east') {
		const members = sim.teamMembers?.[team];
		if (!members || members.length === 0) return sim.players[team].stats;
		return members.reduce(
			(acc, p) => {
				acc.damageToCastle += p.stats.damageToCastle ?? 0;
				acc.totalDamageDealt += p.stats.totalDamageDealt ?? 0;
				acc.unitsKilled += p.stats.unitsKilled ?? 0;
				acc.unitsSpawned += p.stats.unitsSpawned ?? 0;
				acc.coinsCollected += p.stats.coinsCollected ?? 0;
				acc.itemsPurchased += p.stats.itemsPurchased ?? 0;
				acc.goldSpent += p.stats.goldSpent ?? 0;
				return acc;
			},
			{
				damageToCastle: 0,
				totalDamageDealt: 0,
				unitsKilled: 0,
				unitsSpawned: 0,
				coinsCollected: 0,
				itemsPurchased: 0,
				goldSpent: 0
			}
		);
	}

	// Explicitly derive from uiTick so Svelte 5 reacts to simulation round/match completion
	let winner = $derived(uiTick >= 0 ? sim.winner : null);
	let isLocalWin = $derived(winner === localTeam);
	let isMatchOver = $derived(uiTick >= 0 ? !!sim.matchWinner : false);
	let statsWest = $derived(uiTick >= 0 ? sumTeamStats('west') : sim.players.west.stats);
	let statsEast = $derived(uiTick >= 0 ? sumTeamStats('east') : sim.players.east.stats);
	let myMvp = $derived(uiTick >= 0 ? sim.getMvpBuilding(localTeam) : null);
	let westTeamLabel = $derived(
		localTeam === 'west' ? 'Ваша команда' : isOnline ? 'Супротивник' : 'Бот (Супротивник)'
	);
	let eastTeamLabel = $derived(
		localTeam === 'east' ? 'Ваша команда' : isOnline ? 'Супротивник' : 'Бот (Супротивник)'
	);

	let countdown = $state(10);
	let isPaused = $state(false);

	$effect(() => {
		if (!winner) {
			countdown = 10;
			isPaused = false;
			return;
		}

		if (isPaused) return;

		const timer = setInterval(() => {
			if (countdown > 1) {
				countdown--;
			} else {
				countdown = 0;
				clearInterval(timer);
				if (!isOnline || isOnlineHost) {
					onNextRound();
				}
			}
		}, 1000);

		return () => clearInterval(timer);
	});
</script>

{#if winner}
	<div
		class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none"
	>
		<div
			class="bg-slate-900 border {isMatchOver
				? isLocalWin
					? 'border-amber-400 shadow-amber-500/30 ring-2 ring-amber-400/50'
					: 'border-red-600 shadow-red-600/30'
				: isLocalWin
					? 'border-blue-500/80 shadow-blue-500/20'
					: 'border-red-500/80 shadow-red-500/20'} rounded-3xl w-full max-w-md shadow-2xl p-7 text-white text-center"
		>
			<!-- Big Trophy or Skull Icon -->
			<div
				class="inline-flex p-4 rounded-2xl mb-4 {isMatchOver
					? isLocalWin
						? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
						: 'bg-red-500/20 text-red-400 border border-red-500/40'
					: isLocalWin
						? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
						: 'bg-red-500/20 text-red-400 border border-red-500/40'}"
			>
				{#if isMatchOver}
					{#if isLocalWin}
						<UiIcon name="award" class="w-12 h-12 text-amber-400 animate-bounce" />
					{:else}
						<UiIcon name="skull" class="w-12 h-12 text-red-400" />
					{/if}
				{:else if isLocalWin}
					<UiIcon name="trophy" class="w-12 h-12" />
				{:else}
					<UiIcon name="skull" class="w-12 h-12" />
				{/if}
			</div>

			<!-- Title -->
			<h2
				class="text-2xl font-black uppercase tracking-wider mb-1 {isMatchOver
					? isLocalWin
						? 'text-amber-400'
						: 'text-red-400'
					: isLocalWin
						? 'text-blue-400'
						: 'text-red-400'}"
			>
				{#if isMatchOver}
					{isLocalWin ? 'Тріумф! Перемога у матчі!' : 'Матч програно!'}
				{:else}
					{isLocalWin ? 'Перемога у раунді!' : 'Поразка у раунді!'}
				{/if}
			</h2>

			<p class="text-xs text-slate-400 mb-4">
				Рахунок серії: <span class="font-mono font-bold text-white text-sm">
					{sim.score.west} : {sim.score.east}
				</span>
				<span class="text-slate-500 text-[11px]">
					({isMatchOver ? `Серія до ${sim.targetWins}` : `гра до ${sim.targetWins} перемог`})
				</span>
			</p>

			{#if isMatchOver && ((earnedScore !== null && earnedScore > 0) || (earnedXp !== null && earnedXp > 0))}
				<div class="mb-4 flex flex-wrap items-center justify-center gap-2">
					{#if earnedScore !== null && earnedScore > 0}
						<div
							class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold"
							data-testid="victory-earned-score"
						>
							<UiIcon name="trophy" class="w-3.5 h-3.5" />
							<span>+{earnedScore} рейтингових очок</span>
						</div>
					{/if}
					{#if earnedXp !== null && earnedXp > 0}
						<div
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold"
							data-testid="victory-earned-xp"
						>
							<UiIcon name="award" class="w-3.5 h-3.5" />
							<span>+{earnedXp} XP</span>
						</div>
					{/if}
				</div>
			{/if}

			<!-- MVP Building Banner -->
			{#if myMvp}
				<div
					class="bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-amber-950/60 border border-amber-500/40 rounded-xl p-3 mb-4 text-xs flex items-center justify-between shadow-lg shadow-amber-500/5"
				>
					<div class="flex items-center gap-2">
						<div class="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
							<UiIcon name="crown" class="w-4 h-4" />
						</div>
						<div class="text-left">
							<div class="text-[10px] font-bold uppercase tracking-wider text-amber-400">
								MVP Споруда вашої армії
							</div>
							<div class="font-bold text-slate-100">{myMvp.name}</div>
						</div>
					</div>
					<div class="text-right text-[11px] font-mono">
						<div class="text-amber-300 font-bold">{myMvp.kills} вбивств</div>
						<div class="text-slate-400 text-[10px]">{myMvp.damage} шкоди</div>
					</div>
				</div>
			{/if}

			<!-- Round & Match Stats Summary -->
			<div
				class="bg-slate-950/80 border border-slate-800 rounded-xl p-4 mb-6 text-xs text-slate-300 grid grid-cols-2 gap-4"
			>
				<div class="border-r border-slate-800 pr-2 space-y-1 text-left">
					<div class="font-bold text-blue-400 mb-1 flex items-center justify-between">
						<span>{westTeamLabel}</span>
						<span class="text-[10px] font-mono bg-blue-950 px-1.5 rounded text-blue-300">West</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Шкода замку:</span>
						<span class="font-bold text-rose-400 font-mono">{statsWest.damageToCastle}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Шкода армії:</span>
						<span class="font-bold text-amber-300 font-mono">{statsWest.totalDamageDealt}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Знищено ворогів:</span>
						<span class="font-bold text-white font-mono">{statsWest.unitsKilled}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Створено бійців:</span>
						<span class="font-bold text-slate-200 font-mono">{statsWest.unitsSpawned}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Монет підібрано:</span>
						<span class="font-bold text-amber-400 font-mono">{statsWest.coinsCollected}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Предметів замку:</span>
						<span class="font-bold text-indigo-300 font-mono">{statsWest.itemsPurchased}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Витрачено золота:</span>
						<span class="font-bold text-emerald-400 font-mono">{statsWest.goldSpent}g</span>
					</div>
				</div>

				<div class="pl-2 space-y-1 text-left">
					<div class="font-bold text-red-400 mb-1 flex items-center justify-between">
						<span>{eastTeamLabel}</span>
						<span class="text-[10px] font-mono bg-red-950 px-1.5 rounded text-red-300">East</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Шкода замку:</span>
						<span class="font-bold text-rose-400 font-mono">{statsEast.damageToCastle}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Шкода армії:</span>
						<span class="font-bold text-amber-300 font-mono">{statsEast.totalDamageDealt}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Знищено ворогів:</span>
						<span class="font-bold text-white font-mono">{statsEast.unitsKilled}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Створено бійців:</span>
						<span class="font-bold text-slate-200 font-mono">{statsEast.unitsSpawned}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Монет підібрано:</span>
						<span class="font-bold text-amber-400 font-mono">{statsEast.coinsCollected}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Предметів замку:</span>
						<span class="font-bold text-indigo-300 font-mono">{statsEast.itemsPurchased}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400">Витрачено золота:</span>
						<span class="font-bold text-emerald-400 font-mono">{statsEast.goldSpent}g</span>
					</div>
				</div>
			</div>

			<!-- Countdown Timer & Auto-Restart Notice -->
			<div class="mb-4 bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-xs">
				<div class="flex items-center justify-between mb-1.5 text-slate-300">
					<div class="flex items-center gap-1.5">
						<UiIcon name="clock" class="w-3.5 h-3.5 text-amber-400" />
						{#if isPaused}
							<span class="text-amber-400 font-bold">Таймер на паузі</span>
						{:else}
							<span>
								Автостарт {isMatchOver ? 'нового матчу' : 'наступного раунду'}:
								<span class="font-mono font-bold text-white text-sm">{countdown}с</span>
							</span>
						{/if}
					</div>

					<button
						type="button"
						onclick={() => (isPaused = !isPaused)}
						class="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1 cursor-pointer"
						title={isPaused ? 'Відновити зворотний відлік' : 'Призупинити зворотний відлік'}
					>
						{#if isPaused}
							<UiIcon name="play" class="w-2.5 h-2.5 text-emerald-400" />
							<span>Відновити</span>
						{:else}
							<UiIcon name="pause" class="w-2.5 h-2.5 text-amber-400" />
							<span>Пауза</span>
						{/if}
					</button>
				</div>

				<!-- Smooth visual countdown bar -->
				<div class="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
					<div
						class="h-full transition-all duration-1000 ease-linear rounded-full {isLocalWin
							? 'bg-amber-400'
							: 'bg-red-500'}"
						style="width: {(countdown / 10) * 100}%"
					></div>
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="space-y-2">
				<div class="flex gap-2">
					<button
						type="button"
						onclick={onNextRound}
						disabled={isOnline && !isOnlineHost}
						class="flex-1 py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide transition flex items-center justify-center gap-2 shadow-lg {isOnline &&
						!isOnlineHost
							? 'bg-slate-800 text-slate-400 cursor-not-allowed'
							: isMatchOver
								? isLocalWin
									? 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-amber-600/30 font-black cursor-pointer'
									: 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 cursor-pointer'
								: isLocalWin
									? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 cursor-pointer'
									: 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 cursor-pointer'}"
						data-testid="victory-next-round-btn"
					>
						<UiIcon name="rotateCcw" class="w-4 h-4" />
						{#if isOnline && !isOnlineHost}
							Очікування хоста... {!isPaused ? `(${countdown}с)` : ''}
						{:else if isMatchOver}
							Зіграти ще раз {!isPaused ? `(${countdown}с)` : ''}
						{:else}
							Розпочати раунд {sim.round + 1} {!isPaused ? `(${countdown}с)` : ''}
						{/if}
					</button>
				</div>

				<!-- Navigation Buttons when match is over or between rounds -->
				{#if isMatchOver && serializedReplay}
					<div class="flex gap-2">
						<button
							type="button"
							onclick={copyReplayJson}
							class="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/30 transition cursor-pointer"
							data-testid="victory-copy-replay-btn"
						>
							{replayCopied ? 'Скопійовано!' : 'Копіювати реплей'}
						</button>
						{#if onWatchReplay}
							<button
								type="button"
								onclick={onWatchReplay}
								class="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 transition cursor-pointer"
								data-testid="victory-watch-replay-btn"
							>
								Повтор бою
							</button>
						{/if}
					</div>
				{/if}

				<div class="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
					<button
						type="button"
						onclick={() => goto(resolve('/play'))}
						class="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
						data-testid="victory-exit-modes-btn"
					>
						<UiIcon name="arrowLeft" class="w-3.5 h-3.5 text-amber-400" />
						<span>До режимів</span>
					</button>

					<button
						type="button"
						onclick={() => goto(resolve('/'))}
						class="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
						data-testid="victory-exit-home-btn"
					>
						<UiIcon name="house" class="w-3.5 h-3.5 text-slate-400" />
						<span>Головне меню</span>
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
