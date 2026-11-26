import { describe, it, expect } from 'vitest';
import unitsJson from '../data/units.json';
import { UNIT_VISUAL_SPECS, getUnitVisualSpec } from './unitModels';

describe('UNIT-MODELS-UNIQUENESS: Every unit has a unique 2.5D visual model without repetitions', () => {
	it('covers 100% of units in units.json', () => {
		const rawList = Array.isArray(unitsJson)
			? (unitsJson as Array<{ id: string }>)
			: Object.values(unitsJson as unknown as Record<string, { id: string }>);
		const allUnitIds = rawList.map((u) => u.id);
		expect(allUnitIds.length).toBeGreaterThanOrEqual(100);
		expect(Object.keys(UNIT_VISUAL_SPECS).length).toBe(allUnitIds.length);
		for (const id of allUnitIds) {
			expect(UNIT_VISUAL_SPECS[id]).toBeDefined();
		}
	});

	it('assigns a strictly unique visual signature to every unit (zero duplicates)', () => {
		const seen = new Map<string, string[]>();
		for (const [defId, spec] of Object.entries(UNIT_VISUAL_SPECS)) {
			const list = seen.get(spec.signature) ?? [];
			list.push(defId);
			seen.set(spec.signature, list);
		}
		const duplicates = [...seen.entries()].filter(([, ids]) => ids.length > 1);
		expect(duplicates).toEqual([]);
	});

	it('resolves unique specs via getUnitVisualSpec(unit)', () => {
		const sampleA = getUnitVisualSpec({
			defId: 'h03C',
			name: 'Паладин',
			flying: false,
			attackType: 'hero',
			armorType: 'large',
			maxHp: 1030,
			range: 100
		});
		const sampleB = getUnitVisualSpec({
			defId: 'e001',
			name: 'Мисливиця',
			flying: false,
			attackType: 'pierce',
			armorType: 'medium',
			maxHp: 545,
			range: 800
		});
		expect(sampleA.signature).not.toBe(sampleB.signature);
	});
});
