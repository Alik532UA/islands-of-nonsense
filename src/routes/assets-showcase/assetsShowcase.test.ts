import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { Graphics } from 'pixi.js';
import unitsJson from '$lib/data/units.json';
import { PLAYABLE_RACES, getBaseBuildingsForRace, isLegendaryBuilding } from '$lib/engine/gameData';
import { drawRaceWorkerModel } from '$lib/renderer/workerModels';
import { drawIndividualBuildingModel, shadeHexColor } from '$lib/renderer/buildingModels';
import { renderUniqueUnitModel } from '$lib/renderer/unitModels';
import type { ArmorType, AttackType, Building, Unit, UnitAbilityType } from '$lib/engine/types';

describe('Assets Showcase Route (/assets-showcase)', () => {
	it('exists and renders all races, buildings, units, and castle stages', () => {
		const pagePath = path.resolve('src/routes/assets-showcase/+page.svelte');
		expect(existsSync(pagePath)).toBe(true);
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toContain("import 'pixi.js/unsafe-eval'");
		expect(src).toContain('PLAYABLE_RACES');
		expect(src).toContain('drawRaceWorkerModel');
		expect(src).toContain('drawIndividualBuildingModel');
		expect(src).toContain('renderUniqueUnitModel');
		expect(src).toContain('WEST_CASTLE_STAGE_URLS');
		expect(src).toContain('EAST_CASTLE_STAGE_URLS');
		expect(src).toContain('data-testid="assets-showcase-autoplay-voices-btn"');
		expect(src).toContain('data-testid="assets-showcase-voice-panel"');
		expect(src).toContain('playVoiceSequenceForItem');
	});

	it('draws all 12 workers, all race buildings, and all units onto Pixi Graphics without throwing', () => {
		const g = new Graphics();

		for (let i = 0; i < PLAYABLE_RACES.length; i++) {
			const race = PLAYABLE_RACES[i];
			drawRaceWorkerModel({
				g,
				wx: 64 + i * 80,
				wy: 64,
				bob: 0,
				facing: 1,
				isMoving: true,
				isSwinging: false,
				slot: i + 1,
				time: 1.5,
				playerColor: 0x2563eb,
				race
			});

			for (const bld of getBaseBuildingsForRace(race)) {
				const mockB: Building = {
					instanceId: `b_${race}_${bld.id}`,
					defId: bld.id,
					name: bld.name,
					team: 'west',
					tileX: 0,
					tileY: 0,
					x: 100,
					y: 100,
					armor: 5,
					armorType: 'fort',
					spawnUnitId: bld.unit ?? '',
					lane: 'top',
					upgradeFrom: null,
					spawnCooldown: bld.cooldown ?? 10,
					spawnTimer: 5,
					hp: 1000,
					maxHp: 1000,
					goldCost: bld.gold_cost ?? 200,
					lumberCost: bld.lumber_cost ?? 0,
					race,
					specialType: bld.specialType,
					isUnderConstruction: false
				};
				drawIndividualBuildingModel(
					g,
					mockB,
					0x2563eb,
					1,
					false,
					isLegendaryBuilding(bld),
					false,
					1.5
				);
			}
		}

		for (const raw of Object.values(
			unitsJson as unknown as Record<string, Record<string, unknown>>
		)) {
			const defId = String(raw.id ?? '');
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
		}

		expect(g.context.instructions.length).toBeGreaterThan(100);
	});
});
