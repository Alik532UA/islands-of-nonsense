export type Role = 'player' | 'spectator';
export type RoomStatus = 'lobby' | 'playing' | 'over';
export type MatchTeamId = 'west' | 'east';

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
}

export interface RoomConfig {
	modeId: string;
	teamSize: 1 | 2 | 3;
	allRandom?: boolean;
	uniqueRaces?: boolean;
	targetWins: number;
	coinMode?: 'none' | 'normal' | 'crazy';
	isPrivate?: boolean;
}

export interface RoomInfo {
	gameId: string;
	rulesVersion: number;
	seed: number;
	status: RoomStatus;
	hostUid: string;
	createdAt: number;
	config: RoomConfig;
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
