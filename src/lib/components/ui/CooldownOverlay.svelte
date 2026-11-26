<script lang="ts">
	let {
		remaining = 0,
		max = 1
	}: {
		remaining: number;
		max: number;
	} = $props();

	let ratio = $derived(max > 0 ? Math.max(0, Math.min(1, remaining / max)) : 0);
	let sweepDeg = $derived(ratio * 360);
	let showTimer = $derived(max > 5 && remaining > 0);
</script>

{#if remaining > 0}
	<div
		class="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden z-[5]"
		aria-hidden="true"
	>
		<div
			class="w-full h-full"
			style="background: conic-gradient(from 0deg, rgba(3, 7, 18, 0.8) {sweepDeg.toFixed(
				1
			)}deg, transparent 0deg);"
		></div>
	</div>
	{#if showTimer}
		<span
			class="pointer-events-none absolute -bottom-1 -right-1 z-10 text-[8px] font-mono bg-black/90 px-1 py-0.5 rounded text-amber-300 font-bold leading-none border border-amber-500/40"
		>
			{Math.ceil(remaining)}с
		</span>
	{/if}
{/if}
