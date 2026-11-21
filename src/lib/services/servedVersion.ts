// src/lib/services/servedVersion.ts
import * as appPaths from '$app/paths';
import { dev } from '$app/env';
import { logService } from './logService.svelte';

const base: string =
	(appPaths as { base?: string }).base ??
	(typeof (appPaths as { resolve?: (p: string) => string }).resolve === 'function'
		? (appPaths as { resolve: (p: string) => string }).resolve('/').replace(/\/$/, '')
		: '');

export async function fetchServedVersion(signal?: AbortSignal): Promise<string | null> {
	// У режимі розробки Vite не генерує статичний _app/version.json
	if (dev) return null;

	try {
		const basePath = base || '';
		const url = `${basePath}/_app/version.json?t=${Date.now()}`;
		const res = await fetch(url, {
			cache: 'no-store',
			signal
		});
		if (!res.ok) {
			logService.warn('version', `Served version returned ${res.status}`);
			return null;
		}
		const data = (await res.json()) as { version?: string };
		if (typeof data?.version !== 'string') {
			logService.error('version', 'Invalid version payload from server', data);
			return null;
		}
		return data.version;
	} catch (error) {
		if (signal?.aborted) return null;
		logService.warn('version', 'Failed to fetch served version', error);
		return null;
	}
}
