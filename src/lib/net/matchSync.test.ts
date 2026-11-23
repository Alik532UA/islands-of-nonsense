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

	it('synchronizes RESCUE_STRIKE and updates castle rescue strike availability', async () => {
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

		simA.rescueStrikeCooldown.west = 0;
		simB.rescueStrikeCooldown.west = 0;

		await syncA.dispatch('RESCUE_STRIKE');

		expect(simA.rescueStrikeCooldown.west).toBeGreaterThan(0);
		expect(simB.rescueStrikeCooldown.west).toBeGreaterThan(0);

		syncA.dispose();
		syncB.dispose();
	});

	it('synchronizes SURRENDER command to forfeit match', async () => {
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

		await syncA.dispatch('SURRENDER');

		expect(simA.castles.west.hp).toBe(0);
		expect(simB.castles.west.hp).toBe(0);

		syncA.dispose();
		syncB.dispose();
	});

	it('notifies peer presence through onPeerStatusChange', () => {
		let detectedPeer = '';
		let isOnline = false;

		const syncA = new MatchSync({
			sim: simA,
			transport: room.transport({ as: 'player_a' }),
			localUid: 'player_a',
			localTeam: 'west',
			onPeerStatusChange: (status) => {
				detectedPeer = status.peerUid;
				isOnline = status.online;
			}
		});

		expect(detectedPeer).toBe('player_b');
		expect(isOnline).toBe(true);

		syncA.dispose();
	});

	it('handles bidirectional moves in lockstep across both peers', async () => {
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

		// Player A builds on west
		await syncA.dispatch('BUILD', { buildingType: 'h05X', x: 25, y: 20, team: 'west' });
		// Player B builds on east
		await syncB.dispatch('BUILD', { buildingType: 'h008', x: 25, y: 20, team: 'east' });

		// Both simulations should contain both buildings in exact same positions
		expect(simA.buildings.length).toBe(2);
		expect(simB.buildings.length).toBe(2);
		expect(simA.buildings.map((b) => b.defId)).toEqual(simB.buildings.map((b) => b.defId));

		syncA.dispose();
		syncB.dispose();
	});

	it('dispatches heartbeat and computes peer round-trip latency', async () => {
		let reportedLatency: number | undefined;

		const syncA = new MatchSync({
			sim: simA,
			transport: room.transport({ as: 'player_a' }),
			localUid: 'player_a',
			localTeam: 'west',
			onPeerPing: (ping) => {
				reportedLatency = ping.rtt;
			}
		});

		const syncB = new MatchSync({
			sim: simB,
			transport: room.transport({ as: 'player_b' }),
			localUid: 'player_b',
			localTeam: 'east'
		});

		await syncB.sendHeartbeat();

		expect(reportedLatency).toBeDefined();
		expect(reportedLatency).toBeGreaterThanOrEqual(0);
		expect(syncA.getPeerLatency('player_b')).toBe(reportedLatency);

		syncA.dispose();
		syncB.dispose();
	});

	it('detects simulation desynchronization through checksum verification', async () => {
		let desyncDetected: { tick: number; localChecksum: string; remoteChecksum: string } | null =
			null;

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
			localTeam: 'east',
			onDesync: (info) => {
				desyncDetected = info;
			}
		});

		// Artificially alter Sim A state to simulate divergence
		simA.castles.west.hp -= 300;

		await syncA.broadcastChecksum();

		expect(desyncDetected).not.toBeNull();
		expect(desyncDetected!.remoteChecksum).not.toEqual(syncB.getSimChecksum());

		syncA.dispose();
		syncB.dispose();
	});
});
