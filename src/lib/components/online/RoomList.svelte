<script lang="ts">
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Flag from '$lib/components/ui/Flag.svelte';
	import { canJoinAsSpectator, normalizeSpectatorMode, type LobbyRoom } from '$lib/net/roomTypes';
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
				{@const isPlaying = room.status === 'playing'}
				{@const specMode = normalizeSpectatorMode(room.spectatorMode)}
				{@const specCheck = canJoinAsSpectator({
					status: room.status ?? 'lobby',
					spectatorMode: specMode,
					spectatorCount: room.spectators ?? 0
				})}
				{@const canJoinPlayer = !isPlaying && room.players < room.maxPlayers}
				<div
					class="flex items-center justify-between p-3 rounded-xl border transition-colors {isFriendRoom
						? 'bg-amber-950/25 border-amber-500/50 hover:border-amber-400'
						: isPlaying
							? 'bg-slate-900/90 border-emerald-500/35 hover:border-emerald-400/60'
							: 'bg-slate-800/90 border-slate-700/80 hover:border-slate-600'}"
				>
					<div class="flex items-center gap-3">
						<Avatar avatar={room.hostAvatar} size={32} showDefault />
						<div>
							<div class="flex flex-wrap items-center gap-1.5">
								<span class="font-bold text-slate-200 text-sm">{room.hostName}</span>
								{#if isPlaying}
									<span
										class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-bold"
									>
										● {t('online.liveBadge')}
									</span>
								{/if}
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
							<div class="text-xs text-slate-400 flex flex-wrap items-center gap-1.5">
								<span>
									{room.modeId === 'allRandom' ? 'All Random' : t('online.classicLabel')} · {room.players}/{room.maxPlayers}
									{t('online.playersCount')}
								</span>
								{#if (room.spectators ?? 0) > 0}
									<span class="text-sky-300 font-semibold">· {room.spectators} 👁️</span>
								{/if}
								<span
									class="text-[10px] px-1.5 py-0.5 rounded border {specMode === 'none'
										? 'bg-rose-950/40 border-rose-500/35 text-rose-300'
										: specMode === 'lobby'
											? 'bg-amber-950/40 border-amber-500/35 text-amber-300'
											: 'bg-sky-950/40 border-sky-500/35 text-sky-300'}"
								>
									{specMode === 'none'
										? t('online.spectatorsNone')
										: specMode === 'lobby'
											? t('online.spectatorsLobby')
											: t('online.spectatorsAnytime')}
								</span>
							</div>
						</div>
					</div>

					<div class="flex items-center gap-1.5 shrink-0">
						{#if onSpectate && specCheck.allowed}
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
						{#if canJoinPlayer}
							<button
								type="button"
								onclick={() => onJoin(room.code)}
								class="min-h-[44px] py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
							>
								<UiIcon name="logIn" class="w-3.5 h-3.5" />
								<span>{t('online.join')}</span>
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
