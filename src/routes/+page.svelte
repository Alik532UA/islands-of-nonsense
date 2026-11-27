<script lang="ts">
	import { resolve } from '$app/paths';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import UserRoundGroupIcon from '$lib/components/ui/UserRoundGroupIcon.svelte';
	import { t } from '$lib/i18n';
	import { settings } from '$lib/services/settings.svelte';
	import { siblingUrl } from '$lib/siblings';
</script>

<svelte:head>
	<title>Islands of Nonsense — Castle Fight Web</title>
</svelte:head>

<div class="menu-page fill min-h-[calc(100dvh-56px)]">
	<!-- Game Title & Hero Header -->
	<header class="w-full max-w-2xl text-center mb-8">
		<h1
			class="text-4xl md:text-5xl font-black text-amber-300 tracking-wider uppercase drop-shadow-[0_4px_18px_rgba(0,0,0,0.85)]"
		>
			{t('menu.title')}
		</h1>
	</header>

	<!-- Main Action Tiles: Play & Play Online -->
	<nav class="menu-tiles">
		<a
			href={resolve('/play')}
			class="menu-btn menu-btn--game menu-tile anim-stagger-1"
			data-testid="menu-play-link"
		>
			<UiIcon name="gamepad2" class="menu-tile__icon text-amber-400" />
			<span class="font-bold">{t('menu.play')}</span>
		</a>

		<a
			href={resolve('/online')}
			class="menu-btn menu-btn--game menu-tile anim-stagger-2"
			data-testid="menu-online-link"
		>
			<UserRoundGroupIcon class="menu-tile__icon text-sky-400" />
			<span class="font-bold">{t('menu.playOnline')}</span>
		</a>
	</nav>

	<!-- Ecosystem & Partner Links -->
	<div class="menu-links mt-8">
		<a
			href={siblingUrl('digitalworkshop', settings.locale)}
			class="menu-btn menu-btn--link"
			target="_blank"
			rel="noopener noreferrer"
			data-testid="menu-order-link"
		>
			<UiIcon name="codeXml" class="menu-link__icon text-amber-400" />
			<span>{t('menu.order')}</span>
		</a>
	</div>
</div>
