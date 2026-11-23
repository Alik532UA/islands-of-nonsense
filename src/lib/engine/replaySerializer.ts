import type { MatchAnalyticsReport } from './matchStats';

export interface ReplayAction {
	tick: number;
	team: 'west' | 'east';
	actionType: 'BUILD' | 'UPGRADE' | 'SELL' | 'REPAIR' | 'USE_ABILITY';
	payload: {
		buildingType?: string;
		x?: number;
		y?: number;
		targetId?: string;
		abilityId?: string;
	};
}

export interface MatchReplayData {
	version: string;
	mapId: string;
	gameMode: string;
	timestamp: number;
	randomSeed: number;
	westCommander: string;
	eastCommander: string;
	actions: ReplayAction[];
	result?: {
		winner: 'west' | 'east' | 'draw';
		totalTicks: number;
		westCastleHp: number;
		eastCastleHp: number;
	};
	analytics?: MatchAnalyticsReport;
}

export class ReplaySerializer {
	static readonly CURRENT_REPLAY_VERSION = '1.0.0';

	static serialize(data: MatchReplayData): string {
		const payload = {
			...data,
			version: this.CURRENT_REPLAY_VERSION,
			checksum: this.calculateChecksum(data)
		};
		return JSON.stringify(payload);
	}

	static deserialize(jsonString: string): {
		success: boolean;
		data?: MatchReplayData;
		error?: string;
	} {
		try {
			const parsed = JSON.parse(jsonString);
			if (!parsed.version || !parsed.actions || !Array.isArray(parsed.actions)) {
				return { success: false, error: 'Malformed replay JSON format' };
			}

			const storedChecksum = parsed.checksum;
			const expectedChecksum = this.calculateChecksum(parsed);
			if (storedChecksum && storedChecksum !== expectedChecksum) {
				return { success: false, error: 'Replay checksum mismatch / tampered data' };
			}

			return { success: true, data: parsed as MatchReplayData };
		} catch (err) {
			return { success: false, error: (err as Error).message };
		}
	}

	private static calculateChecksum(data: MatchReplayData): string {
		const actionCount = data.actions ? data.actions.length : 0;
		const baseStr = `${data.mapId}_${data.randomSeed}_${actionCount}_${data.westCommander}_${data.eastCommander}`;
		let hash = 0;
		for (let i = 0; i < baseStr.length; i++) {
			hash = ((hash << 5) - hash + baseStr.charCodeAt(i)) | 0;
		}
		return `cf_${Math.abs(hash).toString(16)}`;
	}
}
