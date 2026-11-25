<script lang="ts">
	import { Send, X, MessageCircle } from 'lucide-svelte';
	import { sendDmMessage, subscribeDmThread, type ChatEntry } from '$lib/net/chat';
	import { chatModeration } from '$lib/services/chatModeration.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { t } from '$lib/i18n';

	interface Props {
		peerUid: string;
		peerName: string;
		peerAvatar?: string;
		myUid: string;
		myName: string;
		myAvatar: string;
		onClose: () => void;
	}

	let { peerUid, peerName, peerAvatar, myUid, myName, myAvatar, onClose }: Props = $props();

	let messages = $state<ChatEntry[]>([]);
	let text = $state('');
	let sending = $state(false);

	$effect(() => {
		const target = peerUid;
		if (!target) return;
		let unsub = () => {};
		let active = true;
		void subscribeDmThread(target, (list) => {
			if (active) messages = list;
		}).then((fn) => {
			if (active) unsub = fn;
			else fn();
		});
		return () => {
			active = false;
			unsub();
		};
	});

	async function handleSend(e: SubmitEvent) {
		e.preventDefault();
		const clean = text.trim().slice(0, 200);
		if (!clean || sending) return;
		sending = true;
		text = '';
		try {
			await sendDmMessage(peerUid, myName, clean, myAvatar);
		} finally {
			sending = false;
		}
	}
</script>

<div
	class="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-slate-900 border border-sky-500/40 shadow-2xl overflow-hidden flex flex-col"
	role="dialog"
	aria-label={t('chat.dmTitle', { name: peerName })}
	data-testid="dm-drawer"
>
	<div
		class="flex items-center justify-between px-3.5 py-2.5 bg-slate-950 border-b border-slate-800"
	>
		<div class="flex items-center gap-2 min-w-0">
			<Avatar avatar={peerAvatar ?? 'castle:amber'} size={24} showDefault />
			<div class="min-w-0">
				<div class="text-xs font-bold text-slate-100 truncate">{peerName}</div>
				<div class="text-[10px] text-sky-400 flex items-center gap-1">
					<MessageCircle class="w-2.5 h-2.5" />
					<span>{t('chat.dmSubtitle')}</span>
				</div>
			</div>
		</div>
		<button
			type="button"
			onclick={onClose}
			class="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
			aria-label={t('common.close')}
		>
			<X class="w-4 h-4" />
		</button>
	</div>

	<div class="h-56 overflow-y-auto p-3 space-y-2 text-xs bg-slate-900/95">
		{#if messages.length === 0}
			<div class="py-10 text-center text-slate-500 italic">{t('online.hud.noMessages')}</div>
		{:else}
			{#each messages as msg (msg.id)}
				{@const mine = msg.senderUid === myUid}
				<div class="flex flex-col {mine ? 'items-end' : 'items-start'}">
					<div
						class="max-w-[85%] px-2.5 py-1.5 rounded-xl break-words {mine
							? 'bg-sky-600 text-white'
							: 'bg-slate-800 text-slate-200'}"
					>
						{chatModeration.sanitizeText(msg.text)}
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<form onsubmit={handleSend} class="p-2.5 bg-slate-950 border-t border-slate-800 flex gap-1.5">
		<input
			type="text"
			bind:value={text}
			maxlength="200"
			placeholder={t('online.hud.chatPlaceholder')}
			class="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
			data-testid="dm-input"
		/>
		<button
			type="submit"
			class="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold cursor-pointer flex items-center justify-center"
			aria-label={t('online.hud.sendChat')}
			data-testid="dm-send"
		>
			<Send class="w-3.5 h-3.5" />
		</button>
	</form>
</div>
