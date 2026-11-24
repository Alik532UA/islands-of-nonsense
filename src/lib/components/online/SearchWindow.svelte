<script lang="ts">
	import { Loader2, X } from 'lucide-svelte';
	import { t } from '$lib/i18n';

	interface Props {
		onCancel: () => void;
	}

	let { onCancel }: Props = $props();
</script>

<div
	class="bg-slate-850 border border-slate-700 rounded-2xl p-6 shadow-2xl max-w-md w-full mx-auto text-center"
	role="dialog"
	aria-modal="true"
	aria-labelledby="search-modal-title"
>
	<div class="flex justify-center mb-4">
		<Loader2 class="w-12 h-12 text-sky-400 animate-spin" />
	</div>

	<h2 id="search-modal-title" class="text-xl font-bold text-sky-200 mb-2">
		{t('online.searching')}
	</h2>
	<p class="text-xs text-slate-400 mb-6">
		{t('online.searchingHint')}
	</p>

	<button
		type="button"
		onclick={onCancel}
		class="w-full min-h-[44px] py-2.5 px-4 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl text-slate-200 font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
	>
		<X class="w-4 h-4" />
		<span>{t('online.cancel')}</span>
	</button>
</div>
