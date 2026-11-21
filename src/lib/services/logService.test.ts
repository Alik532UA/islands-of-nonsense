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
});
