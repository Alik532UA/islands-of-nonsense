import { fnv1a } from '$lib/utils/fnv';

export const AVATAR_ICONS = [
	'swords',
	'shield',
	'crown',
	'castle',
	'bot',
	'skull',
	'zap',
	'flame',
	'crosshair',
	'sparkles',
	'gem',
	'axe'
] as const;

export type AvatarIcon = (typeof AVATAR_ICONS)[number];

export const AVATAR_COLORS = [
	'red',
	'amber',
	'emerald',
	'cyan',
	'blue',
	'purple',
	'rose',
	'slate'
] as const;

export type AvatarColor = (typeof AVATAR_COLORS)[number];

export const AVATAR_KEY = 'player.avatar';
export const AVATAR_RANDOM_KEY = 'player.avatarRandom';
export const AVATAR_MAX = 24;

export type AvatarString = `${AvatarIcon}:${AvatarColor}`;

const KNOWN_ICONS = new Set<string>(AVATAR_ICONS);
const KNOWN_COLORS = new Set<string>(AVATAR_COLORS);

export function isAvatar(value: unknown): value is AvatarString {
	if (typeof value !== 'string') return false;
	if (value.length > AVATAR_MAX) return false;
	const parts = value.split(':');
	if (parts.length !== 2) return false;
	const [icon, color] = parts;
	return KNOWN_ICONS.has(icon) && KNOWN_COLORS.has(color);
}

export function randomAvatar(random: () => number = Math.random): string {
	const icon = AVATAR_ICONS[Math.floor(random() * AVATAR_ICONS.length)];
	const color = AVATAR_COLORS[Math.floor(random() * AVATAR_COLORS.length)];
	return `${icon}:${color}`;
}

export function normaliseAvatar(raw: string | null): string {
	if (raw === null || raw === '') return '';
	if (isAvatar(raw)) return raw;
	const parts = raw.split(':');
	if (parts.length === 2) {
		const [rawIcon, rawColor] = parts;
		const icon = KNOWN_ICONS.has(rawIcon) ? rawIcon : AVATAR_ICONS[fnv1a(rawIcon) % AVATAR_ICONS.length];
		const color = KNOWN_COLORS.has(rawColor) ? rawColor : AVATAR_COLORS[fnv1a(rawColor) % AVATAR_COLORS.length];
		return `${icon}:${color}`;
	}
	return randomAvatar();
}
