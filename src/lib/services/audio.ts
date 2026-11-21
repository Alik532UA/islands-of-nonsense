/**
 * Procedural Web Audio Sound Synthesizer (ADR 0002 style).
 * Generates all game sound effects procedurally with zero external asset latency.
 */
export class SoundService {
	private ctx: AudioContext | null = null;
	private enabled = true;
	private volume = 0.5;

	constructor() {
		// AudioContext will be initialized on user interaction
	}

	private getContext(): AudioContext | null {
		if (typeof window === 'undefined') return null;
		if (!this.ctx) {
			const AudioCtx =
				window.AudioContext ||
				(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
			if (AudioCtx) {
				this.ctx = new AudioCtx();
			}
		}
		if (this.ctx && this.ctx.state === 'suspended') {
			this.ctx.resume().catch(() => {});
		}
		return this.ctx;
	}

	public setVolume(val: number): void {
		this.volume = Math.max(0, Math.min(1, val));
	}

	public setEnabled(flag: boolean): void {
		this.enabled = flag;
	}

	public isEnabled(): boolean {
		return this.enabled;
	}

	public getVolume(): number {
		return this.volume;
	}

	/**
	 * Звук будівництва (металевий молот)
	 */
	public playBuild(): void {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = 'triangle';
		osc.frequency.setValueAtTime(320, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.12);

		gain.gain.setValueAtTime(this.volume * 0.4, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start();
		osc.stop(ctx.currentTime + 0.13);
	}

	/**
	 * Звук покращення будівлі / кузні (дзвонкий акорд)
	 */
	public playUpgrade(): void {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = 'triangle';
		osc.frequency.setValueAtTime(440, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18);

		gain.gain.setValueAtTime(this.volume * 0.35, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start();
		osc.stop(ctx.currentTime + 0.19);
	}

	/**
	 * Звук монети / доходу
	 */
	public playCoin(): void {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = 'sine';
		osc.frequency.setValueAtTime(987, ctx.currentTime);
		osc.frequency.setValueAtTime(1318, ctx.currentTime + 0.08);

		gain.gain.setValueAtTime(this.volume * 0.25, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start();
		osc.stop(ctx.currentTime + 0.26);
	}

	/**
	 * Звук атаки / влучання
	 */
	public playHit(): void {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(180, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.08);

		gain.gain.setValueAtTime(this.volume * 0.3, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start();
		osc.stop(ctx.currentTime + 0.09);
	}

	/**
	 * Звук удару мечем (ближній бій)
	 */
	public playSwordClash(): void {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = 'triangle';
		osc.frequency.setValueAtTime(400, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.06);

		gain.gain.setValueAtTime(this.volume * 0.25, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.07);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start();
		osc.stop(ctx.currentTime + 0.07);
	}

	/**
	 * Звук пострілу з лука / колюча атака
	 */
	public playBowShot(): void {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = 'sine';
		osc.frequency.setValueAtTime(600, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.05);

		gain.gain.setValueAtTime(this.volume * 0.2, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start();
		osc.stop(ctx.currentTime + 0.06);
	}

	/**
	 * Звук магічного закляття / вибуху
	 */
	public playMagicCast(): void {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = 'sine';
		osc.frequency.setValueAtTime(280, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 0.12);

		gain.gain.setValueAtTime(this.volume * 0.25, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start();
		osc.stop(ctx.currentTime + 0.15);
	}

	/**
	 * Звук загибелі бійця
	 */
	public playUnitDeath(): void {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(120, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.15);

		gain.gain.setValueAtTime(this.volume * 0.25, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start();
		osc.stop(ctx.currentTime + 0.17);
	}

	/**
	 * Звук лагодження будівлі
	 */
	public playRepair(): void {
		this.playBuild();
	}

	/**
	 * Звук руйнування будівлі (каменепад)
	 */
	public playBuildingDestroyed(): void {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(90, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 0.35);

		gain.gain.setValueAtTime(this.volume * 0.45, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start();
		osc.stop(ctx.currentTime + 0.42);
	}

	/**
	 * Звук апгрейду кузні
	 */
	public playForgeUpgrade(): void {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const now = ctx.currentTime;
		const notes = [440, 554, 659, 880];
		notes.forEach((freq, idx) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = 'sine';
			osc.frequency.setValueAtTime(freq, now + idx * 0.07);

			gain.gain.setValueAtTime(this.volume * 0.2, now + idx * 0.07);
			gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.07 + 0.15);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(now + idx * 0.07);
			osc.stop(now + idx * 0.07 + 0.16);
		});
	}

	/**
	 * Звук рятівного удару замку (вибухова артилерія)
	 */
	public playRescueStrike(): void {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(140, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.4);

		gain.gain.setValueAtTime(this.volume * 0.5, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start();
		osc.stop(ctx.currentTime + 0.46);
	}
}

export const sound = new SoundService();
