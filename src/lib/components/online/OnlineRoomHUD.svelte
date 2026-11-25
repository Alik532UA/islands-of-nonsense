<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		Copy,
		Check,
		MessageSquare,
		Play,
		LogOut,
		Send,
		Wifi,
		WifiOff,
		Bot,
		UserMinus
	} from 'lucide-svelte';
	import { connect } from '$lib/net/firebase';
	import { liveNet } from '$lib/net/roomNet';
	import { probeNetProblem } from '$lib/utils/netProblem';
	import { removeFromLobby, updateLobbyPlayers } from '$lib/net/lobby';
	import {
		countOpenHumanCapacity,
		getSlotKey,
		getSlotNumber,
		normalizeRoomSlots,
		pickFirstAvailableSeat
	} from '$lib/net/onlineMatchSetup';
	import type {
		Member,
		RoomInfo,
		RoomSlotKey,
		RoomSlotKind,
		RoomSlotSetting,
		RoomTransport
	} from '$lib/net/roomTypes';
	import { ALL_PLAYER_COLORS } from '$lib/engine/types';
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
	let claimingHost = $state(false);
	let chatOpen = $state(false);
	let chatInput = $state('');
	let messages = $state<ChatMessage[]>([]);
	let roomError = $state<string | null>(null);
	let hasSeenSelfMember = $state(false);
	let leavingIntentional = $state(false);

	const identity = new PlayerIdentity();

	let isLobby = $derived(roomInfo?.status === 'lobby');
	let isPlaying = $derived(roomInfo?.status === 'playing');
	let isEffectiveHost = $derived(Boolean(roomInfo ? roomInfo.hostUid === localUid : isHost));
	let hostOnline = $derived(roomInfo ? onlineUids.includes(roomInfo.hostUid) : true);
	let canClaimHost = $derived(
		!isEffectiveHost &&
			Boolean(roomInfo) &&
			!hostOnline &&
			members.some((m) => m.uid === localUid && (isPlaying || m.role === 'player'))
	);
	let peerOnlineCount = $derived(onlineUids.filter((id) => id !== localUid).length);
	let localMember = $derived(members.find((m) => m.uid === localUid) ?? null);
	let roomSlots = $derived(normalizeRoomSlots(roomInfo?.config));
	let slotOccupants = $derived.by(() => {
		const map = new Map<number, Member>();
		const players = members.filter((m) => m.role === 'player').sort((a, b) => a.order - b.order);
		const unassigned: Member[] = [];
		for (const m of players) {
			if (typeof m.slot === 'number' && !map.has(m.slot)) {
				map.set(m.slot, m);
			} else {
				unassigned.push(m);
			}
		}
		for (const m of unassigned) {
			const team: 'west' | 'east' = m.team === 'east' ? 'east' : 'west';
			for (let i = 1; i <= 7; i++) {
				const sn = getSlotNumber(team, i);
				if (!map.has(sn) && roomSlots[getSlotKey(team, i)].kind === 'open') {
					map.set(sn, m);
					break;
				}
			}
		}
		return map;
	});
	let teamActiveCounts = $derived.by(() => {
		let west = 0;
		let east = 0;
		for (const team of ['west', 'east'] as const) {
			for (let i = 1; i <= 7; i++) {
				const sn = getSlotNumber(team, i);
				const cfg = roomSlots[getSlotKey(team, i)];
				if (slotOccupants.has(sn) || cfg.kind === 'bot') {
					if (team === 'west') west++;
					else east++;
				}
			}
		}
		return { west, east };
	});
	let canStartMatch = $derived(teamActiveCounts.west > 0 && teamActiveCounts.east > 0);

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
						avatar: identity.avatar
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
						const amMember = Boolean(uid && snap.members.some((m) => m.uid === uid));
						if (amMember) {
							hasSeenSelfMember = true;
						} else if (hasSeenSelfMember && !leavingIntentional && snap.info.status === 'lobby') {
							roomError = t('online.hud.kickedNotice');
						}
					},
					(why) => {
						stopBeat();
						stopPresence();
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
				const problem = await probeNetProblem(err).catch(() => null);
				roomError =
					problem?.title ?? (err instanceof Error ? err.message : t('online.hud.joinError'));
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

	async function syncLobbyMetadata(nextSlots: Record<RoomSlotKey, RoomSlotSetting>) {
		if (!roomInfo || roomInfo.config?.isPrivate) return;
		const { db } = await connect();
		const playerCount = Math.max(1, members.filter((m) => m.role === 'player').length);
		const maxOpen = countOpenHumanCapacity({ ...roomInfo.config, slots: nextSlots });
		await import('firebase/database')
			.then(({ ref, update }) =>
				update(ref(db, `lobby/castlefight/${roomCode}`), {
					players: Math.min(playerCount, maxOpen),
					maxPlayers: maxOpen
				})
			)
			.catch(() => {});
	}

	async function handleMoveToSlot(team: 'west' | 'east', slotNum: number) {
		if (!isLobby || !localUid) return;
		if (slotOccupants.has(slotNum)) return;
		await liveNet.updateMe(roomCode, { team, slot: slotNum }).catch(() => {});
	}

	async function handleToggleReady() {
		if (!isLobby || !localUid || !localMember) return;
		await liveNet.updateMe(roomCode, { ready: !localMember.ready }).catch(() => {});
	}

	async function handleHostSetSlot(
		key: RoomSlotKey,
		kind: RoomSlotKind,
		botDifficulty = 15,
		race = 'random'
	) {
		if (!isLobby || !isEffectiveHost || !transport?.setConfig || !roomInfo) return;
		const nextSlots: Record<RoomSlotKey, RoomSlotSetting> = {
			...roomSlots,
			[key]: kind === 'bot' ? { kind: 'bot', botDifficulty, race } : { kind }
		};
		const nextWestCount = [1, 2, 3, 4, 5, 6, 7].filter(
			(i) => nextSlots[getSlotKey('west', i)].kind !== 'closed'
		).length;
		const nextEastCount = [1, 2, 3, 4, 5, 6, 7].filter(
			(i) => nextSlots[getSlotKey('east', i)].kind !== 'closed'
		).length;
		await transport
			.setConfig({
				...roomInfo.config,
				teamSizeWest: Math.max(1, nextWestCount),
				teamSizeEast: Math.max(1, nextEastCount),
				teamSize: Math.max(1, nextWestCount, nextEastCount),
				slots: nextSlots
			})
			.catch(() => {});
		void syncLobbyMetadata(nextSlots);
	}

	async function handleHostSetSlotMode(key: RoomSlotKey, modeVal: string) {
		const current = roomSlots[key];
		if (modeVal === 'open') {
			await handleHostSetSlot(key, 'open');
		} else if (modeVal === 'closed') {
			await handleHostSetSlot(key, 'closed');
		} else if (modeVal.startsWith('bot:')) {
			const diff = Number(modeVal.slice(4)) || 0;
			await handleHostSetSlot(key, 'bot', diff, current.race ?? 'random');
		}
	}

	async function handleHostSwapPlayerTeam(target: Member) {
		if (!isLobby || !isEffectiveHost) return;
		const nextTeam: 'west' | 'east' = target.team === 'east' ? 'west' : 'east';
		const seat = pickFirstAvailableSeat(members, nextTeam, roomInfo?.config);
		if (seat.team !== nextTeam) return;
		await liveNet.updateMemberSlot(roomCode, target.uid, seat.team, seat.slot).catch(() => {});
	}

	async function handleHostKickPlayer(targetUid: string) {
		if (!isLobby || !isEffectiveHost || targetUid === localUid) return;
		await liveNet.kickMember(roomCode, targetUid).catch(() => {});
		if (!roomInfo?.config?.isPrivate) {
			const { db } = await connect();
			const remaining = Math.max(1, members.filter((m) => m.uid !== targetUid).length);
			await updateLobbyPlayers(db, roomCode, remaining).catch(() => {});
		}
	}

	async function handleChangeRace(nextRace: string) {
		if (!isLobby || !localUid) return;
		await liveNet.updateMe(roomCode, { race: nextRace }).catch(() => {});
	}

	async function handleToggleFogOfWar(nextFog: boolean) {
		if (!isLobby || !isEffectiveHost || !transport?.setConfig || !roomInfo) return;
		await transport
			.setConfig({
				...roomInfo.config,
				fogOfWar: nextFog
			})
			.catch(() => {});
	}

	async function handleStartMatch() {
		if (!transport || !localUid || starting || !canStartMatch) return;
		starting = true;
		try {
			const roster = [...members]
				.filter((m) => m.role === 'player')
				.sort((a, b) => a.order - b.order)
				.map((m) => ({
					uid: m.uid,
					name: m.name,
					team: m.team ?? 'west',
					...(typeof m.slot === 'number' ? { slot: m.slot } : {}),
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
			await liveNet.sendChatMessage(roomCode, identity.forEntry(settings.locale), text);
		} catch {
			// Ignore transient chat write failure
		}
	}

	async function handleClaimHost() {
		if (!transport?.takeLead || !localUid || !roomInfo || claimingHost) return;
		claimingHost = true;
		try {
			await transport.takeLead({
				seq: maxMoveSeq + 1,
				by: localUid,
				type: 'lead',
				payload: { from: roomInfo.hostUid }
			});
		} catch (err) {
			const problem = await probeNetProblem(err).catch(() => null);
			roomError = problem?.title ?? t('online.hud.joinError');
		} finally {
			claimingHost = false;
		}
	}

	async function handleLeaveRoom() {
		leavingIntentional = true;
		try {
			if (isEffectiveHost) {
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
		class="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="online-lobby-title"
		data-testid="online-waiting-lobby"
	>
		<div
			class="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700 p-4 sm:p-5 shadow-2xl"
		>
			<div class="flex flex-wrap items-center justify-between gap-2 mb-3">
				<div class="flex items-center gap-2.5">
					<h2 id="online-lobby-title" class="text-lg font-extrabold text-amber-300">
						{t('online.hud.roomTitle', { code: roomCode })}
					</h2>
					<span
						class="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-bold"
					>
						{teamActiveCounts.west}v{teamActiveCounts.east}
					</span>
				</div>
				<div class="flex items-center gap-2">
					{#if localMember}
						<button
							type="button"
							data-testid="lobby-ready-btn"
							onclick={handleToggleReady}
							class="min-h-[38px] px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition {localMember.ready
								? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
								: 'bg-slate-800 border-slate-600 text-slate-300 hover:text-white'}"
						>
							{localMember.ready ? t('online.hud.ready') : t('online.hud.notReady')}
						</button>
					{/if}
					<button
						type="button"
						onclick={copyCode}
						class="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
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
			</div>

			{#if roomInfo}
				{@const roomFogEnabled = roomInfo.config?.fogOfWar !== false}
				<div
					class="mb-3 p-2.5 rounded-xl bg-slate-800/70 border border-slate-700 flex flex-wrap items-center justify-between gap-2"
				>
					<span class="text-xs font-semibold text-slate-300">{t('online.mapVisibility')}:</span>
					{#if isEffectiveHost}
						<div class="flex gap-1.5">
							<button
								type="button"
								data-testid="lobby-fog-on-btn"
								onclick={() => handleToggleFogOfWar(true)}
								class="px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer {roomFogEnabled
									? 'bg-amber-500/25 border-amber-400 text-amber-200'
									: 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}"
							>
								{t('online.fogEnabled')}
							</button>
							<button
								type="button"
								data-testid="lobby-fog-off-btn"
								onclick={() => handleToggleFogOfWar(false)}
								class="px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer {!roomFogEnabled
									? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
									: 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}"
							>
								{t('online.fogDisabled')}
							</button>
						</div>
					{:else}
						<span
							data-testid="lobby-fog-status"
							class="px-2.5 py-1 rounded-lg text-xs font-bold border {roomFogEnabled
								? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
								: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'}"
						>
							{roomFogEnabled ? t('online.fogEnabled') : t('online.fogDisabled')}
						</span>
					{/if}
				</div>
			{/if}

			<!-- Warcraft III-style 7v7 Configurable Slot Table -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
				{#each [{ id: 'west' as const, title: t('online.hud.teamWest'), headerCls: 'text-sky-300 border-sky-500/30 bg-sky-950/30' }, { id: 'east' as const, title: t('online.hud.teamEast'), headerCls: 'text-rose-300 border-rose-500/30 bg-rose-950/30' }] as teamCol (teamCol.id)}
					<div class="rounded-xl border border-slate-700/90 bg-slate-950/50 p-2.5 space-y-1.5">
						<div
							class="px-2 py-1 rounded-lg border text-xs font-extrabold uppercase tracking-wider flex items-center justify-between {teamCol.headerCls}"
						>
							<span>{teamCol.title}</span>
							<span class="font-mono">
								{teamCol.id === 'west' ? teamActiveCounts.west : teamActiveCounts.east}/7
							</span>
						</div>
						{#each [1, 2, 3, 4, 5, 6, 7] as idx (idx)}
							{@const slotNum = getSlotNumber(teamCol.id, idx)}
							{@const slotKey = getSlotKey(teamCol.id, idx)}
							{@const slotCfg = roomSlots[slotKey]}
							{@const occupant = slotOccupants.get(slotNum) ?? null}
							{@const colorDef = ALL_PLAYER_COLORS[slotNum - 1] ?? ALL_PLAYER_COLORS[0]}
							{@const slotModeVal =
								slotCfg.kind === 'bot' ? `bot:${slotCfg.botDifficulty ?? 15}` : slotCfg.kind}
							<div
								data-testid="lobby-slot-{slotKey}"
								class="flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg border text-xs {slotCfg.kind ===
									'closed' && !occupant
									? 'bg-slate-900/40 border-slate-800/80 opacity-60'
									: 'bg-slate-800/80 border-slate-700'}"
							>
								<div class="flex items-center gap-2 min-w-0 flex-1">
									<span
										class="w-3 h-3 rounded-sm shrink-0 border border-white/25"
										style="background-color: {colorDef.hex};"
										title={colorDef.nameUk}
									></span>

									{#if occupant}
										<div class="min-w-0 flex-1">
											<div class="flex items-center gap-1.5 truncate">
												<span class="font-bold text-slate-100 truncate">{occupant.name}</span>
												{#if occupant.uid === roomInfo?.hostUid}
													<span class="text-[10px] text-amber-400 font-bold">★</span>
												{/if}
												{#if occupant.ready}
													<span class="text-[10px] text-emerald-400 font-bold">✓</span>
												{/if}
											</div>
											{#if occupant.uid === localUid && !roomInfo?.config?.allRandom}
												<select
													aria-label="Раса"
													value={occupant.race ?? 'random'}
													onchange={(e) =>
														handleChangeRace((e.currentTarget as HTMLSelectElement).value)}
													class="mt-0.5 w-full max-w-[140px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px] text-amber-200"
												>
													<option value="random">{t('online.hud.randomRaceBonus')}</option>
													{#each PLAYABLE_RACES as race (race)}
														<option value={race}>{formatRaceName(race)}</option>
													{/each}
												</select>
											{:else if occupant.race}
												<span class="text-[10px] text-amber-300/90">
													{occupant.race === 'random'
														? t('online.hud.randomRaceBonus')
														: formatRaceName(occupant.race)}
												</span>
											{/if}
										</div>
									{:else if slotCfg.kind === 'bot'}
										<div class="flex items-center gap-1.5 min-w-0 flex-1">
											<Bot class="w-3.5 h-3.5 text-amber-300 shrink-0" />
											{#if isEffectiveHost && !roomInfo?.config?.allRandom}
												<select
													aria-label="Раса бота"
													value={slotCfg.race ?? 'random'}
													onchange={(e) =>
														handleHostSetSlot(
															slotKey,
															'bot',
															slotCfg.botDifficulty ?? 15,
															(e.currentTarget as HTMLSelectElement).value
														)}
													class="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px] text-amber-200 max-w-[115px]"
												>
													<option value="random">{t('online.hud.randomRaceBonus')}</option>
													{#each PLAYABLE_RACES as race (race)}
														<option value={race}>{formatRaceName(race)}</option>
													{/each}
												</select>
											{:else}
												<span class="text-amber-200 font-semibold truncate">
													{t('online.hud.slotBot')} ({slotCfg.botDifficulty ?? 15}%)
												</span>
											{/if}
										</div>
									{:else if slotCfg.kind === 'open'}
										<span class="text-slate-400 italic">{t('online.hud.slotOpen')}</span>
									{:else}
										<span class="text-slate-500">{t('online.hud.slotClosed')}</span>
									{/if}
								</div>

								<div class="flex items-center gap-1 shrink-0">
									{#if occupant}
										{#if isEffectiveHost && occupant.uid !== localUid}
											<button
												type="button"
												onclick={() => handleHostSwapPlayerTeam(occupant)}
												class="px-1.5 py-1 rounded bg-slate-900 hover:bg-slate-700 border border-slate-700 text-[10px] text-sky-300 cursor-pointer"
												title="Змінити команду"
											>
												⇄
											</button>
											<button
												type="button"
												data-testid="lobby-kick-{occupant.uid}"
												onclick={() => handleHostKickPlayer(occupant.uid)}
												class="p-1 rounded bg-slate-900 hover:bg-rose-900/70 border border-slate-700 text-rose-300 cursor-pointer"
												title={t('online.hud.kickPlayer')}
											>
												<UserMinus class="w-3 h-3" />
											</button>
										{/if}
									{:else}
										{#if slotCfg.kind === 'open' && localMember}
											<button
												type="button"
												data-testid="lobby-sit-{slotKey}"
												onclick={() => handleMoveToSlot(teamCol.id, slotNum)}
												class="px-2 py-1 rounded bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/50 text-[11px] font-bold text-sky-200 cursor-pointer"
											>
												{t('online.hud.sitHere')}
											</button>
										{/if}
										{#if isEffectiveHost}
											<select
												aria-label="Стан слота"
												data-testid="lobby-slot-select-{slotKey}"
												value={slotModeVal}
												onchange={(e) =>
													handleHostSetSlotMode(
														slotKey,
														(e.currentTarget as HTMLSelectElement).value
													)}
												class="px-1.5 py-1 rounded bg-slate-900 border border-slate-700 text-[11px] text-slate-200 cursor-pointer"
											>
												<option value="open">{t('online.hud.slotOpen')}</option>
												<option value="closed">{t('online.hud.slotClosed')}</option>
												<option value="bot:0">{t('online.hud.botEasy')}</option>
												<option value="bot:15">{t('online.hud.botMedium')}</option>
												<option value="bot:30">{t('online.hud.botHard')}</option>
												<option value="bot:80">{t('online.hud.botInsane')}</option>
											</select>
										{/if}
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/each}
			</div>

			{#if !canStartMatch && isEffectiveHost}
				<div class="mb-2 text-xs text-amber-300 text-center font-semibold">
					{t('online.hud.needBothTeams')}
				</div>
			{/if}

			{#if canClaimHost}
				<div
					class="mb-2 px-3 py-2 rounded-xl bg-amber-950/80 border border-amber-500/40 text-xs text-amber-200 flex items-center justify-between gap-2"
				>
					<span>{t('online.hud.hostOffline')}</span>
					<button
						type="button"
						disabled={claimingHost}
						onclick={handleClaimHost}
						class="shrink-0 min-h-[36px] px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold cursor-pointer"
					>
						{t('online.hud.claimHost')}
					</button>
				</div>
			{/if}

			<div class="flex gap-2">
				{#if isEffectiveHost}
					<button
						type="button"
						disabled={starting || !canStartMatch}
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
