import type { Simulation } from './simulation';
import { ARENA_WIDTH, TOP_LANE_Y, BOTTOM_LANE_Y, CELL_SIZE } from './constants';
import type { Unit, Building, Castle, MatchTeam, Team, Lane, AttackType } from './types';
import { calculateDamage, getDamageMultiplier } from './damageMatrix';
import { DefenseSystem } from './defenseSystem';
import { applyCrowdSeparation } from './crowdPhysics';

/**
 * CombatSystem handles unit state machines, targeting, pathing towards objectives,
 * melee & ranged attacks, projectiles, AoE splash, tower defense, castle attacks, and damage calculations.
 */
export class CombatSystem {
	public defenseSystem: DefenseSystem;

	constructor(private sim: Simulation) {
		this.defenseSystem = new DefenseSystem(sim, {
			applyUnitDamage: (target, rawDamage, attackType, attackerTeam, isCrit, attackerUnit) =>
				this.applyUnitDamage(target, rawDamage, attackType, attackerTeam, !!isCrit, attackerUnit),
			triggerSplashDamage: (
				targetX,
				targetY,
				radius,
				rawDamage,
				attackType,
				attackerTeam,
				primaryTargetId
			) =>
				this.triggerSplashDamage(
					targetX,
					targetY,
					radius,
					rawDamage,
					attackType,
					attackerTeam,
					primaryTargetId
				)
		});
	}

	/**
	 * Authentic WC3 threat and aggro targeting calculation.
	 * Evaluates candidate targets based on distance, direct attacker threat,
	 * ally assist calls, attack-vs-armor tactical affinity, low-HP focus, and stickiness.
	 */
	public findBestTarget(u: Unit): Unit | null {
		const acquisitionRange = Math.max(u.range + 80, 420);
		const canHitAir = u.range > 120 || !!u.flying;

		const candidates = this.sim.spatialGrid.queryRadius(u.x, u.y, acquisitionRange, (candidate) => {
			if (candidate.team === u.team) return false;
			if (candidate.lane !== u.lane) return false;
			if (candidate.state === 'DEAD' || candidate.hp <= 0) return false;
			if (candidate.flying && !canHitAir) return false;
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
						a.lane === u.lane &&
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

			// 4. Bloodlust ability
			const hasBloodlust =
				u.abilityType === 'bloodlust' || u.abilities?.some((a) => a.type === 'bloodlust');
			if (hasBloodlust && (!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0)) {
				const unbuffedAlly = this.sim.units.find(
					(other) =>
						other.team === u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						other.instanceId !== u.instanceId &&
						!other.buffs?.some((b) => b.type === 'bloodlust') &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 400
				);
				if (unbuffedAlly) {
					unbuffedAlly.buffs = unbuffedAlly.buffs || [];
					unbuffedAlly.buffs.push({ type: 'bloodlust', timer: 10.0, value: 0.4 });
					u.abilityCooldownTimer = 10.0;
					this.sim.addFloatingText(
						'Лють! (+40% шв.)',
						unbuffedAlly.x,
						unbuffedAlly.y - 20,
						'#ef4444'
					);
				}
			}

			// 5. Slow ability
			const hasSlow = u.abilityType === 'slow' || u.abilities?.some((a) => a.type === 'slow');
			if (hasSlow && (!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0)) {
				const enemyTarget = this.sim.units.find(
					(other) =>
						other.team !== u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						!other.buffs?.some((b) => b.type === 'slow') &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 450
				);
				if (enemyTarget) {
					enemyTarget.buffs = enemyTarget.buffs || [];
					enemyTarget.buffs.push({ type: 'slow', timer: 6.0, value: 0.35 });
					u.abilityCooldownTimer = 8.0;
					this.sim.addFloatingText('Уповільнення!', enemyTarget.x, enemyTarget.y - 20, '#93c5fd');
				}
			}

			// 6. Curse ability
			const hasCurse = u.abilityType === 'curse' || u.abilities?.some((a) => a.type === 'curse');
			if (hasCurse && (!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0)) {
				const enemyTarget = this.sim.units.find(
					(other) =>
						other.team !== u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						!other.buffs?.some((b) => b.type === 'curse') &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 450
				);
				if (enemyTarget) {
					enemyTarget.buffs = enemyTarget.buffs || [];
					enemyTarget.buffs.push({ type: 'curse', timer: 8.0, value: 0.33 });
					u.abilityCooldownTimer = 9.0;
					this.sim.addFloatingText('Прокляття!', enemyTarget.x, enemyTarget.y - 20, '#c084fc');
				}
			}

			// 7. Inner Fire ability
			const hasInnerFire =
				u.abilityType === 'inner_fire' || u.abilities?.some((a) => a.type === 'inner_fire');
			if (hasInnerFire && (!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0)) {
				const unbuffedAlly = this.sim.units.find(
					(other) =>
						other.team === u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						other.instanceId !== u.instanceId &&
						!other.buffs?.some((b) => b.type === 'inner_fire') &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 400
				);
				if (unbuffedAlly) {
					unbuffedAlly.buffs = unbuffedAlly.buffs || [];
					unbuffedAlly.buffs.push({ type: 'inner_fire', timer: 12.0, value: 0.25 });
					u.abilityCooldownTimer = 12.0;
					this.sim.addFloatingText('Вогонь віри!', unbuffedAlly.x, unbuffedAlly.y - 20, '#fbbf24');
				}
			}

			// 8. Thunderbolt (Storm Bolt)
			const hasThunderbolt =
				u.abilityType === 'thunderbolt' || u.abilities?.some((a) => a.type === 'thunderbolt');
			if (hasThunderbolt && (!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0)) {
				const enemyTarget = this.sim.units.find(
					(other) =>
						other.team !== u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 450
				);
				if (enemyTarget) {
					enemyTarget.buffs = enemyTarget.buffs || [];
					enemyTarget.buffs.push({ type: 'stun', timer: 2.0, value: 0 });
					enemyTarget.isStunned = true;
					this.applyUnitDamage(enemyTarget, 100, 'magic', u.team, true, u);
					u.abilityCooldownTimer = 12.0;
					this.sim.addFloatingText(
						'*Громовий удар!*',
						enemyTarget.x,
						enemyTarget.y - 25,
						'#38bdf8'
					);
				}
			}

			// 9. Chain Lightning
			const hasChainLightning =
				u.abilityType === 'chain_lightning' ||
				u.abilities?.some((a) => a.type === 'chain_lightning');
			if (hasChainLightning && (!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0)) {
				const enemies = this.sim.units.filter(
					(other) =>
						other.team !== u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 500
				);
				if (enemies.length > 0) {
					enemies.sort(
						(a, b) => Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y)
					);
					const chainTargets = enemies.slice(0, 4);
					const damages = [120, 90, 65, 45];
					chainTargets.forEach((target, idx) => {
						this.applyUnitDamage(target, damages[idx] || 40, 'magic', u.team, false, u);
					});
					u.abilityCooldownTimer = 12.0;
					this.sim.addFloatingText('Блискавка!', u.x, u.y - 25, '#67e8f9');
				}
			}

			// 10. War Stomp
			const hasStomp = u.abilityType === 'stomp' || u.abilities?.some((a) => a.type === 'stomp');
			if (hasStomp && (!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0)) {
				const nearbyEnemies = this.sim.units.filter(
					(other) =>
						other.team !== u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						!other.flying &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 180
				);
				if (nearbyEnemies.length >= 1) {
					for (const enemy of nearbyEnemies) {
						enemy.buffs = enemy.buffs || [];
						enemy.buffs.push({ type: 'stun', timer: 1.5, value: 0 });
						enemy.isStunned = true;
						this.applyUnitDamage(enemy, 75, 'normal', u.team, false, u);
					}
					u.abilityCooldownTimer = 10.0;
					this.sim.addFloatingText('Громовий тупіт!', u.x, u.y - 25, '#d97706');
				}
			}

			// 11. Immolation Aura
			if (u.immolationDps && u.immolationDps > 0) {
				for (const enemy of this.sim.units) {
					if (
						enemy.team !== u.team &&
						enemy.lane === u.lane &&
						enemy.state !== 'DEAD' &&
						Math.hypot(enemy.x - u.x, enemy.y - u.y) <= 200
					) {
						enemy.hp -= u.immolationDps * dt;
						if (enemy.hp <= 0) {
							this.applyUnitDamage(enemy, 1, 'magic', u.team, false, u);
						}
					}
				}
			}

			// 12. Auras: Devotion & Endurance
			if (u.abilityType === 'aura_armor' || u.abilities?.some((a) => a.type === 'aura_armor')) {
				for (const ally of this.sim.units) {
					if (
						ally.team === u.team &&
						ally.lane === u.lane &&
						ally.state !== 'DEAD' &&
						ally.instanceId !== u.instanceId &&
						Math.hypot(ally.x - u.x, ally.y - u.y) <= 300
					) {
						ally.buffs = ally.buffs || [];
						if (!ally.buffs.some((b) => b.type === 'armor_buff')) {
							ally.buffs.push({ type: 'armor_buff', timer: 1.5, value: 3 });
						}
					}
				}
			}
			if (u.abilityType === 'aura_speed' || u.abilities?.some((a) => a.type === 'aura_speed')) {
				for (const ally of this.sim.units) {
					if (
						ally.team === u.team &&
						ally.lane === u.lane &&
						ally.state !== 'DEAD' &&
						ally.instanceId !== u.instanceId &&
						Math.hypot(ally.x - u.x, ally.y - u.y) <= 300
					) {
						ally.buffs = ally.buffs || [];
						if (!ally.buffs.some((b) => b.type === 'as')) {
							ally.buffs.push({ type: 'as', timer: 1.5, value: 0.2 });
						}
					}
				}
			}

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

			const targetLaneY = u.lane === 'top' ? TOP_LANE_Y : BOTTOM_LANE_Y;

			// Target Acquisition (WC3 Threat & Aggro System)
			let enemyTarget = this.findBestTarget(u);

			// Authentic WC3 Siege Priority:
			// Siege weapons prioritize buildings, defensive towers, and castles when in range
			if (u.attackType === 'siege' && (u.team === 'west' || u.team === 'east')) {
				const enemyTeam: MatchTeam = u.team === 'west' ? 'east' : 'west';
				const targetCastle = u.team === 'west' ? this.sim.castles.east : this.sim.castles.west;
				const distToCastle = Math.hypot(targetCastle.x - u.x, targetCastle.y - u.y) - 60;
				const isNearEnemyBase = u.team === 'west' ? u.x >= ARENA_WIDTH - 1600 : u.x <= 1600;

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
		applyCrowdSeparation(this.sim, dt);
	}

	public performAttack(attacker: Unit, target: Unit): void {
		// Double check lane separation
		if (attacker.lane !== target.lane) return;

		// Curse check: 33% chance to miss attacks
		if (attacker.buffs?.some((b) => b.type === 'curse') && Math.random() < 0.33) {
			this.sim.addFloatingText('Промах! (Прокляття)', attacker.x, attacker.y - 20, '#a855f7');
			return;
		}

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
		if (attacker.buffs?.some((b) => b.type === 'inner_fire')) {
			rawDmg = Math.round(rawDmg * 1.25);
		}

		let isCrit = false;
		if (attacker.critChance && Math.random() < attacker.critChance) {
			rawDmg *= 2;
			isCrit = true;
		}

		// Tactical on-attack procs: Bash, Poison, Frost, Pulverize
		if (
			(attacker.abilityType === 'bash' || attacker.abilities?.some((a) => a.type === 'bash')) &&
			Math.random() < 0.2
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
		if (attacker.pulverizeChance && Math.random() < attacker.pulverizeChance) {
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
		if (target.buffs?.some((b) => b.type === 'inner_fire')) {
			effectiveArmor += 5;
		}
		if (target.buffs?.some((b) => b.type === 'armor_buff')) {
			effectiveArmor += 3;
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

		// WC3 Threat: Direct Attacker Retaliation & Call For Help
		if (attackerUnit && target.state !== 'DEAD' && target.team !== attackerUnit.team) {
			target.lastAttackerId = attackerUnit.instanceId;
			target.lastAttackedTime = this.sim.gameTime;

			// If target is walking and has no target, turn to retaliate against attacker
			if (
				target.state === 'WALKING' &&
				!target.currentTargetId &&
				target.lane === attackerUnit.lane
			) {
				target.currentTargetId = attackerUnit.instanceId;
			}

			// Call for Help: nearby walking allies also acquire this attacker
			for (const ally of this.sim.units) {
				if (
					ally.team === target.team &&
					ally.lane === target.lane &&
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
