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

	/**
	 * Бойовий горн на початку матчу / раунду (середньовічний фанфар)
	 */
	public playHorn(): void {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const now = ctx.currentTime;
		const hornNotes = [
			{ f: 220, start: 0, dur: 0.25 },
			{ f: 277.18, start: 0.22, dur: 0.25 },
			{ f: 329.63, start: 0.44, dur: 0.25 },
			{ f: 440, start: 0.66, dur: 0.7 }
		];

		hornNotes.forEach(({ f, start, dur }) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = 'sawtooth';
			osc.frequency.setValueAtTime(f, now + start);

			gain.gain.setValueAtTime(this.volume * 0.4, now + start);
			gain.gain.exponentialRampToValueAtTime(0.01, now + start + dur);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(now + start);
			osc.stop(now + start + dur + 0.05);
		});
	}

	/**
	 * Звук голосового підтвердження / наказу робітнику (ПКМ)
	 */
	public playWorkerAck(): void {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = 'sine';
		osc.frequency.setValueAtTime(520, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.08);

		gain.gain.setValueAtTime(this.volume * 0.25, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start();
		osc.stop(ctx.currentTime + 0.11);
	}

	/**
	 * Глибокий вибуховий гуркіт облоги
	 */
	public playSiegeHit(): void {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = 'triangle';
		osc.frequency.setValueAtTime(80, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.3);

		gain.gain.setValueAtTime(this.volume * 0.5, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.32);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start();
		osc.stop(ctx.currentTime + 0.33);
	}

	/**
	 * Автентичний сигнал завершення будівництва (WC3 "Job's done!" / подвійний молот + мажорний передзвін)
	 */
	public playBuildingComplete(): void {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const now = ctx.currentTime;

		// 1. Подвійний металевий удар молота по ковадлу
		const strike1 = ctx.createOscillator();
		const strikeGain1 = ctx.createGain();
		strike1.type = 'triangle';
		strike1.frequency.setValueAtTime(580, now);
		strike1.frequency.exponentialRampToValueAtTime(280, now + 0.05);
		strikeGain1.gain.setValueAtTime(this.volume * 0.35, now);
		strikeGain1.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
		strike1.connect(strikeGain1);
		strikeGain1.connect(ctx.destination);
		strike1.start(now);
		strike1.stop(now + 0.06);

		const strike2 = ctx.createOscillator();
		const strikeGain2 = ctx.createGain();
		strike2.type = 'triangle';
		strike2.frequency.setValueAtTime(740, now + 0.07);
		strike2.frequency.exponentialRampToValueAtTime(360, now + 0.12);
		strikeGain2.gain.setValueAtTime(this.volume * 0.4, now + 0.07);
		strikeGain2.gain.exponentialRampToValueAtTime(0.01, now + 0.13);
		strike2.connect(strikeGain2);
		strikeGain2.connect(ctx.destination);
		strike2.start(now + 0.07);
		strike2.stop(now + 0.14);

		// 2. Урочистий гармонійний передзвін тризвуку (C5, E5, G5)
		const chord = [523.25, 659.25, 783.99];
		chord.forEach((freq, idx) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = 'sine';
			osc.frequency.setValueAtTime(freq, now + 0.12 + idx * 0.03);

			gain.gain.setValueAtTime(this.volume * 0.25, now + 0.12 + idx * 0.03);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12 + idx * 0.03 + 0.35);

			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(now + 0.12 + idx * 0.03);
			osc.stop(now + 0.12 + idx * 0.03 + 0.36);
		});
	}

	/**
	 * Автентична тривога нападу на цитадель (WC3 "Our castle is under attack!" бойовий горн)
	 */
	public playCastleUnderAttack(): void {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const now = ctx.currentTime;

		// Подвійний низький войовничий горн із резонансним фільтром
		const hornPulses = [
			{ freqStart: 220, freqEnd: 165, start: 0, dur: 0.28, vol: 0.5 },
			{ freqStart: 260, freqEnd: 185, start: 0.24, dur: 0.42, vol: 0.55 }
		];

		hornPulses.forEach(({ freqStart, freqEnd, start, dur, vol }) => {
			const osc = ctx.createOscillator();
			const filter = ctx.createBiquadFilter();
			const gain = ctx.createGain();

			osc.type = 'sawtooth';
			osc.frequency.setValueAtTime(freqStart, now + start);
			osc.frequency.exponentialRampToValueAtTime(freqEnd, now + start + dur);

			filter.type = 'lowpass';
			filter.frequency.setValueAtTime(950, now + start);
			filter.Q.setValueAtTime(3.5, now + start);

			gain.gain.setValueAtTime(this.volume * vol, now + start);
			gain.gain.exponentialRampToValueAtTime(0.01, now + start + dur);

			osc.connect(filter);
			filter.connect(gain);
			gain.connect(ctx.destination);

			osc.start(now + start);
			osc.stop(now + start + dur + 0.05);
		});
	}

	/**
	 * Гуркітливий рев боса / удар гонга появи легендарного юніта
	 */
	public playBossSpawn(): void {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const now = ctx.currentTime;

		// 1. Суб-басовий гул (55Hz -> 28Hz)
		const subOsc = ctx.createOscillator();
		const subGain = ctx.createGain();
		subOsc.type = 'sine';
		subOsc.frequency.setValueAtTime(55, now);
		subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.9);
		subGain.gain.setValueAtTime(this.volume * 0.6, now);
		subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
		subOsc.connect(subGain);
		subGain.connect(ctx.destination);
		subOsc.start(now);
		subOsc.stop(now + 1.0);

		// 2. Металевий передзвін важкого гонга
		const gongPitches = [110, 164.8, 220];
		gongPitches.forEach((freq) => {
			const gongOsc = ctx.createOscillator();
			const gongGain = ctx.createGain();
			gongOsc.type = 'triangle';
			gongOsc.frequency.setValueAtTime(freq, now);
			gongGain.gain.setValueAtTime(this.volume * 0.25, now);
			gongGain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
			gongOsc.connect(gongGain);
			gongGain.connect(ctx.destination);
			gongOsc.start(now);
			gongOsc.stop(now + 1.15);
		});

		// 3. Звірячий рокіт
		const roarOsc = ctx.createOscillator();
		const roarGain = ctx.createGain();
		roarOsc.type = 'sawtooth';
		roarOsc.frequency.setValueAtTime(160, now);
		roarOsc.frequency.exponentialRampToValueAtTime(45, now + 0.7);
		roarGain.gain.setValueAtTime(this.volume * 0.35, now);
		roarGain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
		roarOsc.connect(roarGain);
		roarGain.connect(ctx.destination);
		roarOsc.start(now);
		roarOsc.stop(now + 0.72);
	}

	/**
	 * Тріумфальний фанфар перемоги (WC3 Victory fanfare)
	 */
	public playVictory(): void {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const now = ctx.currentTime;
		const notes = [
			{ f: 293.66, start: 0, dur: 0.14 }, // D4
			{ f: 369.99, start: 0.12, dur: 0.14 }, // F#4
			{ f: 440.0, start: 0.24, dur: 0.16 }, // A4
			{ f: 587.33, start: 0.38, dur: 0.75 } // D5
		];

		notes.forEach(({ f, start, dur }) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = 'triangle';
			osc.frequency.setValueAtTime(f, now + start);

			gain.gain.setValueAtTime(this.volume * 0.45, now + start);
			gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(now + start);
			osc.stop(now + start + dur + 0.05);
		});
	}

	/**
	 * Скорботний сигнал поразки (WC3 Defeat cue)
	 */
	public playDefeat(): void {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const now = ctx.currentTime;
		const notes = [
			{ f: 220.0, start: 0, dur: 0.22 }, // A3
			{ f: 196.0, start: 0.2, dur: 0.22 }, // G3
			{ f: 174.61, start: 0.4, dur: 0.26 }, // F3
			{ f: 146.83, start: 0.62, dur: 0.8 } // D3
		];

		notes.forEach(({ f, start, dur }) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = 'sawtooth';
			osc.frequency.setValueAtTime(f, now + start);

			gain.gain.setValueAtTime(this.volume * 0.35, now + start);
			gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(now + start);
			osc.stop(now + start + dur + 0.05);
		});
	}

	/**
	 * Сигнал браку ресурсів або неможливої дії (WC3 "Not enough gold" / "Need more lumber" error buzz)
	 */
	public playErrorResource(): void {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const now = ctx.currentTime;
		const osc1 = ctx.createOscillator();
		const osc2 = ctx.createOscillator();
		const gain = ctx.createGain();

		osc1.type = 'sawtooth';
		osc2.type = 'square';
		osc1.frequency.setValueAtTime(130, now);
		osc2.frequency.setValueAtTime(138, now);

		gain.gain.setValueAtTime(this.volume * 0.35, now);
		gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

		osc1.connect(gain);
		osc2.connect(gain);
		gain.connect(ctx.destination);

		osc1.start(now);
		osc2.start(now);
		osc1.stop(now + 0.15);
		osc2.stop(now + 0.15);
	}

	/**
	 * Тривожне серцебиття при критичному рівні здоров'я замку (<30% HP)
	 */
	public playLowCastleHp(): void {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const now = ctx.currentTime;
		const beats = [
			{ f: 65, start: 0, dur: 0.1 },
			{ f: 58, start: 0.14, dur: 0.12 }
		];

		beats.forEach(({ f, start, dur }) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = 'sine';
			osc.frequency.setValueAtTime(f, now + start);
			osc.frequency.exponentialRampToValueAtTime(30, now + start + dur);

			gain.gain.setValueAtTime(this.volume * 0.45, now + start);
			gain.gain.exponentialRampToValueAtTime(0.01, now + start + dur);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(now + start);
			osc.stop(now + start + dur + 0.02);
		});
	}

	/**
	 * Звук вибору робітника
	 */
	public playWorkerSelect(): void {
		this.playWorkerAck();
	}
}

export const sound = new SoundService();
