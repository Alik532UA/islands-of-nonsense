<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		Copy,
		Check,
		MessageSquare,
		Play,
		Users,
		LogOut,
		Send,
		Wifi,
		WifiOff
	} from 'lucide-svelte';
	import { connect } from '$lib/net/firebase';
	import { liveNet } from '$lib/net/roomNet';
	import { sendChatMessage } from '$lib/net/rtdbRoom';
	import { removeFromLobby } from '$lib/net/lobby';
	import type { Member, RoomInfo, RoomTransport } from '$lib/net/roomTypes';
	import { PLAYABLE_RACES, formatRaceName } from '$lib/engine/gameData';
	import { PlayerIdentity } from '$lib/controllers/playerIdentity.svelte';
	import { settings } from '$lib/services/settings.svelte';
	import { t } from '$lib/i18n';

	interface Props {
		roomCode: string;
		isHost: boolean;
	}

	interface ChatMessage {
		id: string;
		senderUid: string;
		senderName: string;
		text: string;
		at: number;
	}

	let { roomCode, isHost }: Props = $props();

	let transport = $state<RoomTransport | null>(null);
	let roomInfo = $state<RoomInfo | null>(null);
	let members = $state<Member[]>([]);
	let onlineUids = $state<string[]>([]);
	let maxMoveSeq = $state(0);
	let localUid = $state<string | null>(null);
	let copied = $state(false);
	let starting = $state(false);
	let chatOpen = $state(false);
	let chatInput = $state('');
	let messages = $state<ChatMessage[]>([]);
	let roomError = $state<string | null>(null);

	const identity = new PlayerIdentity();

	let isLobby = $derived(roomInfo?.status === 'lobby');
	let isPlaying = $derived(roomInfo?.status === 'playing');
	let peerOnlineCount = $derived(onlineUids.filter((id) => id !== localUid).length);
	let localMember = $derived(members.find((m) => m.uid === localUid) ?? null);

	onMount(() => {
		let stopPresence = () => {};
		let stopWatchPresence = () => {};
		let stopBeat = () => {};
		let stopWatchRoom = () => {};
		let stopChat = () => {};
		let active = true;

		void identity.load(settings.locale);

		void (async () => {
			try {
				const { db, uid } = await connect();
				if (!active) return;
				localUid = uid;

				const currentInfo = await liveNet.peekRoom(roomCode);
				if (!currentInfo) {
					roomError = t('online.hud.roomUnavailable', { code: roomCode });
					return;
				}

				const currentMembers = (await liveNet.peekMembers(roomCode)) ?? [];
				if (!currentMembers.some((m) => m.uid === uid)) {
					await liveNet.joinRoom(roomCode, {
						name: identity.forEntry(settings.locale),
						role: currentInfo.status === 'playing' ? 'spectator' : 'player',
						country: identity.country,
						avatar: identity.avatar,
						team: isHost ? 'west' : currentMembers.length % 2 === 0 ? 'west' : 'east'
					});
				}

				const rt = await liveNet.roomTransport(roomCode);
				if (!active) return;
				transport = rt;

				stopPresence = await liveNet.trackPresence(roomCode);
				stopWatchPresence = await liveNet.watchPresence(roomCode, (online) => {
					onlineUids = online;
				});
				stopBeat = liveNet.beat(rt);

				stopWatchRoom = rt.watch(
					(snap) => {
						roomInfo = snap.info;
						members = snap.members;
						maxMoveSeq = snap.moves.reduce((acc, m) => Math.max(acc, m.seq), 0);
					},
					(why) => {
						roomError =
							why === 'closed' ? t('online.hud.roomClosed') : t('online.hud.connectionLost');
					}
				);

				const { ref, query, limitToLast, onChildAdded } = await import('firebase/database');
				if (!active) return;
				const chatQuery = query(ref(db, `rooms/${roomCode}/chat`), limitToLast(30));
				const seenMessageIds = new Set<string>();
				stopChat = onChildAdded(chatQuery, (snap) => {
					const id = snap.key;
					const val = snap.val() as Omit<ChatMessage, 'id'> | null;
					if (!id || !val || seenMessageIds.has(id)) return;
					seenMessageIds.add(id);
					messages = [...messages, { id, ...val }]
						.sort((a, b) => (a.at ?? 0) - (b.at ?? 0))
						.slice(-30);
				});
			} catch (err) {
				roomError = err instanceof Error ? err.message : t('online.hud.joinError');
			}
		})();

		return () => {
			active = false;
			stopChat();
			stopWatchRoom();
			stopBeat();
			stopWatchPresence();
			stopPresence();
		};
	});

	async function copyCode() {
		try {
			await navigator.clipboard.writeText(roomCode);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			// Ignore clipboard permission errors
		}
	}

	async function handleChangeTeam(nextTeam: 'west' | 'east') {
		if (!isLobby || !localUid) return;
		await liveNet.updateMe(roomCode, { team: nextTeam }).catch(() => {});
	}

	async function handleChangeRace(nextRace: string) {
		if (!isLobby || !localUid) return;
		await liveNet.updateMe(roomCode, { race: nextRace }).catch(() => {});
	}

	async function handleStartMatch() {
		if (!transport || !localUid || starting) return;
		starting = true;
		try {
			const roster = [...members]
				.filter((m) => m.role === 'player')
				.sort((a, b) => a.order - b.order)
				.map((m) => ({
					uid: m.uid,
					name: m.name,
					team: m.team ?? 'west',
					...(m.race ? { race: m.race } : {})
				}));
			await transport.setStatus('playing', roster);
			await transport.append({
				seq: maxMoveSeq + 1,
				by: localUid,
				type: 'RESUME',
				payload: { tick: 0, team: localMember?.team ?? (isHost ? 'west' : 'east') }
			});
			const { db } = await connect();
			await removeFromLobby(db, roomCode).catch(() => {});
		} finally {
			starting = false;
		}
	}

	async function sendChat(e: SubmitEvent) {
		e.preventDefault();
		const text = chatInput.trim().slice(0, 200);
		if (!text || !localUid) return;
		chatInput = '';
		try {
			await sendChatMessage(roomCode, identity.forEntry(settings.locale), text);
		} catch {
			// Ignore transient chat write failure
		}
	}

	async function handleLeaveRoom() {
		try {
			if (isHost) {
				const { db } = await connect();
				await removeFromLobby(db, roomCode).catch(() => {});
				await liveNet.closeRoom(roomCode).catch(() => {});
			}
		} finally {
			await goto(resolve('/online'));
		}
	}
</script>

{#if isLobby && !roomError}
	<div
		class="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="online-lobby-title"
		data-testid="online-waiting-lobby"
	>
		<div class="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
			<div class="flex items-center justify-between mb-4">
				<h2 id="online-lobby-title" class="text-lg font-extrabold text-amber-300">
					{t('online.hud.roomTitle', { code: roomCode })}
				</h2>
				<button
					type="button"
					onclick={copyCode}
					class="min-h-[44px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
				>
					{#if copied}
						<Check class="w-4 h-4 text-emerald-400" />
						<span>{t('online.hud.copied')}</span>
					{:else}
						<Copy class="w-4 h-4 text-sky-400" />
						<span>{t('online.hud.copyCode')}</span>
					{/if}
				</button>
			</div>

			{#if localMember && !roomInfo?.config?.allRandom}
				<div class="mb-4 p-3 rounded-xl bg-slate-800/70 border border-slate-700 space-y-2.5">
					<div class="flex items-center justify-between gap-2">
						<span class="text-xs font-semibold text-slate-300">Команда:</span>
						<div class="flex gap-1.5">
							<button
								type="button"
								onclick={() => handleChangeTeam('west')}
								class="px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer {localMember.team !==
								'east'
									? 'bg-sky-500/25 border-sky-400 text-sky-200'
									: 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}"
							>
								{t('online.hud.teamWest')}
							</button>
							<button
								type="button"
								onclick={() => handleChangeTeam('east')}
								class="px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer {localMember.team ===
								'east'
									? 'bg-rose-500/25 border-rose-400 text-rose-200'
									: 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}"
							>
								{t('online.hud.teamEast')}
							</button>
						</div>
					</div>
					<div class="flex items-center justify-between gap-2">
						<label for="online-lobby-race" class="text-xs font-semibold text-slate-300">
							Раса:
						</label>
						<select
							id="online-lobby-race"
							value={localMember.race ?? 'random'}
							onchange={(e) => handleChangeRace((e.currentTarget as HTMLSelectElement).value)}
							class="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-100"
						>
							<option value="random">Випадкова (+30%)</option>
							{#each PLAYABLE_RACES as race (race)}
								<option value={race}>{formatRaceName(race)}</option>
							{/each}
						</select>
					</div>
				</div>
			{/if}

			<div class="mb-4 space-y-2">
				<div
					class="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"
				>
					<Users class="w-4 h-4 text-sky-400" />
					<span>{t('online.hud.playersTitle', { count: members.length })}</span>
				</div>
				{#each members as member (member.uid)}
					<div
						class="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-sm"
					>
						<div class="flex flex-col">
							<span class="font-semibold text-slate-100">{member.name}</span>
							{#if member.race}
								<span class="text-[10px] text-amber-300/90">
									{member.race === 'random' ? 'Випадкова (+30%)' : formatRaceName(member.race)}
								</span>
							{/if}
						</div>
						<span class="text-xs px-2 py-0.5 rounded bg-slate-900 text-slate-300">
							{member.team === 'east' ? t('online.hud.teamEast') : t('online.hud.teamWest')}
							{onlineUids.includes(member.uid) ? ` · ${t('online.hud.onlineBadge')}` : ''}
						</span>
					</div>
				{/each}
			</div>

			<div class="flex gap-2">
				{#if isHost}
					<button
						type="button"
						disabled={starting}
						onclick={handleStartMatch}
						class="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer"
						data-testid="online-start-battle-btn"
					>
						<Play class="w-4 h-4 fill-current" />
						<span>{t('online.hud.startBattle')}</span>
					</button>
				{:else}
					<div
						class="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center"
					>
						{t('online.hud.waitingHost')}
					</div>
				{/if}

				<button
					type="button"
					onclick={handleLeaveRoom}
					class="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-slate-800 hover:bg-rose-900/60 border border-slate-700 text-slate-300 hover:text-rose-200 flex items-center justify-center cursor-pointer"
					aria-label={t('online.hud.leaveRoom')}
				>
					<LogOut class="w-4 h-4" />
				</button>
			</div>
		</div>
	</div>
{/if}

<div class="fixed top-14 right-3 z-30 flex flex-col items-end gap-2">
	<div
		class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-lg text-xs text-slate-200"
	>
		<span class="font-mono font-bold text-amber-300">{roomCode}</span>
		{#if peerOnlineCount > 0}
			<Wifi class="w-3.5 h-3.5 text-emerald-400" />
		{:else}
			<WifiOff class="w-3.5 h-3.5 text-slate-400" />
		{/if}
		<span>
			{isPlaying
				? t('online.hud.inBattle', { count: members.length })
				: t('online.hud.lobbyStatus')}
		</span>
		<button
			type="button"
			onclick={() => (chatOpen = !chatOpen)}
			class="min-h-[44px] min-w-[44px] p-2 rounded hover:bg-slate-800 text-sky-300 cursor-pointer flex items-center justify-center"
			aria-label={t('online.hud.roomChatLabel')}
		>
			<MessageSquare class="w-4 h-4" />
		</button>
		<button
			type="button"
			onclick={handleLeaveRoom}
			class="min-h-[44px] min-w-[44px] p-2 rounded hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 cursor-pointer flex items-center justify-center"
			aria-label={t('online.hud.leaveRoom')}
		>
			<LogOut class="w-4 h-4" />
		</button>
	</div>

	{#if roomError}
		<div
			role="alert"
			class="px-3 py-2 rounded-lg bg-rose-950/95 border border-rose-500/60 text-xs text-rose-200"
		>
			{roomError}
		</div>
	{/if}

	{#if chatOpen}
		<div
			class="w-72 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl p-3 flex flex-col gap-2"
		>
			<div class="max-h-40 overflow-y-auto space-y-1 text-xs">
				{#if messages.length === 0}
					<div class="text-slate-500 italic">{t('online.hud.noMessages')}</div>
				{:else}
					{#each messages as msg (msg.id)}
						<div class="break-words">
							<span class="font-bold text-amber-300">{msg.senderName}:</span>
							<span class="text-slate-200"> {msg.text}</span>
						</div>
					{/each}
				{/if}
			</div>
			<form onsubmit={sendChat} class="flex gap-1.5">
				<input
					type="text"
					bind:value={chatInput}
					maxlength="200"
					placeholder={t('online.hud.chatPlaceholder')}
					class="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-xs text-white focus:outline-none focus:border-sky-500"
				/>
				<button
					type="submit"
					class="min-h-[36px] px-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold cursor-pointer flex items-center justify-center"
					aria-label={t('online.hud.sendChat')}
				>
					<Send class="w-3.5 h-3.5" />
				</button>
			</form>
		</div>
	{/if}
</div>
