<script lang="ts">
	import { onMount } from 'svelte';
	import type { Simulation } from '../engine/simulation';
	import { ARENA_WIDTH, ARENA_HEIGHT, TOP_LANE_Y, BOTTOM_LANE_Y } from '../engine/simulation';
	import { Crosshair, Map as MapIcon, Users, Castle } from 'lucide-svelte';
	import { sound } from '../services/audio';

	let {
		sim,
		uiTick: _uiTick = 0,
		cameraX = 450,
		cameraY = 400,
		zoom = 1.0,
		onMinimapClick
	}: {
		sim: Simulation;
		uiTick?: number;
		cameraX?: number;
		cameraY?: number;
		zoom?: number;
		onMinimapClick?: (arenaX: number, arenaY: number) => void;
	} = $props();

	let canvasEl: HTMLCanvasElement;
	let allyColorsMode = $state(false);
	let simpleTerrainMode = $state(false);
	let lastPing = $state<{ x: number; y: number; timer: number } | null>(null);
	let isDragging = $state(false);

	const MAP_WIDTH = 220;
	const MAP_HEIGHT = 70;

	function triggerPing(x: number, y: number) {
		lastPing = { x, y, timer: 1.5 };
		sound.playHit();
		onMinimapClick?.(x, y);
	}

	function handlePointer(e: MouseEvent) {
		if (!canvasEl) return;
		const rect = canvasEl.getBoundingClientRect();
		const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

		const arenaX = normX * ARENA_WIDTH;
		const arenaY = normY * ARENA_HEIGHT;

		onMinimapClick?.(arenaX, arenaY);
	}

	function handleMouseDown(e: MouseEvent) {
		isDragging = true;
		handlePointer(e);
	}

	function handleMouseMove(e: MouseEvent) {
		if (isDragging) {
			handlePointer(e);
		}
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function renderMinimap() {
		if (!canvasEl) return;
		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		const scaleX = MAP_WIDTH / ARENA_WIDTH;
		const scaleY = MAP_HEIGHT / ARENA_HEIGHT;

		const westColor = sim.players.west.color?.hex || '#0042ff';
		const eastColor = sim.players.east.color?.hex || '#ff0303';

		// 1. Terrain Ground (Natural Lordaeron Grass without Base Tinting!)
		if (simpleTerrainMode) {
			ctx.fillStyle = '#1e293b';
			ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
		} else {
			// Vibrant green battlefield
			ctx.fillStyle = '#22551e';
			ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

			// Cobblestone continuous roads: West Castle -> Top & Bottom Lanes -> East Castle
			ctx.fillStyle = '#6b573e';

			// Straight highways (between ramparts)
			ctx.fillRect(
				1440 * scaleX,
				(TOP_LANE_Y - 80) * scaleY,
				(ARENA_WIDTH - 2880) * scaleX,
				160 * scaleY
			);
			ctx.fillRect(
				1440 * scaleX,
				(BOTTOM_LANE_Y - 80) * scaleY,
				(ARENA_WIDTH - 2880) * scaleX,
				160 * scaleY
			);

			// Road curves from Castle Plazas to Lane Gates
			// West fan-out
			ctx.beginPath();
			ctx.moveTo(200 * scaleX, 1200 * scaleY);
			ctx.lineTo(1440 * scaleX, (TOP_LANE_Y - 80) * scaleY);
			ctx.lineTo(1440 * scaleX, (TOP_LANE_Y + 80) * scaleY);
			ctx.closePath();
			ctx.fill();

			ctx.beginPath();
			ctx.moveTo(200 * scaleX, 1200 * scaleY);
			ctx.lineTo(1440 * scaleX, (BOTTOM_LANE_Y - 80) * scaleY);
			ctx.lineTo(1440 * scaleX, (BOTTOM_LANE_Y + 80) * scaleY);
			ctx.closePath();
			ctx.fill();

			// East fan-out
			ctx.beginPath();
			ctx.moveTo((ARENA_WIDTH - 200) * scaleX, 1200 * scaleY);
			ctx.lineTo((ARENA_WIDTH - 1440) * scaleX, (TOP_LANE_Y - 80) * scaleY);
			ctx.lineTo((ARENA_WIDTH - 1440) * scaleX, (TOP_LANE_Y + 80) * scaleY);
			ctx.closePath();
			ctx.fill();

			ctx.beginPath();
			ctx.moveTo((ARENA_WIDTH - 200) * scaleX, 1200 * scaleY);
			ctx.lineTo((ARENA_WIDTH - 1440) * scaleX, (BOTTOM_LANE_Y - 80) * scaleY);
			ctx.lineTo((ARENA_WIDTH - 1440) * scaleX, (BOTTOM_LANE_Y + 80) * scaleY);
			ctx.closePath();
			ctx.fill();

			// Central River
			ctx.fillStyle = '#0284c7';
			ctx.fillRect((ARENA_WIDTH / 2 - 140) * scaleX, 0, 280 * scaleX, MAP_HEIGHT);

			// Bridges
			ctx.fillStyle = '#78716c';
			ctx.fillRect(
				(ARENA_WIDTH / 2 - 140) * scaleX,
				(TOP_LANE_Y - 90) * scaleY,
				280 * scaleX,
				180 * scaleY
			);
			ctx.fillRect(
				(ARENA_WIDTH / 2 - 140) * scaleX,
				(BOTTOM_LANE_Y - 90) * scaleY,
				280 * scaleX,
				180 * scaleY
			);

			// Central dividing mountain ridge
			ctx.fillStyle = '#334155';
			ctx.fillRect(1460 * scaleX, 1040 * scaleY, (ARENA_WIDTH - 2920) * scaleX, 320 * scaleY);

			// Ramparts with open road gates
			ctx.fillStyle = '#475569';
			// West ramparts
			ctx.fillRect(1440 * scaleX, 60 * scaleY, 40 * scaleX, 500 * scaleY);
			ctx.fillRect(1440 * scaleX, 760 * scaleY, 40 * scaleX, 280 * scaleY);
			ctx.fillRect(1440 * scaleX, 1360 * scaleY, 40 * scaleX, 280 * scaleY);
			ctx.fillRect(1440 * scaleX, 1840 * scaleY, 40 * scaleX, 500 * scaleY);
			// East ramparts
			ctx.fillRect((ARENA_WIDTH - 1480) * scaleX, 60 * scaleY, 40 * scaleX, 500 * scaleY);
			ctx.fillRect((ARENA_WIDTH - 1480) * scaleX, 760 * scaleY, 40 * scaleX, 280 * scaleY);
			ctx.fillRect((ARENA_WIDTH - 1480) * scaleX, 1360 * scaleY, 40 * scaleX, 280 * scaleY);
			ctx.fillRect((ARENA_WIDTH - 1480) * scaleX, 1840 * scaleY, 40 * scaleX, 500 * scaleY);
		}

		// 2. Castles
		// West Castle
		const wCastX = sim.castles.west.x * scaleX;
		const wCastY = sim.castles.west.y * scaleY;
		ctx.fillStyle = westColor;
		ctx.fillRect(wCastX - 4, wCastY - 8, 8, 16);
		ctx.strokeStyle = '#ffffff';
		ctx.lineWidth = 1;
		ctx.strokeRect(wCastX - 4, wCastY - 8, 8, 16);

		// East Castle
		const eCastX = sim.castles.east.x * scaleX;
		const eCastY = sim.castles.east.y * scaleY;
		ctx.fillStyle = eastColor;
		ctx.fillRect(eCastX - 4, eCastY - 8, 8, 16);
		ctx.strokeStyle = '#ffffff';
		ctx.lineWidth = 1;
		ctx.strokeRect(eCastX - 4, eCastY - 8, 8, 16);

		// 3. Placed Buildings (2x2 footprint)
		for (const b of sim.buildings) {
			const bx = b.x * scaleX;
			const by = b.y * scaleY;
			ctx.fillStyle = b.team === 'west' ? westColor : eastColor;
			ctx.fillRect(bx, by, 4, 4);
		}

		// 4. Units
		for (const u of sim.units) {
			if (u.state === 'DEAD') continue;
			const ux = u.x * scaleX;
			const uy = u.y * scaleY;

			if (u.team === 'neutral') {
				// Boss: Golden Diamond
				ctx.fillStyle = '#fbbf24';
				ctx.beginPath();
				ctx.arc(ux, uy, 3.5, 0, Math.PI * 2);
				ctx.fill();
			} else if (u.team === 'west') {
				ctx.fillStyle = allyColorsMode ? '#22c55e' : westColor;
				ctx.fillRect(ux - 1.5, uy - 1.5, 3, 3);
			} else {
				ctx.fillStyle = allyColorsMode ? '#ef4444' : eastColor;
				ctx.fillRect(ux - 1.5, uy - 1.5, 3, 3);
			}
		}

		// 5. Worker blip (Cyan / Yellow indicator)
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

		// 6. Gold coins
		ctx.fillStyle = '#fde047';
		for (const coin of sim.goldCoins) {
			ctx.fillRect(coin.x * scaleX - 1, coin.y * scaleY - 1, 2, 2);
		}

		// 7. Camera Viewport Box (Frustum)
		const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
		const screenH = typeof window !== 'undefined' ? window.innerHeight : 750;
		const viewWorldW = screenW / zoom;
		const viewWorldH = screenH / zoom;
		const camBoxX = (cameraX - viewWorldW / 2) * scaleX;
		const camBoxY = (cameraY - viewWorldH / 2) * scaleY;
		const camBoxW = viewWorldW * scaleX;
		const camBoxH = viewWorldH * scaleY;

		ctx.strokeStyle = '#fef08a';
		ctx.lineWidth = 1.5;
		ctx.strokeRect(camBoxX, camBoxY, camBoxW, camBoxH);

		// 8. Ping effect animation
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

		window.addEventListener('mouseup', handleMouseUp);
		return () => {
			cancelAnimationFrame(animId);
			window.removeEventListener('mouseup', handleMouseUp);
		};
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
			onmousedown={handleMouseDown}
			onmousemove={handleMouseMove}
			class="cursor-crosshair block"
			title="Мінікарта арени. Затисніть та ведіть, щоб перемістити камеру!"
		></canvas>

		<!-- Subtitle overlay indicator -->
		<div
			class="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-[9px] text-[#9ca3af] font-mono text-center pointer-events-none flex justify-between"
		>
			<span style="color: {sim.players.west.color?.hex || '#38bdf8'}">Захід (Ви)</span>
			<span style="color: {sim.players.east.color?.hex || '#ef4444'}">Схід (Бот)</span>
		</div>
	</div>

	<!-- Authentic Warcraft III Minimap Side Control Buttons -->
	<div class="flex flex-col gap-1 ml-1.5 justify-between">
		<!-- Ping / Signal button -->
		<button
			onclick={() => triggerPing(cameraX, cameraY)}
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
			title="Кольори союзників (Зелений / Ворожий)"
		>
			<Users class="w-3.5 h-3.5" />
		</button>

		<!-- Center Castle/Base -->
		<button
			onclick={() => onMinimapClick?.(sim.castles.west.x + 300, sim.castles.west.y)}
			class="w-6 h-6 rounded bg-[#2a241b] hover:bg-[#3d3427] border border-[#78654c] flex items-center justify-center text-[#d4af37] transition cursor-pointer active:scale-95 shadow"
			title="Центрувати на базу гравця"
		>
			<Castle class="w-3.5 h-3.5" />
		</button>
	</div>
</div>
