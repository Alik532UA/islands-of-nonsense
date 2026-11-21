/**
 * Доменна ієрархія помилок (ERROR-HANDLING-v10).
 */
export class CastleFightError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CastleFightError';
	}
}

export class SimulationError extends CastleFightError {
	constructor(
		message: string,
		public readonly tick?: number
	) {
		super(`[SimulationError${tick !== undefined ? ` at tick ${tick}` : ''}]: ${message}`);
		this.name = 'SimulationError';
	}
}

export class BuildingPlacementError extends CastleFightError {
	constructor(
		message: string,
		public readonly tileX: number,
		public readonly tileY: number,
		public readonly reason: 'occupied' | 'insufficient_gold' | 'out_of_bounds' | 'unknown_building'
	) {
		super(`[BuildingPlacementError at (${tileX}, ${tileY}) - ${reason}]: ${message}`);
		this.name = 'BuildingPlacementError';
	}
}

export class StorageError extends CastleFightError {
	constructor(
		message: string,
		public readonly key: string
	) {
		super(`[StorageError key=${key}]: ${message}`);
		this.name = 'StorageError';
	}
}
