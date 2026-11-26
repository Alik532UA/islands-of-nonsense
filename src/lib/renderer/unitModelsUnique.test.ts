import { describe, it, expect } from 'vitest';
import { Graphics } from 'pixi.js';
import unitsJson from '$lib/data/units.json';
import type { ArmorType, AttackType, Unit, UnitAbilityType } from '$lib/engine/types';
import { shadeHexColor } from './buildingModels';
import { renderUniqueUnitModel, UNIT_VISUAL_SPECS } from './unitModels';

function serializeUnitInstructions(g: Graphics): string {
	return JSON.stringify(
		g.context.instructions.map((ins) => {
			const data = ins.data as {
				style?: { color?: number; alpha?: number; width?: number };
				path?: { instructions?: unknown[] };
			};
			return {
				a: ins.action,
				c: data.style?.color,
				al: data.style?.alpha,
				w: data.style?.width,
				p: data.path?.instructions
			};
		})
	);
}

describe('Unit Models Uniqueness', () => {
	it('renders every unit in units.json with a unique visual signature', () => {
		const signatures = new Map<string, string[]>();
		const rawList = Object.values(unitsJson as unknown as Record<string, Record<string, unknown>>);

		for (const raw of rawList) {
			const defId = String(raw.id ?? '');
			expect(UNIT_VISUAL_SPECS[defId]).toBeDefined();
			const g = new Graphics();
			const hp = Number(raw.hp ?? 200);
			const mockU: Unit = {
				instanceId: `u_${defId}`,
				defId,
				name: String(raw.name ?? defId),
				team: 'west',
				lane: 'top',
				x: 100,
				y: 100,
				prevX: 100,
				prevY: 100,
				hp,
				maxHp: hp,
				armor: Number(raw.armor ?? 0),
				armorType: (raw.armor_type as ArmorType) ?? 'medium',
				attackType: (raw.attack_type as AttackType) ?? 'normal',
				damageMin: Number(raw.damage_base ?? 15),
				damageMax: Number(raw.damage_base ?? 15) + 4,
				damageBonusPct: 0,
				armorBonus: 0,
				attackCooldown: Number(raw.cooldown ?? 1.2),
				cooldownTimer: 0,
				range: Number(raw.range ?? 100),
				speed: 220,
				flying: Boolean(raw.flying),
				currentTargetId: null,
				targetX: 100,
				targetY: 100,
				size: 16,
				abilityType: raw.ability_type as UnitAbilityType | undefined,
				state: 'WALKING',
				buffs: []
			};
			renderUniqueUnitModel(g, mockU, 0x2563eb, false, 100, 1, 0, 1.5, shadeHexColor);
			const sig = serializeUnitInstructions(g);
			const list = signatures.get(sig) ?? [];
			list.push(`${defId}:${mockU.name}`);
			signatures.set(sig, list);
		}

		const duplicates = [...signatures.values()].filter((list) => list.length > 1);
		expect(duplicates).toEqual([]);
	});
});
