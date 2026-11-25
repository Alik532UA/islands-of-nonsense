<script lang="ts">
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import { t } from '$lib/i18n';
	import type { SeekFormat } from '$lib/net/seek';

	interface Props {
		format?: SeekFormat;
		onChangeFormat?: (format: SeekFormat) => void;
		onCancel: () => void;
	}

	let { format = '1v1', onChangeFormat, onCancel }: Props = $props();

	const FORMATS: Array<{ id: SeekFormat; label: string }> = [
		{ id: '1v1', label: '1v1' },
		{ id: '2v2', label: '2v2' },
		{ id: '3v3', label: '3v3' },
		{ id: 'any', label: t('online.anyOpenRoom') }
	];
</script>

<div
	class="bg-slate-850 border border-slate-700 rounded-2xl p-6 shadow-2xl max-w-md w-full mx-auto text-center"
	role="dialog"
	aria-modal="true"
	aria-labelledby="search-modal-title"
>
	<div class="flex justify-center mb-4">
		<UiIcon name="loader2" class="w-12 h-12 text-sky-400 animate-spin" />
	</div>

	<h2 id="search-modal-title" class="text-xl font-bold text-sky-200 mb-2">
		{t('online.searching')}
	</h2>
	<p class="text-xs text-slate-400 mb-4">
		{t('online.searchingHint')}
	</p>

	{#if onChangeFormat}
		<div class="mb-5 text-left">
			<span class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
				{t('online.searchFormat')}
			</span>
			<div class="grid grid-cols-2 gap-1.5">
				{#each FORMATS as item (item.id)}
					<button
						type="button"
						data-testid="seek-format-{item.id}"
						onclick={() => onChangeFormat(item.id)}
						class="min-h-[38px] px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer {format ===
						item.id
							? 'bg-sky-500/20 border-sky-400 text-sky-200'
							: 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'}"
					>
						{item.label}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<button
		type="button"
		onclick={onCancel}
		class="w-full min-h-[44px] py-2.5 px-4 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl text-slate-200 font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
	>
		<UiIcon name="x" class="w-4 h-4" />
		<span>{t('online.cancel')}</span>
	</button>
</div>
