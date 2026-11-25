import type {
	MatchTeamId,
	Member,
	Move,
	RoomConfig,
	RoomInfo,
	RoomSnapshot,
	RosterEntry
} from './roomTypes';

export type RawInfo = Omit<RoomInfo, 'roster'> & { roster?: unknown };
export type RosterRecord = Record<
	string,
	{ name: string; seat: number; slot?: number; team?: string; race?: string; colorId?: number }
>;

export function rosterToRecord(roster: readonly RosterEntry[]): RosterRecord {
	return Object.fromEntries(
		roster.map(({ uid, name, team, race, slot, colorId }, seat) => [
			uid,
			{
				name,
				seat,
				...(typeof slot === 'number' ? { slot } : {}),
				...(team ? { team } : {}),
				...(race ? { race } : {}),
				...(typeof colorId === 'number' ? { colorId } : {})
			}
		])
	);
}

export function rosterFromRecord(record: unknown): RosterEntry[] | undefined {
	if (typeof record !== 'object' || record === null) return undefined;
	const entries = Object.entries(
		record as Record<
			string,
			{
				name?: unknown;
				seat?: unknown;
				slot?: unknown;
				team?: unknown;
				race?: unknown;
				colorId?: unknown;
			}
		>
	)
		.filter(([, value]) => typeof value?.name === 'string' && typeof value?.seat === 'number')
		.sort(
			([uidA, a], [uidB, b]) =>
				(a.seat as number) - (b.seat as number) || (uidA < uidB ? -1 : uidA > uidB ? 1 : 0)
		)
		.map(([uid, value]) => ({
			uid,
			name: value.name as string,
			...(typeof value.slot === 'number' ? { slot: value.slot } : {}),
			...(value.team === 'west' || value.team === 'east'
				? { team: value.team as MatchTeamId }
				: {}),
			...(typeof value.race === 'string' && value.race.length > 0 ? { race: value.race } : {}),
			...(typeof value.colorId === 'number' ? { colorId: value.colorId } : {})
		}));
	return entries.length > 0 ? entries : undefined;
}

export function infoFromDb(raw: RawInfo): RoomInfo {
	const { roster, config, ...rest } = raw;
	const party = rosterFromRecord(roster);
	const defaultSettings: RoomConfig = { modeId: 'standard', teamSize: 1, targetWins: 2 };
	const settings: RoomConfig =
		typeof config === 'object' && config !== null ? (config as RoomConfig) : defaultSettings;
	return party ? { ...rest, config: settings, roster: party } : { ...rest, config: settings };
}

export const membersFromDb = (
	record: Record<string, Omit<Member, 'uid'>> | null | undefined
): Member[] => Object.entries(record ?? {}).map(([uid, member]) => ({ uid, ...member }));

export function snapshotFromDb(
	value: {
		info?: RawInfo;
		members?: Record<string, Omit<Member, 'uid'>>;
		moves?: Record<string, Move>;
	} | null
): RoomSnapshot | null {
	if (!value?.info) return null;
	return {
		info: infoFromDb(value.info),
		members: membersFromDb(value.members),
		moves: Object.entries(value.moves ?? {})
			.map(([key, move]) => ({ ...move, seq: Number(key) }))
			.filter((move) => Number.isInteger(move.seq))
			.sort((a, b) => a.seq - b.seq)
	};
}

export const moveKey = (seq: number): string => String(seq).padStart(6, '0');

export const MOVE_SEQ_MAX = 9_999;
