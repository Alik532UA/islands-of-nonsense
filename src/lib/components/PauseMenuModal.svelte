<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import { settings } from '$lib/services/settings.svelte';
	import { fullscreen, canFullscreen } from '$lib/services/fullscreen.svelte';
	import { t } from '$lib/i18n';

	let {
		isOpen = false,
		onResume,
		onRestart,
		onOpenSettings,
		onSurrender,
		onRequestExit
	}: {
		isOpen: boolean;
		onResume: () => void;
		onRestart: () => void;
		onOpenSettings?: () => void;
		onSurrender: () => void;
		onRequestExit?: (targetUrl: string) => boolean;
	} = $props();

	function handleExitToModes() {
		if (onRequestExit && !onRequestExit(resolve('/play'))) {
			return;
		}
		goto(resolve('/play'));
	}

	function handleExitToHome() {
		if (onRequestExit && !onRequestExit(resolve('/'))) {
			return;
		}
		goto(resolve('/'));
	}
</script>

{#if isOpen}
	<div
		class="lg-hud-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 select-none"
		data-testid="pause-menu-modal"
	>
		<div
			class="lg-hud-modal relative w-full max-w-sm border-2 border-[#8c7456]/80 rounded-2xl overflow-hidden p-6 text-center text-white space-y-4"
		>
			<!-- Close cross button -->
			<button
				onclick={onResume}
				class="absolute top-3 right-3 text-slate-400 hover:text-white transition p-1 cursor-pointer"
				title={t('pause.resumeTip')}
				aria-label={t('pause.resumeTip')}
				data-testid="pause-resume-x"
			>
				<UiIcon name="x" class="w-5 h-5" />
			</button>

			<!-- Header -->
			<div class="space-y-1">
				<div class="text-[10px] uppercase tracking-widest text-[#d4af37] font-bold">
					Castle Fight Web
				</div>
				<h2 class="text-xl font-black text-amber-300 uppercase tracking-wide">
					{t('pause.title')}
				</h2>
			</div>

			<!-- Action Menu Buttons -->
			<div class="space-y-2 pt-2">
				<!-- Resume Button -->
				<button
					onclick={onResume}
					class="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 cursor-pointer active:scale-98"
					data-testid="pause-resume-btn"
				>
					<UiIcon name="play" class="w-4 h-4 fill-white" />
					<span>{t('pause.resumeBtn')}</span>
				</button>

				<!-- Restart Match Button -->
				<button
					onclick={onRestart}
					class="w-full py-2.5 px-4 bg-[#231b12] hover:bg-[#32261a] border border-[#8c7456]/60 text-amber-200 font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
					data-testid="pause-restart-btn"
				>
					<UiIcon name="rotateCcw" class="w-4 h-4 text-amber-400" />
					<span>{t('pause.restartBtn')}</span>
				</button>

				<!-- Game Client Settings (Audio, Language, Scale) -->
				<button
					onclick={() => settings.openSettings()}
					class="w-full py-2 px-4 bg-[#181d28] hover:bg-[#252d3d] border border-amber-500/40 text-amber-200 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
					data-testid="pause-game-settings-btn"
				>
					<UiIcon name="sliders" class="w-3.5 h-3.5 text-amber-400" />
					<span>{t('pause.gameSettingsBtn')}</span>
				</button>

				<!-- Match Settings -->
				{#if onOpenSettings}
					<button
						onclick={onOpenSettings}
						class="w-full py-2 px-4 bg-[#181d28] hover:bg-[#252d3d] border border-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
						data-testid="pause-settings-btn"
					>
						<UiIcon name="sliders" class="w-3.5 h-3.5 text-slate-400" />
						<span>{t('pause.matchSettingsBtn')}</span>
					</button>
				{/if}

				<!-- Quick Audio, Fullscreen & Language Row -->
				<div class="grid grid-cols-3 gap-2 pt-1">
					<button
						type="button"
						onclick={() => settings.toggleMute()}
						class="py-2 px-2 bg-[#131722] hover:bg-[#1e2433] border border-slate-700 text-xs text-slate-300 font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
						data-testid="pause-sound-toggle"
						title={settings.isAudioActive ? t('pause.soundOnTitle') : t('pause.soundOffTitle')}
					>
						{#if settings.isAudioActive}
							<UiIcon name="volume2" class="w-4 h-4 text-emerald-400 shrink-0" />
							<span>{t('pause.soundOn')}</span>
						{:else}
							<UiIcon name="volumeX" class="w-4 h-4 text-slate-500 shrink-0" />
							<span class="text-slate-500">{t('pause.soundOff')}</span>
						{/if}
					</button>

					{#if canFullscreen()}
						<button
							type="button"
							onclick={() => fullscreen.toggle()}
							class="py-2 px-2 bg-[#131722] hover:bg-[#1e2433] border border-slate-700 text-xs text-slate-300 font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
							data-testid="pause-fullscreen-toggle"
							title={fullscreen.active
								? t('pause.fullscreenExitTitle')
								: t('pause.fullscreenEnterTitle')}
						>
							{#if fullscreen.active}
								<UiIcon name="minimize2" class="w-4 h-4 text-amber-400 shrink-0" />
								<span>{t('pause.windowLabel')}</span>
							{:else}
								<UiIcon name="maximize2" class="w-4 h-4 text-slate-400 shrink-0" />
								<span>{t('pause.fullscreenLabel')}</span>
							{/if}
						</button>
					{:else}
						<div
							class="py-2 px-2 bg-[#131722] border border-slate-800 text-[11px] text-slate-500 rounded-xl flex items-center justify-center"
						>
							{t('pause.windowLabel')}
						</div>
					{/if}

					<button
						type="button"
						onclick={() => settings.setLocale(settings.locale === 'uk' ? 'en' : 'uk')}
						class="py-2 px-2 bg-[#131722] hover:bg-[#1e2433] border border-slate-700 text-xs text-slate-300 font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
						data-testid="pause-locale-toggle"
						title={settings.locale === 'uk' ? 'Switch to English' : 'Перемкнути на українську'}
					>
						<UiIcon name="languages" class="w-4 h-4 text-cyan-400 shrink-0" />
						<span class="font-bold font-mono">{settings.locale === 'uk' ? 'UA' : 'EN'}</span>
					</button>
				</div>

				<!-- Surrender Button -->
				<button
					onclick={onSurrender}
					class="w-full py-2 px-4 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
					data-testid="pause-surrender-btn"
				>
					<UiIcon name="flag" class="w-3.5 h-3.5 text-rose-400" />
					<span>{t('pause.surrenderBtn')}</span>
				</button>
			</div>

			<!-- Exit Navigation Links -->
			<div class="pt-2 border-t border-[#3b3226] space-y-1.5">
				<button
					onclick={handleExitToModes}
					class="w-full py-2 px-3 bg-[#181d28] hover:bg-[#252d3d] text-slate-300 hover:text-amber-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
					data-testid="pause-exit-modes-btn"
				>
					<UiIcon name="arrowLeft" class="w-3.5 h-3.5 text-amber-400" />
					<span>{t('pause.exitModesBtn')}</span>
				</button>

				<button
					onclick={handleExitToHome}
					class="w-full py-2 px-3 bg-transparent hover:bg-[#181d28] text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
					data-testid="pause-exit-home-btn"
				>
					<UiIcon name="house" class="w-3.5 h-3.5 text-slate-400" />
					<span>{t('pause.exitHomeBtn')}</span>
				</button>
			</div>
		</div>
	</div>
{/if}
