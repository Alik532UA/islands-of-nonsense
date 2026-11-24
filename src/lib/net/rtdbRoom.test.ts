import { describe, it, expect } from 'vitest';
import { writeMoveWithRetry } from './rtdbRoom';

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

	it('backs off once on cooldown denial when sequence slot is unclaimed', async () => {
		let writes = 0;
		let waitedMs = 0;

		const ok = await writeMoveWithRetry({
			initialSeq: 4,
			getHighestSeq: () => 3,
			attemptWrite: async () => {
				writes++;
				if (writes === 1) {
					throw permissionDeniedError();
				}
			},
			doesSeqExist: async () => false,
			waitMs: async (ms) => {
				waitedMs = ms;
			}
		});

		expect(ok).toBe(true);
		expect(writes).toBe(2);
		expect(waitedMs).toBeGreaterThanOrEqual(80);
	});

	it('returns false if still denied after cooldown retry', async () => {
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
		expect(writes).toBe(2);
	});
});
