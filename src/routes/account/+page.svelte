<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		CircleUser,
		ArrowLeft,
		Trophy,
		BarChart3,
		User,
		CheckCircle,
		ShieldAlert,
		LogOut,
		Save
	} from 'lucide-svelte';
	import { t } from '$lib/i18n';
	import { settings } from '$lib/services/settings.svelte';
	import { AccountController } from '$lib/controllers/account.svelte';
	import { playerAvatar } from '$lib/services/playerAvatar.svelte';
	import { FLAG_COUNTRIES, countryName } from '$lib/config/countries';
	import Avatar from '$lib/components/ui/Avatar.svelte';

	const controller = new AccountController();

	type TabType = 'profile' | 'stats' | 'leaders';
	let activeTab = $state<TabType>('profile');

	let formName = $state('');
	let formHandle = $state('');
	let formCountry = $state('');
	let formAvatar = $state(playerAvatar.value);

	let authEmail = $state('');
	let authPassword = $state('');
	let savedSuccess = $state(false);

	onMount(() => {
		const release = settings.claimHeader(t('account.title'), () => goto(resolve('/')));
		void controller.load().then(() => {
			if (controller.profile) {
				formName = controller.profile.name;
				formHandle = controller.profile.handle;
				formCountry = controller.profile.country ?? '';
				formAvatar = controller.profile.avatar ?? playerAvatar.value;
			}
		});
		void controller.loadLeaders();
		return release;
	});

	async function handleSaveProfile() {
		const ok = await controller.save({
			uid: controller.profile?.uid ?? 'me',
			name: formName || 'Гравець',
			handle: formHandle.replace(/^@/, '') || 'player',
			country: formCountry,
			avatar: formAvatar
		});
		if (ok) {
			playerAvatar.set(formAvatar);
			savedSuccess = true;
			setTimeout(() => {
				savedSuccess = false;
			}, 3000);
		}
	}

	async function handleLink() {
		if (!authEmail || !authPassword) return;
		await controller.link(authEmail, authPassword);
	}

	async function handleSignIn() {
		if (!authEmail || !authPassword) return;
		await controller.signIn(authEmail, authPassword);
	}

	async function handleSignOut() {
		await controller.signOut();
	}

	const gameRecord = $derived(controller.playData.games.castlefight ?? { best: 0, plays: 0, wins: 0 });
	const winRate = $derived(
		gameRecord.plays > 0 ? Math.round((gameRecord.wins / gameRecord.plays) * 100) : 0
	);
</script>

<svelte:head>
	<title>{t('account.title')} — Islands of Nonsense</title>
</svelte:head>

<div class="menu-page fill min-h-[calc(100vh-56px)] py-8 px-4 flex justify-center">
	<div class="w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md flex flex-col">
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-slate-800 pb-5 mb-6">
			<div class="flex items-center gap-4">
				<div class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
					<CircleUser class="w-8 h-8 text-amber-400" />
				</div>
				<div>
					<h1 class="text-2xl font-bold text-amber-300">{t('account.title')}</h1>
					<p class="text-xs text-slate-400">{t('account.subtitle')}</p>
				</div>
			</div>
			<a href={resolve('/')} class="menu-btn menu-btn--link p-2" title={t('menu.back')}>
				<ArrowLeft class="w-5 h-5 text-slate-300" />
			</a>
		</div>

		<!-- Tabs -->
		<div class="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6">
			<button
				type="button"
				data-testid="tab-profile"
				onclick={() => (activeTab = 'profile')}
				class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition {activeTab === 'profile' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'}"
			>
				<User class="w-4 h-4" />
				<span>{t('account.tab.profile')}</span>
			</button>

			<button
				type="button"
				data-testid="tab-stats"
				onclick={() => (activeTab = 'stats')}
				class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition {activeTab === 'stats' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'}"
			>
				<BarChart3 class="w-4 h-4" />
				<span>{t('account.tab.stats')}</span>
			</button>

			<button
				type="button"
				data-testid="tab-leaders"
				onclick={() => {
					activeTab = 'leaders';
					void controller.loadLeaders();
				}}
				class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition {activeTab === 'leaders' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'}"
			>
				<Trophy class="w-4 h-4" />
				<span>{t('account.tab.leaders')}</span>
			</button>
		</div>

		{#if controller.error}
			<div class="mb-6 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
				<ShieldAlert class="w-4 h-4 text-rose-400 shrink-0" />
				<span>{controller.error}</span>
			</div>
		{/if}

		<!-- TAB 1: PROFILE -->
		{#if activeTab === 'profile'}
			<div class="space-y-6">
				<!-- Profile Card -->
				<div class="flex items-center gap-4 p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
					<Avatar avatar={formAvatar} size={40} />
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2">
							<span class="font-bold text-slate-100 truncate">{formName || 'Гравець'}</span>
							{#if formCountry}
								<span class="text-xs px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 uppercase">
									{formCountry}
								</span>
							{/if}
						</div>
						<div class="text-xs text-amber-400/80">
							@{formHandle.replace(/^@/, '') || 'player'}
						</div>
					</div>
					<div class="text-right">
						<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold {controller.state === 'linked' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}">
							{#if controller.state === 'linked'}
								<CheckCircle class="w-3 h-3 text-emerald-400" />
								{t('account.auth.linked')}
							{:else}
								{t('account.auth.anonymous')}
							{/if}
						</span>
					</div>
				</div>

				<!-- Edit Profile Form -->
				<form
					onsubmit={(e) => {
						e.preventDefault();
						void handleSaveProfile();
					}}
					class="space-y-4"
				>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label for="profile-name" class="block text-xs font-medium text-slate-400 mb-1.5">
								{t('account.name')}
							</label>
							<input
								id="profile-name"
								data-testid="input-name"
								type="text"
								bind:value={formName}
								placeholder="Ваше ім'я"
								maxlength="24"
								class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
							/>
						</div>

						<div>
							<label for="profile-handle" class="block text-xs font-medium text-slate-400 mb-1.5">
								{t('account.handle')}
							</label>
							<input
								id="profile-handle"
								data-testid="input-handle"
								type="text"
								bind:value={formHandle}
								placeholder="@handle"
								maxlength="20"
								class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
							/>
						</div>
					</div>

					<div>
						<label for="profile-country" class="block text-xs font-medium text-slate-400 mb-1.5">
							{t('account.country')}
						</label>
						<select
							id="profile-country"
							data-testid="select-country"
							bind:value={formCountry}
							class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
						>
							<option value="">Не вказано</option>
							{#each FLAG_COUNTRIES as code}
								<option value={code}>{countryName(code)} ({code.toUpperCase()})</option>
							{/each}
						</select>
					</div>

					<div class="flex items-center justify-between pt-2">
						{#if savedSuccess}
							<span class="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
								<CheckCircle class="w-4 h-4" />
								{t('account.saved')}
							</span>
						{:else}
							<span></span>
						{/if}

						<button
							type="submit"
							data-testid="btn-save-profile"
							disabled={controller.busy}
							class="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-amber-600/20 cursor-pointer disabled:opacity-50"
						>
							<Save class="w-4 h-4" />
							<span>{t('account.save')}</span>
						</button>
					</div>
				</form>

				<!-- Auth / Cloud Linking Section -->
				<div class="mt-8 pt-6 border-t border-slate-800">
					{#if controller.state === 'linked'}
						<div class="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl flex items-center justify-between">
							<div>
								<div class="text-xs text-slate-400 font-medium">{t('account.auth.linked')}</div>
								<div class="text-sm font-bold text-slate-200">{controller.email}</div>
							</div>
							<button
								type="button"
								data-testid="btn-sign-out"
								onclick={handleSignOut}
								disabled={controller.busy}
								class="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold rounded-xl text-xs transition cursor-pointer"
							>
								<LogOut class="w-4 h-4" />
								<span>{t('account.auth.signOut')}</span>
							</button>
						</div>
					{:else}
						<div class="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-4">
							<h3 class="text-sm font-bold text-amber-300">{t('account.auth.linkTitle')}</h3>
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<input
									type="email"
									data-testid="input-auth-email"
									bind:value={authEmail}
									placeholder={t('account.auth.email')}
									class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
								/>
								<input
									type="password"
									data-testid="input-auth-password"
									bind:value={authPassword}
									placeholder={t('account.auth.password')}
									class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
								/>
							</div>
							<div class="flex flex-wrap gap-2 pt-1">
								<button
									type="button"
									data-testid="btn-auth-link"
									onclick={handleLink}
									disabled={controller.busy || !authEmail || !authPassword}
									class="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
								>
									{t('account.auth.saveBtn')}
								</button>
								<button
									type="button"
									data-testid="btn-auth-signin"
									onclick={handleSignIn}
									disabled={controller.busy || !authEmail || !authPassword}
									class="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
								>
									{t('account.auth.signInBtn')}
								</button>
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- TAB 2: STATS -->
		{#if activeTab === 'stats'}
			<div class="space-y-6">
				<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
					<div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-center">
						<div class="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
							{t('account.stats.score')}
						</div>
						<div class="text-2xl font-black text-amber-400">{controller.playData.score}</div>
					</div>

					<div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-center">
						<div class="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
							{t('account.stats.plays')}
						</div>
						<div class="text-2xl font-black text-slate-200">{gameRecord.plays}</div>
					</div>

					<div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-center">
						<div class="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
							{t('account.stats.wins')}
						</div>
						<div class="text-2xl font-black text-emerald-400">{gameRecord.wins}</div>
					</div>

					<div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-center">
						<div class="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
							{t('account.stats.winRate')}
						</div>
						<div class="text-2xl font-black text-cyan-400">{winRate}%</div>
					</div>

					<div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-center">
						<div class="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
							{t('account.stats.best')}
						</div>
						<div class="text-2xl font-black text-amber-300">{gameRecord.best}</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- TAB 3: LEADERS -->
		{#if activeTab === 'leaders'}
			<div class="space-y-4">
				{#if controller.leaders.length === 0}
					<div class="py-12 text-center text-xs text-slate-500">
						{t('account.leaders.empty')}
					</div>
				{:else}
					<div class="divide-y divide-slate-800/60 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40">
						{#each controller.leaders as leader, i}
							<div class="flex items-center gap-3 p-3.5 hover:bg-slate-900/40 transition">
								<div class="w-7 text-center font-black text-xs text-slate-400">
									{#if i === 0}
										🥇
									{:else if i === 1}
										🥈
									{:else if i === 2}
										🥉
									{:else}
										#{i + 1}
									{/if}
								</div>

								<Avatar avatar={leader.avatar ?? 'castle:amber'} size={24} />

								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2">
										<span class="font-bold text-xs text-slate-100 truncate">{leader.name}</span>
										{#if leader.country}
											<span class="text-[9px] px-1 bg-slate-800 rounded text-slate-300 uppercase">
												{leader.country}
											</span>
										{/if}
									</div>
									<div class="text-[10px] text-slate-500 truncate">@{leader.handle}</div>
								</div>

								<div class="text-right">
									<span class="font-black text-xs text-amber-400">{leader.score}</span>
									<span class="text-[9px] text-slate-500 block">очок</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
