<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import UiIcon, { type UiIconName } from '$lib/components/ui/UiIcon.svelte';
	import { t } from '$lib/i18n';
	import { canPromptInstall, promptInstall } from '$lib/pwa/installPrompt';
	import { GUIDES, guideFor, type StepIcon } from '$lib/pwa/installGuide';
	import { fullscreen } from '$lib/services/fullscreen.svelte';

	interface Props {
		mode?: 'choice' | 'blocked';
		onclose?: () => void;
	}

	let { mode = 'choice', onclose }: Props = $props();

	const id = $props.id();

	let view = $state<'choice' | 'steps'>(untrack(() => (mode === 'choice' ? 'choice' : 'steps')));
	const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
	const maxTouchPoints = typeof navigator !== 'undefined' ? (navigator.maxTouchPoints ?? 0) : 0;
	const which = guideFor(userAgent, maxTouchPoints);
	const guide = GUIDES[which] ?? GUIDES.desktop;

	const ICONS: Record<StepIcon, UiIconName> = {
		share: 'share',
		add: 'squarePlus',
		dots: 'ellipsisVertical',
		menu: 'menu',
		install: 'monitorDown',
		installEdge: 'grid2x2Plus',
		dock: 'dock',
		browser: 'externalLink',
		phone: 'smartphone',
		app: 'appWindow'
	};

	let dialog = $state<HTMLDialogElement>();
	let first = $state<HTMLButtonElement>();
	let heading = $state<HTMLElement>();

	function close() {
		fullscreen.isModalOpen = false;
		if (onclose) onclose();
		dialog?.close();
	}

	onMount(() => {
		if (!dialog) return;
		const backdrop = (event: MouseEvent) => {
			if (event.target === dialog) close();
		};
		dialog.addEventListener('click', backdrop);
		try {
			dialog.showModal();
		} catch {
			// Dialog might already be open
		}
		(view === 'choice' ? first : heading)?.focus();
		return () => dialog?.removeEventListener('click', backdrop);
	});

	function goFullscreen() {
		close();
		fullscreen.enterDirect();
	}

	async function install() {
		if (canPromptInstall() && (await promptInstall()) !== 'unavailable') {
			close();
			return;
		}
		view = 'steps';
		heading?.focus();
	}
</script>

<dialog
	bind:this={dialog}
	class="lg-hud-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 text-slate-100 max-w-none max-h-none w-screen h-screen border-none"
	aria-labelledby="{id}-title"
	onclose={close}
	data-testid="fullscreen-modal"
>
	<div
		class="lg-hud-modal relative w-full max-w-lg border-2 border-[#8c7456]/80 rounded-2xl p-6 text-white space-y-4 max-h-[calc(100dvh-32px)] overflow-y-auto"
	>
		<div class="flex items-center justify-between pb-3 border-b border-[#3b3226]">
			<h2
				class="text-lg font-black text-amber-200 tracking-wide uppercase outline-none"
				id="{id}-title"
				tabindex="-1"
				bind:this={heading}
			>
				{t(view === 'choice' ? 'install.title.choice' : guide.title)}
			</h2>
			<button
				type="button"
				class="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition cursor-pointer"
				onclick={close}
				aria-label={t('common.close')}
				data-testid="fullscreen-modal-close-btn"
			>
				<UiIcon name="x" class="w-5 h-5" />
			</button>
		</div>

		{#if view === 'choice'}
			<div class="space-y-3 pt-1">
				<button
					type="button"
					class="w-full text-left p-4 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800/80 hover:border-amber-500/60 transition flex items-start gap-3.5 cursor-pointer group"
					bind:this={first}
					onclick={goFullscreen}
					data-testid="fullscreen-modal-browser-btn"
				>
					<div
						class="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 group-hover:scale-105 transition-transform"
						aria-hidden="true"
					>
						<UiIcon name="maximize2" class="w-5 h-5" />
					</div>
					<div class="flex-1 min-w-0">
						<div class="font-bold text-sm text-slate-100 group-hover:text-amber-200">
							{t('install.browser')}
						</div>
						<div class="text-xs text-slate-400 mt-0.5 leading-relaxed">
							{t('install.browserHint')}
						</div>
					</div>
				</button>

				<button
					type="button"
					class="w-full text-left p-4 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800/80 hover:border-amber-500/60 transition flex items-start gap-3.5 cursor-pointer group"
					onclick={install}
					data-testid="fullscreen-modal-install-btn"
				>
					<div
						class="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform"
						aria-hidden="true"
					>
						{#if which === 'edge'}
							<UiIcon name="grid2x2Plus" class="w-5 h-5 -rotate-90" />
						{:else}
							<UiIcon name="monitorDown" class="w-5 h-5" />
						{/if}
					</div>
					<div class="flex-1 min-w-0">
						<div class="font-bold text-sm text-slate-100 group-hover:text-amber-200">
							{t('install.app')}
						</div>
						<div class="text-xs text-slate-400 mt-0.5 leading-relaxed">
							{t('install.appHint')}
						</div>
					</div>
				</button>
			</div>
		{:else}
			{#if mode === 'blocked'}
				<p
					class="text-xs font-semibold text-amber-300 leading-relaxed"
					data-testid="fullscreen-modal-lead-text"
				>
					{t('install.lead.blocked')}
				</p>
			{/if}

			<p class="text-xs text-slate-400 leading-relaxed" data-testid="fullscreen-modal-note-text">
				{t(guide.note)}
			</p>

			<ol class="space-y-2.5 my-2" data-testid="fullscreen-modal-steps-list">
				{#each guide.steps as step, index (step.text)}
					<li
						class="flex items-center gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200"
						data-testid="fullscreen-modal-step-item"
					>
						<span
							class="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[11px] shrink-0"
						>
							{index + 1}
						</span>
						<span class="text-amber-400 shrink-0" aria-hidden="true">
							<UiIcon
								name={ICONS[step.icon]}
								class="w-4 h-4 {step.icon === 'installEdge' ? '-rotate-90' : ''}"
							/>
						</span>
						<span class="flex-1 leading-snug">{t(step.text)}</span>
					</li>
				{/each}
			</ol>

			{#if guide.warning}
				<div
					class="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs"
					data-testid="fullscreen-modal-warning-text"
				>
					<UiIcon name="circleAlert" class="w-4 h-4 shrink-0 mt-0.5" />
					<span class="leading-relaxed">{t(guide.warning)}</span>
				</div>
			{/if}

			<div class="pt-2 flex justify-end">
				<button
					type="button"
					class="px-5 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition cursor-pointer shadow-md shadow-amber-950/50"
					onclick={close}
					data-testid="fullscreen-modal-done-btn"
				>
					{t('install.done')}
				</button>
			</div>
		{/if}
	</div>
</dialog>
