import { describe, it, expect, beforeEach } from 'vitest';
import { safeStorage, STORAGE_PREFIX } from './storage';

describe('Storage Facade (STORAGE-NAMESPACE-v10)', () => {
	const mockStore: Record<string, string> = {};

	beforeEach(() => {
		for (const k of Object.keys(mockStore)) {
			delete mockStore[k];
		}
		(globalThis as unknown as { window: unknown }).window = {
			localStorage: {
				getItem: (key: string) => mockStore[key] ?? null,
				setItem: (key: string, value: string) => {
					mockStore[key] = value;
				},
				removeItem: (key: string) => {
					delete mockStore[key];
				},
				get length() {
					return Object.keys(mockStore).length;
				},
				key: (i: number) => Object.keys(mockStore)[i] ?? null
			},
			sessionStorage: {
				getItem: () => null,
				setItem: () => {},
				removeItem: () => {},
				length: 0,
				key: () => null
			}
		};
	});

	it('забезпечує наявність обовʼязкового префікса проєкту', () => {
		expect(STORAGE_PREFIX).toBe('islandsofnonsense_');
	});

	it('зберігає та отримує строкові значення через префікс', () => {
		safeStorage.set('test_key', 'test_value');
		expect(mockStore[STORAGE_PREFIX + 'test_key']).toBe('test_value');
		expect(safeStorage.get('test_key')).toBe('test_value');
	});

	it('зберігає та отримує типізовані JSON-структури з фолбеком', () => {
		interface UserSettings {
			volume: number;
			sound: boolean;
		}

		const fallback: UserSettings = { volume: 0.5, sound: true };
		expect(safeStorage.getJSON('settings', fallback)).toEqual(fallback);

		const updated: UserSettings = { volume: 0.8, sound: false };
		safeStorage.setJSON('settings', updated);
		expect(safeStorage.getJSON('settings', fallback)).toEqual(updated);
	});

	it('видаляє ключ за вимогою', () => {
		safeStorage.set('temp', '123');
		expect(safeStorage.get('temp')).toBe('123');
		safeStorage.remove('temp');
		expect(safeStorage.get('temp')).toBeNull();
	});

	it('clear очищує тільки власні ключі префікса', () => {
		mockStore['foreign_key'] = 'preserve_me';
		safeStorage.set('my_key', 'delete_me');
		safeStorage.clear();
		expect(mockStore['foreign_key']).toBe('preserve_me');
		expect(mockStore[STORAGE_PREFIX + 'my_key']).toBeUndefined();
	});
});
