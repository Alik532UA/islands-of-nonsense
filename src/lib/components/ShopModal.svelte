<script lang="ts">
	import type { Simulation } from '../engine/simulation';
	import { CASTLE_ITEMS_LIST } from '../engine/items';
	import { sound } from '../services/audio';
	import { ShoppingBag, Scroll, Shield, Crown, Coins, X } from 'lucide-svelte';

	let {
		sim,
		isOpen = $bindable(false)
	}: {
		sim: Simulation;
		isOpen: boolean;
	} = $props();

	let player = $derived(sim.players.west);

	function handleBuy(itemId: string) {
		const success = sim.buyCastleItem('west', itemId);
		if (success) {
			sound.playCoin();
		}
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div
			class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-white relative"
		>
			<!-- Close button -->
			<button
				onclick={() => (isOpen = false)}
				class="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
			>
				<X class="w-5 h-5" />
			</button>

			<!-- Header -->
			<div class="flex items-center gap-3 mb-5 border-b border-slate-800 pb-3">
				<div class="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
					<ShoppingBag class="w-6 h-6 text-emerald-400" />
				</div>
				<div>
					<h2 class="text-xl font-bold text-emerald-300">Магазин Замку</h2>
					<p class="text-xs text-slate-400">
						Стратегічні припаси та екстрений захист вашої цитаделі
					</p>
				</div>
			</div>

			<!-- Item Cards -->
			<div class="flex flex-col gap-3.5">
				{#each CASTLE_ITEMS_LIST as item}
					{@const cd = sim.getItemCooldown('west', item.id)}
					{@const canAfford = player.gold >= item.cost}
					{@const canBuy = canAfford && cd <= 0}
					<div
						class="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4"
					>
						<div class="flex items-center gap-3.5">
							<div
								class="p-2.5 rounded-lg border {item.id === 'I00E'
									? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
									: item.id === 'I00F'
										? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
										: 'bg-amber-500/10 border-amber-500/30 text-amber-400'}"
							>
								{#if item.id === 'I00E'}
									<Scroll class="w-6 h-6" />
								{:else if item.id === 'I00F'}
									<Shield class="w-6 h-6" />
								{:else}
									<Crown class="w-6 h-6" />
								{/if}
							</div>
							<div>
								<div class="flex items-center gap-2">
									<h3 class="font-bold text-sm text-slate-100">{item.nameUk}</h3>
									<span class="text-[10px] text-slate-500">({item.nameEn})</span>
								</div>
								<p class="text-xs text-slate-400 mt-0.5 max-w-xs leading-relaxed">
									{item.descriptionUk}
								</p>
								<div class="text-[11px] text-slate-500 mt-1">
									Кулдаун: <span class="text-slate-300 font-mono">{item.cooldown}с</span>
								</div>
							</div>
						</div>

						<div class="flex flex-col items-end gap-1.5 flex-shrink-0">
							<div class="flex items-center gap-1 font-bold text-amber-400 text-sm">
								<Coins class="w-4 h-4 text-amber-400" />
								<span class="font-mono">{item.cost}</span>
							</div>

							<button
								onclick={() => handleBuy(item.id)}
								disabled={!canBuy}
								class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer {canBuy
									? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
									: 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60'}"
							>
								{#if cd > 0}
									<span class="font-mono">{Math.ceil(cd)}с</span>
								{:else}
									<span>Купити</span>
								{/if}
							</button>
						</div>
					</div>
				{/each}
			</div>

			<!-- Footer -->
			<div
				class="mt-5 pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500"
			>
				<span>
					Гаряча клавіша: <kbd
						class="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono"
					>
						B
					</kbd>
				</span>
				<span>ESC щоб закрити</span>
			</div>
		</div>
	</div>
{/if}
