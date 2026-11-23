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

	updateFromSimulation(sim: {
		castles: { west: { hp: number; maxHp: number }; east: { hp: number; maxHp: number } };
		activeBossInstanceId?: string | null;
		dayNightPhase?: string;
		round?: number;
		isRunning?: boolean;
	}) {
		if (!sim || !sim.castles) return;

		// Castle low health warning (< 25%)
		const westCastle = sim.castles.west;
		if (westCastle) {
			const westRatio = westCastle.hp / Math.max(1, westCastle.maxHp);
			if (westRatio <= 0.25 && westRatio > 0 && !this.lastCastleLowWest) {
				this.lastCastleLowWest = true;
				this.announce("Увага: Західний замок у критичному стані! Здоров'я менше 25%!", 'assertive');
			} else if (westRatio > 0.35) {
				this.lastCastleLowWest = false;
			}
		}

		// Enemy castle low health
		const eastCastle = sim.castles.east;
		if (eastCastle) {
			const eastRatio = eastCastle.hp / Math.max(1, eastCastle.maxHp);
			if (eastRatio <= 0.25 && eastRatio > 0 && !this.lastCastleLowEast) {
				this.lastCastleLowEast = true;
				this.announce("Ворожий замок майже знищено! Здоров'я менше 25%!", 'polite');
			} else if (eastRatio > 0.35) {
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
