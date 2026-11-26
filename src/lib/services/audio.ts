import { resolve } from '$app/paths';

function audioUrl(path: string): string {
	return `${resolve('/').replace(/\/$/, '')}${path}`;
}

export type SoundPack = '8-bit' | 'synth-pro' | 'fantasy-rpg' | 'dark-siege';
export const SOUND_PACKS: readonly SoundPack[] = [
	'8-bit',
	'synth-pro',
	'fantasy-rpg',
	'dark-siege'
] as const;

export type MusicTrack = 'auto' | 'minstrel' | 'exploration' | 'tavern';
export const MUSIC_TRACKS: readonly MusicTrack[] = [
	'auto',
	'minstrel',
	'exploration',
	'tavern'
] as const;

const WORKER_VOICE_SLUG_MAP: Record<string, string> = {
	Альянс: 'human',
	Люди: 'human',
	Північ: 'north',
	Орки: 'orc',
	Нежить: 'undead',
	Порча: 'undead',
	Ельфи: 'elf',
	'Нічні ельфи': 'elf',
	Демони: 'demon',
	Хаос: 'demon',
	Наги: 'naga',
	Тролі: 'troll',
	Тварини: 'beast',
	Елементалі: 'elemental',
	Небожителі: 'celestial',
	Техніки: 'mech',
	Збирачі: 'mech'
};

export function getWorkerVoiceSlug(race: string): string {
	return WORKER_VOICE_SLUG_MAP[race] ?? 'human';
}

export const WORKER_VOICE_VARIANTS = 5;
export const UNIT_VOICE_VARIANTS = 3;
export const WORKER_VOICE_COOLDOWN_MS = 60_000;

type SfxSampleKey =
	| 'build'
	| 'upgrade'
	| 'coin'
	| 'hit'
	| 'sword'
	| 'bow'
	| 'magic'
	| 'death'
	| 'destroy'
	| 'complete'
	| 'error'
	| 'horn';

const SAMPLE_KEYS: readonly SfxSampleKey[] = [
	'build',
	'upgrade',
	'coin',
	'hit',
	'sword',
	'bow',
	'magic',
	'death',
	'destroy',
	'complete',
	'error',
	'horn'
] as const;

/**
 * Procedural Web Audio Sound Synthesizer (ADR 0002 style) + Sample Pack Player.
 * Supports 8-bit classic synthesis, Synth Pro, and CC0 Fantasy/Siege sample packs.
 */
export class SoundService {
	private ctx: AudioContext | null = null;
	private enabled = true;
	private volume = 0.5;
	private pack: SoundPack = '8-bit';
	private sampleCache = new Map<string, AudioBuffer | 'loading' | 'failed'>();
	private voiceCache = new Map<string, AudioBuffer | 'loading' | 'failed'>();
	private activeVoiceSource: AudioBufferSourceNode | null = null;
	private pendingVoiceUrl: string | null = null;
	private lastVoicePlayedAt = 0;
	private lastWorkerVoiceAt = 0;
	private lastWorkerVariantBySlug = new Map<string, number>();
	private lastUnitVariantById = new Map<string, number>();

	constructor() {
		// AudioContext will be initialized on user interaction
	}

	public setPack(pack: SoundPack): void {
		if (!SOUND_PACKS.includes(pack)) return;
		this.pack = pack;
		if (pack === 'fantasy-rpg' || pack === 'dark-siege') {
			this.preloadPack(pack);
		}
	}

	public getPack(): SoundPack {
		return this.pack;
	}

	private preloadPack(pack: 'fantasy-rpg' | 'dark-siege'): void {
		if (typeof window === 'undefined' || typeof fetch !== 'function') return;
		for (const key of SAMPLE_KEYS) {
			void this.loadSample(pack, key);
		}
	}

	private async loadSample(pack: 'fantasy-rpg' | 'dark-siege', key: SfxSampleKey): Promise<void> {
		const cacheKey = `${pack}:${key}`;
		if (this.sampleCache.has(cacheKey)) return;
		this.sampleCache.set(cacheKey, 'loading');
		try {
			const res = await fetch(audioUrl(`/audio/sfx/${pack}/${key}.mp3`));
			if (!res.ok) {
				this.sampleCache.set(cacheKey, 'failed');
				return;
			}
			const arr = await res.arrayBuffer();
			const ctx = this.getContext();
			if (!ctx) {
				this.sampleCache.delete(cacheKey);
				return;
			}
			const decoded = await ctx.decodeAudioData(arr);
			this.sampleCache.set(cacheKey, decoded);
		} catch {
			this.sampleCache.set(cacheKey, 'failed');
		}
	}

	private playSampleOrSynthPro(
		sampleKey: SfxSampleKey,
		synthProFn: () => void,
		gainScale = 0.72
	): boolean {
		if (this.pack === '8-bit') return false;
		if (this.pack === 'synth-pro') {
			synthProFn();
			return true;
		}
		const cacheKey = `${this.pack}:${sampleKey}`;
		const cached = this.sampleCache.get(cacheKey);
		if (cached && cached !== 'loading' && cached !== 'failed') {
			const ctx = this.getContext();
			if (ctx) {
				const src = ctx.createBufferSource();
				src.buffer = cached;
				const gain = ctx.createGain();
				gain.gain.setValueAtTime(Math.min(1, this.volume * gainScale), ctx.currentTime);
				src.connect(gain);
				gain.connect(ctx.destination);
				src.start();
				return true;
			}
		}
		if (!cached) {
			void this.loadSample(this.pack, sampleKey);
		}
		synthProFn();
		return true;
	}

	private playSynthProTone(
		freqStart: number,
		freqEnd: number,
		duration: number,
		type: OscillatorType,
		gainScale = 0.32
	): void {
		const ctx = this.getContext();
		if (!ctx) return;
		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(freqStart, now);
		osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
		gain.gain.setValueAtTime(this.volume * gainScale, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
		if (typeof ctx.createBiquadFilter === 'function') {
			const filter = ctx.createBiquadFilter();
			filter.type = 'lowpass';
			filter.frequency.setValueAtTime(2400, now);
			osc.connect(filter);
			filter.connect(gain);
		} else {
			osc.connect(gain);
		}
		gain.connect(ctx.destination);
		osc.start(now);
		osc.stop(now + duration + 0.02);
	}

	private playSynthProNoise(
		duration: number,
		filterFreq: number,
		filterType: BiquadFilterType,
		gainScale = 0.28
	): void {
		const ctx = this.getContext();
		if (!ctx || typeof ctx.createBuffer !== 'function') return;
		const now = ctx.currentTime;
		const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
		const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = Math.random() * 2 - 1;
		}
		const src = ctx.createBufferSource();
		src.buffer = buffer;
		const gain = ctx.createGain();
		gain.gain.setValueAtTime(this.volume * gainScale, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
		if (typeof ctx.createBiquadFilter === 'function') {
			const filter = ctx.createBiquadFilter();
			filter.type = filterType;
			filter.frequency.setValueAtTime(filterFreq, now);
			src.connect(filter);
			filter.connect(gain);
		} else {
			src.connect(gain);
		}
		gain.connect(ctx.destination);
		src.start(now);
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
		if (!flag) {
			this.stopActiveVoice();
		}
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
		if (
			this.playSampleOrSynthPro('build', () => {
				this.playSynthProNoise(0.09, 1400, 'bandpass', 0.35);
				this.playSynthProTone(210, 95, 0.14, 'triangle', 0.38);
			})
		)
			return;
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
		if (
			this.playSampleOrSynthPro('upgrade', () => {
				this.playSynthProTone(440, 660, 0.18, 'triangle', 0.28);
				this.playSynthProTone(660, 880, 0.24, 'sine', 0.25);
			})
		)
			return;
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
		if (
			this.playSampleOrSynthPro('coin', () => {
				this.playSynthProTone(1180, 1480, 0.12, 'sine', 0.24);
				this.playSynthProTone(1760, 1760, 0.16, 'triangle', 0.18);
			})
		)
			return;
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
		if (
			this.playSampleOrSynthPro('hit', () => {
				this.playSynthProNoise(0.07, 900, 'lowpass', 0.3);
				this.playSynthProTone(150, 55, 0.09, 'triangle', 0.3);
			})
		)
			return;
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
		if (
			this.playSampleOrSynthPro('sword', () => {
				this.playSynthProNoise(0.08, 3200, 'bandpass', 0.3);
				this.playSynthProTone(920, 480, 0.1, 'triangle', 0.22);
			})
		)
			return;
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
		if (
			this.playSampleOrSynthPro('bow', () => {
				this.playSynthProNoise(0.09, 2600, 'highpass', 0.24);
				this.playSynthProTone(520, 190, 0.09, 'sine', 0.18);
			})
		)
			return;
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
		if (
			this.playSampleOrSynthPro('magic', () => {
				this.playSynthProTone(540, 1080, 0.22, 'sine', 0.24);
				this.playSynthProNoise(0.18, 1800, 'bandpass', 0.16);
			})
		)
			return;
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
		if (
			this.playSampleOrSynthPro('death', () => {
				this.playSynthProNoise(0.14, 700, 'lowpass', 0.26);
				this.playSynthProTone(180, 52, 0.18, 'sawtooth', 0.2);
			})
		)
			return;
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
		if (
			this.playSampleOrSynthPro('destroy', () => {
				this.playSynthProNoise(0.32, 480, 'lowpass', 0.42);
				this.playSynthProTone(120, 34, 0.34, 'triangle', 0.35);
			})
		)
			return;
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
		if (
			this.playSampleOrSynthPro('horn', () => {
				this.playSynthProTone(220, 293.66, 0.36, 'sawtooth', 0.24);
				this.playSynthProTone(110, 146.83, 0.42, 'triangle', 0.26);
			})
		)
			return;
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
		if (
			this.playSampleOrSynthPro('complete', () => {
				this.playSynthProTone(392, 523.25, 0.18, 'triangle', 0.26);
				this.playSynthProTone(523.25, 783.99, 0.24, 'sine', 0.24);
			})
		)
			return;
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
		if (
			this.playSampleOrSynthPro('error', () => {
				this.playSynthProTone(190, 120, 0.16, 'sawtooth', 0.22);
			})
		)
			return;
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

	private stopActiveVoice(): void {
		this.pendingVoiceUrl = null;
		if (this.activeVoiceSource) {
			try {
				this.activeVoiceSource.stop();
			} catch {
				// Ignore already stopped source
			}
			this.activeVoiceSource = null;
		}
	}

	private playVoiceBuffer(buf: AudioBuffer): void {
		if (!this.enabled || this.volume <= 0) return;
		const ctx = this.getContext();
		if (!ctx) return;

		this.stopActiveVoice();
		const src = ctx.createBufferSource();
		src.buffer = buf;
		const gain = ctx.createGain();
		gain.gain.setValueAtTime(Math.min(1, this.volume * 1.4), ctx.currentTime);
		src.connect(gain);
		gain.connect(ctx.destination);
		src.onended = () => {
			if (this.activeVoiceSource === src) {
				this.activeVoiceSource = null;
			}
		};
		this.activeVoiceSource = src;
		src.start();
	}

	private async loadAndPlayVoice(urlPath: string): Promise<void> {
		if (typeof window === 'undefined' || typeof fetch !== 'function') return;
		this.voiceCache.set(urlPath, 'loading');
		try {
			const res = await fetch(audioUrl(urlPath));
			if (!res.ok) {
				this.voiceCache.set(urlPath, 'failed');
				return;
			}
			const arr = await res.arrayBuffer();
			const ctx = this.getContext();
			if (!ctx) {
				this.voiceCache.delete(urlPath);
				return;
			}
			const decoded = await ctx.decodeAudioData(arr);
			this.voiceCache.set(urlPath, decoded);
			if (this.pendingVoiceUrl === urlPath && this.enabled && this.volume > 0) {
				this.playVoiceBuffer(decoded);
			}
		} catch {
			this.voiceCache.set(urlPath, 'failed');
		}
	}

	private playVoiceUrl(urlPath: string): void {
		if (!this.enabled || this.volume <= 0) return;
		const now = Date.now();
		if (now - this.lastVoicePlayedAt < 450) return;
		this.lastVoicePlayedAt = now;
		this.pendingVoiceUrl = urlPath;

		const cached = this.voiceCache.get(urlPath);
		if (cached && cached !== 'loading' && cached !== 'failed') {
			this.playVoiceBuffer(cached);
			return;
		}
		if (!cached) {
			void this.loadAndPlayVoice(urlPath);
		}
	}

	/**
	 * Озвучена репліка робітника певної раси (вибір або наказ) з кулдауном 1 хв
	 * та випадковим вибором з 5 варіантів без повторів поспіль.
	 */
	public playWorkerVoice(race: string): void {
		if (!this.enabled || this.volume <= 0) return;
		const now = Date.now();
		if (this.lastWorkerVoiceAt > 0 && now - this.lastWorkerVoiceAt < WORKER_VOICE_COOLDOWN_MS) {
			return;
		}
		const slug = getWorkerVoiceSlug(race);
		const prev = this.lastWorkerVariantBySlug.get(slug);
		let variant = Math.floor(Math.random() * WORKER_VOICE_VARIANTS) + 1;
		if (WORKER_VOICE_VARIANTS > 1 && variant === prev) {
			variant = (variant % WORKER_VOICE_VARIANTS) + 1;
		}
		this.lastWorkerVariantBySlug.set(slug, variant);
		this.lastWorkerVoiceAt = now;
		this.playVoiceUrl(`/audio/voices/workers/${slug}_${variant}.mp3`);
	}

	/**
	 * Озвучена репліка юніта за його defId (при виборі на арені),
	 * випадковий вибір із 3 унікальних варіантів без повторів поспіль.
	 */
	public playUnitVoice(unitId: string): void {
		if (!unitId || !this.enabled || this.volume <= 0) return;
		const prev = this.lastUnitVariantById.get(unitId);
		let variant = Math.floor(Math.random() * UNIT_VOICE_VARIANTS) + 1;
		if (UNIT_VOICE_VARIANTS > 1 && variant === prev) {
			variant = (variant % UNIT_VOICE_VARIANTS) + 1;
		}
		this.lastUnitVariantById.set(unitId, variant);
		this.playVoiceUrl(`/audio/voices/units/${unitId}_${variant}.mp3`);
	}
}

export const sound = new SoundService();

const MUSIC_FILE_MAP: Record<Exclude<MusicTrack, 'auto'>, string> = {
	minstrel: 'medieval_minstrel.mp3',
	exploration: 'medieval_exploration.mp3',
	tavern: 'medieval_tavern.mp3'
};

/**
 * Background medieval music player with independent enable/volume/track controls
 * and automatic unlock on first user interaction.
 */
export class MusicService {
	private audio: HTMLAudioElement | null = null;
	private enabled = true;
	private volume = 0.02;
	private track: MusicTrack = 'auto';
	private scene: 'menu' | 'battle' = 'menu';
	private currentFile: string | null = null;
	private unlockBound = false;

	private bindUnlock(): void {
		if (this.unlockBound || typeof window === 'undefined') return;
		this.unlockBound = true;
		const resume = () => {
			if (this.enabled && this.audio && this.audio.paused) {
				this.audio.play().catch(() => {});
			}
		};
		window.addEventListener('pointerdown', resume, { passive: true });
		window.addEventListener('keydown', resume, { passive: true });
	}

	private resolveFile(): string {
		if (this.track !== 'auto') {
			return MUSIC_FILE_MAP[this.track];
		}
		return this.scene === 'battle' ? MUSIC_FILE_MAP.exploration : MUSIC_FILE_MAP.minstrel;
	}

	private syncPlayback(): void {
		if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
		this.bindUnlock();

		if (!this.enabled || this.volume <= 0) {
			if (this.audio && !this.audio.paused) {
				this.audio.pause();
			}
			return;
		}

		const nextFile = this.resolveFile();
		const nextSrc = audioUrl(`/audio/music/${nextFile}`);
		if (!this.audio || this.currentFile !== nextFile) {
			if (this.audio) {
				this.audio.pause();
			}
			this.audio = new Audio(nextSrc);
			this.audio.loop = true;
			this.currentFile = nextFile;
		}
		this.audio.volume = Math.max(0, Math.min(1, this.volume * 0.45));
		if (this.audio.paused) {
			this.audio.play().catch(() => {});
		}
	}

	public setEnabled(flag: boolean): void {
		this.enabled = flag;
		this.syncPlayback();
	}

	public setVolume(val: number): void {
		this.volume = Math.max(0, Math.min(1, val));
		if (this.audio) {
			this.audio.volume = Math.max(0, Math.min(1, this.volume * 0.45));
		}
		this.syncPlayback();
	}

	public setTrack(track: MusicTrack): void {
		if (!MUSIC_TRACKS.includes(track)) return;
		this.track = track;
		this.syncPlayback();
	}

	public setScene(scene: 'menu' | 'battle'): void {
		if (this.scene === scene) return;
		this.scene = scene;
		if (this.track === 'auto') {
			this.syncPlayback();
		}
	}

	public isEnabled(): boolean {
		return this.enabled;
	}

	public getVolume(): number {
		return this.volume;
	}

	public getTrack(): MusicTrack {
		return this.track;
	}
}

export const music = new MusicService();
