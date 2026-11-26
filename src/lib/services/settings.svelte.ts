import { untrack } from 'svelte';
import { resolve } from '$app/paths';
import { storage } from './storage';
import { formatRaceName } from '$lib/engine/gameData';
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

export const RACE_CURSORS = [
	'human',
	'orc',
	'undead',
	'elf',
	'demon',
	'north',
	'celestial',
	'troll',
	'elemental',
	'beast',
	'naga',
	'mech'
] as const;
export type RaceCursor = (typeof RACE_CURSORS)[number];
export type CursorStyle = 'adaptive' | 'random' | 'default' | RaceCursor;
export const CURSOR_STYLES: readonly CursorStyle[] = [
	'adaptive',
	'random',
	'default',
	...RACE_CURSORS
] as const;

const RACE_TO_CURSOR_SLUG: Record<string, RaceCursor> = {
	Альянс: 'human',
	Люди: 'human',
	Орки: 'orc',
	Нежить: 'undead',
	Порча: 'undead',
	Ельфи: 'elf',
	'Нічні ельфи': 'elf',
	Демони: 'demon',
	Хаос: 'demon',
	Північ: 'north',
	Небожителі: 'celestial',
	Тролі: 'troll',
	Елементалі: 'elemental',
	Тварини: 'beast',
	Наги: 'naga',
	Техніки: 'mech',
	Збирачі: 'mech'
};

function detectInitialCursorStyle(): CursorStyle {
	const saved = storage.getJSON<CursorStyle>('settings_cursor_style', 'adaptive');
	if (CURSOR_STYLES.includes(saved)) {
		return saved;
	}
	return 'adaptive';
}

function resolveActiveCursor(
	style: CursorStyle,
	adaptiveRaceSlug: RaceCursor | null = null
): RaceCursor | 'default' {
	if (style === 'adaptive') {
		return adaptiveRaceSlug ?? RACE_CURSORS[Math.floor(Math.random() * RACE_CURSORS.length)];
	}
	if (style === 'random') {
		return RACE_CURSORS[Math.floor(Math.random() * RACE_CURSORS.length)];
	}
	return style;
}

function applyCursorStyle(resolved: RaceCursor | 'default'): void {
	if (typeof document === 'undefined') return;
	if (resolved === 'default') {
		document.documentElement.removeAttribute('data-custom-cursor');
		document.documentElement.style.removeProperty('--game-cursor');
		return;
	}
	const base = resolve('/').replace(/\/$/, '');
	document.documentElement.setAttribute('data-custom-cursor', resolved);
	document.documentElement.style.setProperty(
		'--game-cursor',
		`url('${base}/cursors/${resolved}.svg') 4 2, auto`
	);
}

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
	const saved = storage.getJSON<SoundPack>('settings_sound_pack', 'synth-pro');
	if (SOUND_PACKS.includes(saved)) {
		return saved;
	}
	return 'synth-pro';
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
	#muted = $state(storage.getJSON<boolean>('settings_muted', false));
	#sound = $state(storage.getJSON<boolean>('settings_sound_fx', true));
	#volume = $state(storage.getJSON<number>('settings_volume', 0.04));
	#soundPack = $state<SoundPack>(detectInitialSoundPack());
	#musicEnabled = $state(storage.getJSON<boolean>('settings_music_enabled', true));
	#musicVolume = $state(storage.getJSON<number>('settings_music_volume', 0.02));
	#musicTrack = $state<MusicTrack>(detectInitialMusicTrack());
	#voiceEnabled = $state(storage.getJSON<boolean>('settings_voice_enabled', true));
	#voiceVolume = $state(storage.getJSON<number>('settings_voice_volume', 0.15));
	#locale = $state<Locale>(detectInitialLocale());
	#uiScale = $state<UiScale>(detectInitialUiScale());
	#theme = $state<AppTheme>(detectInitialTheme());
	#graphicsStyle = $state<GraphicsStyle>(detectInitialGraphicsStyle());
	#buildQueueMode = $state<BuildQueueMode>(detectInitialBuildQueueMode());
	#controlPreset = $state<ControlPreset>(detectInitialControlPreset());
	#uiLayoutPreset = $state<UiLayoutPreset>(detectInitialUiLayoutPreset());
	#cursorStyle = $state<CursorStyle>(detectInitialCursorStyle());
	#adaptiveCursorRace = $state<RaceCursor | null>(null);
	#activeCursor = $state<RaceCursor | 'default'>('default');
	#isSettingsOpen = $state(false);

	constructor() {
		// Synchronize procedural sound engine & reactive i18n with saved state
		sound.setEnabled(this.#sound && !this.#muted);
		sound.setVolume(this.#volume);
		sound.setPack(this.#soundPack);
		music.setEnabled(this.#musicEnabled && !this.#muted);
		music.setVolume(this.#musicVolume);
		music.setTrack(this.#musicTrack);
		sound.setVoiceEnabled(this.#voiceEnabled && !this.#muted);
		sound.setVoiceVolume(this.#voiceVolume);
		applyUiScale(this.#uiScale);
		applyTheme(this.#theme);
		this.#activeCursor = resolveActiveCursor(this.#cursorStyle);
		applyCursorStyle(this.#activeCursor);
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

	get muted(): boolean {
		return this.#muted;
	}

	get isAudioActive(): boolean {
		return !this.#muted && (this.#sound || this.#musicEnabled || this.#voiceEnabled);
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

	get voiceEnabled(): boolean {
		return this.#voiceEnabled;
	}

	get voiceVolume(): number {
		return this.#voiceVolume;
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

	get cursorStyle(): CursorStyle {
		return this.#cursorStyle;
	}

	get activeCursor(): RaceCursor | 'default' {
		return this.#activeCursor;
	}

	get isSettingsOpen(): boolean {
		return this.#isSettingsOpen;
	}

	setMuted(muted: boolean): void {
		this.#muted = muted;
		storage.setJSON('settings_muted', muted);
		sound.setEnabled(this.#sound && !this.#muted);
		sound.setVoiceEnabled(this.#voiceEnabled && !this.#muted);
		music.setEnabled(this.#musicEnabled && !this.#muted);
	}

	toggleMute(): void {
		if (this.isAudioActive) {
			this.setMuted(true);
		} else {
			if (!this.#sound && !this.#musicEnabled && !this.#voiceEnabled) {
				this.#sound = true;
				this.#musicEnabled = true;
				this.#voiceEnabled = true;
				storage.setJSON('settings_sound_fx', true);
				storage.setJSON('settings_music_enabled', true);
				storage.setJSON('settings_voice_enabled', true);
			}
			this.setMuted(false);
		}
	}

	setSound(enabled: boolean): void {
		this.#sound = enabled;
		storage.setJSON('settings_sound_fx', enabled);
		if (enabled && this.#muted) {
			this.#muted = false;
			storage.setJSON('settings_muted', false);
			sound.setVoiceEnabled(this.#voiceEnabled);
			music.setEnabled(this.#musicEnabled);
		}
		sound.setEnabled(this.#sound && !this.#muted);
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
		if (enabled && this.#muted) {
			this.#muted = false;
			storage.setJSON('settings_muted', false);
			sound.setEnabled(this.#sound);
			sound.setVoiceEnabled(this.#voiceEnabled);
		}
		music.setEnabled(this.#musicEnabled && !this.#muted);
	}

	setVoiceEnabled(enabled: boolean): void {
		this.#voiceEnabled = enabled;
		storage.setJSON('settings_voice_enabled', enabled);
		if (enabled && this.#muted) {
			this.#muted = false;
			storage.setJSON('settings_muted', false);
			sound.setEnabled(this.#sound);
			music.setEnabled(this.#musicEnabled);
		}
		sound.setVoiceEnabled(this.#voiceEnabled && !this.#muted);
	}

	setVoiceVolume(vol: number): void {
		const clamped = Math.max(0, Math.min(1, vol));
		this.#voiceVolume = clamped;
		storage.setJSON('settings_voice_volume', clamped);
		sound.setVoiceVolume(clamped);
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

	setCursorStyle(style: CursorStyle): void {
		if (!CURSOR_STYLES.includes(style)) return;
		this.#cursorStyle = style;
		storage.setJSON('settings_cursor_style', style);
		this.#activeCursor = resolveActiveCursor(style, this.#adaptiveCursorRace);
		applyCursorStyle(this.#activeCursor);
	}

	/**
	 * Updates the active cursor to match the player's current in-game race
	 * when cursorStyle is set to 'adaptive'.
	 */
	syncAdaptiveCursorRace(race: string | null | undefined): void {
		if (!race) return;
		const slug = RACE_TO_CURSOR_SLUG[race] ?? RACE_TO_CURSOR_SLUG[formatRaceName(race)];
		if (!slug) return;
		this.#adaptiveCursorRace = slug;
		if (this.#cursorStyle === 'adaptive' && this.#activeCursor !== slug) {
			this.#activeCursor = slug;
			applyCursorStyle(slug);
		}
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
