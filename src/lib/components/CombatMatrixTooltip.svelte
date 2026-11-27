<script lang="ts" module>
	import type { AttackType, ArmorType } from '../engine/types';
	import { t, getLocale, type Locale } from '$lib/i18n';

	export const ATTACK_NAMES_UK: Record<string, string> = {
		normal: 'Звичайна',
		pierce: 'Колюча',
		siege: 'Облога',
		magic: 'Магічна',
		chaos: 'Хаос',
		hero: 'Герой'
	};

	export const ARMOR_NAMES_UK: Record<string, string> = {
		none: 'Без броні',
		small: 'Легка',
		medium: 'Середня',
		large: 'Важка',
		fort: 'Укріплена',
		hero: 'Герой'
	};

	export const ATTACK_NAMES_EN: Record<string, string> = {
		normal: 'Normal',
		pierce: 'Pierce',
		siege: 'Siege',
		magic: 'Magic',
		chaos: 'Chaos',
		hero: 'Hero'
	};

	export const ARMOR_NAMES_EN: Record<string, string> = {
		none: 'Unarmored',
		small: 'Light',
		medium: 'Medium',
		large: 'Heavy',
		fort: 'Fortified',
		hero: 'Hero'
	};

	export function normalizeArmorKey(raw: string): ArmorType {
		const s = raw.toLowerCase();
		if (s === 'heavy' || s === 'large') return 'large';
		if (s === 'light' || s === 'small') return 'small';
		if (s === 'unarmored' || s === 'none') return 'none';
		if (s === 'fortified' || s === 'fort') return 'fort';
		if (s === 'hero') return 'hero';
		return 'medium';
	}

	export function normalizeAttackKey(raw: string): AttackType {
		const s = raw.toLowerCase();
		if (s === 'pierce' || s.includes('колюч')) return 'pierce';
		if (s === 'siege' || s.includes('облог')) return 'siege';
		if (s === 'magic' || s.includes('магіч')) return 'magic';
		if (s === 'chaos' || s.includes('хаос')) return 'chaos';
		if (s === 'hero' || s.includes('герой')) return 'hero';
		return 'normal';
	}

	export function getArmorTypeLabel(raw: string, locale: Locale = getLocale()): string {
		const norm = normalizeArmorKey(raw || 'none');
		const map = locale === 'en' ? ARMOR_NAMES_EN : ARMOR_NAMES_UK;
		return map[norm] || t(`combat.armor.${norm}`, locale);
	}

	export function getAttackTypeLabel(raw: string, locale: Locale = getLocale()): string {
		const norm = normalizeAttackKey(raw || 'normal');
		const map = locale === 'en' ? ATTACK_NAMES_EN : ATTACK_NAMES_UK;
		return map[norm] || t(`combat.attack.${norm}`, locale);
	}
</script>

<script lang="ts">
	import { DAMAGE_MULTIPLIERS } from '../engine/damageMatrix';

	let {
		matrix
	}: {
		matrix: {
			kind: 'attack' | 'armor';
			key: string;
			label: string;
		};
	} = $props();
</script>

<div
	class="lg-hud-tooltip absolute bottom-full left-1/4 mb-2 w-72 border-2 border-[#8c7456]/80 rounded-xl p-3 text-xs z-50 pointer-events-none"
>
	{#if matrix.kind === 'attack'}
		<div class="border-b border-[#3b3226] pb-1.5 mb-2 flex items-center justify-between">
			<span class="font-bold text-[#fef08a] text-xs">
				{t('combat.attackTitle', { label: getAttackTypeLabel(matrix.key) })}
			</span>
			<span class="text-[10px] text-slate-400 font-mono">{t('combat.efficiency')}</span>
		</div>
		<div class="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
			{#each ['none', 'small', 'medium', 'large', 'fort', 'hero'] as armKey}
				{@const mult = DAMAGE_MULTIPLIERS[matrix.key as AttackType]?.[armKey as ArmorType] ?? 1.0}
				{@const pct = Math.round(mult * 100)}
				<div
					class="flex justify-between items-center bg-[#0d1017] px-1.5 py-0.5 rounded border border-[#2d3748]"
				>
					<span class="text-slate-400">{getArmorTypeLabel(armKey)}:</span>
					<span
						class="font-mono font-bold {pct > 100
							? 'text-emerald-400'
							: pct === 100
								? 'text-slate-200'
								: 'text-rose-400'}"
					>
						{pct}%
					</span>
				</div>
			{/each}
		</div>
	{:else}
		<div class="border-b border-[#3b3226] pb-1.5 mb-2 flex items-center justify-between">
			<span class="font-bold text-[#fef08a] text-xs">
				{t('combat.armorTitle', { label: getArmorTypeLabel(matrix.key) })}
			</span>
			<span class="text-[10px] text-slate-400 font-mono">{t('combat.damageTaken')}</span>
		</div>
		<div class="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
			{#each ['normal', 'pierce', 'siege', 'magic', 'chaos', 'hero'] as atkKey}
				{@const mult = DAMAGE_MULTIPLIERS[atkKey as AttackType]?.[matrix.key as ArmorType] ?? 1.0}
				{@const pct = Math.round(mult * 100)}
				<div
					class="flex justify-between items-center bg-[#0d1017] px-1.5 py-0.5 rounded border border-[#2d3748]"
				>
					<span class="text-slate-400">{getAttackTypeLabel(atkKey)}:</span>
					<span
						class="font-mono font-bold {pct > 100
							? 'text-rose-400'
							: pct === 100
								? 'text-slate-200'
								: 'text-emerald-400'}"
					>
						{pct}%
					</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
