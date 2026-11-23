export const FLAG_COUNTRIES = [
	'ua', 'us', 'gb', 'de', 'pl', 'fr', 'ca', 'es', 'it', 'nl',
	'se', 'no', 'fi', 'cz', 'sk', 'ro', 'bg', 'hr', 'jp', 'kr',
	'br', 'au', 'ch', 'at', 'be', 'dk', 'ee', 'lv', 'lt', 'ie',
	'pt', 'gr', 'hu', 'nz', 'sg', 'il', 'tr', 'mx', 'ar', 'cl'
] as const;

export const COUNTRY_CODE_LENGTH = 2;

const KNOWN = new Set<string>(FLAG_COUNTRIES);

export function isCountry(value: unknown): value is string {
	return typeof value === 'string' && KNOWN.has(value.toLowerCase());
}

export function countryName(code: string, locale: string = 'uk'): string {
	try {
		const names = new Intl.DisplayNames([locale], { type: 'region' });
		return names.of(code.toUpperCase()) ?? code.toUpperCase();
	} catch {
		return code.toUpperCase();
	}
}
