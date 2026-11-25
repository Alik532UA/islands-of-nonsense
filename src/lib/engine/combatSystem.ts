import type { Simulation } from './simulation';
import {
	ARENA_WIDTH,
	TOP_LANE_Y,
	MID_LANE_Y,
	BOTTOM_LANE_Y,
	CELL_SIZE,
	BRIDGE_SPAN_MIN_X,
	BRIDGE_SPAN_MAX_X,
	WEST_ROAD_MERGE_X,
	EAST_ROAD_MERGE_X
} from './constants';
import type {
	Unit,
	Building,
	Castle,
	MatchTeam,
	Team,
	Lane,
	AttackType,
	PlayerState,
	DamageKillOptions
} from './types';
import { getUnit, resolveUnitKillBounty } from './gameData';
import { calculateDamage, getDamageMultiplier } from './damageMatrix';
import { DefenseSystem } from './defenseSystem';
import { UnitSpellSystem, SPELL_MANA_COSTS } from './unitSpells';
import { UnitNavigation } from './unitNavigation';

export { SPELL_MANA_COSTS };
import { applyCrowdSeparation } from './crowdPhysics';

/**
 * CombatSystem handles unit state machines, targeting, pathing towards objectives,
 * melee & ranged attacks, projectiles, AoE splash, tower defense, castle attacks, and damage calculations.
 */
export class CombatSystem {
	public defenseSystem: DefenseSystem;
	public spellSystem: UnitSpellSystem;
	public navigation: UnitNavigation;

	constructor(private sim: Simulation) {
		this.spellSystem = new UnitSpellSystem(
			sim,
			(target, rawDamage, attackType, attackerTeam, isCrit, attackerUnit, options) =>
				this.applyUnitDamage(
					target,
					rawDamage,
					attackType,
					attackerTeam,
					!!isCrit,
					attackerUnit,
					options
				)
		);
		this.navigation = new UnitNavigation(sim);
		this.defenseSystem = new DefenseSystem(sim, {
			applyUnitDamage: (
				target,
				rawDamage,
				attackType,
				attackerTeam,
				isCrit,
				attackerUnit,
				options
			) =>
				this.applyUnitDamage(
					target,
					rawDamage,
					attackType,
					attackerTeam,
					!!isCrit,
					attackerUnit,
					options
				),
			triggerSplashDamage: (
				targetX,
				targetY,
				radius,
				rawDamage,
				attackType,
				attackerTeam,
				primaryTargetId,
				killerPlayer,
				options
			) =>
				this.triggerSplashDamage(
					targetX,
					targetY,
					radius,
					rawDamage,
					attackType,
					attackerTeam,
					primaryTargetId,
					undefined,
					killerPlayer,
					options
				)
		});
	}

	/**
	 * Determines whether `attacker` can engage `candidate` in combat.
	 * Preserves separation across intact distant corridors (540px apart) while allowing
	 * units that physically converge — on broken-bridge detours, shared castle courtyards,
	 * or direct contact — to engage instead of walking past each other.
	 */
	public canEngageTarget(attacker: Unit, candidate: Unit): boolean {
		if (candidate.lane === attacker.lane) return true;

		// Intact lane centers (660, 1200, 1740) are 540px apart: never aggro across distant lanes
		if (Math.abs(candidate.y - attacker.y) > 240) return false;

		const attackerCrossing = this.navigation.getEffectiveCrossingLane(attacker);
		const candidateCrossing = this.navigation.getEffectiveCrossingLane(candidate);
		if (attackerCrossing === candidateCrossing) {
			return true;
		}

		// Shared castle courtyard convergence zones on West/East islands
		const bothInWestCourtyard =
			attacker.x <= WEST_ROAD_MERGE_X + 120 && candidate.x <= WEST_ROAD_MERGE_X + 120;
		const bothInEastCourtyard =
			attacker.x >= EAST_ROAD_MERGE_X - 120 && candidate.x >= EAST_ROAD_MERGE_X - 120;
		if (bothInWestCourtyard || bothInEastCourtyard) {
			return true;
		}

		// Close-range physical interception on the same side of the river or shared bridge
		const sameSide =
			(attacker.x <= 3600 && candidate.x <= 3600) || (attacker.x >= 3600 && candidate.x >= 3600);
		if (!sameSide) return false;

		const dist = Math.hypot(candidate.x - attacker.x, candidate.y - attacker.y);
		return dist <= Math.max(attacker.range + 110, 260);
	}

	/**
	 * Authentic WC3 threat and aggro targeting calculation.
	 * Evaluates candidate targets based on distance, direct attacker threat,
	 * ally assist calls, attack-vs-armor tactical affinity, low-HP focus, and stickiness.
	 */
	public findBestTarget(u: Unit): Unit | null {
		const acquisitionRange = Math.max(u.range + 80, 420);
		const canHitAir = u.canHitAir ?? (u.range > 120 || !!u.flying);

		const candidates = this.sim.spatialGrid.queryRadius(u.x, u.y, acquisitionRange, (candidate) => {
			if (candidate.team === u.team) return false;
			if (!this.canEngageTarget(u, candidate)) return false;
			if (candidate.state === 'DEAD' || candidate.hp <= 0) return false;
			if (candidate.flying && !canHitAir) return false;
			if (candidate.isCycloned || candidate.buffs?.some((b) => b.type === 'cyclone')) return false;
			if (
				(candidate.isBanished || candidate.buffs?.some((b) => b.type === 'banish')) &&
				(u.attackType === 'normal' || u.attackType === 'pierce' || u.attackType === 'siege')
			) {
				return false;
			}
			return true;
		});

		if (candidates.length === 0) return null;

		let bestCandidate: Unit | null = null;
		let highestScore = -Infinity;

		for (const enemy of candidates) {
			const dist = Math.hypot(enemy.x - u.x, enemy.y - u.y);

			// Base distance component: proximity is dominant in melee/skirmish
			let score = 1000 - dist * 3.0;

			// 1. Direct Threat: Enemy is targeting me
			if (enemy.currentTargetId === u.instanceId) {
				score += 550;
			}

			// 2. Direct Recent Attacker (for hit-and-run or ranged assailants not currently targeting me)
			if (
				enemy.currentTargetId !== u.instanceId &&
				u.lastAttackerId === enemy.instanceId &&
				this.sim.gameTime - (u.lastAttackedTime || 0) < 3.5
			) {
				score += 350;
			}

			// 3. Call For Help / Ally Protection: Enemy is attacking a nearby friendly squad member (not myself)
			if (enemy.currentTargetId) {
				const ally = this.sim.units.find(
					(a) =>
						a.instanceId === enemy.currentTargetId &&
						a.team === u.team &&
						(a.lane === u.lane || Math.abs(a.y - u.y) <= 240) &&
						a.instanceId !== u.instanceId
				);
				if (ally && Math.hypot(ally.x - u.x, ally.y - u.y) <= 350) {
					score += 250;
				}
			}

			// 4. Tactical Matrix Advantage: bonus damage vs target armor
			const mult = getDamageMultiplier(u.attackType, enemy.armorType);
			score += (mult - 1.0) * 200;

			// 5. Finishing Off / Focus Fire: Enemy low on health percentage or absolute HP
			if (enemy.hp <= 50) {
				score += (50 - enemy.hp) * 2;
			}
			if (enemy.maxHp > 0) {
				const missingHpRatio = 1 - Math.max(0, enemy.hp / enemy.maxHp);
				score += missingHpRatio * 100;
			}

			// 6. Target Stickiness / Commitment: avoid erratic flipping
			if (u.currentTargetId === enemy.instanceId) {
				score += 200;
			}

			if (score > highestScore) {
				highestScore = score;
				bestCandidate = enemy;
			}
		}

		return bestCandidate;
	}

	public updateUnits(dt: number): void {
		// Update battlefield scrap debris decay
		for (let i = this.sim.debris.length - 1; i >= 0; i--) {
			const d = this.sim.debris[i];
			d.lifeTime -= dt;
			if (d.lifeTime <= 0) {
				this.sim.debris.splice(i, 1);
			}
		}

		for (const u of this.sim.units) {
			if (u.state === 'DEAD') {
				u.deathTimer = (u.deathTimer ?? 0.7) - dt;
				continue;
			}

			// Process active buffs
			if (u.buffs && u.buffs.length > 0) {
				for (const b of u.buffs) {
					b.timer -= dt;
					if (b.type === 'infect' || b.type === 'poison') {
						u.hp -= b.value * dt;
					}
				}
				u.buffs = u.buffs.filter((b) => b.timer > 0);
				if (u.hp <= 0) {
					u.state = 'DEAD';
					continue;
				}
			}

			// Timed life check (for summoned units like Skeletons)
			if (u.timedLife !== undefined) {
				u.timedLife -= dt;
				if (u.timedLife <= 0) {
					u.hp = 0;
					u.state = 'DEAD';
					continue;
				}
			}

			// Cyclone check: suspended in air, completely disabled and invulnerable
			const isCycloned = u.buffs?.some((b) => b.type === 'cyclone');
			u.isCycloned = !!isCycloned;
			if (isCycloned) {
				continue;
			}

			// Polymorph check: transformed into sheep, cannot attack or cast spells
			const isPolymorphed = u.buffs?.some((b) => b.type === 'polymorph');
			u.isPolymorphed = !!isPolymorphed;
			if (isPolymorphed) {
				u.currentTargetId = null;
			}

			// Banish check: ethereal form
			const isBanished = u.buffs?.some((b) => b.type === 'banish');
			u.isBanished = !!isBanished;

			// Mana Shield check
			const hasManaShield =
				u.abilityType === 'mana_shield' || u.abilities?.some((a) => a.type === 'mana_shield');
			u.hasManaShield = Boolean(hasManaShield && u.maxMana && (u.mana ?? 0) > 0);

			// Stun check: stunned units cannot move or attack
			const isStunned = u.buffs?.some((b) => b.type === 'stun');
			u.isStunned = !!isStunned;
			if (isStunned) {
				continue;
			}

			// Ensnare check: grounded while ensnared
			const isEnsnared = u.buffs?.some((b) => b.type === 'ensnare');
			u.isEnsnared = !!isEnsnared;
			if (isEnsnared) {
				u.flying = false;
			}

			// Update mana, cooldowns, auras, and tactical spellcasting
			this.spellSystem.updateUnitSpells(u, dt);
			u.prevX = u.x;
			u.prevY = u.y;
			u.cooldownTimer -= dt;

			let currentSpeed = u.speed;
			if (u.buffs?.some((b) => b.type === 'slow')) {
				currentSpeed *= 0.6;
			}
			if (u.buffs?.some((b) => b.type === 'frost')) {
				currentSpeed *= 0.65;
			}
			if (u.buffs?.some((b) => b.type === 'bloodlust')) {
				currentSpeed *= 1.25;
			}
			if (u.buffs?.some((b) => b.type === 'weakness')) {
				currentSpeed *= 0.75;
			}
			if (isPolymorphed) {
				currentSpeed *= 0.55;
			}
			if (isBanished) {
				currentSpeed *= 0.7;
			}

			const targetLaneY =
				u.lane === 'top' ? TOP_LANE_Y : u.lane === 'mid' ? MID_LANE_Y : BOTTOM_LANE_Y;
			const effectiveCrossingLane = this.navigation.getEffectiveCrossingLane(u);
			const crossingLaneY =
				effectiveCrossingLane === 'top'
					? TOP_LANE_Y
					: effectiveCrossingLane === 'mid'
						? MID_LANE_Y
						: BOTTOM_LANE_Y;

			// Target Acquisition (WC3 Threat & Aggro System)
			let enemyTarget = this.findBestTarget(u);

			if (isPolymorphed) {
				enemyTarget = null;
				u.currentTargetId = null;
			}
			if (
				isBanished &&
				(u.attackType === 'normal' || u.attackType === 'pierce' || u.attackType === 'siege')
			) {
				enemyTarget = null;
				u.currentTargetId = null;
			}

			// Authentic WC3 Siege Priority:
			// Siege weapons prioritize buildings, defensive towers, and castles when in range
			if (u.attackType === 'siege' && (u.team === 'west' || u.team === 'east')) {
				const enemyTeam: MatchTeam = u.team === 'west' ? 'east' : 'west';
				const targetCastle = u.team === 'west' ? this.sim.castles.east : this.sim.castles.west;
				const distToCastle = Math.hypot(targetCastle.x - u.x, targetCastle.y - u.y) - 60;
				const isNearEnemyBase =
					u.team === 'west' ? u.x >= BRIDGE_SPAN_MAX_X : u.x <= BRIDGE_SPAN_MIN_X;

				let hasBuildingTarget = distToCastle <= u.range + 65;
				if (!hasBuildingTarget && isNearEnemyBase) {
					for (const b of this.sim.buildings) {
						if (b.team === enemyTeam && b.hp > 0) {
							const bx = b.x + CELL_SIZE / 2;
							const by = b.y + CELL_SIZE / 2;
							const d = Math.hypot(bx - u.x, by - u.y) - CELL_SIZE / 2;
							if (d <= u.range + 35) {
								hasBuildingTarget = true;
								break;
							}
						}
					}
				}

				if (hasBuildingTarget) {
					enemyTarget = null; // Bypass unit combat to bombard structures!
				}
			}

			if (enemyTarget && enemyTarget.hp > 0 && this.canEngageTarget(u, enemyTarget)) {
				const isAcrossRiver =
					(u.x < 3600 && enemyTarget.x > 3600) || (u.x > 3600 && enemyTarget.x < 3600);
				const bridgeBroken = !u.flying && this.sim.brokenBridge && u.lane === this.sim.brokenBridge;
				const alreadyOnIntactCrossing = Math.abs(u.y - crossingLaneY) <= 95;

				if (isAcrossRiver && bridgeBroken && !alreadyOnIntactCrossing) {
					// Cannot cross broken bridge in straight line: detour across intact bridge first!
					const navTarget = this.navigation.getStrategicNavTarget(
						u,
						enemyTarget.x,
						enemyTarget.y,
						crossingLaneY
					);
					u.state = 'WALKING';
					u.currentTargetId = enemyTarget.instanceId;
					this.navigation.moveUnitTowards(u, navTarget.x, navTarget.y, currentSpeed, dt);
				} else {
					const dx = enemyTarget.x - u.x;
					const dy = enemyTarget.y - u.y;
					const dist = Math.hypot(dx, dy);

					// Attack range check with hysteresis to prevent state toggling / jitter
					const attackRange = u.range;
					const keepAttackRange = attackRange + 25;

					if (
						dist <=
						(u.state === 'ATTACKING' && u.currentTargetId === enemyTarget.instanceId
							? keepAttackRange
							: attackRange)
					) {
						// In range -> ATTACK
						u.state = 'ATTACKING';
						u.currentTargetId = enemyTarget.instanceId;
						u.targetBuildingId = null;

						if (u.cooldownTimer <= 0) {
							let cd = u.attackCooldown;
							if (u.buffs?.some((b) => b.type === 'as')) {
								cd *= 0.75;
							}
							if (u.buffs?.some((b) => b.type === 'bloodlust')) {
								cd *= 0.7;
							}
							if (u.buffs?.some((b) => b.type === 'frost')) {
								cd *= 1.35;
							}
							if (u.buffs?.some((b) => b.type === 'slow')) {
								cd *= 1.3;
							}
							if (u.buffs?.some((b) => b.type === 'weakness')) {
								cd *= 1.4;
							}
							u.cooldownTimer = cd;
							this.performAttack(u, enemyTarget);
						}
					} else {
						// Move smoothly towards enemy on the lane
						u.state = 'WALKING';
						u.currentTargetId = enemyTarget.instanceId;
						this.navigation.moveUnitTowards(u, enemyTarget.x, enemyTarget.y, currentSpeed, dt);
					}
				}
			} else if (u.team === 'neutral') {
				// Boss Leash & Patrol: Patrol across river crossing
				u.currentTargetId = null;
				const centerX = ARENA_WIDTH / 2;
				const patrolTargetX = centerX + Math.sin(this.sim.gameTime * 0.4) * 200;
				const dx = patrolTargetX - u.x;
				const dy = targetLaneY - u.y;
				const dist = Math.hypot(dx, dy);
				if (dist > 12) {
					u.state = 'WALKING';
					this.navigation.moveUnitTowards(u, patrolTargetX, targetLaneY, currentSpeed, dt);
				} else {
					u.state = 'WALKING';
				}
			} else {
				// No enemy units on this lane -> Target enemy buildings OR the enemy castle!
				const enemyTeam: MatchTeam = u.team === 'west' ? 'east' : 'west';
				const targetCastle = u.team === 'west' ? this.sim.castles.east : this.sim.castles.west;
				const castleRadius = 110;
				const distToCastle = Math.max(
					0,
					Math.hypot(targetCastle.x - u.x, targetCastle.y - u.y) - castleRadius
				);
				const isNearEnemyBase =
					u.team === 'west' ? u.x >= BRIDGE_SPAN_MAX_X : u.x <= BRIDGE_SPAN_MIN_X;

				let closestBld: Building | null = null;
				let closestBldDist = Infinity;

				if (isNearEnemyBase) {
					for (const b of this.sim.buildings) {
						if (b.team !== enemyTeam || b.hp <= 0) continue;
						const bx = b.x + CELL_SIZE / 2;
						const by = b.y + CELL_SIZE / 2;
						const d = Math.hypot(bx - u.x, by - u.y) - CELL_SIZE / 2;
						if (d < closestBldDist && d <= Math.max(u.range + 100, 650)) {
							closestBldDist = d;
							closestBld = b;
						}
					}
				}

				// Check whether Castle or Building should be targeted:
				// If in attack range of Castle, or Castle is closer than any building, attack Castle!
				const castleInRange = distToCastle <= u.range + 35;
				const buildingInRange = closestBld && closestBldDist <= u.range + 35;

				if (castleInRange || (!buildingInRange && distToCastle < closestBldDist)) {
					// Target & Attack Castle!
					if (
						distToCastle <=
						(u.state === 'ATTACKING' && u.targetBuildingId?.startsWith('castle')
							? u.range + 45
							: u.range + 25)
					) {
						u.state = 'ATTACKING';
						u.currentTargetId = null;
						u.targetBuildingId = targetCastle.team === 'west' ? 'castle_west' : 'castle_east';
						if (u.cooldownTimer <= 0) {
							let cd = u.attackCooldown;
							if (u.buffs?.some((b) => b.type === 'as')) cd *= 0.75;
							if (u.buffs?.some((b) => b.type === 'weakness')) cd *= 1.4;
							u.cooldownTimer = cd;
							this.attackCastle(u, targetCastle);
						}
					} else {
						u.state = 'WALKING';
						u.currentTargetId = null;
						u.targetBuildingId = targetCastle.team === 'west' ? 'castle_west' : 'castle_east';

						// Strategic stage-based navigation across bridges without snapping
						const hasCustomNav =
							u.targetX !== undefined &&
							u.targetY !== undefined &&
							u.targetX !== (u.team === 'west' ? ARENA_WIDTH - 200 : 200) &&
							u.targetX !== targetCastle.x;

						const navTarget = hasCustomNav
							? { x: u.targetX, y: u.targetY }
							: this.navigation.getStrategicNavTarget(
									u,
									targetCastle.x,
									targetCastle.y,
									crossingLaneY
								);
						const dNav = Math.hypot(navTarget.x - u.x, navTarget.y - u.y);
						if (dNav > 5) {
							this.navigation.moveUnitTowards(
								u,
								navTarget.x,
								navTarget.y,
								currentSpeed,
								dt,
								undefined,
								isNearEnemyBase
							);
						}
					}
				} else if (closestBld) {
					// Target & Attack Building!
					if (
						closestBldDist <=
						(u.state === 'ATTACKING' && u.targetBuildingId === closestBld.instanceId
							? u.range + 45
							: u.range + 25)
					) {
						u.state = 'ATTACKING';
						u.currentTargetId = null;
						u.targetBuildingId = closestBld.instanceId;
						if (u.cooldownTimer <= 0) {
							let cd = u.attackCooldown;
							if (u.buffs?.some((b) => b.type === 'as')) cd *= 0.75;
							if (u.buffs?.some((b) => b.type === 'weakness')) cd *= 1.4;
							u.cooldownTimer = cd;
							this.performAttackBuilding(u, closestBld);
						}
					} else {
						u.state = 'WALKING';
						u.currentTargetId = null;
						u.targetBuildingId = closestBld.instanceId;
						const bx = closestBld.x + CELL_SIZE / 2;
						const by = closestBld.y + CELL_SIZE / 2;

						// Strategic stage-based navigation towards bridge and building
						const navTarget = this.navigation.getStrategicNavTarget(u, bx, by, crossingLaneY);

						const d = Math.hypot(navTarget.x - u.x, navTarget.y - u.y);
						if (d > 5) {
							this.navigation.moveUnitTowards(
								u,
								navTarget.x,
								navTarget.y,
								currentSpeed,
								dt,
								closestBld.instanceId
							);
						}
					}
				} else {
					// March towards Enemy Castle!
					u.currentTargetId = null;
					u.targetBuildingId = targetCastle.team === 'west' ? 'castle_west' : 'castle_east';
					u.state = 'WALKING';

					const hasCustomNav =
						u.targetX !== undefined &&
						u.targetY !== undefined &&
						u.targetX !== (u.team === 'west' ? ARENA_WIDTH - 200 : 200) &&
						u.targetX !== targetCastle.x;

					const navTarget = hasCustomNav
						? { x: u.targetX, y: u.targetY }
						: this.navigation.getStrategicNavTarget(
								u,
								targetCastle.x,
								targetCastle.y,
								crossingLaneY
							);

					const d = Math.hypot(navTarget.x - u.x, navTarget.y - u.y);
					if (d > 5) {
						this.navigation.moveUnitTowards(
							u,
							navTarget.x,
							navTarget.y,
							currentSpeed,
							dt,
							undefined,
							isNearEnemyBase
						);
					}
				}
			}
		}

		// Apply Crowd Physics & Boids Separation (which also enforces solid obstacle boundaries)
		this.applyCrowdSeparation(dt);
	}

	public getEffectiveCrossingLane(u: Unit): 'top' | 'mid' | 'bottom' {
		return this.navigation.getEffectiveCrossingLane(u);
	}

	public getStrategicNavTarget(
		u: Unit,
		finalTargetX: number,
		finalTargetY: number,
		crossingLaneY: number
	): { x: number; y: number } {
		return this.navigation.getStrategicNavTarget(u, finalTargetX, finalTargetY, crossingLaneY);
	}

	public moveUnitTowards(
		u: Unit,
		targetX: number,
		targetY: number,
		speed: number,
		dt: number,
		ignoreBuildingId?: string,
		ignoreCastle?: boolean
	): void {
		this.navigation.moveUnitTowards(u, targetX, targetY, speed, dt, ignoreBuildingId, ignoreCastle);
	}

	/**
	 * Applies hard non-penetration and soft Boids-style separation repulsion between ground units
	 * to prevent stacking and create authentic frontline spread across the lane corridor width.
	 */
	public applyCrowdSeparation(dt: number): void {
		applyCrowdSeparation(this.sim, dt);
	}

	public performAttack(attacker: Unit, target: Unit): void {
		// Double check lane/corridor engagement rules
		if (!this.canEngageTarget(attacker, target)) return;

		// Curse check: 33% chance to miss attacks
		if (attacker.buffs?.some((b) => b.type === 'curse') && this.sim.nextRandom() < 0.33) {
			this.sim.addFloatingText('Промах! (Прокляття)', attacker.x, attacker.y - 20, '#a855f7');
			return;
		}

		// Evade check
		let effectiveEvade = target.evadeChance || 0;
		if (target.buffs?.some((b) => b.type === 'evade')) {
			effectiveEvade = Math.min(0.85, effectiveEvade + 0.4);
		}
		if (effectiveEvade > 0 && this.sim.nextRandom() < effectiveEvade) {
			this.sim.addFloatingText('Ухилення!', target.x, target.y - 20, '#60a5fa');
			return;
		}

		// Roll raw damage
		let rawDmg =
			attacker.damageMin +
			Math.floor(this.sim.nextRandom() * (attacker.damageMax - attacker.damageMin + 1));

		if (attacker.buffs?.some((b) => b.type === 'dmg')) {
			rawDmg = Math.round(rawDmg * 1.25);
		}
		if (attacker.buffs?.some((b) => b.type === 'inner_fire')) {
			rawDmg = Math.round(rawDmg * 1.25);
		}

		let isCrit = false;
		if (attacker.critChance && this.sim.nextRandom() < attacker.critChance) {
			rawDmg *= 2;
			isCrit = true;
		}

		// Tactical on-attack procs: Bash, Poison, Frost, Pulverize
		if (
			(attacker.abilityType === 'bash' || attacker.abilities?.some((a) => a.type === 'bash')) &&
			this.sim.nextRandom() < 0.2
		) {
			target.buffs = target.buffs || [];
			target.buffs.push({ type: 'stun', timer: 1.2, value: 0 });
			target.isStunned = true;
			this.sim.addFloatingText('*Оглушення!*', target.x, target.y - 25, '#f59e0b');
		}
		if (attacker.abilityType === 'poison' || attacker.abilities?.some((a) => a.type === 'poison')) {
			target.buffs = target.buffs || [];
			target.buffs.push({ type: 'poison', timer: 5.0, value: 15 });
			target.buffs.push({ type: 'slow', timer: 5.0, value: 0.3 });
			this.sim.addFloatingText('Отрута', target.x, target.y - 20, '#10b981');
		}
		if (attacker.frostOnHit || attacker.abilities?.some((a) => a.type === 'frost')) {
			target.buffs = target.buffs || [];
			target.buffs.push({ type: 'frost', timer: 3.5, value: 0.35 });
			this.sim.addFloatingText('Холод', target.x, target.y - 20, '#38bdf8');
		}
		if (attacker.pulverizeChance && this.sim.nextRandom() < attacker.pulverizeChance) {
			this.triggerSplashDamage(
				target.x,
				target.y,
				140,
				50,
				'normal',
				attacker.team,
				target.instanceId,
				attacker.lane
			);
			this.sim.addFloatingText('*Розтрощення!*', target.x, target.y - 25, '#f59e0b');
		}

		if (attacker.range > 150) {
			const isArtillery = !!(
				attacker.isArtillery ||
				attacker.attackType === 'siege' ||
				['cg1a', 'hmtm', 'e002', 'cg18', 'n01E', 'n01F'].includes(attacker.defId)
			);
			const dist = Math.hypot(target.x - attacker.x, target.y - attacker.y);
			this.sim.projectiles.push({
				id: `proj_${this.sim.nextProjectileId++}`,
				sourceUnitId: attacker.instanceId,
				targetUnitId: target.instanceId,
				x: attacker.x,
				y: attacker.y,
				targetX: target.x,
				targetY: target.y,
				originX: attacker.x,
				originY: attacker.y,
				totalDist: dist,
				arcHeight: isArtillery ? 85 : attacker.attackType === 'pierce' ? 35 : 0,
				speed: isArtillery ? 550 : 650,
				damage: rawDmg,
				attackType: attacker.attackType,
				isCrit,
				team: attacker.team,
				splashRadius: attacker.splashRadius || (isArtillery ? 120 : undefined),
				hasFrost: !!(attacker.frostOnHit || attacker.abilities?.some((a) => a.type === 'frost')),
				isArtillery
			});
		} else {
			this.applyUnitDamage(target, rawDmg, attacker.attackType, attacker.team, isCrit, attacker);

			// Melee AoE Splash
			if (attacker.splashRadius) {
				const attackerOwner = attacker.playerId
					? this.sim.allPlayers.find((p) => p.id === attacker.playerId)
					: undefined;
				this.triggerSplashDamage(
					target.x,
					target.y,
					attacker.splashRadius,
					rawDmg * 0.5,
					attacker.attackType,
					attacker.team,
					target.instanceId,
					attacker.lane,
					attackerOwner
				);
			}

			// Thorns / Spiked Carapace Reflection
			if (target.reflectDamagePct && target.reflectDamagePct > 0) {
				const reflected = Math.max(1, Math.round(rawDmg * target.reflectDamagePct));
				attacker.hp -= reflected;
				this.sim.addFloatingText(`!${reflected}! Відбиття`, attacker.x, attacker.y - 15, '#a855f7');
				if (attacker.hp <= 0) {
					attacker.state = 'DEAD';
				}
			}
		}
	}

	/**
	 * Authentic WC3 3-ring splash damage falloff calculation:
	 * - Inner ring (dist <= radius * 0.3): 100% full splash damage
	 * - Medium ring (radius * 0.3 < dist <= radius * 0.65): 40% medium damage
	 * - Outer ring (radius * 0.65 < dist <= radius): 15% small damage
	 * - Beyond radius: 0 damage
	 */
	public triggerSplashDamage(
		x: number,
		y: number,
		radius: number,
		damage: number,
		attackType: AttackType,
		attackerTeam: Team,
		primaryTargetId?: string,
		lane?: Lane,
		killerPlayer?: PlayerState,
		options?: DamageKillOptions
	): void {
		this.sim.splashEffects.push({
			x,
			y,
			radius,
			timer: 0.35,
			maxTimer: 0.35
		});

		const fullRadius = radius * 0.3;
		const medRadius = radius * 0.65;
		const maxRadius = radius;

		const fullRadiusSq = fullRadius * fullRadius;
		const medRadiusSq = medRadius * medRadius;
		const maxRadiusSq = maxRadius * maxRadius;

		for (const u of this.sim.units) {
			if (u.instanceId === primaryTargetId || u.state === 'DEAD' || u.team === attackerTeam)
				continue;
			if (lane && u.lane !== lane && Math.abs(u.y - y) > 240) continue;
			const dx = u.x - x;
			const dy = u.y - y;
			const distSq = dx * dx + dy * dy;
			if (distSq > maxRadiusSq) continue;

			let factor = 0.15; // Outer ring (Small damage)
			if (distSq <= fullRadiusSq) {
				factor = 1.0; // Inner ring (Full damage)
			} else if (distSq <= medRadiusSq) {
				factor = 0.4; // Middle ring (Medium damage)
			}

			const splashDmg = Math.max(1, Math.round(damage * factor));
			this.applyUnitDamage(u, splashDmg, attackType, attackerTeam, false, undefined, {
				...options,
				killerPlayer
			});
		}
	}

	private resolveKillerPlayer(
		attackerTeam: MatchTeam,
		attackerUnit?: Unit,
		explicitPlayer?: PlayerState
	): PlayerState {
		if (explicitPlayer) return explicitPlayer;
		if (attackerUnit?.playerId) {
			const owner = this.sim.allPlayers.find((p) => p.id === attackerUnit.playerId);
			if (owner) return owner;
		}
		if (attackerUnit?.playerSlot != null) {
			const owner = this.sim.allPlayers.find((p) => p.slot === attackerUnit.playerSlot);
			if (owner) return owner;
		}
		return this.sim.players[attackerTeam];
	}

	private resolveEnemyUnitBounty(target: Unit): number {
		if (target.isSummoned) {
			return 2;
		}
		if (target.bounty !== undefined && target.bounty > 0) {
			return target.bounty;
		}
		const uDef = target.defId && target.defId !== 'test' ? getUnit(target.defId) : undefined;
		return resolveUnitKillBounty(uDef, 0, target.maxHp);
	}

	public applyUnitDamage(
		target: Unit,
		rawDmg: number,
		attackType: AttackType,
		attackerTeam: Team,
		isCrit: boolean,
		attackerUnit?: Unit,
		options?: DamageKillOptions
	): void {
		if (target.state === 'DEAD') {
			return;
		}

		// Cyclone: invulnerable
		if (target.isCycloned || target.buffs?.some((b) => b.type === 'cyclone')) {
			return;
		}

		// Banish: immune to physical, amplified by magic
		if (target.isBanished || target.buffs?.some((b) => b.type === 'banish')) {
			if (attackType === 'normal' || attackType === 'pierce' || attackType === 'siege') {
				return;
			}
			if (attackType === 'magic' || attackType === 'chaos') {
				rawDmg = Math.round(rawDmg * 1.66);
			}
		}

		// Mana Shield: absorbs 50% damage using mana (1 dmg = 0.5 mana)
		if (target.hasManaShield && target.maxMana && target.mana && target.mana > 0) {
			const absorbDamageMax = Math.round(rawDmg * 0.5);
			const manaNeeded = absorbDamageMax * 0.5;
			const manaUsed = Math.min(target.mana, manaNeeded);
			const actualDamageAbsorbed = Math.round(manaUsed * 2);
			target.mana = Math.max(0, target.mana - manaUsed);
			rawDmg = Math.max(1, rawDmg - actualDamageAbsorbed);
			this.sim.addFloatingText('Щит мани', target.x, target.y - 25, '#60a5fa');
		}

		let effectiveArmor = target.armor;
		if (target.buffs?.some((b) => b.type === 'shield')) {
			effectiveArmor += 5;
		}
		if (target.buffs?.some((b) => b.type === 'inner_fire')) {
			effectiveArmor += 5;
		}
		if (target.buffs?.some((b) => b.type === 'armor_buff')) {
			effectiveArmor += 3;
		}
		const finalDamage = calculateDamage(attackType, target.armorType, rawDmg, effectiveArmor);
		target.hp -= finalDamage;

		const isFriendlyDamage = Boolean(options?.isFriendlyFire) || attackerTeam === target.team;

		if (!isFriendlyDamage && (attackerTeam === 'west' || attackerTeam === 'east')) {
			const attStats = this.sim.players[attackerTeam].stats;
			attStats.totalDamageDealt += finalDamage;
			attStats.damageByAttackType = attStats.damageByAttackType || {};
			attStats.damageByAttackType[attackType] =
				(attStats.damageByAttackType[attackType] || 0) + finalDamage;
		}

		if (target.team === 'west' || target.team === 'east') {
			const defStats = this.sim.players[target.team].stats;
			defStats.damageByArmorType = defStats.damageByArmorType || {};
			defStats.damageByArmorType[target.armorType] =
				(defStats.damageByArmorType[target.armorType] || 0) + finalDamage;
		}

		if (attackerUnit?.buildingDefId && (attackerTeam === 'west' || attackerTeam === 'east')) {
			this.sim.recordBuildingDamage(
				attackerUnit.buildingDefId,
				attackerUnit.buildingName || attackerUnit.name,
				attackerTeam,
				finalDamage
			);
		}

		this.sim.addFloatingText(
			isCrit ? `!${finalDamage}!` : `-${finalDamage}`,
			target.x + (this.sim.nextRandom() * 20 - 10),
			target.y - 15,
			isCrit ? '#f59e0b' : target.team === 'west' ? '#ef4444' : '#38bdf8'
		);

		// WC3 Threat: Direct Attacker Retaliation & Call For Help
		if (attackerUnit && target.team !== attackerUnit.team) {
			target.lastAttackerId = attackerUnit.instanceId;
			target.lastAttackedTime = this.sim.gameTime;

			// If target is walking and has no target, turn to retaliate against attacker
			if (
				target.state === 'WALKING' &&
				!target.currentTargetId &&
				this.canEngageTarget(target, attackerUnit)
			) {
				target.currentTargetId = attackerUnit.instanceId;
			}

			// Call for Help: nearby walking allies also acquire this attacker
			for (const ally of this.sim.units) {
				if (
					ally.team === target.team &&
					(ally.lane === target.lane || Math.abs(ally.y - target.y) <= 240) &&
					this.canEngageTarget(ally, attackerUnit) &&
					ally.state === 'WALKING' &&
					!ally.currentTargetId &&
					Math.hypot(ally.x - target.x, ally.y - target.y) <= 350
				) {
					ally.currentTargetId = attackerUnit.instanceId;
				}
			}
		}

		if (target.hp <= 0) {
			// Reincarnation check
			const canReincarnate =
				target.hasReincarnated === false &&
				(target.abilities?.some((a) => a.type === 'reincarnation') ||
					target.name.toLowerCase().includes('таурен') ||
					target.name.toLowerCase().includes('фенікс'));
			if (canReincarnate) {
				target.hp = target.maxHp;
				target.hasReincarnated = true;
				this.sim.addFloatingText('Переродження! (100% HP)', target.x, target.y - 25, '#facc15');
				return;
			}

			target.state = 'DEAD';

			// Corpse generation (for non-summoned units)
			if (!target.isSummoned && (target.team === 'west' || target.team === 'east')) {
				this.sim.corpses.push({
					id: `corpse_${this.sim.nextCorpseId++}`,
					x: target.x,
					y: target.y,
					lane: target.lane,
					team: target.team,
					decayTimer: 20.0,
					unitDefId: target.defId,
					name: target.name,
					isFlyer: Boolean(target.flying)
				});
				if (this.sim.corpses.length > 80) {
					this.sim.corpses.shift();
				}
			}

			if (attackerUnit?.buildingDefId && (attackerTeam === 'west' || attackerTeam === 'east')) {
				this.sim.recordBuildingKill(
					attackerUnit.buildingDefId,
					attackerUnit.buildingName || attackerUnit.name,
					attackerTeam
				);
			}

			// Recycler scrap salvage on unit death & drop visible debris
			if (target.team === 'west' || target.team === 'east') {
				this.sim.debris.push({
					id: `deb_${this.sim.nextDebrisId++}`,
					x: target.x,
					y: target.y,
					team: target.team,
					value: 15,
					lifeTime: 15.0
				});
				const recyclers = isFriendlyDamage
					? []
					: this.sim.buildings.filter(
							(b) =>
								b.team === target.team &&
								(b.specialType === 'recycler' || b.defId === 'cg0b' || b.defId === 'cg07_recycler')
						);
				if (recyclers.length > 0) {
					const count = Math.min(2, recyclers.length);
					const scrapBonus = count * 4;
					this.sim.players[target.team].gold += scrapBonus;
					this.sim.addFloatingText(`+${scrapBonus}g Брухт`, target.x, target.y - 20, '#eab308');
				}
			}

			// Scavenger Scrap & Great Assembly (Велика збірка)
			const isScavengerUnit = target.isScavenger || target.defId?.startsWith('cg1');
			if (isScavengerUnit && (target.team === 'west' || target.team === 'east')) {
				const greatAssembly = (this.sim.greatAssemblyTimer?.[target.team] ?? 0) > 0;
				const hasAssemblyPlant = this.sim.buildings.some(
					(b) =>
						b.team === target.team &&
						(b.defId === 'cg08' || b.defId === 'cg0c') &&
						!b.isUnderConstruction
				);
				const targetCount = (greatAssembly ? 4 : 2) + (hasAssemblyPlant ? 1 : 0);
				const asBonus = greatAssembly ? 0.2 : 0.1;
				const searchRadius = 400 + (hasAssemblyPlant ? 100 : 0);
				const buffDuration = 15.0 + (hasAssemblyPlant ? 5.0 : 0.0);

				const allies = this.sim.units.filter(
					(u) =>
						u.team === target.team &&
						u.state !== 'DEAD' &&
						u.instanceId !== target.instanceId &&
						u.lane === target.lane &&
						Math.hypot(u.x - target.x, u.y - target.y) <= searchRadius
				);
				if (allies.length > 0) {
					allies.sort(
						(a, b) =>
							Math.hypot(a.x - target.x, a.y - target.y) -
							Math.hypot(b.x - target.x, b.y - target.y)
					);
					const chosen = allies.slice(0, targetCount);
					for (const ally of chosen) {
						ally.hp = Math.min(ally.maxHp, ally.hp + 75);
						ally.buffs = ally.buffs || [];
						ally.buffs.push({ type: 'as', timer: buffDuration, value: asBonus });
						ally.buffs.push({ type: 'dmg', timer: buffDuration, value: 0.15 });
						this.sim.addFloatingText(
							greatAssembly ? '+Велика Збірка (+20% AS)' : '+Уламки (+10% AS)',
							ally.x,
							ally.y - 25,
							'#f59e0b'
						);
					}
				}
			}

			if (target.team === 'neutral') {
				this.sim.activeBossInstanceId = null;
				this.sim.bossSpawnTimer = 180.0;
				if (attackerTeam === 'west' || attackerTeam === 'east') {
					const bounty = Math.min(110, 10 + 20 * (this.sim.bossIndex - 1));
					const teamPlayers =
						this.sim.teamMembers[attackerTeam] && this.sim.teamMembers[attackerTeam].length > 0
							? this.sim.teamMembers[attackerTeam]
							: [this.sim.players[attackerTeam]];
					for (const p of teamPlayers) {
						p.gold += bounty;
						p.stats.unitsKilled++;
					}
					this.sim.addFloatingText(`+${bounty}g за Боса!`, target.x, target.y - 30, '#fbbf24');
				}
			} else if (
				!isFriendlyDamage &&
				(attackerTeam === 'west' || attackerTeam === 'east') &&
				attackerTeam !== target.team
			) {
				const killerPlayer = this.resolveKillerPlayer(
					attackerTeam,
					attackerUnit,
					options?.killerPlayer
				);
				killerPlayer.stats.unitsKilled++;
				if (!options?.suppressBounty) {
					const baseBounty = this.resolveEnemyUnitBounty(target);
					const mult = options?.bountyMultiplier ?? 1;
					const bounty = Math.max(1, Math.round(baseBounty * mult));
					killerPlayer.gold += bounty;
					if (!options?.suppressKillFloatingText) {
						this.sim.addFloatingText(
							mult > 1 ? `+${bounty}g (×${mult})` : `+${bounty}g`,
							target.x,
							target.y - 26,
							'#fbbf24'
						);
					}
				}
			}
		}
	}

	public attackCastle(attacker: Unit, castle: Castle): void {
		this.defenseSystem.attackCastle(attacker, castle);
	}

	public performAttackBuilding(attacker: Unit, target: Building): void {
		this.defenseSystem.performAttackBuilding(attacker, target);
	}

	public damageBuilding(
		building: Building,
		rawDamage: number,
		attackType: AttackType,
		attackerTeam: MatchTeam
	): void {
		this.defenseSystem.damageBuilding(building, rawDamage, attackType, attackerTeam);
	}

	public updateCastles(dt: number): void {
		this.defenseSystem.updateCastles(dt);
	}

	public updateTowers(dt: number): void {
		this.defenseSystem.updateTowers(dt);
	}

	public updateProjectiles(dt: number): void {
		this.defenseSystem.updateProjectiles(dt);
	}
}
