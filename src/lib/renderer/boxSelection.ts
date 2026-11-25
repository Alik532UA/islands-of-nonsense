import type { MatchTeam, PlayerState, Unit } from '$lib/engine/types';
import type { SelectedEntity } from './entityRenderer';

export interface BoxSelectionBounds {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
}

export type BoxSelectableUnit = Pick<Unit, 'instanceId' | 'team' | 'x' | 'y' | 'state'>;

export interface ResolveBoxSelectionInput {
	bounds: BoxSelectionBounds;
	players: ReadonlyArray<PlayerState | undefined>;
	units: ReadonlyArray<BoxSelectableUnit>;
	viewerTeam: MatchTeam;
	activeControlSlot: number | null;
	controllableSlots: ReadonlySet<number> | null;
	enableFog: boolean;
	isPointRevealed: (team: MatchTeam, x: number, y: number) => boolean;
}

const BOX_HIT_PADDING = 18;

function isInsideBox(x: number, y: number, bounds: BoxSelectionBounds, padding = 0): boolean {
	return (
		x >= bounds.minX - padding &&
		x <= bounds.maxX + padding &&
		y >= bounds.minY - padding &&
		y <= bounds.maxY + padding
	);
}

/**
 * Resolves marquee box selection in priority order:
 * 1. Player's active/controllable worker inside the marquee box (RTS builder grab)
 * 2. Visible friendly combat units, or enemy/neutral units if no friendly unit matched
 * 3. Visible inspected worker in spectator/observer view
 */
export function resolveBoxSelection(input: ResolveBoxSelectionInput): SelectedEntity {
	const {
		bounds,
		players,
		units,
		viewerTeam,
		activeControlSlot,
		controllableSlots,
		enableFog,
		isPointRevealed
	} = input;

	const matchedControllableWorkers: PlayerState[] = [];
	const matchedVisibleWorkers: PlayerState[] = [];

	for (const p of players) {
		const w = p?.worker;
		if (!p || !w) continue;
		const visible = !enableFog || p.team === viewerTeam || isPointRevealed(viewerTeam, w.x, w.y);
		if (!visible) continue;
		if (!isInsideBox(w.x, w.y, bounds, BOX_HIT_PADDING)) continue;

		matchedVisibleWorkers.push(p);
		const slot = p.slot ?? (p.team === 'east' ? 2 : 1);
		if (controllableSlots ? controllableSlots.has(slot) : slot === activeControlSlot) {
			matchedControllableWorkers.push(p);
		}
	}

	if (matchedControllableWorkers.length > 0) {
		const preferred =
			matchedControllableWorkers.find((p) => (p.slot ?? 1) === activeControlSlot) ??
			matchedControllableWorkers[0];
		return {
			type: 'worker',
			playerSlot: preferred.slot ?? (preferred.team === 'east' ? 2 : 1)
		};
	}

	const selectedUnits = units.filter(
		(u) =>
			u.state !== 'DEAD' &&
			isInsideBox(u.x, u.y, bounds, BOX_HIT_PADDING * 0.5) &&
			(!enableFog || u.team === viewerTeam || isPointRevealed(viewerTeam, u.x, u.y))
	);

	const friendlyUnits = selectedUnits.filter((u) => u.team === viewerTeam);
	const targets = friendlyUnits.length > 0 ? friendlyUnits : selectedUnits;

	if (targets.length > 1) {
		return {
			type: 'group',
			unitIds: targets.map((u) => u.instanceId)
		};
	}
	if (targets.length === 1) {
		return {
			type: 'unit',
			instanceId: targets[0].instanceId
		};
	}

	if (matchedVisibleWorkers.length > 0) {
		const inspected =
			matchedVisibleWorkers.find((p) => p.team === viewerTeam) ?? matchedVisibleWorkers[0];
		return {
			type: 'worker',
			playerSlot: inspected.slot ?? (inspected.team === 'east' ? 2 : 1)
		};
	}

	return null;
}
