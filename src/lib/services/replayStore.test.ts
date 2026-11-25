import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { MatchReplayData } from '$lib/engine/replaySerializer';
import {
	consumePendingReplay,
	listSavedReplays,
	saveMatchReplay,
	setPendingReplay
} from './replayStore.svelte';
import { storage } from './storage';

describe('replayStore', () => {
	const mockStore: Record<string, string> = {};
	const origWindow = (globalThis as { window?: unknown }).window;

	beforeEach(() => {
		for (const k of Object.keys(mockStore)) delete mockStore[k];
		(globalThis as unknown as { window: unknown }).window = {
			localStorage: {
				getItem: (key: string) => mockStore[key] ?? null,
				setItem: (key: string, value: string) => {
					mockStore[key] = value;
				},
				removeItem: (key: string) => {
					delete mockStore[key];
				},
				get length() {
					return Object.keys(mockStore).length;
				},
				key: (i: number) => Object.keys(mockStore)[i] ?? null
			},
			sessionStorage: {
				getItem: () => null,
				setItem: () => {},
				removeItem: () => {},
				length: 0,
				key: () => null
			}
		};
		storage.clear();
	});

	afterEach(() => {
		if (origWindow === undefined) {
			delete (globalThis as { window?: unknown }).window;
		} else {
			(globalThis as { window?: unknown }).window = origWindow;
		}
	});

	function makeReplay(seed: number, timestamp: number): MatchReplayData {
		return {
			version: '1.0.0',
			mapId: 'classic_bridges',
			gameMode: 'standard',
			timestamp,
			randomSeed: seed,
			westCommander: 'Захід',
			eastCommander: 'Схід',
			westRace: 'Альянс',
			eastRace: 'Орки',
			actions: [
				{
					tick: 120,
					team: 'west',
					actionType: 'BUILD',
					payload: { buildingType: 'b001', x: 10, y: 12 }
				}
			],
			result: {
				winner: 'west',
				totalTicks: 1800,
				westCastleHp: 11000,
				eastCastleHp: 0
			}
		};
	}

	it('saves and keeps at most 5 recent replays', () => {
		for (let i = 1; i <= 7; i++) {
			saveMatchReplay(makeReplay(i, 1000 + i));
		}
		const list = listSavedReplays();
		expect(list).toHaveLength(5);
		expect(list[0].timestamp).toBe(1007);
		expect(list[4].timestamp).toBe(1003);
	});

	it('stores and consumes a pending serialized replay cleanly', () => {
		const { serialized } = saveMatchReplay(makeReplay(77, 5000));
		expect(setPendingReplay(serialized)).toBe(true);
		const first = consumePendingReplay();
		expect(first.data?.randomSeed).toBe(77);
		expect(first.data?.westRace).toBe('Альянс');
		const second = consumePendingReplay();
		expect(second.data).toBeNull();
	});
});
