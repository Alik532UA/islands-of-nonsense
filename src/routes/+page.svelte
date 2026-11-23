<script lang="ts">
	import { resolve } from '$app/paths';
	import { Gamepad2, CodeXml } from 'lucide-svelte';
	import UserRoundGroupIcon from '$lib/components/ui/UserRoundGroupIcon.svelte';
	import { t } from '$lib/i18n';
	import { settings } from '$lib/services/settings.svelte';
	import { siblingUrl } from '$lib/siblings';
</script>

<svelte:head>
	<title>Islands of Nonsense — Castle Fight Web</title>
</svelte:head>

<div class="menu-page fill min-h-screen">
	<!-- Game Title & Hero Header -->
	<header class="w-full max-w-2xl text-center mb-8">
		<h1
			class="text-4xl md:text-5xl font-black text-amber-300 tracking-wider uppercase drop-shadow-md"
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
			<Gamepad2 class="menu-tile__icon text-amber-400" />
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
			<CodeXml class="menu-link__icon text-amber-400" />
			<span>{t('menu.order')}</span>
		</a>
	</div>
</div>
