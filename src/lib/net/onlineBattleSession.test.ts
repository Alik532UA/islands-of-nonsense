import { describe, expect, it } from 'vitest';
import { selectAutoHandoverUid } from './onlineBattleSession';
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
