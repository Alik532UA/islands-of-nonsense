<script lang="ts">
	import {
		X,
		Volume2,
		VolumeX,
		Languages,
		Sliders,
		Monitor,
		Maximize2,
		Minimize2,
		Sparkles,
		Check
	} from 'lucide-svelte';
	import { settings, UI_SCALES } from '$lib/services/settings.svelte';
	import { fullscreen, canFullscreen } from '$lib/services/fullscreen.svelte';
	import { sound } from '$lib/services/audio';
	import { t } from '$lib/i18n';

	let {
		isOpen = false,
		onClose
	}: {
		isOpen: boolean;
		onClose: () => void;
	} = $props();

	type Tab = 'audio' | 'language' | 'interface';
	let activeTab = $state<Tab>('audio');

	let volumePercent = $derived(Math.round(settings.volume * 100));

	function handleVolumeChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const val = parseFloat(target.value) / 100;
		settings.setVolume(val);
	}

	function handleTestSound() {
		sound.playCoin();
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (!isOpen) return;
		if (e.key === 'Escape') {
			e.stopPropagation();
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none animate-in fade-in duration-150"
		role="dialog"
		aria-modal="true"
		aria-label={t('settings.title')}
		data-testid="settings-modal"
	>
		<div
			class="relative w-full max-w-lg bg-gradient-to-b from-[#181d28] to-[#0d1017] border-2 border-[#8c7456] rounded-2xl shadow-2xl overflow-hidden p-6 text-white space-y-5"
			style="box-shadow: 0 0 35px rgba(0,0,0,0.9), inset 0 0 20px rgba(140,116,86,0.15);"
		>
			<!-- Header -->
			<div class="flex items-center justify-between pb-3 border-b border-[#3b3226]">
				<div class="flex items-center gap-3">
					<div
						class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0"
					>
						<Sliders class="w-5 h-5" />
					</div>
					<div>
						<div class="text-[10px] uppercase tracking-widest text-[#d4af37] font-bold">
							Castle Fight Web
						</div>
						<h2 class="text-lg font-black text-amber-200 tracking-wide uppercase">
							{t('settings.title')}
						</h2>
					</div>
				</div>

				<button
					type="button"
					onclick={onClose}
					class="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition cursor-pointer"
					title={t('common.close')}
					aria-label={t('common.close')}
					data-testid="settings-close-btn"
				>
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Tabs Navigation -->
			<div class="flex gap-2 p-1 bg-[#0b0e15] border border-slate-800 rounded-xl">
				<button
					type="button"
					class="flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer {activeTab ===
					'audio'
						? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
						: 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}"
					onclick={() => (activeTab = 'audio')}
					data-testid="settings-tab-audio"
				>
					<Volume2 class="w-4 h-4 shrink-0" />
					<span>{t('settings.tab.audio')}</span>
				</button>

				<button
					type="button"
					class="flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer {activeTab ===
					'language'
						? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
						: 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}"
					onclick={() => (activeTab = 'language')}
					data-testid="settings-tab-language"
				>
					<Languages class="w-4 h-4 shrink-0" />
					<span>{t('settings.tab.language')}</span>
				</button>

				<button
					type="button"
					class="flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer {activeTab ===
					'interface'
						? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
						: 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}"
					onclick={() => (activeTab = 'interface')}
					data-testid="settings-tab-interface"
				>
					<Monitor class="w-4 h-4 shrink-0" />
					<span>{t('settings.tab.interface')}</span>
				</button>
			</div>

			<!-- Tab Content -->
			<div class="min-h-[220px] flex flex-col justify-between">
				{#if activeTab === 'audio'}
					<div class="space-y-4 animate-in fade-in duration-100">
						<!-- Master Volume Slider -->
						<div class="bg-[#121622] border border-slate-800/80 rounded-xl p-4 space-y-2">
							<div class="flex items-center justify-between text-xs font-semibold">
								<span class="text-slate-200 flex items-center gap-2">
									<Volume2 class="w-4 h-4 text-amber-400" />
									{t('settings.masterVolume')}
								</span>
								<span
									class="font-mono text-amber-300 font-bold bg-[#1a2130] px-2 py-0.5 rounded border border-amber-500/20"
								>
									{volumePercent}%
								</span>
							</div>
							<input
								type="range"
								min="0"
								max="100"
								step="1"
								value={volumePercent}
								oninput={handleVolumeChange}
								class="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
								data-testid="settings-volume-slider"
								aria-label={t('settings.masterVolume')}
							/>
						</div>

						<!-- Sound Effects Toggle & Test Row -->
						<div
							class="bg-[#121622] border border-slate-800/80 rounded-xl p-4 flex items-center justify-between gap-4"
						>
							<div class="space-y-0.5">
								<div class="text-xs font-bold text-slate-200">{t('settings.soundFx')}</div>
								<div class="text-[11px] text-slate-400">{t('settings.soundFxDesc')}</div>
							</div>
							<div class="flex items-center gap-2 shrink-0">
								<button
									type="button"
									onclick={() => settings.setSound(!settings.sound)}
									class="py-1.5 px-3 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer {settings.sound
										? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/60'
										: 'bg-slate-900/60 border-slate-700 text-slate-400 hover:bg-slate-800'}"
									data-testid="settings-sound-toggle"
								>
									{#if settings.sound}
										<Volume2 class="w-4 h-4 text-emerald-400" />
										<span>{t('settings.enabled')}</span>
									{:else}
										<VolumeX class="w-4 h-4 text-slate-500" />
										<span>{t('settings.disabled')}</span>
									{/if}
								</button>

								<button
									type="button"
									onclick={handleTestSound}
									class="py-1.5 px-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
									title={t('settings.testSound')}
									data-testid="settings-test-sound-btn"
								>
									<Sparkles class="w-3.5 h-3.5" />
									<span class="hidden sm:inline">{t('settings.testSound')}</span>
								</button>
							</div>
						</div>
					</div>
				{:else if activeTab === 'language'}
					<div class="space-y-3 animate-in fade-in duration-100">
						<div class="text-xs text-slate-400">{t('settings.langSelect')}</div>

						<div class="grid grid-cols-2 gap-3">
							<!-- Ukrainian Option -->
							<button
								type="button"
								class="p-4 rounded-xl border text-left transition flex flex-col justify-between gap-3 cursor-pointer {settings.locale ===
								'uk'
									? 'bg-amber-500/15 border-amber-500/60 text-amber-200 shadow-md shadow-amber-950/40'
									: 'bg-[#121622] border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-[#181e2d]'}"
								onclick={() => settings.setLocale('uk')}
								data-testid="settings-lang-uk"
							>
								<div class="flex items-center justify-between w-full">
									<span class="text-xl">🇺🇦</span>
									{#if settings.locale === 'uk'}
										<span
											class="p-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40"
										>
											<Check class="w-3.5 h-3.5" />
										</span>
									{/if}
								</div>
								<div>
									<div class="font-bold text-sm">Українська</div>
									<div class="text-[10px] text-slate-400 font-mono">UA (Типова)</div>
								</div>
							</button>

							<!-- English Option -->
							<button
								type="button"
								class="p-4 rounded-xl border text-left transition flex flex-col justify-between gap-3 cursor-pointer {settings.locale ===
								'en'
									? 'bg-amber-500/15 border-amber-500/60 text-amber-200 shadow-md shadow-amber-950/40'
									: 'bg-[#121622] border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-[#181e2d]'}"
								onclick={() => settings.setLocale('en')}
								data-testid="settings-lang-en"
							>
								<div class="flex items-center justify-between w-full">
									<span class="text-xl">🇬🇧</span>
									{#if settings.locale === 'en'}
										<span
											class="p-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40"
										>
											<Check class="w-3.5 h-3.5" />
										</span>
									{/if}
								</div>
								<div>
									<div class="font-bold text-sm">English</div>
									<div class="text-[10px] text-slate-400 font-mono">EN (International)</div>
								</div>
							</button>
						</div>
					</div>
				{:else if activeTab === 'interface'}
					<div class="space-y-4 animate-in fade-in duration-100">
						<!-- UI Scale Presets -->
						<div class="bg-[#121622] border border-slate-800/80 rounded-xl p-4 space-y-3">
							<div class="space-y-0.5">
								<div class="text-xs font-bold text-slate-200">{t('settings.uiScale')}</div>
								<div class="text-[11px] text-slate-400">{t('settings.uiScaleDesc')}</div>
							</div>

							<div class="grid grid-cols-4 gap-2 pt-1">
								{#each UI_SCALES as scale}
									<button
										type="button"
										class="py-2 px-1 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer {settings.uiScale ===
										scale
											? 'bg-amber-500/20 border-amber-500/60 text-amber-200 shadow-sm'
											: 'bg-[#0f131d] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'}"
										onclick={() => settings.setUiScale(scale)}
										data-testid={`settings-scale-${scale}`}
									>
										<span>{Math.round(scale * 100)}%</span>
										<span class="text-[9px] text-slate-400 font-normal">
											{scale === 0.85
												? '85%'
												: scale === 1
													? '100%'
													: scale === 1.15
														? '115%'
														: '130%'}
										</span>
									</button>
								{/each}
							</div>
						</div>

						<!-- Fullscreen Option -->
						<div
							class="bg-[#121622] border border-slate-800/80 rounded-xl p-4 flex items-center justify-between gap-4"
						>
							<div class="space-y-0.5">
								<div class="text-xs font-bold text-slate-200">{t('settings.fullscreen')}</div>
								<div class="text-[11px] text-slate-400">{t('settings.fullscreenDesc')}</div>
							</div>

							{#if canFullscreen()}
								<button
									type="button"
									onclick={() => fullscreen.toggle()}
									class="py-2 px-3 rounded-lg border border-slate-700 bg-[#0f131d] hover:bg-[#1a2130] text-xs font-semibold text-slate-200 transition flex items-center gap-1.5 cursor-pointer shrink-0"
									data-testid="settings-fullscreen-btn"
								>
									{#if fullscreen.active}
										<Minimize2 class="w-4 h-4 text-amber-400" />
										<span>{t('settings.disabled')}</span>
									{:else}
										<Maximize2 class="w-4 h-4 text-sky-400" />
										<span>{t('settings.enabled')}</span>
									{/if}
								</button>
							{:else}
								<span class="text-xs text-slate-500 font-mono">—</span>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="pt-3 border-t border-[#3b3226] flex justify-end">
				<button
					type="button"
					onclick={onClose}
					class="px-5 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition cursor-pointer shadow-md shadow-amber-950/50"
				>
					{t('common.close')}
				</button>
			</div>
		</div>
	</div>
{/if}
