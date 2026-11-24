import { describe, it, expect } from 'vitest';
import { writeMoveWithRetry } from './rtdbRoom';
import { LocalRoom } from './localRoom';

function permissionDeniedError(): Error & { code: string } {
	const err = new Error('PERMISSION_DENIED') as Error & { code: string };
	err.code = 'PERMISSION_DENIED';
	return err;
}

describe('writeMoveWithRetry', () => {
	it('advances past occupied sequence numbers on simultaneous peer writes', async () => {
		const attempted: number[] = [];
		const takenSeqs = new Set([10, 11]);
		let highest = 9;

		const ok = await writeMoveWithRetry({
			initialSeq: 10,
			getHighestSeq: () => highest,
			attemptWrite: async (seq) => {
				attempted.push(seq);
				if (takenSeqs.has(seq)) {
					highest = Math.max(highest, seq);
					throw permissionDeniedError();
				}
			},
			doesSeqExist: async (seq) => takenSeqs.has(seq),
			waitMs: async () => {}
		});

		expect(ok).toBe(true);
		expect(attempted).toEqual([10, 11, 12]);
	});

	it('backs off across up to 3 cooldown bursts when sequence slot is unclaimed', async () => {
		let writes = 0;
		const waits: number[] = [];

		const ok = await writeMoveWithRetry({
			initialSeq: 4,
			getHighestSeq: () => 3,
			attemptWrite: async () => {
				writes++;
				if (writes <= 3) {
					throw permissionDeniedError();
				}
			},
			doesSeqExist: async () => false,
			waitMs: async (ms) => {
				waits.push(ms);
			}
		});

		expect(ok).toBe(true);
		expect(writes).toBe(4);
		expect(waits).toEqual([95, 190, 285]);
	});

	it('returns false if still denied after exhausting cooldown retries', async () => {
		let writes = 0;
		const ok = await writeMoveWithRetry({
			initialSeq: 1,
			getHighestSeq: () => 0,
			attemptWrite: async () => {
				writes++;
				throw permissionDeniedError();
			},
			doesSeqExist: async () => false,
			waitMs: async () => {}
		});

		expect(ok).toBe(false);
		expect(writes).toBe(4);
	});

	it('transfers host lead cleanly when previous host disconnects from presence', async () => {
		const room = new LocalRoom(
			{
				gameId: 'islands-of-nonsense',
				rulesVersion: 1,
				seed: 42,
				status: 'lobby',
				hostUid: 'host1',
				createdAt: 1000,
				config: {
					modeId: 'classic',
					teamSize: 1,
					targetWins: 3,
					allRandom: false,
					uniqueRaces: false,
					coinMode: 'normal',
					isPrivate: false,
					botDifficulty: 0
				}
			},
			[
				{ uid: 'host1', name: 'Host', role: 'player', order: 1, slot: 1, team: 'west' },
				{ uid: 'peer2', name: 'Peer', role: 'player', order: 2, slot: 2, team: 'east' }
			]
		);

		let latestHost = 'host1';
		const tPeer = room.transport({ as: 'peer2' });
		const unsub = tPeer.watch((snap) => {
			latestHost = snap.info.hostUid;
		});

		room.setPresent(['host1', 'peer2']);
		expect(
			await tPeer.takeLead?.({
				seq: 1,
				by: 'peer2',
				type: 'lead',
				payload: { from: 'host1' }
			})
		).toBe(false);
		expect(latestHost).toBe('host1');

		room.setPresent(['peer2']);
		expect(
			await tPeer.takeLead?.({
				seq: 1,
				by: 'peer2',
				type: 'lead',
				payload: { from: 'host1' }
			})
		).toBe(true);
		expect(latestHost).toBe('peer2');

		unsub();
	});
});
