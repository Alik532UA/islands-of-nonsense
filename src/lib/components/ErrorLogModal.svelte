<!-- src/lib/components/ErrorLogModal.svelte — лише коли збір логів із пристроїв (DEBUGGING § 3) -->
<script lang="ts">
	import { focusTrap } from '$lib/utils/focusTrap';
	import { AlertCircle, AlertTriangle, Bug, Check, Copy, Info, Trash2, X } from 'lucide-svelte';
	import { t } from '$lib/i18n';
	import { logService, type Level } from '$lib/services/logService.svelte';

	interface Props {
		isOpen: boolean;
		onclose: () => void;
	}

	let { isOpen, onclose }: Props = $props();

	type FilterType = 'all' | Level;
	let activeFilter = $state<FilterType>('all');
	let selectedCategory = $state<string>('all');
	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	const entries = $derived(logService.entries);
	const errorCount = $derived(entries.filter((e) => e.level === 'error').length);
	const warnCount = $derived(entries.filter((e) => e.level === 'warn').length);
	const infoCount = $derived(entries.filter((e) => e.level === 'info').length);

	const categories = $derived(['all', ...Array.from(new Set(entries.map((e) => e.category)))]);

	const filteredList = $derived(
		entries
			.filter((e) => activeFilter === 'all' || e.level === activeFilter)
			.filter((e) => selectedCategory === 'all' || e.category === selectedCategory)
			.slice()
			.reverse()
	);

	$effect(() => () => clearTimeout(copyTimer));

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(logService.getReport());
			copied = true;
			clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = false), 1500);
		} catch (error) {
			logService.warn('ui', 'Clipboard write failed from modal', error);
		}
	}

	function handleClear() {
		logService.clear();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			onclose();
		}
	}

	function formatTime(iso: string): string {
		try {
			const d = new Date(iso);
			return d.toLocaleTimeString('uk-UA', {
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			});
		} catch {
			return iso;
		}
	}
</script>

{#if isOpen}
	<div
		class="modal-backdrop"
		role="dialog"
		aria-modal="true"
		aria-labelledby="error-log-modal-title"
		data-testid="error-log-modal-overlay"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) onclose();
		}}
		onkeydown={handleKeydown}
		use:focusTrap
	>
		<div class="modal-card" data-testid="error-log-modal-container">
			<div class="modal-header" data-testid="error-log-modal-header">
				<div class="header-left">
					<Bug size={18} aria-hidden="true" />
					<h2 id="error-log-modal-title" class="modal-title" data-testid="error-log-modal-title">
						{t('debug.modalTitle')}
					</h2>
				</div>
				<button
					type="button"
					class="btn-close"
					onclick={onclose}
					aria-label={t('common.close')}
					data-testid="error-log-modal-close-btn"
				>
					<X size={18} aria-hidden="true" />
				</button>
			</div>

			<div class="modal-toolbar">
				<div class="tabs" role="tablist" data-testid="error-log-modal-tabs">
					<button
						type="button"
						role="tab"
						aria-selected={activeFilter === 'all'}
						class="tab"
						class:tab--active={activeFilter === 'all'}
						onclick={() => (activeFilter = 'all')}
						data-testid="error-log-modal-all-tab"
					>
						{t('debug.tabAll')} <span class="tab-badge">{entries.length}</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeFilter === 'error'}
						class="tab"
						class:tab--active={activeFilter === 'error'}
						onclick={() => (activeFilter = 'error')}
						data-testid="error-log-modal-error-tab"
					>
						{t('debug.tabErrors')}
						<span class="tab-badge tab-badge--error">{errorCount}</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeFilter === 'warn'}
						class="tab"
						class:tab--active={activeFilter === 'warn'}
						onclick={() => (activeFilter = 'warn')}
						data-testid="error-log-modal-warn-tab"
					>
						{t('debug.tabWarnings')}
						<span class="tab-badge tab-badge--warn">{warnCount}</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeFilter === 'info'}
						class="tab"
						class:tab--active={activeFilter === 'info'}
						onclick={() => (activeFilter = 'info')}
						data-testid="error-log-modal-info-tab"
					>
						{t('debug.tabInfo')}
						<span class="tab-badge tab-badge--info">{infoCount}</span>
					</button>
				</div>

				<div class="actions">
					<button
						type="button"
						class="btn-action"
						class:btn-action--copied={copied}
						onclick={handleCopy}
						data-testid="error-log-modal-copy-btn"
					>
						{#if copied}
							<Check size={14} aria-hidden="true" />
							<span>{t('common.copied')}</span>
						{:else}
							<Copy size={14} aria-hidden="true" />
							<span>{t('debug.copyReport')}</span>
						{/if}
					</button>
					<button
						type="button"
						class="btn-action btn-action--danger"
						onclick={handleClear}
						disabled={entries.length === 0}
						data-testid="error-log-modal-clear-btn"
					>
						<Trash2 size={14} aria-hidden="true" />
						<span>{t('debug.clearLogs')}</span>
					</button>
				</div>
			</div>

			{#if categories.length > 2}
				<div class="category-toolbar">
					<span class="category-label">Тема:</span>
					{#each categories as cat}
						<button
							type="button"
							class="cat-chip"
							class:cat-chip--active={selectedCategory === cat}
							onclick={() => (selectedCategory = cat)}
						>
							{cat.toUpperCase()}
						</button>
					{/each}
				</div>
			{/if}

			<div class="modal-body" data-testid="error-log-modal-list">
				{#if filteredList.length === 0}
					<div class="empty-state" data-testid="error-log-modal-empty-message">
						<Check size={28} class="empty-icon" aria-hidden="true" />
						<p class="empty-text">{t('debug.emptyLogs')}</p>
					</div>
				{:else}
					<div class="event-list">
						{#each filteredList as item, index (item.time + index)}
							<div class="event-card event-card--{item.level}">
								<div class="event-header">
									<div class="event-tags">
										{#if item.level === 'error'}
											<span class="level-pill level-pill--error">
												<AlertCircle size={11} aria-hidden="true" /> ERROR
											</span>
										{:else if item.level === 'warn'}
											<span class="level-pill level-pill--warn">
												<AlertTriangle size={11} aria-hidden="true" /> WARN
											</span>
										{:else}
											<span class="level-pill level-pill--info">
												<Info size={11} aria-hidden="true" /> INFO
											</span>
										{/if}
										<span class="meta-pill">{item.category}</span>
									</div>
									<time class="event-time" title={item.time}>
										{formatTime(item.time)}
									</time>
								</div>
								<div class="event-message">{item.message}</div>
								{#if item.data.length > 0}
									<details class="event-stack">
										<summary>{t('debug.callStack')}</summary>
										<pre>{JSON.stringify(item.data, null, 2)}</pre>
									</details>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 10000;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(4px);
		padding: 16px;
	}
	.modal-card {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 680px;
		max-height: calc(100dvh - 32px);
		border-radius: 16px;
		background: var(--color-surface, #0f172a);
		color: var(--color-text, #f8fafc);
		border: 1px solid var(--color-border, rgba(255, 255, 255, 0.15));
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
		overflow: hidden;
	}
	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
	}
	.header-left {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.modal-title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
	}
	.btn-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		border: none;
		border-radius: 8px;
		background: transparent;
		color: inherit;
		opacity: 0.7;
		cursor: pointer;
	}
	.btn-close:hover {
		background: rgba(255, 255, 255, 0.1);
		opacity: 1;
	}
	.modal-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 10px 20px;
		border-bottom: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
		background: rgba(0, 0, 0, 0.15);
	}
	.category-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		padding: 8px 20px;
		background: rgba(0, 0, 0, 0.25);
		border-bottom: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
	}
	.category-label {
		font-size: 0.75rem;
		opacity: 0.6;
		margin-right: 4px;
	}
	.cat-chip {
		padding: 2px 8px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 9999px;
		background: transparent;
		color: inherit;
		font-size: 0.6875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.cat-chip:hover {
		background: rgba(255, 255, 255, 0.1);
	}
	.cat-chip--active {
		background: #3b82f6;
		border-color: #60a5fa;
		color: #ffffff;
	}
	.tabs {
		display: flex;
		gap: 4px;
	}
	.tab {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 10px;
		border: 1px solid transparent;
		border-radius: 8px;
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: 0.8125rem;
		cursor: pointer;
	}
	.tab:hover {
		background: rgba(255, 255, 255, 0.05);
	}
	.tab--active {
		background: var(--color-surface, #1e293b);
		border-color: var(--color-border, rgba(255, 255, 255, 0.2));
		font-weight: 600;
	}
	.tab-badge {
		padding: 1px 6px;
		border-radius: 10px;
		font-size: 0.6875rem;
		background: rgba(255, 255, 255, 0.1);
	}
	.tab-badge--error {
		background: var(--color-danger, #ef4444);
		color: #ffffff;
	}
	.tab-badge--warn {
		background: #d97706;
		color: #ffffff;
	}
	.actions {
		display: flex;
		gap: 6px;
	}
	.btn-action {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 10px;
		border: 1px solid var(--color-border, rgba(255, 255, 255, 0.15));
		border-radius: 8px;
		background: var(--color-surface, #1e293b);
		color: inherit;
		font: inherit;
		font-size: 0.8125rem;
		cursor: pointer;
	}
	.btn-action:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.btn-action--danger:not(:disabled):hover {
		color: var(--color-danger, #ef4444);
		border-color: var(--color-danger, #ef4444);
	}
	.modal-body {
		flex: 1;
		overflow-y: auto;
		padding: 16px 20px;
		max-height: 50vh;
	}
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 48px 16px;
		opacity: 0.8;
	}
	.event-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.event-card {
		padding: 12px;
		border-radius: 10px;
		border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
		background: rgba(0, 0, 0, 0.2);
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.event-card--error {
		border-left: 3px solid var(--color-danger, #ef4444);
	}
	.event-card--warn {
		border-left: 3px solid #d97706;
	}
	.event-card--info {
		border-left: 3px solid #3b82f6;
	}
	.event-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.event-tags {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.level-pill {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 6px;
		border-radius: 4px;
		font-size: 0.6875rem;
		font-weight: 700;
	}
	.level-pill--error {
		background: var(--color-danger, #ef4444);
		color: #ffffff;
	}
	.level-pill--warn {
		background: #d97706;
		color: #ffffff;
	}
	.level-pill--info {
		background: #3b82f6;
		color: #ffffff;
	}
	.meta-pill {
		font-size: 0.75rem;
		opacity: 0.8;
	}
	.event-time {
		font-size: 0.75rem;
		opacity: 0.7;
		font-variant-numeric: tabular-nums;
	}
	.event-message {
		font-size: 0.875rem;
		word-break: break-word;
	}
	.event-stack summary {
		cursor: pointer;
		font-size: 0.75rem;
		opacity: 0.75;
	}
	.event-stack pre {
		margin-top: 6px;
		padding: 8px;
		border-radius: 6px;
		background: rgba(0, 0, 0, 0.3);
		font-size: 0.75rem;
		overflow-x: auto;
	}
</style>
