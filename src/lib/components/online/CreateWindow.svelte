<script lang="ts">
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import { t } from '$lib/i18n';

	interface Props {
		busy: boolean;
		onCreate: (config: { isPrivate: boolean }) => void;
		onBack: () => void;
	}

	let { busy = false, onCreate, onBack }: Props = $props();

	let isPrivate = $state(false);

	function submit() {
		onCreate({ isPrivate });
	}
</script>

<div
	class="bg-gradient-to-b from-[#171d2b] via-[#111622] to-[#0a0d14] border-2 border-[#8c7456] rounded-[16px] p-6 shadow-2xl max-w-lg w-full mx-auto"
	style="box-shadow: 0 20px 60px rgba(0,0,0,0.88), inset 0 1px 0 rgba(255,220,150,0.16);"
	role="dialog"
	aria-modal="true"
	aria-labelledby="create-modal-title"
>
	<div class="flex items-center justify-between mb-5 pb-3 border-b border-[#3b3226]">
		<h2 id="create-modal-title" class="text-xl font-black uppercase tracking-wide text-amber-300">
			{t('online.createRoom')}
		</h2>
		<button
			type="button"
			onclick={onBack}
			class="min-h-[44px] min-w-[44px] p-2 text-slate-400 hover:text-amber-200 rounded-[8px] bg-[#161d2b] hover:bg-[#1e273a] border border-[#3b3226] transition-colors flex items-center justify-center cursor-pointer"
			aria-label={t('online.back')}
			data-testid="window-back-btn"
		>
			<UiIcon name="arrowLeft" class="w-5 h-5" />
		</button>
	</div>

	<!-- Room Access (Public vs Private) -->
	<div class="mb-6">
		<span class="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
			{t('online.roomAccess')}
		</span>
		<div class="flex gap-2">
			<button
				type="button"
				data-testid="create-access-public-btn"
				class="flex-1 min-h-[44px] py-2.5 px-3 border rounded-[8px] text-xs font-bold text-center transition-colors cursor-pointer {!isPrivate
					? 'bg-sky-500/20 border-sky-400 text-sky-200'
					: 'bg-[#121826] border-slate-700 text-slate-400 hover:border-slate-500'}"
				onclick={() => (isPrivate = false)}
			>
				{t('online.public')}
			</button>
			<button
				type="button"
				data-testid="create-access-private-btn"
				class="flex-1 min-h-[44px] py-2.5 px-3 border rounded-[8px] text-xs font-bold text-center transition-colors cursor-pointer {isPrivate
					? 'bg-sky-500/20 border-sky-400 text-sky-200'
					: 'bg-[#121826] border-slate-700 text-slate-400 hover:border-slate-500'}"
				onclick={() => (isPrivate = true)}
			>
				{t('online.private')}
			</button>
		</div>
	</div>

	<!-- Actions -->
	<button
		type="button"
		disabled={busy}
		onclick={submit}
		data-testid="create-room-submit-btn"
		class="w-full min-h-[46px] py-3 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:via-amber-400 hover:to-amber-500 disabled:opacity-50 border-2 border-amber-200/80 text-slate-950 font-black uppercase tracking-wider rounded-[10px] shadow-[0_0_24px_rgba(245,158,11,0.35)] transition-transform active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
	>
		<UiIcon name="play" class="w-5 h-5 fill-current" />
		<span>{t('online.createRoom')}</span>
	</button>
</div>
