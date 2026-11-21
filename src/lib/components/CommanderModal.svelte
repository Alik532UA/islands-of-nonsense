<script lang="ts">
	import type { Simulation } from '../engine/simulation';
	import { COMMANDERS } from '../engine/commanders';
	import { Coins, Hammer, Sword, Zap, Target, Shield, X, Check } from 'lucide-svelte';

	let {
		sim,
		isOpen = $bindable(false)
	}: {
		sim: Simulation;
		isOpen: boolean;
	} = $props();

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
	<div class="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl p-6 text-white relative">
			<!-- Close button -->
			<button
				onclick={() => (isOpen = false)}
				class="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
			>
				<X class="w-5 h-5" />
			</button>

			<!-- Header -->
			<div class="mb-5 border-b border-slate-800 pb-3">
				<h2 class="text-xl font-bold text-indigo-300">Оберіть Командира на раунд</h2>
				<p class="text-xs text-slate-400">
					Кожен командир дає унікальний стратегічний бонус для вашої команди
				</p>
			</div>

			<!-- Commanders Grid -->
			<div class="grid grid-cols-2 gap-3.5">
				{#each COMMANDERS as cmd}
					{@const isSelected = player.commander === cmd.id}
					{@const IconComponent = getLucideIcon(cmd.icon)}

					<button
						onclick={() => {
							player.commander = cmd.id;
							isOpen = false;
						}}
						class="flex items-start gap-3.5 p-3.5 rounded-xl border text-left transition cursor-pointer {isSelected
							? 'bg-indigo-950/80 border-indigo-400 ring-2 ring-indigo-400/50 shadow-lg shadow-indigo-500/20'
							: 'bg-slate-950/70 hover:bg-slate-800/80 border-slate-800 hover:border-slate-750'}"
					>
						<div class="p-2.5 rounded-lg border {isSelected ? 'bg-indigo-600/20 border-indigo-400 text-indigo-300' : 'bg-slate-900 border-slate-700 text-slate-400'}">
							<IconComponent class="w-5 h-5" />
						</div>

						<div class="flex-1">
							<div class="flex items-center justify-between">
								<span class="font-bold text-sm text-white">{cmd.name}</span>
								<span class="text-[10px] uppercase font-mono font-bold text-indigo-400 bg-indigo-950/70 px-1.5 py-0.5 rounded">
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
	</div>
{/if}
