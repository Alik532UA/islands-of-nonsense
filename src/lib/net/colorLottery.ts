import { ALL_PLAYER_COLORS, WC3_PLAYER_COLORS } from '$lib/engine/types';
import { getSlotKey, getSlotNumber, normalizeRoomSlots } from './onlineMatchSetup';
import type { Member, RoomConfig, RoomSlotKey, RosterEntry } from './roomTypes';

function createSeededRng(seed: number): () => number {
	let state = (seed ^ 0x9e3779b9) >>> 0;
	if (state === 0) state = 0x6d2b79f5;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Computes deterministic contention probabilities when `count >= 1` players pick the same color.
 * The earliest claimant keeps priority (~70/30 for 2, ~62/19/19 for 3, ~54/15/15/15 for 4).
 */
export function getColorContentionProbabilities(count: number): number[] {
	if (count <= 0) return [];
	if (count === 1) return [1];
	const firstShare = Math.max(0.4, 0.7 - 0.08 * (count - 2));
	const restShare = (1 - firstShare) / (count - 1);
	return [firstShare, ...Array.from({ length: count - 1 }, () => restShare)];
}

export interface ColorContentionInfo {
	totalClaimants: number;
	probabilityPct: number;
	isLeader: boolean;
}

function compareClaimants(
	a: Pick<Member, 'uid' | 'order' | 'colorPickedAt'>,
	b: Pick<Member, 'uid' | 'order' | 'colorPickedAt'>
): number {
	const atA = typeof a.colorPickedAt === 'number' ? a.colorPickedAt : Number.MAX_SAFE_INTEGER;
	const atB = typeof b.colorPickedAt === 'number' ? b.colorPickedAt : Number.MAX_SAFE_INTEGER;
	if (atA !== atB) return atA - atB;
	if (a.order !== b.order) return a.order - b.order;
	return a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0;
}

/**
 * Returns live lobby contention details for a human player who picked `colorId`.
 */
export function getMemberContentionInfo(
	members: readonly Member[],
	targetUid: string,
	colorId: number | undefined
): ColorContentionInfo | null {
	if (typeof colorId !== 'number' || colorId < 1 || colorId > ALL_PLAYER_COLORS.length) {
		return null;
	}
	const claimants = members
		.filter((m) => m.role === 'player' && m.colorId === colorId)
		.sort(compareClaimants);
	const idx = claimants.findIndex((m) => m.uid === targetUid);
	if (idx === -1) return null;
	const probs = getColorContentionProbabilities(claimants.length);
	return {
		totalClaimants: claimants.length,
		probabilityPct: Math.round((probs[idx] ?? 0) * 100),
		isLeader: idx === 0
	};
}

/**
 * Collects all color IDs currently claimed by human players in the lobby.
 */
export function getHumanClaimedColorIds(members: readonly Member[]): Set<number> {
	const claimed = new Set<number>();
	for (const m of members) {
		if (
			m.role === 'player' &&
			typeof m.colorId === 'number' &&
			m.colorId >= 1 &&
			m.colorId <= ALL_PLAYER_COLORS.length
		) {
			claimed.add(m.colorId);
		}
	}
	return claimed;
}

/**
 * Deterministically resolves final unique color IDs (1..14) for all active slots (humans + bots)
 * using the room seed:
 * 1. Contested human picks resolve via weighted lottery favoring earliest claimant.
 * 2. Losing humans or 'random' humans get random remaining colors.
 * 3. Bots keep their picked lobby color ONLY if no human claimed it; otherwise random remaining.
 */
export function resolveOnlineSlotColors(params: {
	seed: number;
	config?: Partial<RoomConfig>;
	members: readonly Member[];
	roster?: readonly RosterEntry[];
}): Record<number, number> {
	const rng = createSeededRng(params.seed);
	const slotsMap = normalizeRoomSlots(params.config);
	const memberByUid = new Map(params.members.map((m) => [m.uid, m]));

	const participants =
		params.roster && params.roster.length > 0
			? params.roster.map((r, idx) => {
					const m = memberByUid.get(r.uid);
					return {
						uid: r.uid,
						team: (r.team ?? m?.team ?? 'west') as 'west' | 'east',
						slot: typeof r.slot === 'number' ? r.slot : m?.slot,
						order: m?.order ?? idx + 1,
						colorId: typeof r.colorId === 'number' ? r.colorId : m?.colorId,
						colorPickedAt: m?.colorPickedAt
					};
				})
			: [...params.members]
					.filter((m) => m.role === 'player')
					.sort((a, b) => a.order - b.order)
					.map((m) => ({
						uid: m.uid,
						team: (m.team ?? 'west') as 'west' | 'east',
						slot: m.slot,
						order: m.order,
						colorId: m.colorId,
						colorPickedAt: m.colorPickedAt
					}));

	const occupiedSlots = new Map<number, (typeof participants)[number]>();
	const unassigned: (typeof participants)[number][] = [];
	for (const p of participants) {
		if (typeof p.slot === 'number' && !occupiedSlots.has(p.slot)) {
			occupiedSlots.set(p.slot, p);
		} else {
			unassigned.push(p);
		}
	}
	for (const p of unassigned) {
		for (let i = 1; i <= 7; i++) {
			const sn = getSlotNumber(p.team, i);
			if (!occupiedSlots.has(sn) && slotsMap[getSlotKey(p.team, i)].kind === 'open') {
				occupiedSlots.set(sn, p);
				break;
			}
		}
	}

	const humanBySlot = new Map<number, (typeof participants)[number]>();
	const botSlots: Array<{ slot: number; key: RoomSlotKey; colorId?: number }> = [];
	for (const team of ['west', 'east'] as const) {
		for (let i = 1; i <= 7; i++) {
			const sn = getSlotNumber(team, i);
			const key = getSlotKey(team, i);
			const cfg = slotsMap[key];
			const occ = occupiedSlots.get(sn);
			if (occ) {
				humanBySlot.set(sn, occ);
			} else if (cfg.kind === 'bot') {
				botSlots.push({ slot: sn, key, colorId: cfg.colorId });
			}
		}
	}

	const result: Record<number, number> = {};
	const usedColorIds = new Set<number>();
	const humanClaimedColors = new Set<number>();
	const contendersByColor = new Map<
		number,
		Array<{ slot: number; uid: string; order: number; colorPickedAt?: number }>
	>();

	for (const [slot, h] of humanBySlot.entries()) {
		if (typeof h.colorId === 'number' && h.colorId >= 1 && h.colorId <= ALL_PLAYER_COLORS.length) {
			humanClaimedColors.add(h.colorId);
			const list = contendersByColor.get(h.colorId) ?? [];
			list.push({ slot, uid: h.uid, order: h.order, colorPickedAt: h.colorPickedAt });
			contendersByColor.set(h.colorId, list);
		}
	}

	// 1. Resolve human contested colors in deterministic colorId order
	const unassignedHumanSlots: number[] = [];
	for (const colorId of [...contendersByColor.keys()].sort((a, b) => a - b)) {
		const contenders = contendersByColor.get(colorId)!.sort(compareClaimants);
		const probs = getColorContentionProbabilities(contenders.length);
		const roll = rng();
		let acc = 0;
		let winnerIdx = contenders.length - 1;
		for (let i = 0; i < probs.length; i++) {
			acc += probs[i];
			if (roll < acc) {
				winnerIdx = i;
				break;
			}
		}
		const winner = contenders[winnerIdx];
		result[winner.slot] = colorId;
		usedColorIds.add(colorId);
		for (let i = 0; i < contenders.length; i++) {
			if (i !== winnerIdx) {
				unassignedHumanSlots.push(contenders[i].slot);
			}
		}
	}

	for (const slot of humanBySlot.keys()) {
		if (result[slot] === undefined && !unassignedHumanSlots.includes(slot)) {
			unassignedHumanSlots.push(slot);
		}
	}

	// 2. Reserve non-conflicting bot lobby color picks (bots never compete with humans)
	const unassignedBotSlots: number[] = [];
	for (const bot of botSlots) {
		const c = bot.colorId;
		if (
			typeof c === 'number' &&
			c >= 1 &&
			c <= ALL_PLAYER_COLORS.length &&
			!humanClaimedColors.has(c) &&
			!usedColorIds.has(c)
		) {
			result[bot.slot] = c;
			usedColorIds.add(c);
		} else {
			unassignedBotSlots.push(bot.slot);
		}
	}

	// 3. Assign remaining unique colors randomly to unassigned humans & bots
	const totalActive = humanBySlot.size + botSlots.length;
	const usesExtraPalette =
		totalActive > WC3_PLAYER_COLORS.length ||
		[...usedColorIds].some((id) => id > WC3_PLAYER_COLORS.length);
	const primaryPool = (usesExtraPalette ? ALL_PLAYER_COLORS : WC3_PLAYER_COLORS)
		.map((c) => c.id)
		.filter((id) => !usedColorIds.has(id));
	const extraPool = usesExtraPalette
		? []
		: ALL_PLAYER_COLORS.map((c) => c.id).filter(
				(id) => id > WC3_PLAYER_COLORS.length && !usedColorIds.has(id)
			);

	const shuffle = (arr: number[]) => {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(rng() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
	};
	shuffle(primaryPool);
	shuffle(extraPool);
	const availableQueue = [...primaryPool, ...extraPool];

	for (const slot of [...unassignedHumanSlots.sort((a, b) => a - b), ...unassignedBotSlots]) {
		const nextId = availableQueue.shift() ?? 1;
		result[slot] = nextId;
		usedColorIds.add(nextId);
	}

	return result;
}
