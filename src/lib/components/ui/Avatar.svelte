<script lang="ts">
	import {
		Swords,
		Shield,
		Crown,
		Castle,
		Bot,
		Skull,
		Zap,
		Flame,
		Crosshair,
		Sparkles,
		Gem,
		Axe,
		Star,
		Heart,
		Sun,
		Moon,
		Compass,
		Flag,
		Ghost,
		Bug,
		Anchor,
		Feather,
		Eye,
		Rocket,
		User
	} from 'lucide-svelte';
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

	const ICONS: Record<AvatarIcon, typeof User> = {
		swords: Swords,
		shield: Shield,
		crown: Crown,
		castle: Castle,
		bot: Bot,
		skull: Skull,
		zap: Zap,
		flame: Flame,
		crosshair: Crosshair,
		sparkles: Sparkles,
		gem: Gem,
		axe: Axe,
		star: Star,
		heart: Heart,
		sun: Sun,
		moon: Moon,
		compass: Compass,
		flag: Flag,
		ghost: Ghost,
		bug: Bug,
		anchor: Anchor,
		feather: Feather,
		eye: Eye,
		rocket: Rocket
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
	const IconComponent = $derived(parsed && ICONS[parsed.icon] ? ICONS[parsed.icon] : User);
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
			<IconComponent
				style="width: {Math.round(size * 0.65)}px; height: {Math.round(size * 0.65)}px;"
			/>
		{/if}
	</span>
{/if}
