import { describe, it, expect } from 'vitest';
import { Graphics } from 'pixi.js';
import {
	PLAYABLE_RACES,
	getBaseBuildingsForRace,
	getUpgradesForBuilding,
	isLegendaryBuilding
} from '$lib/engine/gameData';
import type { Building } from '$lib/engine/types';
import { drawIndividualBuildingModel } from './buildingModels';

const ALLOWED_SHARED_IDS = new Set(['cg10_shop', 'cg11_forge', 'h008', 'cg12_commander']);

function serializeBuildingInstructions(g: Graphics): string {
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

describe('Building Models Uniqueness', () => {
	it('renders every non-shared race building and upgrade with a unique visual signature', () => {
		const signatures = new Map<string, string[]>();
		const seenIds = new Set<string>();

		for (const race of PLAYABLE_RACES) {
			const baseBlds = getBaseBuildingsForRace(race);
			const allBlds = [
				...baseBlds.map((b) => ({ b, up: false })),
				...baseBlds.flatMap((b) => getUpgradesForBuilding(b.id).map((u) => ({ b: u, up: true })))
			];

			for (const { b, up } of allBlds) {
				if (ALLOWED_SHARED_IDS.has(b.id) || seenIds.has(b.id)) continue;
				seenIds.add(b.id);
				const g = new Graphics();
				const mockB: Building = {
					instanceId: `test_${race}_${b.id}`,
					defId: b.id,
					name: b.name,
					team: 'west',
					tileX: 0,
					tileY: 0,
					x: 100,
					y: 100,
					armor: 5,
					armorType: 'fort',
					spawnUnitId: b.unit ?? '',
					lane: 'top',
					upgradeFrom: null,
					spawnCooldown: b.cooldown ?? 10,
					spawnTimer: 5,
					hp: 1000,
					maxHp: 1000,
					goldCost: b.gold_cost ?? 200,
					lumberCost: b.lumber_cost ?? 0,
					race,
					specialType: b.specialType,
					isUnderConstruction: false
				};
				drawIndividualBuildingModel(
					g,
					mockB,
					0x2563eb,
					up ? 2 : 1,
					up,
					isLegendaryBuilding(b),
					false,
					1.5
				);
				const sig = serializeBuildingInstructions(g);
				const list = signatures.get(sig) ?? [];
				list.push(`${race}:${b.id}:${b.name}`);
				signatures.set(sig, list);
			}
		}

		const duplicates = [...signatures.values()].filter((list) => list.length > 1);
		expect(duplicates).toEqual([]);
	});

	it('ensures every unit-spawning base building across all 12 races has at least one upgrade', () => {
		const missing: string[] = [];
		for (const race of PLAYABLE_RACES) {
			for (const b of getBaseBuildingsForRace(race)) {
				if (!b.unit) continue;
				if (getUpgradesForBuilding(b.id).length === 0) {
					missing.push(`${race}:${b.id}:${b.name}`);
				}
			}
		}
		expect(missing).toEqual([]);
	});
});
