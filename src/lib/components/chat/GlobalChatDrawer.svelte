<script lang="ts">
	import { onMount } from 'svelte';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import {
		QUICK_EMOTES,
		formatChatTime,
		sendGlobalChatMessage,
		subscribeGlobalChat,
		type ChatEntry
	} from '$lib/net/chat';
	import { chatModeration } from '$lib/services/chatModeration.svelte';
	import { toast } from '$lib/controllers/toast.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { t } from '$lib/i18n';

	interface Props {
		senderName: string;
		senderAvatar: string;
		myUid?: string | null;
		onOpenDm?: (peer: { uid: string; name: string; avatar?: string }) => void;
		onInspectProfile?: (uid: string) => void;
	}

	let { senderName, senderAvatar, myUid = null, onOpenDm, onInspectProfile }: Props = $props();

	let isOpen = $state(false);
	let input = $state('');
	let messages = $state<ChatEntry[]>([]);
	let seenCount = $state(0);
	let sending = $state(false);
	let listEl = $state<HTMLDivElement | null>(null);

	const visibleMessages = $derived(messages.filter((m) => !chatModeration.isMuted(m.senderUid)));
	const unreadCount = $derived(isOpen ? 0 : Math.max(0, visibleMessages.length - seenCount));

	$effect(() => {
		if (isOpen) {
			seenCount = visibleMessages.length;
			const count = visibleMessages.length;
			if (listEl && count > 0) {
				listEl.scrollTop = listEl.scrollHeight;
			}
		}
	});

	onMount(() => {
		let unsub = () => {};
		void subscribeGlobalChat((list) => {
			messages = list;
			if (isOpen) {
				seenCount = list.filter((m) => !chatModeration.isMuted(m.senderUid)).length;
			}
		}).then((fn) => {
			unsub = fn;
		});
		return () => unsub();
	});

	async function sendText(e: SubmitEvent) {
		e.preventDefault();
		const text = input.trim().slice(0, 200);
		if (!text || sending) return;
		sending = true;
		try {
			const ok = await sendGlobalChatMessage(senderName, text, {
				avatar: senderAvatar,
				kind: 'text'
			});
			if (ok) {
				input = '';
			} else {
				toast.info(t('chat.cooldown'));
			}
		} finally {
			sending = false;
		}
	}

	async function sendEmote(emote: string) {
		if (sending) return;
		sending = true;
		try {
			const ok = await sendGlobalChatMessage(senderName, emote, {
				avatar: senderAvatar,
				kind: 'emote',
				emote
			});
			if (!ok) {
				toast.info(t('chat.cooldown'));
			}
		} finally {
			sending = false;
		}
	}
</script>

<div class="w-full max-w-xl mx-auto mt-6" data-testid="global-chat-section">
	<div class="flex items-center justify-between gap-2 mb-2">
		<button
			type="button"
			onclick={() => (isOpen = !isOpen)}
			class="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer {isOpen
				? 'bg-sky-500/20 border-sky-400 text-sky-200'
				: 'bg-slate-800/80 border-slate-700 text-slate-200 hover:border-sky-500/60'}"
			data-testid="global-chat-toggle"
		>
			<UiIcon name="messageSquare" class="w-4 h-4 text-sky-400" />
			<span>{t('chat.globalTitle')}</span>
			{#if unreadCount > 0}
				<span
					class="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black leading-none"
				>
					{unreadCount}
				</span>
			{/if}
		</button>

		{#if isOpen}
			<button
				type="button"
				onclick={() => chatModeration.setFilterEnabled(!chatModeration.filterEnabled)}
				class="px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer {chatModeration.filterEnabled
					? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
					: 'bg-slate-900 border-slate-700 text-slate-400'}"
			>
				<UiIcon name="shieldBan" class="w-3.5 h-3.5" />
				<span>{t('chat.filterLabel')}</span>
			</button>
		{/if}
	</div>

	{#if isOpen}
		<div
			class="rounded-2xl bg-slate-900/90 border border-slate-700/80 p-3 space-y-2.5 shadow-xl"
			data-testid="global-chat-panel"
		>
			<div bind:this={listEl} class="max-h-52 overflow-y-auto space-y-2 pr-1 text-xs">
				{#if visibleMessages.length === 0}
					<div class="py-4 text-center text-slate-500 italic">{t('online.hud.noMessages')}</div>
				{:else}
					{#each visibleMessages as msg (msg.id)}
						{@const canInspect = Boolean(myUid && msg.senderUid !== myUid && onInspectProfile)}
						<div class="flex items-start gap-2 group">
							<Avatar avatar={msg.senderAvatar ?? 'castle:amber'} size={22} showDefault />
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-1.5">
									{#if canInspect}
										<button
											type="button"
											onclick={() => onInspectProfile?.(msg.senderUid)}
											class="font-bold text-amber-300 hover:underline truncate cursor-pointer text-left"
										>
											{msg.senderName}
										</button>
									{:else}
										<span class="font-bold text-amber-300 truncate">{msg.senderName}</span>
									{/if}
									<span class="text-[10px] text-slate-500">{formatChatTime(msg.at)}</span>
								</div>
								{#if msg.kind === 'emote'}
									<div class="text-base leading-tight">{msg.emote ?? msg.text}</div>
								{:else}
									<div class="text-slate-200 break-words">
										{chatModeration.sanitizeText(msg.text)}
									</div>
								{/if}
							</div>
							{#if myUid && msg.senderUid !== myUid}
								<div
									class="opacity-90 sm:opacity-0 sm:group-hover:opacity-100 flex items-center gap-0.5 transition shrink-0"
								>
									{#if onOpenDm}
										<button
											type="button"
											onclick={() =>
												onOpenDm?.({
													uid: msg.senderUid,
													name: msg.senderName,
													avatar: msg.senderAvatar
												})}
											class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-300 cursor-pointer"
											title={t('chat.openDm')}
											aria-label={t('chat.openDm')}
										>
											<UiIcon name="messageSquare" class="w-3.5 h-3.5" />
										</button>
									{/if}
									<button
										type="button"
										onclick={() => chatModeration.toggleMute(msg.senderUid)}
										class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-300 cursor-pointer"
										title={t('chat.muteUser')}
										aria-label={t('chat.muteUser')}
									>
										<UiIcon name="volumeX" class="w-3.5 h-3.5" />
									</button>
								</div>
							{/if}
						</div>
					{/each}
				{/if}
			</div>

			{#if chatModeration.mutedUids.length > 0}
				<div
					class="flex items-center justify-between px-2 py-1 rounded bg-slate-950/70 text-[10px] text-slate-400"
				>
					<span>{t('chat.mutedCount', { count: chatModeration.mutedUids.length })}</span>
					<button
						type="button"
						onclick={() => {
							for (const id of [...chatModeration.mutedUids]) chatModeration.toggleMute(id);
						}}
						class="text-sky-300 hover:underline flex items-center gap-1 cursor-pointer"
					>
						<UiIcon name="volume2" class="w-3 h-3" />
						<span>{t('chat.unmuteAll')}</span>
					</button>
				</div>
			{/if}

			<!-- Quick Emotes -->
			<div class="flex flex-wrap gap-1">
				{#each QUICK_EMOTES as em (em)}
					<button
						type="button"
						onclick={() => void sendEmote(em)}
						class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs cursor-pointer transition"
					>
						{em}
					</button>
				{/each}
			</div>

			<form onsubmit={sendText} class="flex gap-2">
				<input
					type="text"
					bind:value={input}
					maxlength="200"
					placeholder={t('online.hud.chatPlaceholder')}
					class="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
					data-testid="global-chat-input"
				/>
				<button
					type="submit"
					class="min-h-[38px] px-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold cursor-pointer flex items-center justify-center"
					aria-label={t('online.hud.sendChat')}
					data-testid="global-chat-send"
				>
					<UiIcon name="send" class="w-4 h-4" />
				</button>
			</form>
		</div>
	{/if}
</div>
