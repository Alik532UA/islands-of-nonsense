import { describe, it, expect, beforeEach } from 'vitest';
import { MatchSync } from './matchSync';
import { LocalRoom } from './localRoom';
import { Simulation } from '$lib/engine/simulation';
import type { RoomInfo, Member } from './roomTypes';

describe('MatchSync', () => {
	let simA: Simulation;
	let simB: Simulation;
	let room: LocalRoom;

	const defaultInfo: RoomInfo = {
		gameId: 'castlefight',
		rulesVersion: 1,
		seed: 999,
		status: 'playing',
		hostUid: 'player_a',
		createdAt: 1000,
		config: { modeId: 'standard', teamSize: 1, targetWins: 2 }
	};

	const defaultMembers: Member[] = [
		{ uid: 'player_a', name: 'Alice', role: 'player', team: 'west', order: 1 },
		{ uid: 'player_b', name: 'Bob', role: 'player', team: 'east', order: 2 }
	];

	beforeEach(() => {
		simA = new Simulation({ botDifficulty: 0, startGold: 1000, isRunning: false });
		simB = new Simulation({ botDifficulty: 0, startGold: 1000, isRunning: false });
		room = new LocalRoom(defaultInfo, defaultMembers);
	});

	it('synchronizes BUILD commands between both clients', async () => {
		const syncA = new MatchSync({
			sim: simA,
			transport: room.transport({ as: 'player_a' }),
			localUid: 'player_a',
			localTeam: 'west'
		});

		const syncB = new MatchSync({
			sim: simB,
			transport: room.transport({ as: 'player_b' }),
			localUid: 'player_b',
			localTeam: 'east'
		});

		// Player A dispatches a build command with valid tile coordinates
		const success = await syncA.dispatch('BUILD', {
			buildingType: 'h05X',
			x: 25,
			y: 20
		});

		expect(success).toBe(true);

		// Both simulations should now have the building placed
		expect(simA.buildings.length).toBe(1);
		expect(simB.buildings.length).toBe(1);
		expect(simB.buildings[0].defId).toBe('h05X');
		expect(simB.buildings[0].team).toBe('west');

		syncA.dispose();
		syncB.dispose();
	});

	it('synchronizes race skill ability usage across peers', async () => {
		const syncA = new MatchSync({
			sim: simA,
			transport: room.transport({ as: 'player_a' }),
			localUid: 'player_a',
			localTeam: 'west'
		});

		const syncB = new MatchSync({
			sim: simB,
			transport: room.transport({ as: 'player_b' }),
			localUid: 'player_b',
			localTeam: 'east'
		});

		simA.gameTime = 400; // unlocks race skill (> 300s)
		simB.gameTime = 400;

		await syncA.dispatch('USE_ABILITY');

		// Sim B should observe west race skill triggered
		expect(simB.raceSkillCooldown.west).toBeGreaterThan(0);

		syncA.dispose();
		syncB.dispose();
	});
});
