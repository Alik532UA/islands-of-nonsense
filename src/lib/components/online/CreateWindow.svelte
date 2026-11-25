<script lang="ts">
	import { ArrowLeft, Play, Users } from 'lucide-svelte';
	import { t } from '$lib/i18n';

	interface Props {
		busy: boolean;
		onCreate: (config: {
			modeId: string;
			teamSizeWest: number;
			teamSizeEast: number;
			isPrivate: boolean;
			fogOfWar: boolean;
		}) => void;
		onBack: () => void;
	}

	let { busy = false, onCreate, onBack }: Props = $props();

	let selectedMode = $state('standard');
	let teamSizeWest = $state<number>(1);
	let teamSizeEast = $state<number>(1);
	let isPrivate = $state(false);
	let fogOfWar = $state(true);

	const PRESETS: Array<{ label: string; west: number; east: number }> = [
		{ label: '1v1', west: 1, east: 1 },
		{ label: '2v2', west: 2, east: 2 },
		{ label: '3v3', west: 3, east: 3 },
		{ label: '5v5', west: 5, east: 5 },
		{ label: '7v7', west: 7, east: 7 }
	];

	function applyPreset(west: number, east: number) {
		teamSizeWest = west;
		teamSizeEast = east;
	}

	function submit() {
		onCreate({
			modeId: selectedMode,
			teamSizeWest,
			teamSizeEast,
			isPrivate,
			fogOfWar
		});
	}
</script>

<div
	class="bg-slate-850 border border-slate-700 rounded-2xl p-6 shadow-2xl max-w-lg w-full mx-auto"
	role="dialog"
	aria-modal="true"
	aria-labelledby="create-modal-title"
>
	<div class="flex items-center justify-between mb-4">
		<h2 id="create-modal-title" class="text-xl font-bold text-amber-300">
			{t('online.createRoom')}
		</h2>
		<button
			type="button"
			onclick={onBack}
			class="min-h-[44px] min-w-[44px] p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
			aria-label={t('online.back')}
			data-testid="window-back-btn"
		>
			<ArrowLeft class="w-5 h-5" />
		</button>
	</div>

	<!-- Team Format (up to 7v7 or asymmetric like 1v6, 5v3; slots adjustable in lobby too) -->
	<div class="mb-4">
		<span
			class="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1.5"
		>
			<Users class="w-3.5 h-3.5 text-cyan-400" />
			<span>{t('online.teamFormat')} ({teamSizeWest}v{teamSizeEast})</span>
		</span>
		<div class="grid grid-cols-5 gap-1.5 mb-2.5">
			{#each PRESETS as preset (preset.label)}
				{@const active = teamSizeWest === preset.west && teamSizeEast === preset.east}
				<button
					type="button"
					data-testid="create-preset-{preset.label}"
					onclick={() => applyPreset(preset.west, preset.east)}
					class="min-h-[38px] px-2 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer {active
						? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
						: 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'}"
				>
					{preset.label}
				</button>
			{/each}
		</div>
		<div class="grid grid-cols-2 gap-2">
			<div
				class="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700"
			>
				<span class="text-xs font-semibold text-sky-300">{t('online.westSlots')}</span>
				<div class="flex items-center gap-1.5">
					<button
						type="button"
						data-testid="create-west-dec"
						onclick={() => (teamSizeWest = Math.max(1, teamSizeWest - 1))}
						class="w-7 h-7 rounded bg-slate-900 hover:bg-slate-700 text-slate-200 font-bold text-sm cursor-pointer"
					>
						-
					</button>
					<span class="w-4 text-center text-xs font-mono font-bold text-white">{teamSizeWest}</span>
					<button
						type="button"
						data-testid="create-west-inc"
						onclick={() => (teamSizeWest = Math.min(7, teamSizeWest + 1))}
						class="w-7 h-7 rounded bg-slate-900 hover:bg-slate-700 text-slate-200 font-bold text-sm cursor-pointer"
					>
						+
					</button>
				</div>
			</div>
			<div
				class="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700"
			>
				<span class="text-xs font-semibold text-rose-300">{t('online.eastSlots')}</span>
				<div class="flex items-center gap-1.5">
					<button
						type="button"
						data-testid="create-east-dec"
						onclick={() => (teamSizeEast = Math.max(1, teamSizeEast - 1))}
						class="w-7 h-7 rounded bg-slate-900 hover:bg-slate-700 text-slate-200 font-bold text-sm cursor-pointer"
					>
						-
					</button>
					<span class="w-4 text-center text-xs font-mono font-bold text-white">{teamSizeEast}</span>
					<button
						type="button"
						data-testid="create-east-inc"
						onclick={() => (teamSizeEast = Math.min(7, teamSizeEast + 1))}
						class="w-7 h-7 rounded bg-slate-900 hover:bg-slate-700 text-slate-200 font-bold text-sm cursor-pointer"
					>
						+
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Mode selection -->
	<div class="mb-4">
		<span class="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
			{t('online.battleMode')}
		</span>
		<div class="grid grid-cols-2 gap-2">
			<button
				type="button"
				class="min-h-[44px] p-2.5 border rounded-lg text-xs font-bold text-left transition-colors cursor-pointer {selectedMode ===
				'standard'
					? 'bg-amber-500/20 border-amber-400 text-amber-200'
					: 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'}"
				onclick={() => (selectedMode = 'standard')}
			>
				{t('online.classic1v1')}
			</button>
			<button
				type="button"
				class="min-h-[44px] p-2.5 border rounded-lg text-xs font-bold text-left transition-colors cursor-pointer {selectedMode ===
				'allRandom'
					? 'bg-amber-500/20 border-amber-400 text-amber-200'
					: 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'}"
				onclick={() => (selectedMode = 'allRandom')}
			>
				All Random (AR)
			</button>
		</div>
	</div>

	<!-- Privacy toggle -->
	<div class="mb-4">
		<span class="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
			{t('online.roomAccess')}
		</span>
		<div class="flex gap-2">
			<button
				type="button"
				class="flex-1 min-h-[44px] py-2 px-3 border rounded-lg text-xs font-semibold text-center transition-colors cursor-pointer {!isPrivate
					? 'bg-sky-500/20 border-sky-400 text-sky-200'
					: 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}"
				onclick={() => (isPrivate = false)}
			>
				{t('online.public')}
			</button>
			<button
				type="button"
				class="flex-1 min-h-[44px] py-2 px-3 border rounded-lg text-xs font-semibold text-center transition-colors cursor-pointer {isPrivate
					? 'bg-sky-500/20 border-sky-400 text-sky-200'
					: 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}"
				onclick={() => (isPrivate = true)}
			>
				{t('online.private')}
			</button>
		</div>
	</div>

	<!-- Map visibility (Fog of War vs Open Map) -->
	<div class="mb-6">
		<span class="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
			{t('online.mapVisibility')}
		</span>
		<div class="flex gap-2">
			<button
				type="button"
				data-testid="create-fog-on-btn"
				class="flex-1 min-h-[44px] py-2 px-3 border rounded-lg text-xs font-semibold text-center transition-colors cursor-pointer {fogOfWar
					? 'bg-amber-500/20 border-amber-400 text-amber-200'
					: 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}"
				onclick={() => (fogOfWar = true)}
			>
				{t('online.fogEnabled')}
			</button>
			<button
				type="button"
				data-testid="create-fog-off-btn"
				class="flex-1 min-h-[44px] py-2 px-3 border rounded-lg text-xs font-semibold text-center transition-colors cursor-pointer {!fogOfWar
					? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
					: 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}"
				onclick={() => (fogOfWar = false)}
			>
				{t('online.fogDisabled')}
			</button>
		</div>
	</div>

	<!-- Actions -->
	<button
		type="button"
		disabled={busy}
		onclick={submit}
		class="w-full min-h-[44px] py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
	>
		<Play class="w-5 h-5 fill-current" />
		<span>{t('online.createRoom')}</span>
	</button>
</div>
