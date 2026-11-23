export type Role = 'player' | 'spectator';
export type RoomStatus = 'lobby' | 'playing' | 'over';
export type MatchTeamId = 'west' | 'east';

export interface RosterEntry {
	uid: string;
	name: string;
	team?: MatchTeamId;
}

export interface Member {
	uid: string;
	name: string;
	role: Role;
	country?: string;
	avatar?: string;
	team?: MatchTeamId;
	race?: string;
	ready?: boolean;
	order: number;
	compact?: boolean;
	account?: boolean;
}

export interface MemberPatch {
	name?: string;
	role?: Role;
	country?: string;
	avatar?: string;
	team?: MatchTeamId;
	race?: string;
	ready?: boolean;
	compact?: boolean;
}

export interface RoomEntry {
	name: string;
	role: Role;
	country?: string;
	avatar?: string;
	team?: MatchTeamId;
	race?: string;
	compact?: boolean;
}

export interface RoomConfig {
	modeId: string;
	teamSize: 1 | 2 | 3;
	allRandom?: boolean;
	uniqueRaces?: boolean;
	targetWins: number;
	coinMode?: 'none' | 'normal' | 'crazy';
	isPrivate?: boolean;
	[key: string]: unknown;
}

export interface RoomInfo {
	gameId: string;
	rulesVersion: number;
	seed: number;
	status: RoomStatus;
	hostUid: string;
	createdAt: number;
	config: RoomConfig;
	aliveAt?: number;
	startedAt?: number;
	countdownAt?: number | null;
	autoStart?: boolean;
	listed?: boolean;
	roster?: RosterEntry[];
}

export interface MovePayload {
	tick?: number;
	team?: MatchTeamId;
	actionType?: string;
	buildingType?: string;
	x?: number;
	y?: number;
	targetId?: string;
	abilityId?: string;
	itemId?: string;
	forgeType?: string;
	from?: string;
	[key: string]: unknown;
}

export interface Move {
	seq: number;
	by: string;
	type: string;
	at?: number;
	payload?: MovePayload;
}

export interface RoomSnapshot {
	info: RoomInfo;
	members: Member[];
	moves: Move[];
}

export type GoneReason = 'closed' | 'lost';

export interface RoomTransport {
	code: string;
	now(): number;
	watch(onSnapshot: (snapshot: RoomSnapshot) => void, onGone?: (why: GoneReason) => void): () => void;
	append(move: Move): Promise<boolean>;
	setStatus(status: RoomStatus, roster?: RosterEntry[], config?: RoomConfig): Promise<void>;
	touch(): Promise<void>;
	setAutoStart?(on: boolean): Promise<void>;
	setConfig?(config: RoomConfig): Promise<void>;
	takeLead?(move: Move): Promise<boolean>;
}

export interface LobbyRoom {
	code: string;
	hostUid: string;
	hostName: string;
	hostCountry?: string;
	hostAvatar?: string;
	gameId: string;
	rulesVersion: number;
	players: number;
	maxPlayers: number;
	modeId: string;
	createdAt: number;
}
