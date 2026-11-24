import { describe, it, expect } from 'vitest';
import type { ArmorType } from '../engine/types';
import { Simulation } from '../engine/simulation';
import { BUILDINGS_MAP } from '../engine/gameData';
import { BuildingRenderer } from './buildingRenderer';
import type { Graphics } from 'pixi.js';

describe('BuildingRenderer 2.5D Stylized Architectural Models', () => {
	it('renders all special and military building archetypes cleanly without throwing', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 5000 });
		const renderer = new BuildingRenderer(sim);

		const specialIds = [
			'cg10_shop',
			'cg11_forge',
			'cg12_commander',
			'h008',
			'cg09_repair',
			'cg07_recycler',
			'h006'
		];
		for (let i = 0; i < specialIds.length; i++) {
			const id = specialIds[i];
			sim.buildings.push({
				instanceId: `spec_${i}`,
				defId: id,
				name: id,
				team: 'west',
				tileX: 10 + i * 2,
				tileY: 20,
				x: (10 + i * 2) * 32,
				y: 640,
				hp: 500,
				maxHp: 500,
				armor: 2,
				armorType: 'fort',
				goldCost: 100,
				spawnUnitId: '',
				spawnCooldown: 0,
				spawnTimer: 0,
				lane: 'mid',
				upgradeFrom: null,
				race: 'Альянс',
				specialType:
					id === 'cg10_shop'
						? 'shop'
						: id === 'cg11_forge'
							? 'forge'
							: id === 'cg12_commander'
								? 'commander'
								: id === 'h008'
									? 'treasure'
									: id === 'cg09_repair'
										? 'repair'
										: id === 'cg07_recycler'
											? 'recycler'
											: 'tower'
			});
		}

		// Also add Fountain, Obelisk & Representative Race Buildings across archetypes
		sim.buildings.push(
			{
				instanceId: 'spec_fountain',
				defId: 'h03L',
				name: 'Фонтан Життя',
				team: 'west',
				tileX: 24,
				tileY: 20,
				x: 768,
				y: 640,
				hp: 600,
				maxHp: 600,
				armor: 2,
				armorType: 'fort',
				goldCost: 200,
				spawnUnitId: '',
				spawnCooldown: 0,
				spawnTimer: 0,
				lane: 'mid',
				upgradeFrom: null,
				race: 'Наги',
				specialType: 'special'
			},
			{
				instanceId: 'spec_obelisk',
				defId: 'h005',
				name: 'Обеліск Світла',
				team: 'east',
				tileX: 160,
				tileY: 20,
				x: 5120,
				y: 640,
				hp: 600,
				maxHp: 600,
				armor: 2,
				armorType: 'fort',
				goldCost: 250,
				spawnUnitId: '',
				spawnCooldown: 0,
				spawnTimer: 0,
				lane: 'mid',
				upgradeFrom: null,
				race: 'Ельфи',
				specialType: 'special'
			},
			{
				instanceId: 'orc_tent',
				defId: 'h02B',
				name: 'Шаманське шатро',
				team: 'west',
				tileX: 28,
				tileY: 22,
				x: 896,
				y: 704,
				hp: 500,
				maxHp: 500,
				armor: 2,
				armorType: 'fort',
				goldCost: 140,
				spawnUnitId: 'o003',
				spawnCooldown: 10,
				spawnTimer: 5,
				lane: 'mid',
				upgradeFrom: null,
				race: 'Орки'
			},
			{
				instanceId: 'north_igloo',
				defId: 'h03U',
				name: 'Іглу',
				team: 'west',
				tileX: 30,
				tileY: 22,
				x: 960,
				y: 704,
				hp: 500,
				maxHp: 500,
				armor: 2,
				armorType: 'fort',
				goldCost: 150,
				spawnUnitId: 'n011',
				spawnCooldown: 10,
				spawnTimer: 3,
				lane: 'mid',
				upgradeFrom: null,
				race: 'Північ'
			},
			{
				instanceId: 'chaos_portal',
				defId: 'h007',
				name: 'Брама демонів',
				team: 'east',
				tileX: 150,
				tileY: 22,
				x: 4800,
				y: 704,
				hp: 800,
				maxHp: 800,
				armor: 3,
				armorType: 'fort',
				goldCost: 300,
				spawnUnitId: 'n000',
				spawnCooldown: 12,
				spawnTimer: 6,
				lane: 'mid',
				upgradeFrom: null,
				race: 'Хаос'
			},
			{
				instanceId: 'tech_tank',
				defId: 'h05X',
				name: 'Танкова Фабрика',
				team: 'west',
				tileX: 32,
				tileY: 22,
				x: 1024,
				y: 704,
				hp: 650,
				maxHp: 650,
				armor: 4,
				armorType: 'fort',
				goldCost: 180,
				spawnUnitId: 'h06T',
				spawnCooldown: 14,
				spawnTimer: 7,
				lane: 'mid',
				upgradeFrom: null,
				race: 'Техніки'
			}
		);

		const noop = () => {};
		const mockGraphics = {
			clear: noop,
			beginPath: noop,
			circle: noop,
			ellipse: noop,
			poly: noop,
			fill: noop,
			stroke: noop,
			rect: noop,
			roundRect: noop,
			moveTo: noop,
			lineTo: noop,
			arc: noop
		} as unknown as Graphics;

		expect(() => renderer.drawBuildingsLayer(mockGraphics, 'spec_0', false)).not.toThrow();
	});

	it('renders every building definition from BUILDINGS_MAP cleanly across west & east teams', () => {
		const sim = new Simulation({ botDifficulty: 0, startGold: 5000 });
		const renderer = new BuildingRenderer(sim);
		let idx = 0;
		for (const def of BUILDINGS_MAP.values()) {
			const team = idx % 2 === 0 ? 'west' : 'east';
			sim.buildings.push({
				instanceId: `all_${def.id}`,
				defId: def.id,
				name: def.name,
				team,
				tileX: 10 + (idx % 20) * 2,
				tileY: 10 + Math.floor(idx / 20) * 2,
				x: (10 + (idx % 20) * 2) * 32,
				y: (10 + Math.floor(idx / 20) * 2) * 32,
				hp: def.hp || 500,
				maxHp: def.hp || 500,
				armor: def.armor || 2,
				armorType: (def.armor_type || 'fort') as ArmorType,
				goldCost: def.gold_cost || 100,
				spawnUnitId: def.unit || '',
				spawnCooldown: def.cooldown || 0,
				spawnTimer: 2,
				lane: 'mid',
				upgradeFrom: def.upgrade_from ?? null,
				race: def.race ?? 'Альянс',
				specialType: def.specialType
			});
			idx++;
		}

		const noop = () => {};
		const mockGraphics = {
			clear: noop,
			beginPath: noop,
			circle: noop,
			ellipse: noop,
			poly: noop,
			fill: noop,
			stroke: noop,
			rect: noop,
			roundRect: noop,
			moveTo: noop,
			lineTo: noop,
			arc: noop
		} as unknown as Graphics;

		expect(sim.buildings.length).toBeGreaterThan(100);
		expect(() => renderer.drawBuildingsLayer(mockGraphics, null, false)).not.toThrow();
	});

	it('draws vertical spawn progress bar filling upward from empty (start of cooldown) to full (ready to spawn)', () => {
		const measureFillHeight = (spawnTimer: number, spawnCooldown: number): number => {
			const sim = new Simulation({ botDifficulty: 0, startGold: 500 });
			const renderer = new BuildingRenderer(sim);
			sim.buildings.push({
				instanceId: 'prog_bld',
				defId: 'h02B',
				name: 'Шаманське шатро',
				team: 'west',
				tileX: 28,
				tileY: 22,
				x: 896,
				y: 704,
				hp: 500,
				maxHp: 500,
				armor: 2,
				armorType: 'fort',
				goldCost: 140,
				spawnUnitId: 'o003',
				spawnCooldown,
				spawnTimer,
				lane: 'mid',
				upgradeFrom: null,
				race: 'Орки'
			});

			let lastRoundRect: { x: number; w: number; h: number } | null = null;
			let cyanFillHeight = 0;
			const noop = () => {};
			const mockGraphics = {
				clear: noop,
				beginPath: noop,
				circle: noop,
				ellipse: noop,
				poly: noop,
				stroke: noop,
				rect: noop,
				moveTo: noop,
				lineTo: noop,
				arc: noop,
				roundRect: (x: number, _y: number, w: number, h: number) => {
					lastRoundRect = { x, w, h };
				},
				fill: (opts?: { color?: number }) => {
					// Filter strictly to the vertical spawn progress bar fill along the building's right edge (w === 4, x > b.x + 64)
					if (
						opts?.color === 0x38bdf8 &&
						lastRoundRect &&
						lastRoundRect.x > 896 &&
						lastRoundRect.w === 4
					) {
						cyanFillHeight = lastRoundRect.h;
					}
				}
			} as unknown as Graphics;

			renderer.drawBuildingsLayer(mockGraphics, null, false);
			return cyanFillHeight;
		};

		const emptyAtStart = measureFillHeight(10, 10);
		const halfWay = measureFillHeight(5, 10);
		const fullAtSpawn = measureFillHeight(0, 10);

		expect(emptyAtStart).toBe(0);
		expect(halfWay).toBeGreaterThan(emptyAtStart);
		expect(fullAtSpawn).toBeGreaterThan(halfWay);
	});
});
