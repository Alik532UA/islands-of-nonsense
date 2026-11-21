<script lang="ts">
	import { onMount } from 'svelte';
	import type { Simulation } from '../engine/simulation';
	import { ARENA_WIDTH, ARENA_HEIGHT, TOP_LANE_Y, BOTTOM_LANE_Y } from '../engine/simulation';
	import { Crosshair, Map as MapIcon, Users, Castle } from 'lucide-svelte';
	import { sound } from '../services/audio';

	let {
		sim,
		_uiTick = 0,
		onMinimapClick
	}: {
		sim: Simulation;
		_uiTick?: number;
		onMinimapClick?: (arenaX: number, arenaY: number) => void;
	} = $props();

	let canvasEl: HTMLCanvasElement;
	let allyColorsMode = $state(true);
	let simpleTerrainMode = $state(false);
	let lastPing = $state<{ x: number; y: number; timer: number } | null>(null);

	const MAP_WIDTH = 190;
	const MAP_HEIGHT = 135;

	function triggerPing(x: number, y: number) {
		lastPing = { x, y, timer: 1.5 };
		sound.playHit();
		onMinimapClick?.(x, y);
	}

	function handleCanvasClick(e: MouseEvent) {
		if (!canvasEl) return;
		const rect = canvasEl.getBoundingClientRect();
		const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

		const arenaX = normX * ARENA_WIDTH;
		const arenaY = normY * ARENA_HEIGHT;

		triggerPing(arenaX, arenaY);
	}

	function renderMinimap() {
		if (!canvasEl) return;
		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		const scaleX = MAP_WIDTH / ARENA_WIDTH;
		const scaleY = MAP_HEIGHT / ARENA_HEIGHT;

		// 1. Terrain Ground
		if (simpleTerrainMode) {
			ctx.fillStyle = '#1e293b';
			ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
		} else {
			// Vibrant green battlefield
			ctx.fillStyle = '#22551e';
			ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

			// West base tint
			ctx.fillStyle = '#1e3a5f';
			ctx.fillRect(0, 0, 320 * scaleX, MAP_HEIGHT);

			// East base tint
			ctx.fillStyle = '#451a1a';
			ctx.fillRect(MAP_WIDTH - 320 * scaleX, 0, 320 * scaleX, MAP_HEIGHT);

			// Cobblestone roads (Top & Bottom lanes)
			ctx.fillStyle = '#6b573e';
			ctx.fillRect(
				200 * scaleX,
				(TOP_LANE_Y - 25) * scaleY,
				(ARENA_WIDTH - 400) * scaleX,
				50 * scaleY
			);
			ctx.fillRect(
				200 * scaleX,
				(BOTTOM_LANE_Y - 25) * scaleY,
				(ARENA_WIDTH - 400) * scaleX,
				50 * scaleY
			);

			// River
			ctx.fillStyle = '#0284c7';
			ctx.fillRect((ARENA_WIDTH / 2 - 50) * scaleX, 0, 100 * scaleX, MAP_HEIGHT);

			// Bridges
			ctx.fillStyle = '#78716c';
			ctx.fillRect(
				(ARENA_WIDTH / 2 - 60) * scaleX,
				(TOP_LANE_Y - 30) * scaleY,
				120 * scaleX,
				60 * scaleY
			);
			ctx.fillRect(
				(ARENA_WIDTH / 2 - 60) * scaleX,
				(BOTTOM_LANE_Y - 30) * scaleY,
				120 * scaleX,
				60 * scaleY
			);

			// Central dividing mountain/ridge
			ctx.fillStyle = '#334155';
			ctx.fillRect(400 * scaleX, 350 * scaleY, (ARENA_WIDTH - 800) * scaleX, 100 * scaleY);
		}

		// 2. Castles
		// West Castle (Blue)
		const wCastX = sim.castles.west.x * scaleX;
		const wCastY = sim.castles.west.y * scaleY;
		ctx.fillStyle = '#3b82f6';
		ctx.fillRect(wCastX - 5, wCastY - 8, 10, 16);
		ctx.strokeStyle = '#93c5fd';
		ctx.lineWidth = 1;
		ctx.strokeRect(wCastX - 5, wCastY - 8, 10, 16);

		// East Castle (Red)
		const eCastX = sim.castles.east.x * scaleX;
		const eCastY = sim.castles.east.y * scaleY;
		ctx.fillStyle = '#ef4444';
		ctx.fillRect(eCastX - 5, eCastY - 8, 10, 16);
		ctx.strokeStyle = '#fca5a5';
		ctx.lineWidth = 1;
		ctx.strokeRect(eCastX - 5, eCastY - 8, 10, 16);

		// 3. Placed Buildings
		for (const b of sim.buildings) {
			const bx = b.x * scaleX;
			const by = b.y * scaleY;
			ctx.fillStyle = b.team === 'west' ? '#60a5fa' : '#f87171';
			ctx.fillRect(bx, by, 3.5, 3.5);
		}

		// 4. Units
		for (const u of sim.units) {
			if (u.state === 'DEAD') continue;
			const ux = u.x * scaleX;
			const uy = u.y * scaleY;

			if (u.team === 'neutral') {
				// Boss: Golden Star/Diamond
				ctx.fillStyle = '#fbbf24';
				ctx.beginPath();
				ctx.arc(ux, uy, 3.5, 0, Math.PI * 2);
				ctx.fill();
			} else if (u.team === 'west') {
				// Player units: Bright Lime-Green or Cyan
				ctx.fillStyle = allyColorsMode ? '#22c55e' : '#38bdf8';
				ctx.fillRect(ux - 1.5, uy - 1.5, 3, 3);
			} else {
				// Enemy units: Bright Red
				ctx.fillStyle = '#ef4444';
				ctx.fillRect(ux - 1.5, uy - 1.5, 3, 3);
			}
		}

		// 5. Worker blip (Cyan dot with white outline)
		const worker = sim.players.west?.worker;
		if (worker) {
			const wx = worker.x * scaleX;
			const wy = worker.y * scaleY;
			ctx.fillStyle = '#06b6d4';
			ctx.beginPath();
			ctx.arc(wx, wy, 3, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = '#ffffff';
			ctx.lineWidth = 1;
			ctx.stroke();
		}

		// 6. Gold coins (Yellow sparkles)
		ctx.fillStyle = '#fde047';
		for (const coin of sim.goldCoins) {
			ctx.fillRect(coin.x * scaleX - 1, coin.y * scaleY - 1, 2, 2);
		}

		// 7. Ping effect animation
		if (lastPing && lastPing.timer > 0) {
			const px = lastPing.x * scaleX;
			const py = lastPing.y * scaleY;
			const radius = (1.5 - lastPing.timer) * 20 + 4;
			ctx.strokeStyle = '#fbbf24';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(px, py, radius, 0, Math.PI * 2);
			ctx.stroke();
			lastPing.timer -= 0.05;
		}
	}

	onMount(() => {
		let animId: number;
		function loop() {
			renderMinimap();
			animId = requestAnimationFrame(loop);
		}
		animId = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(animId);
	});
</script>

<div
	class="relative flex items-center bg-[#131722] p-1.5 rounded-lg border-2 border-[#544738] shadow-2xl select-none"
	style="box-shadow: inset 0 0 10px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.7);"
>
	<!-- Minimap Canvas with Ornate WC3 Stone Trim -->
	<div class="relative overflow-hidden rounded border border-[#3b3226] bg-[#0c1017]">
		<canvas
			bind:this={canvasEl}
			width={MAP_WIDTH}
			height={MAP_HEIGHT}
			onclick={handleCanvasClick}
			class="cursor-crosshair block"
			title="Мінікарта арени. Клікніть, щоб подати сигнал (Ping)!"
		></canvas>

		<!-- Subtitle overlay indicator -->
		<div
			class="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-[9px] text-[#9ca3af] font-mono text-center pointer-events-none flex justify-between"
		>
			<span class="text-emerald-400">Захід (Ви)</span>
			<span class="text-rose-400">Схід (Бот)</span>
		</div>
	</div>

	<!-- Authentic Warcraft III Minimap Side Control Buttons -->
	<div class="flex flex-col gap-1 ml-1.5 justify-between">
		<!-- Ping / Signal button -->
		<button
			onclick={() => triggerPing(ARENA_WIDTH / 2, TOP_LANE_Y)}
			class="w-6 h-6 rounded bg-[#2a241b] hover:bg-[#3d3427] border border-[#78654c] flex items-center justify-center text-[#d4af37] transition cursor-pointer active:scale-95 shadow"
			title="Подати сигнал на карті (Ping)"
		>
			<Crosshair class="w-3.5 h-3.5" />
		</button>

		<!-- Toggle Terrain Mode -->
		<button
			onclick={() => (simpleTerrainMode = !simpleTerrainMode)}
			class="w-6 h-6 rounded border flex items-center justify-center transition cursor-pointer active:scale-95 shadow {simpleTerrainMode
				? 'bg-[#3b82f6]/30 border-blue-400 text-blue-300'
				: 'bg-[#2a241b] hover:bg-[#3d3427] border-[#78654c] text-[#c5a880]'}"
			title="Перемкнути детальність рельєфу"
		>
			<MapIcon class="w-3.5 h-3.5" />
		</button>

		<!-- Toggle Ally Colors -->
		<button
			onclick={() => (allyColorsMode = !allyColorsMode)}
			class="w-6 h-6 rounded border flex items-center justify-center transition cursor-pointer active:scale-95 shadow {allyColorsMode
				? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
				: 'bg-[#2a241b] hover:bg-[#3d3427] border-[#78654c] text-[#c5a880]'}"
			title="Кольори союзників (Зелений / Синій)"
		>
			<Users class="w-3.5 h-3.5" />
		</button>

		<!-- Center Castle/Base -->
		<button
			onclick={() => triggerPing(sim.castles.west.x, sim.castles.west.y)}
			class="w-6 h-6 rounded bg-[#2a241b] hover:bg-[#3d3427] border border-[#78654c] flex items-center justify-center text-[#d4af37] transition cursor-pointer active:scale-95 shadow"
			title="Показати базу гравця"
		>
			<Castle class="w-3.5 h-3.5" />
		</button>
	</div>
</div>
