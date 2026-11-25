import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { MatchSync, computeSimStateChecksum } from './matchSync';
import { LocalRoom } from './localRoom';
import {
	buildOnlineSimulationConfig,
	buildRoomSlots,
	countOpenHumanCapacity,
	createOnlineSimulation
} from './onlineMatchSetup';
import { validatePlayerMove } from './actionValidation';
import type { Member, RoomInfo } from './roomTypes';

describe('Online Room Minimal Creation, 3v3 Default, In-Game Race Sync & Extended Config', () => {
	it('simplifies CreateWindow to room access only and defaults created rooms to 3v3 open with in_game race', () => {
		const createWin = fs.readFileSync(
			path.resolve(process.cwd(), 'src/lib/components/online/CreateWindow.svelte'),
			'utf8'
		);
		expect(createWin).toContain('online.roomAccess');
		expect(createWin).not.toContain('online.teamFormat');
		expect(createWin).not.toContain('online.mapVisibility');
		expect(createWin).not.toContain('online.battleMode');

		const slots3v3 = buildRoomSlots(3, 3);
		expect(countOpenHumanCapacity({ slots: slots3v3 })).toBe(6);

		const onlinePage = fs.readFileSync(
			path.resolve(process.cwd(), 'src/routes/online/+page.svelte'),
			'utf8'
		);
		expect(onlinePage).toContain("race: 'in_game'");
		expect(onlinePage).toContain('const teamSizeWest = 3;');
		expect(onlinePage).toContain('const teamSizeEast = 3;');
	});

	it('allows starting 1v1 inside a 3v3 open room and ignores empty open slots', () => {
		const info: RoomInfo = {
			gameId: 'castlefight',
			rulesVersion: 1,
			seed: 777,
			status: 'playing',
			hostUid: 'u1',
			createdAt: 1000,
			config: {
				modeId: 'sandbox',
				teamSize: 3,
				teamSizeWest: 3,
				teamSizeEast: 3,
				slots: buildRoomSlots(3, 3),
				targetWins: 3,
				startGold: 99999,
				coinMode: 'normal',
				coinSpawnInterval: 15,
				coinCount: 4,
				bannedRaces: ['Нежить'],
				fogOfWar: false
			},
			roster: [
				{ uid: 'u1', name: 'P1', team: 'west', slot: 1, race: 'in_game' },
				{ uid: 'u2', name: 'P2', team: 'east', slot: 2, race: 'in_game' }
			]
		};
		const members: Member[] = [
			{ uid: 'u1', name: 'P1', role: 'player', order: 1, slot: 1, team: 'west', race: 'in_game' },
			{ uid: 'u2', name: 'P2', role: 'player', order: 2, slot: 2, team: 'east', race: 'in_game' }
		];

		const cfg = buildOnlineSimulationConfig(info);
		expect(cfg.startGold).toBe(99999);
		expect(cfg.coinSpawnInterval).toBe(15);
		expect(cfg.coinCount).toBe(4);
		expect(cfg.bannedRaces).toEqual(['Нежить']);
		expect(cfg.fogOfWar).toBe(false);

		const res = createOnlineSimulation(info, members, 'u1');
		expect(res.sim.allPlayers).toHaveLength(2);
		expect(res.sim.isRunning).toBe(false);
		expect(res.sim.players.west.pendingRacePick).toBe(true);
		expect(res.sim.players.east.pendingRacePick).toBe(true);
	});

	it('synchronizes SET_RACE + RESUME deterministically and scopes uniqueRaces per team above 12 players', async () => {
		expect(
			validatePlayerMove({
				seq: 1,
				by: 'u1',
				type: 'SET_RACE',
				payload: { tick: 0, team: 'west', playerSlot: 1, race: 'Орки' }
			}).valid
		).toBe(true);

		const slots = buildRoomSlots(7, 7);
		const members: Member[] = [];
		const roster = [];
		for (let i = 1; i <= 7; i++) {
			const wSlot = i * 2 - 1;
			const eSlot = i * 2;
			members.push({
				uid: `w${i}`,
				name: `W${i}`,
				role: 'player',
				order: wSlot,
				slot: wSlot,
				team: 'west',
				race: i === 1 ? 'in_game' : 'random'
			});
			members.push({
				uid: `e${i}`,
				name: `E${i}`,
				role: 'player',
				order: eSlot,
				slot: eSlot,
				team: 'east',
				race: i === 1 ? 'in_game' : 'random'
			});
			roster.push(
				{
					uid: `w${i}`,
					name: `W${i}`,
					team: 'west' as const,
					slot: wSlot,
					race: i === 1 ? 'in_game' : 'random'
				},
				{
					uid: `e${i}`,
					name: `E${i}`,
					team: 'east' as const,
					slot: eSlot,
					race: i === 1 ? 'in_game' : 'random'
				}
			);
		}

		const info: RoomInfo = {
			gameId: 'castlefight',
			rulesVersion: 1,
			seed: 5151,
			status: 'playing',
			hostUid: 'w1',
			createdAt: 1000,
			config: {
				modeId: 'uniqueRaces',
				uniqueRaces: true,
				teamSize: 7,
				teamSizeWest: 7,
				teamSizeEast: 7,
				slots,
				targetWins: 2
			},
			roster
		};

		const peerW = createOnlineSimulation(info, members, 'w1');
		const peerE = createOnlineSimulation(info, members, 'e1');
		const room = new LocalRoom(info, members);

		const syncW = new MatchSync({
			sim: peerW.sim,
			transport: room.transport({ as: 'w1' }),
			localUid: 'w1',
			localTeam: 'west',
			localSlot: 1,
			uidToSlot: peerW.uidToSlot
		});
		const syncE = new MatchSync({
			sim: peerE.sim,
			transport: room.transport({ as: 'e1' }),
			localUid: 'e1',
			localTeam: 'east',
			localSlot: 2,
			uidToSlot: peerE.uidToSlot
		});

		expect(peerW.sim.isRunning).toBe(false);
		expect(peerW.sim.teamMembers.west.length).toBe(7);
		expect(peerW.sim.teamMembers.east.length).toBe(7);
		// West and East each have 7 players (<= 12 races) so picking a race used only on East is allowed!
		const eastOnlyRace = peerW.sim.teamMembers.east[1].race;
		await syncW.dispatch('SET_RACE', { team: 'west', playerSlot: 1, race: eastOnlyRace });
		await syncE.dispatch('SET_RACE', { team: 'east', playerSlot: 2, race: 'random' });
		await syncW.dispatch('RESUME', { tick: 0 });

		expect(peerW.sim.isRunning).toBe(true);
		expect(peerE.sim.isRunning).toBe(true);
		expect(peerW.sim.players.west.pendingRacePick).toBe(false);
		expect(peerW.sim.players.east.pendingRacePick).toBe(false);
		expect(computeSimStateChecksum(peerW.sim)).toBe(computeSimStateChecksum(peerE.sim));

		syncW.dispose();
		syncE.dispose();
	});

	it('updates localTeam/localSlot when switching to West and prevents controlling another player worker', async () => {
		const slots = buildRoomSlots(3, 3);
		const initialMembers: Member[] = [
			{ uid: 'u1', name: 'Host', role: 'player', order: 1, slot: 1, team: 'west', race: 'Альянс' },
			{ uid: 'u2', name: 'Guest', role: 'player', order: 2, slot: 2, team: 'east', race: 'Орки' }
		];
		const playingInfo: RoomInfo = {
			gameId: 'castlefight',
			rulesVersion: 1,
			seed: 8888,
			status: 'playing',
			hostUid: 'u1',
			createdAt: 1000,
			config: {
				modeId: 'standard',
				teamSize: 3,
				teamSizeWest: 3,
				teamSizeEast: 3,
				slots,
				targetWins: 2
			},
			// After sitting in West slot 3 in the lobby, Guest starts on West (slot 3) with their own worker
			roster: [
				{ uid: 'u1', name: 'Host', team: 'west', slot: 1, race: 'Альянс' },
				{ uid: 'u2', name: 'Guest', team: 'west', slot: 3, race: 'Орки' }
			]
		};

		const hostInit = createOnlineSimulation(playingInfo, initialMembers, 'u1');
		const guestInit = createOnlineSimulation(playingInfo, initialMembers, 'u2');
		expect(guestInit.localTeam).toBe('west');
		expect(guestInit.localSlot).toBe(3);

		const room = new LocalRoom(playingInfo, [
			{ uid: 'u1', name: 'Host', role: 'player', order: 1, slot: 1, team: 'west', race: 'Альянс' },
			{ uid: 'u2', name: 'Guest', role: 'player', order: 2, slot: 3, team: 'west', race: 'Орки' }
		]);

		// Simulate guest MatchSync having stale initial lobby team/slot updated via setLocalIdentity
		const syncHost = new MatchSync({
			sim: hostInit.sim,
			transport: room.transport({ as: 'u1' }),
			localUid: 'u1',
			localTeam: 'west',
			localSlot: 1,
			uidToSlot: hostInit.uidToSlot
		});
		const syncGuest = new MatchSync({
			sim: guestInit.sim,
			transport: room.transport({ as: 'u2' }),
			localUid: 'u2',
			localTeam: 'east',
			localSlot: 2
		});
		syncGuest.setLocalIdentity(guestInit.localTeam, guestInit.localSlot);
		syncGuest.setRosterSlots(guestInit.uidToSlot);

		expect(syncGuest.localTeam).toBe('west');
		expect(syncGuest.localSlot).toBe(3);

		const hostWorkerBefore = {
			x: hostInit.sim.allPlayers.find((p) => p.slot === 1)!.worker!.x,
			y: hostInit.sim.allPlayers.find((p) => p.slot === 1)!.worker!.y
		};
		// Even if a client sends a spoofed/stale playerSlot: 1 or team: 'east', u2 can ONLY command slot 3's worker
		await syncGuest.dispatch('MOVE_WORKER', {
			team: 'east',
			playerSlot: 1,
			worldX: 1100,
			worldY: 900
		});

		const hostWorkerOnGuest = guestInit.sim.allPlayers.find((p) => p.slot === 1)!.worker!;
		const guestWorkerOnHost = hostInit.sim.allPlayers.find((p) => p.slot === 3)!.worker!;
		expect(hostWorkerOnGuest.targetX).toBe(hostWorkerBefore.x);
		expect(hostWorkerOnGuest.targetY).toBe(hostWorkerBefore.y);
		expect(
			Math.hypot(guestWorkerOnHost.targetX - 1100, guestWorkerOnHost.targetY - 900)
		).toBeLessThan(80);

		syncHost.dispose();
		syncGuest.dispose();
	});
});
