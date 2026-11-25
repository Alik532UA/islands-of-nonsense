import { describe, expect, it } from 'vitest';
import { selectAutoHandoverUid, shouldStartOnlineCountdown } from './onlineBattleSession';
import { canJoinAsSpectator, MAX_ROOM_SPECTATORS, normalizeSpectatorMode } from './roomTypes';
import { isCompatibleLobbyRoom } from './lobby';
import type { Member } from './roomTypes';

describe('onlineBattleSession handover selection', () => {
	const members: Member[] = [
		{ uid: 'host_u1', name: 'Host', role: 'player', order: 1, slot: 1, team: 'west' },
		{ uid: 'spec_u2', name: 'Viewer', role: 'spectator', order: 2, team: 'west' },
		{ uid: 'peer_u3', name: 'PeerA', role: 'player', order: 3, slot: 2, team: 'east' },
		{ uid: 'peer_u4', name: 'PeerB', role: 'player', order: 4, slot: 3, team: 'west' }
	];

	it('returns null when current host is still present online', () => {
		expect(selectAutoHandoverUid(members, ['host_u1', 'peer_u3', 'peer_u4'], 'host_u1')).toBeNull();
	});

	it('picks the lowest-order online player while ignoring spectators', () => {
		expect(selectAutoHandoverUid(members, ['spec_u2', 'peer_u3', 'peer_u4'], 'host_u1')).toBe(
			'peer_u3'
		);
		expect(selectAutoHandoverUid(members, ['spec_u2', 'peer_u4'], 'host_u1')).toBe('peer_u4');
		expect(selectAutoHandoverUid(members, ['spec_u2'], 'host_u1')).toBeNull();
	});
});

describe('spectator policy & lobby compatibility', () => {
	it('defaults spectator mode to anytime and validates allowed states', () => {
		expect(normalizeSpectatorMode(undefined)).toBe('anytime');
		expect(normalizeSpectatorMode('invalid')).toBe('anytime');
		expect(normalizeSpectatorMode('none')).toBe('none');
		expect(normalizeSpectatorMode('lobby')).toBe('lobby');

		expect(
			canJoinAsSpectator({ status: 'lobby', spectatorMode: 'none', spectatorCount: 0 })
		).toEqual({ allowed: false, reason: 'disabled' });
		expect(
			canJoinAsSpectator({ status: 'lobby', spectatorMode: 'lobby', spectatorCount: 0 })
		).toEqual({ allowed: true });
		expect(
			canJoinAsSpectator({ status: 'playing', spectatorMode: 'lobby', spectatorCount: 0 })
		).toEqual({ allowed: false, reason: 'lobbyOnly' });
		expect(
			canJoinAsSpectator({ status: 'playing', spectatorMode: 'anytime', spectatorCount: 2 })
		).toEqual({ allowed: true });
		expect(
			canJoinAsSpectator({
				status: 'playing',
				spectatorMode: 'anytime',
				spectatorCount: MAX_ROOM_SPECTATORS
			})
		).toEqual({ allowed: false, reason: 'full' });
	});

	it('keeps live anytime matches visible in lobby feed while hiding none/lobby live games', () => {
		const now = Date.now();
		expect(
			isCompatibleLobbyRoom(
				{
					code: 'LIVE1',
					hostUid: 'u1',
					hostName: 'Host',
					gameId: 'castlefight',
					rulesVersion: 1,
					players: 2,
					maxPlayers: 2,
					spectators: 1,
					status: 'playing',
					spectatorMode: 'anytime',
					modeId: 'standard',
					createdAt: now - 1000
				},
				now
			)
		).toBe(true);

		expect(
			isCompatibleLobbyRoom(
				{
					code: 'LIVE2',
					hostUid: 'u1',
					hostName: 'Host',
					gameId: 'castlefight',
					rulesVersion: 1,
					players: 2,
					maxPlayers: 2,
					spectators: 0,
					status: 'playing',
					spectatorMode: 'lobby',
					modeId: 'standard',
					createdAt: now - 1000
				},
				now
			)
		).toBe(false);
	});

	it('never starts race-pick countdown while room is still in lobby', () => {
		const simWithPendingPick = {
			allPlayers: [
				{ isBot: false, pendingRacePick: true },
				{ isBot: true, pendingRacePick: false }
			]
		} as never;

		expect(shouldStartOnlineCountdown('lobby', simWithPendingPick)).toBe(false);
		expect(shouldStartOnlineCountdown('over', simWithPendingPick)).toBe(false);
		expect(shouldStartOnlineCountdown('playing', simWithPendingPick)).toBe(true);
		expect(
			shouldStartOnlineCountdown('playing', {
				allPlayers: [{ isBot: false, pendingRacePick: false }]
			} as never)
		).toBe(false);
	});
});
