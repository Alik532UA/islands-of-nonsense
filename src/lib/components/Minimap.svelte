<script lang="ts">
	import { onMount } from 'svelte';
	import type { Simulation } from '../engine/simulation';
	import {
		ARENA_WIDTH,
		ARENA_HEIGHT,
		TOP_LANE_Y,
		MID_LANE_Y,
		BOTTOM_LANE_Y,
		BRIDGE_SPAN_MIN_X,
		BRIDGE_SPAN_MAX_X
	} from '../engine/constants';
	import { Crosshair, Map as MapIcon, Users, Castle } from 'lucide-svelte';
	import { sound } from '../services/audio';

	let {
		sim,
		uiTick: _uiTick = 0,
		cameraX = 800,
		cameraY = 1200,
		zoom = 0.85,
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
			// 1. Surrounding Ocean (Deep azure water all around)
			ctx.fillStyle = '#0284c7';
			ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

			// 2. Twin Islands (West and East)
			ctx.fillStyle = '#16a34a';

			// West Island (surrounded by water)
			const wIslandX = 60 * scaleX;
			const wIslandY = 60 * scaleY;
			const wIslandW = (BRIDGE_SPAN_MIN_X - 60) * scaleX;
			const wIslandH = (ARENA_HEIGHT - 120) * scaleY;
			ctx.beginPath();
			ctx.roundRect(wIslandX, wIslandY, wIslandW, wIslandH, 4);
			ctx.fill();

			// East Island (surrounded by water)
			const eIslandX = BRIDGE_SPAN_MAX_X * scaleX;
			const eIslandY = 60 * scaleY;
			const eIslandW = (ARENA_WIDTH - BRIDGE_SPAN_MAX_X - 60) * scaleX;
			const eIslandH = (ARENA_HEIGHT - 120) * scaleY;
			ctx.beginPath();
			ctx.roundRect(eIslandX, eIslandY, eIslandW, eIslandH, 4);
			ctx.fill();

			// 3. Cobblestone Highways across the Islands
			ctx.fillStyle = '#78716c';

			// West Island Highways
			const westHwLen = (BRIDGE_SPAN_MIN_X - 1500) * scaleX;
			ctx.fillRect(1500 * scaleX, (TOP_LANE_Y - 50) * scaleY, westHwLen, 100 * scaleY);
			ctx.fillRect(1500 * scaleX, (MID_LANE_Y - 50) * scaleY, westHwLen, 100 * scaleY);
			ctx.fillRect(1500 * scaleX, (BOTTOM_LANE_Y - 50) * scaleY, westHwLen, 100 * scaleY);

			// East Island Highways
			const eastHwLen = (ARENA_WIDTH - 1500 - BRIDGE_SPAN_MAX_X) * scaleX;
			ctx.fillRect(BRIDGE_SPAN_MAX_X * scaleX, (TOP_LANE_Y - 50) * scaleY, eastHwLen, 100 * scaleY);
			ctx.fillRect(BRIDGE_SPAN_MAX_X * scaleX, (MID_LANE_Y - 50) * scaleY, eastHwLen, 100 * scaleY);
			ctx.fillRect(
				BRIDGE_SPAN_MAX_X * scaleX,
				(BOTTOM_LANE_Y - 50) * scaleY,
				eastHwLen,
				100 * scaleY
			);

			// Courtyard Fan-outs from Castle Plazas to Gates
			// West fan-out
			ctx.beginPath();
			ctx.moveTo(200 * scaleX, 1200 * scaleY);
			ctx.lineTo(1500 * scaleX, (TOP_LANE_Y - 50) * scaleY);
			ctx.lineTo(1500 * scaleX, (TOP_LANE_Y + 50) * scaleY);
			ctx.closePath();
			ctx.fill();

			ctx.beginPath();
			ctx.moveTo(200 * scaleX, 1200 * scaleY);
			ctx.lineTo(1500 * scaleX, (BOTTOM_LANE_Y - 50) * scaleY);
			ctx.lineTo(1500 * scaleX, (BOTTOM_LANE_Y + 50) * scaleY);
			ctx.closePath();
			ctx.fill();

			ctx.fillRect(200 * scaleX, (MID_LANE_Y - 50) * scaleY, 1300 * scaleX, 100 * scaleY);

			// East fan-out
			ctx.beginPath();
			ctx.moveTo((ARENA_WIDTH - 200) * scaleX, 1200 * scaleY);
			ctx.lineTo((ARENA_WIDTH - 1500) * scaleX, (TOP_LANE_Y - 50) * scaleY);
			ctx.lineTo((ARENA_WIDTH - 1500) * scaleX, (TOP_LANE_Y + 50) * scaleY);
			ctx.closePath();
			ctx.fill();

			ctx.beginPath();
			ctx.moveTo((ARENA_WIDTH - 200) * scaleX, 1200 * scaleY);
			ctx.lineTo((ARENA_WIDTH - 1500) * scaleX, (BOTTOM_LANE_Y - 50) * scaleY);
			ctx.lineTo((ARENA_WIDTH - 1500) * scaleX, (BOTTOM_LANE_Y + 50) * scaleY);
			ctx.closePath();
			ctx.fill();

			ctx.fillRect(
				(ARENA_WIDTH - 1500) * scaleX,
				(MID_LANE_Y - 50) * scaleY,
				1300 * scaleX,
				100 * scaleY
			);

			// 4. Three Bridges spanning the Central Strait
			const bridgeX = (BRIDGE_SPAN_MIN_X - 40) * scaleX;
			const bridgeW = (BRIDGE_SPAN_MAX_X - BRIDGE_SPAN_MIN_X + 80) * scaleX;
			const bridgeH = 110 * scaleY;

			const lanes: { id: 'top' | 'mid' | 'bottom'; y: number }[] = [
				{ id: 'top', y: TOP_LANE_Y },
				{ id: 'mid', y: MID_LANE_Y },
				{ id: 'bottom', y: BOTTOM_LANE_Y }
			];

			for (const lane of lanes) {
				const isBroken = sim.brokenBridge === lane.id;
				const by = (lane.y - 55) * scaleY;

				if (!isBroken) {
					// Intact bridge
					ctx.fillStyle = '#94a3b8';
					ctx.fillRect(bridgeX, by, bridgeW, bridgeH);
					ctx.fillStyle = '#64748b';
					ctx.fillRect(bridgeX + 2, by + 1, bridgeW - 4, bridgeH - 2);
				} else {
					// Broken bridge: Stubs on each side with chasm in center
					const stubW = bridgeW * 0.32;
					ctx.fillStyle = '#78350f';
					ctx.fillRect(bridgeX, by, stubW, bridgeH);
					ctx.fillRect(bridgeX + bridgeW - stubW, by, stubW, bridgeH);

					// Danger hazard marker in center
					ctx.strokeStyle = '#ef4444';
					ctx.lineWidth = 2;
					const midX = bridgeX + bridgeW / 2;
					const midY = lane.y * scaleY;
					ctx.beginPath();
					ctx.moveTo(midX - 3, midY - 3);
					ctx.lineTo(midX + 3, midY + 3);
					ctx.moveTo(midX + 3, midY - 3);
					ctx.lineTo(midX - 3, midY + 3);
					ctx.stroke();
				}
			}

			// Ramparts with open road gates
			ctx.fillStyle = '#475569';
			// West ramparts
			ctx.fillRect(1440 * scaleX, 60 * scaleY, 40 * scaleX, 500 * scaleY);
			ctx.fillRect(1440 * scaleX, 760 * scaleY, 40 * scaleX, 340 * scaleY);
			ctx.fillRect(1440 * scaleX, 1300 * scaleY, 40 * scaleX, 340 * scaleY);
			ctx.fillRect(1440 * scaleX, 1840 * scaleY, 40 * scaleX, (ARENA_HEIGHT - 1900) * scaleY);
			// East ramparts
			ctx.fillRect((ARENA_WIDTH - 1480) * scaleX, 60 * scaleY, 40 * scaleX, 500 * scaleY);
			ctx.fillRect((ARENA_WIDTH - 1480) * scaleX, 760 * scaleY, 40 * scaleX, 340 * scaleY);
			ctx.fillRect((ARENA_WIDTH - 1480) * scaleX, 1300 * scaleY, 40 * scaleX, 340 * scaleY);
			ctx.fillRect(
				(ARENA_WIDTH - 1480) * scaleX,
				1840 * scaleY,
				40 * scaleX,
				(ARENA_HEIGHT - 1900) * scaleY
			);
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

		const fogOfWar = sim.config.fogOfWar ?? true;

		function isRevealedToWest(x: number, y: number): boolean {
			if (!fogOfWar) return true;
			if (x <= 1500) return true;
			for (const p of sim.teamMembers?.west || [sim.players.west]) {
				const w = p.worker;
				if (w && Math.hypot(w.x - x, w.y - y) <= 480) return true;
			}
			for (const b of sim.buildings) {
				if (b.team === 'west' && Math.hypot(b.x + 32 - x, b.y + 32 - y) <= 450) return true;
			}
			for (const ally of sim.units) {
				if (
					ally.team === 'west' &&
					ally.state !== 'DEAD' &&
					Math.hypot(ally.x - x, ally.y - y) <= 450
				) {
					return true;
				}
			}
			return false;
		}

		// 3. Placed Buildings (2x2 footprint)
		for (const b of sim.buildings) {
			if (b.team === 'east' && !isRevealedToWest(b.x, b.y)) continue;
			const bx = b.x * scaleX;
			const by = b.y * scaleY;
			ctx.fillStyle = b.team === 'west' ? westColor : eastColor;
			ctx.fillRect(bx, by, 4, 4);
		}

		// 4. Units
		for (const u of sim.units) {
			if (u.state === 'DEAD') continue;
			if (u.team === 'east' && !isRevealedToWest(u.x, u.y)) continue;
			if (u.team === 'neutral' && !isRevealedToWest(u.x, u.y)) continue;

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

		// 5. Worker blips
		for (const p of sim.allPlayers || [sim.players.west]) {
			const worker = p.worker;
			if (!worker) continue;
			if (p.team === 'east' && !isRevealedToWest(worker.x, worker.y)) continue;
			const wx = worker.x * scaleX;
			const wy = worker.y * scaleY;
			ctx.fillStyle = p.color?.hex || (p.team === 'west' ? '#06b6d4' : '#ef4444');
			ctx.beginPath();
			ctx.arc(wx, wy, 3, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = '#ffffff';
			ctx.lineWidth = 1;
			ctx.stroke();
		}

		// 6. Gold coins (Filtered by visibility)
		ctx.fillStyle = '#fde047';
		for (const coin of sim.goldCoins) {
			if (coin.x > 1500 && !isRevealedToWest(coin.x, coin.y)) continue;
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
