<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';

	onMount(() => {
		goto(resolve('/play'), { replaceState: true });
	});
</script>

<svelte:head>
	<title>Castle Fight Web — Одиночна гра</title>
</svelte:head>

<div class="menu-page fill min-h-screen flex items-center justify-center text-slate-400 text-xs">
	<span>Перенаправлення до вибору режимів...</span>
</div>
