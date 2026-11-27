<script lang="ts">
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	let {
		isOpen = $bindable(false)
	}: {
		isOpen: boolean;
	} = $props();
</script>

{#if isOpen}
	<div
		role="dialog"
		aria-modal="true"
		aria-label="Довідник гри"
		data-testid="guide-modal"
		class="lg-hud-backdrop fixed inset-0 flex items-center justify-center z-50 p-4 select-none"
	>
		<div
			class="lg-hud-modal border-2 border-[#544738]/80 rounded-2xl w-full max-w-3xl p-6 text-white relative flex flex-col max-h-[85vh] overflow-hidden"
		>
			<button
				type="button"
				onclick={() => (isOpen = false)}
				data-testid="guide-close-btn"
				class="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
				aria-label="Закрити довідник"
			>
				<UiIcon name="x" class="w-5 h-5" />
			</button>

			<!-- Header -->
			<div class="flex items-center gap-3 border-b border-[#3b3226] pb-3.5 mb-4 shrink-0">
				<div class="p-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400">
					<UiIcon name="bookOpen" class="w-5 h-5" />
				</div>
				<div>
					<h2 class="text-base font-bold text-amber-200 flex items-center gap-2">
						<span>Довідник гри</span>
						<span
							class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/50 border border-amber-500/40 text-amber-300"
						>
							F9
						</span>
					</h2>
					<p class="text-xs text-slate-400">
						Правила Castle Fight, економіка, матриця броні та керування
					</p>
				</div>
			</div>

			<!-- Content -->
			<div class="overflow-y-auto pr-2 space-y-4 text-xs text-slate-300 flex-1">
				<!-- Economy & Rules -->
				<div class="lg-hud-subcard p-3.5 rounded-xl border border-slate-700/70">
					<h3 class="font-bold text-sm text-emerald-300 flex items-center gap-1.5 mb-2">
						<UiIcon name="coins" class="w-4 h-4 text-emerald-400" />
						Економіка та правила матчу
					</h3>
					<ul class="space-y-1.5 leading-relaxed">
						<li>
							• <strong class="text-amber-300">Періодичний дохід:</strong> золото нараховується кожні
							5+ секунд (інтервал зростає щохвилини), сума залежить від вартості ваших будівель, Кузні
							та Скринь скарбів.
						</li>
						<li>
							• <strong class="text-amber-300">Нагорода за вбивства:</strong> за кожного знищеного
							ворожого бійця ви отримуєте золото. Знищення ворогів біля замку
							<strong class="text-rose-300">«Рятівним ударом» (E)</strong> приносить
							<strong class="text-amber-300">2× золота</strong>.
						</li>
						<li>
							• <strong class="text-indigo-300">Командири (C):</strong> збудуйте
							<strong>Дім командира</strong> (250g + 250w), щоб безкоштовно обрати командира. Подальша
							зміна коштує 250g + 250w або стає безкоштовною кожні 5 хвилин. Випадковий командир подвоює
							свій бонус (×2).
						</li>
						<li>
							• <strong class="text-emerald-300">Деревина та мости:</strong> завершення будівництва повертає
							100% ціни у вигляді деревини. Зламаний міст можна відбудувати за 50w.
						</li>
						<li>
							• <strong class="text-amber-300">Легендарні споруди та Їжа:</strong> вимагають ліміту
							Їжі — збільшуйте його через <strong>Золотий Сир</strong> у Магазині (B).
						</li>
					</ul>
				</div>

				<!-- Damage & Armor Matrix -->
				<div class="bg-[#181d28] p-3.5 rounded-xl border border-slate-800">
					<h3 class="font-bold text-sm text-blue-300 flex items-center gap-1.5 mb-2">
						<UiIcon name="shield" class="w-4 h-4 text-blue-400" />
						Матриця ефективності: Типи атаки та броні
					</h3>
					<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-center font-mono">
						<div class="p-2 bg-slate-900 rounded-lg border border-slate-700">
							<strong class="text-amber-300 block mb-1 flex items-center justify-center gap-1">
								<UiIcon name="swords" class="w-3 h-3" />
								Звичайна
							</strong>
							150% по Середній<br />100% по Легкій<br />70% по Укріпленій
						</div>
						<div class="p-2 bg-slate-900 rounded-lg border border-slate-700">
							<strong class="text-emerald-300 block mb-1">Колюча</strong>
							150% по Без броні<br />200% по Легкій<br />35% по Укріпленій
						</div>
						<div class="p-2 bg-slate-900 rounded-lg border border-slate-700">
							<strong class="text-blue-300 block mb-1">Магічна</strong>
							200% по Важкій<br />125% по Легкій<br />35% по Укріпленій
						</div>
						<div class="p-2 bg-slate-900 rounded-lg border border-slate-700">
							<strong class="text-rose-300 block mb-1">Облогова</strong>
							150% по Укріпленій<br />150% по Без броні<br />50% по Середній
						</div>
					</div>
				</div>

				<!-- Hotkeys Section -->
				<div class="bg-[#181d28] p-3.5 rounded-xl border border-slate-800">
					<h3 class="font-bold text-sm text-amber-300 flex items-center gap-1.5 mb-2">
						<UiIcon name="keyboard" class="w-4 h-4 text-amber-400" />
						Гарячі клавіші управління
					</h3>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
						<div>
							<kbd
								class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-300 font-mono"
							>
								Q..V
							</kbd>
							— Сітка будівництва споруд будівельника
						</div>
						<div>
							<kbd
								class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-300 font-mono"
							>
								C
							</kbd>
							— Вікно командирів (потрібен Дім командира)
						</div>
						<div>
							<kbd
								class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-300 font-mono"
							>
								F
							</kbd>
							— Військова Кузня (потрібна Кузня; Атака, Броня, Економіка)
						</div>
						<div>
							<kbd
								class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-300 font-mono"
							>
								B
							</kbd>
							— Магазин (потрібен Магазин; Золотий Сир, Сувої)
						</div>
						<div>
							<kbd
								class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-300 font-mono"
							>
								R
							</kbd>
							— Здібність раси / Ремонт споруди чи замку
						</div>
						<div>
							<kbd
								class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-300 font-mono"
							>
								E
							</kbd>
							— Рятівний удар біля замку (2× золото)
						</div>
						<div>
							<kbd
								class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-300 font-mono"
							>
								Пробіл
							</kbd>
							— Виділити будівельника (2× — камера на нього)
						</div>
						<div>
							<kbd
								class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-300 font-mono"
							>
								P
							</kbd>
							— Пауза / Продовжити гру
						</div>
						<div>
							<kbd
								class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-300 font-mono"
							>
								F9 / H
							</kbd>
							— Довідник гри / Швидкі клавіші
						</div>
						<div>
							<kbd
								class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-300 font-mono"
							>
								Esc
							</kbd>
							— Скасувати вибір або відкрити меню матчу
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
