import { describe, expect, it } from 'vitest';
import { Simulation } from './simulation';
import { computeSimStateChecksum } from '$lib/net/matchSync';
import { getBuildingsForRace } from './gameData';

describe('Online Engine Determinism Stress Verification', () => {
	const racePairs: ReadonlyArray<[string, string, number]> = [
		['Альянс', 'Орки', 10101],
		['Нежить', 'Демони', 20202],
		['Ельфи', 'Техніки', 30303]
	];

	it.each(racePairs)(
		'maintains bit-identical simulation checksums over 3600 combat ticks for %s vs %s (seed %i)',
		(westRace, eastRace, seed) => {
			const makeSim = () =>
				new Simulation({
					modeId: 'standard',
					teamSize: 1,
					seed,
					westRace,
					eastRace,
					startGold: 2500,
					botDifficulty: 0,
					isRunning: true,
					coinMode: 'normal',
					fogOfWar: true
				});

			const simA = makeSim();
			const simB = makeSim();

			const westBar = getBuildingsForRace(westRace)[0]?.id;
			const eastBar = getBuildingsForRace(eastRace)[0]?.id;
			expect(westBar).toBeTruthy();
			expect(eastBar).toBeTruthy();

			// Both simulations receive identical commands at identical ticks
			for (const sim of [simA, simB]) {
				sim.build('west', westBar!, 24, 18);
				sim.build('east', eastBar!, 24, 18);
				sim.build('west', 'cg11_forge', 28, 18);
				sim.build('east', 'cg11_forge', 28, 18);
			}

			for (let t = 1; t <= 3600; t++) {
				if (t === 600) {
					simA.upgradeForge('west', 'attack');
					simB.upgradeForge('west', 'attack');
					simA.upgradeCastleCannon('east');
					simB.upgradeCastleCannon('east');
				}
				if (t === 1200) {
					simA.fireCastleCannon('east', 'short');
					simB.fireCastleCannon('east', 'short');
					simA.triggerRescueStrike('west');
					simB.triggerRescueStrike('west');
				}
				if (t === 1800) {
					simA.useRaceSkill('west');
					simB.useRaceSkill('west');
					simA.useRaceSkill('east');
					simB.useRaceSkill('east');
				}

				simA.step(1 / 60);
				simB.step(1 / 60);

				if (t % 120 === 0) {
					expect(computeSimStateChecksum(simA)).toBe(computeSimStateChecksum(simB));
				}
				if (simA.winner || simB.winner) break;
			}

			expect(computeSimStateChecksum(simA)).toBe(computeSimStateChecksum(simB));
			expect(simA.getRngState()).toBe(simB.getRngState());
			expect(simA.units.length).toBe(simB.units.length);
			expect(simA.castles.west.hp).toBe(simB.castles.west.hp);
			expect(simA.castles.east.hp).toBe(simB.castles.east.hp);
		}
	);
});
