import type { Simulation } from './simulation';
import type { Unit, Building, Castle, MatchTeam, Team, AttackType } from './types';
import { calculateDamage } from './damageMatrix';
import { CELL_SIZE } from './constants';
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
				attackerUnit?: Unit
			) => void;
			triggerSplashDamage: (
				targetX: number,
				targetY: number,
				radius: number,
				rawDamage: number,
				attackType: AttackType,
				attackerTeam: Team,
				primaryTargetId?: string
			) => void;
		}
	) {}

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

		if (this.sim.gameTime - this.sim.lastCastleAttackAlert[castle.team] >= 10.0) {
			this.sim.lastCastleAttackAlert[castle.team] = this.sim.gameTime;
			this.sim.onSoundEffect?.('castleUnderAttack');
			this.sim.onCastleUnderAttack?.(castle.team, castle.hp / castle.maxHp);
		}

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
						team,
						splashRadius: 90
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
					this.combat.applyUnitDamage(
						target,
						p.damage,
						p.attackType,
						p.team,
						p.isCrit,
						attackerUnit
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
				}
				if (p.splashRadius) {
					this.combat.triggerSplashDamage(
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
