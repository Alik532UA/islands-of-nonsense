<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { ArrowLeft, Castle } from 'lucide-svelte';
	import { settings } from '$lib/services/settings.svelte';
	import { t } from '$lib/i18n';
	import HeaderControls from './HeaderControls.svelte';

	let isHome = $derived(
		page.url.pathname === resolve('/') ||
			page.url.pathname === resolve('/') + '/' ||
			page.url.pathname.endsWith('/islands-of-nonsense/') ||
			page.url.pathname.endsWith('/islands-of-nonsense')
	);
	let isBattle = $derived(page.url.pathname.includes('/play/battle'));
</script>

{#if !isBattle}
	<header class="game-header" data-testid="game-header">
		<div class="flex items-center gap-3">
			{#if !isHome}
				<a
					href={resolve('/')}
					class="header-btn"
					title={t('menu.back')}
					aria-label={t('menu.back')}
					data-testid="header-back-link"
				>
					<ArrowLeft class="w-4 h-4" />
				</a>
			{/if}

			<a href={resolve('/')} class="flex items-center gap-2 no-underline text-inherit group">
				<Castle class="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" />
				<span
					class="font-black text-amber-300 text-sm md:text-base tracking-wider uppercase hidden sm:inline"
				>
					{settings.headerTitle || t('menu.title')}
				</span>
			</a>
		</div>

		<HeaderControls />
	</header>
{/if}
