export interface CustomUnitDefinition {
	id: string;
	name: string;
	cost: number;
	lumberCost?: number;
	hp: number;
	damage: number;
	range: number;
	attackSpeed: number;
	moveSpeed: number;
	armorType: 'unarmored' | 'light' | 'medium' | 'heavy' | 'fortified' | 'hero';
	attackType: 'normal' | 'pierce' | 'siege' | 'magic' | 'chaos' | 'hero';
	isAir?: boolean;
	abilities?: string[];
}

export interface CustomRaceDefinition {
	id: string;
	name: string;
	description: string;
	commander: string;
	buildings: {
		tier1: CustomUnitDefinition[];
		tier2?: CustomUnitDefinition[];
		special?: CustomUnitDefinition;
		legendary?: CustomUnitDefinition;
	};
	innateAbilities?: string[];
	version: string;
}

export class RaceRegistry {
	private static _instance: RaceRegistry;
	private _races: Map<string, CustomRaceDefinition> = new Map();

	private constructor() {}

	static getInstance(): RaceRegistry {
		if (!this._instance) {
			this._instance = new RaceRegistry();
		}
		return this._instance;
	}

	register(race: CustomRaceDefinition): boolean {
		const validation = this.validateRace(race);
		if (!validation.valid) {
			return false;
		}

		this._races.set(race.id, race);
		return true;
	}

	get(id: string): CustomRaceDefinition | undefined {
		return this._races.get(id);
	}

	has(id: string): boolean {
		return this._races.has(id);
	}

	list(): CustomRaceDefinition[] {
		return Array.from(this._races.values());
	}

	remove(id: string): boolean {
		return this._races.delete(id);
	}

	validateRace(race: CustomRaceDefinition): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (!race.id || typeof race.id !== 'string') {
			errors.push('Race ID must be a non-empty string');
		}

		if (!race.name || typeof race.name !== 'string') {
			errors.push('Race name is required');
		}

		if (
			!race.buildings ||
			!race.buildings.tier1 ||
			!Array.isArray(race.buildings.tier1) ||
			race.buildings.tier1.length === 0
		) {
			errors.push('Race must contain at least 1 Tier 1 building');
		} else {
			race.buildings.tier1.forEach((b, idx) => {
				if (!b.id || b.cost < 0 || b.hp <= 0 || b.damage < 0) {
					errors.push(`Tier 1 building #${idx + 1} has invalid parameters`);
				}
			});
		}

		return {
			valid: errors.length === 0,
			errors
		};
	}

	clear(): void {
		this._races.clear();
	}
}
