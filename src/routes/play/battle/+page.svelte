<script lang="ts">
	import { onMount } from 'svelte';
	import BattleArena from '$lib/components/BattleArena.svelte';
	import OnlineRoomHUD from '$lib/components/online/OnlineRoomHUD.svelte';

	let roomCode = $state<string | null>(null);
	let isHost = $state(false);

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const room = params.get('room');
		if (room) {
			roomCode = room.trim().toUpperCase();
			isHost = params.get('host') === '1';
		}
	});
</script>

<svelte:head>
	<title>Castle Fight Web — Бій</title>
</svelte:head>

<BattleArena />
{#if roomCode}
	<OnlineRoomHUD {roomCode} {isHost} />
{/if}
