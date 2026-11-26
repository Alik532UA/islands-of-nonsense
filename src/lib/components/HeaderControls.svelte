<script lang="ts">
	import { resolve } from '$app/paths';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import { settings } from '$lib/services/settings.svelte';
	import { fullscreen, canFullscreen, isStandalone } from '$lib/services/fullscreen.svelte';
	import { playerAvatar } from '$lib/services/playerAvatar.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { t } from '$lib/i18n';

	function toggleLang() {
		const next = settings.locale === 'uk' ? 'en' : 'uk';
		settings.setLocale(next);
	}
</script>

<div class="flex items-center gap-2">
	<!-- Language toggle -->
	<button
		type="button"
		class="header-btn font-bold text-xs uppercase tracking-wider"
		onclick={toggleLang}
		title={settings.locale === 'uk'
			? 'UA — Змінити мову на англійську'
			: 'EN — Switch language to Ukrainian'}
		aria-label={settings.locale === 'uk'
			? 'UA — Змінити мову на англійську'
			: 'EN — Switch language to Ukrainian'}
		data-testid="header-lang-toggle"
	>
		{settings.locale === 'uk' ? 'UA' : 'EN'}
	</button>

	<!-- Sound toggle (Quick Mute: SFX + Music) -->
	<button
		type="button"
		class="header-btn"
		onclick={() => settings.toggleMute()}
		title={settings.isAudioActive ? t('sound') + ': Увімкнено' : t('sound') + ': Вимкнено'}
		aria-label={settings.isAudioActive ? t('sound') + ': Увімкнено' : t('sound') + ': Вимкнено'}
		data-testid="header-sound-toggle"
	>
		{#if settings.isAudioActive}
			<UiIcon name="volume2" class="w-4 h-4 text-emerald-400" />
		{:else}
			<UiIcon name="volumeX" class="w-4 h-4 text-slate-400" />
		{/if}
	</button>

	<!-- Settings Modal Button -->
	<button
		type="button"
		class="header-btn"
		onclick={() => settings.openSettings()}
		title={t('settings.btn') || 'Налаштування'}
		aria-label={t('settings.btn') || 'Налаштування'}
		data-testid="header-settings-btn"
	>
		<UiIcon name="sliders" class="w-4 h-4 text-amber-300 hover:rotate-45 transition-transform" />
	</button>

	<!-- Account link -->
	<a
		href={resolve('/account')}
		class="header-btn"
		title={t('account.title') || 'Акаунт'}
		aria-label={t('account.title') || 'Акаунт'}
		data-testid="header-account-link"
	>
		{#if playerAvatar.value}
			<Avatar avatar={playerAvatar.value} size={20} />
		{:else}
			<UiIcon name="circleUser" class="w-5 h-5 text-amber-400" />
		{/if}
	</a>

	<!-- Fullscreen toggle -->
	{#if canFullscreen() || !isStandalone()}
		<button
			type="button"
			class="header-btn fullscreen-btn"
			onclick={() => fullscreen.toggle()}
			title={fullscreen.active ? t('fullscreen.exit') : t('fullscreen.enter')}
			aria-label={fullscreen.active ? t('fullscreen.exit') : t('fullscreen.enter')}
			data-testid="header-fullscreen-toggle"
		>
			{#if fullscreen.active}
				<UiIcon name="minimize2" class="w-4 h-4 text-sky-400" />
			{:else}
				<UiIcon name="maximize2" class="w-4 h-4 text-slate-300" />
			{/if}
		</button>
	{/if}
</div>
