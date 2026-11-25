export type Locale = 'uk' | 'en';

class LocaleState {
	current = $state<Locale>('uk');
}

export const localeState = new LocaleState();
