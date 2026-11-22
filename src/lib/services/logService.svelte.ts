// src/lib/services/logService.svelte.ts
import { browser, dev } from '$app/env';
import { redact } from './redact';
import { sessionStore } from './storage';
import type { Unit } from '../engine/types';
import type { Simulation } from '../engine/simulation';

export type Level = 'info' | 'warn' | 'error';

export const LOG_TOPICS = [
	'init',
	'ui',
	'navigation',
	'collision',
	'building',
	'combat',
	'economy',
	'ai',
	'network',
	'storage',
	'warn',
	'error',
	'info'
] as const;

export type LogTopic = (typeof LOG_TOPICS)[number];

export interface Entry {
	time: string;
	level: Level;
	category: string;
	message: string;
	data: unknown[];
}

const CAPACITY = 1000;
/** У дзеркало — лише хвіст буфера: сховище ділиться з рештою застосунку. */
const MIRRORED = 200;
const MIRROR_KEY = 'log';

/** Вивід info у консоль за категорією — лише в dev; у production консоль бачить тільки error. */
const CONSOLE_CATEGORIES: Record<string, boolean> = {
	ui: true,
	network: true,
	navigation: true,
	collision: true,
	building: true,
	combat: true,
	economy: true,
	ai: true,
	storage: false,
	i18n: false,
	version: false,
	reset: false
};

const safeJson = (value: unknown): string => {
	try {
		return JSON.stringify(value);
	} catch {
		// log-exempt: серіалізатор самого логера — запис про його збій ішов би через нього ж
		return '[unserializable]';
	}
};

class LogService {
	errorCount = $state(0);
	/** Ідентифікатор збірки на сервері, якщо його вже прочитано (VERSIONING § 2.2). */
	servedVersion = $state<string | null>(null);
	#entries: Entry[] = [];
	#mirror = browser;
	/** Фасад сховища сам пише в журнал про збій запису — без цього прапорця це була б рекурсія. */
	#persisting = false;

	info(category: string, message: string, ...data: unknown[]): void {
		this.#write('info', category, message, data);
	}
	warn(category: string, message: string, ...data: unknown[]): void {
		this.#write('warn', category, message, data);
	}
	error(category: string, message: string, ...data: unknown[]): void {
		this.#write('error', category, message, data);
	}

	// Topic helpers matching MindStep design
	navigation(message: string, ...data: unknown[]): void {
		this.#write('info', 'navigation', message, data);
	}
	collision(message: string, ...data: unknown[]): void {
		this.#write('info', 'collision', message, data);
	}
	building(message: string, ...data: unknown[]): void {
		this.#write('info', 'building', message, data);
	}
	combat(message: string, ...data: unknown[]): void {
		this.#write('info', 'combat', message, data);
	}
	economy(message: string, ...data: unknown[]): void {
		this.#write('info', 'economy', message, data);
	}
	ai(message: string, ...data: unknown[]): void {
		this.#write('info', 'ai', message, data);
	}
	ui(message: string, ...data: unknown[]): void {
		this.#write('info', 'ui', message, data);
	}
	init(message: string, ...data: unknown[]): void {
		this.#write('info', 'init', message, data);
	}

	#write(level: Level, category: string, message: string, data: unknown[]): void {
		try {
			const entry: Entry = {
				time: new Date().toISOString(),
				level,
				category,
				message: String(redact(message)),
				data: data.map((item) => redact(item))
			};
			this.#entries.push(entry);
			if (this.#entries.length > CAPACITY) this.#entries.shift();
			if (level === 'error') this.errorCount += 1;
			this.#toConsole(entry);
			this.#persist();
		} catch {
			// log-exempt: логер не кидає ніколи (§ 1.5), а записати збій запису нікуди, крім нього самого
		}
	}

	#toConsole(entry: Entry): void {
		if (!dev && entry.level !== 'error') return;
		if (dev && entry.level === 'info' && CONSOLE_CATEGORIES[entry.category] === false) return;
		console[entry.level](`[${entry.category}] ${entry.message}`, ...entry.data);
	}

	#persist(): void {
		if (!this.#mirror || this.#persisting) return;
		this.#persisting = true;
		try {
			// false — квота чи заблоковане сховище: дзеркало вимикається до кінця сесії, буфер працює.
			if (!sessionStore.set(MIRROR_KEY, safeJson(this.#entries.slice(-MIRRORED))))
				this.#mirror = false;
		} finally {
			this.#persisting = false;
		}
	}

	get entries(): Entry[] {
		return this.#entries;
	}

	clear(): void {
		this.#entries = [];
		this.errorCount = 0;
		if (this.#mirror) {
			try {
				sessionStore.remove(MIRROR_KEY);
			} catch {
				// log-exempt: очищення сесійного дзеркала не має кидати
			}
		}
	}

	getReport(): string {
		const served = this.servedVersion ? ` (served: ${this.servedVersion})` : '';
		const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.1';
		const header = [
			'--- LOG REPORT ---',
			`DATE: ${new Date().toISOString()}`,
			`URL: ${browser ? String(redact(location.href)) : '-'}`,
			`DEVICE: ${browser ? navigator.userAgent : '-'}`,
			`VERSION: ${appVersion}${served}`,
			`ONLINE: ${browser ? String(navigator.onLine) : '-'}`,
			'---'
		];
		const lines = this.#entries.map(
			(e) =>
				`[${e.time}] [${e.level.toUpperCase()}] [${e.category.toUpperCase()}] ${e.message}` +
				(e.data.length ? ` ${safeJson(e.data)}` : '')
		);
		return [...header, ...lines].join('\n');
	}

	getLogReport(): string {
		return this.getReport();
	}

	getUnitReport(u: Unit, sim: Simulation): string {
		const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.1';
		const header = [
			'=== UNIT DIAGNOSTIC REPORT ===',
			`DATE: ${new Date().toISOString()}`,
			`VERSION: ${appVersion}`,
			`UNIT: ${u.name} [${u.defId}] (ID: ${u.instanceId})`,
			`TEAM: ${u.team.toUpperCase()} | LANE: ${u.lane.toUpperCase()} | FLYING: ${!!u.flying}`,
			`HP: ${Math.round(u.hp)}/${u.maxHp} | STATE: ${u.state} | SPEED: ${u.speed}`,
			`POSITION: (X: ${u.x.toFixed(1)}, Y: ${u.y.toFixed(1)}) | PREV: (X: ${u.prevX?.toFixed(1) ?? 'N/A'}, Y: ${u.prevY?.toFixed(1) ?? 'N/A'})`,
			`STUCK TIMER: ${(u.stuckTimer || 0).toFixed(2)}s | SIZE: ${u.size}`,
			`TARGET: X=${u.targetX ?? 'N/A'}, Y=${u.targetY ?? 'N/A'} | CURRENT_TARGET_ID: ${u.currentTargetId ?? 'none'} | TARGET_BLD_ID: ${u.targetBuildingId ?? 'none'}`,
			''
		];

		const waypoints = [
			'--- PATHFINDING & WAYPOINTS ---',
			`ACTIVE WAYPOINTS: ${u.path?.length ?? 0}`,
			`PATH TARGET: X=${u.pathTargetX ?? 'N/A'}, Y=${u.pathTargetY ?? 'N/A'}`,
			`WAYPOINTS LIST: ${u.path?.length ? u.path.map((wp, i) => `#${i + 1} (${Math.round(wp.x)}, ${Math.round(wp.y)})`).join(' -> ') : 'None (direct movement)'}`,
			''
		];

		const nearbyBuildings = sim.buildings
			.filter((b) => b.hp > 0 && Math.hypot(b.x + 32 - u.x, b.y + 32 - u.y) <= 450)
			.map((b) => {
				const dist = Math.hypot(b.x + 32 - u.x, b.y + 32 - u.y) - 32;
				return `  - [${b.team.toUpperCase()} BUILDING] ${b.name} (${b.instanceId}): at (${b.x}, ${b.y}), dist: ${dist.toFixed(1)}px, hp: ${b.hp}/${b.maxHp}`;
			});

		const westCastleDist = Math.hypot(sim.castles.west.x - u.x, sim.castles.west.y - u.y) - 110;
		const eastCastleDist = Math.hypot(sim.castles.east.x - u.x, sim.castles.east.y - u.y) - 110;

		const nearbyDecorations = (sim.decorations || [])
			.filter((d) => Math.hypot(d.x - u.x, d.y - u.y) <= 350)
			.map((d) => {
				const dist = Math.hypot(d.x - u.x, d.y - u.y) - d.radius;
				return `  - [DECORATION] ${d.type} (${d.id}): at (${d.x}, ${d.y}), radius: ${d.radius}, dist: ${dist.toFixed(1)}px`;
			});

		const directTargetX =
			u.targetX ?? (u.team === 'west' ? sim.castles.east.x : sim.castles.west.x);
		const directTargetY =
			u.targetY ?? (u.team === 'west' ? sim.castles.east.y : sim.castles.west.y);
		const lineClear = sim.workerSystem.isGroundLineClear(
			u.x,
			u.y,
			directTargetX,
			directTargetY,
			u.size
		);
		const resolved = sim.workerSystem.resolveGroundObstacles(u.x, u.y, u.size);
		const isPenetrating = Math.hypot(resolved.x - u.x, resolved.y - u.y) > 0.5;

		const obstacles = [
			'--- PROXIMITY OBSTACLES & COLLISION ---',
			`DIRECT LINE TO TARGET CLEAR: ${lineClear}`,
			`INSIDE OBSTACLE (PENETRATING): ${isPenetrating ? `YES (push vector: dx=${(resolved.x - u.x).toFixed(1)}, dy=${(resolved.y - u.y).toFixed(1)})` : 'NO'}`,
			`BROKEN BRIDGE ON MAP: ${sim.brokenBridge ?? 'none'} (Lane: ${u.lane})`,
			`WEST CASTLE DISTANCE: ${westCastleDist.toFixed(1)}px`,
			`EAST CASTLE DISTANCE: ${eastCastleDist.toFixed(1)}px`,
			`NEARBY BUILDINGS (${nearbyBuildings.length}):`,
			...(nearbyBuildings.length ? nearbyBuildings : ['  None within 450px']),
			`NEARBY DECORATIONS (${nearbyDecorations.length}):`,
			...(nearbyDecorations.length ? nearbyDecorations : ['  None within 350px']),
			''
		];

		const unitEntries = this.#entries.filter((e) => {
			const text = `${e.message} ${safeJson(e.data)}`;
			return text.includes(u.instanceId) || text.includes(u.name);
		});

		const logs = [
			`--- LOG HISTORY FOR THIS UNIT (${unitEntries.length} entries) ---`,
			...(unitEntries.length
				? unitEntries.map(
						(e) =>
							`[${e.time}] [${e.level.toUpperCase()}] [${e.category.toUpperCase()}] ${e.message}` +
							(e.data.length ? ` ${safeJson(e.data)}` : '')
					)
				: ['No specific log entries captured for this unit']),
			'=== END OF REPORT ==='
		];

		return [...header, ...waypoints, ...obstacles, ...logs].join('\n');
	}
}

const rawInstance = new LogService();

export type LogServiceType = LogService &
	Record<string, (message: string, ...data: unknown[]) => void>;

const loggerProxy = new Proxy(rawInstance, {
	get(target, prop) {
		if (prop === 'then') return undefined;
		if (prop in target) {
			const val = target[prop as keyof LogService];
			return typeof val === 'function' ? val.bind(target) : val;
		}
		return (message: string, ...data: unknown[]) => {
			target.info(String(prop), message, ...data);
		};
	},
	set(target, prop, value) {
		(target as unknown as Record<string | symbol, unknown>)[prop] = value;
		return true;
	}
}) as LogServiceType;

export const logService = loggerProxy;
