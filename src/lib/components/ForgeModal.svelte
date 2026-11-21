<script lang="ts">
	import type { Simulation } from '../engine/simulation';
	import { Hammer, Sword, Shield, TrendingUp, X } from 'lucide-svelte';

	let {
		sim,
		isOpen = $bindable(false)
	}: {
		sim: Simulation;
		isOpen: boolean;
	} = $props();

	let player = $derived(sim.players.west);
	let isAlik = $derived(player.commander === 2);

	let attackPrice = $derived(sim.getForgePrice('west', 'attack'));
	let armorPrice = $derived(sim.getForgePrice('west', 'armor'));
	let econPrice = $derived(sim.getForgePrice('west', 'econ'));
</script>

{#if isOpen}
	<div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-white relative">
			<!-- Close button -->
			<button
				onclick={() => (isOpen = false)}
				class="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
			>
				<X class="w-5 h-5" />
			</button>

			<!-- Header -->
			<div class="flex items-center gap-3 mb-5 border-b border-slate-800 pb-3">
				<div class="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
					<Hammer class="w-6 h-6 text-amber-400" />
				</div>
				<div>
					<h2 class="text-xl font-bold text-amber-300">Військова Кузня</h2>
					<p class="text-xs text-slate-400">
						Глобальні покращення вашої армії та економіки на цей раунд
						{#if isAlik}
							<span class="text-emerald-400 font-semibold">(Знижка Алика: -50%)</span>
						{/if}
					</p>
				</div>
			</div>

			<!-- Upgrade Cards -->
			<div class="flex flex-col gap-3.5">
				<!-- 1. Attack Upgrade -->
				<div class="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
					<div class="flex items-center gap-3.5">
						<div class="p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
							<Sword class="w-5 h-5" />
						</div>
						<div>
							<div class="font-bold text-sm text-slate-100 flex items-center gap-2">
								Гострота Зброї
								<span class="text-xs font-mono text-red-400">
									Рівень {player.forge.attack} / 5
								</span>
							</div>
							<div class="text-xs text-slate-400">
								+{player.forge.attack * 8}% до шкоди (наступний: +{(player.forge.attack + 1) * 8}%)
							</div>
						</div>
					</div>

					{#if player.forge.attack < 5}
						<button
							onclick={() => sim.upgradeForge('west', 'attack')}
							disabled={player.gold < attackPrice}
							class="px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer {player.gold >= attackPrice
								? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30'
								: 'bg-slate-800 text-slate-500 cursor-not-allowed'}"
						>
							Покращити ({attackPrice}g)
						</button>
					{:else}
						<span class="text-xs font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800 px-3 py-1 rounded-lg">
							МАКСИМУМ
						</span>
					{/if}
				</div>

				<!-- 2. Armor Upgrade -->
				<div class="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
					<div class="flex items-center gap-3.5">
						<div class="p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400">
							<Shield class="w-5 h-5" />
						</div>
						<div>
							<div class="font-bold text-sm text-slate-100 flex items-center gap-2">
								Ковані Лати
								<span class="text-xs font-mono text-blue-400">
									Рівень {player.forge.armor} / 5
								</span>
							</div>
							<div class="text-xs text-slate-400">
								+{player.forge.armor} до броні (наступний: +{player.forge.armor + 1})
							</div>
						</div>
					</div>

					{#if player.forge.armor < 5}
						<button
							onclick={() => sim.upgradeForge('west', 'armor')}
							disabled={player.gold < armorPrice}
							class="px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer {player.gold >= armorPrice
								? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
								: 'bg-slate-800 text-slate-500 cursor-not-allowed'}"
						>
							Покращити ({armorPrice}g)
						</button>
					{:else}
						<span class="text-xs font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800 px-3 py-1 rounded-lg">
							МАКСИМУМ
						</span>
					{/if}
				</div>

				<!-- 3. Economy Upgrade -->
				<div class="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
					<div class="flex items-center gap-3.5">
						<div class="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
							<TrendingUp class="w-5 h-5" />
						</div>
						<div>
							<div class="font-bold text-sm text-slate-100 flex items-center gap-2">
								Гільдія Торговців
								<span class="text-xs font-mono text-amber-400">
									Рівень {player.forge.econ} / 3
								</span>
							</div>
							<div class="text-xs text-slate-400">
								+{player.forge.econ * 10}% до доходу (наступний: +{(player.forge.econ + 1) * 10}%)
							</div>
						</div>
					</div>

					{#if player.forge.econ < 3}
						<button
							onclick={() => sim.upgradeForge('west', 'econ')}
							disabled={player.gold < econPrice}
							class="px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer {player.gold >= econPrice
								? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30'
								: 'bg-slate-800 text-slate-500 cursor-not-allowed'}"
						>
							Покращити ({econPrice}g)
						</button>
					{:else}
						<span class="text-xs font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800 px-3 py-1 rounded-lg">
							МАКСИМУМ
						</span>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
