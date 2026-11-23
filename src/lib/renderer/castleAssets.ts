import west0 from '$lib/assets/castles/west_castle_stage_0.webp';
import west1 from '$lib/assets/castles/west_castle_stage_1.webp';
import west2 from '$lib/assets/castles/west_castle_stage_2.webp';
import west3 from '$lib/assets/castles/west_castle_stage_3.webp';
import west4 from '$lib/assets/castles/west_castle_stage_4.webp';
import west5 from '$lib/assets/castles/west_castle_stage_5.webp';
import west6 from '$lib/assets/castles/west_castle_stage_6.webp';
import west7 from '$lib/assets/castles/west_castle_stage_7.webp';

import east0 from '$lib/assets/castles/east_castle_stage_0.webp';
import east1 from '$lib/assets/castles/east_castle_stage_1.webp';
import east2 from '$lib/assets/castles/east_castle_stage_2.webp';
import east3 from '$lib/assets/castles/east_castle_stage_3.webp';
import east4 from '$lib/assets/castles/east_castle_stage_4.webp';
import east5 from '$lib/assets/castles/east_castle_stage_5.webp';
import east6 from '$lib/assets/castles/east_castle_stage_6.webp';
import east7 from '$lib/assets/castles/east_castle_stage_7.webp';

export const WEST_CASTLE_STAGE_URLS: string[] = [
	west0,
	west1,
	west2,
	west3,
	west4,
	west5,
	west6,
	west7
];

export const EAST_CASTLE_STAGE_URLS: string[] = [
	east0,
	east1,
	east2,
	east3,
	east4,
	east5,
	east6,
	east7
];

/**
 * Standard duration in milliseconds for smooth crossfade between castle destruction stages.
 */
export const CASTLE_FADE_DURATION_MS = 400;

/**
 * Calculates the progressive destruction stage (0 to 7) for a castle based on its current and max HP.
 * Stage 0: 100% to 87.5% HP (Pristine, glowing magical ring / bright lava)
 * Stage 1: 87.5% to 75% HP (Light battle wear, flying banners)
 * Stage 2: 75% to 62.5% HP (Cracked masonry, worn banners)
 * Stage 3: 62.5% to 50% HP (Breached gate/outer walls, internal fire)
 * Stage 4: 50% to 37.5% HP (Heavy fire, broken towers)
 * Stage 5: 37.5% to 25% HP (Massive collapse, crumbling bastions)
 * Stage 6: 25% to 5% HP (Charred skeletal timbers, burning ruins)
 * Stage 7: 5% to 0% HP (Complete pile of smoking rubble)
 */
export function getCastleStageIndex(hp: number, maxHp: number): number {
	if (hp <= 0 || maxHp <= 0) return 7;
	const pct = hp / maxHp;
	if (pct >= 0.875) return 0;
	if (pct >= 0.75) return 1;
	if (pct >= 0.625) return 2;
	if (pct >= 0.5) return 3;
	if (pct >= 0.375) return 4;
	if (pct >= 0.25) return 5;
	if (pct >= 0.05) return 6;
	return 7;
}
