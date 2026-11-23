import { storage } from './storage';
import { getLocale, setLocale, type Locale } from '$lib/i18n';
import { sound } from './audio';

export type UiScale = 0.85 | 1 | 1.15 | 1.3;

export const UI_SCALES: readonly UiScale[] = [0.85, 1, 1.15, 1.3] as const;

function detectInitialLocale(): Locale {
	if (typeof window !== 'undefined') {
		const param = new URLSearchParams(window.location.search).get('lang');
		if (param === 'uk' || param === 'en') {
			setLocale(param);
			return param;
		}
	}
	const saved = storage.getJSON<Locale>('settings_lang', 'uk');
	if (saved === 'uk' || saved === 'en') {
		setLocale(saved);
		return saved;
	}
	return getLocale();
}

function detectInitialUiScale(): UiScale {
	const saved = storage.getJSON<UiScale>('settings_ui_scale', 1);
	if (UI_SCALES.includes(saved)) {
		return saved;
	}
	return 1;
}

function applyUiScale(scale: UiScale): void {
	if (typeof document !== 'undefined') {
		document.documentElement.style.setProperty('--ui-scale', String(scale));
	}
}

class SettingsService {
	#headerTitle = $state<string | null>(null);
	#headerBack = $state<(() => void) | null>(null);
	#sound = $state(storage.getJSON<boolean>('settings_sound_fx', true));
	#volume = $state(storage.getJSON<number>('settings_volume', 0.8));
	#locale = $state<Locale>(detectInitialLocale());
	#uiScale = $state<UiScale>(detectInitialUiScale());
	#isSettingsOpen = $state(false);

	constructor() {
		// Synchronize procedural sound engine with saved state
		sound.setEnabled(this.#sound);
		sound.setVolume(this.#volume);
		applyUiScale(this.#uiScale);
	}

	get headerTitle(): string | null {
		return this.#headerTitle;
	}

	get headerBack(): (() => void) | null {
		return this.#headerBack;
	}

	get sound(): boolean {
		return this.#sound;
	}

	get volume(): number {
		return this.#volume;
	}

	get locale(): Locale {
		return this.#locale;
	}

	get uiScale(): UiScale {
		return this.#uiScale;
	}

	get isSettingsOpen(): boolean {
		return this.#isSettingsOpen;
	}

	setSound(enabled: boolean): void {
		this.#sound = enabled;
		storage.setJSON('settings_sound_fx', enabled);
		sound.setEnabled(enabled);
	}

	setVolume(vol: number): void {
		const clamped = Math.max(0, Math.min(1, vol));
		this.#volume = clamped;
		storage.setJSON('settings_volume', clamped);
		sound.setVolume(clamped);
	}

	setLocale(loc: Locale): void {
		this.#locale = loc;
		setLocale(loc);
		storage.setJSON('settings_lang', loc);
	}

	setUiScale(scale: UiScale): void {
		this.#uiScale = scale;
		storage.setJSON('settings_ui_scale', scale);
		applyUiScale(scale);
	}

	openSettings(): void {
		this.#isSettingsOpen = true;
	}

	closeSettings(): void {
		this.#isSettingsOpen = false;
	}

	toggleSettings(): void {
		this.#isSettingsOpen = !this.#isSettingsOpen;
	}

	claimHeader(title: string, back: (() => void) | null = null): () => void {
		const prevTitle = this.#headerTitle;
		const prevBack = this.#headerBack;
		this.#headerTitle = title;
		this.#headerBack = back;
		return () => {
			this.#headerTitle = prevTitle;
			this.#headerBack = prevBack;
		};
	}
}

export const settings = new SettingsService();
