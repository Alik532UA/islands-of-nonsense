import { browser } from '$app/env';
import { toast } from '$lib/controllers/toast.svelte';
import { logService } from '$lib/services/logService.svelte';
import { t } from '$lib/i18n';

function confirmReloadIfInBattle(): boolean {
	if (
		typeof window !== 'undefined' &&
		window.location &&
		window.location.pathname.includes('/play/battle')
	) {
		const confirmMsg =
			t('pwa.reloadConfirmBattle') ||
			'Ви перебуваєте в бою. Перезавантаження завершить поточний матч. Продовжити?';
		return window.confirm(confirmMsg);
	}
	return true;
}

/**
 * Checks for a waiting Service Worker and activates it cleanly before falling back to reload.
 */
export async function applyAppUpdateOrReload(): Promise<void> {
	if (typeof window === 'undefined') return;
	if (!confirmReloadIfInBattle()) return;

	if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
		try {
			const reg = await navigator.serviceWorker.getRegistration();
			if (reg) {
				await reg.update().catch(() => {});
				const refreshedReg =
					(await navigator.serviceWorker.getRegistration().catch(() => reg)) ?? reg;
				if (refreshedReg.waiting) {
					refreshedReg.waiting.postMessage({ type: 'SKIP_WAITING' });
					setTimeout(() => {
						window.location.reload();
					}, 1200);
					return;
				}
			}
		} catch (error) {
			logService.warn('pwa', 'applyAppUpdateOrReload fallback to reload', error);
		}
	}

	window.location.reload();
}

export function initServiceWorkerUpdate(): () => void {
	if (!browser || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
		return () => {};
	}

	let refreshing = false;
	let prompted = false;

	const onControllerChange = () => {
		if (refreshing) return;
		refreshing = true;
		window.location.reload();
	};

	navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

	function promptUser(worker: ServiceWorker) {
		if (prompted) return;
		prompted = true;

		toast.info(t('pwa.updateAvailable') || 'Доступна нова версія гри', {
			duration: 0,
			action: {
				label: t('pwa.updateAction') || 'Оновити',
				run: () => {
					if (!confirmReloadIfInBattle()) return;
					worker.postMessage({ type: 'SKIP_WAITING' });
					setTimeout(() => {
						if (!refreshing) {
							refreshing = true;
							window.location.reload();
						}
					}, 1200);
				}
			}
		});
	}

	navigator.serviceWorker
		.getRegistration()
		.then((reg) => {
			if (!reg) return;

			void reg.update().catch(() => {});

			if (reg.waiting) {
				promptUser(reg.waiting);
				return;
			}

			reg.addEventListener('updatefound', () => {
				const newWorker = reg.installing;
				if (!newWorker) return;

				newWorker.addEventListener('statechange', () => {
					if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
						promptUser(newWorker);
					}
				});
			});
		})
		.catch((error) => {
			logService.warn('pwa', 'ServiceWorker registration check failed', error);
		});

	return () => {
		navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
	};
}
