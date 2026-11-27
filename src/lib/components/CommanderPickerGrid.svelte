<script lang="ts">
	import {
		COMMANDERS,
		getCommanderDescription,
		getCommanderName,
		getCommanderNickname
	} from '../engine/commanders';
	import { settings } from '$lib/services/settings.svelte';
	import { t } from '$lib/i18n';
	import UiIcon, { type UiIconName } from '$lib/components/ui/UiIcon.svelte';

	let {
		selectedCommanderId = null,
		isRandomBoostActive = false,
		countdownSeconds = null,
		disabled = false,
		onSelect
	}: {
		selectedCommanderId?: number | null;
		isRandomBoostActive?: boolean;
		countdownSeconds?: number | null;
		disabled?: boolean;
		onSelect: (choice: number | 'random') => void;
	} = $props();

	function getLucideIcon(name: string): UiIconName {
		switch (name) {
			case 'Coins':
				return 'coins';
			case 'Hammer':
				return 'hammer';
			case 'Sword':
				return 'sword';
			case 'Zap':
				return 'zap';
			case 'Target':
				return 'target';
			case 'Shield':
			default:
				return 'shield';
		}
	}
</script>

<div class="space-y-3">
	<!-- Top Hero Button: Random Commander (Doubles bonus x2) -->
	<button
		type="button"
		{disabled}
		onclick={() => onSelect('random')}
		data-testid="random-commander-btn"
		class="w-full py-2.5 px-4 rounded-2xl border transition flex items-center justify-between gap-3 shadow-lg {disabled
			? 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-55 cursor-not-allowed'
			: 'cursor-pointer bg-gradient-to-r from-indigo-950/80 via-purple-900/50 to-[#181e2b] border-purple-500/60 hover:border-purple-400 hover:bg-purple-900/60 text-purple-100 active:scale-[0.99]'}"
	>
		<div class="flex items-center gap-2.5 min-w-0">
			<UiIcon name="dices" class="w-6 h-6 text-purple-300 shrink-0" />
			<div class="text-left min-w-0">
				<span class="text-sm font-bold tracking-wide block">{t('commander.randomTitle')}</span>
				<span class="text-[11px] text-purple-200/80 block truncate">
					{t('commander.randomDesc')}
				</span>
			</div>
		</div>

		<div class="flex items-center gap-2 shrink-0">
			<span
				class="px-2.5 py-1 rounded-lg bg-purple-500/25 border border-purple-400/60 text-xs text-purple-200 font-black"
			>
				{t('commander.doubleBonus')}
			</span>
			{#if countdownSeconds !== null}
				<div
					class="px-2.5 py-1 bg-amber-500/20 border-2 border-amber-400/80 rounded-xl flex items-center gap-1.5 animate-pulse"
				>
					<span class="text-base font-mono font-black text-amber-300">
						{countdownSeconds}
					</span>
					<span class="text-[10px] text-amber-200 font-bold uppercase">{t('commander.sec')}</span>
				</div>
			{/if}
		</div>
	</button>

	<!-- Commanders Grid -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
		{#each COMMANDERS as cmd (cmd.id)}
			{@const isSelected = selectedCommanderId === cmd.id}
			{@const isBoosted = isSelected && Boolean(isRandomBoostActive)}

			<button
				type="button"
				{disabled}
				onclick={() => onSelect(cmd.id)}
				data-testid="commander-card-{cmd.id}"
				class="flex items-start gap-3 p-3 rounded-xl border text-left transition {disabled
					? 'bg-[#121620] border-slate-800/80 opacity-55 cursor-not-allowed'
					: isSelected
						? 'cursor-pointer bg-indigo-950/80 border-indigo-400 ring-2 ring-indigo-400/50 shadow-lg'
						: 'cursor-pointer bg-[#181d28]/75 hover:bg-[#202736] border-slate-800 hover:border-indigo-400/60'}"
			>
				<div
					class="p-2.5 rounded-lg border shrink-0 {isSelected
						? 'bg-indigo-600/20 border-indigo-400 text-indigo-300'
						: 'bg-slate-900 border-slate-700 text-slate-400'}"
				>
					<UiIcon name={getLucideIcon(cmd.icon)} class="w-5 h-5" />
				</div>

				<div class="flex-1 min-w-0">
					<div class="flex items-center justify-between gap-2">
						<span class="font-bold text-sm text-white truncate">
							{getCommanderName(cmd, settings.locale)}
						</span>
						<div class="flex items-center gap-1 shrink-0">
							{#if isBoosted}
								<span
									class="text-[10px] font-mono font-black text-purple-200 bg-purple-600/40 border border-purple-400/60 px-1.5 py-0.5 rounded"
								>
									×2
								</span>
							{/if}
							<span
								class="text-[10px] uppercase font-mono font-bold text-indigo-400 bg-indigo-950/70 px-1.5 py-0.5 rounded"
							>
								{getCommanderNickname(cmd, settings.locale)}
							</span>
						</div>
					</div>
					<p
						class="text-xs {isBoosted
							? 'text-purple-200 font-semibold'
							: 'text-slate-300'} mt-1 leading-snug"
					>
						{getCommanderDescription(cmd, isBoosted, settings.locale)}
					</p>
				</div>

				{#if isSelected}
					<div class="text-emerald-400 shrink-0">
						<UiIcon name="check" class="w-5 h-5" />
					</div>
				{/if}
			</button>
		{/each}
	</div>
</div>
