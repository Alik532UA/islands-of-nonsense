<script lang="ts">
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { t } from '$lib/i18n';
	import {
		GAME_ID,
		GAME_ONLINE_ID,
		GAME_SOLO_ID,
		type GameRecord,
		type PlayData
	} from '$lib/net/play';
	import { exportHistoryCSV, exportHistoryJSON } from '$lib/services/matchProgress.svelte';
	import { listSavedReplays, setPendingReplay } from '$lib/services/replayStore.svelte';
	import { ReplaySerializer, type MatchReplayData } from '$lib/engine/replaySerializer';
	import { formatRaceName } from '$lib/engine/gameData';
	import { toast } from '$lib/controllers/toast.svelte';

	interface Props {
		playData: PlayData;
	}

	let { playData }: Props = $props();

	let replayJsonInput = $state('');
	let replayStatus = $state<'idle' | 'valid' | 'invalid'>('idle');
	let parsedReplay = $state<MatchReplayData | null>(null);
	let historyFilter = $state<'all' | 'online' | 'solo'>('all');
	const savedReplays = $derived(listSavedReplays());

	function watchSerializedReplay(json: string) {
		if (setPendingReplay(json)) {
			void goto(`${resolve('/play/battle')}?replay=1`);
		}
	}

	function statsOf(record: GameRecord | undefined) {
		const wins = record?.wins ?? 0;
		const plays = Math.max(record?.plays ?? 0, wins + (record?.losses ?? 0));
		const losses = record?.losses ?? Math.max(0, plays - wins);
		const winRate = plays > 0 ? Math.round((wins / plays) * 100) : 0;
		return { wins, losses, plays, winRate, best: record?.best ?? 0, score: record?.score ?? 0 };
	}

	const overall = $derived(statsOf(playData.games[GAME_ID]));
	const onlineStats = $derived(statsOf(playData.games[GAME_ONLINE_ID]));
	const soloStats = $derived(statsOf(playData.games[GAME_SOLO_ID]));
	const winStreak = $derived(playData.winStreak ?? 0);
	const bestWinStreak = $derived(playData.bestWinStreak ?? 0);

	const filteredHistory = $derived.by(() => {
		const list = playData.history ?? [];
		if (historyFilter === 'all') return list;
		return list.filter((h) => h.mode === historyFilter);
	});

	function handleVerifyReplay() {
		const decoded = ReplaySerializer.deserialize(replayJsonInput.trim());
		if (decoded.success && decoded.data) {
			parsedReplay = decoded.data;
			replayStatus = 'valid';
		} else {
			parsedReplay = null;
			replayStatus = 'invalid';
		}
	}

	function downloadFile(content: string, filename: string, mime: string) {
		if (typeof document === 'undefined') return;
		const blob = new Blob([content], { type: mime });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
		toast.success(t('common.copied'));
	}

	function formatDuration(sec?: number): string {
		if (!sec) return '—';
		const m = Math.floor(sec / 60);
		const s = sec % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	}
</script>

<div class="space-y-6">
	<!-- Primary KPI Grid -->
	<div class="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="stats-kpi-grid">
		<div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-center">
			<div class="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
				{t('account.stats.score')}
			</div>
			<div class="text-2xl font-black text-amber-400" data-testid="stats-total-score">
				{playData.score}
			</div>
		</div>

		<div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-center">
			<div class="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
				{t('account.stats.plays')}
			</div>
			<div class="text-2xl font-black text-slate-200">{overall.plays}</div>
			<div class="text-[10px] text-slate-400 mt-0.5">
				{overall.wins}W / {overall.losses}L
			</div>
		</div>

		<div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-center">
			<div class="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
				{t('account.stats.winRate')}
			</div>
			<div class="text-2xl font-black text-cyan-400">{overall.winRate}%</div>
			<div class="text-[10px] text-slate-400 mt-0.5">
				{t('account.stats.best')}: {overall.best}
			</div>
		</div>

		<div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-center">
			<div class="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
				{t('account.stats.streak')}
			</div>
			<div class="text-2xl font-black text-emerald-400 flex items-center justify-center gap-1">
				<UiIcon name="flame" class="w-5 h-5 text-amber-400" />
				<span>{winStreak}</span>
			</div>
			<div class="text-[10px] text-slate-400 mt-0.5">
				{t('account.stats.bestStreak')}: {bestWinStreak}
			</div>
		</div>
	</div>

	<!-- Mode Breakdown -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
		<div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold text-sky-300 flex items-center gap-1.5">
					<UiIcon name="swords" class="w-4 h-4" />
					{t('account.stats.onlineMode')}
				</span>
				<span class="text-xs font-mono font-bold text-amber-300">{onlineStats.score} pts</span>
			</div>
			<div class="grid grid-cols-3 gap-2 text-center pt-1 text-xs">
				<div class="p-2 rounded-xl bg-slate-900/70">
					<div class="text-[10px] text-slate-400">{t('account.stats.plays')}</div>
					<div class="font-bold text-slate-100">{onlineStats.plays}</div>
				</div>
				<div class="p-2 rounded-xl bg-slate-900/70">
					<div class="text-[10px] text-slate-400">{t('account.stats.wins')}</div>
					<div class="font-bold text-emerald-400">{onlineStats.wins}</div>
				</div>
				<div class="p-2 rounded-xl bg-slate-900/70">
					<div class="text-[10px] text-slate-400">{t('account.stats.winRate')}</div>
					<div class="font-bold text-cyan-300">{onlineStats.winRate}%</div>
				</div>
			</div>
		</div>

		<div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
					<UiIcon name="trophy" class="w-4 h-4" />
					{t('account.stats.soloMode')}
				</span>
				<span class="text-xs font-mono font-bold text-amber-300">{soloStats.score} pts</span>
			</div>
			<div class="grid grid-cols-3 gap-2 text-center pt-1 text-xs">
				<div class="p-2 rounded-xl bg-slate-900/70">
					<div class="text-[10px] text-slate-400">{t('account.stats.plays')}</div>
					<div class="font-bold text-slate-100">{soloStats.plays}</div>
				</div>
				<div class="p-2 rounded-xl bg-slate-900/70">
					<div class="text-[10px] text-slate-400">{t('account.stats.wins')}</div>
					<div class="font-bold text-emerald-400">{soloStats.wins}</div>
				</div>
				<div class="p-2 rounded-xl bg-slate-900/70">
					<div class="text-[10px] text-slate-400">{t('account.stats.winRate')}</div>
					<div class="font-bold text-cyan-300">{soloStats.winRate}%</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Match History -->
	<div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h3
				class="text-xs uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1.5"
			>
				<UiIcon name="clock" class="w-4 h-4 text-amber-400" />
				<span>{t('account.history.title')}</span>
			</h3>
			<div class="flex flex-wrap items-center gap-1.5">
				{#each ['all', 'online', 'solo'] as modeKey (modeKey)}
					<button
						type="button"
						onclick={() => (historyFilter = modeKey as 'all' | 'online' | 'solo')}
						class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer {historyFilter ===
						modeKey
							? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
							: 'bg-slate-900 text-slate-400 hover:text-slate-200'}"
					>
						{t(`account.history.filter.${modeKey}`)}
					</button>
				{/each}
				{#if (playData.history?.length ?? 0) > 0}
					<button
						type="button"
						onclick={() =>
							downloadFile(
								exportHistoryJSON(playData.history ?? []),
								'islands-match-history.json',
								'application/json'
							)}
						class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 font-semibold flex items-center gap-1 cursor-pointer"
						title={t('account.history.exportJson')}
					>
						<UiIcon name="download" class="w-3 h-3" />
						<span>JSON</span>
					</button>
					<button
						type="button"
						onclick={() =>
							downloadFile(
								exportHistoryCSV(playData.history ?? []),
								'islands-match-history.csv',
								'text/csv'
							)}
						class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 font-semibold flex items-center gap-1 cursor-pointer"
						title={t('account.history.exportCsv')}
					>
						<UiIcon name="download" class="w-3 h-3" />
						<span>CSV</span>
					</button>
				{/if}
			</div>
		</div>

		{#if filteredHistory.length === 0}
			<div class="py-6 text-center text-xs text-slate-500" data-testid="match-history-empty">
				{t('account.history.empty')}
			</div>
		{:else}
			<div
				class="max-h-72 overflow-y-auto divide-y divide-slate-800/70 pr-1"
				data-testid="match-history-list"
			>
				{#each filteredHistory as item (item.id)}
					<div class="py-2.5 flex items-center justify-between gap-3 text-xs">
						<div class="min-w-0 space-y-0.5">
							<div class="flex flex-wrap items-center gap-1.5">
								<span
									class="px-1.5 py-0.5 rounded text-[10px] font-black uppercase {item.result ===
									'win'
										? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
										: 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}"
								>
									{item.result === 'win' ? t('account.history.win') : t('account.history.loss')}
								</span>
								<span
									class="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-sky-300 font-semibold uppercase"
								>
									{item.mode}
								</span>
								{#if item.race}
									<span class="font-bold text-slate-200 truncate">
										{formatRaceName(item.race)}
										{#if item.enemyRace}
											<span class="text-slate-500">vs</span> {formatRaceName(item.enemyRace)}
										{/if}
									</span>
								{/if}
								{#if item.westScore !== undefined && item.eastScore !== undefined}
									<span class="font-mono text-slate-300">{item.westScore}:{item.eastScore}</span>
								{/if}
							</div>
							<div class="text-[11px] text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
								{#if item.unitsKilled !== undefined}
									<span>{t('account.history.kills')}: {item.unitsKilled}</span>
								{/if}
								{#if item.damageToCastle !== undefined}
									<span>{t('account.history.castleDmg')}: {item.damageToCastle}</span>
								{/if}
								{#if item.mvpBuilding}
									<span>MVP: {item.mvpBuilding}</span>
								{/if}
								<span>{formatDuration(item.durationSec)}</span>
							</div>
						</div>
						<div class="text-right shrink-0">
							<div class="font-black text-amber-400 font-mono">+{item.scoreDelta}</div>
							<div class="text-[10px] text-slate-500">
								{new Date(item.at).toLocaleDateString()}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Replay Verifier -->
	<div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
		<h3 class="text-xs uppercase tracking-wider text-slate-300 font-bold">
			{t('account.replay.title')}
		</h3>
		<textarea
			bind:value={replayJsonInput}
			data-testid="replay-json-input"
			rows="3"
			placeholder={t('account.replay.placeholder')}
			class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
		></textarea>
		<div class="flex flex-wrap items-center justify-between gap-3">
			<button
				type="button"
				data-testid="replay-verify-btn"
				onclick={handleVerifyReplay}
				class="min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold rounded-xl text-xs transition cursor-pointer"
			>
				{t('account.replay.verify')}
			</button>
			{#if replayStatus === 'valid' && parsedReplay}
				<div class="flex flex-wrap items-center gap-2">
					<span class="text-xs text-emerald-400 font-semibold" data-testid="replay-verify-status">
						{t('account.replay.valid')} · {t('account.replay.summary', {
							mode: parsedReplay.gameMode,
							winner: parsedReplay.result?.winner ?? '—',
							actions: parsedReplay.actions.length
						})}
					</span>
					<button
						type="button"
						onclick={() => watchSerializedReplay(replayJsonInput.trim())}
						class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
						data-testid="replay-watch-btn"
					>
						<UiIcon name="play" class="w-3 h-3 fill-current" />
						<span>{t('replay.watch')}</span>
					</button>
				</div>
			{:else if replayStatus === 'invalid'}
				<span class="text-xs text-rose-400 font-semibold" data-testid="replay-verify-status">
					{t('account.replay.invalid')}
				</span>
			{/if}
		</div>

		{#if savedReplays.length > 0}
			<div class="pt-3 border-t border-slate-800 space-y-2" data-testid="saved-replays-list">
				<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
					{t('replay.savedTitle')}
				</div>
				{#each savedReplays as rep (rep.id)}
					<div
						class="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-2 text-xs"
					>
						<div class="min-w-0">
							<div class="font-bold text-slate-200 truncate">
								{formatRaceName(rep.westRace)} vs {formatRaceName(rep.eastRace)}
							</div>
							<div class="text-[10px] text-slate-400">
								{rep.gameMode} · {t('replay.actionsCount', { count: rep.actionCount })} ·
								{new Date(rep.timestamp).toLocaleDateString()}
							</div>
						</div>
						<div class="flex items-center gap-1.5 shrink-0">
							<button
								type="button"
								onclick={async () => {
									try {
										await navigator.clipboard.writeText(rep.serialized);
										toast.success(t('common.copied'));
									} catch {
										// ignore
									}
								}}
								class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] cursor-pointer"
							>
								{t('replay.copy')}
							</button>
							<button
								type="button"
								onclick={() => watchSerializedReplay(rep.serialized)}
								class="px-2.5 py-1.5 rounded-lg bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
							>
								<UiIcon name="play" class="w-3 h-3" />
								<span>{t('replay.watch')}</span>
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
