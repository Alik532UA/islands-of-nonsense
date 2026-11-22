import type { Simulation } from './simulation';
import { ARENA_WIDTH } from './constants';
import type { MatchTeam, Building, BuildingDefinition, Lane, PlayerState } from './types';
import {
	getBaseBuildingsForRace,
	getUpgradesForBuilding,
	isLegendaryBuilding,
	UNITS_MAP,
	SPECIAL_BUILDINGS
} from './gameData';

export interface EnemyArmyScan {
	flyingCount: number;
	heavyCount: number;
	lightCount: number;
	fortCount: number;
	mediumCount: number;
	totalCount: number;
	topPressure: number;
	bottomPressure: number;
}

export const BOT_TIER_LIMITS: Record<number, { minPrice: number; maxPrice: number }> = {
	0: { minPrice: 0, maxPrice: 285 },
	1: { minPrice: 0, maxPrice: 450 },
	2: { minPrice: 165, maxPrice: 650 },
	3: { minPrice: 165, maxPrice: 5000 },
	4: { minPrice: 200, maxPrice: 5000 }
};

export class BotAI {
	private sim: Simulation;
	private team: MatchTeam = 'east';
	private player?: PlayerState;
	private decisionTimer = 1.5;

	constructor(sim: Simulation, team: MatchTeam = 'east', player?: PlayerState) {
		this.sim = sim;
		this.team = team;
		this.player = player;
	}

	public getTeam(): MatchTeam {
		return this.team;
	}

	public getPlayer(): PlayerState {
		return this.player || this.sim.players[this.team];
	}

	public update(dt: number): void {
		this.decisionTimer -= dt;
		if (this.decisionTimer <= 0) {
			this.decisionTimer = 1.5 + Math.random() * 0.5;
			this.makeDecision();
		}
	}

	/**
	 * Calculates the bot price tier (0 - 4) based on income and gold in hand.
	 * Follows WC3 reference/docs/05_БОТЫ.md:
	 * Natural income thresholds: 15, 27, 65.
	 * Raised gold thresholds: 360, 560, 800.
	 */
	public calculateTier(income: number, gold: number): number {
		let naturalTier = 0;
		if (income >= 65) naturalTier = 3;
		else if (income >= 27) naturalTier = 2;
		else if (income >= 15) naturalTier = 1;

		let goldTier = 0;
		if (gold >= 800) goldTier = 4;
		else if (gold >= 560) goldTier = 3;
		else if (gold >= 360) goldTier = 2;

		return Math.max(naturalTier, goldTier);
	}

	/**
	 * Scans enemy units on the battlefield to detect unit composition and lane pressure.
	 */
	public scanEnemyArmy(): EnemyArmyScan {
		const enemyTeam = this.team === 'west' ? 'east' : 'west';
		const myCastle = this.sim.castles[this.team];

		const scan: EnemyArmyScan = {
			flyingCount: 0,
			heavyCount: 0,
			lightCount: 0,
			fortCount: 0,
			mediumCount: 0,
			totalCount: 0,
			topPressure: 0,
			bottomPressure: 0
		};

		for (const u of this.sim.units) {
			if (u.team !== enemyTeam || u.state === 'DEAD') continue;

			scan.totalCount++;
			if (u.flying) scan.flyingCount++;

			const armor = u.armorType?.toLowerCase();
			if (armor === 'large' || armor === 'heavy') scan.heavyCount++;
			else if (armor === 'small' || armor === 'light') scan.lightCount++;
			else if (armor === 'fort' || armor === 'fortified') scan.fortCount++;
			else scan.mediumCount++;

			// Lane pressure: closer to our castle means higher immediate threat
			const distToCastle = Math.hypot(u.x - myCastle.x, u.y - myCastle.y);
			const pressure = Math.max(1, 1500 - distToCastle);
			if (u.lane === 'top') {
				scan.topPressure += pressure;
			} else {
				scan.bottomPressure += pressure;
			}
		}

		return scan;
	}

	/**
	 * Evaluates candidate building:
	 * Base 5000 + price weight - duplicate penalty (-60/ea) + counter-pick bonuses.
	 */
	public scoreBuilding(
		building: BuildingDefinition,
		tier: number,
		scan: EnemyArmyScan,
		existingCount: number
	): number {
		let score = 5000;
		const cost = building.gold_cost || 200;

		// Price weight: price / 4 when tier >= 2, or price / 15
		score += tier >= 2 ? cost / 4 : cost / 15;

		// Duplicate repetition penalty: -60 pts for each identical building
		score -= existingCount * 60;

		// Unit tactical counters
		const unitDef = building.unit ? UNITS_MAP.get(building.unit) : null;
		if (unitDef) {
			const canHitAir = unitDef.flying || (unitDef.range !== null && unitDef.range > 120);

			// Anti-Air scoring
			if (scan.flyingCount > 0) {
				if (canHitAir) {
					score += 350;
				} else {
					score -= 150;
				}
			}

			// Attack type vs Armor type counter-scoring
			if (scan.totalCount > 0) {
				const attack = unitDef.attack_type?.toLowerCase() || 'normal';
				if (attack === 'magic' && scan.heavyCount > 0) {
					score += 200 * (scan.heavyCount / scan.totalCount);
				}
				if ((attack === 'pierce' || attack === 'siege') && scan.lightCount > 0) {
					score += 200 * (scan.lightCount / scan.totalCount);
				}
				if (attack === 'siege' && scan.fortCount > 0) {
					score += 250 * (scan.fortCount / scan.totalCount);
				}
				if (attack === 'normal' && scan.mediumCount > 0) {
					score += 150 * (scan.mediumCount / scan.totalCount);
				}
			}
		}

		return score;
	}

	private makeDecision(): void {
		const player = this.getPlayer();
		if (!player || !player.isBot) return;

		const myCastle = this.sim.castles[this.team];
		const castleHpRatio = myCastle.hp / myCastle.maxHp;

		// 00. Adapt Commander to Race Strategy
		if (player.commander === 3 && player.race) {
			if (player.race === 'Люди') {
				player.commander = 1; // Саша: +12% доходу
			} else if (player.race === 'Ельфи') {
				player.commander = 5; // Юра: 25% крит дальнього бою
			} else if (player.race === 'Північ') {
				player.commander = 4; // Дэн: +24% швидкості атаки
			} else if (player.race === 'Хаос') {
				player.commander = 3; // Дима: +24% шкоди
			}
		}

		// 0. Base Breach Defense & Evacuation: if enemies breached courtyard
		const enemyTeam = this.team === 'west' ? 'east' : 'west';
		const botWorker = player.worker;
		const enemiesInCourtyard = this.sim.units.filter(
			(u) =>
				u.team === enemyTeam &&
				u.state !== 'DEAD' &&
				(this.team === 'west' ? u.x <= 1500 : u.x >= ARENA_WIDTH - 1500)
		);

		if (botWorker && enemiesInCourtyard.length > 0) {
			// If castle is wounded and bot has gold, dispatch worker to repair from rear safety
			if (myCastle.hp < myCastle.maxHp && player.gold >= 15 && !botWorker.isBuilding) {
				if (!botWorker.isRepairing) {
					this.sim.repairBuilding(this.team, 'castle_' + this.team, player);
				}
			} else if (!botWorker.isBuilding && !botWorker.isRepairing) {
				// Evacuate worker behind castle safe rampart
				const safeX = this.team === 'west' ? 120 : ARENA_WIDTH - 120;
				const safeY = 1200;
				if (Math.hypot(botWorker.x - safeX, botWorker.y - safeY) > 40) {
					this.sim.orderWorkerMove(this.team, safeX, safeY, player);
				}
			}
		}

		// 0a. Idle worker coin pickup on team base
		if (
			botWorker &&
			enemiesInCourtyard.length === 0 &&
			!botWorker.isBuilding &&
			!botWorker.isRepairing &&
			!botWorker.targetBuildingId
		) {
			const nearbyCoin = this.sim.goldCoins.find(
				(c) =>
					(this.team === 'west' ? c.x <= 1500 : c.x >= ARENA_WIDTH - 1500) &&
					Math.hypot(c.x - botWorker.x, c.y - botWorker.y) <= 800
			);
			if (nearbyCoin) {
				this.sim.orderWorkerMove(this.team, nearbyCoin.x, nearbyCoin.y, player);
			}
		}

		// 0c. Idle worker repairing damaged friendly buildings and towers
		if (
			botWorker &&
			enemiesInCourtyard.length === 0 &&
			!botWorker.isBuilding &&
			!botWorker.isRepairing &&
			!botWorker.targetBuildingId &&
			player.gold >= 30
		) {
			const damagedBld = this.sim.buildings.find(
				(b) => b.team === this.team && !b.isUnderConstruction && b.hp < b.maxHp * 0.85
			);
			if (damagedBld) {
				this.sim.repairBuilding(this.team, damagedBld.instanceId, player);
				return;
			}
		}

		// 0b. Emergency Rescue Strike
		if (this.sim.canUseRescueStrike(this.team)) {
			const enemyTeam = this.team === 'west' ? 'east' : 'west';
			const enemyNearCastle = this.sim.units.filter(
				(u) =>
					u.team === enemyTeam &&
					u.state !== 'DEAD' &&
					Math.hypot(u.x - myCastle.x, u.y - myCastle.y) <= 750
			);
			if (enemyNearCastle.length >= 3 || (castleHpRatio < 0.4 && enemyNearCastle.length >= 1)) {
				this.sim.triggerRescueStrike(this.team);
				return;
			}
		}

		// 1. Race skill decision: use when unlocked and enemy forces are gathered
		if (this.sim.canUseRaceSkill(this.team)) {
			const enemyCount = this.sim.units.filter(
				(u) => u.team !== this.team && u.state !== 'DEAD'
			).length;
			if (enemyCount >= 3) {
				this.sim.useRaceSkill(this.team);
				return;
			}
		}

		// 2. Castle Emergency Defense & Shop
		if (castleHpRatio < 0.4) {
			if (this.sim.canBuyCastleItem(this.team, 'I00F')) {
				this.sim.buyCastleItem(this.team, 'I00F');
				return;
			}
			if (castleHpRatio < 0.3 && this.sim.canBuyCastleItem(this.team, 'I004')) {
				this.sim.buyCastleItem(this.team, 'I004');
				return;
			}
		}

		if (this.sim.canBuyCastleItem(this.team, 'I00E')) {
			const enemyTeam = this.team === 'west' ? 'east' : 'west';
			const enemyNearCastle = this.sim.units.filter(
				(u) =>
					u.team === enemyTeam &&
					u.state !== 'DEAD' &&
					Math.hypot(u.x - myCastle.x, u.y - myCastle.y) <= 1000
			);
			if (enemyNearCastle.length >= 3) {
				this.sim.buyCastleItem(this.team, 'I00E');
				return;
			}
		}

		// 3. Forge decision: buy forge upgrades if surplus gold
		if (player.gold > 350) {
			if (this.sim.gameTime < 300 && player.forge.econ < 2) {
				const cost = this.sim.getForgePrice(this.team, 'econ', player);
				if (player.gold >= cost + 150) {
					this.sim.upgradeForge(this.team, 'econ', player);
					return;
				}
			}

			if (player.forge.attack < 5) {
				const cost = this.sim.getForgePrice(this.team, 'attack', player);
				if (player.gold >= cost + 150) {
					this.sim.upgradeForge(this.team, 'attack', player);
					return;
				}
			}

			if (player.forge.armor < 4) {
				const cost = this.sim.getForgePrice(this.team, 'armor', player);
				if (player.gold >= cost + 150) {
					this.sim.upgradeForge(this.team, 'armor', player);
					return;
				}
			}
		}

		// 4. Calculate Current Price Tier based on building investment and gold
		const myBuildings = this.sim.buildings.filter(
			(b) => b.team === this.team && (!b.playerId || b.playerId === player.id)
		);
		const bldValue = myBuildings.reduce((sum, b) => sum + b.goldCost, 0);
		const estimatedIncome = 10 * (0.5 + 0.002 * bldValue) * (1 + 0.1 * player.forge.econ);
		const tier = this.calculateTier(estimatedIncome, player.gold);
		const scan = this.scanEnemyArmy();

		// 5. Building Upgrades: evaluate existing buildings for tier 2/3 upgrades
		const upgradeCandidates: { building: Building; upgrade: BuildingDefinition; cost: number }[] =
			[];
		for (const b of myBuildings) {
			const availableUpgrades = getUpgradesForBuilding(b.defId);
			for (const up of availableUpgrades) {
				const isLeg = isLegendaryBuilding(up);
				if (isLeg && player.food >= player.maxFood) continue;

				const cost =
					up.upgrade_extra_cost > 0
						? up.upgrade_extra_cost
						: Math.max(50, (up.gold_cost || 200) - b.goldCost);
				if (player.gold >= cost) {
					upgradeCandidates.push({ building: b, upgrade: up, cost });
				}
			}
		}

		// When tier >= 3, upgrade probability is 100% (WC3 reference: "при поднятом ярусе 3+ шанс заменён на 100%")
		if (upgradeCandidates.length > 0 && (tier >= 3 || Math.random() < 0.45)) {
			const candidate = upgradeCandidates[Math.floor(Math.random() * upgradeCandidates.length)];
			this.sim.upgradeBuilding(
				this.team,
				candidate.building.instanceId,
				candidate.upgrade.id,
				player
			);
			return;
		}

		// 6. Building placement decision across base platform:
		const freeSlots: { x: number; y: number }[] = [];
		for (let x = 0; x <= 42; x += 2) {
			for (let y = 0; y <= 70; y += 2) {
				if (this.sim.canBuild(this.team, x, y)) {
					freeSlots.push({ x, y });
				}
			}
		}

		if (freeSlots.length === 0) return;

		// Candidate buildings pool
		const baseBuildings = getBaseBuildingsForRace(player.race);
		let candidateList: BuildingDefinition[] = [...baseBuildings];

		// Filter out legendary buildings if food cap is full
		candidateList = candidateList.filter(
			(b) => !isLegendaryBuilding(b) || player.food < player.maxFood
		);

		// Check special buildings
		const treasureCount = myBuildings.filter((b) => b.specialType === 'treasure').length;
		const repairCount = myBuildings.filter((b) => b.specialType === 'repair').length;

		if (player.gold >= 300 && estimatedIncome < 50 && treasureCount < 1) {
			const chest = SPECIAL_BUILDINGS.find((b) => b.specialType === 'treasure');
			if (chest) candidateList.push(chest);
		}
		if (castleHpRatio < 0.7 && repairCount < 1 && player.gold >= 180) {
			const repair = SPECIAL_BUILDINGS.find((b) => b.specialType === 'repair');
			if (repair) candidateList.push(repair);
		}

		// Existing building counts for repetition penalty
		const existingCounts = new Map<string, number>();
		for (const b of myBuildings) {
			existingCounts.set(b.defId, (existingCounts.get(b.defId) || 0) + 1);
		}

		// Filter candidates by tier range
		const tierLimits = BOT_TIER_LIMITS[tier] || BOT_TIER_LIMITS[0];
		let filtered = candidateList.filter((b) => {
			const cost = b.gold_cost || 200;
			return cost >= tierLimits.minPrice && cost <= tierLimits.maxPrice && cost <= player.gold;
		});

		// Fallback to any affordable building if tier limits produced 0 matches
		if (filtered.length === 0) {
			filtered = candidateList.filter((b) => (b.gold_cost || 200) <= player.gold);
		}

		if (filtered.length === 0) return;

		// Score and sort candidates
		const scoredCandidates = filtered.map((b) => ({
			building: b,
			score: this.scoreBuilding(b, tier, scan, existingCounts.get(b.id) || 0) + Math.random() * 50
		}));

		scoredCandidates.sort((a, b) => b.score - a.score);
		const chosenBuilding = scoredCandidates[0].building;

		// Tactical lane selection based on lane pressure & balance across 60-row arena grid
		const midTileY = 30;
		let preferredSlots: { x: number; y: number }[] = [];
		if (scan.topPressure > scan.bottomPressure + 300) {
			preferredSlots = freeSlots.filter((s) => s.y < midTileY);
		} else if (scan.bottomPressure > scan.topPressure + 300) {
			preferredSlots = freeSlots.filter((s) => s.y >= midTileY);
		} else {
			// Balance lane building count
			const topCount = myBuildings.filter((b) => b.tileY < midTileY).length;
			const bottomCount = myBuildings.filter((b) => b.tileY >= midTileY).length;
			if (topCount < bottomCount) {
				preferredSlots = freeSlots.filter((s) => s.y < midTileY);
			} else if (bottomCount < topCount) {
				preferredSlots = freeSlots.filter((s) => s.y >= midTileY);
			}
		}

		const chosenSlot =
			preferredSlots.length > 0
				? preferredSlots[Math.floor(Math.random() * preferredSlots.length)]
				: freeSlots[Math.floor(Math.random() * freeSlots.length)];

		if (!chosenSlot) return;

		const lane: Lane = chosenSlot.y < 4 ? 'top' : 'bottom';
		this.sim.build(this.team, chosenBuilding.id, chosenSlot.x, chosenSlot.y, lane, player);
	}
}
