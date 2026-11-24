import { describe, it, expect } from 'vitest';
import { MatchSync, computeSimStateChecksum } from './matchSync';
import { LocalRoom } from './localRoom';
import { createOnlineSimulation } from './onlineMatchSetup';
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
});
