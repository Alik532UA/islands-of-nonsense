<script lang="ts">
	import {
		parseAvatar,
		type AvatarColor,
		type AvatarFrame,
		type AvatarIcon
	} from '$lib/config/avatars';

	interface Props {
		avatar: string | null | undefined;
		size?: number;
		showDefault?: boolean;
	}

	let { avatar, size = 24, showDefault = false }: Props = $props();

	const ICON_PATHS: Record<AvatarIcon | 'user', string> = {
		swords:
			'M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M3 21l2-2M4 16l4 4M9.5 14.5L21 3v3l-11.5 11.5',
		shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
		crown: 'M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14',
		castle: 'M4 21V9h2v2h2V7h2v2h4V7h2v4h2V9h2v12H4zm6 0v-5a2 2 0 114 0v5',
		bot: 'M12 4V2m-5 6h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-8a2 2 0 012-2zm2 5v1m6-1v1m-6 3h6',
		skull:
			'M12 3a7 7 0 00-7 7c0 2.5 1.3 4.6 3 5.8V19h8v-3.2c1.7-1.2 3-3.3 3-5.8a7 7 0 00-7-7zm-3 8h.01M15 11h.01M10 19v-2m4 2v-2',
		zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
		flame: 'M12 2c1 4-2 6-2 10a4 4 0 008 0c0-3-2-5-2-8 2 2 4 5 4 9a8 8 0 11-16 0c0-4 3-7 8-11z',
		crosshair: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 0v4m0 12v4M2 12h4m12 0h4',
		sparkles:
			'M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3zm6 12l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z',
		gem: 'M6 3h12l4 6-10 12L2 9l4-6zm-4 6h20M12 21L8 9l4-6 4 6-4 12z',
		axe: 'M14 4l6 6-4 4-6-6 4-4zM3 21l9-9',
		star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21 7 14.2 2 9.3l6.9-1L12 2z',
		heart: 'M12 21s-7-4.5-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.5-9 9-9 9z',
		sun: 'M12 8a4 4 0 100 8 4 4 0 000-8zm0-6v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4l1.4-1.4',
		moon: 'M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z',
		compass: 'M12 2a10 10 0 100 20 10 10 0 000-20zm3.5 6.5l-2 5-5 2 2-5 5-2z',
		flag: 'M5 21V4h11l-2 4 2 4H5',
		ghost: 'M9 10h.01M15 10h.01M5 20V10a7 7 0 0114 0v10l-3-2-2 2-2-2-2 2-2-2-3 2z',
		bug: 'M8 7a4 4 0 018 0v8a4 4 0 01-8 0V7zm-4 4h4m8 0h4M5 6l3 2m11-2l-3 2M5 17l3-2m11 2l-3-2',
		anchor: 'M12 5a2 2 0 100-4 2 2 0 000 4zm0 0v15m-7-7a7 7 0 0014 0M9 8h6',
		feather: 'M20 4a6 6 0 00-8.5 0L4 11.5V20h8.5L20 12.5A6 6 0 0020 4zM4 20L15 9',
		eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7zm10-3a3 3 0 100 6 3 3 0 000-6z',
		rocket:
			'M4.5 16.5c-1.5 1.3-2 4-2 4s2.7-.5 4-2c.7-.8.7-2 0-2.7s-1.2-.5-2 .7zM12 15l-3-3a22 22 0 012-4c2.4-2.4 6-3 9-3 0 3-.6 6.6-3 9a22 22 0 01-5 1z',
		user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z'
	};

	const COLOR_CLASSES: Record<AvatarColor, string> = {
		red: 'bg-red-600 text-red-100 border-red-500',
		amber: 'bg-amber-600 text-amber-100 border-amber-500',
		emerald: 'bg-emerald-600 text-emerald-100 border-emerald-500',
		cyan: 'bg-cyan-600 text-cyan-100 border-cyan-500',
		blue: 'bg-blue-600 text-blue-100 border-blue-500',
		purple: 'bg-purple-600 text-purple-100 border-purple-500',
		rose: 'bg-rose-600 text-rose-100 border-rose-500',
		slate: 'bg-slate-700 text-slate-200 border-slate-600',
		orange: 'bg-orange-600 text-orange-100 border-orange-500',
		teal: 'bg-teal-600 text-teal-100 border-teal-500',
		indigo: 'bg-indigo-600 text-indigo-100 border-indigo-500',
		lime: 'bg-lime-600 text-lime-950 border-lime-500'
	};

	const FRAME_CLASSES: Record<AvatarFrame, string> = {
		none: '',
		bronze: 'ring-2 ring-amber-700 shadow-[0_0_8px_rgba(180,83,9,0.55)]',
		silver: 'ring-2 ring-slate-300 shadow-[0_0_8px_rgba(203,213,225,0.5)]',
		gold: 'ring-2 ring-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.65)]',
		flame: 'ring-2 ring-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.75)]',
		neon: 'ring-2 ring-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.75)]',
		royal: 'ring-2 ring-purple-400 shadow-[0_0_12px_rgba(192,132,252,0.75)]'
	};

	const parsed = $derived(parseAvatar(avatar));
	const iconPath = $derived(
		parsed && ICON_PATHS[parsed.icon] ? ICON_PATHS[parsed.icon] : ICON_PATHS.user
	);
	const colorClass = $derived(
		parsed && COLOR_CLASSES[parsed.color]
			? COLOR_CLASSES[parsed.color]
			: 'bg-slate-800 text-slate-300 border-slate-700'
	);
	const frameClass = $derived(parsed ? FRAME_CLASSES[parsed.frame] : '');
</script>

{#if parsed || showDefault}
	<span
		class="inline-flex items-center justify-center rounded-md border shadow-sm transition-transform overflow-hidden shrink-0 {parsed?.kind ===
		'image'
			? 'bg-slate-900 border-slate-600'
			: colorClass} {frameClass}"
		style="width: {size}px; height: {size}px;"
		aria-hidden="true"
	>
		{#if parsed?.kind === 'image' && parsed.imageUrl}
			<img src={parsed.imageUrl} alt="" class="w-full h-full object-cover" />
		{:else}
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				style="width: {Math.round(size * 0.65)}px; height: {Math.round(size * 0.65)}px;"
			>
				<path d={iconPath} />
			</svg>
		{/if}
	</span>
{/if}
