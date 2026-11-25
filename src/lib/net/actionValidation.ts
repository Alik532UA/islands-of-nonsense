import type { Move, MovePayload } from './roomTypes';

export const VALID_ACTION_TYPES = [
	'BUILD',
	'UPGRADE',
	'SELL',
	'REPAIR',
	'CONTINUE_BUILD',
	'MOVE_WORKER',
	'ORDER_WORKER_MOVE',
	'USE_ABILITY',
	'BUY_ITEM',
	'UPGRADE_FORGE',
	'SELECT_COMMANDER',
	'BRIDGE_REPAIR',
	'RESCUE_STRIKE',
	'SURRENDER',
	'PAUSE',
	'RESUME',
	'NEXT_ROUND',
	'RESTART_MATCH',
	'HEARTBEAT',
	'CHECKSUM',
	'CHAT',
	'lead'
] as const;

export type ValidActionType = (typeof VALID_ACTION_TYPES)[number];

export interface ValidationResult {
	valid: boolean;
	error?: string;
	sanitized?: Move;
}

/**
 * Валідатор і санітизатор клієнтських та мережевих дій гравця (SECURITY-v10).
 * Запобігає ін'єкціям шкідливих пейлоадів, переповненню координат та невалідним командам.
 */
export function validatePlayerMove(raw: unknown): ValidationResult {
	if (!raw || typeof raw !== 'object') {
		return { valid: false, error: 'Move must be a non-null object' };
	}

	const m = raw as Record<string, unknown>;

	if (typeof m.seq !== 'number' || !Number.isInteger(m.seq) || m.seq < 1 || m.seq > 999999) {
		return { valid: false, error: 'Invalid sequence number' };
	}

	if (typeof m.by !== 'string' || m.by.trim().length === 0 || m.by.length > 128) {
		return { valid: false, error: 'Invalid player UID' };
	}

	if (typeof m.type !== 'string' || !VALID_ACTION_TYPES.includes(m.type as ValidActionType)) {
		return { valid: false, error: `Unsupported or unknown action type: ${String(m.type)}` };
	}

	const p = (m.payload && typeof m.payload === 'object' ? m.payload : {}) as Record<
		string,
		unknown
	>;
	const sanitizedPayload: Partial<MovePayload> = {};

	if ('tick' in p) {
		if (typeof p.tick !== 'number' || p.tick < 0 || !Number.isFinite(p.tick)) {
			return { valid: false, error: 'Payload tick must be a non-negative finite number' };
		}
		sanitizedPayload.tick = Math.floor(p.tick);
	}

	if ('team' in p) {
		if (p.team !== 'west' && p.team !== 'east') {
			return { valid: false, error: 'Payload team must be either west or east' };
		}
		sanitizedPayload.team = p.team;
	}

	if ('buildingType' in p) {
		if (
			typeof p.buildingType !== 'string' ||
			p.buildingType.length > 16 ||
			!/^[a-zA-Z0-9_]+$/.test(p.buildingType)
		) {
			return { valid: false, error: 'Invalid buildingType format' };
		}
		sanitizedPayload.buildingType = p.buildingType;
	}

	if ('x' in p) {
		if (typeof p.x !== 'number' || p.x < -60 || p.x > 120 || !Number.isFinite(p.x)) {
			return { valid: false, error: 'Coordinate x is outside allowable grid bounds [-60, 120]' };
		}
		sanitizedPayload.x = Math.round(p.x);
	}

	if ('y' in p) {
		if (typeof p.y !== 'number' || p.y < 0 || p.y > 70 || !Number.isFinite(p.y)) {
			return { valid: false, error: 'Coordinate y is outside allowable grid bounds [0, 70]' };
		}
		sanitizedPayload.y = Math.round(p.y);
	}

	if ('worldX' in p) {
		if (
			typeof p.worldX !== 'number' ||
			p.worldX < 0 ||
			p.worldX > 8000 ||
			!Number.isFinite(p.worldX)
		) {
			return { valid: false, error: 'Coordinate worldX is outside arena bounds [0, 8000]' };
		}
		sanitizedPayload.worldX = Math.round(p.worldX);
	}

	if ('worldY' in p) {
		if (
			typeof p.worldY !== 'number' ||
			p.worldY < 0 ||
			p.worldY > 3000 ||
			!Number.isFinite(p.worldY)
		) {
			return { valid: false, error: 'Coordinate worldY is outside arena bounds [0, 3000]' };
		}
		sanitizedPayload.worldY = Math.round(p.worldY);
	}

	if ('shiftKey' in p) {
		sanitizedPayload.shiftKey = Boolean(p.shiftKey);
	}

	if ('targetId' in p) {
		if (typeof p.targetId !== 'string' || p.targetId.length > 64) {
			return { valid: false, error: 'Target ID exceeds allowable length' };
		}
		sanitizedPayload.targetId = p.targetId.trim();
	}

	if ('checksum' in p) {
		if (
			typeof p.checksum !== 'string' ||
			p.checksum.length > 32 ||
			!/^[a-fA-F0-9]+$/.test(p.checksum)
		) {
			return { valid: false, error: 'Invalid simulation checksum format' };
		}
		sanitizedPayload.checksum = p.checksum;
	}

	if ('clientTime' in p) {
		if (typeof p.clientTime !== 'number' || !Number.isFinite(p.clientTime) || p.clientTime <= 0) {
			return { valid: false, error: 'Invalid clientTime timestamp' };
		}
		sanitizedPayload.clientTime = p.clientTime;
	}

	if ('itemId' in p) {
		if (
			typeof p.itemId !== 'string' ||
			p.itemId.length === 0 ||
			p.itemId.length > 64 ||
			!/^[a-zA-Z0-9_-]+$/.test(p.itemId)
		) {
			return { valid: false, error: 'Invalid itemId format' };
		}
		sanitizedPayload.itemId = p.itemId;
	}

	if ('forgeType' in p) {
		if (p.forgeType !== 'attack' && p.forgeType !== 'armor' && p.forgeType !== 'econ') {
			return { valid: false, error: 'Invalid forgeType value' };
		}
		sanitizedPayload.forgeType = p.forgeType;
	}

	if ('commanderId' in p) {
		const cid = p.commanderId;
		if (
			cid !== 'random' &&
			(typeof cid !== 'number' || !Number.isInteger(cid) || cid < 1 || cid > 6)
		) {
			return { valid: false, error: 'Invalid commanderId value' };
		}
		sanitizedPayload.commanderId = cid;
	}

	if ('playerSlot' in p) {
		if (
			typeof p.playerSlot !== 'number' ||
			!Number.isInteger(p.playerSlot) ||
			p.playerSlot < 1 ||
			p.playerSlot > 14
		) {
			return { valid: false, error: 'Invalid playerSlot value' };
		}
		sanitizedPayload.playerSlot = p.playerSlot;
	}

	if ('race' in p) {
		if (typeof p.race !== 'string' || p.race.length === 0 || p.race.length > 32) {
			return { valid: false, error: 'Invalid race value' };
		}
		sanitizedPayload.race = p.race.trim();
	}

	if ('round' in p) {
		if (typeof p.round !== 'number' || !Number.isInteger(p.round) || p.round < 1 || p.round > 20) {
			return { valid: false, error: 'Invalid round value' };
		}
		sanitizedPayload.round = p.round;
	}

	return {
		valid: true,
		sanitized: {
			seq: m.seq,
			by: m.by.trim(),
			type: m.type,
			payload: sanitizedPayload
		}
	};
}
