import { describe, it, expect } from 'vitest';
import { LocalRoom } from './localRoom';
import type { Member, RoomInfo } from './roomTypes';

describe('LocalRoom', () => {
	const defaultInfo: RoomInfo = {
		gameId: 'castlefight',
		rulesVersion: 1,
		seed: 42,
		status: 'lobby',
		hostUid: 'host_1',
		createdAt: 1000,
		config: { modeId: 'standard', teamSize: 1, targetWins: 2 }
	};

	const defaultMembers: Member[] = [
		{ uid: 'host_1', name: 'Alice', role: 'player', order: 1 },
		{ uid: 'guest_2', name: 'Bob', role: 'player', order: 2 }
	];

	it('initializes and reports snapshot to subscriber', () => {
		const room = new LocalRoom(defaultInfo, defaultMembers);
		const transport = room.transport();

		let currentSnap: any = null;
		const unwatch = transport.watch((snap) => {
			currentSnap = snap;
		});

		expect(currentSnap).not.toBeNull();
		expect(currentSnap.info.status).toBe('lobby');
		expect(currentSnap.members).toHaveLength(2);
		unwatch();
	});

	it('allows host to change status and start match', async () => {
		const room = new LocalRoom(defaultInfo, defaultMembers);
		const hostTransport = room.transport({ as: 'host_1' });

		await hostTransport.setStatus('playing', [
			{ uid: 'host_1', name: 'Alice', team: 'west' },
			{ uid: 'guest_2', name: 'Bob', team: 'east' }
		]);

		let playingSnap: any = null;
		hostTransport.watch((snap) => {
			playingSnap = snap;
		});

		expect(playingSnap.info.status).toBe('playing');
		expect(playingSnap.info.roster).toHaveLength(2);
	});

	it('denies non-host from setting status', async () => {
		const room = new LocalRoom(defaultInfo, defaultMembers);
		const guestTransport = room.transport({ as: 'guest_2' });

		await expect(guestTransport.setStatus('playing')).rejects.toThrow('PERMISSION_DENIED');
	});

	it('syncs append moves monotonically across clients', async () => {
		const room = new LocalRoom({ ...defaultInfo, status: 'playing' }, defaultMembers);
		const clientA = room.transport({ as: 'host_1' });
		const clientB = room.transport({ as: 'guest_2' });

		let snapB: any = null;
		clientB.watch((snap) => {
			snapB = snap;
		});

		const success = await clientA.append({
			seq: 1,
			by: 'host_1',
			type: 'BUILD',
			payload: { tick: 10, buildingType: 'h000', x: 1000, y: 1000 }
		});

		expect(success).toBe(true);
		expect(snapB.moves).toHaveLength(1);
		expect(snapB.moves[0].seq).toBe(1);
		expect(snapB.moves[0].type).toBe('BUILD');
	});

	it('rejects duplicate move sequences', async () => {
		const room = new LocalRoom({ ...defaultInfo, status: 'playing' }, defaultMembers);
		const clientA = room.transport({ as: 'host_1' });

		const first = await clientA.append({ seq: 1, by: 'host_1', type: 'BUILD' });
		expect(first).toBe(true);

		const second = await clientA.append({ seq: 1, by: 'host_1', type: 'UPGRADE' });
		expect(second).toBe(false);
	});

	it('updates aliveAt on touch()', async () => {
		const room = new LocalRoom(defaultInfo, defaultMembers, 5000);
		const clientA = room.transport({ as: 'host_1' });

		room.tick(1000);
		await clientA.touch();

		let snap: any = null;
		clientA.watch((s) => (snap = s));
		expect(snap.info.aliveAt).toBe(6000);
	});
});
