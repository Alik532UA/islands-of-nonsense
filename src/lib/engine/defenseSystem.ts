import type { Simulation } from './simulation';
import type {
	Unit,
	Building,
	Castle,
	MatchTeam,
	Team,
	AttackType,
	PlayerState,
	DamageKillOptions
} from './types';
import { calculateDamage } from './damageMatrix';
import {
	CELL_SIZE,
	type CastleCannonMode,
	CASTLE_CANNON_SHORT_RANGE,
	CASTLE_CANNON_SHORT_COST,
	CASTLE_CANNON_LONG_RANGE,
	CASTLE_CANNON_LONG_COST,
	CASTLE_CANNON_BASE_COOLDOWN,
	CASTLE_CANNON_UPGRADED_COOLDOWN,
	CASTLE_CANNON_UPGRADE_GOLD,
	CASTLE_CANNON_UPGRADE_LUMBER,
	CASTLE_CANNON_BASE_DAMAGE,
	CASTLE_CANNON_SPLASH_RADIUS,
	CASTLE_CANNON_FRIENDLY_FIRE_FACTOR,
	CASTLE_CANNON_ANTI_HEAL_DURATION
} from './constants';
import { getBuilding, isLegendaryBuilding } from './gameData';

export class DefenseSystem {
	public castleCooldowns: Record<MatchTeam, number> = { west: 0, east: 0 };

	constructor(
		private sim: Simulation,
		private combat: {
			applyUnitDamage: (
				target: Unit,
				rawDamage: number,
				attackType: AttackType,
				attackerTeam: Team,
				isCrit?: boolean,
				attackerUnit?: Unit,
				options?: DamageKillOptions
			) => void;
			triggerSplashDamage: (
				targetX: number,
				targetY: number,
				radius: number,
				rawDamage: number,
				attackType: AttackType,
				attackerTeam: Team,
				primaryTargetId?: string,
				killerPlayer?: PlayerState,
				options?: DamageKillOptions
			) => void;
		}
	) {}

	public applyCastleDamageDirect(
		castle: Castle,
		finalDamage: number,
		attacker?: Unit,
		team?: MatchTeam
	): void {
		if (this.sim.castleInvulnerableTimer[castle.team] > 0) {
			this.sim.addFloatingText('Невразливий!', castle.x, castle.y - 30, '#38bdf8');
			return;
		}

		castle.hp = Math.max(0, castle.hp - finalDamage);
		this.sim.onSoundEffect?.('hit');

		if (this.sim.gameTime - this.sim.lastCastleAttackAlert[castle.team] >= 10.0) {
			this.sim.lastCastleAttackAlert[castle.team] = this.sim.gameTime;
			this.sim.onSoundEffect?.('castleUnderAttack');
			this.sim.onCastleUnderAttack?.(castle.team, castle.hp / castle.maxHp);
		}

		const attackerTeam = attacker?.team || team;
		if (attackerTeam === 'west' || attackerTeam === 'east') {
			this.sim.players[attackerTeam].stats.damageToCastle += finalDamage;
			this.sim.players[attackerTeam].stats.totalDamageDealt += finalDamage;
			if (attacker?.buildingDefId) {
				this.sim.recordBuildingDamage(
					attacker.buildingDefId,
					attacker.buildingName || attacker.name,
					attackerTeam,
					finalDamage
				);
			}
		}

		this.sim.addFloatingText(`-${finalDamage}`, castle.x, castle.y - 30, '#ef4444');
		this.sim.notifyStateChanged();
	}

	public attackCastle(attacker: Unit, castle: Castle): void {
		if (this.sim.castleInvulnerableTimer[castle.team] > 0) {
			this.sim.addFloatingText('Невразливий!', castle.x, castle.y - 30, '#38bdf8');
			return;
		}

		attacker.attackAnimTimer = 0.25;
		const rawDmg =
			attacker.damageMin +
			Math.floor(this.sim.nextRandom() * (attacker.damageMax - attacker.damageMin + 1));
		const finalDamage = calculateDamage(attacker.attackType, 'fort', rawDmg, 5);

		if (attacker.range > 150) {
			const isArtillery = !!(
				attacker.isArtillery ||
				attacker.attackType === 'siege' ||
				['cg1a', 'hmtm', 'e002', 'cg18', 'n01E', 'n01F'].includes(attacker.defId)
			);
			const dist = Math.hypot(castle.x - attacker.x, castle.y - attacker.y);
			this.sim.projectiles.push({
				id: `proj_${this.sim.nextProjectileId++}`,
				sourceUnitId: attacker.instanceId,
				targetUnitId: castle.team === 'west' ? 'castle_west' : 'castle_east',
				x: attacker.x,
				y: attacker.y,
				targetX: castle.x,
				targetY: castle.y,
				originX: attacker.x,
				originY: attacker.y,
				totalDist: dist,
				arcHeight: isArtillery ? 95 : attacker.attackType === 'pierce' ? 40 : 15,
				speed: isArtillery ? 550 : 650,
				damage: finalDamage,
				attackType: attacker.attackType,
				isCrit: false,
				team: attacker.team,
				splashRadius: attacker.splashRadius || (isArtillery ? 120 : undefined),
				isArtillery
			});
			if (attacker.attackType === 'magic') {
				this.sim.onSoundEffect?.('magic');
			} else if (isArtillery) {
				this.sim.onSoundEffect?.('attack_siege');
			} else {
				this.sim.onSoundEffect?.('bow');
			}
		} else {
			this.applyCastleDamageDirect(castle, finalDamage, attacker);
		}
	}

	public performAttackBuilding(attacker: Unit, target: Building): void {
		attacker.attackAnimTimer = 0.25;
		let rawDmg =
			attacker.damageMin +
			Math.floor(this.sim.nextRandom() * (attacker.damageMax - attacker.damageMin + 1));
		const dmgBuff = attacker.buffs?.find((b) => b.type === 'dmg');
		if (dmgBuff) {
			const mult =
				dmgBuff.value !== undefined && dmgBuff.value !== 0
					? Math.max(0.1, 1 + dmgBuff.value)
					: 1.25;
			rawDmg = Math.round(rawDmg * mult);
		}

		if (attacker.range > 150) {
			const isArtillery = !!(
				attacker.isArtillery ||
				attacker.attackType === 'siege' ||
				['cg1a', 'hmtm', 'e002', 'cg18', 'n01E', 'n01F'].includes(attacker.defId)
			);
			const dist = Math.hypot(
				target.x + CELL_SIZE / 2 - attacker.x,
				target.y + CELL_SIZE / 2 - attacker.y
			);
			this.sim.projectiles.push({
				id: `proj_${this.sim.nextProjectileId++}`,
				sourceUnitId: attacker.instanceId,
				targetUnitId: target.instanceId,
				x: attacker.x,
				y: attacker.y,
				targetX: target.x + CELL_SIZE / 2,
				targetY: target.y + CELL_SIZE / 2,
				originX: attacker.x,
				originY: attacker.y,
				totalDist: dist,
				arcHeight: isArtillery ? 85 : attacker.attackType === 'pierce' ? 35 : 0,
				speed: isArtillery ? 550 : 650,
				damage: rawDmg,
				attackType: attacker.attackType,
				isCrit: false,
				team: attacker.team,
				splashRadius: attacker.splashRadius || (isArtillery ? 120 : undefined),
				isArtillery
			});
			if (attacker.attackType === 'magic') {
				this.sim.onSoundEffect?.('magic');
			} else {
				this.sim.onSoundEffect?.('bow');
			}
		} else {
			const mTeam: MatchTeam = attacker.team === 'east' ? 'east' : 'west';
			this.damageBuilding(target, rawDmg, attacker.attackType, mTeam);
			this.sim.onSoundEffect?.('sword');
		}
	}

	public damageBuilding(
		building: Building,
		rawDamage: number,
		attackType: AttackType,
		attackerTeam: MatchTeam
	): void {
		if (building.hp <= 0) return;
		const damage = calculateDamage(attackType, building.armorType, rawDamage, building.armor);
		building.hp -= damage;
		this.sim.addFloatingText(`-${damage}`, building.x + CELL_SIZE / 2, building.y - 15, '#f87171');

		const player = this.sim.players[attackerTeam];
		if (player) {
			player.stats.totalDamageDealt += damage;
		}

		if (building.hp <= 0) {
			building.hp = 0;
			this.sim.buildings = this.sim.buildings.filter((b) => b.instanceId !== building.instanceId);
			const bDef = getBuilding(building.defId);
			if (bDef && isLegendaryBuilding(bDef)) {
				const owner =
					(building.playerId
						? this.sim.allPlayers.find((p) => p.id === building.playerId)
						: null) || this.sim.players[building.team];
				if (owner && owner.food > 0) owner.food--;
			}
			this.sim.addFloatingText(
				`Зруйновано: ${building.name}`,
				building.x + CELL_SIZE / 2,
				building.y - 25,
				'#ef4444'
			);
			this.sim.onSoundEffect?.('buildingDestroyed');
		}
		this.sim.notifyStateChanged();
	}

	public getCastleCannonEffectiveCooldown(team: MatchTeam): number {
		const base = this.sim.castleCannonUpgraded[team]
			? CASTLE_CANNON_UPGRADED_COOLDOWN
			: CASTLE_CANNON_BASE_COOLDOWN;
		return this.sim.castleOverchargeTimer[team] > 0 ? base * 0.5 : base;
	}

	public getCastleCannonShotCost(team: MatchTeam, mode: CastleCannonMode): number {
		if (this.sim.castleOverchargeTimer[team] > 0) return 0;
		return mode === 'short' ? CASTLE_CANNON_SHORT_COST : CASTLE_CANNON_LONG_COST;
	}

	public getCastleCannonRange(mode: CastleCannonMode): number {
		return mode === 'short' ? CASTLE_CANNON_SHORT_RANGE : CASTLE_CANNON_LONG_RANGE;
	}

	public countEnemiesInRange(team: MatchTeam, range: number, visibleOnly = false): number {
		const castle = this.sim.castles[team];
		if (!castle || castle.hp <= 0) return 0;
		const enemies = this.sim.spatialGrid.queryRadius(
			castle.x,
			castle.y,
			range,
			(u) => u.team !== team && u.state !== 'DYING' && u.state !== 'DEAD'
		);
		if (!visibleOnly || this.sim.config.fogOfWar === false) {
			return enemies.length;
		}
		return enemies.filter((u) => this.sim.isPointRevealed(team, u.x, u.y)).length;
	}

	public canFireCastleCannon(
		team: MatchTeam,
		mode: CastleCannonMode,
		playerInput?: PlayerState
	): boolean {
		const castle = this.sim.castles[team];
		if (!castle || castle.hp <= 0) return false;
		if ((this.castleCooldowns[team] ?? 0) > 0) return false;
		const shooter = playerInput || this.sim.players[team];
		if (!shooter) return false;
		const cost = this.getCastleCannonShotCost(team, mode);
		return shooter.gold >= cost;
	}

	public canUpgradeCastleCannon(team: MatchTeam, playerInput?: PlayerState): boolean {
		const castle = this.sim.castles[team];
		if (!castle || castle.hp <= 0) return false;
		if (this.sim.castleCannonUpgraded[team]) return false;
		const buyer = playerInput || this.sim.players[team];
		if (!buyer) return false;
		return (
			buyer.gold >= CASTLE_CANNON_UPGRADE_GOLD &&
			(buyer.lumber ?? 0) >= CASTLE_CANNON_UPGRADE_LUMBER
		);
	}

	public upgradeCastleCannon(team: MatchTeam, playerInput?: PlayerState): boolean {
		if (!this.canUpgradeCastleCannon(team, playerInput)) return false;
		const buyer = playerInput || this.sim.players[team];
		const castle = this.sim.castles[team];
		buyer.gold -= CASTLE_CANNON_UPGRADE_GOLD;
		buyer.lumber = Math.max(0, (buyer.lumber ?? 0) - CASTLE_CANNON_UPGRADE_LUMBER);
		buyer.stats.goldSpent += CASTLE_CANNON_UPGRADE_GOLD;
		buyer.stats.lumberSpent = (buyer.stats.lumberSpent || 0) + CASTLE_CANNON_UPGRADE_LUMBER;
		this.sim.castleCannonUpgraded[team] = true;
		const newCap = this.getCastleCannonEffectiveCooldown(team);
		if (this.castleCooldowns[team] > newCap) {
			this.castleCooldowns[team] = newCap;
		}
		this.sim.addFloatingText(
			'Гармата замку покращена! (КД 1с)',
			castle.x,
			castle.y - 75,
			'#38bdf8'
		);
		this.sim.onSoundEffect?.('upgrade');
		this.sim.notifyStateChanged();
		return true;
	}

	public fireCastleCannon(
		team: MatchTeam,
		mode: CastleCannonMode,
		playerInput?: PlayerState
	): { fired: boolean; hitEnemy: boolean; hitAlly: boolean; targetId: string | null } {
		if (!this.canFireCastleCannon(team, mode, playerInput)) {
			return { fired: false, hitEnemy: false, hitAlly: false, targetId: null };
		}

		const castle = this.sim.castles[team];
		const shooter = playerInput || this.sim.players[team];
		const isOvercharged = this.sim.castleOverchargeTimer[team] > 0;
		const cost = this.getCastleCannonShotCost(team, mode);
		const range = this.getCastleCannonRange(mode);

		if (cost > 0) {
			shooter.gold -= cost;
			shooter.stats.goldSpent += cost;
		}

		this.castleCooldowns[team] = this.getCastleCannonEffectiveCooldown(team);

		const enemies = this.sim.spatialGrid.queryRadius(
			castle.x,
			castle.y,
			range,
			(u) => u.team !== team && u.state !== 'DYING' && u.state !== 'DEAD'
		);

		const baseDamage = isOvercharged ? CASTLE_CANNON_BASE_DAMAGE * 2 : CASTLE_CANNON_BASE_DAMAGE;

		let target: Unit | null = null;
		let isFriendlyFire = false;
		if (enemies.length > 0) {
			target = enemies[Math.floor(this.sim.nextRandom() * enemies.length)];
		} else {
			// No enemies in range: friendly fire fallback (prioritize shooter's own units at reduced damage)
			const allies = this.sim.spatialGrid.queryRadius(
				castle.x,
				castle.y,
				range,
				(u) => u.team === team && u.state !== 'DYING' && u.state !== 'DEAD'
			);
			const ownAllies = allies.filter(
				(u) =>
					(shooter.slot != null && u.playerSlot === shooter.slot) ||
					(shooter.id != null && u.playerId === shooter.id)
			);
			const pool = ownAllies.length > 0 ? ownAllies : allies;
			if (pool.length > 0) {
				target = pool[Math.floor(this.sim.nextRandom() * pool.length)];
				isFriendlyFire = true;
			}
		}

		if (target) {
			const dist = Math.hypot(target.x - castle.x, target.y - castle.y);
			const damage = isFriendlyFire
				? Math.max(1, Math.round(baseDamage * CASTLE_CANNON_FRIENDLY_FIRE_FACTOR))
				: baseDamage;
			this.sim.projectiles.push({
				id: `castle_shot_${this.sim.nextProjectileId++}`,
				sourceUnitId: 'castle_' + team,
				targetUnitId: target.instanceId,
				x: castle.x,
				y: castle.y,
				targetX: target.x,
				targetY: target.y,
				originX: castle.x,
				originY: castle.y,
				totalDist: dist,
				arcHeight: 50,
				speed: 700,
				damage,
				attackType: 'siege',
				isCrit: !isFriendlyFire && isOvercharged,
				team,
				splashRadius: isFriendlyFire ? undefined : CASTLE_CANNON_SPLASH_RADIUS,
				shooterPlayerId: shooter.id,
				shooterSlot: shooter.slot,
				suppressBounty: true,
				isFriendlyFire,
				antiHealDuration: isFriendlyFire ? undefined : CASTLE_CANNON_ANTI_HEAL_DURATION
			});
			if (isFriendlyFire) {
				this.sim.addFloatingText('Дружній вогонь!', castle.x, castle.y - 68, '#f97316');
			}
			this.sim.onSoundEffect?.('attack_siege');
			this.sim.notifyStateChanged();
			return {
				fired: true,
				hitEnemy: !isFriendlyFire,
				hitAlly: isFriendlyFire,
				targetId: target.instanceId
			};
		}

		this.sim.addFloatingText('Цілей не знайдено!', castle.x, castle.y - 68, '#94a3b8');
		this.sim.onSoundEffect?.('attack_siege');
		this.sim.notifyStateChanged();
		return { fired: true, hitEnemy: false, hitAlly: false, targetId: null };
	}

	public updateCastles(dt: number): void {
		for (const team of ['west', 'east'] as MatchTeam[]) {
			if (this.castleCooldowns[team] > 0) {
				this.castleCooldowns[team] = Math.max(0, this.castleCooldowns[team] - dt);
			}
			const autoMode = this.sim.castleCannonAutoMode?.[team];
			if (autoMode && (this.castleCooldowns[team] ?? 0) <= 0) {
				const slot = this.sim.castleCannonAutoPlayerSlot?.[team];
				const shooter =
					typeof slot === 'number'
						? this.sim.allPlayers.find((p) => p.slot === slot)
						: this.sim.players[team];
				const range = this.getCastleCannonRange(autoMode);
				if (
					this.canFireCastleCannon(team, autoMode, shooter) &&
					this.countEnemiesInRange(team, range, true) > 0
				) {
					this.fireCastleCannon(team, autoMode, shooter);
				}
			}
		}
	}

	public updateTowers(dt: number): void {
		for (const b of this.sim.buildings) {
			if (b.specialType !== 'tower') continue;

			if (b.attackTimer === undefined) {
				b.attackTimer = 0;
			}
			b.attackTimer -= dt;

			if (b.attackTimer <= 0) {
				const range = b.attackRange || 500;
				const enemy = this.sim.spatialGrid.findClosestEnemy(
					b.x,
					b.y,
					range,
					b.team,
					undefined,
					true
				);
				if (enemy) {
					b.attackTimer = b.attackCooldown || 1.0;
					const dmg = b.damageMin || 50;
					const isArtillery = !!(
						b.isArtillery ||
						b.attackType === 'siege' ||
						['h001', 'h073', 'cg0a', 'h048', 'h01E', 'u008', 'h04P'].includes(b.defId)
					);
					const isSplash = isArtillery || b.defId === 'h073' || b.defId === 'cg0a';
					const tDist = Math.hypot(enemy.x - b.x, enemy.y - b.y);
					this.sim.projectiles.push({
						id: `tower_shot_${this.sim.nextProjectileId++}`,
						sourceUnitId: b.instanceId,
						targetUnitId: enemy.instanceId,
						x: b.x,
						y: b.y,
						targetX: enemy.x,
						targetY: enemy.y,
						originX: b.x,
						originY: b.y,
						totalDist: tDist,
						arcHeight: isArtillery ? 90 : 30,
						speed: isArtillery ? 520 : 650,
						damage: dmg,
						attackType: b.attackType || 'pierce',
						isCrit: false,
						team: b.team,
						splashRadius: isArtillery ? 120 : isSplash ? 65 : undefined,
						hasFrost: b.defId === 'h03Q',
						isArtillery
					});
				}
			}
		}
	}

	public updateProjectiles(dt: number): void {
		for (const p of this.sim.projectiles) {
			const target = this.sim.units.find((u) => u.instanceId === p.targetUnitId);
			const targetBuilding = !target
				? this.sim.buildings.find((b) => b.instanceId === p.targetUnitId)
				: null;
			const targetCastle =
				!target && !targetBuilding && p.targetUnitId?.startsWith('castle')
					? p.targetUnitId === 'castle_west'
						? this.sim.castles.west
						: p.targetUnitId === 'castle_east'
							? this.sim.castles.east
							: null
					: null;

			// Homing vs Artillery:
			// Non-artillery projectiles track target coordinates continuously.
			// Artillery projectiles fly toward fixed ground coordinates established at launch.
			if (!p.isArtillery) {
				if (target && target.state !== 'DEAD') {
					p.targetX = target.x;
					p.targetY = target.y;
				} else if (targetBuilding) {
					p.targetX = targetBuilding.x + CELL_SIZE / 2;
					p.targetY = targetBuilding.y + CELL_SIZE / 2;
				}
			}

			const dx = p.targetX - p.x;
			const dy = p.targetY - p.y;
			const dist = Math.hypot(dx, dy);

			const step = p.speed * dt;
			if (dist <= step) {
				const attackerUnit = this.sim.units.find((u) => u.instanceId === p.sourceUnitId);
				const sourceTower = p.sourceUnitId.startsWith('bld_')
					? this.sim.buildings.find((b) => b.instanceId === p.sourceUnitId)
					: undefined;
				const shooterPlayer =
					p.shooterSlot != null
						? this.sim.allPlayers.find((pl) => pl.slot === p.shooterSlot)
						: p.shooterPlayerId
							? this.sim.allPlayers.find((pl) => pl.id === p.shooterPlayerId)
							: undefined;
				const ownerPlayerId = attackerUnit?.playerId ?? sourceTower?.playerId;
				const killerPlayer =
					shooterPlayer ??
					(ownerPlayerId ? this.sim.allPlayers.find((pl) => pl.id === ownerPlayerId) : undefined);
				const killOptions: DamageKillOptions | undefined =
					killerPlayer || p.suppressBounty || p.isFriendlyFire || p.antiHealDuration
						? {
								killerPlayer,
								suppressBounty: p.suppressBounty,
								isFriendlyFire: p.isFriendlyFire,
								antiHealDuration: p.antiHealDuration
							}
						: undefined;
				if (p.isArtillery) {
					// Ground-impact detonation: AoE splash at ground target point
					const radius = p.splashRadius || 120;
					this.combat.triggerSplashDamage(
						p.targetX,
						p.targetY,
						radius,
						p.damage,
						p.attackType,
						p.team,
						undefined, // Hits any enemy currently in impact zone; units that dodged take 0
						killerPlayer,
						killOptions
					);

					// Building damage if ground impact point is within radius of target building
					if (targetBuilding && targetBuilding.hp > 0) {
						const bDist = Math.hypot(
							targetBuilding.x + CELL_SIZE / 2 - p.targetX,
							targetBuilding.y + CELL_SIZE / 2 - p.targetY
						);
						if (bDist <= radius) {
							this.damageBuilding(targetBuilding, p.damage, p.attackType, p.team as MatchTeam);
						}
					}

					// Castle damage if ground impact point is within radius of target castle
					if (targetCastle && targetCastle.hp > 0) {
						const cDist = Math.hypot(targetCastle.x - p.targetX, targetCastle.y - p.targetY) - 110;
						if (cDist <= radius) {
							this.applyCastleDamageDirect(
								targetCastle,
								p.damage,
								attackerUnit,
								p.team as MatchTeam
							);
						}
					}

					// Tower stats for artillery tower
					if (p.sourceUnitId.startsWith('bld_')) {
						const tower = this.sim.buildings.find((b) => b.instanceId === p.sourceUnitId);
						if (tower) {
							this.sim.recordBuildingDamage(tower.defId, tower.name, tower.team, p.damage);
						}
					}
				} else {
					// Homing projectile: direct hit to tracking target
					if (target && target.state !== 'DEAD') {
						this.combat.applyUnitDamage(
							target,
							p.damage,
							p.attackType,
							p.team,
							p.isCrit,
							attackerUnit,
							killOptions
						);

						// Tower special on-hit effects & stats
						if (p.sourceUnitId.startsWith('bld_')) {
							if (!target.buffs) target.buffs = [];
							const tower = this.sim.buildings.find((b) => b.instanceId === p.sourceUnitId);
							if (tower) {
								this.sim.recordBuildingDamage(tower.defId, tower.name, tower.team, p.damage);
								if (target.hp <= 0) {
									this.sim.recordBuildingKill(tower.defId, tower.name, tower.team);
								}
							}
							if (tower?.defId === 'h03Q') {
								// Frost tower chill slow
								const slowBuff = target.buffs.find((b) => b.type === 'slow');
								if (slowBuff) {
									slowBuff.timer = Math.max(slowBuff.timer, 2.0);
								} else {
									target.buffs.push({ type: 'slow', timer: 2.0, value: 0.3 });
								}
							} else if (tower?.defId === 'n01J') {
								// Plague tower poison
								const poisonBuff = target.buffs.find((b) => b.type === 'poison');
								if (poisonBuff) {
									poisonBuff.timer = Math.max(poisonBuff.timer, 3.0);
								} else {
									target.buffs.push({ type: 'poison', timer: 3.0, value: 12 });
								}
							}
						}
					} else if (targetBuilding && targetBuilding.hp > 0) {
						this.damageBuilding(targetBuilding, p.damage, p.attackType, p.team as MatchTeam);
					} else if (targetCastle && targetCastle.hp > 0) {
						this.applyCastleDamageDirect(targetCastle, p.damage, attackerUnit, p.team as MatchTeam);
					}

					const hitDirectUnit = Boolean(target && target.state !== 'DEAD');
					if (p.splashRadius) {
						this.combat.triggerSplashDamage(
							p.targetX,
							p.targetY,
							p.splashRadius,
							hitDirectUnit ? p.damage * 0.5 : p.damage,
							p.attackType,
							p.team,
							hitDirectUnit ? p.targetUnitId : undefined,
							killerPlayer,
							killOptions
						);
					}
				}
				p.damage = 0;
			} else {
				p.x += (dx / dist) * step;
				p.y += (dy / dist) * step;
			}
		}
	}
}
