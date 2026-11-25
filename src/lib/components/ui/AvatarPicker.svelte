<script lang="ts">
	import UiIcon from './UiIcon.svelte';
	import {
		AVATAR_COLORS,
		AVATAR_FRAMES,
		AVATAR_ICONS,
		AVATAR_IMAGE_MAX,
		formatPresetAvatar,
		parseAvatar,
		randomAvatar,
		withAvatarFrame,
		type AvatarColor,
		type AvatarFrame,
		type AvatarIcon
	} from '$lib/config/avatars';
	import { hasUnlockedGrant, rewardsStore } from '$lib/services/rewardsService.svelte';
	import { toast } from '$lib/controllers/toast.svelte';
	import { t } from '$lib/i18n';
	import Avatar from './Avatar.svelte';

	interface Props {
		value: string;
		onSelect: (nextAvatar: string) => void;
	}

	let { value, onSelect }: Props = $props();

	let fileInputEl: HTMLInputElement | null = null;
	const parsed = $derived(parseAvatar(value) ?? parseAvatar('castle:amber'));
	const activeFrame = $derived(parsed?.frame ?? 'none');

	const COLOR_SWATCH: Record<AvatarColor, string> = {
		red: 'bg-red-600',
		amber: 'bg-amber-600',
		emerald: 'bg-emerald-600',
		cyan: 'bg-cyan-600',
		blue: 'bg-blue-600',
		purple: 'bg-purple-600',
		rose: 'bg-rose-600',
		slate: 'bg-slate-600',
		orange: 'bg-orange-600',
		teal: 'bg-teal-600',
		indigo: 'bg-indigo-600',
		lime: 'bg-lime-500'
	};

	function pickIcon(icon: AvatarIcon) {
		const color = parsed?.color ?? 'amber';
		onSelect(formatPresetAvatar(icon, color, activeFrame));
	}

	function pickColor(color: AvatarColor) {
		const icon = parsed?.icon ?? 'castle';
		onSelect(formatPresetAvatar(icon, color, activeFrame));
	}

	function pickFrame(frame: AvatarFrame) {
		if (!hasUnlockedGrant(rewardsStore.data, 'frame', frame)) return;
		onSelect(withAvatarFrame(value, frame));
	}

	function randomize() {
		const base = randomAvatar();
		onSelect(withAvatarFrame(base, activeFrame));
	}

	function clearPhoto() {
		onSelect(formatPresetAvatar(parsed?.icon ?? 'castle', parsed?.color ?? 'amber', activeFrame));
	}

	async function handleFileUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
			toast.error(t('account.avatar.badFormat'));
			return;
		}
		try {
			const dataUrl = await compressAvatarImage(file);
			const next = activeFrame === 'none' ? dataUrl : `${activeFrame}|${dataUrl}`;
			if (next.length > AVATAR_IMAGE_MAX) {
				toast.error(t('account.avatar.tooLarge'));
				return;
			}
			onSelect(next);
			toast.success(t('account.avatar.photoApplied'));
		} catch {
			toast.error(t('account.avatar.badFormat'));
		}
	}

	async function compressAvatarImage(file: File): Promise<string> {
		const imgUrl = URL.createObjectURL(file);
		try {
			const img = await new Promise<HTMLImageElement>((resolve, reject) => {
				const el = new Image();
				el.onload = () => resolve(el);
				el.onerror = () => reject(new Error('load-failed'));
				el.src = imgUrl;
			});
			const canvas = document.createElement('canvas');
			const side = 56;
			canvas.width = side;
			canvas.height = side;
			const ctx = canvas.getContext('2d');
			if (!ctx) throw new Error('no-ctx');
			const minSide = Math.min(img.width, img.height);
			const sx = (img.width - minSide) / 2;
			const sy = (img.height - minSide) / 2;
			ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, side, side);

			for (const quality of [0.75, 0.55, 0.35]) {
				const webp = canvas.toDataURL('image/webp', quality);
				if (webp.startsWith('data:image/webp;base64,') && webp.length <= 3600) {
					return webp;
				}
			}
			return canvas.toDataURL('image/jpeg', 0.5);
		} finally {
			URL.revokeObjectURL(imgUrl);
		}
	}
</script>

<div
	class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-4"
	data-testid="avatar-picker"
>
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex items-center gap-3">
			<Avatar avatar={value} size={48} showDefault />
			<div>
				<div class="text-xs font-bold text-slate-200">{t('account.avatar.title')}</div>
				<div class="text-[11px] text-slate-400">{t('account.avatar.subtitle')}</div>
			</div>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<input
				bind:this={fileInputEl}
				type="file"
				accept="image/png,image/jpeg,image/webp"
				class="hidden"
				onchange={(e) => void handleFileUpload(e)}
				data-testid="avatar-file-input"
			/>
			<button
				type="button"
				onclick={() => fileInputEl?.click()}
				class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-sky-300 flex items-center gap-1.5 cursor-pointer"
				data-testid="avatar-upload-btn"
			>
				<UiIcon name="imagePlus" class="w-3.5 h-3.5" />
				<span>{t('account.avatar.upload')}</span>
			</button>
			{#if parsed?.kind === 'image'}
				<button
					type="button"
					onclick={clearPhoto}
					class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/50 border border-slate-700 text-xs font-semibold text-rose-300 flex items-center gap-1 cursor-pointer"
				>
					<UiIcon name="trash2" class="w-3.5 h-3.5" />
				</button>
			{/if}
			<button
				type="button"
				onclick={randomize}
				class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-amber-300 flex items-center gap-1 cursor-pointer"
				data-testid="avatar-random-btn"
			>
				<UiIcon name="dices" class="w-3.5 h-3.5" />
				<span>{t('account.avatar.random')}</span>
			</button>
		</div>
	</div>

	<!-- Icons -->
	<div class="space-y-1.5">
		<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
			{t('account.avatar.icons')}
		</div>
		<div class="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
			{#each AVATAR_ICONS as icon (icon)}
				{@const selected = parsed?.kind === 'preset' && parsed.icon === icon}
				<button
					type="button"
					onclick={() => pickIcon(icon)}
					class="p-1.5 rounded-lg border flex items-center justify-center transition cursor-pointer {selected
						? 'border-amber-400 bg-amber-500/20 ring-1 ring-amber-400'
						: 'border-slate-800 bg-slate-900/70 hover:border-slate-600'}"
					aria-label={icon}
					data-testid="avatar-icon-{icon}"
				>
					<Avatar avatar={formatPresetAvatar(icon, parsed?.color ?? 'amber', 'none')} size={24} />
				</button>
			{/each}
		</div>
	</div>

	<!-- Colors -->
	<div class="space-y-1.5">
		<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
			{t('account.avatar.colors')}
		</div>
		<div class="flex flex-wrap gap-2">
			{#each AVATAR_COLORS as color (color)}
				{@const selected = parsed?.kind === 'preset' && parsed.color === color}
				<button
					type="button"
					onclick={() => pickColor(color)}
					class="w-7 h-7 rounded-lg border-2 transition cursor-pointer {COLOR_SWATCH[
						color
					]} {selected
						? 'border-white ring-2 ring-amber-400 scale-110'
						: 'border-white/25 hover:border-white/70'}"
					aria-label={color}
					data-testid="avatar-color-{color}"
				></button>
			{/each}
		</div>
	</div>

	<!-- Unlockable Frames -->
	<div class="space-y-1.5">
		<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
			{t('account.avatar.frames')}
		</div>
		<div class="flex flex-wrap gap-2">
			{#each AVATAR_FRAMES as frame (frame)}
				{@const unlocked = hasUnlockedGrant(rewardsStore.data, 'frame', frame)}
				{@const selected = activeFrame === frame}
				<button
					type="button"
					disabled={!unlocked}
					onclick={() => pickFrame(frame)}
					class="px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition {selected
						? 'border-amber-400 bg-amber-500/20 text-amber-200'
						: unlocked
							? 'border-slate-700 bg-slate-900 text-slate-200 hover:border-amber-500/50 cursor-pointer'
							: 'border-slate-800 bg-slate-950 text-slate-600 opacity-60 cursor-not-allowed'}"
					data-testid="avatar-frame-{frame}"
				>
					{#if !unlocked}
						<UiIcon name="lock" class="w-3 h-3" />
					{/if}
					<span>{t(`account.avatar.frame.${frame}`)}</span>
				</button>
			{/each}
		</div>
	</div>
</div>
