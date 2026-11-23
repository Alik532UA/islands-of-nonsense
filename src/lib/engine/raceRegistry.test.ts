import { describe, it, expect, beforeEach } from 'vitest';
import { RaceRegistry, type CustomRaceDefinition } from './raceRegistry.js';

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
});
