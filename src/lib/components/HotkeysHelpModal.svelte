<script lang="ts">
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	let {
		isOpen = false,
		onClose
	}: {
		isOpen: boolean;
		onClose: () => void;
	} = $props();

	const shortcuts = [
		{ key: 'Q..V', desc: 'Сітка будівництва споруд' },
		{ key: 'Пробіл', desc: 'Виділити будівельника (2× — камера на нього)' },
		{ key: 'Enter', desc: 'Виділити замок (2× — камера на нього)' },
		{ key: 'P', desc: 'Пауза / Відновити симуляцію' },
		{ key: 'Esc', desc: 'Скинути вибір / Меню паузи' },
		{ key: 'C', desc: 'Командири (потрібен Дім командира)' },
		{ key: 'K', desc: 'Кузня (Покращення шкоди, броні, економіки)' },
		{ key: 'F', desc: 'Телепорт будівельника (до 500px на своєму острові)' },
		{ key: 'B', desc: 'Магазин (потрібен Магазин)' },
		{ key: '1 – 6', desc: 'Швидка покупка у Магазині (B) або Кузні (K)' },
		{ key: 'E / R / Q', desc: 'Радіальні меню: Армія (E), Спеціальні (R), Дії (Q)' },
		{ key: 'X', desc: 'Рятівний удар (Rescue Strike, 2× золото)' },
		{ key: 'Z', desc: 'Навичка раси (активна здібність)' },
		{ key: '1 / 2 / 3 (Замок)', desc: 'Постріл 500px (1g), 1500px (3g) або апгрейд гармати' },
		{ key: 'T / G', desc: 'Швидкий постріл гармати замку (500px / 1500px) без виділення бази' },
		{ key: 'F9', desc: 'Довідник гри (економіка, броня, правила)' },
		{ key: 'Shift + Клік', desc: 'Серійне зведення кількох споруд' },
		{ key: 'Стрілки', desc: 'Переміщення камери ареною' },
		{ key: 'Коліщатко', desc: 'Масштабування поля бою (Zoom)' }
	];
</script>

{#if isOpen}
	<div
		class="lg-hud-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
		role="dialog"
		aria-modal="true"
		aria-label="Гарячі клавіші"
	>
		<div
			class="lg-hud-modal relative w-full max-w-lg max-h-[90vh] flex flex-col border border-amber-400/45 rounded-2xl p-5 text-slate-200 overflow-hidden"
		>
			<!-- Header -->
			<div class="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
				<div class="flex items-center gap-2.5">
					<div class="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
						<UiIcon name="keyboard" class="w-5 h-5" />
					</div>
					<div>
						<h2 class="text-base font-bold text-amber-200">Гарячі клавіші та керування</h2>
						<p class="text-xs text-slate-400">Швидкі команди для битви в реальному часі</p>
					</div>
				</div>
				<button
					type="button"
					onclick={onClose}
					class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
					aria-label="Закрити"
					data-testid="hotkeys-close-btn"
				>
					<UiIcon name="x" class="w-5 h-5" />
				</button>
			</div>

			<!-- Shortcuts list -->
			<div class="mt-4 flex-1 overflow-y-auto space-y-2 pr-1">
				{#each shortcuts as s}
					<div
						class="lg-hud-subcard flex items-center justify-between py-1.5 px-3 rounded-xl border border-slate-700/70 hover:border-amber-400/50 transition"
					>
						<span class="text-xs text-slate-300">{s.desc}</span>
						<kbd
							class="px-2.5 py-1 text-xs font-mono font-bold bg-[#1a2130] text-amber-300 border border-amber-500/30 rounded-lg shadow-inner"
						>
							{s.key}
						</kbd>
					</div>
				{/each}
			</div>

			<!-- Footer -->
			<div class="mt-4 pt-3 border-t border-slate-800 flex justify-end shrink-0">
				<button
					type="button"
					onclick={onClose}
					class="px-5 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition cursor-pointer shadow-md"
				>
					Зрозуміло
				</button>
			</div>
		</div>
	</div>
{/if}
