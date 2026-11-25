<!-- src/lib/components/PerformanceOverlay.svelte — накладання моніторингу FPS, пам'яті та навантаження -->
<script lang="ts">
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import { perfMonitor } from '$lib/debug/perfMonitor.svelte';
	import { t } from '$lib/i18n';

	const metrics = $derived(perfMonitor.getMetrics());

	const fpsColor = $derived(
		perfMonitor.fps >= 55
			? 'text-emerald-400'
			: perfMonitor.fps >= 30
				? 'text-amber-400'
				: 'text-rose-400'
	);
	const fpsBg = $derived(
		perfMonitor.fps >= 55
			? 'bg-emerald-950/60 border-emerald-500/50'
			: perfMonitor.fps >= 30
				? 'bg-amber-950/60 border-amber-500/50'
				: 'bg-rose-950/60 border-rose-500/50'
	);
</script>

{#if perfMonitor.enabled}
	<aside
		class="fixed top-14 right-3 z-40 w-72 rounded-lg border border-[#544738] bg-[#0c1017]/95 p-3 text-xs text-[#d1c2a5] shadow-2xl backdrop-blur-md select-none font-mono"
		data-testid="performance-overlay"
		aria-label={t('debug.perfTitle')}
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-[#3d3226] pb-2 mb-2">
			<div class="flex items-center gap-1.5 font-bold text-amber-300">
				<UiIcon name="activity" size={14} class="text-amber-400 animate-pulse" />
				<span class="tracking-wide">{t('debug.perfTitle')}</span>
			</div>
			<button
				type="button"
				class="rounded p-0.5 text-[#a89984] hover:bg-[#1a2332] hover:text-white transition-colors"
				onclick={() => perfMonitor.set(false)}
				aria-label={t('common.close')}
				data-testid="close-perf-overlay-btn"
			>
				<UiIcon name="x" size={14} />
			</button>
		</div>

		<!-- FPS & Frame Time Primary Gauge -->
		<div class="grid grid-cols-3 gap-1.5 mb-2.5">
			<div class="flex flex-col items-center justify-center rounded border p-1.5 {fpsBg}">
				<span class="text-[10px] uppercase tracking-wider text-[#a89984]">{t('debug.fps')}</span>
				<span class="text-base font-black {fpsColor}" data-testid="perf-fps-value">
					{perfMonitor.fps}
				</span>
			</div>
			<div
				class="flex flex-col items-center justify-center rounded border border-[#3d3226] bg-[#141a24] p-1.5"
			>
				<span class="text-[10px] uppercase tracking-wider text-[#a89984]">{t('debug.minFps')}</span>
				<span class="text-sm font-bold text-[#e6d5b8]">{perfMonitor.minFps}</span>
			</div>
			<div
				class="flex flex-col items-center justify-center rounded border border-[#3d3226] bg-[#141a24] p-1.5"
			>
				<span class="text-[10px] uppercase tracking-wider text-[#a89984]">
					{t('debug.frameTime')}
				</span>
				<span class="text-sm font-bold text-[#e6d5b8]">
					{perfMonitor.frameTimeMs}<span class="text-[10px] text-[#8c7a65] font-normal">ms</span>
				</span>
			</div>
		</div>

		<!-- Memory Stats -->
		<div class="space-y-1 border-t border-[#262018] pt-2 mb-2 text-[11px]">
			<div class="flex justify-between items-center">
				<span class="text-[#8c7a65]">{t('debug.memory')}:</span>
				{#if perfMonitor.jsHeapUsedMb !== null}
					<span class="text-emerald-300 font-semibold" data-testid="perf-memory-value">
						{perfMonitor.jsHeapUsedMb} / {perfMonitor.jsHeapTotalMb}
						<span class="text-[9px] text-[#8c7a65]">MB</span>
					</span>
				{:else}
					<span class="text-[#6b5d4d] italic">N/A (Браузер приховує)</span>
				{/if}
			</div>
		</div>

		<!-- Simulation Load & Entities -->
		<div class="space-y-1 border-t border-[#262018] pt-2 mb-3 text-[11px]">
			<div class="flex justify-between items-center">
				<span class="text-[#8c7a65]">{t('debug.simSpeed')}:</span>
				<span class="text-cyan-300 font-semibold">{metrics.simSpeed}x</span>
			</div>
			<div class="flex justify-between items-center">
				<span class="text-[#8c7a65]">{t('debug.units')}:</span>
				<span class="text-[#f3ede2] font-semibold" data-testid="perf-units-value">
					{metrics.unitsCount}
					<span class="text-[10px] text-[#8c7a65]">
						(З: {metrics.westUnitsCount} | С: {metrics.eastUnitsCount})
					</span>
				</span>
			</div>
			<div class="flex justify-between items-center">
				<span class="text-[#8c7a65]">{t('debug.buildings')}:</span>
				<span class="text-[#f3ede2]">
					{metrics.buildingsCount}
					<span class="text-[10px] text-[#8c7a65]">
						(З: {metrics.westBuildingsCount} | С: {metrics.eastBuildingsCount})
					</span>
				</span>
			</div>
			<div class="flex justify-between items-center">
				<span class="text-[#8c7a65]">{t('debug.decorations')}:</span>
				<span class="text-[#f3ede2]">{metrics.decorationsCount}</span>
			</div>
			<div class="flex justify-between items-center">
				<span class="text-[#8c7a65]">{t('debug.projectiles')} / {t('debug.debris')}:</span>
				<span class="text-[#f3ede2]">{metrics.projectilesCount} / {metrics.debrisCount}</span>
			</div>
		</div>

		<!-- Copy Metrics Action Button -->
		<button
			type="button"
			class="flex w-full items-center justify-center gap-1.5 rounded border border-[#6b583e] bg-gradient-to-b from-[#241c14] to-[#15100c] px-2.5 py-1.5 font-sans text-xs font-semibold text-[#f5ebd7] shadow transition-all hover:border-[#a3875f] hover:brightness-110 active:scale-[0.98]"
			onclick={() => perfMonitor.copyReport()}
			data-testid="copy-perf-metrics-btn"
		>
			{#if perfMonitor.copied}
				<UiIcon name="check" size={14} class="text-emerald-400" />
				<span class="text-emerald-300">{t('debug.copied')}</span>
			{:else}
				<UiIcon name="copy" size={13} class="text-amber-400" />
				<span>{t('debug.copyMetrics')}</span>
			{/if}
		</button>
	</aside>
{/if}
