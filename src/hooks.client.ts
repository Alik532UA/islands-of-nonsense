import { logService } from '$lib/services/logService.svelte';
import { storage } from '$lib/services/storage';

const RELOAD_KEY = 'stale_reload';

interface ClientErrorParams {
	error: unknown;
	status: number;
	message: string;
}

/**
 * Клієнтська обробка помилок із захистом від застарілих чанків деплою (VERSIONING-v10 § 6).
 */
export const handleError = ({ error, message }: ClientErrorParams) => {
	const err = error as Error | undefined;
	const isChunkLoadError =
		err?.message?.includes('Failed to fetch dynamically imported module') ||
		err?.message?.includes('Importing a module script failed') ||
		err?.message?.includes('error loading dynamically imported module');

	if (isChunkLoadError && typeof window !== 'undefined') {
		const currentUrl = window.location.href;
		const lastReload = storage.get(RELOAD_KEY);

		// Захист від нескінченного циклу релоаду
		if (lastReload !== currentUrl) {
			storage.set(RELOAD_KEY, currentUrl);
			window.location.reload();
			return { message: 'Оновлення версії застосунку...' };
		}
	}

	logService.error('client', message || 'Client runtime error', error);
	return { message: message || 'Сталася несподівана помилка' };
};
