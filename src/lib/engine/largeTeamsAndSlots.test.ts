import { describe, expect, it } from 'vitest';
import { Simulation } from './simulation';
import { ALL_PLAYER_COLORS } from './types';
import {
	buildRoomSlots,
	countOpenHumanCapacity,
	createOnlineSimulation,
	pickFirstAvailableSeat
} from '$lib/net/onlineMatchSetup';
import { computeSimStateChecksum } from '$lib/net/matchSync';
import { validatePlayerMove } from '$lib/net/actionValidation';
import type { Member, RoomInfo } from '$lib/net/roomTypes';

describe('Flexible NvM Team Configurations (up to 7v7) & Online WC3 Slot Bots', () => {
	it('creates 7v7 (14 slots) with 14 unique colors and spread arc worker spawns', () => {
		const sim = new Simulation({
			teamSize: 7,
			botDifficulty: 15,
			startGold: 500,
			seed: 4242,
			randomColors: false
		});

		expect(sim.teamMembers.west).toHaveLength(7);
		expect(sim.teamMembers.east).toHaveLength(7);
		expect(sim.allPlayers).toHaveLength(14);

		const colorNums = new Set(sim.allPlayers.map((p) => p.color.num));
		expect(colorNums.size).toBe(14);
		expect(ALL_PLAYER_COLORS.length).toBe(14);

		const westPositions = new Set(sim.teamMembers.west.map((p) => `${p.worker?.x}:${p.worker?.y}`));
		expect(westPositions.size).toBe(7);
	});

	it('supports asymmetric 1v6 and 5v3 setups with equal start gold and WC3 jo income balance', () => {
		const sim1v6 = new Simulation({
			teamSizeWest: 1,
			teamSizeEast: 6,
			westRace: 'Альянс',
			botDifficulty: 0,
			startGold: 2000,
			seed: 99
		});

		expect(sim1v6.teamMembers.west).toHaveLength(1);
		expect(sim1v6.teamMembers.east).toHaveLength(6);
		expect(sim1v6.players.west.gold).toBe(2000);
		expect(sim1v6.players.east.gold).toBe(2000);

		sim1v6.decorations = [];
		sim1v6.build('west', 'h037', 25, 20);

		const sim1v1 = new Simulation({
			teamSize: 1,
			westRace: 'Альянс',
			botDifficulty: 0,
			startGold: 2000,
			seed: 99
		});
		sim1v1.decorations = [];
		sim1v1.build('west', 'h037', 25, 20);
		const exact1v1 = sim1v1.economySystem.calculateExactIncome('west', sim1v1.players.west);
		const exact1v6 = sim1v6.economySystem.calculateExactIncome('west', sim1v6.players.west);
		expect(exact1v6 / exact1v1).toBeCloseTo(6, 6);

		const sim5v3 = new Simulation({
			teamSizeWest: 5,
			teamSizeEast: 3,
			botDifficulty: 0,
			startGold: 500,
			seed: 99
		});
		expect(sim5v3.teamMembers.west).toHaveLength(5);
		expect(sim5v3.teamMembers.east).toHaveLength(3);
	});

	it('runs online WC3 slot bots deterministically across peers without desync', () => {
		const slots = buildRoomSlots(1, 3, {
			east_2: { kind: 'bot', botDifficulty: 15, race: 'Орки' },
			east_3: { kind: 'closed' }
		});
		expect(countOpenHumanCapacity({ slots })).toBe(2);

		const info: RoomInfo = {
			gameId: 'castlefight',
			rulesVersion: 1,
			seed: 13579,
			status: 'playing',
			hostUid: 'u_west',
			createdAt: 1000,
			config: {
				modeId: 'standard',
				teamSize: 3,
				teamSizeWest: 1,
				teamSizeEast: 3,
				slots,
				targetWins: 2
			},
			roster: [
				{ uid: 'u_west', name: 'HumanWest', team: 'west', slot: 1, race: 'Альянс' },
				{ uid: 'u_east', name: 'HumanEast', team: 'east', slot: 2, race: 'Ельфи' }
			]
		};
		const members: Member[] = [
			{ uid: 'u_west', name: 'HumanWest', role: 'player', order: 1, slot: 1, team: 'west' },
			{ uid: 'u_east', name: 'HumanEast', role: 'player', order: 2, slot: 2, team: 'east' }
		];

		const peerA = createOnlineSimulation(info, members, 'u_west');
		const peerB = createOnlineSimulation(info, members, 'u_east');

		// West: 1 human. East: 1 human (slot 2) + 1 bot (slot 4), closed slot 6 excluded
		expect(peerA.sim.teamMembers.west).toHaveLength(1);
		expect(peerA.sim.teamMembers.east).toHaveLength(2);
		expect(peerA.sim.bots).toHaveLength(1);
		expect(peerA.sim.bots[0].getPlayer().slot).toBe(4);
		expect(peerA.sim.config.autoStepBots).toBe(true);

		for (let i = 0; i < 600; i++) {
			peerA.sim.step(1 / 60);
			peerB.sim.step(1 / 60);
		}

		// The online bot on East slot 4 should have constructed buildings identically on both peers
		expect(peerA.sim.buildings.some((b) => b.playerSlot === 4)).toBe(true);
		expect(computeSimStateChecksum(peerA.sim)).toBe(computeSimStateChecksum(peerB.sim));
	});

	it('respects open/bot/closed seats in pickFirstAvailableSeat and validates slots 1..14', () => {
		const slots = buildRoomSlots(2, 2, {
			west_1: { kind: 'open' },
			west_2: { kind: 'bot', botDifficulty: 30 },
			east_1: { kind: 'closed' },
			east_2: { kind: 'open' }
		});
		const seat = pickFirstAvailableSeat([{ team: 'west', slot: 1 }], 'west', { slots });
		expect(seat).toEqual({ team: 'east', slot: 4 });

		expect(
			validatePlayerMove({
				seq: 1,
				by: 'u1',
				type: 'BUILD',
				payload: { tick: 10, team: 'west', playerSlot: 14, buildingType: 'h000', x: 10, y: 10 }
			}).valid
		).toBe(true);
		expect(
			validatePlayerMove({
				seq: 2,
				by: 'u1',
				type: 'BUILD',
				payload: { tick: 10, team: 'west', playerSlot: 15, buildingType: 'h000', x: 10, y: 10 }
			}).valid
		).toBe(false);
	});
});
