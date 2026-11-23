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
		User
	} from 'lucide-svelte';
	import { isAvatar, type AvatarIcon } from '$lib/config/avatars';

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
		axe: Axe
	};

	const COLOR_CLASSES: Record<string, string> = {
		red: 'bg-red-600 text-red-100 border-red-500',
		amber: 'bg-amber-600 text-amber-100 border-amber-500',
		emerald: 'bg-emerald-600 text-emerald-100 border-emerald-500',
		cyan: 'bg-cyan-600 text-cyan-100 border-cyan-500',
		blue: 'bg-blue-600 text-blue-100 border-blue-500',
		purple: 'bg-purple-600 text-purple-100 border-purple-500',
		rose: 'bg-rose-600 text-rose-100 border-rose-500',
		slate: 'bg-slate-700 text-slate-200 border-slate-600'
	};

	let valid = $derived(isAvatar(avatar));
	let iconName = $derived(valid && avatar ? (avatar.split(':')[0] as AvatarIcon) : null);
	let colorName = $derived(valid && avatar ? avatar.split(':')[1] : null);
	let IconComponent = $derived(iconName && ICONS[iconName] ? ICONS[iconName] : User);
	let colorClass = $derived(
		colorName && COLOR_CLASSES[colorName]
			? COLOR_CLASSES[colorName]
			: 'bg-slate-800 text-slate-300 border-slate-700'
	);
</script>

{#if valid || showDefault}
	<span
		class="inline-flex items-center justify-center rounded-md border shadow-sm transition-transform {colorClass}"
		style="width: {size}px; height: {size}px;"
		aria-hidden="true"
	>
		<IconComponent
			style="width: {Math.round(size * 0.65)}px; height: {Math.round(size * 0.65)}px;"
		/>
	</span>
{/if}
