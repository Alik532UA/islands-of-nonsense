<script lang="ts">
	import { X, AlertTriangle, LogOut } from 'lucide-svelte';
	import { t } from '$lib/i18n';

	let {
		isOpen = false,
		onConfirm,
		onCancel
	}: {
		isOpen: boolean;
		onConfirm: () => void;
		onCancel: () => void;
	} = $props();

	function handleKeyDown(e: KeyboardEvent) {
		if (!isOpen) return;
		if (e.key === 'Escape') {
			e.stopPropagation();
			onCancel();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none animate-in fade-in duration-150"
		role="dialog"
		aria-modal="true"
		aria-label={t('battle.leaveTitle')}
		data-testid="leave-game-modal"
	>
		<div
			class="relative w-full max-w-md bg-gradient-to-b from-[#181d28] to-[#0d1017] border-2 border-[#8c7456] rounded-2xl shadow-2xl overflow-hidden p-6 text-white space-y-4"
			style="box-shadow: 0 0 35px rgba(0,0,0,0.9), inset 0 0 20px rgba(140,116,86,0.15);"
		>
			<!-- Close button -->
			<button
				type="button"
				onclick={onCancel}
				class="absolute top-3 right-3 text-slate-400 hover:text-white transition p-1.5 rounded-lg hover:bg-slate-800/60 cursor-pointer"
				title={t('common.close')}
				aria-label={t('common.close')}
				data-testid="leave-cancel-x"
			>
				<X class="w-5 h-5" />
			</button>

			<!-- Header with Alert Icon -->
			<div class="flex items-center gap-3 pb-3 border-b border-[#3b3226]">
				<div
					class="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner"
				>
					<AlertTriangle class="w-5 h-5 text-amber-400" />
				</div>
				<div>
					<div class="text-[10px] uppercase tracking-widest text-[#d4af37] font-bold">
						Castle Fight Web
					</div>
					<h2 class="text-lg font-black text-amber-200 tracking-wide uppercase">
						{t('battle.leaveTitle')}
					</h2>
				</div>
			</div>

			<!-- Body message -->
			<div class="py-2 text-sm text-slate-300 leading-relaxed">
				<p>
					{t('battle.leavePrompt')}
				</p>
			</div>

			<!-- Actions -->
			<div class="grid grid-cols-2 gap-3 pt-2">
				<!-- Stay in battle button -->
				<button
					type="button"
					onclick={onCancel}
					class="py-2.5 px-4 bg-[#231b12] hover:bg-[#32261a] border border-[#8c7456]/60 text-amber-200 font-bold rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
					data-testid="leave-cancel-btn"
				>
					<span>{t('battle.stayInBattle')}</span>
				</button>

				<!-- Confirm leave button -->
				<button
					type="button"
					onclick={onConfirm}
					class="py-2.5 px-4 bg-gradient-to-r from-rose-900 to-rose-700 hover:from-rose-800 hover:to-rose-600 text-white font-bold rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 border border-rose-600/50 cursor-pointer active:scale-98"
					data-testid="leave-confirm-btn"
				>
					<LogOut class="w-4 h-4" />
					<span>{t('battle.confirmLeave')}</span>
				</button>
			</div>
		</div>
	</div>
{/if}
