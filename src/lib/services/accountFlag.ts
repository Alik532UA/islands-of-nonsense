import { storage } from './storage';

export const SESSION_KEY = 'player.hasSession';

export function rememberSession(): void {
	storage.set(SESSION_KEY, '1');
}

export function hasSession(): boolean {
	return storage.get(SESSION_KEY) !== null;
}

export function clearSession(): void {
	storage.remove(SESSION_KEY);
}
