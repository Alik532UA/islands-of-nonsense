import { describe, expect, it, vi } from 'vitest';
import { classifyNetProblem } from './netProblem';

const { getMock } = vi.hoisted(() => ({
	getMock: vi.fn()
}));

vi.mock('$lib/net/firebase', () => ({
	connect: vi.fn().mockResolvedValue({ auth: {}, db: {}, uid: 'u1', app: {} })
}));

vi.mock('firebase/database', () => ({
	ref: vi.fn(() => ({})),
	get: getMock
}));

import { classifyRulesProbeResult, checkLiveRules } from '$lib/net/rulesLive';

describe('netProblem & rulesLive classification', () => {
	it('classifies offline state, emulator failure, chunk reload, rules denial, and mismatch', () => {
		expect(classifyNetProblem(new Error('network-request-failed')).kind).toBe('offline');
		expect(classifyNetProblem(new Error('anything'), { online: false }).kind).toBe('offline');
		expect(
			classifyNetProblem(new Error('Firebase emulator is not running (npm run emulators)')).kind
		).toBe('emulator');
		expect(
			classifyNetProblem(new Error('Failed to fetch dynamically imported module /app.js')).kind
		).toBe('reload');
		expect(classifyNetProblem(new Error('PERMISSION_DENIED')).kind).toBe('rules');
		expect(classifyNetProblem(new Error('unknown error'), { rulesState: 'stale' }).kind).toBe(
			'rules'
		);
		expect(classifyNetProblem(new Error('Simulation checksum mismatch')).kind).toBe('mismatch');
		expect(classifyNetProblem(new Error('Room AB12CD missing')).kind).toBe('code');
	});

	it('interprets __rulesVersion probe results cleanly', () => {
		expect(classifyRulesProbeResult(true)).toBe('fresh');
		expect(classifyRulesProbeResult(false)).toBe('stale');
		expect(classifyRulesProbeResult(false, new Error('PERMISSION_DENIED'))).toBe('stale');
		expect(classifyRulesProbeResult(false, new Error('rules_probe_timeout'))).toBe('unknown');
	});

	it('checkLiveRules treats empty allowed __rulesVersion sentinel read as fresh and PERMISSION_DENIED as stale', async () => {
		getMock.mockResolvedValueOnce({
			exists: () => false,
			val: () => null
		});
		await expect(checkLiveRules(500)).resolves.toBe('fresh');

		getMock.mockRejectedValueOnce(new Error('PERMISSION_DENIED'));
		await expect(checkLiveRules(500)).resolves.toBe('stale');
	});
});
