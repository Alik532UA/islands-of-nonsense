<script lang="ts">
	import { resolve } from '$app/paths';
	import { Bot, Sparkles, ArrowLeft } from 'lucide-svelte';
	import { t } from '$lib/i18n';
</script>

<svelte:head>
	<title>Castle Fight Web — {t('menu.singleplayer')}</title>
</svelte:head>

<div class="menu-page fill min-h-screen">
	<header class="w-full max-w-2xl text-center mb-6">
		<h1 class="text-3xl md:text-4xl font-extrabold text-amber-300 tracking-wider uppercase mb-2">
			{t('menu.singleplayer')}
		</h1>
		<p class="text-sm text-slate-400">
			{t('menu.singleplayerDesc')}
		</p>
	</header>

	<nav class="menu-tiles">
		<a
			href={resolve('/play/battle')}
			class="menu-btn menu-btn--game menu-tile anim-stagger-1"
			data-testid="play-battle-link"
		>
			<Bot class="menu-tile__icon text-amber-400" />
			<span class="font-bold text-amber-100">{t('menu.vsBot')}</span>
			<span class="text-xs text-slate-400 font-normal">{t('menu.vsBotDesc')}</span>
		</a>

		<a
			href="{resolve('/play/battle')}?mode=sandbox"
			class="menu-btn menu-btn--game menu-tile anim-stagger-2"
			data-testid="play-sandbox-link"
		>
			<Sparkles class="menu-tile__icon text-cyan-400" />
			<span class="font-bold text-cyan-100">{t('menu.sandbox')}</span>
			<span class="text-xs text-slate-400 font-normal">{t('menu.sandboxDesc')}</span>
		</a>
	</nav>

	<div class="menu-links mt-8">
		<a href={resolve('/')} class="menu-btn menu-btn--link" data-testid="back-to-menu-link">
			<ArrowLeft class="menu-link__icon" />
			<span>{t('menu.back')}</span>
		</a>
	</div>
</div>
