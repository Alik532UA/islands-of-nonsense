import { isCountry } from '$lib/config/countries';
import { detectCountry } from '$lib/net/country';
import { storage } from './storage';

export const COUNTRY_KEY = 'player.country';

export async function preferredCountry(): Promise<string> {
	const saved = storage.get(COUNTRY_KEY);
	if (saved !== null) return isCountry(saved) ? saved : '';

	const guess = await detectCountry();
	if (guess === null) return '';

	storage.set(COUNTRY_KEY, guess);
	return guess;
}

export function rememberCountry(code: string): void {
	storage.set(COUNTRY_KEY, isCountry(code) ? code : '');
}
