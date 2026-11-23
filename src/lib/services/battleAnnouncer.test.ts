import { describe, it, expect, beforeEach } from 'vitest';
import { battleAnnouncer } from './battleAnnouncer.svelte';

describe('battleAnnouncer service', () => {
	beforeEach(() => {
		battleAnnouncer.reset();
	});

	it('announces polite messages correctly', () => {
		battleAnnouncer.announce('Гра розпочалася', 'polite');
		expect(battleAnnouncer.polite).toBe('Гра розпочалася');
		expect(battleAnnouncer.assertive).toBe('');
	});

	it('announces assertive messages correctly', () => {
		battleAnnouncer.announce('Увага: Замок атаковано!', 'assertive');
		expect(battleAnnouncer.assertive).toBe('Увага: Замок атаковано!');
		expect(battleAnnouncer.polite).toBe('');
	});

	it('triggers assertive warning when West castle health drops below 25%', () => {
		const mockSim = {
			castles: {
				west: { hp: 200, maxHp: 1000 },
				east: { hp: 1000, maxHp: 1000 }
			},
			activeBossInstanceId: null,
			dayNightPhase: 'day',
			round: 1,
			isRunning: true
		};

		battleAnnouncer.updateFromSimulation(mockSim);
		expect(battleAnnouncer.assertive).toContain('Західний замок у критичному стані');
	});

	it('triggers announcement when boss appears on arena', () => {
		const mockSim = {
			castles: {
				west: { hp: 1000, maxHp: 1000 },
				east: { hp: 1000, maxHp: 1000 }
			},
			activeBossInstanceId: 'boss-123',
			dayNightPhase: 'day',
			round: 1,
			isRunning: true
		};

		battleAnnouncer.updateFromSimulation(mockSim);
		expect(battleAnnouncer.assertive).toContain('Могутній бос зʼявився на арені');
	});

	it('triggers polite announcement on day/night phase change', () => {
		const mockSim = {
			castles: {
				west: { hp: 1000, maxHp: 1000 },
				east: { hp: 1000, maxHp: 1000 }
			},
			activeBossInstanceId: null,
			dayNightPhase: 'day',
			round: 1,
			isRunning: true
		};

		battleAnnouncer.updateFromSimulation(mockSim);
		// Switch to night
		mockSim.dayNightPhase = 'night';
		battleAnnouncer.updateFromSimulation(mockSim);
		expect(battleAnnouncer.polite).toBe('Настала ніч');
	});

	it('triggers polite announcement on round increment', () => {
		const mockSim = {
			castles: {
				west: { hp: 1000, maxHp: 1000 },
				east: { hp: 1000, maxHp: 1000 }
			},
			activeBossInstanceId: null,
			dayNightPhase: 'day',
			round: 2,
			isRunning: true
		};

		battleAnnouncer.updateFromSimulation(mockSim);
		expect(battleAnnouncer.polite).toBe('Розпочався раунд 2');
	});
});
