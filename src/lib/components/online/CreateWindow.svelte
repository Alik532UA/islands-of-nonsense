<script lang="ts">
	import { ArrowLeft, Play } from 'lucide-svelte';
	import { t } from '$lib/i18n';

	interface Props {
		busy: boolean;
		onCreate: (config: { modeId: string; teamSize: 1 | 2 | 3; isPrivate: boolean }) => void;
		onBack: () => void;
	}

	let { busy = false, onCreate, onBack }: Props = $props();

	let selectedMode = $state('standard');
	let teamSize = $state<1 | 2 | 3>(1);
	let isPrivate = $state(false);

	function submit() {
		onCreate({ modeId: selectedMode, teamSize, isPrivate });
	}
</script>

<div
	class="bg-slate-850 border border-slate-700 rounded-2xl p-6 shadow-2xl max-w-md w-full mx-auto"
	role="dialog"
	aria-modal="true"
	aria-labelledby="create-modal-title"
>
	<div class="flex items-center justify-between mb-4">
		<h2 id="create-modal-title" class="text-xl font-bold text-amber-300">
			{t('online.createRoom')}
		</h2>
		<button
			type="button"
			onclick={onBack}
			class="min-h-[44px] min-w-[44px] p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
			aria-label={t('online.back')}
			data-testid="window-back-btn"
		>
			<ArrowLeft class="w-5 h-5" />
		</button>
	</div>

	<!-- Mode selection -->
	<div class="mb-4">
		<span class="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
			{t('online.battleMode')}
		</span>
		<div class="grid grid-cols-2 gap-2">
			<button
				type="button"
				class="min-h-[44px] p-2.5 border rounded-lg text-xs font-bold text-left transition-colors cursor-pointer {selectedMode ===
				'standard'
					? 'bg-amber-500/20 border-amber-400 text-amber-200'
					: 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'}"
				onclick={() => (selectedMode = 'standard')}
			>
				{t('online.classic1v1')}
			</button>
			<button
				type="button"
				class="min-h-[44px] p-2.5 border rounded-lg text-xs font-bold text-left transition-colors cursor-pointer {selectedMode ===
				'allRandom'
					? 'bg-amber-500/20 border-amber-400 text-amber-200'
					: 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'}"
				onclick={() => (selectedMode = 'allRandom')}
			>
				All Random (AR)
			</button>
		</div>
	</div>

	<!-- Privacy toggle -->
	<div class="mb-6">
		<span class="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
			{t('online.roomAccess')}
		</span>
		<div class="flex gap-2">
			<button
				type="button"
				class="flex-1 min-h-[44px] py-2 px-3 border rounded-lg text-xs font-semibold text-center transition-colors cursor-pointer {!isPrivate
					? 'bg-sky-500/20 border-sky-400 text-sky-200'
					: 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}"
				onclick={() => (isPrivate = false)}
			>
				{t('online.public')}
			</button>
			<button
				type="button"
				class="flex-1 min-h-[44px] py-2 px-3 border rounded-lg text-xs font-semibold text-center transition-colors cursor-pointer {isPrivate
					? 'bg-sky-500/20 border-sky-400 text-sky-200'
					: 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}"
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
		class="w-full min-h-[44px] py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
	>
		<Play class="w-5 h-5 fill-current" />
		<span>{t('online.createRoom')}</span>
	</button>
</div>
