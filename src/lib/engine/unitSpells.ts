import type { Simulation } from './simulation';
import type { Unit, Team, AttackType } from './types';

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

export type DamageApplicator = (
	target: Unit,
	rawDamage: number,
	attackType: AttackType,
	attackerTeam: Team,
	isCrit?: boolean,
	attackerUnit?: Unit
) => boolean | void;

/**
 * Handles mana regeneration, ability cooldowns, tactical auras,
 * and 16+ unit spellcasts (Heal, Bloodlust, Thunderbolt, Corpse Explosion, Polymorph, etc.).
 */
export class UnitSpellSystem {
	constructor(
		private sim: Simulation,
		private applyDamage: DamageApplicator
	) {}

	public updateUnitSpells(u: Unit, dt: number): void {
		const isPolymorphed = Boolean(u.isPolymorphed || u.buffs?.some((b) => b.type === 'polymorph'));

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
				this.applyDamage(enemyTarget, 100, 'magic', u.team, true, u);
				u.abilityCooldownTimer = 12.0;
				this.sim.addFloatingText('*Громовий удар!*', enemyTarget.x, enemyTarget.y - 25, '#38bdf8');
			}
		}

		// 9. Chain Lightning
		const hasChainLightning =
			u.abilityType === 'chain_lightning' || u.abilities?.some((a) => a.type === 'chain_lightning');
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
				enemies.sort((a, b) => Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y));
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
					this.applyDamage(target, damages[idx] || 40, 'magic', u.team, false, u);
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
					this.applyDamage(enemy, 75, 'normal', u.team, false, u);
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
				this.applyDamage(enemyWithMana, burned, 'magic', u.team, false, u);
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
						this.applyDamage(enemy, 1, 'magic', u.team, false, u);
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
						this.applyDamage(enemy, 100, 'magic', u.team, false, u);
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
							!['slow', 'curse', 'poison', 'infect', 'weakness', 'frost', 'banish'].includes(b.type)
					);
				}
				this.sim.addFloatingText('Розвіювання! ✨', debuffedAlly.x, debuffedAlly.y - 25, '#22d3ee');
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
						this.applyDamage(buffedEnemy, 150, 'magic', u.team, false, u);
					}
					this.sim.addFloatingText('Очищення! ⚡', buffedEnemy.x, buffedEnemy.y - 25, '#38bdf8');
				}
			}
		}
	}
}
