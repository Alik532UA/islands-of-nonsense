/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

import { assets, immutable, prerendered } from '$app/manifest';
import { version } from '$app/env';

const CACHE = `islandsofnonsense-cache-${version}`;
const ASSETS = [...assets, ...immutable, ...prerendered]
	.map((item) => (typeof item === 'string' ? item : item?.path))
	.filter((path): path is string => typeof path === 'string' && path.length > 0);

self.addEventListener('message', (event: ExtendableMessageEvent) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		void self.skipWaiting();
	}
});

self.addEventListener('install', (event: ExtendableEvent) => {
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await Promise.all(ASSETS.map((asset) => cache.add(asset).catch(() => {})));
	}
	event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event: ExtendableEvent) => {
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE) {
				await caches.delete(key);
			}
		}
	}
	event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event: FetchEvent) => {
	if (event.request.method !== 'GET') return;

	async function respond() {
		const url = new URL(event.request.url);
		const cache = await caches.open(CACHE);

		// Serve cached assets first
		if (ASSETS.includes(url.pathname)) {
			const cached = await cache.match(event.request);
			if (cached) return cached;
		}

		try {
			const response = await fetch(event.request);
			return response;
		} catch {
			const cached = await cache.match(event.request);
			if (cached) return cached;
			return new Response('Offline', { status: 503 });
		}
	}

	event.respondWith(respond());
});
