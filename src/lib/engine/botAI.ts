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
	CELL_SIZE,
	BRIDGE_REPAIR_LUMBER_COST,
	BOT_BRIDGE_REPAIR_COOLDOWN,
	CASTLE_CANNON_SHORT_RANGE,
	CASTLE_CANNON_LONG_RANGE,
	CASTLE_CANNON_UPGRADE_GOLD,
	CASTLE_CANNON_UPGRADE_LUMBER
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
	getGuardTowerForRace
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
		const slotOffset = player?.slot ? (player.slot * 0.35) % 1.2 : this.sim.nextRandom() * 0.8;
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
			this.decisionTimer = 1.2 + this.sim.nextRandom() * 0.8;
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

		// 00. Adapt Commander once Commander Hall is built
		if (!player.commander && player.race && this.sim.hasCommanderHall(this.team, player)) {
			let preferredCmd = 3; // Дима: +5% базової шкоди
			if (player.race === 'Альянс' || player.race === 'Люди') {
				preferredCmd = 1; // Саша: +4% доходу золота
			} else if (player.race === 'Ельфи' || player.race === 'Небожителі') {
				preferredCmd = 5; // Юра: 5% крит дальнього бою
			} else if (player.race === 'Північ' || player.race === 'Тролі') {
				preferredCmd = 4; // Дэн: +5% швидкості атаки
			} else if (
				player.race === 'Демони' ||
				player.race === 'Хаос' ||
				player.race === 'Елементалі'
			) {
				preferredCmd = 3; // Дима: +5% базової шкоди
			} else if (player.race === 'Тварини' || player.race === 'Орки') {
				preferredCmd = 4; // Дэн: +5% швидкості атаки
			} else if (player.race === 'Техніки') {
				preferredCmd = 2; // Алик: майстер кузні (-10%)
			}
			this.sim.selectPlayerCommander(this.team, preferredCmd, player);
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

		// 0b. Emergency Rescue Strike (Per-bot strike when castle < 50% HP + threat & 10s team stagger)
		if (this.shouldTriggerRescueStrike(player, castleHpRatio)) {
			const res = this.sim.triggerRescueStrike(this.team, player);
			if (res) {
				this.sim.teamBotRescueCooldown[this.team] = 10.0;
				return;
			}
		}

		// 0c. Manual Castle Cannon Defense & Upgrade (fires only when verified enemies are in radius)
		this.tryOperateCastleCannon(player, castleHpRatio);

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
		if (castleHpRatio < 0.5) {
			if (castleHpRatio < 0.3 && this.sim.canBuyCastleItem(this.team, 'I00F')) {
				this.sim.buyCastleItem(this.team, 'I00F');
				return;
			}
			if (this.sim.canBuyCastleItem(this.team, 'I009')) {
				this.sim.buyCastleItem(this.team, 'I009');
				return;
			}
		}

		// Unlock additional food cap if rich and cap is reached
		if (
			player.food >= player.maxFood &&
			player.gold >= 1800 &&
			this.sim.canBuyCastleItem(this.team, 'I004')
		) {
			this.sim.buyCastleItem(this.team, 'I004');
			return;
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

		// 3. Forge decision: Team BotSmith vs standard bots (WC3 CF_BotForge)
		const isSmith = this.isBotSmith(player);
		const maxAttack = isSmith ? 5 : 2;
		const maxArmor = isSmith ? 5 : 1;
		const maxEcon = isSmith ? 2 : 1;

		if (
			this.sim.gameModeConfig?.allowForge !== false &&
			this.sim.hasForge(this.team, player) &&
			player.gold > 350
		) {
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
				if (!this.isBuildingAllowedByMode(up)) continue;
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
		if (upgradeCandidates.length > 0 && (tier >= 3 || this.sim.nextRandom() < 0.45)) {
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
		if (!chosenBuilding) {
			// 8. Auxiliary engineering: repair broken bridge ONLY if:
			// - Match duration meets 3-minute cooldown (gameTime >= 180s)
			// - Cooldown since last bot bridge repair is at least 3 minutes (180s)
			// - Bot team is SIGNIFICANTLY winning ("ЗНАЧНО перемагає") to accelerate unit throughput and victory
			// - Worker is free, no enemies in courtyard, and bot has 50 lumber
			const cooldownMet =
				this.sim.gameTime >= BOT_BRIDGE_REPAIR_COOLDOWN &&
				this.sim.gameTime -
					(this.sim.lastBotBridgeRepairTime?.[this.team] ?? -BOT_BRIDGE_REPAIR_COOLDOWN) >=
					BOT_BRIDGE_REPAIR_COOLDOWN;

			if (
				botWorker &&
				this.sim.brokenBridge &&
				!isWorkerBusy &&
				(player.lumber ?? 0) >= BRIDGE_REPAIR_LUMBER_COST &&
				enemiesInCourtyard.length === 0 &&
				cooldownMet &&
				this.isTeamSignificantlyWinning()
			) {
				const success = this.sim.orderBridgeRepair(this.team, player);
				if (success) {
					if (!this.sim.lastBotBridgeRepairTime) {
						this.sim.lastBotBridgeRepairTime = {
							west: -BOT_BRIDGE_REPAIR_COOLDOWN,
							east: -BOT_BRIDGE_REPAIR_COOLDOWN
						};
					}
					this.sim.lastBotBridgeRepairTime[this.team] = this.sim.gameTime;
				}
			}
			return;
		}

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
	 * Determines whether the bot's team is significantly winning ("ЗНАЧНО перемагає").
	 * Bots only repair broken bridges when significantly winning to open an extra lane,
	 * accelerate unit march throughput, and hasten victory.
	 */
	public isTeamSignificantlyWinning(): boolean {
		const enemyTeam: MatchTeam = this.team === 'west' ? 'east' : 'west';
		const myCastle = this.sim.castles[this.team];
		const enemyCastle = this.sim.castles[enemyTeam];

		// 1. Base security: Own castle must be healthy (>70% HP)
		if (myCastle.hp < myCastle.maxHp * 0.7) {
			return false;
		}

		// 2. Courtyard clearance: No enemies in our team's courtyard
		const courtyardBoundary = this.team === 'west' ? 2000 : ARENA_WIDTH - 2000;
		const enemiesInCourtyard = this.sim.units.filter(
			(u) =>
				u.team === enemyTeam &&
				u.state !== 'DEAD' &&
				(this.team === 'west' ? u.x <= courtyardBoundary : u.x >= courtyardBoundary)
		);
		if (enemiesInCourtyard.length > 0) {
			return false;
		}

		// 3. Army population & superiority
		const myUnits = this.sim.units.filter((u) => u.team === this.team && u.state !== 'DEAD');
		const enemyUnits = this.sim.units.filter((u) => u.team === enemyTeam && u.state !== 'DEAD');

		const hasArmyAdvantage =
			myUnits.length >= 6 && (myUnits.length >= enemyUnits.length * 1.5 || enemyUnits.length <= 2);

		if (!hasArmyAdvantage) {
			return false;
		}

		// 4. Frontline offensive push: friendly troops are deep in enemy territory
		const unitsInEnemyTerritory = myUnits.filter((u) =>
			this.team === 'west' ? u.x > ARENA_WIDTH / 2 : u.x < ARENA_WIDTH / 2
		);
		if (unitsInEnemyTerritory.length < 3) {
			return false;
		}

		// 5. Castle HP advantage: Enemy castle is damaged or significantly lower than ours
		const hasCastleAdvantage =
			enemyCastle.hp < myCastle.hp &&
			(enemyCastle.hp <= enemyCastle.maxHp * 0.85 || myCastle.hp - enemyCastle.hp >= 500);

		// Either damaged enemy castle + frontline push, or heavy frontline siege (6+ units deep)
		return hasCastleAdvantage || unitsInEnemyTerritory.length >= 6;
	}

	/**
	 * Checks whether a building definition is allowed under active match mode restrictions (-nu, -na, -nl).
	 */
	public isBuildingAllowedByMode(bDef: BuildingDefinition): boolean {
		const mode = this.sim.gameModeConfig;
		if (!mode) return true;
		if (mode.noSpecialBuildings && bDef.specialType) {
			if (bDef.specialType !== 'tower' && bDef.specialType !== 'treasure') {
				return false;
			}
		}
		if (mode.noArtillery) {
			const spawnedUnit = bDef.unit ? UNITS_MAP.get(bDef.unit) : undefined;
			const isArtillery =
				bDef.attack_type === 'siege' ||
				spawnedUnit?.attack_type === 'siege' ||
				['h001', 'h048', 'h01E', 'u008', 'cg0a', 'h04P'].includes(bDef.id);
			if (isArtillery) return false;
		}
		if (mode.noLegendaries && isLegendaryBuilding(bDef)) {
			return false;
		}
		return true;
	}

	/**
	 * Returns base army buildings mapped to their visual rank (1..6) for the given race.
	 */
	public getArmyBuildingRanks(race: string): { building: BuildingDefinition; rank: number }[] {
		const baseBuildings = getBaseBuildingsForRace(race);
		const armySpawners = baseBuildings.filter(
			(b) => !b.specialType && !b.upgrade_from && this.isBuildingAllowedByMode(b)
		);
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
			const raceTower = getGuardTowerForRace(player.race);
			if (
				raceTower &&
				this.isBuildingAllowedByMode(raceTower) &&
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
			if (
				repair &&
				this.isBuildingAllowedByMode(repair) &&
				(repair.lumber_cost || 0) <= (player.lumber ?? 0)
			) {
				specialCandidates.push({
					building: repair,
					priority: castleHpRatio < 0.4 ? 6500 : 3500,
					cost: repair.gold_cost || 180
				});
			}
		}

		// Forge & Shop construction when bot has economy and lumber
		if (
			this.sim.gameModeConfig?.allowForge !== false &&
			player.gold >= 250 &&
			(player.lumber ?? 0) >= 100 &&
			!this.sim.hasForge(this.team, player) &&
			myBuildings.length >= 2
		) {
			const forge = SPECIAL_BUILDINGS.find((b) => b.specialType === 'forge');
			if (forge && this.isBuildingAllowedByMode(forge)) {
				specialCandidates.push({ building: forge, priority: 4600, cost: forge.gold_cost || 100 });
			}
		}

		if (
			player.gold >= 250 &&
			(player.lumber ?? 0) >= 50 &&
			!this.sim.hasShop(this.team, player) &&
			myBuildings.length >= 2
		) {
			const shop = SPECIAL_BUILDINGS.find((b) => b.specialType === 'shop');
			if (shop && this.isBuildingAllowedByMode(shop)) {
				specialCandidates.push({ building: shop, priority: 4400, cost: shop.gold_cost || 50 });
			}
		}

		if (
			player.gold >= 250 &&
			(player.lumber ?? 0) >= 250 &&
			!player.commander &&
			!this.sim.hasCommanderHall(this.team, player) &&
			myBuildings.length >= 3
		) {
			const commanderHall = SPECIAL_BUILDINGS.find((b) => b.specialType === 'commander');
			if (commanderHall && this.isBuildingAllowedByMode(commanderHall)) {
				specialCandidates.push({
					building: commanderHall,
					priority: 4300,
					cost: commanderHall.gold_cost || 250
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

		if (this.sim.nextRandom() < 0.99 && behindSlots.length > 0) {
			pool = behindSlots;
		} else if (behindSlots.length > 0) {
			pool = validSlots;
		} else {
			// Behind castle slots are exhausted! Fallback to any valid island slot!
			pool = validSlots;
		}

		// 2. Prioritize 1-tile gap (90% probability)
		const gapSlots = pool.filter((s) => s.hasGap);
		if (this.sim.nextRandom() < 0.9 && gapSlots.length > 0) {
			pool = gapSlots;
		} else if (gapSlots.length === 0) {
			// No gap slots left, use available slots
		}

		// 3. Prioritize distance: build as far as possible from enemy base
		pool.sort((a, b) => b.distToEnemy - a.distToEnemy);

		// Take the furthest tier (within 250px of the maximum distance) for natural chaotic variety
		const maxDist = pool[0].distToEnemy;
		const furthestTier = pool.filter((s) => s.distToEnemy >= maxDist - 250);

		// 3b. In team games (2+ per team), assign natural courtyard sectors per player slot
		// so teammates don't crowd each other and maintain separate territory:
		// Top sector (tileY <= 30), Bot sector (tileY >= 40), Mid sector (20 <= tileY <= 50)
		let candidateTier = furthestTier;
		const player = this.getPlayer();
		const teamCount = this.sim.teamMembers?.[this.team]?.length ?? this.sim.teamSize;
		if ((teamCount >= 2 || this.sim.teamSize >= 2) && player?.slot) {
			const teamIdx = Math.floor((player.slot - 1) / 2);
			const sectorMod = teamIdx % 3;
			if (sectorMod === 1) {
				const topSector = candidateTier.filter((s) => s.y <= 30);
				if (topSector.length > 0) candidateTier = topSector;
			} else if (sectorMod === 2) {
				const botSector = candidateTier.filter((s) => s.y >= 40);
				if (botSector.length > 0) candidateTier = botSector;
			} else {
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
		const chosen = finalSelection[Math.floor(this.sim.nextRandom() * finalSelection.length)];
		return chosen ? { x: chosen.x, y: chosen.y } : null;
	}

	/**
	 * Evaluates whether a bot should fire its personal Rescue Strike.
	 * Enforces:
	 * - Personal 180s readiness for this bot player (`canUseRescueStrike(team, player)`)
	 * - Castle genuinely threatened (`castleHpRatio < 0.5`)
	 * - 10-second shared team stagger cooldown so allied bots never waste strikes simultaneously
	 * - Active enemy threat analysis: HP drop velocity (`castleHpLossRate`), enemy DPS/siege/boss weight,
	 *   and defender balance within the 750px strike radius.
	 */
	public shouldTriggerRescueStrike(player: PlayerState, castleHpRatio: number): boolean {
		if (!this.sim.canUseRescueStrike(this.team, player)) return false;
		if (castleHpRatio >= 0.5) return false;
		if ((this.sim.teamBotRescueCooldown?.[this.team] ?? 0) > 0) return false;

		const myCastle = this.sim.castles[this.team];
		if (!myCastle || myCastle.hp <= 0) return false;

		const enemyTeam: MatchTeam = this.team === 'west' ? 'east' : 'west';
		const radiusSq = 750 * 750;
		const enemiesNearCastle = [];
		let enemyTotalHp = 0;
		let enemyDpsWeight = 0;
		let expectedStrikeDmg = 0;
		let allyDefendersHp = 0;

		for (const u of this.sim.units) {
			if (u.state === 'DEAD') continue;
			const dx = u.x - myCastle.x;
			const dy = u.y - myCastle.y;
			if (dx * dx + dy * dy > radiusSq) continue;

			if (u.team === enemyTeam) {
				enemiesNearCastle.push(u);
				enemyTotalHp += u.hp;
				expectedStrikeDmg += Math.min(u.hp, 950);
				const avgDmg = ((u.damageMin ?? 20) + (u.damageMax ?? u.damageMin ?? 20)) / 2;
				const cd = Math.max(0.4, u.attackCooldown || 1.2);
				const baseDps = avgDmg / cd;
				const siegeFactor = u.isArtillery || u.attackType === 'siege' ? 1.5 : 1.0;
				const bossFactor = u.isBoss ? 1.5 : 1.0;
				enemyDpsWeight += baseDps * siegeFactor * bossFactor;
			} else if (u.team === this.team) {
				allyDefendersHp += u.hp;
			}
		}

		if (enemiesNearCastle.length === 0) return false;

		const hpLossRate = this.sim.castleHpLossRate?.[this.team] ?? 0;
		const timeToFall = hpLossRate > 5 ? myCastle.hp / hpLossRate : Infinity;

		// 1. Critical collapse: castle < 25% HP and under active assault / meaningful threat
		if (
			castleHpRatio < 0.25 &&
			(hpLossRate >= 25 || enemiesNearCastle.length >= 2 || enemyDpsWeight >= 35)
		) {
			return true;
		}

		// 2. Rapid HP drain: castle projected to fall soon or taking heavy DPS with multiple attackers
		if (
			(timeToFall <= 35 || hpLossRate >= 70) &&
			enemiesNearCastle.length >= 2 &&
			expectedStrikeDmg >= 600
		) {
			return true;
		}

		// 3. Outnumbered courtyard breach: defenders overwhelmed (< 45% castle HP + siege pressure)
		if (
			castleHpRatio < 0.45 &&
			enemiesNearCastle.length >= 3 &&
			enemyTotalHp > allyDefendersHp * 1.4 &&
			(hpLossRate >= 20 || enemyDpsWeight >= 55) &&
			expectedStrikeDmg >= 900
		) {
			return true;
		}

		return false;
	}

	private lastBotCannonFireTime = -10;

	/**
	 * Operates manual castle cannon on behalf of the bot:
	 * - Never fires blindly without enemy targets in range (avoids friendly fire).
	 * - Staggers shots if a human teammate is on the same team so the shared cooldown isn't hogged.
	 * - Upgrades shared castle cannon (100g + 100w) when defending or holding surplus resources.
	 */
	public tryOperateCastleCannon(player: PlayerState, castleHpRatio: number): boolean {
		if (
			!this.sim.castleCannonUpgraded[this.team] &&
			this.sim.canUpgradeCastleCannon(this.team, player)
		) {
			const enemiesThreatening =
				castleHpRatio < 0.75 &&
				this.sim.getCastleCannonEnemyCount(this.team, CASTLE_CANNON_LONG_RANGE) >= 2;
			const hasSurplus =
				this.sim.gameTime >= 150 &&
				player.gold >= CASTLE_CANNON_UPGRADE_GOLD + 150 &&
				(player.lumber ?? 0) >= CASTLE_CANNON_UPGRADE_LUMBER + 50;
			if (enemiesThreatening || hasSurplus) {
				this.sim.upgradeCastleCannon(this.team, player);
			}
		}

		if (this.sim.getCastleCannonCooldown(this.team) > 0) return false;

		const hasHumanAlly = (this.sim.teamMembers[this.team] ?? []).some((m) => !m.isBot);
		const isOvercharged = (this.sim.castleOverchargeTimer[this.team] ?? 0) > 0;
		const shortEnemies = this.sim.getCastleCannonEnemyCount(this.team, CASTLE_CANNON_SHORT_RANGE);

		if (hasHumanAlly && !isOvercharged && !(shortEnemies > 0 && castleHpRatio < 0.65)) {
			if (this.sim.gameTime - this.lastBotCannonFireTime < 3.5) {
				return false;
			}
		}

		const tryFireMode = (mode: 'short' | 'long'): boolean => {
			if (!this.sim.canFireCastleCannon(this.team, mode, player)) return false;
			if (!this.sim.fireCastleCannon(this.team, mode, player).fired) return false;
			this.lastBotCannonFireTime = this.sim.gameTime;
			return true;
		};

		if (shortEnemies >= 1 && tryFireMode('short')) return true;

		const longEnemies = this.sim.getCastleCannonEnemyCount(this.team, CASTLE_CANNON_LONG_RANGE);
		const shouldSpendLongShot =
			isOvercharged ||
			(castleHpRatio < 0.45 && longEnemies >= 1) ||
			(player.gold >= 60 && (longEnemies >= 2 || (castleHpRatio < 0.75 && longEnemies >= 1)));

		return shouldSpendLongShot && longEnemies >= 1 && tryFireMode('long');
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
