export type Role = 'player' | 'spectator';
export type RoomStatus = 'lobby' | 'playing' | 'over';
export type MatchTeamId = 'west' | 'east';
export type RoomSlotKind = 'open' | 'closed' | 'bot';
export type RoomSlotKey =
	| 'west_1'
	| 'west_2'
	| 'west_3'
	| 'west_4'
	| 'west_5'
	| 'west_6'
	| 'west_7'
	| 'east_1'
	| 'east_2'
	| 'east_3'
	| 'east_4'
	| 'east_5'
	| 'east_6'
	| 'east_7';

export interface RoomSlotSetting {
	kind: RoomSlotKind;
	botDifficulty?: number;
	race?: string;
	colorId?: number;
}

export interface RosterEntry {
	uid: string;
	name: string;
	team?: MatchTeamId;
	race?: string;
	slot?: number;
	colorId?: number;
}

export interface Member {
	uid: string;
	name: string;
	role: Role;
	country?: string;
	avatar?: string;
	team?: MatchTeamId;
	race?: string;
	colorId?: number;
	colorPickedAt?: number;
	ready?: boolean;
	order: number;
	slot?: number;
	compact?: boolean;
	account?: boolean;
}

export interface MemberPatch {
	name?: string;
	role?: Role;
	country?: string;
	avatar?: string;
	team?: MatchTeamId;
	slot?: number;
	race?: string;
	colorId?: number | null;
	colorPickedAt?: number | object | null;
	ready?: boolean;
	compact?: boolean;
}

export interface RoomEntry {
	name: string;
	role: Role;
	country?: string;
	avatar?: string;
	team?: MatchTeamId;
	slot?: number;
	race?: string;
	colorId?: number;
	compact?: boolean;
}

export interface RoomConfig {
	modeId: string;
	teamSize: number;
	teamSizeWest?: number;
	teamSizeEast?: number;
	slots?: Partial<Record<RoomSlotKey, RoomSlotSetting>>;
	allRandom?: boolean;
	uniqueRaces?: boolean;
	bannedRaces?: string[];
	targetWins: number;
	startGold?: number;
	coinMode?: 'none' | 'normal' | 'crazy';
	coinSpawnInterval?: number;
	coinCount?: number;
	fogOfWar?: boolean;
	isPrivate?: boolean;
	[key: string]: unknown;
}

export interface RoomInfo {
	gameId: string;
	rulesVersion: number;
	seed: number;
	status: RoomStatus;
	hostUid: string;
	leadSeq?: string;
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
	round?: number;
	team?: MatchTeamId;
	playerSlot?: number;
	actionType?: string;
	buildingType?: string;
	x?: number;
	y?: number;
	worldX?: number;
	worldY?: number;
	shiftKey?: boolean;
	targetId?: string;
	abilityId?: string;
	itemId?: string;
	forgeType?: string;
	commanderId?: number | 'random';
	race?: string;
	checksum?: string;
	clientTime?: number;
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
	watch(
		onSnapshot: (snapshot: RoomSnapshot) => void,
		onGone?: (why: GoneReason) => void
	): () => void;
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
