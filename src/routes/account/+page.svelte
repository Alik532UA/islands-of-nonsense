<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		CircleUser,
		Trophy,
		BarChart3,
		Award,
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
	import { saveAvatar } from '$lib/net/account';
	import { toast } from '$lib/controllers/toast.svelte';
	import { FLAG_COUNTRIES, countryName } from '$lib/config/countries';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import AvatarPicker from '$lib/components/ui/AvatarPicker.svelte';
	import PasswordField from '$lib/components/ui/PasswordField.svelte';
	import StatsPanel from '$lib/components/account/StatsPanel.svelte';
	import LeaderboardPanel from '$lib/components/account/LeaderboardPanel.svelte';
	import RewardsPanel from '$lib/components/account/RewardsPanel.svelte';
	import { rewardsStore } from '$lib/services/rewardsService.svelte';

	const controller = new AccountController();

	type TabType = 'profile' | 'stats' | 'rewards' | 'leaders';
	let activeTab = $state<TabType>('profile');

	let formName = $state('');
	let formHandle = $state('');
	let formCountry = $state('');
	let formAvatar = $state(playerAvatar.value);

	let authEmail = $state('');
	let authPassword = $state('');
	let authMode = $state<'signin' | 'register'>('register');
	let authErrorMessage = $state('');
	let authInfoMessage = $state('');
	let savedSuccess = $state(false);

	$effect(() => {
		return settings.claimHeader(t('account.title'), () => goto(resolve('/')));
	});

	onMount(() => {
		void controller.load().then(() => {
			if (controller.profile) {
				formName = controller.profile.name;
				formHandle = controller.profile.handle;
				formCountry = controller.profile.country ?? '';
				formAvatar = controller.profile.avatar ?? playerAvatar.value;
			}
		});
		void controller.loadLeaders();
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
			toast.success(t('account.profile_saved') || 'Профіль успішно збережено');
			setTimeout(() => {
				savedSuccess = false;
			}, 3000);
		} else {
			toast.error('Не вдалося зберегти профіль');
		}
	}

	async function handleLink() {
		if (!authEmail || !authPassword) return;
		authErrorMessage = '';
		authInfoMessage = '';
		try {
			const ok = await controller.link(authEmail, authPassword);
			if (ok) {
				authInfoMessage = 'Акаунт успішно привʼязано!';
				authPassword = '';
			} else {
				authErrorMessage = controller.error || 'Не вдалося привʼязати акаунт';
			}
		} catch (err) {
			authErrorMessage = (err as Error).message || 'Помилка мережі';
		}
	}

	async function handleSignIn() {
		if (!authEmail || !authPassword) return;
		authErrorMessage = '';
		authInfoMessage = '';
		try {
			const ok = await controller.signIn(authEmail, authPassword);
			if (ok) {
				authInfoMessage = 'Успішний вхід!';
				authPassword = '';
			} else {
				authErrorMessage = controller.error || 'Невірна пошта або пароль';
			}
		} catch (err) {
			authErrorMessage = (err as Error).message || 'Помилка мережі';
		}
	}

	async function handleSignOut() {
		await controller.signOut();
	}
</script>

<svelte:head>
	<title>{t('account.title')} — Islands of Nonsense</title>
</svelte:head>

<div class="menu-page fill min-h-[calc(100vh-56px)] py-8 px-4 flex justify-center">
	<div
		class="w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md flex flex-col"
	>
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
		</div>

		<!-- Tabs -->
		<div class="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6">
			<button
				type="button"
				data-testid="tab-profile"
				onclick={() => (activeTab = 'profile')}
				class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition {activeTab ===
				'profile'
					? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
					: 'text-slate-400 hover:text-slate-200'}"
			>
				<User class="w-4 h-4" />
				<span>{t('account.tab.profile')}</span>
			</button>

			<button
				type="button"
				data-testid="tab-stats"
				onclick={() => (activeTab = 'stats')}
				class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition {activeTab ===
				'stats'
					? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
					: 'text-slate-400 hover:text-slate-200'}"
			>
				<BarChart3 class="w-4 h-4" />
				<span>{t('account.tab.stats')}</span>
			</button>

			<button
				type="button"
				data-testid="tab-rewards"
				onclick={() => {
					activeTab = 'rewards';
					rewardsStore.markSeen();
				}}
				class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition {activeTab ===
				'rewards'
					? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
					: 'text-slate-400 hover:text-slate-200'}"
			>
				<Award class="w-4 h-4" />
				<span>{t('account.tab.rewards')}</span>
				{#if rewardsStore.unseenCount > 0}
					<span
						class="px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black leading-none"
					>
						{rewardsStore.unseenCount}
					</span>
				{/if}
			</button>

			<button
				type="button"
				data-testid="tab-leaders"
				onclick={() => {
					activeTab = 'leaders';
					void controller.loadLeaders();
				}}
				class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition {activeTab ===
				'leaders'
					? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
					: 'text-slate-400 hover:text-slate-200'}"
			>
				<Trophy class="w-4 h-4" />
				<span>{t('account.tab.leaders')}</span>
			</button>
		</div>

		{#if controller.error}
			<div
				class="mb-6 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2"
			>
				<ShieldAlert class="w-4 h-4 text-rose-400 shrink-0" />
				<span>{controller.error}</span>
			</div>
		{/if}

		<!-- TAB 1: PROFILE -->
		{#if activeTab === 'profile'}
			<div class="space-y-6">
				<!-- Profile Card -->
				<div
					class="flex items-center gap-4 p-4 bg-slate-950/60 border border-slate-800 rounded-2xl"
				>
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
						<span
							class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold {controller.state ===
							'linked'
								? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
								: 'bg-slate-800 text-slate-400'}"
						>
							{#if controller.state === 'linked'}
								<CheckCircle class="w-3 h-3 text-emerald-400" />
								{t('account.auth.linked')}
							{:else}
								{t('account.auth.anonymous')}
							{/if}
						</span>
					</div>
				</div>

				<!-- Avatar Customizer -->
				<AvatarPicker
					value={formAvatar}
					onSelect={(next) => {
						formAvatar = next;
						playerAvatar.set(next);
						if (controller.state === 'linked' && controller.profile) {
							void saveAvatar(next).catch(() => {});
						}
					}}
				/>

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
						<div
							class="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl flex items-center justify-between"
						>
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
						<div
							class="auth-card p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-4"
						>
							{#if authMode === 'signin'}
								<form
									method="post"
									data-testid="login-form"
									onsubmit={(e) => {
										e.preventDefault();
										void handleSignIn();
									}}
									class="space-y-4"
								>
									<div class="flex items-center justify-between">
										<h3
											data-testid="login-title"
											tabindex="-1"
											class="text-sm font-bold text-amber-300"
										>
											{t('account.auth.signInTitle')}
										</h3>
										<button
											type="button"
											data-testid="login-register-btn"
											onclick={() => {
												authMode = 'register';
												authErrorMessage = '';
												authInfoMessage = '';
											}}
											class="text-xs text-amber-400/80 hover:text-amber-300 underline cursor-pointer"
										>
											{t('account.auth.needAccount')}
										</button>
									</div>

									<div class="space-y-3">
										<div>
											<label
												for="login-email"
												class="block text-xs font-medium text-slate-400 mb-1"
											>
												{t('account.auth.email')}
											</label>
											<input
												id="login-email"
												type="email"
												required
												autocomplete="email"
												data-testid="login-email-input"
												bind:value={authEmail}
												placeholder={t('account.auth.email')}
												class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
											/>
										</div>

										<div>
											<label
												for="login-password"
												class="block text-xs font-medium text-slate-400 mb-1"
											>
												{t('account.auth.password')}
											</label>
											<PasswordField
												id="login-password"
												testId="login-password-input"
												name="password"
												autocomplete="current-password"
												required
												bind:value={authPassword}
												placeholder={t('account.auth.password')}
											/>
										</div>
									</div>

									<!-- Permanent accessible live region (AUTH-FORM § 4) -->
									<div
										role="status"
										aria-live="polite"
										data-testid="login-status"
										class="min-h-[1.25rem] text-xs font-medium {authErrorMessage
											? 'text-rose-400'
											: 'text-emerald-400'}"
									>
										{#if authErrorMessage}
											<span data-testid="login-error">{authErrorMessage}</span>
										{:else if authInfoMessage}
											<span data-testid="login-info-message">{authInfoMessage}</span>
										{/if}
									</div>

									<div class="flex items-center justify-end pt-1">
										<button
											type="submit"
											data-testid="login-submit-btn"
											aria-disabled={controller.busy}
											disabled={controller.busy}
											class="py-2 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
										>
											{t('account.auth.signInBtn')}
										</button>
									</div>
								</form>
							{:else}
								<form
									method="post"
									data-testid="register-form"
									onsubmit={(e) => {
										e.preventDefault();
										void handleLink();
									}}
									class="space-y-4"
								>
									<div class="flex items-center justify-between">
										<h3
											data-testid="register-title"
											tabindex="-1"
											class="text-sm font-bold text-amber-300"
										>
											{t('account.auth.linkTitle')}
										</h3>
										<button
											type="button"
											data-testid="register-login-btn"
											onclick={() => {
												authMode = 'signin';
												authErrorMessage = '';
												authInfoMessage = '';
											}}
											class="text-xs text-amber-400/80 hover:text-amber-300 underline cursor-pointer"
										>
											{t('account.auth.haveAccount')}
										</button>
									</div>

									<div class="space-y-3">
										<div>
											<label
												for="register-email"
												class="block text-xs font-medium text-slate-400 mb-1"
											>
												{t('account.auth.email')}
											</label>
											<input
												id="register-email"
												type="email"
												required
												autocomplete="email"
												data-testid="register-email-input"
												bind:value={authEmail}
												placeholder={t('account.auth.email')}
												class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
											/>
										</div>

										<div>
											<label
												for="register-password"
												class="block text-xs font-medium text-slate-400 mb-1"
											>
												{t('account.auth.password')}
											</label>
											<PasswordField
												id="register-password"
												testId="register-password-input"
												name="password"
												autocomplete="new-password"
												required
												minlength={6}
												bind:value={authPassword}
												placeholder={t('account.auth.password')}
											/>
											<p class="text-[11px] text-slate-400 mt-1">
												{t('account.auth.passwordHint')}
											</p>
										</div>
									</div>

									<!-- Permanent accessible live region (AUTH-FORM § 4) -->
									<div
										role="status"
										aria-live="polite"
										data-testid="register-status"
										class="min-h-[1.25rem] text-xs font-medium {authErrorMessage
											? 'text-rose-400'
											: 'text-emerald-400'}"
									>
										{#if authErrorMessage}
											<span data-testid="register-error">{authErrorMessage}</span>
										{:else if authInfoMessage}
											<span data-testid="register-info-message">{authInfoMessage}</span>
										{/if}
									</div>

									<div class="flex items-center justify-end pt-1">
										<button
											type="submit"
											data-testid="register-submit-btn"
											aria-disabled={controller.busy}
											disabled={controller.busy}
											class="py-2 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
										>
											{t('account.auth.saveBtn')}
										</button>
									</div>
								</form>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- TAB 2: STATS -->
		{#if activeTab === 'stats'}
			<StatsPanel playData={controller.playData} />
		{/if}

		<!-- TAB 3: REWARDS -->
		{#if activeTab === 'rewards'}
			<RewardsPanel playData={controller.playData} />
		{/if}

		<!-- TAB 4: LEADERS -->
		{#if activeTab === 'leaders'}
			<LeaderboardPanel
				leaders={controller.leaders}
				myUid={controller.uid}
				accountState={controller.state}
				profile={controller.profile}
				myScore={controller.playData.score}
				myCountry={formCountry || controller.profile?.country || ''}
				onRefresh={() => controller.loadLeaders()}
				onPublish={() => controller.publishToLeaderboard()}
				onWithdraw={() => controller.withdrawFromLeaderboard()}
			/>
		{/if}
	</div>
</div>
