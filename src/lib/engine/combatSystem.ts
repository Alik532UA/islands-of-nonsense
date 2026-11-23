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
import type { Unit, Building, Castle, MatchTeam, Team, Lane, AttackType } from './types';
import { calculateDamage, getDamageMultiplier } from './damageMatrix';
import { DefenseSystem } from './defenseSystem';
import { applyCrowdSeparation } from './crowdPhysics';
import { logService } from '../services/logService.svelte';

export const SPELL_MANA_COSTS: Record<string, number> = {
	heal: 25,
	bloodlust: 40,
	slow: 50,
	curse: 40,
	inner_fire: 35,
	thunderbolt: 75,
	chain_lightning: 100,
	stomp: 65,
	ensnare: 50,
	mana_burn: 35,
	raise_dead: 45,
	corpse_explosion: 35,
	polymorph: 60,
	cyclone: 50,
	banish: 40,
	dispel: 45
};

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
		const canHitAir = u.canHitAir ?? (u.range > 120 || !!u.flying);

		const candidates = this.sim.spatialGrid.queryRadius(u.x, u.y, acquisitionRange, (candidate) => {
			if (candidate.team === u.team) return false;
			if (candidate.lane !== u.lane) return false;
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

			// Mana regeneration tick
			if (u.maxMana && u.maxMana > 0 && u.mana !== undefined) {
				u.mana = Math.min(u.maxMana, u.mana + (u.manaRegen || 0) * dt);
			}

			// Tactical abilities cooldown tick
			if (u.abilityCooldownTimer && u.abilityCooldownTimer > 0) {
				u.abilityCooldownTimer = Math.max(0, u.abilityCooldownTimer - dt);
			}

			// 1. Ensnare ability (Web down flying enemies)
			const ensnareCost = SPELL_MANA_COSTS.ensnare;
			if (
				u.abilityType === 'ensnare' &&
				(!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0) &&
				(!u.maxMana || (u.mana ?? 0) >= ensnareCost)
			) {
				const enemyFlying = this.sim.units.find(
					(other) =>
						other.team !== u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						other.flying &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 450
				);
				if (enemyFlying) {
					if (u.maxMana && u.mana !== undefined) {
						u.mana = Math.max(0, u.mana - ensnareCost);
					}
					enemyFlying.buffs = enemyFlying.buffs || [];
					enemyFlying.buffs.push({ type: 'ensnare', timer: 6.0, value: 0 });
					enemyFlying.flying = false;
					enemyFlying.isEnsnared = true;
					u.abilityCooldownTimer = 12.0;
					this.sim.addFloatingText('Сітка!', enemyFlying.x, enemyFlying.y - 20, '#a3e635');
				}
			}

			// 2. Heal ability (Support wounded allies)
			const healCost = SPELL_MANA_COSTS.heal;
			if (
				u.abilityType === 'heal' &&
				(!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0) &&
				(!u.maxMana || (u.mana ?? 0) >= healCost)
			) {
				const injuredCandidates = this.sim.units.filter(
					(other) =>
						other.team === u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						other.maxHp - other.hp >= 15 &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 350
				);
				injuredCandidates.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
				const injuredAlly = injuredCandidates[0];
				if (injuredAlly) {
					if (u.maxMana && u.mana !== undefined) {
						u.mana = Math.max(0, u.mana - healCost);
					}
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
			const bloodlustCost = SPELL_MANA_COSTS.bloodlust;
			if (
				hasBloodlust &&
				(!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0) &&
				(!u.maxMana || (u.mana ?? 0) >= bloodlustCost)
			) {
				const unbuffedAllies = this.sim.units.filter(
					(other) =>
						other.team === u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						other.instanceId !== u.instanceId &&
						!other.buffs?.some((b) => b.type === 'bloodlust') &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 400
				);
				unbuffedAllies.sort((a, b) => {
					const dpsA = (a.damageMax || a.damageMin || 10) / (a.attackCooldown || 1.5);
					const dpsB = (b.damageMax || b.damageMin || 10) / (b.attackCooldown || 1.5);
					return dpsB - dpsA;
				});
				const unbuffedAlly = unbuffedAllies[0];
				if (unbuffedAlly) {
					if (u.maxMana && u.mana !== undefined) {
						u.mana = Math.max(0, u.mana - bloodlustCost);
					}
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
			const slowCost = SPELL_MANA_COSTS.slow;
			if (
				hasSlow &&
				(!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0) &&
				(!u.maxMana || (u.mana ?? 0) >= slowCost)
			) {
				const enemyCandidates = this.sim.units.filter(
					(other) =>
						other.team !== u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						!other.buffs?.some((b) => b.type === 'slow') &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 450
				);
				enemyCandidates.sort(
					(a, b) => (b.damageMax || b.damageMin || 10) - (a.damageMax || a.damageMin || 10)
				);
				const enemyTarget = enemyCandidates[0];
				if (enemyTarget) {
					if (u.maxMana && u.mana !== undefined) {
						u.mana = Math.max(0, u.mana - slowCost);
					}
					enemyTarget.buffs = enemyTarget.buffs || [];
					enemyTarget.buffs.push({ type: 'slow', timer: 6.0, value: 0.35 });
					u.abilityCooldownTimer = 8.0;
					this.sim.addFloatingText('Уповільнення!', enemyTarget.x, enemyTarget.y - 20, '#93c5fd');
				}
			}

			// 6. Curse ability
			const hasCurse = u.abilityType === 'curse' || u.abilities?.some((a) => a.type === 'curse');
			const curseCost = SPELL_MANA_COSTS.curse;
			if (
				hasCurse &&
				(!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0) &&
				(!u.maxMana || (u.mana ?? 0) >= curseCost)
			) {
				const enemyCandidates = this.sim.units.filter(
					(other) =>
						other.team !== u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						!other.buffs?.some((b) => b.type === 'curse') &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 450
				);
				enemyCandidates.sort(
					(a, b) => (b.damageMax || b.damageMin || 10) - (a.damageMax || a.damageMin || 10)
				);
				const enemyTarget = enemyCandidates[0];
				if (enemyTarget) {
					if (u.maxMana && u.mana !== undefined) {
						u.mana = Math.max(0, u.mana - curseCost);
					}
					enemyTarget.buffs = enemyTarget.buffs || [];
					enemyTarget.buffs.push({ type: 'curse', timer: 8.0, value: 0.33 });
					u.abilityCooldownTimer = 9.0;
					this.sim.addFloatingText('Прокляття!', enemyTarget.x, enemyTarget.y - 20, '#c084fc');
				}
			}

			// 7. Inner Fire ability
			const hasInnerFire =
				u.abilityType === 'inner_fire' || u.abilities?.some((a) => a.type === 'inner_fire');
			const innerFireCost = SPELL_MANA_COSTS.inner_fire;
			if (
				hasInnerFire &&
				(!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0) &&
				(!u.maxMana || (u.mana ?? 0) >= innerFireCost)
			) {
				const unbuffedAllies = this.sim.units.filter(
					(other) =>
						other.team === u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						other.instanceId !== u.instanceId &&
						!other.buffs?.some((b) => b.type === 'inner_fire') &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 400
				);
				unbuffedAllies.sort((a, b) => b.maxHp - a.maxHp);
				const unbuffedAlly = unbuffedAllies[0];
				if (unbuffedAlly) {
					if (u.maxMana && u.mana !== undefined) {
						u.mana = Math.max(0, u.mana - innerFireCost);
					}
					unbuffedAlly.buffs = unbuffedAlly.buffs || [];
					unbuffedAlly.buffs.push({ type: 'inner_fire', timer: 12.0, value: 0.25 });
					u.abilityCooldownTimer = 12.0;
					this.sim.addFloatingText('Вогонь віри!', unbuffedAlly.x, unbuffedAlly.y - 20, '#fbbf24');
				}
			}

			// 8. Thunderbolt (Storm Bolt)
			const hasThunderbolt =
				u.abilityType === 'thunderbolt' || u.abilities?.some((a) => a.type === 'thunderbolt');
			const tbCost = SPELL_MANA_COSTS.thunderbolt;
			if (
				hasThunderbolt &&
				(!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0) &&
				(!u.maxMana || (u.mana ?? 0) >= tbCost)
			) {
				const enemyTarget = this.sim.units.find(
					(other) =>
						other.team !== u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 450
				);
				if (enemyTarget) {
					if (u.maxMana && u.mana !== undefined) {
						u.mana = Math.max(0, u.mana - tbCost);
					}
					enemyTarget.buffs = enemyTarget.buffs || [];
					enemyTarget.buffs.push({ type: 'stun', timer: 2.0, value: 0 });
					enemyTarget.isStunned = true;
					this.sim.lightningEffects.push({
						sourceX: u.x,
						sourceY: u.y - 15,
						targetX: enemyTarget.x,
						targetY: enemyTarget.y,
						timer: 0.35,
						maxTimer: 0.35,
						color: 0x38bdf8
					});
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
			const clCost = SPELL_MANA_COSTS.chain_lightning;
			if (
				hasChainLightning &&
				(!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0) &&
				(!u.maxMana || (u.mana ?? 0) >= clCost)
			) {
				const enemies = this.sim.units.filter(
					(other) =>
						other.team !== u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 500
				);
				if (enemies.length > 0) {
					if (u.maxMana && u.mana !== undefined) {
						u.mana = Math.max(0, u.mana - clCost);
					}
					enemies.sort(
						(a, b) => Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y)
					);
					const chainTargets = enemies.slice(0, 4);
					const damages = [120, 90, 65, 45];
					let prevX = u.x;
					let prevY = u.y;
					chainTargets.forEach((target, idx) => {
						this.sim.lightningEffects.push({
							sourceX: prevX,
							sourceY: prevY,
							targetX: target.x,
							targetY: target.y,
							timer: 0.3,
							maxTimer: 0.3,
							color: 0x67e8f9
						});
						prevX = target.x;
						prevY = target.y;
						this.applyUnitDamage(target, damages[idx] || 40, 'magic', u.team, false, u);
					});
					u.abilityCooldownTimer = 12.0;
					this.sim.addFloatingText('Блискавка!', u.x, u.y - 25, '#67e8f9');
				}
			}

			// 10. War Stomp
			const hasStomp = u.abilityType === 'stomp' || u.abilities?.some((a) => a.type === 'stomp');
			const stompCost = SPELL_MANA_COSTS.stomp;
			if (
				hasStomp &&
				(!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0) &&
				(!u.maxMana || (u.mana ?? 0) >= stompCost)
			) {
				const nearbyEnemies = this.sim.units.filter(
					(other) =>
						other.team !== u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						!other.flying &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 180
				);
				if (nearbyEnemies.length >= 1) {
					if (u.maxMana && u.mana !== undefined) {
						u.mana = Math.max(0, u.mana - stompCost);
					}
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

			// 11. Mana Burn
			const hasManaBurn =
				u.abilityType === 'mana_burn' || u.abilities?.some((a) => a.type === 'mana_burn');
			const mbCost = SPELL_MANA_COSTS.mana_burn;
			if (
				hasManaBurn &&
				(!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0) &&
				(!u.maxMana || (u.mana ?? 0) >= mbCost)
			) {
				const enemyWithMana = this.sim.units.find(
					(other) =>
						other.team !== u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						other.maxMana &&
						other.maxMana > 0 &&
						(other.mana || 0) > 0 &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 400
				);
				if (enemyWithMana) {
					const burned = Math.min(50, enemyWithMana.mana || 0);
					enemyWithMana.mana = Math.max(0, (enemyWithMana.mana || 0) - burned);
					this.applyUnitDamage(enemyWithMana, burned, 'magic', u.team, false, u);
					if (u.maxMana && u.mana !== undefined) {
						u.mana = Math.max(0, u.mana - mbCost);
					}
					u.abilityCooldownTimer = 10.0;
					this.sim.addFloatingText(
						`Спалення мани (-${burned})`,
						enemyWithMana.x,
						enemyWithMana.y - 20,
						'#38bdf8'
					);
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

			// 13. Raise Dead (Некромантія)
			const hasRaiseDead =
				u.abilityType === 'raise_dead' || u.abilities?.some((a) => a.type === 'raise_dead');
			const rdCost = SPELL_MANA_COSTS.raise_dead ?? 45;
			if (
				hasRaiseDead &&
				(!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0) &&
				(!u.maxMana || (u.mana ?? 0) >= rdCost)
			) {
				const corpseIdx = this.sim.corpses.findIndex(
					(c) => c.lane === u.lane && Math.hypot(c.x - u.x, c.y - u.y) <= 450
				);
				if (corpseIdx !== -1) {
					const corpse = this.sim.corpses.splice(corpseIdx, 1)[0];
					if (u.maxMana && u.mana !== undefined) {
						u.mana = Math.max(0, u.mana - rdCost);
					}
					u.abilityCooldownTimer = 8.0;
					this.sim.spawnUnitDirectly({
						team: u.team,
						lane: u.lane,
						x: corpse.x,
						y: corpse.y,
						name: 'Скелет-воїн',
						hp: 240,
						maxHp: 240,
						armor: 1,
						armorType: 'large',
						attackType: 'normal',
						damage: 18,
						range: 100,
						attackCooldown: 1.1,
						speed: 130,
						flying: false,
						timedLife: 25.0,
						isSummoned: true
					});
					this.sim.addFloatingText('Підняття мерця! 💀', corpse.x, corpse.y - 20, '#a855f7');
				}
			}

			// 14. Corpse Explosion (Вибух трупа)
			const hasCorpseExplosion =
				u.abilityType === 'corpse_explosion' ||
				u.abilities?.some((a) => a.type === 'corpse_explosion');
			const ceCost = SPELL_MANA_COSTS.corpse_explosion ?? 35;
			if (
				hasCorpseExplosion &&
				(!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0) &&
				(!u.maxMana || (u.mana ?? 0) >= ceCost)
			) {
				const corpseIdx = this.sim.corpses.findIndex((c) => {
					if (c.lane !== u.lane || Math.hypot(c.x - u.x, c.y - u.y) > 450) return false;
					return this.sim.units.some(
						(other) =>
							other.team !== u.team &&
							other.lane === u.lane &&
							other.state !== 'DEAD' &&
							Math.hypot(other.x - c.x, other.y - c.y) <= 200
					);
				});
				if (corpseIdx !== -1) {
					const corpse = this.sim.corpses.splice(corpseIdx, 1)[0];
					if (u.maxMana && u.mana !== undefined) {
						u.mana = Math.max(0, u.mana - ceCost);
					}
					u.abilityCooldownTimer = 9.0;
					for (const enemy of this.sim.units) {
						if (
							enemy.team !== u.team &&
							enemy.lane === u.lane &&
							enemy.state !== 'DEAD' &&
							Math.hypot(enemy.x - corpse.x, enemy.y - corpse.y) <= 200
						) {
							this.applyUnitDamage(enemy, 100, 'magic', u.team, false, u);
						}
					}
					this.sim.addFloatingText('Вибух трупа! 💥', corpse.x, corpse.y - 20, '#ef4444');
				}
			}

			// 15. Cannibalize (Канібалізм)
			const hasCannibalize =
				u.abilityType === 'cannibalize' || u.abilities?.some((a) => a.type === 'cannibalize');
			if (
				hasCannibalize &&
				(!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0) &&
				u.hp < u.maxHp * 0.75
			) {
				const corpseIdx = this.sim.corpses.findIndex(
					(c) => c.lane === u.lane && Math.hypot(c.x - u.x, c.y - u.y) <= 150
				);
				if (corpseIdx !== -1) {
					this.sim.corpses.splice(corpseIdx, 1);
					const healAmount = Math.round(u.maxHp * 0.35);
					u.hp = Math.min(u.maxHp, u.hp + healAmount);
					u.abilityCooldownTimer = 8.0;
					this.sim.addFloatingText(`+${healAmount} HP Пожирання 🍖`, u.x, u.y - 20, '#22c55e');
				}
			}

			// 16. Polymorph (Чарівниця)
			const hasPolymorph =
				!isPolymorphed &&
				(u.abilityType === 'polymorph' || u.abilities?.some((a) => a.type === 'polymorph'));
			const polyCost = SPELL_MANA_COSTS.polymorph ?? 60;
			if (
				hasPolymorph &&
				(!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0) &&
				(!u.maxMana || (u.mana ?? 0) >= polyCost)
			) {
				const enemies = this.sim.units.filter(
					(other) =>
						other.team !== u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						!other.isBoss &&
						!other.buffs?.some(
							(b) => b.type === 'polymorph' || b.type === 'cyclone' || b.type === 'banish'
						) &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 450
				);
				enemies.sort(
					(a, b) => (b.damageMax || b.damageMin || 10) - (a.damageMax || a.damageMin || 10)
				);
				const enemy = enemies[0];
				if (enemy) {
					if (u.maxMana && u.mana !== undefined) {
						u.mana = Math.max(0, u.mana - polyCost);
					}
					u.abilityCooldownTimer = 12.0;
					enemy.buffs = enemy.buffs || [];
					enemy.buffs.push({ type: 'polymorph', timer: 5.5, value: 0 });
					enemy.currentTargetId = null;
					this.sim.addFloatingText('Перетворення! 🐑', enemy.x, enemy.y - 25, '#e879f9');
				}
			}

			// 17. Cyclone (Смерч)
			const hasCyclone =
				!isPolymorphed &&
				(u.abilityType === 'cyclone' || u.abilities?.some((a) => a.type === 'cyclone'));
			const cycCost = SPELL_MANA_COSTS.cyclone ?? 50;
			if (
				hasCyclone &&
				(!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0) &&
				(!u.maxMana || (u.mana ?? 0) >= cycCost)
			) {
				const enemies = this.sim.units.filter(
					(other) =>
						other.team !== u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						!other.isBoss &&
						!other.buffs?.some(
							(b) => b.type === 'cyclone' || b.type === 'polymorph' || b.type === 'banish'
						) &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 500
				);
				enemies.sort(
					(a, b) => (b.damageMax || b.damageMin || 10) - (a.damageMax || a.damageMin || 10)
				);
				const enemy = enemies[0];
				if (enemy) {
					if (u.maxMana && u.mana !== undefined) {
						u.mana = Math.max(0, u.mana - cycCost);
					}
					u.abilityCooldownTimer = 14.0;
					enemy.buffs = enemy.buffs || [];
					enemy.buffs.push({ type: 'cyclone', timer: 4.5, value: 0 });
					enemy.currentTargetId = null;
					this.sim.addFloatingText('Смерч! 🌪️', enemy.x, enemy.y - 25, '#94a3b8');
				}
			}

			// 18. Banish (Вигнання в астрал)
			const hasBanish =
				!isPolymorphed &&
				(u.abilityType === 'banish' || u.abilities?.some((a) => a.type === 'banish'));
			const banishCost = SPELL_MANA_COSTS.banish ?? 40;
			if (
				hasBanish &&
				(!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0) &&
				(!u.maxMana || (u.mana ?? 0) >= banishCost)
			) {
				const enemies = this.sim.units.filter(
					(other) =>
						other.team !== u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						!other.isBoss &&
						!other.buffs?.some(
							(b) => b.type === 'banish' || b.type === 'cyclone' || b.type === 'polymorph'
						) &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 450
				);
				enemies.sort(
					(a, b) => (b.damageMax || b.damageMin || 10) - (a.damageMax || a.damageMin || 10)
				);
				const enemy = enemies[0];
				if (enemy) {
					if (u.maxMana && u.mana !== undefined) {
						u.mana = Math.max(0, u.mana - banishCost);
					}
					u.abilityCooldownTimer = 11.0;
					enemy.buffs = enemy.buffs || [];
					enemy.buffs.push({ type: 'banish', timer: 6.0, value: 0 });
					this.sim.addFloatingText('Астрал! 👻', enemy.x, enemy.y - 25, '#2dd4bf');
				}
			}

			// Dispel Magic / Purge
			const hasDispel = u.abilityType === 'dispel' || u.abilities?.some((a) => a.type === 'dispel');
			const dispelCost = SPELL_MANA_COSTS.dispel ?? 45;
			if (
				hasDispel &&
				(!u.abilityCooldownTimer || u.abilityCooldownTimer <= 0) &&
				(!u.maxMana || (u.mana ?? 0) >= dispelCost)
			) {
				// 1. Search for debuffed ally in range 450
				const debuffedAlly = this.sim.units.find(
					(other) =>
						other.team === u.team &&
						other.lane === u.lane &&
						other.state !== 'DEAD' &&
						Math.hypot(other.x - u.x, other.y - u.y) <= 450 &&
						(other.buffs?.some((b) =>
							['slow', 'curse', 'poison', 'infect', 'weakness', 'frost', 'banish'].includes(b.type)
						) ||
							other.isEnsnared ||
							other.isPolymorphed)
				);

				if (debuffedAlly) {
					if (u.maxMana && u.mana !== undefined) {
						u.mana = Math.max(0, u.mana - dispelCost);
					}
					u.abilityCooldownTimer = 8.0;
					debuffedAlly.isEnsnared = false;
					debuffedAlly.isPolymorphed = false;
					if (debuffedAlly.buffs) {
						debuffedAlly.buffs = debuffedAlly.buffs.filter(
							(b) =>
								!['slow', 'curse', 'poison', 'infect', 'weakness', 'frost', 'banish'].includes(
									b.type
								)
						);
					}
					this.sim.addFloatingText(
						'Розвіювання! ✨',
						debuffedAlly.x,
						debuffedAlly.y - 25,
						'#22d3ee'
					);
				} else {
					// 2. Search for buffed enemy or summoned unit in range 450
					const buffedEnemy = this.sim.units.find(
						(other) =>
							other.team !== u.team &&
							other.lane === u.lane &&
							other.state !== 'DEAD' &&
							Math.hypot(other.x - u.x, other.y - u.y) <= 450 &&
							(other.isSummoned ||
								other.buffs?.some((b) =>
									['bloodlust', 'inner_fire', 'shield', 'armor_buff', 'dmg', 'as'].includes(b.type)
								))
					);

					if (buffedEnemy) {
						if (u.maxMana && u.mana !== undefined) {
							u.mana = Math.max(0, u.mana - dispelCost);
						}
						u.abilityCooldownTimer = 8.0;
						if (buffedEnemy.buffs) {
							buffedEnemy.buffs = buffedEnemy.buffs.filter(
								(b) =>
									!['bloodlust', 'inner_fire', 'shield', 'armor_buff', 'dmg', 'as'].includes(b.type)
							);
						}
						if (buffedEnemy.isSummoned) {
							this.applyUnitDamage(buffedEnemy, 150, 'magic', u.team, false, u);
						}
						this.sim.addFloatingText('Очищення! ⚡', buffedEnemy.x, buffedEnemy.y - 25, '#38bdf8');
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
			if (isPolymorphed) {
				currentSpeed *= 0.55;
			}
			if (isBanished) {
				currentSpeed *= 0.7;
			}

			const targetLaneY =
				u.lane === 'top' ? TOP_LANE_Y : u.lane === 'mid' ? MID_LANE_Y : BOTTOM_LANE_Y;
			const effectiveCrossingLane = this.getEffectiveCrossingLane(u);
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

			if (enemyTarget && enemyTarget.hp > 0 && enemyTarget.lane === u.lane) {
				const isAcrossRiver =
					(u.x < 3600 && enemyTarget.x > 3600) || (u.x > 3600 && enemyTarget.x < 3600);
				const bridgeBroken = !u.flying && this.sim.brokenBridge && u.lane === this.sim.brokenBridge;

				if (isAcrossRiver && bridgeBroken) {
					// Cannot cross broken bridge in straight line: detour across intact bridge first!
					const navTarget = this.getStrategicNavTarget(
						u,
						enemyTarget.x,
						enemyTarget.y,
						crossingLaneY
					);
					u.state = 'WALKING';
					u.currentTargetId = enemyTarget.instanceId;
					this.moveUnitTowards(u, navTarget.x, navTarget.y, currentSpeed, dt);
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
						this.moveUnitTowards(u, enemyTarget.x, enemyTarget.y, currentSpeed, dt);
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
					this.moveUnitTowards(u, patrolTargetX, targetLaneY, currentSpeed, dt);
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
							: this.getStrategicNavTarget(u, targetCastle.x, targetCastle.y, crossingLaneY);
						const dNav = Math.hypot(navTarget.x - u.x, navTarget.y - u.y);
						if (dNav > 5) {
							this.moveUnitTowards(
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
						const navTarget = this.getStrategicNavTarget(u, bx, by, crossingLaneY);

						const d = Math.hypot(navTarget.x - u.x, navTarget.y - u.y);
						if (d > 5) {
							this.moveUnitTowards(
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
						: this.getStrategicNavTarget(u, targetCastle.x, targetCastle.y, crossingLaneY);

					const d = Math.hypot(navTarget.x - u.x, navTarget.y - u.y);
					if (d > 5) {
						this.moveUnitTowards(
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

	private getEffectiveCrossingLane(u: Unit): 'top' | 'mid' | 'bottom' {
		if (!u.flying && this.sim.brokenBridge && u.lane === this.sim.brokenBridge) {
			return this.sim.brokenBridge === 'mid' ? 'top' : 'mid';
		}
		return u.lane;
	}

	/**
	 * Computes intelligent advance strategic waypoints for units approaching and crossing bridges.
	 * Units merge onto the highway and align to lane center well before reaching the bridge,
	 * ensuring perfectly smooth transitions without any abrupt snapping or teleportation.
	 */
	public getStrategicNavTarget(
		u: Unit,
		finalTargetX: number,
		finalTargetY: number,
		crossingLaneY: number
	): { x: number; y: number } {
		if (u.flying) {
			const laneY = u.lane === 'top' ? TOP_LANE_Y : u.lane === 'mid' ? MID_LANE_Y : BOTTOM_LANE_Y;
			if (u.team === 'west') {
				if (u.x < BRIDGE_SPAN_MAX_X + 20) {
					return { x: BRIDGE_SPAN_MAX_X + 40, y: laneY };
				}
			} else {
				if (u.x > BRIDGE_SPAN_MIN_X - 20) {
					return { x: BRIDGE_SPAN_MIN_X - 40, y: laneY };
				}
			}
			return { x: finalTargetX, y: finalTargetY };
		}

		const isWest = u.team === 'west';
		if (isWest) {
			// 0. Courtyard bypass for units behind friendly West Castle (footprint 1480..1720, 1080..1320)
			if (u.x < 1740) {
				const northSide = (u.y ?? MID_LANE_Y) < 1200;
				if (crossingLaneY === TOP_LANE_Y) {
					if (u.x < 1560) return { x: 1600, y: 920 };
					return { x: 1800, y: TOP_LANE_Y };
				} else if (crossingLaneY === BOTTOM_LANE_Y) {
					if (u.x < 1560) return { x: 1600, y: 1480 };
					return { x: 1800, y: BOTTOM_LANE_Y };
				} else {
					if (u.x < 1560) return { x: 1600, y: northSide ? 920 : 1480 };
					if (u.x < 1760) return { x: 1800, y: northSide ? 960 : 1440 };
					return { x: 1950, y: MID_LANE_Y };
				}
			}

			// 1. Stage A: Castle courtyard to Highway merge zone
			if (u.x < WEST_ROAD_MERGE_X + 50) {
				return { x: WEST_ROAD_MERGE_X + 100, y: crossingLaneY };
			}
			// 2. Stage B: Pre-bridge approach highway (straight run into bridge mouth)
			if (u.x < BRIDGE_SPAN_MIN_X - 10) {
				return { x: BRIDGE_SPAN_MIN_X - 5, y: crossingLaneY };
			}
			// 3. Stage C: On the bridge spanning the central ocean channel
			if (u.x <= BRIDGE_SPAN_MAX_X + 25) {
				return { x: BRIDGE_SPAN_MAX_X + 45, y: crossingLaneY };
			}
			// 4. Stage D: Post-bridge East highway run towards merge point
			const eastMergeThreshold = Math.min(finalTargetX - 40, EAST_ROAD_MERGE_X);
			if (u.x < eastMergeThreshold - 20) {
				return { x: eastMergeThreshold, y: crossingLaneY };
			}
			// 5. Stage E: Beyond merge point or abreast of target - march towards final objective
			return { x: finalTargetX, y: finalTargetY };
		} else {
			// East team unit moving west towards West island
			// 0. Courtyard bypass for units behind friendly East Castle (footprint 5480..5720, 1080..1320)
			if (u.x > 5460) {
				const northSide = (u.y ?? MID_LANE_Y) < 1200;
				if (crossingLaneY === TOP_LANE_Y) {
					if (u.x > 5640) return { x: 5600, y: 920 };
					return { x: 5400, y: TOP_LANE_Y };
				} else if (crossingLaneY === BOTTOM_LANE_Y) {
					if (u.x > 5640) return { x: 5600, y: 1480 };
					return { x: 5400, y: BOTTOM_LANE_Y };
				} else {
					if (u.x > 5640) return { x: 5600, y: northSide ? 920 : 1480 };
					if (u.x > 5440) return { x: 5400, y: northSide ? 960 : 1440 };
					return { x: 5250, y: MID_LANE_Y };
				}
			}

			// 1. Stage A: East courtyard to Highway merge zone
			if (u.x > EAST_ROAD_MERGE_X - 50) {
				return { x: EAST_ROAD_MERGE_X - 100, y: crossingLaneY };
			}
			// 2. Stage B: Pre-bridge approach highway
			if (u.x > BRIDGE_SPAN_MAX_X + 10) {
				return { x: BRIDGE_SPAN_MAX_X + 5, y: crossingLaneY };
			}
			// 3. Stage C: On the bridge
			if (u.x >= BRIDGE_SPAN_MIN_X - 25) {
				return { x: BRIDGE_SPAN_MIN_X - 45, y: crossingLaneY };
			}
			// 4. Stage D: Post-bridge West highway run towards merge point
			const westMergeThreshold = Math.max(finalTargetX + 40, WEST_ROAD_MERGE_X);
			if (u.x > westMergeThreshold + 20) {
				return { x: westMergeThreshold, y: crossingLaneY };
			}
			// 5. Stage E: Beyond merge point or abreast of target - march towards final objective
			return { x: finalTargetX, y: finalTargetY };
		}
	}

	/**
	 * Moves a unit towards a target coordinate with intelligent waypoint pathfinding & obstacle avoidance
	 * for ground units, smoothly navigating around buildings, castles, walls, and decorations without teleporting.
	 */
	public moveUnitTowards(
		u: Unit,
		targetX: number,
		targetY: number,
		speed: number,
		dt: number,
		ignoreBuildingId?: string,
		ignoreCastle?: boolean
	): void {
		const dx = targetX - u.x;
		const dy = targetY - u.y;
		const dist = Math.hypot(dx, dy);
		if (dist < 1) return;

		// Flying units soar unimpeded over ground obstacles
		if (u.flying) {
			const moveDist = Math.min(dist, speed * dt);
			u.x += (dx / dist) * moveDist;
			u.y += (dy / dist) * moveDist;
			return;
		}

		// Track movement progress for ground unit stuck detection
		const lastX = u.lastMoveX ?? u.x;
		const lastY = u.lastMoveY ?? u.y;
		const stepMoved = Math.hypot(u.x - lastX, u.y - lastY);
		u.lastMoveX = u.x;
		u.lastMoveY = u.y;

		if (stepMoved < speed * dt * 0.15) {
			const prevStuck = u.stuckTimer || 0;
			u.stuckTimer = prevStuck + dt;
			if (prevStuck <= 0.6 && u.stuckTimer > 0.6) {
				const nearFriendlyCastle =
					(u.team === 'west' && Math.hypot(1600 - u.x, 1200 - u.y) < 220) ||
					(u.team === 'east' && Math.hypot(5600 - u.x, 1200 - u.y) < 220);
				const reason = nearFriendlyCastle ? 'behind_friendly_castle' : 'obstacle_collision';
				logService.collision('Unit stuck against obstacle', {
					unit: u.name,
					unitId: u.instanceId,
					pos: { x: Math.round(u.x), y: Math.round(u.y) },
					target: { x: Math.round(targetX), y: Math.round(targetY) },
					state: u.state,
					reason
				});
			}
		} else {
			u.stuckTimer = 0;
		}

		// Invalidate stale waypoint path if navigation target changed significantly
		if (
			u.path &&
			u.pathTargetX !== undefined &&
			u.pathTargetY !== undefined &&
			Math.hypot(u.pathTargetX - targetX, u.pathTargetY - targetY) > 60
		) {
			u.path = undefined;
		}

		// 1. Follow active waypoint path if unit already has one
		if (u.path && u.path.length > 0) {
			let curWp = u.path[0];
			let wpDist = Math.hypot(curWp.x - u.x, curWp.y - u.y);

			while (wpDist < 14 && u.path.length > 0) {
				u.path.shift();
				if (u.path.length === 0) break;
				curWp = u.path[0];
				wpDist = Math.hypot(curWp.x - u.x, curWp.y - u.y);
			}

			if (u.path.length > 0 && wpDist > 0.001) {
				const step = Math.min(wpDist, speed * dt);
				u.x += ((curWp.x - u.x) / wpDist) * step;
				u.y += ((curWp.y - u.y) / wpDist) * step;
				return;
			}
			u.path = undefined;
		}

		// 2. Direct line check: if unobstructed, move straight towards target
		const lineClear = this.sim.workerSystem.isGroundLineClear(
			u.x,
			u.y,
			targetX,
			targetY,
			u.size,
			ignoreBuildingId,
			ignoreCastle
		);

		if (lineClear) {
			u.path = undefined;
			const step = Math.min(dist, speed * dt);
			u.x += (dx / dist) * step;
			u.y += (dy / dist) * step;
			return;
		}

		// 3. Obstacle ahead: utilize A* waypoint pathfinding with cooldown throttling
		const targetMoved =
			u.pathTargetX === undefined ||
			Math.hypot(u.pathTargetX - targetX, (u.pathTargetY ?? 0) - targetY) > 50;
		const now = this.sim.gameTime;
		const canRecalcPath = now - (u.lastPathTime ?? -10) >= 1.2;

		if (
			(!u.path || u.path.length === 0 || targetMoved || (u.stuckTimer && u.stuckTimer > 0.6)) &&
			canRecalcPath
		) {
			u.lastPathTime = now;
			u.path = this.sim.workerSystem.findGroundPath(
				u.team as MatchTeam,
				u.x,
				u.y,
				targetX,
				targetY,
				u.size,
				ignoreBuildingId,
				ignoreCastle
			);
			u.pathTargetX = targetX;
			u.pathTargetY = targetY;
			u.stuckTimer = 0;
		}

		if (u.path && u.path.length > 0) {
			let curWp = u.path[0];
			let wpDist = Math.hypot(curWp.x - u.x, curWp.y - u.y);

			while (wpDist < 14 && u.path.length > 0) {
				u.path.shift();
				if (u.path.length === 0) break;
				curWp = u.path[0];
				wpDist = Math.hypot(curWp.x - u.x, curWp.y - u.y);
			}

			if (u.path.length > 0 && wpDist > 0.001) {
				const step = Math.min(wpDist, speed * dt);
				u.x += ((curWp.x - u.x) / wpDist) * step;
				u.y += ((curWp.y - u.y) / wpDist) * step;
				return;
			}
		}

		// 3. Fallback smooth raycast avoidance
		const baseAngle = Math.atan2(dy, dx);
		const lookAhead = Math.min(dist, Math.max(28, u.size + speed * dt * 6));
		let moveAngle = baseAngle;

		const testOffsets = [0.45, -0.45, 0.85, -0.85, 1.3, -1.3, 1.75, -1.75];
		for (const offset of testOffsets) {
			const candAngle = baseAngle + offset;
			const cx = u.x + Math.cos(candAngle) * lookAhead;
			const cy = u.y + Math.sin(candAngle) * lookAhead;
			if (
				!this.sim.workerSystem.isPointBlockedForGround(
					cx,
					cy,
					u.size,
					ignoreBuildingId,
					ignoreCastle
				)
			) {
				moveAngle = candAngle;
				break;
			}
		}

		const step = Math.min(dist, speed * dt);
		u.x += Math.cos(moveAngle) * step;
		u.y += Math.sin(moveAngle) * step;
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
		lane?: Lane
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
			if (lane && u.lane !== lane) continue;
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
			this.applyUnitDamage(u, splashDmg, attackType, attackerTeam, false);
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

			// Corpse generation (for non-summoned units)
			if (!target.isSummoned && (target.team === 'west' || target.team === 'east')) {
				this.sim.corpses.push({
					id: `corpse_${Date.now()}_${Math.random()}`,
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
					id: `deb_${Date.now()}_${Math.random()}`,
					x: target.x,
					y: target.y,
					team: target.team,
					value: 15,
					lifeTime: 15.0
				});
				const recyclers = this.sim.buildings.filter(
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
