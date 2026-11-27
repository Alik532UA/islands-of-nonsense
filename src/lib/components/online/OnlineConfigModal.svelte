<script lang="ts">
	import { GAME_MODES } from '$lib/engine/gameModes';
	import { RACES_LIST, PLAYABLE_RACES, formatRaceName } from '$lib/engine/gameData';
	import { normalizeSpectatorMode, type RoomConfig, type SpectatorMode } from '$lib/net/roomTypes';
	import { t } from '$lib/i18n';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	interface Props {
		isOpen: boolean;
		canEdit: boolean;
		currentConfig: RoomConfig;
		activeSlotCount: number;
		onClose: () => void;
		onSave: (patch: Partial<RoomConfig>) => void;
	}

	let { isOpen, canEdit, currentConfig, activeSlotCount, onClose, onSave }: Props = $props();

	let selectedMode = $state('standard');
	let targetWins = $state(2);
	let startGold = $state(500);
	let fogOfWar = $state(true);
	let spectatorMode = $state<SpectatorMode>('anytime');
	let coinMode = $state<'none' | 'normal' | 'crazy'>('normal');
	let coinSpawnInterval = $state(40);
	let coinCount = $state(1);
	let showCoinCustom = $state(false);
	let bannedRaces = $state<string[]>([]);

	$effect(() => {
		if (isOpen && currentConfig) {
			selectedMode = typeof currentConfig.modeId === 'string' ? currentConfig.modeId : 'standard';
			targetWins = typeof currentConfig.targetWins === 'number' ? currentConfig.targetWins : 2;
			startGold = typeof currentConfig.startGold === 'number' ? currentConfig.startGold : 500;
			fogOfWar = currentConfig.fogOfWar !== false;
			spectatorMode = normalizeSpectatorMode(currentConfig.spectatorMode);
			coinMode =
				currentConfig.coinMode === 'none' ||
				currentConfig.coinMode === 'normal' ||
				currentConfig.coinMode === 'crazy'
					? currentConfig.coinMode
					: 'normal';
			coinSpawnInterval =
				typeof currentConfig.coinSpawnInterval === 'number'
					? currentConfig.coinSpawnInterval
					: coinMode === 'crazy'
						? 20
						: 40;
			coinCount =
				typeof currentConfig.coinCount === 'number'
					? currentConfig.coinCount
					: coinMode === 'crazy'
						? 5
						: coinMode === 'none'
							? 0
							: 1;
			bannedRaces = Array.isArray(currentConfig.bannedRaces) ? [...currentConfig.bannedRaces] : [];
		}
	});

	function selectMode(modeId: string) {
		if (!canEdit) return;
		selectedMode = modeId;
		if (modeId === 'sandbox') {
			startGold = 99999;
			fogOfWar = false;
			coinMode = 'crazy';
			coinSpawnInterval = 20;
			coinCount = 5;
		}
	}

	function applyCoinPreset(preset: 'none' | 'normal' | 'crazy') {
		if (!canEdit) return;
		coinMode = preset;
		if (preset === 'none') {
			coinCount = 0;
		} else if (preset === 'normal') {
			coinSpawnInterval = 40;
			coinCount = 1;
		} else {
			coinSpawnInterval = 20;
			coinCount = 5;
		}
	}

	function toggleBanRace(race: string) {
		if (!canEdit) return;
		if (bannedRaces.includes(race)) {
			bannedRaces = bannedRaces.filter((r) => r !== race);
		} else if (bannedRaces.length < PLAYABLE_RACES.length - 1) {
			bannedRaces = [...bannedRaces, race];
		}
	}

	function handleSave() {
		if (!canEdit) {
			onClose();
			return;
		}
		const modeConfig = GAME_MODES[selectedMode] || GAME_MODES.standard;
		const isAr = Boolean(modeConfig.allRandom || selectedMode === 'allRandom');
		const isUr = Boolean(modeConfig.uniqueRaces || selectedMode === 'uniqueRaces');
		onSave({
			modeId: selectedMode,
			allRandom: isAr,
			uniqueRaces: isUr,
			targetWins,
			startGold,
			fogOfWar,
			spectatorMode,
			coinMode,
			coinSpawnInterval,
			coinCount,
			bannedRaces
		});
		onClose();
	}

	let availablePlayableCount = $derived(
		PLAYABLE_RACES.filter((r) => !bannedRaces.includes(r)).length
	);
	let showPerTeamUrHint = $derived(
		Boolean(GAME_MODES[selectedMode]?.uniqueRaces || selectedMode === 'uniqueRaces') &&
			activeSlotCount > availablePlayableCount
	);
</script>

{#if isOpen}
	<div
		class="lg-hud-backdrop fixed inset-0 flex items-center justify-center z-[10000] p-2 sm:p-4 select-none"
		role="dialog"
		aria-modal="true"
		aria-label={t('online.hud.settingsTitle')}
		data-testid="online-config-modal"
	>
		<div
			class="lg-hud-modal border-2 border-[#8c7456]/80 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-white"
		>
			<!-- Header -->
			<div
				class="flex items-center justify-between px-5 py-3.5 border-b border-[#3b3226] bg-[#121622]/90 shrink-0"
			>
				<div class="flex items-center gap-3">
					<div class="p-2 bg-amber-500/20 text-amber-400 rounded-[10px] border border-amber-500/30">
						<UiIcon name="sliders" class="w-5 h-5" />
					</div>
					<div>
						<h2 class="text-base font-black tracking-wide text-amber-300 uppercase">
							{t('online.hud.settingsTitle')}
						</h2>
						<p class="text-[11px] text-slate-400">
							{canEdit ? t('online.hud.settingsHintHost') : t('online.hud.settingsHintGuest')}
						</p>
					</div>
				</div>
				<button
					type="button"
					onclick={onClose}
					class="p-2 rounded-[10px] text-amber-300 hover:text-white bg-[#1a2336] hover:bg-[#25324d] border border-amber-500/30 transition cursor-pointer"
					aria-label={t('common.close')}
					data-testid="online-config-close-btn"
				>
					<UiIcon name="x" class="w-4 h-4" />
				</button>
			</div>

			<!-- Body -->
			<div class="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
				<!-- Top Grid: Gold + Rounds + Fog + Coins -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
					<!-- Left: Start Gold & Target Wins -->
					<div class="bg-[#121622]/95 border border-slate-800 rounded-2xl p-3.5 space-y-3">
						<!-- Target Wins -->
						<div class="space-y-1.5" data-testid="online-cfg-target-wins">
							<span class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
								<UiIcon name="trophy" class="w-3.5 h-3.5 text-emerald-400" />
								<span>Перемог у матчі:</span>
							</span>
							<div class="grid grid-cols-3 gap-1.5">
								{#each [{ val: 1, label: 'До 1', sub: 'Бліц' }, { val: 2, label: 'До 2', sub: 'Bo3' }, { val: 3, label: 'До 3', sub: 'Bo5' }] as w}
									<button
										type="button"
										disabled={!canEdit}
										onclick={() => (targetWins = w.val)}
										data-testid="online-targetwins-btn-{w.val}"
										class="py-1.5 px-1 rounded-[8px] border text-center transition cursor-pointer disabled:cursor-not-allowed flex flex-col items-center {targetWins ===
										w.val
											? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-bold'
											: 'bg-[#181d28] border-slate-700/80 text-slate-400 hover:text-slate-200'}"
									>
										<span class="text-[11px] font-bold">{w.label}</span>
										<span class="text-[9px] text-slate-500">{w.sub}</span>
									</button>
								{/each}
							</div>
						</div>

						<!-- Start Gold -->
						<div class="space-y-1.5 pt-2 border-t border-slate-800" data-testid="online-cfg-gold">
							<div class="flex items-center justify-between">
								<span class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
									<UiIcon name="coins" class="w-3.5 h-3.5 text-amber-400" />
									<span>Стартове золото:</span>
								</span>
								<span
									class="text-[11px] font-mono font-bold text-amber-300 px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/40"
								>
									{startGold >= 90000 ? '∞ Необмежено' : startGold}
								</span>
							</div>
							<input
								type="range"
								min="150"
								max="1500"
								step="50"
								disabled={!canEdit}
								value={startGold >= 90000 ? 1500 : startGold}
								oninput={(e) => (startGold = Number((e.currentTarget as HTMLInputElement).value))}
								data-testid="online-gold-slider"
								class="w-full accent-amber-400 cursor-pointer disabled:cursor-not-allowed h-2 bg-slate-800 rounded-[8px]"
							/>
							<div class="grid grid-cols-5 gap-1 pt-0.5">
								{#each [150, 300, 500, 1000] as gVal}
									<button
										type="button"
										disabled={!canEdit}
										onclick={() => (startGold = gVal)}
										data-testid="online-gold-btn-{gVal}"
										class="py-1 px-0.5 rounded-[8px] border text-[10px] cursor-pointer disabled:cursor-not-allowed {startGold ===
										gVal
											? 'bg-amber-500/25 border-amber-500 text-amber-200 font-bold'
											: 'bg-[#181d28] border-slate-800 text-slate-400 hover:text-slate-200'}"
									>
										{gVal}
									</button>
								{/each}
								<button
									type="button"
									disabled={!canEdit}
									onclick={() => (startGold = 99999)}
									data-testid="online-gold-btn-infinite"
									class="py-1 px-0.5 rounded-[8px] border text-[10px] cursor-pointer disabled:cursor-not-allowed {startGold >=
									90000
										? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 font-bold'
										: 'bg-[#181d28] border-slate-800 text-cyan-400 hover:text-cyan-200'}"
								>
									∞ 99999
								</button>
							</div>
						</div>
					</div>

					<!-- Right: Fog of War & Coins -->
					<div class="bg-[#121622]/95 border border-slate-800 rounded-2xl p-3.5 space-y-3">
						<!-- Fog of War -->
						<div class="space-y-1.5" data-testid="online-cfg-fog">
							<span class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
								<UiIcon name="eye" class="w-3.5 h-3.5 text-sky-400" />
								<span>{t('online.mapVisibility')}:</span>
							</span>
							<div class="grid grid-cols-2 gap-1.5">
								<button
									type="button"
									disabled={!canEdit}
									onclick={() => (fogOfWar = true)}
									data-testid="online-fog-on-btn"
									class="py-1.5 px-2 rounded-[8px] border text-xs font-bold cursor-pointer disabled:cursor-not-allowed {fogOfWar
										? 'bg-amber-500/25 border-amber-400 text-amber-200'
										: 'bg-[#181d28] border-slate-800 text-slate-400'}"
								>
									{t('online.fogEnabled')}
								</button>
								<button
									type="button"
									disabled={!canEdit}
									onclick={() => (fogOfWar = false)}
									data-testid="online-fog-off-btn"
									class="py-1.5 px-2 rounded-[8px] border text-xs font-bold cursor-pointer disabled:cursor-not-allowed {!fogOfWar
										? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
										: 'bg-[#181d28] border-slate-800 text-slate-400'}"
								>
									{t('online.fogDisabled')}
								</button>
							</div>
						</div>

						<!-- Spectator Policy -->
						<div
							class="space-y-1.5 pt-2 border-t border-slate-800"
							data-testid="online-cfg-spectators"
						>
							<span class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
								<UiIcon name="users" class="w-3.5 h-3.5 text-sky-400" />
								<span>{t('online.spectatorsPolicy')}:</span>
							</span>
							<div class="grid grid-cols-3 gap-1.5">
								{#each [{ id: 'anytime' as const, label: t('online.spectatorsAnytime') }, { id: 'lobby' as const, label: t('online.spectatorsLobby') }, { id: 'none' as const, label: t('online.spectatorsNone') }] as opt (opt.id)}
									<button
										type="button"
										disabled={!canEdit}
										onclick={() => (spectatorMode = opt.id)}
										data-testid="online-spectator-{opt.id}-btn"
										class="py-1.5 px-1.5 rounded-[8px] border text-[11px] font-bold cursor-pointer disabled:cursor-not-allowed {spectatorMode ===
										opt.id
											? 'bg-sky-500/25 border-sky-400 text-sky-200'
											: 'bg-[#181d28] border-slate-800 text-slate-400'}"
									>
										{opt.label}
									</button>
								{/each}
							</div>
						</div>

						<!-- Coins -->
						<div class="space-y-1.5 pt-2 border-t border-slate-800" data-testid="online-cfg-coins">
							<div class="flex items-center justify-between">
								<span class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
									<UiIcon name="coins" class="w-3.5 h-3.5 text-amber-400" />
									<span>Монети на арені:</span>
								</span>
								<button
									type="button"
									onclick={() => (showCoinCustom = !showCoinCustom)}
									data-testid="online-toggle-custom-coins-btn"
									class="text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded border transition cursor-pointer {showCoinCustom
										? 'bg-amber-500/20 border-amber-400 text-amber-300'
										: 'bg-[#181d28] border-slate-800 text-slate-400 hover:text-slate-200'}"
								>
									<UiIcon name="settings2" class="w-3 h-3" />
									<span>{showCoinCustom ? 'Сховати' : 'Повзунки'}</span>
								</button>
							</div>

							<div class="grid grid-cols-3 gap-1.5">
								<button
									type="button"
									disabled={!canEdit}
									onclick={() => applyCoinPreset('none')}
									class="py-1.5 px-1 rounded-[8px] border text-[11px] font-bold cursor-pointer disabled:cursor-not-allowed {coinMode ===
										'none' && coinCount === 0
										? 'bg-red-600/30 border-red-500 text-red-200'
										: 'bg-[#181d28] border-slate-800 text-slate-400'}"
								>
									Вимк.
								</button>
								<button
									type="button"
									disabled={!canEdit}
									onclick={() => applyCoinPreset('normal')}
									class="py-1.5 px-1 rounded-[8px] border text-[11px] font-bold cursor-pointer disabled:cursor-not-allowed {coinMode ===
										'normal' &&
									coinSpawnInterval === 40 &&
									coinCount === 1
										? 'bg-amber-600/30 border-amber-500 text-amber-200'
										: 'bg-[#181d28] border-slate-800 text-slate-400'}"
								>
									Звичайні (40с)
								</button>
								<button
									type="button"
									disabled={!canEdit}
									onclick={() => applyCoinPreset('crazy')}
									class="py-1.5 px-1 rounded-[8px] border text-[11px] font-bold cursor-pointer disabled:cursor-not-allowed {coinMode ===
										'crazy' &&
									coinSpawnInterval === 20 &&
									coinCount === 5
										? 'bg-purple-600/30 border-purple-500 text-purple-200'
										: 'bg-[#181d28] border-slate-800 text-slate-400'}"
								>
									5 / 20с
								</button>
							</div>

							{#if showCoinCustom}
								<div
									class="p-2.5 rounded-[10px] bg-[#0e121a] border border-amber-500/30 space-y-2 mt-1"
								>
									<div class="space-y-1">
										<div class="flex items-center justify-between text-[10px]">
											<span class="text-slate-400">Частота появи:</span>
											<span class="font-mono font-bold text-amber-300">
												{coinSpawnInterval} сек
											</span>
										</div>
										<input
											type="range"
											min="1"
											max="100"
											step="1"
											disabled={!canEdit}
											bind:value={coinSpawnInterval}
											oninput={() => {
												if (coinCount === 0) coinCount = 1;
												coinMode = 'normal';
											}}
											data-testid="online-coin-interval-slider"
											class="w-full accent-amber-400 cursor-pointer disabled:cursor-not-allowed h-1.5 bg-slate-800 rounded-[8px]"
										/>
									</div>
									<div class="space-y-1">
										<div class="flex items-center justify-between text-[10px]">
											<span class="text-slate-400">Кількість монет:</span>
											<span class="font-mono font-bold text-amber-300">{coinCount} шт</span>
										</div>
										<input
											type="range"
											min="0"
											max="15"
											step="1"
											disabled={!canEdit}
											bind:value={coinCount}
											oninput={() => {
												coinMode = coinCount === 0 ? 'none' : 'normal';
											}}
											data-testid="online-coin-count-slider"
											class="w-full accent-amber-400 cursor-pointer disabled:cursor-not-allowed h-1.5 bg-slate-800 rounded-[8px]"
										/>
									</div>
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- Game Modes -->
				<div class="bg-[#121622]/95 border border-slate-800 rounded-2xl p-3.5 space-y-2">
					<div class="flex items-center justify-between">
						<span class="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
							<UiIcon name="swords" class="w-4 h-4 text-amber-400" />
							<span>Режим гри:</span>
						</span>
						<span class="text-[10px] text-slate-400 font-mono">
							Обрано:
							<strong class="text-amber-300">
								{GAME_MODES[selectedMode]?.nameUk || selectedMode}
							</strong>
						</span>
					</div>
					{#if showPerTeamUrHint}
						<div
							class="px-2.5 py-1.5 rounded-[8px] bg-amber-950/60 border border-amber-500/40 text-[11px] text-amber-200"
						>
							Увага: активних слотів ({activeSlotCount}) більше ніж доступних рас ({availablePlayableCount})
							— унікальність рас (-ur) діятиме у межах кожної команди.
						</div>
					{/if}
					<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
						{#each Object.values(GAME_MODES) as mode (mode.id)}
							<button
								type="button"
								disabled={!canEdit}
								onclick={() => selectMode(mode.id)}
								data-testid="online-mode-card-{mode.id}"
								class="p-2 rounded-[10px] border text-left transition cursor-pointer disabled:cursor-not-allowed flex flex-col justify-between {selectedMode ===
								mode.id
									? 'bg-amber-600/30 border-amber-500 text-amber-200 font-bold ring-1 ring-amber-500/50'
									: 'bg-[#181d28] border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'}"
							>
								<div class="text-[11px] font-bold truncate">{mode.nameUk}</div>
								<div class="text-[9px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
									{mode.descriptionUk}
								</div>
							</button>
						{/each}
					</div>
				</div>

				<!-- Banned Races (-ban) -->
				<div class="bg-[#121622]/95 border border-slate-800 rounded-2xl p-3.5 space-y-2">
					<div class="flex items-center justify-between">
						<span class="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
							<UiIcon name="ban" class="w-4 h-4 text-rose-400" />
							<span>Бани рас (-ban) · Забанено: {bannedRaces.length}</span>
						</span>
						{#if canEdit && bannedRaces.length > 0}
							<button
								type="button"
								onclick={() => (bannedRaces = [])}
								data-testid="online-reset-bans-btn"
								class="text-[11px] text-rose-400 hover:text-rose-300 underline font-bold cursor-pointer"
							>
								Скинути всі
							</button>
						{/if}
					</div>
					<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
						{#each RACES_LIST.filter( (r) => (PLAYABLE_RACES as readonly string[]).includes(r.race) ) as r (r.race)}
							{@const isBanned = bannedRaces.includes(r.race)}
							<button
								type="button"
								disabled={!canEdit}
								onclick={() => toggleBanRace(r.race)}
								data-testid="online-ban-race-{r.race}"
								class="px-2.5 py-1.5 rounded-[10px] border flex items-center justify-between text-[11px] transition cursor-pointer disabled:cursor-not-allowed {isBanned
									? 'bg-red-950/40 border-red-600/60 text-red-300 font-bold'
									: 'bg-[#181d28] border-slate-800 text-slate-300 hover:border-slate-600'}"
							>
								<span class="truncate {isBanned ? 'line-through' : ''}">
									{formatRaceName(r.race)}
								</span>
								{#if isBanned}
									<UiIcon name="ban" class="w-3.5 h-3.5 text-red-400 shrink-0 ml-1" />
								{:else}
									<UiIcon name="check" class="w-3 h-3 text-slate-600 shrink-0 ml-1" />
								{/if}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div
				class="px-5 py-3 border-t border-[#3b3226] bg-[#121622]/90 shrink-0 flex items-center justify-end gap-2"
			>
				<button
					type="button"
					onclick={onClose}
					class="py-2 px-4 rounded-[10px] border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs cursor-pointer"
				>
					{canEdit ? t('online.cancel') : t('common.close')}
				</button>
				{#if canEdit}
					<button
						type="button"
						onclick={handleSave}
						data-testid="online-config-save-btn"
						class="py-2 px-5 rounded-[10px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer"
					>
						Зберегти налаштування
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
