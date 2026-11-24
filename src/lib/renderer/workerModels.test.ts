import { describe, it, expect } from 'vitest';
import { Simulation } from '../engine/simulation';
import { PLAYABLE_RACES } from '../engine/gameData';
import { UnitRenderer } from './unitRenderer';
import { WORKER_RACE_SPECS, resolveCanonicalWorkerRace } from './workerModels';
import type { Graphics } from 'pixi.js';

describe('WorkerModels 2.5D Race-Distinct Rendering', () => {
	it('defines unique visual configurations and renders every canonical playable race cleanly', () => {
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

		const seenSignatures = new Set<string>();
		for (const race of PLAYABLE_RACES) {
			const spec = WORKER_RACE_SPECS[race];
			expect(spec).toBeDefined();
			expect(resolveCanonicalWorkerRace(race)).toBe(race);
			seenSignatures.add(
				`${spec.legStyle}|${spec.backFeature}|${spec.headFeature}|${spec.toolStyle}`
			);

			const sim = new Simulation({
				botDifficulty: 0,
				startGold: 500,
				westRace: race
			});
			if (sim.players.west.worker) {
				sim.players.west.worker.isBuilding = true;
			}
			const renderer = new UnitRenderer(sim);
			expect(() => renderer.drawWorkersLayer(mockGraphics, true, false)).not.toThrow();
		}

		// Every canonical race should have its own distinct visual signature
		expect(seenSignatures.size).toBe(PLAYABLE_RACES.length);
	});
});
