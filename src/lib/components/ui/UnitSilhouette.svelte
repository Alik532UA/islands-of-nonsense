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
	viewBox="0 0 36 36"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	class="shrink-0 drop-shadow-[0_2px_3px_rgba(0,0,0,0.85)]"
	aria-hidden="true"
>
	{#if kind === 'flyer'}
		<!-- Winged Dragon / Wyvern -->
		<path
			d="M17 17L5 8L8 19L14 19Z"
			fill={accentColor}
			fill-opacity="0.88"
			stroke="#0f172a"
			stroke-width="1.2"
		/>
		<path
			d="M19 17L31 8L28 19L22 19Z"
			fill={accentColor}
			fill-opacity="0.88"
			stroke="#0f172a"
			stroke-width="1.2"
		/>
		<path d="M13 22L7 28L15 24Z" fill={accentColor} stroke="#0f172a" stroke-width="1.1" />
		<ellipse
			cx="18"
			cy="19"
			rx="5.5"
			ry="4.2"
			fill={accentColor}
			stroke="#0f172a"
			stroke-width="1.2"
		/>
		<path d="M21 15L27 12L26 16.5L21 17Z" fill="#1e293b" stroke="#fef08a" stroke-width="0.9" />
		<path d="M20 13L18 9L22 12.5Z" fill="#fef3c7" />
		<circle cx="28.5" cy="14" r="2.2" fill="#f97316" />
		<circle cx="29" cy="14" r="1" fill="#fef08a" />
	{:else if kind === 'siege'}
		<!-- 4-Wheeled Siege Cannon -->
		<circle cx="11" cy="12" r="3" fill="#334155" stroke="#0f172a" stroke-width="1.1" />
		<circle cx="24" cy="12" r="3" fill="#334155" stroke="#0f172a" stroke-width="1.1" />
		<circle cx="11" cy="24" r="3" fill="#334155" stroke="#0f172a" stroke-width="1.1" />
		<circle cx="24" cy="24" r="3" fill="#334155" stroke="#0f172a" stroke-width="1.1" />
		<rect
			x="8"
			y="13"
			width="18"
			height="10"
			rx="2.5"
			fill="#78350f"
			stroke="#1c1917"
			stroke-width="1.2"
		/>
		<rect
			x="11"
			y="15"
			width="11"
			height="6"
			rx="1.5"
			fill={accentColor}
			stroke="#d97706"
			stroke-width="1"
		/>
		<rect
			x="15"
			y="15.5"
			width="15"
			height="5"
			rx="2"
			fill="#475569"
			stroke="#0f172a"
			stroke-width="1.2"
		/>
		<circle cx="30" cy="18" r="2.6" fill="#d97706" stroke="#0f172a" stroke-width="1" />
	{:else if kind === 'caster'}
		<!-- Hooded Archmage with Arcane Staff -->
		<path d="M12 18L22 18L24 29L10 29Z" fill={accentColor} stroke="#0f172a" stroke-width="1.2" />
		<path d="M11 27.5H23" stroke="#fbbf24" stroke-width="1.4" />
		<circle cx="17" cy="13" r="4" fill="#e2b887" stroke="#0f172a" stroke-width="1.1" />
		<path d="M12 14L17 5.5L22 14Z" fill="#1e293b" stroke="#fbbf24" stroke-width="1.1" />
		<line
			x1="27"
			y1="9"
			x2="26"
			y2="29"
			stroke="#92400e"
			stroke-width="2.2"
			stroke-linecap="round"
		/>
		<circle cx="27" cy="8.5" r="3.2" fill="#38bdf8" />
		<circle cx="27" cy="8.5" r="1.5" fill="#ffffff" />
	{:else if kind === 'ranger'}
		<!-- Hooded Archer with Drawn Bow -->
		<rect
			x="11"
			y="15"
			width="9"
			height="10"
			rx="2.5"
			fill={accentColor}
			stroke="#0f172a"
			stroke-width="1.2"
		/>
		<path d="M9 12L12 12L11 20L8 20Z" fill="#78350f" />
		<circle cx="15.5" cy="11.5" r="3.6" fill="#e2b887" stroke="#0f172a" stroke-width="1.1" />
		<path d="M11 12L15 6.5L19.5 11.5Z" fill="#065f46" stroke="#0f172a" stroke-width="1" />
		<path d="M21 8C27 12 27 24 21 28" stroke="#b45309" stroke-width="2.2" stroke-linecap="round" />
		<line x1="21" y1="8.5" x2="17" y2="18" stroke="#e2e8f0" stroke-width="1" />
		<line x1="21" y1="27.5" x2="17" y2="18" stroke="#e2e8f0" stroke-width="1" />
		<line x1="16" y1="18" x2="30" y2="18" stroke="#fef08a" stroke-width="1.5" />
		<path d="M31.5 18L27.5 15.8V20.2Z" fill="#e2e8f0" />
	{:else if kind === 'colossus'}
		<!-- Horned Tank with Tower Shield & Warhammer -->
		<rect
			x="11"
			y="14"
			width="13"
			height="14"
			rx="3"
			fill="#475569"
			stroke="#0f172a"
			stroke-width="1.2"
		/>
		<circle cx="10.5" cy="16" r="3.2" fill="#64748b" stroke="#0f172a" stroke-width="1.1" />
		<circle cx="24.5" cy="16" r="3.2" fill="#64748b" stroke="#0f172a" stroke-width="1.1" />
		<path d="M13 13A4.5 4.5 0 0 1 22 13Z" fill="#94a3b8" stroke="#0f172a" stroke-width="1.1" />
		<path d="M13.5 10L9.5 5.5L12.5 11.5Z" fill="#fef3c7" />
		<path d="M21.5 10L25.5 5.5L22.5 11.5Z" fill="#fef3c7" />
		<rect
			x="6"
			y="15"
			width="6"
			height="12"
			rx="1.8"
			fill={accentColor}
			stroke="#fbbf24"
			stroke-width="1.2"
		/>
		<line x1="25" y1="26" x2="29" y2="11" stroke="#78350f" stroke-width="2.2" />
		<rect
			x="24"
			y="7"
			width="9"
			height="5.5"
			rx="1.2"
			fill="#94a3b8"
			stroke="#fbbf24"
			stroke-width="1.1"
		/>
	{:else if kind === 'beast'}
		<!-- Prowling War Beast -->
		<path d="M10 19L5 14L8 21Z" fill={accentColor} stroke="#0f172a" stroke-width="1.1" />
		<rect x="10" y="21" width="3" height="7" rx="1" fill="#1e293b" />
		<rect x="21" y="21" width="3" height="7" rx="1" fill="#1e293b" />
		<ellipse
			cx="16.5"
			cy="19.5"
			rx="8.5"
			ry="4.8"
			fill={accentColor}
			stroke="#0f172a"
			stroke-width="1.2"
		/>
		<rect x="20.5" y="14.5" width="3" height="9" rx="1" fill="#d97706" />
		<circle cx="25.5" cy="15.5" r="4" fill={accentColor} stroke="#0f172a" stroke-width="1.2" />
		<path d="M23 12.5L21 7.5L25.5 12Z" fill={accentColor} stroke="#0f172a" stroke-width="1" />
		<path
			d="M28.5 14.5L32.5 16.5L28.5 18.5Z"
			fill={accentColor}
			stroke="#0f172a"
			stroke-width="1"
		/>
		<circle cx="27" cy="14.8" r="1.1" fill="#fef08a" />
	{:else if kind === 'warrior'}
		<!-- Crested Melee Knight with Shield & Broadsword -->
		<rect
			x="12"
			y="15"
			width="11"
			height="13"
			rx="2.5"
			fill={accentColor}
			stroke="#0f172a"
			stroke-width="1.2"
		/>
		<rect x="12.5" y="21.5" width="10" height="2" fill="#78350f" />
		<circle cx="17.5" cy="12" r="3.8" fill="#e2b887" stroke="#0f172a" stroke-width="1.1" />
		<path d="M13.5 12A4 4 0 0 1 21.5 12Z" fill="#94a3b8" stroke="#0f172a" stroke-width="1.1" />
		<path d="M15.5 8L17.5 4.2L19.5 8Z" fill={accentColor} />
		<path
			d="M7.5 16H13.5V22L10.5 25.5L7.5 22Z"
			fill={accentColor}
			stroke="#fbbf24"
			stroke-width="1.2"
		/>
		<path d="M24 23L30.5 9.5L28 24.5Z" fill="#e2e8f0" stroke="#0f172a" stroke-width="1" />
		<line x1="22.5" y1="22" x2="27" y2="23.5" stroke="#d97706" stroke-width="2" />
	{:else if kind === 'shop'}
		<!-- Market Stall / Artifact Bag -->
		<path d="M7 14L10 8H26L29 14Z" fill="#b45309" stroke="#fbbf24" stroke-width="1.2" />
		<rect
			x="9"
			y="14"
			width="18"
			height="14"
			rx="2"
			fill="#1e293b"
			stroke="#8c7456"
			stroke-width="1.2"
		/>
		<circle cx="18" cy="21" r="4" fill="#38bdf8" stroke="#fef08a" stroke-width="1.2" />
		<circle cx="18" cy="21" r="1.7" fill="#ffffff" />
	{:else if kind === 'forge'}
		<!-- War Forge Anvil -->
		<path
			d="M7 14H28L25 20H12L10 26H26V29H9L7 14Z"
			fill="#64748b"
			stroke="#0f172a"
			stroke-width="1.2"
		/>
		<path d="M12 14H25" stroke="#cbd5e1" stroke-width="1.5" />
		<circle cx="24" cy="9.5" r="2" fill="#fbbf24" />
		<circle cx="19" cy="7.5" r="1.3" fill="#f97316" />
	{:else if kind === 'commander'}
		<!-- Commander Hall Crown -->
		<path
			d="M7 24L9 11L15 17L18 8L21 17L27 11L29 24Z"
			fill="#f59e0b"
			stroke="#fef08a"
			stroke-width="1.3"
		/>
		<rect
			x="7"
			y="24"
			width="22"
			height="4"
			rx="1.5"
			fill="#92400e"
			stroke="#fbbf24"
			stroke-width="1"
		/>
	{:else if kind === 'chest'}
		<!-- Treasure Chest -->
		<rect
			x="7"
			y="14"
			width="22"
			height="14"
			rx="2"
			fill="#78350f"
			stroke="#fbbf24"
			stroke-width="1.3"
		/>
		<path d="M7 17H29" stroke="#fbbf24" stroke-width="1.6" />
		<rect x="16" y="15" width="4" height="5" rx="1" fill="#fef08a" />
		<circle cx="13" cy="12" r="2.2" fill="#fbbf24" />
		<circle cx="18" cy="11" r="2.5" fill="#fef08a" />
		<circle cx="23" cy="12" r="2.2" fill="#fbbf24" />
	{:else if kind === 'tower'}
		<!-- Guard Watchtower -->
		<path
			d="M10 10H14V13H16V10H20V13H22V10H26V16H10Z"
			fill="#64748b"
			stroke="#cbd5e1"
			stroke-width="1.1"
		/>
		<path d="M12 16H24L26 29H10Z" fill="#475569" stroke="#0f172a" stroke-width="1.2" />
		<circle cx="18" cy="21" r="2.2" fill="#38bdf8" />
	{:else}
		<!-- Arcane Obelisk / Special Structure -->
		<path
			d="M18 5L24 14L22 28H14L12 14Z"
			fill={accentColor}
			fill-opacity="0.85"
			stroke="#fef08a"
			stroke-width="1.2"
		/>
		<circle cx="18" cy="16" r="3" fill="#38bdf8" />
		<circle cx="18" cy="16" r="1.3" fill="#ffffff" />
	{/if}
</svg>
