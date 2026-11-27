<script lang="ts">
	import { onMount } from 'svelte';
	import { Simulation, ARENA_WIDTH, ARENA_HEIGHT } from '$lib/engine/simulation';
	import { MID_LANE_Y } from '$lib/engine/constants';
	import { ArenaRenderer } from '$lib/renderer/ArenaRenderer';
	import { settings } from '$lib/services/settings.svelte';

	let canvasEl: HTMLCanvasElement | undefined = $state();
	let activeRenderer = $state<ArenaRenderer | null>(null);

	$effect(() => {
		const style = settings.graphicsStyle;
		activeRenderer?.setGraphicsStyle(style);
	});

	function createWarmedMenuBattleSim(): Simulation {
		const sim = new Simulation({
			botDifficulty: 30,
			startGold: 950,
			teamSize: 3,
			modeId: 'botVsBot',
			botVsBot: true,
			autoStepBots: true,
			fogOfWar: false,
			allRandom: true,
			uniqueRaces: true,
			isRunning: true,
			seed: Math.floor(Math.random() * 1_000_000) + 1
		});
		// Pre-warm 48 seconds headless so all 6 bots already built bases and fight across bridges
		for (let i = 0; i < 480; i++) {
			sim.step(0.1);
			if (sim.winner) break;
		}
		return sim;
	}

	/**
	 * Smooth Gaussian-weighted centroid of combat near the central bridges.
	 * Returns null when no units are active so the camera holds steady without snapping.
	 */
	function sampleCombatFocus(sim: Simulation): { x: number; y: number } | null {
		const centerX = ARENA_WIDTH / 2;
		let sumX = 0;
		let sumY = 0;
		let totalWeight = 0;
		for (const u of sim.units) {
			if (u.state === 'DEAD') continue;
			const dx = u.x - centerX;
			// Soft falloff instead of a hard radius boundary avoids sudden jumps when units enter/leave
			const distWeight = Math.exp(-(dx * dx) / (2 * 950 * 950));
			const stateWeight = u.state === 'ATTACKING' ? 1.5 : 0.7;
			const w = distWeight * stateWeight;
			if (w < 0.02) continue;
			sumX += u.x * w;
			sumY += u.y * w;
			totalWeight += w;
		}
		if (totalWeight < 0.1) return null;
		return {
			x: Math.max(centerX - 850, Math.min(centerX + 850, sumX / totalWeight)),
			y: Math.max(MID_LANE_Y - 360, Math.min(ARENA_HEIGHT - 460, sumY / totalWeight))
		};
	}

	function computeTargetZoom(width: number, height: number): number {
		return Math.max(0.32, Math.min(0.56, Math.min(width / 3500, height / 1550)));
	}

	onMount(() => {
		if (!canvasEl) return;

		let disposed = false;
		let rafId = 0;
		let renderer: ArenaRenderer | null = null;
		let sim = createWarmedMenuBattleSim();

		const reducedMotionQuery =
			typeof window !== 'undefined' && typeof window.matchMedia === 'function'
				? window.matchMedia('(prefers-reduced-motion: reduce)')
				: null;

		const initialFocus = sampleCombatFocus(sim);
		let goalX = initialFocus?.x ?? ARENA_WIDTH / 2;
		let goalY = initialFocus?.y ?? MID_LANE_Y;
		let focusX = goalX;
		let focusY = goalY;
		let camX = focusX;
		let camY = focusY;
		let velX = 0;
		let velY = 0;
		let camZoom = computeTargetZoom(
			typeof window !== 'undefined' ? window.innerWidth || 1280 : 1280,
			typeof window !== 'undefined' ? window.innerHeight || 720 : 720
		);
		let lastTime = performance.now();
		let elapsed = 0;
		let accumulator = 0;
		const FIXED_STEP = 1 / 30;
		const MAX_PAN_SPEED = 115; // px/sec cap prevents any fast camera whip across lanes

		const localRenderer = new ArenaRenderer({
			canvas: canvasEl,
			sim,
			graphicsStyle: settings.graphicsStyle,
			interactive: false,
			onTileClick: () => {},
			getSelectedBuildingDefId: () => null
		});
		localRenderer.enableFog = false;

		void localRenderer
			.init(canvasEl)
			.then(() => {
				if (disposed || !canvasEl) {
					localRenderer.destroy();
					return;
				}
				renderer = localRenderer;
				activeRenderer = localRenderer;
				renderer.setCamera(camX, camY, camZoom);

				const loop = (now: number) => {
					if (disposed || !renderer) return;
					const rawDt = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
					lastTime = now;

					const pauseMotion = Boolean(reducedMotionQuery?.matches);
					if (!pauseMotion && !document.hidden && rawDt > 0) {
						elapsed += rawDt;
						accumulator += rawDt;
						let steps = 0;
						while (accumulator >= FIXED_STEP && steps < 3) {
							sim.step(FIXED_STEP);
							accumulator -= FIXED_STEP;
							steps++;
						}
						if (accumulator > FIXED_STEP * 2) {
							accumulator = 0;
						}

						if (sim.winner || sim.matchWinner) {
							sim = createWarmedMenuBattleSim();
							renderer.setSimulation(sim);
							renderer.enableFog = false;
						}

						// Stage 1: slowly integrate sampled combat centroid (~5s time constant)
						const sampled = sampleCombatFocus(sim);
						if (sampled) {
							const sampleAlpha = 1 - Math.exp(-rawDt * 0.22);
							goalX += (sampled.x - goalX) * sampleAlpha;
							goalY += (sampled.y - goalY) * sampleAlpha;
						}

						const focusAlpha = 1 - Math.exp(-rawDt * 0.35);
						focusX += (goalX - focusX) * focusAlpha;
						focusY += (goalY - focusY) * focusAlpha;

						const targetX = Math.max(
							ARENA_WIDTH / 2 - 900,
							Math.min(ARENA_WIDTH / 2 + 900, focusX + Math.sin(elapsed * 0.08) * 240)
						);
						const targetY = Math.max(
							MID_LANE_Y - 380,
							Math.min(ARENA_HEIGHT - 460, focusY + Math.cos(elapsed * 0.06) * 110)
						);

						// Stage 2: critically damped spring with speed limit for silky, non-jerky camera glide
						const omega = 0.75;
						const ax = omega * omega * (targetX - camX) - 2 * omega * velX;
						const ay = omega * omega * (targetY - camY) - 2 * omega * velY;
						velX += ax * rawDt;
						velY += ay * rawDt;
						const speed = Math.hypot(velX, velY);
						if (speed > MAX_PAN_SPEED) {
							const scale = MAX_PAN_SPEED / speed;
							velX *= scale;
							velY *= scale;
						}
						camX += velX * rawDt;
						camY += velY * rawDt;

						const targetZoom = computeTargetZoom(
							window.innerWidth || 1280,
							window.innerHeight || 720
						);
						camZoom += (targetZoom - camZoom) * (1 - Math.exp(-rawDt * 1.5));
						renderer.setCamera(camX, camY, camZoom);
					}

					rafId = requestAnimationFrame(loop);
				};

				rafId = requestAnimationFrame(loop);
			})
			.catch(() => {
				localRenderer.destroy();
			});

		return () => {
			disposed = true;
			if (rafId) cancelAnimationFrame(rafId);
			activeRenderer = null;
			renderer?.destroy();
			localRenderer.destroy();
		};
	});
</script>

<div
	aria-hidden="true"
	data-testid="menu-battle-backdrop"
	class="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none"
>
	<canvas bind:this={canvasEl} class="w-full h-full block"></canvas>
	<!-- Soft atmospheric veil over live 3x3 bot battle for crisp Liquid Glass menu readability -->
	<div
		class="absolute inset-0 pointer-events-none"
		style="backdrop-filter: blur(2px) saturate(1.1); -webkit-backdrop-filter: blur(2px) saturate(1.1); background: radial-gradient(circle at 50% 42%, rgba(9, 14, 26, 0.48) 0%, rgba(7, 11, 21, 0.72) 58%, rgba(4, 7, 15, 0.88) 100%);"
	></div>
</div>
