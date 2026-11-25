<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import { generateQrSvgPath } from '$lib/utils/qrSvg';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Flag from '$lib/components/ui/Flag.svelte';
	import { resolveRoomMemberAvatars } from '$lib/utils/roomAvatars';
	import { QUICK_EMOTES, type ChatKind } from '$lib/net/chat';
	import { chatModeration } from '$lib/services/chatModeration.svelte';
	import DmDrawer from '$lib/components/chat/DmDrawer.svelte';
	import PublicProfileModal from '$lib/components/account/PublicProfileModal.svelte';
	import {
		followUser,
		loadSocialLists,
		sendRoomInvite,
		unfollowUser,
		type SocialUser
	} from '$lib/net/social';
	import { readProfile, type Profile } from '$lib/net/account';
	import { toast } from '$lib/controllers/toast.svelte';
	import { connect } from '$lib/net/firebase';
	import { liveNet } from '$lib/net/roomNet';
	import { probeNetProblem } from '$lib/utils/netProblem';
	import { removeFromLobby, updateLobbyPlayers } from '$lib/net/lobby';
	import { getHumanClaimedColorIds, getMemberContentionInfo } from '$lib/net/colorLottery';
	import {
		countOpenHumanCapacity,
		getSlotKey,
		getSlotNumber,
		normalizeRoomSlots,
		pickFirstAvailableSeat
	} from '$lib/net/onlineMatchSetup';
	import type {
		Member,
		RoomConfig,
		RoomInfo,
		RoomSlotKey,
		RoomSlotKind,
		RoomSlotSetting,
		RoomTransport
	} from '$lib/net/roomTypes';
	import { ALL_PLAYER_COLORS } from '$lib/engine/types';
	import { GAME_MODES } from '$lib/engine/gameModes';
	import { PLAYABLE_RACES, formatRaceName } from '$lib/engine/gameData';
	import { PlayerIdentity } from '$lib/controllers/playerIdentity.svelte';
	import { settings } from '$lib/services/settings.svelte';
	import { t } from '$lib/i18n';
	import OnlineConfigModal from './OnlineConfigModal.svelte';

	interface Props {
		roomCode: string;
		isHost: boolean;
	}

	interface ChatMessage {
		id: string;
		senderUid: string;
		senderName: string;
		senderAvatar?: string;
		kind?: ChatKind;
		emote?: string;
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
	let seenChatCount = $state(0);
	let floatingEmote = $state<{ senderName: string; emote: string } | null>(null);
	let dmPeer = $state<{ uid: string; name: string; avatar?: string } | null>(null);
	let inspectMemberUid = $state<string | null>(null);
	let inviteOpen = $state(false);
	let shareOpen = $state(false);
	let shareUrl = $derived(
		typeof window !== 'undefined'
			? `${window.location.origin}${resolve('/online')}?room=${roomCode}`
			: `?room=${roomCode}`
	);
	let shareQr = $derived(shareOpen ? generateQrSvgPath(shareUrl) : null);
	let myFriends = $state<SocialUser[]>([]);
	let myProfile = $state<Profile | null>(null);
	let emoteTimer: ReturnType<typeof setTimeout> | null = null;
	let roomError = $state<string | null>(null);
	let hasSeenSelfMember = $state(false);
	let leavingIntentional = $state(false);
	let isConfigModalOpen = $state(false);
	let paletteTarget = $state<{
		slotKey: RoomSlotKey;
		isBot: boolean;
		currentColorId?: number;
	} | null>(null);

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
	let activeSlotCount = $derived(teamActiveCounts.west + teamActiveCounts.east);
	let bannedRacesList = $derived(
		Array.isArray(roomInfo?.config?.bannedRaces) ? roomInfo.config.bannedRaces : []
	);
	let availablePlayableRaces = $derived(
		PLAYABLE_RACES.filter(
			(r) => !bannedRacesList.includes(r) && !bannedRacesList.includes(formatRaceName(r))
		)
	);
	let humanClaimedColorIds = $derived(getHumanClaimedColorIds(members));
	let resolvedAvatars = $derived(resolveRoomMemberAvatars(members));
	let visibleMessages = $derived(messages.filter((m) => !chatModeration.isMuted(m.senderUid)));
	let unreadChatCount = $derived(
		chatOpen ? 0 : Math.max(0, visibleMessages.length - seenChatCount)
	);

	$effect(() => {
		if (chatOpen) {
			seenChatCount = visibleMessages.length;
		}
	});

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
				const { auth, db, uid } = await connect();
				if (!active) return;
				localUid = uid;
				if (!auth.currentUser?.isAnonymous) {
					void readProfile().then((p) => {
						myProfile = p;
					});
					void loadSocialLists().then((lists) => {
						myFriends = lists.following;
					});
				}

				const currentInfo = await liveNet.peekRoom(roomCode);
				if (!currentInfo) {
					roomError = t('online.hud.roomUnavailable', { code: roomCode });
					return;
				}

				const currentMembers = (await liveNet.peekMembers(roomCode)) ?? [];
				if (!currentMembers.some((m) => m.uid === uid)) {
					const joinName = identity.forEntry(settings.locale);
					await liveNet.joinRoom(roomCode, {
						name: joinName,
						role: currentInfo.status === 'playing' ? 'spectator' : 'player',
						country: identity.country,
						avatar: identity.avatar
					});
					void liveNet
						.sendChatMessage(roomCode, joinName, t('chat.systemJoined', { name: joinName }), {
							avatar: identity.avatar,
							kind: 'system'
						})
						.catch(() => {});
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
				let initialChatLoaded = false;
				stopChat = onChildAdded(chatQuery, (snap) => {
					const id = snap.key;
					const val = snap.val() as Omit<ChatMessage, 'id'> | null;
					if (!id || !val || seenMessageIds.has(id)) return;
					seenMessageIds.add(id);
					messages = [...messages, { id, ...val }]
						.sort((a, b) => (a.at ?? 0) - (b.at ?? 0))
						.slice(-30);
					if (chatOpen) {
						seenChatCount = messages.filter((m) => !chatModeration.isMuted(m.senderUid)).length;
					}
					if (initialChatLoaded && val.kind === 'emote' && !chatModeration.isMuted(val.senderUid)) {
						floatingEmote = {
							senderName: val.senderName,
							emote: val.emote ?? val.text
						};
						if (emoteTimer) clearTimeout(emoteTimer);
						emoteTimer = setTimeout(() => {
							floatingEmote = null;
						}, 2600);
					}
				});
				setTimeout(() => {
					initialChatLoaded = true;
				}, 600);
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

	async function handleSaveRoomConfig(patch: Partial<RoomConfig>) {
		if (!isLobby || !isEffectiveHost || !transport?.setConfig || !roomInfo) return;
		const nextBans = Array.isArray(patch.bannedRaces) ? patch.bannedRaces : bannedRacesList;
		const nextSlots = { ...roomSlots };
		for (const key of Object.keys(nextSlots) as RoomSlotKey[]) {
			const s = nextSlots[key];
			if (
				s.kind === 'bot' &&
				s.race &&
				s.race !== 'random' &&
				(nextBans.includes(s.race) || nextBans.includes(formatRaceName(s.race)))
			) {
				nextSlots[key] = { ...s, race: 'random' };
			}
		}
		if (
			localMember?.race &&
			localMember.race !== 'in_game' &&
			localMember.race !== 'random' &&
			(nextBans.includes(localMember.race) || nextBans.includes(formatRaceName(localMember.race)))
		) {
			await liveNet.updateMe(roomCode, { race: 'in_game' }).catch(() => {});
		}
		const nextConfig: RoomConfig = {
			...roomInfo.config,
			...patch,
			slots: nextSlots
		};
		await transport.setConfig(nextConfig).catch(() => {});
		if (!nextConfig.isPrivate && typeof patch.modeId === 'string') {
			const { db } = await connect();
			await import('firebase/database')
				.then(({ ref, update }) =>
					update(ref(db, `lobby/castlefight/${roomCode}`), { modeId: patch.modeId })
				)
				.catch(() => {});
		}
	}

	async function handlePickPaletteColor(colorId: number | null) {
		if (!isLobby || !paletteTarget) return;
		const target = paletteTarget;
		paletteTarget = null;
		if (target.isBot) {
			if (colorId !== null && humanClaimedColorIds.has(colorId)) return;
			await liveNet.setBotSlotColor(roomCode, target.slotKey, colorId).catch(() => {});
			return;
		}
		const conflictingBotKeys: RoomSlotKey[] = [];
		if (colorId !== null) {
			for (const [k, s] of Object.entries(roomSlots) as Array<[RoomSlotKey, RoomSlotSetting]>) {
				if (s.kind === 'bot' && s.colorId === colorId) {
					conflictingBotKeys.push(k);
				}
			}
		}
		await liveNet.pickHumanColor(roomCode, colorId, conflictingBotKeys).catch(() => {});
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
					race: m.race || 'in_game',
					...(typeof m.colorId === 'number' ? { colorId: m.colorId } : {})
				}));
			const hasInGamePicks =
				!roomInfo?.config?.allRandom && roster.some((r) => !r.race || r.race === 'in_game');
			await transport.setStatus('playing', roster);
			if (!hasInGamePicks) {
				await transport.append({
					seq: maxMoveSeq + 1,
					by: localUid,
					type: 'RESUME',
					payload: { tick: 0, team: localMember?.team ?? (isHost ? 'west' : 'east') }
				});
			}
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
		try {
			const ok = await liveNet.sendChatMessage(
				roomCode,
				identity.forEntry(settings.locale),
				text,
				{
					avatar: identity.avatar,
					kind: 'text'
				}
			);
			if (ok) {
				chatInput = '';
			} else {
				toast.info(t('chat.cooldown'));
			}
		} catch {
			// Ignore transient chat write failure
		}
	}

	async function sendRoomEmote(emote: string) {
		if (!localUid) return;
		try {
			const ok = await liveNet.sendChatMessage(
				roomCode,
				identity.forEntry(settings.locale),
				emote,
				{
					avatar: identity.avatar,
					kind: 'emote',
					emote
				}
			);
			if (!ok) {
				toast.info(t('chat.cooldown'));
			}
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
		class="fixed inset-0 z-40 flex items-center justify-center bg-[#05070c]/85 backdrop-blur-md p-2 sm:p-4 select-none"
		role="dialog"
		aria-modal="true"
		aria-labelledby="online-lobby-title"
		data-testid="online-waiting-lobby"
	>
		<div
			class="w-full max-w-4xl max-h-[94vh] overflow-y-auto rounded-[16px] bg-gradient-to-b from-[#171d2b] via-[#111622] to-[#0a0d14] border-2 border-[#8c7456] p-4 sm:p-5 text-slate-100"
			style="box-shadow: 0 24px 70px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,220,150,0.18), inset 0 0 26px rgba(140,116,86,0.12);"
		>
			<!-- Top Tactical Lobby Header -->
			<div
				class="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-[#3b3226]"
			>
				<div class="flex flex-wrap items-center gap-2.5">
					<div
						class="w-9 h-9 rounded-[8px] bg-amber-500/15 border border-[#8c7456]/70 flex items-center justify-center text-amber-300 shadow-inner"
					>
						<UiIcon name="swords" class="w-4 h-4" />
					</div>
					<div>
						<div class="flex items-center gap-2">
							<h2
								id="online-lobby-title"
								class="text-base sm:text-lg font-black uppercase tracking-wide text-amber-300"
							>
								{t('online.hud.roomTitle', { code: roomCode })}
							</h2>
							<button
								type="button"
								onclick={copyCode}
								title={t('online.hud.copyCode')}
								class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[6px] bg-[#090c14] hover:bg-[#131926] border border-[#8c7456]/60 hover:border-amber-400 text-[11px] font-mono font-bold transition cursor-pointer {copied
									? 'text-emerald-300 border-emerald-400/70'
									: 'text-amber-200'}"
							>
								<span>{roomCode}</span>
								{#if copied}
									<UiIcon name="check" class="w-3 h-3 text-emerald-400" />
								{:else}
									<UiIcon name="copy" class="w-3 h-3 text-sky-400" />
								{/if}
							</button>
						</div>
						<div class="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
							<span class="inline-flex items-center gap-1 font-semibold text-sky-300">
								<span class="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
								{t('online.hud.teamWest')}
								{teamActiveCounts.west}
							</span>
							<span class="text-slate-600 font-bold">vs</span>
							<span class="inline-flex items-center gap-1 font-semibold text-rose-300">
								<span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
								{t('online.hud.teamEast')}
								{teamActiveCounts.east}
							</span>
							{#if roomInfo?.config?.isPrivate}
								<span
									class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-slate-800/80 border border-slate-700 text-[10px] text-slate-300"
								>
									<UiIcon name="lock" class="w-2.5 h-2.5 text-amber-300" />
									{t('online.private')}
								</span>
							{/if}
						</div>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={() => (shareOpen = !shareOpen)}
						data-testid="room-share-btn"
						class="min-h-[38px] px-2.5 py-1.5 rounded-[8px] border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition {shareOpen
							? 'bg-amber-500/20 border-amber-400/70 text-amber-200'
							: 'bg-[#161d2b] hover:bg-[#1e273a] border-[#3b3226] text-slate-300 hover:text-white'}"
						title={t('online.hud.shareBtn')}
					>
						<UiIcon name="share2" class="w-4 h-4 text-amber-300" />
						<span class="hidden sm:inline">{t('online.hud.shareBtn')}</span>
					</button>
					{#if myFriends.length > 0}
						<div class="relative">
							<button
								type="button"
								onclick={() => (inviteOpen = !inviteOpen)}
								class="min-h-[38px] px-2.5 py-1.5 rounded-[8px] border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition {inviteOpen
									? 'bg-emerald-500/20 border-emerald-400/70 text-emerald-200'
									: 'bg-[#161d2b] hover:bg-[#1e273a] border-[#3b3226] text-slate-300 hover:text-white'}"
								title={t('social.inviteFriend')}
							>
								<UiIcon name="userPlus" class="w-4 h-4 text-emerald-400" />
								<span class="hidden sm:inline">{t('social.invite')}</span>
							</button>
							{#if inviteOpen}
								<div
									class="absolute right-0 mt-1.5 w-56 rounded-xl bg-[#0b0f18] border border-emerald-500/40 shadow-2xl p-2 space-y-1 z-50"
								>
									{#each myFriends.slice(0, 8) as friend (friend.uid)}
										<button
											type="button"
											onclick={async () => {
												const ok = await sendRoomInvite(
													friend.uid,
													roomCode,
													identity.value || myProfile?.name || 'Гравець',
													identity.avatar
												);
												if (ok) toast.success(t('social.invitedToast', { name: friend.name }));
												inviteOpen = false;
											}}
											class="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800 text-left text-xs text-slate-200 cursor-pointer"
										>
											<Avatar avatar={friend.avatar ?? 'castle:amber'} size={20} showDefault />
											<span class="truncate flex-1">{friend.name}</span>
											<span class="text-[10px] text-emerald-400 font-bold">+</span>
										</button>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
					<button
						type="button"
						onclick={() => (chatOpen = !chatOpen)}
						class="relative min-h-[38px] px-2.5 py-1.5 rounded-[8px] border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition {chatOpen
							? 'bg-sky-500/20 border-sky-400/70 text-sky-200'
							: 'bg-[#161d2b] hover:bg-[#1e273a] border-[#3b3226] text-slate-300 hover:text-white'}"
						aria-label={t('online.hud.roomChatLabel')}
					>
						<UiIcon name="messageSquare" class="w-4 h-4 text-sky-400" />
						<span class="hidden sm:inline">Чат</span>
						{#if unreadChatCount > 0}
							<span
								class="px-1.5 py-0.5 rounded-[4px] bg-amber-500 text-slate-950 text-[10px] font-black leading-none"
							>
								{unreadChatCount}
							</span>
						{:else if visibleMessages.length > 0}
							<span
								class="px-1.5 py-0.5 rounded-[4px] bg-sky-500/25 text-sky-200 text-[10px] font-mono leading-none"
							>
								{visibleMessages.length}
							</span>
						{/if}
					</button>

					{#if localMember}
						<button
							type="button"
							data-testid="lobby-ready-btn"
							onclick={handleToggleReady}
							class="min-h-[38px] px-3.5 py-1.5 rounded-[8px] border text-xs font-extrabold uppercase tracking-wide cursor-pointer transition flex items-center gap-1.5 {localMember.ready
								? 'bg-emerald-600/25 border-emerald-400 text-emerald-200 shadow-[0_0_14px_rgba(16,185,129,0.28)]'
								: 'bg-[#161d2b] hover:bg-[#1e273a] border-[#3b3226] hover:border-amber-500/60 text-slate-200'}"
						>
							{#if localMember.ready}
								<UiIcon name="check" class="w-3.5 h-3.5 text-emerald-300" />
							{:else}
								<span class="w-2 h-2 rounded-full bg-slate-500"></span>
							{/if}
							<span>{localMember.ready ? t('online.hud.ready') : t('online.hud.notReady')}</span>
						</button>
					{/if}
				</div>
			</div>

			<!-- Inline Collapsible Lobby Chat Drawer -->
			{#if chatOpen}
				<div
					class="mb-3 rounded-[10px] bg-[#0b0f18] border border-sky-500/40 p-2.5 space-y-2 shadow-inner"
				>
					<div class="max-h-32 overflow-y-auto space-y-1 text-xs pr-1">
						{#if visibleMessages.length === 0}
							<div class="text-slate-500 italic">{t('online.hud.noMessages')}</div>
						{:else}
							{#each visibleMessages as msg (msg.id)}
								{#if msg.kind === 'system'}
									<div class="text-[11px] italic text-sky-300/90 py-0.5">{msg.text}</div>
								{:else}
									<div class="flex items-start justify-between gap-1.5 break-words group">
										<div class="min-w-0">
											<span class="font-bold text-amber-300">{msg.senderName}:</span>
											{#if msg.kind === 'emote'}
												<span class="text-sm ml-1">{msg.emote ?? msg.text}</span>
											{:else}
												<span class="text-slate-200">
													{chatModeration.sanitizeText(msg.text)}
												</span>
											{/if}
										</div>
										{#if localUid && msg.senderUid !== localUid}
											<div
												class="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0"
											>
												<button
													type="button"
													onclick={() =>
														(dmPeer = {
															uid: msg.senderUid,
															name: msg.senderName,
															avatar: msg.senderAvatar
														})}
													class="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-300 cursor-pointer"
													title={t('chat.openDm')}
													aria-label={t('chat.openDm')}
												>
													<UiIcon name="messageSquare" class="w-3 h-3" />
												</button>
												<button
													type="button"
													onclick={() => chatModeration.toggleMute(msg.senderUid)}
													class="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-300 cursor-pointer"
													title={t('chat.muteUser')}
													aria-label={t('chat.muteUser')}
												>
													<UiIcon name="volumeX" class="w-3 h-3" />
												</button>
											</div>
										{/if}
									</div>
								{/if}
							{/each}
						{/if}
					</div>
					<div class="flex flex-wrap gap-1">
						{#each QUICK_EMOTES as em (em)}
							<button
								type="button"
								onclick={() => void sendRoomEmote(em)}
								class="px-1.5 py-0.5 rounded bg-[#141a26] hover:bg-slate-800 border border-slate-700 text-[11px] cursor-pointer"
							>
								{em}
							</button>
						{/each}
					</div>
					<form onsubmit={sendChat} class="flex gap-1.5">
						<input
							type="text"
							bind:value={chatInput}
							maxlength="200"
							placeholder={t('online.hud.chatPlaceholder')}
							class="flex-1 px-2.5 py-1.5 rounded-[6px] bg-[#141a26] border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
						/>
						<button
							type="submit"
							class="min-h-[34px] px-3 rounded-[6px] bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold cursor-pointer flex items-center justify-center"
							aria-label={t('online.hud.sendChat')}
						>
							<UiIcon name="send" class="w-3.5 h-3.5" />
						</button>
					</form>
				</div>
			{/if}

			<!-- Tactical Match Rules Command Strip -->
			{#if roomInfo}
				{@const roomFogEnabled = roomInfo.config?.fogOfWar !== false}
				{@const roomGold =
					typeof roomInfo.config?.startGold === 'number' ? roomInfo.config.startGold : 500}
				{@const roomModeName =
					GAME_MODES[roomInfo.config?.modeId]?.nameUk || roomInfo.config?.modeId}
				{@const coinModeVal = roomInfo.config?.coinMode ?? 'normal'}
				<div
					class="mb-3.5 p-2 rounded-[10px] bg-[#0b0f18]/90 border border-[#3b3226] flex flex-wrap items-center justify-between gap-2"
				>
					<div class="flex flex-wrap items-center gap-1.5 text-[11px]">
						<span
							class="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] bg-[#161c2a] border border-amber-500/35 text-amber-200 font-bold"
						>
							<UiIcon name="swords" class="w-3 h-3 text-amber-400" />
							{roomModeName}
						</span>
						<span
							class="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] bg-[#161c2a] border border-emerald-500/30 text-emerald-300 font-semibold"
						>
							<UiIcon name="trophy" class="w-3 h-3 text-emerald-400" />
							До {roomInfo.config?.targetWins ?? 2}
						</span>
						<span
							class="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] bg-[#161c2a] border border-slate-700 text-amber-200 font-mono font-semibold"
						>
							<UiIcon name="coins" class="w-3 h-3 text-amber-400" />
							{roomGold >= 90000 ? '∞ Золото' : `${roomGold}g`}
						</span>
						<span
							data-testid="lobby-fog-status"
							class="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] border font-semibold {roomFogEnabled
								? 'bg-amber-500/12 border-amber-500/40 text-amber-200'
								: 'bg-emerald-500/12 border-emerald-500/40 text-emerald-200'}"
						>
							<UiIcon name="eye" class="w-3 h-3" />
							{roomFogEnabled ? t('online.fogEnabled') : t('online.fogDisabled')}
						</span>
						{#if coinModeVal === 'none' || roomInfo.config?.coinCount === 0}
							<span
								class="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] bg-[#161c2a] border border-slate-700 text-slate-400"
							>
								Монети: Вимк.
							</span>
						{:else if coinModeVal === 'crazy'}
							<span
								class="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] bg-purple-950/50 border border-purple-500/40 text-purple-200 font-semibold"
							>
								Монети: Божевільні
							</span>
						{/if}
						{#if bannedRacesList.length > 0}
							<span
								class="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] bg-rose-950/60 border border-rose-500/45 text-rose-300 font-bold"
							>
								<UiIcon name="ban" class="w-3 h-3" />
								Бан: {bannedRacesList.length}
							</span>
						{/if}
					</div>
					<button
						type="button"
						onclick={() => (isConfigModalOpen = true)}
						data-testid="online-room-settings-btn"
						class="min-h-[34px] px-3 py-1 rounded-[8px] bg-gradient-to-b from-amber-500/25 to-amber-600/15 hover:from-amber-500/35 hover:to-amber-600/25 border border-[#8c7456] hover:border-amber-400 text-xs font-bold text-amber-200 flex items-center gap-1.5 cursor-pointer transition shadow-sm"
					>
						<UiIcon name="sliders" class="w-3.5 h-3.5 text-amber-300" />
						<span>{t('online.hud.settingsBtn')}</span>
					</button>
				</div>
			{/if}

			<!-- Warcraft III-style 7v7 Tactical Roster Grid -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-4">
				{#each [{ id: 'west' as const, title: t('online.hud.teamWest'), panelCls: 'border-sky-500/30 bg-[#0b101b]/95', headerCls: 'text-sky-200 border-sky-500/40 bg-gradient-to-r from-sky-950/85 via-sky-900/35 to-[#121826]', badgeCls: 'bg-sky-500/20 text-sky-200 border-sky-400/40' }, { id: 'east' as const, title: t('online.hud.teamEast'), panelCls: 'border-rose-500/30 bg-[#120c13]/95', headerCls: 'text-rose-200 border-rose-500/40 bg-gradient-to-r from-rose-950/85 via-rose-900/35 to-[#18121b]', badgeCls: 'bg-rose-500/20 text-rose-200 border-rose-400/40' }] as teamCol (teamCol.id)}
					<div class="rounded-[12px] border {teamCol.panelCls} p-2.5 space-y-1.5 shadow-inner">
						<div
							class="px-3 py-2 rounded-[8px] border text-xs font-black uppercase tracking-wider flex items-center justify-between {teamCol.headerCls}"
						>
							<span class="flex items-center gap-2">
								{#if teamCol.id === 'west'}
									<UiIcon name="shield" class="w-3.5 h-3.5 text-sky-400" />
								{:else}
									<UiIcon name="flame" class="w-3.5 h-3.5 text-rose-400" />
								{/if}
								<span>{teamCol.title}</span>
							</span>
							<span
								class="px-2 py-0.5 rounded-[5px] border font-mono text-[11px] font-bold {teamCol.badgeCls}"
							>
								{teamCol.id === 'west' ? teamActiveCounts.west : teamActiveCounts.east}/7
							</span>
						</div>

						{#each [1, 2, 3, 4, 5, 6, 7] as idx (idx)}
							{@const slotNum = getSlotNumber(teamCol.id, idx)}
							{@const slotKey = getSlotKey(teamCol.id, idx)}
							{@const slotCfg = roomSlots[slotKey]}
							{@const occupant = slotOccupants.get(slotNum) ?? null}
							{@const isSelf = Boolean(occupant && occupant.uid === localUid)}
							{@const humanColorDef =
								occupant && typeof occupant.colorId === 'number'
									? ALL_PLAYER_COLORS.find((c) => c.id === occupant.colorId)
									: undefined}
							{@const humanContention = occupant
								? getMemberContentionInfo(members, occupant.uid, occupant.colorId)
								: null}
							{@const botExplicitColorDef =
								!occupant && slotCfg.kind === 'bot' && typeof slotCfg.colorId === 'number'
									? !humanClaimedColorIds.has(slotCfg.colorId)
										? ALL_PLAYER_COLORS.find((c) => c.id === slotCfg.colorId)
										: undefined
									: undefined}
							{@const slotModeVal =
								slotCfg.kind === 'bot' ? `bot:${slotCfg.botDifficulty ?? 15}` : slotCfg.kind}
							<div
								data-testid="lobby-slot-{slotKey}"
								class="relative flex items-center justify-between gap-2 px-2.5 py-2 rounded-[8px] border text-xs transition {occupant
									? isSelf
										? 'bg-gradient-to-r from-[#1b2438] to-[#131a29] border-amber-400/55 shadow-[0_0_16px_rgba(245,158,11,0.1)]'
										: 'bg-[#151c2c] border-slate-600/70'
									: slotCfg.kind === 'bot'
										? 'bg-[#151a26] border-amber-500/35'
										: slotCfg.kind === 'open'
											? 'bg-[#0e1420]/90 border-dashed border-slate-700/80 hover:border-sky-500/45'
											: 'bg-[#090c14]/75 border-slate-800/70 opacity-55'}"
							>
								<!-- Slot Color / Index Indicator Strip -->
								{#if occupant || slotCfg.kind === 'bot'}
									<span
										class="w-1 self-stretch rounded-full shrink-0"
										style="background-color: {occupant
											? (humanColorDef?.hex ?? (teamCol.id === 'west' ? '#38bdf8' : '#fb7185'))
											: (botExplicitColorDef?.hex ?? '#f59e0b')};"
									></span>
								{/if}

								<div class="flex items-center gap-2 min-w-0 flex-1">
									{#if occupant}
										{@const canPickMyColor = occupant.uid === localUid}
										<button
											type="button"
											disabled={!canPickMyColor}
											onclick={() => {
												if (canPickMyColor) {
													paletteTarget = {
														slotKey,
														isBot: false,
														currentColorId: occupant.colorId
													};
												}
											}}
											data-testid="lobby-color-btn-{slotKey}"
											title={humanColorDef
												? `${humanColorDef.nameUk}${
														humanContention && humanContention.totalClaimants > 1
															? ` (${humanContention.probabilityPct}%)`
															: ''
													}`
												: t('online.hud.randomColor')}
											class="h-7 px-1.5 rounded-[6px] border flex items-center gap-1 shrink-0 transition {canPickMyColor
												? 'border-[#8c7456]/70 hover:border-amber-300 cursor-pointer bg-[#0a0e17]'
												: 'border-slate-700 cursor-default bg-[#0a0e17]/70'}"
										>
											{#if humanColorDef}
												<span
													class="w-3.5 h-3.5 rounded-[4px] border border-white/40 shrink-0 shadow-sm"
													style="background-color: {humanColorDef.hex};"
												></span>
												{#if humanContention && humanContention.totalClaimants > 1}
													<span class="text-[10px] font-mono font-bold text-amber-300">
														{humanContention.probabilityPct}%
													</span>
												{/if}
											{:else}
												<UiIcon name="palette" class="w-3.5 h-3.5 text-amber-300" />
											{/if}
										</button>

										<Avatar
											avatar={resolvedAvatars.get(occupant.uid) ?? occupant.avatar}
											size={26}
											showDefault
										/>

										<div class="flex items-center gap-1.5 min-w-0 flex-1">
											<button
												type="button"
												onclick={() => {
													if (occupant.uid !== localUid) inspectMemberUid = occupant.uid;
												}}
												class="font-bold text-slate-100 truncate text-left {occupant.uid !==
												localUid
													? 'hover:text-amber-300 cursor-pointer'
													: 'cursor-default'}"
											>
												{occupant.name}
											</button>
											{#if occupant.uid === roomInfo?.hostUid}
												<span title="Господар кімнати" class="shrink-0 text-amber-400">
													<UiIcon name="crown" class="w-3.5 h-3.5" />
												</span>
											{/if}
											{#if occupant.country}
												<Flag code={occupant.country} showCode />
											{/if}
											{#if occupant.ready}
												<span
													class="text-[9px] px-1.5 py-0.5 rounded-[4px] bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-bold shrink-0"
												>
													✓
												</span>
											{/if}
										</div>
									{:else if slotCfg.kind === 'bot'}
										{@const canPickBotColor = Boolean(localMember && localMember.role === 'player')}
										<button
											type="button"
											disabled={!canPickBotColor}
											onclick={() => {
												if (canPickBotColor) {
													paletteTarget = {
														slotKey,
														isBot: true,
														currentColorId: botExplicitColorDef?.id
													};
												}
											}}
											data-testid="lobby-color-btn-{slotKey}"
											title={botExplicitColorDef
												? botExplicitColorDef.nameUk
												: t('online.hud.randomColor')}
											class="h-7 px-1.5 rounded-[6px] border flex items-center justify-center shrink-0 transition {canPickBotColor
												? 'border-[#8c7456]/60 hover:border-amber-300 cursor-pointer bg-[#0a0e17]'
												: 'border-slate-700 cursor-default bg-[#0a0e17]/70'}"
										>
											{#if botExplicitColorDef}
												<span
													class="w-3.5 h-3.5 rounded-[4px] border border-white/40"
													style="background-color: {botExplicitColorDef.hex};"
												></span>
											{:else}
												<UiIcon name="palette" class="w-3.5 h-3.5 text-slate-300" />
											{/if}
										</button>
										<div class="flex items-center gap-1.5 min-w-0 flex-1">
											<span
												class="w-6 h-6 rounded-[6px] bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0"
											>
												<UiIcon name="bot" class="w-3.5 h-3.5 text-amber-300" />
											</span>
											<span class="text-amber-200 font-semibold truncate">
												{isEffectiveHost
													? t('online.hud.slotBot')
													: `${t('online.hud.slotBot')} (${slotCfg.botDifficulty ?? 15}%)`}
											</span>
										</div>
									{:else if slotCfg.kind === 'open'}
										<span
											class="w-6 h-6 rounded-[6px] bg-[#090c14] border border-slate-700/80 text-[10px] font-mono font-bold text-slate-500 flex items-center justify-center shrink-0"
										>
											{idx}
										</span>
										<span class="text-slate-400 font-medium truncate">
											{isEffectiveHost ? 'Вільне місце' : t('online.hud.slotOpen')}
										</span>
									{:else}
										<span
											class="w-6 h-6 rounded-[6px] bg-[#070a10] border border-slate-800 text-slate-600 flex items-center justify-center shrink-0"
										>
											<UiIcon name="lock" class="w-3 h-3" />
										</span>
										<span class="text-slate-500 font-medium truncate">
											{isEffectiveHost ? `Слот #${idx}` : t('online.hud.slotClosed')}
										</span>
									{/if}
								</div>

								<div class="flex items-center gap-1.5 shrink-0">
									{#if occupant}
										{#if occupant.uid === localUid && !roomInfo?.config?.allRandom}
											<select
												aria-label="Раса"
												data-testid="lobby-race-select-{slotKey}"
												value={occupant.race ?? 'in_game'}
												onchange={(e) =>
													handleChangeRace((e.currentTarget as HTMLSelectElement).value)}
												class="px-2 py-1 rounded-[6px] bg-[#0b0f18] border border-[#8c7456]/60 hover:border-amber-400 text-[11px] font-semibold text-amber-200 max-w-[145px] cursor-pointer focus:outline-none focus:border-amber-400"
											>
												<option value="in_game">{t('online.hud.raceInGame')}</option>
												<option value="random">{t('online.hud.randomRaceBonus')}</option>
												{#each availablePlayableRaces as race (race)}
													<option value={race}>{formatRaceName(race)}</option>
												{/each}
											</select>
										{:else if !roomInfo?.config?.allRandom}
											{@const occRace = occupant.race ?? 'in_game'}
											<span
												class="px-2 py-1 rounded-[6px] bg-[#0b0f18]/80 border border-slate-700/80 text-[11px] text-amber-300/95 font-medium"
											>
												{occRace === 'in_game'
													? t('online.hud.raceInGame')
													: occRace === 'random'
														? t('online.hud.randomRaceBonus')
														: formatRaceName(occRace)}
											</span>
										{/if}
										{#if isEffectiveHost && occupant.uid !== localUid}
											<button
												type="button"
												onclick={() => handleHostSwapPlayerTeam(occupant)}
												class="p-1.5 rounded-[6px] bg-[#0b0f18] hover:bg-slate-800 border border-slate-700 hover:border-sky-400/60 text-sky-300 cursor-pointer transition"
												title="Змінити команду"
											>
												<UiIcon name="swap" class="w-3.5 h-3.5" />
											</button>
											<button
												type="button"
												data-testid="lobby-kick-{occupant.uid}"
												onclick={() => handleHostKickPlayer(occupant.uid)}
												class="p-1.5 rounded-[6px] bg-[#0b0f18] hover:bg-rose-950 border border-slate-700 hover:border-rose-500/60 text-rose-300 cursor-pointer transition"
												title={t('online.hud.kickPlayer')}
											>
												<UiIcon name="userMinus" class="w-3.5 h-3.5" />
											</button>
										{/if}
									{:else}
										{#if slotCfg.kind === 'bot' && isEffectiveHost && !roomInfo?.config?.allRandom}
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
												class="px-2 py-1 rounded-[6px] bg-[#0b0f18] border border-slate-700 hover:border-amber-400/70 text-[11px] font-semibold text-amber-200 max-w-[115px] cursor-pointer"
											>
												<option value="random">{t('online.hud.randomRaceBonus')}</option>
												{#each availablePlayableRaces as race (race)}
													<option value={race}>{formatRaceName(race)}</option>
												{/each}
											</select>
										{/if}
										{#if slotCfg.kind === 'open' && localMember}
											<button
												type="button"
												data-testid="lobby-sit-{slotKey}"
												onclick={() => handleMoveToSlot(teamCol.id, slotNum)}
												class="px-2.5 py-1 rounded-[6px] bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/60 text-[11px] font-bold text-sky-200 cursor-pointer transition"
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
												class="px-2 py-1 rounded-[6px] bg-[#0b0f18] border border-slate-700 hover:border-[#8c7456] text-[11px] font-semibold text-slate-200 cursor-pointer focus:outline-none focus:border-amber-400"
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
				<div
					class="mb-3 px-3 py-2 rounded-[8px] bg-amber-950/45 border border-amber-500/45 text-xs text-amber-200 flex items-center justify-center gap-2 font-semibold"
				>
					<UiIcon name="alertTriangle" class="w-4 h-4 text-amber-400 shrink-0" />
					<span>{t('online.hud.needBothTeams')}</span>
				</div>
			{/if}

			{#if canClaimHost}
				<div
					class="mb-3 px-3 py-2 rounded-[8px] bg-amber-950/80 border border-amber-500/50 text-xs text-amber-200 flex items-center justify-between gap-2"
				>
					<span>{t('online.hud.hostOffline')}</span>
					<button
						type="button"
						disabled={claimingHost}
						onclick={handleClaimHost}
						class="shrink-0 min-h-[34px] px-3 py-1 rounded-[6px] bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold cursor-pointer"
					>
						{t('online.hud.claimHost')}
					</button>
				</div>
			{/if}

			<!-- Footer Actions -->
			<div class="flex gap-2.5 pt-1">
				{#if isEffectiveHost}
					<button
						type="button"
						disabled={starting || !canStartMatch}
						onclick={handleStartMatch}
						class="flex-1 min-h-[46px] py-2.5 px-5 rounded-[10px] font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition {canStartMatch &&
						!starting
							? 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:via-amber-400 hover:to-amber-500 border-2 border-amber-200/80 text-slate-950 cursor-pointer shadow-[0_0_24px_rgba(245,158,11,0.35)] active:scale-[0.99]'
							: 'bg-slate-800/80 border border-slate-700 text-slate-500 cursor-not-allowed'}"
						data-testid="online-start-battle-btn"
					>
						<UiIcon name="play" class="w-4 h-4 fill-current" />
						<span>{t('online.hud.startBattle')}</span>
					</button>
				{:else}
					<div
						class="flex-1 min-h-[46px] py-2.5 px-4 rounded-[10px] bg-[#121826] border border-[#3b3226] text-slate-300 text-xs font-semibold flex items-center justify-center"
					>
						{t('online.hud.waitingHost')}
					</div>
				{/if}

				<button
					type="button"
					onclick={handleLeaveRoom}
					class="min-h-[46px] px-4 rounded-[10px] bg-[#151c2c] hover:bg-rose-950/80 border border-[#3b3226] hover:border-rose-500/60 text-slate-300 hover:text-rose-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition"
					aria-label={t('online.hud.leaveRoom')}
				>
					<UiIcon name="logOut" class="w-4 h-4" />
					<span class="hidden sm:inline">{t('online.hud.leaveRoom')}</span>
				</button>
			</div>
		</div>
	</div>

	{#if paletteTarget}
		{@const isBotTarget = paletteTarget.isBot}
		{@const targetKey = paletteTarget.slotKey}
		{@const takenByOtherBots = new Set(
			(Object.entries(roomSlots) as Array<[RoomSlotKey, RoomSlotSetting]>)
				.filter(([k, s]) => k !== targetKey && s.kind === 'bot' && typeof s.colorId === 'number')
				.map(([, s]) => s.colorId as number)
		)}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4"
			role="dialog"
			aria-modal="true"
			aria-label={t('online.hud.pickColor')}
			data-testid="lobby-color-picker-modal"
		>
			<div
				class="w-full max-w-xs rounded-[14px] bg-gradient-to-b from-[#171d2b] to-[#0c1018] border-2 border-[#8c7456] p-4 shadow-2xl space-y-3"
			>
				<div class="flex items-center justify-between pb-2 border-b border-[#3b3226]">
					<span
						class="text-sm font-black uppercase tracking-wide text-amber-300 flex items-center gap-1.5"
					>
						<UiIcon name="palette" class="w-4 h-4" />
						<span>{t('online.hud.pickColor')}</span>
					</span>
					<button
						type="button"
						onclick={() => (paletteTarget = null)}
						class="px-2 py-0.5 rounded-[6px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs cursor-pointer"
					>
						✕
					</button>
				</div>

				<button
					type="button"
					onclick={() => handlePickPaletteColor(null)}
					data-testid="palette-color-random"
					class="w-full py-2 px-3 rounded-[8px] border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition {paletteTarget.currentColorId ===
					undefined
						? 'bg-amber-500/20 border-amber-400 text-amber-200'
						: 'bg-[#141a26] border-slate-700 text-slate-300 hover:border-amber-400/50'}"
				>
					<UiIcon name="dices" class="w-4 h-4 text-amber-300" />
					<span>{t('online.hud.randomColor')}</span>
				</button>

				<div class="grid grid-cols-7 gap-2">
					{#each ALL_PLAYER_COLORS as c (c.id)}
						{@const humanContenders = members.filter(
							(m) => m.role === 'player' && m.colorId === c.id
						).length}
						{@const disabledForBot =
							isBotTarget && (humanClaimedColorIds.has(c.id) || takenByOtherBots.has(c.id))}
						{@const isSelected = paletteTarget.currentColorId === c.id}
						<button
							type="button"
							disabled={disabledForBot}
							onclick={() => handlePickPaletteColor(c.id)}
							data-testid="palette-color-{c.id}"
							title={disabledForBot
								? `${c.nameUk} (${t('online.hud.colorTakenByPlayer')})`
								: `${c.nameUk}${humanContenders > 0 && !isBotTarget ? ` (претендентів: ${humanContenders})` : ''}`}
							class="relative w-9 h-9 rounded-[6px] border-2 flex items-center justify-center transition {disabledForBot
								? 'opacity-20 cursor-not-allowed border-slate-700'
								: isSelected
									? 'border-white ring-2 ring-amber-400 scale-105 cursor-pointer'
									: 'border-white/30 hover:border-white cursor-pointer hover:scale-105'}"
							style="background-color: {c.hex};"
						>
							{#if isSelected}
								<UiIcon
									name="check"
									class="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
								/>
							{:else if !isBotTarget && humanContenders > 0}
								<span
									class="text-[9px] font-mono font-black px-1 rounded-[4px] bg-black/80 text-amber-300"
								>
									×{humanContenders}
								</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	{#if roomInfo}
		<OnlineConfigModal
			isOpen={isConfigModalOpen}
			canEdit={isEffectiveHost}
			currentConfig={roomInfo.config}
			{activeSlotCount}
			onClose={() => (isConfigModalOpen = false)}
			onSave={handleSaveRoomConfig}
		/>
	{/if}
{/if}

<div class="fixed top-14 right-3 z-30 flex flex-col items-end gap-2">
	<div
		class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-lg text-xs text-slate-200"
	>
		{#if isPlaying && members.length > 0}
			<div class="hidden sm:flex items-center -space-x-1 mr-1" data-testid="battle-member-avatars">
				{#each members.filter((m) => m.role === 'player').slice(0, 6) as m (m.uid)}
					<span title="{m.name} ({m.team ?? 'west'})" class="rounded-md ring-1 ring-slate-900">
						<Avatar avatar={resolvedAvatars.get(m.uid) ?? m.avatar} size={20} showDefault />
					</span>
				{/each}
			</div>
		{/if}
		<span class="font-mono font-bold text-amber-300">{roomCode}</span>
		{#if peerOnlineCount > 0}
			<UiIcon name="wifi" class="w-3.5 h-3.5 text-emerald-400" />
		{:else}
			<UiIcon name="wifiOff" class="w-3.5 h-3.5 text-slate-400" />
		{/if}
		<span>
			{isPlaying
				? t('online.hud.inBattle', { count: members.length })
				: t('online.hud.lobbyStatus')}
		</span>
		<button
			type="button"
			onclick={() => (chatOpen = !chatOpen)}
			class="relative min-h-[44px] min-w-[44px] p-2 rounded hover:bg-slate-800 text-sky-300 cursor-pointer flex items-center justify-center"
			aria-label={t('online.hud.roomChatLabel')}
		>
			<UiIcon name="messageSquare" class="w-4 h-4" />
			{#if unreadChatCount > 0}
				<span
					class="absolute top-1 right-1 px-1 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black leading-tight"
				>
					{unreadChatCount}
				</span>
			{/if}
		</button>
		<button
			type="button"
			onclick={handleLeaveRoom}
			class="min-h-[44px] min-w-[44px] p-2 rounded hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 cursor-pointer flex items-center justify-center"
			aria-label={t('online.hud.leaveRoom')}
		>
			<UiIcon name="logOut" class="w-4 h-4" />
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

	{#if floatingEmote}
		<div
			class="px-3 py-1.5 rounded-xl bg-slate-900/95 border border-amber-400/60 shadow-xl text-xs flex items-center gap-2 animate-bounce"
			data-testid="floating-emote-bubble"
		>
			<span class="font-bold text-amber-300">{floatingEmote.senderName}:</span>
			<span class="text-base leading-none">{floatingEmote.emote}</span>
		</div>
	{/if}

	{#if chatOpen}
		<div
			class="w-72 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl p-3 flex flex-col gap-2"
		>
			<div class="max-h-40 overflow-y-auto space-y-1 text-xs">
				{#if visibleMessages.length === 0}
					<div class="text-slate-500 italic">{t('online.hud.noMessages')}</div>
				{:else}
					{#each visibleMessages as msg (msg.id)}
						{#if msg.kind === 'system'}
							<div class="text-[11px] italic text-sky-300/90">{msg.text}</div>
						{:else}
							{@const canAct = Boolean(localUid && msg.senderUid !== localUid)}
							<div class="flex items-start justify-between gap-1 break-words group">
								<div class="min-w-0">
									{#if canAct}
										<button
											type="button"
											onclick={() => (inspectMemberUid = msg.senderUid)}
											class="font-bold text-amber-300 hover:underline cursor-pointer text-left"
										>
											{msg.senderName}:
										</button>
									{:else}
										<span class="font-bold text-amber-300">{msg.senderName}:</span>
									{/if}
									{#if msg.kind === 'emote'}
										<span class="text-sm ml-1">{msg.emote ?? msg.text}</span>
									{:else}
										<span class="text-slate-200">
											{chatModeration.sanitizeText(msg.text)}
										</span>
									{/if}
								</div>
								{#if canAct}
									<div
										class="opacity-90 sm:opacity-0 sm:group-hover:opacity-100 flex items-center gap-0.5 shrink-0"
									>
										<button
											type="button"
											onclick={() =>
												(dmPeer = {
													uid: msg.senderUid,
													name: msg.senderName,
													avatar: msg.senderAvatar
												})}
											class="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-300 cursor-pointer"
											title={t('chat.openDm')}
											aria-label={t('chat.openDm')}
										>
											<UiIcon name="messageSquare" class="w-3 h-3" />
										</button>
										<button
											type="button"
											onclick={() => chatModeration.toggleMute(msg.senderUid)}
											class="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-300 cursor-pointer"
											title={t('chat.muteUser')}
											aria-label={t('chat.muteUser')}
										>
											<UiIcon name="volumeX" class="w-3 h-3" />
										</button>
									</div>
								{/if}
							</div>
						{/if}
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
							for (const id of [...chatModeration.mutedUids]) {
								chatModeration.toggleMute(id);
							}
						}}
						class="text-sky-300 hover:underline flex items-center gap-1 cursor-pointer"
					>
						<UiIcon name="volume2" class="w-3 h-3" />
						<span>{t('chat.unmuteAll')}</span>
					</button>
				</div>
			{/if}
			<div class="flex flex-wrap gap-1">
				{#each QUICK_EMOTES as em (em)}
					<button
						type="button"
						onclick={() => void sendRoomEmote(em)}
						class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] cursor-pointer"
					>
						{em}
					</button>
				{/each}
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
					<UiIcon name="send" class="w-3.5 h-3.5" />
				</button>
			</form>
		</div>
	{/if}
</div>

{#if dmPeer && localUid}
	<DmDrawer
		peerUid={dmPeer.uid}
		peerName={dmPeer.name}
		peerAvatar={dmPeer.avatar}
		myUid={localUid}
		myName={identity.value || t('online.defaultPlayerName')}
		myAvatar={identity.avatar}
		onClose={() => (dmPeer = null)}
	/>
{/if}

{#if inspectMemberUid}
	<PublicProfileModal
		targetUid={inspectMemberUid}
		isFollowing={myFriends.some((f) => f.uid === inspectMemberUid)}
		myRoomCode={roomCode}
		onClose={() => (inspectMemberUid = null)}
		onToggleFollow={async (uid) => {
			if (myFriends.some((f) => f.uid === uid)) {
				const ok = await unfollowUser(uid);
				if (ok) myFriends = myFriends.filter((f) => f.uid !== uid);
			} else {
				const ok = await followUser(uid, myProfile);
				if (ok) {
					const lists = await loadSocialLists();
					myFriends = lists.following;
				}
			}
		}}
		onOpenDm={(peer) => (dmPeer = peer)}
		onInviteRoom={async (uid) => {
			const targetName = members.find((m) => m.uid === uid)?.name || t('online.defaultPlayerName');
			const ok = await sendRoomInvite(
				uid,
				roomCode,
				identity.value || myProfile?.name || t('online.defaultPlayerName'),
				identity.avatar
			);
			if (ok) toast.success(t('social.invitedToast', { name: targetName }));
		}}
	/>
{/if}

{#if shareOpen && shareQr}
	<div
		class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		data-testid="room-share-modal"
	>
		<div
			class="w-full max-w-sm rounded-2xl bg-[#111622] border-2 border-[#8c7456] p-5 text-center space-y-4 shadow-2xl"
		>
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-black uppercase tracking-wider text-amber-300">
					{t('online.hud.shareTitle', { code: roomCode })}
				</h3>
				<button
					type="button"
					onclick={() => (shareOpen = false)}
					class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
				>
					✕
				</button>
			</div>

			<div class="inline-block p-3 rounded-xl bg-white shadow-inner mx-auto">
				<svg
					viewBox="0 0 {shareQr.size} {shareQr.size}"
					class="w-44 h-44 block"
					shape-rendering="crispEdges"
					aria-label="QR Code {roomCode}"
				>
					<rect width={shareQr.size} height={shareQr.size} fill="#ffffff" />
					<path d={shareQr.path} fill="#0f172a" />
				</svg>
			</div>

			<p class="text-xs text-slate-400">{t('online.hud.scanQr')}</p>

			<div
				class="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-[11px] font-mono text-sky-300 break-all select-all"
			>
				{shareUrl}
			</div>

			<div class="flex gap-2">
				<button
					type="button"
					onclick={async () => {
						try {
							await navigator.clipboard.writeText(shareUrl);
							toast.success(t('common.copied'));
						} catch {
							// ignore
						}
					}}
					class="flex-1 min-h-[42px] px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
					data-testid="room-copy-invite-url-btn"
				>
					{t('online.hud.copyLink')}
				</button>
				{#if typeof navigator !== 'undefined' && typeof navigator.share === 'function'}
					<button
						type="button"
						onclick={() => {
							void navigator
								.share({
									title: t('online.hud.shareTitle', { code: roomCode }),
									url: shareUrl
								})
								.catch(() => {});
						}}
						class="min-h-[42px] px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs cursor-pointer"
					>
						{t('online.hud.systemShare')}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
