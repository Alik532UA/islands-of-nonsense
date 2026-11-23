import { isCountry } from '$lib/config/countries';

export const COUNTRY_API = 'https://api.country.is/';
const TIMEOUT_MS = 2000;

export async function detectCountry(): Promise<string | null> {
	if (typeof fetch === 'undefined') return null;
	try {
		const response = await fetch(COUNTRY_API, {
			signal: AbortSignal.timeout(TIMEOUT_MS),
			cache: 'force-cache'
		});
		if (!response.ok) return null;

		const data: unknown = await response.json();
		const code =
			typeof data === 'object' && data !== null && 'country' in data
				? (data as { country: unknown }).country
				: null;

		if (!isCountry(code)) return null;
		return (code as string).toLowerCase();
	} catch {
		return null;
	}
}
