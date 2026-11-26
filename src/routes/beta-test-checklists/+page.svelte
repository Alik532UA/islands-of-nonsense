<script lang="ts">
	import { browser } from '$app/env';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { BETA_TABS } from '$lib/beta/checklist';
	import type { BetaTab, CheckStatus } from '$lib/beta/types';
	import { storage } from '$lib/services/storage';
	import { settings } from '$lib/services/settings.svelte';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	const STORAGE_KEY = 'beta_checklist_results';

	let activeTabId = $state<string>(BETA_TABS[0].id);
	let answers = $state<Record<string, CheckStatus>>({});

	if (browser) {
		const tabFromUrl = page.url.searchParams.get('tab');
		if (tabFromUrl && BETA_TABS.some((t) => t.id === tabFromUrl)) {
			activeTabId = tabFromUrl;
		}

		answers = storage.getJSON<Record<string, CheckStatus>>(STORAGE_KEY, {});
	}

	const currentTab = $derived<BetaTab>(BETA_TABS.find((t) => t.id === activeTabId) ?? BETA_TABS[0]);

	const lang = $derived<'uk' | 'en'>(settings.locale === 'en' ? 'en' : 'uk');

	function selectTab(id: string) {
		activeTabId = id;
		if (browser) {
			const url = new URL(window.location.href);
			url.searchParams.set('tab', id);
			replaceState(url.toString(), {});
		}
	}

	function setAnswer(checkId: string, status: CheckStatus) {
		answers[checkId] = status;
		if (browser) {
			storage.setJSON(STORAGE_KEY, answers);
		}
	}

	const BORDER_CLASSES: Record<CheckStatus, string> = {
		ok: 'border-emerald-500 bg-emerald-950/20',
		fail: 'border-red-500 bg-red-950/20',
		unclear: 'border-amber-500 bg-amber-950/20',
		skip: 'border-sky-500 bg-sky-950/20'
	};
</script>

<svelte:head>
	<title>Beta Diagnostics & Checklist — Islands of Nonsense</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main
	class="min-h-[calc(100dvh-56px)] bg-slate-950 text-slate-100 p-4 sm:p-8 max-w-5xl mx-auto space-y-6"
>
	<div
		class="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
	>
		<div>
			<div
				class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2 border border-amber-500/20"
			>
				<UiIcon name="shieldAlert" class="w-3.5 h-3.5" />
				{lang === 'uk' ? 'Службовий розділ (поза індексом)' : 'Internal Diagnostics (Noindex)'}
			</div>
			<h1 class="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">
				{lang === 'uk' ? 'Чеклист бета-тестування' : 'Beta Test Checklist'}
			</h1>
			<p class="text-xs sm:text-sm text-slate-400 mt-1">
				{lang === 'uk'
					? 'Машина не помітить усього. Перевірте ключові ігрові сценарії вручну.'
					: 'Automated suites cannot see everything. Verify key game scenarios manually.'}
			</p>
		</div>

		<div class="flex items-center gap-2">
			<a
				href="./play"
				class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition flex items-center gap-2 min-h-[44px] min-w-[44px]"
				data-sveltekit-preload-data="off"
			>
				{lang === 'uk' ? '← До гри' : '← Back to Game'}
			</a>
		</div>
	</div>

	<!-- Вкладки категорій (min-height 44px за WCAG) -->
	<div class="flex flex-wrap gap-2 border-b border-slate-800/80 pb-3" role="tablist">
		{#each BETA_TABS as tab}
			{@const count = tab.checks.length}
			{@const isActive = tab.id === activeTabId}
			<button
				type="button"
				role="tab"
				aria-selected={isActive}
				onclick={() => selectTab(tab.id)}
				class="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 min-h-[44px] {isActive
					? 'bg-amber-500 text-slate-950 shadow-md font-black'
					: 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'}"
			>
				<span>{tab.title[lang]}</span>
				<span
					class="px-1.5 py-0.5 rounded-md text-[11px] {isActive
						? 'bg-amber-900/30 text-slate-950 font-bold'
						: 'bg-slate-800 text-slate-400'}"
				>
					{count}
				</span>
			</button>
		{/each}
	</div>

	<!-- Список перевірок -->
	<div class="space-y-4">
		{#if currentTab.checks.length === 0}
			<div
				class="p-8 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-2xl"
			>
				{lang === 'uk' ? 'Тут поки нічого немає' : 'Nothing here yet'}
			</div>
		{:else}
			{#each currentTab.checks as check}
				{@const currentStatus = answers[check.id]}
				{@const borderClass = currentStatus
					? BORDER_CLASSES[currentStatus]
					: 'border-slate-800 bg-slate-900/60'}
				<div
					class="p-4 sm:p-5 rounded-2xl border-2 transition {borderClass} flex flex-col md:flex-row md:items-center justify-between gap-4"
					data-testid={`check-row-${check.id}`}
				>
					<div class="space-y-1.5 flex-1">
						<div class="flex items-center gap-2">
							<span
								class="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700"
							>
								{check.category[lang]}
							</span>
							{#if check.coverage === 'covered'}
								<span
									class="text-[10px] font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40"
								>
									✓ {lang === 'uk' ? 'Покрито тестом' : 'Test covered'}
								</span>
							{/if}
						</div>
						<p class="text-sm sm:text-base font-semibold text-slate-100">
							{check.text[lang]}
						</p>
						{#if check.testFile}
							<div class="text-[11px] text-slate-500 font-mono">
								{check.testFile}
							</div>
						{/if}
					</div>

					<!-- 4 відповіді (BETA-CHECKLIST-PAGE § 2): Працює / Не працює / Не зрозуміло / Пропустити -->
					<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
						<button
							type="button"
							onclick={() => setAnswer(check.id, 'ok')}
							class="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer {currentStatus ===
							'ok'
								? 'bg-emerald-600 border-emerald-400 text-white shadow-lg'
								: 'bg-slate-800/80 hover:bg-emerald-950/40 border-slate-700 text-slate-300'}"
							aria-label="Працює"
						>
							<UiIcon name="checkCircle2" class="w-4 h-4" />
							<span>{lang === 'uk' ? 'Працює' : 'OK'}</span>
						</button>

						<button
							type="button"
							onclick={() => setAnswer(check.id, 'fail')}
							class="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer {currentStatus ===
							'fail'
								? 'bg-red-600 border-red-400 text-white shadow-lg'
								: 'bg-slate-800/80 hover:bg-red-950/40 border-slate-700 text-slate-300'}"
							aria-label="Не працює"
						>
							<UiIcon name="xCircle" class="w-4 h-4" />
							<span>{lang === 'uk' ? 'Зламано' : 'Fail'}</span>
						</button>

						<button
							type="button"
							onclick={() => setAnswer(check.id, 'unclear')}
							class="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer {currentStatus ===
							'unclear'
								? 'bg-amber-600 border-amber-400 text-white shadow-lg'
								: 'bg-slate-800/80 hover:bg-amber-950/40 border-slate-700 text-slate-300'}"
							aria-label="Не зрозуміло"
						>
							<UiIcon name="helpCircle" class="w-4 h-4" />
							<span>{lang === 'uk' ? 'Спірно' : 'Unclear'}</span>
						</button>

						<button
							type="button"
							onclick={() => setAnswer(check.id, 'skip')}
							class="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer {currentStatus ===
							'skip'
								? 'bg-sky-600 border-sky-400 text-white shadow-lg'
								: 'bg-slate-800/80 hover:bg-sky-950/40 border-slate-700 text-slate-300'}"
							aria-label="Пропустити"
						>
							<UiIcon name="fastForward" class="w-4 h-4" />
							<span>{lang === 'uk' ? 'Пропуск' : 'Skip'}</span>
						</button>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</main>
