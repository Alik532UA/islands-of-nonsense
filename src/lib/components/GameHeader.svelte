<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
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

	function handleBack(e: MouseEvent) {
		if (settings.headerBack) {
			e.preventDefault();
			settings.headerBack();
		}
	}
</script>

{#if !isBattle}
	<header class="game-header relative" data-testid="game-header">
		<div class="flex items-center gap-2">
			{#if !isHome}
				<a
					href={resolve('/')}
					class="header-btn"
					title={t('menu.back')}
					aria-label={t('menu.back')}
					data-testid="header-back-link"
					onclick={handleBack}
				>
					<UiIcon name="arrowLeft" class="w-4 h-4" />
				</a>
			{/if}

			<a
				href={resolve('/')}
				class="header-btn group"
				title="Головне меню"
				aria-label="Головне меню"
				data-testid="header-home-link"
			>
				<UiIcon
					name="castle"
					class="lucide-icon lucide lucide-castle w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform"
				/>
			</a>
		</div>

		<!-- Centered non-clickable page title without icon -->
		<div
			class="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none select-none text-center px-4"
		>
			<span
				class="font-black text-amber-300 text-sm md:text-base tracking-wider uppercase truncate max-w-[200px] sm:max-w-xs md:max-w-md"
			>
				{settings.headerTitle || t('menu.title')}
			</span>
		</div>

		<HeaderControls />
	</header>
{/if}
