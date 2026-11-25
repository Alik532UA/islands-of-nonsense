<!-- src/lib/components/ServiceBadge.svelte — лише коли збір логів із пристроїв (DEBUGGING § 3) -->
<script lang="ts">
	import { browser } from '$app/env';
	import { page } from '$app/state';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import { debugMode } from '$lib/debug/debugMode.svelte';
	import { perfMonitor } from '$lib/debug/perfMonitor.svelte';
	import { t } from '$lib/i18n';
	import { logService } from '$lib/services/logService.svelte';
	import { fetchServedVersion } from '$lib/services/servedVersion';
	import ErrorLogModal from '$lib/components/ErrorLogModal.svelte';
	import PerformanceOverlay from '$lib/components/PerformanceOverlay.svelte';
	import { APP_VERSION } from '$lib/config/version';

	const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : APP_VERSION;
	let copied = $state(false);
	let fallbackReport = $state<string | null>(null);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	let menuOpen = $state(false);
	let modalOpen = $state(false);
	let userDismissed = $state(false);

	// `browser &&` обовʼязковий: під час пререндеру параметрів запиту немає.
	const urlDebug = $derived(browser && page.url.searchParams.get('debug') === '1');
	const visible = $derived(!userDismissed && (urlDebug || debugMode.enabled));
	const errors = $derived(logService.errorCount);

	$effect(() => () => clearTimeout(copyTimer));

	$effect(() => {
		if (debugMode.enabled) userDismissed = false;
	});

	// Версію на сервері — заздалегідь: після await у кліку Safari вже не дає писати в буфер.
	$effect(() => {
		if (!visible || !browser || !navigator.onLine) return;
		const controller = new AbortController();
		void fetchServedVersion(controller.signal).then((served) => {
			if (!controller.signal.aborted && served) logService.servedVersion = served;
		});
		return () => controller.abort();
	});

	async function copyReport() {
		const report = logService.getReport();
		try {
			await navigator.clipboard.writeText(report);
			copied = true;
			fallbackReport = null;
			clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = false), 1500);
		} catch (error) {
			// Відмова буфера очікувана (HTTP, iframe, немає фокусу): warn і текст на екрані (§ 2.3).
			logService.warn('ui', 'Clipboard write failed, showing the report inline', error);
			fallbackReport = report;
		}
	}

	async function handleAction(action: 'copy' | 'modal' | 'clear' | 'hide' | 'toggleFps') {
		menuOpen = false;
		if (action === 'copy') await copyReport();
		else if (action === 'modal') modalOpen = true;
		else if (action === 'clear') logService.clear();
		else if (action === 'toggleFps') perfMonitor.toggle();
		else if (action === 'hide') {
			userDismissed = true;
			if (debugMode.enabled) debugMode.set(false);
		}
	}

	function handleWindowClick(e: MouseEvent) {
		if (!menuOpen) return;
		const target = e.target as HTMLElement | null;
		if (!target?.closest('.service-badge-wrapper')) menuOpen = false;
	}

	function handleWindowKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && menuOpen) menuOpen = false;
	}
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleWindowKeydown} />

{#if visible}
	<div class="service-badge-wrapper">
		{#if menuOpen}
			<div class="service-menu" role="menu" data-testid="service-badge-context-menu">
				<button
					type="button"
					class="service-menu-item"
					role="menuitem"
					onclick={() => handleAction('copy')}
					data-testid="service-badge-copy-report-btn"
				>
					<UiIcon name="copy" size={14} />
					<span>{t('debug.copyReport')}</span>
				</button>
				<button
					type="button"
					class="service-menu-item"
					role="menuitem"
					onclick={() => handleAction('toggleFps')}
					data-testid="service-badge-toggle-fps-btn"
				>
					<UiIcon name="activity" size={14} />
					<span>{perfMonitor.enabled ? t('debug.hideFps') : t('debug.showFps')}</span>
					<span class="count">{perfMonitor.fps} FPS</span>
				</button>
				<button
					type="button"
					class="service-menu-item"
					role="menuitem"
					onclick={() => handleAction('modal')}
					data-testid="service-badge-view-errors-btn"
				>
					<UiIcon name="bug" size={14} />
					<span>{t('debug.viewErrors')}</span>
					<span class="count" class:has-errors={errors > 0}>{errors}</span>
				</button>
				<button
					type="button"
					class="service-menu-item"
					role="menuitem"
					onclick={() => handleAction('clear')}
					data-testid="service-badge-clear-btn"
				>
					<UiIcon name="trash2" size={14} />
					<span>{t('debug.clearLogs')}</span>
				</button>
				<div class="service-menu-separator" role="separator"></div>
				<button
					type="button"
					class="service-menu-item service-menu-item--hide"
					role="menuitem"
					onclick={() => handleAction('hide')}
					data-testid="service-badge-hide-btn"
				>
					<UiIcon name="eyeOff" size={14} />
					<span>{t('debug.hideBadge')}</span>
				</button>
			</div>
		{/if}

		<button
			type="button"
			class="service-badge"
			class:has-errors={errors > 0}
			class:copied
			onclick={() => (menuOpen = !menuOpen)}
			oncontextmenu={(e) => {
				e.preventDefault();
				menuOpen = true;
			}}
			aria-label="{t('debug.badgeMenu')} v{version}"
			aria-haspopup="menu"
			aria-expanded={menuOpen}
			data-testid="service-badge-btn"
		>
			{#if copied}
				<UiIcon name="check" size={14} />
			{:else if errors > 0}
				<span class="count">{errors > 99 ? '99+' : errors}</span>
			{:else}
				<UiIcon name="copy" size={12} />
			{/if}
			<span data-testid="service-badge-version-text">v{version}</span>
		</button>
	</div>
	{#if fallbackReport}
		<textarea
			class="service-report"
			readonly
			value={fallbackReport}
			data-testid="service-badge-report-textarea"></textarea>
	{/if}
{/if}

<ErrorLogModal isOpen={modalOpen} onclose={() => (modalOpen = false)} />
<PerformanceOverlay />

<style>
	.service-badge-wrapper {
		display: contents;
	}
	.service-badge {
		--badge-error-bg: var(--color-danger, #ef4444);
		--badge-success-bg: var(--color-success, #22c55e);
		--badge-on-color: var(--color-surface, #0f172a);
		--badge-chip-bg: var(--color-text, #f8fafc);
		position: fixed;
		left: 16px;
		bottom: calc(16px + env(safe-area-inset-bottom, 0px));
		z-index: 9999;
		display: flex;
		align-items: center;
		gap: 6px;
		min-height: 32px;
		padding: 0 10px;
		border: 1px solid var(--color-border, rgba(255, 255, 255, 0.2));
		border-radius: 16px;
		background: var(--color-surface, #0f172a);
		color: var(--color-text, #f8fafc);
		font-family: inherit;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(8px);
	}
	.service-badge.has-errors {
		background: var(--badge-error-bg);
		border-color: var(--badge-error-bg);
		color: #ffffff;
	}
	.service-badge.copied {
		background: var(--badge-success-bg);
		border-color: var(--badge-success-bg);
		color: #ffffff;
	}
	.count {
		padding: 0 5px;
		border-radius: 8px;
		background: var(--badge-chip-bg);
		color: var(--badge-on-color);
		font-size: 0.6875rem;
		font-weight: 700;
	}
	.count.has-errors {
		background: #ffffff;
		color: var(--color-danger, #ef4444);
	}
	.service-menu {
		position: fixed;
		bottom: calc(56px + env(safe-area-inset-bottom, 0px));
		left: 16px;
		z-index: 9999;
		display: flex;
		flex-direction: column;
		min-width: 220px;
		padding: 6px;
		border-radius: 12px;
		background: var(--color-surface, #0f172a);
		color: var(--color-text, #f8fafc);
		border: 1px solid var(--color-border, rgba(255, 255, 255, 0.15));
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(12px);
	}
	.service-menu-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 8px 10px;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: 0.8125rem;
		text-align: left;
		cursor: pointer;
	}
	.service-menu-item:hover {
		background: var(--color-surface-hover, rgba(255, 255, 255, 0.08));
	}
	.service-menu-item--hide:hover {
		color: var(--color-danger, #ef4444);
	}
	.service-menu-separator {
		height: 1px;
		background: var(--color-border, rgba(255, 255, 255, 0.1));
		margin: 4px 0;
	}
	.service-report {
		position: fixed;
		left: 16px;
		right: 16px;
		bottom: calc(64px + env(safe-area-inset-bottom, 0px));
		z-index: 9999;
		height: 40vh;
		background: #020617;
		color: #e2e8f0;
		border: 1px solid #334155;
		border-radius: 8px;
		padding: 12px;
		font-family: monospace;
		font-size: 0.75rem;
	}
	@media (pointer: coarse) {
		.service-badge {
			min-height: 44px;
			padding: 0 12px;
			border-radius: 22px;
		}
	}
</style>
