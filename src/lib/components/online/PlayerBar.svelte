<script lang="ts">
	import { Dices, Palette } from 'lucide-svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import AvatarPicker from '$lib/components/ui/AvatarPicker.svelte';
	import { t } from '$lib/i18n';

	interface Props {
		name: string;
		avatar: string;
		country: string;
		onReroll: () => void;
		onSelectAvatar?: (next: string) => void;
	}

	let { name = $bindable(), avatar, country, onReroll, onSelectAvatar }: Props = $props();
	let pickerOpen = $state(false);
</script>

<div class="w-full max-w-xl mx-auto space-y-2">
	<div
		class="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-800/80 border border-slate-700 rounded-xl shadow-lg"
	>
		<div class="flex items-center gap-3">
			<button
				type="button"
				onclick={() => (pickerOpen = !pickerOpen)}
				class="relative group rounded-lg p-0.5 hover:ring-2 hover:ring-amber-400/70 transition cursor-pointer"
				title={t('account.avatar.title')}
				aria-label={t('account.avatar.title')}
				data-testid="playerbar-avatar-btn"
			>
				<Avatar {avatar} size={36} showDefault />
				<span
					class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-900 border border-amber-400/70 flex items-center justify-center"
				>
					<Palette class="w-2.5 h-2.5 text-amber-300" />
				</span>
			</button>
			<div class="flex flex-col">
				<label
					for="player-name-input"
					class="text-[10px] uppercase font-bold text-slate-400 tracking-wider"
				>
					{t('online.yourName')}
				</label>
				<input
					id="player-name-input"
					type="text"
					bind:value={name}
					maxlength={20}
					class="min-h-[44px] bg-slate-900 border border-slate-600 rounded px-2.5 py-1 text-sm font-semibold text-amber-200 focus:outline-none focus:border-amber-400"
					placeholder={t('online.defaultPlayerName')}
				/>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={onReroll}
				class="min-h-[44px] min-w-[44px] p-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-slate-200 transition-colors flex items-center justify-center cursor-pointer"
				title={t('online.rerollName')}
				aria-label={t('online.rerollName')}
			>
				<Dices class="w-5 h-5 text-amber-400" />
			</button>
			{#if country}
				<span
					class="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-bold text-slate-300 uppercase"
				>
					{country}
				</span>
			{/if}
		</div>
	</div>

	{#if pickerOpen}
		<AvatarPicker
			value={avatar}
			onSelect={(next) => {
				onSelectAvatar?.(next);
			}}
		/>
	{/if}
</div>
