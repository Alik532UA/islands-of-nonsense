<script lang="ts">
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Flag from '$lib/components/ui/Flag.svelte';
	import type { LobbyRoom } from '$lib/net/roomTypes';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import { t } from '$lib/i18n';

	interface Props {
		rooms: LobbyRoom[];
		friendUids?: string[];
		onJoin: (code: string) => void;
		onSpectate?: (code: string) => void;
	}

	let { rooms = [], friendUids = [], onJoin, onSpectate }: Props = $props();

	const friendSet = $derived(new Set(friendUids));
	const orderedRooms = $derived(
		[...rooms].sort((a, b) => {
			const aFriend = friendSet.has(a.hostUid) ? 0 : 1;
			const bFriend = friendSet.has(b.hostUid) ? 0 : 1;
			return aFriend - bFriend || b.createdAt - a.createdAt;
		})
	);
</script>

<div class="w-full max-w-xl mx-auto mt-6">
	<h3
		class="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2"
	>
		<UiIcon name="users" class="w-4 h-4 text-sky-400" />
		<span>{t('online.openRooms')}</span>
		{#if orderedRooms.length > 0}
			<span
				class="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold"
			>
				{orderedRooms.length}
			</span>
		{/if}
	</h3>

	{#if orderedRooms.length === 0}
		<div
			class="p-6 bg-slate-800/50 border border-dashed border-slate-700 rounded-xl text-center text-slate-400 text-sm"
		>
			{t('online.noRooms')}
		</div>
	{:else}
		<div class="flex flex-col gap-2">
			{#each orderedRooms as room (room.code)}
				{@const isFriendRoom = friendSet.has(room.hostUid)}
				<div
					class="flex items-center justify-between p-3 rounded-xl border transition-colors {isFriendRoom
						? 'bg-amber-950/25 border-amber-500/50 hover:border-amber-400'
						: 'bg-slate-800/90 border-slate-700/80 hover:border-slate-600'}"
				>
					<div class="flex items-center gap-3">
						<Avatar avatar={room.hostAvatar} size={32} showDefault />
						<div>
							<div class="flex items-center gap-2">
								<span class="font-bold text-slate-200 text-sm">{room.hostName}</span>
								{#if isFriendRoom}
									<span
										class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 font-bold"
									>
										<UiIcon name="heart" class="w-2.5 h-2.5" />
										{t('social.friendBadge')}
									</span>
								{/if}
								{#if room.hostCountry}
									<Flag code={room.hostCountry} showCode />
								{/if}
							</div>
							<div class="text-xs text-slate-400">
								{room.modeId === 'allRandom' ? 'All Random' : t('online.classicLabel')} · {room.players}/{room.maxPlayers}
								{t('online.playersCount')}
							</div>
						</div>
					</div>

					<div class="flex items-center gap-1.5 shrink-0">
						{#if onSpectate}
							<button
								type="button"
								onclick={() => onSpectate(room.code)}
								class="min-h-[44px] py-2 px-3 bg-slate-900 hover:bg-slate-700 text-sky-300 border border-slate-700 font-bold text-xs rounded-lg transition-transform active:scale-95 flex items-center gap-1 cursor-pointer"
								title={t('online.spectate')}
								data-testid="room-spectate-btn-{room.code}"
							>
								<UiIcon name="eye" class="w-3.5 h-3.5" />
								<span class="hidden sm:inline">{t('online.spectate')}</span>
							</button>
						{/if}
						<button
							type="button"
							onclick={() => onJoin(room.code)}
							class="min-h-[44px] py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
						>
							<UiIcon name="logIn" class="w-3.5 h-3.5" />
							<span>{t('online.join')}</span>
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
