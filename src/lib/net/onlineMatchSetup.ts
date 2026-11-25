import {
	MAX_PLAYERS_PER_TEAM,
	Simulation,
	type SimCustomSlot,
	type SimulationConfig
} from '$lib/engine/simulation';
import { getBuilderNameForRace, formatRaceName, PLAYABLE_RACES } from '$lib/engine/gameData';
import { ALL_PLAYER_COLORS, type PlayerState } from '$lib/engine/types';
import { resolveOnlineSlotColors } from './colorLottery';
import type { Member, RoomConfig, RoomInfo, RoomSlotKey, RoomSlotSetting } from './roomTypes';

export const BATTLE_COMMAND_ROUTER_KEY = 'battleCommandRouter';

export type BattleCommandRouter = (type: string, payload?: Record<string, unknown>) => boolean;

export interface OnlineSimInitResult {
	sim: Simulation;
	uidToSlot: Record<string, number>;
	localTeam: 'west' | 'east';
	localSlot: number;
}

const TEAM_SLOTS: Record<'west' | 'east', readonly number[]> = {
	west: [1, 3, 5, 7, 9, 11, 13],
	east: [2, 4, 6, 8, 10, 12, 14]
};

export function getSlotNumber(team: 'west' | 'east', index1to7: number): number {
	const clamped = Math.max(1, Math.min(MAX_PLAYERS_PER_TEAM, index1to7));
	return TEAM_SLOTS[team][clamped - 1];
}

export function getSlotKey(team: 'west' | 'east', index1to7: number): RoomSlotKey {
	const clamped = Math.max(1, Math.min(MAX_PLAYERS_PER_TEAM, index1to7));
	return `${team}_${clamped}` as RoomSlotKey;
}

export function getTeamAndIndexFromSlot(slot: number): {
	team: 'west' | 'east';
	index1to7: number;
	key: RoomSlotKey;
} {
	const clamped = Math.max(1, Math.min(MAX_PLAYERS_PER_TEAM * 2, Math.round(slot)));
	const team: 'west' | 'east' = clamped % 2 === 0 ? 'east' : 'west';
	const index1to7 = Math.ceil(clamped / 2);
	return { team, index1to7, key: getSlotKey(team, index1to7) };
}

export function buildRoomSlots(
	teamSizeWest: number,
	teamSizeEast: number,
	overrides?: Partial<Record<RoomSlotKey, RoomSlotSetting>>
): Record<RoomSlotKey, RoomSlotSetting> {
	const westCount = Math.max(1, Math.min(MAX_PLAYERS_PER_TEAM, Math.round(teamSizeWest)));
	const eastCount = Math.max(1, Math.min(MAX_PLAYERS_PER_TEAM, Math.round(teamSizeEast)));
	const slots = {} as Record<RoomSlotKey, RoomSlotSetting>;

	for (const team of ['west', 'east'] as const) {
		const limit = team === 'west' ? westCount : eastCount;
		for (let i = 1; i <= MAX_PLAYERS_PER_TEAM; i++) {
			const key = getSlotKey(team, i);
			const custom = overrides?.[key];
			if (custom) {
				slots[key] = {
					kind: custom.kind,
					...(custom.kind === 'bot'
						? {
								botDifficulty: typeof custom.botDifficulty === 'number' ? custom.botDifficulty : 15,
								race: custom.race ?? 'random',
								...(typeof custom.colorId === 'number' &&
								custom.colorId >= 1 &&
								custom.colorId <= ALL_PLAYER_COLORS.length
									? { colorId: custom.colorId }
									: {})
							}
						: {})
				};
			} else {
				slots[key] = { kind: i <= limit ? 'open' : 'closed' };
			}
		}
	}
	return slots;
}

export function normalizeRoomSlots(
	config?: Partial<RoomConfig>
): Record<RoomSlotKey, RoomSlotSetting> {
	const westSize = config?.teamSizeWest ?? config?.teamSize ?? 1;
	const eastSize = config?.teamSizeEast ?? config?.teamSize ?? 1;
	if (!config?.slots) {
		return buildRoomSlots(westSize, eastSize);
	}
	return buildRoomSlots(westSize, eastSize, config.slots);
}

export function countOpenHumanCapacity(config?: Partial<RoomConfig>): number {
	const slots = normalizeRoomSlots(config);
	let openCount = 0;
	for (const s of Object.values(slots)) {
		if (s.kind === 'open') openCount++;
	}
	return Math.max(2, openCount);
}

/**
 * Computes the next available deterministic slot (1,3,5..13 for west, 2,4,6..14 for east)
 * given existing room members and optional slot configuration.
 */
export function pickNextTeamSlot(
	members: ReadonlyArray<{ team?: string; slot?: number; role?: string }>,
	team: 'west' | 'east',
	config?: Partial<RoomConfig>
): number {
	const pool = TEAM_SLOTS[team];
	const taken = new Set(
		members
			.filter((m) => m.role !== 'spectator' && typeof m.slot === 'number')
			.map((m) => m.slot as number)
	);
	if (config?.slots) {
		const slots = normalizeRoomSlots(config);
		for (let i = 1; i <= MAX_PLAYERS_PER_TEAM; i++) {
			const slotNum = getSlotNumber(team, i);
			const setting = slots[getSlotKey(team, i)];
			if (setting.kind === 'open' && !taken.has(slotNum)) {
				return slotNum;
			}
		}
	}
	return pool.find((s) => !taken.has(s)) ?? pool[0];
}

export function pickFirstAvailableSeat(
	members: ReadonlyArray<{ team?: string; slot?: number; role?: string }>,
	preferredTeam: 'west' | 'east',
	config?: Partial<RoomConfig>
): { team: 'west' | 'east'; slot: number } {
	const taken = new Set(
		members
			.filter((m) => m.role !== 'spectator' && typeof m.slot === 'number')
			.map((m) => m.slot as number)
	);
	const slots = normalizeRoomSlots(config);
	const order: ('west' | 'east')[] = preferredTeam === 'east' ? ['east', 'west'] : ['west', 'east'];

	for (const team of order) {
		for (let i = 1; i <= MAX_PLAYERS_PER_TEAM; i++) {
			const slotNum = getSlotNumber(team, i);
			if (slots[getSlotKey(team, i)].kind === 'open' && !taken.has(slotNum)) {
				return { team, slot: slotNum };
			}
		}
	}

	return {
		team: preferredTeam,
		slot: pickNextTeamSlot(members, preferredTeam)
	};
}

function buildCustomSlotsFromRoom(
	info: RoomInfo,
	members: readonly Member[],
	resolvedColors?: Record<number, number>
): SimCustomSlot[] | undefined {
	const hasExplicitSlots = Boolean(info.config?.slots);
	const westCount = info.config?.teamSizeWest ?? info.config?.teamSize ?? 1;
	const eastCount = info.config?.teamSizeEast ?? info.config?.teamSize ?? 1;
	if (!hasExplicitSlots && westCount <= 3 && eastCount <= 3) {
		return undefined;
	}

	const slotsMap = normalizeRoomSlots(info.config);
	const participants =
		info.roster && info.roster.length > 0
			? info.roster.map((r) => ({
					uid: r.uid,
					name: r.name,
					team: r.team ?? 'west',
					race: r.race,
					slot: r.slot
				}))
			: [...members]
					.filter((m) => m.role === 'player')
					.sort((a, b) => a.order - b.order)
					.map((m) => ({
						uid: m.uid,
						name: m.name,
						team: m.team ?? 'west',
						race: m.race,
						slot: m.slot
					}));

	const occupiedSlots = new Map<number, (typeof participants)[number]>();
	const unassigned: (typeof participants)[number][] = [];
	for (const p of participants) {
		const pTeam: 'west' | 'east' = p.team === 'east' ? 'east' : 'west';
		const slotMatchesTeam =
			typeof p.slot === 'number' && (p.slot % 2 === 0 ? 'east' : 'west') === pTeam;
		if (slotMatchesTeam && typeof p.slot === 'number' && !occupiedSlots.has(p.slot)) {
			occupiedSlots.set(p.slot, p);
		} else {
			unassigned.push(p);
		}
	}

	// Place any legacy entries without explicit slot into the first open slots on their team
	for (const p of unassigned) {
		const pTeam: 'west' | 'east' = p.team === 'east' ? 'east' : 'west';
		for (let i = 1; i <= MAX_PLAYERS_PER_TEAM; i++) {
			const sn = getSlotNumber(pTeam, i);
			if (!occupiedSlots.has(sn) && slotsMap[getSlotKey(pTeam, i)].kind === 'open') {
				occupiedSlots.set(sn, p);
				break;
			}
		}
	}

	const custom: SimCustomSlot[] = [];
	for (const team of ['west', 'east'] as const) {
		let teamHasAny = false;
		for (let i = 1; i <= MAX_PLAYERS_PER_TEAM; i++) {
			const sn = getSlotNumber(team, i);
			const cfg = slotsMap[getSlotKey(team, i)];
			const occupant = occupiedSlots.get(sn);
			const assignedColor = resolvedColors?.[sn];
			if (occupant) {
				teamHasAny = true;
				custom.push({
					slot: sn,
					team,
					isBot: false,
					name: occupant.name,
					race: occupant.race,
					...(typeof assignedColor === 'number' ? { colorId: assignedColor } : {})
				});
			} else if (cfg.kind === 'bot') {
				teamHasAny = true;
				const diff = typeof cfg.botDifficulty === 'number' ? cfg.botDifficulty : 15;
				custom.push({
					slot: sn,
					team,
					isBot: true,
					botDifficulty: diff,
					name: `${team === 'west' ? 'Бот-Захід' : 'Бот-Схід'} #${i}`,
					race: cfg.race ?? 'random',
					...(typeof assignedColor === 'number' ? { colorId: assignedColor } : {})
				});
			}
		}
		// Lobby preview safety: keep at least one team representative if side has no active slots yet
		if (!teamHasAny) {
			const sn = getSlotNumber(team, 1);
			custom.push({
				slot: sn,
				team,
				isBot: true,
				botDifficulty: 0,
				name: team === 'west' ? 'Очікування (Захід)' : 'Очікування (Схід)',
				race: 'random'
			});
		}
	}

	return custom;
}

/**
 * Builds deterministic SimulationConfig from authoritative RTDB RoomInfo.
 */
export function buildOnlineSimulationConfig(info: RoomInfo): SimulationConfig {
	const teamSize = Math.max(
		1,
		Math.min(MAX_PLAYERS_PER_TEAM, Math.round(info.config?.teamSize ?? 1))
	);
	const teamSizeWest = Math.max(
		1,
		Math.min(MAX_PLAYERS_PER_TEAM, Math.round(info.config?.teamSizeWest ?? teamSize))
	);
	const teamSizeEast = Math.max(
		1,
		Math.min(MAX_PLAYERS_PER_TEAM, Math.round(info.config?.teamSizeEast ?? teamSize))
	);
	const bannedRaces = Array.isArray(info.config?.bannedRaces)
		? info.config.bannedRaces.filter((r): r is string => typeof r === 'string' && r.length > 0)
		: undefined;
	const coinMode =
		info.config?.coinMode === 'none' ||
		info.config?.coinMode === 'normal' ||
		info.config?.coinMode === 'crazy'
			? info.config.coinMode
			: 'normal';

	return {
		modeId: typeof info.config?.modeId === 'string' ? info.config.modeId : 'standard',
		teamSize,
		teamSizeWest,
		teamSizeEast,
		targetWins: typeof info.config?.targetWins === 'number' ? info.config.targetWins : 2,
		allRandom: Boolean(info.config?.allRandom),
		uniqueRaces: Boolean(info.config?.uniqueRaces),
		...(bannedRaces && bannedRaces.length > 0 ? { bannedRaces } : {}),
		coinMode,
		...(typeof info.config?.coinSpawnInterval === 'number'
			? { coinSpawnInterval: info.config.coinSpawnInterval }
			: {}),
		...(typeof info.config?.coinCount === 'number' ? { coinCount: info.config.coinCount } : {}),
		botDifficulty: 0,
		botVsBot: false,
		autoStepBots: true,
		fogOfWar: info.config?.fogOfWar !== false,
		startGold: typeof info.config?.startGold === 'number' ? info.config.startGold : 500,
		seed: info.seed,
		randomColors: false,
		isRunning: info.status === 'playing'
	};
}

/**
 * Synchronizes room roster/members (names, teams, human slots, and chosen races)
 * identically onto a seeded Simulation instance across all peers.
 */
export function applyOnlineRosterToSimulation(
	sim: Simulation,
	info: RoomInfo,
	members: readonly Member[],
	localUid: string
): { uidToSlot: Record<string, number>; localTeam: 'west' | 'east'; localSlot: number } {
	const participants =
		info.roster && info.roster.length > 0
			? info.roster.map((r) => ({
					uid: r.uid,
					name: r.name,
					team: r.team ?? 'west',
					race: r.race,
					slot: r.slot
				}))
			: [...members]
					.filter((m) => m.role === 'player')
					.sort((a, b) => a.order - b.order)
					.map((m) => ({
						uid: m.uid,
						name: m.name,
						team: m.team ?? 'west',
						race: m.race,
						slot: m.slot
					}));

	const usedIndices = { west: 0, east: 0 };
	const usedSlotNumbers = new Set<number>();
	const uidToSlot: Record<string, number> = {};
	let localTeam: 'west' | 'east' = 'west';
	let localSlot = 1;

	const resolvePlayerBySlot = (slot: number): PlayerState | undefined =>
		sim.allPlayers.find((p) => p.slot === slot);

	const isAllRandom = Boolean(sim.gameModeConfig.allRandom || info.config?.allRandom);

	for (const entry of participants) {
		const team: 'west' | 'east' = entry.team === 'east' ? 'east' : 'west';
		const teamSlotPool = TEAM_SLOTS[team];
		const slotMatchesTeam =
			typeof entry.slot === 'number' && (entry.slot % 2 === 0 ? 'east' : 'west') === team;
		let slot: number;
		if (
			slotMatchesTeam &&
			typeof entry.slot === 'number' &&
			resolvePlayerBySlot(entry.slot) &&
			!usedSlotNumbers.has(entry.slot)
		) {
			slot = entry.slot;
		} else {
			while (
				usedIndices[team] < teamSlotPool.length &&
				usedSlotNumbers.has(teamSlotPool[usedIndices[team]])
			) {
				usedIndices[team] += 1;
			}
			const idx = usedIndices[team];
			usedIndices[team] += 1;
			slot = teamSlotPool[idx] ?? teamSlotPool[0];
		}
		usedSlotNumbers.add(slot);
		uidToSlot[entry.uid] = slot;

		const targetPlayer = resolvePlayerBySlot(slot);
		if (targetPlayer) {
			targetPlayer.name = entry.name;
			targetPlayer.isBot = false;
			targetPlayer.botDifficulty = 0;

			if (!isAllRandom && entry.race && entry.race !== 'in_game') {
				if (entry.race === 'random') {
					if (info.status === 'playing' && !targetPlayer.randomGoldGranted) {
						const available = PLAYABLE_RACES.filter((r) => !sim.isRaceBanned(r));
						const picked =
							available[Math.floor(sim.nextRandom() * available.length)] ?? available[0];
						targetPlayer.race = picked;
						targetPlayer.isRandomRace = true;
						const startGold = sim.config.startGold ?? 500;
						targetPlayer.gold += Math.round(startGold * 0.3);
						targetPlayer.randomGoldGranted = true;
						if (targetPlayer.worker) {
							targetPlayer.worker.name = getBuilderNameForRace(picked);
						}
					}
				} else if (formatRaceName(targetPlayer.race) !== formatRaceName(entry.race)) {
					targetPlayer.race = entry.race;
					targetPlayer.isRandomRace = false;
					if (targetPlayer.worker) {
						targetPlayer.worker.name = getBuilderNameForRace(entry.race);
					}
				}
			}
		}

		if (entry.uid === localUid) {
			localTeam = team;
			localSlot = slot;
		}
	}

	if (!(localUid in uidToSlot)) {
		const selfMember = members.find((m) => m.uid === localUid);
		localTeam = selfMember?.team === 'east' ? 'east' : 'west';
		localSlot = selfMember?.slot ?? TEAM_SLOTS[localTeam][0];
	}

	return { uidToSlot, localTeam, localSlot };
}

/**
 * Creates and initializes a deterministic Simulation for an online room.
 */
export function createOnlineSimulation(
	info: RoomInfo,
	members: readonly Member[],
	localUid: string
): OnlineSimInitResult {
	const simConfig = buildOnlineSimulationConfig(info);
	const resolvedColors =
		info.status === 'playing'
			? resolveOnlineSlotColors({
					seed: info.seed,
					config: info.config,
					members,
					roster: info.roster
				})
			: undefined;
	const customSlots = buildCustomSlotsFromRoom(info, members, resolvedColors);
	if (customSlots && customSlots.length > 0) {
		simConfig.customSlots = customSlots;
	}
	const sim = new Simulation(simConfig);
	const { uidToSlot, localTeam, localSlot } = applyOnlineRosterToSimulation(
		sim,
		info,
		members,
		localUid
	);
	if (resolvedColors) {
		for (const p of sim.allPlayers) {
			const slotNum = p.slot;
			if (typeof slotNum === 'number' && typeof resolvedColors[slotNum] === 'number') {
				const found = ALL_PLAYER_COLORS.find((c) => c.id === resolvedColors[slotNum]);
				if (found) p.color = found;
			}
		}
		sim.assignCastleColors();
	}
	// Rebuild active BotAI controllers cleanly after human slots took over from any initial placeholder
	sim.bots = sim.allPlayers
		.filter((p) => p.isBot && !p.name.startsWith('Очікування ('))
		.map((p) => {
			const existing = sim.bots.find((b) => b.getPlayer() === p);
			return existing;
		})
		.filter((b): b is NonNullable<typeof b> => Boolean(b));
	const hasPendingInGamePicks = sim.allPlayers.some((p) => !p.isBot && p.pendingRacePick);
	sim.isRunning = info.status === 'playing' && !hasPendingInGamePicks;
	return { sim, uidToSlot, localTeam, localSlot };
}
