import { Simulation, type SimulationConfig } from '$lib/engine/simulation';
import { getBuilderNameForRace, formatRaceName, PLAYABLE_RACES } from '$lib/engine/gameData';
import type { PlayerState } from '$lib/engine/types';
import type { Member, RoomInfo } from './roomTypes';

export const BATTLE_COMMAND_ROUTER_KEY = 'battleCommandRouter';

export type BattleCommandRouter = (type: string, payload?: Record<string, unknown>) => boolean;

export interface OnlineSimInitResult {
	sim: Simulation;
	uidToSlot: Record<string, number>;
	localTeam: 'west' | 'east';
	localSlot: number;
}

const TEAM_SLOTS: Record<'west' | 'east', readonly number[]> = {
	west: [1, 3, 5],
	east: [2, 4, 6]
};

/**
 * Computes the next available deterministic slot (1/3/5 for west, 2/4/6 for east)
 * given existing room members.
 */
export function pickNextTeamSlot(
	members: ReadonlyArray<{ team?: string; slot?: number }>,
	team: 'west' | 'east'
): number {
	const pool = TEAM_SLOTS[team];
	const taken = new Set(
		members
			.filter((m) => m.team === team && typeof m.slot === 'number')
			.map((m) => m.slot as number)
	);
	return pool.find((s) => !taken.has(s)) ?? pool[0];
}

/**
 * Builds deterministic SimulationConfig from authoritative RTDB RoomInfo.
 */
export function buildOnlineSimulationConfig(info: RoomInfo): SimulationConfig {
	const teamSize = (
		info.config?.teamSize === 2 || info.config?.teamSize === 3 ? info.config.teamSize : 1
	) as 1 | 2 | 3;

	return {
		modeId: typeof info.config?.modeId === 'string' ? info.config.modeId : 'standard',
		teamSize,
		teamSizeWest: teamSize,
		teamSizeEast: teamSize,
		targetWins: typeof info.config?.targetWins === 'number' ? info.config.targetWins : 2,
		allRandom: Boolean(info.config?.allRandom),
		uniqueRaces: Boolean(info.config?.uniqueRaces),
		coinMode:
			info.config?.coinMode === 'none' ||
			info.config?.coinMode === 'normal' ||
			info.config?.coinMode === 'crazy'
				? info.config.coinMode
				: 'normal',
		botDifficulty: 0,
		botVsBot: false,
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
					race: r.race
				}))
			: [...members]
					.filter((m) => m.role === 'player')
					.sort((a, b) => a.order - b.order)
					.map((m) => ({
						uid: m.uid,
						name: m.name,
						team: m.team ?? 'west',
						race: m.race
					}));

	const usedIndices = { west: 0, east: 0 };
	const uidToSlot: Record<string, number> = {};
	let localTeam: 'west' | 'east' = 'west';
	let localSlot = 1;

	const resolvePlayerBySlot = (slot: number): PlayerState | undefined =>
		sim.allPlayers.find((p) => p.slot === slot);

	const isAllRandom = Boolean(sim.gameModeConfig.allRandom || info.config?.allRandom);

	for (const entry of participants) {
		const team: 'west' | 'east' = entry.team === 'east' ? 'east' : 'west';
		const teamSlotPool = TEAM_SLOTS[team];
		const idx = usedIndices[team];
		usedIndices[team] += 1;
		const slot = teamSlotPool[idx] ?? teamSlotPool[0];
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
		localSlot = TEAM_SLOTS[localTeam][0];
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
	const sim = new Simulation(simConfig);
	const { uidToSlot, localTeam, localSlot } = applyOnlineRosterToSimulation(
		sim,
		info,
		members,
		localUid
	);
	sim.isRunning = info.status === 'playing';
	return { sim, uidToSlot, localTeam, localSlot };
}
