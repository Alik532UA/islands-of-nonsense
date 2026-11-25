import type { Simulation } from './simulation';
import {
	ARENA_WIDTH,
	TOP_LANE_Y,
	BOTTOM_LANE_Y,
	RESCUE_STRIKE_CAST_RANGE,
	RESCUE_STRIKE_RADIUS,
	RESCUE_STRIKE_DAMAGE,
	RESCUE_STRIKE_COOLDOWN
} from './constants';
import type { MatchTeam, Lane, GoldCoin, PlayerState, Building } from './types';
import { getRaceAbility } from './raceAbilities';
import { getCommanderIncomeBonus, getCommanderForgeDiscount } from './commanders';
import { CASTLE_ITEMS } from './items';
import { getBuilding, getUnit } from './gameData';

/**
 * Calculates weighted building value for the WC3 economy formula:
 * - Regular military spawners: Dx = 0.20 (relative weight 1.0)
 * - Siege / artillery spawners: ea = 0.18 (relative weight 0.9)
 * - Special buildings / towers / treasure: To = 0.08 (relative weight 0.4)
 */
export function calculateBuildingWeightedValue(b: Building): number {
	if (b.specialType) {
		return b.goldCost * 0.4;
	}
	const bDef = getBuilding(b.defId);
	const unitDef = b.spawnUnitId ? getUnit(b.spawnUnitId) : undefined;
	const isSiege =
		b.attackType === 'siege' || bDef?.attack_type === 'siege' || unitDef?.attack_type === 'siege';
	if (isSiege) {
		return b.goldCost * 0.9;
	}
	return b.goldCost * 1.0;
}

/**
 * Progressive periodic gold payout interval:
 * - Minute 1 (0..59s): every 5s
 * - Minute 2 (60..119s): every 6s
 * - Minute 3 (120..179s): every 7s
 * - ... (+1s per elapsed minute)
 */
export function getIncomeIntervalForTime(gameTime: number): number {
	return 5 + Math.floor(Math.max(0, gameTime) / 60);
}

/**
 * Diminishing returns function from WC3 Castle Fight (pr = 25, 6 tiers with 15% reduction per tier).
 */
export function calculateDiminishingReturns(rawVal: number, step = 25, maxSteps = 6): number {
	let i = rawVal;
	let j = 0;
	let k = 0;
	while (i >= step && k < maxSteps) {
		i -= step;
		j += step * (1 - k * 0.15);
		k += 1;
	}
	return j + i * Math.max(0.1, 1 - k * 0.15);
}

/**
 * EconomySystem manages periodic income formulas, battlefield gold coin drops,
 * forge upgrades, race active skills, castle shop items, and rescue strikes.
 */
export class EconomySystem {
	private incomeCarry = new Map<string, number>();

	constructor(private sim: Simulation) {}

	public calculateExactIncome(team: MatchTeam, playerInput?: PlayerState): number {
		let cfM = 0.65;
		if (this.sim.gameTime >= 1500) {
			cfM = 1.0;
		} else if (this.sim.gameTime >= 960) {
			cfM = 0.85;
		} else if (this.sim.gameTime >= 480) {
			cfM = 0.75;
		}
		const player = playerInput || this.sim.players[team];
		if (!player) return 15;

		const activeBuildings = this.sim.buildings.filter(
			(b) => b.team === team && (!b.playerId || b.playerId === player.id)
		);
		const bldValue = activeBuildings.reduce((sum, b) => sum + calculateBuildingWeightedValue(b), 0);

		const rawBase = 10 * (0.5 + 0.002 * bldValue);
		const baseIncome = calculateDiminishingReturns(rawBase);
		let multiplier = cfM * (1 + 0.1 * player.forge.econ);

		const incomeBonus = getCommanderIncomeBonus(player);
		if (incomeBonus > 0) {
			multiplier += cfM * incomeBonus;
		}

		// CF_BD bot income bonus: docs/04 § 1.2 & docs/05 § 3.B
		const cfBd = player.botDifficulty ?? (player.isBot ? this.sim.config.botDifficulty : 0);
		if (player.isBot && cfBd > 0) {
			multiplier += (cfM * cfBd) / 100;
		}

		const myCastle = this.sim.castles[team];
		if (myCastle && myCastle.hp / myCastle.maxHp <= 0.7) {
			multiplier *= 1.15;
		}

		const treasureBoxes = activeBuildings.filter(
			(b) => b.specialType === 'treasure' && !b.isUnderConstruction
		).length;
		if (treasureBoxes > 0) {
			multiplier *= 1 + 0.2 * treasureBoxes;
		}

		// Team balance income multiplier (jo[team]): docs/04 § 1.1 & orig_war3map.j lines 2320-2349
		// Compensates outnumbered teams (e.g., 1v2 -> 2.0x, 1v3 -> 3.0x, 2v3 -> 1.5x)
		const allyCount = Math.max(1, this.sim.teamMembers[team]?.length || 1);
		const enemyTeam: MatchTeam = team === 'west' ? 'east' : 'west';
		const enemyCount = Math.max(1, this.sim.teamMembers[enemyTeam]?.length || 1);
		const jo = enemyCount > allyCount ? enemyCount / allyCount : 1.0;
		multiplier *= jo;

		// Game mode income multiplier (e.g., blitz 2.0x, sandbox 5.0x, survival 0.9x)
		multiplier *= this.sim.gameModeConfig?.incomeMultiplier ?? 1.0;

		return Math.max(3, baseIncome * multiplier);
	}

	public calculateIncome(team: MatchTeam, playerInput?: PlayerState): number {
		return Math.max(3, Math.round(this.calculateExactIncome(team, playerInput)));
	}

	public updateEconomy(dt: number): void {
		const interval = getIncomeIntervalForTime(this.sim.gameTime);
		this.sim.incomeInterval = interval;
		this.sim.incomeTimer -= dt;

		if (this.sim.incomeTimer <= 1e-6) {
			this.sim.incomeTimer = interval;

			for (const player of this.sim.allPlayers) {
				const team = player.team;
				const myCastle = this.sim.castles[team];
				const key = player.id || `${team}_${player.slot ?? 0}`;
				const exact = this.calculateExactIncome(team, player);
				// Preserve sub-integer commander/econ bonuses (+4% / +8%) across periodic payouts
				const totalWithCarry = exact + (this.incomeCarry.get(key) ?? 0);
				const payout = Math.max(3, Math.floor(totalWithCarry));
				this.incomeCarry.set(key, totalWithCarry - payout);
				player.gold += payout;

				// Spawn income text above worker or castle
				if (player === this.sim.players[team]) {
					this.sim.addFloatingText(`+${payout}g`, myCastle.x, myCastle.y - 130, '#fbbf24');
				} else if (player.worker) {
					this.sim.addFloatingText(`+${payout}g`, player.worker.x, player.worker.y - 30, '#fbbf24');
				}
			}

			// Domination Mode (-dm / -dom): bonus +15g per controlled lane center
			if (this.sim.gameModeConfig?.domination) {
				const midMinX = ARENA_WIDTH * 0.35;
				const midMaxX = ARENA_WIDTH * 0.65;
				for (const lane of ['top', 'bottom'] as Lane[]) {
					let westCount = 0;
					let eastCount = 0;
					for (const u of this.sim.units) {
						if (u.state === 'DEAD' || u.lane !== lane || u.x < midMinX || u.x > midMaxX) continue;
						if (u.team === 'west') westCount++;
						else if (u.team === 'east') eastCount++;
					}
					const laneY = lane === 'top' ? TOP_LANE_Y : BOTTOM_LANE_Y;
					if (westCount > eastCount && westCount >= 2) {
						for (const p of this.sim.teamMembers.west) {
							p.gold += 15;
						}
						this.sim.addFloatingText(
							'+15g Домінування',
							ARENA_WIDTH / 2 - 120,
							laneY - 25,
							'#38bdf8'
						);
					} else if (eastCount > westCount && eastCount >= 2) {
						for (const p of this.sim.teamMembers.east) {
							p.gold += 15;
						}
						this.sim.addFloatingText(
							'+15g Домінування',
							ARENA_WIDTH / 2 + 120,
							laneY - 25,
							'#f43f5e'
						);
					}
				}
			}

			this.sim.notifyStateChanged();
		}
	}

	public updateGoldCoins(dt: number): void {
		if (this.sim.coinMode === 'none') return;

		this.sim.coinSpawnTimer -= dt;
		if (this.sim.coinSpawnTimer <= 0.001) {
			const isCrazy = this.sim.coinMode === 'crazy';
			this.sim.coinSpawnTimer = this.sim.coinSpawnInterval;

			const coinsToSpawn =
				this.sim.config.coinCount !== undefined ? this.sim.config.coinCount : isCrazy ? 5 : 1;
			for (let c = 0; c < coinsToSpawn; c++) {
				const lane: Lane = this.sim.nextRandom() < 0.5 ? 'top' : 'bottom';
				const laneY = lane === 'top' ? TOP_LANE_Y : BOTTOM_LANE_Y;
				const spawnX = isCrazy
					? 300 + this.sim.nextRandom() * (ARENA_WIDTH - 600)
					: 850 + this.sim.nextRandom() * 700;
				const coin: GoldCoin = {
					id: `coin_${this.sim.nextCoinId++}`,
					lane,
					x: spawnX,
					y: laneY + (this.sim.nextRandom() * 60 - 30),
					value: 50,
					lifeTime: 35.0,
					maxLifeTime: 35.0
				};
				this.sim.goldCoins.push(coin);
			}
			this.sim.notifyStateChanged();
		}

		for (let i = this.sim.goldCoins.length - 1; i >= 0; i--) {
			const coin = this.sim.goldCoins[i];
			coin.lifeTime -= dt;
			if (coin.lifeTime <= 0) {
				this.sim.goldCoins.splice(i, 1);
				this.sim.notifyStateChanged();
				continue;
			}

			// 1. Worker physical pickup (WC3: worker runs to coin and collects it)
			let collected = false;
			for (const player of this.sim.allPlayers) {
				const worker = player.worker;
				if (!worker) continue;
				const dist = Math.hypot(worker.x - coin.x, worker.y - coin.y);
				if (dist <= 55) {
					this.collectCoin(coin.id, player.team, player);
					collected = true;
					break;
				}
			}
			if (collected) continue;

			// 2. Unit pickup on same lane
			for (const u of this.sim.units) {
				if (u.state === 'DEAD' || u.lane !== coin.lane) continue;
				const dx = u.x - coin.x;
				const dy = u.y - coin.y;
				if (dx * dx + dy * dy <= 45 * 45) {
					if (u.team === 'west' || u.team === 'east') {
						const owner =
							(u.playerId ? this.sim.allPlayers.find((p) => p.id === u.playerId) : null) ||
							this.sim.players[u.team];
						this.collectCoin(coin.id, u.team, owner);
						break;
					}
				}
			}
		}
	}

	public collectCoin(coinId: string, team: MatchTeam, playerInput?: PlayerState): boolean {
		const idx = this.sim.goldCoins.findIndex((c) => c.id === coinId);
		if (idx === -1) return false;
		const coin = this.sim.goldCoins[idx];
		this.sim.goldCoins.splice(idx, 1);
		const player = playerInput || this.sim.players[team];
		player.gold += coin.value;
		player.stats.coinsCollected++;
		this.sim.addFloatingText(`+${coin.value}g Монета!`, coin.x, coin.y - 20, '#fbbf24');
		this.sim.onSoundEffect?.('coin');
		this.sim.notifyStateChanged();
		return true;
	}

	public spawnCoinDirectly(lane: Lane, x: number, y: number, value = 50): GoldCoin {
		const coin: GoldCoin = {
			id: `coin_${this.sim.nextCoinId++}`,
			lane,
			x,
			y,
			value,
			lifeTime: 35.0,
			maxLifeTime: 35.0
		};
		this.sim.goldCoins.push(coin);
		this.sim.notifyStateChanged();
		return coin;
	}

	public hasForge(team: MatchTeam, player?: PlayerState): boolean {
		return this.sim.buildings.some(
			(b) =>
				b.team === team &&
				b.specialType === 'forge' &&
				!b.isUnderConstruction &&
				(!player || !b.playerId || b.playerId === player.id)
		);
	}

	public hasShop(team: MatchTeam, player?: PlayerState): boolean {
		return this.sim.buildings.some(
			(b) =>
				b.team === team &&
				b.specialType === 'shop' &&
				!b.isUnderConstruction &&
				(!player || !b.playerId || b.playerId === player.id)
		);
	}

	public upgradeForge(
		team: MatchTeam,
		type: 'attack' | 'armor' | 'econ',
		playerInput?: PlayerState
	): boolean {
		if (this.sim.gameModeConfig?.allowForge === false) return false;
		const player = playerInput || this.sim.players[team];
		if (!this.hasForge(team, player)) {
			this.sim.addFloatingText(
				'Спочатку збудуйте Кузню!',
				this.sim.castles[team].x,
				this.sim.castles[team].y - 50,
				'#ef4444'
			);
			return false;
		}
		const currentLevel = player.forge[type];
		const forgeDiscount = getCommanderForgeDiscount(player);

		let maxLevel = 5;
		let baseCost = 200;
		let costStep = 100;

		if (type === 'armor') {
			baseCost = 150;
			costStep = 75;
		} else if (type === 'econ') {
			maxLevel = 3;
			baseCost = 150;
			costStep = 100;
		}

		if (currentLevel >= maxLevel) return false;

		let price = baseCost + currentLevel * costStep;
		if (forgeDiscount > 0) price = Math.round(price * (1 - forgeDiscount));

		let lumberPrice = 0;
		if (currentLevel >= 2) {
			lumberPrice = (currentLevel - 1) * 35;
		}
		if (lumberPrice > 0 && player.lumber < lumberPrice) {
			this.sim.addFloatingText(
				`Потрібна Деревина! (${lumberPrice})`,
				this.sim.castles[team].x,
				this.sim.castles[team].y - 50,
				'#10b981'
			);
			return false;
		}

		if (player.gold < price) return false;

		player.gold -= price;
		if (lumberPrice > 0) {
			player.lumber -= lumberPrice;
		}
		player.forge[type]++;
		player.stats.goldSpent += price;

		this.sim.addFloatingText(
			`Кузня +1`,
			this.sim.castles[team].x,
			this.sim.castles[team].y - 50,
			'#10b981'
		);
		this.sim.notifyStateChanged();
		return true;
	}

	public getForgePrice(
		team: MatchTeam,
		type: 'attack' | 'armor' | 'econ',
		playerInput?: PlayerState
	): number {
		const player = playerInput || this.sim.players[team];
		const currentLevel = player.forge[type];
		const forgeDiscount = getCommanderForgeDiscount(player);

		let baseCost = 200;
		let costStep = 100;

		if (type === 'armor') {
			baseCost = 150;
			costStep = 75;
		} else if (type === 'econ') {
			baseCost = 150;
			costStep = 100;
		}

		let price = baseCost + currentLevel * costStep;
		if (forgeDiscount > 0) price = Math.round(price * (1 - forgeDiscount));
		return price;
	}

	public getForgeLumberPrice(
		team: MatchTeam,
		type: 'attack' | 'armor' | 'econ',
		playerInput?: PlayerState
	): number {
		const player = playerInput || this.sim.players[team];
		const currentLevel = player.forge[type];
		if (currentLevel >= 2) {
			return (currentLevel - 1) * 35;
		}
		return 0;
	}

	public canUseRaceSkill(team: MatchTeam): boolean {
		return this.sim.gameTime >= 300 && this.sim.raceSkillCooldown[team] <= 0 && !this.sim.winner;
	}

	public useRaceSkill(team: MatchTeam, playerInput?: PlayerState): boolean {
		if (!this.canUseRaceSkill(team)) return false;

		const player = playerInput || this.sim.players[team];
		const ability = getRaceAbility(player.race);
		this.sim.raceSkillCooldown[team] = 150;

		const enemyTeam: MatchTeam = team === 'west' ? 'east' : 'west';

		switch (ability.kind) {
			case 'dmg':
				for (const u of this.sim.units) {
					if (u.team === team && u.state !== 'DEAD') {
						u.buffs = u.buffs || [];
						u.buffs.push({ type: 'dmg', timer: 15, value: 0.25 });
					}
				}
				this.sim.addFloatingText(
					`${ability.nameUk}! (+25% шкоди)`,
					this.sim.castles[team].x,
					this.sim.castles[team].y - 60,
					'#f59e0b'
				);
				break;
			case 'as':
				for (const u of this.sim.units) {
					if (u.team === team && u.state !== 'DEAD') {
						u.buffs = u.buffs || [];
						u.buffs.push({ type: 'as', timer: ability.duration, value: 0.3 });
					}
				}
				this.sim.addFloatingText(
					`${ability.nameUk}! (+Швидкість атаки)`,
					this.sim.castles[team].x,
					this.sim.castles[team].y - 60,
					'#10b981'
				);
				break;
			case 'sbor':
				this.sim.greatAssemblyTimer[team] = ability.duration || 15;
				for (const u of this.sim.units) {
					if (u.team === team && u.state !== 'DEAD') {
						u.buffs = u.buffs || [];
						u.buffs.push({ type: 'as', timer: ability.duration || 15, value: 0.2 });
						u.buffs.push({ type: 'dmg', timer: ability.duration || 15, value: 0.15 });
					}
				}
				this.sim.addFloatingText(
					`${ability.nameUk}! (+Велика збірка)`,
					this.sim.castles[team].x,
					this.sim.castles[team].y - 60,
					'#10b981'
				);
				break;
			case 'shield':
				for (const u of this.sim.units) {
					if (u.team === team && u.state !== 'DEAD') {
						u.buffs = u.buffs || [];
						u.buffs.push({ type: 'shield', timer: 10, value: 5 });
					}
				}
				this.sim.addFloatingText(
					`${ability.nameUk}! (+5 броні)`,
					this.sim.castles[team].x,
					this.sim.castles[team].y - 60,
					'#60a5fa'
				);
				break;
			case 'evade':
				for (const u of this.sim.units) {
					if (u.team === team && u.state !== 'DEAD') {
						u.buffs = u.buffs || [];
						u.buffs.push({ type: 'evade', timer: 8, value: 0.4 });
					}
				}
				this.sim.addFloatingText(
					`${ability.nameUk}! (+40% ухилення)`,
					this.sim.castles[team].x,
					this.sim.castles[team].y - 60,
					'#a855f7'
				);
				break;
			case 'slow':
				for (const u of this.sim.units) {
					if (u.team === enemyTeam && u.state !== 'DEAD') {
						u.buffs = u.buffs || [];
						u.buffs.push({ type: 'slow', timer: 8, value: 0.5 });
					}
				}
				this.sim.addFloatingText(
					`${ability.nameUk}! (-50% швидкості ворога)`,
					this.sim.castles[enemyTeam].x,
					this.sim.castles[enemyTeam].y - 60,
					'#06b6d4'
				);
				break;
			case 'plague':
				for (const u of this.sim.units) {
					if (u.team === enemyTeam && u.state !== 'DEAD') {
						const dmg = Math.max(15, Math.round(u.hp * 0.1));
						u.hp = Math.max(1, u.hp - dmg);
						this.sim.addFloatingText(`-${dmg}`, u.x, u.y - 15, '#22c55e');
					}
				}
				this.sim.addFloatingText(
					`${ability.nameUk}! (-10% HP ворогам)`,
					this.sim.castles[enemyTeam].x,
					this.sim.castles[enemyTeam].y - 60,
					'#22c55e'
				);
				break;
			case 'mine':
				for (const u of this.sim.units) {
					if (u.team === enemyTeam && u.state !== 'DEAD') {
						const distFromCenter = Math.abs(u.x - ARENA_WIDTH / 2);
						if (distFromCenter <= 700) {
							u.hp -= 300;
							this.sim.addFloatingText('-300', u.x, u.y - 20, '#ef4444');
							if (u.hp <= 0) u.state = 'DEAD';
						}
					}
				}
				this.sim.addFloatingText('МІНА! (300 шкоди)', ARENA_WIDTH / 2, TOP_LANE_Y, '#ef4444');
				break;
			case 'nuke_chaos':
			case 'nuke_elf': {
				const nukeDmg = ability.kind === 'nuke_chaos' ? 200 : 150;
				for (const u of this.sim.units) {
					if (u.team === enemyTeam && u.state !== 'DEAD') {
						u.hp -= nukeDmg;
						this.sim.addFloatingText(`-${nukeDmg}`, u.x, u.y - 15, '#f97316');
						if (u.hp <= 0) u.state = 'DEAD';
					}
				}
				this.sim.addFloatingText(
					`${ability.nameUk}!`,
					this.sim.castles[enemyTeam].x,
					this.sim.castles[enemyTeam].y - 60,
					'#f97316'
				);
				break;
			}
			case 'infect':
				for (const u of this.sim.units) {
					if (u.team === enemyTeam && u.state !== 'DEAD') {
						u.buffs = u.buffs || [];
						u.buffs.push({ type: 'infect', timer: 8, value: 30 });
					}
				}
				this.sim.addFloatingText(
					`${ability.nameUk}! (Зараження)`,
					this.sim.castles[enemyTeam].x,
					this.sim.castles[enemyTeam].y - 60,
					'#84cc16'
				);
				break;
			case 'as_regen':
				for (const u of this.sim.units) {
					if (u.team === team && u.state !== 'DEAD') {
						u.buffs = u.buffs || [];
						u.buffs.push({ type: 'as', timer: 10, value: 0.25 });
						if (!u.buffs.some((b) => b.type === 'heal_block')) {
							u.hp = Math.min(u.maxHp, u.hp + 50);
						}
					}
				}
				this.sim.addFloatingText(
					`${ability.nameUk}! (+25% швидкості, регенерація)`,
					this.sim.castles[team].x,
					this.sim.castles[team].y - 60,
					'#eab308'
				);
				break;
			case 'hp_speed':
				for (const u of this.sim.units) {
					if (u.team === team && u.state !== 'DEAD') {
						u.buffs = u.buffs || [];
						u.buffs.push({ type: 'bloodlust', timer: 12, value: 0.2 });
						const bonusHp = Math.round(u.maxHp * 0.2);
						u.maxHp += bonusHp;
						if (!u.buffs.some((b) => b.type === 'heal_block')) {
							u.hp = Math.min(u.maxHp, u.hp + bonusHp);
						}
					}
				}
				this.sim.addFloatingText(
					`${ability.nameUk}! (+20% HP, дикий біг)`,
					this.sim.castles[team].x,
					this.sim.castles[team].y - 60,
					'#22c55e'
				);
				break;
			case 'nuke_elemental':
				for (const u of this.sim.units) {
					if (u.team === enemyTeam && u.state !== 'DEAD') {
						u.hp -= 100;
						u.buffs = u.buffs || [];
						u.buffs.push({ type: 'slow', timer: 3, value: 0.5 });
						this.sim.addFloatingText('-100', u.x, u.y - 15, '#38bdf8');
						if (u.hp <= 0) u.state = 'DEAD';
					}
				}
				this.sim.addFloatingText(
					`${ability.nameUk}! (Шок та стихія)`,
					this.sim.castles[enemyTeam].x,
					this.sim.castles[enemyTeam].y - 60,
					'#38bdf8'
				);
				break;
			case 'heal_cleanse':
				for (const u of this.sim.units) {
					if (u.team === team && u.state !== 'DEAD') {
						if (!u.buffs?.some((b) => b.type === 'heal_block')) {
							u.hp = Math.min(u.maxHp, u.hp + 200);
							this.sim.addFloatingText('+200', u.x, u.y - 15, '#fbbf24');
						}
						u.buffs = (u.buffs || []).filter((b) => b.type !== 'slow' && b.type !== 'infect');
					}
				}
				this.sim.addFloatingText(
					`${ability.nameUk}! (Зцілення та очищення)`,
					this.sim.castles[team].x,
					this.sim.castles[team].y - 60,
					'#fbbf24'
				);
				break;
		}

		this.sim.onSoundEffect?.('upgrade');
		this.sim.notifyStateChanged();
		return true;
	}

	public getItemCooldown(team: MatchTeam, itemId: string): number {
		const cd = this.sim.itemCooldowns[team]?.[itemId] || 0;
		return cd <= 0.001 ? 0 : cd;
	}

	public canBuyCastleItem(team: MatchTeam, itemId: string, playerInput?: PlayerState): boolean {
		if (!this.hasShop(team, playerInput)) return false;
		if (this.sim.gameModeConfig?.noItems) return false;
		if ((itemId === 'I00B' || itemId === 'I00N') && !this.sim.gameModeConfig?.nuclearWarheads) {
			return false;
		}
		if (
			itemId === 'I004' &&
			(this.sim.gameModeConfig?.noSpecialBuildings || this.sim.gameModeConfig?.noLegendaries)
		) {
			return false;
		}
		const item = CASTLE_ITEMS[itemId];
		if (!item) return false;
		const player = playerInput || this.sim.players[team];
		if (player.gold < item.cost) return false;
		if (this.getItemCooldown(team, itemId) > 0) return false;
		return true;
	}

	public buyCastleItem(team: MatchTeam, itemId: string, playerInput?: PlayerState): boolean {
		if (!this.canBuyCastleItem(team, itemId, playerInput)) return false;
		const item = CASTLE_ITEMS[itemId];
		const player = playerInput || this.sim.players[team];
		const myCastle = this.sim.castles[team];
		const enemyTeam: MatchTeam = team === 'west' ? 'east' : 'west';

		player.gold -= item.cost;
		player.stats.goldSpent += item.cost;
		player.stats.itemsPurchased++;
		this.sim.itemCooldowns[team][itemId] = item.cooldown;

		switch (itemId) {
			case 'I001': {
				// Battle Drums: +25% attack speed to all friendly troops for 15s
				for (const u of this.sim.units) {
					if (u.team === team && u.state !== 'DEAD') {
						u.buffs = u.buffs || [];
						u.buffs.push({ type: 'as', timer: 15, value: 0.25 });
					}
				}
				this.sim.addFloatingText(
					'Бойові Барабани! (+25% Шв. атаки)',
					myCastle.x,
					myCastle.y - 60,
					'#f97316'
				);
				break;
			}
			case 'I003': {
				// Battle Horn: +4 armor to all friendly troops for 20s
				for (const u of this.sim.units) {
					if (u.team === team && u.state !== 'DEAD') {
						u.buffs = u.buffs || [];
						u.buffs.push({ type: 'shield', timer: 20, value: 4 });
					}
				}
				this.sim.addFloatingText('Бойовий Ріг! (+4 Броні)', myCastle.x, myCastle.y - 60, '#38bdf8');
				break;
			}
			case 'I005': {
				// Rune of Power: overcharge castle cannons for 20s
				this.sim.castleOverchargeTimer[team] = 20.0;
				this.sim.addFloatingText(
					'Руна Могутності! (х2 Шкоди гармат)',
					myCastle.x,
					myCastle.y - 60,
					'#ef4444'
				);
				break;
			}
			case 'I007': {
				// Magic Wand: cleanses friendly debuffs and curses enemies (-30% dmg for 12s)
				for (const u of this.sim.units) {
					if (u.state === 'DEAD') continue;
					if (u.team === team) {
						if (u.buffs) {
							u.buffs = u.buffs.filter(
								(b) => b.type !== 'weakness' && b.type !== 'slow' && b.type !== 'infect'
							);
						}
					} else if (u.team === enemyTeam) {
						u.buffs = u.buffs || [];
						u.buffs.push({ type: 'dmg', timer: 12, value: -0.3 });
					}
				}
				this.sim.addFloatingText(
					'Чарівний Жезл! (Очищення та Прокляття)',
					myCastle.x,
					myCastle.y - 60,
					'#a855f7'
				);
				break;
			}
			case 'I008': {
				// Scroll of Stone: summons Stone Golem at castle gate
				const lane: Lane =
					this.sim.spatialGrid.queryRadius(myCastle.x, 220, 400).length >=
					this.sim.spatialGrid.queryRadius(myCastle.x, 580, 400).length
						? 'top'
						: 'bottom';
				const golem = this.sim.spawnUnitDirectly({
					team,
					lane,
					x: team === 'west' ? 300 : ARENA_WIDTH - 300,
					y: lane === 'top' ? 220 : 580,
					hp: 1800,
					maxHp: 1800,
					armor: 12,
					damage: 65,
					range: 110,
					attackCooldown: 1.1,
					speed: 80
				});
				golem.name = 'Кам’яний Голем';
				golem.armorType = 'large';
				golem.attackType = 'normal';
				this.sim.addFloatingText(
					'Кам’яний Голем покликаний!',
					myCastle.x,
					myCastle.y - 60,
					'#78716c'
				);
				this.sim.onSoundEffect?.('bossSpawn');
				break;
			}
			case 'I009': {
				// Rune of Repair: restore 1200 HP to castle
				myCastle.hp = Math.min(myCastle.maxHp, myCastle.hp + 1200);
				this.sim.addFloatingText('+1200 HP Ремонт!', myCastle.x, myCastle.y - 60, '#10b981');
				break;
			}
			case 'I00A': {
				// Lightning Orb: strikes up to 6 enemies within 1000 range of castle for 350 magic damage each
				const rangeSq = 1000 * 1000;
				const candidates = this.sim.units.filter((u) => u.team === enemyTeam && u.state !== 'DEAD');
				candidates.sort((a, b) => {
					const distA = Math.hypot(a.x - myCastle.x, a.y - myCastle.y);
					const distB = Math.hypot(b.x - myCastle.x, b.y - myCastle.y);
					return distA - distB;
				});
				let struck = 0;
				for (const u of candidates) {
					const dx = u.x - myCastle.x;
					const dy = u.y - myCastle.y;
					if (dx * dx + dy * dy <= rangeSq) {
						this.sim.combatSystem.applyUnitDamage(u, 350, 'magic', team, false);
						struck++;
						if (struck >= 6) break;
					}
				}
				this.sim.addFloatingText(
					`Куля Блискавок! (${struck} цілей)`,
					myCastle.x,
					myCastle.y - 60,
					'#38bdf8'
				);
				break;
			}
			case 'I00E': {
				const rangeSq = 1400 * 1400;
				let debuffedCount = 0;
				for (const u of this.sim.units) {
					if (u.team === enemyTeam && u.state !== 'DEAD') {
						const dx = u.x - myCastle.x;
						const dy = u.y - myCastle.y;
						if (dx * dx + dy * dy <= rangeSq) {
							u.buffs = u.buffs || [];
							u.buffs.push({ type: 'weakness', timer: 15, value: 0.4 });
							debuffedCount++;
						}
					}
				}
				this.sim.addFloatingText(
					`Сувій Слабкості! (${debuffedCount} ворогів)`,
					myCastle.x,
					myCastle.y - 60,
					'#a855f7'
				);
				break;
			}
			case 'I000': {
				let dispelled = 0;
				for (const u of this.sim.units) {
					if (u.state === 'DEAD') continue;
					if (u.buffs && u.buffs.length > 0) {
						dispelled += u.buffs.length;
						u.buffs = [];
					}
				}
				this.sim.addFloatingText(
					`Дисперсійний Жезл! (${dispelled} розвіяно)`,
					myCastle.x,
					myCastle.y - 60,
					'#818cf8'
				);
				this.sim.onSoundEffect?.('magic');
				break;
			}
			case 'I00F': {
				this.sim.castleInvulnerableTimer[team] = 6.0;
				this.sim.addFloatingText(
					'Лазурний купол! (Невразливість)',
					myCastle.x,
					myCastle.y - 60,
					'#06b6d4'
				);
				break;
			}
			case 'I004': {
				player.maxFood += 1;
				this.sim.addFloatingText('+1 Їжа! (Сир)', myCastle.x, myCastle.y - 60, '#eab308');
				break;
			}
			case 'I00B':
			case 'I00N': {
				const enemyCastle = this.sim.castles[enemyTeam];
				this.sim.rescueStrikeEffects.push({
					team,
					x: enemyCastle.x,
					y: enemyCastle.y,
					radius: 900,
					timer: 1.5,
					maxTimer: 1.5,
					kind: 'nuke'
				});
				for (const u of this.sim.units) {
					if (u.team === enemyTeam && u.state !== 'DEAD') {
						const dist = Math.hypot(u.x - enemyCastle.x, u.y - enemyCastle.y);
						if (dist <= 900) {
							this.sim.combatSystem.applyUnitDamage(u, 900, 'siege', team, true);
						}
					}
				}
				enemyCastle.hp = Math.max(0, enemyCastle.hp - 800);
				this.sim.addFloatingText(
					'ТАКТИЧНИЙ ЯДЕРНИЙ УДАР!',
					enemyCastle.x,
					enemyCastle.y - 70,
					'#ef4444'
				);
				this.sim.onSoundEffect?.('rescueStrike');
				this.sim.onRescueStrikeWarning?.({
					team,
					x: enemyCastle.x,
					y: enemyCastle.y,
					radius: 900,
					kind: 'nuke'
				});
				break;
			}
		}

		this.sim.onSoundEffect?.('upgrade');
		this.sim.notifyStateChanged();
		return true;
	}

	public getRescueStrikeCooldown(team: MatchTeam, playerInput?: PlayerState): number {
		const targetPlayer = playerInput || this.sim.players?.[team];
		if (!targetPlayer) return this.sim.rescueStrikeCooldown[team];
		if (playerInput && playerInput !== this.sim.players?.[team]) {
			return Math.max(0, targetPlayer.rescueStrikeCooldown ?? 0);
		}
		if (targetPlayer.rescueStrikeCooldown !== undefined) {
			return Math.max(
				0,
				Math.min(targetPlayer.rescueStrikeCooldown, this.sim.rescueStrikeCooldown[team])
			);
		}
		return Math.max(0, this.sim.rescueStrikeCooldown[team]);
	}

	public canUseRescueStrike(team: MatchTeam, playerInput?: PlayerState): boolean {
		if (this.sim.gameModeConfig?.noRescueStrike) return false;
		return this.getRescueStrikeCooldown(team, playerInput) <= 0;
	}

	public triggerRescueStrike(
		team: MatchTeam,
		playerInput?: PlayerState,
		worldX?: number,
		worldY?: number
	): {
		hitCount: number;
		damageDealt: number;
		killCount: number;
		bountyEarned: number;
		queued?: boolean;
	} | null {
		if (!this.canUseRescueStrike(team, playerInput)) return null;

		const castle = this.sim.castles[team];
		const targetPlayer = playerInput || this.sim.players?.[team];
		const hasExplicitCoords =
			typeof worldX === 'number' &&
			typeof worldY === 'number' &&
			Number.isFinite(worldX) &&
			Number.isFinite(worldY);
		const tx = hasExplicitCoords ? worldX : castle.x;
		const ty = hasExplicitCoords ? worldY : castle.y;

		if (hasExplicitCoords && !this.sim.isPointOnIsland(team, tx, ty, 0)) {
			this.sim.addFloatingText('Тільки на своєму острові!', tx, ty - 25, '#ef4444');
			this.sim.notifyStateChanged();
			return null;
		}

		const w = targetPlayer?.worker;
		if (hasExplicitCoords && w) {
			const dist = Math.hypot(w.x - tx, w.y - ty);
			if (dist > RESCUE_STRIKE_CAST_RANGE) {
				let approachX = tx;
				let approachY = ty;
				if (this.sim.workerSystem.isPointBlockedForWorker(team, approachX, approachY)) {
					const resolved = this.sim.workerSystem.clampPointToOwnIsland(
						team,
						approachX,
						approachY,
						16,
						w.x,
						w.y
					);
					approachX = resolved.x;
					approachY = resolved.y;
				}
				w.buildQueue = [];
				w.isBuilding = false;
				w.targetBuildingId = null;
				w.isRepairing = false;
				w.targetRepairBuildingId = null;
				w.pendingRescueStrike = { x: tx, y: ty };
				w.targetX = approachX;
				w.targetY = approachY;
				w.path = this.sim.workerSystem.findWorkerPath(team, w.x, w.y, approachX, approachY);
				this.sim.addFloatingText('Робітник прямує до зони удару...', tx, ty - 25, '#fbbf24');
				this.sim.notifyStateChanged();
				return { hitCount: 0, damageDealt: 0, killCount: 0, bountyEarned: 0, queued: true };
			}
			w.pendingRescueStrike = null;
		}

		return this.executeRescueStrikeAt(team, tx, ty, targetPlayer);
	}

	/**
	 * Executes the Rescue Strike blast centered at (targetX, targetY) once within worker cast range.
	 */
	public executeRescueStrikeAt(
		team: MatchTeam,
		targetX: number,
		targetY: number,
		playerInput?: PlayerState
	): { hitCount: number; damageDealt: number; killCount: number; bountyEarned: number } | null {
		if (!this.canUseRescueStrike(team, playerInput)) return null;

		const targetPlayer = playerInput || this.sim.players?.[team];
		if (targetPlayer) {
			targetPlayer.rescueStrikeCooldown = RESCUE_STRIKE_COOLDOWN;
			if (targetPlayer.worker?.pendingRescueStrike) {
				targetPlayer.worker.pendingRescueStrike = null;
			}
		}
		if (!playerInput || targetPlayer === this.sim.players?.[team]) {
			this.sim.rescueStrikeCooldown[team] = RESCUE_STRIKE_COOLDOWN;
		}
		const enemyTeam: MatchTeam = team === 'west' ? 'east' : 'west';
		const radius = RESCUE_STRIKE_RADIUS;
		const radiusSq = radius * radius;

		this.sim.rescueStrikeEffects.push({
			team,
			x: targetX,
			y: targetY,
			radius,
			timer: 1.2,
			maxTimer: 1.2,
			kind: 'rescue'
		});

		let hitCount = 0;
		let killCount = 0;
		let damageDealt = 0;
		const strikeDamage = RESCUE_STRIKE_DAMAGE;
		const goldBefore = targetPlayer?.gold ?? 0;

		for (const u of this.sim.units) {
			if (u.team === enemyTeam && u.state !== 'DEAD') {
				const dx = u.x - targetX;
				const dy = u.y - targetY;
				if (dx * dx + dy * dy <= radiusSq) {
					this.sim.combatSystem.applyUnitDamage(u, strikeDamage, 'chaos', team, true, undefined, {
						bountyMultiplier: 2,
						killerPlayer: targetPlayer,
						suppressKillFloatingText: true
					});
					hitCount++;
					damageDealt += strikeDamage;
					if ((u.state as string) === 'DEAD') {
						killCount++;
					}
				}
			}
		}

		const bountyEarned = Math.max(0, (targetPlayer?.gold ?? goldBefore) - goldBefore);

		this.sim.addFloatingText(`РЯТІВНИЙ УДАР! (-${strikeDamage})`, targetX, targetY - 75, '#f97316');
		if (bountyEarned > 0) {
			this.sim.addFloatingText(
				`+${bountyEarned}g (Рятівний удар ×2!)`,
				targetX,
				targetY - 108,
				'#fbbf24'
			);
		}
		this.sim.onSoundEffect?.('rescueStrike');
		this.sim.onRescueStrikeWarning?.({
			team,
			x: targetX,
			y: targetY,
			radius,
			kind: 'rescue'
		});

		this.sim.notifyStateChanged();
		return { hitCount, damageDealt, killCount, bountyEarned };
	}
}
