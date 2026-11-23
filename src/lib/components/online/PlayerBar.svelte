<script lang="ts">
	import { Dices } from 'lucide-svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { t } from '$lib/i18n';

	interface Props {
		name: string;
		avatar: string;
		country: string;
		onReroll: () => void;
	}

	let { name = $bindable(), avatar, country, onReroll }: Props = $props();
</script>

<div
	class="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-800/80 border border-slate-700 rounded-xl shadow-lg w-full max-w-xl mx-auto"
>
	<div class="flex items-center gap-3">
		<Avatar {avatar} size={36} showDefault />
		<div class="flex flex-col">
			<label for="player-name-input" class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
				{t('online.yourName')}
			</label>
			<input
				id="player-name-input"
				type="text"
				bind:value={name}
				maxlength={20}
				class="bg-slate-900 border border-slate-600 rounded px-2.5 py-1 text-sm font-semibold text-amber-200 focus:outline-none focus:border-amber-400"
				placeholder="Гравець"
			/>
		</div>
	</div>

	<div class="flex items-center gap-2">
		<button
			type="button"
			onclick={onReroll}
			class="p-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-slate-200 transition-colors"
			title={t('online.rerollName')}
			aria-label={t('online.rerollName')}
		>
			<Dices class="w-5 h-5 text-amber-400" />
		</button>
		{#if country}
			<span class="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-bold text-slate-300 uppercase">
				{country}
			</span>
		{/if}
	</div>
</div>
