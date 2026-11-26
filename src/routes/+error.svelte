<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { t } from '$lib/i18n';
</script>

<div
	class="min-h-[calc(100dvh-56px)] bg-slate-950 text-slate-100 flex items-center justify-center p-4"
>
	<div class="max-w-md w-full p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center">
		<h1 class="text-6xl font-black text-amber-500 mb-2">{page.status}</h1>
		<p class="text-xl font-bold mb-4">{page.error?.message || t('errorPage.notFound')}</p>
		<p class="text-sm text-slate-400 mb-6">
			{t('errorPage.hint')}
		</p>
		<a
			href={resolve('/')}
			class="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition"
		>
			{t('errorPage.backToArena')}
		</a>
	</div>
</div>
