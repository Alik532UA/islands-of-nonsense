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
		BRIDGE_SPAN_MAX_X,
		WEST_ISLAND_CENTER_X,
		WEST_ISLAND_CENTER_Y,
		EAST_ISLAND_CENTER_X,
		EAST_ISLAND_CENTER_Y,
		ISLAND_RADIUS_X,
		ISLAND_RADIUS_Y,
		WEST_CASTLE_X,
		WEST_CASTLE_Y,
		EAST_CASTLE_X,
		EAST_CASTLE_Y,
		ROAD_WIDTH,
		WEST_ROAD_MERGE_X,
		EAST_ROAD_MERGE_X
	} from '../engine/constants';
	import UiIcon from '$lib/components/ui/UiIcon.svelte';
	import { sound } from '../services/audio';

	import type { Snippet } from 'svelte';

	let {
		sim,
		uiTick: _uiTick = 0,
		localTeam = 'west',
		cameraX = 800,
		cameraY = 1200,
		zoom = 0.85,
		onMinimapClick,
		touchControls: _touchControls
	}: {
		sim: Simulation;
		uiTick?: number;
		localTeam?: 'west' | 'east';
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

	const MAP_WIDTH = 420;
	const MAP_HEIGHT = 140;

	interface IslandPoint {
		x: number;
		y: number;
	}

	function createIslandPolygon(
		cx: number,
		cy: number,
		radiusX: number,
		radiusY: number,
		isWest: boolean,
		seed: number
	): IslandPoint[] {
		const numPoints = 120;
		const poly: IslandPoint[] = [];
		const lanes = [TOP_LANE_Y, MID_LANE_Y, BOTTOM_LANE_Y];

		for (let i = 0; i < numPoints; i++) {
			const a = (i / numPoints) * Math.PI * 2;
			const cosA = Math.cos(a);
			const sinA = Math.sin(a);

			// Multi-octave sinusoidal procedural noise matching TerrainRenderer
			const noise =
				Math.sin(a * 4 + seed) * 44 +
				Math.cos(a * 7 + seed * 1.4) * 26 +
				Math.sin(a * 13 + seed * 0.7) * 14 +
				Math.cos(a * 23 + seed * 2.1) * 8;

			let px = cx + cosA * (radiusX + noise);
			const py = cy + sinA * (radiusY + noise);

			// Bridgehead capes/promontories reaching out to each bridge
			if (isWest && cosA > 0) {
				let maxCapeReach = 0;
				for (const ly of lanes) {
					const distY = Math.abs(py - ly);
					if (distY <= 135) {
						maxCapeReach = Math.max(maxCapeReach, 3130);
					} else if (distY < 230) {
						const t = (distY - 135) / 95;
						const blend = 1 - t * t * (3 - 2 * t);
						maxCapeReach = Math.max(maxCapeReach, px + Math.max(0, 3130 - px) * blend);
					}
				}
				if (maxCapeReach > 0) {
					px = Math.max(px, maxCapeReach);
				}
			} else if (!isWest && cosA < 0) {
				let minCapeReach = Infinity;
				for (const ly of lanes) {
					const distY = Math.abs(py - ly);
					if (distY <= 135) {
						minCapeReach = Math.min(minCapeReach, 4070);
					} else if (distY < 230) {
						const t = (distY - 135) / 95;
						const blend = 1 - t * t * (3 - 2 * t);
						minCapeReach = Math.min(minCapeReach, px - Math.max(0, px - 4070) * blend);
					}
				}
				if (minCapeReach < Infinity) {
					px = Math.min(px, minCapeReach);
				}
			}

			poly.push({ x: px, y: py });
		}
		return poly;
	}

	const westIslandPoly = createIslandPolygon(
		WEST_ISLAND_CENTER_X,
		WEST_ISLAND_CENTER_Y,
		ISLAND_RADIUS_X,
		ISLAND_RADIUS_Y,
		true,
		1337
	);

	const eastIslandPoly = createIslandPolygon(
		EAST_ISLAND_CENTER_X,
		EAST_ISLAND_CENTER_Y,
		ISLAND_RADIUS_X,
		ISLAND_RADIUS_Y,
		false,
		7260
	);

	function tracePolygon(ctx: CanvasRenderingContext2D, poly: IslandPoint[], scale: number) {
		ctx.beginPath();
		ctx.moveTo(poly[0].x * scale, poly[0].y * scale);
		for (let i = 1; i < poly.length; i++) {
			ctx.lineTo(poly[i].x * scale, poly[i].y * scale);
		}
		ctx.closePath();
	}

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

		const scale = MAP_WIDTH / ARENA_WIDTH;
		const scaleX = scale;
		const scaleY = scale;

		const westColor = sim.castles.west.color?.hex || sim.players.west.color?.hex || '#0042ff';
		const eastColor = sim.castles.east.color?.hex || sim.players.east.color?.hex || '#ff0303';

		// 1. Terrain Ground
		if (simpleTerrainMode) {
			ctx.fillStyle = '#0f172a';
			ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

			// Simplified flat landmasses
			ctx.fillStyle = '#334155';
			tracePolygon(ctx, westIslandPoly, scale);
			ctx.fill();
			tracePolygon(ctx, eastIslandPoly, scale);
			ctx.fill();

			// Simplified bridges
			ctx.fillStyle = '#64748b';
			for (const ly of [TOP_LANE_Y, MID_LANE_Y, BOTTOM_LANE_Y]) {
				ctx.fillRect(
					BRIDGE_SPAN_MIN_X * scale,
					(ly - 40) * scale,
					(BRIDGE_SPAN_MAX_X - BRIDGE_SPAN_MIN_X) * scale,
					80 * scale
				);
			}
		} else {
			// 1. Surrounding Deep Ocean (Matching authentic arena palette)
			ctx.fillStyle = '#012e4a';
			ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

			// Central Strait River Flow (Subtle lighter water channel)
			ctx.fillStyle = '#013858';
			ctx.fillRect(
				BRIDGE_SPAN_MIN_X * scale,
				0,
				(BRIDGE_SPAN_MAX_X - BRIDGE_SPAN_MIN_X) * scale,
				MAP_HEIGHT
			);

			// 2. Shoreline Cliff / Sand Rim
			ctx.strokeStyle = '#8d5b4c';
			ctx.lineWidth = 3;
			tracePolygon(ctx, westIslandPoly, scale);
			ctx.stroke();
			tracePolygon(ctx, eastIslandPoly, scale);
			ctx.stroke();

			// 3. Fairytale Meadow Grass Surface (Rich vibrant green matching game)
			ctx.fillStyle = '#275d16';
			tracePolygon(ctx, westIslandPoly, scale);
			ctx.fill();
			tracePolygon(ctx, eastIslandPoly, scale);
			ctx.fill();

			// 4. Rolling Volumetric Meadow Hillocks (Fairytale mounds on each island)
			// Upper & Lower hillocks on West Island
			ctx.fillStyle = '#3a8222';
			ctx.beginPath();
			ctx.ellipse(
				WEST_ISLAND_CENTER_X * scale,
				(WEST_ISLAND_CENTER_Y - ISLAND_RADIUS_Y * 0.45) * scale,
				ISLAND_RADIUS_X * 0.65 * scale,
				ISLAND_RADIUS_Y * 0.32 * scale,
				0,
				0,
				Math.PI * 2
			);
			ctx.fill();
			ctx.beginPath();
			ctx.ellipse(
				WEST_ISLAND_CENTER_X * scale,
				(WEST_ISLAND_CENTER_Y + ISLAND_RADIUS_Y * 0.45) * scale,
				ISLAND_RADIUS_X * 0.68 * scale,
				ISLAND_RADIUS_Y * 0.32 * scale,
				0,
				0,
				Math.PI * 2
			);
			ctx.fill();

			// Lighter crests on West Island
			ctx.fillStyle = '#4da32f';
			ctx.beginPath();
			ctx.ellipse(
				WEST_ISLAND_CENTER_X * scale,
				(WEST_ISLAND_CENTER_Y - ISLAND_RADIUS_Y * 0.48) * scale,
				ISLAND_RADIUS_X * 0.45 * scale,
				ISLAND_RADIUS_Y * 0.2 * scale,
				0,
				0,
				Math.PI * 2
			);
			ctx.fill();
			ctx.beginPath();
			ctx.ellipse(
				WEST_ISLAND_CENTER_X * scale,
				(WEST_ISLAND_CENTER_Y + ISLAND_RADIUS_Y * 0.48) * scale,
				ISLAND_RADIUS_X * 0.48 * scale,
				ISLAND_RADIUS_Y * 0.2 * scale,
				0,
				0,
				Math.PI * 2
			);
			ctx.fill();

			// Upper & Lower hillocks on East Island
			ctx.fillStyle = '#3a8222';
			ctx.beginPath();
			ctx.ellipse(
				EAST_ISLAND_CENTER_X * scale,
				(EAST_ISLAND_CENTER_Y - ISLAND_RADIUS_Y * 0.45) * scale,
				ISLAND_RADIUS_X * 0.65 * scale,
				ISLAND_RADIUS_Y * 0.32 * scale,
				0,
				0,
				Math.PI * 2
			);
			ctx.fill();
			ctx.beginPath();
			ctx.ellipse(
				EAST_ISLAND_CENTER_X * scale,
				(EAST_ISLAND_CENTER_Y + ISLAND_RADIUS_Y * 0.45) * scale,
				ISLAND_RADIUS_X * 0.68 * scale,
				ISLAND_RADIUS_Y * 0.32 * scale,
				0,
				0,
				Math.PI * 2
			);
			ctx.fill();

			// Lighter crests on East Island
			ctx.fillStyle = '#4da32f';
			ctx.beginPath();
			ctx.ellipse(
				EAST_ISLAND_CENTER_X * scale,
				(EAST_ISLAND_CENTER_Y - ISLAND_RADIUS_Y * 0.48) * scale,
				ISLAND_RADIUS_X * 0.45 * scale,
				ISLAND_RADIUS_Y * 0.2 * scale,
				0,
				0,
				Math.PI * 2
			);
			ctx.fill();
			ctx.beginPath();
			ctx.ellipse(
				EAST_ISLAND_CENTER_X * scale,
				(EAST_ISLAND_CENTER_Y + ISLAND_RADIUS_Y * 0.48) * scale,
				ISLAND_RADIUS_X * 0.48 * scale,
				ISLAND_RADIUS_Y * 0.2 * scale,
				0,
				0,
				Math.PI * 2
			);
			ctx.fill();

			// 5. Cobblestone Highways (Matching authentic fan-out with elbow turns)
			const roadW = ROAD_WIDTH * scale;
			ctx.strokeStyle = '#8a7153';
			ctx.lineWidth = roadW;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';

			// West Highways:
			// Mid straight
			ctx.beginPath();
			ctx.moveTo(WEST_CASTLE_X * scale, MID_LANE_Y * scale);
			ctx.lineTo(BRIDGE_SPAN_MIN_X * scale, MID_LANE_Y * scale);
			ctx.stroke();

			// Top angled + horizontal
			ctx.beginPath();
			ctx.moveTo(WEST_CASTLE_X * scale, WEST_CASTLE_Y * scale);
			ctx.lineTo(WEST_ROAD_MERGE_X * scale, TOP_LANE_Y * scale);
			ctx.lineTo(BRIDGE_SPAN_MIN_X * scale, TOP_LANE_Y * scale);
			ctx.stroke();

			// Bottom angled + horizontal
			ctx.beginPath();
			ctx.moveTo(WEST_CASTLE_X * scale, WEST_CASTLE_Y * scale);
			ctx.lineTo(WEST_ROAD_MERGE_X * scale, BOTTOM_LANE_Y * scale);
			ctx.lineTo(BRIDGE_SPAN_MIN_X * scale, BOTTOM_LANE_Y * scale);
			ctx.stroke();

			// East Highways:
			// Mid straight
			ctx.beginPath();
			ctx.moveTo(BRIDGE_SPAN_MAX_X * scale, MID_LANE_Y * scale);
			ctx.lineTo(EAST_CASTLE_X * scale, MID_LANE_Y * scale);
			ctx.stroke();

			// Top horizontal + angled
			ctx.beginPath();
			ctx.moveTo(BRIDGE_SPAN_MAX_X * scale, TOP_LANE_Y * scale);
			ctx.lineTo(EAST_ROAD_MERGE_X * scale, TOP_LANE_Y * scale);
			ctx.lineTo(EAST_CASTLE_X * scale, EAST_CASTLE_Y * scale);
			ctx.stroke();

			// Bottom horizontal + angled
			ctx.beginPath();
			ctx.moveTo(BRIDGE_SPAN_MAX_X * scale, BOTTOM_LANE_Y * scale);
			ctx.lineTo(EAST_ROAD_MERGE_X * scale, BOTTOM_LANE_Y * scale);
			ctx.lineTo(EAST_CASTLE_X * scale, EAST_CASTLE_Y * scale);
			ctx.stroke();

			// Castle Plazas (Circular stone rims around castles)
			const plazaR = 210 * scale;
			ctx.fillStyle = '#a69076';
			ctx.strokeStyle = '#4a3b2c';
			ctx.lineWidth = 1.5;

			ctx.beginPath();
			ctx.arc(WEST_CASTLE_X * scale, WEST_CASTLE_Y * scale, plazaR, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();

			ctx.beginPath();
			ctx.arc(EAST_CASTLE_X * scale, EAST_CASTLE_Y * scale, plazaR, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();

			// 6. Three 2.5D Bridges over Central Strait
			const bridgeMinX = (BRIDGE_SPAN_MIN_X - 20) * scale;
			const bridgeMaxX = (BRIDGE_SPAN_MAX_X + 20) * scale;
			const bridgeW = bridgeMaxX - bridgeMinX;
			const bridgeH = 140 * scale;

			const lanes: { id: 'top' | 'mid' | 'bottom'; y: number }[] = [
				{ id: 'top', y: TOP_LANE_Y },
				{ id: 'mid', y: MID_LANE_Y },
				{ id: 'bottom', y: BOTTOM_LANE_Y }
			];

			for (const lane of lanes) {
				const isBroken = sim.brokenBridge === lane.id;
				const by = lane.y * scale - bridgeH / 2;

				if (!isBroken) {
					// Intact bridge: wooden deck with balustrades
					ctx.fillStyle = '#5c4033';
					ctx.fillRect(bridgeMinX, by, bridgeW, bridgeH);
					ctx.fillStyle = '#8b5a2b';
					ctx.fillRect(bridgeMinX + 2, by + 1, bridgeW - 4, bridgeH - 2);
					ctx.fillStyle = '#c5a880';
					ctx.fillRect(bridgeMinX, by, bridgeW, 1.5);
					ctx.fillRect(bridgeMinX, by + bridgeH - 1.5, bridgeW, 1.5);
				} else {
					// Broken bridge: Stubs on each side with water gap in center
					const stubW = bridgeW * 0.32;
					ctx.fillStyle = '#5c4033';
					ctx.fillRect(bridgeMinX, by, stubW, bridgeH);
					ctx.fillRect(bridgeMaxX - stubW, by, stubW, bridgeH);
					ctx.fillStyle = '#8b5a2b';
					ctx.fillRect(bridgeMinX + 1, by + 1, stubW - 2, bridgeH - 2);
					ctx.fillRect(bridgeMaxX - stubW + 1, by + 1, stubW - 2, bridgeH - 2);

					// Red cross hazard marker in the middle
					ctx.strokeStyle = '#ef4444';
					ctx.lineWidth = 2;
					const midX = (bridgeMinX + bridgeMaxX) / 2;
					const midY = lane.y * scale;
					ctx.beginPath();
					ctx.moveTo(midX - 3.5, midY - 3.5);
					ctx.lineTo(midX + 3.5, midY + 3.5);
					ctx.moveTo(midX + 3.5, midY - 3.5);
					ctx.lineTo(midX - 3.5, midY + 3.5);
					ctx.stroke();
				}
			}
		}

		// 2. Castles
		const castleW = 10;
		const castleH = 14;
		const wCastX = WEST_CASTLE_X * scale;
		const wCastY = WEST_CASTLE_Y * scale;
		ctx.fillStyle = westColor;
		ctx.fillRect(wCastX - castleW / 2, wCastY - castleH / 2, castleW, castleH);
		ctx.strokeStyle = '#ffffff';
		ctx.lineWidth = 1;
		ctx.strokeRect(wCastX - castleW / 2, wCastY - castleH / 2, castleW, castleH);

		const eCastX = EAST_CASTLE_X * scale;
		const eCastY = EAST_CASTLE_Y * scale;
		ctx.fillStyle = eastColor;
		ctx.fillRect(eCastX - castleW / 2, eCastY - castleH / 2, castleW, castleH);
		ctx.strokeStyle = '#ffffff';
		ctx.lineWidth = 1;
		ctx.strokeRect(eCastX - castleW / 2, eCastY - castleH / 2, castleW, castleH);

		// 3. Placed Buildings (2x2 footprint) with real player/bot colors
		for (const b of sim.buildings) {
			if (b.team !== localTeam && !sim.isPointRevealed(localTeam, b.x, b.y)) continue;
			const bx = b.x * scaleX;
			const by = b.y * scaleY;
			const owner = sim.allPlayers.find((p) => p.slot === b.playerSlot) || sim.players[b.team];
			ctx.fillStyle = owner?.color?.hex || (b.team === 'west' ? westColor : eastColor);
			ctx.fillRect(bx, by, 4, 4);
		}

		// 4. Units with real player/bot colors
		for (const u of sim.units) {
			if (u.state === 'DEAD') continue;
			if (u.team !== localTeam && !sim.isPointRevealed(localTeam, u.x, u.y)) continue;

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
					? u.team === localTeam
						? '#22c55e'
						: '#ef4444'
					: owner?.color?.hex || (u.team === 'west' ? westColor : eastColor);
				ctx.fillRect(ux - 1.5, uy - 1.5, 3, 3);
			}
		}

		// 5. Worker blips
		for (const p of sim.allPlayers || [sim.players[localTeam]]) {
			const worker = p.worker;
			if (!worker) continue;
			if (p.team !== localTeam && !sim.isPointRevealed(localTeam, worker.x, worker.y)) continue;
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
			if (!sim.isPointRevealed(localTeam, coin.x, coin.y)) continue;
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
			<UiIcon name="map" class="w-3.5 h-3.5 text-amber-400" />
			<UiIcon name="chevronUp" class="w-4 h-4 text-amber-300" />
			<span class="text-[9.5px] font-bold uppercase tracking-wider">Карта</span>
		</button>
	</div>
{/if}

<!-- Expanded Minimap: Anchored flush to the bottom with corner controls in the water regions -->
<div
	class="relative bg-[#131722]/95 backdrop-blur-md rounded-t-xl rounded-b-none border-t-2 border-x-2 border-b-0 border-[#544738] shadow-2xl select-none h-[142px] w-[424px] shrink-0 overflow-hidden pointer-events-auto transition-all duration-200 {isCollapsed
		? 'hidden'
		: ''}"
	style="box-shadow: inset 0 0 10px rgba(0,0,0,0.8), 0 -4px 16px rgba(0,0,0,0.7); {dragPosition.x ||
	dragPosition.y
		? `transform: translate(${dragPosition.x}px, ${dragPosition.y}px);`
		: ''}"
>
	<!-- Minimap Canvas Container (Full Area) with 4 In-Canvas Corner Buttons -->
	<div class="relative overflow-hidden bg-[#012e4a] w-full h-full flex items-center justify-center">
		<canvas
			bind:this={canvasEl}
			width={MAP_WIDTH}
			height={MAP_HEIGHT}
			onmousedown={handleMouseDown}
			onmousemove={handleMouseMove}
			class="cursor-crosshair block w-full h-full"
			title="Мінікарта арени. Затисніть та ведіть, щоб перемістити камеру!"
		></canvas>

		<!-- 1. Top-Left: Перемкнути детальність рельєфу (в самому кутку) -->
		<button
			type="button"
			onclick={() => (simpleTerrainMode = !simpleTerrainMode)}
			onmousedown={(e) => e.stopPropagation()}
			class="absolute top-0 left-0 z-10 w-7 h-7 rounded-tl-[10px] rounded-br-md rounded-tr-none rounded-bl-none border-b border-r flex items-center justify-center transition cursor-pointer active:scale-95 shadow backdrop-blur-sm {simpleTerrainMode
				? 'bg-[#3b82f6]/70 border-blue-400 text-blue-200'
				: 'bg-[#1a1510]/85 hover:bg-[#2a241b] border-[#78654c] text-[#c5a880]'}"
			title="Перемкнути детальність рельєфу"
			aria-label="Перемкнути детальність рельєфу"
			data-testid="minimap-terrain-btn"
		>
			<UiIcon name="map" class="w-3.5 h-3.5" />
		</button>

		<!-- 2. Bottom-Left: Кольори союзників (Зелений / Ворожий) (в самому кутку) -->
		<button
			type="button"
			onclick={() => (allyColorsMode = !allyColorsMode)}
			onmousedown={(e) => e.stopPropagation()}
			class="absolute bottom-0 left-0 z-10 w-7 h-7 rounded-none rounded-tr-md border-t border-r flex items-center justify-center transition cursor-pointer active:scale-95 shadow backdrop-blur-sm {allyColorsMode
				? 'bg-emerald-950/85 border-emerald-500 text-emerald-300'
				: 'bg-[#1a1510]/85 hover:bg-[#2a241b] border-[#78654c] text-[#c5a880]'}"
			title="Кольори союзників (Зелений / Ворожий)"
			aria-label="Кольори союзників"
			data-testid="minimap-ally-colors-btn"
		>
			<UiIcon name="users" class="w-3.5 h-3.5" />
		</button>

		<!-- 3. Top-Right: drag and drop (Move) (в самому кутку) -->
		<button
			type="button"
			onmousedown={startDrag}
			ontouchstart={startDragTouch}
			ondblclick={resetDragPosition}
			class="absolute top-0 right-0 z-10 w-7 h-7 rounded-tr-[10px] rounded-bl-md rounded-tl-none rounded-br-none border-b border-l bg-[#1a1510]/85 hover:bg-[#2a241b] border-[#78654c] flex items-center justify-center text-[#d4af37] transition cursor-grab active:cursor-grabbing shadow backdrop-blur-sm"
			title="Перемістити мінікарту (перетягніть мишею; подвійний клік — скинути позицію)"
			aria-label="Перемістити мінікарту"
			data-testid="minimap-drag-btn"
		>
			<UiIcon name="move" class="w-3.5 h-3.5" />
		</button>

		<!-- 4. Bottom-Right: сховати карту (ChevronDown) (в самому кутку) -->
		<button
			type="button"
			onclick={() => (isCollapsed = true)}
			onmousedown={(e) => e.stopPropagation()}
			class="absolute bottom-0 right-0 z-10 w-7 h-7 rounded-none rounded-tl-md border-t border-l bg-[#1a1510]/85 hover:bg-[#2a241b] border-[#78654c] flex items-center justify-center text-[#d4af37] transition cursor-pointer active:scale-95 shadow backdrop-blur-sm"
			title="Приховати мінікарту"
			aria-label="Приховати мінікарту"
			data-testid="minimap-collapse-btn"
		>
			<UiIcon name="chevronDown" class="w-3.5 h-3.5" />
		</button>
	</div>
</div>
