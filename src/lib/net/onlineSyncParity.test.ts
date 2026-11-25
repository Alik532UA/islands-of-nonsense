import { describe, it, expect } from 'vitest';
import { MatchSync, computeSimStateChecksum } from './matchSync';
import { LocalRoom } from './localRoom';
import {
	buildOnlineSimulationConfig,
	createOnlineSimulation,
	pickNextTeamSlot
} from './onlineMatchSetup';
import { validatePlayerMove } from './actionValidation';
import type { Member, RoomInfo } from './roomTypes';

describe('Online Deterministic Parity & Team Slot Sync', () => {
	const baseInfo: RoomInfo = {
		gameId: 'castlefight',
		rulesVersion: 2,
		seed: 424242,
		status: 'playing',
		hostUid: 'u_west_1',
		createdAt: 1000,
		config: {
			modeId: 'standard',
			teamSize: 2,
			targetWins: 2,
			coinMode: 'normal'
		},
		roster: [
			{ uid: 'u_west_1', name: 'WestLead', team: 'west', race: 'Альянс' },
			{ uid: 'u_west_2', name: 'WestAlly', team: 'west', race: 'random' },
			{ uid: 'u_east_1', name: 'EastLead', team: 'east', race: 'Орки' },
			{ uid: 'u_east_2', name: 'EastAlly', team: 'east', race: 'random' }
		]
	};

	const members: Member[] = [
		{ uid: 'u_west_1', name: 'WestLead', role: 'player', team: 'west', order: 1, slot: 1 },
		{ uid: 'u_west_2', name: 'WestAlly', role: 'player', team: 'west', order: 2, slot: 3 },
		{ uid: 'u_east_1', name: 'EastLead', role: 'player', team: 'east', order: 3, slot: 2 },
		{ uid: 'u_east_2', name: 'EastAlly', role: 'player', team: 'east', order: 4, slot: 4 }
	];

	it('maintains identical simulation state and checksums across 2v2 peers over 600 ticks', async () => {
		const initA = createOnlineSimulation(baseInfo, members, 'u_west_1');
		const initB = createOnlineSimulation(baseInfo, members, 'u_east_2');

		expect(initA.localTeam).toBe('west');
		expect(initA.localSlot).toBe(1);
		expect(initB.localTeam).toBe('east');
		expect(initB.localSlot).toBe(4);

		// Seeded random races, bridges, and decorations must match identically
		expect(initA.sim.brokenBridge).toBe(initB.sim.brokenBridge);
		expect(initA.sim.decorationSeed).toBe(initB.sim.decorationSeed);
		expect(initA.sim.allPlayers.map((p) => p.race)).toEqual(
			initB.sim.allPlayers.map((p) => p.race)
		);

		const room = new LocalRoom(baseInfo, members);
		const desyncsA: number[] = [];
		const desyncsB: number[] = [];

		const syncWestAlly = new MatchSync({
			sim: initA.sim,
			transport: room.transport({ as: 'u_west_2' }),
			localUid: 'u_west_2',
			localTeam: 'west',
			localSlot: 3,
			uidToSlot: initA.uidToSlot,
			onDesync: (info) => desyncsA.push(info.tick)
		});

		const syncEastAlly = new MatchSync({
			sim: initB.sim,
			transport: room.transport({ as: 'u_east_2' }),
			localUid: 'u_east_2',
			localTeam: 'east',
			localSlot: 4,
			uidToSlot: initB.uidToSlot,
			onDesync: (info) => desyncsB.push(info.tick)
		});

		// Grant matching mid-game resources so teammates can build Commander Hall (250g/250w) and Forge
		for (const p of [...initA.sim.allPlayers, ...initB.sim.allPlayers]) {
			p.gold = 1000;
			p.lumber = 1000;
		}

		// Teammate in slot 3 constructs a Commander Hall and waits until finished
		await syncWestAlly.dispatch('BUILD', { buildingType: 'cg12_commander', x: 25, y: 20 });
		expect(initA.sim.buildings.length).toBe(1);
		expect(initB.sim.buildings.length).toBe(1);
		for (let t = 0; t < 900; t++) {
			initA.sim.step(1 / 60);
			initB.sim.step(1 / 60);
			if (initA.sim.tick % 150 === 0) {
				await syncWestAlly.broadcastChecksum();
				await syncEastAlly.broadcastChecksum();
			}
			if (!initA.sim.buildings[0]?.isUnderConstruction) {
				break;
			}
		}
		expect(initA.sim.buildings[0]?.isUnderConstruction).toBe(false);
		expect(initB.sim.buildings[0]?.isUnderConstruction).toBe(false);

		// Both teams build forge / pick commander on different slots
		await syncEastAlly.dispatch('BUILD', { buildingType: 'cg11_forge', x: 25, y: 20 });
		await syncWestAlly.dispatch('SELECT_COMMANDER', { commanderId: 'random' });

		for (let t = 0; t < 360; t++) {
			initA.sim.step(1 / 60);
			initB.sim.step(1 / 60);
			if (initA.sim.tick % 150 === 0) {
				await syncWestAlly.broadcastChecksum();
				await syncEastAlly.broadcastChecksum();
			}
		}

		expect(desyncsA).toEqual([]);
		expect(desyncsB).toEqual([]);
		expect(computeSimStateChecksum(initA.sim)).toBe(computeSimStateChecksum(initB.sim));
		expect(initA.sim.allPlayers.map((p) => p.commander)).toEqual(
			initB.sim.allPlayers.map((p) => p.commander)
		);
		// Verify ally commander was credited to slot 3 (not defaulted to slot 1)
		const slot3PlayerA = initA.sim.allPlayers.find((p) => p.slot === 3);
		const slot1PlayerA = initA.sim.allPlayers.find((p) => p.slot === 1);
		expect(slot3PlayerA?.commander).toBeGreaterThan(0);
		expect(slot3PlayerA?.isRandomCommander).toBe(true);
		expect(slot1PlayerA?.commander).toBe(0);

		syncWestAlly.dispose();
		syncEastAlly.dispose();
	});

	it('compares historical tick checksums cleanly without latency false positives', async () => {
		const initA = createOnlineSimulation(baseInfo, members, 'u_west_1');
		const initB = createOnlineSimulation(baseInfo, members, 'u_east_1');
		const room = new LocalRoom(baseInfo, members);
		const desyncs: number[] = [];

		const syncA = new MatchSync({
			sim: initA.sim,
			transport: room.transport({ as: 'u_west_1' }),
			localUid: 'u_west_1',
			localTeam: 'west',
			localSlot: 1,
			uidToSlot: initA.uidToSlot
		});
		const syncB = new MatchSync({
			sim: initB.sim,
			transport: room.transport({ as: 'u_east_1' }),
			localUid: 'u_east_1',
			localTeam: 'east',
			localSlot: 2,
			uidToSlot: initB.uidToSlot,
			onDesync: (info) => desyncs.push(info.tick)
		});

		// Peer B runs ahead to tick 160 while recording tick 150 checkpoint
		for (let t = 0; t < 160; t++) {
			initB.sim.step(1 / 60);
			if (initB.sim.tick === 150) {
				syncB.recordCheckpointChecksum();
			}
		}
		// Peer A is at tick 150 and broadcasts checksum for tick 150 after changing nothing
		for (let t = 0; t < 150; t++) {
			initA.sim.step(1 / 60);
		}
		// Change B's castle HP AFTER tick 150 (e.g. at tick 160) - tick 150 checksums still match!
		initB.sim.castles.east.hp -= 500;
		await syncA.broadcastChecksum();

		expect(desyncs).toEqual([]);

		syncA.dispose();
		syncB.dispose();
	});

	it('validates SELECT_COMMANDER and playerSlot payloads strictly', () => {
		const okRes = validatePlayerMove({
			seq: 5,
			by: 'u_west_2',
			type: 'SELECT_COMMANDER',
			payload: { tick: 100, team: 'west', playerSlot: 3, commanderId: 'random' }
		});
		expect(okRes.valid).toBe(true);
		expect(okRes.sanitized?.payload?.commanderId).toBe('random');
		expect(okRes.sanitized?.payload?.playerSlot).toBe(3);

		const badCmd = validatePlayerMove({
			seq: 6,
			by: 'u_west_2',
			type: 'SELECT_COMMANDER',
			payload: { tick: 100, team: 'west', playerSlot: 3, commanderId: 99 }
		});
		expect(badCmd.valid).toBe(false);
	});

	it('keeps deterministic random race parity between lobby-init and playing-init peers', () => {
		const lobbyInfo: RoomInfo = {
			...baseInfo,
			status: 'lobby',
			roster: undefined
		};

		// Peer A enters in lobby first, then transitions to playing with a fresh simulation
		const lobbyInit = createOnlineSimulation(lobbyInfo, members, 'u_west_1');
		expect(lobbyInit.sim.players.west.randomGoldGranted).toBeFalsy();

		const playingAfterLobby = createOnlineSimulation(baseInfo, members, 'u_west_1');
		const playingDirect = createOnlineSimulation(baseInfo, members, 'u_east_2');

		expect(playingAfterLobby.sim.allPlayers.map((p) => p.race)).toEqual(
			playingDirect.sim.allPlayers.map((p) => p.race)
		);
		expect(playingAfterLobby.sim.brokenBridge).toBe(playingDirect.sim.brokenBridge);
		expect(computeSimStateChecksum(playingAfterLobby.sim)).toBe(
			computeSimStateChecksum(playingDirect.sim)
		);

		expect(pickNextTeamSlot([{ team: 'west', slot: 1 }], 'west')).toBe(3);
		expect(pickNextTeamSlot([{ team: 'west', slot: 1 }], 'east')).toBe(2);
	});

	it('supports negative East island tileX builds and synced MOVE_WORKER across peers', async () => {
		const initWest = createOnlineSimulation(baseInfo, members, 'u_west_1');
		const initEast = createOnlineSimulation(baseInfo, members, 'u_east_1');
		const room = new LocalRoom(baseInfo, members);

		const syncWest = new MatchSync({
			sim: initWest.sim,
			transport: room.transport({ as: 'u_west_1' }),
			localUid: 'u_west_1',
			localTeam: 'west',
			localSlot: 1,
			uidToSlot: initWest.uidToSlot
		});
		const syncEast = new MatchSync({
			sim: initEast.sim,
			transport: room.transport({ as: 'u_east_1' }),
			localUid: 'u_east_1',
			localTeam: 'east',
			localSlot: 2,
			uidToSlot: initEast.uidToSlot
		});

		const syncEastAlly = new MatchSync({
			sim: initEast.sim,
			transport: room.transport({ as: 'u_east_2' }),
			localUid: 'u_east_2',
			localTeam: 'east',
			localSlot: 4,
			uidToSlot: initEast.uidToSlot
		});

		for (const p of [...initWest.sim.allPlayers, ...initEast.sim.allPlayers]) {
			p.gold = 2000;
			p.lumber = 2000;
		}

		// East builds on the front-left half of East island where tileX is negative (slot 2)
		expect(initEast.sim.canBuild('east', -18, 20)).toBe(true);
		await syncEast.dispatch('BUILD', { buildingType: 'cg11_forge', x: -18, y: 20 });
		// East ally (slot 4) moves independently via synced MOVE_WORKER without cancelling slot 2's blueprint
		await syncEastAlly.dispatch('MOVE_WORKER', { worldX: 5200, worldY: 950 });

		for (let t = 0; t < 120; t++) {
			syncWest.flushTick(initWest.sim.tick);
			syncEast.flushTick(initEast.sim.tick);
			initWest.sim.step(1 / 60);
			initEast.sim.step(1 / 60);
		}

		expect(initWest.sim.buildings.length).toBe(1);
		expect(initEast.sim.buildings.length).toBe(1);
		expect(initWest.sim.buildings[0].tileX).toBe(-18);
		expect(initEast.sim.buildings[0].tileX).toBe(-18);
		expect(Math.round(initWest.sim.players.east.worker!.x)).toBe(
			Math.round(initEast.sim.players.east.worker!.x)
		);
		const eastAllyW = initWest.sim.allPlayers.find((p) => p.slot === 4)!.worker!;
		const eastAllyE = initEast.sim.allPlayers.find((p) => p.slot === 4)!.worker!;
		expect(Math.round(eastAllyW.x)).toBe(Math.round(eastAllyE.x));
		expect(computeSimStateChecksum(initWest.sim)).toBe(computeSimStateChecksum(initEast.sim));

		syncWest.dispose();
		syncEast.dispose();
		syncEastAlly.dispose();
	});

	it('respects fogOfWar room configuration (enabled by default, disabled for open-map testing)', () => {
		expect(buildOnlineSimulationConfig(baseInfo).fogOfWar).toBe(true);

		const openMapInfo: RoomInfo = {
			...baseInfo,
			config: { ...baseInfo.config, fogOfWar: false }
		};
		const initWest = createOnlineSimulation(openMapInfo, members, 'u_west_1');
		const initEast = createOnlineSimulation(openMapInfo, members, 'u_east_1');

		expect(initWest.sim.config.fogOfWar).toBe(false);
		expect(initEast.sim.config.fogOfWar).toBe(false);
		expect(
			initWest.sim.isPointRevealed('west', initWest.sim.castles.east.x, initWest.sim.castles.east.y)
		).toBe(true);
		expect(
			initEast.sim.isPointRevealed('east', initEast.sim.castles.west.x, initEast.sim.castles.west.y)
		).toBe(true);
	});

	it('reconciles late remote commands without desyncing building completion or castle HP', async () => {
		const initA = createOnlineSimulation(baseInfo, members, 'u_west_1');
		const initB = createOnlineSimulation(baseInfo, members, 'u_east_1');
		const room = new LocalRoom(baseInfo, members);
		const desyncs: number[] = [];

		let currentSimB = initB.sim;
		const syncA = new MatchSync({
			sim: initA.sim,
			transport: room.transport({ as: 'u_west_1' }),
			localUid: 'u_west_1',
			localTeam: 'west',
			localSlot: 1,
			uidToSlot: initA.uidToSlot,
			commandLeadTicks: 24,
			createResyncSimulation: () => createOnlineSimulation(baseInfo, members, 'u_west_1').sim
		});

		const syncB = new MatchSync({
			sim: initB.sim,
			transport: room.transport({ as: 'u_east_1' }),
			localUid: 'u_east_1',
			localTeam: 'east',
			localSlot: 2,
			uidToSlot: initB.uidToSlot,
			commandLeadTicks: 24,
			createResyncSimulation: () => createOnlineSimulation(baseInfo, members, 'u_east_1').sim,
			onSimResynced: (nextSim) => {
				currentSimB = nextSim;
			},
			onDesync: (info) => desyncs.push(info.tick)
		});

		// Peer B steps ahead to tick 60 before Peer A's tick-10 move arrives
		for (let t = 0; t < 60; t++) {
			currentSimB.step(1 / 60);
		}

		// Peer A is at tick 10 and sends a BUILD with targetTick = 34 (< Peer B's tick 60)
		for (let t = 0; t < 10; t++) {
			initA.sim.step(1 / 60);
		}
		await syncA.dispatch('BUILD', { buildingType: 'cg11_forge', x: 25, y: 20 });

		// Peer A catches up to tick 60 cleanly executing BUILD at tick 34
		while (initA.sim.tick < 60) {
			syncA.flushTick(initA.sim.tick);
			initA.sim.step(1 / 60);
		}

		// Both peers advance to tick 300 and verify checksums + buildings match identically
		for (let t = 60; t < 300; t++) {
			syncA.flushTick(initA.sim.tick);
			syncB.flushTick(currentSimB.tick);
			initA.sim.step(1 / 60);
			currentSimB.step(1 / 60);
			if (initA.sim.tick % 120 === 0) {
				await syncA.broadcastChecksum();
				await syncB.broadcastChecksum();
			}
		}

		expect(desyncs).toEqual([]);
		expect(computeSimStateChecksum(initA.sim)).toBe(computeSimStateChecksum(currentSimB));
		expect(initA.sim.buildings.length).toBe(currentSimB.buildings.length);

		syncA.dispose();
		syncB.dispose();
	});

	it('schedules in-game PAUSE on identical targetTick across peers without drift', async () => {
		const initA = createOnlineSimulation(baseInfo, members, 'u_west_1');
		const initB = createOnlineSimulation(baseInfo, members, 'u_east_1');
		const room = new LocalRoom(baseInfo, members);

		const syncA = new MatchSync({
			sim: initA.sim,
			transport: room.transport({ as: 'u_west_1' }),
			localUid: 'u_west_1',
			localTeam: 'west',
			localSlot: 1,
			uidToSlot: initA.uidToSlot,
			commandLeadTicks: 24
		});
		const syncB = new MatchSync({
			sim: initB.sim,
			transport: room.transport({ as: 'u_east_1' }),
			localUid: 'u_east_1',
			localTeam: 'east',
			localSlot: 2,
			uidToSlot: initB.uidToSlot,
			commandLeadTicks: 24
		});

		for (let t = 0; t < 50; t++) {
			initA.sim.step(1 / 60);
			initB.sim.step(1 / 60);
		}

		await syncA.dispatch('PAUSE');
		// Advance both to tick 80 (past scheduled PAUSE at tick 74); both must halt at exact tick 74
		for (let t = 0; t < 30; t++) {
			syncA.flushTick(initA.sim.tick);
			syncB.flushTick(initB.sim.tick);
			initA.sim.step(1 / 60);
			initB.sim.step(1 / 60);
		}

		expect(initA.sim.isRunning).toBe(false);
		expect(initB.sim.isRunning).toBe(false);
		expect(initA.sim.tick).toBe(74);
		expect(initB.sim.tick).toBe(74);
		expect(computeSimStateChecksum(initA.sim)).toBe(computeSimStateChecksum(initB.sim));

		syncA.dispose();
		syncB.dispose();
	});

	it('resets sim.tick to 0 and keeps workers responsive across NEXT_ROUND in online matches', async () => {
		const initA = createOnlineSimulation(baseInfo, members, 'u_west_1');
		const initB = createOnlineSimulation(baseInfo, members, 'u_east_1');
		const room = new LocalRoom(baseInfo, members);

		const syncA = new MatchSync({
			sim: initA.sim,
			transport: room.transport({ as: 'u_west_1' }),
			localUid: 'u_west_1',
			localTeam: 'west',
			localSlot: 1,
			uidToSlot: initA.uidToSlot,
			commandLeadTicks: 24
		});
		const syncB = new MatchSync({
			sim: initB.sim,
			transport: room.transport({ as: 'u_east_1' }),
			localUid: 'u_east_1',
			localTeam: 'east',
			localSlot: 2,
			uidToSlot: initB.uidToSlot,
			commandLeadTicks: 24
		});

		// Advance Round 1 to tick 300 with pending rescue strike / build state, then end Round 1
		for (let t = 0; t < 300; t++) {
			initA.sim.step(1 / 60);
			initB.sim.step(1 / 60);
		}
		expect(initA.sim.tick).toBe(300);
		initA.sim.players.west.worker!.pendingRescueStrike = { x: 1600, y: 1200 };
		initB.sim.players.west.worker!.pendingRescueStrike = { x: 1600, y: 1200 };
		initA.sim.winner = 'west';
		initB.sim.winner = 'west';

		await syncA.dispatch('NEXT_ROUND', { round: 1 });

		expect(initA.sim.round).toBe(2);
		expect(initB.sim.round).toBe(2);
		expect(initA.sim.tick).toBe(0);
		expect(initB.sim.tick).toBe(0);
		expect(initA.sim.players.west.worker?.pendingRescueStrike).toBeNull();

		// Dispatch MOVE_WORKER & BUILD in Round 2; both must schedule from tick 0 + lead (24) and move workers immediately
		const startWorkerX = initA.sim.players.west.worker!.x;
		await syncA.dispatch('MOVE_WORKER', { worldX: 1100, worldY: 950 });

		for (let t = 0; t < 90; t++) {
			syncA.flushTick(initA.sim.tick);
			syncB.flushTick(initB.sim.tick);
			initA.sim.step(1 / 60);
			initB.sim.step(1 / 60);
		}

		expect(initA.sim.players.west.worker!.x).not.toBe(startWorkerX);
		expect(Math.round(initA.sim.players.west.worker!.x)).toBe(
			Math.round(initB.sim.players.west.worker!.x)
		);
		expect(computeSimStateChecksum(initA.sim)).toBe(computeSimStateChecksum(initB.sim));

		syncA.dispose();
		syncB.dispose();
	});
});
