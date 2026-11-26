import { untrack } from 'svelte';
import { storage } from './storage';
import { bindReactiveLocale, getLocale, setLocale, type Locale } from '$lib/i18n';
import { sound, music, SOUND_PACKS, MUSIC_TRACKS, type SoundPack, type MusicTrack } from './audio';
export { SOUND_PACKS, MUSIC_TRACKS, type SoundPack, type MusicTrack };
export { contrast, luminance, parseColor, AA_NORMAL, AA_LARGE } from '$lib/utils/contrast';

export type UiScale = 0.85 | 1 | 1.15 | 1.3;
export const UI_SCALES: readonly UiScale[] = [0.85, 1, 1.15, 1.3] as const;

export type AppTheme = 'dark-gray' | 'light-gray' | 'orange' | 'green';
export const APP_THEMES: readonly AppTheme[] = [
	'dark-gray',
	'light-gray',
	'orange',
	'green'
] as const;

export type GraphicsStyle = '2.5d' | 'hd-webp';
export const GRAPHICS_STYLES: readonly GraphicsStyle[] = ['2.5d', 'hd-webp'] as const;

export type BuildQueueMode = 'convenient' | 'classic';
export const BUILD_QUEUE_MODES: readonly BuildQueueMode[] = ['convenient', 'classic'] as const;

export type ControlPreset = 'islands-of-nonsense' | 'warcraft3';
export const CONTROL_PRESETS: readonly ControlPreset[] = [
	'islands-of-nonsense',
	'warcraft3'
] as const;

export type UiLayoutPreset = 'islands-of-nonsense' | 'warcraft3';
export const UI_LAYOUT_PRESETS: readonly UiLayoutPreset[] = [
	'islands-of-nonsense',
	'warcraft3'
] as const;

function detectInitialControlPreset(): ControlPreset {
	const saved = storage.getJSON<ControlPreset>('settings_control_preset', 'islands-of-nonsense');
	if (CONTROL_PRESETS.includes(saved)) {
		return saved;
	}
	return 'islands-of-nonsense';
}

function detectInitialUiLayoutPreset(): UiLayoutPreset {
	const saved = storage.getJSON<UiLayoutPreset>('settings_ui_layout_preset', 'islands-of-nonsense');
	if (UI_LAYOUT_PRESETS.includes(saved)) {
		return saved;
	}
	return 'islands-of-nonsense';
}

function detectInitialBuildQueueMode(): BuildQueueMode {
	const saved = storage.getJSON<BuildQueueMode>('settings_build_queue_mode', 'convenient');
	if (BUILD_QUEUE_MODES.includes(saved)) {
		return saved;
	}
	return 'convenient';
}

function detectInitialGraphicsStyle(): GraphicsStyle {
	const saved = storage.getJSON<GraphicsStyle>('settings_graphics_style', '2.5d');
	if (GRAPHICS_STYLES.includes(saved)) {
		return saved;
	}
	return '2.5d';
}

function detectInitialSoundPack(): SoundPack {
	const saved = storage.getJSON<SoundPack>('settings_sound_pack', 'fantasy-rpg');
	if (SOUND_PACKS.includes(saved)) {
		return saved;
	}
	return 'fantasy-rpg';
}

function detectInitialMusicTrack(): MusicTrack {
	const saved = storage.getJSON<MusicTrack>('settings_music_track', 'auto');
	if (MUSIC_TRACKS.includes(saved)) {
		return saved;
	}
	return 'auto';
}

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

function detectInitialTheme(): AppTheme {
	const saved = storage.getJSON<AppTheme>('settings_theme', 'dark-gray');
	if (APP_THEMES.includes(saved)) {
		return saved;
	}
	return 'dark-gray';
}

function applyTheme(theme: AppTheme): void {
	if (typeof document !== 'undefined') {
		document.documentElement.setAttribute('data-theme', theme);
		const isDark = theme === 'dark-gray' || theme === 'orange';
		if (isDark) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}
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
	#volume = $state(storage.getJSON<number>('settings_volume', 0.07));
	#soundPack = $state<SoundPack>(detectInitialSoundPack());
	#musicEnabled = $state(storage.getJSON<boolean>('settings_music_enabled', true));
	#musicVolume = $state(storage.getJSON<number>('settings_music_volume', 0.02));
	#musicTrack = $state<MusicTrack>(detectInitialMusicTrack());
	#locale = $state<Locale>(detectInitialLocale());
	#uiScale = $state<UiScale>(detectInitialUiScale());
	#theme = $state<AppTheme>(detectInitialTheme());
	#graphicsStyle = $state<GraphicsStyle>(detectInitialGraphicsStyle());
	#buildQueueMode = $state<BuildQueueMode>(detectInitialBuildQueueMode());
	#controlPreset = $state<ControlPreset>(detectInitialControlPreset());
	#uiLayoutPreset = $state<UiLayoutPreset>(detectInitialUiLayoutPreset());
	#isSettingsOpen = $state(false);

	constructor() {
		// Synchronize procedural sound engine & reactive i18n with saved state
		sound.setEnabled(this.#sound);
		sound.setVolume(this.#volume);
		sound.setPack(this.#soundPack);
		music.setEnabled(this.#musicEnabled);
		music.setVolume(this.#musicVolume);
		music.setTrack(this.#musicTrack);
		applyUiScale(this.#uiScale);
		applyTheme(this.#theme);
		bindReactiveLocale(
			() => this.#locale,
			(loc) => {
				if (this.#locale !== loc) this.#locale = loc;
			}
		);
		if (typeof document !== 'undefined') {
			document.documentElement.lang = this.#locale;
		}
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

	get soundPack(): SoundPack {
		return this.#soundPack;
	}

	get musicEnabled(): boolean {
		return this.#musicEnabled;
	}

	get musicVolume(): number {
		return this.#musicVolume;
	}

	get musicTrack(): MusicTrack {
		return this.#musicTrack;
	}

	get locale(): Locale {
		return this.#locale;
	}

	get uiScale(): UiScale {
		return this.#uiScale;
	}

	get theme(): AppTheme {
		return this.#theme;
	}

	get graphicsStyle(): GraphicsStyle {
		return this.#graphicsStyle;
	}

	get buildQueueMode(): BuildQueueMode {
		return this.#buildQueueMode;
	}

	get controlPreset(): ControlPreset {
		return this.#controlPreset;
	}

	get uiLayoutPreset(): UiLayoutPreset {
		return this.#uiLayoutPreset;
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

	setSoundPack(pack: SoundPack): void {
		if (SOUND_PACKS.includes(pack)) {
			this.#soundPack = pack;
			storage.setJSON('settings_sound_pack', pack);
			sound.setPack(pack);
		}
	}

	setMusicEnabled(enabled: boolean): void {
		this.#musicEnabled = enabled;
		storage.setJSON('settings_music_enabled', enabled);
		music.setEnabled(enabled);
	}

	setMusicVolume(vol: number): void {
		const clamped = Math.max(0, Math.min(1, vol));
		this.#musicVolume = clamped;
		storage.setJSON('settings_music_volume', clamped);
		music.setVolume(clamped);
	}

	setMusicTrack(track: MusicTrack): void {
		if (MUSIC_TRACKS.includes(track)) {
			this.#musicTrack = track;
			storage.setJSON('settings_music_track', track);
			music.setTrack(track);
		}
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

	setTheme(theme: AppTheme): void {
		this.#theme = theme;
		storage.setJSON('settings_theme', theme);
		applyTheme(theme);
	}

	setGraphicsStyle(style: GraphicsStyle): void {
		if (GRAPHICS_STYLES.includes(style)) {
			this.#graphicsStyle = style;
			storage.setJSON('settings_graphics_style', style);
		}
	}

	setBuildQueueMode(mode: BuildQueueMode): void {
		if (BUILD_QUEUE_MODES.includes(mode)) {
			this.#buildQueueMode = mode;
			storage.setJSON('settings_build_queue_mode', mode);
		}
	}

	setControlPreset(preset: ControlPreset): void {
		if (CONTROL_PRESETS.includes(preset)) {
			this.#controlPreset = preset;
			storage.setJSON('settings_control_preset', preset);
		}
	}

	setUiLayoutPreset(preset: UiLayoutPreset): void {
		if (UI_LAYOUT_PRESETS.includes(preset)) {
			this.#uiLayoutPreset = preset;
			storage.setJSON('settings_ui_layout_preset', preset);
		}
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
		return untrack(() => {
			const prevTitle = this.#headerTitle;
			const prevBack = this.#headerBack;
			if (this.#headerTitle !== title) {
				this.#headerTitle = title;
			}
			this.#headerBack = back;
			return () => {
				untrack(() => {
					this.#headerTitle = prevTitle;
					this.#headerBack = prevBack;
				});
			};
		});
	}
}

export const settings = new SettingsService();
