/**
 * Battle Announcer Service for A11y & Screen Readers
 * Provides reactive polite and assertive ARIA live announcements for RTS match events.
 */
class BattleAnnouncer {
	polite = $state('');
	assertive = $state('');

	private lastAnnouncedPolite = '';
	private lastAnnouncedAssertive = '';
	private lastPoliteTime = 0;
	private lastAssertiveTime = 0;

	private lastBossState = false;
	private lastCastleLowWest = false;
	private lastCastleLowEast = false;
	private lastPhase = '';
	private lastRound = 1;

	announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
		const now = Date.now();
		if (priority === 'assertive') {
			if (message === this.lastAnnouncedAssertive && now - this.lastAssertiveTime < 3000) {
				return;
			}
			this.lastAnnouncedAssertive = message;
			this.lastAssertiveTime = now;
			this.assertive = '';
			this.assertive = message;
		} else {
			if (message === this.lastAnnouncedPolite && now - this.lastPoliteTime < 2500) {
				return;
			}
			this.lastAnnouncedPolite = message;
			this.lastPoliteTime = now;
			this.polite = '';
			this.polite = message;
		}
	}

	updateFromSimulation(
		sim: {
			castles: { west: { hp: number; maxHp: number }; east: { hp: number; maxHp: number } };
			activeBossInstanceId?: string | null;
			dayNightPhase?: string;
			round?: number;
			isRunning?: boolean;
		},
		localTeam: 'west' | 'east' = 'west'
	) {
		if (!sim || !sim.castles) return;

		const ownTeam = localTeam;
		const enemyTeam = localTeam === 'west' ? 'east' : 'west';

		// Own castle low health warning (< 25%)
		const ownCastle = sim.castles[ownTeam];
		if (ownCastle) {
			const ownRatio = ownCastle.hp / Math.max(1, ownCastle.maxHp);
			if (ownRatio <= 0.25 && ownRatio > 0 && !this.lastCastleLowWest) {
				this.lastCastleLowWest = true;
				const castleLabel = ownTeam === 'west' ? 'Західний замок' : 'Східний замок';
				this.announce(`Увага: ${castleLabel} у критичному стані! Здоров'я менше 25%!`, 'assertive');
			} else if (ownRatio > 0.35) {
				this.lastCastleLowWest = false;
			}
		}

		// Enemy castle low health
		const enemyCastle = sim.castles[enemyTeam];
		if (enemyCastle) {
			const enemyRatio = enemyCastle.hp / Math.max(1, enemyCastle.maxHp);
			if (enemyRatio <= 0.25 && enemyRatio > 0 && !this.lastCastleLowEast) {
				this.lastCastleLowEast = true;
				this.announce("Ворожий замок майже знищено! Здоров'я менше 25%!", 'polite');
			} else if (enemyRatio > 0.35) {
				this.lastCastleLowEast = false;
			}
		}

		// Boss spawn
		const hasBoss = Boolean(sim.activeBossInstanceId);
		if (hasBoss && !this.lastBossState) {
			this.lastBossState = true;
			this.announce('Увага: Могутній бос зʼявився на арені!', 'assertive');
		} else if (!hasBoss) {
			this.lastBossState = false;
		}

		// Day / Night transition
		if (sim.dayNightPhase && sim.dayNightPhase !== this.lastPhase) {
			if (this.lastPhase) {
				const phaseNames: Record<string, string> = {
					day: 'Настав день',
					dusk: 'Настали сутінки',
					night: 'Настала ніч',
					dawn: 'Настав світанок'
				};
				const name = phaseNames[sim.dayNightPhase];
				if (name) this.announce(name, 'polite');
			}
			this.lastPhase = sim.dayNightPhase;
		}

		// Round change
		if (sim.round !== undefined && sim.round !== this.lastRound) {
			this.announce(`Розпочався раунд ${sim.round}`, 'polite');
			this.lastRound = sim.round;
		}
	}

	reset() {
		this.polite = '';
		this.assertive = '';
		this.lastAnnouncedPolite = '';
		this.lastAnnouncedAssertive = '';
		this.lastBossState = false;
		this.lastCastleLowWest = false;
		this.lastCastleLowEast = false;
		this.lastPhase = '';
		this.lastRound = 1;
	}
}

export const battleAnnouncer = new BattleAnnouncer();
