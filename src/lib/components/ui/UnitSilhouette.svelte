<script lang="ts">
	import type { BuildingDefinition, UnitDefinition } from '$lib/engine/types';

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
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 40 40"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	class="shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
	aria-hidden="true"
>
	<!-- Subtle Ground Shadow -->
	<ellipse cx="20" cy="34.5" rx="11" ry="2.6" fill="#000000" fill-opacity="0.45" />

	{#if kind === 'flyer'}
		<!-- Winged Dragon / Wyvern -->
		<path
			d="M19 19L4 7L6.5 21L14.5 21.5Z"
			fill={accentColor}
			fill-opacity="0.9"
			stroke="#090d16"
			stroke-width="1.3"
		/>
		<path
			d="M21 19L36 7L33.5 21L25.5 21.5Z"
			fill={accentColor}
			fill-opacity="0.9"
			stroke="#090d16"
			stroke-width="1.3"
		/>
		<path d="M18.5 18.5L5.5 8.5" stroke="#fef3c7" stroke-opacity="0.65" stroke-width="1.2" />
		<path d="M21.5 18.5L34.5 8.5" stroke="#fef3c7" stroke-opacity="0.65" stroke-width="1.2" />
		<path d="M14.5 24.5L7.5 32.5L17 26.5Z" fill={accentColor} stroke="#090d16" stroke-width="1.2" />
		<ellipse
			cx="20"
			cy="21"
			rx="6.2"
			ry="5"
			fill={accentColor}
			stroke="#090d16"
			stroke-width="1.4"
		/>
		<ellipse cx="20" cy="22.3" rx="3.8" ry="2.4" fill="#fef08a" fill-opacity="0.45" />
		<path
			d="M22.5 16L30.5 12.5L29 18L22.5 18.5Z"
			fill="#1e293b"
			stroke="#fbbf24"
			stroke-width="1"
		/>
		<path d="M21.5 14L19 9L24 13.5Z" fill="#fef3c7" />
		<circle cx="26.5" cy="14.7" r="1.1" fill="#fbbf24" />
		<circle cx="32.2" cy="15.2" r="2.8" fill="#f97316" fill-opacity="0.88" />
		<circle cx="32.6" cy="15.2" r="1.3" fill="#fef08a" />
	{:else if kind === 'siege'}
		<!-- 4-Wheeled Siege Artillery Cannon -->
		<circle cx="11.5" cy="13" r="3.6" fill="#334155" stroke="#090d16" stroke-width="1.3" />
		<circle cx="26.5" cy="13" r="3.6" fill="#334155" stroke="#090d16" stroke-width="1.3" />
		<circle cx="11.5" cy="27" r="3.6" fill="#334155" stroke="#090d16" stroke-width="1.3" />
		<circle cx="26.5" cy="27" r="3.6" fill="#334155" stroke="#090d16" stroke-width="1.3" />
		<circle cx="11.5" cy="13" r="1.3" fill="#cbd5e1" />
		<circle cx="26.5" cy="13" r="1.3" fill="#cbd5e1" />
		<circle cx="11.5" cy="27" r="1.3" fill="#cbd5e1" />
		<circle cx="26.5" cy="27" r="1.3" fill="#cbd5e1" />
		<rect
			x="8.5"
			y="14"
			width="20.5"
			height="12"
			rx="2.5"
			fill="#78350f"
			stroke="#1c1917"
			stroke-width="1.3"
		/>
		<rect
			x="11.5"
			y="16.2"
			width="12"
			height="7.6"
			rx="1.6"
			fill={accentColor}
			stroke="#fbbf24"
			stroke-width="1"
		/>
		<rect
			x="16.5"
			y="17"
			width="17"
			height="6"
			rx="2"
			fill="#475569"
			stroke="#090d16"
			stroke-width="1.3"
		/>
		<line
			x1="18"
			y1="18.5"
			x2="31"
			y2="18.5"
			stroke="#cbd5e1"
			stroke-opacity="0.45"
			stroke-width="1.1"
		/>
		<circle cx="33.5" cy="20" r="3" fill="#f59e0b" stroke="#090d16" stroke-width="1.1" />
	{:else if kind === 'caster'}
		<!-- Hooded Archmage with Arcane Staff -->
		<path d="M12.5 20L24.5 20L27 33H10Z" fill={accentColor} stroke="#090d16" stroke-width="1.4" />
		<path d="M14.5 20H22.5L23.5 31H13.5Z" fill="#ffffff" fill-opacity="0.14" />
		<path d="M11 31.2H26" stroke="#fbbf24" stroke-width="1.6" />
		<circle cx="18.5" cy="14" r="4.5" fill="#e2b887" stroke="#090d16" stroke-width="1.2" />
		<path d="M13 15.2L18.5 5.2L24 15.2Z" fill="#1e293b" stroke="#fbbf24" stroke-width="1.2" />
		<circle cx="17.2" cy="14" r="0.85" fill="#38bdf8" />
		<circle cx="20.2" cy="14" r="0.85" fill="#38bdf8" />
		<line
			x1="30.5"
			y1="10"
			x2="29"
			y2="33"
			stroke="#92400e"
			stroke-width="2.5"
			stroke-linecap="round"
		/>
		<circle cx="30.5" cy="9.5" r="4.4" fill="#38bdf8" fill-opacity="0.35" />
		<circle cx="30.5" cy="9.5" r="3" fill="#38bdf8" stroke="#bae6fd" stroke-width="0.9" />
		<circle cx="30.5" cy="9.5" r="1.4" fill="#ffffff" />
	{:else if kind === 'ranger'}
		<!-- Cloaked Archer with Quiver & Drawn Bow -->
		<path d="M9 13L13 13L11.5 22L8 22Z" fill="#92400e" stroke="#090d16" stroke-width="1" />
		<path d="M12 18L22 18L23 32H11Z" fill={accentColor} stroke="#090d16" stroke-width="1.4" />
		<path d="M14 19L20 19L20.5 27H13.5Z" fill="#ffffff" fill-opacity="0.16" />
		<circle cx="17" cy="12.8" r="4.1" fill="#e2b887" stroke="#090d16" stroke-width="1.2" />
		<path d="M12 13.5L17 6.5L22 13.5Z" fill="#065f46" stroke="#34d399" stroke-width="1" />
		<path
			d="M23.5 8.5C30.5 13 30.5 27 23.5 31.5"
			stroke="#d97706"
			stroke-width="2.4"
			stroke-linecap="round"
		/>
		<line x1="23.5" y1="9" x2="18.5" y2="20" stroke="#e2e8f0" stroke-width="1" />
		<line x1="23.5" y1="31" x2="18.5" y2="20" stroke="#e2e8f0" stroke-width="1" />
		<line x1="17.5" y1="20" x2="34" y2="20" stroke="#fef08a" stroke-width="1.7" />
		<path d="M35.5 20L31 17.4V22.6Z" fill="#f8fafc" />
	{:else if kind === 'colossus'}
		<!-- Horned Tank with Tower Shield & Warhammer -->
		<rect
			x="12"
			y="15.5"
			width="14.5"
			height="16.5"
			rx="3.2"
			fill="#475569"
			stroke="#090d16"
			stroke-width="1.4"
		/>
		<rect x="14.5" y="17.5" width="9.5" height="7" rx="1.5" fill={accentColor} fill-opacity="0.7" />
		<circle cx="11.5" cy="17.5" r="3.8" fill="#64748b" stroke="#090d16" stroke-width="1.2" />
		<circle cx="27" cy="17.5" r="3.8" fill="#64748b" stroke="#090d16" stroke-width="1.2" />
		<path
			d="M14 14.5A5.2 5.2 0 0 1 24.4 14.5Z"
			fill="#94a3b8"
			stroke="#090d16"
			stroke-width="1.2"
		/>
		<path d="M14.5 11L9.5 5.5L13.5 12.8Z" fill="#fef3c7" stroke="#090d16" stroke-width="0.9" />
		<path d="M24 11L29 5.5L25 12.8Z" fill="#fef3c7" stroke="#090d16" stroke-width="0.9" />
		<rect
			x="6"
			y="16"
			width="7"
			height="14.5"
			rx="2"
			fill={accentColor}
			stroke="#fbbf24"
			stroke-width="1.4"
		/>
		<line
			x1="9.5"
			y1="18.5"
			x2="9.5"
			y2="28"
			stroke="#fef08a"
			stroke-opacity="0.7"
			stroke-width="1.3"
		/>
		<line
			x1="27.5"
			y1="29.5"
			x2="32"
			y2="12"
			stroke="#92400e"
			stroke-width="2.5"
			stroke-linecap="round"
		/>
		<rect
			x="26.5"
			y="7.5"
			width="10"
			height="6.2"
			rx="1.4"
			fill="#94a3b8"
			stroke="#fbbf24"
			stroke-width="1.2"
		/>
	{:else if kind === 'beast'}
		<!-- Prowling War Beast -->
		<path d="M10.5 21.5L4.5 15.5L8 24Z" fill={accentColor} stroke="#090d16" stroke-width="1.2" />
		<rect x="10.5" y="24" width="3.4" height="8.5" rx="1.2" fill="#1e293b" />
		<rect x="23" y="24" width="3.4" height="8.5" rx="1.2" fill="#1e293b" />
		<ellipse
			cx="18"
			cy="22"
			rx="9.5"
			ry="5.5"
			fill={accentColor}
			stroke="#090d16"
			stroke-width="1.4"
		/>
		<ellipse cx="17.5" cy="20" rx="6.2" ry="2.6" fill="#ffffff" fill-opacity="0.18" />
		<rect
			x="22.5"
			y="16.2"
			width="3.2"
			height="10"
			rx="1.2"
			fill="#f59e0b"
			stroke="#090d16"
			stroke-width="0.8"
		/>
		<circle cx="28" cy="17" r="4.5" fill={accentColor} stroke="#090d16" stroke-width="1.3" />
		<path d="M25.2 13.5L23 7.5L28 13Z" fill={accentColor} stroke="#090d16" stroke-width="1.1" />
		<path d="M31.2 15.8L36 18L31.2 20.5Z" fill={accentColor} stroke="#090d16" stroke-width="1.1" />
		<circle cx="29.6" cy="16.2" r="1.2" fill="#fef08a" />
	{:else if kind === 'warrior'}
		<!-- Crested Melee Knight with Kite Shield & Broadsword -->
		<rect
			x="13"
			y="17"
			width="12.5"
			height="14.5"
			rx="2.8"
			fill={accentColor}
			stroke="#090d16"
			stroke-width="1.4"
		/>
		<rect x="15.5" y="18.5" width="7.5" height="5.5" rx="1.2" fill="#ffffff" fill-opacity="0.2" />
		<rect x="13.5" y="24.5" width="11.5" height="2.2" fill="#78350f" />
		<rect x="18" y="24" width="2.5" height="3.2" rx="0.5" fill="#fbbf24" />
		<circle cx="19.2" cy="13.2" r="4.3" fill="#e2b887" stroke="#090d16" stroke-width="1.2" />
		<path
			d="M14.8 13.2A4.4 4.4 0 0 1 23.6 13.2Z"
			fill="#94a3b8"
			stroke="#090d16"
			stroke-width="1.2"
		/>
		<path d="M17 9L19.2 4.2L21.4 9Z" fill={accentColor} stroke="#fef08a" stroke-width="0.8" />
		<path
			d="M7.5 17.5H14.5V24.5L11 28.8L7.5 24.5Z"
			fill={accentColor}
			stroke="#fbbf24"
			stroke-width="1.4"
		/>
		<path d="M26.5 25.5L34 10L31 27Z" fill="#f1f5f9" stroke="#090d16" stroke-width="1.1" />
		<line
			x1="25"
			y1="24.5"
			x2="30"
			y2="26.2"
			stroke="#f59e0b"
			stroke-width="2.4"
			stroke-linecap="round"
		/>
	{:else if kind === 'shop'}
		<!-- Market Stall / Arcane Merchant -->
		<path d="M7 15.5L10.5 8.5H29.5L33 15.5Z" fill="#b45309" stroke="#fbbf24" stroke-width="1.4" />
		<path
			d="M12.5 8.5L11 15.5M20 8.5V15.5M27.5 8.5L29 15.5"
			stroke="#fef08a"
			stroke-opacity="0.6"
			stroke-width="1.1"
		/>
		<rect
			x="9.5"
			y="15.5"
			width="21"
			height="16"
			rx="2"
			fill="#1e293b"
			stroke="#8c7456"
			stroke-width="1.4"
		/>
		<circle cx="20" cy="23.5" r="5" fill="#38bdf8" fill-opacity="0.3" />
		<circle cx="20" cy="23.5" r="3.6" fill="#38bdf8" stroke="#fef08a" stroke-width="1.2" />
		<circle cx="20" cy="23.5" r="1.5" fill="#ffffff" />
	{:else if kind === 'forge'}
		<!-- War Forge Anvil & Glowing Sparks -->
		<path
			d="M7.5 16H31.5L28 22.5H13.5L11 29.5H29V33H9.5L7.5 16Z"
			fill="#64748b"
			stroke="#090d16"
			stroke-width="1.4"
		/>
		<path d="M12 16H28" stroke="#e2e8f0" stroke-width="1.8" />
		<circle cx="26.5" cy="10.5" r="2.4" fill="#fbbf24" />
		<circle cx="20.5" cy="8" r="1.6" fill="#f97316" />
		<circle cx="15.5" cy="11.5" r="1.2" fill="#fef08a" />
	{:else if kind === 'commander'}
		<!-- Commander Hall Royal Crown -->
		<path
			d="M7.5 27.5L9.5 12L16.2 19L20 8.5L23.8 19L30.5 12L32.5 27.5Z"
			fill="#f59e0b"
			stroke="#fef08a"
			stroke-width="1.4"
		/>
		<rect
			x="7.5"
			y="27.5"
			width="25"
			height="4.8"
			rx="1.6"
			fill="#92400e"
			stroke="#fbbf24"
			stroke-width="1.1"
		/>
		<circle cx="20" cy="22" r="2" fill="#38bdf8" stroke="#ffffff" stroke-width="0.8" />
	{:else if kind === 'chest'}
		<!-- Treasure Chest & Gold -->
		<circle cx="14.5" cy="13.5" r="2.6" fill="#fbbf24" />
		<circle cx="20" cy="12" r="3" fill="#fef08a" />
		<circle cx="25.5" cy="13.5" r="2.6" fill="#fbbf24" />
		<rect
			x="7.5"
			y="15.5"
			width="25"
			height="16.5"
			rx="2.4"
			fill="#78350f"
			stroke="#fbbf24"
			stroke-width="1.4"
		/>
		<path d="M7.5 19.5H32.5" stroke="#fbbf24" stroke-width="1.8" />
		<rect x="17.8" y="17" width="4.4" height="5.8" rx="1.1" fill="#fef08a" />
	{:else if kind === 'tower'}
		<!-- Guard Watchtower -->
		<path
			d="M11 10.5H15.5V14H18V10.5H22V14H24.5V10.5H29V17.5H11Z"
			fill="#64748b"
			stroke="#cbd5e1"
			stroke-width="1.2"
		/>
		<path d="M13 17.5H27L29.5 32.5H10.5Z" fill="#475569" stroke="#090d16" stroke-width="1.4" />
		<circle cx="20" cy="23.5" r="3.4" fill="#38bdf8" fill-opacity="0.35" />
		<circle cx="20" cy="23.5" r="2.1" fill="#38bdf8" stroke="#bae6fd" stroke-width="0.9" />
	{:else}
		<!-- Arcane Obelisk / Special Structure -->
		<path
			d="M20 5L27 15.5L24.5 32H15.5L13 15.5Z"
			fill={accentColor}
			fill-opacity="0.9"
			stroke="#fef08a"
			stroke-width="1.3"
		/>
		<path d="M20 7.5L23.8 15.5L22.4 29H17.6L16.2 15.5Z" fill="#ffffff" fill-opacity="0.16" />
		<circle cx="20" cy="18" r="4.2" fill="#38bdf8" fill-opacity="0.35" />
		<circle cx="20" cy="18" r="2.7" fill="#38bdf8" stroke="#ffffff" stroke-width="0.9" />
	{/if}
</svg>
