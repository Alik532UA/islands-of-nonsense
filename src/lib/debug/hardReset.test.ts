// src/lib/debug/hardReset.test.ts — лише коли збір логів із пристроїв (DEBUGGING § 3): скидання стирає своє, лишає чуже й переживає збій складника
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_PREFIX } from '$lib/services/storage';

vi.mock('$app/paths', () => ({ base: '/App' }));
// Фасад сховища працює лише в браузері; у vitest із плагіном SvelteKit `browser` — false (§ 4).
vi.mock('$app/env', () => ({ browser: true, dev: false }));

const HOST = 'https://user.github.io';
/** Префікс — з фасаду, а не рядком: `<PROJECT_PREFIX>` кожного проєкту свій. Превʼю — той самий проєкт в іншому середовищі. */
const OWN_KEY = `${STORAGE_PREFIX}theme`;
const PREVIEW_KEY = `${STORAGE_PREFIX.slice(0, -1)}-dev_theme`;

function memoryStorage(initial: Record<string, string>): Storage {
	const data = new Map(Object.entries(initial));
	return {
		get length() {
			return data.size;
		},
		key: (i: number) => [...data.keys()][i] ?? null,
		getItem: (k: string) => data.get(k) ?? null,
		setItem: (k: string, v: string) => void data.set(k, v),
		removeItem: (k: string) => void data.delete(k),
		clear: () => data.clear()
	};
}

let local: Storage;
let cookieWrites: string[];
let deletedCaches: string[];
let unregistered: string[];
const reload = vi.fn();

beforeEach(() => {
	vi.resetModules();
	reload.mockClear();
	local = memoryStorage({ [OWN_KEY]: 'dark', neighbour_theme: 'light', [PREVIEW_KEY]: 'x' });
	cookieWrites = [];
	deletedCaches = [];
	unregistered = [];
	const registration = (path: string) => ({
		scope: `${HOST}${path}`,
		unregister: async () => void unregistered.push(path)
	});
	vi.stubGlobal('window', {
		localStorage: local,
		sessionStorage: memoryStorage({}),
		location: { origin: HOST },
		caches: {},
		indexedDB: {}
	});
	vi.stubGlobal('location', { reload });
	vi.stubGlobal('document', {
		get cookie() {
			return `${STORAGE_PREFIX}lang=uk; neighbour_lang=en`;
		},
		set cookie(value: string) {
			cookieWrites.push(value);
		}
	});
	vi.stubGlobal('caches', {
		keys: async () => [`workbox-precache-v2-${HOST}/App/`, `workbox-precache-v2-${HOST}/App2/`],
		delete: async (name: string) => void deletedCaches.push(name)
	});
	vi.stubGlobal('indexedDB', {
		databases: async () => {
			throw new DOMException('denied', 'SecurityError');
		}
	});
	vi.stubGlobal('navigator', {
		serviceWorker: {
			getRegistrations: async () => [
				registration('/App/'),
				registration('/App/dev/'),
				registration('/App2/')
			]
		}
	});
});

describe('аварійне скидання (DEBUGGING § 3.4)', () => {
	it('стирає своє в кожному складнику й не чіпає чужого', async () => {
		const { hardReset } = await import('./hardReset');
		await hardReset();
		expect(local.getItem(OWN_KEY)).toBeNull();
		expect(local.getItem('neighbour_theme')).toBe('light');
		expect(local.getItem(PREVIEW_KEY), 'дані превʼю — чужі').toBe('x');
		expect(cookieWrites).toEqual([`${STORAGE_PREFIX}lang=; path=/App/; max-age=0; SameSite=Lax`]);
		expect(deletedCaches).toEqual([`workbox-precache-v2-${HOST}/App/`]);
		expect(unregistered).toEqual(['/App/']);
	});

	it('збій складника не скасовує решту, і скидання не кидає', async () => {
		const { hardReset } = await import('./hardReset');
		await expect(hardReset()).resolves.toBeUndefined();
		expect(unregistered, 'IndexedDB кинув, а реєстрацію однаково знято').toEqual(['/App/']);
		expect(reload).toHaveBeenCalledOnce();
	});
});
