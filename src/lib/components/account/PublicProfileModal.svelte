<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import { readPublicPlayerProfile, type PublicPlayerProfile } from '$lib/net/social';
	import { titleLabel } from '$lib/config/rewards';
	import { settings } from '$lib/services/settings.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Flag from '$lib/components/ui/Flag.svelte';
	import { t } from '$lib/i18n';

	interface Props {
		targetUid: string;
		isFollowing: boolean;
		myRoomCode?: string | null;
		onClose: () => void;
		onToggleFollow: (uid: string) => Promise<void> | void;
		onOpenDm?: (peer: { uid: string; name: string; avatar?: string }) => void;
		onInviteRoom?: (uid: string) => Promise<void> | void;
	}

	let {
		targetUid,
		isFollowing,
		myRoomCode = null,
		onClose,
		onToggleFollow,
		onOpenDm,
		onInviteRoom
	}: Props = $props();

	let profile = $state<PublicPlayerProfile | null>(null);
	let loading = $state(true);

	const locale = $derived(settings.locale === 'en' ? 'en' : 'uk');

	onMount(() => {
		void readPublicPlayerProfile(targetUid).then((res) => {
			profile = res;
			loading = false;
		});
	});
</script>

<div
	class="lg-hud-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
	role="dialog"
	aria-modal="true"
	data-testid="public-profile-modal"
>
	<div class="lg-hud-modal w-full max-w-md rounded-3xl border border-white/15 p-5 space-y-4">
		<div class="flex items-center justify-between border-b border-slate-800 pb-3">
			<h3 class="text-sm font-black uppercase tracking-wider text-amber-300">
				{t('social.profileTitle')}
			</h3>
			<button
				type="button"
				onclick={onClose}
				class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
				aria-label={t('common.close')}
			>
				<UiIcon name="x" class="w-4 h-4" />
			</button>
		</div>

		{#if loading}
			<div class="py-10 text-center text-xs text-slate-400">{t('social.loading')}</div>
		{:else if !profile}
			<div class="py-10 text-center text-xs text-slate-500">{t('social.profileNotFound')}</div>
		{:else}
			<div class="flex items-center gap-3.5">
				<Avatar avatar={profile.avatar ?? 'castle:amber'} size={52} showDefault />
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2 flex-wrap">
						<span class="font-black text-base text-slate-100 truncate">{profile.name}</span>
						{#if profile.online}
							<span
								class="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold"
							>
								● {t('social.online')}
							</span>
						{/if}
						{#if profile.country}
							<Flag code={profile.country} showCode />
						{/if}
					</div>
					<div class="text-xs text-amber-400">@{profile.handle}</div>
					<div class="text-[11px] text-indigo-300 font-semibold mt-0.5">
						Lv.{profile.level} · {titleLabel(profile.title, locale)}
					</div>
				</div>
			</div>

			<div class="grid grid-cols-3 gap-2 text-center text-xs">
				<div class="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
					<div class="text-[10px] text-slate-400">{t('account.stats.score')}</div>
					<div
						class="text-base font-black text-amber-400 flex items-center justify-center gap-1 mt-0.5"
					>
						<UiIcon name="trophy" class="w-3.5 h-3.5" />
						<span>{profile.score}</span>
					</div>
				</div>
				<div class="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
					<div class="text-[10px] text-slate-400">{t('account.stats.winRate')}</div>
					<div class="text-base font-black text-cyan-300 mt-0.5">{profile.winRate}%</div>
					<div class="text-[10px] text-slate-500">{profile.wins}W / {profile.plays}M</div>
				</div>
				<div class="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
					<div class="text-[10px] text-slate-400">{t('account.rewards.badges')}</div>
					<div
						class="text-base font-black text-emerald-300 flex items-center justify-center gap-1 mt-0.5"
					>
						<UiIcon name="award" class="w-3.5 h-3.5" />
						<span>{profile.achievementsCount}</span>
					</div>
				</div>
			</div>

			<div class="flex flex-wrap gap-2 pt-1">
				<button
					type="button"
					onclick={() => void onToggleFollow(profile!.uid)}
					class="flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition {isFollowing
						? 'bg-slate-800 hover:bg-rose-900/50 text-slate-200 border border-slate-700'
						: 'bg-amber-500 hover:bg-amber-400 text-slate-950'}"
				>
					{#if isFollowing}
						<UiIcon name="userMinus" class="w-3.5 h-3.5" />
						<span>{t('social.unfollow')}</span>
					{:else}
						<UiIcon name="userPlus" class="w-3.5 h-3.5" />
						<span>{t('social.follow')}</span>
					{/if}
				</button>

				{#if onOpenDm}
					<button
						type="button"
						onclick={() => {
							onOpenDm?.({ uid: profile!.uid, name: profile!.name, avatar: profile!.avatar });
							onClose();
						}}
						class="py-2 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
					>
						<UiIcon name="messageSquare" class="w-3.5 h-3.5" />
						<span>DM</span>
					</button>
				{/if}

				{#if myRoomCode && onInviteRoom}
					<button
						type="button"
						onclick={() => void onInviteRoom?.(profile!.uid)}
						class="py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
					>
						<UiIcon name="send" class="w-3.5 h-3.5" />
						<span>{t('social.invite')}</span>
					</button>
				{/if}

				{#if profile.online && profile.roomCode && profile.roomCode !== myRoomCode}
					<button
						type="button"
						onclick={() => {
							const code = profile!.roomCode!;
							onClose();
							void goto(`${resolve('/online')}?room=${encodeURIComponent(code)}`);
						}}
						class="py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
					>
						<UiIcon name="logIn" class="w-3.5 h-3.5" />
						<span>{t('social.joinRoom', { code: profile.roomCode })}</span>
					</button>
				{/if}
			</div>
		{/if}
	</div>
</div>
