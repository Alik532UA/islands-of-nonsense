import { describe, it, expect } from 'vitest';
import { ReplaySerializer, type MatchReplayData } from './replaySerializer.js';

describe('ReplaySerializer (Deterministic Match Serialization)', () => {
	const sampleMatch: MatchReplayData = {
		version: '1.0.0',
		mapId: 'classic_bridges',
		gameMode: 'standard',
		timestamp: 1700000000000,
		randomSeed: 424242,
		westCommander: 'commander_human',
		eastCommander: 'commander_orc',
		actions: [
			{
				tick: 10,
				team: 'west',
				actionType: 'BUILD',
				payload: { buildingType: 'barracks', x: 200, y: 400 }
			},
			{
				tick: 25,
				team: 'east',
				actionType: 'BUILD',
				payload: { buildingType: 'orc_burrow', x: 600, y: 400 }
			}
		],
		result: {
			winner: 'west',
			totalTicks: 1200,
			westCastleHp: 3200,
			eastCastleHp: 0
		}
	};

	it('should serialize match data to JSON string', () => {
		const serialized = ReplaySerializer.serialize(sampleMatch);
		expect(typeof serialized).toBe('string');
		expect(serialized).toContain('"version":"1.0.0"');
		expect(serialized).toContain('"checksum":');
	});

	it('should deserialize serialized replay data accurately', () => {
		const serialized = ReplaySerializer.serialize(sampleMatch);
		const result = ReplaySerializer.deserialize(serialized);

		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
		expect(result.data?.actions.length).toBe(2);
		expect(result.data?.westCommander).toBe('commander_human');
		expect(result.data?.result?.winner).toBe('west');
	});

	it('should reject malformed JSON', () => {
		const badJson = '{"version": "1.0", broken}';
		const result = ReplaySerializer.deserialize(badJson);
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('should reject replay data with tampered checksum', () => {
		const serialized = ReplaySerializer.serialize(sampleMatch);
		const parsed = JSON.parse(serialized);
		parsed.checksum = 'tampered_hash_123';

		const result = ReplaySerializer.deserialize(JSON.stringify(parsed));
		expect(result.success).toBe(false);
		expect(result.error).toContain('checksum mismatch');
	});
});
