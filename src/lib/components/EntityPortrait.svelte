<script lang="ts">
	import type { Building, Castle, PlayerState, Unit } from '$lib/engine/types';
	import { WORKER_RACE_SPECS, resolveCanonicalWorkerRace } from '$lib/renderer/workerModels';
	import {
		getCastleStageIndex,
		WEST_CASTLE_STAGE_URLS,
		EAST_CASTLE_STAGE_URLS
	} from '$lib/renderer/castleAssets';
	import { settings } from '$lib/services/settings.svelte';

	let {
		entityType,
		player,
		localTeam,
		selectedUnit = null,
		placedBuilding = null,
		buildingRace = 'Альянс',
		selectedCastle = null
	}: {
		entityType: 'worker' | 'unit' | 'building' | 'castle' | 'group' | 'none';
		player: PlayerState;
		localTeam: 'west' | 'east';
		selectedUnit?: Unit | null;
		placedBuilding?: Building | null;
		buildingRace?: string;
		selectedCastle?: Castle | null;
	} = $props();

	function hexStr(n: number): string {
		return `#${n.toString(16).padStart(6, '0')}`;
	}

	function hashId(id: string): number {
		let h = 2166136261;
		for (let i = 0; i < id.length; i++) {
			h ^= id.charCodeAt(i);
			h = Math.imul(h, 16777619);
		}
		return h >>> 0;
	}

	type UnitArchetype =
		| 'dragon'
		| 'golem'
		| 'mech'
		| 'mage'
		| 'archer'
		| 'beast'
		| 'demon'
		| 'naga'
		| 'undead'
		| 'knight';

	function resolveUnitArchetype(u: Unit): UnitArchetype {
		const n = (u.name || '').toLowerCase();
		if (n.includes('дракон') || n.includes('змій') || n.includes('віверн') || u.flying) {
			if (
				n.includes('гірокоптер') ||
				n.includes('планер') ||
				n.includes('штурмовик') ||
				n.includes('роттеро')
			)
				return 'mech';
			return 'dragon';
		}
		if (n.includes('голем') || n.includes('інфернал') || n.includes('черепаха')) return 'golem';
		if (
			n.includes('танк') ||
			n.includes('мортир') ||
			n.includes('броненосець') ||
			n.includes('руйнівник') ||
			n.includes('далекомір') ||
			n.includes('мінер') ||
			n.includes('сміттяр') ||
			n.includes('дробар') ||
			n.includes('навідник') ||
			n.includes('каменекидач') ||
			n.includes('вогнеметник')
		) {
			return 'mech';
		}
		if (
			n.includes('некромант') ||
			n.includes('лич') ||
			n.includes('банші') ||
			n.includes('вурдалак') ||
			n.includes('скелет') ||
			n.includes('вампір') ||
			n.includes('м’ясник') ||
			n.includes("м'ясник") ||
			n.includes('чуми')
		) {
			return 'undead';
		}
		if (
			n.includes('суккуб') ||
			n.includes('демон') ||
			n.includes('чорнокнижник') ||
			n.includes('хаос')
		)
			return 'demon';
		if (
			n.includes('сирена') ||
			n.includes('мурлок') ||
			n.includes('гідра') ||
			n.includes('відьма') ||
			n.includes('хвиль')
		)
			return 'naga';
		if (
			n.includes('вовк') ||
			n.includes('пес') ||
			n.includes('вандіго') ||
			n.includes('кодо') ||
			n.includes('магнатор')
		)
			return 'beast';
		if (
			u.attackType === 'magic' ||
			n.includes('чарів') ||
			n.includes('друїд') ||
			n.includes('заклина') ||
			n.includes('елементаль') ||
			n.includes('зорекидач') ||
			n.includes('королева') ||
			n.includes('імператриця')
		) {
			return 'mage';
		}
		if (
			u.attackType === 'pierce' ||
			n.includes('лучник') ||
			n.includes('лучниц') ||
			n.includes('стрілец') ||
			n.includes('рейнджер') ||
			n.includes('мислив') ||
			n.includes('слідопит')
		) {
			return 'archer';
		}
		return 'knight';
	}

	const RACE_BANNER_COLORS: Record<string, { primary: string; accent: string; glow: string }> = {
		Альянс: { primary: '#2563eb', accent: '#fbbf24', glow: 'rgba(59,130,246,0.35)' },
		Орки: { primary: '#b91c1c', accent: '#f59e0b', glow: 'rgba(220,38,38,0.35)' },
		Нежить: { primary: '#581c87', accent: '#4ade80', glow: 'rgba(74,222,128,0.3)' },
		Ельфи: { primary: '#059669', accent: '#fde047', glow: 'rgba(52,211,153,0.35)' },
		Демони: { primary: '#991b1b', accent: '#f97316', glow: 'rgba(249,115,22,0.4)' },
		Північ: { primary: '#0284c7', accent: '#e0f2fe', glow: 'rgba(56,189,248,0.35)' },
		Небожителі: { primary: '#ca8a04', accent: '#fef9c3', glow: 'rgba(250,204,21,0.4)' },
		Тролі: { primary: '#0f766e', accent: '#2dd4bf', glow: 'rgba(45,212,191,0.35)' },
		Елементалі: { primary: '#6d28d9', accent: '#67e8f9', glow: 'rgba(103,232,249,0.35)' },
		Тварини: { primary: '#b45309', accent: '#fde68a', glow: 'rgba(245,158,11,0.35)' },
		Наги: { primary: '#0e7490', accent: '#fb7185', glow: 'rgba(6,182,212,0.35)' },
		Техніки: { primary: '#92400e', accent: '#38bdf8', glow: 'rgba(56,189,248,0.35)' }
	};
</script>

{#if entityType === 'castle' && selectedCastle}
	{@const isFriendly = selectedCastle.team === localTeam}
	{#if settings.graphicsStyle === 'hd-webp'}
		{@const cStage = getCastleStageIndex(selectedCastle.hp, selectedCastle.maxHp)}
		{@const castleUrl =
			selectedCastle.team === 'west'
				? WEST_CASTLE_STAGE_URLS[cStage]
				: EAST_CASTLE_STAGE_URLS[cStage]}
		<img
			src={castleUrl}
			alt={isFriendly ? 'Ваш Замок' : 'Замок Ворога'}
			class="w-full h-full object-contain drop-shadow portrait-float"
		/>
	{:else}
		{@const cPrimary = selectedCastle.team === 'west' ? '#2563eb' : '#dc2626'}
		{@const cLight = selectedCastle.team === 'west' ? '#60a5fa' : '#f87171'}
		<div
			class="w-full h-full flex items-center justify-center relative"
			style="background: radial-gradient(circle at 50% 42%, {selectedCastle.team === 'west'
				? 'rgba(37,99,235,0.28)'
				: 'rgba(220,38,38,0.28)'}, #090d16 78%);"
		>
			<svg viewBox="0 0 80 80" class="w-16 h-16 drop-shadow-lg portrait-float">
				<!-- Keep shadow -->
				<ellipse cx="40" cy="68" rx="26" ry="5" fill="#000000" opacity="0.45" />
				<!-- Side towers -->
				<rect
					x="14"
					y="30"
					width="14"
					height="34"
					rx="2"
					fill="#334155"
					stroke="#0f172a"
					stroke-width="2"
				/>
				<rect
					x="52"
					y="30"
					width="14"
					height="34"
					rx="2"
					fill="#334155"
					stroke="#0f172a"
					stroke-width="2"
				/>
				<polygon points="12,30 21,18 30,30" fill={cPrimary} stroke="#0f172a" stroke-width="2" />
				<polygon points="50,30 59,18 68,30" fill={cPrimary} stroke="#0f172a" stroke-width="2" />
				<!-- Central keep -->
				<rect
					x="26"
					y="24"
					width="28"
					height="40"
					rx="2"
					fill="#475569"
					stroke="#0f172a"
					stroke-width="2"
				/>
				<polygon points="24,24 40,8 56,24" fill={cPrimary} stroke="#0f172a" stroke-width="2" />
				<!-- Gate & crystal -->
				<path d="M34 64 V50 A6 6 0 0 1 46 50 V64 Z" fill="#0f172a" />
				<circle cx="40" cy="34" r="4.5" fill={cLight} />
				<!-- Pennant -->
				<line x1="40" y1="8" x2="40" y2="2" stroke="#fbbf24" stroke-width="2" />
				<polygon points="40,2 50,5 40,8" fill="#fbbf24" />
			</svg>
		</div>
	{/if}
{:else if entityType === 'group'}
	<div
		class="w-full h-full flex flex-col items-center justify-center relative"
		style="background: radial-gradient(circle at 50% 45%, rgba(245,158,11,0.22), #090d16 78%);"
	>
		<svg viewBox="0 0 80 80" class="w-14 h-14 portrait-float">
			<ellipse cx="40" cy="64" rx="26" ry="5" fill="#000000" opacity="0.4" />
			<!-- Back soldiers -->
			<circle cx="24" cy="34" r="7" fill="#94a3b8" stroke="#0f172a" stroke-width="2" />
			<path d="M14 58 C14 46 34 46 34 58 Z" fill="#1e40af" stroke="#0f172a" stroke-width="2" />
			<circle cx="56" cy="34" r="7" fill="#94a3b8" stroke="#0f172a" stroke-width="2" />
			<path d="M46 58 C46 46 66 46 66 58 Z" fill="#1e40af" stroke="#0f172a" stroke-width="2" />
			<!-- Front leader -->
			<circle cx="40" cy="28" r="9" fill="#fcd34d" stroke="#0f172a" stroke-width="2" />
			<path d="M27 61 C27 44 53 44 53 61 Z" fill="#2563eb" stroke="#0f172a" stroke-width="2" />
			<polygon points="34,20 40,13 46,20" fill="#fbbf24" stroke="#0f172a" stroke-width="1.5" />
		</svg>
		<span class="text-[9px] font-bold uppercase text-amber-300 tracking-wider -mt-1">Загін</span>
	</div>
{:else if entityType === 'building' && placedBuilding}
	{@const canonicalRace = resolveCanonicalWorkerRace(buildingRace)}
	{@const palette = RACE_BANNER_COLORS[canonicalRace] ?? RACE_BANNER_COLORS['Альянс']}
	{@const isEnemyBld = placedBuilding.team !== localTeam}
	<div
		class="relative group/tip w-full h-full flex flex-col items-center justify-center"
		style="background: radial-gradient(circle at 50% 45%, {isEnemyBld
			? 'rgba(225,29,72,0.28)'
			: palette.glow}, #090d16 78%);"
	>
		<svg viewBox="0 0 80 80" class="w-14 h-14 portrait-float drop-shadow-md">
			<ellipse cx="40" cy="65" rx="25" ry="5" fill="#000" opacity="0.45" />
			{#if placedBuilding.isUnderConstruction}
				<!-- Scaffolding & rising foundation -->
				<rect
					x="18"
					y="42"
					width="44"
					height="20"
					rx="2"
					fill="#475569"
					stroke="#0f172a"
					stroke-width="2"
				/>
				<line x1="20" y1="62" x2="20" y2="24" stroke="#d97706" stroke-width="3" />
				<line x1="60" y1="62" x2="60" y2="24" stroke="#d97706" stroke-width="3" />
				<line x1="16" y1="30" x2="64" y2="30" stroke="#fbbf24" stroke-width="2.5" />
				<line x1="20" y1="42" x2="60" y2="30" stroke="#b45309" stroke-width="2" />
				<rect x="33" y="48" width="14" height="14" fill="#1e293b" />
			{:else if placedBuilding.specialType === 'forge'}
				<!-- Forge Anvil & Chimney -->
				<rect
					x="20"
					y="28"
					width="40"
					height="34"
					rx="3"
					fill="#334155"
					stroke="#0f172a"
					stroke-width="2"
				/>
				<rect
					x="46"
					y="12"
					width="10"
					height="18"
					fill="#475569"
					stroke="#0f172a"
					stroke-width="2"
				/>
				<circle cx="51" cy="8" r="3.5" fill="#94a3b8" opacity="0.6" />
				<path d="M26 52 H54 L50 44 H30 Z" fill="#f97316" stroke="#0f172a" stroke-width="1.5" />
				<rect x="34" y="34" width="12" height="8" rx="1" fill="#fbbf24" />
			{:else if placedBuilding.specialType === 'shop'}
				<!-- Merchant Tent / Market -->
				<rect
					x="20"
					y="34"
					width="40"
					height="28"
					rx="2"
					fill="#475569"
					stroke="#0f172a"
					stroke-width="2"
				/>
				<polygon points="14,34 40,14 66,34" fill="#d97706" stroke="#0f172a" stroke-width="2" />
				<polygon points="24,34 40,14 56,34" fill="#fef08a" opacity="0.85" />
				<circle cx="40" cy="48" r="6" fill="#fbbf24" stroke="#78350f" stroke-width="1.5" />
			{:else if placedBuilding.specialType === 'commander'}
				<!-- Commander Hall with Crown Spire -->
				<rect
					x="20"
					y="28"
					width="40"
					height="34"
					rx="2"
					fill="#312e81"
					stroke="#0f172a"
					stroke-width="2"
				/>
				<polygon points="16,28 40,10 64,28" fill="#4f46e5" stroke="#0f172a" stroke-width="2" />
				<polygon points="33,18 40,8 47,18" fill="#fde047" stroke="#0f172a" stroke-width="1.5" />
				<path d="M34 62 V46 A6 6 0 0 1 46 46 V62 Z" fill="#0f172a" />
			{:else}
				<!-- Race Barracks / Production Building -->
				<rect
					x="18"
					y="32"
					width="44"
					height="30"
					rx="3"
					fill="#334155"
					stroke="#0f172a"
					stroke-width="2"
				/>
				<polygon
					points="14,32 40,12 66,32"
					fill={palette.primary}
					stroke="#0f172a"
					stroke-width="2"
				/>
				<rect x="34" y="44" width="12" height="18" rx="1" fill="#0f172a" />
				<circle cx="40" cy="24" r="4" fill={palette.accent} />
				<rect x="22" y="38" width="7" height="9" rx="1" fill={palette.accent} opacity="0.85" />
				<rect x="51" y="38" width="7" height="9" rx="1" fill={palette.accent} opacity="0.85" />
			{/if}
		</svg>
		<span class="text-[9px] font-bold uppercase truncate max-w-[104px] text-amber-200 -mt-1">
			{canonicalRace}
		</span>
		<div
			class="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-md border border-[#544738] bg-[#0f141f]/95 px-2.5 py-1 text-[11px] text-amber-100 shadow-2xl opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150"
		>
			{placedBuilding.name} ({canonicalRace})
		</div>
	</div>
{:else if entityType === 'unit' && selectedUnit}
	{@const arch = resolveUnitArchetype(selectedUnit)}
	{@const h = hashId(selectedUnit.defId || selectedUnit.name)}
	{@const hue = h % 360}
	{@const isEnemy = selectedUnit.team !== localTeam && selectedUnit.team !== 'neutral'}
	{@const teamColor = isEnemy ? '#ef4444' : selectedUnit.team === 'neutral' ? '#a855f7' : '#3b82f6'}
	<div
		class="w-full h-full flex flex-col items-center justify-center relative"
		style="background: radial-gradient(circle at 50% 42%, hsla({hue}, 75%, 45%, 0.34), #090d16 78%);"
	>
		<svg viewBox="0 0 80 80" class="w-14 h-14 portrait-float drop-shadow-md">
			<ellipse cx="40" cy="66" rx="22" ry="4.5" fill="#000" opacity="0.45" />
			{#if arch === 'dragon'}
				<!-- Wings + Horned Dragon Head -->
				<path
					d="M10 38 L28 24 L26 48 Z"
					fill="hsl({hue}, 70%, 38%)"
					stroke="#0f172a"
					stroke-width="2"
				/>
				<path
					d="M70 38 L52 24 L54 48 Z"
					fill="hsl({hue}, 70%, 38%)"
					stroke="#0f172a"
					stroke-width="2"
				/>
				<path
					d="M28 58 L33 34 L47 34 L52 58 Z"
					fill="hsl({hue}, 65%, 32%)"
					stroke="#0f172a"
					stroke-width="2"
				/>
				<polygon points="30,22 23,10 35,18" fill="#fef08a" stroke="#0f172a" stroke-width="1.5" />
				<polygon points="50,22 57,10 45,18" fill="#fef08a" stroke="#0f172a" stroke-width="1.5" />
				<circle
					cx="40"
					cy="27"
					r="11"
					fill="hsl({hue}, 75%, 48%)"
					stroke="#0f172a"
					stroke-width="2"
				/>
				<circle cx="36" cy="26" r="2" fill="#fef08a" />
				<circle cx="44" cy="26" r="2" fill="#fef08a" />
			{:else if arch === 'golem'}
				<!-- Heavy Angular Stone/Crystal Golem -->
				<rect
					x="20"
					y="28"
					width="40"
					height="32"
					rx="4"
					fill="hsl({hue}, 30%, 42%)"
					stroke="#0f172a"
					stroke-width="2"
				/>
				<rect
					x="29"
					y="14"
					width="22"
					height="16"
					rx="3"
					fill="hsl({hue}, 35%, 52%)"
					stroke="#0f172a"
					stroke-width="2"
				/>
				<rect x="33" y="20" width="5" height="3" fill="#67e8f9" />
				<rect x="42" y="20" width="5" height="3" fill="#67e8f9" />
				<polygon points="40,34 46,42 40,50 34,42" fill="#38bdf8" />
			{:else if arch === 'mech'}
				<!-- Armored Mech / Siege Engine -->
				<rect
					x="18"
					y="34"
					width="44"
					height="24"
					rx="4"
					fill="#64748b"
					stroke="#0f172a"
					stroke-width="2"
				/>
				<rect
					x="24"
					y="22"
					width="28"
					height="14"
					rx="2"
					fill="hsl({hue}, 55%, 45%)"
					stroke="#0f172a"
					stroke-width="2"
				/>
				<rect
					x="48"
					y="25"
					width="20"
					height="6"
					rx="1"
					fill="#94a3b8"
					stroke="#0f172a"
					stroke-width="1.5"
				/>
				<circle cx="26" cy="58" r="6" fill="#1e293b" stroke="#fbbf24" stroke-width="2" />
				<circle cx="54" cy="58" r="6" fill="#1e293b" stroke="#fbbf24" stroke-width="2" />
			{:else if arch === 'mage' || arch === 'undead'}
				<!-- Hooded Caster / Undead with Glowing Orb -->
				<path
					d="M23 62 L29 34 L51 34 L57 62 Z"
					fill={arch === 'undead' ? '#3b0764' : `hsl(${hue}, 60%, 38%)`}
					stroke="#0f172a"
					stroke-width="2"
				/>
				<path
					d="M26 28 Q40 8 54 28 L51 36 H29 Z"
					fill={arch === 'undead' ? '#1e1b4b' : `hsl(${hue}, 55%, 28%)`}
					stroke="#0f172a"
					stroke-width="2"
				/>
				<circle cx="36" cy="27" r="2" fill={arch === 'undead' ? '#4ade80' : '#67e8f9'} />
				<circle cx="44" cy="27" r="2" fill={arch === 'undead' ? '#4ade80' : '#67e8f9'} />
				<circle
					cx="60"
					cy="32"
					r="5"
					fill={arch === 'undead' ? '#4ade80' : '#38bdf8'}
					stroke="#0f172a"
					stroke-width="1.5"
				/>
			{:else if arch === 'demon'}
				<!-- Horned Demon -->
				<path d="M24 62 L29 34 L51 34 L56 62 Z" fill="#7f1d1d" stroke="#0f172a" stroke-width="2" />
				<path
					d="M28 18 Q20 8 24 4"
					fill="none"
					stroke="#1e293b"
					stroke-width="3.5"
					stroke-linecap="round"
				/>
				<path
					d="M52 18 Q60 8 56 4"
					fill="none"
					stroke="#1e293b"
					stroke-width="3.5"
					stroke-linecap="round"
				/>
				<circle cx="40" cy="24" r="10" fill="#dc2626" stroke="#0f172a" stroke-width="2" />
				<circle cx="36" cy="23" r="2" fill="#facc15" />
				<circle cx="44" cy="23" r="2" fill="#facc15" />
			{:else if arch === 'beast'}
				<!-- Predator Beast / Wolf -->
				<polygon
					points="27,22 23,8 34,16"
					fill="hsl({hue}, 50%, 42%)"
					stroke="#0f172a"
					stroke-width="2"
				/>
				<polygon
					points="53,22 57,8 46,16"
					fill="hsl({hue}, 50%, 42%)"
					stroke="#0f172a"
					stroke-width="2"
				/>
				<path
					d="M24 62 L30 34 L50 34 L56 62 Z"
					fill="hsl({hue}, 45%, 35%)"
					stroke="#0f172a"
					stroke-width="2"
				/>
				<circle
					cx="40"
					cy="26"
					r="11"
					fill="hsl({hue}, 55%, 48%)"
					stroke="#0f172a"
					stroke-width="2"
				/>
				<circle cx="35.5" cy="24" r="2" fill="#fef08a" />
				<circle cx="44.5" cy="24" r="2" fill="#fef08a" />
				<polygon points="37,31 40,35 43,31" fill="#f8fafc" />
			{:else if arch === 'naga'}
				<!-- Sea Naga / Murloc -->
				<polygon points="28,16 40,6 52,16" fill="#2dd4bf" stroke="#0f172a" stroke-width="2" />
				<path d="M25 62 L30 35 L50 35 L55 62 Z" fill="#0e7490" stroke="#0f172a" stroke-width="2" />
				<circle cx="40" cy="25" r="10" fill="#14b8a6" stroke="#0f172a" stroke-width="2" />
				<circle cx="36" cy="24" r="2.2" fill="#fef08a" />
				<circle cx="44" cy="24" r="2.2" fill="#fef08a" />
				<line x1="60" y1="60" x2="60" y2="18" stroke="#fb7185" stroke-width="2.5" />
			{:else if arch === 'archer'}
				<!-- Hooded Archer with Bow -->
				<path
					d="M25 62 L30 35 L50 35 L55 62 Z"
					fill="hsl({hue}, 55%, 36%)"
					stroke="#0f172a"
					stroke-width="2"
				/>
				<circle cx="40" cy="25" r="9.5" fill="#fde68a" stroke="#0f172a" stroke-width="2" />
				<path d="M29 22 Q40 10 51 22" fill="#065f46" stroke="#0f172a" stroke-width="2" />
				<path d="M58 18 Q68 38 58 58" fill="none" stroke="#d97706" stroke-width="2.5" />
				<line x1="58" y1="18" x2="58" y2="58" stroke="#e2e8f0" stroke-width="1" />
			{:else}
				<!-- Armored Knight / Warrior -->
				<path
					d="M23 62 L28 34 L52 34 L57 62 Z"
					fill={teamColor}
					stroke="#0f172a"
					stroke-width="2"
				/>
				<circle cx="40" cy="24" r="10" fill="#cbd5e1" stroke="#0f172a" stroke-width="2" />
				<rect x="33" y="21" width="14" height="4" rx="1" fill="#0f172a" />
				<polygon points="36,14 40,6 44,14" fill="#fbbf24" />
				<line
					x1="60"
					y1="56"
					x2="60"
					y2="20"
					stroke="#e2e8f0"
					stroke-width="3"
					stroke-linecap="round"
				/>
			{/if}
		</svg>
		<span class="text-[8.5px] font-bold uppercase truncate max-w-[104px] text-slate-300 -mt-1">
			{selectedUnit.team === 'neutral' ? 'Бос' : selectedUnit.attackType}
		</span>
	</div>
{:else if entityType === 'none'}
	<div class="flex flex-col items-center justify-center text-slate-500 py-1">
		<svg viewBox="0 0 48 48" class="w-9 h-9 opacity-45 portrait-float">
			<path
				d="M24 6 L40 13 V24 C40 34 32 41 24 44 C16 41 8 34 8 24 V13 Z"
				fill="#1e293b"
				stroke="#f59e0b"
				stroke-width="2"
			/>
		</svg>
		<span class="text-[9px] uppercase tracking-wide opacity-60">Вибір</span>
	</div>
{:else}
	<!-- Unique 2.5D Race Worker Portrait matching WorkerModels.ts -->
	{@const canonicalRace = resolveCanonicalWorkerRace(player.race)}
	{@const spec = WORKER_RACE_SPECS[canonicalRace]}
	{@const palette = RACE_BANNER_COLORS[canonicalRace] ?? RACE_BANNER_COLORS['Альянс']}
	{@const collarHex = player.color?.lightHex ?? palette.primary}
	<div
		class="w-full h-full flex flex-col items-center justify-center relative"
		style="background: radial-gradient(circle at 50% 40%, {palette.glow}, #090d16 78%);"
	>
		<svg viewBox="0 0 80 80" class="w-16 h-16 portrait-float drop-shadow-md">
			<ellipse cx="40" cy="67" rx="22" ry="4.5" fill="#000" opacity="0.45" />

			<!-- Back features -->
			{#if spec.backFeature === 'wings_demon'}
				<path d="M12 42 L26 26 L28 50 Z" fill="#7f1d1d" stroke="#0f172a" stroke-width="2" />
				<path d="M68 42 L54 26 L52 50 Z" fill="#7f1d1d" stroke="#0f172a" stroke-width="2" />
			{:else if spec.backFeature === 'wings_angel'}
				<path d="M10 38 Q20 18 30 34 L28 52 Z" fill="#fef9c3" stroke="#b45309" stroke-width="1.5" />
				<path d="M70 38 Q60 18 50 34 L52 52 Z" fill="#fef9c3" stroke="#b45309" stroke-width="1.5" />
			{:else if spec.backFeature === 'jetpack'}
				<rect
					x="20"
					y="34"
					width="8"
					height="18"
					rx="2"
					fill="#475569"
					stroke="#0f172a"
					stroke-width="2"
				/>
				<rect
					x="52"
					y="34"
					width="8"
					height="18"
					rx="2"
					fill="#475569"
					stroke="#0f172a"
					stroke-width="2"
				/>
			{:else if spec.backFeature === 'cape'}
				<path d="M24 38 L18 62 H62 L56 38 Z" fill={collarHex} stroke="#0f172a" stroke-width="2" />
			{/if}

			<!-- Body / Armor -->
			<path
				d="M24 64 L29 36 H51 L56 64 Z"
				fill={hexStr(spec.armor)}
				stroke="#0f172a"
				stroke-width="2"
				stroke-linejoin="round"
			/>
			<rect x="29" y="47" width="22" height="4.5" fill={hexStr(spec.trim)} />

			<!-- Head & Race Head Features -->
			{#if spec.headFeature === 'elf_circlet'}
				<polygon
					points="27,25 17,19 28,30"
					fill={hexStr(spec.skin)}
					stroke="#0f172a"
					stroke-width="1.5"
				/>
				<polygon
					points="53,25 63,19 52,30"
					fill={hexStr(spec.skin)}
					stroke="#0f172a"
					stroke-width="1.5"
				/>
			{:else if spec.headFeature === 'wolf_ears'}
				<polygon
					points="29,21 24,8 35,16"
					fill={hexStr(spec.skin)}
					stroke="#0f172a"
					stroke-width="2"
				/>
				<polygon
					points="51,21 56,8 45,16"
					fill={hexStr(spec.skin)}
					stroke="#0f172a"
					stroke-width="2"
				/>
			{:else if spec.headFeature === 'horns'}
				<path
					d="M30 19 Q23 10 26 5"
					fill="none"
					stroke="#18181b"
					stroke-width="3.5"
					stroke-linecap="round"
				/>
				<path
					d="M50 19 Q57 10 54 5"
					fill="none"
					stroke="#18181b"
					stroke-width="3.5"
					stroke-linecap="round"
				/>
			{:else if spec.headFeature === 'naga_fins'}
				<polygon
					points="31,16 40,6 49,16"
					fill={hexStr(spec.trim)}
					stroke="#0f172a"
					stroke-width="1.5"
				/>
			{:else if spec.headFeature === 'mohawk'}
				<polygon points="36,16 40,5 44,16" fill="#ef4444" stroke="#0f172a" stroke-width="1.5" />
			{:else if spec.headFeature === 'halo'}
				<ellipse cx="40" cy="10" rx="11" ry="3" fill="none" stroke="#fde047" stroke-width="2.2" />
			{/if}

			<circle cx="40" cy="25" r="11.5" fill={hexStr(spec.skin)} stroke="#0f172a" stroke-width="2" />

			{#if spec.headFeature === 'helm'}
				<path d="M28 24 Q40 10 52 24 Z" fill="#94a3b8" stroke="#0f172a" stroke-width="2" />
			{:else if spec.headFeature === 'hood'}
				<path d="M27 27 Q40 9 53 27 Z" fill="#3b0764" stroke="#0f172a" stroke-width="2" />
			{:else if spec.headFeature === 'parka'}
				<path
					d="M27 25 Q40 10 53 25"
					fill="none"
					stroke="#e0f2fe"
					stroke-width="4"
					stroke-linecap="round"
				/>
			{:else if spec.headFeature === 'elf_circlet'}
				<rect
					x="29"
					y="18"
					width="22"
					height="3.5"
					rx="1.5"
					fill="#fbbf24"
					stroke="#0f172a"
					stroke-width="1"
				/>
			{:else if spec.headFeature === 'goggles'}
				<rect
					x="29"
					y="19"
					width="9"
					height="6"
					rx="2"
					fill="#38bdf8"
					stroke="#0f172a"
					stroke-width="1.5"
				/>
				<rect
					x="42"
					y="19"
					width="9"
					height="6"
					rx="2"
					fill="#38bdf8"
					stroke="#0f172a"
					stroke-width="1.5"
				/>
			{:else if spec.headFeature === 'tusks_topknot'}
				<polygon points="33,31 35,26 37,31" fill="#fef3c7" />
				<polygon points="43,31 45,26 47,31" fill="#fef3c7" />
			{/if}

			<!-- Eyes -->
			{#if spec.headFeature !== 'goggles'}
				<circle cx="35.5" cy="26" r="2" fill={hexStr(spec.eyeGlow)} />
				<circle cx="44.5" cy="26" r="2" fill={hexStr(spec.eyeGlow)} />
			{/if}

			<!-- Race Tool / Staff -->
			{#if spec.toolStyle === 'staff' || spec.toolStyle === 'wand' || spec.toolStyle === 'scepter' || spec.toolStyle === 'voodoo' || spec.toolStyle === 'conduit'}
				<line
					x1="60"
					y1="62"
					x2="60"
					y2="24"
					stroke="#78350f"
					stroke-width="2.8"
					stroke-linecap="round"
				/>
				<circle
					cx="60"
					cy="22"
					r="5"
					fill={hexStr(spec.sparkColor)}
					stroke="#0f172a"
					stroke-width="1.5"
				/>
			{:else if spec.toolStyle === 'trident_fire' || spec.toolStyle === 'trident_sea'}
				<line x1="60" y1="62" x2="60" y2="24" stroke="#475569" stroke-width="2.5" />
				<path
					d="M55 24 V16 M60 24 V14 M65 24 V16"
					stroke={hexStr(spec.sparkColor)}
					stroke-width="2"
					stroke-linecap="round"
				/>
			{:else}
				<line
					x1="60"
					y1="62"
					x2="60"
					y2="30"
					stroke="#78350f"
					stroke-width="2.8"
					stroke-linecap="round"
				/>
				<rect
					x="54"
					y="25"
					width="12"
					height="6"
					rx="1.5"
					fill={hexStr(spec.trim)}
					stroke="#0f172a"
					stroke-width="1.5"
				/>
			{/if}
		</svg>
		<span
			class="text-[9.5px] font-black tracking-wide px-2 py-0.5 rounded-full -mt-1 border border-black/40 shadow"
			style="background-color: {collarHex}; color: #fff;"
		>
			{canonicalRace}
		</span>
	</div>
{/if}

<style>
	@keyframes portraitFloat {
		0%,
		100% {
			transform: translateY(0px) scale(1);
		}
		50% {
			transform: translateY(-2.5px) scale(1.03);
		}
	}

	.portrait-float {
		animation: portraitFloat 3.4s ease-in-out infinite;
		will-change: transform;
	}

	@media (prefers-reduced-motion: reduce) {
		.portrait-float {
			animation: none;
		}
	}
</style>
