<script lang="ts" module>
	export type SilhouetteKind =
		| 'flyer'
		| 'siege'
		| 'caster'
		| 'ranger'
		| 'colossus'
		| 'beast'
		| 'warrior'
		| 'shop'
		| 'forge'
		| 'commander'
		| 'chest'
		| 'tower'
		| 'special';

	// Compact vector specs ('@' resolves to accentColor) to minimize compiled Svelte template size
	// Shape tuple: [kind, args..., fill, stroke, strokeWidth, fillOpacity]
	type PathSpec = ['p', string, string?, string?, number?, number?];
	type CircleSpec = ['c', number, number, number, string?, string?, number?, number?];
	type EllipseSpec = ['e', number, number, number, number, string?, string?, number?, number?];
	type RectSpec = ['r', number, number, number, number, number, string?, string?, number?, number?];
	type ShapeSpec = PathSpec | CircleSpec | EllipseSpec | RectSpec;

	const D = '#090d16';
	const SILHOUETTES: Record<SilhouetteKind, ReadonlyArray<ShapeSpec>> = {
		flyer: [
			['p', 'M19 19L4 7L6.5 21L14.5 21.5Z', '@', D, 1.3, 0.9],
			['p', 'M21 19L36 7L33.5 21L25.5 21.5Z', '@', D, 1.3, 0.9],
			['p', 'M14.5 24.5L7.5 32.5L17 26.5Z', '@', D, 1.2],
			['e', 20, 21, 6.2, 5, '@', D, 1.4],
			['e', 20, 22.3, 3.8, 2.4, '#fef08a', undefined, undefined, 0.45],
			['p', 'M22.5 16L30.5 12.5L29 18L22.5 18.5Z', '#1e293b', '#fbbf24', 1],
			['p', 'M21.5 14L19 9L24 13.5Z', '#fef3c7'],
			['c', 26.5, 14.7, 1.1, '#fbbf24'],
			['c', 32.2, 15.2, 2.8, '#f97316', undefined, undefined, 0.88],
			['c', 32.6, 15.2, 1.3, '#fef08a']
		],
		siege: [
			['c', 11.5, 13, 3.6, '#334155', D, 1.3],
			['c', 26.5, 13, 3.6, '#334155', D, 1.3],
			['c', 11.5, 27, 3.6, '#334155', D, 1.3],
			['c', 26.5, 27, 3.6, '#334155', D, 1.3],
			['r', 8.5, 14, 20.5, 12, 2.5, '#78350f', '#1c1917', 1.3],
			['r', 11.5, 16.2, 12, 7.6, 1.6, '@', '#fbbf24', 1],
			['r', 16.5, 17, 17, 6, 2, '#475569', D, 1.3],
			['c', 33.5, 20, 3, '#f59e0b', D, 1.1]
		],
		caster: [
			['p', 'M12.5 20H24.5L27 33H10Z', '@', D, 1.4],
			['p', 'M11 31.2H26', undefined, '#fbbf24', 1.6],
			['c', 18.5, 14, 4.5, '#e2b887', D, 1.2],
			['p', 'M13 15.2L18.5 5.2L24 15.2Z', '#1e293b', '#fbbf24', 1.2],
			['p', 'M30.5 10L29 33', undefined, '#92400e', 2.5],
			['c', 30.5, 9.5, 4.4, '#38bdf8', undefined, undefined, 0.35],
			['c', 30.5, 9.5, 3, '#38bdf8', '#bae6fd', 0.9],
			['c', 30.5, 9.5, 1.4, '#ffffff']
		],
		ranger: [
			['p', 'M9 13H13L11.5 22H8Z', '#92400e', D, 1],
			['p', 'M12 18H22L23 32H11Z', '@', D, 1.4],
			['c', 17, 12.8, 4.1, '#e2b887', D, 1.2],
			['p', 'M12 13.5L17 6.5L22 13.5Z', '#065f46', '#34d399', 1],
			['p', 'M23.5 8.5C30.5 13 30.5 27 23.5 31.5', undefined, '#d97706', 2.4],
			['p', 'M23.5 9L18.5 20L23.5 31', undefined, '#e2e8f0', 1],
			['p', 'M17.5 20H34', undefined, '#fef08a', 1.7],
			['p', 'M35.5 20L31 17.4V22.6Z', '#f8fafc']
		],
		colossus: [
			['r', 12, 15.5, 14.5, 16.5, 3.2, '#475569', D, 1.4],
			['r', 14.5, 17.5, 9.5, 7, 1.5, '@', undefined, undefined, 0.7],
			['c', 11.5, 17.5, 3.8, '#64748b', D, 1.2],
			['c', 27, 17.5, 3.8, '#64748b', D, 1.2],
			['p', 'M14 14.5A5.2 5.2 0 0 1 24.4 14.5Z', '#94a3b8', D, 1.2],
			['p', 'M14.5 11L9.5 5.5L13.5 12.8Z', '#fef3c7', D, 0.9],
			['p', 'M24 11L29 5.5L25 12.8Z', '#fef3c7', D, 0.9],
			['r', 6, 16, 7, 14.5, 2, '@', '#fbbf24', 1.4],
			['p', 'M27.5 29.5L32 12', undefined, '#92400e', 2.5],
			['r', 26.5, 7.5, 10, 6.2, 1.4, '#94a3b8', '#fbbf24', 1.2]
		],
		beast: [
			['p', 'M10.5 21.5L4.5 15.5L8 24Z', '@', D, 1.2],
			['r', 10.5, 24, 3.4, 8.5, 1.2, '#1e293b'],
			['r', 23, 24, 3.4, 8.5, 1.2, '#1e293b'],
			['e', 18, 22, 9.5, 5.5, '@', D, 1.4],
			['r', 22.5, 16.2, 3.2, 10, 1.2, '#f59e0b', D, 0.8],
			['c', 28, 17, 4.5, '@', D, 1.3],
			['p', 'M25.2 13.5L23 7.5L28 13Z', '@', D, 1.1],
			['p', 'M31.2 15.8L36 18L31.2 20.5Z', '@', D, 1.1],
			['c', 29.6, 16.2, 1.2, '#fef08a']
		],
		warrior: [
			['r', 13, 17, 12.5, 14.5, 2.8, '@', D, 1.4],
			['r', 13.5, 24.5, 11.5, 2.2, 0, '#78350f'],
			['c', 19.2, 13.2, 4.3, '#e2b887', D, 1.2],
			['p', 'M14.8 13.2A4.4 4.4 0 0 1 23.6 13.2Z', '#94a3b8', D, 1.2],
			['p', 'M17 9L19.2 4.2L21.4 9Z', '@', '#fef08a', 0.8],
			['p', 'M7.5 17.5H14.5V24.5L11 28.8L7.5 24.5Z', '@', '#fbbf24', 1.4],
			['p', 'M26.5 25.5L34 10L31 27Z', '#f1f5f9', D, 1.1],
			['p', 'M25 24.5L30 26.2', undefined, '#f59e0b', 2.4]
		],
		shop: [
			['p', 'M7 15.5L10.5 8.5H29.5L33 15.5Z', '#b45309', '#fbbf24', 1.4],
			['r', 9.5, 15.5, 21, 16, 2, '#1e293b', '#8c7456', 1.4],
			['c', 20, 23.5, 3.6, '#38bdf8', '#fef08a', 1.2],
			['c', 20, 23.5, 1.5, '#ffffff']
		],
		forge: [
			['p', 'M7.5 16H31.5L28 22.5H13.5L11 29.5H29V33H9.5L7.5 16Z', '#64748b', D, 1.4],
			['p', 'M12 16H28', undefined, '#e2e8f0', 1.8],
			['c', 26.5, 10.5, 2.4, '#fbbf24'],
			['c', 20.5, 8, 1.6, '#f97316']
		],
		commander: [
			[
				'p',
				'M7.5 27.5L9.5 12L16.2 19L20 8.5L23.8 19L30.5 12L32.5 27.5Z',
				'#f59e0b',
				'#fef08a',
				1.4
			],
			['r', 7.5, 27.5, 25, 4.8, 1.6, '#92400e', '#fbbf24', 1.1],
			['c', 20, 22, 2, '#38bdf8', '#ffffff', 0.8]
		],
		chest: [
			['c', 14.5, 13.5, 2.6, '#fbbf24'],
			['c', 20, 12, 3, '#fef08a'],
			['c', 25.5, 13.5, 2.6, '#fbbf24'],
			['r', 7.5, 15.5, 25, 16.5, 2.4, '#78350f', '#fbbf24', 1.4],
			['p', 'M7.5 19.5H32.5', undefined, '#fbbf24', 1.8],
			['r', 17.8, 17, 4.4, 5.8, 1.1, '#fef08a']
		],
		tower: [
			['p', 'M11 10.5H15.5V14H18V10.5H22V14H24.5V10.5H29V17.5H11Z', '#64748b', '#cbd5e1', 1.2],
			['p', 'M13 17.5H27L29.5 32.5H10.5Z', '#475569', D, 1.4],
			['c', 20, 23.5, 2.1, '#38bdf8', '#bae6fd', 0.9]
		],
		special: [
			['p', 'M20 5L27 15.5L24.5 32H15.5L13 15.5Z', '@', '#fef08a', 1.3, 0.9],
			['c', 20, 18, 2.7, '#38bdf8', '#ffffff', 0.9]
		]
	};
</script>

<script lang="ts">
	import type { BuildingDefinition, UnitDefinition } from '$lib/engine/types';

	interface Props {
		unit?: UnitDefinition | null;
		building?: BuildingDefinition | null;
		accentColor?: string;
		size?: number;
	}

	let { unit = null, building = null, accentColor = '#f59e0b', size = 32 }: Props = $props();

	let kind = $derived.by<SilhouetteKind>(() => {
		if (building?.specialType === 'shop') return 'shop';
		if (building?.specialType === 'forge') return 'forge';
		if (building?.specialType === 'commander') return 'commander';
		if (building?.id === 'h008' || building?.specialType === 'treasure') return 'chest';
		if (building?.specialType === 'tower') return 'tower';
		if (
			building?.specialType === 'special' ||
			building?.specialType === 'repair' ||
			building?.specialType === 'recycler'
		) {
			return 'special';
		}

		if (unit) {
			if (unit.flying) return 'flyer';
			if (unit.attack_type === 'siege') return 'siege';
			const hasCasterSpell = unit.abilities?.some(
				(a) => a.type === 'heal' || a.type === 'slow' || a.type === 'frost'
			);
			if (unit.attack_type === 'magic' || hasCasterSpell) return 'caster';
			if (unit.attack_type === 'pierce' || (unit.range ?? 0) > 200) return 'ranger';
			if (unit.armor_type === 'fort' || unit.armor_type === 'large' || unit.hp >= 800) {
				return 'colossus';
			}
			const lower = unit.name.toLowerCase();
			if (
				lower.includes('вовк') ||
				lower.includes('лев') ||
				lower.includes('гонча') ||
				lower.includes('ведм') ||
				lower.includes('пантер') ||
				lower.includes('тигр') ||
				lower.includes('крок') ||
				lower.includes('павук')
			) {
				return 'beast';
			}
			return 'warrior';
		}

		return 'special';
	});

	let shapes = $derived(SILHOUETTES[kind]);

	function resolveFill(val?: string): string | undefined {
		return val === '@' ? accentColor : val;
	}
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 40 40"
	fill="none"
	stroke-linecap="round"
	stroke-linejoin="round"
	xmlns="http://www.w3.org/2000/svg"
	class="shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
	aria-hidden="true"
>
	<ellipse cx="20" cy="34.5" rx="11" ry="2.6" fill="#000000" fill-opacity="0.45" />
	{#each shapes as s, i (i)}
		{#if s[0] === 'p'}
			<path
				d={s[1]}
				fill={resolveFill(s[2]) ?? 'none'}
				fill-opacity={s[5]}
				stroke={resolveFill(s[3])}
				stroke-width={s[4]}
			/>
		{:else if s[0] === 'c'}
			<circle
				cx={s[1]}
				cy={s[2]}
				r={s[3]}
				fill={resolveFill(s[4]) ?? 'none'}
				fill-opacity={s[7]}
				stroke={resolveFill(s[5])}
				stroke-width={s[6]}
			/>
		{:else if s[0] === 'e'}
			<ellipse
				cx={s[1]}
				cy={s[2]}
				rx={s[3]}
				ry={s[4]}
				fill={resolveFill(s[5]) ?? 'none'}
				fill-opacity={s[8]}
				stroke={resolveFill(s[6])}
				stroke-width={s[7]}
			/>
		{:else}
			<rect
				x={s[1]}
				y={s[2]}
				width={s[3]}
				height={s[4]}
				rx={s[5]}
				fill={resolveFill(s[6]) ?? 'none'}
				fill-opacity={s[9]}
				stroke={resolveFill(s[7])}
				stroke-width={s[8]}
			/>
		{/if}
	{/each}
</svg>
