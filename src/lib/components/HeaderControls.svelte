<script lang="ts">
	import { resolve } from '$app/paths';
	import { CircleUser, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-svelte';
	import { settings } from '$lib/services/settings.svelte';
	import { fullscreen, canFullscreen } from '$lib/services/fullscreen.svelte';
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

	<!-- Sound toggle -->
	<button
		type="button"
		class="header-btn"
		onclick={() => settings.setSound(!settings.sound)}
		title={settings.sound ? t('sound') + ': Увімкнено' : t('sound') + ': Вимкнено'}
		aria-label={settings.sound ? t('sound') + ': Увімкнено' : t('sound') + ': Вимкнено'}
		data-testid="header-sound-toggle"
	>
		{#if settings.sound}
			<Volume2 class="w-4 h-4 text-emerald-400" />
		{:else}
			<VolumeX class="w-4 h-4 text-slate-400" />
		{/if}
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
			<CircleUser class="w-5 h-5 text-amber-400" />
		{/if}
	</a>

	<!-- Fullscreen toggle -->
	{#if canFullscreen()}
		<button
			type="button"
			class="header-btn"
			onclick={() => fullscreen.toggle()}
			title="Повноекранний режим"
			aria-label="Повноекранний режим"
			data-testid="header-fullscreen-toggle"
		>
			{#if fullscreen.active}
				<Minimize2 class="w-4 h-4 text-sky-400" />
			{:else}
				<Maximize2 class="w-4 h-4 text-slate-300" />
			{/if}
		</button>
	{/if}
</div>
