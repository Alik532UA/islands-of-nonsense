import { describe, it, expect } from 'vitest';
import { getBaseBuildingsForRace, RACES_LIST } from './gameData';
import { Simulation } from './simulation';

describe('13 Base Buildings Canon (11 reference + Shop + Forge)', () => {
	it('returns exactly 13 buildings for every single playable race', () => {
		for (const raceDef of RACES_LIST) {
			const buildings = getBaseBuildingsForRace(raceDef.race);
			expect(buildings.length, `Race ${raceDef.race} must have exactly 13 buildings`).toBe(13);

			// Must contain Shop and Forge
			expect(
				buildings.some((b) => b.id === 'cg10_shop'),
				`Race ${raceDef.race} must have Магазин (cg10_shop)`
			).toBe(true);
			expect(
				buildings.some((b) => b.id === 'cg11_forge'),
				`Race ${raceDef.race} must have Кузня (cg11_forge)`
			).toBe(true);

			// Must contain exactly 6 army spawners and 7 specials
			const army = buildings.filter((b) => !b.specialType);
			const specials = buildings.filter((b) => Boolean(b.specialType));
			expect(army.length, `Race ${raceDef.race} must have 6 army spawners`).toBe(6);
			expect(specials.length, `Race ${raceDef.race} must have 7 specials`).toBe(7);

			// For the 10 WC3 reference races, verify all 11 buildings from races.json are present
			if (raceDef.buildings.length === 11) {
				for (const refId of raceDef.buildings) {
					expect(
						buildings.some((b) => b.id === refId),
						`Building ${refId} from reference races.json for ${raceDef.race} must be present`
					).toBe(true);
				}
			}
		}
	});

	it('safely handles in_game race parameter defaulting to Люди with 13 buildings', () => {
		const inGameBuildings = getBaseBuildingsForRace('in_game');
		expect(inGameBuildings.length).toBe(13);

		const humanBuildings = getBaseBuildingsForRace('Люди');
		expect(inGameBuildings.map((b) => b.id)).toEqual(humanBuildings.map((b) => b.id));
	});

	it('ensures Simulation never sets player race to in_game string', () => {
		const sim = new Simulation({
			westRace: 'in_game',
			eastRace: 'Люди',
			botDifficulty: 0,
			startGold: 500
		});

		expect(sim.players.west.race).not.toBe('in_game');
		expect(sim.players.west.race).toBe('Люди');
		expect(sim.players.west.worker?.name).toBe('Будівельник Людей');

		// setPlayerRace with 'in_game' must be rejected
		const res = sim.setPlayerRace('west', 'in_game');
		expect(res).toBe(false);
		expect(sim.players.west.race).toBe('Люди');
	});
});
