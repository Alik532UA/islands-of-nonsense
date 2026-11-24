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
	import { Map as MapIcon, Users, Move, ChevronDown, ChevronUp } from 'lucide-svelte';
	import { sound } from '../services/audio';

	import type { Snippet } from 'svelte';

	let {
		sim,
		uiTick: _uiTick = 0,
		cameraX = 800,
		cameraY = 1200,
		zoom = 0.85,
		onMinimapClick,
		touchControls: _touchControls
	}: {
		sim: Simulation;
		uiTick?: number;
		cameraX?: number;
		cameraY?: number;
		zoom?: number;
		onMinimapClick?: (arenaX: number, arenaY: number) => void;
		touchControls?: Snippet;
	} = $props();

	let canvasEl: HTMLCanvasElement;
	let allyColorsMode = $state(false);
	let simpleTerrainMode = $state(false);
	let lastPing = $state<{ x: number; y: number; timer: number } | null>(null);
	let isDragging = $state(false);

	let isCollapsed = $state(false);
	let dragPosition = $state<{ x: number; y: number }>({ x: 0, y: 0 });
	let isMoving = $state(false);
	let moveStart = { mouseX: 0, mouseY: 0, posX: 0, posY: 0 };

	const MAP_WIDTH = 285;
	const MAP_HEIGHT = 95;

	function startDrag(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		isMoving = true;
		moveStart = {
			mouseX: e.clientX,
			mouseY: e.clientY,
			posX: dragPosition.x,
			posY: dragPosition.y
		};
		window.addEventListener('mousemove', onDragMove);
		window.addEventListener('mouseup', onDragEnd);
	}

	function onDragMove(e: MouseEvent) {
		if (!isMoving) return;
		const dx = e.clientX - moveStart.mouseX;
		const dy = e.clientY - moveStart.mouseY;
		dragPosition = {
			x: moveStart.posX + dx,
			y: moveStart.posY + dy
		};
	}

	function onDragEnd() {
		isMoving = false;
		window.removeEventListener('mousemove', onDragMove);
		window.removeEventListener('mouseup', onDragEnd);
	}

	function startDragTouch(e: TouchEvent) {
		if (e.touches.length !== 1) return;
		const touch = e.touches[0];
		isMoving = true;
		moveStart = {
			mouseX: touch.clientX,
			mouseY: touch.clientY,
			posX: dragPosition.x,
			posY: dragPosition.y
		};
		window.addEventListener('touchmove', onDragMoveTouch, { passive: false });
		window.addEventListener('touchend', onDragEndTouch);
	}

	function onDragMoveTouch(e: TouchEvent) {
		if (!isMoving || e.touches.length !== 1) return;
		e.preventDefault();
		const touch = e.touches[0];
		const dx = touch.clientX - moveStart.mouseX;
		const dy = touch.clientY - moveStart.mouseY;
		dragPosition = {
			x: moveStart.posX + dx,
			y: moveStart.posY + dy
		};
	}

	function onDragEndTouch() {
		isMoving = false;
		window.removeEventListener('touchmove', onDragMoveTouch);
		window.removeEventListener('touchend', onDragEndTouch);
	}

	function resetDragPosition() {
		dragPosition = { x: 0, y: 0 };
	}

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

		const westColor = sim.castles.west.color?.hex || sim.players.west.color?.hex || '#0042ff';
		const eastColor = sim.castles.east.color?.hex || sim.players.east.color?.hex || '#ff0303';

		// 1. Terrain Ground (Natural Lordaeron Grass without Base Tinting!)
		if (simpleTerrainMode) {
			ctx.fillStyle = '#1e293b';
			ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
		} else {
			// 1. Surrounding Ocean (Deep azure water all around)
			ctx.fillStyle = '#0284c7';
			ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

			// 2. Twin Procedural Oval Islands (West and East)
			ctx.fillStyle = '#16a34a';

			// West Island (surrounded by water, oval-round)
			ctx.beginPath();
			ctx.ellipse(1600 * scaleX, 1200 * scaleY, 1450 * scaleX, 1050 * scaleY, 0, 0, Math.PI * 2);
			ctx.fill();

			// East Island (surrounded by water, oval-round)
			ctx.beginPath();
			ctx.ellipse(5600 * scaleX, 1200 * scaleY, 1450 * scaleX, 1050 * scaleY, 0, 0, Math.PI * 2);
			ctx.fill();

			// 3. Cobblestone Highways from Castle Centers to Bridges
			ctx.fillStyle = '#78716c';

			// West Island Highways fanning out from castle at (1600, 1200)
			ctx.beginPath();
			ctx.moveTo(1600 * scaleX, 1200 * scaleY);
			ctx.lineTo(BRIDGE_SPAN_MIN_X * scaleX, (TOP_LANE_Y - 40) * scaleY);
			ctx.lineTo(BRIDGE_SPAN_MIN_X * scaleX, (TOP_LANE_Y + 40) * scaleY);
			ctx.closePath();
			ctx.fill();

			ctx.beginPath();
			ctx.moveTo(1600 * scaleX, 1200 * scaleY);
			ctx.lineTo(BRIDGE_SPAN_MIN_X * scaleX, (BOTTOM_LANE_Y - 40) * scaleY);
			ctx.lineTo(BRIDGE_SPAN_MIN_X * scaleX, (BOTTOM_LANE_Y + 40) * scaleY);
			ctx.closePath();
			ctx.fill();

			ctx.fillRect(
				1600 * scaleX,
				(MID_LANE_Y - 40) * scaleY,
				(BRIDGE_SPAN_MIN_X - 1600) * scaleX,
				80 * scaleY
			);

			// East Island Highways fanning out from castle at (5600, 1200)
			ctx.beginPath();
			ctx.moveTo(5600 * scaleX, 1200 * scaleY);
			ctx.lineTo(BRIDGE_SPAN_MAX_X * scaleX, (TOP_LANE_Y - 40) * scaleY);
			ctx.lineTo(BRIDGE_SPAN_MAX_X * scaleX, (TOP_LANE_Y + 40) * scaleY);
			ctx.closePath();
			ctx.fill();

			ctx.beginPath();
			ctx.moveTo(5600 * scaleX, 1200 * scaleY);
			ctx.lineTo(BRIDGE_SPAN_MAX_X * scaleX, (BOTTOM_LANE_Y - 40) * scaleY);
			ctx.lineTo(BRIDGE_SPAN_MAX_X * scaleX, (BOTTOM_LANE_Y + 40) * scaleY);
			ctx.closePath();
			ctx.fill();

			ctx.fillRect(
				BRIDGE_SPAN_MAX_X * scaleX,
				(MID_LANE_Y - 40) * scaleY,
				(5600 - BRIDGE_SPAN_MAX_X) * scaleX,
				80 * scaleY
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

		// 3. Placed Buildings (2x2 footprint) with real player/bot colors
		for (const b of sim.buildings) {
			if (b.team === 'east' && !sim.isPointRevealed('west', b.x, b.y)) continue;
			const bx = b.x * scaleX;
			const by = b.y * scaleY;
			const owner = sim.allPlayers.find((p) => p.slot === b.playerSlot) || sim.players[b.team];
			ctx.fillStyle = owner?.color?.hex || (b.team === 'west' ? westColor : eastColor);
			ctx.fillRect(bx, by, 4, 4);
		}

		// 4. Units with real player/bot colors
		for (const u of sim.units) {
			if (u.state === 'DEAD') continue;
			if (u.team !== 'west' && !sim.isPointRevealed('west', u.x, u.y)) continue;

			const ux = u.x * scaleX;
			const uy = u.y * scaleY;

			if (u.team === 'neutral') {
				// Boss: Golden Diamond
				ctx.fillStyle = '#fbbf24';
				ctx.beginPath();
				ctx.arc(ux, uy, 3.5, 0, Math.PI * 2);
				ctx.fill();
			} else {
				const owner = sim.allPlayers.find((p) => p.slot === u.playerSlot) || sim.players[u.team];
				ctx.fillStyle = allyColorsMode
					? u.team === 'west'
						? '#22c55e'
						: '#ef4444'
					: owner?.color?.hex || (u.team === 'west' ? westColor : eastColor);
				ctx.fillRect(ux - 1.5, uy - 1.5, 3, 3);
			}
		}

		// 5. Worker blips
		for (const p of sim.allPlayers || [sim.players.west]) {
			const worker = p.worker;
			if (!worker) continue;
			if (p.team !== 'west' && !sim.isPointRevealed('west', worker.x, worker.y)) continue;
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
			if (!sim.isPointRevealed('west', coin.x, coin.y)) continue;
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
		let lastRenderTime = 0;
		function loop(now: number) {
			// Throttle minimap rendering to 20 FPS (every 50ms) to eliminate main-thread CPU starvation
			if (now - lastRenderTime >= 50) {
				lastRenderTime = now;
				renderMinimap();
			}
			animId = requestAnimationFrame(loop);
		}
		animId = requestAnimationFrame(loop);

		window.addEventListener('mouseup', handleMouseUp);
		return () => {
			cancelAnimationFrame(animId);
			window.removeEventListener('mouseup', handleMouseUp);
			window.removeEventListener('mousemove', onDragMove);
			window.removeEventListener('mouseup', onDragEnd);
			window.removeEventListener('touchmove', onDragMoveTouch);
			window.removeEventListener('touchend', onDragEndTouch);
		};
	});
</script>

{#if isCollapsed}
	<!-- Collapsed Minimap Tab: Glued to the bottom with Expand Button (Up Arrow) -->
	<div
		class="relative flex items-center justify-center shrink-0 pointer-events-auto select-none"
		style={dragPosition.x || dragPosition.y
			? `transform: translate(${dragPosition.x}px, ${dragPosition.y}px);`
			: ''}
	>
		<button
			type="button"
			onclick={() => {
				isCollapsed = false;
				setTimeout(() => renderMinimap(), 16);
			}}
			class="flex items-center gap-1.5 px-3 py-1.5 bg-[#131722]/95 hover:bg-[#1f2638] border-t-2 border-x-2 border-b-0 border-[#544738] rounded-t-lg text-amber-300 shadow-2xl transition cursor-pointer active:scale-95 backdrop-blur-md"
			title="Показати мінікарту"
			aria-label="Показати мінікарту"
			data-testid="minimap-expand-btn"
		>
			<MapIcon class="w-3.5 h-3.5 text-amber-400" />
			<ChevronUp class="w-4 h-4 text-amber-300" />
			<span class="text-[9.5px] font-bold uppercase tracking-wider">Карта</span>
		</button>
	</div>
{/if}

<!-- Expanded Minimap: Anchored flush to the bottom, top controls row with Terrain/Ally on left, Move/Hide on right -->
<div
	class="relative flex flex-col justify-between bg-[#131722]/95 backdrop-blur-md rounded-t-xl rounded-b-none border-t-2 border-x-2 border-b-0 border-[#544738] shadow-2xl select-none h-[142px] w-[285px] shrink-0 overflow-hidden pointer-events-auto transition-all duration-200 {isCollapsed
		? 'hidden'
		: ''}"
	style="box-shadow: inset 0 0 10px rgba(0,0,0,0.8), 0 -4px 16px rgba(0,0,0,0.7); {dragPosition.x ||
	dragPosition.y
		? `transform: translate(${dragPosition.x}px, ${dragPosition.y}px);`
		: ''}"
>
	<!-- Top Controls Row (Terrain, Ally colors on left; Drag & Drop, Hide on right) -->
	<div
		class="flex items-center justify-between w-full pt-1 px-1.5 pb-1 shrink-0 bg-[#0e121a]/80 border-b border-[#3b3226]"
	>
		<!-- Top-Left buttons: Terrain and Ally colors -->
		<div class="flex items-center gap-1">
			<button
				type="button"
				onclick={() => (simpleTerrainMode = !simpleTerrainMode)}
				class="w-6 h-6 rounded border flex items-center justify-center transition cursor-pointer active:scale-95 shadow {simpleTerrainMode
					? 'bg-[#3b82f6]/40 border-blue-400 text-blue-300'
					: 'bg-[#2a241b] hover:bg-[#3d3427] border-[#78654c] text-[#c5a880]'}"
				title="Перемкнути детальність рельєфу"
				aria-label="Перемкнути детальність рельєфу"
				data-testid="minimap-terrain-btn"
			>
				<MapIcon class="w-3.5 h-3.5" />
			</button>

			<button
				type="button"
				onclick={() => (allyColorsMode = !allyColorsMode)}
				class="w-6 h-6 rounded border flex items-center justify-center transition cursor-pointer active:scale-95 shadow {allyColorsMode
					? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
					: 'bg-[#2a241b] hover:bg-[#3d3427] border-[#78654c] text-[#c5a880]'}"
				title="Кольори союзників (Зелений / Ворожий)"
				aria-label="Кольори союзників"
				data-testid="minimap-ally-colors-btn"
			>
				<Users class="w-3.5 h-3.5" />
			</button>
		</div>

		<!-- Top-Right buttons: Drag handle and Hide button -->
		<div class="flex items-center gap-1">
			<button
				type="button"
				onmousedown={startDrag}
				ontouchstart={startDragTouch}
				ondblclick={resetDragPosition}
				class="w-6 h-6 rounded bg-[#2a241b] hover:bg-[#3d3427] border border-[#78654c] flex items-center justify-center text-[#d4af37] transition cursor-grab active:cursor-grabbing shadow"
				title="Перемістити мінікарту (перетягніть мишею; подвійний клік — скинути позицію)"
				aria-label="Перемістити мінікарту"
				data-testid="minimap-drag-btn"
			>
				<Move class="w-3.5 h-3.5" />
			</button>

			<button
				type="button"
				onclick={() => (isCollapsed = true)}
				class="w-6 h-6 rounded bg-[#2a241b] hover:bg-[#3d3427] border border-[#78654c] flex items-center justify-center text-[#d4af37] transition cursor-pointer active:scale-95 shadow"
				title="Приховати мінікарту"
				aria-label="Приховати мінікарту"
				data-testid="minimap-collapse-btn"
			>
				<ChevronDown class="w-3.5 h-3.5" />
			</button>
		</div>
	</div>

	<!-- Minimap Canvas with Ornate WC3 Stone Trim (Full Width) -->
	<div
		class="relative overflow-hidden bg-[#0c1017] w-full flex-1 shrink-0 flex items-center justify-center"
	>
		<canvas
			bind:this={canvasEl}
			width={MAP_WIDTH}
			height={MAP_HEIGHT}
			onmousedown={handleMouseDown}
			onmousemove={handleMouseMove}
			class="cursor-crosshair block w-full h-full"
			title="Мінікарта арени. Затисніть та ведіть, щоб перемістити камеру!"
		></canvas>
	</div>
</div>
