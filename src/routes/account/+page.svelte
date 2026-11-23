<script lang="ts">
	import { resolve } from '$app/paths';
	import { CircleUser, ArrowLeft } from 'lucide-svelte';
	import { t } from '$lib/i18n';
	import { onMount } from 'svelte';
	import { settings } from '$lib/services/settings.svelte';

	onMount(() => settings.claimHeader(t('account.title')));
</script>

<svelte:head>
	<title>{t('account.title')} — Islands of Nonsense</title>
</svelte:head>

<div class="menu-page fill min-h-[calc(100vh-56px)]">
	<div
		class="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md"
	>
		<div class="flex items-center gap-4 border-b border-slate-800 pb-4 mb-6">
			<div class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
				<CircleUser class="w-8 h-8 text-amber-400" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-amber-300">{t('account.title')}</h1>
				<p class="text-xs text-slate-400">{t('account.subtitle')}</p>
			</div>
		</div>

		<div class="space-y-4 text-sm text-slate-300">
			<p>{t('account.placeholder')}</p>
		</div>

		<div class="mt-8 pt-4 border-t border-slate-800 flex justify-end">
			<a href={resolve('/')} class="menu-btn menu-btn--link">
				<ArrowLeft class="menu-link__icon" />
				<span>{t('menu.back')}</span>
			</a>
		</div>
	</div>
</div>
