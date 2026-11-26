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
		simA = new Simulation({ botDifficulty: 0, startGold: 1000, isRunning: false, seed: 999 });
		simB = new Simulation({ botDifficulty: 0, startGold: 1000, isRunning: false, seed: 999 });
		simA.decorations = [];
		simB.decorations = [];
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
		expect(simA.winner).toBe('east');
		expect(simB.winner).toBe('east');

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
		simA.players.east.lumber = 2000;
		simB.players.east.lumber = 2000;
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

	it('synchronizes RESUME and UPGRADE_FORGE across peers without any cast', async () => {
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

		expect(simA.isRunning).toBe(false);
		expect(simB.isRunning).toBe(false);

		const resumed = await syncA.dispatch('RESUME');
		expect(resumed).toBe(true);
		expect(simA.isRunning).toBe(true);
		expect(simB.isRunning).toBe(true);

		const forged = await syncA.dispatch('UPGRADE_FORGE', { forgeType: 'attack' });
		expect(forged).toBe(true);
		expect(syncB.getAppliedSeq()).toBeGreaterThanOrEqual(2);

		syncA.dispose();
		syncB.dispose();
	});

	it('schedules gameplay moves for exact targetTick with commandLeadTicks and flushes deterministically', async () => {
		const seededA = new Simulation({
			botDifficulty: 0,
			startGold: 1000,
			seed: 999,
			isRunning: true
		});
		const seededB = new Simulation({
			botDifficulty: 0,
			startGold: 1000,
			seed: 999,
			isRunning: true
		});

		const syncA = new MatchSync({
			sim: seededA,
			transport: room.transport({ as: 'player_a' }),
			localUid: 'player_a',
			localTeam: 'west',
			commandLeadTicks: 3
		});
		const syncB = new MatchSync({
			sim: seededB,
			transport: room.transport({ as: 'player_b' }),
			localUid: 'player_b',
			localTeam: 'east',
			commandLeadTicks: 3
		});

		await syncA.dispatch('BUILD', { buildingType: 'h05X', x: 25, y: 20 });

		// Scheduled for tick 3, so neither simulation applies it at tick 0..2
		expect(seededA.buildings.length).toBe(0);
		expect(seededB.buildings.length).toBe(0);
		expect(syncA.getPendingMoveCount()).toBe(1);
		expect(syncB.getPendingMoveCount()).toBe(1);

		for (let t = 0; t < 3; t++) {
			syncA.flushTick(seededA.tick);
			syncB.flushTick(seededB.tick);
			seededA.step(1 / 60);
			seededB.step(1 / 60);
		}
		expect(seededA.buildings.length).toBe(0);
		expect(seededB.buildings.length).toBe(0);

		// At tick 3 both simulations execute the move identically
		syncA.flushTick(seededA.tick);
		syncB.flushTick(seededB.tick);
		expect(seededA.buildings.length).toBe(1);
		expect(seededB.buildings.length).toBe(1);
		expect(syncA.getSimChecksum()).toBe(syncB.getSimChecksum());

		syncA.dispose();
		syncB.dispose();
	});

	it('synchronizes NEXT_ROUND idempotently and RESTART_MATCH across peers', async () => {
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

		simA.round = 1;
		simB.round = 1;
		simA.winner = 'west';
		simB.winner = 'west';

		await syncA.dispatch('NEXT_ROUND', { round: 1 });
		// Duplicate NEXT_ROUND for round 1 must not skip round 2
		await syncB.dispatch('NEXT_ROUND', { round: 1 });

		expect(simA.round).toBe(2);
		expect(simB.round).toBe(2);
		expect(simA.winner).toBeNull();
		expect(simB.winner).toBeNull();

		await syncA.dispatch('RESTART_MATCH');
		expect(simA.round).toBe(1);
		expect(simB.round).toBe(1);
		expect(simA.score).toEqual({ west: 0, east: 0 });
		expect(simB.score).toEqual({ west: 0, east: 0 });

		syncA.dispose();
		syncB.dispose();
	});

	it('reconstructs identical simulation state deterministically on mid-match reload catch-up', async () => {
		const liveSimA = new Simulation({ botDifficulty: 0, startGold: 1000, seed: 7777 });
		const liveSimB = new Simulation({ botDifficulty: 0, startGold: 1000, seed: 7777 });
		liveSimA.isRunning = true;
		liveSimB.isRunning = true;

		const syncA = new MatchSync({
			sim: liveSimA,
			transport: room.transport({ as: 'player_a' }),
			localUid: 'player_a',
			localTeam: 'west',
			commandLeadTicks: 3
		});
		const syncB = new MatchSync({
			sim: liveSimB,
			transport: room.transport({ as: 'player_b' }),
			localUid: 'player_b',
			localTeam: 'east',
			commandLeadTicks: 3
		});

		await syncA.dispatch('BUILD', { buildingType: 'h05X', x: 25, y: 20 });
		for (let i = 0; i < 60; i++) {
			syncA.flushTick(liveSimA.tick);
			syncB.flushTick(liveSimB.tick);
			liveSimA.step(1 / 60);
			liveSimB.step(1 / 60);
		}
		await syncB.dispatch('BUILD', { buildingType: 'h008', x: 25, y: 20 });
		for (let i = 0; i < 120; i++) {
			syncA.flushTick(liveSimA.tick);
			syncB.flushTick(liveSimB.tick);
			liveSimA.step(1 / 60);
			liveSimB.step(1 / 60);
		}
		await syncA.broadcastChecksum();
		expect(syncA.getSimChecksum()).toBe(syncB.getSimChecksum());

		// Peer B reloads browser mid-match and joins fresh Simulation(tick 0)
		const reloadedSimB = new Simulation({ botDifficulty: 0, startGold: 1000, seed: 7777 });
		reloadedSimB.isRunning = true;
		let reloadDesyncs = 0;
		const reloadedSyncB = new MatchSync({
			sim: reloadedSimB,
			transport: room.transport({ as: 'player_b' }),
			localUid: 'player_b',
			localTeam: 'east',
			commandLeadTicks: 3,
			onDesync: () => {
				reloadDesyncs++;
			}
		});

		expect(reloadedSimB.tick).toBe(liveSimA.tick);
		expect(reloadedSyncB.getSimChecksum()).toBe(syncA.getSimChecksum());
		expect(reloadDesyncs).toBe(0);

		syncA.dispose();
		syncB.dispose();
		reloadedSyncB.dispose();
	});

	it('applies tick-0 RESUME before stepping during mid-match catch-up from paused state', async () => {
		const liveSimA = new Simulation({
			botDifficulty: 0,
			startGold: 1000,
			seed: 8888,
			isRunning: false
		});
		const syncA = new MatchSync({
			sim: liveSimA,
			transport: room.transport({ as: 'player_a' }),
			localUid: 'player_a',
			localTeam: 'west',
			commandLeadTicks: 3
		});

		await syncA.dispatch('RESUME');
		await syncA.dispatch('BUILD', { buildingType: 'h05X', x: 25, y: 20 });
		for (let i = 0; i < 60; i++) {
			syncA.flushTick(liveSimA.tick);
			liveSimA.step(1 / 60);
		}

		// Peer B starts paused (isRunning: false) as if room watcher hasn't started yet
		const pausedSimB = new Simulation({
			botDifficulty: 0,
			startGold: 1000,
			seed: 8888,
			isRunning: false
		});
		const syncB = new MatchSync({
			sim: pausedSimB,
			transport: room.transport({ as: 'player_b' }),
			localUid: 'player_b',
			localTeam: 'east',
			commandLeadTicks: 3
		});

		expect(pausedSimB.isRunning).toBe(true);
		expect(pausedSimB.tick).toBe(3);
		expect(pausedSimB.buildings.length).toBe(1);

		await syncA.dispatch('CHECKSUM', { checksum: syncA.getSimChecksum(), tick: liveSimA.tick });

		syncA.dispose();
		syncB.dispose();
	});
});
