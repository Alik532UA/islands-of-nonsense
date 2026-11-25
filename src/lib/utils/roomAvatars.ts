import { AVATAR_COLORS, AVATAR_ICONS, formatPresetAvatar, isAvatar } from '$lib/config/avatars';
import type { Member } from '$lib/net/roomTypes';

/**
 * Resolves unique lobby display avatars across room members:
 * - Linked account holders (`member.account === true`) always keep their chosen profile avatar.
 * - Anonymous guests colliding on an already-claimed avatar deterministically receive a free preset.
 */
export function resolveRoomMemberAvatars(members: readonly Member[]): Map<string, string> {
	const result = new Map<string, string>();
	const claimed = new Set<string>();

	const ordered = [...members].sort((a, b) => {
		const aAcc = a.account ? 0 : 1;
		const bAcc = b.account ? 0 : 1;
		return aAcc - bAcc || a.order - b.order;
	});

	for (const m of ordered) {
		const base = m.avatar && isAvatar(m.avatar) ? m.avatar : 'castle:amber';
		if (m.account || !claimed.has(base)) {
			claimed.add(base);
			result.set(m.uid, base);
			continue;
		}
		let replacement = base;
		outer: for (const color of AVATAR_COLORS) {
			for (const icon of AVATAR_ICONS) {
				const candidate = formatPresetAvatar(icon, color);
				if (!claimed.has(candidate)) {
					replacement = candidate;
					break outer;
				}
			}
		}
		claimed.add(replacement);
		result.set(m.uid, replacement);
	}

	return result;
}
