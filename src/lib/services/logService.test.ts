// src/lib/services/logService.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true, dev: false }));
vi.mock('$app/env', () => ({ browser: true, dev: false }));

const load = async () => (await import('./logService.svelte')).logService;

beforeEach(() => {
	vi.resetModules();
	vi.stubGlobal('location', { href: 'https://user.github.io/App/?tab=2' });
	vi.stubGlobal('window', {
		sessionStorage: {
			getItem: () => null,
			setItem: () => {},
			removeItem: () => {},
			key: () => null,
			length: 0
		}
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('журнал (DEBUGGING § 1)', () => {
	it('переповнене сховище не валить логування і вимикає дзеркало (§ 1.5)', async () => {
		const setItem = vi.fn(() => {
			throw new DOMException('quota', 'QuotaExceededError');
		});
		vi.stubGlobal('window', {
			sessionStorage: {
				getItem: () => null,
				setItem,
				removeItem: () => {},
				key: () => null,
				length: 0
			}
		});
		const logService = await load();
		expect(() => {
			logService.info('app', 'Boot');
			logService.info('app', 'Ready');
		}).not.toThrow();
		expect(
			setItem,
			'друга спроба запису — рекурсія через попередження фасаду або дзеркало не вимкнулося'
		).toHaveBeenCalledTimes(1);
	});

	it('зламана консоль не валить логування (§ 1.5)', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {
			throw new Error('console broken');
		});
		const logService = await load();
		expect(() => logService.error('ui', 'Render failed')).not.toThrow();
	});

	it('мережевий збій — warn: лічильник помилок стоїть (§ 1.3)', async () => {
		const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
		vi.stubGlobal('fetch', fetchMock);
		const logService = await load();
		const { fetchServedVersion } = await import('./servedVersion');
		expect(await fetchServedVersion()).toBeNull();
		expect(logService.errorCount, 'офлайн — це warn, а не error').toBe(0);
		expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/_app\/version\.json\?t=\d+$/), {
			cache: 'no-store'
		});
	});

	it('PII не доходить ні до запису, ні до звіту (§ 1.4)', async () => {
		const logService = await load();
		logService.warn('auth', 'Sign-in failed for john@example.com', {
			password: 'hunter2',
			callback: 'https://x.io/cb#access_token=T0K3N'
		});
		expect(logService.getReport()).not.toMatch(/john@|hunter2|T0K3N/);
	});

	it('редакція бачить відносну адресу, параметри, тіло форми, JSON і закодовану пошту (§ 1.4)', async () => {
		const { redact } = await import('./redact');
		const text = JSON.stringify(
			redact([
				'Request /reset?token=SECRET1&page=2 failed',
				new URLSearchParams('session=SECRET2&page=2'),
				'email=a%40b.c&password=SECRET3',
				'Response {"password":"SECRET4","note":"kept"}',
				'invite for john%40example.com',
				new URL('https://x.io/a?apiKey=SECRET5#access_token=SECRET6')
			])
		);
		expect(text).not.toMatch(/SECRET\d|john|a%40b/);
		expect(text, 'нечутливі параметри й поля лишаються').toMatch(/page=2[\s\S]*page=2[\s\S]*kept/);
	});

	it('помилка приносить у звіт свій код, а не лише текст (§ 1.4)', async () => {
		const logService = await load();
		const denied = Object.assign(new Error('Missing or insufficient permissions'), {
			code: 'permission-denied'
		});
		logService.error('db', 'Write rejected', denied);
		expect(logService.getReport()).toContain('permission-denied');
	});

	it('заголовок звіту: VERSION і дата ISO 8601 (§ 2.3)', async () => {
		const report = (await load()).getReport();
		expect(report).toMatch(/^DATE: \d{4}-\d\d-\d\dT[\d:.]+Z$/m);
		expect(report).toContain(`VERSION: ${__APP_VERSION__}`);
	});

	it('логування за темами (topic-based logging, MindStep style)', async () => {
		const logService = await load();
		logService.navigation('Worker path calculated to (1800, 1200)', { waypoints: 3 });
		logService.collision('Unit steered around obstacle', { unit: 'Мечник', bias: 1 });
		const report = logService.getLogReport();
		expect(report).toContain('[NAVIGATION] Worker path calculated');
		expect(report).toContain('[COLLISION] Unit steered around obstacle');
	});

	it('читання errorCount та запис servedVersion не кидає через приватні поля в Proxy', async () => {
		const logService = await load();
		expect(() => logService.errorCount).not.toThrow();
		expect(typeof logService.errorCount).toBe('number');
		expect(() => {
			logService.servedVersion = '1.2.3';
		}).not.toThrow();
		expect(logService.servedVersion).toBe('1.2.3');
	});

	it('генерація детального діагностичного звіту конкретного юніта getUnitReport', async () => {
		const logService = await load();
		logService.collision('Unit path calculated', { unit: 'Вогнеметник', unitId: 'unit_diag_1' });

		const mockSim = {
			castles: {
				west: { x: 1600, y: 1200 },
				east: { x: 5600, y: 1200 }
			},
			buildings: [
				{
					instanceId: 'bld_1',
					name: 'Бараки',
					team: 'east',
					x: 2000,
					y: 1200,
					hp: 1000,
					maxHp: 1000
				}
			],
			decorations: [],
			brokenBridge: 'mid',
			workerSystem: {
				isGroundLineClear: () => false,
				resolveGroundObstacles: (x: number, y: number) => ({ x, y })
			}
		} as unknown as import('../engine/simulation').Simulation;

		const mockUnit = {
			instanceId: 'unit_diag_1',
			defId: 'u_flame',
			name: 'Вогнеметник',
			team: 'west',
			lane: 'mid',
			flying: false,
			hp: 450,
			maxHp: 500,
			state: 'WALKING',
			speed: 240,
			size: 16,
			x: 1950,
			y: 1200,
			targetX: 5600,
			targetY: 1200,
			path: [{ x: 1970, y: 1220 }],
			pathTargetX: 5600,
			pathTargetY: 1200
		} as unknown as import('../engine/types').Unit;

		const unitReport = logService.getUnitReport(mockUnit, mockSim);

		expect(unitReport).toContain('=== UNIT DIAGNOSTIC REPORT ===');
		expect(unitReport).toContain('Вогнеметник');
		expect(unitReport).toContain('unit_diag_1');
		expect(unitReport).toContain('--- PATHFINDING & WAYPOINTS ---');
		expect(unitReport).toContain('--- PROXIMITY OBSTACLES & COLLISION ---');
		expect(unitReport).toContain('Бараки');
		expect(unitReport).toContain('--- LOG HISTORY FOR THIS UNIT');
		expect(unitReport).toContain('[COLLISION] Unit path calculated');
	});

	it('генерація діагностичного звіту для будь-якого об’єкта (будівля, робітник, замок, група)', async () => {
		const logService = await load();

		const mockSim = {
			castles: {
				west: { x: 1600, y: 1200, hp: 4500, maxHp: 5000, team: 'west' },
				east: { x: 5600, y: 1200, hp: 5000, maxHp: 5000, team: 'east' }
			},
			players: {
				west: {
					name: 'Player 1',
					race: 'human',
					gold: 750,
					lumber: 40,
					food: 12,
					maxFood: 20,
					commander: 1,
					forge: { attack: 1, armor: 1, econ: 0 },
					worker: {
						name: 'Селянин',
						x: 1750,
						y: 1200,
						targetX: 1800,
						targetY: 1200,
						hp: 250,
						maxHp: 250,
						armor: 'Unarmored',
						speed: 250,
						isBuilding: true,
						buildTimer: 2.5,
						targetBuildingId: 'bld_farm_1',
						path: [{ x: 1800, y: 1200 }]
					}
				}
			},
			buildings: [
				{
					instanceId: 'bld_barracks_1',
					defId: 'h000',
					name: 'Казарми',
					team: 'west',
					lane: 'mid',
					tileX: 1,
					tileY: 2,
					x: 1800,
					y: 1200,
					hp: 1200,
					maxHp: 1200,
					armor: 5,
					armorType: 'fortified',
					goldCost: 165,
					spawnUnitId: 'u_footman',
					spawnCooldown: 18,
					spawnTimer: 12,
					race: 'human'
				}
			],
			units: [
				{
					instanceId: 'unit_grunt_1',
					defId: 'u_grunt',
					name: 'Бугай',
					team: 'east',
					lane: 'mid',
					hp: 700,
					maxHp: 700,
					x: 2100,
					y: 1200,
					state: 'ATTACKING'
				}
			],
			goldCoins: [
				{
					id: 'coin_1',
					lane: 'mid',
					x: 1760,
					y: 1210,
					value: 5,
					lifeTime: 10,
					maxLifeTime: 20
				}
			]
		} as unknown as import('../engine/simulation').Simulation;

		// 1. Building Report
		const bld = mockSim.buildings[0];
		const bldReport = logService.getBuildingReport(bld, mockSim);
		expect(bldReport).toContain('=== BUILDING DIAGNOSTIC REPORT ===');
		expect(bldReport).toContain('Казарми');
		expect(bldReport).toContain('bld_barracks_1');
		expect(bldReport).toContain('WEST CASTLE DISTANCE');

		// 2. Worker Report
		const worker = mockSim.players.west.worker;
		expect(worker).toBeDefined();
		if (worker) {
			const workerReport = logService.getWorkerReport(worker, 'west', mockSim);
			expect(workerReport).toContain('=== WORKER DIAGNOSTIC REPORT ===');
			expect(workerReport).toContain('Селянин');
			expect(workerReport).toContain('Building (bld_farm_1');
		}

		// 3. Castle Report
		const castle = mockSim.castles.west;
		const castleReport = logService.getCastleReport(castle, mockSim);
		expect(castleReport).toContain('=== CASTLE DIAGNOSTIC REPORT ===');
		expect(castleReport).toContain('West Castle (Alliance)');
		expect(castleReport).toContain('4500/5000');

		// 4. Group Report
		const groupReport = logService.getGroupReport(mockSim.units);
		expect(groupReport).toContain('=== UNIT GROUP DIAGNOSTIC REPORT ===');
		expect(groupReport).toContain('Бугай');

		// 5. Unified getEntityReport handles all selection modes
		// A. Building selection
		const entBld = logService.getEntityReport(mockSim, {
			type: 'building',
			instanceId: 'bld_barracks_1'
		});
		expect(entBld).not.toBeNull();
		expect(entBld?.title).toBe('будівлі Казарми');
		expect(entBld?.report).toContain('Казарми');

		// B. Worker selection
		const entWorker = logService.getEntityReport(mockSim, { type: 'worker' });
		expect(entWorker).not.toBeNull();
		expect(entWorker?.title).toBe('робітника');
		expect(entWorker?.report).toContain('Селянин');

		// C. Castle selection
		const entCastle = logService.getEntityReport(mockSim, { type: 'castle', team: 'west' });
		expect(entCastle).not.toBeNull();
		expect(entCastle?.title).toBe('замку (Захід)');
		expect(entCastle?.report).toContain('West Castle');

		// D. Group selection
		const entGroup = logService.getEntityReport(mockSim, {
			type: 'group',
			unitIds: ['unit_grunt_1']
		});
		expect(entGroup).not.toBeNull();
		expect(entGroup?.title).toContain('групи');

		// E. Unit selection
		const entUnit = logService.getEntityReport(mockSim, {
			type: 'unit',
			instanceId: 'unit_grunt_1'
		});
		expect(entUnit).not.toBeNull();
		expect(entUnit?.title).toBe('юніта Бугай');

		// F. No entity selected and no worker fallback
		const emptySim = {
			units: [],
			buildings: [],
			castles: {},
			players: {}
		} as unknown as import('../engine/simulation').Simulation;
		const entNone = logService.getEntityReport(emptySim, null);
		expect(entNone).toBeNull();
	});
});
