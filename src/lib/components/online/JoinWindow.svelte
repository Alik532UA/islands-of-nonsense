<script lang="ts">
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import { t } from '$lib/i18n';
	import { isValidRoomCode } from '$lib/net/roomCode';

	interface Props {
		busy: boolean;
		onJoin: (code: string) => void;
		onBack: () => void;
	}

	let { busy = false, onJoin, onBack }: Props = $props();

	let code = $state('');

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		code = target.value.toUpperCase();
	}

	function submit() {
		if (isValidRoomCode(code)) {
			onJoin(code.trim().toUpperCase());
		}
	}
</script>

<div
	class="bg-slate-850 border border-slate-700 rounded-2xl p-6 shadow-2xl max-w-md w-full mx-auto"
	role="dialog"
	aria-modal="true"
	aria-labelledby="join-modal-title"
>
	<div class="flex items-center justify-between mb-4">
		<h2 id="join-modal-title" class="text-xl font-bold text-sky-300">
			{t('online.joinByCode')}
		</h2>
		<button
			type="button"
			onclick={onBack}
			class="min-h-[44px] min-w-[44px] p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
			aria-label={t('online.back')}
			data-testid="window-back-btn"
		>
			<UiIcon name="arrowLeft" class="w-5 h-5" />
		</button>
	</div>

	<p class="text-xs text-slate-400 mb-4">{t('online.joinCodeHint')}</p>

	<div class="mb-6">
		<input
			type="text"
			value={code}
			oninput={handleInput}
			maxlength={6}
			placeholder="CF42"
			aria-label={t('online.roomCode')}
			class="w-full min-h-[48px] bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-center text-2xl font-black tracking-widest text-amber-300 focus:outline-none focus:border-sky-400 uppercase"
		/>
	</div>

	<button
		type="button"
		disabled={busy || !isValidRoomCode(code)}
		onclick={submit}
		class="w-full min-h-[44px] py-3 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
	>
		<UiIcon name="logIn" class="w-5 h-5" />
		<span>{t('online.join')}</span>
	</button>
</div>
