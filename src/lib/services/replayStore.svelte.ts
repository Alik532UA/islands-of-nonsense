import { ReplaySerializer, type MatchReplayData } from '$lib/engine/replaySerializer';
import { storage } from './storage';

export interface SavedReplaySummary {
	id: string;
	timestamp: number;
	gameMode: string;
	westRace: string;
	eastRace: string;
	winner: 'west' | 'east' | 'draw';
	totalTicks: number;
	actionCount: number;
	serialized: string;
}

const SAVED_REPLAYS_KEY = 'saved_replays';
const PENDING_REPLAY_KEY = 'pending_replay';
const MAX_SAVED_REPLAYS = 5;

export function listSavedReplays(): SavedReplaySummary[] {
	const raw = storage.getJSON<SavedReplaySummary[]>(SAVED_REPLAYS_KEY, []);
	if (!Array.isArray(raw)) return [];
	return raw.filter((r) => r && typeof r.serialized === 'string' && typeof r.id === 'string');
}

export function saveMatchReplay(data: MatchReplayData): {
	serialized: string;
	summary: SavedReplaySummary;
} {
	const serialized = ReplaySerializer.serialize(data);
	const summary: SavedReplaySummary = {
		id: `rep_${data.timestamp}_${data.randomSeed}`,
		timestamp: data.timestamp,
		gameMode: data.gameMode,
		westRace: data.westRace || data.westCommander,
		eastRace: data.eastRace || data.eastCommander,
		winner: data.result?.winner ?? 'draw',
		totalTicks: data.result?.totalTicks ?? 0,
		actionCount: data.actions.length,
		serialized
	};

	const existing = listSavedReplays().filter((r) => r.id !== summary.id);
	const updated = [summary, ...existing].slice(0, MAX_SAVED_REPLAYS);
	storage.setJSON(SAVED_REPLAYS_KEY, updated);
	return { serialized, summary };
}

export function setPendingReplay(serializedJson: string): boolean {
	return storage.set(PENDING_REPLAY_KEY, serializedJson);
}

export function consumePendingReplay(): {
	data: MatchReplayData | null;
	error?: string;
} {
	const raw = storage.get(PENDING_REPLAY_KEY);
	if (!raw) return { data: null };
	storage.remove(PENDING_REPLAY_KEY);
	const parsed = ReplaySerializer.deserialize(raw);
	if (!parsed.success || !parsed.data) {
		return { data: null, error: parsed.error || 'Invalid replay' };
	}
	return { data: parsed.data };
}
