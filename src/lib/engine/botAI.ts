import type { Simulation } from './simulation';
import type { Team, Building, BuildingDefinition } from './types';
import { getBaseBuildingsForRace, getUpgradesForBuilding } from './gameData';

export class BotAI {
	private sim: Simulation;
	private team: Team = 'east';
	private decisionTimer = 1.5;

	constructor(sim: Simulation) {
		this.sim = sim;
	}

	public update(dt: number): void {
		this.decisionTimer -= dt;
		if (this.decisionTimer <= 0) {
			this.decisionTimer = 1.5 + Math.random() * 0.5;
			this.makeDecision();
		}
	}

	private makeDecision(): void {
		const player = this.sim.players[this.team];
		if (!player || !player.isBot) return;

		// 1. Forge decision: if surplus gold, buy forge upgrades
		if (player.gold > 350) {
			if (this.sim.gameTime < 300 && player.forge.econ < 2) {
				const cost = this.sim.getForgePrice(this.team, 'econ');
				if (player.gold >= cost + 150) {
					this.sim.upgradeForge(this.team, 'econ');
					return;
				}
			}

			if (player.forge.attack < 5) {
				const cost = this.sim.getForgePrice(this.team, 'attack');
				if (player.gold >= cost + 150) {
					this.sim.upgradeForge(this.team, 'attack');
					return;
				}
			}

			if (player.forge.armor < 4) {
				const cost = this.sim.getForgePrice(this.team, 'armor');
				if (player.gold >= cost + 150) {
					this.sim.upgradeForge(this.team, 'armor');
					return;
				}
			}
		}

		// 2. Building Upgrades: evaluate existing buildings for tier 2/3 upgrades
		const upgradeCandidates: { building: Building; upgrade: BuildingDefinition; cost: number }[] =
			[];
		for (const b of this.sim.buildings) {
			if (b.team === this.team) {
				const availableUpgrades = getUpgradesForBuilding(b.defId);
				for (const up of availableUpgrades) {
					const cost =
						up.upgrade_extra_cost > 0
							? up.upgrade_extra_cost
							: Math.max(50, (up.gold_cost || 200) - b.goldCost);
					if (player.gold >= cost) {
						upgradeCandidates.push({ building: b, upgrade: up, cost });
					}
				}
			}
		}

		if (upgradeCandidates.length > 0 && Math.random() < 0.45) {
			const candidate = upgradeCandidates[Math.floor(Math.random() * upgradeCandidates.length)];
			this.sim.upgradeBuilding(this.team, candidate.building.instanceId, candidate.upgrade.id);
			return;
		}

		// 3. Building placement decision:
		// Find available building spots (3 cols x 8 rows)
		const occupied = new Set(
			this.sim.buildings.filter((b) => b.team === this.team).map((b) => `${b.tileX}:${b.tileY}`)
		);

		const freeSlots: { x: number; y: number }[] = [];
		for (let x = 0; x < 3; x++) {
			for (let y = 0; y < 8; y++) {
				if (!occupied.has(`${x}:${y}`)) {
					freeSlots.push({ x, y });
				}
			}
		}

		if (freeSlots.length === 0) return;

		// Pick candidate buildings for bot's race
		const baseBuildings = getBaseBuildingsForRace(player.race);
		const affordable = baseBuildings.filter((b) => (b.gold_cost || 200) <= player.gold);

		if (affordable.length > 0) {
			const existingCounts = new Map<string, number>();
			for (const b of this.sim.buildings) {
				if (b.team === this.team) {
					existingCounts.set(b.defId, (existingCounts.get(b.defId) || 0) + 1);
				}
			}

			affordable.sort((a, b) => {
				const countA = existingCounts.get(a.id) || 0;
				const countB = existingCounts.get(b.id) || 0;
				return countA - countB || (b.gold_cost || 0) - (a.gold_cost || 0);
			});

			const chosenBuilding = affordable[0];
			const randomSlot = freeSlots[Math.floor(Math.random() * freeSlots.length)];
			const lane = randomSlot.y < 4 ? 'top' : 'bottom';

			this.sim.build(this.team, chosenBuilding.id, randomSlot.x, randomSlot.y, lane);
		}
	}
}
