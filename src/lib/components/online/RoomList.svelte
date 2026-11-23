<script lang="ts">
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import type { LobbyRoom } from '$lib/net/roomTypes';
	import { Users, LogIn } from 'lucide-svelte';
	import { t } from '$lib/i18n';

	interface Props {
		rooms: LobbyRoom[];
		onJoin: (code: string) => void;
	}

	let { rooms = [], onJoin }: Props = $props();
</script>

<div class="w-full max-w-xl mx-auto mt-6">
	<h3 class="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
		<Users class="w-4 h-4 text-sky-400" />
		<span>{t('online.openRooms')}</span>
		{#if rooms.length > 0}
			<span class="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold">
				{rooms.length}
			</span>
		{/if}
	</h3>

	{#if rooms.length === 0}
		<div class="p-6 bg-slate-800/50 border border-dashed border-slate-700 rounded-xl text-center text-slate-400 text-sm">
			{t('online.noRooms')}
		</div>
	{:else}
		<div class="flex flex-col gap-2">
			{#each rooms as room (room.code)}
				<div
					class="flex items-center justify-between p-3 bg-slate-800/90 border border-slate-700/80 rounded-xl hover:border-slate-600 transition-colors"
				>
					<div class="flex items-center gap-3">
						<Avatar avatar={room.hostAvatar} size={32} showDefault />
						<div>
							<div class="flex items-center gap-2">
								<span class="font-bold text-slate-200 text-sm">{room.hostName}</span>
								{#if room.hostCountry}
									<span class="text-[10px] px-1 bg-slate-900 border border-slate-700 rounded text-slate-400 font-mono">
										{room.hostCountry}
									</span>
								{/if}
							</div>
							<div class="text-xs text-slate-400">
								{room.modeId === 'allRandom' ? 'All Random' : 'Класичний'} · {room.players}/{room.maxPlayers} гравців
							</div>
						</div>
					</div>

					<button
						type="button"
						onclick={() => onJoin(room.code)}
						class="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow transition-transform active:scale-95 flex items-center gap-1.5"
					>
						<LogIn class="w-3.5 h-3.5" />
						<span>{t('online.join')}</span>
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>
