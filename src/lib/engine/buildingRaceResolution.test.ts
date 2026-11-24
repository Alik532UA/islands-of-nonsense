import { describe, it, expect } from 'vitest';
import { Simulation } from './simulation';
import {
	PLAYABLE_RACES,
	getBuildingsForRace,
	getBaseBuildingsForRace,
	getBuildingVisualRank,
	getGuardTowerForRace,
	getUpgradesForBuilding,
	resolveBuildingDisplayRace,
	toPlayableRace
} from './gameData';

const LEGACY_RACES = new Set(['Люди', 'Хаос', 'Порча', 'Нічні ельфи', 'Збирачі']);

describe('Canonical Building Race Ownership & Display Resolution', () => {
	it('assigns owner canonical race (never legacy "Нічні ельфи") when Тварини or Небожителі build h00B (Фонтан див)', () => {
		const sim = new Simulation({
			botDifficulty: 0,
			startGold: 5000,
			westRace: 'Тварини',
			eastRace: 'Небожителі'
		});
		sim.players.west.lumber = 1000;
		sim.players.east.lumber = 1000;

		const westPlaced = sim.build('west', 'h00B', 20, 20, undefined, sim.players.west);
		expect(westPlaced).toBe(true);
		const westFountain = sim.buildings.find((b) => b.team === 'west' && b.defId === 'h00B');
		expect(westFountain).toBeDefined();
		expect(westFountain!.race).toBe('Тварини');
		expect(LEGACY_RACES.has(westFountain!.race)).toBe(false);

		const eastPlaced = sim.build('east', 'h00B', 30, 20, undefined, sim.players.east);
		expect(eastPlaced).toBe(true);
		const eastFountain = sim.buildings.find((b) => b.team === 'east' && b.defId === 'h00B');
		expect(eastFountain).toBeDefined();
		expect(eastFountain!.race).toBe('Небожителі');
		expect(LEGACY_RACES.has(eastFountain!.race)).toBe(false);
	});

	it('preserves owner canonical race across upgrades for all 12 PLAYABLE_RACES (never reverts to legacy tags)', () => {
		for (const race of PLAYABLE_RACES) {
			const sim = new Simulation({
				botDifficulty: 0,
				startGold: 10000,
				westRace: race
			});
			sim.players.west.lumber = 5000;
			const baseBuildings = getBaseBuildingsForRace(race);
			const upgradableBase = baseBuildings.find((b) => getUpgradesForBuilding(b.id).length > 0);
			if (!upgradableBase) continue;

			expect(sim.build('west', upgradableBase.id, 20, 20, undefined, sim.players.west)).toBe(true);
			const placed = sim.buildings.find((b) => b.team === 'west' && b.defId === upgradableBase.id)!;
			expect(placed.race).toBe(race);
			expect(LEGACY_RACES.has(placed.race)).toBe(false);

			// Finish construction and upgrade
			placed.isUnderConstruction = false;
			const upgradeDef = getUpgradesForBuilding(upgradableBase.id)[0];
			expect(sim.upgradeBuilding('west', placed.instanceId, upgradeDef.id, sim.players.west)).toBe(
				true
			);
			expect(placed.race).toBe(race);
			expect(LEGACY_RACES.has(placed.race)).toBe(false);
		}
	});

	it('resolveBuildingDisplayRace prefers owning player race and maps legacy snapshots into PLAYABLE_RACES', () => {
		const sim = new Simulation({
			botDifficulty: 0,
			startGold: 500,
			teamSize: 3,
			botVsBot: true,
			westRace: 'Тварини',
			eastRace: 'Ельфи'
		});

		const legacyOwnedBuilding = {
			race: 'Нічні ельфи',
			playerId: sim.players.west.id,
			playerSlot: sim.players.west.slot,
			team: 'west' as const
		};
		expect(resolveBuildingDisplayRace(legacyOwnedBuilding, sim.allPlayers, sim.players)).toBe(
			'Тварини'
		);

		expect(toPlayableRace('Нічні ельфи')).toBe('Ельфи');
		expect(toPlayableRace('Люди')).toBe('Альянс');
		expect(toPlayableRace('Хаос')).toBe('Демони');
		expect(toPlayableRace('Порча')).toBe('Елементалі');
		expect(toPlayableRace('Збирачі')).toBe('Техніки');
	});

	it('getBuildingsForRace and getBuildingVisualRank work for composed new races (Тварини, Небожителі, Тролі, Елементалі)', () => {
		for (const race of ['Тварини', 'Небожителі', 'Тролі', 'Елементалі'] as const) {
			const list = getBuildingsForRace(race);
			expect(list.length).toBeGreaterThanOrEqual(10);
			const armySpawner = list.find((b) => !b.specialType && !b.upgrade_from)!;
			const rankInfo = getBuildingVisualRank(armySpawner.id, race);
			expect(rankInfo.rank).toBeGreaterThanOrEqual(1);
			expect(rankInfo.rank).toBeLessThanOrEqual(6);
		}
	});

	it('selects race-specific guard tower via getGuardTowerForRace for all 12 PLAYABLE_RACES', () => {
		const expectedTowers: Record<string, string> = {
			Тварини: 'h073',
			Небожителі: 'h073',
			Тролі: 'o000',
			Елементалі: 'n01J',
			Демони: 'h01F',
			Альянс: 'h006',
			Нежить: 'h01O',
			Орки: 'o000',
			Техніки: 'h05L',
			Північ: 'h03Q',
			Ельфи: 'h014',
			Наги: 'h00G'
		};

		for (const race of PLAYABLE_RACES) {
			const tower = getGuardTowerForRace(race);
			expect(tower).toBeDefined();
			expect(tower?.specialType).toBe('tower');
			expect(tower?.id).toBe(expectedTowers[race]);
		}
	});

	it('assigns 6 unique PLAYABLE_RACES across all 6 bots in 3v3 even when triggered via modeId: botVsBot', () => {
		const sim = new Simulation({
			botDifficulty: 15,
			startGold: 500,
			teamSize: 3,
			modeId: 'botVsBot'
		});
		expect(sim.allPlayers.length).toBe(6);
		const races = sim.allPlayers.map((p) => toPlayableRace(p.race));
		expect(new Set(races).size).toBe(6);
	});
});
