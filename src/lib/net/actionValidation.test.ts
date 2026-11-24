// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { validatePlayerMove } from './actionValidation';

describe('actionValidation (безпека та валідація дій гравця)', () => {
	it('дозволяє коректну команду будівництва', () => {
		const raw = {
			seq: 1,
			by: 'user_123',
			type: 'BUILD',
			payload: {
				tick: 10,
				team: 'west',
				buildingType: 'h05X',
				x: 25,
				y: 20
			}
		};

		const result = validatePlayerMove(raw);
		expect(result.valid).toBe(true);
		expect(result.sanitized?.payload?.buildingType).toBe('h05X');
		expect(result.sanitized?.payload?.x).toBe(25);
	});

	it('відхиляє невалідний тип дії', () => {
		const raw = {
			seq: 1,
			by: 'user_123',
			type: 'EXECUTE_ARBITRARY_CODE',
			payload: {}
		};

		const result = validatePlayerMove(raw);
		expect(result.valid).toBe(false);
		expect(result.error).toContain('Unsupported or unknown action type');
	});

	it('відхиляє координати за межами сітки (anti-overflow/anti-cheat)', () => {
		const outOfBoundsX = {
			seq: 2,
			by: 'user_123',
			type: 'BUILD',
			payload: {
				tick: 15,
				team: 'east',
				buildingType: 'h008',
				x: 9999, // out of bounds
				y: 10
			}
		};

		const result = validatePlayerMove(outOfBoundsX);
		expect(result.valid).toBe(false);
		expect(result.error).toContain('grid bounds');
	});

	it('відхиляє відʼємний або нецілий sequence number', () => {
		const badSeq = {
			seq: -5,
			by: 'user_123',
			type: 'USE_ABILITY',
			payload: {}
		};

		expect(validatePlayerMove(badSeq).valid).toBe(false);
		expect(validatePlayerMove({ ...badSeq, seq: 1.5 }).valid).toBe(false);
	});

	it('перевіряє валідність контрольної суми симуляції', () => {
		const validChecksum = {
			seq: 10,
			by: 'user_123',
			type: 'CHECKSUM',
			payload: {
				tick: 120,
				checksum: '1a2b3c4d'
			}
		};

		expect(validatePlayerMove(validChecksum).valid).toBe(true);

		const malformedChecksum = {
			seq: 11,
			by: 'user_123',
			type: 'CHECKSUM',
			payload: {
				tick: 120,
				checksum: 'not-a-hex-hash!@#$'
			}
		};

		expect(validatePlayerMove(malformedChecksum).valid).toBe(false);
	});

	it('валідує itemId та forgeType для покупок і кузні', () => {
		const validItem = validatePlayerMove({
			seq: 12,
			by: 'user_123',
			type: 'BUY_ITEM',
			payload: { tick: 20, team: 'west', itemId: 'cheese_blade' }
		});
		expect(validItem.valid).toBe(true);
		expect(validItem.sanitized?.payload?.itemId).toBe('cheese_blade');

		const badItem = validatePlayerMove({
			seq: 13,
			by: 'user_123',
			type: 'BUY_ITEM',
			payload: { tick: 20, team: 'west', itemId: '<script>' }
		});
		expect(badItem.valid).toBe(false);

		const validForge = validatePlayerMove({
			seq: 14,
			by: 'user_123',
			type: 'UPGRADE_FORGE',
			payload: { tick: 20, team: 'east', forgeType: 'attack' }
		});
		expect(validForge.valid).toBe(true);
		expect(validForge.sanitized?.payload?.forgeType).toBe('attack');

		const badForge = validatePlayerMove({
			seq: 15,
			by: 'user_123',
			type: 'UPGRADE_FORGE',
			payload: { tick: 20, team: 'east', forgeType: 'godmode' }
		});
		expect(badForge.valid).toBe(false);
	});
});
