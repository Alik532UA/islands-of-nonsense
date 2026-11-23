import type { Simulation } from './simulation';
import {
	ARENA_WIDTH,
	WEST_GRID_START_X,
	WEST_GRID_START_Y,
	EAST_GRID_START_X,
	EAST_GRID_START_Y,
	WEST_CASTLE_X,
	EAST_CASTLE_X,
	GRID_STEP,
	CELL_SIZE
} from './constants';
import type {
	MatchTeam,
	Building,
	BuildingDefinition,
	UnitDefinition,
	Lane,
	PlayerState
} from './types';
import {
	getBaseBuildingsForRace,
	getUpgradesForBuilding,
	isLegendaryBuilding,
	getBuildingVisualRank,
	UNITS_MAP,
	SPECIAL_BUILDINGS,
	GUARD_TOWERS
} from './gameData';

export interface EnemyArmyScan {
	flyingCount: number;
	flyingDps?: number;
	totalDps?: number;
	heavyCount: number;
	lightCount: number;
	fortCount: number;
	mediumCount: number;
	totalCount: number;
	topPressure: number;
	bottomPressure: number;
}

export function isAirThreatActive(scan: EnemyArmyScan): boolean {
	if (scan.flyingCount >= 2) return true;
	if (scan.flyingCount >= 1 && scan.totalCount <= 3) return true;
	const fDps = scan.flyingDps ?? 0;
	const tDps = scan.totalDps ?? 0;
	if (tDps > 0 && fDps / tDps >= 0.15) return true;
	return false;
}

export const BOT_TIER_LIMITS: Record<number, { minPrice: number; maxPrice: number }> = {
	0: { minPrice: 0, maxPrice: 285 },
	1: { minPrice: 0, maxPrice: 450 },
	2: { minPrice: 165, maxPrice: 650 },
	3: { minPrice: 165, maxPrice: 5000 },
	4: { minPrice: 200, maxPrice: 5000 }
};

function unitDefCanHitAir(unitDef: UnitDefinition): boolean {
	if (unitDef.canHitAir !== undefined) return unitDef.canHitAir;
	if (unitDef.raw_fields?.ua1g) {
		return String(unitDef.raw_fields.ua1g).toLowerCase().includes('air');
	}
	return !!unitDef.flying || (unitDef.range !== null && unitDef.range > 120);
}

export class BotAI {
	private sim: Simulation;
	private team: MatchTeam = 'east';
	private player?: PlayerState;
	private decisionTimer = 1.5;

	constructor(sim: Simulation, team: MatchTeam = 'east', player?: PlayerState) {
		this.sim = sim;
		this.team = team;
		this.player = player;
		// Stagger initial decision timer (0.4s - 1.8s) so multiple bots on a team don't act in synchronous lockstep
		const slotOffset = player?.slot ? (player.slot * 0.35) % 1.2 : Math.random() * 0.8;
		this.decisionTimer = 0.5 + slotOffset;
	}

	public getTeam(): MatchTeam {
		return this.team;
	}

	public getPlayer(): PlayerState {
		return this.player || this.sim.players[this.team];
	}

	public update(dt: number): void {
		if (this.sim.winner) return;
		this.decisionTimer -= dt;
		if (this.decisionTimer <= 0) {
			this.decisionTimer = 1.2 + Math.random() * 0.8;
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
			flyingDps: 0,
			totalDps: 0,
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
			const uDamage =
				u.damageMax !== undefined && u.damageMin !== undefined
					? (u.damageMax + u.damageMin) / 2
					: u.damageMax || 15;
			const uCd = Math.max(0.4, u.attackCooldown || 1.5);
			const dps = uDamage / uCd;
			scan.totalDps = (scan.totalDps || 0) + dps;

			if (u.flying) {
				scan.flyingCount++;
				scan.flyingDps = (scan.flyingDps || 0) + dps;
			}

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
			const canHitAir = unitDefCanHitAir(unitDef);

			// Anti-Air scoring
			const isAirThreat = isAirThreatActive(scan);
			if (isAirThreat) {
				if (canHitAir) {
					score += 5000;
				} else {
					score -= 2000;
				}
			} else if (scan.flyingCount > 0) {
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

	public makeDecision(): void {
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
		const isWorkerBusy =
			!botWorker ||
			botWorker.isBuilding ||
			!!botWorker.targetBuildingId ||
			(botWorker.buildQueue && botWorker.buildQueue.length > 0) ||
			botWorker.isRepairing;

		const enemiesInCourtyard = this.sim.units.filter(
			(u) =>
				u.team === enemyTeam &&
				u.state !== 'DEAD' &&
				(this.team === 'west' ? u.x <= 1500 : u.x >= ARENA_WIDTH - 1500)
		);

		// 00a. Complete any unfinished buildings under construction first (if base is safe!)
		if (
			enemiesInCourtyard.length === 0 &&
			botWorker &&
			!botWorker.isBuilding &&
			!botWorker.isRepairing
		) {
			const unfinished = this.sim.buildings.find(
				(b) =>
					b.team === this.team && (!b.playerId || b.playerId === player.id) && b.isUnderConstruction
			);
			if (unfinished && botWorker.targetBuildingId !== unfinished.instanceId) {
				const resumed = this.sim.continueConstruction(this.team, unfinished.instanceId, player);
				if (resumed) return;
			}
		}

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
			return;
		}

		// 0a. Idle worker coin pickup on team base (cooperative / independent without swarming)
		if (botWorker && enemiesInCourtyard.length === 0 && !isWorkerBusy) {
			const allyWorkers = (this.sim.teamMembers[this.team] || [])
				.map((tm) => tm.worker)
				.filter((aw): aw is NonNullable<typeof aw> => !!aw && aw !== botWorker);

			const availableCoins = this.sim.goldCoins.filter((c) => {
				const onOurBase = this.team === 'west' ? c.x <= 1500 : c.x >= ARENA_WIDTH - 1500;
				if (!onOurBase) return false;
				// Avoid coins already targeted by an ally worker in close proximity
				return !allyWorkers.some((aw) => Math.hypot(aw.targetX - c.x, aw.targetY - c.y) < 35);
			});

			if (availableCoins.length > 0) {
				availableCoins.sort(
					(a, b) =>
						Math.hypot(a.x - botWorker.x, a.y - botWorker.y) -
						Math.hypot(b.x - botWorker.x, b.y - botWorker.y)
				);
				const nearestCoin = availableCoins[0];
				if (Math.hypot(nearestCoin.x - botWorker.x, nearestCoin.y - botWorker.y) <= 800) {
					this.sim.orderWorkerMove(this.team, nearestCoin.x, nearestCoin.y, player);
				}
			}
		}

		// 0c. Idle worker repairing damaged friendly buildings and towers (only if not busy)
		if (botWorker && enemiesInCourtyard.length === 0 && !isWorkerBusy && player.gold >= 30) {
			const damagedBld = this.sim.buildings.find(
				(b) =>
					b.team === this.team &&
					(!b.playerId || b.playerId === player.id || b.specialType === 'tower') &&
					!b.isUnderConstruction &&
					b.hp < b.maxHp * 0.85
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

		if (this.sim.canBuyCastleItem(this.team, 'I000')) {
			const buffedUnits = this.sim.units.filter(
				(u) => u.state !== 'DEAD' && u.buffs && u.buffs.length > 0
			);
			if (buffedUnits.length >= 4) {
				this.sim.buyCastleItem(this.team, 'I000');
				return;
			}
		}

		// 3. Forge decision: Team BotSmith vs standard bots (WC3 CF_BotForge)
		const isSmith = this.isBotSmith(player);
		const maxAttack = isSmith ? 5 : 2;
		const maxArmor = isSmith ? 5 : 1;
		const maxEcon = isSmith ? 2 : 1;

		if (player.gold > 350) {
			// Economy upgrade: first 5 minutes (gameTime < 300)
			if (this.sim.gameTime < 300 && player.forge.econ < maxEcon) {
				const cost = this.sim.getForgePrice(this.team, 'econ', player);
				if (player.gold >= cost + 250) {
					this.sim.upgradeForge(this.team, 'econ', player);
					return;
				}
			}

			// Attack upgrade: gameTime >= 60s, attack <= armor or armor >= maxArmor
			if (
				this.sim.gameTime >= 60 &&
				player.forge.attack < maxAttack &&
				(player.forge.attack <= player.forge.armor || player.forge.armor >= maxArmor)
			) {
				const cost = this.sim.getForgePrice(this.team, 'attack', player);
				if (player.gold >= cost + 250) {
					this.sim.upgradeForge(this.team, 'attack', player);
					return;
				}
			}

			// Armor upgrade: gameTime >= 60s
			if (this.sim.gameTime >= 60 && player.forge.armor < maxArmor) {
				const cost = this.sim.getForgePrice(this.team, 'armor', player);
				if (player.gold >= cost + 250) {
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

				const cost = up.upgrade_from
					? (up.gold_cost ?? 200)
					: Math.max(50, (up.gold_cost || 200) - b.goldCost);
				if (player.gold >= cost) {
					upgradeCandidates.push({ building: b, upgrade: up, cost });
				}
			}
		}

		// When tier >= 3, upgrade probability is 100% (WC3 reference: "при поднятом ярусе 3+ шанс заменён на 100%")
		if (upgradeCandidates.length > 0 && (tier >= 3 || Math.random() < 0.45)) {
			// Score upgrade candidates with tactical counter-picks rather than pure random choice
			const scoredUpgrades = upgradeCandidates.map((c) => {
				let score = 5000 + c.cost / 4;
				const uDef = c.upgrade.unit ? UNITS_MAP.get(c.upgrade.unit) : null;
				if (uDef) {
					const canHitAir = unitDefCanHitAir(uDef);
					if (isAirThreatActive(scan)) {
						if (canHitAir) score += 5000;
						else score -= 1500;
					} else if (scan.flyingCount > 0 && canHitAir) {
						score += 3500;
					}
					const attack = uDef.attack_type?.toLowerCase() || 'normal';
					if (scan.totalCount > 0) {
						if (attack === 'magic' && scan.heavyCount / scan.totalCount >= 0.3) score += 2000;
						if (
							(attack === 'pierce' || attack === 'siege') &&
							scan.lightCount / scan.totalCount >= 0.35
						) {
							score += 1800;
						}
						if (attack === 'siege' && scan.fortCount > 0) score += 2200;
					}
				}
				return { ...c, score };
			});
			scoredUpgrades.sort((a, b) => b.score - a.score);
			const candidate = scoredUpgrades[0];
			this.sim.upgradeBuilding(
				this.team,
				candidate.building.instanceId,
				candidate.upgrade.id,
				player
			);
			return;
		}

		// Avoid spamming build orders if worker already has pending queue
		if (botWorker?.buildQueue && botWorker.buildQueue.length >= 1) {
			return;
		}

		// 6. Building candidate selection using Diversity Quota and High-Rank Priority
		const chosenBuilding = this.chooseBuildingCandidate(
			player,
			myBuildings,
			scan,
			estimatedIncome,
			castleHpRatio
		);
		if (!chosenBuilding) return;

		// 7. Optimal building placement slot selection
		// Consider all buildings on the team (both own and allies) for spacing and clearance
		const teamBuildings = this.sim.buildings.filter((b) => b.team === this.team);
		const chosenSlot = this.findBestPlacementSlot(scan, teamBuildings);
		if (!chosenSlot) return;

		const lane: Lane = chosenSlot.y < 35 ? 'top' : 'bottom';
		const shiftKey = !!(
			botWorker &&
			(botWorker.isBuilding ||
				botWorker.targetBuildingId ||
				(botWorker.buildQueue && botWorker.buildQueue.length > 0))
		);
		this.sim.build(
			this.team,
			chosenBuilding.id,
			chosenSlot.x,
			chosenSlot.y,
			lane,
			player,
			shiftKey
		);
	}

	/**
	 * Returns base army buildings mapped to their visual rank (1..6) for the given race.
	 */
	public getArmyBuildingRanks(race: string): { building: BuildingDefinition; rank: number }[] {
		const baseBuildings = getBaseBuildingsForRace(race);
		const armySpawners = baseBuildings.filter((b) => !b.specialType && !b.upgrade_from);
		return armySpawners.map((b) => ({
			building: b,
			rank: getBuildingVisualRank(b.id, race).rank
		}));
	}

	/**
	 * Computes counts of existing buildings per rank (1..6) for the bot player.
	 */
	public getRankCounts(myBuildings: Building[], race: string): Map<number, number> {
		const counts = new Map<number, number>();
		for (let r = 1; r <= 6; r++) counts.set(r, 0);

		for (const b of myBuildings) {
			if (!b.specialType) {
				const rank = getBuildingVisualRank(b.defId, b.race || race).rank;
				if (counts.has(rank)) {
					counts.set(rank, (counts.get(rank) || 0) + 1);
				}
			}
		}
		return counts;
	}

	/**
	 * Selects the optimal building candidate complying with:
	 * 1. Start of match: build affordable starter building (rank 1..3) immediately.
	 * 2. Diversity Quota: no rank can exceed minCount by 2 or more (count < minCount + 2).
	 * 3. High-rank priority (6 -> 5 -> 4...) with tactical counter-pick bonuses.
	 * 4. Shortfall saving: if close (<= 60 gold) to high-rank priority, save gold.
	 */
	public chooseBuildingCandidate(
		player: PlayerState,
		myBuildings: Building[],
		scan: EnemyArmyScan,
		estimatedIncome: number,
		castleHpRatio: number
	): BuildingDefinition | null {
		const armyRanks = this.getArmyBuildingRanks(player.race);
		if (armyRanks.length === 0) return null;

		const rankCounts = this.getRankCounts(myBuildings, player.race);
		const availableRanks = armyRanks.map((ar) => ar.rank);
		const minCount = Math.min(...availableRanks.map((r) => rankCounts.get(r) || 0));

		// 1. First building of the match: build affordable starter (rank 1..3) immediately so units spawn to line
		if (myBuildings.length === 0) {
			const starterCandidates = armyRanks
				.filter(
					(ar) =>
						ar.rank <= 3 &&
						(!isLegendaryBuilding(ar.building) || player.food < player.maxFood) &&
						(ar.building.lumber_cost || 0) <= (player.lumber ?? 0) &&
						(ar.building.gold_cost || 200) <= player.gold
				)
				.sort((a, b) => b.rank - a.rank);

			if (starterCandidates.length > 0) {
				return starterCandidates[0].building;
			}
			const cheapest = armyRanks
				.filter((ar) => (ar.building.gold_cost || 200) <= player.gold)
				.sort((a, b) => (a.building.gold_cost || 200) - (b.building.gold_cost || 200));
			if (cheapest.length > 0) return cheapest[0].building;
			return null;
		}

		// 2. Diversity Quota: candidate rank must not exceed minCount by 2 or more
		// i.e. current count < minCount + 2
		const isAirThreat = isAirThreatActive(scan);
		const eligibleArmy = armyRanks.filter((ar) => {
			const currentCount = rankCounts.get(ar.rank) || 0;
			const unitDef = ar.building.unit ? UNITS_MAP.get(ar.building.unit) : null;
			const canHitAir = unitDef ? unitDefCanHitAir(unitDef) : false;
			const isDiverse = currentCount < minCount + 2 || (isAirThreat && canHitAir);
			const foodOk = !isLegendaryBuilding(ar.building) || player.food < player.maxFood;
			const lumberOk = (ar.building.lumber_cost || 0) <= (player.lumber ?? 0);
			return isDiverse && foodOk && lumberOk;
		});

		// 3. Special Buildings (Treasure Chest, Repair Center, Emergency Anti-Air Tower)
		const specialCandidates: { building: BuildingDefinition; priority: number; cost: number }[] =
			[];
		const treasureCount = myBuildings.filter((b) => b.specialType === 'treasure').length;
		const repairCount = myBuildings.filter((b) => b.specialType === 'repair').length;
		const towerCount = myBuildings.filter((b) => b.specialType === 'tower').length;

		if (isAirThreat && towerCount < 2) {
			const raceTower =
				GUARD_TOWERS.find((t) => t.race === player.race) ||
				GUARD_TOWERS.find((t) => t.id === 'h006');
			if (
				raceTower &&
				(raceTower.lumber_cost || 0) <= (player.lumber ?? 0) &&
				player.gold >= (raceTower.gold_cost || 150)
			) {
				specialCandidates.push({
					building: raceTower,
					priority: 5200,
					cost: raceTower.gold_cost || 150
				});
			}
		}

		if (player.gold >= 300 && estimatedIncome < 50 && treasureCount < 1) {
			const chest = SPECIAL_BUILDINGS.find((b) => b.specialType === 'treasure');
			if (chest && (chest.lumber_cost || 0) <= (player.lumber ?? 0)) {
				specialCandidates.push({ building: chest, priority: 4500, cost: chest.gold_cost || 300 });
			}
		}
		if (castleHpRatio < 0.7 && repairCount < 1 && player.gold >= 180) {
			const repair = SPECIAL_BUILDINGS.find((b) => b.specialType === 'repair');
			if (repair && (repair.lumber_cost || 0) <= (player.lumber ?? 0)) {
				specialCandidates.push({
					building: repair,
					priority: castleHpRatio < 0.4 ? 6500 : 3500,
					cost: repair.gold_cost || 180
				});
			}
		}

		// 4. Tactical Counter-Pick and High-Rank Priority (Question 3 Option A - Hybrid)
		const scoredArmy = eligibleArmy.map((ar) => {
			const b = ar.building;
			const rank = ar.rank;
			let priority = rank * 1000; // Rank 6 = 6000, Rank 5 = 5000, Rank 4 = 4000...

			// Counter-pick bonuses:
			const unitDef = b.unit ? UNITS_MAP.get(b.unit) : null;
			if (unitDef) {
				const canHitAir = unitDefCanHitAir(unitDef);
				if (isAirThreat) {
					if (canHitAir) {
						priority += 5000; // Urgent adaptive anti-air response
					} else {
						priority -= 2500; // Heavily penalize ground-only during aerial raid
					}
				} else if (scan.flyingCount > 0 && canHitAir) {
					priority += 3500; // General anti-air response
				}
				const attack = unitDef.attack_type?.toLowerCase() || 'normal';
				if (scan.totalCount > 0) {
					if (attack === 'magic' && scan.heavyCount / scan.totalCount >= 0.3) {
						priority += 2000;
					}
					if (
						(attack === 'pierce' || attack === 'siege') &&
						scan.lightCount / scan.totalCount >= 0.35
					) {
						priority += 1800;
					}
					if (attack === 'siege' && scan.fortCount > 0) {
						priority += 2200;
					}
				}
			}

			// Slight preference for ranks that have fewer copies built
			const currentCount = rankCounts.get(rank) || 0;
			priority -= currentCount * 150;

			return { building: b, priority, cost: b.gold_cost || 200 };
		});

		const allCandidates = [...scoredArmy, ...specialCandidates];
		allCandidates.sort((a, b) => b.priority - a.priority);

		if (allCandidates.length === 0) return null;

		// 5. Select target by priority:
		const topTarget = allCandidates[0];

		// If bot can afford top priority candidate, build it!
		if (topTarget.cost <= player.gold) {
			return topTarget.building;
		}

		// If shortfall to top priority candidate is small and castle is not in emergency:
		// Dynamic shortfall saving: scales with estimated income (between 40g and 150g, ~2-2.5 income cycles)
		const shortfall = topTarget.cost - player.gold;
		const maxShortfallSave = Math.max(40, Math.min(150, estimatedIncome * 2.5));
		if (shortfall <= maxShortfallSave && castleHpRatio >= 0.45) {
			return null; // Save gold!
		}

		// Otherwise: find the highest priority candidate that IS affordable right now
		for (const candidate of allCandidates) {
			if (candidate.cost <= player.gold) {
				return candidate.building;
			}
		}

		return null;
	}

	/**
	 * Selects the optimal building placement slot:
	 * - 99% probability to build behind castle (outer edge of island, away from enemy base).
	 * - 90% probability to leave a 1-tile gap (>= 32px clearance) between all team buildings (both own and ally) rather than placing them flush.
	 * - Priority: build as far as possible from the enemy base.
	 * - Natural chaotic distribution along the furthest tier of candidate slots.
	 * - Graceful fallback to any valid island slot if behind-castle slots or gap slots are full.
	 */
	public findBestPlacementSlot(
		scan: EnemyArmyScan,
		teamBuildings: Building[] = this.sim.buildings.filter((b) => b.team === this.team)
	): { x: number; y: number } | null {
		const startX = this.team === 'west' ? WEST_GRID_START_X : EAST_GRID_START_X;
		const startY = this.team === 'west' ? WEST_GRID_START_Y : EAST_GRID_START_Y;
		const enemyTeam = this.team === 'west' ? 'east' : 'west';
		const enemyCastle = this.sim.castles[enemyTeam];
		const myCastleX = this.team === 'west' ? WEST_CASTLE_X : EAST_CASTLE_X;

		interface CandidateSlot {
			x: number;
			y: number;
			worldX: number;
			worldY: number;
			isBehind: boolean;
			hasGap: boolean;
			distToEnemy: number;
		}

		const validSlots: CandidateSlot[] = [];

		for (let x = 2; x <= 94; x += 1) {
			for (let y = 2; y <= 68; y += 1) {
				if (!this.sim.canBuild(this.team, x, y)) continue;

				const worldX = startX + x * GRID_STEP;
				const worldY = startY + y * GRID_STEP;

				// Behind castle: West is worldX < myCastleX, East is worldX > myCastleX
				const isBehind = this.team === 'west' ? worldX < myCastleX - 40 : worldX > myCastleX + 40;

				// 1-tile gap check (at least 32px clearance to every existing friendly and ally building)
				let hasGap = true;
				for (const b of teamBuildings) {
					const gapX = Math.max(
						0,
						Math.max(worldX, b.x) - Math.min(worldX + CELL_SIZE, b.x + CELL_SIZE)
					);
					const gapY = Math.max(
						0,
						Math.max(worldY, b.y) - Math.min(worldY + CELL_SIZE, b.y + CELL_SIZE)
					);
					if (gapX < GRID_STEP && gapY < GRID_STEP) {
						hasGap = false;
						break;
					}
				}

				// Distance to enemy castle (we want maximum distance, furthest away)
				const distToEnemy = Math.hypot(worldX - enemyCastle.x, worldY - enemyCastle.y);

				validSlots.push({ x, y, worldX, worldY, isBehind, hasGap, distToEnemy });
			}
		}

		if (validSlots.length === 0) return null;

		// 1. Prioritize behind castle (99% probability)
		const behindSlots = validSlots.filter((s) => s.isBehind);
		let pool: CandidateSlot[];

		if (Math.random() < 0.99 && behindSlots.length > 0) {
			pool = behindSlots;
		} else if (behindSlots.length > 0) {
			pool = validSlots;
		} else {
			// Behind castle slots are exhausted! Fallback to any valid island slot!
			pool = validSlots;
		}

		// 2. Prioritize 1-tile gap (90% probability)
		const gapSlots = pool.filter((s) => s.hasGap);
		if (Math.random() < 0.9 && gapSlots.length > 0) {
			pool = gapSlots;
		} else if (gapSlots.length === 0) {
			// No gap slots left, use available slots
		}

		// 3. Prioritize distance: build as far as possible from enemy base
		pool.sort((a, b) => b.distToEnemy - a.distToEnemy);

		// Take the furthest tier (within 250px of the maximum distance) for natural chaotic variety
		const maxDist = pool[0].distToEnemy;
		const furthestTier = pool.filter((s) => s.distToEnemy >= maxDist - 250);

		// 3b. In team games (2v2, 3v3), assign natural courtyard sectors per player slot
		// so teammates don't crowd each other and maintain separate territory:
		// Slots 3, 4: Top sector (tileY <= 30)
		// Slots 5, 6: Bottom sector (tileY >= 40)
		// Slots 1, 2: Mid sector (20 <= tileY <= 50)
		let candidateTier = furthestTier;
		const player = this.getPlayer();
		if (this.sim.teamSize >= 2 && player?.slot) {
			const slot = player.slot;
			if (slot === 3 || slot === 4) {
				const topSector = candidateTier.filter((s) => s.y <= 30);
				if (topSector.length > 0) candidateTier = topSector;
			} else if (slot === 5 || slot === 6) {
				const botSector = candidateTier.filter((s) => s.y >= 40);
				if (botSector.length > 0) candidateTier = botSector;
			} else if (slot === 1 || slot === 2) {
				const midSector = candidateTier.filter((s) => s.y >= 20 && s.y <= 50);
				if (midSector.length > 0) candidateTier = midSector;
			}
		}

		// 4. Tactical lane pressure consideration on the chosen tier
		const midTileY = 35;
		let laneFiltered: CandidateSlot[] = [];
		if (scan.topPressure > scan.bottomPressure + 300) {
			laneFiltered = candidateTier.filter((s) => s.y < midTileY);
		} else if (scan.bottomPressure > scan.topPressure + 300) {
			laneFiltered = candidateTier.filter((s) => s.y >= midTileY);
		} else if (this.sim.teamSize === 1) {
			const topCount = teamBuildings.filter((b) => b.tileY < midTileY).length;
			const bottomCount = teamBuildings.filter((b) => b.tileY >= midTileY).length;
			if (topCount < bottomCount) {
				laneFiltered = candidateTier.filter((s) => s.y < midTileY);
			} else if (bottomCount < topCount) {
				laneFiltered = candidateTier.filter((s) => s.y >= midTileY);
			}
		}

		const finalSelection = laneFiltered.length > 0 ? laneFiltered : candidateTier;
		const chosen = finalSelection[Math.floor(Math.random() * finalSelection.length)];
		return chosen ? { x: chosen.x, y: chosen.y } : null;
	}

	/**
	 * Identifies whether a bot is the designated 'Smith' (кузнец) for its team (WC3 CF_BotSmith).
	 * The bot with the lowest slot number on the team serves as the Smith,
	 * prioritizing Forge upgrades up to tier 5 to provide team-wide combat buffs.
	 */
	public isBotSmith(player: PlayerState): boolean {
		const teammates = this.sim.allPlayers.filter((p) => p.team === player.team && p.isBot);
		if (teammates.length <= 1) return true;
		const slots = teammates.map((p) => p.slot ?? 1);
		const minSlot = Math.min(...slots);
		return (player.slot ?? 1) === minSlot;
	}
}
