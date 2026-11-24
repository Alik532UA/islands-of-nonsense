import type { Commander, PlayerState } from './types';

export const RANDOM_COMMANDER_MULTIPLIER = 2;
export const COMMANDER_CHANGE_GOLD_COST = 250;
export const COMMANDER_CHANGE_LUMBER_COST = 250;
export const COMMANDER_CHANGE_COOLDOWN_SEC = 300; // 5 minutes

export const COMMANDERS: Commander[] = [
	{
		id: 1,
		name: 'Саша',
		nickname: 'Банкір',
		description: '+4% до всього доходу золота',
		icon: 'Coins',
		baseBonusPct: 4
	},
	{
		id: 2,
		name: 'Алик',
		nickname: 'Майстер кузні',
		description: 'Кузня та всі її покращення дешевші на 10%',
		icon: 'Hammer',
		baseBonusPct: 10
	},
	{
		id: 3,
		name: 'Дима',
		nickname: 'Воєначальник',
		description: '+5% до базової шкоди всіх бійців',
		icon: 'Sword',
		baseBonusPct: 5
	},
	{
		id: 4,
		name: 'Дэн',
		nickname: 'Берсерк',
		description: '+5% до швидкості атаки всіх бійців',
		icon: 'Zap',
		baseBonusPct: 5
	},
	{
		id: 5,
		name: 'Юра',
		nickname: 'Снайпер',
		description: '5% шанс критичного удару (×2 шкоди)',
		icon: 'Target',
		baseBonusPct: 5
	},
	{
		id: 6,
		name: 'Леша',
		nickname: 'Фантом',
		description: '4% шанс ухилитися від ворожої атаки',
		icon: 'Shield',
		baseBonusPct: 4
	}
];

export function findCommander(id?: number | null): Commander | null {
	if (!id || id <= 0) return null;
	return COMMANDERS.find((c) => c.id === id) ?? null;
}

export function getCommander(id: number): Commander {
	return COMMANDERS.find((c) => c.id === id) || COMMANDERS[0];
}

export function pickRandomCommanderId(): number {
	const idx = Math.floor(Math.random() * COMMANDERS.length);
	return COMMANDERS[idx]?.id ?? COMMANDERS[0].id;
}

export function getCommanderMultiplier(
	player?: Pick<PlayerState, 'isRandomCommander'> | null
): number {
	return player?.isRandomCommander ? RANDOM_COMMANDER_MULTIPLIER : 1;
}

export function getCommanderEffectivePct(commanderId: number, isRandom = false): number {
	const cmd = getCommander(commanderId);
	return cmd.baseBonusPct * (isRandom ? RANDOM_COMMANDER_MULTIPLIER : 1);
}

export function getCommanderDescription(cmd: Commander, isRandom = false): string {
	const pct = cmd.baseBonusPct * (isRandom ? RANDOM_COMMANDER_MULTIPLIER : 1);
	switch (cmd.id) {
		case 1:
			return `+${pct}% до всього доходу золота`;
		case 2:
			return `Кузня та всі її покращення дешевші на ${pct}%`;
		case 3:
			return `+${pct}% до базової шкоди всіх бійців`;
		case 4:
			return `+${pct}% до швидкості атаки всіх бійців`;
		case 5:
			return `${pct}% шанс критичного удару (×2 шкоди)`;
		case 6:
			return `${pct}% шанс ухилитися від ворожої атаки`;
		default:
			return cmd.description;
	}
}

function getEffectiveRateForId(
	player: Pick<PlayerState, 'commander' | 'isRandomCommander'> | null | undefined,
	targetId: number
): number {
	if (!player || player.commander !== targetId) return 0;
	return getCommanderEffectivePct(targetId, Boolean(player.isRandomCommander)) / 100;
}

/** Sasha (#1): periodic gold income bonus (+4% base, +8% on Random x2) */
export function getCommanderIncomeBonus(
	player?: Pick<PlayerState, 'commander' | 'isRandomCommander'> | null
): number {
	return getEffectiveRateForId(player, 1);
}

/** Alik (#2): Forge build & upgrade gold discount (10% base, 20% on Random x2) */
export function getCommanderForgeDiscount(
	player?: Pick<PlayerState, 'commander' | 'isRandomCommander'> | null
): number {
	return getEffectiveRateForId(player, 2);
}

/** Shared cost calculator applying Alik's Forge discount consistently across engine and UI */
export function applyCommanderForgeCostDiscount(
	baseGoldCost: number,
	isForge: boolean,
	player?: Pick<PlayerState, 'commander' | 'isRandomCommander'> | null
): number {
	if (!isForge) return baseGoldCost;
	const discount = getCommanderForgeDiscount(player);
	return discount > 0 ? Math.round(baseGoldCost * (1 - discount)) : baseGoldCost;
}

/** Dima (#3): unit base damage bonus (+5% base, +10% on Random x2) */
export function getCommanderDamageBonus(
	player?: Pick<PlayerState, 'commander' | 'isRandomCommander'> | null
): number {
	return getEffectiveRateForId(player, 3);
}

/** Dan (#4): unit attack speed bonus (+5% base, +10% on Random x2) */
export function getCommanderAttackSpeedBonus(
	player?: Pick<PlayerState, 'commander' | 'isRandomCommander'> | null
): number {
	return getEffectiveRateForId(player, 4);
}

/** Yura (#5): unit critical strike (2x damage) chance (5% base, 10% on Random x2) */
export function getCommanderCritChance(
	player?: Pick<PlayerState, 'commander' | 'isRandomCommander'> | null
): number {
	return getEffectiveRateForId(player, 5);
}

/** Lesha (#6): unit evasion chance (4% base, 8% on Random x2) */
export function getCommanderEvadeChance(
	player?: Pick<PlayerState, 'commander' | 'isRandomCommander'> | null
): number {
	return getEffectiveRateForId(player, 6);
}
