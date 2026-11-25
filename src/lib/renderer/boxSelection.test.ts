import { describe, expect, it } from 'vitest';
import { Simulation } from '$lib/engine/simulation';
import { resolveBoxSelection } from './boxSelection';

describe('resolveBoxSelection (RTS Worker & Unit Marquee Selection)', () => {
	it('selects the player controllable worker when marquee box drags over it', () => {
		const sim = new Simulation({
			teamSize: 1,
			startGold: 500,
			botDifficulty: 0,
			fogOfWar: false,
			isRunning: false
		});
		const westWorker = sim.players.west.worker!;
		const entity = resolveBoxSelection({
			bounds: {
				minX: westWorker.x - 40,
				maxX: westWorker.x + 40,
				minY: westWorker.y - 40,
				maxY: westWorker.y + 40
			},
			players: sim.allPlayers,
			units: sim.units,
			viewerTeam: 'west',
			activeControlSlot: 1,
			controllableSlots: new Set([1]),
			enableFog: false,
			isPointRevealed: () => true
		});

		expect(entity).toEqual({ type: 'worker', playerSlot: 1 });
	});

	it('prioritizes own controllable worker even when combat units or ally workers are inside the box', () => {
		const sim = new Simulation({
			teamSize: 2,
			startGold: 500,
			botDifficulty: 0,
			fogOfWar: false,
			isRunning: false
		});
		const ally = sim.teamMembers.west[1];
		const myPlayer = sim.teamMembers.west[0];
		ally.worker!.x = myPlayer.worker!.x + 15;
		ally.worker!.y = myPlayer.worker!.y;

		const entity = resolveBoxSelection({
			bounds: {
				minX: myPlayer.worker!.x - 60,
				maxX: myPlayer.worker!.x + 60,
				minY: myPlayer.worker!.y - 60,
				maxY: myPlayer.worker!.y + 60
			},
			players: sim.allPlayers,
			units: [
				{
					instanceId: 'u_west_1',
					team: 'west',
					x: myPlayer.worker!.x - 10,
					y: myPlayer.worker!.y,
					state: 'WALKING'
				}
			],
			viewerTeam: 'west',
			activeControlSlot: myPlayer.slot ?? 1,
			controllableSlots: new Set([myPlayer.slot ?? 1]),
			enableFog: false,
			isPointRevealed: () => true
		});

		expect(entity).toEqual({ type: 'worker', playerSlot: myPlayer.slot ?? 1 });
	});

	it('does not select another player worker in online mode when only combat units are in the box', () => {
		const sim = new Simulation({
			teamSize: 2,
			startGold: 500,
			botDifficulty: 0,
			fogOfWar: false,
			isRunning: false
		});
		const teammate = sim.teamMembers.west[1];
		const unitA = sim.teamMembers.west[0];
		unitA.worker!.x = 500;
		unitA.worker!.y = 500;

		const entity = resolveBoxSelection({
			bounds: {
				minX: teammate.worker!.x - 40,
				maxX: teammate.worker!.x + 40,
				minY: teammate.worker!.y - 40,
				maxY: teammate.worker!.y + 40
			},
			players: sim.allPlayers,
			units: [],
			viewerTeam: 'west',
			activeControlSlot: 1,
			controllableSlots: new Set([1]),
			enableFog: false,
			isPointRevealed: () => true
		});

		// Teammate worker can still be inspected if nothing controllable or combat unit matched
		expect(entity).toEqual({ type: 'worker', playerSlot: teammate.slot ?? 3 });
	});
});
