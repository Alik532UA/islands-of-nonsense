import { describe, it, expect, beforeEach } from 'vitest';
import { RaceRegistry, type CustomRaceDefinition } from './raceRegistry.js';
import {
	PLAYABLE_RACES,
	RACES_LIST,
	getAllPlayableRaces,
	getBaseBuildingsForRace
} from './gameData';
import { getRaceAbility } from './raceAbilities';
import { getRacePalette } from '../renderer/buildingModels';

describe('RaceRegistry & Extensible Faction Verification', () => {
	let registry: RaceRegistry;

	const validRace: CustomRaceDefinition = {
		id: 'celestial',
		name: 'Celestial Vanguard',
		description: 'Holy warriors hailing from the high spires',
		commander: 'Archon Michael',
		version: '1.0.0',
		buildings: {
			tier1: [
				{
					id: 'holy_sanctum',
					name: 'Holy Sanctum',
					cost: 150,
					hp: 600,
					damage: 18,
					range: 350,
					attackSpeed: 1.2,
					moveSpeed: 300,
					armorType: 'heavy',
					attackType: 'magic'
				}
			]
		}
	};

	beforeEach(() => {
		registry = RaceRegistry.getInstance();
		registry.clear();
	});

	it('should register a valid custom race definition', () => {
		const success = registry.register(validRace);
		expect(success).toBe(true);
		expect(registry.has('celestial')).toBe(true);

		const fetched = registry.get('celestial');
		expect(fetched?.name).toBe('Celestial Vanguard');
		expect(fetched?.buildings.tier1.length).toBe(1);
	});

	it('should reject invalid race without tier1 buildings', () => {
		const badRace = {
			id: 'empty_race',
			name: 'Empty',
			description: 'No units',
			commander: 'None',
			version: '1.0',
			buildings: { tier1: [] }
		} as unknown as CustomRaceDefinition;

		const success = registry.register(badRace);
		expect(success).toBe(false);
		expect(registry.has('empty_race')).toBe(false);
	});

	it('should list all registered races', () => {
		registry.register(validRace);
		const list = registry.list();
		expect(list.length).toBe(1);
		expect(list[0].id).toBe('celestial');
	});

	it('enforces the canonical 12 playable races across data, abilities, and building visuals', () => {
		const expectedCanonicalRaces = [
			'Нежить',
			'Орки',
			'Демони',
			'Техніки',
			'Північ',
			'Ельфи',
			'Небожителі',
			'Тролі',
			'Елементалі',
			'Тварини',
			'Наги',
			'Альянс'
		] as const;

		expect(PLAYABLE_RACES).toEqual(expectedCanonicalRaces);

		for (const race of PLAYABLE_RACES) {
			expect(RACES_LIST.some((r) => r.race === race)).toBe(true);
			expect(getRaceAbility(race).race).toBe(race);
			expect(getBaseBuildingsForRace(race).length).toBeGreaterThanOrEqual(11);
			expect(getRacePalette(race).style).toBe(race);
		}
	});

	it('wires RaceRegistry custom races into getAllPlayableRaces and getBaseBuildingsForRace', () => {
		registry.register(validRace);

		expect(getAllPlayableRaces()).toContain('Celestial Vanguard');
		const buildings = getBaseBuildingsForRace('Celestial Vanguard');
		expect(buildings).toHaveLength(1);
		expect(buildings[0].id).toBe('holy_sanctum');
		expect(buildings[0].gold_cost).toBe(150);
	});
});
