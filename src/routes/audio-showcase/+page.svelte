<script lang="ts">
	import { onDestroy } from 'svelte';
	import { resolve } from '$app/paths';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import {
		PLAYABLE_RACES,
		getBaseBuildingsForRace,
		getUpgradesForBuilding,
		getUnit
	} from '$lib/engine/gameData';
	import {
		sound,
		music,
		SOUND_PACKS,
		type SoundPack,
		getWorkerVoiceSlug,
		WORKER_VOICE_VARIANTS,
		UNIT_VOICE_VARIANTS
	} from '$lib/services/audio';
	import { settings } from '$lib/services/settings.svelte';

	interface SfxEntry {
		id: string;
		title: string;
		description: string;
		category: 'economy' | 'combat' | 'castle' | 'ui';
		play: () => void;
	}

	const PACK_META: Record<
		SoundPack,
		{ label: string; short: string; badgeClass: string; desc: string }
	> = {
		'8-bit': {
			label: '8-bit (Класичний)',
			short: '8-bit',
			badgeClass: 'border-cyan-500/50 bg-cyan-950/60 text-cyan-200',
			desc: 'Ретро чиптюн синтез Web Audio API'
		},
		'synth-pro': {
			label: 'Synth Pro (Покращений)',
			short: 'Synth Pro',
			badgeClass: 'border-amber-500/50 bg-amber-950/60 text-amber-200',
			desc: 'М’який багатошаровий синтез за замовчуванням'
		},
		'fantasy-rpg': {
			label: 'Fantasy RPG (CC0)',
			short: 'Fantasy RPG',
			badgeClass: 'border-emerald-500/50 bg-emerald-950/60 text-emerald-200',
			desc: 'Живі семпли меча, лука, магії та будівель'
		},
		'dark-siege': {
			label: 'Dark Siege (CC0)',
			short: 'Dark Siege',
			badgeClass: 'border-rose-500/50 bg-rose-950/60 text-rose-200',
			desc: 'Темний важкий облоговий набір семплів'
		}
	};

	const SFX_LIST: SfxEntry[] = [
		{
			id: 'build',
			title: 'Початок будівництва',
			description: 'Розміщення нової споруди на острові',
			category: 'economy',
			play: () => sound.playBuild()
		},
		{
			id: 'buildingComplete',
			title: 'Будівництво завершено',
			description: 'Сигнал завершення споруди робітником',
			category: 'economy',
			play: () => sound.playBuildingComplete()
		},
		{
			id: 'upgrade',
			title: 'Покращення споруди',
			description: 'Апгрейд будівлі до вищого тиру',
			category: 'economy',
			play: () => sound.playUpgrade()
		},
		{
			id: 'forgeUpgrade',
			title: 'Кузня (Покращення)',
			description: 'Апгрейд атаки, броні або економіки в кузні',
			category: 'economy',
			play: () => sound.playForgeUpgrade()
		},
		{
			id: 'coin',
			title: 'Золото / Монета',
			description: 'Покупка предмета чи підбір монети на полі',
			category: 'economy',
			play: () => sound.playCoin()
		},
		{
			id: 'repair',
			title: 'Ремонт споруди',
			description: 'Відновлення HP будівлі або мосту',
			category: 'economy',
			play: () => sound.playRepair()
		},
		{
			id: 'hit',
			title: 'Звичайний удар',
			description: 'Базове влучання в бою',
			category: 'combat',
			play: () => sound.playHit()
		},
		{
			id: 'sword',
			title: 'Удар меча',
			description: 'Ближній бій холодною зброєю',
			category: 'combat',
			play: () => sound.playSwordClash()
		},
		{
			id: 'bow',
			title: 'Постріл з лука',
			description: 'Дальній постріл стрілою / дротиком',
			category: 'combat',
			play: () => sound.playBowShot()
		},
		{
			id: 'magic',
			title: 'Магічний каст',
			description: 'Закляття магів, жезлів та блискавки',
			category: 'combat',
			play: () => sound.playMagicCast()
		},
		{
			id: 'siege',
			title: 'Облоговий вибух',
			description: 'Влучання катапульт, гармат та артилерії',
			category: 'combat',
			play: () => sound.playSiegeHit()
		},
		{
			id: 'death',
			title: 'Загибель бійця',
			description: 'Знищення юніта на полі бою',
			category: 'combat',
			play: () => sound.playUnitDeath()
		},
		{
			id: 'destroy',
			title: 'Руйнування споруди',
			description: 'Знищення або знесення будівлі',
			category: 'castle',
			play: () => sound.playBuildingDestroyed()
		},
		{
			id: 'rescueStrike',
			title: 'Рятівний удар',
			description: 'Потужний удар оборони замку',
			category: 'castle',
			play: () => sound.playRescueStrike()
		},
		{
			id: 'horn',
			title: 'Бойовий ріг / Старт',
			description: 'Початок раунду або бою',
			category: 'castle',
			play: () => sound.playHorn()
		},
		{
			id: 'castleAttack',
			title: 'Замок під атакою',
			description: 'Тривога при пошкодженні вашого замку',
			category: 'castle',
			play: () => sound.playCastleUnderAttack()
		},
		{
			id: 'lowCastle',
			title: 'Критичне HP замку',
			description: 'Попередження при низькому здоров’ї замку',
			category: 'castle',
			play: () => sound.playLowCastleHp()
		},
		{
			id: 'bossSpawn',
			title: 'Поява боса / Голема',
			description: 'Могутній рев при появі боса',
			category: 'castle',
			play: () => sound.playBossSpawn()
		},
		{
			id: 'workerSelect',
			title: 'Вибір робітника',
			description: 'Клік по будівельнику',
			category: 'ui',
			play: () => sound.playWorkerSelect()
		},
		{
			id: 'workerAck',
			title: 'Наказ робітнику',
			description: 'Підтвердження руху або дії робітника',
			category: 'ui',
			play: () => sound.playWorkerAck()
		},
		{
			id: 'errorResource',
			title: 'Недостатньо ресурсів / Помилка',
			description: 'Спроба дії без золота, дерева чи на КД',
			category: 'ui',
			play: () => sound.playErrorResource()
		},
		{
			id: 'victory',
			title: 'Перемога',
			description: 'Фанфари перемоги в раунді або матчі',
			category: 'ui',
			play: () => sound.playVictory()
		},
		{
			id: 'defeat',
			title: 'Поразка',
			description: 'Акорд поразки в раунді або матчі',
			category: 'ui',
			play: () => sound.playDefeat()
		}
	];

	const CATEGORIES: { id: SfxEntry['category']; label: string }[] = [
		{ id: 'economy', label: 'Будівництво та економіка' },
		{ id: 'combat', label: 'Бойові ефекти' },
		{ id: 'castle', label: 'Замок і великі події' },
		{ id: 'ui', label: 'Інтерфейс та події' }
	];

	const MUSIC_ITEMS: { id: 'minstrel' | 'exploration' | 'tavern'; title: string; desc: string }[] =
		[
			{ id: 'minstrel', title: 'Менстрель (Меню)', desc: 'Спокійна лютнева тема головного меню' },
			{ id: 'exploration', title: 'Похід (Бій)', desc: 'Динамічна середньовічна тема битви' },
			{ id: 'tavern', title: 'Таверна', desc: 'Атмосферна фонова мелодія таверни' }
		];

	let activePack = $state<SoundPack>(settings.soundPack);
	let lastPlayedLabel = $state<string>('Натисніть на будь-який звук або шаблон');
	let voiceSeqToken = 0;
	let playingVoiceInfo = $state<string | null>(null);
	let selectedVoiceRace = $state<string>(PLAYABLE_RACES[0]);
	let unitSearch = $state('');

	const allUnits = (() => {
		const seen = new Set<string>();
		const list: { id: string; name: string; race: string }[] = [];
		for (const race of PLAYABLE_RACES) {
			for (const b of getBaseBuildingsForRace(race)) {
				const chain = [b, ...getUpgradesForBuilding(b.id)];
				for (const bld of chain) {
					if (!bld.unit || seen.has(bld.unit)) continue;
					const uDef = getUnit(bld.unit);
					if (uDef) {
						seen.add(bld.unit);
						list.push({ id: uDef.id, name: uDef.name, race });
					}
				}
			}
		}
		return list;
	})();

	let filteredUnits = $derived(
		unitSearch.trim()
			? allUnits
					.filter(
						(u) =>
							u.name.toLowerCase().includes(unitSearch.trim().toLowerCase()) ||
							u.id.toLowerCase().includes(unitSearch.trim().toLowerCase()) ||
							u.race.toLowerCase().includes(unitSearch.trim().toLowerCase())
					)
					.slice(0, 24)
			: allUnits.slice(0, 24)
	);

	function selectPack(pack: SoundPack) {
		activePack = pack;
		settings.setSoundPack(pack);
	}

	function playWithPack(entry: SfxEntry, pack: SoundPack) {
		const prevEnabled = sound.isEnabled();
		if (!prevEnabled) sound.setEnabled(true);
		if (sound.getPack() !== pack) {
			sound.setPack(pack);
		}
		entry.play();
		lastPlayedLabel = `${entry.title} — ${PACK_META[pack].label}`;
	}

	async function playVoiceClips(urls: string[], label: string) {
		const myToken = ++voiceSeqToken;
		playingVoiceInfo = label;
		for (let i = 0; i < urls.length; i++) {
			if (myToken !== voiceSeqToken) return;
			playingVoiceInfo = `${label} (#${i + 1}/${urls.length})`;
			await sound.playVoiceClip(urls[i]);
			if (myToken !== voiceSeqToken) return;
		}
		if (myToken === voiceSeqToken) {
			playingVoiceInfo = null;
		}
	}

	function stopVoices() {
		voiceSeqToken++;
		sound.stopVoicePlayback();
		playingVoiceInfo = null;
	}

	function playWorkerRaceAll(race: string) {
		const slug = getWorkerVoiceSlug(race);
		const urls = Array.from(
			{ length: WORKER_VOICE_VARIANTS },
			(_, idx) => `/audio/voices/workers/${slug}_${idx + 1}.mp3`
		);
		void playVoiceClips(urls, `Робітник: ${race}`);
	}

	function playUnitAll(unitId: string, unitName: string) {
		const urls = Array.from(
			{ length: UNIT_VOICE_VARIANTS },
			(_, idx) => `/audio/voices/units/${unitId}_${idx + 1}.mp3`
		);
		void playVoiceClips(urls, `Юніт: ${unitName}`);
	}

	onDestroy(() => {
		stopVoices();
		sound.setPack(settings.soundPack);
	});
</script>

<svelte:head>
	<title>Вітрина звуків (4 шаблони) — Castle Fight</title>
</svelte:head>

<div class="min-h-screen bg-[#0b0e16] text-slate-100 flex flex-col">
	<header
		class="sticky top-0 z-30 bg-[#101521]/95 backdrop-blur border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3"
		data-testid="audio-showcase-header"
	>
		<div class="flex items-center gap-3">
			<a
				href={resolve('/')}
				class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition"
			>
				← Меню
			</a>
			<a
				href={resolve('/assets-showcase')}
				class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-amber-300 transition"
				data-testid="audio-showcase-assets-link"
			>
				Вітрина асетів
			</a>
			<div>
				<h1 class="text-sm sm:text-base font-black text-amber-300 tracking-wide">
					Вітрина звуків та озвучки (4 шаблони)
				</h1>
				<p class="text-[11px] text-slate-400">{lastPlayedLabel}</p>
			</div>
		</div>

		<!-- Active Pack Switcher + Volume Sliders -->
		<div class="flex flex-wrap items-center gap-2">
			<div
				class="flex flex-wrap rounded-lg border border-slate-700 overflow-hidden text-xs font-bold"
				data-testid="audio-showcase-pack-tabs"
			>
				{#each SOUND_PACKS as pack}
					<button
						type="button"
						onclick={() => selectPack(pack)}
						data-testid="audio-pack-tab-{pack}"
						class="px-2.5 py-1.5 cursor-pointer transition {activePack === pack
							? 'bg-amber-500 text-slate-950'
							: 'bg-[#121722] text-slate-300 hover:bg-slate-800'}"
					>
						{PACK_META[pack].short}
					</button>
				{/each}
			</div>

			<div
				class="flex items-center gap-3 bg-[#121722] border border-slate-700 rounded-lg px-2.5 py-1 text-[11px]"
			>
				<label class="flex items-center gap-1.5">
					<span class="text-slate-400">Ефекти</span>
					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						value={settings.volume}
						oninput={(e) => settings.setVolume(Number(e.currentTarget.value))}
						class="w-16 h-1.5 accent-amber-400 cursor-pointer"
					/>
					<span class="font-mono text-amber-300 w-8">{Math.round(settings.volume * 100)}%</span>
				</label>
				<label class="flex items-center gap-1.5">
					<span class="text-slate-400">Озвучка</span>
					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						value={settings.voiceVolume}
						oninput={(e) => settings.setVoiceVolume(Number(e.currentTarget.value))}
						class="w-16 h-1.5 accent-sky-400 cursor-pointer"
					/>
					<span class="font-mono text-sky-300 w-8">{Math.round(settings.voiceVolume * 100)}%</span>
				</label>
			</div>
		</div>
	</header>

	<main class="max-w-7xl w-full mx-auto p-4 space-y-6">
		<!-- 4 Packs Overview -->
		<section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
			{#each SOUND_PACKS as pack}
				<button
					type="button"
					onclick={() => selectPack(pack)}
					class="text-left p-3 rounded-xl border transition cursor-pointer {activePack === pack
						? 'border-amber-400 bg-amber-950/25 ring-1 ring-amber-400/40'
						: 'border-slate-800 bg-[#121722] hover:border-slate-600'}"
				>
					<div class="flex items-center justify-between gap-2">
						<span class="text-xs font-black text-white">{PACK_META[pack].label}</span>
						{#if activePack === pack}
							<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-slate-950">
								Активний
							</span>
						{/if}
					</div>
					<p class="text-[11px] text-slate-400 mt-1">{PACK_META[pack].desc}</p>
				</button>
			{/each}
		</section>

		<!-- All 23 SFX grouped by category -->
		{#each CATEGORIES as cat}
			<section class="space-y-2.5">
				<h2
					class="text-xs font-black uppercase tracking-wider text-amber-300 border-b border-slate-800 pb-1"
				>
					{cat.label}
				</h2>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					{#each SFX_LIST.filter((s) => s.category === cat.id) as entry}
						<div
							class="p-3 rounded-xl bg-[#121722] border border-slate-800 flex flex-col justify-between gap-2.5"
							data-testid="sfx-card-{entry.id}"
						>
							<div class="flex items-start justify-between gap-2">
								<div>
									<div class="text-sm font-bold text-slate-100">{entry.title}</div>
									<div class="text-[11px] text-slate-400">{entry.description}</div>
								</div>
								<button
									type="button"
									onclick={() => playWithPack(entry, activePack)}
									class="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shrink-0 cursor-pointer flex items-center gap-1"
									title="Відтворити в активному шаблоні"
								>
									<UiIcon name="play" class="w-3.5 h-3.5" />
									<span>Play</span>
								</button>
							</div>

							<!-- Quick compare all 4 templates -->
							<div class="grid grid-cols-4 gap-1">
								{#each SOUND_PACKS as pack}
									<button
										type="button"
										onclick={() => playWithPack(entry, pack)}
										data-testid="sfx-play-{entry.id}-{pack}"
										class="px-1.5 py-1 rounded text-[10px] font-bold border transition cursor-pointer truncate {PACK_META[
											pack
										].badgeClass} hover:brightness-125"
										title="Відтворити у шаблоні {PACK_META[pack].label}"
									>
										{PACK_META[pack].short}
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/each}

		<!-- Music Tracks -->
		<section class="space-y-2.5">
			<div class="flex items-center justify-between border-b border-slate-800 pb-1">
				<h2 class="text-xs font-black uppercase tracking-wider text-emerald-300">Фонова музика</h2>
				<button
					type="button"
					onclick={() => settings.setMusicEnabled(!settings.musicEnabled)}
					class="text-xs font-bold px-2.5 py-1 rounded-lg border cursor-pointer {settings.musicEnabled
						? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300'
						: 'bg-slate-900 border-slate-700 text-slate-400'}"
				>
					{settings.musicEnabled ? 'Музика: Увімкнена' : 'Музика: Вимкнена'}
				</button>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
				{#each MUSIC_ITEMS as track}
					<button
						type="button"
						onclick={() => {
							settings.setMusicEnabled(true);
							settings.setMusicTrack(track.id);
							lastPlayedLabel = `Музика: ${track.title}`;
						}}
						class="text-left p-3 rounded-xl border transition cursor-pointer {settings.musicTrack ===
						track.id
							? 'border-emerald-400 bg-emerald-950/30'
							: 'border-slate-800 bg-[#121722] hover:border-slate-600'}"
					>
						<div class="text-sm font-bold text-slate-100">{track.title}</div>
						<div class="text-[11px] text-slate-400 mt-0.5">{track.desc}</div>
					</button>
				{/each}
			</div>
		</section>

		<!-- Worker & Unit Voices -->
		<section class="space-y-3">
			<div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-1">
				<h2 class="text-xs font-black uppercase tracking-wider text-sky-300">
					Репліки робітників (12 рас × 5) та юнітів (× 3)
				</h2>
				{#if playingVoiceInfo}
					<div class="flex items-center gap-2">
						<span class="text-xs text-sky-300 font-semibold">{playingVoiceInfo}</span>
						<button
							type="button"
							onclick={stopVoices}
							class="px-2.5 py-1 rounded bg-rose-950 border border-rose-500/60 text-rose-200 text-xs font-bold cursor-pointer"
						>
							Зупинити
						</button>
					</div>
				{/if}
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<!-- Worker Voices -->
				<div class="p-3.5 rounded-xl bg-[#121722] border border-slate-800 space-y-3">
					<div class="flex items-center justify-between">
						<span class="text-xs font-bold text-slate-200">Робітники (оберіть расу)</span>
						<button
							type="button"
							onclick={() => playWorkerRaceAll(selectedVoiceRace)}
							class="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer"
						>
							Слухати всі 5 ({selectedVoiceRace})
						</button>
					</div>
					<div class="flex flex-wrap gap-1.5">
						{#each PLAYABLE_RACES as race}
							<button
								type="button"
								onclick={() => {
									selectedVoiceRace = race;
									playWorkerRaceAll(race);
								}}
								class="px-2 py-1 rounded-lg text-xs font-bold border cursor-pointer transition {selectedVoiceRace ===
								race
									? 'bg-sky-500 text-slate-950 border-sky-400'
									: 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'}"
							>
								{race}
							</button>
						{/each}
					</div>
					<div class="flex items-center gap-1.5 pt-1">
						{#each [1, 2, 3, 4, 5] as v}
							{@const slug = getWorkerVoiceSlug(selectedVoiceRace)}
							<button
								type="button"
								onclick={() =>
									void playVoiceClips(
										[`/audio/voices/workers/${slug}_${v}.mp3`],
										`Робітник ${selectedVoiceRace} #${v}`
									)}
								class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-sky-300 cursor-pointer"
							>
								#{v}
							</button>
						{/each}
					</div>
				</div>

				<!-- Unit Voices -->
				<div class="p-3.5 rounded-xl bg-[#121722] border border-slate-800 space-y-3">
					<div class="flex items-center justify-between gap-2">
						<span class="text-xs font-bold text-slate-200">Юніти (пошук по назві / ID / расі)</span>
						<input
							type="text"
							bind:value={unitSearch}
							placeholder="Пошук юніта..."
							class="px-2.5 py-1 rounded-lg bg-[#0b0e16] border border-slate-700 text-xs text-slate-100 w-44"
						/>
					</div>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
						{#each filteredUnits as u}
							<div
								class="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-[#0c1018] border border-slate-800 text-xs"
							>
								<div class="truncate">
									<div class="font-bold text-slate-200 truncate">{u.name}</div>
									<div class="text-[10px] text-slate-500">{u.race} · {u.id}</div>
								</div>
								<button
									type="button"
									onclick={() => playUnitAll(u.id, u.name)}
									class="px-2 py-1 rounded bg-sky-950 hover:bg-sky-900 border border-sky-600/60 text-sky-200 text-[10px] font-bold shrink-0 cursor-pointer"
								>
									▶ 3
								</button>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</section>
	</main>
</div>
