// src/lib/debug/hardReset.ts — лише коли збір логів із пристроїв (DEBUGGING § 3). Аварійне скидання: лише своє, кожен складник окремо, ніколи не кидає
import * as appPaths from '$app/paths';
import { logService } from '$lib/services/logService.svelte';
import { deleteOwnCaches, deleteOwnDatabases, unregisterOwnServiceWorkers } from './ownScope';
import { sessionStore, storage, STORAGE_PREFIX } from '$lib/services/storage';

const base: string =
	(appPaths as { base?: string }).base ??
	(typeof (appPaths as { resolve?: (p: string) => string }).resolve === 'function'
		? (appPaths as { resolve: (p: string) => string }).resolve('/').replace(/\/$/, '')
		: '');

/** Свої куки — за префіксом імені, видаляються з тим самим `path`, з яким ставилися. */
function clearOwnCookies(): number {
	if (typeof document === 'undefined') return 0;
	const own = document.cookie
		.split(';')
		.map((pair) => (pair.split('=')[0] ?? '').trim())
		.filter((name) => name.startsWith(STORAGE_PREFIX));
	for (const name of own) document.cookie = `${name}=; path=${base}/; max-age=0; SameSite=Lax`;
	return own.length;
}

/** Складник під власним try: збій одного не скасовує решту. */
async function step(name: string, run: () => number | Promise<number>): Promise<void> {
	try {
		logService.info('reset', `${name}: ${await run()} removed`);
	} catch (error) {
		logService.warn('reset', `${name} failed`, error);
	}
}

export async function hardReset(): Promise<void> {
	await step('localStorage', () => storage.clear());
	await step('sessionStorage', () => sessionStore.clear());
	await step('cookies', clearOwnCookies);
	await step('caches', deleteOwnCaches);
	await step('indexedDB', deleteOwnDatabases);
	await step('service workers', unregisterOwnServiceWorkers);
	location.reload();
}
