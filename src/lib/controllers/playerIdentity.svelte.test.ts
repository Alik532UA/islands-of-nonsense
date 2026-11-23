import { describe, expect, it, beforeEach } from 'vitest';
import { PlayerIdentity } from './playerIdentity.svelte';
import { storage } from '$lib/services/storage';
import { NAME_KEY } from '$lib/config/playerName';
import { COUNTRY_KEY } from '$lib/services/countryPref';
import { AVATAR_KEY, AVATAR_RANDOM_KEY } from '$lib/config/avatars';

describe('PlayerIdentity controller', () => {
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
		storage.remove(NAME_KEY);
		storage.remove(COUNTRY_KEY);
		storage.remove(AVATAR_KEY);
		storage.remove(AVATAR_RANDOM_KEY);
	});

	it('loads saved name from storage when available', async () => {
		storage.set(NAME_KEY, 'Герой Заходу');
		const identity = new PlayerIdentity(() => 0.5);
		await identity.load('uk', []);

		expect(identity.value).toBe('Герой Заходу');
	});

	it('generates random tactical name if storage is empty', async () => {
		const identity = new PlayerIdentity(() => 0);
		await identity.load('uk', []);

		expect(identity.value.length).toBeGreaterThan(0);
	});

	it('rerolls assigned name if already taken in lobby', async () => {
		const identity = new PlayerIdentity(() => 0);
		await identity.load('uk', []);
		const first = identity.value;

		identity.settle('uk', [first]);
		expect(identity.value).not.toBe('');
	});

	it('does NOT reroll user-entered name even if taken', async () => {
		storage.set(NAME_KEY, 'МійВибір');
		const identity = new PlayerIdentity(() => 0);
		await identity.load('uk', ['МійВибір']);

		identity.settle('uk', ['МійВибір']);
		expect(identity.value).toBe('МійВибір');
	});

	it('chooses avatar and synchronizes with storage and state', () => {
		const identity = new PlayerIdentity();
		identity.chooseAvatar('swords:red');

		expect(identity.avatar).toBe('swords:red');
		expect(identity.avatarChosen).toBe(true);
		expect(storage.get(AVATAR_KEY)).toBe('swords:red');
	});

	it('remembers and saves country preference', async () => {
		const identity = new PlayerIdentity();
		identity.setCountry('ua');

		expect(identity.country).toBe('ua');
		expect(storage.get(COUNTRY_KEY)).toBe('ua');
	});

	it('forEntry persists valid nickname to storage', () => {
		const identity = new PlayerIdentity();
		identity.value = 'Лорд Захисник';
		const result = identity.forEntry('uk', []);

		expect(result).toBe('Лорд Захисник');
		expect(storage.get(NAME_KEY)).toBe('Лорд Захисник');
	});
});
