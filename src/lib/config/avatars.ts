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
	'axe',
	'star',
	'heart',
	'sun',
	'moon',
	'compass',
	'flag',
	'ghost',
	'bug',
	'anchor',
	'feather',
	'eye',
	'rocket'
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
	'slate',
	'orange',
	'teal',
	'indigo',
	'lime'
] as const;

export type AvatarColor = (typeof AVATAR_COLORS)[number];

export const AVATAR_FRAMES = [
	'none',
	'bronze',
	'silver',
	'gold',
	'flame',
	'neon',
	'royal'
] as const;

export type AvatarFrame = (typeof AVATAR_FRAMES)[number];

export const AVATAR_KEY = 'player.avatar';
export const AVATAR_RANDOM_KEY = 'player.avatarRandom';
export const AVATAR_MAX = 32;
export const AVATAR_IMAGE_MAX = 4096;

export type AvatarString =
	`${AvatarIcon}:${AvatarColor}` | `${AvatarIcon}:${AvatarColor}:${AvatarFrame}`;

const KNOWN_ICONS = new Set<string>(AVATAR_ICONS);
const KNOWN_COLORS = new Set<string>(AVATAR_COLORS);
const KNOWN_FRAMES = new Set<string>(AVATAR_FRAMES);
const SAFE_DATA_IMAGE_RE = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export interface ParsedAvatar {
	kind: 'preset' | 'image';
	icon: AvatarIcon;
	color: AvatarColor;
	frame: AvatarFrame;
	imageUrl?: string;
}

export function isSafeAvatarImageUrl(value: unknown): boolean {
	return (
		typeof value === 'string' && value.length <= AVATAR_IMAGE_MAX && SAFE_DATA_IMAGE_RE.test(value)
	);
}

export function isAvatar(value: unknown): boolean {
	if (typeof value !== 'string' || value.length === 0 || value.length > AVATAR_IMAGE_MAX) {
		return false;
	}
	if (isSafeAvatarImageUrl(value)) return true;
	const pipeIdx = value.indexOf('|');
	if (pipeIdx > 0) {
		const frame = value.slice(0, pipeIdx);
		const url = value.slice(pipeIdx + 1);
		return KNOWN_FRAMES.has(frame) && isSafeAvatarImageUrl(url);
	}
	if (value.length > AVATAR_MAX) return false;
	const parts = value.split(':');
	if (parts.length !== 2 && parts.length !== 3) return false;
	const [icon, color, frame] = parts;
	if (!KNOWN_ICONS.has(icon) || !KNOWN_COLORS.has(color)) return false;
	return frame === undefined || KNOWN_FRAMES.has(frame);
}

export function parseAvatar(raw: string | null | undefined): ParsedAvatar | null {
	if (!raw || !isAvatar(raw)) return null;
	if (isSafeAvatarImageUrl(raw)) {
		return { kind: 'image', icon: 'castle', color: 'amber', frame: 'none', imageUrl: raw };
	}
	const pipeIdx = raw.indexOf('|');
	if (pipeIdx > 0) {
		const frame = raw.slice(0, pipeIdx) as AvatarFrame;
		const url = raw.slice(pipeIdx + 1);
		return { kind: 'image', icon: 'castle', color: 'amber', frame, imageUrl: url };
	}
	const [icon, color, frame] = raw.split(':');
	return {
		kind: 'preset',
		icon: icon as AvatarIcon,
		color: color as AvatarColor,
		frame: (frame as AvatarFrame) ?? 'none'
	};
}

export function formatPresetAvatar(
	icon: AvatarIcon,
	color: AvatarColor,
	frame: AvatarFrame = 'none'
): string {
	return frame === 'none' ? `${icon}:${color}` : `${icon}:${color}:${frame}`;
}

export function withAvatarFrame(current: string, frame: AvatarFrame): string {
	const parsed = parseAvatar(current);
	if (!parsed) return formatPresetAvatar('castle', 'amber', frame);
	if (parsed.kind === 'image' && parsed.imageUrl) {
		return frame === 'none' ? parsed.imageUrl : `${frame}|${parsed.imageUrl}`;
	}
	return formatPresetAvatar(parsed.icon, parsed.color, frame);
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
	if (parts.length >= 2) {
		const [rawIcon, rawColor, rawFrame] = parts;
		const icon = KNOWN_ICONS.has(rawIcon)
			? (rawIcon as AvatarIcon)
			: AVATAR_ICONS[fnv1a(rawIcon) % AVATAR_ICONS.length];
		const color = KNOWN_COLORS.has(rawColor)
			? (rawColor as AvatarColor)
			: AVATAR_COLORS[fnv1a(rawColor) % AVATAR_COLORS.length];
		const frame = rawFrame && KNOWN_FRAMES.has(rawFrame) ? (rawFrame as AvatarFrame) : 'none';
		return formatPresetAvatar(icon, color, frame);
	}
	return randomAvatar();
}
