// src/lib/debug/perfMonitor.svelte.ts — моніторинг FPS, навантаження та пам'яті
import { browser } from '$app/env';
import { storage } from '$lib/services/storage';
import type { Simulation } from '$lib/engine/simulation';

const STORAGE_KEY = 'fps_monitor';

export interface PerfMetrics {
	fps: number;
	minFps: number;
	frameTimeMs: number;
	jsHeapUsedMb: number | null;
	jsHeapTotalMb: number | null;
	jsHeapLimitMb: number | null;
	unitsCount: number;
	westUnitsCount: number;
	eastUnitsCount: number;
	buildingsCount: number;
	westBuildingsCount: number;
	eastBuildingsCount: number;
	decorationsCount: number;
	projectilesCount: number;
	debrisCount: number;
	simSpeed: number;
}

class PerfMonitor {
	private saved = storage.get(STORAGE_KEY);
	public enabled = $state<boolean>(this.saved === '1');

	public fps = $state<number>(60);
	public minFps = $state<number>(60);
	public frameTimeMs = $state<number>(16.6);

	public jsHeapUsedMb = $state<number | null>(null);
	public jsHeapTotalMb = $state<number | null>(null);
	public jsHeapLimitMb = $state<number | null>(null);

	public sim = $state<Simulation | null>(null);
	public copied = $state<boolean>(false);

	private animId: number | null = null;
	private lastTime = 0;
	private frameCount = 0;
	private lastFpsUpdate = 0;
	private recentFpsValues: number[] = [];
	private copyTimer: ReturnType<typeof setTimeout> | undefined;

	constructor() {
		if (browser && this.enabled) {
			this.start();
		}
	}

	public toggle(): void {
		this.set(!this.enabled);
	}

	public set(val: boolean): void {
		this.enabled = val;
		storage.set(STORAGE_KEY, val ? '1' : '0');
		if (val) {
			this.start();
		} else {
			this.stop();
		}
	}

	public attachSim(sim: Simulation): void {
		this.sim = sim;
	}

	public detachSim(): void {
		this.sim = null;
	}

	public start(): void {
		if (!browser || this.animId !== null) return;
		this.lastTime = performance.now();
		this.lastFpsUpdate = this.lastTime;
		this.frameCount = 0;
		this.recentFpsValues = [];

		const tick = (now: number) => {
			const delta = now - this.lastTime;
			this.lastTime = now;
			this.frameTimeMs = Math.round(delta * 10) / 10;
			this.frameCount++;

			// Update FPS calculations every 300ms
			if (now - this.lastFpsUpdate >= 300) {
				const elapsedSec = (now - this.lastFpsUpdate) / 1000;
				const currentFps = Math.round((this.frameCount / elapsedSec) * 10) / 10;
				this.fps = currentFps;

				this.recentFpsValues.push(currentFps);
				if (this.recentFpsValues.length > 10) {
					this.recentFpsValues.shift();
				}
				this.minFps = Math.min(...this.recentFpsValues);

				this.frameCount = 0;
				this.lastFpsUpdate = now;

				// Update memory if browser supports performance.memory
				this.updateMemoryMetrics();
			}

			if (this.enabled) {
				this.animId = requestAnimationFrame(tick);
			} else {
				this.animId = null;
			}
		};

		this.animId = requestAnimationFrame(tick);
	}

	public stop(): void {
		if (this.animId !== null) {
			cancelAnimationFrame(this.animId);
			this.animId = null;
		}
	}

	public updateMemoryMetrics(): void {
		if (!browser) return;
		const perf = window.performance as unknown as {
			memory?: {
				usedJSHeapSize: number;
				totalJSHeapSize: number;
				jsHeapSizeLimit: number;
			};
		};

		if (perf?.memory) {
			this.jsHeapUsedMb = Math.round((perf.memory.usedJSHeapSize / (1024 * 1024)) * 10) / 10;
			this.jsHeapTotalMb = Math.round((perf.memory.totalJSHeapSize / (1024 * 1024)) * 10) / 10;
			this.jsHeapLimitMb = Math.round((perf.memory.jsHeapSizeLimit / (1024 * 1024)) * 10) / 10;
		}
	}

	public getMetrics(): PerfMetrics {
		const westUnits = this.sim?.units.filter((u) => u.team === 'west').length ?? 0;
		const eastUnits = this.sim?.units.filter((u) => u.team === 'east').length ?? 0;
		const westBuildings = this.sim?.buildings.filter((b) => b.team === 'west').length ?? 0;
		const eastBuildings = this.sim?.buildings.filter((b) => b.team === 'east').length ?? 0;

		return {
			fps: this.fps,
			minFps: this.minFps,
			frameTimeMs: this.frameTimeMs,
			jsHeapUsedMb: this.jsHeapUsedMb,
			jsHeapTotalMb: this.jsHeapTotalMb,
			jsHeapLimitMb: this.jsHeapLimitMb,
			unitsCount: this.sim?.units.length ?? 0,
			westUnitsCount: westUnits,
			eastUnitsCount: eastUnits,
			buildingsCount: this.sim?.buildings.length ?? 0,
			westBuildingsCount: westBuildings,
			eastBuildingsCount: eastBuildings,
			decorationsCount: this.sim?.decorations?.length ?? 0,
			projectilesCount: this.sim?.projectiles?.length ?? 0,
			debrisCount: this.sim?.debris?.length ?? 0,
			simSpeed: this.sim?.speed ?? 1
		};
	}

	public getMetricsReport(): string {
		const m = this.getMetrics();
		const timestamp = new Date().toISOString();
		const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
		const url = typeof location !== 'undefined' ? location.href : 'Unknown';
		const screenRes =
			typeof window !== 'undefined'
				? `${window.innerWidth}x${window.innerHeight} (DPR: ${window.devicePixelRatio || 1})`
				: 'Unknown';
		const domCount =
			typeof document !== 'undefined' ? document.getElementsByTagName('*').length : 0;

		let memoryStr = 'Not exposed by browser';
		if (m.jsHeapUsedMb !== null) {
			memoryStr = `${m.jsHeapUsedMb} MB / ${m.jsHeapTotalMb} MB (Limit: ${m.jsHeapLimitMb} MB)`;
		}

		return [
			'=== PERFORMANCE & DIAGNOSTIC METRICS ===',
			`DATE: ${timestamp}`,
			`URL: ${url}`,
			`DEVICE: ${ua}`,
			`RESOLUTION: ${screenRes}`,
			`DOM NODES: ${domCount}`,
			'',
			'--- RENDER & FPS ---',
			`CURRENT FPS: ${m.fps}`,
			`MIN FPS (last 3s): ${m.minFps}`,
			`FRAME TIME: ${m.frameTimeMs} ms`,
			'',
			'--- MEMORY LOAD ---',
			`JS HEAP: ${memoryStr}`,
			'',
			'--- SIMULATION & ENTITIES ---',
			`SIMULATION SPEED: ${m.simSpeed}x`,
			`TOTAL UNITS: ${m.unitsCount} (West: ${m.westUnitsCount}, East: ${m.eastUnitsCount})`,
			`TOTAL BUILDINGS: ${m.buildingsCount} (West: ${m.westBuildingsCount}, East: ${m.eastBuildingsCount})`,
			`DECORATIONS: ${m.decorationsCount}`,
			`PROJECTILES: ${m.projectilesCount}`,
			`BATTLEFIELD DEBRIS: ${m.debrisCount}`,
			'=== END OF METRICS ==='
		].join('\n');
	}

	public async copyReport(): Promise<boolean> {
		const report = this.getMetricsReport();
		try {
			if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(report);
				this.copied = true;
				clearTimeout(this.copyTimer);
				this.copyTimer = setTimeout(() => {
					this.copied = false;
				}, 1500);
				return true;
			}
			return false;
		} catch {
			return false;
		}
	}
}

export const perfMonitor = new PerfMonitor();
