import { storage } from './storage';
import { getLocale, setLocale, type Locale } from '$lib/i18n';

class SettingsService {
	#headerTitle = $state<string | null>(null);
	#sound = $state(storage.getJSON<boolean>('settings_sound_fx', true));
	#volume = $state(storage.getJSON<number>('settings_volume', 0.8));
	#locale = $state<Locale>(getLocale());

	get headerTitle(): string | null {
		return this.#headerTitle;
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

	claimHeader(title: string): () => void {
		const prev = this.#headerTitle;
		this.#headerTitle = title;
		return () => {
			this.#headerTitle = prev;
		};
	}
}

export const settings = new SettingsService();
