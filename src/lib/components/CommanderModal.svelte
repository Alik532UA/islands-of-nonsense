<script lang="ts">
	import type { Simulation } from '../engine/simulation';
	import { COMMANDERS } from '../engine/commanders';
	import {
		Coins,
		Hammer,
		Sword,
		Zap,
		Target,
		Shield,
		X,
		Check,
		BookOpen,
		Keyboard
	} from 'lucide-svelte';

	let {
		sim,
		isOpen = $bindable(false)
	}: {
		sim: Simulation;
		isOpen: boolean;
	} = $props();

	let activeTab = $state<'commanders' | 'guide'>('commanders');
	let player = $derived(sim.players.west);

	function getLucideIcon(name: string) {
		switch (name) {
			case 'Coins':
				return Coins;
			case 'Hammer':
				return Hammer;
			case 'Sword':
				return Sword;
			case 'Zap':
				return Zap;
			case 'Target':
				return Target;
			case 'Shield':
			default:
				return Shield;
		}
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div
			class="bg-[#121620] border-2 border-[#544738] rounded-2xl w-full max-w-3xl shadow-2xl p-6 text-white relative flex flex-col max-h-[85vh] overflow-hidden"
			style="box-shadow: 0 10px 40px rgba(0,0,0,0.95);"
		>
			<!-- Close button -->
			<button
				onclick={() => (isOpen = false)}
				class="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
			>
				<X class="w-5 h-5" />
			</button>

			<!-- Header with Tabs -->
			<div class="flex items-center justify-between border-b border-[#3b3226] pb-3 mb-4">
				<div class="flex items-center gap-3">
					<button
						onclick={() => (activeTab = 'commanders')}
						class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition cursor-pointer {activeTab ===
						'commanders'
							? 'bg-indigo-600/30 border border-indigo-400 text-indigo-200'
							: 'text-slate-400 hover:text-slate-200'}"
					>
						<Sword class="w-4 h-4 text-indigo-400" />
						Командири
					</button>

					<button
						onclick={() => (activeTab = 'guide')}
						class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition cursor-pointer {activeTab ===
						'guide'
							? 'bg-amber-600/30 border border-amber-400 text-amber-200'
							: 'text-slate-400 hover:text-slate-200'}"
					>
						<BookOpen class="w-4 h-4 text-amber-400" />
						Довідник (F9)
					</button>
				</div>
			</div>

			<!-- Tab 1: Commanders Grid -->
			{#if activeTab === 'commanders'}
				<div class="overflow-y-auto pr-1 flex-1">
					<p class="text-xs text-slate-400 mb-3">
						Кожен командир дає унікальний стратегічний бонус для вашої команди на всі раунди:
					</p>

					<div class="grid grid-cols-2 gap-3">
						{#each COMMANDERS as cmd}
							{@const isSelected = player.commander === cmd.id}
							{@const IconComponent = getLucideIcon(cmd.icon)}

							<button
								onclick={() => {
									player.commander = cmd.id;
									isOpen = false;
								}}
								class="flex items-start gap-3 p-3 rounded-xl border text-left transition cursor-pointer {isSelected
									? 'bg-indigo-950/80 border-indigo-400 ring-2 ring-indigo-400/50 shadow-lg'
									: 'bg-[#181d28]/70 hover:bg-[#202736] border-slate-800'}"
							>
								<div
									class="p-2.5 rounded-lg border {isSelected
										? 'bg-indigo-600/20 border-indigo-400 text-indigo-300'
										: 'bg-slate-900 border-slate-700 text-slate-400'}"
								>
									<IconComponent class="w-5 h-5" />
								</div>

								<div class="flex-1">
									<div class="flex items-center justify-between">
										<span class="font-bold text-sm text-white">{cmd.name}</span>
										<span
											class="text-[10px] uppercase font-mono font-bold text-indigo-400 bg-indigo-950/70 px-1.5 py-0.5 rounded"
										>
											{cmd.nickname}
										</span>
									</div>
									<p class="text-xs text-slate-300 mt-1 leading-snug">
										{cmd.description}
									</p>
								</div>

								{#if isSelected}
									<div class="text-emerald-400">
										<Check class="w-5 h-5" />
									</div>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			{:else}
				<!-- Tab 2: Authentic Warcraft III Castle Fight Guide (Довідник F9) -->
				<div class="overflow-y-auto pr-2 space-y-4 text-xs text-slate-300 flex-1">
					<!-- Hotkeys Section -->
					<div class="bg-[#181d28] p-3.5 rounded-xl border border-slate-800">
						<h3 class="font-bold text-sm text-amber-300 flex items-center gap-1.5 mb-2">
							<Keyboard class="w-4 h-4 text-amber-400" />
							Гарячі клавіші управління
						</h3>
						<div class="grid grid-cols-2 gap-2 text-[11px]">
							<div>
								<kbd
									class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-300 font-mono"
								>
									Q..V
								</kbd>
								— Командна сітка 4x3 для будівництва споруд
							</div>
							<div>
								<kbd
									class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-300 font-mono"
								>
									F9
								</kbd>
								— Довідник гри та зміна Командира
							</div>
							<div>
								<kbd
									class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-300 font-mono"
								>
									F
								</kbd>
								— Військова Кузня (Атака, Броня, Економіка)
							</div>
							<div>
								<kbd
									class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-300 font-mono"
								>
									B
								</kbd>
								— Магазин замку (Золотий сир, Сувої)
							</div>
							<div>
								<kbd
									class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-300 font-mono"
								>
									R
								</kbd>
								— Ультимативна здібність вашої раси
							</div>
							<div>
								<kbd
									class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-300 font-mono"
								>
									E
								</kbd>
								— Рятівний артилерійський удар біля замку
							</div>
							<div>
								<kbd
									class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-300 font-mono"
								>
									Пробіл
								</kbd>
								— Пауза / Продовжити симуляцію
							</div>
							<div>
								<kbd
									class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-300 font-mono"
								>
									Esc
								</kbd>
								— Скасувати будівництво / виділити робітника
							</div>
						</div>
					</div>

					<!-- Rules & Economy Section -->
					<div class="bg-[#181d28] p-3.5 rounded-xl border border-slate-800">
						<h3 class="font-bold text-sm text-emerald-300 flex items-center gap-1.5 mb-2">
							<Coins class="w-4 h-4 text-emerald-400" />
							Економіка та правила матчу
						</h3>
						<p class="leading-relaxed">
							• Кожні 15 секунд гравці отримують дохід золота (+30g базовий + прибуток від Скринь
							скарбів).<br />
							• Будівлі автоматично створюють війська кожні 14-22с.<br />
							• Перемикайте бажану лінію атаки (Верх, Низ або Авто) у нижній панелі або кліком на мінікарті.<br
							/>
							• Легендарні споруди (коштом від 450g) потребують ліміту Їжі (Food). Збільшуйте ліміт у
							магазині замку (B), купуючи Золотий Сир!
						</p>
					</div>

					<!-- Damage & Armor Matrix -->
					<div class="bg-[#181d28] p-3.5 rounded-xl border border-slate-800">
						<h3 class="font-bold text-sm text-blue-300 flex items-center gap-1.5 mb-2">
							<Shield class="w-4 h-4 text-blue-400" />
							Матриця ефективності: Типи атаки та броні
						</h3>
						<div class="grid grid-cols-4 gap-2 text-[10px] text-center font-mono">
							<div class="p-1.5 bg-slate-900 rounded border border-slate-700">
								<strong class="text-amber-300 block">Звичайна</strong>
								100% легка<br />100% середня<br />100% важка
							</div>
							<div class="p-1.5 bg-slate-900 rounded border border-slate-700">
								<strong class="text-yellow-200 block">Колюча</strong>
								200% легка<br />75% середня<br />35% укріплена
							</div>
							<div class="p-1.5 bg-slate-900 rounded border border-slate-700">
								<strong class="text-purple-300 block">Магічна</strong>
								125% легка<br />200% важка<br />35% укріплена
							</div>
							<div class="p-1.5 bg-slate-900 rounded border border-slate-700">
								<strong class="text-rose-300 block">Облогова</strong>
								150% укріплена<br />50% середня<br />100% важка
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
