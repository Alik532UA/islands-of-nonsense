import { storage } from './storage';
import { getLocale, setLocale, type Locale } from '$lib/i18n';

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

class SettingsService {
	#headerTitle = $state<string | null>(null);
	#headerBack = $state<(() => void) | null>(null);
	#sound = $state(storage.getJSON<boolean>('settings_sound_fx', true));
	#volume = $state(storage.getJSON<number>('settings_volume', 0.8));
	#locale = $state<Locale>(detectInitialLocale());

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

	setSound(enabled: boolean): void {
		this.#sound = enabled;
		storage.setJSON('settings_sound_fx', enabled);
	}

	setVolume(vol: number): void {
		this.#volume = vol;
		storage.setJSON('settings_volume', vol);
	}

	setLocale(loc: Locale): void {
		this.#locale = loc;
		setLocale(loc);
		storage.setJSON('settings_lang', loc);
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
