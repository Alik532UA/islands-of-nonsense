<script lang="ts">
	import { onMount } from 'svelte';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';

	export interface ShowcaseMinimapRow {
		race: string;
		rowY: number;
		rowH: number;
		spawnersX: number;
		spawnersW: number;
		uniqueX: number;
		uniqueW: number;
		sharedX: number;
		sharedW: number;
		extraX?: number;
		extraW?: number;
	}

	export interface ShowcaseMinimapBottomIsland {
		x: number;
		y: number;
		w: number;
		h: number;
		topH: number;
	}

	let {
		mapW,
		mapH,
		westIslandW,
		eastIslandX,
		bottomIsland = null,
		rows,
		graphicsTab,
		camX,
		camY,
		camZoom,
		hostW,
		hostH,
		selectedPoint = null,
		onNavigate,
		onFitWholeMap
	}: {
		mapW: number;
		mapH: number;
		westIslandW: number;
		eastIslandX: number;
		bottomIsland?: ShowcaseMinimapBottomIsland | null;
		rows: ShowcaseMinimapRow[];
		graphicsTab: '2.5d' | 'hd-webp';
		camX: number;
		camY: number;
		camZoom: number;
		hostW: number;
		hostH: number;
		selectedPoint?: { x: number; y: number } | null;
		onNavigate: (worldX: number, worldY: number) => void;
		onFitWholeMap: () => void;
	} = $props();

	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let simpleTerrainMode = $state(false);
	let isCollapsed = $state(false);
	let isPointerDragging = $state(false);

	let dragPosition = $state<{ x: number; y: number }>({ x: 0, y: 0 });
	let isMovingPanel = $state(false);
	let moveStart = { mouseX: 0, mouseY: 0, posX: 0, posY: 0 };

	const MAX_MINIMAP_W = 196;
	const MAX_MINIMAP_H = 380;

	const minimapSize = $derived.by(() => {
		const safeW = Math.max(1, mapW);
		const safeH = Math.max(1, mapH);
		const scale = Math.min(MAX_MINIMAP_W / safeW, MAX_MINIMAP_H / safeH);
		return {
			width: Math.max(112, Math.round(safeW * scale)),
			height: Math.max(112, Math.round(safeH * scale))
		};
	});

	function startDrag(e: MouseEvent) {
		if (e.button !== 0) return;
		e.preventDefault();
		e.stopPropagation();
		isMovingPanel = true;
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
		if (!isMovingPanel) return;
		dragPosition = {
			x: moveStart.posX + (e.clientX - moveStart.mouseX),
			y: moveStart.posY + (e.clientY - moveStart.mouseY)
		};
	}

	function onDragEnd() {
		isMovingPanel = false;
		window.removeEventListener('mousemove', onDragMove);
		window.removeEventListener('mouseup', onDragEnd);
	}

	function startDragTouch(e: TouchEvent) {
		if (e.touches.length !== 1) return;
		e.stopPropagation();
		const touch = e.touches[0];
		isMovingPanel = true;
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
		if (!isMovingPanel || e.touches.length !== 1) return;
		e.preventDefault();
		const touch = e.touches[0];
		dragPosition = {
			x: moveStart.posX + (touch.clientX - moveStart.mouseX),
			y: moveStart.posY + (touch.clientY - moveStart.mouseY)
		};
	}

	function onDragEndTouch() {
		isMovingPanel = false;
		window.removeEventListener('touchmove', onDragMoveTouch);
		window.removeEventListener('touchend', onDragEndTouch);
	}

	function resetDragPosition() {
		dragPosition = { x: 0, y: 0 };
	}

	function navigateFromClientPoint(clientX: number, clientY: number) {
		if (!canvasEl) return;
		const rect = canvasEl.getBoundingClientRect();
		const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		const normY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
		onNavigate(normX * mapW, normY * mapH);
	}

	function handlePointerDown(e: PointerEvent) {
		if (e.button !== 0) return;
		isPointerDragging = true;
		canvasEl?.setPointerCapture(e.pointerId);
		navigateFromClientPoint(e.clientX, e.clientY);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isPointerDragging) return;
		navigateFromClientPoint(e.clientX, e.clientY);
	}

	function handlePointerUp(e: PointerEvent) {
		if (!isPointerDragging) return;
		isPointerDragging = false;
		if (canvasEl?.hasPointerCapture(e.pointerId)) {
			canvasEl.releasePointerCapture(e.pointerId);
		}
	}

	function drawRoundedRect(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
		r: number
	) {
		const radius = Math.min(r, w / 2, h / 2);
		ctx.beginPath();
		ctx.moveTo(x + radius, y);
		ctx.lineTo(x + w - radius, y);
		ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
		ctx.lineTo(x + w, y + h - radius);
		ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
		ctx.lineTo(x + radius, y + h);
		ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
		ctx.lineTo(x, y + radius);
		ctx.quadraticCurveTo(x, y, x + radius, y);
		ctx.closePath();
	}

	function renderMinimap() {
		if (!canvasEl || isCollapsed) return;
		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		const cw = minimapSize.width;
		const ch = minimapSize.height;
		const scaleX = cw / Math.max(1, mapW);
		const scaleY = ch / Math.max(1, mapH);
		const islandH = Math.max(120, mapH - 120);

		// 1. Ocean background
		ctx.fillStyle = simpleTerrainMode ? '#0f172a' : '#012e4a';
		ctx.fillRect(0, 0, cw, ch);

		const drawIslandRect = (ix: number, iy: number, iw: number, ih: number) => {
			const rx = ix * scaleX;
			const ry = iy * scaleY;
			const rw = iw * scaleX;
			const rh = ih * scaleY;

			if (!simpleTerrainMode) {
				ctx.fillStyle = 'rgba(11, 79, 108, 0.75)';
				drawRoundedRect(ctx, rx - 1.5, ry - 1.5, rw + 3, rh + 3, 4);
				ctx.fill();
			}

			ctx.fillStyle = simpleTerrainMode ? '#1e293b' : '#132a1c';
			ctx.strokeStyle = simpleTerrainMode ? '#475569' : '#8d5b4c';
			ctx.lineWidth = 1.5;
			drawRoundedRect(ctx, rx, ry, rw, rh, 3);
			ctx.fill();
			ctx.stroke();
		};

		if (bottomIsland) {
			if (!simpleTerrainMode) {
				const straitY = (60 + bottomIsland.topH) * scaleY;
				const straitH = Math.max(4, (bottomIsland.y - (60 + bottomIsland.topH)) * scaleY);
				ctx.fillStyle = '#013858';
				ctx.fillRect(0, straitY, cw, straitH);
			}

			drawIslandRect(60, 60, westIslandW, bottomIsland.topH);
			drawIslandRect(bottomIsland.x, bottomIsland.y, bottomIsland.w, bottomIsland.h);

			ctx.fillStyle = simpleTerrainMode ? '#64748b' : '#854d27';
			const by = (60 + bottomIsland.topH - 40) * scaleY;
			const bh = Math.max(4, (bottomIsland.y - (60 + bottomIsland.topH - 40) + 40) * scaleY);
			const bw = Math.max(3, 160 * scaleX);
			for (const bx of [260, 760]) {
				ctx.fillRect(bx * scaleX, by, bw, bh);
			}
		} else {
			// Central strait highlight
			if (!simpleTerrainMode) {
				const straitX = (60 + westIslandW) * scaleX;
				const straitW = Math.max(4, (eastIslandX - (60 + westIslandW)) * scaleX);
				ctx.fillStyle = '#013858';
				ctx.fillRect(straitX, 0, straitW, ch);
			}

			drawIslandRect(60, 60, westIslandW, islandH);
			drawIslandRect(eastIslandX, 60, 1140, islandH);

			// Bridges across the strait
			ctx.fillStyle = simpleTerrainMode ? '#64748b' : '#854d27';
			for (const by of [320, Math.min(islandH - 360, 1520)]) {
				const bx = (60 + westIslandW - 50) * scaleX;
				const bw = Math.max(4, (eastIslandX - (60 + westIslandW - 50) + 50) * scaleX);
				const bh = Math.max(3, 180 * scaleY);
				ctx.fillRect(bx, by * scaleY, bw, bh);
			}
		}

		// 4. Race rows / Content blocks
		if (graphicsTab === '2.5d') {
			for (const row of rows) {
				const rx = 86 * scaleX;
				const ry = row.rowY * scaleY;
				const rowRight =
					row.extraW && row.extraX ? row.extraX + row.extraW : row.sharedX + row.sharedW;
				const rw = (rowRight - 86) * scaleX;
				const rh = Math.max(4, row.rowH * scaleY);

				ctx.fillStyle = simpleTerrainMode ? 'rgba(51, 65, 85, 0.7)' : 'rgba(22, 101, 52, 0.52)';
				ctx.fillRect(rx, ry, rw, rh);

				// Container 1 (Castle + Worker)
				ctx.fillStyle = 'rgba(74, 222, 128, 0.55)';
				ctx.fillRect(92 * scaleX, ry + 1, Math.max(3, 342 * scaleX), Math.max(2, rh - 2));

				// Container 2 (Spawners + Units)
				ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
				ctx.fillRect(
					row.spawnersX * scaleX,
					ry + 1,
					Math.max(3, row.spawnersW * scaleX),
					Math.max(2, rh - 2)
				);

				// Container 3 (Unique buildings)
				ctx.fillStyle = 'rgba(251, 191, 36, 0.45)';
				ctx.fillRect(
					row.uniqueX * scaleX,
					ry + 1,
					Math.max(2, row.uniqueW * scaleX),
					Math.max(2, rh - 2)
				);

				// Container 4 (Shared buildings)
				ctx.fillStyle = 'rgba(192, 132, 252, 0.45)';
				ctx.fillRect(
					row.sharedX * scaleX,
					ry + 1,
					Math.max(2, row.sharedW * scaleX),
					Math.max(2, rh - 2)
				);

				// Container 5 (Extra / Summoned units)
				if (row.extraW && row.extraX) {
					ctx.fillStyle = 'rgba(34, 211, 238, 0.5)';
					ctx.fillRect(
						row.extraX * scaleX,
						ry + 1,
						Math.max(2, row.extraW * scaleX),
						Math.max(2, rh - 2)
					);
				}

				// Short race label if tall enough
				if (rh >= 12) {
					ctx.fillStyle = 'rgba(253, 230, 138, 0.92)';
					ctx.font = 'bold 8px system-ui, sans-serif';
					ctx.textBaseline = 'middle';
					ctx.fillText(row.race, rx + 3, ry + rh / 2);
				}
			}

			// Bottom/East island sections (Castles & Decorations)
			const secX = bottomIsland ? bottomIsland.x : eastIslandX;
			const secY = bottomIsland ? bottomIsland.y : 60;
			ctx.fillStyle = 'rgba(96, 165, 250, 0.45)';
			ctx.fillRect((secX + 45) * scaleX, (secY + 86) * scaleY, 1050 * scaleX, 350 * scaleY);
			ctx.fillStyle = 'rgba(52, 211, 153, 0.4)';
			ctx.fillRect((secX + 45) * scaleX, (secY + 502) * scaleY, 1050 * scaleX, 342 * scaleY);
		} else {
			// HD WebP blocks
			ctx.fillStyle = 'rgba(59, 130, 246, 0.45)';
			ctx.fillRect(110 * scaleX, 130 * scaleY, 1740 * scaleX, 700 * scaleY);
			ctx.fillStyle = 'rgba(244, 63, 94, 0.45)';
			ctx.fillRect((eastIslandX + 50) * scaleX, 130 * scaleY, 1020 * scaleX, 700 * scaleY);
		}

		// 5. Selected asset marker
		if (selectedPoint) {
			const sx = selectedPoint.x * scaleX;
			const sy = selectedPoint.y * scaleY;
			ctx.fillStyle = '#22d3ee';
			ctx.beginPath();
			ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = '#fef08a';
			ctx.lineWidth = 1.5;
			ctx.stroke();
		}

		// 6. Camera Viewport Box (Frustum)
		const safeZoom = Math.max(0.1, camZoom);
		const viewWorldX = -camX / safeZoom;
		const viewWorldY = -camY / safeZoom;
		const viewWorldW = hostW / safeZoom;
		const viewWorldH = hostH / safeZoom;

		const boxX = viewWorldX * scaleX;
		const boxY = viewWorldY * scaleY;
		const boxW = viewWorldW * scaleX;
		const boxH = viewWorldH * scaleY;

		ctx.fillStyle = 'rgba(254, 240, 138, 0.09)';
		ctx.fillRect(boxX, boxY, boxW, boxH);
		ctx.strokeStyle = '#fef08a';
		ctx.lineWidth = 1.5;
		ctx.strokeRect(boxX, boxY, boxW, boxH);
	}

	$effect(() => {
		// Track reactive inputs to keep minimap synchronized
		void mapW;
		void mapH;
		void westIslandW;
		void eastIslandX;
		void bottomIsland;
		void rows;
		void graphicsTab;
		void camX;
		void camY;
		void camZoom;
		void hostW;
		void hostH;
		void selectedPoint;
		void simpleTerrainMode;
		void isCollapsed;
		void minimapSize;
		renderMinimap();
	});

	onMount(() => {
		return () => {
			window.removeEventListener('mousemove', onDragMove);
			window.removeEventListener('mouseup', onDragEnd);
			window.removeEventListener('touchmove', onDragMoveTouch);
			window.removeEventListener('touchend', onDragEndTouch);
		};
	});
</script>

<div
	class="fixed right-0 top-1/2 -translate-y-1/2 z-40 select-none pointer-events-auto"
	style={dragPosition.x || dragPosition.y
		? `transform: translate(${dragPosition.x}px, ${dragPosition.y}px);`
		: ''}
	data-testid="showcase-minimap-root"
>
	{#if isCollapsed}
		<button
			type="button"
			onclick={() => {
				isCollapsed = false;
				setTimeout(() => renderMinimap(), 16);
			}}
			class="flex flex-col items-center gap-1.5 px-1.5 py-3 bg-[#131722]/95 hover:bg-[#1f2638] border-y-2 border-l-2 border-r-0 border-[#544738] rounded-l-lg text-amber-300 shadow-2xl transition cursor-pointer active:scale-95 backdrop-blur-md"
			title="Показати мінікарту"
			aria-label="Показати мінікарту"
			data-testid="showcase-minimap-expand-btn"
		>
			<UiIcon name="chevronLeft" class="w-4 h-4 text-amber-300" />
			<UiIcon name="map" class="w-3.5 h-3.5 text-amber-400" />
			<span class="text-[9.5px] font-bold uppercase tracking-wider [writing-mode:vertical-rl]">
				Карта
			</span>
		</button>
	{:else}
		<div
			class="relative bg-[#131722]/95 backdrop-blur-md rounded-l-xl rounded-r-none border-y-2 border-l-2 border-r-0 border-[#544738] shadow-2xl overflow-hidden transition-all duration-150"
			style="width: {minimapSize.width + 2}px; height: {minimapSize.height +
				4}px; box-shadow: inset 0 0 10px rgba(0,0,0,0.8), -4px 0 16px rgba(0,0,0,0.7);"
		>
			<div
				class="relative overflow-hidden bg-[#012e4a] w-full h-full flex items-center justify-center"
			>
				<canvas
					bind:this={canvasEl}
					width={minimapSize.width}
					height={minimapSize.height}
					onpointerdown={handlePointerDown}
					onpointermove={handlePointerMove}
					onpointerup={handlePointerUp}
					onpointercancel={handlePointerUp}
					class="cursor-crosshair block w-full h-full touch-none"
					title="Мінікарта вітрини. Клікніть або ведіть, щоб перемістити камеру"
					data-testid="showcase-minimap-canvas"
				></canvas>

				<!-- Top-Left: детальність рельєфу -->
				<button
					type="button"
					onclick={() => (simpleTerrainMode = !simpleTerrainMode)}
					onpointerdown={(e) => e.stopPropagation()}
					class="absolute top-0 left-0 z-10 w-7 h-7 rounded-tl-[10px] rounded-br-md border-b border-r flex items-center justify-center transition cursor-pointer active:scale-95 shadow backdrop-blur-sm {simpleTerrainMode
						? 'bg-[#3b82f6]/70 border-blue-400 text-blue-200'
						: 'bg-[#1a1510]/85 hover:bg-[#2a241b] border-[#78654c] text-[#c5a880]'}"
					title="Перемкнути детальність рельєфу"
					aria-label="Перемкнути детальність рельєфу"
					data-testid="showcase-minimap-terrain-btn"
				>
					<UiIcon name="map" class="w-3.5 h-3.5" />
				</button>

				<!-- Bottom-Left: вся карта -->
				<button
					type="button"
					onclick={onFitWholeMap}
					onpointerdown={(e) => e.stopPropagation()}
					class="absolute bottom-0 left-0 z-10 w-7 h-7 rounded-bl-[10px] rounded-tr-md border-t border-r bg-[#1a1510]/85 hover:bg-[#2a241b] border-[#78654c] flex items-center justify-center text-amber-300 transition cursor-pointer active:scale-95 shadow backdrop-blur-sm"
					title="Вся карта"
					aria-label="Вся карта"
					data-testid="showcase-minimap-fit-btn"
				>
					<UiIcon name="maximize2" class="w-3.5 h-3.5" />
				</button>

				<!-- Top-Right: переміщення панелі -->
				<button
					type="button"
					onmousedown={startDrag}
					ontouchstart={startDragTouch}
					ondblclick={resetDragPosition}
					onpointerdown={(e) => e.stopPropagation()}
					class="absolute top-0 right-0 z-10 w-7 h-7 rounded-bl-md border-b border-l bg-[#1a1510]/85 hover:bg-[#2a241b] border-[#78654c] flex items-center justify-center text-[#d4af37] transition cursor-grab active:cursor-grabbing shadow backdrop-blur-sm"
					title="Перемістити мінікарту (подвійний клік — скинути позицію)"
					aria-label="Перемістити мінікарту"
					data-testid="showcase-minimap-drag-btn"
				>
					<UiIcon name="move" class="w-3.5 h-3.5" />
				</button>

				<!-- Bottom-Right: сховати мінікарту -->
				<button
					type="button"
					onclick={() => (isCollapsed = true)}
					onpointerdown={(e) => e.stopPropagation()}
					class="absolute bottom-0 right-0 z-10 w-7 h-7 rounded-tl-md border-t border-l bg-[#1a1510]/85 hover:bg-[#2a241b] border-[#78654c] flex items-center justify-center text-[#d4af37] transition cursor-pointer active:scale-95 shadow backdrop-blur-sm"
					title="Приховати мінікарту"
					aria-label="Приховати мінікарту"
					data-testid="showcase-minimap-collapse-btn"
				>
					<UiIcon name="chevronRight" class="w-3.5 h-3.5" />
				</button>
			</div>
		</div>
	{/if}
</div>
