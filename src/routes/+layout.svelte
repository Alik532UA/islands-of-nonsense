<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';
	import type { Component } from 'svelte';
	import { dev } from '$app/env';
	import { beforeNavigate } from '$app/navigation';
	import { page, updated } from '$app/state';
	import ServiceBadge from '$lib/components/ServiceBadge.svelte';
	import GameHeader from '$lib/components/GameHeader.svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import FullscreenModal from '$lib/components/FullscreenModal.svelte';
	import ErrorFallback from '$lib/components/ErrorFallback.svelte';
	import ToastContainer from '$lib/components/toast/ToastContainer.svelte';
	import { logService } from '$lib/services/logService.svelte';
	import { settings } from '$lib/services/settings.svelte';
	import { fullscreen } from '$lib/services/fullscreen.svelte';
	import { initServiceWorkerUpdate } from '$lib/pwa/serviceWorkerUpdate';
	import { debugMode } from '$lib/debug/debugMode.svelte';
	import { hardReset } from '$lib/debug/hardReset';
	import { createKeySequence, listenForSequences } from '$lib/debug/keySequence';

	let { children }: LayoutProps = $props();
	let isBattleRoute = $derived(page.url.pathname.includes('/play/battle'));
	let BgBattle = $state<Component | null>(null);

	$effect(() => {
		if (isBattleRoute || BgBattle) return;
		let cancelled = false;
		void import('$lib/components/MenuBackgroundBattle.svelte').then((mod) => {
			if (!cancelled) {
				BgBattle = mod.default;
			}
		});
		return () => {
			cancelled = true;
		};
	});

	/** Показати табло в production: 55 разів поспіль V випадково не натиснеш. */
	const BADGE_SHOW = 55;
	/** Сховати — 5: помилка коштує одного жесту; у dev табло видно й так, і обидва пороги — 5. */
	const BADGE_HIDE = 5;
	/** Скидання знищує прогрес: високий поріг і ще підтвердження (§ 3.3). */
	const RESET_PRESSES = 55;
	/** Рядок, а не t(): скидання кличуть і тоді, коли не завантажилися словники (§ 3.4). */
	const RESET_CONFIRM =
		'Стерти локальні дані цього застосунку й перезавантажити? / Erase this app’s local data and reload?';

	beforeNavigate(({ willUnload, to }) => {
		if (!willUnload && updated.current && to?.url) {
			location.href = to.url.href;
		}
	});

	$effect(() => {
		const unwatch = fullscreen.watch();
		const cleanupSw = initServiceWorkerUpdate();
		return () => {
			unwatch();
			cleanupSw();
		};
	});

	$effect(() =>
		listenForSequences(
			createKeySequence({
				letter: 'v',
				threshold: () => (dev || debugMode.enabled ? BADGE_HIDE : BADGE_SHOW),
				onComplete: () => debugMode.set(!debugMode.enabled)
			}),
			createKeySequence({
				letter: 'r',
				threshold: RESET_PRESSES,
				onComplete: () => {
					if (confirm(RESET_CONFIRM)) void hardReset();
				}
			})
		)
	);
</script>

<svelte:window
	oncontextmenu={(e) => {
		if (!(e.shiftKey && e.ctrlKey && e.altKey)) {
			e.preventDefault();
		}
	}}
/>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if !isBattleRoute && BgBattle}
	<BgBattle />
{/if}
<GameHeader />
<div class={isBattleRoute ? 'contents' : 'relative z-10'}>
	<svelte:boundary
		onerror={(error) => logService.error('render', 'Layout boundary caught render error', error)}
	>
		{@render children()}
		{#snippet failed(_error, reset)}
			<ErrorFallback onretry={reset} />
		{/snippet}
	</svelte:boundary>
</div>
<SettingsModal isOpen={settings.isSettingsOpen} onClose={() => settings.closeSettings()} />
{#if fullscreen.isModalOpen}
	<FullscreenModal
		mode={fullscreen.modalMode}
		onclose={() => {
			fullscreen.isModalOpen = false;
		}}
	/>
{/if}
<ToastContainer />
<ServiceBadge />
