// src/lib/services/logService.svelte.ts
import { browser, dev } from '$app/env';
import { redact } from './redact';
import { sessionStore } from './storage';
import type { Unit, Building, WorkerState, Castle, MatchTeam } from '../engine/types';
import type { Simulation } from '../engine/simulation';
import type { SelectedEntity } from '../renderer/entityRenderer';
import { getCastleStageIndex } from '../renderer/castleAssets';

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
		const lineClear = sim.workerSystem?.isGroundLineClear
			? sim.workerSystem.isGroundLineClear(u.x, u.y, directTargetX, directTargetY, u.size)
			: true;
		const resolved = sim.workerSystem?.resolveGroundObstacles
			? sim.workerSystem.resolveGroundObstacles(u.x, u.y, u.size)
			: { x: u.x, y: u.y };
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

	getBuildingReport(b: Building, sim: Simulation): string {
		const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.1';
		const westCastleDist = Math.hypot(
			sim.castles.west.x - (b.x + 32),
			sim.castles.west.y - (b.y + 32)
		);
		const eastCastleDist = Math.hypot(
			sim.castles.east.x - (b.x + 32),
			sim.castles.east.y - (b.y + 32)
		);

		const header = [
			'=== BUILDING DIAGNOSTIC REPORT ===',
			`DATE: ${new Date().toISOString()}`,
			`VERSION: ${appVersion}`,
			`BUILDING: ${b.name} [${b.defId}] (ID: ${b.instanceId})`,
			`TEAM: ${b.team.toUpperCase()} | RACE: ${b.race} | LANE: ${b.lane.toUpperCase()}`,
			`GRID TILE: (${b.tileX}, ${b.tileY}) | WORLD POS: (${b.x}, ${b.y})`,
			`HP: ${Math.round(b.hp)}/${b.maxHp} | ARMOR: ${b.armor} (${b.armorType})`,
			`STATUS: ${b.isUnderConstruction ? `Under Construction (${Math.round(b.buildProgress || 0)}/${b.maxBuildProgress || 100})` : 'Operational'}`,
			`SPAWN: Unit=${b.spawnUnitId || 'None'}, Timer=${(b.spawnTimer || 0).toFixed(1)}s/${b.spawnCooldown || 0}s`,
			`ATTACK: ${b.attackRange ? `Range=${b.attackRange}, Dmg=${b.damageMin}-${b.damageMax} (${b.attackType}), Cooldown=${b.attackCooldown}` : 'None (Production/Econ)'}`,
			`SPECIAL TYPE: ${b.specialType || 'None'} | UPGRADE FROM: ${b.upgradeFrom || 'Base'}`,
			`COST: Gold=${b.goldCost}, Lumber=${b.lumberCost || 0}`,
			''
		];

		const nearbyUnits = sim.units
			.filter((u) => u.hp > 0 && Math.hypot(u.x - (b.x + 32), u.y - (b.y + 32)) <= 400)
			.map((u) => {
				const dist = Math.hypot(u.x - (b.x + 32), u.y - (b.y + 32));
				return `  - [${u.team.toUpperCase()}] ${u.name} (${u.instanceId}): at (${u.x.toFixed(1)}, ${u.y.toFixed(1)}), dist: ${dist.toFixed(1)}px, hp: ${Math.round(u.hp)}/${u.maxHp}, state: ${u.state}`;
			});

		const context = [
			'--- PROXIMITY & MAP CONTEXT ---',
			`WEST CASTLE DISTANCE: ${westCastleDist.toFixed(1)}px`,
			`EAST CASTLE DISTANCE: ${eastCastleDist.toFixed(1)}px`,
			`NEARBY UNITS WITHIN 400px (${nearbyUnits.length}):`,
			...(nearbyUnits.length ? nearbyUnits : ['  None within 400px']),
			''
		];

		const bldEntries = this.#entries.filter((e) => {
			const text = `${e.message} ${safeJson(e.data)}`;
			return text.includes(b.instanceId) || text.includes(b.name);
		});

		const logs = [
			`--- LOG HISTORY FOR THIS BUILDING (${bldEntries.length} entries) ---`,
			...(bldEntries.length
				? bldEntries.map(
						(e) =>
							`[${e.time}] [${e.level.toUpperCase()}] [${e.category.toUpperCase()}] ${e.message}` +
							(e.data.length ? ` ${safeJson(e.data)}` : '')
					)
				: ['No specific log entries captured for this building']),
			'=== END OF REPORT ==='
		];

		return [...header, ...context, ...logs].join('\n');
	}

	getWorkerReport(w: WorkerState, team: MatchTeam, sim: Simulation): string {
		const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.1';
		const header = [
			'=== WORKER DIAGNOSTIC REPORT ===',
			`DATE: ${new Date().toISOString()}`,
			`VERSION: ${appVersion}`,
			`WORKER: ${w.name} [TEAM: ${team.toUpperCase()}]`,
			`POSITION: (X: ${w.x.toFixed(1)}, Y: ${w.y.toFixed(1)}) | TARGET: (X: ${w.targetX.toFixed(1)}, Y: ${w.targetY.toFixed(1)})`,
			`HP: ${Math.round(w.hp)}/${w.maxHp} | ARMOR: ${w.armor} | SPEED: ${w.speed}`,
			`STATUS: ${w.isBuilding ? `Building (${w.targetBuildingId || 'N/A'}, timer: ${(w.buildTimer || 0).toFixed(1)}s)` : w.isRepairing ? `Repairing (${w.targetRepairBuildingId || 'N/A'})` : 'Idle / Moving'}`,
			`STUCK TIMER: ${(w.stuckTimer || 0).toFixed(2)}s | AVOIDANCE BIAS: ${w.avoidanceBias ?? 0}`,
			`BUILD QUEUE: ${w.buildQueue?.length ? w.buildQueue.join(', ') : 'Empty'}`,
			''
		];

		const waypoints = [
			'--- PATHFINDING & WAYPOINTS ---',
			`ACTIVE WAYPOINTS: ${w.path?.length ?? 0}`,
			`WAYPOINTS LIST: ${w.path?.length ? w.path.map((wp, i) => `#${i + 1} (${Math.round(wp.x)}, ${Math.round(wp.y)})`).join(' -> ') : 'None (direct movement)'}`,
			''
		];

		const nearbyCoins = (sim.goldCoins || [])
			.filter((c) => Math.hypot(c.x - w.x, c.y - w.y) <= 500)
			.map(
				(c) =>
					`  - [GOLD COIN] at (${c.x}, ${c.y}), dist: ${Math.hypot(c.x - w.x, c.y - w.y).toFixed(1)}px, value: ${c.value}g`
			);

		const context = [
			'--- PROXIMITY & ENVIRONMENT ---',
			`NEARBY GOLD COINS (${nearbyCoins.length}):`,
			...(nearbyCoins.length ? nearbyCoins : ['  None within 500px']),
			''
		];

		const workerEntries = this.#entries.filter((e) => {
			const text = `${e.message} ${safeJson(e.data)}`.toLowerCase();
			return (
				text.includes('worker') ||
				text.includes(w.name.toLowerCase()) ||
				e.category === 'navigation'
			);
		});

		const logs = [
			`--- LOG HISTORY FOR WORKER (${workerEntries.length} entries) ---`,
			...(workerEntries.length
				? workerEntries
						.slice(-15)
						.map(
							(e) =>
								`[${e.time}] [${e.level.toUpperCase()}] [${e.category.toUpperCase()}] ${e.message}` +
								(e.data.length ? ` ${safeJson(e.data)}` : '')
						)
				: ['No specific log entries captured for worker']),
			'=== END OF REPORT ==='
		];

		return [...header, ...waypoints, ...context, ...logs].join('\n');
	}

	getCastleReport(c: Castle, sim: Simulation): string {
		const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.1';
		const player = sim.players[c.team];
		const hpPct = ((c.hp / c.maxHp) * 100).toFixed(1);
		const stage = getCastleStageIndex(c.hp, c.maxHp);

		const header = [
			'=== CASTLE DIAGNOSTIC REPORT ===',
			`DATE: ${new Date().toISOString()}`,
			`VERSION: ${appVersion}`,
			`CASTLE: ${c.team === 'west' ? 'West Castle (Alliance)' : 'East Castle (Chaos)'}`,
			`TEAM: ${c.team.toUpperCase()} | POSITION: (X: ${c.x}, Y: ${c.y})`,
			`HP: ${Math.round(c.hp)}/${c.maxHp} (${hpPct}%) | DESTRUCTION STAGE: Stage ${stage} (of 0..7)`,
			`PLAYER: Name="${player?.name ?? 'Unknown'}", Race="${player?.race ?? 'Unknown'}", Gold=${player?.gold ?? 0}, Lumber=${player?.lumber ?? 0}`,
			`FOOD: ${player?.food ?? 0}/${player?.maxFood ?? 0} | COMMANDER: #${player?.commander ?? 'N/A'}`,
			`FORGE LEVELS: Attack=+${player?.forge?.attack ?? 0}, Armor=+${player?.forge?.armor ?? 0}, Econ=+${player?.forge?.econ ?? 0}`,
			''
		];

		const attackingUnits = sim.units
			.filter((u) => u.hp > 0 && u.team !== c.team && Math.hypot(u.x - c.x, u.y - c.y) <= 600)
			.map(
				(u) =>
					`  - [ENEMY] ${u.name} (${u.instanceId}): at (${u.x.toFixed(1)}, ${u.y.toFixed(1)}), dist: ${Math.hypot(u.x - c.x, u.y - c.y).toFixed(1)}px, hp: ${Math.round(u.hp)}/${u.maxHp}`
			);

		const defendingUnits = sim.units
			.filter((u) => u.hp > 0 && u.team === c.team && Math.hypot(u.x - c.x, u.y - c.y) <= 600)
			.map(
				(u) =>
					`  - [ALLY] ${u.name} (${u.instanceId}): at (${u.x.toFixed(1)}, ${u.y.toFixed(1)}), dist: ${Math.hypot(u.x - c.x, u.y - c.y).toFixed(1)}px, hp: ${Math.round(u.hp)}/${u.maxHp}`
			);

		const combat = [
			'--- SURROUNDING UNITS (WITHIN 600px) ---',
			`ENEMY UNITS NEAR CASTLE (${attackingUnits.length}):`,
			...(attackingUnits.length ? attackingUnits : ['  None within 600px']),
			`DEFENDING ALLY UNITS NEAR CASTLE (${defendingUnits.length}):`,
			...(defendingUnits.length ? defendingUnits : ['  None within 600px']),
			''
		];

		const castleEntries = this.#entries.filter((e) => {
			const text = `${e.message} ${safeJson(e.data)}`.toLowerCase();
			return text.includes('castle') || text.includes(c.team);
		});

		const logs = [
			`--- LOG HISTORY FOR CASTLE (${castleEntries.length} entries) ---`,
			...(castleEntries.length
				? castleEntries
						.slice(-15)
						.map(
							(e) =>
								`[${e.time}] [${e.level.toUpperCase()}] [${e.category.toUpperCase()}] ${e.message}` +
								(e.data.length ? ` ${safeJson(e.data)}` : '')
						)
				: ['No specific log entries captured for castle']),
			'=== END OF REPORT ==='
		];

		return [...header, ...combat, ...logs].join('\n');
	}

	getGroupReport(units: Unit[]): string {
		const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.1';
		const unitBreakdown = new Map<string, number>();
		for (const u of units) {
			unitBreakdown.set(u.name, (unitBreakdown.get(u.name) || 0) + 1);
		}
		const summary = Array.from(unitBreakdown.entries())
			.map(([name, count]) => `  - ${name}: ${count}`)
			.join('\n');

		const header = [
			'=== UNIT GROUP DIAGNOSTIC REPORT ===',
			`DATE: ${new Date().toISOString()}`,
			`VERSION: ${appVersion}`,
			`TOTAL UNITS SELECTED: ${units.length}`,
			'COMPOSITION:',
			summary,
			''
		];

		const unitDetails = units.slice(0, 20).map((u, i) => {
			return `#${i + 1} [${u.team.toUpperCase()}] ${u.name} (${u.instanceId}): hp=${Math.round(u.hp)}/${u.maxHp}, pos=(${u.x.toFixed(1)}, ${u.y.toFixed(1)}), state=${u.state}, lane=${u.lane}`;
		});

		const list = [`--- UNITS LIST (Showing up to 20 of ${units.length}) ---`, ...unitDetails, ''];

		return [...header, ...list, '=== END OF REPORT ==='].join('\n');
	}

	getEntityReport(
		sim: Simulation,
		selectedEntity: SelectedEntity | null,
		selectedPlacedBuildingId?: string | null,
		selectedUnitId?: string | null
	): { report: string; title: string } | null {
		// 1. Specific unit selected
		const unitId =
			selectedUnitId || (selectedEntity?.type === 'unit' ? selectedEntity.instanceId : null);
		if (unitId) {
			const u = sim.units.find((x) => x.instanceId === unitId);
			if (u) {
				return { report: this.getUnitReport(u, sim), title: `юніта ${u.name}` };
			}
		}

		// 2. Specific building selected
		const bldId =
			selectedPlacedBuildingId ||
			(selectedEntity?.type === 'building' ? selectedEntity.instanceId : null);
		if (bldId) {
			const b = sim.buildings.find((x) => x.instanceId === bldId);
			if (b) {
				return { report: this.getBuildingReport(b, sim), title: `будівлі ${b.name}` };
			}
		}

		// 3. Castle selected
		if (selectedEntity?.type === 'castle') {
			const c = sim.castles[selectedEntity.team];
			if (c) {
				const teamName = selectedEntity.team === 'west' ? 'Захід' : 'Схід';
				return { report: this.getCastleReport(c, sim), title: `замку (${teamName})` };
			}
		}

		// 4. Group selected
		if (selectedEntity?.type === 'group' && selectedEntity.unitIds.length > 0) {
			const units = sim.units.filter((u) => selectedEntity.unitIds.includes(u.instanceId));
			if (units.length > 0) {
				return {
					report: this.getGroupReport(units),
					title: `групи (${units.length} юнітів)`
				};
			}
		}

		// 5. Worker selected (or default fallback if worker is selected)
		if (selectedEntity?.type === 'worker') {
			const w = sim.players.west?.worker;
			if (w) {
				return { report: this.getWorkerReport(w, 'west', sim), title: `робітника` };
			}
		}

		return null;
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
