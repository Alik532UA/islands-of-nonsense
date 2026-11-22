import type { Simulation } from './simulation';
import { ARENA_WIDTH, ARENA_HEIGHT, TOP_LANE_Y, BOTTOM_LANE_Y, CELL_SIZE } from './constants';
import type { Unit, Building, Castle, MatchTeam, Team, Lane, AttackType } from './types';
import { calculateDamage } from './damageMatrix';
import { getBuilding, isLegendaryBuilding } from './gameData';

/**
 * CombatSystem handles unit state machines, targeting, pathing towards objectives,
 * melee & ranged attacks, projectiles, AoE splash, tower defense, castle attacks, and damage calculations.
 */
export class CombatSystem {
	public castleCooldowns: Record<MatchTeam, number> = { west: 0, east: 0 };

	constructor(private sim: Simulation) {}

	public updateUnits(dt: number): void {
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

			// Tactical abilities cooldown tick
			if (u.abilityCooldownTimer && u.abilityCooldownTimer > 0) {
				u.abilityCooldownTimer = Math.max(0, u.abilityCooldownTimer - dt);
			}

			// 1. Ensnare ability (Web down flying enemies)
			if (u.abilityType === 'ensnare' && (!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0)) {
				const enemyFlying = this.sim.units.find(
					(other) =>
						other.team !== u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						other.flying &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 450
				);
				if (enemyFlying) {
					enemyFlying.buffs = enemyFlying.buffs || [];
					enemyFlying.buffs.push({ type: 'ensnare', timer: 6.0, value: 0 });
					enemyFlying.flying = false;
					enemyFlying.isEnsnared = true;
					u.abilityCooldownTimer = 12.0;
					this.sim.addFloatingText('Сітка!', enemyFlying.x, enemyFlying.y - 20, '#a3e635');
				}
			}

			// 2. Heal ability (Support wounded allies)
			if (u.abilityType === 'heal' && (!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0)) {
				const injuredAlly = this.sim.units.find(
					(other) =>
						other.team === u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						other.hp < other.maxHp &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 350
				);
				if (injuredAlly) {
					injuredAlly.hp = Math.min(injuredAlly.maxHp, injuredAlly.hp + 65);
					u.abilityCooldownTimer = 3.5;
					this.sim.addFloatingText('+65 HP', injuredAlly.x, injuredAlly.y - 20, '#10b981');
				}
			}

			// 3. Command Aura (Buff nearby allies damage)
			if (u.abilityType === 'aura_dmg') {
				for (const ally of this.sim.units) {
					if (
						ally.team === u.team &&
						ally.lane === u.lane &&
						ally.state !== 'DEAD' &&
						ally.instanceId !== u.instanceId &&
						Math.hypot(ally.x - u.x, ally.y - u.y) <= 300
					) {
						ally.buffs = ally.buffs || [];
						if (!ally.buffs.some((b) => b.type === 'dmg' && b.value === 0.15)) {
							ally.buffs.push({ type: 'dmg', timer: 1.5, value: 0.15 });
						}
					}
				}
			}

			u.prevX = u.x;
			u.prevY = u.y;
			u.cooldownTimer -= dt;

			let currentSpeed = u.speed;
			if (u.buffs?.some((b) => b.type === 'slow')) {
				currentSpeed *= 0.5;
			}
			if (u.buffs?.some((b) => b.type === 'weakness')) {
				currentSpeed *= 0.75;
			}

			const targetLaneY = u.lane === 'top' ? TOP_LANE_Y : BOTTOM_LANE_Y;

			// Target Acquisition:
			// STRICT LANE SEPARATION: only find enemy on the same lane!
			const enemyTarget = this.sim.spatialGrid.findClosestEnemy(
				u.x,
				u.y,
				Math.max(u.range, 350),
				u.team,
				u.lane, // Filters strictly to u.lane!
				u.range > 120 || !!u.flying // ranged units or flying units can hit air
			);

			if (enemyTarget && enemyTarget.hp > 0 && enemyTarget.lane === u.lane) {
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
					const dirX = dx / dist;
					const dirY = dy / dist;
					u.x += dirX * currentSpeed * dt;
					u.y += dirY * currentSpeed * dt;
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
					u.x += (dx / dist) * currentSpeed * dt;
					u.y += (dy / dist) * currentSpeed * dt;
				} else {
					u.state = 'WALKING';
				}
			} else {
				// No enemy units on this lane -> Target enemy buildings OR the enemy castle!
				const enemyTeam: MatchTeam = u.team === 'west' ? 'east' : 'west';
				const targetCastle = u.team === 'west' ? this.sim.castles.east : this.sim.castles.west;
				const distToCastle = Math.hypot(targetCastle.x - u.x, targetCastle.y - u.y) - 60;
				const isNearEnemyBase = u.team === 'west' ? u.x >= ARENA_WIDTH - 1600 : u.x <= 1600;

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

				const westGateX = 1480;
				const eastGateX = ARENA_WIDTH - 1480;

				// Check whether Castle or Building should be targeted:
				// If in attack range of Castle, or Castle is closer than any building, attack Castle!
				const castleInRange = distToCastle <= u.range + 65;
				const buildingInRange = closestBld && closestBldDist <= u.range + 35;

				if (castleInRange || (!buildingInRange && distToCastle < closestBldDist)) {
					// Target & Attack Castle!
					if (
						distToCastle <=
						(u.state === 'ATTACKING' && !u.targetBuildingId ? u.range + 75 : u.range + 50)
					) {
						u.state = 'ATTACKING';
						u.currentTargetId = null;
						u.targetBuildingId = null;
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
						u.targetBuildingId = null;

						// If not yet inside enemy base courtyard, navigate through gate first!
						let navTargetX = targetCastle.x;
						let navTargetY = targetCastle.y;
						if (u.team === 'west' && u.x < eastGateX) {
							navTargetX = eastGateX;
							navTargetY = targetLaneY;
						} else if (u.team === 'east' && u.x > westGateX) {
							navTargetX = westGateX;
							navTargetY = targetLaneY;
						}
						const dNav = Math.hypot(navTargetX - u.x, navTargetY - u.y);
						if (dNav > 5) {
							u.x += ((navTargetX - u.x) / dNav) * currentSpeed * dt;
							u.y += ((navTargetY - u.y) / dNav) * currentSpeed * dt;
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

						// If outside enemy base courtyard, navigate through gate first!
						let navTargetX = bx;
						let navTargetY = by;
						if (u.team === 'west' && u.x < eastGateX) {
							navTargetX = eastGateX;
							navTargetY = targetLaneY;
						} else if (u.team === 'east' && u.x > westGateX) {
							navTargetX = westGateX;
							navTargetY = targetLaneY;
						}

						const d = Math.hypot(navTargetX - u.x, navTargetY - u.y);
						if (d > 5) {
							const dirX = (navTargetX - u.x) / d;
							const dirY = (navTargetY - u.y) / d;
							u.x += dirX * currentSpeed * dt;
							u.y += dirY * currentSpeed * dt;
						}
					}
				} else {
					// March towards Enemy Castle!
					u.currentTargetId = null;
					u.targetBuildingId = null;
					u.state = 'WALKING';

					const isWest = u.team === 'west';
					const ownGateX = isWest ? westGateX : eastGateX;
					const inOwnCourtyard = isWest ? u.x < westGateX : u.x > eastGateX;
					const onHighway = isWest ? u.x < eastGateX : u.x > westGateX;

					if (inOwnCourtyard) {
						// Detour around solid castle if marching from opposite courtyard corner
						let wpX = ownGateX;
						let wpY = targetLaneY;
						if (isWest && u.x < 360) {
							if (u.y < 1060 && targetLaneY > 1200) {
								wpX = 380;
								wpY = 950;
							} else if (u.y > 1340 && targetLaneY < 1200) {
								wpX = 380;
								wpY = 1450;
							}
						} else if (!isWest && u.x > ARENA_WIDTH - 360) {
							if (u.y < 1060 && targetLaneY > 1200) {
								wpX = ARENA_WIDTH - 380;
								wpY = 950;
							} else if (u.y > 1340 && targetLaneY < 1200) {
								wpX = ARENA_WIDTH - 380;
								wpY = 1450;
							}
						}
						const gdx = wpX - u.x;
						const gdy = wpY - u.y;
						const gdist = Math.hypot(gdx, gdy);
						if (gdist > 5) {
							u.x += (gdx / gdist) * currentSpeed * dt;
							u.y += (gdy / gdist) * currentSpeed * dt;
						}
					} else if (onHighway) {
						// Step 2: On highway corridor -> march along lane
						const stepX = (isWest ? 1 : -1) * currentSpeed * dt;
						let stepY = 0;
						const laneDistY = u.y - targetLaneY;
						if (Math.abs(laneDistY) > 35) {
							stepY =
								-Math.sign(laneDistY) * Math.min(Math.abs(laneDistY) - 35, currentSpeed * dt * 0.5);
						}
						u.x += stepX;
						u.y += stepY;
					} else {
						// Step 3: Inside enemy base courtyard -> steer directly to Castle
						const dirX = (targetCastle.x - u.x) / (distToCastle + 60);
						const dirY = (targetCastle.y - u.y) / (distToCastle + 60);
						u.x += dirX * currentSpeed * dt;
						u.y += dirY * currentSpeed * dt;
					}
				}
			}

			// Enforce solid obstacle collision with tangent sliding for ground units
			if (!u.flying) {
				const intendedDist = Math.hypot(u.x - u.prevX, u.y - u.prevY);
				const resolved = this.sim.workerSystem.resolveGroundObstacles(u.x, u.y, u.size);
				const movedDist = Math.hypot(resolved.x - u.prevX, resolved.y - u.prevY);

				if (intendedDist > 0.5 && movedDist < intendedDist * 0.35) {
					// Blocked by wall or building: slide along tangent
					const dirX = (u.x - u.prevX) / intendedDist;
					const dirY = (u.y - u.prevY) / intendedDist;
					const perpX = -dirY;
					const perpY = dirX;

					const s1 = this.sim.workerSystem.resolveGroundObstacles(
						u.prevX + perpX * currentSpeed * dt,
						u.prevY + perpY * currentSpeed * dt,
						u.size
					);
					const s2 = this.sim.workerSystem.resolveGroundObstacles(
						u.prevX - perpX * currentSpeed * dt,
						u.prevY - perpY * currentSpeed * dt,
						u.size
					);

					const d1 = Math.abs(s1.y - targetLaneY);
					const d2 = Math.abs(s2.y - targetLaneY);

					if (d1 <= d2 && Math.hypot(s1.x - u.prevX, s1.y - u.prevY) > intendedDist * 0.3) {
						u.x = s1.x;
						u.y = s1.y;
					} else if (Math.hypot(s2.x - u.prevX, s2.y - u.prevY) > intendedDist * 0.3) {
						u.x = s2.x;
						u.y = s2.y;
					} else {
						u.x = resolved.x;
						u.y = resolved.y;
					}
				} else {
					u.x = resolved.x;
					u.y = resolved.y;
				}
			}
		}

		// Apply Crowd Physics & Boids Separation
		this.applyCrowdSeparation(dt);
	}

	/**
	 * Applies hard non-penetration and soft Boids-style separation repulsion between ground units
	 * to prevent stacking and create authentic frontline spread across the lane corridor width.
	 */
	public applyCrowdSeparation(dt: number): void {
		const collisionRadius = 36;

		for (let i = 0; i < this.sim.units.length; i++) {
			const u = this.sim.units[i];
			if (u.state === 'DEAD' || u.flying) continue;

			for (let j = i + 1; j < this.sim.units.length; j++) {
				const other = this.sim.units[j];
				if (other.state === 'DEAD' || other.flying || other.lane !== u.lane) continue;

				let dx = u.x - other.x;
				let dy = u.y - other.y;
				let dist = Math.hypot(dx, dy);

				// If exactly overlapping, give deterministic separation nudge
				if (dist < 0.1) {
					const seed = (u.instanceId.charCodeAt(u.instanceId.length - 1) || 1) % 2 === 0 ? 1 : -1;
					dx = seed * 0.5;
					dy = (seed === 1 ? -1 : 1) * 2;
					dist = Math.hypot(dx, dy);
				}

				// Hard non-penetration threshold
				const minPhysicalDist = (u.size + other.size) * 0.95;

				if (dist < minPhysicalDist) {
					// Instant positional overlap resolution (mobs cannot occupy the exact same spot!)
					const overlap = minPhysicalDist - dist;
					const nx = dx / dist;
					const ny = dy / dist;

					let uWeight = 0.5;
					let otherWeight = 0.5;
					if (u.state === 'ATTACKING' && other.state === 'WALKING') {
						uWeight = 0.2;
						otherWeight = 0.8;
					} else if (u.state === 'WALKING' && other.state === 'ATTACKING') {
						uWeight = 0.8;
						otherWeight = 0.2;
					}

					u.x += nx * overlap * uWeight;
					u.y += ny * overlap * uWeight;
					other.x -= nx * overlap * otherWeight;
					other.y -= ny * overlap * otherWeight;
				} else if (dist < collisionRadius) {
					// Soft Boids-style separation to spread the formation across the lane corridor
					const overlap = (collisionRadius - dist) / collisionRadius;
					const push = overlap * 60 * dt;
					const nx = dx / dist;
					const ny = dy / dist;

					u.x += nx * push * 0.5;
					u.y += ny * push * 0.5;
					other.x -= nx * push * 0.5;
					other.y -= ny * push * 0.5;
				}
			}

			// Enforce solid obstacle collision for ground units AFTER all movement and crowd pushes!
			if (!u.flying) {
				const resolved = this.sim.workerSystem.resolveGroundObstacles(u.x, u.y, u.size);
				u.x = resolved.x;
				u.y = resolved.y;
			}

			// Keep unit bounded within its lane corridor when between castles
			if (u.x >= 1480 && u.x <= ARENA_WIDTH - 1480) {
				const laneCenterY = u.lane === 'top' ? TOP_LANE_Y : BOTTOM_LANE_Y;
				u.y = Math.max(laneCenterY - 80, Math.min(laneCenterY + 80, u.y));
			} else {
				// In castle siege zone, allow units to spread around castle
				u.y = Math.max(100, Math.min(ARENA_HEIGHT - 100, u.y));
			}
			u.x = Math.max(100, Math.min(ARENA_WIDTH - 100, u.x));
		}
	}

	public performAttack(attacker: Unit, target: Unit): void {
		// Double check lane separation
		if (attacker.lane !== target.lane) return;

		// Evade check
		let effectiveEvade = target.evadeChance || 0;
		if (target.buffs?.some((b) => b.type === 'evade')) {
			effectiveEvade = Math.min(0.85, effectiveEvade + 0.4);
		}
		if (effectiveEvade > 0 && Math.random() < effectiveEvade) {
			this.sim.addFloatingText('Ухилення!', target.x, target.y - 20, '#60a5fa');
			return;
		}

		// Roll raw damage
		let rawDmg =
			attacker.damageMin +
			Math.floor(Math.random() * (attacker.damageMax - attacker.damageMin + 1));

		if (attacker.buffs?.some((b) => b.type === 'dmg')) {
			rawDmg = Math.round(rawDmg * 1.25);
		}

		let isCrit = false;
		if (attacker.critChance && Math.random() < attacker.critChance) {
			rawDmg *= 2;
			isCrit = true;
		}

		// Tactical on-attack procs: Bash & Poison
		if (attacker.abilityType === 'bash' && Math.random() < 0.2) {
			target.buffs = target.buffs || [];
			target.buffs.push({ type: 'stun', timer: 1.2, value: 0 });
			target.isStunned = true;
			this.sim.addFloatingText('*Оглушення!*', target.x, target.y - 25, '#f59e0b');
		}
		if (attacker.abilityType === 'poison') {
			target.buffs = target.buffs || [];
			target.buffs.push({ type: 'poison', timer: 5.0, value: 15 });
			target.buffs.push({ type: 'slow', timer: 5.0, value: 0.3 });
			this.sim.addFloatingText('Отрута', target.x, target.y - 20, '#10b981');
		}

		if (attacker.range > 150) {
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
				arcHeight: attacker.attackType === 'pierce' ? 35 : attacker.attackType === 'siege' ? 65 : 0,
				speed: 650,
				damage: rawDmg,
				attackType: attacker.attackType,
				isCrit,
				team: attacker.team,
				splashRadius: attacker.splashRadius
			});
		} else {
			this.applyUnitDamage(target, rawDmg, attacker.attackType, attacker.team, isCrit, attacker);

			// Melee AoE Splash
			if (attacker.splashRadius) {
				this.triggerSplashDamage(
					target.x,
					target.y,
					attacker.splashRadius,
					rawDmg * 0.5,
					attacker.attackType,
					attacker.team,
					target.instanceId,
					attacker.lane
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

	public triggerSplashDamage(
		x: number,
		y: number,
		radius: number,
		damage: number,
		attackType: AttackType,
		attackerTeam: Team,
		primaryTargetId?: string,
		lane?: Lane
	): void {
		this.sim.splashEffects.push({
			x,
			y,
			radius,
			timer: 0.35,
			maxTimer: 0.35
		});

		const radiusSq = radius * radius;
		for (const u of this.sim.units) {
			if (u.instanceId === primaryTargetId || u.state === 'DEAD' || u.team === attackerTeam)
				continue;
			if (lane && u.lane !== lane) continue;
			const dx = u.x - x;
			const dy = u.y - y;
			if (dx * dx + dy * dy <= radiusSq) {
				this.applyUnitDamage(u, Math.round(damage), attackType, attackerTeam, false);
			}
		}
	}

	public applyUnitDamage(
		target: Unit,
		rawDmg: number,
		attackType: AttackType,
		attackerTeam: Team,
		isCrit: boolean,
		attackerUnit?: Unit
	): void {
		let effectiveArmor = target.armor;
		if (target.buffs?.some((b) => b.type === 'shield')) {
			effectiveArmor += 5;
		}
		const finalDamage = calculateDamage(attackType, target.armorType, rawDmg, effectiveArmor);
		target.hp -= finalDamage;

		if (attackerTeam === 'west' || attackerTeam === 'east') {
			this.sim.players[attackerTeam].stats.totalDamageDealt += finalDamage;
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
			target.x + (Math.random() * 20 - 10),
			target.y - 15,
			isCrit ? '#f59e0b' : target.team === 'west' ? '#ef4444' : '#38bdf8'
		);

		if (target.hp <= 0) {
			target.state = 'DEAD';

			if (attackerUnit?.buildingDefId && (attackerTeam === 'west' || attackerTeam === 'east')) {
				this.sim.recordBuildingKill(
					attackerUnit.buildingDefId,
					attackerUnit.buildingName || attackerUnit.name,
					attackerTeam
				);
			}

			// Recycler scrap salvage on unit death
			if (target.team === 'west' || target.team === 'east') {
				const recyclers = this.sim.buildings.filter(
					(b) => b.team === target.team && b.specialType === 'recycler'
				);
				if (recyclers.length > 0) {
					const scrapBonus = recyclers.length * 4;
					this.sim.players[target.team].gold += scrapBonus;
					this.sim.addFloatingText(`+${scrapBonus}g Брухт`, target.x, target.y - 20, '#eab308');
				}
			}

			// Scavenger Great Assembly (Великая сборка): empower closest friendly unit
			if (target.isScavenger && (target.team === 'west' || target.team === 'east')) {
				const allies = this.sim.units.filter(
					(u) =>
						u.team === target.team &&
						u.state !== 'DEAD' &&
						u.instanceId !== target.instanceId &&
						u.lane === target.lane
				);
				if (allies.length > 0) {
					allies.sort(
						(a, b) =>
							Math.hypot(a.x - target.x, a.y - target.y) -
							Math.hypot(b.x - target.x, b.y - target.y)
					);
					const closest = allies[0];
					closest.hp = Math.min(closest.maxHp, closest.hp + 75);
					closest.buffs = closest.buffs || [];
					closest.buffs.push({ type: 'dmg', timer: 10, value: 0.15 });
					this.sim.addFloatingText('+Уламки (+15% шкоди)', closest.x, closest.y - 25, '#f59e0b');
				}
			}

			if (target.team === 'neutral') {
				this.sim.activeBossInstanceId = null;
				this.sim.bossSpawnTimer = 180.0;
				if (attackerTeam === 'west' || attackerTeam === 'east') {
					const bounty = Math.min(110, 10 + 20 * (this.sim.bossIndex - 1));
					this.sim.players[attackerTeam].gold += bounty;
					this.sim.addFloatingText(`+${bounty}g за Боса!`, target.x, target.y - 30, '#fbbf24');
				}
			} else if (attackerTeam === 'west' || attackerTeam === 'east') {
				this.sim.players[attackerTeam].stats.unitsKilled++;
			}
		}
	}

	public attackCastle(attacker: Unit, castle: Castle): void {
		if (this.sim.castleInvulnerableTimer[castle.team] > 0) {
			this.sim.addFloatingText('Невразливий!', castle.x, castle.y - 30, '#38bdf8');
			return;
		}

		attacker.attackAnimTimer = 0.25;
		const rawDmg =
			attacker.damageMin +
			Math.floor(Math.random() * (attacker.damageMax - attacker.damageMin + 1));
		const finalDamage = calculateDamage(attacker.attackType, 'fort', rawDmg, 5);
		castle.hp = Math.max(0, castle.hp - finalDamage);
		this.sim.onSoundEffect?.('hit');

		if (attacker.team === 'west' || attacker.team === 'east') {
			this.sim.players[attacker.team].stats.damageToCastle += finalDamage;
			this.sim.players[attacker.team].stats.totalDamageDealt += finalDamage;
			if (attacker.buildingDefId) {
				this.sim.recordBuildingDamage(
					attacker.buildingDefId,
					attacker.buildingName || attacker.name,
					attacker.team,
					finalDamage
				);
			}
		}

		this.sim.addFloatingText(`-${finalDamage}`, castle.x, castle.y - 30, '#ef4444');
		this.sim.notifyStateChanged();
	}

	public performAttackBuilding(attacker: Unit, target: Building): void {
		attacker.attackAnimTimer = 0.25;
		let rawDmg =
			attacker.damageMin +
			Math.floor(Math.random() * (attacker.damageMax - attacker.damageMin + 1));
		if (attacker.buffs?.some((b) => b.type === 'dmg')) {
			rawDmg = Math.round(rawDmg * 1.25);
		}

		if (attacker.range > 150) {
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
				arcHeight: attacker.attackType === 'pierce' ? 35 : attacker.attackType === 'siege' ? 65 : 0,
				speed: 650,
				damage: rawDmg,
				attackType: attacker.attackType,
				isCrit: false,
				team: attacker.team,
				splashRadius: attacker.splashRadius
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
				const owner = this.sim.players[building.team];
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

	public updateCastles(dt: number): void {
		for (const team of ['west', 'east'] as MatchTeam[]) {
			const castle = this.sim.castles[team];
			this.castleCooldowns[team] -= dt;

			if (this.castleCooldowns[team] <= 0) {
				const enemy = this.sim.spatialGrid.findClosestEnemy(
					castle.x,
					castle.y,
					800,
					team,
					undefined,
					true
				);
				if (enemy) {
					const isOvercharged = this.sim.castleOverchargeTimer[team] > 0;
					this.castleCooldowns[team] = isOvercharged ? 0.5 : 1.0;
					const dist = Math.hypot(enemy.x - castle.x, enemy.y - castle.y);
					this.sim.projectiles.push({
						id: `castle_shot_${this.sim.nextProjectileId++}`,
						sourceUnitId: 'castle_' + team,
						targetUnitId: enemy.instanceId,
						x: castle.x,
						y: castle.y,
						targetX: enemy.x,
						targetY: enemy.y,
						originX: castle.x,
						originY: castle.y,
						totalDist: dist,
						arcHeight: 50,
						speed: 700,
						damage: isOvercharged ? 170 : 85,
						attackType: 'siege',
						isCrit: isOvercharged,
						team
					});
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
					const isSplash = b.defId === 'h073' || b.defId === 'cg0a';
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
						arcHeight: 30,
						speed: 650,
						damage: dmg,
						attackType: b.attackType || 'pierce',
						isCrit: false,
						team: b.team,
						splashRadius: isSplash ? 65 : undefined
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

			if (target && target.state !== 'DEAD') {
				p.targetX = target.x;
				p.targetY = target.y;
			} else if (targetBuilding) {
				p.targetX = targetBuilding.x + CELL_SIZE / 2;
				p.targetY = targetBuilding.y + CELL_SIZE / 2;
			}

			const dx = p.targetX - p.x;
			const dy = p.targetY - p.y;
			const dist = Math.hypot(dx, dy);

			const step = p.speed * dt;
			if (dist <= step) {
				if (target && target.state !== 'DEAD') {
					const attackerUnit = this.sim.units.find((u) => u.instanceId === p.sourceUnitId);
					this.applyUnitDamage(target, p.damage, p.attackType, p.team, p.isCrit, attackerUnit);

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
				}
				if (p.splashRadius) {
					this.triggerSplashDamage(
						p.targetX,
						p.targetY,
						p.splashRadius,
						p.damage * 0.5,
						p.attackType,
						p.team,
						p.targetUnitId
					);
				}
				p.damage = 0;
			} else {
				p.x += (dx / dist) * step;
				p.y += (dy / dist) * step;
			}
		}
	}
}
